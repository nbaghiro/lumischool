import { plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** The board's size, its rim, its start line and its felt, in squares from the drawing's top left. The game lays its walls, its line and its box on these. */
export const BOARD = {
    w: 45,
    h: 24,
    rim: 1,
    line: 11,
    felt: { x: 28.5, y: 5.5, w: 13, h: 13 },
} as const;

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** How many squares across a take draws: the game's whole board, or a shorter counter with the same rim, line and felt, to fit a page. */
const spanOf = (v: unknown) =>
    Math.max(BOARD.line + BOARD.felt.w + 6, Math.min(BOARD.w, Math.round(Number(v) || BOARD.w)));

interface ShoveBoardParams {
    felt: boolean;
    span: number;
}

export const shoveBoard = defineDrawing<ShoveBoardParams>({
    id: "shoveboard",
    family: "money",
    title: "Shove board",
    group: "Structures",
    about: "A counter top seen from above, with a raised wooden rim all round and a square of felt stitched into it, for a game in which coins are shoved along it into the felt. The rim stops a coin going off the edge, and the felt is where a coin counts.",
    params: { felt: true, span: BOARD.w },
    settings: { felt: { kind: "flag" }, span: { kind: "whole", min: 30, max: 45 } },
    takes: [
        { label: "With its felt, as long as a page", params: { felt: true, span: 36 } },
        { label: "The bare counter", params: { felt: false, span: 36 } },
    ],
    box: (p) => ({ w: spanOf(p.span), h: BOARD.h }),
    draw: (c, p) => {
        const { pen, g } = c,
            span = spanOf(p.span),
            W = span * U,
            H = BOARD.h * U,
            r = BOARD.rim * U;
        const wood = pen.fill("tang", "hachure", {
            hachureGap: 6,
            hachureAngle: -12,
            fillWeight: 0.8,
        });
        for (const [x, y, w, h] of [
            [0, 0, W, r],
            [0, H - r, W, r],
            [0, r, r, H - 2 * r],
            [W - r, r, r, H - 2 * r],
        ] as const) {
            pen.rect(g, x + 1, y + 1, w - 2, h - 2, "ruler", wood, { stroke: "none" });
        }
        pen.path(g, roundedRect(1.5, 1.5, W - 3, H - 3, 12), "ruler", null, calm(c, 2));
        pen.path(g, roundedRect(r, r, W - 2 * r, H - 2 * r, 4), "ruler", null, calm(c, 1.5));
        const f = BOARD.felt,
            fx = (f.x - (BOARD.w - span)) * U,
            fy = f.y * U,
            fw = f.w * U,
            fh = f.h * U,
            a: RawAnchors = {};
        if (p.felt) {
            // The line a shove starts from: a coin that stops behind it goes back to its pile.
            pen.line(g, BOARD.line * U, r + 6, BOARD.line * U, H - r - 6, "ruler", {
                strokeWidth: 1.6,
                stroke: c.t["ink-soft"],
                strokeLineDash: [9, 7],
                disableMultiStroke: true,
            });
            const d = roundedRect(fx, fy, fw, fh, 10);
            if (c.paper)
                pen.path(
                    g,
                    d,
                    "pencil",
                    pen.fill("mint", "hachure", { hachureGap: 11, fillWeight: 0.5 }),
                    { stroke: "none" },
                );
            else plain(c, { kind: "path", d, fill: c.t.mint, opacity: 0.3 });
            pen.path(g, d, "ruler", null, calm(c, 1.6));
            pen.path(g, roundedRect(fx + 9, fy + 9, fw - 18, fh - 18, 6), "ruler", null, {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
                strokeLineDash: [7, 6],
                disableMultiStroke: true,
            });
        }
        a.felt = [fx + fw / 2, fy + fh / 2, "up"];
        a.rim = [r, r, "up"];
        return a;
    },
    describe: (p) =>
        p.felt
            ? "A counter top seen from above with a raised wooden rim round it, a dashed start line and a square of green felt stitched in near one end."
            : "A bare counter top seen from above with a raised wooden rim round it, squared paper showing inside the rim and nothing on it.",
    motion: {
        still: "A counter is the ground coins slide on; if it moved, every coin on it would seem to slide.",
    },
});
