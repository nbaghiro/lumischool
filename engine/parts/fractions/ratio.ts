import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, say, soft } from "../lettering";
import { ROW_FILL } from "./bar";

export const ratioBars = defineDrawing({
    id: "ratio",
    family: "fractions",
    title: "Ratio bars",
    group: "Structures",
    about: "One bar of equal blocks per share, so three to two is three blocks against two. The value of one block is what a ratio question is really asking for, and it can be written in or left out.",
    params: { parts: [3, 2], labels: ["Red", "Blue"], unit: 0, total: false },
    settings: {
        parts: { kind: "numbers", min: 1, max: 8, most: 4 },
        labels: { kind: "words", most: 4 },
        unit: { kind: "whole", min: 0, max: 100 },
        total: { kind: "flag" },
    },
    takes: [
        {
            label: "Three to two",
            params: { parts: [3, 2], labels: ["Red", "Blue"], unit: 0, total: false },
        },
        {
            label: "With a block worth 4",
            params: { parts: [3, 2], labels: ["Red", "Blue"], unit: 4, total: true },
        },
        {
            label: "Three shares",
            params: { parts: [1, 2, 4], labels: ["Ann", "Ben", "Cat"], unit: 0, total: true },
        },
        {
            label: "Even shares",
            params: { parts: [2, 2], labels: ["Yours", "Mine"], unit: 5, total: false },
        },
    ],
    box: (p) => ({
        w: Math.max(...p.parts, 1) * 2 + (p.total ? 12 : 8),
        h: p.parts.length * 3 + 3,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = 5 * U,
            s = 2 * U,
            a: RawAnchors = {};
        p.parts.forEach((n, r) => {
            const y = U + r * 3 * U;
            soft(c, x0 - 10, y + 1.4 * U, p.labels[r] ?? "", 15, "end");
            for (let k = 0; k < n; k++) {
                pen.rect(
                    g,
                    x0 + k * s,
                    y,
                    s,
                    2 * U,
                    "ruler",
                    pen.fill(ROW_FILL[r % ROW_FILL.length], "solid", { hachureGap: 6 }),
                    { strokeWidth: 1.8 },
                );
                if (p.unit) {
                    patch(c, x0 + k * s + s / 2, y + U - 5, s - 8, 20);
                    num(c, x0 + k * s + s / 2, y + U + 6, p.unit, 15);
                }
            }
            a[`bar(${r})`] = [x0 + (n * s) / 2, y, "up"];
            a[`end(${r})`] = [x0 + n * s, y + U, "right"];
        });
        const top = U,
            bottom = U + (p.parts.length * 3 - 1) * U;
        if (p.total) {
            const longest = Math.max(...p.parts, 1) * s;
            pen.path(g, `M${x0 + longest + 14} ${top}h10v${bottom - top}h-10`, "ruler", null, {
                strokeWidth: 1.5,
                stroke: c.t["ink-soft"],
            });
            const sum = p.parts.reduce((t, n) => t + n, 0) * (p.unit || 1);
            num(
                c,
                x0 + longest + 34,
                (top + bottom) / 2 + 6,
                p.unit ? sum : `${p.parts.reduce((t, n) => t + n, 0)} parts`,
                16,
                "start",
            );
            a.total = [x0 + longest + 30, (top + bottom) / 2, "right"];
        }
        say(
            c,
            x0 + Math.max(...p.parts, 1) * U,
            (p.parts.length * 3 + 2) * U,
            p.parts.join(" : "),
            18,
        );
        return a;
    },
    describe: () =>
        "Ratio bars: a row of equal coloured blocks for each share, each row with a name at its left end, and the ratio written under them in figures.",
});
