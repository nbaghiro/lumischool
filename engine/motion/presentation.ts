import type { Pt } from "./geometry";
import type { Mark } from "./scene";

/** Logical game coordinates to the displayed field, without changing simulation or replay. */
export interface Projection {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}

export const projectPoint = (p: Pt, m: Projection): Pt => ({
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
});

export function unprojectPoint(p: Pt, m: Projection): Pt {
    const det = m.a * m.d - m.b * m.c;
    if (Math.abs(det) < 1e-9) throw new Error("A field projection must be invertible");
    const x = p.x - m.e,
        y = p.y - m.f;
    return { x: (m.d * x - m.c * y) / det, y: (m.a * y - m.b * x) / det };
}

export function projectMark(mark: Mark, m: Projection): Mark {
    if (mark.kind === "dots") return { ...mark, pts: mark.pts.map((p) => projectPoint(p, m)) };
    if (mark.kind === "line")
        return { ...mark, a: projectPoint(mark.a, m), b: projectPoint(mark.b, m) };
    if (mark.kind === "box") {
        const a = projectPoint(mark, m),
            b = projectPoint({ x: mark.x + mark.w, y: mark.y + mark.h }, m);
        return {
            ...mark,
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            w: Math.abs(b.x - a.x),
            h: Math.abs(b.y - a.y),
        };
    }
    return { ...mark, ...projectPoint(mark, m) };
}
