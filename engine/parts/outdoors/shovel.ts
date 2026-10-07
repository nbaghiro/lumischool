import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const shovel = defineDrawing<{ sand: boolean }>({
    id: "shovel",
    family: "outdoors",
    title: "Spade",
    group: "Props",
    about: "A child's digging spade standing upright: a wooden handle with a crossbar grip at the top and a rounded metal blade at its foot, with sand on the blade once it has dug.",
    params: { sand: false },
    settings: { sand: { kind: "flag" } },
    takes: [
        { label: "Clean", params: { sand: false } },
        { label: "Sandy from digging", params: { sand: true } },
    ],
    box: () => ({ w: 2, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const x = 1 * U;
        pen.line(g, 0.55 * U, 0.4 * U, 1.45 * U, 0.4 * U, "pencil", {
            strokeWidth: 3,
            stroke: c.paper ? c.t.ink : c.t["ink-soft"],
        });
        pen.rect(g, x - 0.14 * U, 0.4 * U, 0.28 * U, 2.7 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.4,
        });
        pen.path(
            g,
            `M${x - 0.55 * U} ${3.05 * U}H${x + 0.55 * U}V${4 * U}Q${x + 0.5 * U} ${4.75 * U} ${x} ${4.8 * U}Q${x - 0.5 * U} ${4.75 * U} ${x - 0.55 * U} ${4 * U}Z`,
            "pencil",
            pen.fill(p.sand ? "glow" : "sky", "solid"),
            { strokeWidth: 1.6 },
        );
        if (!c.paper)
            pen.line(g, x - 0.3 * U, 3.3 * U, x - 0.3 * U, 4.2 * U, "pencil", {
                strokeWidth: 1.6,
                stroke: c.t.card,
            });
        a.grip = [x, 0.4 * U, "up"];
        a.blade = [x, 4.8 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A child's digging spade standing upright, with a wooden handle, a crossbar grip at the top and a rounded metal blade${p.sand ? " with sand on it" : ""}.`,
});
