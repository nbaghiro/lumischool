import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

export const numberLineRope = defineDrawing({
    id: "washingline",
    family: "counting",
    title: "Washing line",
    group: "Structures",
    about: "A rope across the room with number cards pegged on it, some of them missing. It is a number line a child can walk up to, and the gaps are the question without anything else being written.",
    params: { values: ["0", "", "20", "", "40"], pegs: true },
    settings: { values: { kind: "words", most: 8 }, pegs: { kind: "flag" } },
    takes: [
        {
            label: "Twenties, two missing",
            params: { values: ["0", "", "20", "", "40"], pegs: true },
        },
        { label: "All there", params: { values: ["5", "10", "15", "20"], pegs: true } },
        { label: "One to find", params: { values: ["0", "50", "", "150"], pegs: false } },
    ],
    box: (p) => ({ w: p.values.length * 4 + 2, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 2 * U,
            w = (p.values.length * 4 + 1) * U,
            a: RawAnchors = {};
        pen.curve(
            g,
            [
                [U / 2, y],
                [w / 2, y + 0.6 * U],
                [w, y],
            ],
            "pencil",
            { strokeWidth: 2.4, stroke: c.t.ink },
        );
        p.values.forEach((v, i) => {
            const x = (2.5 + i * 4) * U,
                sag = 0.6 * U * (1 - ((2 * (x - w / 2)) / w) ** 2);
            const top = y + sag;
            pen.path(
                g,
                roundedRect(x - 1.5 * U, top + 0.4 * U, 3 * U, 3 * U, 6),
                "ruler",
                pen.fill(v ? "card" : "glow"),
                { strokeWidth: 1.8 },
            );
            if (v) num(c, x, top + 2.4 * U, v, 24);
            else num(c, x, top + 2.4 * U, "?", 24, "middle", c.t.pen);
            if (p.pegs)
                pen.rect(g, x - 5, top - 0.3 * U, 10, 1 * U, "pencil", pen.fill("tang"), {
                    strokeWidth: 1.2,
                });
            a[`card(${i})`] = [x, top + 0.4 * U, "up"];
        });
        return a;
    },
    describe: () =>
        "A rope sagging across the page with number cards pegged along it, some cards blank yellow with a question mark.",
});
