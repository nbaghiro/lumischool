import type { Pt } from "./geometry";

export interface Piece {
    id: string;
    x: number;
    y: number;
    angle: number;
    locked?: boolean;
}

export interface Design {
    version: 1;
    pieces: Piece[];
}

export type Edit =
    | { kind: "move"; id: string; x: number; y: number }
    | { kind: "rotate"; id: string; angle: number };

export interface Workshop {
    design: Design;
    past: Design[];
    future: Design[];
    bounds: { w: number; h: number };
}

const copy = (d: Design): Design => ({ version: 1, pieces: d.pieces.map((p) => ({ ...p })) });

export function workshop(pieces: Piece[], bounds: Workshop["bounds"]): Workshop {
    if (new Set(pieces.map((p) => p.id)).size !== pieces.length)
        throw new Error("Piece IDs must be unique.");
    return { design: copy({ version: 1, pieces }), past: [], future: [], bounds };
}

export function edit(w: Workshop, e: Edit): boolean {
    const piece = w.design.pieces.find((p) => p.id === e.id);
    if (!piece || piece.locked) return false;
    if (e.kind === "move" && (!Number.isFinite(e.x) || !Number.isFinite(e.y))) return false;
    if (e.kind === "rotate" && !Number.isFinite(e.angle)) return false;
    const next =
        e.kind === "move"
            ? {
                  ...piece,
                  x: Math.max(1, Math.min(w.bounds.w - 1, e.x)),
                  y: Math.max(1, Math.min(w.bounds.h - 1, e.y)),
              }
            : { ...piece, angle: Math.max(-Math.PI, Math.min(Math.PI, e.angle)) };
    if (next.x === piece.x && next.y === piece.y && next.angle === piece.angle) return false;
    w.past.push(copy(w.design));
    if (w.past.length > 100) w.past.shift();
    w.future = [];
    w.design.pieces = w.design.pieces.map((p) => (p.id === e.id ? next : p));
    return true;
}

export function undo(w: Workshop): boolean {
    const previous = w.past.pop();
    if (!previous) return false;
    w.future.push(copy(w.design));
    w.design = previous;
    return true;
}

export function redo(w: Workshop): boolean {
    const next = w.future.pop();
    if (!next) return false;
    w.past.push(copy(w.design));
    w.design = next;
    return true;
}

export function checkpoint(w: Workshop): Design {
    return copy(w.design);
}

export function restore(w: Workshop, value: unknown): boolean {
    if (
        !value ||
        typeof value !== "object" ||
        !("version" in value) ||
        value.version !== 1 ||
        !("pieces" in value) ||
        !Array.isArray(value.pieces) ||
        value.pieces.length !== w.design.pieces.length
    )
        return false;
    const pieces: Piece[] = [];
    for (const raw of value.pieces as unknown[]) {
        if (
            !raw ||
            typeof raw !== "object" ||
            !("id" in raw) ||
            typeof raw.id !== "string" ||
            !("x" in raw) ||
            typeof raw.x !== "number" ||
            !("y" in raw) ||
            typeof raw.y !== "number" ||
            !("angle" in raw) ||
            typeof raw.angle !== "number"
        )
            return false;
        const original = w.design.pieces.find((p) => p.id === raw.id);
        if (
            !original ||
            pieces.some((p) => p.id === raw.id) ||
            !Number.isFinite(raw.x) ||
            !Number.isFinite(raw.y) ||
            !Number.isFinite(raw.angle) ||
            raw.x < 1 ||
            raw.x > w.bounds.w - 1 ||
            raw.y < 1 ||
            raw.y > w.bounds.h - 1 ||
            Math.abs(raw.angle) > Math.PI
        )
            return false;
        if (
            original.locked &&
            (raw.x !== original.x || raw.y !== original.y || raw.angle !== original.angle)
        )
            return false;
        pieces.push({ ...original, x: raw.x, y: raw.y, angle: raw.angle });
    }
    w.design = { version: 1, pieces };
    w.past = [];
    w.future = [];
    return true;
}

/**
 * A point on a piece where another piece may meet it, in squares from the piece's middle before it
 * is turned: a corner, the end of a plank, a hook.
 */
export type Anchor = Pt;

/** Where a piece's anchors are in the world, placed at `at` and turned by `angle`. */
export const anchorsAt = (anchors: readonly Anchor[], at: Pt, angle = 0): Pt[] => {
    const c = Math.cos(angle),
        s = Math.sin(angle);
    return anchors.map((a) => ({ x: at.x + a.x * c - a.y * s, y: at.y + a.x * s + a.y * c }));
};

/**
 * The shortest move that brings one of a held piece's anchors onto one of the anchors around it, when
 * it is no further than `reach`, or null: a block let go a hair from its neighbour meets it. `axis`
 * keeps the move to one direction, for a piece that falls into place the other way.
 */
export function snap(
    held: readonly Pt[],
    around: readonly Pt[],
    reach: number,
    axis?: "x" | "y",
): Pt | null {
    let best: Pt | null = null,
        least = reach;
    for (const h of held)
        for (const a of around) {
            const move = {
                x: axis === "y" ? 0 : a.x - h.x,
                y: axis === "x" ? 0 : a.y - h.y,
            };
            const d = Math.hypot(move.x, move.y);
            if (d < least || (best === null && d <= least)) {
                least = d;
                best = move;
            }
        }
    return best;
}

export interface Objective {
    id: string;
    label: string;
    after?: string;
    seconds?: number;
}

export interface Objectives {
    definitions: readonly Objective[];
    held: Record<string, number>;
    done: string[];
}

export const objectives = (definitions: readonly Objective[]): Objectives => ({
    definitions,
    held: {},
    done: [],
});

export function observe(o: Objectives, satisfied: ReadonlySet<string>, dt: number): string[] {
    const newly: string[] = [];
    if (!Number.isFinite(dt) || dt < 0) return newly;
    const before = new Set(o.done);
    for (const goal of o.definitions) {
        if (before.has(goal.id) || (goal.after && !before.has(goal.after))) continue;
        o.held[goal.id] = satisfied.has(goal.id) ? (o.held[goal.id] ?? 0) + dt : 0;
        if (satisfied.has(goal.id) && (o.held[goal.id] ?? 0) >= (goal.seconds ?? 0)) {
            o.done.push(goal.id);
            newly.push(goal.id);
        }
    }
    return newly;
}
