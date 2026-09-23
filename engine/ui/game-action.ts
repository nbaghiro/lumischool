import { iconElement } from "./icon";
import type { IconName } from "../parts/apps/icon";
import { ticker } from "../motion/loop";
import { session } from "../motion/session";
import { down, emptyPad, keyDir, spent, stickDir, swipeDir, up, type Dir } from "../motion/pad";
import type { Frame, Happening } from "../motion/scene";
import type { Field } from "./stage";
import type { ActionGame } from "../../school/games/game";
import type { Runtime, Shell } from "./game-host";

/** A game and its state, closed over, so the page can hold any of them. */
interface Session {
    step(): Happening[];
    frame(rest: boolean): Frame;
    say(): string;
    note(): string;
    won(): boolean;
    press(): number;
    settling(): boolean;
    pullFrom(): { x: number; y: number } | null;
    back(): boolean;
}

export function action(
    shell: Shell,
    field: Field,
    game: ActionGame<unknown>,
    level: number,
): Runtime {
    const { $ } = shell;
    const pad = emptyPad();
    const s = game.start(level);
    const sess: Session = {
        step: () => {
            const h = game.step(s, pad);
            spent(pad);
            return h;
        },
        frame: (rest) => game.frame(s, rest),
        say: () => game.say(s),
        note: () => game.note(s),
        won: () => game.won(s),
        press: () => game.still.press(s),
        settling: () => game.still.settling?.(s) ?? false,
        pullFrom: () => game.pullFrom?.(s) ?? null,
        back: () => game.back?.(s) ?? false,
    };
    const clock = session(game.rate, () => handle(sess.step()));
    let wonShown = false;
    let stopped = false;
    const perf = { frames: [] as number[], work: [] as number[] };

    const tick = ticker({
        now: () => performance.now(),
        schedule: (f) => requestAnimationFrame(f),
        onFrame: (_t, dt) => {
            if (!stopped) frame(dt);
            return !stopped;
        },
    });

    function frame(dt: number): void {
        if (shell.paused()) return;
        pollGamepad();
        if (dt > 0) {
            perf.frames.push(dt);
            if (perf.frames.length > 90) perf.frames.shift();
        }
        const w0 = performance.now();
        if (!shell.still()) {
            clock.frame(dt);
            field.draw(sess.frame(false), dt);
        }
        perf.work.push(performance.now() - w0);
        if (perf.work.length > 90) perf.work.shift();
        hud();
    }

    /**
     * Under reduced motion, a press is worth a fixed amount of game time, and the result is drawn once,
     * at rest. The hands count only for the press's own steps; what the press started then settles with
     * nothing held, so a key still down or a finger still on the glass is not a press again.
     */
    function pressStill(): void {
        if (shell.paused()) return;
        if (!shell.still()) return;
        const n = sess.press();
        for (let i = 0; i < n; i++) handle(sess.step());
        const held = {
            holding: pad.holding,
            held: pad.held,
            go: pad.go,
            brake: pad.brake,
            touch: pad.touch,
            pull: pad.pull,
        };
        Object.assign(pad, {
            holding: [],
            held: null,
            go: false,
            brake: false,
            touch: null,
            pull: null,
        });
        for (let i = 0; i < 60 * 20 && sess.settling(); i++) handle(sess.step());
        Object.assign(pad, held);
        field.draw(sess.frame(true), 0);
        hud(true);
    }

    function handle(hs: Happening[]): void {
        for (const h of hs) {
            if ("cue" in h) shell.hear(h.cue);
            else if ("puff" in h) field.puff(h.puff.x, h.puff.y, h.puff.n);
            else if ("burst" in h)
                field.burst(h.burst.kind, h.burst.x, h.burst.y, h.burst.n, h.burst.dir);
            else field.shake(h.shake);
        }
    }

    let lastHud = 0,
        lastSaid = "",
        lastRead = 0;
    function hud(force = false): void {
        const now = performance.now();
        if (!force && now - lastHud < 250) return;
        lastHud = now;
        const won = sess.won();
        const words = sess.say();
        const first = words.split(". ")[0] ?? "";
        // A full-bleed game's field says where things stand, so the line over it is only what just happened.
        $("aside").textContent =
            sess.note() || (game.bleed ? "" : first.endsWith(".") ? first : `${first}.`);
        if (words !== lastSaid && (force || now - lastRead > 1000)) {
            $("reads").textContent = words;
            lastSaid = words;
            lastRead = now;
        }
        if (won !== wonShown) {
            wonShown = won;
            shell.guide(won ? "cheer" : "idle");
        }
        $("another").hidden = !won;
        panels();
    }

    const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);

    function panels(): void {
        const fps = perf.frames.length ? 1 / mean(perf.frames) : 0;
        const st = field.stats;
        shell.rows(
            1,
            "This frame",
            [
                ["frames a second", shell.still() ? "only when pressed" : fps.toFixed(0)],
                ["game and drawing", `${mean(perf.work).toFixed(2)} ms a frame`],
                ["drawings on the field", String(st.sprites)],
                ["moving layers", String(st.moving)],
                ["square", `${field.sq} px; buttons are 60 px`],
            ],
            [
                "The game and drawing time is the page's own work in a frame. The browser composites the layers after it, which is not counted here.",
            ],
        );
        shell.rows(
            2,
            "How the shelf art got in",
            [
                ["looks drawn", String(st.drawings)],
                ["pen time", `${st.drawMs.toFixed(0)} ms in all`],
                ["rasterised by us", "nothing"],
            ],
            [
                "Each look is drawn once through the seeded pen as SVG and copied for every sprite that has it. A moving sprite is a layer the browser rasterises once and then only moves and turns, so the drawings stay in the page and a screen reader can reach the text form.",
            ],
        );
        shell.rows(
            3,
            "The gate",
            [
                ["kind", "an action game"],
                ["checked by", "named invariants and a seeded replay, in test/games.test.ts"],
            ],
            [
                "There is no position graph for the prover to walk, so the tests hold the game to what it promises: nothing is timed, nothing is lost by bumping into things, and the same input gives the same game.",
            ],
        );
    }

    function takeBack(): void {
        if (!sess.back()) return;
        shell.hear("back");
        if (shell.still()) pressStill();
        hud(true);
    }

    // ---------------------------------------------------------------- devices into a Pad

    function press(d: Dir): void {
        down(pad, d);
        pressStill();
    }
    const lift = (d: Dir): void => up(pad, d);

    function key(e: KeyboardEvent): void {
        if (shell.paused()) return;
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.type === "keydown" && e.key === "Backspace" && game.back) {
            e.preventDefault();
            takeBack();
            return;
        }
        const d = keyDir(e.key);
        if (e.type === "keyup") {
            if (d) lift(d);
            if (e.key === " ") pad.go = false;
            return;
        }
        if (d && e.key.startsWith("Arrow")) {
            e.preventDefault();
            if (!e.repeat) press(d);
            return;
        }
        if (e.key === " " || e.key === "Enter") {
            if (document.activeElement instanceof HTMLButtonElement) return;
            e.preventDefault();
            if (e.key === " ") pad.go = true;
            if (!e.repeat) {
                pad.tapped = true;
                pressStill();
            }
        }
    }

    function pulse(): void {
        if (shell.paused() || shell.still()) return;
        for (let i = 0; i < sess.press(); i++) handle(sess.step());
        field.draw(sess.frame(false), 0);
        hud(true);
    }

    /** The pad under the field: arrows in a cross and the big buttons, each at least sixty pixels. */
    function buildPad(): void {
        const host = $("pad");
        host.hidden = false;
        host.replaceChildren();
        const c = game.controls;
        if (c.arrows) {
            const labels = c.arrows;
            const cross = document.createElement("div");
            cross.className = "cross";
            cross.setAttribute("role", "group");
            cross.setAttribute("aria-label", "Directions");
            cross.classList.toggle("flat", !labels.up && !labels.down);
            for (const d of ["up", "left", "down", "right"] as Dir[]) {
                const label = labels[d];
                if (!label || label === c.go || label === c.brake) continue;
                const b = document.createElement("button");
                b.type = "button";
                b.className = "key";
                b.dataset.dir = d;
                b.appendChild(iconElement(d === "left" ? "back" : d));
                b.setAttribute("aria-label", label);
                b.title = label;
                b.addEventListener("pointerdown", (e) => {
                    e.preventDefault();
                    b.classList.add("on");
                    press(d);
                });
                for (const ev of ["pointerup", "pointerleave", "pointercancel"])
                    b.addEventListener(ev, () => {
                        b.classList.remove("on");
                        lift(d);
                    });
                b.addEventListener("click", (e) => {
                    if (e.detail === 0) {
                        press(d);
                        pulse();
                        lift(d);
                    }
                });
                cross.appendChild(b);
            }
            host.appendChild(cross);
        }
        const big = (text: string, on: () => void, off: () => void) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "key big";
            const icons: Record<string, IconName> = {
                Go: "play",
                Brake: "stop",
                Climb: "up",
                Dive: "down",
                Hop: "launch",
                Launch: "launch",
                "Test / build": "play",
                "Pick up / release": "grab",
            };
            const name = icons[text];
            if (name) b.appendChild(iconElement(name));
            else b.textContent = text;
            b.setAttribute("aria-label", text);
            b.title = text;
            b.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                b.classList.add("on");
                on();
            });
            for (const ev of ["pointerup", "pointerleave", "pointercancel"])
                b.addEventListener(ev, () => {
                    b.classList.remove("on");
                    off();
                });
            b.addEventListener("click", (e) => {
                if (e.detail === 0) {
                    on();
                    pulse();
                    off();
                }
            });
            host.appendChild(b);
        };
        if (c.go)
            big(
                c.go,
                () => {
                    pad.go = true;
                    pad.tapped = true;
                    pressStill();
                },
                () => {
                    pad.go = false;
                },
            );
        if (c.brake)
            big(
                c.brake,
                () => {
                    pad.brake = true;
                    pressStill();
                },
                () => {
                    pad.brake = false;
                },
            );
        for (const command of game.commands ?? []) {
            if (command.label === c.go || command.label === c.brake) continue;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "key";
            button.setAttribute("aria-label", command.label);
            button.title = command.label;
            const icons: Record<string, IconName> = {
                "Turn left": "restart",
                "Turn right": "restart",
                Undo: "undo",
                "Undo delivery": "undo",
                Redo: "undo",
            };
            const name = icons[command.label];
            if (name) {
                const drawing = iconElement(name);
                if (command.label === "Turn right" || command.label === "Redo")
                    drawing.style.transform = "scaleX(-1)";
                button.appendChild(drawing);
            } else button.textContent = command.label;
            button.addEventListener("click", (e) => {
                if (shell.paused()) return;
                game.command?.(s, command.id);
                field.draw(sess.frame(shell.still()), 0);
                hud(true);
                // Pointer controls return to play; keyboard activation keeps its tab focus.
                if (e.detail > 0) $("board").focus({ preventScroll: true });
            });
            host.appendChild(button);
        }
    }

    let drag: { id: number; x: number; y: number; pulling: boolean; brake: boolean } | null = null;
    function pointerStep(): void {
        if (shell.still()) pressStill();
        else {
            handle(sess.step());
            field.draw(sess.frame(false), 0);
            hud(true);
        }
    }
    const pointerDown = (e: PointerEvent): void => {
        if (shell.paused() || drag || !e.isPrimary) return;
        const brake = e.button === 2 && !!game.controls.brake;
        if (e.button !== 0 && !brake) return;
        e.preventDefault();
        const w = field.toWorld(e.clientX, e.clientY);
        const from = sess.pullFrom();
        const pulling =
            !game.touch &&
            !!from &&
            Math.hypot(w.x - from.x, w.y - from.y) <= Math.max(2.5, 44 / field.px);
        drag = { id: e.pointerId, x: w.x, y: w.y, pulling, brake };
        field.el.setPointerCapture(e.pointerId);
        if (brake) pad.brake = true;
        else if (game.touch) pad.touch = w;
        else if (from && pulling) pad.pull = { x: w.x - from.x, y: w.y - from.y };
        else if (!game.pullFrom && game.controls.go) {
            pad.go = true;
            pad.tapped = true;
        }
        // Consume the grab even if down and up arrive between animation frames.
        pointerStep();
    };
    const pointerMove = (e: PointerEvent): void => {
        if (!drag || drag.id !== e.pointerId || shell.paused() || drag.brake) return;
        const w = field.toWorld(e.clientX, e.clientY);
        if (game.touch) {
            pad.touch = w;
            pressStill();
            return;
        }
        const from = sess.pullFrom();
        if (drag.pulling && from) {
            pad.pull = { x: w.x - from.x, y: w.y - from.y };
            pressStill();
            return;
        }
        const d = swipeDir(w.x - drag.x, w.y - drag.y, Math.max(0.8, 30 / field.px));
        if (d) {
            press(d);
            lift(d);
            drag.x = w.x;
            drag.y = w.y;
        }
    };
    const clearPointer = (): void => {
        const id = drag?.id;
        drag = null;
        pad.touch = null;
        pad.pull = null;
        pad.go = false;
        pad.brake = false;
        if (id !== undefined && field.el.hasPointerCapture(id)) field.el.releasePointerCapture(id);
    };
    const pointerEnd = (e: PointerEvent): void => {
        if (!drag || drag.id !== e.pointerId) return;
        const w = field.toWorld(e.clientX, e.clientY);
        if (!drag.brake) {
            if (game.touch) pad.lifted = w;
            else if (drag.pulling) {
                const from = sess.pullFrom();
                if (from) pad.released = { x: w.x - from.x, y: w.y - from.y };
            }
        }
        clearPointer();
        pointerStep();
    };
    const pointerCancel = (e: PointerEvent): void => {
        if (!drag || drag.id !== e.pointerId) return;
        clearPointer();
        game.cancelInput?.(s);
    };
    const contextMenu = (e: Event): void => {
        if (game.controls.brake) e.preventDefault();
    };
    field.el.addEventListener("pointerdown", pointerDown);
    field.el.addEventListener("pointermove", pointerMove);
    field.el.addEventListener("pointerup", pointerEnd);
    field.el.addEventListener("pointercancel", pointerCancel);
    field.el.addEventListener("lostpointercapture", pointerCancel);
    field.el.addEventListener("contextmenu", contextMenu);

    /** A gamepad: the d-pad or the left stick is a direction, A is the big button, B the brake. */
    const padWas = { dir: null as Dir | null, a: false, b: false };
    function pollGamepad(): void {
        const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g) : null;
        if (!gp) return;
        const btn = (i: number) => gp.buttons[i]?.pressed ?? false;
        const dir: Dir | null = btn(12)
            ? "up"
            : btn(13)
              ? "down"
              : btn(14)
                ? "left"
                : btn(15)
                  ? "right"
                  : stickDir(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
        if (dir !== padWas.dir) {
            if (padWas.dir) lift(padWas.dir);
            if (dir) press(dir);
            padWas.dir = dir;
        }
        const a = btn(0),
            b = btn(1);
        if (a && !padWas.a) {
            pad.go = true;
            pad.tapped = true;
            pressStill();
        }
        if (!a && padWas.a) pad.go = false;
        if (b !== padWas.b) {
            pad.brake = b;
            if (b) pressStill();
        }
        padWas.a = a;
        padWas.b = b;
    }

    function fit(): void {
        const f = sess.frame(true);
        field.fit(f.view, f.world, shell.room(), game.bleed === true);
        field.draw(sess.frame(shell.still()), 0);
    }

    field.el.hidden = false;
    $("tray").hidden = true;
    $("undo").hidden = !game.back;
    $("undo").removeAttribute("disabled");
    $("goal").textContent = (game.levels[level] ?? game.levels[0])?.goal ?? "Play";
    shell.keys(game.hint);
    shell.guide("idle");
    buildPad();
    shell.tuning(
        game.tuning ?? null,
        "A knob a game reads every step takes hold at once; one it reads when it lays out a level takes hold at Start again.",
    );
    field.clear();
    fit();
    tick.start();
    hud(true);

    return {
        key,
        command: (id) => {
            game.command?.(s, id);
            field.draw(sess.frame(shell.still()), 0);
            hud(true);
        },
        checkpoint: () => game.checkpoint?.(s),
        restore: (value) => {
            const ok = game.restore?.(s, value) ?? false;
            field.draw(sess.frame(shell.still()), 0);
            hud(true);
            return ok;
        },
        undo: takeBack,
        release: () => {
            clearPointer();
            game.cancelInput?.(s);
            Object.assign(pad, emptyPad());
            padWas.dir = null;
            padWas.a = false;
            padWas.b = false;
        },
        redraw: () => {
            field.draw(sess.frame(shell.still()), 0);
            shell.guide(sess.won() ? "cheer" : "idle");
        },
        resize: fit,
        stop() {
            clearPointer();
            stopped = true;
            tick.stop();
            clock.dispose();
            field.el.removeEventListener("pointerdown", pointerDown);
            field.el.removeEventListener("pointermove", pointerMove);
            field.el.removeEventListener("pointerup", pointerEnd);
            field.el.removeEventListener("pointercancel", pointerCancel);
            field.el.removeEventListener("lostpointercapture", pointerCancel);
            field.el.removeEventListener("contextmenu", contextMenu);
            field.clear();
            field.el.hidden = true;
            $("pad").replaceChildren();
        },
    };
}
