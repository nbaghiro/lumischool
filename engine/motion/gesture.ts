// Pointer samples in, the gestures a child's hand makes out: a tap, a hold, a drag, and a release
// with a velocity that tells a drop from a flick. The page turns pointer events into samples, so a
// test feeds samples of its own. One pointer at a time on purpose: a second finger during a drag is
// ignored rather than read as a pinch, so a five-year-old's other hand resting on the screen does not
// cancel the drag.

export interface Sample {
    id: number;
    kind: "down" | "move" | "up" | "cancel";
    x: number;
    y: number;
    /** Milliseconds, on any clock that is consistent across the samples. */
    t: number;
}

export type Gesture =
    | { kind: "tap"; x: number; y: number; t: number }
    | { kind: "hold"; x: number; y: number; t: number }
    | { kind: "drag-start"; x: number; y: number; t: number; fromX: number; fromY: number }
    | { kind: "drag"; x: number; y: number; t: number; dx: number; dy: number }
    | { kind: "drag-end"; x: number; y: number; t: number; vx: number; vy: number; flick: boolean }
    | { kind: "cancel"; t: number };

export interface Feel {
    /** How far a pointer may wander and still be a tap, in the samples' units. */
    slop: number;
    holdMs: number;
    /** Units per second. */
    flickSpeed: number;
    /** Milliseconds before the release that its velocity is measured over. */
    window: number;
}

/** In board squares at twenty pixels a square, so eight pixels of slop. */
const FEEL: Feel = { slop: 0.4, holdMs: 500, flickSpeed: 14, window: 100 };

interface TrailPoint {
    x: number;
    y: number;
    t: number;
}

interface Tracking {
    id: number;
    fromX: number;
    fromY: number;
    t0: number;
    x: number;
    y: number;
    t: number;
    dragging: boolean;
    held: boolean;
    trail: TrailPoint[];
}

/**
 * Units per second over the window before the last sample. A finger that stopped before letting go
 * has its last samples in one place and reads as a drop, which is what a child who placed a thing meant.
 */
export function velocity(trail: TrailPoint[], window: number): { vx: number; vy: number } {
    const last = trail[trail.length - 1];
    if (!last) return { vx: 0, vy: 0 };
    let first = last;
    for (let i = trail.length - 1; i >= 0; i--) {
        const sample = trail[i];
        if (!sample || last.t - sample.t > window) break;
        first = sample;
    }
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return { vx: 0, vy: 0 };
    return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

export class Recogniser {
    private on: Tracking | null = null;
    readonly feel: Feel;

    constructor(feel: Partial<Feel> = {}) {
        this.feel = { ...FEEL, ...feel };
    }

    get active(): boolean {
        return this.on !== null;
    }

    feed(s: Sample): Gesture[] {
        const out: Gesture[] = [];
        if (s.kind === "down") {
            if (this.on) return out;
            this.on = {
                id: s.id,
                fromX: s.x,
                fromY: s.y,
                t0: s.t,
                x: s.x,
                y: s.y,
                t: s.t,
                dragging: false,
                held: false,
                trail: [{ x: s.x, y: s.y, t: s.t }],
            };
            return out;
        }
        const on = this.on;
        if (!on || on.id !== s.id) return out;
        if (s.kind === "move") {
            const dx = s.x - on.x,
                dy = s.y - on.y;
            on.x = s.x;
            on.y = s.y;
            on.t = s.t;
            on.trail.push({ x: s.x, y: s.y, t: s.t });
            if (on.trail.length > 64) on.trail.shift();
            if (!on.dragging && Math.hypot(s.x - on.fromX, s.y - on.fromY) > this.feel.slop) {
                on.dragging = true;
                out.push({
                    kind: "drag-start",
                    x: s.x,
                    y: s.y,
                    t: s.t,
                    fromX: on.fromX,
                    fromY: on.fromY,
                });
            }
            if (on.dragging) out.push({ kind: "drag", x: s.x, y: s.y, t: s.t, dx, dy });
            return out;
        }
        this.on = null;
        if (s.kind === "cancel") {
            out.push({ kind: "cancel", t: s.t });
            return out;
        }
        if (on.dragging) {
            on.trail.push({ x: s.x, y: s.y, t: s.t });
            const { vx, vy } = velocity(on.trail, this.feel.window);
            const flick = Math.hypot(vx, vy) >= this.feel.flickSpeed;
            out.push({ kind: "drag-end", x: s.x, y: s.y, t: s.t, vx, vy, flick });
        } else if (!on.held) {
            out.push({ kind: "tap", x: s.x, y: s.y, t: s.t });
        }
        return out;
    }

    /** Holds need a clock the samples do not carry, so the page polls from its frame loop. */
    poll(t: number): Gesture[] {
        const on = this.on;
        if (!on || on.dragging || on.held || t - on.t0 < this.feel.holdMs) return [];
        on.held = true;
        return [{ kind: "hold", x: on.x, y: on.y, t }];
    }
}
