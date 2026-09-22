// The logo, the paper bird, as SVG text: the mark, the word, the lockups, the small drawings, the app
// icon, the profile picture, the link preview and the loop. Every function is pure, so the apps, the
// build's files and the tests draw the same thing. See .docs/brand.md.
import { PALETTE, PRINT, U } from "../paper";

/** A drawing in its own units, ready to be wrapped in an <svg> or placed inside another. */
export interface Art {
    w: number;
    h: number;
    body: string;
}

/** A word laid out, with the height of the middle of its x-height, which a mark beside it centres on. */
export interface Word extends Art {
    mid: number;
}

export interface Look {
    /** One colour, the print ink only: for print, faxed forms and embossing. */
    ink?: boolean;
    /** Carry the loop's classes, so the drawing moves wherever its stylesheet is. */
    moving?: boolean;
}

export type Pt = [number, number];

export type Small = 16 | 24 | 32;

export type Lockup = "horizontal" | "stacked";

/**
 * What a logo's files are made from. The machinery below takes a logo rather than drawing the bird
 * alone because the scratchpad's brand page lays out the four directions not chosen with it too.
 */
export interface Logo {
    /** Names the loop's classes, `b-<id>`. */
    id: string;
    /** Seconds in one loop, rest to rest. */
    loop: number;
    /** The mark alone, in a 120 unit square. */
    mark(look?: Look): Art;
    word(look?: Look): Word;
    /** Drawn for each size on its own pixel grid, not the mark made smaller. */
    small(px: Small): Art;
    /** The square under the mark in the app icon and the profile picture, ruled every `step`. */
    ground(size: number, step: number, width: number): string;
    /** The loop's keyframes and the rules that start them, for a copy drawn with `moving`. */
    css: string;
}

/**
 * The palette a logo is drawn in, written into its files because a file cannot read CSS. The ink is
 * the desk's, since the word stands on the desk in a top bar, and `print` is the one colour a
 * printed or faxed form gets.
 */
export const COLOURS = {
    ink: PALETTE.desk.ink,
    soft: PALETTE.paper["ink-soft"],
    paper: PALETTE.paper.paper,
    grid: PALETTE.paper.grid,
    glow: PALETTE.paper.glow,
    tang: PALETTE.paper.tang,
    /** The glow laid thinly, as a highlighter's first pass on white. */
    wash: "#ffe9a6",
    /** The grid ruled on the yellow page: the glow a shade darker. */
    ruled: "#f2c23a",
    print: PRINT.ink,
};

type Attrs = Record<string, string | number | undefined>;

/** A number as the files write it: at most two decimals, and never "-0". */
export const n = (v: number): string => {
    const s = v.toFixed(2).replace(/\.?0+$/, "");
    return s === "-0" ? "0" : s;
};

const attrs = (a: Attrs): string => {
    let out = "";
    for (const [k, v] of Object.entries(a)) {
        if (v === undefined || v === "") continue;
        out += ` ${k}="${typeof v === "number" ? n(v) : v}"`;
    }
    return out;
};

export const path = (d: string, a: Attrs = {}): string => `<path d="${d}"${attrs(a)}/>`;

export const circle = (cx: number, cy: number, r: number, a: Attrs = {}): string =>
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"${attrs(a)}/>`;

export const group = (body: string, a: Attrs = {}): string => `<g${attrs(a)}>${body}</g>`;

const points = (pts: readonly Pt[]): string => pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L");

export const poly = (pts: readonly Pt[]): string => `M${points(pts)}Z`;

const line = (pts: readonly Pt[]): string => `M${points(pts)}`;

/** Places one drawing inside another as a nested viewport, so a moving part's pivot stays in its own units. */
function place(a: Art, x: number, y: number, w: number): string {
    const h = (w * a.h) / a.w;
    return `<svg x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" viewBox="0 0 ${n(a.w)} ${n(a.h)}" overflow="visible">${a.body}</svg>`;
}

/** A whole file. The title is what a screen reader says for an inline copy. */
export function svgFile(
    a: Art,
    o: { title?: string; width?: number; style?: string } = {},
): string {
    const size =
        o.width === undefined ? "" : ` width="${n(o.width)}" height="${n((o.width * a.h) / a.w)}"`;
    const title = o.title === undefined ? "" : `<title>${o.title}</title>`;
    const style = o.style === undefined ? "" : `<style>${o.style}</style>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(a.w)} ${n(a.h)}"${size} role="img">${title}${style}${a.body}</svg>`;
}

/**
 * Parallel lines across a convex polygon, as one path: `step` apart, at `angle` degrees, and on lines
 * through the origin when `aligned`, so a grid inside a facet lines up with the paper's.
 */
function hatch(pts: readonly Pt[], angle: number, step: number, aligned = false): string {
    const a = (angle * Math.PI) / 180;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const across = pts.map(([x, y]) => x * nx + y * ny);
    const lo = Math.min(...across);
    const hi = Math.max(...across);
    let d = "";
    for (let o = aligned ? Math.ceil(lo / step) * step : lo + step / 2; o < hi; o += step) {
        const hits: Pt[] = [];
        pts.forEach((p, i) => {
            const q = pts[(i + 1) % pts.length] ?? p;
            const dp = p[0] * nx + p[1] * ny - o;
            const dq = q[0] * nx + q[1] * ny - o;
            if (dp < 0 !== dq < 0) {
                const t = dp / (dp - dq);
                hits.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
            }
        });
        const [from, to] = hits;
        if (from && to) d += `M${n(from[0])} ${n(from[1])}L${n(to[0])} ${n(to[1])}`;
    }
    return d;
}

/** Squared paper behind a drawing, `step` units a square from the origin. */
export function paperGrid(
    w: number,
    h: number,
    o: { step?: number; stroke?: string; width?: number; fill?: string } = {},
): string {
    const step = o.step ?? U;
    let d = "";
    for (let x = step; x < w; x += step) d += `M${n(x)} 0V${n(h)}`;
    for (let y = step; y < h; y += step) d += `M0 ${n(y)}H${n(w)}`;
    return (
        path(`M0 0H${n(w)}V${n(h)}H0Z`, { fill: o.fill ?? COLOURS.paper }) +
        path(d, { fill: "none", stroke: o.stroke ?? COLOURS.grid, "stroke-width": o.width ?? 1 })
    );
}

/** A letter's outline at its own origin, placed along the line at `x`. The i carries its dot apart. */
export interface Letter {
    ch: string;
    x: number;
    d: string;
    dot?: string;
}

/**
 * A setting of the word "lumischool" as outlines, so a logo file needs no font. Units are pixels at
 * a 100 px size with the baseline at 0, and `box` is the word's extent: left, top, right, bottom.
 */
export interface Face {
    letters: readonly Letter[];
    box: readonly [number, number, number, number];
}

/**
 * Shantell Sans (SIL Open Font License 1.1, which allows a logo to be made from it) at weight 760,
 * informal 100 and bounce 60, the setting of the top bar's wordmark before the logo. How the outlines
 * were made is in .docs/brand.md.
 */
export const BOLD: Face = {
    box: [5.3, -83.2, 564.7, 9.1],
    letters: [
        {
            ch: "l",
            x: 0,
            d: "M23.7 -3C22.2 -3 20.6 -3.2 18.9 -3.6C17.3 -4.1 15.6 -4.9 14 -6.2C12.4 -7.5 10.9 -9.5 9.6 -12.2C8.3 -14.8 7.2 -18.3 6.4 -22.6C5.7 -26.9 5.3 -32.3 5.3 -38.8C5.3 -43.4 5.4 -47.7 5.7 -51.6C6 -55.6 6.3 -59.4 6.8 -63C7.2 -66.6 7.8 -70.1 8.4 -73.6C8.8 -75.9 9.6 -77.5 10.7 -78.6C11.9 -79.6 13.4 -80.1 15.5 -80.1C18.3 -80.1 20.5 -79.1 22.1 -77C23.6 -75 24.4 -71.7 24.4 -67.2C24.4 -65.3 24.3 -63.3 24 -61.3C23.8 -59.2 23.5 -57 23.2 -54.5C23 -52.1 22.7 -49.4 22.5 -46.5C22.2 -43.6 22.1 -40.3 22.1 -36.8C22.1 -32.7 22.2 -29.5 22.4 -27.1C22.7 -24.8 22.9 -23.1 23.3 -22C23.7 -20.9 24.2 -20.2 24.6 -19.9C25.1 -19.6 25.7 -19.4 26.2 -19.4C27.5 -19.4 28.7 -19.6 29.6 -19.9C30.6 -20.3 31.4 -20.6 32.2 -20.9C33 -21.2 33.8 -21.4 34.6 -21.4C36.4 -21.4 37.6 -20.8 38.3 -19.5C38.9 -18.3 39.2 -16.7 39.2 -14.8C39.2 -12.4 38.5 -10.3 37.2 -8.5C35.8 -6.8 33.9 -5.4 31.6 -4.4C29.3 -3.5 26.6 -3 23.7 -3ZM23.7 -3",
        },
        {
            ch: "u",
            x: 38.8,
            d: "M32.1 -4.6C27.7 -4.6 23.6 -5.5 20 -7.3C16.4 -9.2 13.3 -11.5 10.8 -14.4C8.2 -17.3 6.3 -20.4 4.9 -23.7C3.5 -27 2.8 -30.1 2.8 -33.1C2.8 -36.1 3.1 -38.8 3.6 -41.5C4.2 -44.1 5 -46.7 6 -49.4C6.4 -50.5 7.1 -51.4 8 -52.1C8.9 -52.8 10 -53.2 11.2 -53.2C14.1 -53.2 16.6 -52.3 18.5 -50.4C20.5 -48.6 21.5 -46.1 21.5 -43C21.5 -42.4 21.4 -41.7 21.1 -40.9C20.9 -40.2 20.7 -39.4 20.4 -38.5C20.1 -37.7 19.9 -36.9 19.6 -35.9C19.4 -35 19.3 -34.1 19.3 -33.1C19.3 -31.7 19.6 -30.3 20.3 -28.9C21.1 -27.5 22 -26.2 23.2 -25.1C24.3 -23.9 25.6 -23 26.9 -22.3C28.3 -21.6 29.6 -21.2 30.9 -21.2C33.1 -21.2 35 -21.9 36.4 -23.3C37.9 -24.7 39 -26.6 39.7 -28.8C40.5 -31 40.9 -33.4 40.9 -35.9C40.9 -37.3 40.8 -38.5 40.8 -39.6C40.7 -40.7 40.6 -41.7 40.6 -42.6C40.5 -43.6 40.4 -44.6 40.4 -45.7C40.4 -48 40.9 -49.9 41.8 -51.2C42.7 -52.5 44.5 -53.1 47 -53.1C49.1 -53.1 50.9 -52.6 52.3 -51.7C53.8 -50.7 54.9 -49.2 55.7 -47.2C56.5 -45.3 56.9 -42.7 56.9 -39.7C56.9 -31.8 55.8 -25.3 53.6 -20.1C51.4 -14.9 48.4 -11 44.7 -8.4C41 -5.9 36.8 -4.6 32.1 -4.6ZM32.1 -4.6",
        },
        {
            ch: "m",
            x: 101.1,
            d: "M15.7 7.5C13 7.5 10.9 6.6 9.4 4.8C8 3 7 0.7 6.4 -2.2C5.8 -5 5.5 -8 5.5 -11.2C5.5 -14.1 5.7 -17 5.9 -20C6.2 -22.9 6.3 -25.8 6.3 -28.7C6.3 -30.1 6.2 -31.5 6.1 -32.8C5.9 -34.1 5.8 -35.3 5.8 -36.6C5.8 -38.1 6.3 -39.4 7.4 -40.6C8.4 -41.7 10 -42.3 12 -42.3C14.1 -42.3 15.8 -41.8 17.2 -40.8C18.5 -39.9 19.5 -38.6 20.2 -37.1C20.8 -35.6 21.2 -34 21.3 -32.4L18 -30.7C18.8 -33.3 19.9 -35.7 21.3 -37.8C22.7 -40 24.4 -41.7 26.4 -42.9C28.4 -44.2 30.7 -44.8 33.2 -44.8C35.7 -44.8 37.8 -44.2 39.4 -43.1C41 -42 42.3 -40.4 43.3 -38.2C44.3 -36.1 45.1 -33.5 45.9 -30.5C46.6 -27.5 47.2 -24.8 47.6 -22.3C48 -19.8 48.3 -17.7 48.5 -16.1L45.4 -17.1C47.2 -23.1 49.3 -28.1 51.7 -32.2C54.1 -36.3 56.6 -39.4 59.4 -41.5C62.1 -43.7 64.8 -44.7 67.5 -44.7C72.8 -44.7 76.8 -42.7 79.3 -38.6C81.8 -34.5 83.6 -28.4 84.6 -20.3C85.1 -16.5 85.7 -13.4 86.3 -11.2C87 -8.9 87.6 -7.1 88.2 -5.8C88.9 -4.5 89.4 -3.4 89.8 -2.5C90.2 -1.6 90.5 -0.5 90.5 0.7C90.5 2.6 89.8 4.2 88.4 5.5C87.1 6.9 85.2 7.5 82.8 7.5C80.8 7.5 78.9 7 77.1 6C75.4 4.9 73.9 3.2 72.7 0.8C71.6 -1.6 70.7 -4.8 70.1 -8.9C69.5 -12.5 69.1 -15.4 68.7 -17.6C68.3 -19.8 67.9 -21.7 67.6 -23.2C67.2 -24.6 66.8 -25.9 66.4 -26.9C66 -27.9 65.5 -29 65 -30L68.5 -29.2C66.1 -26.9 64 -24.4 62.3 -21.5C60.6 -18.7 59.1 -15.4 57.8 -11.7C56.5 -8 55.1 -3.6 53.8 1.3C53.3 3.5 52.4 5 51.1 6C49.8 7 48.3 7.5 46.5 7.5C42.8 7.5 40.2 6.2 38.6 3.6C37 0.9 35.8 -3.1 34.9 -8.5C34.3 -12.8 33.7 -16.3 33.2 -18.9C32.7 -21.6 32.1 -23.9 31.6 -25.7C31 -27.6 30.2 -29.3 29.3 -31L31.8 -28.9C30.2 -26.6 28.8 -24.4 27.7 -22.2C26.6 -19.9 25.7 -17.6 25 -15.2C24.3 -12.9 23.7 -10.3 23.3 -7.7C22.9 -5 22.6 -2.1 22.4 1C22.2 3.1 21.6 4.7 20.5 5.8C19.4 7 17.8 7.5 15.7 7.5ZM15.7 7.5",
        },
        {
            ch: "i",
            x: 191,
            d: "M15.5 -58.8M17 -3.3C14.9 -3.3 13.1 -3.8 11.6 -4.8C10.1 -5.7 8.9 -7 8 -8.5C7.1 -10 6.7 -11.8 6.7 -13.7C6.7 -16.6 6.7 -19.1 6.7 -21C6.6 -22.9 6.6 -24.7 6.5 -26.2C6.4 -27.7 6.4 -29 6.3 -30.3C6.3 -31.6 6.3 -33 6.3 -34.5C6.3 -36.6 6.8 -38.6 7.7 -40.3C8.6 -42 9.9 -43.5 11.6 -44.6C13.2 -45.7 15 -46.3 17 -46.3C19.3 -46.3 21.2 -45.5 22.7 -44C24.2 -42.5 25 -40.2 25.1 -37.2C25.1 -36.2 25.1 -34.8 25 -33.1C24.9 -31.3 24.8 -29.3 24.8 -27.2C24.7 -25.2 24.6 -23 24.4 -20.9C24.3 -18.8 24.3 -16.8 24.2 -14.9C24.1 -13.1 24.1 -11.7 24.1 -10.7C24.1 -8.4 23.5 -6.6 22.3 -5.3C21.2 -4 19.4 -3.3 17 -3.3Z",
            dot: "M15.5 -58.8C12.2 -58.8 9.6 -59.6 7.7 -61.3C5.8 -63 4.9 -65.1 4.9 -67.6C4.9 -70.5 6 -72.9 8.2 -74.6C10.3 -76.3 13.1 -77.2 16.6 -77.2C18.7 -77.2 20.5 -76.8 21.9 -75.8C23.4 -74.9 24.5 -73.8 25.2 -72.4C25.9 -71 26.3 -69.6 26.3 -68.1C26.3 -65.6 25.4 -63.4 23.5 -61.6C21.6 -59.7 19 -58.8 15.5 -58.8Z",
        },
        {
            ch: "s",
            x: 223.9,
            d: "M19.1 9.1C15.3 9.1 12.2 8.4 9.6 7C6.9 5.6 4.9 3.7 3.6 1.6C2.2 -0.6 1.5 -2.9 1.5 -5.2C1.5 -6.4 1.9 -7.6 2.7 -8.5C3.5 -9.4 4.6 -9.9 6.1 -9.9C7.1 -9.9 8.1 -9.8 9.1 -9.5C10.1 -9.2 11.1 -8.8 12.2 -8.5C13.3 -8.1 14.5 -7.8 15.8 -7.5C17 -7.2 18.5 -7 20.1 -7C23.8 -7 26.6 -7.4 28.8 -8.2C30.9 -9 32.9 -10.3 34.8 -12.3C33.8 -13.1 32.4 -13.8 30.5 -14.3C28.6 -14.8 26.5 -15.3 24.1 -15.8C21.7 -16.2 19.3 -16.8 16.9 -17.6C14.5 -18.3 12.3 -19.3 10.2 -20.7C8.2 -22 6.6 -23.8 5.3 -26C4.1 -28.2 3.4 -31 3.4 -34.3C3.4 -38.3 4.3 -41.8 6.1 -44.6C7.9 -47.5 10.2 -49.8 13.2 -51.5C16.1 -53.3 19.4 -54.5 23.1 -55.3C26.8 -56 30.4 -56.4 34.1 -56.3C36.5 -56.3 38.4 -55.7 40.1 -54.5C41.7 -53.3 43 -51.9 43.9 -50.2C44.8 -48.4 45.3 -46.7 45.3 -44.8C45.3 -42.9 44.8 -41.5 43.9 -40.5C43 -39.5 41.8 -39 40.2 -39C39.6 -39 38.9 -39.1 38.2 -39.2C37.5 -39.3 36.7 -39.4 35.9 -39.4C35.2 -39.5 34.3 -39.5 33.3 -39.5C29.6 -39.5 26.4 -39.1 24 -38.3C21.5 -37.4 19.9 -36.1 19 -34.3C19.9 -33 21.3 -32 23.2 -31.3C25 -30.5 27.1 -29.9 29.5 -29.5C31.9 -29 34.4 -28.4 36.8 -27.8C39.2 -27.2 41.5 -26.3 43.6 -25.2C45.7 -24.2 47.4 -22.7 48.6 -20.7C49.9 -18.8 50.6 -16.3 50.6 -13.1C50.6 -9.2 49.7 -5.9 48 -3.2C46.2 -0.4 43.9 1.9 40.9 3.7C37.9 5.5 34.5 6.9 30.8 7.8C27.1 8.7 23.1 9.1 19.1 9.1ZM19.1 9.1",
        },
        {
            ch: "c",
            x: 278,
            d: "M28.4 4.6C22.9 4.6 18.2 3.6 14.4 1.7C10.6 -0.2 7.8 -2.9 5.9 -6.3C3.9 -9.8 3 -13.7 3 -18.1C3 -22.3 3.8 -26.2 5.6 -29.8C7.3 -33.4 9.7 -36.6 12.8 -39.3C15.9 -42.1 19.5 -44.2 23.5 -45.7C27.5 -47.2 31.7 -48 36.2 -48C38.4 -48 40.3 -47.6 41.9 -46.9C43.5 -46.2 44.8 -45.1 45.7 -43.7C46.6 -42.2 47 -40.4 47 -38.3C47 -35.7 46.5 -33.4 45.4 -31.6C44.3 -29.8 42.8 -28.9 40.9 -28.9C39.9 -28.9 39.2 -29.1 38.8 -29.6C38.4 -30 38 -30.5 37.6 -30.9C37.2 -31.4 36.4 -31.6 35.2 -31.6C32.2 -31.6 29.5 -31 27.2 -29.7C24.9 -28.3 23 -26.6 21.7 -24.5C20.4 -22.4 19.7 -20.2 19.7 -17.9C19.7 -16.7 19.9 -15.6 20.4 -14.7C20.8 -13.8 21.7 -13.1 22.9 -12.5C24.2 -12 26 -11.7 28.4 -11.7C31 -11.7 33 -12 34.5 -12.6C35.9 -13.3 37.1 -14 38 -14.8C38.9 -15.7 39.8 -16.4 40.7 -17C41.5 -17.7 42.6 -18 43.9 -18C45.5 -18 46.8 -17.5 47.6 -16.4C48.4 -15.4 48.8 -13.7 48.8 -11.4C48.8 -8.4 48 -5.7 46.2 -3.2C44.5 -0.8 42.1 1.1 39 2.5C35.9 3.9 32.3 4.6 28.4 4.6ZM28.4 4.6",
        },
        {
            ch: "h",
            x: 331.1,
            d: "M15.9 -6.3C13.9 -6.3 12.1 -6.9 10.6 -8.2C9 -9.5 7.8 -11.2 6.9 -13.4C6 -15.5 5.5 -17.9 5.5 -20.4C5.5 -26.7 5.8 -32.3 6.2 -37.3C6.7 -42.4 7.1 -46.9 7.5 -51C7.9 -55.1 8.2 -58.9 8.2 -62.3C8.2 -64.9 8.1 -67 7.9 -68.7C7.7 -70.4 7.5 -71.9 7.2 -73.2C7 -74.5 6.9 -75.9 6.9 -77.3C6.9 -78.8 7.4 -80.1 8.5 -81.4C9.5 -82.6 11.3 -83.2 13.9 -83.2C15.7 -83.2 17.5 -82.6 19.2 -81.5C20.8 -80.4 22.2 -78.4 23.3 -75.7C24.3 -73 24.8 -69.2 24.8 -64.4C24.7 -61.9 24.5 -59 24.2 -55.9C23.8 -52.8 23.4 -49 23 -44.6C22.7 -40.2 22.5 -34.8 22.5 -28.4L18.4 -34.5C21 -40.8 23.6 -46 26.3 -50.1C29 -54.1 31.8 -57.2 34.6 -59.1C37.4 -61.1 40.4 -62.1 43.5 -62.1C47.4 -62.1 50.5 -61 52.8 -58.8C55.1 -56.6 56.8 -53.4 57.9 -49.2C59 -45 59.9 -39.9 60.4 -34C60.9 -29.8 61.4 -26.5 62.2 -24.1C62.9 -21.7 63.6 -19.8 64.4 -18.3C65.2 -16.9 66 -15.5 66.7 -14.3C67 -13.7 67.3 -13 67.5 -12.2C67.7 -11.4 67.8 -10.6 67.8 -9.8C67.8 -8.1 67.1 -6.6 65.7 -5.4C64.3 -4.2 62.5 -3.6 60.2 -3.6C57.1 -3.6 54.5 -4.5 52.3 -6.1C50.2 -7.8 48.5 -10 47.3 -12.9C46.1 -15.7 45.3 -18.9 45 -22.4C44.6 -26.4 44.3 -29.6 43.9 -32.2C43.6 -34.7 43.1 -36.7 42.6 -38.4C42.2 -40 41.6 -41.4 41.1 -42.7C39.9 -42.1 38.4 -40.5 36.5 -37.9C34.7 -35.2 32.6 -31.7 30.2 -27.2C27.8 -22.8 25.3 -17.5 22.6 -11.3C21.8 -9.3 20.8 -8 19.7 -7.3C18.7 -6.6 17.4 -6.3 15.9 -6.3ZM15.9 -6.3",
        },
        {
            ch: "o",
            x: 400,
            d: "M31 -4.8C25.8 -4.8 21.1 -5.8 17 -7.7C12.9 -9.7 9.7 -12.3 7.4 -15.8C5 -19.2 3.9 -23.1 3.9 -27.4C3.9 -30.4 4.6 -33.3 6 -36.2C7.3 -39 9.2 -41.6 11.6 -43.9C13.9 -46.2 16.5 -48 19.3 -49.4C22.1 -50.7 24.9 -51.4 27.8 -51.4C29.1 -51.4 30.2 -51.2 31.4 -50.8C32.5 -50.4 33.4 -49.7 34 -48.9C34.7 -48 35.1 -46.9 35.1 -45.4C35.1 -43.1 34.5 -41 33.5 -39.3C32.4 -37.5 30.2 -36.1 27 -35.1C25.9 -34.8 24.8 -34.1 23.8 -33.3C22.7 -32.4 21.9 -31.5 21.2 -30.4C20.5 -29.3 20.2 -28.1 20.2 -26.8C20.2 -24.9 21.1 -23.4 23 -22.3C24.8 -21.1 27.4 -20.6 30.6 -20.6C33.3 -20.6 35.6 -21.2 37.4 -22.6C39.1 -23.9 40 -25.6 40 -27.7C40 -29.7 39.3 -31.3 37.8 -32.5C36.3 -33.7 34.3 -34.3 31.9 -34.3C30.5 -34.3 29.4 -33.9 28.5 -33.2C27.5 -32.5 26.4 -31.5 25.1 -30.3C24.3 -29.4 23.5 -28.8 22.8 -28.4C22 -27.9 21.2 -27.6 20.4 -27.5C19.6 -27.3 18.7 -27.2 17.6 -27.2C16.4 -27.2 15.3 -27.7 14.3 -28.5C13.3 -29.4 12.8 -31.1 12.8 -33.5C12.8 -35.4 13.3 -37.3 14.4 -39.1C15.4 -41 16.8 -42.7 18.6 -44.3C20.3 -45.8 22.2 -47.1 24.3 -48C26.4 -48.9 28.6 -49.4 30.7 -49.4C36.1 -49.4 40.7 -48.6 44.5 -46.8C48.3 -45.1 51.2 -42.7 53.2 -39.6C55.2 -36.4 56.2 -32.7 56.2 -28.3C56.2 -23.9 55.1 -19.8 52.8 -16.3C50.6 -12.7 47.6 -9.9 43.9 -7.8C40.1 -5.8 35.8 -4.8 31 -4.8ZM31 -4.8",
        },
        {
            ch: "o",
            x: 460.1,
            d: "M34.1 5.1C28.3 5.1 23.1 4 18.5 1.7C14 -0.7 10.4 -3.9 7.8 -8C5.2 -12.1 3.9 -16.7 3.9 -21.9C3.9 -25.3 4.6 -28.5 6.1 -31.6C7.6 -34.7 9.6 -37.5 12 -40C14.5 -42.5 17.2 -44.5 20.2 -46C23.1 -47.5 26.1 -48.2 29.1 -48.2C30.3 -48.2 31.5 -48 32.6 -47.6C33.7 -47.2 34.6 -46.6 35.3 -45.7C36 -44.8 36.4 -43.7 36.4 -42.3C36.4 -39.7 35.8 -37.5 34.7 -35.5C33.7 -33.6 31.5 -32.1 28.3 -31.1C27 -30.7 25.8 -29.9 24.6 -28.9C23.4 -27.9 22.4 -26.7 21.7 -25.4C20.9 -24.1 20.5 -22.8 20.5 -21.4C20.5 -18 21.7 -15.3 24.1 -13.3C26.5 -11.3 29.6 -10.3 33.6 -10.3C37 -10.3 39.7 -11.3 41.8 -13.4C43.9 -15.4 45 -18.1 45 -21.4C45 -24.4 44.1 -26.7 42.3 -28.5C40.5 -30.3 38.2 -31.1 35.2 -31.1C33.8 -31.1 32.6 -30.7 31.7 -29.9C30.7 -29.1 29.6 -28.1 28.2 -26.7C27.3 -25.8 26.4 -25 25.7 -24.5C24.9 -23.9 24.2 -23.5 23.4 -23.3C22.7 -23 21.7 -22.9 20.7 -22.9C19.5 -22.9 18.3 -23.4 17.4 -24.4C16.4 -25.4 15.9 -27.2 15.9 -30C15.9 -32 16.4 -34 17.5 -36C18.5 -38 19.9 -39.8 21.6 -41.4C23.4 -43 25.3 -44.3 27.4 -45.3C29.5 -46.2 31.7 -46.7 33.8 -46.7C39.6 -46.7 44.6 -45.7 48.7 -43.7C52.8 -41.7 55.9 -38.9 58.1 -35.2C60.3 -31.5 61.3 -27.2 61.3 -22.1C61.3 -16.9 60.1 -12.3 57.8 -8.2C55.4 -4.1 52.1 -0.8 48 1.5C43.9 3.9 39.3 5.1 34.1 5.1ZM34.1 5.1",
        },
        {
            ch: "l",
            x: 525.5,
            d: "M23.7 -3C22.2 -3 20.6 -3.2 18.9 -3.6C17.3 -4.1 15.6 -4.9 14 -6.2C12.4 -7.5 10.9 -9.5 9.6 -12.2C8.3 -14.8 7.2 -18.3 6.4 -22.6C5.7 -26.9 5.3 -32.3 5.3 -38.8C5.3 -43.4 5.4 -47.7 5.7 -51.6C6 -55.6 6.3 -59.4 6.8 -63C7.2 -66.6 7.8 -70.1 8.4 -73.6C8.8 -75.9 9.6 -77.5 10.7 -78.6C11.9 -79.6 13.4 -80.1 15.5 -80.1C18.3 -80.1 20.5 -79.1 22.1 -77C23.6 -75 24.4 -71.7 24.4 -67.2C24.4 -65.3 24.3 -63.3 24 -61.3C23.8 -59.2 23.5 -57 23.2 -54.5C23 -52.1 22.7 -49.4 22.5 -46.5C22.2 -43.6 22.1 -40.3 22.1 -36.8C22.1 -32.7 22.2 -29.5 22.4 -27.1C22.7 -24.8 22.9 -23.1 23.3 -22C23.7 -20.9 24.2 -20.2 24.6 -19.9C25.1 -19.6 25.7 -19.4 26.2 -19.4C27.5 -19.4 28.7 -19.6 29.6 -19.9C30.6 -20.3 31.4 -20.6 32.2 -20.9C33 -21.2 33.8 -21.4 34.6 -21.4C36.4 -21.4 37.6 -20.8 38.3 -19.5C38.9 -18.3 39.2 -16.7 39.2 -14.8C39.2 -12.4 38.5 -10.3 37.2 -8.5C35.8 -6.8 33.9 -5.4 31.6 -4.4C29.3 -3.5 26.6 -3 23.7 -3ZM23.7 -3",
        },
    ],
};

/** The extent of an outline, read off its path's numbers: left, top, right, bottom. */
export function extentOf(d: string): [number, number, number, number] {
    const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = nums[i] ?? x0;
        const y = nums[i + 1] ?? y0;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
    }
    return [x0, y0, x1, y1];
}

/**
 * The word as outlines, in the face's units with a little room round it. With `swash` it has the
 * highlighter under "school", behind the lower two thirds of the x-height and a little below, which
 * in one colour becomes two ruled lines, so it survives a fax and does not fight a printed grid.
 */
export function wordmark(face: Face, look: Look = {}, swash = false): Word {
    const [x0, top, x1, bottom] = face.box;
    const pad = 4;
    const ox = pad - x0;
    const oy = pad - top;
    const ink = look.ink ? COLOURS.print : COLOURS.ink;
    let under = "";
    const s = face.letters[4];
    const l = face.letters[9];
    if (swash && s && l) {
        const from = s.x + extentOf(s.d)[0] - 7 + ox;
        const to = l.x + extentOf(l.d)[2] + 7 + ox;
        // the x-height is about 50 units, so the band runs from 31 above the baseline to 8 below it
        const y0 = oy - 31;
        const y1 = oy + 8;
        under = look.ink
            ? path(
                  `M${n(from)} ${n(y1 - 3)}L${n(to)} ${n(y1 - 4.5)}M${n(from + 10)} ${n(y1 + 4)}L${n(to - 6)} ${n(y1 + 3)}`,
                  {
                      fill: "none",
                      stroke: COLOURS.print,
                      "stroke-width": 3.2,
                      "stroke-linecap": "round",
                  },
              )
            : path(`M${n(from)} ${n(y0)}H${n(to)}V${n(y1)}H${n(from)}Z`, { fill: COLOURS.glow });
    }
    let body = "";
    for (const letter of face.letters) {
        const dot = letter.dot === undefined ? "" : path(letter.dot, { fill: ink });
        body += group(path(letter.d, { fill: ink }) + dot, {
            transform: `translate(${n(letter.x + ox)} ${n(oy)})`,
        });
    }
    return {
        w: x1 - x0 + pad * 2,
        h: bottom - top + pad * 2 + 6,
        body: under + body,
        mid: oy - 25,
    };
}

/** The mark, carrying the loop's classes when it moves. */
export function markArt(logo: Logo, look: Look = {}): Art {
    const a = logo.mark(look);
    return look.moving ? { ...a, body: group(a.body, { class: `b-moving b-${logo.id}` }) } : a;
}

/** The word alone, which never moves: only the mark carries the loop. */
export function wordArt(logo: Logo, look: Look = {}): Word {
    return logo.word({ ...look, moving: false });
}

/** How big a mark stands beside the word, in the word's units. */
const BESIDE = 150;

/**
 * The mark and the word together. Horizontal: the mark's centre on the middle of the x-height, with
 * a gap of a tenth of the mark. Stacked: the word centred under the mark. Only the mark moves.
 */
export function lockup(logo: Logo, kind: Lockup, look: Look = {}): Art {
    const mark = markArt(logo, look);
    const word = wordArt(logo, look);
    if (kind === "horizontal") {
        const gap = BESIDE * 0.1;
        const markY = Math.max(0, word.mid - BESIDE / 2);
        const wordY = markY + BESIDE / 2 - word.mid;
        const top = Math.min(markY, wordY);
        const bottom = Math.max(markY + BESIDE, wordY + word.h);
        return {
            w: BESIDE + gap + word.w,
            h: bottom - top,
            body:
                place(mark, 0, markY - top, BESIDE) +
                place(word, BESIDE + gap, wordY - top, word.w),
        };
    }
    const size = Math.round(word.w * 0.44);
    const gap = size * 0.02;
    const w = Math.max(size, word.w);
    return {
        w,
        h: size + gap + word.h,
        body:
            place(mark, (w - size) / 2, 0, size) +
            place(word, (w - word.w) / 2, size + gap, word.w),
    };
}

/**
 * The app icon: a full-bleed square with the mark on the logo's ground. `safe` shrinks the mark into
 * the central circle a maskable icon keeps, 80 per cent of the width, and a whole number of squares
 * crosses the icon.
 */
export function icon(logo: Logo, o: { safe?: boolean } = {}): Art {
    const size = 240;
    const mark = o.safe ? 150 : 196;
    return {
        w: size,
        h: size,
        body:
            logo.ground(size, 30, 1.6) +
            place(markArt(logo), (size - mark) / 2, (size - mark) / 2, mark),
    };
}

/** The profile picture: the icon's ground and mark, the mark kept inside a circle crop. */
export function profile(logo: Logo): Art {
    const size = 400;
    const mark = 250;
    return {
        w: size,
        h: size,
        body:
            logo.ground(size, 40, 2) +
            place(markArt(logo), (size - mark) / 2, (size - mark) / 2 + 4, mark),
    };
}

/** The link preview, 1200 by 630: the horizontal lockup on the squared page. */
export function social(logo: Logo): Art {
    const w = 1200;
    const h = 630;
    const a = lockup(logo, "horizontal");
    const lw = 840;
    const lh = (lw * a.h) / a.w;
    return {
        w,
        h,
        body: paperGrid(w, h, { step: 30, width: 1.5 }) + place(a, (w - lw) / 2, (h - lh) / 2, lw),
    };
}

/**
 * The rules every loop keeps, round its own keyframes (.docs/brand.md, "Motion"): it starts a moment
 * after the drawing appears, can be told how many times to run, and stops under reduced motion, in
 * print and inside anything marked `b-still`.
 */
const motionBase = (logo: Logo): string =>
    `.b-moving.b-${logo.id} *{animation-duration:${logo.loop}s;animation-iteration-count:var(--b-runs,infinite);animation-delay:var(--b-delay,.6s);animation-fill-mode:both;transform-box:view-box}` +
    "@media (prefers-reduced-motion:reduce){.b-moving *{animation:none!important}}@media print{.b-moving *{animation:none!important}}.b-still .b-moving *,.b-moving.b-still *{animation:none!important}";

/** The loop's whole stylesheet. */
export const motionCss = (logo: Logo): string => motionBase(logo) + logo.css;

/** Every vector file of a logo, by file name. */
export function files(logo: Logo): Record<string, string> {
    const title = "lumischool";
    const style = motionCss(logo);
    return {
        "mark.svg": svgFile(markArt(logo), { title }),
        "mark-ink.svg": svgFile(markArt(logo, { ink: true }), { title }),
        "mark-animated.svg": svgFile(markArt(logo, { moving: true }), { title, style }),
        "wordmark.svg": svgFile(logo.word(), { title }),
        "wordmark-ink.svg": svgFile(logo.word({ ink: true }), { title }),
        "lockup-horizontal.svg": svgFile(lockup(logo, "horizontal"), { title }),
        "lockup-horizontal-ink.svg": svgFile(lockup(logo, "horizontal", { ink: true }), { title }),
        "lockup-horizontal-animated.svg": svgFile(lockup(logo, "horizontal", { moving: true }), {
            title,
            style,
        }),
        "lockup-stacked.svg": svgFile(lockup(logo, "stacked"), { title }),
        "lockup-stacked-ink.svg": svgFile(lockup(logo, "stacked", { ink: true }), { title }),
        "favicon.svg": svgFile(logo.small(16), { title }),
        "icon.svg": svgFile(icon(logo), { title }),
        "icon-maskable.svg": svgFile(icon(logo, { safe: true }), { title }),
    };
}

/** The bird's facets in the mark's 120 unit square. */
const FOLDS: { tail: Pt[]; body: Pt[]; wing: [Pt, Pt, Pt]; head: Pt[]; beak: Pt[]; eye: Pt } = {
    tail: [
        [40, 78],
        [6, 56],
        [30, 85],
    ],
    body: [
        [24, 84],
        [60, 54],
        [96, 72],
        [64, 102],
    ],
    wing: [
        [46, 66],
        [42, 12],
        [68, 75],
    ],
    head: [
        [80, 65],
        [78, 34],
        [94, 24],
        [102, 46],
    ],
    beak: [
        [97, 31],
        [117, 38.5],
        [101, 43],
    ],
    eye: [90.5, 37.5],
};

/**
 * Folded from a page of the exercise book with clean paths, since origami is straight folds and the
 * pen's wobble made the creases look crumpled. The grid inside the body and the head is ruled to
 * line up with the paper's, and the tail is hatched so it still reads in one colour.
 */
function birdMark(look: Look = {}): Art {
    const ink = look.ink ? COLOURS.print : COLOURS.ink;
    const edge = (pts: readonly Pt[], w: number): string =>
        path(poly(pts), {
            fill: "none",
            stroke: ink,
            "stroke-width": w,
            "stroke-linejoin": "round",
        });
    const facet = (pts: readonly Pt[], w = 4): string =>
        path(poly(pts), {
            fill: COLOURS.paper,
            stroke: ink,
            "stroke-width": w,
            "stroke-linejoin": "round",
        });
    const gridIn = (pts: readonly Pt[]): string =>
        look.ink
            ? ""
            : path(hatch(pts, 0, 10, true) + hatch(pts, 90, 10, true), {
                  fill: "none",
                  stroke: COLOURS.grid,
                  "stroke-width": 1.4,
              });
    const shade = (pts: readonly Pt[]): string =>
        path(hatch(pts, -45, look.ink ? 6.5 : 5), {
            fill: "none",
            stroke: look.ink ? COLOURS.print : COLOURS.soft,
            "stroke-width": look.ink ? 2.2 : 1.8,
        });
    const crease = (from: Pt, to: Pt, w: number): string =>
        path(line([from, to]), { stroke: ink, "stroke-width": w, "stroke-linecap": "round" });
    const legs = path("M58 100.5L59 114M70 101.5L71.5 115", {
        fill: "none",
        stroke: ink,
        "stroke-width": 3.6,
        "stroke-linecap": "round",
    });
    const tail = facet(FOLDS.tail) + shade(FOLDS.tail) + edge(FOLDS.tail, 4);
    const body =
        facet(FOLDS.body) +
        gridIn(FOLDS.body) +
        edge(FOLDS.body, 4.4) +
        crease([60, 54], [64, 102], 2.2);
    const [w0, tip, w1] = FOLDS.wing;
    const fold: Pt = [(w0[0] + w1[0]) / 2, (w0[1] + w1[1]) / 2];
    const wash = look.ink ? "" : path(poly([w0, tip, fold]), { fill: COLOURS.wash });
    const wing = facet(FOLDS.wing, 4.2) + crease(fold, tip, 2) + wash + edge(FOLDS.wing, 4.2);
    const beak = path(poly(FOLDS.beak), {
        fill: look.ink ? COLOURS.print : COLOURS.tang,
        stroke: ink,
        "stroke-width": 3.2,
        "stroke-linejoin": "round",
    });
    const head =
        facet(FOLDS.head) +
        gridIn(FOLDS.head) +
        edge(FOLDS.head, 4) +
        beak +
        circle(FOLDS.eye[0], FOLDS.eye[1], 3.4, { fill: ink });
    return {
        w: 120,
        h: 120,
        body: group(
            legs +
                tail +
                body +
                group(head, { class: "b-head" }) +
                group(wing, { class: "b-wing" }),
            { class: "b-body" },
        ),
    };
}

/**
 * The bird for 16, 24 and 32 px, drawn as a tab favicon on no ground: the mark simplified until it
 * reads at 16 px, with the head and the beak made bigger. In a 16 unit square, scaled to fill each
 * size less its outline, since there is no tile to keep inside. */
const SMALL_FOLDS: {
    tail: Pt[];
    body: Pt[];
    wing: [Pt, Pt, Pt];
    head: Pt[];
    beak: Pt[];
    legs: Pt[][];
    eye: Pt;
} = {
    tail: [
        [6, 9.5],
        [1, 6],
        [4, 11],
    ],
    body: [
        [3, 11],
        [8, 7],
        [13, 9],
        [9, 13],
    ],
    wing: [
        [6, 8.5],
        [5.5, 1],
        [9.5, 9.5],
    ],
    head: [
        [10.5, 8],
        [10, 4],
        [12, 2.5],
        [13.5, 5.5],
    ],
    beak: [
        [12.6, 3.3],
        [15.5, 4.5],
        [13.2, 5.4],
    ],
    legs: [
        [
            [7.5, 12.5],
            [7.5, 15],
        ],
        [
            [10.5, 12],
            [10.5, 15],
        ],
    ],
    eye: [11.5, 4.5],
};

/** The ink outline outside each facet and the legs' width, in pixels at each size. */
const SMALL_LOOK: Record<Small, { outline: number; leg: number }> = {
    16: { outline: 1, leg: 1 },
    24: { outline: 1.1, leg: 1.2 },
    32: { outline: 1.25, leg: 1.5 },
};

/**
 * White facets inside one ink outline round the whole bird, with the wing's line the only one inside,
 * the yellow fold and the orange beak. The white holds the bird on a dark tab strip and the outline
 * holds it on a light one. The eye at 16 px is one whole pixel, and at 32 px the wing's crease and
 * the head's edge come back. The app icons keep the yellow tile (.docs/brand.md, "In the apps").
 */
function birdSmall(px: Small): Art {
    const { outline, leg } = SMALL_LOOK[px];
    const { tail, body: trunk, wing, head, beak, legs, eye } = SMALL_FOLDS;
    const all = [...tail, ...trunk, ...wing, ...head, ...beak, ...legs.flat()];
    const xs = all.map(([x]) => x);
    const ys = all.map(([, y]) => y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const s = (px - 2 * (outline + 0.2)) / Math.max(x1 - x0, y1 - y0);
    const at = (pts: readonly Pt[]): Pt[] =>
        pts.map(([x, y]) => [(x - (x0 + x1) / 2) * s + px / 2, (y - (y0 + y1) / 2) * s + px / 2]);
    const edge = (pts: readonly Pt[], w: number): string =>
        path(poly(at(pts)), {
            fill: "none",
            stroke: COLOURS.ink,
            "stroke-width": w * 2,
            "stroke-linejoin": "round",
        });
    const fill = (pts: readonly Pt[], colour: string): string =>
        path(poly(at(pts)), { fill: colour });
    let body = "";
    for (const [top, foot] of legs.map(at)) {
        if (top && foot) {
            body += path(line([top, foot]), {
                stroke: COLOURS.ink,
                "stroke-width": leg,
                "stroke-linecap": "butt",
            });
        }
    }
    body += edge(tail, outline) + edge(trunk, outline) + edge(head, outline) + edge(beak, outline);
    body += fill(tail, COLOURS.paper) + fill(trunk, COLOURS.paper) + fill(head, COLOURS.paper);
    if (px === 32) body += edge(head, 0.45) + fill(head, COLOURS.paper);
    body += edge(wing, outline) + fill(wing, COLOURS.paper);
    const [w0, tip, w1] = wing;
    const fold: Pt = [(w0[0] + w1[0]) / 2, (w0[1] + w1[1]) / 2];
    body += fill([w0, tip, fold], COLOURS.glow);
    const [from, to] = at([fold, tip]);
    if (px === 32 && from && to) {
        body += path(line([from, to]), {
            stroke: COLOURS.ink,
            "stroke-width": 0.8,
            "stroke-linecap": "round",
        });
    }
    body += fill(beak, COLOURS.tang);
    const [centre] = at([eye]);
    if (centre) {
        body +=
            px === 16
                ? path(`M${Math.floor(centre[0])} ${Math.floor(centre[1])}h1v1h-1Z`, {
                      fill: COLOURS.ink,
                  })
                : circle(centre[0], centre[1], (px / 16) * 0.62 * s, { fill: COLOURS.ink });
    }
    return { w: px, h: px, body };
}

/**
 * The wing lifts a little, beats down 24 degrees, overshoots and settles, while the body rises three
 * and a half units and lands and the head follows a moment behind. Every keyframe at 0 and 100 per
 * cent is the drawing as drawn, and only transforms move.
 */
const BIRD_CSS =
    ".b-moving.b-bird .b-wing{transform-origin:57px 70px;animation-name:b-bird-wing}" +
    ".b-moving.b-bird .b-body{transform-origin:60px 110px;animation-name:b-bird-body}" +
    ".b-moving.b-bird .b-head{transform-origin:82px 64px;animation-name:b-bird-head}" +
    "@keyframes b-bird-wing{0%,100%{transform:none;animation-timing-function:ease-in}6%{transform:rotate(6deg);animation-timing-function:cubic-bezier(.5,0,.8,.4)}13%{transform:rotate(-24deg);animation-timing-function:cubic-bezier(.2,.6,.4,1)}24%{transform:rotate(7deg);animation-timing-function:ease-in-out}31%{transform:rotate(-2deg)}37%{transform:none}}" +
    "@keyframes b-bird-body{0%,100%{transform:none}8%{transform:translateY(1px)}15%{transform:translateY(-3.5px)}27%{transform:translateY(-1.5px)}38%{transform:none}}" +
    "@keyframes b-bird-head{0%,100%{transform:none}16%{transform:rotate(-4deg)}30%{transform:rotate(2deg)}40%{transform:none}}";

/** The logo: the paper bird beside the word with its highlighter. */
export const BIRD: Logo = {
    id: "bird",
    loop: 3.4,
    mark: birdMark,
    word: (look) => wordmark(BOLD, look, true),
    small: birdSmall,
    ground: (size, step, width) =>
        paperGrid(size, size, { step, width, fill: COLOURS.glow, stroke: COLOURS.ruled }),
    css: BIRD_CSS,
};
