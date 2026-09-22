import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, soft } from "../lettering";
import { gleam, lettered, ellipsePath } from "./apparatus";
import { SAFETY } from "./substances";

export const safety = defineDrawing({
    id: "safety",
    family: "science",
    title: "Safety kit",
    group: "Props",
    about: "The kit a chemistry lesson at home starts with, lettered: goggles to keep splashes out of the eyes, an apron for clothes, an oven glove for the grown-up's hand near anything hot, and a tray to catch spills. The grown-up does the heating and the pouring of anything hot; the child watches from behind goggles.",
    params: { kit: ["goggles", "apron", "glove", "tray"], letters: 1, names: 0 },
    settings: {
        kit: { kind: "words", most: 5, of: Object.keys(SAFETY) },
        letters: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "The kit",
            params: { kit: ["goggles", "apron", "glove", "tray"], letters: 1, names: 1 },
        },
        {
            label: "Which keeps eyes safe?",
            params: { kit: ["apron", "tray", "goggles"], letters: 1, names: 0 },
        },
    ],
    box: (p) => ({ w: Math.max(1, Math.min(5, p.kit.length)) * 5 + 1, h: p.names > 0 ? 7 : 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t;
        p.kit.slice(0, 5).forEach((kind, i) => {
            const x = (3 + i * 5) * U,
                y = 2.4 * U;
            if (kind === "goggles") {
                pen.path(
                    g,
                    `M${x - 2.2 * U} ${y}Q${x - 2.4 * U} ${y - 1.3 * U} ${x - 0.3 * U} ${y - 1.1 * U}L${x + 0.3 * U} ${y - 1.1 * U}Q${x + 2.4 * U} ${y - 1.3 * U} ${x + 2.2 * U} ${y}Q${x + 2.2 * U} ${y + 1.1 * U} ${x + 0.8 * U} ${y + 1 * U}Q${x} ${y + 0.4 * U} ${x - 0.8 * U} ${y + 1 * U}Q${x - 2.2 * U} ${y + 1.1 * U} ${x - 2.2 * U} ${y}Z`,
                    "pencil",
                    pen.fill("mint", "hachure", { hachureGap: 6 }),
                    { strokeWidth: 2 },
                );
                for (const s of [-1, 1]) {
                    pen.path(
                        g,
                        ellipsePath(x + s * 1.15 * U, y - 0.05 * U, 0.8 * U, 0.6 * U, 0),
                        "pencil",
                        pen.fill("sky", "hachure", { hachureGap: 9 }),
                        { strokeWidth: 1.4 },
                    );
                    gleam(c, x + s * 1.15 * U - 0.35 * U, y - 0.35 * U, y + 0.05 * U, 2.2);
                }
                pen.curve(
                    g,
                    [
                        [x - 2.2 * U, y - 0.2 * U],
                        [x - 2.5 * U, y + 0.8 * U],
                        [x - 1.4 * U, y + 1.9 * U],
                    ],
                    "pencil",
                    { strokeWidth: 3, stroke: c.paper ? t.ink : t["ink-soft"] },
                );
                pen.curve(
                    g,
                    [
                        [x + 2.2 * U, y - 0.2 * U],
                        [x + 2.5 * U, y + 0.8 * U],
                        [x + 1.4 * U, y + 1.9 * U],
                    ],
                    "pencil",
                    { strokeWidth: 3, stroke: c.paper ? t.ink : t["ink-soft"] },
                );
            } else if (kind === "apron") {
                pen.path(
                    g,
                    `M${x - 0.8 * U} ${y - 2 * U}H${x + 0.8 * U}L${x + 0.9 * U} ${y - 0.8 * U}Q${x + 1.6 * U} ${y - 0.6 * U} ${x + 1.8 * U} ${y - 0.4 * U}L${x + 1.6 * U} ${y + 2.1 * U}H${x - 1.6 * U}L${x - 1.8 * U} ${y - 0.4 * U}Q${x - 1.6 * U} ${y - 0.6 * U} ${x - 0.9 * U} ${y - 0.8 * U}Z`,
                    "pencil",
                    pen.fill("berry", "hachure", { hachureGap: 5 }),
                    { strokeWidth: 1.8 },
                );
                pen.path(
                    g,
                    roundedRect(x - 0.7 * U, y + 0.3 * U, 1.4 * U, 0.9 * U, 3),
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.2 },
                );
                pen.curve(
                    g,
                    [
                        [x - 0.8 * U, y - 2 * U],
                        [x, y - 3 * U],
                        [x + 0.8 * U, y - 2 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1.6 },
                );
            } else if (kind === "glove") {
                pen.path(
                    g,
                    `M${x - 1 * U} ${y + 2 * U}V${y - 0.6 * U}Q${x - 1 * U} ${y - 2.1 * U} ${x + 0.1 * U} ${y - 2.1 * U}Q${x + 1.1 * U} ${y - 2.1 * U} ${x + 1.1 * U} ${y - 0.8 * U}L${x + 1.2 * U} ${y - 0.3 * U}Q${x + 1.9 * U} ${y - 1 * U} ${x + 2.1 * U} ${y - 0.5 * U}Q${x + 2.2 * U} ${y} ${x + 1.2 * U} ${y + 0.9 * U}V${y + 2 * U}Z`,
                    "pencil",
                    pen.fill("tang", "cross-hatch", { hachureGap: 6, fillWeight: 0.6 }),
                    { strokeWidth: 1.8 },
                );
                pen.rect(
                    g,
                    x - 1.15 * U,
                    y + 1.4 * U,
                    2.5 * U,
                    0.6 * U,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.4 },
                );
            } else if (kind === "tray") {
                pen.path(
                    g,
                    `M${x - 2.2 * U} ${y + 0.4 * U}L${x - 1.8 * U} ${y + 1.4 * U}H${x + 1.8 * U}L${x + 2.2 * U} ${y + 0.4 * U}Z`,
                    "pencil",
                    pen.fill("sky", "hachure", { hachureGap: 5 }),
                    { strokeWidth: 1.8 },
                );
                pen.line(g, x - 2.2 * U, y + 0.4 * U, x + 2.2 * U, y + 0.4 * U, "pencil", {
                    strokeWidth: 2,
                });
            } else say(c, x, y + 6, "?", 18);
            if (p.letters > 0) lettered(c, x, 5.35 * U, i);
            if (p.names > 0)
                soft(c, x, (p.letters > 0 ? 6.5 : 5.4) * U, SAFETY[kind]?.name ?? kind, 12);
            a[`kit(${i})`] = [x, 0.2 * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `Safety kit for a chemistry lesson in a lettered row, each piece drawn on its own${p.names > 0 ? ", each named underneath" : ""}.`,
    reads: true,
});
