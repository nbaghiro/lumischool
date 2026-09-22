import { group, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, nameOf, paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { MOTIFS, motif } from "./kit";

export const radial = defineDrawing({
    id: "radial",
    family: "art",
    title: "A pattern that turns",
    group: "Structures",
    about: "A shape repeated round a centre, turned the same amount each time, like a flower or a snowflake: from three to twelve times, with one left out if a question asks what is missing. A pattern like this looks the same after turning by one repeat.",
    params: { repeats: 6, motif: "leaf", missing: -1, colour: "berry" },
    settings: {
        repeats: { kind: "whole", min: 3, max: 12 },
        motif: { kind: "one of", of: ["leaf", "drop", "fish", "bird", "star", "shell"] },
        missing: { kind: "whole", min: -1, max: 11 },
        colour: { kind: "text", most: 24 },
    },
    takes: [
        { label: "Six leaves", params: { repeats: 6, motif: "leaf", missing: -1, colour: "pink" } },
        {
            label: "Eight drops, one missing",
            params: { repeats: 8, motif: "drop", missing: 3, colour: "sky" },
        },
        {
            label: "Five fish",
            params: { repeats: 5, motif: "fish", missing: -1, colour: "orange" },
        },
        {
            label: "Twelve shells",
            params: { repeats: 12, motif: "shell", missing: -1, colour: "berry" },
        },
    ],
    box: () => ({ w: 12, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(3, Math.min(12, Math.round(p.repeats))),
            a: RawAnchors = {},
            cx = 6 * U,
            cy = 6 * U;
        const hex = colourOf(p.colour) ?? panColour("pink");
        pen.circle(g, cx, cy, 11 * U, "pencil", null, {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
            strokeLineDash: [4, 6],
        });
        for (let i = 0; i < n; i++) {
            const deg = (360 * i) / n,
                t = group(c, { turn: [["rotate", deg, cx, cy]] }),
                gg = t.g;
            if (i === Math.round(p.missing)) {
                pen.circle(gg, cx, cy - 3.3 * U, 2.6 * U, "pencil", null, {
                    strokeWidth: 1.6,
                    strokeLineDash: [6, 5],
                    stroke: c.t["ink-soft"],
                });
                a.gap = [
                    cx + 3.3 * U * Math.sin((deg * Math.PI) / 180),
                    cy - 3.3 * U * Math.cos((deg * Math.PI) / 180),
                    "up",
                ];
                continue;
            }
            const size = Math.min(3, ((2 * Math.PI * 3.3) / n) * 0.95) * U;
            motif(t, p.motif, cx, cy - (5.6 * U - size) / 1.2, size, {
                fill: paintFill(c, hex, size / 100),
                level: "ruler",
            });
        }
        pen.circle(g, cx, cy, 2 * U, "ruler", paintFill(c, colourOf("yellow") ?? "#FFD63C"), {
            strokeWidth: 1.8,
        });
        a.centre = [cx, cy, "up"];
        return a;
    },
    describe: (p) => {
        const n = Math.max(3, Math.min(12, Math.round(p.repeats))),
            gap = Math.round(p.missing) >= 0 && Math.round(p.missing) < n;
        return `${MOTIFS[p.motif] ? p.motif.charAt(0).toUpperCase() + p.motif.slice(1) : "Leaf"} shapes in ${nameOf(colourOf(p.colour) ?? panColour("pink")).name} repeated round a centre, each turned the same amount from the last, with a yellow circle in the middle${gap ? ", one place left empty" : ""}.`;
    },
});
