import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";
import { slot } from "./blank";

interface Node {
    n: number;
    kids: Node[];
}

/** The largest factor of n no bigger than its square root, which splits it into the two most even parts; 1 for a prime. */
function evenSplit(n: number): number {
    for (let f = Math.floor(Math.sqrt(n)); f > 1; f--) if (n % f === 0) return f;
    return 1;
}

/** The tree, split the same way every time: `first` at the top when it divides n, then the most even split below. */
function grow(n: number, first = 0): Node {
    const f = first > 1 && first < n && n % first === 0 ? first : evenSplit(n);
    if (f <= 1) return { n, kids: [] };
    const [lo, hi] = f <= n / f ? [f, n / f] : [n / f, f];
    return { n, kids: [grow(lo), grow(hi)] };
}

const leaves = (t: Node): number => (t.kids.length ? t.kids.reduce((s, k) => s + leaves(k), 0) : 1);
const depth = (t: Node): number => 1 + Math.max(0, ...t.kids.map(depth));

/** The tree's nodes, top row first and left to right in each row, which is the order `blank` counts in. */
function rows(t: Node): Node[] {
    const out: Node[] = [];
    let row = [t];
    while (row.length) {
        out.push(...row);
        row = row.flatMap((k) => k.kids);
    }
    return out;
}

/** Each leaf takes three squares across, and each row sits three squares under the one above. */
const LEAF = 3 * U;
const ROW = 3 * U;

export const factorTree = defineDrawing({
    id: "factortree",
    family: "sums",
    title: "Factor tree",
    group: "Structures",
    about: "A number split into two factors, and each factor split again until only primes are left, which are ringed. The split is the most even one unless `first` names the top one, so the same number always draws the same tree, and any number in it can be left as a box to fill.",
    params: { n: 60, first: 0, blank: -1 },
    settings: {
        n: { kind: "whole", min: 2, max: 999 },
        first: { kind: "whole", min: 0, max: 999 },
        blank: { kind: "whole", min: -1, max: 30 },
    },
    takes: [
        { label: "Sixty", params: { n: 60, first: 0, blank: -1 } },
        { label: "A box to fill", params: { n: 84, first: 0, blank: 4 } },
        { label: "Split another way", params: { n: 72, first: 2, blank: -1 } },
        { label: "A power of two", params: { n: 128, first: 0, blank: -1 } },
    ],
    box: (p) => {
        const t = grow(Math.max(2, p.n), p.first);
        return { w: leaves(t) * 3 + 2, h: depth(t) * 3 };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            tree = grow(Math.max(2, p.n), p.first),
            order = rows(tree),
            a: RawAnchors = {};
        const at = new Map<Node, [number, number]>();
        let next = 0;
        const place = (t: Node, level: number): number => {
            const x = t.kids.length
                ? t.kids.map((k) => place(k, level + 1)).reduce((s, v) => s + v, 0) / t.kids.length
                : U + LEAF / 2 + next++ * LEAF;
            at.set(t, [x, 1.5 * U + level * ROW]);
            return x;
        };
        place(tree, 0);
        const centre = (t: Node): [number, number] => at.get(t) ?? [0, 0];
        for (const t of order) {
            const [x, y] = centre(t);
            for (const k of t.kids) {
                const [kx, ky] = centre(k);
                pen.line(g, x, y + 16, kx, ky - 17, "ruler", { strokeWidth: 1.6 });
            }
        }
        order.forEach((t, i) => {
            const [x, y] = centre(t);
            if (i === p.blank) slot(c, x - 1.2 * U, y - 0.8 * U, 2.4 * U, 1.6 * U);
            else if (t.kids.length) num(c, x, y + 6, t.n, 17);
            else {
                pen.circle(g, x, y, 34, "ruler", pen.fill("glow"), { strokeWidth: 1.6 });
                // a square patch as wide as the ring allows, so the dots of glow in ink stop short of the digits
                patch(c, x, y, 24, 24);
                num(c, x, y + 6, t.n, 17);
            }
            a[`node(${i})`] = [x, y - 17, "up"];
        });
        return a;
    },
    describe: () =>
        "A factor tree: a number at the top with two branches to its factors, each split again, and the primes at the ends ringed.",
    motion: { still: "Each number in the tree may be asked about, so the tree holds still." },
});
