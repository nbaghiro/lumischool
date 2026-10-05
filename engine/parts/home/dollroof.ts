import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

export interface RoofParams {
    w: number;
    tone: Marker;
    chimney: boolean;
}

/** A roof stands two squares tall over a room as wide as it is. */
export const ROOF_H = 2;

const widthOf = (v: unknown): number => Math.max(2, Math.min(8, Math.round(Number(v) || 4)));
const toneOf = (v: unknown): Marker => MARKERS.find((m) => m === v) ?? "berry";

/** A pointed roof drawn at `x`, `y` (its top left, in units) into `c`. */
export function drawRoof<G>(c: Ctx<G>, x: number, y: number, p: RoofParams): void {
    const { pen } = c,
        g = group(c, { turn: [["translate", x, y]] }).g;
    const w = widthOf(p.w) * U,
        h = ROOF_H * U,
        foot = h - 1.5;
    if (p.chimney) {
        const cx = w * 0.72;
        pen.rect(g, cx, 0.25 * U, 0.4 * U, 1.1 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.4,
        });
    }
    pen.polygon(
        g,
        [
            [1.5, foot],
            [w / 2, 1.5],
            [w - 1.5, foot],
        ],
        "pencil",
        pen.fill(toneOf(p.tone)),
        { strokeWidth: 2.2 },
    );
    // rows of tiles, each a little shorter towards the ridge
    for (let row = 1; row <= 3; row++) {
        const ty = foot - (row * (foot - 1.5)) / 4,
            half = (w / 2 - 1.5) * (1 - row / 4);
        pen.line(g, w / 2 - half, ty, w / 2 + half, ty, "ruler", { strokeWidth: 0.9 });
    }
    if (widthOf(p.w) >= 4)
        pen.circle(g, w / 2, foot * 0.62, 0.55 * U, "pencil", pen.fill("sky"), {
            strokeWidth: 1.3,
        });
}

export const dollRoof = defineDrawing<RoofParams>({
    id: "dollroof",
    family: "home",
    title: "Dollhouse roof",
    group: "Structures",
    about: "A pointed dollhouse roof as wide as the room under it, two to eight squares, with rows of tiles, a round attic window on a wide one, and a chimney if wanted.",
    params: { w: 4, tone: "berry", chimney: true },
    settings: {
        w: { kind: "whole", min: 2, max: 8 },
        tone: { kind: "one of", of: MARKERS },
        chimney: { kind: "flag" },
    },
    takes: [
        { label: "A roof with a chimney", params: { w: 4, tone: "berry", chimney: true } },
        { label: "A wide roof", params: { w: 8, tone: "tang", chimney: false } },
        { label: "A narrow roof", params: { w: 2, tone: "sky", chimney: false } },
    ],
    box: (p) => ({ w: widthOf(p.w), h: ROOF_H }),
    draw: (c, p): RawAnchors => {
        drawRoof(c, 0, 0, p);
        return { ridge: [(widthOf(p.w) * U) / 2, 2, "up"] };
    },
    describe: (p) =>
        `A pointed ${MARKER_WORD[toneOf(p.tone)]} dollhouse roof ${widthOf(p.w)} squares wide with rows of tiles drawn across it${widthOf(p.w) >= 4 ? " and a round window" : ""}${p.chimney ? ", and a chimney" : ""}.`,
    motion: { still: "A roof sits on top of its house and holds still in every weather." },
});
