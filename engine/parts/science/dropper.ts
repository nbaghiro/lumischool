import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { LIQUID, liquid, paint } from "./apparatus";

export const dropper = defineDrawing({
    id: "dropper",
    family: "science",
    title: "Dropper",
    group: "Props",
    about: "A glass dropper with a rubber bulb, letting drops fall one at a time into a little dish, each drop a colour from the paint box or plain water. `drops` is how many are falling, so a question can count them, and a grown-up uses one to add a few drops of indicator.",
    params: { drops: 3, paint: "" },
    settings: { drops: { kind: "whole", min: 0, max: 5 }, paint: { kind: "text", most: 20 } },
    takes: [
        { label: "Three drops of water", params: { drops: 3, paint: "" } },
        { label: "Cabbage juice", params: { drops: 4, paint: "pink+sky" } },
    ],
    box: () => ({ w: 6, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            cx = 3 * U,
            stuff = p.paint ? paint(c, p.paint) : pen.fill(LIQUID);
        pen.path(
            g,
            `M${cx - 0.55 * U} ${2.6 * U}Q${cx - 0.9 * U} ${0.4 * U} ${cx} ${0.4 * U}Q${cx + 0.9 * U} ${0.4 * U} ${cx + 0.55 * U} ${2.6 * U}Z`,
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.8 },
        );
        liquid(c, cx - 0.3 * U, cx + 0.3 * U, 3.6 * U, 5.3 * U, stuff, 2, false);
        pen.path(
            g,
            `M${cx - 0.3 * U} ${2.6 * U}V${4.6 * U}L${cx - 0.1 * U} ${5.4 * U}H${cx + 0.1 * U}L${cx + 0.3 * U} ${4.6 * U}V${2.6 * U}`,
            "ruler",
            null,
            { strokeWidth: 1.8 },
        );
        const n = Math.max(0, Math.min(5, Math.round(p.drops)));
        for (let k = 0; k < n; k++) {
            const y = 6 * U + k * 0.85 * U;
            pen.path(
                g,
                `M${cx} ${y - 0.3 * U}Q${cx + 0.24 * U} ${y + 0.05 * U} ${cx} ${y + 0.22 * U}Q${cx - 0.24 * U} ${y + 0.05 * U} ${cx} ${y - 0.3 * U}Z`,
                "pencil",
                stuff,
                { strokeWidth: 1.2 },
            );
        }
        pen.ellipse(g, cx, 11 * U, 4.6 * U, 1.3 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.8,
        });
        pen.ellipse(g, cx, 10.95 * U, 3.2 * U, 0.7 * U, "pencil", stuff, { strokeWidth: 1.1 });
        a.tip = [cx, 5.4 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A glass dropper with a red rubber bulb held over a little dish${p.drops > 0 ? ", drops falling from its tip" : ""}, the liquid in it ${p.paint ? "coloured" : "plain water"}.`,
    reads: true,
});
