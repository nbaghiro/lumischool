import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";

type Pt = [number, number];

const deg = (d: number): number => (d * Math.PI) / 180;

export const construction = defineDrawing({
    id: "construction",
    family: "shapes",
    title: "Compass construction",
    group: "Structures",
    about: "What the compass leaves on the page: the arcs that fix a perpendicular bisector, an angle bisector, or the third corner of a triangle. The arcs stay, because rubbing them out is what loses the marks.",
    params: { kind: "perpendicular" },
    settings: { kind: { kind: "one of", of: ["perpendicular", "bisect", "triangle"] } },
    takes: [
        { label: "Perpendicular bisector", params: { kind: "perpendicular" } },
        { label: "Bisecting an angle", params: { kind: "bisect" } },
        { label: "A triangle from three lengths", params: { kind: "triangle" } },
    ],
    box: () => ({ w: 14, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            thin = { strokeWidth: 1.1, stroke: c.t["ink-soft"] },
            a: RawAnchors = {};
        // An arc is only useful where it crosses another one, so each is drawn as a sweep around the
        // direction of the crossing rather than at a fixed angle.
        const arcTo = (from: Pt, r: number, target: Pt, spread = deg(32)) => {
            const t = Math.atan2(target[1] - from[1], target[0] - from[0]);
            pen.arc(g, from[0], from[1], r * 2, r * 2, t - spread, t + spread, "ruler", thin);
        };
        /** Where two circles of the given radii cross, on the side the drawing wants. */
        const meet = (A: Pt, rA: number, B: Pt, rB: number, up = true): Pt => {
            const dx = B[0] - A[0],
                dy = B[1] - A[1],
                D = Math.hypot(dx, dy) || 1;
            const x = (D * D + rA * rA - rB * rB) / (2 * D),
                y = Math.sqrt(Math.max(1, rA * rA - x * x)) * (up ? -1 : 1);
            return [A[0] + (dx / D) * x - (dy / D) * y, A[1] + (dy / D) * x + (dx / D) * y];
        };
        const dot = (q: Pt, name: string, side: "up" | "down" = "down") => {
            pen.circle(
                g,
                q[0],
                q[1],
                9,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.8 },
            );
            patch(c, q[0] + 14, q[1] + (side === "up" ? -14 : 16), 20, 20);
            num(c, q[0] + 14, q[1] + (side === "up" ? -10 : 22), name, 16);
            a[name] = [q[0], q[1], side];
        };
        if (p.kind === "bisect") {
            const v: Pt = [2 * U, 9 * U],
                arm = 9 * U,
                up = deg(58);
            const b: Pt = [v[0] + arm, v[1]],
                t: Pt = [v[0] + arm * Math.cos(up), v[1] - arm * Math.sin(up)];
            pen.line(g, v[0], v[1], b[0], b[1], "ruler", { strokeWidth: 2.2 });
            pen.line(g, v[0], v[1], t[0], t[1], "ruler", { strokeWidth: 2.2 });
            const r = 4.4 * U,
                rr = r * 0.8;
            pen.arc(g, v[0], v[1], r * 2, r * 2, -up, 0, "ruler", thin);
            const p1: Pt = [v[0] + r, v[1]],
                p2: Pt = [v[0] + r * Math.cos(up), v[1] - r * Math.sin(up)];
            const cross = meet(p1, rr, p2, rr, false);
            for (const q of [p1, p2]) arcTo(q, rr, cross);
            const dx = cross[0] - v[0],
                dy = cross[1] - v[1],
                L = Math.hypot(dx, dy) || 1;
            pen.line(g, v[0], v[1], cross[0] + (dx / L) * 44, cross[1] + (dy / L) * 44, "pencil", {
                strokeWidth: 2,
                stroke: c.t.pen,
            });
            dot(v, "V", "down");
            a.bisector = [cross[0], cross[1], "up"];
        } else if (p.kind === "triangle") {
            const A: Pt = [2.5 * U, 9 * U],
                B: Pt = [11.5 * U, 9 * U],
                rA = 7.5 * U,
                rB = 6 * U;
            const C = meet(A, rA, B, rB);
            arcTo(A, rA, C);
            arcTo(B, rB, C);
            pen.polygon(g, [A, B, C], "ruler", null, { strokeWidth: 2.4 });
            dot(A, "A");
            dot(B, "B");
            dot(C, "C", "up");
        } else {
            const A: Pt = [3 * U, 6 * U],
                B: Pt = [11 * U, 6 * U],
                r = 5.6 * U;
            pen.line(g, A[0] - 20, A[1], B[0] + 20, B[1], "ruler", { strokeWidth: 2.4 });
            const over = meet(A, r, B, r),
                under = meet(A, r, B, r, false);
            for (const q of [A, B]) {
                arcTo(q, r, over);
                arcTo(q, r, under);
            }
            const mx = (A[0] + B[0]) / 2,
                dy = Math.sqrt(Math.max(1, r * r - ((B[0] - A[0]) / 2) ** 2));
            pen.line(g, mx, A[1] - dy - 14, mx, A[1] + dy + 14, "pencil", {
                strokeWidth: 2,
                stroke: c.t.pen,
            });
            pen.polygon(
                g,
                [
                    [mx + 4, A[1] - 4],
                    [mx + 16, A[1] - 4],
                    [mx + 16, A[1] - 16],
                    [mx + 4, A[1] - 16],
                ],
                "ruler",
                null,
                { strokeWidth: 1.2 },
            );
            dot(A, "A");
            dot(B, "B");
            a.bisector = [mx, A[1] - dy - 14, "up"];
        }
        return a;
    },
    describe: () =>
        "A compass construction drawn on the page, a line and the arcs the compass point left crossing it, with the drawn result in ink.",
});
