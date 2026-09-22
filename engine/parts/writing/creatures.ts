import { type Ctx, type RawAnchors } from "../../ink/surface";
import { MARKERS, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { loop } from "../marks";

type Pt = [number, number];

const markerOf = (s: string): Marker =>
    ["sky", "mint", "berry", "tang", "glow"].includes(s) ? (s as Marker) : "sky";

const SLOT = 7;

function creature<G>(
    c: Ctx<G>,
    cx: number,
    ground: number,
    f: { eyes: number; legs: number; horns: number; coat: number; body: number; color: Marker },
): void {
    const { pen, g } = c;
    const [bw, bh] =
        f.body === 1 ? [3.2 * U, 4.4 * U] : f.body === 2 ? [5.6 * U, 2.9 * U] : [4.2 * U, 3.6 * U];
    const cy = ground - 1.3 * U - bh / 2,
        topY = cy - bh / 2;
    const legs = Math.max(0, Math.min(8, Math.round(f.legs)));
    for (let k = 0; k < legs; k++) {
        const lx = cx + (legs === 1 ? 0 : (k / (legs - 1) - 0.5) * bw * 0.72);
        pen.line(g, lx, cy + bh * 0.4, lx, ground - 4, "pencil", { strokeWidth: 2.2 });
        pen.ellipse(g, lx + 4, ground - 3, 13, 7, "pencil", pen.fill("ink-soft", "solid"), {
            strokeWidth: 1,
        });
    }
    const horns = Math.max(0, Math.min(4, Math.round(f.horns)));
    for (let k = 0; k < horns; k++) {
        const hx = cx + (horns === 1 ? 0 : (k / (horns - 1) - 0.5) * bw * 0.55);
        const base = topY + bh * 0.08 + Math.abs(hx - cx) * (bh / bw) * 0.35;
        pen.polygon(
            g,
            [
                [hx - 9, base + 8],
                [hx + 9, base + 8],
                [hx + 3, base - 1.3 * U],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.8 },
        );
    }
    pen.ellipse(g, cx, cy, bw, bh, "pencil", pen.fill(f.color), { strokeWidth: 2.2 });
    if (f.coat === 1) {
        for (const [dx, dy] of [
            [-0.3, 0.2],
            [0.25, 0.28],
            [-0.05, 0.38],
            [0.33, 0.05],
            [-0.36, -0.02],
        ] as Pt[]) {
            pen.circle(
                g,
                cx + dx * bw,
                cy + dy * bh,
                10,
                "pencil",
                { fill: c.t["ink-soft"], fillStyle: "solid" },
                { strokeWidth: 0.8 },
            );
        }
    } else if (f.coat === 2) {
        // Stripes run the height of the body, bowed to its curve, and bold enough to read in print.
        for (const t of [-0.3, -0.1, 0.1, 0.3]) {
            const x = cx + t * bw,
                reach = Math.sqrt(Math.max(0, 1 - (2 * t) ** 2)) * bh * 0.46;
            pen.curve(
                g,
                [
                    [x - t * 10, cy - reach * 0.55],
                    [x, cy],
                    [x - t * 10, cy + reach],
                ],
                "pencil",
                { strokeWidth: 5, stroke: c.t["ink-soft"] },
            );
        }
    }
    const eyes = Math.max(1, Math.min(4, Math.round(f.eyes))),
        ey = cy - bh * 0.18,
        gap = Math.min(0.95 * U, (bw * 0.7) / eyes);
    for (let k = 0; k < eyes; k++) {
        const ex = cx + (k - (eyes - 1) / 2) * gap;
        pen.circle(g, ex, ey, 0.78 * U, "ruler", pen.fill("card"), { strokeWidth: 1.4 });
        pen.circle(
            g,
            ex + 2,
            ey + 2,
            6,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5 },
        );
    }
    pen.arc(g, cx, ey + 0.55 * U, 0.9 * U, 0.5 * U, 0.3, Math.PI - 0.3, "pencil", {
        strokeWidth: 1.6,
    });
}

export const creatures = defineDrawing({
    id: "creatures",
    family: "writing",
    title: "Creatures to tell apart",
    group: "Characters",
    about: "A line-up of made-up creatures, each with a number of eyes, legs and horns, a plain, spotty or stripy coat, a round, tall or long body and a colour. Every feature is one a word can name, so a description can pick out one creature and only one, which is the point of describing something: somebody else can find it.",
    params: {
        eyes: [1, 2, 3, 2],
        legs: [2, 4, 2, 6],
        horns: [0, 2, 1, 0],
        coat: [0, 1, 2, 1],
        body: [0, 1, 2, 0],
        colors: ["sky", "mint", "berry", "tang"],
        labels: ["A", "B", "C", "D"],
        ring: -1,
    },
    settings: {
        eyes: { kind: "numbers", min: 0, max: 3, most: 4 },
        legs: { kind: "numbers", min: 0, max: 8, most: 4 },
        horns: { kind: "numbers", min: 0, max: 2, most: 4 },
        coat: { kind: "numbers", min: 0, max: 2, most: 4 },
        body: { kind: "numbers", min: 0, max: 2, most: 4 },
        colors: { kind: "words", most: 4, of: MARKERS },
        labels: { kind: "words", most: 4 },
        ring: { kind: "whole", min: -1, max: 3 },
    },
    takes: [
        {
            label: "Four, lettered",
            params: {
                eyes: [1, 2, 3, 2],
                legs: [2, 4, 2, 6],
                horns: [0, 2, 1, 0],
                coat: [0, 1, 2, 1],
                body: [0, 1, 2, 0],
                colors: ["sky", "mint", "berry", "tang"],
                labels: ["A", "B", "C", "D"],
                ring: -1,
            },
        },
        {
            label: "Three alike but one, ringed",
            params: {
                eyes: [2, 2, 2],
                legs: [4, 4, 4],
                horns: [1, 1, 2],
                coat: [1, 1, 1],
                body: [0, 0, 0],
                colors: ["mint", "mint", "mint"],
                labels: ["A", "B", "C"],
                ring: 2,
            },
        },
    ],
    box: (p) => ({ w: p.eyes.length * SLOT + 1, h: p.labels.some((s) => s) ? 12 : 10 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            ground = 9 * U;
        c.pen.line(c.g, 0.3 * U, ground, (p.eyes.length * SLOT + 0.7) * U, ground, "pencil", {
            strokeWidth: 1.4,
            stroke: c.t["ink-soft"],
        });
        p.eyes.forEach((eyes, i) => {
            const cx = (0.5 + i * SLOT + SLOT / 2) * U;
            creature(c, cx, ground, {
                eyes,
                legs: p.legs[i] ?? 2,
                horns: p.horns[i] ?? 0,
                coat: p.coat[i] ?? 0,
                body: p.body[i] ?? 0,
                color: markerOf(p.colors[i] ?? "sky"),
            });
            const label = p.labels[i] ?? "";
            if (label) {
                c.pen.circle(c.g, cx, 10.6 * U, 1.3 * U, "ruler", c.pen.fill("card"), {
                    strokeWidth: 1.4,
                });
                say(c, cx, 10.6 * U + 6, label, 17);
            }
            if (i === p.ring) loop(c, cx, 5.2 * U, SLOT * U - 14, 7.6 * U);
            a[`creature(${i})`] = [cx, 0.6 * U, "up"];
        });
        return a;
    },
    describe: () =>
        "A line up of made up creatures side by side, each with its own number of eyes, legs and horns, its own coat and body shape and colour, lettered underneath.",
});
