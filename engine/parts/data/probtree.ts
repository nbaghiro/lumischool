import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, say } from "../lettering";

type Pt = [number, number];

/** Each end of the tree takes three squares down the page, which clears one stacked fraction from the next. */
const LEAF = 3 * U;

/** A fraction written stacked, on a white patch on paper; the branch breaks round it. */
function fraction<G>(
    c: Parameters<typeof num<G>>[0],
    x: number,
    y: number,
    top: string,
    bottom: string,
) {
    const w = Math.max(top.length, bottom.length) * 9 + 10;
    patch(c, x, y, w, 38);
    num(c, x, y - 4, top, 14);
    c.pen.line(c.g, x - w / 2 + 4, y, x + w / 2 - 4, y, "ruler", { strokeWidth: 1.4 });
    num(c, x, y + 15, bottom, 14);
}

export const probTree = defineDrawing({
    id: "probtree",
    family: "data",
    title: "Probability tree",
    group: "Structures",
    about: "Two stages of chance drawn as branches, a fraction on each branch. The second stage's fractions can be the same after every first outcome, or change, as they do when what was taken is not put back. Any branch can carry a question mark, and each end can name its outcome and the fraction of the whole way along it.",
    params: {
        first: ["Red", "Blue"],
        second: ["Red", "Blue"],
        tops: [3, 2],
        over: 5,
        nexttops: [3, 2],
        nextover: [5],
        hide: [] as number[],
        ends: 1,
    },
    settings: {
        first: { kind: "words", most: 3 },
        second: { kind: "words", most: 3 },
        tops: { kind: "numbers", min: 0, max: 100, most: 3 },
        over: { kind: "whole", min: 1, max: 100 },
        nexttops: { kind: "numbers", min: 0, max: 100, most: 9 },
        nextover: { kind: "numbers", min: 1, max: 100, most: 3 },
        hide: { kind: "numbers", min: 0, max: 11, most: 12 },
        ends: { kind: "one of", of: [0, 1, 2] },
    },
    takes: [
        {
            label: "Put back",
            params: {
                first: ["Red", "Blue"],
                second: ["Red", "Blue"],
                tops: [3, 2],
                over: 5,
                nexttops: [3, 2],
                nextover: [5],
                hide: [],
                ends: 1,
            },
        },
        {
            label: "Not put back",
            params: {
                first: ["Red", "Blue"],
                second: ["Red", "Blue"],
                tops: [3, 2],
                over: 5,
                nexttops: [2, 2, 3, 1],
                nextover: [4],
                hide: [5],
                ends: 2,
            },
        },
        {
            label: "A coin then a spinner",
            params: {
                first: ["H", "T"],
                second: ["A", "B", "C"],
                tops: [1, 1],
                over: 2,
                nexttops: [1, 1, 1],
                nextover: [3],
                hide: [],
                ends: 0,
            },
        },
    ],
    box: (p) => {
        const ends = Math.max(1, p.first.length) * Math.max(1, p.second.length);
        return { w: p.ends === 2 ? 29 : p.ends === 1 ? 24 : 21, h: ends * 3 + 2 };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            n1 = Math.max(1, p.first.length),
            n2 = Math.max(1, p.second.length),
            a: RawAnchors = {};
        const hidden = new Set(p.hide);
        const leafY = (k: number) => U + LEAF / 2 + k * LEAF;
        const root: Pt = [U, (leafY(0) + leafY(n1 * n2 - 1)) / 2];
        const branch = (from: Pt, to: Pt, top: string, bottom: string, i: number, t: number) => {
            const mx = from[0] + (to[0] - from[0]) * t,
                my = from[1] + (to[1] - from[1]) * t,
                half =
                    (hidden.has(i) ? 12 : Math.max(top.length, bottom.length) * 4.5 + 9) /
                    (to[0] - from[0]);
            const along = (u: number): Pt => [
                from[0] + (to[0] - from[0]) * u,
                from[1] + (to[1] - from[1]) * u,
            ];
            pen.line(g, ...from, ...along(t - half), "ruler", { strokeWidth: 1.8 });
            pen.line(g, ...along(t + half), ...to, "ruler", { strokeWidth: 1.8 });
            if (hidden.has(i)) {
                patch(c, mx, my, 22, 24);
                num(c, mx, my + 6, "?", 18, "middle", c.t.pen);
            } else fraction(c, mx, my, top, bottom);
            a[`branch(${i})`] = [mx, my - 18, "up"];
        };
        p.first.forEach((name, i) => {
            const y = (leafY(i * n2) + leafY(i * n2 + n2 - 1)) / 2;
            const node: Pt = [8 * U, y];
            branch(root, node, String(p.tops[i] ?? 0), String(p.over), i, 0.5);
            say(c, node[0] + 6, y + 6, name, 15, "start");
            a[`first(${i})`] = [node[0] + U, y - 10, "up"];
            p.second.forEach((next, j) => {
                const k = i * n2 + j,
                    ly = leafY(k),
                    top = p.nexttops[k] ?? p.nexttops[j] ?? 0,
                    over = p.nextover[i] ?? p.nextover[0] ?? 1;
                branch([node[0] + 3 * U, y], [17 * U, ly], String(top), String(over), n1 + k, 0.62);
                say(c, 17 * U + 6, ly + 6, next, 15, "start");
                if (p.ends >= 1)
                    say(c, 21 * U, ly + 6, `${name[0] ?? ""}${next[0] ?? ""}`, 15, "start");
                if (p.ends === 2)
                    fraction(c, 25.5 * U, ly, `${(p.tops[i] ?? 0) * top}`, `${p.over * over}`);
                a[`end(${k})`] = [17 * U + 6, ly, "right"];
            });
        });
        return a;
    },
    describe: (p) =>
        `A probability tree drawn from the left, branches splitting twice with a fraction written on each branch${p.ends > 0 ? " and the outcomes written at the ends" : ""}.`,
    motion: { still: "Its fractions are read along each branch, so the tree holds still." },
});
