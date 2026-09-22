import { starPoints } from "../ink/pen";
import { letter, plain, type Ctx } from "../ink/surface";
import type { Marker } from "../paper";

/** The small objects a role in a question maps onto (a weight, a counter, a coin), each drawn at a centre point in user units. */
export function cube<G>(c: Ctx<G>, x: number, y: number, s = 30): void {
    const { pen, g } = c;
    const h = s / 2;
    const d = s * 0.28;
    pen.polygon(
        g,
        [
            [x - h, y - h],
            [x - h + d, y - h - d],
            [x + h + d, y - h - d],
            [x + h, y - h],
        ],
        "pencil",
        pen.fill("card"),
        { strokeWidth: 1.5 },
    );
    pen.polygon(
        g,
        [
            [x + h, y - h],
            [x + h + d, y - h - d],
            [x + h + d, y + h - d],
            [x + h, y + h],
        ],
        "pencil",
        pen.fill("sky", "hachure", { hachureGap: 3.5 }),
        { strokeWidth: 1.5 },
    );
    pen.rect(g, x - h, y - h, s, s, "pencil", pen.fill("sky"));
}

export function ball<G>(c: Ctx<G>, x: number, y: number, d = 21, color: Marker = "berry"): void {
    c.pen.circle(c.g, x, y, d, "pencil", c.pen.fill(color));
    if (!c.paper) {
        c.pen.arc(
            c.g,
            x - d * 0.12,
            y - d * 0.12,
            d * 0.5,
            d * 0.5,
            Math.PI * 1.05,
            Math.PI * 1.45,
            "pencil",
            {
                stroke: c.t.card,
                strokeWidth: 1.6,
            },
        );
    }
}

export function star<G>(c: Ctx<G>, x: number, y: number, r = 13): void {
    c.pen.polygon(c.g, starPoints(x, y, r), "pencil", c.pen.fill("glow"), { strokeWidth: 1.5 });
}

export function apple<G>(c: Ctx<G>, x: number, y: number, s = 26): void {
    const { pen, g } = c;
    const r = s / 2;
    pen.path(
        g,
        `M${x} ${y - r * 0.55} C${x + r * 0.9} ${y - r * 1.15} ${x + r * 1.25} ${y + r * 0.1} ${x + r * 0.55} ${y + r * 0.85}` +
            ` C${x + r * 0.25} ${y + r * 1.1} ${x - r * 0.25} ${y + r * 1.1} ${x - r * 0.55} ${y + r * 0.85}` +
            ` C${x - r * 1.25} ${y + r * 0.1} ${x - r * 0.9} ${y - r * 1.15} ${x} ${y - r * 0.55}Z`,
        "pencil",
        pen.fill("berry"),
    );
    pen.line(g, x, y - r * 0.55, x + r * 0.15, y - r * 1.05, "pencil", { strokeWidth: 1.6 });
    pen.ellipse(g, x + r * 0.45, y - r * 0.95, r * 0.6, r * 0.3, "pencil", pen.fill("mint"), {
        strokeWidth: 1.2,
    });
}

export function counter<G>(c: Ctx<G>, x: number, y: number, d = 24, color: Marker = "berry"): void {
    c.pen.circle(c.g, x, y, d, "pencil", c.pen.fill(color));
}

/** US coins at their real relative diameters, in millimetres. */
export const COINS = {
    penny: { mm: 19.05, cents: 1, fill: "tang" },
    nickel: { mm: 21.21, cents: 5, fill: "grid" },
    dime: { mm: 17.91, cents: 10, fill: "grid" },
    quarter: { mm: 24.26, cents: 25, fill: "grid" },
} as const;
export type Coin = keyof typeof COINS;

const isCoin = (s: string): s is Coin => s in COINS;

export function coin<G>(c: Ctx<G>, x: number, y: number, kind: Coin, scale = 1.55): void {
    const k = COINS[kind];
    const d = k.mm * scale;
    const print = c.paper ? { hachureGap: 8, fillWeight: 0.6 } : {};
    c.pen.circle(c.g, x, y, d, "ruler", c.pen.fill(k.fill, "solid", print), { strokeWidth: 1.6 });
    c.pen.circle(c.g, x, y, d - 6, "ruler", null, { strokeWidth: 0.8, stroke: c.t["ink-soft"] });
    // the value has to stay readable through the hatching
    if (c.paper) plain(c, { kind: "circle", cx: x, cy: y, r: d * 0.29, fill: c.t.card });
    const size = d > 34 ? 13 : 11.5;
    const value = `${k.cents}¢`;
    letter(c, {
        x,
        y: y + 4.5,
        s: value,
        face: "read",
        weight: 700,
        size,
        fill: c.t.ink,
        anchor: "middle",
    });
}

export type ShapeKind = "triangle" | "square" | "circle" | "hexagon" | "pentagon" | "rectangle";

const SHAPE_FILL: Record<ShapeKind, Marker> = {
    circle: "berry",
    square: "sky",
    triangle: "tang",
    hexagon: "mint",
    pentagon: "glow",
    rectangle: "sky",
};

const isShape = (s: string): s is ShapeKind => s in SHAPE_FILL;

/** Any prop a role can name, centred on (x, y) and sized to fit `size` user units. */
export function drawProp<G>(c: Ctx<G>, name: string, x: number, y: number, size = 30): void {
    if (name === "cube") cube(c, x, y, size * 0.9);
    else if (name === "ball") ball(c, x, y, size * 0.8);
    else if (name === "star") star(c, x, y, size * 0.5);
    else if (name === "apple") apple(c, x, y, size * 0.9);
    else if (isShape(name)) shape(c, x, y, name, size * 0.5, SHAPE_FILL[name]);
    else if (isCoin(name)) coin(c, x, y, name, (size * 0.9) / COINS[name].mm);
    else counter(c, x, y, size * 0.85);
}

const PIPS: Record<number, readonly (readonly [number, number])[]> = {
    1: [[0, 0]],
    2: [
        [-1, -1],
        [1, 1],
    ],
    3: [
        [-1, -1],
        [0, 0],
        [1, 1],
    ],
    4: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
    ],
    5: [
        [-1, -1],
        [1, -1],
        [0, 0],
        [-1, 1],
        [1, 1],
    ],
    6: [
        [-1, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [1, 1],
    ],
};

export function dieFace<G>(c: Ctx<G>, x: number, y: number, n: number, s = 36): void {
    const { pen, g } = c;
    const h = s / 2;
    const q = s * 0.27;
    pen.path(
        g,
        `M${x - h + 6} ${y - h}H${x + h - 6}Q${x + h} ${y - h} ${x + h} ${y - h + 6}V${y + h - 6}Q${x + h} ${y + h} ${x + h - 6} ${y + h}H${x - h + 6}Q${x - h} ${y + h} ${x - h} ${y + h - 6}V${y - h + 6}Q${x - h} ${y - h} ${x - h + 6} ${y - h}Z`,
        "ruler",
        pen.fill("card"),
    );
    for (const [a, b] of PIPS[n] ?? []) {
        pen.circle(
            g,
            x + a * q,
            y + b * q,
            6.5,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            {
                strokeWidth: 1,
            },
        );
    }
}

export function shape<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    kind: ShapeKind,
    r = 17,
    color: Marker = "sky",
): void {
    const { pen, g } = c;
    const f = pen.fill(color);
    const reg = (n: number, rot = -Math.PI / 2): [number, number][] =>
        Array.from({ length: n }, (_, i) => [
            x + r * Math.cos(rot + (i * 2 * Math.PI) / n),
            y + r * Math.sin(rot + (i * 2 * Math.PI) / n),
        ]);
    if (kind === "circle") pen.circle(g, x, y, r * 2, "ruler", f);
    else if (kind === "square")
        pen.rect(g, x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7, "ruler", f);
    else if (kind === "rectangle")
        pen.rect(g, x - r * 1.2, y - r * 0.7, r * 2.4, r * 1.4, "ruler", f);
    else {
        const sides = kind === "triangle" ? 3 : kind === "pentagon" ? 5 : 6;
        pen.polygon(g, reg(sides, kind === "hexagon" ? 0 : -Math.PI / 2), "ruler", f);
    }
}

/**
 * Items stacked inside a container in as square a block as will fit, because a block of six is
 * countable at a glance and a ragged line of six is not. Never wider than the container.
 */
export function inside<G>(
    c: Ctx<G>,
    cx: number,
    bottom: number,
    w: number,
    item: string,
    n: number,
    size = 34,
): void {
    const pitch = size * 0.96,
        fits = Math.max(1, Math.floor(w / pitch));
    const per = Math.min(fits, n <= 3 ? Math.max(1, n) : Math.ceil(Math.sqrt(n))),
        rows = Math.ceil(n / per);
    for (let i = 0; i < n; i++) {
        const row = Math.floor(i / per),
            inRow = Math.min(per, n - row * per);
        const x = cx + ((i % per) - (inRow - 1) / 2) * pitch;
        drawProp(c, item, x, bottom - size * 0.5 - (rows - 1 - row) * pitch, size);
    }
}
