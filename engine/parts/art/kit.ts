import { rng, type Fill } from "../../ink/pen";
import { clip, group, plain, type Ctx } from "../../ink/surface";
import { U, type Level } from "../../paper";
import { isPigment, type Pigment } from "../../pigment";

export type Pt = [number, number];

/** A little white shine on wet paint, which is what makes a flat disc read as paint. Screen only. */
export function shine<G>(c: Ctx<G>, x: number, y: number, r: number): void {
    if (c.paper) return;
    plain(c, {
        kind: "path",
        d: `M${x - r * 0.55} ${y - r * 0.1}Q${x - r * 0.5} ${y - r * 0.55} ${x - r * 0.05} ${y - r * 0.6}`,
        fill: "none",
        stroke: "#FFFFFF",
        width: Math.max(1.5, r * 0.16),
        cap: "round",
        opacity: 0.8,
    });
}

/** An uneven round puddle of paint, the shape paint takes in a well or on a palette. */
export function blob(cx: number, cy: number, r: number, seed: number, squash = 1): string {
    const rand = rng(seed),
        n = 9,
        pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2,
            rr = r * (0.86 + rand() * 0.22);
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash]);
    }
    const first = pts[0] ?? [0, 0],
        last = pts[n - 1] ?? [0, 0];
    let d = `M${((first[0] + last[0]) / 2).toFixed(1)} ${((first[1] + last[1]) / 2).toFixed(1)}`;
    for (let i = 0; i < n; i++) {
        const p = pts[i] ?? [0, 0],
            q = pts[(i + 1) % n] ?? [0, 0];
        d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`;
    }
    return `${d}Z`;
}

export const pigmentsIn = (list: readonly string[]): Pigment[] => list.filter(isPigment);

/**
 * A fern frond pointing up in the hundred-unit box: a stem, and `pairs` pairs of leaflets that get
 * shorter towards the tip, so two fronds with different counts can be told apart by counting.
 */
export function fernPaths(pairs: number): string[] {
    const n = Math.max(2, Math.min(9, Math.round(pairs))),
        out = ["M48 98L52 98L51.2 8L48.8 8Z"];
    for (let i = 0; i < n; i++) {
        const y = 88 - ((i * 76) / Math.max(1, n - 1)) * 0.92,
            len = 40 - (i * 26) / Math.max(1, n - 1),
            rise = len * 0.5;
        for (const side of [-1, 1]) {
            const tx = 50 + side * len,
                ty = y - rise,
                w = 3.2 + len * 0.1;
            out.push(
                `M50 ${y.toFixed(1)}Q${(50 + side * len * 0.45).toFixed(1)} ${(y - rise * 0.2 - w).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}Q${(50 + side * len * 0.55).toFixed(1)} ${(y - rise * 0.35 + w).toFixed(1)} 50 ${(y + 3).toFixed(1)}Z`,
            );
        }
    }
    out.push("M50 2Q54 6 50 12Q46 6 50 2Z");
    return out;
}

interface Motif {
    fill: string[];
    carve: string[];
    width: number;
}
/** The block every name the box does not hold is cut as. */
const LEAF: Motif = {
    fill: [
        "M50 5C75 21 88 46 76 71C68 85 58 91 50 93C42 91 32 85 24 71C12 46 25 21 50 5Z",
        "M46 90L54 90L53 99L47 99Z",
    ],
    carve: [
        "M50 14L50 88",
        "M50 32L37 22",
        "M50 32L63 22",
        "M50 50L30 39",
        "M50 50L70 39",
        "M50 68L32 58",
        "M50 68L68 58",
    ],
    width: 4.5,
};
/**
 * The shapes a print block is cut in, in a box a hundred units across: what is filled, and the lines
 * carved into it, which print as paper. The easel cuts its stamps and its stencils from these same
 * paths; the plain shapes at the end have nothing carved, since they are for stencils and collage.
 */
export const MOTIFS: Record<string, Motif> = {
    leaf: LEAF,
    star: {
        fill: ["M50 4L62 37L97 38L69 59L79 94L50 73L21 94L31 59L3 38L38 37Z"],
        carve: ["M50 20L50 58", "M24 44L50 58", "M76 44L50 58", "M34 78L50 58", "M66 78L50 58"],
        width: 4,
    },
    fish: {
        fill: ["M8 50C20 26 56 22 74 42L95 26L90 50L95 74L74 58C56 78 20 74 8 50Z"],
        carve: [
            "M31 34C38 43 38 57 31 66",
            "M48 38C52 44 52 56 48 62",
            "M60 42C63 46 63 54 60 58",
            "M22 44A3 3 0 1 0 22.1 44",
        ],
        width: 4.5,
    },
    flower: {
        fill: [
            "M50 3A15 15 0 1 1 49.9 3Z",
            "M88 25A15 15 0 1 1 87.9 25Z",
            "M88 71A15 15 0 1 1 87.9 71Z",
            "M50 94A15 15 0 1 1 49.9 94Z",
            "M12 71A15 15 0 1 1 11.9 71Z",
            "M12 25A15 15 0 1 1 11.9 25Z",
            "M50 30A20 20 0 1 1 49.9 30Z",
        ],
        carve: [
            "M50 38A12 12 0 1 1 49.9 38Z",
            "M50 12L50 28",
            "M80 30L66 40",
            "M80 70L66 60",
            "M50 88L50 72",
            "M20 70L34 60",
            "M20 30L34 40",
        ],
        width: 4,
    },
    shell: {
        fill: ["M50 94L10 44C12 18 34 6 50 6C66 6 88 18 90 44Z", "M38 94L62 94L58 99L42 99Z"],
        carve: ["M50 90L50 12", "M50 90L32 16", "M50 90L68 16", "M50 90L18 32", "M50 90L82 32"],
        width: 4,
    },
    bird: {
        fill: [
            "M18 58C18 38 34 28 52 32C58 20 70 16 80 22L94 26L82 32C84 52 72 70 50 72L30 72L6 84L16 66C17 63 18 61 18 58Z",
        ],
        carve: ["M34 46C44 58 60 58 68 46", "M80 26A3 3 0 1 0 80.1 26"],
        width: 4.5,
    },
    butterfly: {
        fill: [
            "M50 24C38 6 10 2 6 22C3 38 20 50 48 50Z",
            "M50 24C62 6 90 2 94 22C97 38 80 50 52 50Z",
            "M48 50C28 50 12 60 16 78C20 94 40 88 48 70Z",
            "M52 50C72 50 88 60 84 78C80 94 60 88 52 70Z",
            "M46 22L54 22L54 86L46 86Z",
        ],
        carve: [
            "M22 22C28 30 36 36 44 42",
            "M78 22C72 30 64 36 56 42",
            "M26 74C32 68 38 62 44 58",
            "M74 74C68 68 62 62 56 58",
        ],
        width: 4,
    },
    fern: { fill: fernPaths(6), carve: [], width: 3 },
    circle: { fill: ["M50 6A44 44 0 1 1 49.9 6Z"], carve: [], width: 3 },
    square: { fill: ["M10 10L90 10L90 90L10 90Z"], carve: [], width: 3 },
    triangle: { fill: ["M50 8L94 88L6 88Z"], carve: [], width: 3 },
    moon: {
        fill: ["M62 6C30 10 12 32 12 54C12 78 32 96 58 94C40 84 32 68 32 50C32 30 44 14 62 6Z"],
        carve: [],
        width: 3,
    },
    cloud: {
        fill: [
            "M22 76C8 76 4 60 16 54C12 40 28 32 38 40C42 24 64 22 70 38C84 34 96 48 88 60C98 66 92 80 80 78Z",
        ],
        carve: [],
        width: 3,
    },
    drop: {
        fill: ["M50 6C62 26 80 44 80 64C80 82 66 94 50 94C34 94 20 82 20 64C20 44 38 26 50 6Z"],
        carve: [],
        width: 3,
    },
};
export const STAMPS = ["leaf", "star", "fish", "flower", "shell", "bird"] as const;
/** The stencils the easel offers first: plant shapes for sun prints, and shapes to cut a collage from. */
export const STENCILS = [
    "leaf",
    "fern",
    "star",
    "circle",
    "triangle",
    "square",
    "cloud",
    "fish",
] as const;
/** Shapes with straight edges or a true curve, which a ruler or compass could make; the rest are organic. */
export const GEOMETRIC = ["circle", "square", "triangle", "star"] as const;

export const MOTIF_NAMES = Object.keys(MOTIFS);

/** A motif drawn with the pen, `size` across, centred on (cx, cy), faced the other way when flipped. */
export function motif<G>(
    c: Ctx<G>,
    name: string,
    cx: number,
    cy: number,
    size: number,
    o: { fill: Fill; flip?: boolean; outline?: boolean; carve?: string; level?: Level },
): void {
    const m = MOTIFS[name] ?? LEAF,
        k = size / 100;
    const t = group(c, {
        turn: [
            ["translate", cx - (o.flip ? -size / 2 : size / 2), cy - size / 2],
            ["scale", o.flip ? -k : k, k],
        ],
    });
    const lw = 1.8 / k;
    for (const d of m.fill)
        c.pen.path(t.g, d, o.level ?? "pencil", o.fill, {
            strokeWidth: o.outline === false ? 0 : lw,
            hachureGap: 4.5 / k,
            fillWeight: 1.2 / k,
        });
    if (o.carve)
        for (const d of m.carve)
            plain(t, {
                kind: "path",
                d,
                fill: "none",
                stroke: o.carve,
                width: m.width,
                cap: "round",
                join: "round",
            });
}

export const TOOL_KINDS = [
    "pencil",
    "crayon",
    "marker",
    "brush",
    "blender",
    "bucket",
    "stamp",
    "stencil",
    "dropper",
    "eraser",
] as const;

/**
 * The recipe of a step on a ladder: step 0 is the colour, and each step doubles the white or the
 * black against eight parts of it (sixteen for black, which is stronger), because one part of white
 * already lightens a colour a long way and the eye wants the steps to look even.
 */
export const ladderParts = (toward: string, step: number): { colour: number; add: number } => ({
    colour: toward === "black" ? 16 : 8,
    add: step > 0 ? 2 ** (step - 1) : 0,
});
export const ladderRecipe = (colour: string, toward: string, step: number): string => {
    const { colour: base, add } = ladderParts(toward, step);
    return add ? `${colour} ${base}+${toward} ${add}` : colour;
};

export const SHEET_GUIDES = ["none", "mirror", "four", "layers", "row"] as const;
export const SHEET_OUTLINES = ["none", "butterfly", "leaf", "fish", "flower", "shell"] as const;

/** Where a paint sheet's paper sits inside its frame, in squares, for the easel to lay its canvas on. */
export const sheetPaper = (p: {
    w: number;
    h: number;
}): { x: number; y: number; w: number; h: number } => ({
    x: 1,
    y: 1,
    w: Math.max(4, Math.round(p.w)),
    h: Math.max(3, Math.round(p.h)),
});

/** The sheet's printed lines, drawn by the easel too so a fill stops at them on screen. */
export function sheetLines<G>(
    c: Ctx<G>,
    p: { w: number; h: number; guide: string; outline: string },
    x: number,
    y: number,
    s = U,
): void {
    const { pen, g } = c,
        w = Math.max(4, Math.round(p.w)) * s,
        h = Math.max(3, Math.round(p.h)) * s;
    const dash = { strokeWidth: 2, strokeLineDash: [9, 6], stroke: c.t.pen };
    if (p.outline !== "none" && MOTIFS[p.outline]) {
        const size = Math.min(w, h) * 0.8;
        const half = p.guide === "mirror" || p.guide === "four";
        const target = half ? clip(c, { kind: "rect", x, y, w: w / 2, h }) : c;
        motif(target, p.outline, x + w / 2, y + h / 2, size, { fill: null, level: "pencil" });
    }
    if (p.guide === "mirror" || p.guide === "four")
        pen.line(g, x + w / 2, y - 6, x + w / 2, y + h + 6, "ruler", dash);
    if (p.guide === "four") pen.line(g, x - 6, y + h / 2, x + w + 6, y + h / 2, "ruler", dash);
    if (p.guide === "layers") {
        const soft = { strokeWidth: 1.4, stroke: c.t["ink-soft"], strokeLineDash: [4, 6] };
        pen.curve(
            g,
            [
                [x, y + h * 0.42],
                [x + w * 0.3, y + h * 0.34],
                [x + w * 0.62, y + h * 0.44],
                [x + w, y + h * 0.36],
            ],
            "pencil",
            soft,
        );
        pen.curve(
            g,
            [
                [x, y + h * 0.7],
                [x + w * 0.4, y + h * 0.62],
                [x + w * 0.75, y + h * 0.72],
                [x + w, y + h * 0.66],
            ],
            "pencil",
            soft,
        );
    }
    if (p.guide === "row") {
        const cells = Math.max(3, Math.floor(w / (3 * s)));
        for (let i = 0; i <= cells; i++)
            pen.line(
                g,
                x + (i * w) / cells,
                y + h * 0.3,
                x + (i * w) / cells,
                y + h * 0.7,
                "ruler",
                { strokeWidth: 1.2, stroke: c.t["ink-soft"], strokeLineDash: [3, 5] },
            );
        pen.line(g, x, y + h * 0.3, x + w, y + h * 0.3, "ruler", {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
            strokeLineDash: [3, 5],
        });
        pen.line(g, x, y + h * 0.7, x + w, y + h * 0.7, "ruler", {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
            strokeLineDash: [3, 5],
        });
    }
}

export const CELL_PAINTS: Pigment[] = ["red", "yellow", "blue", "green"];

/** A half pattern of cells, rows by cols, each a paint or empty, from a seed. */
export function halfPattern(seed: number, rows: number, cols: number): number[][] {
    const rand = rng(seed * 7919 + 13);
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () =>
            rand() < 0.28 ? -1 : Math.floor(rand() * CELL_PAINTS.length),
        ),
    );
}
const mirrorOf = (half: number[][]): number[][] => half.map((r) => [...r].reverse());
const same = (a: number[][], b: number[][]): boolean =>
    a.every((r, i) => r.every((v, j) => v === b[i]?.[j]));

/**
 * The three halves a child picks from, with the true mirror at `answer`: the mirror, the half copied
 * across without turning (the mistake nearly everyone makes first), and the mirror with one cell
 * changed. The mirror checker recomputes these, so the drawing and the proof cannot disagree.
 */
export function mirrorOptions(
    seed: number,
    rows: number,
    cols: number,
    answer: number,
): { half: number[][]; options: number[][][]; right: number } {
    const half = halfPattern(seed, rows, cols),
        m = mirrorOf(half);
    const changed = m.map((r) => [...r]),
        rr = Math.floor(rows / 2),
        cc = Math.floor(cols / 2);
    const row = changed[rr] ?? [];
    row[cc] = ((row[cc] ?? 0) + 2) % CELL_PAINTS.length;
    const wrong = [half, changed];
    const right = ((Math.round(answer) % 3) + 3) % 3;
    const options: number[][][] = [];
    for (let i = 0, w = 0; i < 3; i++) options.push(i === right ? m : (wrong[w++] ?? half));
    return { half, options, right };
}
/** Which options are the mirror of the half, so a checker can require exactly one. */
export const mirrorsAmong = (half: number[][], options: number[][][]): number[] =>
    options.map((o, i) => (same(o, mirrorOf(half)) ? i : -1)).filter((i) => i >= 0);

export const LAYER_NAMES = ["far", "middle", "near"] as const;

interface Figure {
    pts: Pt[];
    lines: [number, number][];
}
/** The figure drawn for a name that is not one of these. */
export const SQUARE: Figure = {
    pts: [
        [0, 1],
        [4, 1],
        [4, 5],
        [0, 5],
    ],
    lines: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
    ],
};
/**
 * Figures to draw without lifting the pencil or going over a line twice, as their corners (in a box
 * 4 wide and 5 tall) and the lines between them. Whether one can be drawn so is Euler's rule: the
 * lines all join up, and at most two corners have an odd number of lines meeting there.
 */
export const ONE_LINE: Record<string, Figure> = {
    square: SQUARE,
    house: {
        pts: [
            [0, 2],
            [4, 2],
            [4, 5],
            [0, 5],
            [2, 0],
        ],
        lines: [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0],
            [0, 4],
            [4, 1],
        ],
    },
    nikolaus: {
        pts: [
            [0, 2],
            [4, 2],
            [4, 5],
            [0, 5],
            [2, 0],
        ],
        lines: [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0],
            [0, 4],
            [4, 1],
            [0, 2],
            [1, 3],
        ],
    },
    envelope: {
        pts: [
            [0, 1],
            [4, 1],
            [4, 5],
            [0, 5],
        ],
        lines: [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0],
            [0, 2],
            [1, 3],
        ],
    },
    domino: {
        pts: [
            [0, 2],
            [2, 2],
            [4, 2],
            [4, 4],
            [2, 4],
            [0, 4],
        ],
        lines: [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
            [4, 5],
            [5, 0],
            [1, 4],
        ],
    },
    window: {
        pts: [
            [0, 1],
            [2, 1],
            [4, 1],
            [4, 3],
            [4, 5],
            [2, 5],
            [0, 5],
            [0, 3],
            [2, 3],
        ],
        lines: [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
            [4, 5],
            [5, 6],
            [6, 7],
            [7, 0],
            [1, 8],
            [8, 5],
            [7, 8],
            [8, 3],
        ],
    },
    cross: {
        pts: [
            [2, 1],
            [4, 3],
            [2, 5],
            [0, 3],
            [2, 3],
        ],
        lines: [
            [0, 4],
            [1, 4],
            [2, 4],
            [3, 4],
        ],
    },
    bowtie: {
        pts: [
            [0, 1],
            [0, 5],
            [2, 3],
            [4, 1],
            [4, 5],
        ],
        lines: [
            [0, 1],
            [1, 2],
            [2, 0],
            [3, 4],
            [4, 2],
            [2, 3],
        ],
    },
    star: {
        pts: [0, 1, 2, 3, 4].map(
            (i) =>
                [
                    2 + 2.1 * Math.sin((i * 2 * Math.PI) / 5),
                    3.1 - 2.1 * Math.cos((i * 2 * Math.PI) / 5),
                ] as Pt,
        ),
        lines: [
            [0, 2],
            [2, 4],
            [4, 1],
            [1, 3],
            [3, 0],
        ],
    },
};
export const ONE_LINE_FIGURES = Object.keys(ONE_LINE);

/** Whether a figure can be drawn in one line, by Euler's rule; null for a figure we do not have. */
export function inOneLine(figure: string): boolean | null {
    const f = ONE_LINE[figure];
    if (!f) return null;
    const degree = f.pts.map((_, i) => f.lines.filter((l) => l.includes(i)).length);
    const seen = new Set([0]),
        todo = [0];
    while (todo.length) {
        const i = todo.pop() ?? 0;
        for (const [a, b] of f.lines)
            for (const [x, y] of [
                [a, b],
                [b, a],
            ] as const)
                if (x === i && !seen.has(y)) {
                    seen.add(y);
                    todo.push(y);
                }
    }
    return seen.size === f.pts.length && degree.filter((d) => d % 2).length <= 2;
}

interface Piece {
    shape: string;
    x: number;
    y: number;
    size: number;
    turn: number;
    colour: string;
}
/** The picture laid for a scene that is not one of these. */
export const BOAT: Piece[] = [
    { shape: "triangle", x: 6.2, y: 3.6, size: 4.2, turn: 0, colour: "red" },
    { shape: "triangle", x: 9.4, y: 4.2, size: 3, turn: 0, colour: "yellow" },
    { shape: "square", x: 7.6, y: 7.3, size: 2.4, turn: 0, colour: "brown" },
    { shape: "circle", x: 12.6, y: 2.2, size: 2.2, turn: 0, colour: "orange" },
    { shape: "cloud", x: 3, y: 2, size: 3, turn: 0, colour: "sky" },
];
/** A picture made of shapes cut from painted paper: a boat, a fish or a house, and what it is made of. */
export const COLLAGES: Record<string, Piece[]> = {
    boat: BOAT,
    fish: [
        { shape: "circle", x: 7, y: 4.6, size: 5.4, turn: 0, colour: "orange" },
        { shape: "triangle", x: 11.4, y: 4.6, size: 3.4, turn: -90, colour: "red" },
        { shape: "circle", x: 5.4, y: 3.8, size: 1.2, turn: 0, colour: "white" },
        { shape: "drop", x: 3, y: 2.2, size: 1.6, turn: 0, colour: "sky" },
        { shape: "drop", x: 2.2, y: 5.8, size: 1.2, turn: 0, colour: "sky" },
    ],
    house: [
        { shape: "square", x: 7, y: 6, size: 4.6, turn: 0, colour: "pink" },
        { shape: "triangle", x: 7, y: 2.6, size: 4.8, turn: 0, colour: "red" },
        { shape: "square", x: 7, y: 6.9, size: 1.4, turn: 0, colour: "brown" },
        { shape: "circle", x: 12.4, y: 2.4, size: 2.2, turn: 0, colour: "yellow" },
        { shape: "leaf", x: 11.8, y: 6.6, size: 3.2, turn: 0, colour: "green" },
    ],
};

const kindOf = (shape: string): "geometric" | "organic" =>
    (GEOMETRIC as readonly string[]).includes(shape) ? "geometric" : "organic";
/** How many pieces of a cut-paper picture are of a shape, of a kind (geometric or organic), or `all` of them. */
export const piecesIn = (scene: string, what: string): number =>
    (COLLAGES[scene] ?? []).filter(
        (x) => what === "all" || x.shape === what || kindOf(x.shape) === what,
    ).length;
