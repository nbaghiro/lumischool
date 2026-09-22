// Paint that mixes like paint. Every pigment in the box is a reflectance curve over nineteen bands of
// light, and a mix is worked out with Kubelka-Munk, band by band, the way paint absorbs and scatters,
// rather than by averaging red, green and blue. Averaging turns blue and yellow into grey; this
// turns them into green, and red and white into pink. The tray, the sheet, the shelf's drawings and
// the verifier all mix through `mix` here, so a question about what two paints make is answered by
// the same arithmetic the child's brush uses. See .docs/art.md, "Colour mixing".
//
// The tables are read by band and by channel, which the root's strictness cannot see are in range, so
// each read carries a zero it never reaches.

/** Every twenty nanometres from 380 to 740. */
const BANDS = 19;
// CIE 1931 2 degree colour matching functions and the D65 daylight spectrum at those wavelengths.
const CMF_X = [
    0.001368, 0.01431, 0.13438, 0.34828, 0.2908, 0.09564, 0.0049, 0.06327, 0.2904, 0.5945, 0.9163,
    1.0622, 0.85445, 0.4479, 0.1649, 0.04677, 0.011359, 0.002899, 0.00069,
];
const CMF_Y = [
    0.000039, 0.000396, 0.004, 0.023, 0.06, 0.13902, 0.323, 0.71, 0.954, 0.995, 0.87, 0.631, 0.381,
    0.175, 0.061, 0.017, 0.004102, 0.001047, 0.000249,
];
const CMF_Z = [
    0.00645, 0.06785, 0.6456, 1.74706, 1.6692, 0.81295, 0.272, 0.07825, 0.0203, 0.0039, 0.00165,
    0.0008, 0.00019, 0.00002, 0, 0, 0, 0, 0,
];
const D65 = [
    49.98, 82.75, 93.43, 104.86, 117.81, 115.92, 109.35, 104.79, 104.41, 100, 95.79, 90.01, 87.7,
    83.7, 80.21, 78.28, 71.61, 61.6, 75.09,
];
const XYZ_TO_RGB = [
    [3.2406, -1.5372, -0.4986],
    [-0.9689, 1.8758, 0.0415],
    [0.0557, -0.204, 1.057],
];

/**
 * What each band adds to linear red, green and blue. Scaled per channel so that a surface reflecting
 * everything is exactly white, which absorbs the small error of sampling every twenty nanometres.
 */
const TO_RGB: [number, number, number][] = (() => {
    const raw = D65.map((d, i) => {
        const x = d * (CMF_X[i] ?? 0),
            y = d * (CMF_Y[i] ?? 0),
            z = d * (CMF_Z[i] ?? 0);
        return XYZ_TO_RGB.map((r) => (r[0] ?? 0) * x + (r[1] ?? 0) * y + (r[2] ?? 0) * z) as [
            number,
            number,
            number,
        ];
    });
    const sums = [0, 1, 2].map((c) => raw.reduce((s, t) => s + (t[c] ?? 0), 0));
    return raw.map((t) => [t[0] / (sums[0] ?? 1), t[1] / (sums[1] ?? 1), t[2] / (sums[2] ?? 1)]);
})();

export const PIGMENTS = [
    "yellow",
    "orange",
    "red",
    "pink",
    "blue",
    "sky",
    "green",
    "brown",
    "black",
    "white",
] as const;
export type Pigment = (typeof PIGMENTS)[number];

/**
 * `rho` is the smoothest curve that paints the pan's colour, found offline the way Scott Burns
 * recovers a reflectance from sRGB; test/paint.test.ts holds each curve to its colour. `strength` is
 * tinting strength: how far one part of it pulls a mix, which is why one part of white makes a tint
 * rather than a shade of grey, and one part of black does not swallow a whole pot of yellow.
 * The tints are the palette: red and white make berry, blue and white make sky, green and white mint.
 */
const BOX: Record<Pigment, { hex: string; strength: number; rho: number[] }> = {
    yellow: {
        hex: "#FFD63C",
        strength: 1,
        rho: [
            0.079, 0.079, 0.079, 0.085, 0.11, 0.182, 0.328, 0.527, 0.692, 0.789, 0.84, 0.865, 0.877,
            0.881, 0.882, 0.883, 0.883, 0.883, 0.883,
        ],
    },
    orange: {
        hex: "#F7A24F",
        strength: 0.6,
        rho: [
            0.108, 0.108, 0.108, 0.11, 0.119, 0.14, 0.174, 0.23, 0.328, 0.477, 0.634, 0.739, 0.79,
            0.809, 0.815, 0.816, 0.816, 0.816, 0.816,
        ],
    },
    red: {
        hex: "#DB3550",
        strength: 0.22,
        rho: [
            0.119, 0.119, 0.118, 0.108, 0.081, 0.055, 0.039, 0.034, 0.04, 0.068, 0.173, 0.469,
            0.708, 0.787, 0.809, 0.814, 0.816, 0.816, 0.816,
        ],
    },
    pink: {
        hex: "#F39CBF",
        strength: 0.6,
        rho: [
            0.595, 0.595, 0.594, 0.575, 0.507, 0.402, 0.313, 0.273, 0.302, 0.414, 0.586, 0.722,
            0.788, 0.812, 0.82, 0.822, 0.822, 0.822, 0.822,
        ],
    },
    blue: {
        hex: "#2B6CC8",
        strength: 0.3,
        rho: [
            0.599, 0.599, 0.598, 0.584, 0.53, 0.43, 0.316, 0.22, 0.153, 0.112, 0.088, 0.076, 0.069,
            0.067, 0.066, 0.066, 0.066, 0.066, 0.066,
        ],
    },
    sky: {
        hex: "#8CC7EF",
        strength: 0.6,
        rho: [
            0.849, 0.849, 0.849, 0.845, 0.827, 0.79, 0.734, 0.663, 0.58, 0.496, 0.424, 0.374, 0.346,
            0.335, 0.331, 0.331, 0.33, 0.33, 0.33,
        ],
    },
    green: {
        hex: "#4E9F68",
        strength: 0.4,
        rho: [
            0.116, 0.116, 0.117, 0.123, 0.151, 0.213, 0.302, 0.376, 0.376, 0.303, 0.215, 0.156,
            0.128, 0.118, 0.114, 0.113, 0.113, 0.113, 0.113,
        ],
    },
    brown: {
        hex: "#8B5A3C",
        strength: 0.35,
        rho: [
            0.051, 0.051, 0.051, 0.052, 0.054, 0.06, 0.068, 0.079, 0.097, 0.124, 0.161, 0.202,
            0.233, 0.249, 0.254, 0.255, 0.256, 0.256, 0.256,
        ],
    },
    black: {
        hex: "#22262E",
        strength: 0.06,
        rho: [
            0.028, 0.028, 0.028, 0.027, 0.026, 0.025, 0.023, 0.021, 0.02, 0.019, 0.018, 0.017,
            0.017, 0.017, 0.017, 0.017, 0.017, 0.017, 0.017,
        ],
    },
    white: {
        hex: "#FBFBF8",
        strength: 4,
        rho: [
            0.935, 0.935, 0.936, 0.937, 0.942, 0.949, 0.956, 0.961, 0.964, 0.965, 0.965, 0.964,
            0.964, 0.963, 0.963, 0.963, 0.963, 0.963, 0.963,
        ],
    },
};

/** Absorption over scattering, from a reflectance: the Kubelka-Munk function. */
const ks = (r: number): number => (1 - r) ** 2 / (2 * r);
/** The reflectance of an opaque layer with that ratio, the function's inverse. */
const reflect = (k: number): number => 1 + k - Math.sqrt(k * k + 2 * k);
const KS: Record<Pigment, number[]> = Object.fromEntries(
    PIGMENTS.map((p) => [p, BOX[p].rho.map(ks)]),
) as Record<Pigment, number[]>;

const toLinear = (v: number): number => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number): number =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
const byte = (v: number): number => Math.round(Math.max(0, Math.min(1, toGamma(v))) * 255);
export const hexOf = (rgb: readonly number[]): string =>
    `#${rgb
        .map((v) => Math.round(v).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()}`;
export const rgbOf = (hex: string): [number, number, number] =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

/** A paint as the parts of each pigment in it, which is how the tray and the record both say it. */
export interface Part {
    pigment: Pigment;
    parts: number;
}
export type Recipe = Part[];

/**
 * The colour of pigments mixed in these amounts, as bytes. Amounts are in pigment order and need not
 * add up to anything; the sheet calls this with the fractions it keeps per paint.
 */
export function mixAmounts(amounts: ArrayLike<number>): [number, number, number] {
    let total = 0;
    const w: number[] = [];
    PIGMENTS.forEach((p, j) => {
        const a = Math.max(0, amounts[j] ?? 0) * BOX[p].strength;
        w.push(a);
        total += a;
    });
    if (total <= 0) return rgbOf(BOX.white.hex);
    const lin = [0, 0, 0];
    for (let i = 0; i < BANDS; i++) {
        let k = 0;
        PIGMENTS.forEach((p, j) => {
            const weight = w[j] ?? 0;
            if (weight) k += weight * (KS[p][i] ?? 0);
        });
        const r = reflect(k / total);
        for (let c = 0; c < 3; c++) lin[c] = (lin[c] ?? 0) + r * (TO_RGB[i]?.[c] ?? 0);
    }
    return [byte(lin[0] ?? 0), byte(lin[1] ?? 0), byte(lin[2] ?? 0)];
}

export const amountsOf = (recipe: Recipe): number[] =>
    PIGMENTS.map((p) => recipe.filter((x) => x.pigment === p).reduce((s, x) => s + x.parts, 0));

/** The colour a recipe makes, as a hex string. */
export const mix = (recipe: Recipe): string => hexOf(mixAmounts(amountsOf(recipe)));

/** A pan's own colour, straight from the box. */
export const panColour = (p: Pigment): string => BOX[p].hex;

export const isPigment = (s: string): s is Pigment => (PIGMENTS as readonly string[]).includes(s);

/**
 * A recipe as it is written in a drawing's setting or an answer: "yellow+blue", "yellow 2 + blue",
 * "red and white", "blue*2, yellow". Anything else is null, so a checker can say what is wrong.
 */
export function parseRecipe(s: string): Recipe | null {
    const out: Recipe = [];
    for (const raw of s
        .trim()
        .toLowerCase()
        .split(/\s*(?:\+|,|\band\b)\s*/)
        .filter(Boolean)) {
        const m = /^(?:(\d+)\s*(?:x|\*)?\s*)?([a-z]+)(?:\s*(?:x|\*)?\s*(\d+))?$/.exec(raw.trim());
        const pigment = m?.[2] ?? "";
        if (!m || !isPigment(pigment)) return null;
        const parts = Number(m[1] ?? m[3] ?? 1);
        if (!(parts > 0)) return null;
        const had = out.find((x) => x.pigment === pigment);
        if (had) had.parts += parts;
        else out.push({ pigment, parts });
    }
    return out.length ? out : null;
}

/** "yellow and blue", or "yellow 2 and blue 1" when the parts differ. */
export function recipeText(recipe: Recipe): string {
    const even = recipe.every((x) => x.parts === recipe[0]?.parts);
    const words = recipe.map((x) => (even ? x.pigment : `${x.pigment} ${x.parts}`));
    return words.length > 1
        ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`
        : (words[0] ?? "");
}

/** OKLCH, Björn Ottosson's perceptual space, for naming a colour and telling warm from cool. */
export function oklch(hex: string): { l: number; c: number; h: number } {
    const [r = 0, g = 0, b = 0] = rgbOf(hex).map((v) => toLinear(v / 255));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

export const COLOUR_NAMES = [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "brown",
    "grey",
    "black",
    "white",
] as const;
export type ColourName = (typeof COLOUR_NAMES)[number];

/** Where one hue name gives way to the next, in OKLCH degrees: red, orange, yellow, green, blue, purple. */
const HUE_LINES = [350, 35, 75, 110, 185, 275];
const hueName = (h: number): ColourName =>
    h >= 350 || h < 35
        ? "red"
        : h < 75
          ? "orange"
          : h < 110
            ? "yellow"
            : h < 185
              ? "green"
              : h < 275
                ? "blue"
                : "purple";
const degreesApart = (a: number, b: number): number =>
    Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

/**
 * The word a child would use for a colour, and whether the word is safe: a colour within a few
 * degrees or a few hundredths of the line between two names (a red that is nearly orange, a pink that
 * is nearly red) is named but marked `close`, and the mixing checker refuses a question resting on it.
 */
export function nameOf(hex: string): { name: ColourName; close: boolean } {
    const { l, c, h } = oklch(hex);
    if (l < 0.3) return { name: "black", close: l > 0.28 };
    if (c < 0.03) return { name: l > 0.95 ? "white" : "grey", close: c > 0.026 };
    if ((h >= 330 || h < 35) && l >= 0.75)
        return { name: "pink", close: l < 0.77 || degreesApart(h, 35) < 5 };
    if (h >= 20 && h < 100 && l < 0.62 && c < 0.12)
        return { name: "brown", close: l > 0.6 || c > 0.11 };
    if (c < 0.05 && l < 0.8) return { name: "grey", close: c > 0.045 || l > 0.78 };
    const name = hueName(h);
    return {
        name,
        close: HUE_LINES.some((at) => degreesApart(h, at) < 5) || (name === "red" && l > 0.73),
    };
}

/**
 * Warm or cool, the way a classroom sorts them: reds, oranges, yellows and pinks are warm; greens,
 * blues and purples are cool. A yellow-green or a magenta is neither, and a question on it is refused.
 */
export function warmth(hex: string): "warm" | "cool" | null {
    const { c, h } = oklch(hex);
    if (c < 0.03) return null;
    if (h >= 345 || h < 100) return "warm";
    if (h >= 135 && h < 330) return "cool";
    return null;
}

/** Whether a colour is lighter than another, in OKLCH lightness, for tints and shades. */
export const lightness = (hex: string): number => oklch(hex).l;

/** The colour a setting names: a pigment, or a recipe such as "yellow+blue". Empty or unreadable is null. */
export function colourOf(s: string): string | null {
    const r = parseRecipe(s);
    return r ? mix(r) : null;
}

/**
 * On paper each colour family prints as its own hatch, in step with HATCH in engine/paper.ts, so a
 * yellow pot is dotted like the glow and a blue one leans like the sky. The name is always written
 * beside it as well.
 */
const PAPER: Record<
    ColourName,
    { style: "hachure" | "cross-hatch" | "dots" | "zigzag"; angle: number; gap: number }
> = {
    yellow: { style: "dots", angle: 0, gap: 5 },
    orange: { style: "cross-hatch", angle: -45, gap: 6 },
    red: { style: "hachure", angle: 0, gap: 4 },
    pink: { style: "hachure", angle: 0, gap: 7 },
    blue: { style: "hachure", angle: -45, gap: 4.5 },
    green: { style: "hachure", angle: 45, gap: 4.5 },
    purple: { style: "hachure", angle: 90, gap: 4.5 },
    brown: { style: "cross-hatch", angle: 0, gap: 4 },
    grey: { style: "zigzag", angle: 30, gap: 6 },
    black: { style: "hachure", angle: 0, gap: 1.5 },
    white: { style: "hachure", angle: 0, gap: 0 },
};

/**
 * A fill in a mixed colour: the colour itself on screen, its family's hatch on paper. It reads only
 * whether the drawing's context is paper and its card and ink, since this module reaches nothing in
 * engine/ink, and what it returns is a pen fill.
 */
export function paintFill(
    c: { paper: boolean; t: { card: string; ink: string } },
    hex: string,
    k = 1,
): {
    fill: string;
    fillStyle: "solid" | "hachure" | "cross-hatch" | "dots" | "zigzag";
    hachureAngle?: number;
    hachureGap?: number;
    fillWeight?: number;
} {
    if (!c.paper) return { fill: hex, fillStyle: "solid" };
    const name = nameOf(hex).name,
        l = lightness(hex);
    if (name === "white" || l > 0.93) return { fill: c.t.card, fillStyle: "solid" };
    if (name === "black") return { fill: c.t.ink, fillStyle: "solid" };
    // a pale tint prints as a sparse hatch, so a sky or a far hill does not print as a dark block
    const h = PAPER[name],
        pale = l > 0.85 ? 2.6 : l > 0.75 ? 1.8 : l > 0.66 ? 1.3 : 1;
    return {
        fill: c.t.ink,
        fillStyle: h.style,
        hachureAngle: h.angle,
        hachureGap: (h.gap * pale) / k,
        fillWeight: (h.style === "dots" ? 1.3 : 0.7) / k,
    };
}
