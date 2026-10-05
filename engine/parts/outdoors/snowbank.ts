import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash } from "./wash";

const SIDES = ["top", "bottom"] as const;

export const snowBank = defineDrawing<{ width: number; side: string }>({
    id: "snowbank",
    family: "outdoors",
    title: "Snowy bank",
    group: "Props",
    about: "A low bank of snow along the edge of a frozen pond seen from above, its drifts rounded against the ice and laid end to end for as long as the pond runs.",
    params: { width: 12, side: "top" },
    settings: {
        width: { kind: "number", min: 4, max: 24, step: 0.5 },
        side: { kind: "one of", of: SIDES },
    },
    takes: [
        { label: "Above the ice", params: { width: 12, side: "top" } },
        { label: "Below the ice", params: { width: 12, side: "bottom" } },
    ],
    box: (p) => ({ w: p.width, h: 2 }),
    draw: (c, p) => {
        const w = p.width * U,
            h = 2 * U,
            down = p.side !== "bottom",
            // the drifts' edge faces the ice: the bottom of a bank above the pond, the top of one below it
            edge = down ? h - 0.3 * U : 0.3 * U,
            back = down ? 0.6 * U : h - 0.6 * U,
            pts: string[] = [];
        for (let x = 0; x <= w + 0.01; x += 0.5 * U) {
            const bump =
                (Math.sin(x / (1.3 * U) + hash(Math.round(x), 3) * 2) * 0.5 + 0.5) * 0.6 * U;
            pts.push(`${x} ${edge + (down ? -bump : bump)}`);
        }
        const drift = `M0 ${back}L${pts.join("L")}L${w} ${back}Z`;
        if (!c.paper) plain(c, { kind: "path", d: drift, fill: c.t.card, opacity: 0.95 });
        plain(c, {
            kind: "path",
            d: `M${pts.join("L")}`,
            fill: "none",
            stroke: c.paper ? c.t.ink : c.t.sky,
            width: 1.2,
            cap: "round",
            join: "round",
            opacity: c.paper ? 0.8 : 0.6,
        });
        return {};
    },
    describe: (p) =>
        `A low bank of white snow seen from above, ${p.width} squares long, its rounded drifts lying along the ${p.side === "bottom" ? "lower" : "upper"} edge of a frozen pond.`,
    motion: { still: "Snow lying on a bank never moves." },
});
