import { group, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { loop } from "../marks";
import { motif } from "./kit";

/** A motif tile repeated in rows and columns, straight or with every other column dropped by half a tile. */
export const tileRepeat = defineDrawing({
    id: "tilerepeat",
    family: "art",
    title: "A repeat in tiles",
    group: "Structures",
    about: "One tile with a flower and leaves on it, repeated across a sheet as a wallpaper is, one repeat after another, the way William Morris's papers were printed from woodblocks: in a straight repeat (drop 0) every row lines up, and in a half-drop (drop 1) every other column starts half a tile lower, which hides the grid. One tile can be ringed or left empty.",
    params: { drop: 0, cols: 4, rows: 3, missing: -1, ring: -1, colour: "green" },
    settings: {
        drop: { kind: "whole", min: 0, max: 1 },
        cols: { kind: "whole", min: 2, max: 11 },
        rows: { kind: "whole", min: 1, max: 14 },
        missing: { kind: "whole", min: -1, max: 47 },
        ring: { kind: "whole", min: -1, max: 47 },
        colour: { kind: "text", most: 24 },
    },
    takes: [
        {
            label: "Straight",
            params: { drop: 0, cols: 4, rows: 3, missing: -1, ring: -1, colour: "green" },
        },
        {
            label: "Half-drop, one missing",
            params: { drop: 1, cols: 4, rows: 3, missing: 6, ring: -1, colour: "green" },
        },
    ],
    box: (p) => ({
        w: Math.max(2, Math.round(p.cols)) * 3 + 1,
        h: Math.max(1, Math.round(p.rows)) * 3 + (p.drop ? 3 : 1),
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            cols = Math.max(2, Math.round(p.cols)),
            rows = Math.max(1, Math.round(p.rows)),
            a: RawAnchors = {};
        const hex = colourOf(p.colour) ?? panColour("green"),
            bloom = colourOf("pink") ?? "#F39CBF";
        for (let col = 0; col < cols; col++)
            for (let row = 0; row < rows; row++) {
                const k = row * cols + col,
                    x = (0.5 + col * 3) * U,
                    y = (0.5 + row * 3 + (p.drop > 0 && col % 2 ? 1.5 : 0)) * U;
                if (k === Math.round(p.missing)) {
                    pen.rect(g, x + 3, y + 3, 3 * U - 6, 3 * U - 6, "ruler", null, {
                        strokeWidth: 1.4,
                        strokeLineDash: [5, 5],
                        stroke: c.t["ink-soft"],
                    });
                    num(c, x + 1.5 * U, y + 1.9 * U, "?", 20, "middle", c.t.pen);
                } else {
                    pen.rect(g, x, y, 3 * U, 3 * U, "ruler", null, {
                        strokeWidth: 0.8,
                        stroke: c.t.grid,
                    });
                    const t = group(c, {});
                    motif(t, "leaf", x + 0.9 * U, y + 1.9 * U, 1.5 * U, {
                        fill: paintFill(c, hex, 0.015 * U),
                        level: "ruler",
                    });
                    motif(t, "flower", x + 1.8 * U, y + 1.1 * U, 1.6 * U, {
                        fill: paintFill(c, bloom, 0.016 * U),
                        level: "ruler",
                    });
                }
                if (k === Math.round(p.ring)) loop(c, x + 1.5 * U, y + 1.5 * U, 3.4 * U, 3.4 * U);
                a[`tile(${k})`] = [x + 1.5 * U, y, "up"];
            }
        return a;
    },
    describe: (p) => {
        const cols = Math.max(2, Math.round(p.cols)),
            rows = Math.max(1, Math.round(p.rows)),
            tiles = cols * rows;
        return `A tile with a flower and a leaf on it repeated across a sheet, ${cols} across and ${rows} down${p.drop > 0 ? ", every other column starting half a tile lower" : ", the rows lining up"}${Math.round(p.missing) >= 0 && Math.round(p.missing) < tiles ? ", one left empty" : ""}${Math.round(p.ring) >= 0 && Math.round(p.ring) < tiles ? ", one ringed" : ""}.`;
    },
});
