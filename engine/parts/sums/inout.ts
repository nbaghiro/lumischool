import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, say, slot } from "../lettering";

export const inOutTable = defineDrawing({
    id: "inout",
    family: "sums",
    title: "In and out table",
    group: "Structures",
    about: "The same rule as a table of pairs, with some of the outputs missing and sometimes the rule missing too. Several rows are what make a rule findable rather than guessable.",
    params: {
        rule: "× 3",
        rows: [
            [1, 3],
            [2, 6],
            [4, 0],
            [7, 0],
        ] as [number, number][],
        blanks: [2, 3],
    },
    settings: {
        rule: { kind: "text", most: 6 },
        rows: { kind: "fixed" },
        blanks: { kind: "numbers", min: 0, max: 7, most: 8 },
    },
    takes: [
        {
            label: "Two to fill in",
            params: {
                rule: "\u00d7 3",
                rows: [
                    [1, 3],
                    [2, 6],
                    [4, 0],
                    [7, 0],
                ],
                blanks: [2, 3],
            },
        },
        {
            label: "Find the rule",
            params: {
                rule: "",
                rows: [
                    [2, 7],
                    [3, 8],
                    [5, 10],
                    [9, 14],
                ],
                blanks: [],
            },
        },
        {
            label: "All given",
            params: {
                rule: "+ 10",
                rows: [
                    [4, 14],
                    [8, 18],
                    [15, 25],
                ],
                blanks: [],
            },
        },
    ],
    box: (p) => ({ w: 13, h: p.rows.length * 2 + 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = U,
            cw = 5.5 * U,
            top = 3.4 * U,
            rh = 2 * U,
            a: RawAnchors = {};
        say(c, x0 + cw, 1.6 * U, "the rule is", 15, "end");
        if (p.rule) {
            pen.rect(
                g,
                x0 + cw + 0.4 * U,
                0.6 * U,
                4.4 * U,
                2 * U,
                "ruler",
                pen.fill("glow", "solid", { hachureGap: 7 }),
                { strokeWidth: 1.8 },
            );
            patch(c, x0 + cw + 2.6 * U, 1.5 * U, 60, 26);
            num(c, x0 + cw + 2.6 * U, 1.95 * U, p.rule, 22);
        } else slot(c, x0 + cw + 0.4 * U, 0.6 * U, 4.4 * U, 2 * U);
        a.rule = [x0 + cw + 2.6 * U, 0.6 * U, "up"];
        ["in", "out"].forEach((s, k) => {
            pen.rect(
                g,
                x0 + k * cw,
                top,
                cw,
                rh,
                "ruler",
                pen.fill("glow", "solid", { hachureGap: 8, fillWeight: 0.6 }),
                { strokeWidth: 1.8 },
            );
            cap(c, x0 + k * cw + cw / 2, top + 1.3 * U, s, 13, "middle", c.t.ink);
        });
        p.rows.forEach(([inv, outv], r) => {
            const y = top + (r + 1) * rh;
            pen.rect(g, x0, y, cw, rh, "ruler", null, { strokeWidth: 1.3 });
            num(c, x0 + cw / 2, y + 1.35 * U, inv, 20);
            pen.rect(g, x0 + cw, y, cw, rh, "ruler", null, { strokeWidth: 1.3 });
            if (p.blanks.includes(r)) slot(c, x0 + cw + 0.5 * U, y + 6, cw - U, rh - 12);
            else num(c, x0 + cw * 1.5, y + 1.35 * U, outv, 20);
            a[`row(${r})`] = [x0, y + U, "left"];
            a[`out(${r})`] = [x0 + cw * 1.5, y, "up"];
        });
        pen.rect(g, x0, top, cw * 2, (p.rows.length + 1) * rh, "ruler", null, { strokeWidth: 2.6 });
        return a;
    },
    describe: () =>
        "An in and out table with a rule box above it, two headed columns and a row for each pair, some of the out cells left as slots.",
});
