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
