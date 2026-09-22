import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { type Pt, blade } from "../animals/nature";

const LEAF_KINDS = ["oak", "ash", "maple", "holly", "round"];

const leafKindsOf = (p: { kinds: string[] }): string[] => {
    const list = p.kinds.filter((k) => LEAF_KINDS.includes(k));
    return (list.length ? list : LEAF_KINDS.slice(0, 3)).slice(0, 8);
};

/** Half a maple, tip first, as fractions of its width and length. Mirrored, it is the whole leaf. */
const MAPLE: Pt[] = [
    [0, 0],
    [0.3, 0.28],
    [0.22, 0.37],
    [0.72, 0.3],
    [0.46, 0.52],
    [1, 0.53],
    [0.48, 0.68],
    [0.78, 0.9],
    [0.3, 0.84],
    [0.1, 1],
];

/** The outline of one leaf, tip at the top, base on its stalk. Shape is the whole signal here. */
function leafOutline(kind: string, cx: number, tip: number, base: number, w: number): Pt[] {
    const len = base - tip;
    if (kind === "maple") {
        const right = MAPLE.map(([fx, fy]) => [cx + fx * w, tip + fy * len] as Pt);
        return [
            ...right,
            ...MAPLE.slice(0, MAPLE.length - 1)
                .reverse()
                .map(([fx, fy]) => [cx - fx * w, tip + fy * len] as Pt),
        ];
    }
    const steps = kind === "holly" ? 9 : 14;
    const half = (u: number): number => {
        const bell = Math.sin(Math.PI * Math.pow(u, 0.85));
        if (kind === "oak") return w * bell * (1 + 0.26 * Math.sin(u * Math.PI * 7));
        if (kind === "holly") return w * 0.78 * bell;
        return w * bell;
    };
    const pts: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
        const u = i / steps,
            spike = kind === "holly" && i % 2 === 1 ? 1.55 : kind === "holly" ? 0.6 : 1;
        pts.push([cx + half(u) * spike, tip + len * u]);
    }
    for (let i = steps - 1; i >= 1; i--) {
        const u = i / steps,
            spike = kind === "holly" && i % 2 === 1 ? 1.55 : kind === "holly" ? 0.6 : 1;
        pts.push([cx - half(u) * spike, tip + len * u]);
    }
    return pts;
}

function drawLeaf<G>(c: Ctx<G>, kind: string, cx: number, tip: number, base: number): void {
    const { pen, g } = c,
        fill = pen.fill("mint", "solid", { hachureGap: 6, fillWeight: 0.7 });
    if (kind === "ash") {
        // A compound leaf: three pairs of leaflets and one at the end, on a single rachis.
        pen.line(g, cx, base, cx, tip + 4, "pencil", { strokeWidth: 1.8 });
        for (let i = 0; i < 3; i++) {
            const y = base - 14 - i * 22;
            for (const s of [-1, 1]) {
                pen.polygon(g, blade(cx, y, 26, 15, -Math.PI / 2 + s * 1.05), "pencil", fill, {
                    strokeWidth: 1.4,
                });
            }
        }
        pen.polygon(g, blade(cx, tip + 30, 30, 16, -Math.PI / 2), "pencil", fill, {
            strokeWidth: 1.4,
        });
        return;
    }
    const w = kind === "round" ? 22 : kind === "maple" ? 27 : 19,
        len = base - tip;
    pen.polygon(g, leafOutline(kind, cx, tip, base, w), "pencil", fill, { strokeWidth: 1.8 });
    pen.line(g, cx, base - 4, cx, tip + len * 0.18, "pencil", {
        strokeWidth: 1.3,
        stroke: c.t["ink-soft"],
    });
    for (let i = 0; i < 3; i++) {
        const y = tip + len * (0.38 + i * 0.2);
        for (const s of [-1, 1])
            pen.line(g, cx, y, cx + s * 11, y - 9, "pencil", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
    }
}

export const leafRow = defineDrawing({
    id: "leafrow",
    family: "outdoors",
    title: "Leaves",
    group: "Props",
    about: "Leaves of named shapes in a row, each on its own stalk, for sorting, matching and counting. They are all one colour on purpose, so an oak has to be told from a maple by its edge rather than its fill.",
    params: { kinds: ["oak", "maple", "holly"], labels: true },
    settings: { kinds: { kind: "words", most: 8, of: LEAF_KINDS }, labels: { kind: "flag" } },
    takes: [
        { label: "Three kinds, named", params: { kinds: ["oak", "maple", "holly"], labels: true } },
        {
            label: "Unnamed, to sort",
            params: { kinds: ["oak", "maple", "holly", "oak", "maple"], labels: false },
        },
    ],
    box: (p) => ({ w: leafKindsOf(p).length * 4 + 1, h: p.labels ? 9 : 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 6.8 * U,
            a: RawAnchors = {};
        const kinds = leafKindsOf(p);
        kinds.forEach((kind, i) => {
            const cx = (2.5 + i * 4) * U,
                foot = 5.5 * U;
            pen.line(g, cx, base, cx, foot, "pencil", { strokeWidth: 2 });
            drawLeaf(c, kind, cx, 1.4 * U, foot);
            if (p.labels) say(c, cx, base + 1.5 * U, kind, 15);
            a[`leaf(${i})`] = [cx, 1.4 * U, "up"];
        });
        pen.line(g, 0.4 * U, base, (kinds.length * 4 + 0.6) * U, base, "pencil", {
            strokeWidth: 2.2,
        });
        return a;
    },
    describe: () =>
        "Leaves of different shapes in a row, each on its own stalk and all the same green, so an oak is told from a maple by its edge.",
});
