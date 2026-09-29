// The player: a program played on a drawn scene a frame at a time, all the way or a step at a time,
// with every drawing it touches drawn again from the shelf at each frame, so what a child watches is
// what the sheet prints at that step. What each drawing shows at a frame, and the words, are
// coding.ts's; this only draws them and keeps the clock. A build (program.tsx) and a shown program
// (coding.tsx) play through it the same way (.docs/coding.md, "On the lesson page").

import { U } from "../paper";
import { paramsOf, type Scene, type SceneNode } from "../scene";
import {
    blanksIn,
    endWords,
    playOf,
    saidAt,
    settingsAt,
    stepWords,
    touchedBy,
    type CodingTarget,
    type Play,
} from "./coding";
import { drawingOf } from "./drawings";
import { render } from "./svg";

/** Seconds a frame takes to play; a repeat, an if or a for each going round takes less. */
const STEP = 0.4;
const CONTROL = 0.25;
const CONTROLS = new Set(["repeat", "forever", "until", "if", "each", "test", "call"]);

/** A part's own drawing inside the scene, found by what it is and where the scene put it. */
function drawnAt(tile: Element, node: SceneNode, scene: Scene): SVGSVGElement | null {
    const box = scene.boxes[node.id];
    const all = [
        ...tile.querySelectorAll<SVGSVGElement>(`svg.scene-svg svg[data-visual="${node.type}"]`),
    ];
    if (!box) return all.length === 1 ? (all[0] ?? null) : null;
    const near = (s: SVGSVGElement, k: "x" | "y", at: number): boolean =>
        Math.abs(Number(s.getAttribute(k)) - at * U) < 0.5;
    return (
        all.find((s) => near(s, "x", box.x) && near(s, "y", box.y)) ??
        all.find((s) => near(s, "x", box.x)) ??
        null
    );
}

/** A part drawn again from the shelf with some of its settings changed, where the scene put it. */
export function redrawNode(
    tile: Element,
    scene: Scene,
    node: SceneNode,
    changes: Record<string, unknown>,
): void {
    const d = drawingOf(node.type);
    const was = drawnAt(tile, node, scene);
    if (!d || !was) return;
    const r = render(d, { ...paramsOf(d, node.v), ...changes }, { host: tile });
    r.svg.removeAttribute("class");
    r.svg.removeAttribute("style");
    r.svg.setAttribute("overflow", "visible");
    for (const k of ["x", "y"]) r.svg.setAttribute(k, was.getAttribute(k) ?? "0");
    // a list that grows is drawn wider than the box the scene gave it, rather than squeezed into it
    r.svg.setAttribute("width", String(r.box.w * U));
    r.svg.setAttribute("height", String(r.box.h * U));
    was.replaceWith(r.svg);
}

export interface PlayerOptions {
    /** The element the scene is drawn in. */
    tile: () => Element | undefined;
    scene: Scene;
    target: CodingTarget;
    /** The sheet is read, so a drawing may fill in what a child would otherwise write. */
    reveal: boolean;
    say(words: string): void;
    /** What the program says, for the bubble; "" while it says nothing. */
    speak(said: string): void;
    /** The line running now, or 0, for a pad that lights its own slot. */
    onLine?(line: number): void;
    /** A play that reached its end, by Run or by the last Step; not one that was stopped. */
    onEnd?(play: Play, by: "run" | "step"): void;
    onPlaying?(playing: boolean): void;
}

export interface Player {
    /** Plays a program from the start with fresh random numbers: the drawing's own, or the one given. */
    run(code?: readonly string[]): void;
    /** Plays one frame more, starting again once the end is reached or the program has changed. */
    step(code?: readonly string[]): void;
    /** The last frame of a program drawn at once, as a finished question shows it. */
    show(code: readonly string[]): void;
    /** Every drawing as the scene has it, and nothing said. */
    reset(): void;
    /** Stops the clock and forgets the play, for a scene that was drawn again from scratch. */
    forget(): void;
}

const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function player(o: PlayerOptions): Player {
    const setup = o.target.setup;
    let play: Play | null = null;
    let touched: SceneNode[] = [];
    const ever = new Set<SceneNode>();
    let k = 0;
    let timer = 0;

    const playing = (on: boolean): void => o.onPlaying?.(on);
    const stop = (): void => {
        if (timer) playing(false);
        clearTimeout(timer);
        timer = 0;
    };
    const fresh = (code: readonly string[]): Play | null => {
        if (!setup) return null;
        const p = playOf(setup, code, Math.floor(Math.random() * 2 ** 31));
        touched = touchedBy(o.scene, o.target, p);
        for (const n of touched) ever.add(n);
        return p;
    };
    const draw = (p: Play, at: number): void => {
        const tile = o.tile();
        if (!tile) return;
        for (const n of touched) {
            const changes = settingsAt(n, p, at, o.reveal);
            if (changes) redrawNode(tile, o.scene, n, changes);
            else if (at === 0) redrawNode(tile, o.scene, n, {});
        }
        o.speak(saidAt(p, at));
        o.onLine?.(at > 0 && at < p.length + 1 ? (p.run.frames[at - 1]?.line ?? 0) : 0);
    };
    const ended = (p: Play, by: "run" | "step"): void => {
        o.onLine?.(0);
        if (setup) o.say(endWords(p, setup));
        o.onEnd?.(p, by);
    };
    const same = (code: readonly string[] | undefined): boolean =>
        !code ||
        (!!play && play.code.length === code.length && play.code.every((l, i) => l === code[i]));

    return {
        run(code) {
            stop();
            const p = fresh(code ?? setup?.code ?? []);
            if (!p) return;
            play = p;
            if (reducedMotion() || !p.length) {
                k = p.length;
                draw(p, k);
                ended(p, "run");
                return;
            }
            k = 0;
            draw(p, 0);
            o.say("Running.");
            playing(true);
            const next = (): void => {
                if (!o.tile()?.isConnected) {
                    stop();
                    return;
                }
                k++;
                draw(p, k);
                const f = p.run.frames[k - 1];
                if (k >= p.length) {
                    timer = window.setTimeout(() => {
                        stop();
                        ended(p, "run");
                    }, STEP * 1000);
                    return;
                }
                timer = window.setTimeout(
                    next,
                    (f && CONTROLS.has(f.kind) ? CONTROL : STEP) * 1000,
                );
            };
            timer = window.setTimeout(next, STEP * 500);
        },
        step(code) {
            if (timer) return;
            if (!play || !same(code) || k >= play.length) {
                play = fresh(code ?? play?.code ?? setup?.code ?? []);
                k = 0;
            }
            const p = play;
            if (!p) return;
            if (!p.length) {
                ended(p, "step");
                return;
            }
            k++;
            draw(p, k);
            o.say(stepWords(p, o.target.node.type, k, o.reveal ? [] : blanksIn(touched)));
            if (k >= p.length) ended(p, "step");
        },
        show(code) {
            stop();
            const p = fresh(code);
            if (!p) return;
            play = p;
            k = p.length;
            draw(p, k);
            o.onLine?.(0);
        },
        reset() {
            stop();
            play = null;
            k = 0;
            const tile = o.tile();
            if (tile) for (const n of ever) redrawNode(tile, o.scene, n, {});
            o.onLine?.(0);
            o.speak("");
            o.say("");
        },
        forget() {
            stop();
            play = null;
            k = 0;
            o.speak("");
        },
    };
}
