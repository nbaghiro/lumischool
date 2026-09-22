import { letter, plain, type Ctx, type Lettering } from "../ink/surface";
import type { Level } from "../paper";

export type Align = Lettering["anchor"];

/** A word, in the reading face. */
export const say = <G>(
    c: Ctx<G>,
    x: number,
    y: number,
    s: string,
    size = 15,
    align: Align = "middle",
    color = c.t.ink,
): void => letter(c, { x, y, s, face: "read", weight: 600, size, fill: color, anchor: align });

/** A value, heavier than a word, for anything read as a number. */
export const num = <G>(
    c: Ctx<G>,
    x: number,
    y: number,
    s: string | number,
    size = 17,
    align: Align = "middle",
    color = c.t.ink,
): void =>
    letter(c, { x, y, s: String(s), face: "read", weight: 700, size, fill: color, anchor: align });

/** A quieter word: a unit, a caption, the name of an axis. */
export const soft = <G>(
    c: Ctx<G>,
    x: number,
    y: number,
    s: string,
    size = 13,
    align: Align = "middle",
): void =>
    letter(c, { x, y, s, face: "read", weight: 600, size, fill: c.t["ink-soft"], anchor: align });

/** Small letter-spaced capitals in the mono face: the head of a column, the name of a part. */
export const cap = <G>(
    c: Ctx<G>,
    x: number,
    y: number,
    s: string,
    size = 11,
    align: Align = "middle",
    color = c.t["ink-soft"],
): void =>
    letter(c, {
        x,
        y,
        s: s.toUpperCase(),
        face: "mono",
        weight: 500,
        size,
        fill: color,
        anchor: align,
        spacing: 0.08,
    });

/** Handwriting, in the teacher's ballpoint. */
export const penned = <G>(
    c: Ctx<G>,
    x: number,
    y: number,
    s: string,
    size = 18,
    align: Align = "middle",
): void =>
    letter(c, {
        x,
        y,
        s,
        face: "hand",
        weight: 600,
        size,
        fill: c.t.pen,
        anchor: align,
        informal: 100,
    });

/** Roughly how wide a string is in the reading face, in user units. */
export const wide = (s: string, size: number): number => s.length * size * 0.56;

/**
 * A white patch, so print's hatching never crosses something that has to be read. Paper only: a fill
 * that is a colour on screen is hatching in print, and hatching crosses out a number underneath it.
 */
export function patch<G>(c: Ctx<G>, x: number, y: number, w: number, h: number): void {
    if (c.paper) plain(c, { kind: "rect", x: x - w / 2, y: y - h / 2, w, h, r: 3, fill: c.t.card });
}

/** A value drawn on top of a fill, on a patch. */
export function numOn<G>(c: Ctx<G>, x: number, y: number, s: string | number, size = 17): void {
    patch(c, x, y - size * 0.34, wide(String(s), size) + 8, size * 1.2);
    num(c, x, y, s, size);
}

/** A word drawn on top of a fill, on a patch. */
export function sayOn<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    s: string,
    size = 15,
    align: Align = "middle",
): void {
    const w = wide(s, size) + 8;
    const dx = align === "start" ? w / 2 - 4 : align === "end" ? 4 - w / 2 : 0;
    patch(c, x + dx, y - size * 0.34, w, size * 1.2);
    say(c, x, y, s, size, align);
}

/** A blank for the child to write in, with the answer in pen when the key is on. */
export function slot<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    w: number,
    h: number,
    filled?: string,
    level: Level = "ruler",
): void {
    c.pen.rect(c.g, x, y, w, h, level, null, { strokeWidth: 1.8 });
    if (filled) penned(c, x + w / 2, y + h / 2 + 7, filled, Math.min(20, h * 0.55));
}

/** A dashed outline: where something is missing, or where a shape used to be. */
export function ghost<G>(c: Ctx<G>, d: string, level: Level = "pencil"): void {
    c.pen.path(c.g, d, level, null, {
        strokeWidth: 1.6,
        strokeLineDash: [7, 6],
        stroke: c.t["ink-soft"],
    });
}

/** The path of a circular sector, for a wheel, a pie or a spinner. Angles from twelve o'clock. */
export function sector(cx: number, cy: number, r: number, from: number, to: number): string {
    const a0 = from - Math.PI / 2;
    const a1 = to - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    if (to - from >= Math.PI * 2 - 1e-6) {
        return `M${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}Z`;
    }
    return `M${cx} ${cy}L${x0} ${y0}A${r} ${r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${x1} ${y1}Z`;
}

/** A point on a circle, measured from twelve o'clock the way a clock face is. */
export const onCircle = (cx: number, cy: number, r: number, turn: number): [number, number] => [
    cx + r * Math.sin(turn * Math.PI * 2),
    cy - r * Math.cos(turn * Math.PI * 2),
];
