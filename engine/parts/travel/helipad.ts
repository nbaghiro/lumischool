import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

export const helipad = defineDrawing({
    id: "helipad",
    family: "travel",
    title: "Landing pad",
    group: "Props",
    about: "A flat landing pad seen from the side, a low grey slab with a number or an H painted on its front, where a helicopter sets down whatever it carries.",
    params: { n: 1 },
    settings: { n: { kind: "whole", min: 0, max: 20 } },
    takes: [
        { label: "Pad 3", params: { n: 3 } },
        { label: "The H pad", params: { n: 0 } },
    ],
    box: () => ({ w: 3, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        pen.rect(g, 0.1 * U, 0.15 * U, 2.8 * U, 0.75 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.6,
        });
        pen.line(g, 0.1 * U, 0.3 * U, 2.9 * U, 0.3 * U, "ruler", {
            strokeWidth: 1,
            disableMultiStroke: true,
        });
        const n = Math.max(0, Math.min(20, Math.round(p.n)));
        say(c, 1.5 * U, 0.8 * U, n === 0 ? "H" : String(n), 12);
        return { top: [1.5 * U, 0.15 * U, "up"] };
    },
    describe: (p) =>
        Math.round(p.n) === 0
            ? "A flat grey landing pad seen from the side, with a big H painted on its front, where the helicopter waits between rescues."
            : "A flat grey landing pad seen from the side with a number painted on its front, where a helicopter sets down what it carries.",
});
