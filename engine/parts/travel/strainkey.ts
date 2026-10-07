import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { STRAIN_HUES } from "./trussbeam";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;
const WORDS = ["easy", "working", "hard", "snapping"] as const;

export const strainKey = defineDrawing({
    id: "strainkey",
    family: "travel",
    title: "Strain key",
    group: "Props",
    about: "The key to a bridge's colours: four swatches from easy to working, hard and snapping, plain, yellow, orange and red, with a pointer under the hardest any beam is working now.",
    params: { pointer: 0 },
    settings: { pointer: { kind: "whole", min: 0, max: 3 } },
    takes: [
        { label: "Every beam easy", params: { pointer: 0 } },
        { label: "A beam about to snap", params: { pointer: 3 } },
    ],
    box: () => ({ w: 9, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            pointer = Math.max(0, Math.min(3, Math.round(Number(p.pointer) || 0)));
        pen.rect(g, 2, 2, 9 * U - 4, 2 * U - 4, "ruler", pen.fill("card"), {
            strokeWidth: 1.1,
            ...FIRM,
        });
        for (const [i, word] of WORDS.entries()) {
            const x = (i * 2.1 + 1.15) * U,
                hue = STRAIN_HUES[i] ?? null;
            pen.rect(
                g,
                x - 0.7 * U,
                0.3 * U,
                1.4 * U,
                0.45 * U,
                "ruler",
                hue ? pen.fill(hue) : pen.fill("card"),
                { strokeWidth: 1.1, ...FIRM },
            );
            say(c, x, 1.25 * U, word, 11);
            if (i === pointer)
                pen.polygon(
                    g,
                    [
                        [x - 0.22 * U, 1.82 * U],
                        [x + 0.22 * U, 1.82 * U],
                        [x, 1.5 * U],
                    ],
                    "ruler",
                    pen.fill("ink"),
                    { strokeWidth: 0.8, ...FIRM },
                );
        }
        return {};
    },
    describe: (p) =>
        `A key to a bridge's colours with four swatches, easy, working, hard and snapping, plain, yellow, orange and red, the pointer under ${WORDS[Math.max(0, Math.min(3, Math.round(Number(p.pointer) || 0)))] ?? "easy"}.`,
    motion: { still: "A key is read, so it holds still while the pointer moves along it." },
});
