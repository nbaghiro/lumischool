import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";
import { LIQUID, glassPath, liquid, gleam, pieces, heap, countFor } from "./apparatus";
import { MIXABLES } from "./substances";

export const mixture = defineDrawing({
    id: "mixture",
    family: "science",
    title: "A mixture",
    group: "Structures",
    about: "Things mixed together, drawn the way each one behaves: in water, sand and iron filings sink to the bottom, cork floats, and salt or sugar dissolves and cannot be seen at all, which is the honest picture of dissolving; dry, they are one heap on a dish with every part still showing. The checker reads the same list to say which way (a sieve, a filter, a magnet or evaporating) gets the parts apart.",
    params: { things: ["sand", "salt"], water: 1, names: 1 },
    settings: {
        things: { kind: "words", most: 3 },
        water: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Sand and salt in water",
            params: { things: ["sand", "salt"], water: 1, names: 1 },
        },
        { label: "Iron and sand, dry", params: { things: ["iron", "sand"], water: 0, names: 1 } },
        {
            label: "Cork, pebbles and sugar in water",
            params: { things: ["cork", "pebbles", "sugar"], water: 1, names: 1 },
        },
    ],
    box: (p) => ({ w: 9, h: p.names > 0 ? 10 : 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            things = p.things.filter((k) => MIXABLES[k] && !MIXABLES[k].liquid).slice(0, 3);
        if (p.water > 0) {
            const lx = 1.4 * U,
                rx = 7.6 * U,
                top = 1.4 * U,
                bottom = 8.2 * U,
                level = 3 * U;
            liquid(c, lx, rx, level, bottom, pen.fill(LIQUID, "solid"), 12);
            let floor = bottom - 0.2 * U;
            things.forEach((k, i) => {
                const m = MIXABLES[k];
                if (!m || m.dissolves) return;
                if (m.floats) {
                    pieces(
                        c,
                        k,
                        lx + 0.8 * U,
                        level - 0.05 * U,
                        rx - lx - 1.6 * U,
                        0.1 * U,
                        5,
                        40 + i,
                    );
                    return;
                }
                const h = m.size >= 2 ? 0.8 * U : 0.7 * U;
                if (m.size <= 1) heap(c, k, (lx + rx) / 2, floor, rx - lx - 0.6 * U, h, 60 + i);
                else
                    pieces(
                        c,
                        k,
                        lx + 0.4 * U,
                        floor - h,
                        rx - lx - 0.8 * U,
                        h * 0.7,
                        countFor(k),
                        60 + i,
                    );
                floor -= h * 0.8;
            });
            pen.path(g, glassPath(lx, rx, top, bottom), "pencil", null, { strokeWidth: 2.6 });
            pen.path(g, `M${lx} ${top}L${lx - 16} ${top - 5}`, "pencil", null, {
                strokeWidth: 2.2,
            });
            pen.line(g, lx - 4, top, rx + 4, top, "pencil", { strokeWidth: 1.6 });
            gleam(c, lx + 0.4 * U, top + 0.5 * U, bottom - 0.6 * U);
        } else {
            pen.ellipse(g, 4.5 * U, 7.4 * U, 7.6 * U, 1.8 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1.8,
            });
            pen.path(
                g,
                `M${1.6 * U} ${7.3 * U}Q${4.5 * U} ${3.6 * U} ${7.4 * U} ${7.3 * U}Z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.4 },
            );
            things.forEach((k, i) =>
                pieces(
                    c,
                    k,
                    2.5 * U + i * 0.2 * U,
                    5.4 * U + i * 0.25 * U,
                    4 * U - i * 0.4 * U,
                    1.5 * U,
                    countFor(k) * 2,
                    80 + i,
                ),
            );
        }
        if (p.names > 0)
            soft(
                c,
                4.5 * U,
                9.4 * U,
                [
                    ...things.map((k) => MIXABLES[k]?.name ?? k),
                    ...(p.water > 0 ? ["water"] : []),
                ].join(" + "),
                12,
            );
        a.mixture = [4.5 * U, 1 * U, "up"];
        return a;
    },
    describe: (p) =>
        p.water > 0
            ? `A glass of water with things mixed into it, each drawn where it goes, sunk, floating or gone from sight${p.names > 0 ? ", named underneath" : ""}.`
            : `A dish with a dry mixture heaped on it, every part still showing among the others${p.names > 0 ? ", the parts named underneath" : ""}.`,
    reads: true,
});
