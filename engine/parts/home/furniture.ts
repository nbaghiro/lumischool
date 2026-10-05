import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

export const FURNITURE = [
    "bed",
    "sofa",
    "table",
    "chair",
    "lamp",
    "bath",
    "fridge",
    "plant",
    "rug",
    "picture",
    "shelf",
    "tv",
    "cooker",
] as const;
export type Furniture = (typeof FURNITURE)[number];

export interface FurnitureParams {
    kind: Furniture;
    tone: Marker;
    /** A lamp lit, a bath run, the television or the cooker on. */
    on: boolean;
}

/**
 * Each piece's box in squares, drawn twice the size a dollhouse shows it, so the detail survives:
 * school/games/dollhouse.ts halves them. A wall piece hangs; everything else stands on its box's foot.
 */
export const FURNITURE_BOX: Record<Furniture, { w: number; h: number }> = {
    bed: { w: 6, h: 3 },
    sofa: { w: 5, h: 3 },
    table: { w: 4, h: 2 },
    chair: { w: 2, h: 3 },
    lamp: { w: 2, h: 4 },
    bath: { w: 5, h: 3 },
    fridge: { w: 2, h: 4 },
    plant: { w: 2, h: 3 },
    rug: { w: 5, h: 1 },
    picture: { w: 3, h: 2 },
    shelf: { w: 4, h: 2 },
    tv: { w: 4, h: 4 },
    cooker: { w: 3, h: 4 },
};

const NOUN: Record<Furniture, string> = {
    bed: "bed",
    sofa: "sofa",
    table: "table",
    chair: "chair",
    lamp: "standing lamp",
    bath: "bath",
    fridge: "fridge",
    plant: "pot plant",
    rug: "rug",
    picture: "picture",
    shelf: "shelf of books",
    tv: "television",
    cooker: "cooker",
};

const kindOf = (v: unknown): Furniture => FURNITURE.find((k) => k === v) ?? "bed";
const toneOf = (v: unknown): Marker => MARKERS.find((m) => m === v) ?? "sky";

type Shape = <G>(c: Ctx<G>, g: G, tone: Marker, on: boolean) => void;

const S = (n: number) => n * U;

const SHAPES: Record<Furniture, Shape> = {
    bed: (c, g, tone) => {
        const { pen } = c;
        pen.rect(g, S(0.2), S(0.4), S(0.6), S(2.4), "pencil", pen.fill("tang"), {
            strokeWidth: 1.6,
        });
        pen.rect(g, S(0.2), S(2.2), S(5.6), S(0.55), "pencil", pen.fill("tang", "hachure"), {
            strokeWidth: 1.6,
        });
        for (const lx of [0.4, 5.4])
            pen.rect(g, S(lx), S(2.75), S(0.22), S(0.22), "pencil", pen.fill("tang"), {
                strokeWidth: 1,
            });
        pen.rect(g, S(0.8), S(1.6), S(5), S(0.6), "pencil", pen.fill("card"), { strokeWidth: 1.4 });
        pen.ellipse(g, S(1.45), S(1.45), S(1.0), S(0.5), "pencil", pen.fill("card"), {
            strokeWidth: 1.3,
        });
        pen.rect(g, S(2.2), S(1.45), S(3.6), S(0.9), "pencil", pen.fill(tone), {
            strokeWidth: 1.4,
        });
        pen.line(g, S(2.2), S(1.75), S(5.8), S(1.75), "ruler", { strokeWidth: 1 });
    },
    sofa: (c, g, tone) => {
        const { pen } = c;
        pen.rect(g, S(0.4), S(0.7), S(4.2), S(1.3), "pencil", pen.fill(tone), { strokeWidth: 1.6 });
        pen.rect(g, S(0.4), S(1.8), S(4.2), S(0.7), "pencil", pen.fill(tone), { strokeWidth: 1.6 });
        for (const ax of [0.05, 4.35])
            pen.rect(g, S(ax), S(1.1), S(0.6), S(1.5), "pencil", pen.fill(tone), {
                strokeWidth: 1.6,
            });
        pen.line(g, S(2.5), S(0.8), S(2.5), S(1.8), "ruler", { strokeWidth: 1 });
        for (const lx of [0.3, 4.5])
            pen.rect(g, S(lx), S(2.6), S(0.2), S(0.35), "pencil", pen.fill("tang"), {
                strokeWidth: 1,
            });
    },
    table: (c, g) => {
        const { pen } = c;
        pen.rect(g, S(0.05), S(0.5), S(3.9), S(0.3), "pencil", pen.fill("tang"), {
            strokeWidth: 1.6,
        });
        for (const lx of [0.35, 3.45])
            pen.rect(g, S(lx), S(0.8), S(0.2), S(1.15), "pencil", pen.fill("tang", "hachure"), {
                strokeWidth: 1.2,
            });
    },
    chair: (c, g, tone) => {
        const { pen } = c;
        pen.rect(g, S(0.25), S(0.3), S(0.28), S(1.6), "pencil", pen.fill(tone), {
            strokeWidth: 1.4,
        });
        pen.rect(g, S(0.25), S(1.6), S(1.5), S(0.28), "pencil", pen.fill(tone), {
            strokeWidth: 1.4,
        });
        for (const lx of [0.3, 1.5])
            pen.rect(g, S(lx), S(1.88), S(0.18), S(1.07), "pencil", pen.fill("tang", "hachure"), {
                strokeWidth: 1,
            });
    },
    lamp: (c, g, tone, on) => {
        const { pen } = c;
        if (on)
            pen.circle(g, S(1), S(1.1), S(1.9), "pencil", pen.fill("glow", "hachure"), {
                stroke: "none",
            });
        pen.line(g, S(1), S(1.4), S(1), S(3.8), "ruler", { strokeWidth: 2 });
        pen.ellipse(g, S(1), S(3.82), S(1.2), S(0.28), "pencil", pen.fill("tang"), {
            strokeWidth: 1.3,
        });
        pen.polygon(
            g,
            [
                [S(0.35), S(1.45)],
                [S(1.65), S(1.45)],
                [S(1.35), S(0.5)],
                [S(0.65), S(0.5)],
            ],
            "pencil",
            pen.fill(on ? "glow" : tone),
            { strokeWidth: 1.5 },
        );
    },
    bath: (c, g, _tone, on) => {
        const { pen } = c;
        pen.line(g, S(4.4), S(1.35), S(4.4), S(0.6), "ruler", { strokeWidth: 2 });
        pen.line(g, S(4.4), S(0.6), S(3.9), S(0.6), "ruler", { strokeWidth: 2 });
        if (on) {
            pen.rect(g, S(3.82), S(0.7), S(0.12), S(0.7), "pencil", pen.fill("sky"), {
                stroke: "none",
            });
            for (const [bx, by] of [
                [1.2, 1.15],
                [1.8, 1.05],
                [2.6, 1.15],
                [3.3, 1.1],
            ] as const)
                pen.circle(g, S(bx), S(by), S(0.35), "pencil", pen.fill("card"), {
                    strokeWidth: 1,
                });
        }
        pen.path(
            g,
            `M${S(0.2)} ${S(1.35)}H${S(4.8)}V${S(2.1)}Q${S(4.8)} ${S(2.65)} ${S(4.2)} ${S(2.65)}H${S(0.8)}Q${S(0.2)} ${S(2.65)} ${S(0.2)} ${S(2.1)}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.7 },
        );
        if (on)
            pen.rect(g, S(0.35), S(1.45), S(4.3), S(0.3), "pencil", pen.fill("sky"), {
                stroke: "none",
            });
        for (const fx of [0.9, 4.1])
            pen.circle(g, S(fx), S(2.82), S(0.3), "pencil", pen.fill("tang"), { strokeWidth: 1 });
    },
    fridge: (c, g, tone) => {
        const { pen } = c;
        pen.rect(g, S(0.15), S(0.1), S(1.7), S(3.85), "pencil", pen.fill("card"), {
            strokeWidth: 1.7,
        });
        pen.line(g, S(0.15), S(1.4), S(1.85), S(1.4), "ruler", { strokeWidth: 1.3 });
        for (const [hy, hh] of [
            [0.5, 0.6],
            [1.7, 0.9],
        ] as const)
            pen.line(g, S(1.6), S(hy), S(1.6), S(hy + hh), "ruler", { strokeWidth: 2 });
        pen.circle(g, S(0.6), S(0.6), S(0.3), "pencil", pen.fill(tone), { strokeWidth: 1 });
        pen.circle(g, S(0.9), S(2.4), S(0.3), "pencil", pen.fill("glow"), { strokeWidth: 1 });
    },
    plant: (c, g) => {
        const { pen } = c;
        for (const [lx, ly, a] of [
            [0.7, 1.1, -30],
            [1.3, 1.0, 30],
            [1.0, 0.7, 0],
            [0.55, 1.6, -50],
            [1.45, 1.55, 50],
        ] as const) {
            const leaf = group(c, { turn: [["rotate", a, S(lx), S(ly)]] }).g;
            pen.ellipse(leaf, S(lx), S(ly), S(0.45), S(1.0), "pencil", pen.fill("mint"), {
                strokeWidth: 1.2,
            });
        }
        pen.polygon(
            g,
            [
                [S(0.5), S(2.1)],
                [S(1.5), S(2.1)],
                [S(1.35), S(2.95)],
                [S(0.65), S(2.95)],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.5 },
        );
    },
    rug: (c, g, tone) => {
        const { pen } = c;
        pen.ellipse(g, S(2.5), S(0.65), S(4.8), S(0.6), "pencil", pen.fill(tone), {
            strokeWidth: 1.4,
        });
        pen.ellipse(g, S(2.5), S(0.65), S(3.2), S(0.32), "pencil", pen.fill("card"), {
            strokeWidth: 1,
        });
    },
    picture: (c, g) => {
        const { pen } = c;
        pen.rect(g, S(0.2), S(0.2), S(2.6), S(1.6), "pencil", pen.fill("sky"), {
            strokeWidth: 2.2,
        });
        pen.path(
            g,
            `M${S(0.25)} ${S(1.75)}Q${S(1)} ${S(0.9)} ${S(1.7)} ${S(1.4)}Q${S(2.3)} ${S(1.1)} ${S(2.75)} ${S(1.5)}V${S(1.75)}Z`,
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1 },
        );
        pen.circle(g, S(2.2), S(0.65), S(0.45), "pencil", pen.fill("glow"), { strokeWidth: 1 });
    },
    shelf: (c, g) => {
        const { pen } = c;
        const books: [number, number, Marker][] = [
            [0.4, 1.0, "berry"],
            [0.75, 1.15, "sky"],
            [1.1, 0.9, "mint"],
            [1.45, 1.1, "glow"],
            [2.4, 0.95, "tang"],
            [2.75, 1.15, "sky"],
        ];
        for (const [bx, bh, tone] of books)
            pen.rect(g, S(bx), S(1.5 - bh), S(0.32), S(bh), "pencil", pen.fill(tone), {
                strokeWidth: 1.1,
            });
        pen.circle(g, S(3.4), S(1.25), S(0.45), "pencil", pen.fill("mint"), { strokeWidth: 1 });
        pen.rect(g, S(0.1), S(1.5), S(3.8), S(0.22), "pencil", pen.fill("tang"), {
            strokeWidth: 1.4,
        });
        for (const kx of [0.6, 3.2])
            pen.linear(
                g,
                [
                    [S(kx), S(1.72)],
                    [S(kx), S(1.95)],
                    [S(kx + 0.3), S(1.72)],
                ],
                "ruler",
                { strokeWidth: 1.2 },
            );
    },
    tv: (c, g, _tone, on) => {
        const { pen } = c;
        pen.rect(g, S(0.2), S(2.6), S(3.6), S(1.35), "pencil", pen.fill("tang", "hachure"), {
            strokeWidth: 1.6,
        });
        pen.line(g, S(2), S(2.6), S(2), S(3.95), "ruler", { strokeWidth: 1 });
        pen.rect(g, S(1.7), S(2.35), S(0.6), S(0.25), "pencil", pen.fill("card"), {
            strokeWidth: 1.1,
        });
        pen.rect(g, S(0.5), S(0.45), S(3), S(1.9), "pencil", pen.fill(on ? "sky" : "card"), {
            strokeWidth: 2,
        });
        if (on) {
            pen.circle(g, S(2.6), S(1.0), S(0.5), "pencil", pen.fill("glow"), { strokeWidth: 1 });
            pen.path(
                g,
                `M${S(0.6)} ${S(2.25)}Q${S(1.4)} ${S(1.4)} ${S(2.2)} ${S(1.9)}Q${S(2.9)} ${S(1.6)} ${S(3.4)} ${S(2.1)}V${S(2.25)}Z`,
                "pencil",
                pen.fill("mint"),
                { strokeWidth: 1 },
            );
        } else pen.line(g, S(0.8), S(0.8), S(1.4), S(0.65), "ruler", { strokeWidth: 1 });
    },
    cooker: (c, g, _tone, on) => {
        const { pen } = c;
        pen.rect(g, S(0.15), S(1.2), S(2.7), S(2.75), "pencil", pen.fill("card"), {
            strokeWidth: 1.7,
        });
        pen.rect(g, S(0.15), S(0.9), S(2.7), S(0.3), "pencil", pen.fill("card"), {
            strokeWidth: 1.3,
        });
        for (const kx of [0.6, 1.2, 1.8, 2.4])
            pen.circle(g, S(kx), S(1.05), S(0.16), "pencil", pen.fill("ink-soft"), {
                stroke: "none",
            });
        pen.rect(
            g,
            S(0.45),
            S(1.9),
            S(2.1),
            S(1.6),
            "pencil",
            pen.fill(on ? "tang" : "sky", "hachure"),
            {
                strokeWidth: 1.4,
            },
        );
        pen.line(g, S(0.7), S(1.6), S(2.3), S(1.6), "ruler", { strokeWidth: 2 });
        if (on)
            for (const fx of [0.9, 2.1])
                pen.path(
                    g,
                    `M${S(fx - 0.25)} ${S(0.88)}Q${S(fx)} ${S(0.2)} ${S(fx + 0.25)} ${S(0.88)}Z`,
                    "pencil",
                    pen.fill("glow"),
                    { strokeWidth: 1 },
                );
    },
};

/** A piece of furniture drawn at `x`, `y` (its box's top left, in units) into `c`, `k` times its own size. */
export function drawFurniture<G>(c: Ctx<G>, x: number, y: number, p: FurnitureParams, k = 1): void {
    const inner = group(c, {
        turn: [
            ["translate", x, y],
            ["scale", k],
        ],
    });
    SHAPES[kindOf(p.kind)](inner, inner.g, toneOf(p.tone), p.on);
}

const SAID: Record<Furniture, (tone: string, on: boolean) => string> = {
    bed: (t) =>
        `A wooden bed seen from the side with a headboard, a white pillow and a ${t} blanket pulled up, ready for someone to climb in.`,
    sofa: (t) =>
        `A soft ${t} sofa seen from the front with two cushions, round arms at each end and short wooden legs underneath.`,
    table: () =>
        "A plain wooden table seen from the side, a long flat top standing on two straight legs, for meals or games.",
    chair: (t) =>
        `A small wooden chair seen from the side, with a ${t} seat and a straight back, standing on two legs.`,
    lamp: (t, on) =>
        on
            ? "A standing lamp switched on, its shade glowing yellow on a long thin pole with a round foot, lighting the room around it."
            : `A standing lamp switched off, with a ${t} shade on a long thin pole and a round foot on the floor.`,
    bath: (_t, on) =>
        on
            ? "A white bath on little round feet, filled with blue water and bubbles, with the tap running from the pipe at one end."
            : "An empty white bath with rounded corners on little round feet, and a curved tap standing up at one end.",
    fridge: (t) =>
        `A tall white fridge with a small freezer door on top, long handles, and a ${t} magnet and a yellow one stuck on.`,
    plant: () =>
        "A pot plant with long green leaves fanning out of an orange pot that stands on the floor in the corner.",
    rug: (t) =>
        `An oval ${t} rug lying flat on the floor, with a white middle and a coloured border all the way round.`,
    picture: () =>
        "A framed picture hanging on the wall, showing green hills under a blue sky with a yellow sun in the corner.",
    shelf: () =>
        "A wooden shelf on two brackets fixed to the wall, holding a row of coloured books and a small round plant.",
    tv: (_t, on) =>
        on
            ? "A television switched on, showing hills and a yellow sun, standing on a low wooden cabinet with two doors."
            : "A television switched off, its screen white and empty, standing on a low wooden cabinet with two doors.",
    cooker: (_t, on) =>
        on
            ? "A white cooker with its hob lit, little yellow flames over the rings, and an orange glow behind the oven door."
            : "A white cooker with four rings on top, a row of knobs and an oven door with a handle and a window.",
};

export const furniture = defineDrawing<FurnitureParams>({
    id: "furniture",
    family: "home",
    title: "Dollhouse furniture",
    group: "Props",
    about: "The furniture a dollhouse is filled with, one piece at a time, each seen from the front or side: a bed, a sofa, a table and chair, a lamp, a bath, a fridge, a cooker, a television, a plant, a rug, a picture and a shelf, in a chosen colour, and switched on where that means something.",
    params: { kind: "bed", tone: "sky", on: false },
    settings: {
        kind: { kind: "one of", of: FURNITURE },
        tone: { kind: "one of", of: MARKERS },
        on: { kind: "flag" },
    },
    takes: [
        { label: "A bed", params: { kind: "bed", tone: "berry", on: false } },
        { label: "A sofa", params: { kind: "sofa", tone: "sky", on: false } },
        { label: "A table", params: { kind: "table", tone: "tang", on: false } },
        { label: "A chair", params: { kind: "chair", tone: "mint", on: false } },
        { label: "A lamp switched on", params: { kind: "lamp", tone: "glow", on: true } },
        { label: "A lamp switched off", params: { kind: "lamp", tone: "berry", on: false } },
        { label: "A bath running", params: { kind: "bath", tone: "sky", on: true } },
        { label: "A fridge", params: { kind: "fridge", tone: "berry", on: false } },
        { label: "A pot plant", params: { kind: "plant", tone: "mint", on: false } },
        { label: "A rug", params: { kind: "rug", tone: "berry", on: false } },
        { label: "A picture", params: { kind: "picture", tone: "sky", on: false } },
        { label: "A shelf of books", params: { kind: "shelf", tone: "tang", on: false } },
        { label: "A television switched on", params: { kind: "tv", tone: "sky", on: true } },
        { label: "A cooker", params: { kind: "cooker", tone: "glow", on: false } },
        { label: "A cooker lit", params: { kind: "cooker", tone: "glow", on: true } },
    ],
    box: (p) => FURNITURE_BOX[kindOf(p.kind)],
    draw: (c, p): RawAnchors => {
        drawFurniture(c, 0, 0, p);
        const b = FURNITURE_BOX[kindOf(p.kind)];
        return { foot: [(b.w * U) / 2, b.h * U, "up"] };
    },
    describe: (p) => SAID[kindOf(p.kind)](MARKER_WORD[toneOf(p.tone)], p.on),
    motion: { still: "Furniture stands where it was put in the room until someone moves it." },
});

export const nounOf = (k: Furniture): string => NOUN[k];
