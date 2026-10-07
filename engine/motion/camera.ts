// A camera that follows, in squares. The view is how much of the world a zoom of one shows, and a
// zoom under one shows more of it. Easing is a fraction of the way per step, worked out from a rate
// per second, so a fixed-step game eases the same at any frame rate and a test can step it.
import type { Pt } from "./geometry";

export interface Size {
    w: number;
    h: number;
}
export interface Cam {
    x: number;
    y: number;
    zoom: number;
}

/** The zoom at which the whole world fits the view, never more than one. */
export const fitZoom = (view: Size, world: Size): number =>
    Math.min(1, view.w / world.w, view.h / world.h);

/** A centre moved just far enough that the view stays inside the world; across a world narrower than the view, the middle, or down one shorter than it with `foot`, the world stood on the view's foot. */
export function keepInside(c: Pt, view: Size, world: Size, zoom = 1, foot = false): Pt {
    const hw = view.w / zoom / 2,
        hh = view.h / zoom / 2;
    const pin = (v: number, half: number, size: number, low: boolean): number =>
        size <= half * 2
            ? low
                ? size - half
                : size / 2
            : Math.max(half, Math.min(size - half, v));
    return { x: pin(c.x, hw, world.w, false), y: pin(c.y, hh, world.h, foot) };
}

/** Where to look for a thing moving at `v`: `ahead` seconds in front of it, but never more than `most` squares. */
export function lead(at: Pt, v: Pt, ahead: number, most: number): Pt {
    const dx = v.x * ahead,
        dy = v.y * ahead,
        d = Math.hypot(dx, dy);
    const k = d > most ? most / d : 1;
    return { x: at.x + dx * k, y: at.y + dy * k };
}

/** The fraction of the way to go in one step of `dt` seconds at `rate` per second. */
export const easing = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);

/**
 * One step towards the camera wanted, kept inside the world: the place at `rate` per second and the
 * zoom at `zoomRate`, which defaults to the same.
 */
export function follow(
    cam: Cam,
    want: Cam,
    o: { rate: number; zoomRate?: number; dt: number; view: Size; world: Size },
): Cam {
    const zoom = cam.zoom + (want.zoom - cam.zoom) * easing(o.zoomRate ?? o.rate, o.dt);
    const to = keepInside(want, o.view, o.world, zoom);
    const k = easing(o.rate, o.dt);
    const at = keepInside(
        { x: cam.x + (to.x - cam.x) * k, y: cam.y + (to.y - cam.y) * k },
        o.view,
        o.world,
        zoom,
    );
    return { x: at.x, y: at.y, zoom };
}

/**
 * The part of a layer in view, in that layer's own squares. A layer at `depth` one is the world; a
 * far layer at a half moves half as far across as the camera does, which is what makes hills look far
 * off, and one at nought stays where it is. Up and down, every layer moves with the camera. A scene
 * fills only this much of a layer that goes on and on.
 */
export function seen(
    cam: Cam,
    view: Size,
    depth = 1,
): { x0: number; x1: number; y0: number; y1: number } {
    const hw = view.w / cam.zoom / 2,
        hh = view.h / cam.zoom / 2;
    return {
        x0: cam.x * depth - hw,
        x1: cam.x * depth + hw,
        y0: cam.y - hh,
        y1: cam.y + hh,
    };
}

/** A room held upright, as a phone is: taller than wide, and no wider than a phone. */
export const portrait = (room: Size): boolean => room.h > room.w && room.w < 700;

/**
 * The square a room held upright shows a view at: `keep` squares across, and never so big that the
 * view's height runs off the room, nor smaller than the square that shows the whole view.
 */
export function uprightSquare(view: Size, room: Size, keep: number, whole: number): number {
    return Math.max(whole, Math.min(Math.floor(room.w / keep), Math.floor(room.h / view.h)));
}

/** A readout as the field lays it out: a fixed sprite, or a fixed word by its place and the height it is written at. */
export type Readout = Shown | Word;
/** A fixed sprite: its place, and its box in squares as drawn, standing on its place when it stands. */
type Shown = { key: string; x: number; y: number; w: number; h: number; stand?: boolean };
type Word = { x: number; y: number; size?: number; text: string; key?: undefined };

/** Where a readout sits on the field, in its squares, and how much bigger than authored it is drawn. */
export interface Placed {
    x: number;
    y: number;
    k: number;
}

/** Where readouts placed in the authored view sit on the field, and the way back for a finger on one. */
export interface ReadoutLayout {
    at(r: Pt & { key?: string }): Placed;
    from(p: Pt): Pt;
}

interface Group {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    /** Where its top left corner sits on the field, and how much bigger it is drawn. */
    to: Placed;
}

/** A word's width in ems per letter in the hand the field writes in: its words measure 0.47 to 0.56. */
export const LETTER = 0.55;

/**
 * Lays out a frame's readouts on a field `shown` squares across and down, moving each group of them
 * whole so it keeps its spacing. Readouts are a group when their keys share the part before a colon (a
 * strip's card "steps" and its chips "steps:tick:2") or when they touch (a coin on its counter), and a
 * word goes with the group it is written in. Along an axis the field is as long as the authored view
 * or longer, a group keeps its share of the field, so one in a corner stays in the field's corner.
 * Along a shorter one, as across a phone held upright, a group in the first third keeps to the near
 * edge, one in the last third to the far edge, and one in the middle to the middle. A group with a
 * word that would be written smaller than `least` squares, and so is held at that size and grows, is
 * drawn as much bigger as a whole as keeps the word inside it. Moving each readout by its own share and keeping its
 * size ran a row of them into itself. See .docs/engine.md.
 */
export function readoutLayout(
    readouts: readonly Readout[],
    authored: Size,
    shown: Size,
    least = 0,
): ReadoutLayout {
    const spread = (length: number, field: number) => field >= length;
    /** Where a span from `lo` to `hi` drawn `k` times bigger starts on the field, along one axis. */
    const start = (lo: number, hi: number, k: number, length: number, field: number): number => {
        const third = length / 3,
            mid = (lo + hi) / 2,
            span = (hi - lo) * k;
        if (spread(length, field)) {
            if (mid < third) return (lo * field) / length;
            if (mid > length - third) return (hi * field) / length - span;
            return (mid * field) / length - span / 2;
        }
        if (mid < third) return lo;
        if (mid > length - third) return hi + field - length - span;
        return mid + (field - length) / 2 - span / 2;
    };
    /** As `start`, kept inside the field where the span fits it: a readout is there to be seen. */
    const kept = (lo: number, hi: number, k: number, length: number, field: number): number => {
        const at = start(lo, hi, k, length, field),
            span = (hi - lo) * k;
        return span > field ? at : Math.max(0, Math.min(field - span, at));
    };
    const sprites = readouts.flatMap((r) => {
        if (r.key === undefined) return [];
        const cy = r.stand ? r.y - r.h / 2 : r.y;
        const name = r.key.split(":")[0] ?? r.key;
        return [
            {
                key: r.key,
                name,
                x0: r.x - r.w / 2,
                x1: r.x + r.w / 2,
                y0: cy - r.h / 2,
                y1: cy + r.h / 2,
            },
        ];
    });
    const root = sprites.map((_, i) => i);
    const find = (i: number): number => {
        let j = i;
        while ((root[j] ?? j) !== j) j = root[j] ?? j;
        return j;
    };
    for (let i = 0; i < sprites.length; i++)
        for (let j = i + 1; j < sprites.length; j++) {
            const a = sprites[i],
                b = sprites[j];
            if (!a || !b) continue;
            const touch = a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
            if (a.name === b.name || touch) root[find(j)] = find(i);
        }
    const groups = new Map<number, Group>();
    sprites.forEach((s, i) => {
        const g = find(i),
            had = groups.get(g);
        groups.set(g, {
            x0: Math.min(had?.x0 ?? Infinity, s.x0),
            x1: Math.max(had?.x1 ?? -Infinity, s.x1),
            y0: Math.min(had?.y0 ?? Infinity, s.y0),
            y1: Math.max(had?.y1 ?? -Infinity, s.y1),
            to: { x: 0, y: 0, k: 1 },
        });
    });
    const area = (g: Group): number => (g.x1 - g.x0) * (g.y1 - g.y0);
    /** The smallest group a word is written inside, or within `near` squares of, as a caption under a card is. */
    const holding = (p: Pt, near = 0): Group | undefined => {
        let best: Group | undefined;
        for (const g of groups.values())
            if (
                p.x >= g.x0 - near &&
                p.x <= g.x1 + near &&
                p.y >= g.y0 - near &&
                p.y <= g.y1 + near
            )
                if (!best || area(g) < area(best)) best = g;
        return best;
    };
    for (const r of readouts)
        if (r.key === undefined) {
            const g = holding(r);
            // as wide as its widest word at the least size, with half a square to spare
            if (g && least > (r.size ?? 0.8))
                g.to.k = Math.max(g.to.k, (r.text.length * LETTER * least + 0.5) / (g.x1 - g.x0));
        }
    for (const g of groups.values())
        g.to = {
            x: kept(g.x0, g.x1, g.to.k, authored.w, shown.w),
            y: kept(g.y0, g.y1, g.to.k, authored.h, shown.h),
            k: g.to.k,
        };
    // a group that lands on one already placed goes under it, leaving a line for any words written under
    // that; a field is taller than wide where groups crowd, and one drawn at its own size keeps its place
    const placed: Group[] = [];
    const box = (g: Group) => ({
        x0: g.to.x,
        x1: g.to.x + (g.x1 - g.x0) * g.to.k,
        y0: g.to.y,
        y1: g.to.y + (g.y1 - g.y0) * g.to.k,
    });
    for (const g of [...groups.values()].sort(
        (a, b) => Number(a.to.k > 1) - Number(b.to.k > 1) || a.y0 - b.y0 || a.x0 - b.x0,
    )) {
        for (let moved = true; moved;) {
            moved = false;
            const a = box(g);
            for (const o of placed) {
                const b = box(o);
                if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) {
                    g.to = { ...g.to, y: b.y1 + 1.5 };
                    moved = true;
                    break;
                }
            }
        }
        placed.push(g);
    }
    const byKey = new Map<string, Group>();
    sprites.forEach((s, i) => {
        const g = groups.get(find(i));
        if (g) byKey.set(s.key, g);
    });
    const place = (g: Group, p: Pt): Placed => ({
        x: g.to.x + (p.x - g.x0) * g.to.k,
        y: g.to.y + (p.y - g.y0) * g.to.k,
        k: g.to.k,
    });
    /** A point outside every group, moved as a group of its own would be. */
    const alone = (p: Pt): Placed => ({
        x: start(p.x, p.x, 1, authored.w, shown.w),
        y: start(p.y, p.y, 1, authored.h, shown.h),
        k: 1,
    });
    /** Back from the field along one axis, for a point outside every group: whichever third it can have come from, the middle first. */
    const back = (v: number, length: number, field: number): number => {
        if (spread(length, field)) return (v * length) / field;
        const third = length / 3,
            middle = v - (field - length) / 2;
        if (middle >= third && middle <= length - third) return middle;
        return v < third ? v : v + length - field;
    };
    return {
        at: (r) => {
            const g = r.key !== undefined ? byKey.get(r.key) : (holding(r) ?? holding(r, 1.2));
            return g ? place(g, r) : alone(r);
        },
        from: (p) => {
            let best: Group | undefined;
            for (const g of groups.values()) {
                const k = g.to.k;
                const inside =
                    p.x >= g.to.x &&
                    p.x <= g.to.x + (g.x1 - g.x0) * k &&
                    p.y >= g.to.y &&
                    p.y <= g.to.y + (g.y1 - g.y0) * k;
                if (inside && (!best || area(g) < area(best))) best = g;
            }
            return best
                ? {
                      x: best.x0 + (p.x - best.to.x) / best.to.k,
                      y: best.y0 + (p.y - best.to.y) / best.to.k,
                  }
                : { x: back(p.x, authored.w, shown.w), y: back(p.y, authored.h, shown.h) };
        },
    };
}

/**
 * The square a card shows a view at: `keep` squares across, cropping the view's height as well as its
 * width round the frame's focus, and never smaller than the square that shows the whole view.
 */
export function cardSquare(view: Size, room: Size, keep: number): number {
    const whole = Math.floor(Math.min(room.w / view.w, room.h / view.h));
    return Math.max(whole, Math.floor(room.w / keep));
}
