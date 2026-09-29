import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const SHAPES = ["rect", "L"] as const;
type Shape = (typeof SHAPES)[number];
const CLOTHS = ["mint", "sky", "berry"] as const;
type Cloth = (typeof CLOTHS)[number];

const shapeOf = (v: string): Shape => SHAPES.find((s) => s === v) ?? "rect";
const clothOf = (v: string): Cloth => CLOTHS.find((c) => c === v) ?? "mint";

/** Squares of wooden rail round the cloth, on every side. */
export const RAIL = 1;

interface Corner {
    x: number;
    y: number;
}

/** Where an L table's corner is cut away from its top right, in squares of cloth. */
const notch = (w: number, h: number): Corner => ({
    x: Math.round(w * 0.55),
    y: Math.round(h * 0.45),
});

/**
 * The cloth's edge, the cushions a ball banks off, as a closed outline in squares from the cloth's
 * top left. The game plays on this outline and the drawing draws it, so the two cannot disagree.
 */
export function tableOutline(shape: string, w: number, h: number): Corner[] {
    if (shapeOf(shape) === "rect")
        return [
            { x: 0, y: 0 },
            { x: w, y: 0 },
            { x: w, y: h },
            { x: 0, y: h },
        ];
    const n = notch(w, h);
    return [
        { x: 0, y: 0 },
        { x: n.x, y: 0 },
        { x: n.x, y: n.y },
        { x: w, y: n.y },
        { x: w, y: h },
        { x: 0, y: h },
    ];
}

/** The pockets, at the outer corners and halfway along the long sides, in squares from the cloth's top left. */
export function tablePockets(shape: string, w: number, h: number): Corner[] {
    if (shapeOf(shape) === "rect")
        return [
            { x: 0, y: 0 },
            { x: w / 2, y: 0 },
            { x: w, y: 0 },
            { x: 0, y: h },
            { x: w / 2, y: h },
            { x: w, y: h },
        ];
    const n = notch(w, h);
    return [
        { x: 0, y: 0 },
        { x: n.x, y: 0 },
        { x: w, y: n.y },
        { x: 0, y: h },
        { x: w / 2, y: h },
        { x: w, y: h },
    ];
}

/** The rail's outer edge, one square out from every cushion. */
function railOutline(shape: Shape, w: number, h: number): Corner[] {
    if (shape === "rect")
        return [
            { x: -RAIL, y: -RAIL },
            { x: w + RAIL, y: -RAIL },
            { x: w + RAIL, y: h + RAIL },
            { x: -RAIL, y: h + RAIL },
        ];
    const n = notch(w, h);
    return [
        { x: -RAIL, y: -RAIL },
        { x: n.x + RAIL, y: -RAIL },
        { x: n.x + RAIL, y: n.y - RAIL },
        { x: w + RAIL, y: n.y - RAIL },
        { x: w + RAIL, y: h + RAIL },
        { x: -RAIL, y: h + RAIL },
    ];
}

const pathOf = (pts: Corner[]): string =>
    pts.map((p, i) => `${i ? "L" : "M"}${(p.x + RAIL) * U} ${(p.y + RAIL) * U}`).join("") + "Z";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const poolTable = defineDrawing<{
    shape: string;
    width: number;
    height: number;
    cloth: string;
    dressed: boolean;
}>({
    id: "pooltable",
    family: "sport",
    title: "Pool table",
    group: "Structures",
    about: "A small pool table seen from above: coloured cloth inside a wooden rail, with round dark pockets at the corners and halfway along the long sides. It can be a plain oblong or an L with one corner cut away, and dressed it has balls set out and a cue.",
    params: { shape: "rect", width: 24, height: 12, cloth: "mint", dressed: false },
    settings: {
        shape: { kind: "one of", of: SHAPES },
        width: { kind: "whole", min: 6, max: 32 },
        height: { kind: "whole", min: 4, max: 20 },
        cloth: { kind: "one of", of: CLOTHS },
        dressed: { kind: "flag" },
    },
    takes: [
        {
            label: "A green table",
            params: { shape: "rect", width: 24, height: 12, cloth: "mint", dressed: false },
        },
        {
            label: "An L-shaped table",
            params: { shape: "L", width: 24, height: 14, cloth: "sky", dressed: false },
        },
        {
            label: "Set out for a game",
            params: { shape: "rect", width: 12, height: 6, cloth: "berry", dressed: true },
        },
    ],
    box: (p) => ({ w: p.width + RAIL * 2, h: p.height + RAIL * 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            shape = shapeOf(p.shape),
            w = p.width,
            h = p.height;
        pen.path(g, pathOf(railOutline(shape, w, h)), "pencil", pen.fill("tang", "hachure"), {
            strokeWidth: 2.2,
            roughness: 0.4,
        });
        pen.path(g, pathOf(tableOutline(shape, w, h)), "pencil", pen.fill(clothOf(p.cloth)), {
            strokeWidth: 1.6,
            roughness: 0.3,
        });
        // the spots on the rail a player lines a shot up by, at every eighth of the long side
        for (let k = 1; k < 8; k++) {
            if (k === 4) continue;
            const x = (RAIL + (w * k) / 8) * U;
            for (const y of [RAIL * 0.5 * U, (h + RAIL * 1.5) * U])
                if (shape === "rect" || y > U || (w * k) / 8 < notch(w, h).x)
                    pen.circle(g, x, y, 0.22 * U, "ruler", pen.fill("card"), {
                        strokeWidth: 0.8,
                        ...FIRM,
                    });
        }
        for (const q of tablePockets(shape, w, h))
            pen.circle(g, (q.x + RAIL) * U, (q.y + RAIL) * U, 2.05 * U, "pencil", pen.fill("ink"), {
                strokeWidth: 1.2,
                roughness: 0.2,
            });
        if (p.dressed) {
            const r = 0.55 * U,
                cy = (RAIL + h / 2) * U,
                front = (RAIL + w * 0.62) * U;
            const tones = ["glow", "sky", "berry", "mint", "tang", "glow"] as const;
            let k = 0;
            for (let row = 0; row < 3; row++)
                for (let i = 0; i <= row; i++) {
                    const x = front + row * r * 1.75,
                        y = cy + (i - row / 2) * r * 2.05;
                    pen.circle(g, x, y, r * 2, "pencil", pen.fill(tones[k % tones.length]), {
                        strokeWidth: 1.1,
                    });
                    k++;
                }
            const white = (RAIL + w * 0.25) * U;
            pen.circle(g, white, cy, r * 2, "pencil", pen.fill("card"), { strokeWidth: 1.2 });
            pen.line(g, white - 0.8 * r, cy + 0.4 * r, 0.6 * U, cy + 1.6 * U, "pencil", {
                strokeWidth: 3,
            });
        }
        return { middle: [(w / 2 + RAIL) * U, (h / 2 + RAIL) * U, "up"] };
    },
    describe: (p) =>
        p.dressed
            ? "A small pool table from above, its coloured cloth inside a wooden rail with six dark pockets, a triangle of coloured balls and a white ball with a cue."
            : shapeOf(p.shape) === "L"
              ? "An L-shaped pool table from above, coloured cloth inside a wooden rail with one corner cut away and round dark pockets at its outer corners."
              : "A small oblong pool table from above, coloured cloth inside a wooden rail, with round dark pockets at the four corners and halfway along the long sides.",
    motion: { still: "A table stands on the floor; only the balls on it move." },
});
