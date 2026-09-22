import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num, patch } from "../lettering";

type Pt = [number, number];

const SQ45: { pts: Pt[]; angles: [number, number, number] } = {
    pts: [
        [0, 7],
        [0, 0],
        [7, 7],
    ],
    angles: [45, 90, 45],
};
const SQUARES: Record<string, { pts: Pt[]; angles: [number, number, number] }> = {
    "45": SQ45,
    "30": {
        pts: [
            [0, 7],
            [0, 0],
            [8.5, 7],
        ],
        angles: [60, 90, 30],
    },
};

export const setSquare = defineDrawing({
    id: "setsquare",
    family: "shapes",
    title: "Set square",
    group: "Props",
    about: "The two set squares from a geometry set, with a window cut out of the middle and every corner named. Between them they draw 30, 45, 60 and 90 degrees without a protractor.",
    params: { kind: "45", labels: true },
    settings: { kind: { kind: "one of", of: ["45", "30"] }, labels: { kind: "flag" } },
    takes: [
        { label: "45, 45, 90", params: { kind: "45", labels: true } },
        { label: "30, 60, 90", params: { kind: "30", labels: true } },
        { label: "Unlabelled", params: { kind: "45", labels: false } },
    ],
    box: (p) => ({ w: Math.ceil(((SQUARES[p.kind] ?? SQ45).pts[2] ?? [0, 0])[0]) + 3, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            sq = SQUARES[p.kind] ?? SQ45;
        const o = 1.2 * U,
            pts = sq.pts.map(([x, y]) => [o + x * U, o + y * U] as Pt);
        // The window is the same triangle pulled in towards its own middle.
        const mid: Pt = [
            ((pts[0] ?? [0, 0])[0] + (pts[1] ?? [0, 0])[0] + (pts[2] ?? [0, 0])[0]) / 3,
            ((pts[0] ?? [0, 0])[1] + (pts[1] ?? [0, 0])[1] + (pts[2] ?? [0, 0])[1]) / 3,
        ];
        const inner = pts.map(
            ([x, y]) => [mid[0] + (x - mid[0]) * 0.44, mid[1] + (y - mid[1]) * 0.44] as Pt,
        );
        pen.polygon(g, pts, "ruler", pen.fill("sky", "solid", { hachureGap: 9, fillWeight: 0.6 }), {
            strokeWidth: 2.2,
        });
        pen.polygon(g, inner, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
        const a: RawAnchors = {};
        pts.forEach((q, i) => {
            const to: Pt = [mid[0] - q[0], mid[1] - q[1]],
                L = Math.hypot(to[0], to[1]) || 1;
            if (p.labels) {
                const lx = q[0] + (to[0] / L) * 40,
                    ly = q[1] + (to[1] / L) * 40;
                patch(c, lx, ly - 5, 34, 20);
                num(c, lx, ly + 5, `${sq.angles[i]}°`, 14);
            }
            a[`corner(${i})`] = [q[0], q[1], "up"];
        });
        return a;
    },
    describe: (p) =>
        `A set square, a right-angled triangle drawn as a clear ruler with a scale along its base${p.labels ? " and its angles written at the corners" : ""}.`,
    motion: { still: STILL.instrument },
});
