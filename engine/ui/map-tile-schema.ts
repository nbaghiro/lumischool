import type { Rect } from "../space";

/**
 * A tile's layers: the sea, the land in pencil and in colour, the landscape's marks baked all in pencil
 * and all in colour, and its waves, whose colour the page gives them by how far the colour has come.
 */
export const TILE_LAYERS = [
    "sea",
    "pencil",
    "land",
    "colour",
    "marks-pencil",
    "marks-colour",
    "waves",
] as const;
export type TileLayer = (typeof TILE_LAYERS)[number];

/** Small JSON index; cells hold row-major descriptor IDs, one for each of `TILE_LAYERS` in turn. */
export type TileDescriptor =
    | { kind: "empty" }
    | { kind: "solid"; rgba: [number, number, number, number] }
    | { kind: "image"; path: string; bytes: number }
    | { kind: "lines"; path: string; bytes: number };

/**
 * Strokes of one style, binned by place so a frame strokes only the bins it shows; each `d` holds
 * a bin's subpaths, written relative, and `box` reaches as far as they are drawn.
 */
export interface LineRun {
    stroke: string;
    width: number;
    dash: number[];
    parts: { box: Rect; d: string }[];
}
/** Strokes that composite together, as an SVG group with an opacity does. */
export interface LineGroup {
    alpha: number;
    runs: LineRun[];
}
/** The thin strokes of one chunk, drawn over each layer's raster at screen resolution. */
export type CellLines = Partial<Record<"pencil" | "colour", LineGroup[]>>;

export interface TileIndex {
    descriptors: TileDescriptor[];
    levels: {
        level: number;
        columns: number;
        rows: number;
        cells: number[];
    }[];
    /** Chunks of the thin strokes, row-major over one level's grid; the rasters above the root leave them out. */
    lines: {
        level: number;
        /** Strokes are whole inside this rect and fade out towards the bounds, as the raster does. */
        inner: Rect;
        /** How far a chunk's strokes reach past its cell, in world units. */
        bleed: number;
        cells: number[];
    };
}

export function tileDescriptor(
    index: TileIndex,
    level: number,
    x: number,
    y: number,
    layer: TileLayer,
): TileDescriptor | undefined {
    const grid = index.levels.find((entry) => entry.level === level);
    if (!grid || x < 0 || y < 0 || x >= grid.columns || y >= grid.rows) return undefined;
    const id = grid.cells[(y * grid.columns + x) * TILE_LAYERS.length + TILE_LAYERS.indexOf(layer)];
    return id === undefined ? undefined : index.descriptors[id];
}

/** Undefined off the lines level; empty where a cell has no thin strokes. */
export function lineDescriptor(
    index: TileIndex,
    level: number,
    x: number,
    y: number,
): TileDescriptor | undefined {
    const grid = index.levels.find((entry) => entry.level === level);
    if (!grid || level !== index.lines.level) return undefined;
    if (x < 0 || y < 0 || x >= grid.columns || y >= grid.rows) return undefined;
    const id = index.lines.cells[y * grid.columns + x];
    return id === undefined ? undefined : index.descriptors[id];
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;
export const isRect = (v: unknown): v is Rect =>
    isRecord(v) && [v.x, v.y, v.w, v.h].every((n) => typeof n === "number");
export const numbers = (v: unknown): v is number[] =>
    Array.isArray(v) && v.every((n) => typeof n === "number");

/** The tile index as the exporter writes it, or a problem. */
export function readTileIndex(value: unknown): TileIndex | Error {
    if (!isRecord(value) || !Array.isArray(value.descriptors) || !Array.isArray(value.levels))
        return new Error("Map imagery index is invalid");
    const descriptors: TileDescriptor[] = [];
    for (const d of value.descriptors as unknown[]) {
        if (!isRecord(d)) return new Error("A map tile is malformed");
        if (d.kind === "empty") descriptors.push({ kind: "empty" });
        else if (d.kind === "solid" && numbers(d.rgba) && d.rgba.length === 4) {
            const [r = 0, g = 0, b = 0, a = 0] = d.rgba;
            descriptors.push({ kind: "solid", rgba: [r, g, b, a] });
        } else if (
            (d.kind === "image" || d.kind === "lines") &&
            typeof d.path === "string" &&
            typeof d.bytes === "number"
        )
            descriptors.push({ kind: d.kind, path: d.path, bytes: d.bytes });
        else return new Error("A map tile is malformed");
    }
    const levels: TileIndex["levels"] = [];
    for (const l of value.levels as unknown[]) {
        if (
            !isRecord(l) ||
            typeof l.level !== "number" ||
            typeof l.columns !== "number" ||
            typeof l.rows !== "number" ||
            !numbers(l.cells)
        )
            return new Error("A map tile level is malformed");
        levels.push({ level: l.level, columns: l.columns, rows: l.rows, cells: l.cells });
    }
    const lines = value.lines;
    if (
        !isRecord(lines) ||
        typeof lines.level !== "number" ||
        typeof lines.bleed !== "number" ||
        !isRect(lines.inner) ||
        !numbers(lines.cells)
    )
        return new Error("The map's lines index is malformed");
    return {
        descriptors,
        levels,
        lines: { level: lines.level, inner: lines.inner, bleed: lines.bleed, cells: lines.cells },
    };
}
