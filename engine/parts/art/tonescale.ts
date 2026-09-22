import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { loop } from "../marks";

export const toneScale = defineDrawing({
    id: "tonescale",
    family: "art",
    title: "Tones from light to dark",
    group: "Structures",
    about: "A row of squares shaded in pencil from the white of the paper to as dark as a pencil goes, each a step darker than the last. Artists call how light or dark something is its tone, and a drawing of something round uses every step. A square can be left empty to shade in.",
    params: { steps: 5, blank: -1, ring: -1 },
    settings: {
        steps: { kind: "whole", min: 3, max: 8 },
        blank: { kind: "whole", min: -1, max: 7 },
        ring: { kind: "whole", min: -1, max: 7 },
    },
    takes: [
        { label: "Five tones", params: { steps: 5, blank: -1, ring: -1 } },
        { label: "Six, one to shade", params: { steps: 6, blank: 3, ring: -1 } },
    ],
    box: (p) => ({ w: Math.max(3, Math.round(p.steps)) * 3 + 1, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(3, Math.min(8, Math.round(p.steps))),
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const x = (0.5 + i * 3) * U,
                level = i / (n - 1);
            pen.rect(g, x + 2, 0.5 * U + 2, 3 * U - 4, 3 * U - 4, "ruler", null, {
                strokeWidth: 1.6,
            });
            if (i !== Math.round(p.blank) && level > 0) {
                for (const angle of level > 0.55 ? [-45, 45] : [-45]) {
                    pen.rect(
                        g,
                        x + 5,
                        0.5 * U + 5,
                        3 * U - 10,
                        3 * U - 10,
                        "ruler",
                        {
                            fill: c.t.ink,
                            fillStyle: "hachure",
                            hachureAngle: angle,
                            hachureGap: Math.max(1.6, 9 - level * 7.5),
                            fillWeight: 0.6 + level * 0.9,
                        },
                        { strokeWidth: 0 },
                    );
                }
            }
            if (i === Math.round(p.ring)) loop(c, x + 1.5 * U, 2 * U, 3.4 * U, 3.4 * U);
            a[`step(${i})`] = [x + 1.5 * U, 0.5 * U, "up"];
        }
        return a;
    },
    describe: (p) => {
        const n = Math.max(3, Math.min(8, Math.round(p.steps)));
        return `A row of squares shaded in pencil from the white of the paper to nearly black, each a step darker than the last${Math.round(p.blank) >= 0 && Math.round(p.blank) < n ? ", one left empty to shade in" : ""}${Math.round(p.ring) >= 0 && Math.round(p.ring) < n ? ", one ringed" : ""}.`;
    },
});
