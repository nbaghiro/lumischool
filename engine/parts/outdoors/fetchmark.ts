import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

const calm = { strokeWidth: 1.4, disableMultiStroke: true, preserveVertices: true };

export const fetchMark = defineDrawing<{ n: string; lit: number }>({
    id: "fetchmark",
    family: "outdoors",
    title: "Fetch target",
    group: "Props",
    about: "A wooden stake pegged into the grass with a round sign on top carrying a number, and a dog bowl at its foot: where a throw is meant to land. Lit, the sign glows yellow.",
    params: { n: "8", lit: 0 },
    settings: { n: { kind: "text", most: 4 }, lit: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Throw it to 8", params: { n: "8", lit: 0 } },
        { label: "Caught on 12", params: { n: "12", lit: 1 } },
    ],
    box: () => ({ w: 3, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c;
        pen.rect(g, 1.35 * U, 2.2 * U, 0.3 * U, 2.6 * U, "ruler", pen.fill("tang"), calm);
        pen.circle(g, 1.5 * U, 1.35 * U, 2.3 * U, "ruler", pen.fill(p.lit ? "glow" : "card"), {
            ...calm,
            strokeWidth: 1.8,
        });
        say(c, 1.5 * U, 1.7 * U, String(p.n).slice(0, 4), 17);
        // the bowl at the stake's foot, the thing a pup brings the throw back past
        pen.path(
            g,
            `M${0.25 * U} ${4.25 * U}L${0.5 * U} ${4.85 * U}H${1.25 * U}L${1.5 * U} ${4.25 * U}Z`,
            "ruler",
            pen.fill("berry"),
            calm,
        );
        return { top: [1.5 * U, 0.2 * U, "up"], foot: [1.5 * U, 4.9 * U, "down"] };
    },
    describe: (p) =>
        `A wooden stake in the grass with a round ${p.lit ? "glowing yellow" : "white"} sign on top showing the number ${String(p.n).slice(0, 4)}, and a pink dog bowl at its foot.`,
});
