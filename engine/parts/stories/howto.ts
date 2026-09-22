import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, numOn, say } from "../lettering";
import { rows } from "./rows";

/** Where each part of a set of instructions goes, worked out once for the box and the drawing. */
function howtoRows(p: { need: string[]; steps: string[]; width: number }): {
    needRows: string[][];
    steps: string[][];
    h: number;
} {
    const needRows: string[][] = [];
    let row: string[] = [],
        used = 0;
    const room = p.width - 6;
    for (const n of p.need) {
        const w = n.length * 0.55 + 1.6;
        if (row.length && used + w > room) {
            needRows.push(row);
            row = [];
            used = 0;
        }
        row.push(n);
        used += w + 0.4;
    }
    if (row.length) needRows.push(row);
    const steps = p.steps.map((s) => rows(s, Math.max(10, Math.floor((p.width - 4) * 2.2))));
    const h =
        3 +
        needRows.length * 1.9 +
        (needRows.length ? 0.6 : 0) +
        steps.reduce((t, l) => t + Math.max(1, l.length) * 1.6 + 0.5, 0) +
        0.6;
    return { needRows, steps, h: Math.ceil(h) };
}

export const howto = defineDrawing({
    id: "howto",
    family: "stories",
    title: "Instructions",
    group: "Structures",
    about: "A card of instructions: a title, what you need, and numbered steps in the order they are done, which is how a recipe or a way to make something is laid out. One step can be left as a ruled line, so the child reads the steps around it and works out the one that is missing.",
    params: {
        title: "Toast with honey",
        need: ["bread", "butter", "honey"],
        steps: ["Toast the bread.", "Spread on the butter.", "Add a spoon of honey."],
        blank: -1,
        width: 24,
    },
    settings: {
        title: { kind: "text", most: 30 },
        need: { kind: "words", most: 6 },
        steps: { kind: "words", most: 6 },
        blank: { kind: "whole", min: -1, max: 5 },
        width: { kind: "whole", min: 12, max: 40 },
    },
    takes: [
        {
            label: "Toast with honey",
            params: {
                title: "Toast with honey",
                need: ["bread", "butter", "honey"],
                steps: ["Toast the bread.", "Spread on the butter.", "Add a spoon of honey."],
                blank: -1,
                width: 24,
            },
        },
        {
            label: "A step missing",
            params: {
                title: "Plant a bean",
                need: ["a pot", "soil", "a bean", "water"],
                steps: [
                    "Fill the pot with soil.",
                    "Push the bean in with your finger.",
                    "",
                    "Put the pot in a sunny window.",
                ],
                blank: 2,
                width: 26,
            },
        },
    ],
    box: (p) => ({ w: p.width, h: howtoRows(p).h }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            L = howtoRows(p);
        pen.path(
            g,
            roundedRect(0.4 * U, 0.4 * U, (p.width - 0.8) * U, (L.h - 0.8) * U, 10),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 2 },
        );
        say(c, 1.3 * U, 2 * U, p.title, 20, "start");
        pen.line(g, 1.2 * U, 2.6 * U, (p.width - 1.2) * U, 2.6 * U, "pencil", {
            strokeWidth: 1.4,
            stroke: c.t["ink-soft"],
        });
        let y = 3.4 * U;
        L.needRows.forEach((items, r) => {
            if (r === 0) cap(c, 1.3 * U, y + 1.05 * U, "You need", 10, "start");
            let x = 5.2 * U;
            for (const n of items) {
                const w = (n.length * 0.55 + 1.6) * U;
                pen.path(g, roundedRect(x, y, w, 1.5 * U, 6), "ruler", pen.fill("card"), {
                    strokeWidth: 1.3,
                });
                say(c, x + w / 2, y + 1.07 * U, n, 15);
                x += w + 0.4 * U;
            }
            y += 1.9 * U;
        });
        if (L.needRows.length) y += 0.6 * U;
        L.steps.forEach((text, i) => {
            const n = Math.max(1, text.length);
            pen.circle(g, 1.6 * U, y + 0.55 * U, 1.3 * U, "ruler", pen.fill("glow"), {
                strokeWidth: 1.4,
            });
            numOn(c, 1.6 * U, y + 0.55 * U + 5.5, i + 1, 14);
            if (i === p.blank || !p.steps[i])
                pen.line(g, 2.8 * U, y + 1 * U, (p.width - 1.2) * U, y + 1 * U, "ruler", {
                    strokeWidth: 1.8,
                });
            else
                text.forEach((line, k) =>
                    say(c, 2.8 * U, y + (0.95 + k * 1.6) * U, line, 17, "start"),
                );
            a[`step(${i + 1})`] = [2.8 * U, y, "up"];
            y += n * 1.6 * U + 0.5 * U;
        });
        return a;
    },
    describe: () =>
        "A card of instructions: a title at the top, a list of what you need, and numbered steps down the card in the order they are done.",
});
