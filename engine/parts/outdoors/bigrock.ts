import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const bigRock = defineDrawing<{ moss: boolean }>({
    id: "bigrock",
    family: "outdoors",
    title: "Big rock",
    group: "Props",
    about: "One big rounded rock sitting on the ground, seen a little from above, with a crack down its side, a pale top where the sun falls and moss along its foot.",
    params: { moss: true },
    settings: { moss: { kind: "flag" } },
    takes: [
        { label: "Mossy", params: { moss: true } },
        { label: "Bare", params: { moss: false } },
    ],
    box: () => ({ w: 4, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const foot = 2.7 * U;
        pen.path(
            g,
            `M${0.3 * U} ${foot}C${0.1 * U} ${1.4 * U} ${0.9 * U} ${0.35 * U} ${2.1 * U} ${0.3 * U}C${3.2 * U} ${0.3 * U} ${3.9 * U} ${1.3 * U} ${3.7 * U} ${foot}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
            { strokeWidth: 1.8 },
        );
        if (!c.paper)
            pen.path(
                g,
                `M${1.1 * U} ${0.9 * U}Q${2 * U} ${0.45 * U} ${2.9 * U} ${0.85 * U}`,
                "pencil",
                null,
                { strokeWidth: 3, stroke: c.t.card, roughness: 0.4 },
            );
        pen.path(
            g,
            `M${2.3 * U} ${0.8 * U}L${2 * U} ${1.5 * U}L${2.35 * U} ${2 * U}L${2.15 * U} ${2.6 * U}`,
            "pencil",
            null,
            {
                strokeWidth: 1.1,
                roughness: 0.5,
            },
        );
        if (p.moss)
            for (const x of [0.7, 1.4, 2.6, 3.2])
                pen.ellipse(g, x * U, foot - 0.1 * U, 0.6 * U, 0.3 * U, "ruler", pen.fill("mint"), {
                    strokeWidth: 0.8,
                    stroke: c.t.ok,
                    roughness: 0.3,
                });
        a.foot = [2 * U, foot, "down"];
        return a;
    },
    describe: (p) =>
        `One big rounded grey rock sitting on the ground, seen a little from above, with a crack down its side${p.moss ? " and green moss along its foot" : ""}.`,
    motion: { still: "A rock stays put; it is a landmark to count squares from." },
});
