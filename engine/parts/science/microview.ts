import { clip, plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { rng, type Fill } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say, soft } from "../lettering";
import { lightFill } from "./apparatus";

/**
 * How wide the round field of view is, in micrometres, at each total magnification of a school
 * microscope with a ×10 eyepiece of field number 18: 18 mm over the objective's power.
 */
export const FIELD_UM = { 40: 4500, 100: 1800, 400: 450, 1000: 180 } as const;
export type Magnification = keyof typeof FIELD_UM;
export const MAGNIFICATIONS: readonly Magnification[] = [40, 100, 400, 1000];

/**
 * What is on the slide, by the `kind` setting: a typical cell's length and width in micrometres, and
 * the magnifications it is drawn at, those where a cell is big enough to see and few enough to draw.
 */
export const SPECIMENS = [
    { name: "onion skin", long: 225, wide: 75, mags: [100, 400] },
    { name: "cheek cells", long: 50, wide: 50, mags: [400] },
    { name: "pondweed leaf", long: 90, wide: 45, mags: [400, 1000] },
    { name: "yeast", long: 6, wide: 5, mags: [1000] },
    { name: "pond water", long: 225, wide: 60, mags: [100, 400] },
] as const satisfies readonly {
    name: string;
    long: number;
    wide: number;
    mags: readonly Magnification[];
}[];
type Specimen = (typeof SPECIMENS)[number];

const specimenOf = (kind: number): Specimen =>
    SPECIMENS[Math.max(0, Math.min(SPECIMENS.length - 1, Math.round(kind)))] ?? SPECIMENS[0];

/** The magnification a specimen is drawn at: the one asked for, or the nearest it is drawn at. */
export function magnificationOf(kind: number, mag: number): Magnification {
    const mags: readonly Magnification[] = specimenOf(kind).mags;
    return mags.reduce((best, m) => (Math.abs(m - mag) < Math.abs(best - mag) ? m : best));
}

/** How many cells lie end to end across the field's middle: its width over a cell's length. */
export const cellsAcross = (kind: number, mag: number): number =>
    FIELD_UM[magnificationOf(kind, mag)] / specimenOf(kind).long;

/** The rule a child uses and the checker marks by: a cell is the field's width over the cells across it. */
export const cellSize = (mag: Magnification, across: number): number => FIELD_UM[mag] / across;

/** The scale bar's length in micrometres: a round length drawn between 50 and 130 units long. */
export const barOf = (mag: Magnification): number =>
    [1000, 500, 200, 100, 50, 20, 10].find((l) => (D * l) / FIELD_UM[mag] <= 130) ?? 10;

const CX = 9 * U,
    CY = 8.5 * U,
    R = 8 * U,
    D = 2 * R;

type Pt = [number, number];

/** A cell's rectangle cut to the field's square, so nothing is drawn past the box; the ring hides the cut. */
function cellRect<G>(c: Ctx<G>, x: number, y: number, s: number, t: number, width: number): void {
    const x0 = Math.max(x, CX - R),
        y0 = Math.max(y, CY - R),
        x1 = Math.min(x + s, CX + R),
        y1 = Math.min(y + t, CY + R);
    if (x1 > x0 && y1 > y0)
        c.pen.rect(c.g, x0, y0, x1 - x0, y1 - y0, "ruler", null, calm(c, width));
}

const inField = (x: number, y: number): boolean => Math.hypot(x - CX, y - CY) < R;

/** The dark stain of a nucleus, which prints as its grey rather than as hatching. */
const stain = <G>(c: Ctx<G>): Fill => ({ fill: c.t["ink-soft"], fillStyle: "solid" });

/** A closed outline through the points, drawn with the calm hand of the kit. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.5 * c.pen.o.roughness,
    bowing: 0.6 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

function onion<G>(c: Ctx<G>, s: number, t: number, random: () => number): void {
    const { pen, g } = c,
        rows = Math.ceil(R / t) + 1;
    for (let j = -rows; j <= rows; j++) {
        const y = CY - t / 2 + j * t,
            offset = j % 2 === 0 ? 0 : s / 2;
        for (let i = -1; i * s + offset < D + s; i++) {
            const x = CX - R + offset + i * s;
            if (Math.hypot(Math.max(Math.abs(x + s / 2 - CX) - s / 2, 0), y + t / 2 - CY) > R + t)
                continue;
            cellRect(c, x, y, s, t, 1.1);
            const nx = x + s * (0.25 + random() * 0.5);
            if (inField(nx, y + t / 2))
                pen.circle(
                    g,
                    nx,
                    y + t / 2,
                    Math.min(t * 0.34, 12),
                    "ruler",
                    stain(c),
                    calm(c, 0.9),
                );
        }
    }
}

function pondweed<G>(c: Ctx<G>, s: number, t: number, dot: number, random: () => number): void {
    const { pen, g } = c,
        rows = Math.ceil(R / t) + 1;
    for (let j = -rows; j <= rows; j++) {
        const y = CY - t / 2 + j * t,
            offset = j % 2 === 0 ? 0 : s / 2;
        for (let i = -1; i * s + offset < D + s; i++) {
            const x = CX - R + offset + i * s;
            if (Math.hypot(Math.max(Math.abs(x + s / 2 - CX) - s / 2, 0), y + t / 2 - CY) > R + t)
                continue;
            cellRect(c, x, y, s, t, 1.2);
            const n = Math.max(4, Math.round((s + t) / (dot * 2.2)));
            for (let k = 0; k < n; k++) {
                const along = (k + 0.5) / n,
                    top = k % 2 === 0,
                    px = x + dot + along * (s - 2 * dot) + (random() - 0.5) * dot,
                    py = top ? y + dot * 0.9 : y + t - dot * 0.9;
                if (inField(px, py))
                    pen.circle(g, px, py, dot, "ruler", pen.fill("mint", "solid"), calm(c, 0.8));
            }
        }
    }
}

/** Points on a grid that is shaken a little, inside the field, kept by a share so cells lie loose. */
function scatter(step: number, keep: number, random: () => number): Pt[] {
    const out: Pt[] = [];
    for (let y = CY - R; y <= CY + R; y += step)
        for (let x = CX - R; x <= CX + R; x += step) {
            const px = x + (random() - 0.5) * step * 0.5,
                py = y + (random() - 0.5) * step * 0.5;
            if (random() < keep && Math.hypot(px - CX, py - CY) < R - step * 0.2)
                out.push([px, py]);
        }
    return out;
}

function cheek<G>(c: Ctx<G>, s: number, random: () => number): void {
    const { pen, g } = c;
    for (const [x, y] of scatter(s * 1.25, 0.55, random)) {
        const pts: Pt[] = Array.from({ length: 7 }, (_, k): Pt => {
            const a = (k / 7) * Math.PI * 2 + random() * 0.4,
                r = (s / 2) * (0.8 + random() * 0.25);
            return [x + Math.cos(a) * r, y + Math.sin(a) * r];
        });
        pen.polygon(g, pts, "ruler", lightFill(c, "sky", "hachure", 4), calm(c, 1.1));
        pen.circle(
            g,
            x + (random() - 0.5) * s * 0.2,
            y,
            s * 0.2,
            "ruler",
            c.paper ? stain(c) : pen.fill("sky", "solid"),
            calm(c, 1),
        );
    }
}

function yeast<G>(c: Ctx<G>, s: number, t: number, random: () => number): void {
    const { pen, g } = c;
    for (const [x, y] of scatter(s * 1.7, 0.5, random)) {
        pen.ellipse(g, x, y, s, t, "ruler", pen.fill("card"), calm(c, 1));
        if (random() < 0.3)
            pen.circle(
                g,
                x + s * 0.62,
                y - t * 0.3,
                t * 0.5,
                "ruler",
                pen.fill("card"),
                calm(c, 0.9),
            );
    }
}

/** A slipper-shaped single cell, `s` long and `t` wide, turned through `a` radians. */
function paramecium<G>(c: Ctx<G>, x: number, y: number, s: number, t: number, a: number): void {
    const { pen, g } = c,
        at = (u: number, v: number): Pt => [
            x + u * Math.cos(a) - v * Math.sin(a),
            y + u * Math.sin(a) + v * Math.cos(a),
        ];
    const outline: Pt[] = Array.from({ length: 24 }, (_, k): Pt => {
        const th = (k / 24) * Math.PI * 2,
            u = (Math.cos(th) * s) / 2,
            v = ((Math.sin(th) * t) / 2) * (0.88 + 0.12 * Math.cos(th));
        return at(u, v);
    });
    pen.polygon(g, outline, "ruler", pen.fill("card"), calm(c, 1.2));
    pen.curve(g, [at(-s * 0.05, t * 0.3), at(s * 0.1, 0), at(s * 0.22, -t * 0.05)], "ruler", {
        ...calm(c, 1),
    });
    pen.circle(g, ...at(-s * 0.1, -t * 0.05), t * 0.3, "ruler", stain(c), {
        ...calm(c, 0.9),
    });
    for (const u of [-0.3, 0.3])
        pen.circle(g, ...at(u * s, t * 0.05), t * 0.18, "ruler", null, calm(c, 0.9));
    if (s > 80)
        for (let k = 0; k < 24; k += 2) {
            const th = (k / 24) * Math.PI * 2,
                u = (Math.cos(th) * s) / 2,
                v = ((Math.sin(th) * t) / 2) * (0.88 + 0.12 * Math.cos(th)),
                n = Math.hypot(u / s, v / t) || 1;
            pen.line(g, ...at(u, v), ...at(u * (1 + 0.1 / n / 2), v * (1 + 0.16 / n)), "ruler", {
                strokeWidth: 0.8,
            });
        }
}

function pond<G>(c: Ctx<G>, s: number, t: number, random: () => number): void {
    const spots: readonly (readonly [number, number, number])[] =
        s > 80
            ? [
                  [-0.3, -0.35, 0.3],
                  [0.1, 0.35, -0.2],
              ]
            : [
                  [-0.5, -0.4, 0.4],
                  [0.2, -0.55, -0.3],
                  [0.45, -0.1, 1.2],
                  [-0.2, 0.05, 2.6],
                  [-0.55, 0.35, -1],
                  [0.25, 0.45, 0.2],
                  [0.05, -0.2, 1.9],
              ];
    for (const [u, v, a] of spots)
        paramecium(c, CX + u * R, CY + v * R, s, t, a + (random() - 0.5) * 0.2);
}

export const microview = defineDrawing({
    id: "microview",
    family: "science",
    title: "Under the microscope",
    group: "Structures",
    about: "What is seen down a school microscope: a round field of view with its specimen (`kind`: 0 onion skin, 1 cheek cells, 2 pondweed leaf, 3 yeast, 4 pond water with its slipper-shaped single cells) at a total magnification `mag` of 40, 100, 400 or 1000, written under it with a scale bar (`scale`) and, with `field` 1, the field's width. The field is 4,500, 1,800, 450 or 180 micrometres across at those magnifications, and the cells are drawn to scale from `SPECIMENS`, so the number of cells end to end across the middle is the field's width over a cell's length (onion 225 by 75, cheek 50, pondweed 90 by 45, yeast 6 by 5, the pond cells 225 by 60). A magnification a specimen is not drawn at becomes the nearest one it is.",
    params: { kind: 0, mag: 400, scale: 1, field: 0 },
    settings: {
        kind: { kind: "whole", min: 0, max: 4 },
        mag: { kind: "one of", of: MAGNIFICATIONS },
        scale: { kind: "whole", min: 0, max: 1 },
        field: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Onion skin at 400", params: { kind: 0, mag: 400, scale: 1, field: 0 } },
        {
            label: "Onion skin at 100, field written",
            params: { kind: 0, mag: 100, scale: 0, field: 1 },
        },
        { label: "Cheek cells at 400", params: { kind: 1, mag: 400, scale: 1, field: 0 } },
        { label: "Pondweed leaf at 400", params: { kind: 2, mag: 400, scale: 1, field: 1 } },
        { label: "Yeast at 1000", params: { kind: 3, mag: 1000, scale: 1, field: 0 } },
        { label: "Pond water at 100", params: { kind: 4, mag: 100, scale: 1, field: 0 } },
        { label: "Pond water at 400", params: { kind: 4, mag: 400, scale: 0, field: 1 } },
    ],
    box: () => ({ w: 18, h: 20 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            specimen = specimenOf(p.kind),
            mag = magnificationOf(p.kind, p.mag),
            perUm = D / FIELD_UM[mag],
            s = specimen.long * perUm,
            t = specimen.wide * perUm,
            random = rng(31 + Math.round(p.kind) * 7 + mag),
            disc = `M${CX - R} ${CY}A${R} ${R} 0 0 1 ${CX + R} ${CY}A${R} ${R} 0 0 1 ${CX - R} ${CY}Z`;
        plain(c, {
            kind: "circle",
            cx: CX,
            cy: CY,
            r: R,
            fill: c.t.card,
            stroke: "none",
            width: 0,
        });
        const inside = clip(c, { kind: "path", d: disc });
        const kind = Math.round(p.kind);
        if (kind === 0) onion(inside, s, t, random);
        else if (kind === 1) cheek(inside, s, random);
        // a chloroplast is about 5 micrometres, drawn no smaller than a dot that reads
        else if (kind === 2) pondweed(inside, s, t, Math.max(5 * perUm, 4.5), random);
        else if (kind === 3) yeast(inside, s, t, random);
        else pond(inside, s, t, random);
        plain(c, {
            kind: "circle",
            cx: CX,
            cy: CY,
            r: R,
            fill: "none",
            stroke: c.t.ink,
            width: 3.2,
        });
        plain(c, {
            kind: "circle",
            cx: CX,
            cy: CY,
            r: R + 0.25 * U,
            fill: "none",
            stroke: c.t.ink,
            width: 1.4,
        });
        say(c, 0.4 * U, 18.1 * U, specimen.name, 14, "start");
        num(c, 17.6 * U, 18.1 * U, `× ${mag}`, 16, "end");
        if (p.scale > 0) {
            const um = barOf(mag),
                len = um * perUm,
                y = 19.3 * U;
            pen.line(g, 0.5 * U, y, 0.5 * U + len, y, "ruler", { strokeWidth: 2.6 });
            for (const x of [0.5 * U, 0.5 * U + len])
                pen.line(g, x, y - 5, x, y + 5, "ruler", { strokeWidth: 1.6 });
            num(c, 0.5 * U + len + 0.4 * U, y + 5, `${um.toLocaleString("en-GB")} µm`, 13, "start");
            a.scale = [0.5 * U + len / 2, y, "down"];
        }
        if (p.field > 0)
            soft(
                c,
                17.6 * U,
                19.6 * U,
                `field ${FIELD_UM[mag].toLocaleString("en-GB")} µm across`,
                12,
                "end",
            );
        a.field = [CX, CY - R, "up"];
        a.centre = [CX, CY];
        a.label = [0.4 * U, 18.1 * U, "left"];
        return a;
    },
    describe: (p) => {
        const seen = [
            "onion skin cells laid like long bricks, each with a dark dot of a nucleus",
            "loose flat cheek cells, each with a dark round nucleus",
            "pondweed leaf cells like boxes, with green dots along their walls",
            "small oval yeast cells, some with a bud",
            "slipper-shaped single cells from pond water",
        ][Math.max(0, Math.min(4, Math.round(p.kind)))];
        return `A round microscope view of ${seen}, with the magnification written under it${p.scale > 0 ? " beside a scale bar" : ""}.`;
    },
    reads: true,
    motion: { still: "The cells are counted across the field, so they hold still to be counted." },
});
