import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { type Pt, blade, along, clamp, eye } from "./nature";

const BEASTS = ["ladybird", "butterfly", "bee", "snail", "ant", "spider"];

const LEGS: Record<string, number> = {
    ladybird: 6,
    butterfly: 6,
    bee: 6,
    snail: 0,
    ant: 6,
    spider: 8,
};

const beastsOf = (p: { kinds: string[] }): string[] => {
    const list = p.kinds.filter((k) => BEASTS.includes(k));
    return (list.length ? list : BEASTS.slice(0, 3)).slice(0, 6);
};

/** Legs: at the ruler level and evenly spaced, because on this page legs are a number. */
function legPairs<G>(
    c: Ctx<G>,
    cx: number,
    top: number,
    base: number,
    pairs: number,
    spread: number,
): void {
    const { pen, g } = c,
        step = pairs > 3 ? 9 : 13;
    for (let i = 0; i < pairs; i++) {
        const y = top + i * step,
            lead = (i - (pairs - 1) / 2) * 10;
        for (const s of [-1, 1]) {
            pen.linear(
                g,
                [
                    [cx + s * spread * 0.45, y],
                    [cx + s * spread, y + 8],
                    [cx + s * spread * 0.78 + lead, base],
                ],
                "ruler",
                { strokeWidth: 1.6 },
            );
        }
    }
}

function ladybird<G>(c: Ctx<G>, cx: number, base: number, spots: number): void {
    const { pen, g } = c,
        cy = base - 36,
        rx = 29,
        ry = 25,
        n = clamp(spots, 0, 12);
    legPairs(c, cx, cy - 6, base, 3, 32);
    pen.circle(
        g,
        cx,
        cy - ry - 4,
        22,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
        { strokeWidth: 1.6 },
    );
    for (const s of [-1, 1])
        pen.line(g, cx + s * 5, cy - ry - 12, cx + s * 12, cy - ry - 22, "pencil", {
            strokeWidth: 1.2,
        });
    pen.ellipse(
        g,
        cx,
        cy,
        rx * 2,
        ry * 2,
        "pencil",
        pen.fill("berry", "solid", { hachureGap: 6 }),
        { strokeWidth: 2 },
    );
    pen.line(g, cx, cy - ry + 4, cx, cy + ry - 4, "ruler", { strokeWidth: 1.4 });
    // Half the spots on each wing, the odd one on the join, laid out on a grid so none of them touch.
    const per = Math.floor(n / 2),
        cols = per > 3 ? 2 : 1,
        rows = Math.ceil(per / cols);
    if (n % 2) eye(c, cx, cy - ry * 0.56, 9);
    for (let i = 0; i < per; i++) {
        const row = Math.floor(i / cols),
            col = i % cols;
        const dy = (-0.5 + (row + 0.5) / rows) * 1.5 * ry;
        const dx = (cols === 1 ? 0.5 : 0.3 + col * 0.4) * rx;
        for (const s of [-1, 1]) eye(c, cx + s * dx, cy + dy, 9);
    }
}

function butterfly<G>(c: Ctx<G>, cx: number, base: number): void {
    const { pen, g } = c,
        wing = pen.fill("berry", "solid", { hachureGap: 6 });
    for (const s of [-1, 1]) {
        const fore = -Math.PI / 2 + s * 1.0,
            hind = Math.PI / 2 - s * 1.0;
        pen.polygon(g, blade(cx, base - 52, 42, 34, fore), "pencil", wing, { strokeWidth: 1.8 });
        pen.polygon(g, blade(cx, base - 34, 30, 26, hind), "pencil", wing, { strokeWidth: 1.8 });
        // The markings are the same on both sides, and drawn at the ruler level so they can be paired.
        const [mx, my] = along(cx, base - 52, 25, fore);
        pen.circle(g, mx, my, 13, "ruler", pen.fill("card"), { strokeWidth: 1.4 });
        const [hx, hy] = along(cx, base - 34, 18, hind);
        pen.circle(g, hx, hy, 9, "ruler", pen.fill("card"), { strokeWidth: 1.2 });
    }
    pen.ellipse(
        g,
        cx,
        base - 38,
        13,
        46,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
        { strokeWidth: 1.6 },
    );
    pen.circle(
        g,
        cx,
        base - 64,
        15,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
        { strokeWidth: 1.4 },
    );
    for (const s of [-1, 1]) {
        pen.curve(
            g,
            [
                [cx + s * 3, base - 70],
                [cx + s * 10, base - 78],
                [cx + s * 15, base - 81],
            ],
            "pencil",
            { strokeWidth: 1.2 },
        );
        eye(c, cx + s * 15, base - 81, 5);
    }
}

function bee<G>(c: Ctx<G>, cx: number, base: number): void {
    const { pen, g } = c,
        cy = base - 30,
        rx = 29,
        ry = 20;
    legPairs(c, cx, cy + 2, base, 3, 24);
    for (const a of [-1.2, -0.85]) {
        pen.polygon(g, blade(cx - 2, cy - ry + 6, 26, 15, a), "pencil", pen.fill("card"), {
            strokeWidth: 1.2,
        });
    }
    pen.ellipse(g, cx, cy, rx * 2, ry * 2, "pencil", pen.fill("glow", "solid", { hachureGap: 6 }), {
        strokeWidth: 2,
    });
    for (let i = 0; i < 3; i++) {
        const x = cx - 13 + i * 14,
            h = ry * Math.sqrt(Math.max(0, 1 - Math.pow((x - cx) / rx, 2)));
        pen.line(g, x, cy - h + 3, x, cy + h - 3, "ruler", { strokeWidth: 2.6 });
    }
    pen.polygon(
        g,
        [
            [cx + rx - 3, cy - 4],
            [cx + rx + 10, cy + 1],
            [cx + rx - 3, cy + 5],
        ],
        "pencil",
        pen.fill("ink-soft", "solid"),
        { strokeWidth: 1 },
    );
    pen.circle(
        g,
        cx - rx - 5,
        cy - 3,
        22,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
        { strokeWidth: 1.6 },
    );
    eye(c, cx - rx - 10, cy - 6);
    for (const s of [-1, 1])
        pen.line(g, cx - rx - 8, cy - 12, cx - rx - 13 + s * 4, cy - 26, "pencil", {
            strokeWidth: 1.2,
        });
}

function snail<G>(c: Ctx<G>, cx: number, base: number): void {
    const { pen, g } = c,
        sx = cx + 9,
        sy = base - 32;
    // The foot, with the head lifted at the front, then the shell over it.
    pen.path(
        g,
        `M${cx - 34} ${base}Q${cx - 40} ${base - 16} ${cx - 26} ${base - 22}Q${cx - 6} ${base - 30} ${cx + 16} ${base - 22}` +
            `Q${cx + 38} ${base - 16} ${cx + 34} ${base}Z`,
        "pencil",
        pen.fill("card"),
        { strokeWidth: 1.8 },
    );
    for (const s of [-1, 1]) {
        pen.line(g, cx - 28, base - 24, cx - 36 + s * 4, base - 42, "pencil", { strokeWidth: 1.2 });
        eye(c, cx - 36 + s * 4, base - 43, 5);
    }
    pen.circle(g, sx, sy, 40, "pencil", pen.fill("card"), { strokeWidth: 2 });
    const spiral: Pt[] = [];
    for (let i = 0; i <= 36; i++) {
        const t = (i / 36) * 2.4 * Math.PI * 2,
            r = 3 + (16 / (2.4 * Math.PI * 2)) * t;
        spiral.push([sx + r * Math.cos(t), sy + r * Math.sin(t)]);
    }
    pen.curve(g, spiral, "pencil", { strokeWidth: 1.6, stroke: c.t["ink-soft"] });
}

function ant<G>(c: Ctx<G>, cx: number, base: number): void {
    const { pen, g } = c,
        body = () => pen.fill("ink-soft", "hachure", { hachureGap: 3.5 });
    legPairs(c, cx - 2, base - 40, base, 3, 26);
    pen.ellipse(g, cx + 26, base - 34, 36, 30, "pencil", body(), { strokeWidth: 1.8 });
    pen.ellipse(g, cx - 4, base - 36, 22, 20, "pencil", body(), { strokeWidth: 1.8 });
    pen.circle(g, cx - 28, base - 38, 20, "pencil", body(), { strokeWidth: 1.8 });
    eye(c, cx - 33, base - 41);
    for (const s of [-1, 1]) {
        pen.curve(
            g,
            [
                [cx - 35, base - 44],
                [cx - 42, base - 54],
                [cx - 46 + s * 6, base - 60],
            ],
            "pencil",
            { strokeWidth: 1.2 },
        );
    }
}

function spider<G>(c: Ctx<G>, cx: number, base: number): void {
    const { pen, g } = c;
    // Four pairs of legs, the same legs the insects have, with the feet evenly spaced along the line.
    legPairs(c, cx + 2, base - 44, base, 4, 30);
    pen.ellipse(
        g,
        cx + 3,
        base - 38,
        40,
        32,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
        { strokeWidth: 2 },
    );
    pen.circle(
        g,
        cx - 22,
        base - 44,
        20,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
        { strokeWidth: 1.8 },
    );
    for (const s of [-1, 1]) eye(c, cx - 27, base - 47 + s * 5);
}

export const minibeasts = defineDrawing({
    id: "minibeasts",
    family: "animals",
    title: "Minibeasts",
    group: "Characters",
    about: "Small creatures on one line, with the ladybird's spots and the spider's legs evenly placed so that both can be counted. Writing the number of legs beside each one turns the row into a table of equal groups.",
    params: { kinds: ["ladybird", "butterfly", "bee"], spots: 7, legs: false },
    settings: {
        kinds: { kind: "words", most: 6, of: BEASTS },
        spots: { kind: "whole", min: 0, max: 12 },
        legs: { kind: "flag" },
    },
    takes: [
        {
            label: "Three kinds",
            params: { kinds: ["ladybird", "butterfly", "bee"], spots: 7, legs: false },
        },
        {
            label: "Spots to count",
            params: { kinds: ["ladybird", "ladybird", "ladybird"], spots: 5, legs: false },
        },
        { label: "Legs to count", params: { kinds: ["bee", "butterfly"], spots: 7, legs: true } },
    ],
    box: (p) => ({ w: beastsOf(p).length * 5 + 1, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 5.8 * U,
            a: RawAnchors = {};
        const kinds = beastsOf(p);
        kinds.forEach((kind, i) => {
            const cx = (2.5 + i * 5) * U;
            if (kind === "ladybird") ladybird(c, cx, base, p.spots);
            else if (kind === "butterfly") butterfly(c, cx, base);
            else if (kind === "bee") bee(c, cx, base);
            else if (kind === "snail") snail(c, cx, base);
            else if (kind === "ant") ant(c, cx, base);
            else spider(c, cx, base);
            if (p.legs) num(c, cx + 2.25 * U, base - 6, LEGS[kind] ?? 6, 16);
            a[`beast(${i})`] = [cx, base - 3.6 * U, "up"];
        });
        pen.line(g, 0.4 * U, base, (kinds.length * 5 + 0.6) * U, base, "pencil", {
            strokeWidth: 2.2,
        });
        return a;
    },
    describe: (p) =>
        `Small creatures standing side by side on one line, each with its legs evenly spaced and its markings drawn plain${p.legs ? ", with the number of legs written beside each" : ""}.`,
    motion: { body: { is: "wiggle", deg: 2.5, cycles: 4, period: 3.8 }, weight: "light" },
});
