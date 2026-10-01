import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { loop } from "../marks";

const INSTRUMENTS = [
    "violin",
    "cello",
    "double bass",
    "harp",
    "flute",
    "oboe",
    "clarinet",
    "bassoon",
    "trumpet",
    "horn",
    "trombone",
    "tuba",
    "timpani",
    "xylophone",
    "triangle",
    "celesta",
] as const;
type Instrument = (typeof INSTRUMENTS)[number];

/** The family each instrument sits in, as the orchestra seats them; the celesta is a keyboard. */
const FAMILY: Record<Instrument, string> = {
    violin: "strings",
    cello: "strings",
    "double bass": "strings",
    harp: "strings",
    flute: "woodwind",
    oboe: "woodwind",
    clarinet: "woodwind",
    bassoon: "woodwind",
    trumpet: "brass",
    horn: "brass",
    trombone: "brass",
    tuba: "brass",
    timpani: "percussion",
    xylophone: "percussion",
    triangle: "percussion",
    celesta: "keyboard",
};

/**
 * Each instrument's width and height in squares when drawn by size, the bigger of a family lower in
 * pitch; `sizes` 0 draws every one within the same height so they can be compared by shape alone.
 */
const SIZE: Record<Instrument, [number, number]> = {
    violin: [2, 5],
    cello: [3, 7],
    "double bass": [4, 9],
    harp: [4, 9],
    flute: [6, 2],
    oboe: [1, 5],
    clarinet: [2, 5],
    bassoon: [2, 8],
    trumpet: [5, 2],
    horn: [4, 4],
    trombone: [7, 2],
    tuba: [4, 6],
    timpani: [4, 4],
    xylophone: [6, 3],
    triangle: [3, 3],
    celesta: [4, 5],
};
const SAME = 5;

const isInstrument = (s: string): s is Instrument => (INSTRUMENTS as readonly string[]).includes(s);
const listOf = (show: readonly string[]): Instrument[] => show.filter(isInstrument).slice(0, 6);

/** The box an instrument is drawn in: by its size, or shrunk to fit `SAME` squares high. */
function boxOf(name: Instrument, sizes: boolean): [number, number] {
    const [w, h] = SIZE[name];
    if (sizes || h <= SAME) return [w, h];
    const k = SAME / h;
    return [Math.max(1, Math.round(w * k * 2) / 2), SAME];
}

type Draw = <G>(c: Ctx<G>, x: number, y: number, w: number, h: number) => void;

/** A bowed string instrument: two bouts, a waist, a neck and scroll, the strings, and a spike for the big ones. */
const bowed =
    (spike: boolean): Draw =>
    (c, x, y, w, h) => {
        const { pen, g } = c,
            cx = x + w / 2,
            body = h * 0.6,
            top = y + h - body - (spike ? h * 0.06 : 0),
            low = top + body * 0.62,
            up = top + body * 0.22;
        pen.ellipse(g, cx, low, w * 0.92, body * 0.55, "pencil", pen.fill("tang"), {
            strokeWidth: 1.5,
        });
        pen.ellipse(g, cx, up, w * 0.72, body * 0.45, "pencil", pen.fill("tang"), {
            strokeWidth: 1.5,
        });
        pen.rect(g, cx - w * 0.07, y + h * 0.08, w * 0.14, top - y, "pencil", pen.fill("ink"), {
            strokeWidth: 1,
        });
        pen.circle(g, cx, y + h * 0.06, Math.max(5, w * 0.16), "pencil", pen.fill("tang"), {
            strokeWidth: 1.2,
        });
        for (const dx of [-0.05, 0.05])
            pen.line(g, cx + w * dx, y + h * 0.12, cx + w * dx, top + body * 0.85, "ruler", {
                strokeWidth: 0.7,
            });
        pen.line(g, cx - w * 0.18, top + body * 0.6, cx + w * 0.18, top + body * 0.6, "ruler", {
            strokeWidth: 1.6,
        });
        if (spike) pen.line(g, cx, top + body * 0.9, cx, y + h, "pencil", { strokeWidth: 1.6 });
    };

const DRAW: Record<Instrument, Draw> = {
    violin: bowed(false),
    cello: bowed(true),
    "double bass": bowed(true),
    harp: (c, x, y, w, h) => {
        const { pen, g } = c;
        pen.rect(g, x + w * 0.05, y + h * 0.08, w * 0.12, h * 0.9, "pencil", pen.fill("tang"), {
            strokeWidth: 1.4,
        });
        pen.path(
            g,
            `M${x + w * 0.1} ${y + h * 0.1}Q${x + w * 0.55} ${y - h * 0.04} ${x + w * 0.95} ${y + h * 0.16}`,
            "pencil",
            null,
            { strokeWidth: 3 },
        );
        pen.line(g, x + w * 0.95, y + h * 0.16, x + w * 0.2, y + h * 0.97, "pencil", {
            strokeWidth: 3,
            stroke: c.t.tang,
        });
        for (let i = 1; i <= 6; i++) {
            const t = i / 7,
                sx = x + w * (0.17 + 0.75 * t),
                topY = y + h * (0.1 + 0.05 * Math.sin(Math.PI * t) - 0.02),
                botY = y + h * 0.16 + (y + h * 0.97 - (y + h * 0.16)) * (1 - t) * 1;
            pen.line(g, sx, topY, sx, Math.max(topY + 4, botY), "ruler", { strokeWidth: 0.7 });
        }
    },
    flute: (c, x, y, w, h) => {
        const { pen, g } = c,
            cy = y + h / 2;
        pen.rect(g, x, cy - h * 0.14, w, h * 0.28, "ruler", pen.fill("card"), { strokeWidth: 1.4 });
        pen.circle(g, x + w * 0.12, cy, 4, "ruler", pen.fill("ink"), { strokeWidth: 0.8 });
        for (let i = 0; i < 6; i++)
            pen.circle(g, x + w * (0.38 + i * 0.09), cy, 5, "ruler", pen.fill("glow"), {
                strokeWidth: 0.8,
            });
    },
    oboe: (c, x, y, w, h) => {
        const { pen, g } = c,
            cx = x + w / 2;
        pen.polygon(
            g,
            [
                [cx - w * 0.16, y + h * 0.12],
                [cx + w * 0.16, y + h * 0.12],
                [cx + w * 0.26, y + h * 0.94],
                [cx - w * 0.26, y + h * 0.94],
            ],
            "pencil",
            pen.fill("ink", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.3 },
        );
        pen.line(g, cx, y, cx, y + h * 0.12, "pencil", { strokeWidth: 1.6, stroke: c.t.tang });
        for (let i = 0; i < 4; i++)
            pen.circle(g, cx, y + h * (0.3 + i * 0.15), 4, "ruler", pen.fill("card"), {
                strokeWidth: 0.7,
            });
    },
    clarinet: (c, x, y, w, h) => {
        const { pen, g } = c,
            cx = x + w / 2;
        pen.rect(
            g,
            cx - w * 0.1,
            y + h * 0.04,
            w * 0.2,
            h * 0.8,
            "pencil",
            pen.fill("ink", "hachure", { hachureGap: 4 }),
            {
                strokeWidth: 1.3,
            },
        );
        pen.polygon(
            g,
            [
                [cx - w * 0.1, y + h * 0.84],
                [cx + w * 0.1, y + h * 0.84],
                [cx + w * 0.3, y + h],
                [cx - w * 0.3, y + h],
            ],
            "pencil",
            pen.fill("ink", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.3 },
        );
        for (let i = 0; i < 4; i++)
            pen.circle(g, cx, y + h * (0.25 + i * 0.14), 4, "ruler", pen.fill("card"), {
                strokeWidth: 0.7,
            });
    },
    bassoon: (c, x, y, w, h) => {
        const { pen, g } = c,
            cx = x + w * 0.6;
        pen.rect(g, cx - w * 0.16, y + h * 0.02, w * 0.32, h * 0.96, "pencil", pen.fill("tang"), {
            strokeWidth: 1.4,
        });
        pen.path(
            g,
            `M${cx - w * 0.16} ${y + h * 0.35}Q${x} ${y + h * 0.33} ${x + w * 0.1} ${y + h * 0.5}`,
            "pencil",
            null,
            { strokeWidth: 1.6 },
        );
        for (let i = 0; i < 3; i++)
            pen.circle(g, cx, y + h * (0.5 + i * 0.12), 4, "ruler", pen.fill("card"), {
                strokeWidth: 0.7,
            });
    },
    trumpet: (c, x, y, w, h) => {
        const { pen, g } = c,
            cy = y + h * 0.65;
        pen.line(g, x, cy, x + w * 0.65, cy, "pencil", { strokeWidth: 3, stroke: c.t.glow });
        pen.line(g, x, cy, x + w * 0.65, cy, "pencil", { strokeWidth: 1 });
        pen.polygon(
            g,
            [
                [x + w * 0.62, cy - 2],
                [x + w, cy - h * 0.32],
                [x + w, cy + h * 0.32],
                [x + w * 0.62, cy + 2],
            ],
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.3 },
        );
        for (let i = 0; i < 3; i++)
            pen.rect(g, x + w * (0.25 + i * 0.1), y, w * 0.06, h * 0.6, "ruler", pen.fill("glow"), {
                strokeWidth: 1,
            });
    },
    horn: (c, x, y, w, h) => {
        const { pen, g } = c,
            cx = x + w * 0.42,
            cy = y + h * 0.5,
            d = Math.min(w, h) * 0.8;
        pen.circle(g, cx, cy, d, "pencil", null, { strokeWidth: 3, stroke: c.t.glow });
        pen.circle(g, cx, cy, d, "pencil", null, { strokeWidth: 1 });
        pen.circle(g, cx, cy, d * 0.55, "pencil", null, { strokeWidth: 1.2 });
        pen.polygon(
            g,
            [
                [cx + d * 0.3, cy + d * 0.3],
                [x + w, y + h * 0.7],
                [x + w * 0.8, y + h],
                [cx + d * 0.2, cy + d * 0.4],
            ],
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.3 },
        );
    },
    trombone: (c, x, y, w, h) => {
        const { pen, g } = c,
            a = y + h * 0.25,
            b = y + h * 0.75;
        pen.linear(
            g,
            [
                [x + w * 0.3, a],
                [x + w * 0.95, a],
                [x + w * 0.95, b],
                [x + w * 0.35, b],
            ],
            "pencil",
            { strokeWidth: 2.6, stroke: c.t.glow },
        );
        pen.linear(
            g,
            [
                [x + w * 0.3, a],
                [x + w * 0.95, a],
                [x + w * 0.95, b],
                [x + w * 0.35, b],
            ],
            "pencil",
            { strokeWidth: 0.9 },
        );
        pen.polygon(
            g,
            [
                [x + w * 0.32, a - 2],
                [x, y],
                [x, y + h * 0.5],
                [x + w * 0.32, a + 2],
            ],
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.3 },
        );
    },
    tuba: (c, x, y, w, h) => {
        const { pen, g } = c,
            cx = x + w / 2;
        pen.ellipse(g, cx, y + h * 0.62, w * 0.8, h * 0.62, "pencil", pen.fill("glow"), {
            strokeWidth: 1.5,
        });
        pen.ellipse(g, cx, y + h * 0.62, w * 0.42, h * 0.36, "pencil", pen.fill("card"), {
            strokeWidth: 1.2,
        });
        pen.polygon(
            g,
            [
                [cx + w * 0.05, y + h * 0.35],
                [x + w * 0.05 + w * 0.5, y],
                [x + w, y],
                [cx + w * 0.25, y + h * 0.4],
            ],
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.3 },
        );
    },
    timpani: (c, x, y, w, h) => {
        const { pen, g } = c,
            cx = x + w / 2,
            rim = y + h * 0.25;
        pen.path(
            g,
            `M${x} ${rim}Q${x + w * 0.05} ${y + h * 0.85} ${cx} ${y + h * 0.82}Q${x + w * 0.95} ${y + h * 0.85} ${x + w} ${rim}Z`,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.5 },
        );
        pen.ellipse(g, cx, rim, w, h * 0.22, "pencil", pen.fill("card"), { strokeWidth: 1.4 });
        for (const dx of [-0.3, 0.3])
            pen.line(g, cx + w * dx, y + h * 0.8, cx + w * dx * 1.3, y + h, "pencil", {
                strokeWidth: 1.4,
            });
    },
    xylophone: (c, x, y, w, h) => {
        const { pen, g } = c,
            n = 6;
        for (let i = 0; i < n; i++) {
            const bh = h * (0.9 - i * 0.09),
                bx = x + (w / n) * i;
            pen.rect(g, bx + 1, y + (h - bh) / 2, w / n - 3, bh, "ruler", pen.fill("tang"), {
                strokeWidth: 1.1,
            });
        }
        pen.line(g, x, y + h * 0.3, x + w, y + h * 0.36, "ruler", { strokeWidth: 0.9 });
        pen.line(g, x, y + h * 0.7, x + w, y + h * 0.64, "ruler", { strokeWidth: 0.9 });
    },
    triangle: (c, x, y, w, h) => {
        const { pen, g } = c;
        pen.linear(
            g,
            [
                [x + w * 0.4, y + h * 0.95],
                [x + w * 0.05, y + h * 0.95],
                [x + w * 0.4, y + h * 0.1],
                [x + w * 0.75, y + h * 0.95],
                [x + w * 0.5, y + h * 0.95],
            ],
            "pencil",
            { strokeWidth: 1.8 },
        );
        pen.line(g, x + w * 0.65, y + h * 0.3, x + w, y + h * 0.05, "pencil", { strokeWidth: 1.4 });
    },
    celesta: (c, x, y, w, h) => {
        const { pen, g } = c;
        pen.rect(g, x + w * 0.05, y, w * 0.9, h * 0.62, "pencil", pen.fill("tang"), {
            strokeWidth: 1.4,
        });
        pen.rect(g, x, y + h * 0.62, w, h * 0.12, "ruler", pen.fill("card"), { strokeWidth: 1.2 });
        for (let i = 1; i < 8; i++)
            pen.line(g, x + (w / 8) * i, y + h * 0.62, x + (w / 8) * i, y + h * 0.74, "ruler", {
                strokeWidth: 0.7,
            });
        for (const dx of [0.12, 0.88])
            pen.line(g, x + w * dx, y + h * 0.74, x + w * dx, y + h, "pencil", {
                strokeWidth: 1.6,
            });
    },
};

export const orchestra = defineDrawing({
    id: "orchestra",
    family: "music",
    title: "Instruments of the orchestra",
    group: "Props",
    about: "Instruments of the orchestra standing in a row: the bowed strings and the harp, the flute, oboe, clarinet and bassoon, the trumpet, horn, trombone and tuba, the timpani, xylophone and triangle, and the celesta. With `sizes` each is drawn in proportion to the others, so in each family the biggest is the lowest; without it they are drawn the same height to be told apart by shape. Each can be named and its family written, and one ringed.",
    params: {
        show: ["violin", "cello", "double bass"] as string[],
        sizes: 1,
        labels: 1,
        families: 0,
        ring: -1,
    },
    settings: {
        show: { kind: "words", of: INSTRUMENTS, most: 6 },
        sizes: { kind: "whole", min: 0, max: 1 },
        labels: { kind: "whole", min: 0, max: 1 },
        families: { kind: "whole", min: 0, max: 1 },
        ring: { kind: "whole", min: -1, max: 5 },
    },
    takes: [
        {
            label: "The bowed strings by size",
            params: {
                show: ["violin", "cello", "double bass"],
                sizes: 1,
                labels: 1,
                families: 0,
                ring: -1,
            },
        },
        {
            label: "One of each family",
            params: {
                show: ["flute", "trumpet", "timpani", "harp"],
                sizes: 0,
                labels: 1,
                families: 1,
                ring: -1,
            },
        },
        {
            label: "Woodwind, the bassoon ringed",
            params: {
                show: ["flute", "oboe", "clarinet", "bassoon"],
                sizes: 1,
                labels: 1,
                families: 0,
                ring: 3,
            },
        },
        {
            label: "Brass, unnamed",
            params: {
                show: ["trumpet", "horn", "trombone", "tuba"],
                sizes: 1,
                labels: 0,
                families: 0,
                ring: -1,
            },
        },
    ],
    box: (p) => {
        const list = listOf(p.show),
            boxes = list.map((n) => boxOf(n, p.sizes > 0)),
            w = boxes.reduce((s, [bw]) => s + bw + 1, 1),
            h =
                Math.max(1, ...boxes.map(([, bh]) => bh)) +
                1 +
                (p.labels ? 1 : 0) +
                (p.families ? 1 : 0);
        return { w: Math.max(3, w), h };
    },
    draw: (c, p) => {
        const list = listOf(p.show),
            sizes = p.sizes > 0,
            tall = Math.max(1, ...list.map((n) => boxOf(n, sizes)[1])),
            base = (0.5 + tall) * U,
            a: RawAnchors = {};
        let x = 1;
        list.forEach((name, i) => {
            const [w, h] = boxOf(name, sizes),
                left = x * U,
                top = base - h * U;
            DRAW[name](c, left, top, w * U, h * U);
            if (p.labels) say(c, left + (w * U) / 2, base + 0.8 * U, name, 12);
            if (p.families)
                say(
                    c,
                    left + (w * U) / 2,
                    base + (p.labels ? 1.7 : 0.8) * U,
                    FAMILY[name],
                    11,
                    "middle",
                    c.t["ink-soft"],
                );
            if (i === Math.round(p.ring))
                loop(c, left + (w * U) / 2, top + (h * U) / 2, (w + 0.8) * U, (h + 0.8) * U);
            a[`inst(${i})`] = [left + (w * U) / 2, top, "up"];
            x += w + 1;
        });
        return a;
    },
    describe: (p) => {
        const list = listOf(p.show);
        const an = (n: string): string => (/^[aeiou]/.test(n) ? `an ${n}` : `a ${n}`);
        const named = list.map((n) => (p.families ? `${an(n)}, ${FAMILY[n]}` : an(n)));
        const ringed = Math.round(p.ring) >= 0 && Math.round(p.ring) < list.length;
        return `Orchestra instruments drawn side by side${p.sizes ? " by size" : ""}: ${named.join("; ")}${ringed ? `, the ${list[Math.round(p.ring)] ?? ""} ringed` : ""}.${list.length < 3 ? " Each is drawn whole, so its shape and size can be compared." : ""}`;
    },
});
