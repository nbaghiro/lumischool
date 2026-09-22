import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { PIGMENTS, colourOf, paintFill } from "../../pigment";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";
import { loop } from "../marks";
import { ladderParts, ladderRecipe } from "./kit";

export const tintLadder = defineDrawing({
    id: "tintladder",
    family: "art",
    title: "Tints and shades",
    group: "Structures",
    about: "A row of squares that starts at one paint and adds a part of white at each step, which makes tints, or a part of black, which makes shades. Each step is mixed the way paint mixes and says how many parts went in, so on paper the order can still be read. A step can be left empty to paint in, with a question mark for its label, or ringed.",
    params: { colour: "red", toward: "white", steps: 5, blank: -1, ring: -1, labels: true },
    settings: {
        colour: { kind: "one of", of: PIGMENTS },
        toward: { kind: "one of", of: ["white", "black"] },
        steps: { kind: "whole", min: 2, max: 8 },
        blank: { kind: "whole", min: -1, max: 7 },
        ring: { kind: "whole", min: -1, max: 7 },
        labels: { kind: "flag" },
    },
    takes: [
        {
            label: "Red to pink",
            params: { colour: "red", toward: "white", steps: 5, blank: -1, ring: -1, labels: true },
        },
        {
            label: "Blue to navy, one to paint",
            params: { colour: "blue", toward: "black", steps: 4, blank: 2, ring: -1, labels: true },
        },
    ],
    box: (p) => ({ w: Math.max(2, Math.round(p.steps)) * 3 + 1, h: p.labels ? 6 : 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(2, Math.round(p.steps)),
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const x = (0.5 + i * 3) * U,
                y = 0.5 * U,
                hex = colourOf(ladderRecipe(p.colour, p.toward, i));
            pen.rect(
                g,
                x + 2,
                y + 2,
                3 * U - 4,
                3 * U - 4,
                "ruler",
                i === p.blank || !hex ? c.pen.fill("card") : paintFill(c, hex),
                { strokeWidth: 1.8 },
            );
            if (p.labels)
                soft(
                    c,
                    x + 1.5 * U,
                    4.6 * U,
                    i === p.blank
                        ? "?"
                        : i === 0
                          ? p.colour
                          : `+${ladderParts(p.toward, i).add} ${p.toward}`,
                    11,
                );
            if (i === p.ring) loop(c, x + 1.5 * U, y + 1.5 * U, 3.4 * U, 3.4 * U);
            a[`step(${i})`] = [x + 1.5 * U, y, "up"];
        }
        return a;
    },
    describe: (p) => {
        const n = Math.max(2, Math.round(p.steps));
        return `A row of ${n} painted squares, the first ${p.colour} and each one after it mixed with more ${p.toward}${p.labels ? ", the parts written under each" : ""}${p.blank >= 0 && p.blank < n ? ", one left white to paint" : ""}${p.ring >= 0 && p.ring < n ? ", one ringed" : ""}.`;
    },
});
