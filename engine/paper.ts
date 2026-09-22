/** User units per square. One square is 20 px at 1x on screen and 5 mm on paper. */
export const U = 20;

/** The square's side on paper, in millimetres. */
export const SQUARE_MM = 5;

export type PageSize = "A3" | "A4" | "Letter" | "Tabloid";

/** Sheets in millimetres, portrait. A3 is two A4s side by side, so the two have the same shape. */
export const PAGE_SIZES: Record<PageSize, { w: number; h: number }> = {
    A3: { w: 297, h: 420 },
    A4: { w: 210, h: 297 },
    Letter: { w: 215.9, h: 279.4 },
    Tabloid: { w: 279.4, h: 431.8 },
};

/**
 * A lesson sheet's margins, in squares from its edges. Writing starts at column `left`, one square
 * past the margin rule on column 4, and nothing but the footer sits in the bottom `bottom` rows.
 */
export const MARGINS = { left: 5, top: 2, bottom: 3 };

/** An A4 sheet across, in squares. A4 is the narrowest sheet we print on, so every sheet has this many. */
export const SHEET_COLS = PAGE_SIZES.A4.w / SQUARE_MM;

/** The widest a scene may be: it starts at the writing column and has the rest of the sheet. */
export const SCENE_COLS = SHEET_COLS - MARGINS.left;

/** How wide a line of text is set on a sheet, in squares. */
export const TEXT_COLS = 34;

/**
 * Ticks on a number line are always one square apart, whatever the step, so a line in tenths is
 * as wide as a line in ones. The drawing and the layout both count them, so the count lives here
 * with the squares themselves.
 */
export const lineTicks = (from: number, to: number, step: number): number =>
    Math.max(1, Math.round((to - from) / (step || 1))) + 1;

export const TOKEN_NAMES = [
    "paper",
    "grid",
    "ink",
    "ink-soft",
    "pen",
    "glow",
    "glow-ink",
    "sky",
    "mint",
    "berry",
    "tang",
    "ok",
    "card",
] as const;
export type TokenName = (typeof TOKEN_NAMES)[number];
export type Tokens = Record<TokenName, string>;

type Swatch = Record<TokenName | "margin", string>;

/**
 * engine/ui/palette.css as data, for a drawing that cannot read CSS. `desk` is the page the work sits
 * on and `paper` is every drawing surface. engine/__tests__/paper.test.ts fails if the two differ.
 */
export const PALETTE: { desk: Swatch & { shade: string }; paper: Swatch } = {
    desk: {
        paper: "#f4f6f8",
        grid: "#dce3ea",
        margin: "#e8a1a8",
        ink: "#22262e",
        "ink-soft": "#5b6270",
        pen: "#2a4bbf",
        glow: "#ffd64a",
        "glow-ink": "#5a4300",
        sky: "#8cc7ef",
        mint: "#93d5b3",
        berry: "#f39cbf",
        tang: "#f7aa57",
        ok: "#23845a",
        card: "#ffffff",
        shade: "#1b25400f",
    },
    paper: {
        paper: "#ffffff",
        grid: "#c9d9e8",
        margin: "#e59aa3",
        ink: "#2b2f37",
        "ink-soft": "#5b6270",
        pen: "#2a4bbf",
        glow: "#ffd64a",
        "glow-ink": "#5a4300",
        sky: "#8cc7ef",
        mint: "#93d5b3",
        berry: "#f39cbf",
        tang: "#f7aa57",
        ok: "#23845a",
        card: "#ffffff",
    },
};

/** The faces palette.css names `--f-hand`, `--f-read` and `--f-mono`. */
export const FONTS = {
    hand: '"Shantell Sans Variable", "Comic Neue", "Chalkboard SE", cursive',
    read: '"Andika", "Atkinson Hyperlegible", Verdana, sans-serif',
    mono: '"Spline Sans Mono Variable", ui-monospace, Menlo, monospace',
};

/** Printed output is always black on white; colour becomes hatching (see HATCH). */
export const PRINT: Tokens = {
    paper: "#FFFFFF",
    grid: "#E2E2E2",
    ink: "#161616",
    "ink-soft": "#555555",
    pen: "#161616",
    glow: "#161616",
    "glow-ink": "#161616",
    sky: "#161616",
    mint: "#161616",
    berry: "#161616",
    tang: "#161616",
    ok: "#161616",
    card: "#FFFFFF",
};

/** Roughness levels. Anything a child counts or measures uses "ruler". */
export type Level = "ruler" | "pencil" | "doodle";
export const LEVELS: Record<Level, { roughness: number; bowing: number }> = {
    ruler: { roughness: 0.35, bowing: 0.4 },
    pencil: { roughness: 1.0, bowing: 1 },
    doodle: { roughness: 1.9, bowing: 2 },
};

export type Marker = "sky" | "mint" | "berry" | "tang" | "glow";
export const MARKERS: Marker[] = ["sky", "mint", "berry", "tang", "glow"];
/** Each marker's colour in the plain word a description uses. */
export const MARKER_WORD: Record<Marker, string> = {
    sky: "blue",
    mint: "green",
    berry: "pink",
    tang: "orange",
    glow: "yellow",
};

/** A colour's channels, from its six-digit hex. */
export const rgb = (hex: string): [number, number, number] => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** A colour washed over white paper at an opacity, as the colour a child actually sees. */
export function washed(hex: string, opacity: number): [number, number, number] {
    const [r, g, b] = rgb(hex);
    const mix = (c: number) => Math.round(255 + (c - 255) * opacity);
    return [mix(r), mix(g), mix(b)];
}

export type FillStyle =
    "solid" | "hachure" | "cross-hatch" | "dots" | "zigzag" | "dashed" | "zigzag-line";

/** On paper each marker colour becomes its own hatch, so objects stay distinct in black and white. */
export const HATCH: Partial<Record<TokenName, { angle?: number; style?: FillStyle }>> = {
    sky: { angle: -45 },
    mint: { angle: 45 },
    berry: { angle: 0 },
    tang: { angle: -45, style: "cross-hatch" },
    glow: { style: "dots" },
    "ink-soft": { angle: 90 },
};

/**
 * Six skin tones, light to deep, evenly spaced in lightness (OKLCH 0.94 to 0.46). On paper a tone
 * prints as a flat grey of its lightness rather than a hatch, because a face's features sit on it.
 */
export const SKIN: readonly { screen: string; print: string }[] = [
    { screen: "#F7E9D6", print: "#FFFFFF" },
    { screen: "#E8CCAF", print: "#F2F2F2" },
    { screen: "#D5AB86", print: "#E4E4E4" },
    { screen: "#BC8965", print: "#D3D3D3" },
    { screen: "#98674C", print: "#BEBEBE" },
    { screen: "#744D3C", print: "#A8A8A8" },
];

export const HAIR_COLOURS = ["black", "brown", "auburn", "blonde", "grey", "white"] as const;
export type HairColour = (typeof HAIR_COLOURS)[number];

/**
 * Hair by colour: its fill, the strand drawn over it, and how it prints. Hair on paper is a texture,
 * so it prints as a hatch whose gap follows its darkness, as dots when it is fair, and as the card
 * when it is grey or white.
 */
export const HAIR: Record<
    HairColour,
    { screen: string; strand: string; print: number | "dots" | "open" }
> = {
    black: { screen: "#372B26", strand: "#6E5D52", print: 2.4 },
    brown: { screen: "#684734", strand: "#9C7659", print: 3.3 },
    auburn: { screen: "#A55A37", strand: "#D2905F", print: 4.4 },
    blonde: { screen: "#E6C686", strand: "#B8924A", print: "dots" },
    grey: { screen: "#B4B8BB", strand: "#7D8288", print: "open" },
    white: { screen: "#E9E8E3", strand: "#A9ABAE", print: "open" },
};
