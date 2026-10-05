import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const PADS = ["tang", "sky"] as const;

export const curlBroom = defineDrawing<{ pad: string }>({
    id: "curlbroom",
    family: "sport",
    title: "Curling broom",
    group: "Props",
    about: "A curling broom seen from above as it sweeps: a long handle and a flat pad at its foot, laid in front of a gliding stone and swung from side to side.",
    params: { pad: "tang" },
    settings: { pad: { kind: "one of", of: PADS } },
    takes: [
        { label: "Charlie's team", params: { pad: "tang" } },
        { label: "The blue team", params: { pad: "sky" } },
    ],
    box: () => ({ w: 1, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c;
        pen.line(g, 0.5 * U, 0.2 * U, 0.5 * U, 2.25 * U, "ruler", {
            strokeWidth: 2.2,
            stroke: c.paper ? c.t.ink : c.t["ink-soft"],
            roughness: 0.2,
        });
        pen.rect(
            g,
            0.15 * U,
            2.2 * U,
            0.7 * U,
            0.6 * U,
            "ruler",
            pen.fill(p.pad === "sky" ? "sky" : "tang", "solid"),
            {
                strokeWidth: 1.3,
                roughness: 0.25,
            },
        );
        return { pad: [0.5 * U, 2.5 * U, "down"] };
    },
    describe: (p) =>
        `A curling broom seen from above, with a long thin handle and a small flat ${p.pad === "sky" ? "blue" : "orange"} pad at its foot, ready to sweep the ice in front of a stone.`,
});
