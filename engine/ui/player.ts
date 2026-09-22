// Plays what a world does to its drawings beyond their own idle motion: the smoke a drawing's
// declaration puffs from its anchor, the water's flow, the day's events, a tap's answer and a
// moment's light. A drawing's idle itself (its float, its flags, its tail, its coded parts) plays
// through engine/ui/animate.ts, handed there by the painter that places it (scenery.ts), as every
// drawing on every page does since the world's motion moved onto it (.docs/animation.md). What moves,
// and the budget it keeps, is engine/motion/world.ts; the rules are in .docs/motion.md. A drawing's
// declared motion comes from the loader (drawings.ts).
import type { Anchors } from "../ink/surface";
import { ticker } from "../motion/loop";
import { springAt, type Spring } from "../motion/spring";
import {
    collapse,
    cuesBetween,
    easeInOut,
    easeOut,
    timeline,
    valueAt,
    type Timeline,
} from "../motion/timeline";
import { motionOf as motionFrom, type DrawingMotion } from "../motion/world";
import type { Pt } from "../space";
import type { Playing } from "./animate";
import { declaredOf } from "./drawings";

/** A drawing's motion in a world, from what the loader holds of it. */
export const motionOf = (ref: string): DrawingMotion | undefined => motionFrom(ref, declaredOf);

/** What the page knows about a drawing it has placed, for a tap or a moment to find its parts by. */
export interface Placed {
    /** The loader's name for the drawing (artKey in engine/space.ts), for its motion. */
    ref: string;
    anchors: Anchors;
    scale: number;
    w: number;
    h: number;
    /** Whether the world plays its motion: its idle through the player, and its answer to a tap. */
    live: boolean;
    /** Its idle as the player plays it, for a gust to poke; none where it is still or declares none. */
    playing?: Playing;
}
export const PLACED = new WeakMap<HTMLElement, Placed>();

/**
 * The smoke a placed drawing's declaration puffs from one of its anchors (the volcano's): a few small
 * clouds rising and drifting downwind on the world's own keyframes, since they draw something that is
 * not in the drawing, which the player does not do. Nothing where the declaration puffs nothing.
 */
export function applyPuff(box: HTMLElement, ref: string, key: number): void {
    const i = motionOf(ref)?.idle;
    if (i?.kind !== "puff") return;
    const p = PLACED.get(box),
        a = p?.anchors[i.at];
    if (!a || !p) return;
    const turn = (Math.abs(key) % 97) / 97;
    box.classList.add("mo-puff");
    box.style.setProperty("--mo-period", `${i.every}s`);
    box.style.setProperty("--mo-rise", `${-i.rise}px`);
    box.style.setProperty("--mo-smoke-drift", `${i.drift}px`);
    for (let n = 0; n < PUFFS; n++) {
        const s = document.createElement("span");
        s.className = "mo-smoke";
        s.style.left = `${a.x * 20 * p.scale}px`;
        s.style.top = `${a.y * 20 * p.scale}px`;
        s.style.animationDelay = `${(-(turn + n / PUFFS) * i.every).toFixed(2)}s`;
        box.append(s);
    }
}

/** Puffs of smoke in the air at once, a share of the period apart. */
const PUFFS = 3;

/**
 * The water's current slows to a stop where it is, or picks up again, over the time the drawings
 * take to settle. Water flows rather than swinging about a rest, so it cannot ease back to one the way
 * a drawing does; it is slowed instead, and a frozen current is as still as a drawing at rest.
 */
export function easeFlow(root: Element, to: number, secs = 1.6): void {
    const runs = Array.from(root.querySelectorAll(".j-water")).flatMap((e) => e.getAnimations());
    const from = runs.map((a) => a.playbackRate);
    if (runs.every((a) => a.playbackRate === to)) return;
    tick((t) => {
        const k = easeInOut(Math.min(1, t / secs));
        runs.forEach((a, i) => {
            a.playbackRate = (from[i] ?? 1) + (to - (from[i] ?? 1)) * k;
        });
        return t < secs;
    });
}

const tick = (frame: (t: number) => boolean) => {
    const tk = ticker({
        now: () => performance.now(),
        schedule: (f) => requestAnimationFrame(f),
        onFrame: (t) => frame(t),
    });
    tk.start();
};

/**
 * Run a timeline on the engine's ticker: `frame` with the time and the timeline being run, and each
 * cue as it is passed. Under reduced motion the timeline is collapsed first, so every track is at its
 * end and every cue fires on the first frame: a movement becomes a cut and nothing is lost.
 */
export function play(
    tl: Timeline,
    frame: (t: number, run: Timeline) => void,
    cue: (name: string) => void,
    still = false,
): void {
    const run = still ? collapse(tl) : tl;
    let last = -1;
    tick((time) => {
        const t = Math.min(time, run.length);
        frame(t, run);
        for (const c of cuesBetween(run, last, t)) cue(c);
        last = t;
        return t < run.length;
    });
}

/** A spring from `from` to `to` on the ticker, calling `set` each frame until it has settled. */
function spring(
    s: Spring,
    from: number,
    to: number,
    set: (x: number) => void,
    end: number,
    done?: () => void,
): void {
    tick((t) => {
        set(springAt(s, from, to, 0, t).x);
        if (t < end) return true;
        set(to);
        done?.();
        return false;
    });
}

/** Where a drawing's anchor is in the world, for a light or a ring to be put there. */
export function anchorAt(box: HTMLElement, name: string): Pt | null {
    const p = PLACED.get(box),
        a = p?.anchors[name];
    if (!p || !a) return null;
    return {
        x: parseFloat(box.style.left) + a.x * 20 * p.scale,
        y: parseFloat(box.style.top) + a.y * 20 * p.scale,
    };
}

/**
 * A light comes on at a point, its beam swings out on both sides and it goes out. Under reduced
 * motion the lamp is simply lit for two seconds. `long` is the world's moment, which sweeps slower.
 */
export function flashAt(layer: HTMLElement, at: Pt, still: boolean, long = false): void {
    const beam = document.createElement("div");
    beam.className = `mo-flash${long ? " long" : ""}`;
    beam.style.left = `${at.x}px`;
    beam.style.top = `${at.y}px`;
    for (const c of ["l", "r", "lamp"])
        beam.append(Object.assign(document.createElement("span"), { className: c }));
    layer.append(beam);
    if (still) {
        beam.style.opacity = "1";
        beam.style.setProperty("--sweep", "1");
        setTimeout(() => beam.remove(), 2000);
        return;
    }
    const k = long ? 1.8 : 1;
    const tl = timeline(
        [
            { name: "on", from: 0, to: 1, at: 0, dur: 0.25 * k, ease: easeOut },
            { name: "off", from: 0, to: 1, at: 0.7 * k, dur: 0.9 * k, ease: easeInOut },
            { name: "sweep", from: 0.15, to: 1, at: 0, dur: 1.3 * k, ease: easeInOut },
        ],
        [{ at: 1.7 * k, cue: "done" }],
    );
    play(
        tl,
        (t, run) => {
            beam.style.opacity = (valueAt(run, "on", t) * (1 - valueAt(run, "off", t))).toFixed(3);
            beam.style.setProperty("--sweep", valueAt(run, "sweep", t).toFixed(3));
        },
        (cue) => {
            if (cue === "done") beam.remove();
        },
    );
}

/** A ring that grows on the water and fades. */
export function ringAt(layer: HTMLElement, at: Pt, still: boolean): void {
    if (still) return;
    const ring = document.createElement("div");
    ring.className = "mo-ring";
    ring.style.left = `${at.x}px`;
    ring.style.top = `${at.y}px`;
    layer.append(ring);
    play(
        timeline(
            [{ name: "r", from: 0, to: 1, at: 0, dur: 1.2, ease: easeOut }],
            [{ at: 1.2, cue: "done" }],
        ),
        (t, run) => {
            const r = valueAt(run, "r", t);
            ring.style.transform = `translate(-50%, -50%) scale(${(0.3 + r * 0.9).toFixed(3)})`;
            ring.style.opacity = (1 - r).toFixed(3);
        },
        (cue) => {
            if (cue === "done") ring.remove();
        },
    );
}

/** Held for a moment under reduced motion, instead of moving: a soft light round the drawing. */
function answerStill(box: HTMLElement): void {
    box.classList.add("mo-answer");
    setTimeout(() => box.classList.remove("mo-answer"), 1200);
}

const SNAP: Spring = { hz: 3.2, zeta: 0.55 };
const HOME: Spring = { hz: 2.2, zeta: 0.9 };

/**
 * A tap on a drawing, answered the way its declaration says. Returns whether it had anything to say.
 * Nothing is recorded: a tap is a gift for a curious child, not a thing that counts.
 */
export function react(box: HTMLElement, layer: HTMLElement, still: boolean): boolean {
    const p = PLACED.get(box),
        r = p?.live ? motionOf(p.ref)?.react : undefined;
    if (!p || !r) return false;
    if (box.dataset.busy) return true;
    const svg = box.querySelector<SVGSVGElement>(":scope > svg");
    if (r.kind === "flash") {
        const at = anchorAt(box, r.at);
        if (at) flashAt(layer, at, still);
        return true;
    }
    if (still || !svg) {
        answerStill(box);
        return true;
    }
    box.dataset.busy = "1";
    const free = () => {
        delete box.dataset.busy;
    };
    if (r.kind === "step") {
        // out on a lively spring, then home on a calm one
        spring(
            SNAP,
            0,
            r.by,
            (x) => {
                box.style.translate = `${x.toFixed(1)}px 0`;
            },
            0.35,
            () =>
                spring(
                    HOME,
                    r.by,
                    0,
                    (x) => {
                        box.style.translate = `${x.toFixed(1)}px 0`;
                    },
                    0.9,
                    () => {
                        box.style.translate = "";
                        free();
                    },
                ),
        );
    } else if (r.kind === "hop") {
        play(
            timeline(
                [
                    { name: "up", from: 0, to: 1, at: 0, dur: 0.18, ease: easeOut },
                    { name: "down", from: 0, to: 1, at: 0.18, dur: 0.32, ease: easeInOut },
                ],
                [{ at: 0.5, cue: "done" }],
            ),
            (t, run) => {
                box.style.translate = `0 ${(-r.by * (valueAt(run, "up", t) - valueAt(run, "down", t))).toFixed(1)}px`;
            },
            (cue) => {
                if (cue === "done") {
                    box.style.translate = "";
                    free();
                }
            },
        );
    } else if (r.kind === "dip") {
        // the box dips, not its picture, which is busy with its own float
        const ring = {
                x: parseFloat(box.style.left) + p.w * 0.62,
                y: parseFloat(box.style.top) + p.h * 0.95,
            },
            origin = box.style.transformOrigin;
        box.style.transformOrigin = "70% 90%";
        play(
            timeline(
                [
                    { name: "down", from: 0, to: 1, at: 0, dur: 0.3, ease: easeOut },
                    { name: "up", from: 0, to: 1, at: 0.45, dur: 0.45, ease: easeInOut },
                ],
                [
                    { at: 0.3, cue: "splash" },
                    { at: 0.9, cue: "done" },
                ],
            ),
            (t, run) => {
                box.style.rotate = `${(r.deg * (valueAt(run, "down", t) - valueAt(run, "up", t))).toFixed(2)}deg`;
            },
            (cue) => {
                if (cue === "splash") ringAt(layer, ring, false);
                if (cue === "done") {
                    box.style.rotate = "";
                    box.style.transformOrigin = origin;
                    free();
                }
            },
        );
    } else if (r.kind === "gust") {
        // its own idle movement, bigger for a moment and dying away: the player's poke
        p.playing?.poke();
        setTimeout(free, 2200);
    }
    return true;
}

/** A world's moment playing on the day it happens: its light comes on and sweeps slowly, once. */
export function playMoment(gate: HTMLElement, layer: HTMLElement, still: boolean): void {
    const p = PLACED.get(gate),
        r = p && motionOf(p.ref)?.react;
    if (r?.kind === "flash") {
        const at = anchorAt(gate, r.at);
        if (at) flashAt(layer, at, still, true);
    }
    bloom(gate, still);
}

/** A drawing lit by a lesson, or inked by a term, brightening once as it happens. */
export function bloom(box: HTMLElement, still: boolean): void {
    if (still) return;
    box.classList.add("mo-bloom");
    setTimeout(() => box.classList.remove("mo-bloom"), 1600);
}

/** A creature that has just joined the guide walks up the path to it. */
export function walkIn(box: HTMLElement, from: Pt, still: boolean): void {
    if (still) return;
    box.style.translate = `${from.x}px ${from.y}px`;
    play(
        timeline(
            [{ name: "w", from: 0, to: 1, at: 0.3, dur: 1.8, ease: easeInOut }],
            [{ at: 2.1, cue: "done" }],
        ),
        (t, run) => {
            const u = valueAt(run, "w", t),
                hop = Math.abs(Math.sin(u * Math.PI * 5)) * 10 * (1 - u);
            box.style.translate = `${(from.x * (1 - u)).toFixed(1)}px ${(from.y * (1 - u) - hop).toFixed(1)}px`;
        },
        (cue) => {
            if (cue === "done") box.style.translate = "";
        },
    );
}
