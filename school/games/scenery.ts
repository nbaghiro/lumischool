// Scenes composed from the shelf's drawings, for any game that wants a place rather than a sheet.
//
// A game names drawings and where they stand; this file places the ones that repeat: a row of hills,
// trees or houses along a line, a ground, a sea or a meadow drawn in lengths, clouds that drift and
// birds that cross now and then. A row can stand at a depth, so it moves by that share of the camera
// and a scrolling scene has far hills and near grass, and it can repeat every lap of a course that
// goes round, so a world that wraps shows no seam. Everything is placed from a seed and a step
// count, so a scene is the same place every time and in every replay. Nothing here draws: it only
// says which shelf drawing goes where, and the page draws them. See .docs/engine.md.
import { seen, type Cam, type Size } from "../../engine/motion/camera";
import type { Sprite } from "../../engine/motion/scene";

/** A shelf drawing and how big to draw it, in squares across. */
export interface Thing {
    art: string;
    params?: Record<string, unknown>;
    size: number;
    flip?: boolean;
}

/** Where a scene is being looked at from: the camera, how much of the world a view shows, and the lap of a course that goes round. */
export interface Eye {
    cam: Cam;
    view: Size;
    lap?: number;
}

/** A number from nought to one fixed by whole numbers, so a row is the same row every time it is drawn. */
const hash = (a: number, b: number, k = 0): number => {
    const s = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453;
    return s - Math.floor(s);
};

/** The places a thing every `every` squares falls in view, and the index it repeats as when the row goes round every `period`. */
function places(
    x0: number,
    x1: number,
    every: number,
    period: number | undefined,
): { k: number; at: number }[] {
    const n = period ? Math.max(1, Math.round(period / every)) : 0,
        step = n ? (period ?? every) / n : every,
        out: { k: number; at: number }[] = [];
    for (let i = Math.floor(x0 / step) - 1; i * step <= x1 + step; i++)
        out.push({ k: n ? ((i % n) + n) % n : i, at: i * step });
    return out;
}

/**
 * A row of things standing along a line, one about every `every` squares and each strayed a little
 * from its place, chosen by how often each comes up. `base` is the line their feet stand on, and a
 * thing with a `lift` stands that far above it (a cloud, a bird on the wing).
 */
export interface Row {
    key: string;
    depth: number;
    base: number;
    every: number;
    stray: number;
    things: (Thing & { often: number; lift?: number })[];
    z: number;
    /** The share of places left empty. */
    gaps?: number;
    /** Squares a second the whole row drifts to the right, for clouds. */
    drift?: number;
    /** Drawn fainter, as far things are in air: nought to one. */
    alpha?: number;
}

export function row(r: Row, eye: Eye, seed: number, t = 0): Sprite[] {
    const span = seen(eye.cam, eye.view, r.depth),
        shift = (r.drift ?? 0) * t,
        out: Sprite[] = [];
    const total = r.things.reduce((a, x) => a + x.often, 0);
    for (const { k, at } of places(
        span.x0 - shift - 8,
        span.x1 - shift + 8,
        r.every,
        eye.lap ? eye.lap * r.depth : undefined,
    )) {
        if (hash(k, seed, 1) < (r.gaps ?? 0)) continue;
        let pick = hash(k, seed, 2) * total,
            thing = r.things[0];
        for (const x of r.things) {
            pick -= x.often;
            if (pick <= 0) {
                thing = x;
                break;
            }
        }
        if (!thing) continue;
        out.push({
            key: `${r.key}:${k}:${at < 0 ? "a" : "b"}${Math.floor(at / (eye.lap ? eye.lap * r.depth : 1e9))}`,
            art: thing.art,
            params: thing.params,
            size: thing.size * (0.9 + hash(k, seed, 3) * 0.2),
            seed: seed + k * 7,
            x: at + (hash(k, seed, 4) - 0.5) * 2 * r.stray + shift,
            y: r.base - (thing.lift ?? 0),
            stand: true,
            depth: r.depth === 1 ? undefined : r.depth,
            z: r.z,
            flip: thing.flip ?? hash(k, seed, 5) < 0.5,
            still: !r.drift,
            alpha: r.alpha,
        });
    }
    return out;
}

/**
 * A drawing that is drawn in lengths along a line (a ground, a sea, a meadow, a road), each length
 * told where it starts and how many whole squares it runs, so the next carries on from it with no
 * gap. On a course that goes round, the lengths are stretched to fit a lap exactly.
 */
export function lengths(
    o: {
        key: string;
        art: string;
        every: number;
        y: number;
        depth?: number;
        z: number;
        params(x0: number, across: number): Record<string, unknown>;
    },
    eye: Eye,
): Sprite[] {
    const d = o.depth ?? 1,
        period = eye.lap ? eye.lap * d : undefined,
        span = seen(eye.cam, eye.view, d),
        out: Sprite[] = [];
    const n = period ? Math.max(1, Math.round(period / o.every)) : 0,
        step = n && period ? period / n : o.every,
        across = Math.ceil(step);
    for (const { k, at } of places(span.x0, span.x1, o.every, period)) {
        const x0 = eye.lap ? Math.round(k * step) : at;
        out.push({
            key: `${o.key}:${k}:${Math.floor(at / (period ?? 1e9))}`,
            art: o.art,
            params: o.params(x0, across),
            seed: 900 + k,
            x: at + across / 2,
            y: o.y,
            depth: d === 1 ? undefined : d,
            z: o.z,
            still: true,
        });
    }
    return out;
}

/**
 * Something that crosses the sky now and then, from one side of the view to the other: geese in
 * their V, a gull, an eagle. It is a function of the time, so it crosses the same way in a replay,
 * and it bobs a little as it goes. Nothing crosses under reduced motion, which never asks for it.
 */
export function crossing(
    o: {
        key: string;
        thing: Thing;
        every: number;
        takes: number;
        y: number;
        bob: number;
        z: number;
        seed: number;
    },
    eye: Eye,
    t: number,
): Sprite | null {
    const round = Math.floor(t / o.every),
        u = (t - round * o.every) / o.takes;
    if (u > 1) return null;
    const span = seen(eye.cam, eye.view, 1),
        left = hash(round, o.seed) < 0.5,
        from = left ? span.x0 - 6 : span.x1 + 6,
        to = left ? span.x1 + 6 : span.x0 - 6;
    const y = o.y + (hash(round, o.seed, 1) - 0.5) * 3 + Math.sin(u * Math.PI * 6) * o.bob;
    return {
        key: `${o.key}:${round}`,
        art: o.thing.art,
        params: o.thing.params,
        size: o.thing.size,
        x: from + (to - from) * u,
        y,
        flip: left === (o.thing.flip ?? false),
        z: o.z,
        seed: o.seed + round,
    };
}
