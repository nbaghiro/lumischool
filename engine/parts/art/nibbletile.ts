import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { loop } from "../marks";
import { type Pt } from "./kit";

const BITES = ["none", "triangle", "curve"] as const;
const MOVES = ["away", "opposite", "next"] as const;

/** A tile's side, in squares; the bite takes the middle two fifths of an edge, a third of a side deep. */
const S = 4;
const FROM = 0.3,
    TO = 0.7,
    DEEP = 1.3;
const COLOURS: Marker[] = ["sky", "tang"];

/** How deep the bite is at `t` along an edge, 0 outside the bite. */
function depth(bite: string, t: number): number {
    if (bite === "none" || t <= FROM || t >= TO) return 0;
    const u = (t - FROM) / (TO - FROM);
    return bite === "triangle" ? DEEP * (1 - Math.abs(2 * u - 1)) : DEEP * Math.sin(Math.PI * u);
}

/**
 * The tile's outline in squares from its top-left corner, clockwise. The side bite is cut into the
 * left edge; `opposite` slides it onto the right edge as a bump, `next` sticks it on the top edge, and
 * `away` leaves the notch empty. `both` cuts the same bite into the top edge and slides it to the bottom.
 */
function outline(bite: string, move: string, both: boolean): Pt[] {
    const out: Pt[] = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const up = (both ? depth(bite, t) : 0) - (move === "next" ? depth(bite, t) : 0);
        out.push([t * S, up]);
    }
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        out.push([S + (move === "opposite" ? depth(bite, t) : 0), t * S]);
    }
    for (let i = 1; i <= steps; i++) {
        const t = 1 - i / steps;
        out.push([t * S, S + (both ? depth(bite, t) : 0)]);
    }
    for (let i = 1; i < steps; i++) {
        const t = 1 - i / steps;
        out.push([depth(bite, t), t * S]);
    }
    return out;
}

/** Whether copies of the tile cover a floor with no gaps and no overlaps: only a bite slid across does. */
const fits = (bite: string, move: string): boolean => bite === "none" || move === "opposite";

const margin = (bite: string, move: string): number =>
    bite !== "none" && move === "next" ? DEEP : 0;

export const nibbleTile = defineDrawing({
    id: "nibbletile",
    family: "art",
    title: "A tile with a bite moved",
    group: "Structures",
    about: "A square tile with a bite cut from its left side, a triangle or a curve, and what happens to the bite: thrown away, slid straight across onto the right side, or stuck on the top. Laid in rows, only the tile whose bite was slid across fills the floor with no gaps and no overlaps, which is how a tile that fits itself is made, after the Alhambra's tiles and M. C. Escher's. `both` cuts a second bite from the top and slides it to the bottom. One tile on its own, or several in rows in two colours.",
    params: {
        bite: "curve",
        move: "opposite",
        both: 0,
        cols: 3,
        rows: 2,
        ring: -1,
    },
    settings: {
        bite: { kind: "one of", of: BITES },
        move: { kind: "one of", of: MOVES },
        both: { kind: "whole", min: 0, max: 1 },
        cols: { kind: "whole", min: 1, max: 4 },
        rows: { kind: "whole", min: 1, max: 3 },
        ring: { kind: "whole", min: -1, max: 11 },
    },
    takes: [
        {
            label: "A curve slid across, tiled",
            params: { bite: "curve", move: "opposite", both: 0, cols: 3, rows: 2, ring: -1 },
        },
        {
            label: "One tile, a triangle thrown away",
            params: { bite: "triangle", move: "away", both: 0, cols: 1, rows: 1, ring: -1 },
        },
        {
            label: "Stuck on the top, tiled",
            params: { bite: "curve", move: "next", both: 0, cols: 3, rows: 2, ring: -1 },
        },
        {
            label: "Two bites, tiled",
            params: { bite: "curve", move: "opposite", both: 1, cols: 3, rows: 2, ring: 4 },
        },
    ],
    box: (p) => {
        const cols = Math.max(1, Math.min(4, Math.round(p.cols))),
            rows = Math.max(1, Math.min(3, Math.round(p.rows))),
            top = margin(p.bite, p.move);
        return {
            w: Math.ceil(cols * S + DEEP + 1),
            h: Math.ceil(rows * S + top + (p.both ? DEEP : 0) + 1),
        };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            cols = Math.max(1, Math.min(4, Math.round(p.cols))),
            rows = Math.max(1, Math.min(3, Math.round(p.rows))),
            shape = outline(p.bite, p.move, p.both > 0),
            ox = 0.5,
            oy = 0.5 + margin(p.bite, p.move),
            a: RawAnchors = {};
        for (let row = 0; row < rows; row++)
            for (let col = 0; col < cols; col++) {
                const k = row * cols + col,
                    x = ox + col * S,
                    y = oy + row * S;
                pen.polygon(
                    g,
                    shape.map(([px, py]): Pt => [(x + px) * U, (y + py) * U]),
                    "ruler",
                    pen.fill(COLOURS[(row + col) % 2] ?? "sky", "hachure", { hachureGap: 5 }),
                    { strokeWidth: 1.6 },
                );
                if (k === Math.round(p.ring))
                    loop(c, (x + S / 2) * U, (y + S / 2) * U, (S + 0.6) * U, (S + 0.6) * U);
                a[`tile(${k})`] = [(x + S / 2) * U, y * U, "up"];
            }
        return a;
    },
    describe: (p) => {
        const cols = Math.max(1, Math.min(4, Math.round(p.cols))),
            rows = Math.max(1, Math.min(3, Math.round(p.rows))),
            kind = p.bite === "triangle" ? "triangular" : "curved",
            went =
                p.move === "away"
                    ? "thrown away"
                    : p.move === "opposite"
                      ? "stuck on its right"
                      : "stuck on its top",
            what =
                p.bite === "none"
                    ? "A plain square tile with no bite cut from it"
                    : `A square tile, a ${kind} bite cut from its left side and ${went}${p.both ? ", a top bite on its bottom" : ""}`;
        return cols * rows > 1
            ? `${what}, laid ${cols} by ${rows}, ${fits(p.bite, p.move) ? "fitting with no gaps" : "leaving gaps"}.`
            : `${what}, one tile on its own on squared paper.`;
    },
});
