// Floating by submerged area, seen from the side: the part of a shape under a water line, how much of
// it there is and where its middle is, which is where the water pushes up. Squares, y down, so the
// water is everything whose y is greater than the surface's.
import type { Pt } from "./geometry";

/**
 * The part of a polygon below a surface, as a polygon, empty when it is all above. The surface is a
 * height, or a line through two points for water that is higher at one end than the other, as a wave
 * is across a raft.
 */
export function below(poly: readonly Pt[], surface: number | readonly [Pt, Pt]): Pt[] {
    const depth =
        typeof surface === "number"
            ? (p: Pt) => p.y - surface
            : (p: Pt) => {
                  const [a, b] = surface,
                      k = Math.abs(b.x - a.x) < 1e-9 ? 0 : (b.y - a.y) / (b.x - a.x);
                  return p.y - (a.y + k * (p.x - a.x));
              };
    const out: Pt[] = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i],
            b = poly[(i + 1) % poly.length];
        if (!a || !b) continue;
        const da = depth(a),
            db = depth(b);
        if (da >= 0) out.push(a);
        if (da >= 0 !== db >= 0) {
            const t = da / (da - db);
            out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
    }
    return out;
}

/** A polygon's area and the middle of it, whichever way round its corners go. */
export function areaOf(poly: readonly Pt[]): { area: number; centre: Pt } {
    let twice = 0,
        cx = 0,
        cy = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i],
            b = poly[(i + 1) % poly.length];
        if (!a || !b) continue;
        const cross = a.x * b.y - b.x * a.y;
        twice += cross;
        cx += (a.x + b.x) * cross;
        cy += (a.y + b.y) * cross;
    }
    if (Math.abs(twice) < 1e-12) return { area: 0, centre: poly[0] ?? { x: 0, y: 0 } };
    return { area: Math.abs(twice) / 2, centre: { x: cx / (3 * twice), y: cy / (3 * twice) } };
}

/** How much of a polygon is under the water, and where the water pushes it up from. */
export function submerged(
    poly: readonly Pt[],
    surface: number | readonly [Pt, Pt],
): { area: number; centre: Pt } {
    return areaOf(below(poly, surface));
}

/** A ball's outline as a polygon of `n` corners, for measuring it as any other shape. */
export const ring = (c: Pt, r: number, n = 16): Pt[] =>
    Array.from({ length: n }, (_, i) => ({
        x: c.x + r * Math.cos((i / n) * Math.PI * 2),
        y: c.y + r * Math.sin((i / n) * Math.PI * 2),
    }));
