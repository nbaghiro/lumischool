// A question answered by arranging the drawing, on a sheet (lesson.tsx): weights to stand on a
// see-saw plank, a cake to cut. The scene is drawn as it prints, through the sheet's drawer, with
// what the child has put on it; this lays buttons over the pieces and the places they can go, so a
// piece is dragged, or tapped and then its place tapped, and the keyboard reaches the same buttons.
// Check lets the drawing go and says what the item's own feedback says. The boards, the layouts and
// the judging are engine/arrange.ts; what a try records is the page's, through `Arranging`.

import "./arrange.css";
import type { SceneDrawer } from "./scene";
import { createEffect, createSignal, For, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import type { Timing } from "../answer";
import {
    bagIndex,
    bagPiece,
    CUT,
    PART,
    plankAreas,
    plankLayout,
    plankRest,
    plankStacks,
    type Arrangement,
    type Board,
    type Box,
    type Cutting,
    type Plank,
} from "../arrange";
import { swingTo } from "../motion/lever";
import { U } from "../paper";
import type { Scene } from "../scene";
import { loadDrawings, type Shelf } from "./drawings";
import { render } from "./svg";

/** What the drawing shows after a try: where the pieces stand, let go, with the part a rule points at. */
export interface Arranged {
    state: "right" | "again" | "shown";
    say: string;
    point: string | null;
    /** What is drawn: the child's arrangement, or the key after the last try. */
    places: Arrangement;
    done: boolean;
}

/** A question answered on its drawing, as the sheet draws it: the part, its board, and where the pieces stand. */
export interface ArrangedPart {
    /** The part's id in the scene. */
    part: string;
    /** What kind of part it is, which the check for a try reads. */
    type: string;
    board: Board;
    plank: Plank | null;
    cutting: Cutting | null;
    /** An arrangement that is right, drawn once the last try is over. */
    key: Arrangement;
    /** Where the pieces stand now, for a sitting picked up again: as the child left a done question, or nothing. */
    told: Arranged | null;
}

/** What a child may do with that part: each try checked and recorded, and the hints. A sheet drawn to be read has none. */
export interface Arranging {
    tried(places: Arrangement, timing: Timing): Arranged;
    mayHint(): boolean;
    hint(): string | null;
}

const ARROWS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
/** The top of the long cake's icing and the knife's tip, in squares down their boxes (the shelf's gamepieces). */
const CAKE_TOP = 3.1,
    KNIFE_TIP = 7.6;
/** The shelf's names for the weight a drag carries and the knife over the cake. */
const GHOSTS = ["masses", "cakeknife"];

const listed = (xs: string[]): string =>
    xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1] ?? ""}` : (xs[0] ?? "");
const kilos = (kgs: number[]): string => `${listed(kgs.map(String))} kilograms`;
const sideWord = (s: number): string => (s < 0 ? "left" : "right");

/** The drawing's place in the tile, in the tile's own pixels: `k` pixels a square, offset `ox`, `oy`, and `zoom` screen pixels per one of the tile's, since the roll scales the sheet. */
type Frame = { k: number; ox: number; oy: number; zoom: number };

export function ArrangedQuestion(props: {
    scene: Scene;
    part: ArrangedPart;
    /** The hints opened on it already, in order. */
    opened: string[];
    /** What a child may do with it; without it the drawing is read and nothing is taken. */
    acts?: Arranging;
    /** The sheet is finished, or the question was answered on another visit: nothing more is taken. */
    closed: boolean;
    draw: SceneDrawer;
    /** What each try told, for the sheet to mark the question done. */
    onTold?: (t: Arranged) => void;
}): JSX.Element {
    const box: Box = props.scene.boxes[props.part.part] ?? { x: 0, y: 0, w: 0, h: 0 };
    const [places, setPlaces] = createSignal<Arrangement>(props.part.told?.places ?? []);
    const [told, setTold] = createSignal<Arranged | null>(props.part.told);
    const [checked, setChecked] = createSignal(props.part.told !== null);
    const [held, setHeld] = createSignal<string | null>(null);
    const [said, setSaid] = createSignal(props.part.told?.say ?? "");
    const [hints, setHints] = createSignal<string[]>(props.opened);
    const [hintable, setHintable] = createSignal(props.acts?.mayHint() ?? false);
    const [frame, setFrame] = createSignal<Frame>({ k: 1, ox: 0, oy: 0, zoom: 1 });
    const [knife, setKnife] = createSignal(0);
    const [aiming, setAiming] = createSignal(false);
    const [ghosts, setGhosts] = createSignal<Shelf | null>(null);
    void loadDrawings(GHOSTS).then(setGhosts);
    const done = (): boolean => (told()?.done ?? false) || props.closed;
    const locked = (): boolean => checked() || done();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shown = Date.now();
    let first = 0;
    let left = false;
    let swallow = false;
    const away = (): void => {
        if (document.hidden) left = true;
    };
    document.addEventListener("visibilitychange", away);
    onCleanup(() => document.removeEventListener("visibilitychange", away));

    let tile: HTMLDivElement | undefined;
    let hands: HTMLDivElement | undefined;
    const cutting = props.part.cutting;
    if (cutting)
        setKnife(
            Math.max(cutting.snap, Math.round(cutting.whole / 2 / cutting.snap) * cutting.snap),
        );

    /** Squares in the scene to pixels in the tile, read off the drawing as it is laid out now. */
    const measure = (): void => {
        if (!tile) return;
        const svg = tile.querySelector("svg.scene-svg");
        const sr = svg?.getBoundingClientRect(),
            tr = tile.getBoundingClientRect();
        const zoom = tile.offsetWidth ? tr.width / tile.offsetWidth : 1;
        const k = sr && sr.width ? sr.width / zoom / (props.scene.size[0] * U) : 1;
        setFrame({
            k,
            ox: ((sr?.left ?? tr.left) - tr.left) / zoom,
            oy: ((sr?.top ?? tr.top) - tr.top) / zoom,
            zoom,
        });
    };
    /**
     * The style that lays an element over an area of the part. It is placed by its middle, and the
     * smallest it may be on the screen is a finger's width, which arrange.css holds to with the roll's
     * own zoom (`--iz`), so a camera that comes closer or goes further does not leave the buttons the
     * size they were measured at, overlapping their neighbours.
     */
    const cover = (r: Box): JSX.CSSProperties => {
        const f = frame();
        const cx = f.ox + (box.x + r.x + r.w / 2) * U * f.k,
            cy = f.oy + (box.y + r.y + r.h / 2) * U * f.k;
        return {
            left: `${cx}px`,
            top: `${cy}px`,
            width: `${r.w * U * f.k}px`,
            height: `${r.h * U * f.k}px`,
        };
    };
    const tell = (s: string): void => {
        setSaid(s);
    };
    const focusKey = (k: string): void =>
        hands?.querySelector<HTMLElement>(`[data-key="${CSS.escape(k)}"]`)?.focus();

    /** The plank turns to rest once it is let go, as lever.ts swings it. */
    function settle(): void {
        const plank = props.part.plank;
        if (!plank || !checked() || !tile) return;
        const g = tile.querySelector<SVGGElement>(
            `svg.scene-svg g[data-lean="${CSS.escape(props.part.part)}"]`,
        );
        if (!g) return;
        const rest = plankRest(plank, places());
        const [px = 0, py = 0] = (g.getAttribute("data-pivot") ?? "").split(" ").map(Number);
        const set = (a: number): void =>
            g.setAttribute("transform", `rotate(${(a * 180) / Math.PI} ${px} ${py})`);
        if (reduced || rest === 0) {
            set(rest);
            return;
        }
        let tilt = { angle: 0, spin: 0 },
            last = performance.now();
        set(0);
        const step = (now: number): void => {
            if (!g.isConnected) return;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            tilt = swingTo(tilt, rest, dt, { stiffness: 34, damping: 3.6, most: 0.2 });
            if (Math.abs(tilt.angle - rest) < 0.0005 && Math.abs(tilt.spin) < 0.002) {
                set(rest);
                return;
            }
            set(tilt.angle);
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    // the scene drawn again whenever what is on it, whether it is let go or the part pointed at changes
    createEffect(
        on(
            () => [places(), checked(), told()?.point ?? null] as const,
            ([now, let_, point]) => {
                if (!tile) return;
                const svg = props.draw(tile, props.scene, {
                    arranged: { [props.part.part]: { places: now, checked: let_ } },
                    ...(point === null ? {} : { point }),
                });
                const old = tile.querySelector("svg.scene-svg");
                if (old) old.replaceWith(svg);
                else tile.prepend(svg);
                measure();
                if (let_) settle();
            },
        ),
    );
    onMount(() => {
        if (!tile) return;
        const ro = new ResizeObserver(() => measure());
        ro.observe(tile);
        onCleanup(() => ro.disconnect());
        tell(
            props.part.told?.say ??
                (cutting
                    ? "Move the knife along the cake and press where a cut goes, or use the arrow keys and press Enter. Press a cut again to take it away."
                    : "Drag a weight onto a step, or tap a weight and then a step. The props hold the plank level until you press Check."),
        );
    });

    function choose(piece: string, kg: number): void {
        if (locked()) return;
        const h = held();
        // A weight already standing covers its step, so with another weight held a tap on it means that place.
        if (h && h !== piece) {
            move(h, places().find((x) => x.piece === piece)?.at ?? 0);
            return;
        }
        setHeld(h === piece ? null : piece);
        tell(
            held()
                ? `You have the ${kg} kilogram weight. Now choose where it goes.`
                : props.part.board.say(places()),
        );
    }
    function to(s: number): void {
        if (locked()) return;
        const h = held();
        if (!h) {
            tell("Choose a weight first, then where it goes.");
            return;
        }
        move(h, s);
    }
    function move(piece: string, s: number): void {
        const plank = props.part.plank;
        if (!plank) return;
        const next = places().filter((x) => x.piece !== piece);
        if (s !== 0 && next.filter((x) => x.at === s).length >= plank.most) {
            tell(
                `Step ${Math.abs(s)} on the ${sideWord(s)} holds ${plank.most} ${plank.most === 1 ? "weight" : "weights"}.`,
            );
            return;
        }
        // Kept in the order the child placed them, so a weight put on last stands on top.
        if (s !== 0) next.push({ piece, at: s });
        setPlaces(next);
        setHeld(null);
        first ||= Date.now();
        focusKey(piece);
        tell(props.part.board.say(next));
    }
    function cut(at: number): void {
        if (!cutting || locked()) return;
        const now = places();
        const has = now.some((x) => x.at === at);
        if (!has && now.length >= cutting.most) {
            tell(
                `This cake takes ${cutting.most} cuts at most. Take one away first: put the knife on it and press again.`,
            );
            return;
        }
        const next = has
            ? now.filter((x) => x.at !== at)
            : [...now, { piece: CUT, at }].sort((x, y) => x.at - y.at);
        setPlaces(next);
        first ||= Date.now();
        focusKey("knife");
        tell(props.part.board.say(next));
    }

    function check(): void {
        if (locked()) return;
        const now = places();
        if (!now.length) {
            tell(cutting ? "Make a cut first." : "Stand a weight on the plank first.");
            return;
        }
        const at = Date.now();
        const acts = props.acts;
        if (!acts) return;
        const t = acts.tried(now, {
            k: "screen",
            toFirstInput: (first || at) - shown,
            toAnswer: at - (first || at),
            leftPage: left,
        });
        setHeld(null);
        setChecked(true);
        setTold(t);
        props.onTold?.(t);
        if (t.done) setPlaces(t.places);
        tell(t.say);
        setHintable(acts.mayHint());
        if (!t.done) setTimeout(() => againButton?.focus(), 0);
    }
    function tryAgain(): void {
        if (done()) return;
        setChecked(false);
        setTold(null);
        tell(props.part.board.say(places()));
        focusKey(cutting ? "knife" : (places()[0]?.piece ?? bagPiece(0)));
    }
    function startAgain(): void {
        if (locked()) return;
        setPlaces([]);
        setHeld(null);
        tell(props.part.board.say([]));
    }
    function hint(): void {
        const acts = props.acts;
        const h = acts?.hint();
        if (!acts || h === null || h === undefined) return;
        setHints([...hints(), h]);
        setHintable(acts.mayHint());
    }
    let againButton: HTMLButtonElement | undefined;

    /** A weight dragged from where it stands to a step or the grass, with the drawing of it under the finger. */
    function drag(
        b: HTMLButtonElement,
        piece: string,
        kg: number,
        wb: ReturnType<ReturnType<typeof plankLayout>["weight"]>,
    ): void {
        b.addEventListener("pointerdown", (e) => {
            if (locked() || e.button !== 0) return;
            const from = { x: e.clientX, y: e.clientY },
                k = frame().k * frame().zoom;
            let ghost: HTMLElement | null = null;
            b.setPointerCapture(e.pointerId);
            const spots = (): HTMLElement[] => [
                ...(hands?.querySelectorAll<HTMLElement>(".ar-place") ?? []),
            ];
            const inside = (el: Element, ev: PointerEvent): boolean => {
                const r = el.getBoundingClientRect();
                return (
                    ev.clientX >= r.left &&
                    ev.clientX <= r.right &&
                    ev.clientY >= r.top &&
                    ev.clientY <= r.bottom
                );
            };
            const follow = (ev: PointerEvent): void => {
                if (!ghost && Math.hypot(ev.clientX - from.x, ev.clientY - from.y) < 8) return;
                if (!ghost) {
                    ghost = document.createElement("div");
                    ghost.className = "ar-ghost";
                    const masses = ghosts()?.drawing("masses");
                    if (masses && tile) {
                        const r = render(masses, { masses: [kg * 1000] }, { host: tile });
                        r.svg.removeAttribute("class");
                        r.svg.removeAttribute("style");
                        r.svg.setAttribute(
                            "viewBox",
                            `${wb.crop.x * U} ${wb.crop.y * U} ${wb.crop.w * U} ${wb.crop.h * U}`,
                        );
                        Object.assign(r.svg.style, {
                            width: `${wb.w * U * k}px`,
                            height: `${wb.h * U * k}px`,
                            display: "block",
                        });
                        ghost.append(r.svg);
                    }
                    document.body.append(ghost);
                }
                ghost.style.transform = `translate(${ev.clientX - (wb.w * U * k) / 2}px, ${ev.clientY - (wb.h * U * k) / 2}px)`;
                for (const p of spots()) p.classList.toggle("over", inside(p, ev));
            };
            const end = (ev: PointerEvent): void => {
                b.removeEventListener("pointermove", follow);
                b.removeEventListener("pointerup", end);
                b.removeEventListener("pointercancel", end);
                if (!ghost) return;
                ghost.remove();
                swallow = true;
                setTimeout(() => {
                    swallow = false;
                }, 0);
                const target =
                    ev.type === "pointerup" ? spots().find((p) => inside(p, ev)) : undefined;
                for (const p of spots()) p.classList.remove("over");
                const key = target?.dataset.key ?? "";
                const at = key === "grass" ? 0 : Number(key.replace("step:", ""));
                if (target && Number.isFinite(at)) move(piece, at);
            };
            b.addEventListener("pointermove", follow);
            b.addEventListener("pointerup", end);
            b.addEventListener("pointercancel", end);
        });
    }

    const onHandsKey = (e: KeyboardEvent): void => {
        const t = e.target;
        if (!(t instanceof HTMLElement) || !t.matches(".ar-piece, .ar-place")) return;
        if (e.key === "Escape" && held()) {
            setHeld(null);
            tell(props.part.board.say(places()));
            return;
        }
        const dir = ARROWS[e.key];
        if (!dir || !hands) return;
        const group = [
            ...hands.querySelectorAll<HTMLElement>(
                t.classList.contains("ar-piece") ? ".ar-piece" : ".ar-place",
            ),
        ];
        const i = group.indexOf(t);
        if (i < 0) return;
        e.preventDefault();
        group[(i + dir + group.length) % group.length]?.focus();
    };

    /** The plank's buttons: each weight where it stands, each open step, and the grass. */
    const plankHands = (p: Plank): JSX.Element => {
        const L = plankLayout(p);
        const areas = (): Record<string, Box> => plankAreas(p, L, places());
        const stacks = (): ReturnType<typeof plankStacks> => plankStacks(p, L, places());
        return (
            <>
                <For each={p.bags}>
                    {(kg, i) => {
                        const piece = bagPiece(i());
                        const on = (): { piece: string; at: number } | undefined =>
                            places().find((x) => x.piece === piece);
                        const rect = (): Box | undefined =>
                            on() ? stacks().find((x) => x.piece === piece)?.box : L.grass[i()];
                        const where = (): string => {
                            const o = on();
                            return o
                                ? `on step ${Math.abs(o.at)} on the ${sideWord(o.at)}`
                                : "on the grass";
                        };
                        return (
                            <Show when={rect()}>
                                {(r) => (
                                    <button
                                        type="button"
                                        class="ar-piece"
                                        data-key={piece}
                                        aria-label={`A ${kg} kilogram weight, ${where()}`}
                                        aria-pressed={held() === piece}
                                        disabled={locked()}
                                        style={cover(r())}
                                        ref={(el) => drag(el, piece, kg, L.weight(kg))}
                                        onKeyDown={onHandsKey}
                                        onClick={() => {
                                            if (swallow) {
                                                swallow = false;
                                                return;
                                            }
                                            choose(piece, kg);
                                        }}
                                    />
                                )}
                            </Show>
                        );
                    }}
                </For>
                <For each={p.open}>
                    {(s) => {
                        const rect = (): Box | undefined =>
                            areas()[`${sideWord(s)}(${Math.abs(s)})`];
                        const here = (): number[] =>
                            places()
                                .filter((x) => x.at === s)
                                .map((x) => p.bags[bagIndex(x.piece) ?? -1] ?? 0);
                        return (
                            <Show when={rect()}>
                                {(r) => (
                                    <button
                                        type="button"
                                        class="ar-place"
                                        data-key={`step:${s}`}
                                        aria-label={`Step ${Math.abs(s)} on the ${sideWord(s)}${here().length ? `, with ${kilos(here())}` : ""}`}
                                        disabled={locked()}
                                        style={cover(r())}
                                        onKeyDown={onHandsKey}
                                        onClick={() => to(s)}
                                    />
                                )}
                            </Show>
                        );
                    }}
                </For>
                <Show when={areas().grass}>
                    {(r) => (
                        <button
                            type="button"
                            class="ar-place"
                            data-key="grass"
                            aria-label="The grass"
                            disabled={locked()}
                            style={cover(r())}
                            onKeyDown={onHandsKey}
                            onClick={() => to(0)}
                        />
                    )}
                </Show>
            </>
        );
    };

    /** The cake's knife: a slider along the cake that cuts where it is pressed, and takes a cut away pressed again. */
    const cakeHands = (s: Cutting): JSX.Element => {
        const cuts = (): number[] =>
            places()
                .map((x) => x.at)
                .sort((x, y) => x - y);
        const shift = (along: number): number => {
            const before = cuts().filter((c) => c < along).length;
            return along + 0.5 + before * PART + (cuts().includes(along) ? PART / 2 : 0);
        };
        const alongAt = (clientX: number): number => {
            if (!tile) return knife();
            const f = frame(),
                tr = tile.getBoundingClientRect();
            const x = ((clientX - tr.left) / f.zoom - f.ox) / (U * f.k) - box.x - 0.5;
            let along = x;
            cuts().forEach((c, i) => {
                if (x > c + i * PART + PART / 2) along = x - (i + 1) * PART;
            });
            return Math.max(
                s.snap,
                Math.min(s.whole - s.snap, Math.round(along / s.snap) * s.snap),
            );
        };
        const knifeStyle = (): JSX.CSSProperties => {
            const f = frame();
            return {
                left: `${f.ox + (box.x + shift(knife()) - 1) * U * f.k}px`,
                top: `${f.oy + (box.y + CAKE_TOP - KNIFE_TIP) * U * f.k}px`,
                width: `${2 * U * f.k}px`,
                height: `${8 * U * f.k}px`,
                visibility: aiming() && !locked() ? "visible" : "hidden",
            };
        };
        let sliderEl: HTMLInputElement | undefined;
        // the range moves the knife by its own keys; Enter or Space cuts, and Delete takes the nearest cut away
        const onKey = (e: KeyboardEvent): void => {
            if (locked()) return;
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                cut(knife());
            } else if (e.key === "Delete" || e.key === "Backspace") {
                const near = [...cuts()].sort(
                    (a, b) => Math.abs(a - knife()) - Math.abs(b - knife()),
                )[0];
                e.preventDefault();
                if (near !== undefined) cut(near);
            }
        };
        return (
            <>
                <input
                    ref={(el) => {
                        sliderEl = el;
                    }}
                    type="range"
                    class="ar-knife"
                    data-key="knife"
                    aria-label="Where to cut the cake"
                    min={s.snap}
                    max={s.whole - s.snap}
                    step={s.snap}
                    value={knife()}
                    aria-valuetext={`${knife()} ${knife() === 1 ? "square" : "squares"} from the left end${cuts().includes(knife()) ? ", where there is a cut" : ""}`}
                    disabled={locked()}
                    style={cover({
                        x: 0.5,
                        y: CAKE_TOP - 1.6,
                        w: s.whole + cuts().length * PART,
                        h: 6 - CAKE_TOP + 1.6,
                    })}
                    onInput={(e) => setKnife(Number(e.currentTarget.value))}
                    onPointerEnter={() => setAiming(true)}
                    onPointerLeave={() => setAiming(document.activeElement === sliderEl)}
                    onFocus={() => setAiming(true)}
                    onBlur={() => setAiming(false)}
                    onPointerMove={(e) => {
                        if (!locked()) setKnife(alongAt(e.clientX));
                    }}
                    onPointerDown={(e) => {
                        if (locked() || e.button !== 0) return;
                        // the knife follows the pointer along the cake as it is drawn, pieces parted, not the range's own scale
                        e.preventDefault();
                        setKnife(alongAt(e.clientX));
                        e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerUp={(e) => {
                        if (locked() || e.button !== 0) return;
                        setKnife(alongAt(e.clientX));
                        cut(knife());
                    }}
                    onKeyDown={onKey}
                />
                <div
                    class="ar-knife-art"
                    aria-hidden="true"
                    style={knifeStyle()}
                    ref={(el) => {
                        createEffect(() => {
                            const k = ghosts()?.drawing("cakeknife");
                            if (!k || !tile) return;
                            const r = render(k, k.params, { host: tile });
                            r.svg.removeAttribute("class");
                            r.svg.removeAttribute("style");
                            el.replaceChildren(r.svg);
                        });
                    }}
                />
            </>
        );
    };

    return (
        <div class="ar" data-state={told()?.state ?? ""}>
            <div
                ref={(el) => {
                    tile = el;
                }}
                class="scene-tile on-paper ar-tile"
            >
                <div
                    ref={(el) => {
                        hands = el;
                    }}
                    class="ar-hands"
                >
                    <Show when={props.part.plank}>{(p) => plankHands(p())}</Show>
                    <Show when={props.part.cutting}>{(s) => cakeHands(s())}</Show>
                </div>
            </div>
            <div class="ar-bar">
                <Show when={!checked() || done()}>
                    <button type="button" class="ls-go" disabled={locked()} onClick={check}>
                        Check
                    </button>
                </Show>
                <Show when={checked() && !done()}>
                    <button
                        type="button"
                        class="ls-go"
                        ref={(el) => {
                            againButton = el;
                        }}
                        onClick={tryAgain}
                    >
                        Try again
                    </button>
                </Show>
                <button type="button" class="ar-again" disabled={locked()} onClick={startAgain}>
                    Start again
                </button>
                <Show when={hintable()}>
                    <button type="button" class="ls-hint" disabled={props.closed} onClick={hint}>
                        A hint
                    </button>
                </Show>
            </div>
            <ol class="ls-hints">
                <For each={hints()}>{(h) => <li>{h}</li>}</For>
            </ol>
            <p class="ls-said" aria-live="polite">
                {said()}
            </p>
        </div>
    );
}
