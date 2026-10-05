import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash } from "./wash";

/** Squares a bed's cell is across, which the garden game's beds are laid out in. */
export const BED_CELL = 2;

const WET_WORDS = ["dry", "damp", "moist", "wet", "soaked"] as const;

/**
 * A garden bed seen from above: a frame of planks round a rectangle of dug soil in rows, darker the
 * wetter it is, with a puddle standing in it when it has had far too much.
 */
export const gardenBed = defineDrawing<{
    cols: number;
    rows: number;
    wet: number;
    puddle: boolean;
}>({
    id: "gardenbed",
    family: "outdoors",
    title: "Garden bed",
    group: "Structures",
    about: "A raised garden bed seen from above: a plank frame round dug soil marked in rows of planting cells, the soil darker as it gets wetter, with a puddle when it is soaked.",
    params: { cols: 6, rows: 3, wet: 0, puddle: false },
    settings: {
        cols: { kind: "number", min: 1, max: 12, step: 1 },
        rows: { kind: "number", min: 1, max: 8, step: 1 },
        wet: { kind: "number", min: 0, max: 4, step: 1 },
        puddle: { kind: "flag" },
    },
    takes: [
        { label: "Dry, six by three", params: { cols: 6, rows: 3, wet: 0, puddle: false } },
        { label: "Moist, four by four", params: { cols: 4, rows: 4, wet: 2, puddle: false } },
        { label: "Soaked, with a puddle", params: { cols: 5, rows: 2, wet: 4, puddle: true } },
    ],
    box: (p) => ({ w: p.cols * BED_CELL, h: p.rows * BED_CELL }),
    draw: (c, p) => {
        const cell = BED_CELL * U,
            w = p.cols * cell,
            h = p.rows * cell,
            // the frame's planks, inset so their rough line stays inside the box
            m = 0.12 * U,
            rim = 0.32 * U,
            wet = Math.max(0, Math.min(4, Math.round(p.wet)));
        if (!c.paper) {
            // the plank frame in wood, then the dug soil a darker brown inside it, darker again as it wets
            plain(c, {
                kind: "rect",
                x: m,
                y: m,
                w: w - 2 * m,
                h: h - 2 * m,
                fill: c.t.tang,
                opacity: 0.55,
            });
            plain(c, {
                kind: "rect",
                x: rim,
                y: rim,
                w: w - 2 * rim,
                h: h - 2 * rim,
                fill: c.t["ink-soft"],
                opacity: 0.22 + 0.09 * wet,
            });
            plain(c, {
                kind: "rect",
                x: rim,
                y: rim,
                w: w - 2 * rim,
                h: h - 2 * rim,
                fill: c.t.tang,
                opacity: 0.18,
            });
        }
        c.pen.rect(c.g, m, m, w - 2 * m, h - 2 * m, "pencil", null, { strokeWidth: 1.6 });
        c.pen.rect(c.g, rim, rim, w - 2 * rim, h - 2 * rim, "pencil", null, {
            strokeWidth: 0.8,
            stroke: c.t["ink-soft"],
        });
        // the joins between the frame's planks
        for (let x = 2 * U; x < w - U; x += 3 * U) {
            c.pen.line(c.g, x, m, x, rim, "pencil", { stroke: c.t["ink-soft"], strokeWidth: 0.6 });
            c.pen.line(c.g, x, h - rim, x, h - m, "pencil", {
                stroke: c.t["ink-soft"],
                strokeWidth: 0.6,
            });
        }
        // furrows along each row, and a crumb or two of soil between them
        for (let r = 0; r < p.rows; r++) {
            const y = (r + 0.5) * cell;
            c.pen.line(
                c.g,
                rim + 0.3 * U,
                y + 0.45 * U,
                w - rim - 0.3 * U,
                y + 0.45 * U,
                "pencil",
                {
                    stroke: c.t["ink-soft"],
                    strokeWidth: 0.6,
                    roughness: 0.8,
                },
            );
            for (let k = 0; k < p.cols * 2; k++) {
                const x = rim + 0.4 * U + hash(r, k) * (w - 2 * rim - 0.8 * U),
                    yy = y - 0.4 * U + hash(k, r, 1) * 0.6 * U;
                c.pen.circle(c.g, x, yy, 0.12 * U, "pencil", c.pen.fill("ink-soft", "solid"), {
                    strokeWidth: 0.3,
                });
            }
        }
        if (p.puddle)
            c.pen.ellipse(
                c.g,
                w * 0.5,
                h * 0.55,
                Math.min(w * 0.5, 3 * U),
                Math.min(h * 0.35, 1.2 * U),
                "pencil",
                c.pen.fill("sky", "solid"),
                {
                    strokeWidth: 1,
                    stroke: c.t.sky,
                },
            );
        return {};
    },
    describe: (p) => {
        const wet = WET_WORDS[Math.max(0, Math.min(4, Math.round(p.wet)))] ?? "dry";
        return `A garden bed seen from above, ${p.cols} cells across and ${p.rows} down, its soil ${wet}${p.puddle ? " with a puddle standing in it" : ""}, inside a frame of wooden planks.`;
    },
    motion: {
        still: "A bed is the ground plants stand in; if it moved, everything in it would seem to slide.",
    },
});
