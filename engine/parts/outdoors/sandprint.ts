import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const sandPrint = defineDrawing<{ foot: string }>({
    id: "sandprint",
    family: "outdoors",
    title: "Footprint in the sand",
    group: "Props",
    about: "One small shoe print pressed into sand, seen from above with its toe pointing up: a rounded sole, a separate heel and a little sand pushed up round its edge.",
    params: { foot: "left" },
    settings: { foot: { kind: "one of", of: ["left", "right"] } },
    takes: [
        { label: "A left foot", params: { foot: "left" } },
        { label: "A right foot", params: { foot: "right" } },
    ],
    box: () => ({ w: 1, h: 2 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const lean = p.foot === "right" ? 1 : -1;
        const x = 0.5 * U + lean * 0.06 * U;
        const tone = c.paper ? c.t.ink : c.t["ink-soft"];
        pen.ellipse(g, x, 0.75 * U, 0.62 * U, 0.95 * U, "pencil", pen.fill("tang", "solid"), {
            strokeWidth: 1,
            stroke: tone,
            roughness: 0.4,
            opacity: 0.7,
        });
        pen.ellipse(
            g,
            x - lean * 0.05 * U,
            1.6 * U,
            0.48 * U,
            0.5 * U,
            "pencil",
            pen.fill("tang", "solid"),
            {
                strokeWidth: 1,
                stroke: tone,
                roughness: 0.4,
                opacity: 0.7,
            },
        );
        return {};
    },
    describe: (p) =>
        `One small ${p.foot} shoe print pressed into the sand, seen from above with its toe pointing up, a rounded sole and a separate heel.`,
    motion: { still: "A footprint stays where it was pressed until the sand fills it." },
});
