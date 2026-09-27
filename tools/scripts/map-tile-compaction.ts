import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import {
    isRecord,
    isRect,
    TILE_LAYERS,
    type TileDescriptor,
    type TileIndex,
} from "../../engine/ui/map-tile-schema";

/** What the export wrote about its line chunks, as the index carries it. */
function readLinesMeta(value: unknown): Omit<TileIndex["lines"], "cells"> {
    if (
        !isRecord(value) ||
        typeof value.level !== "number" ||
        typeof value.bleed !== "number" ||
        !isRect(value.inner)
    )
        throw new Error("The map's lines.json is malformed");
    return { level: value.level, inner: value.inner, bleed: value.bleed };
}
import type { TileRecipe } from "./map-tile-artifacts";

/** Exported Chrome PNGs are non-interlaced RGB/RGBA8. Reject unsupported formats, never guess. */
export function uniformPng(png: Buffer): TileDescriptor | null {
    if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Invalid PNG");
    const w = png.readUInt32BE(16),
        h = png.readUInt32BE(20),
        type = png[25];
    if (png[24] !== 8 || (type !== 2 && type !== 6) || png[28] !== 0)
        throw new Error("Unsupported exported PNG format");
    const bpp = type === 6 ? 4 : 3,
        stride = w * bpp;
    const chunks: Buffer[] = [];
    for (let at = 8; at < png.length;) {
        const size = png.readUInt32BE(at),
            name = png.toString("ascii", at + 4, at + 8);
        if (name === "IDAT") chunks.push(png.subarray(at + 8, at + 8 + size));
        at += size + 12;
    }
    const raw = inflateSync(Buffer.concat(chunks), { maxOutputLength: (stride + 1) * h });
    if (raw.length !== (stride + 1) * h) throw new Error("Invalid PNG pixel length");
    let previous = new Uint8Array(stride);
    let colour: [number, number, number, number] | undefined;
    for (let y = 0; y < h; y++) {
        const row = new Uint8Array(stride),
            offset = y * (stride + 1),
            filter = raw[offset];
        if (filter === undefined || filter > 4) throw new Error("Invalid PNG filter");
        for (let i = 0; i < stride; i++) {
            const a = i >= bpp ? (row[i - bpp] ?? 0) : 0,
                b = previous[i] ?? 0,
                c = i >= bpp ? (previous[i - bpp] ?? 0) : 0;
            const p = a + b - c,
                pa = Math.abs(p - a),
                pb = Math.abs(p - b),
                pc = Math.abs(p - c);
            const predictor =
                filter === 0
                    ? 0
                    : filter === 1
                      ? a
                      : filter === 2
                        ? b
                        : filter === 3
                          ? Math.floor((a + b) / 2)
                          : pa <= pb && pa <= pc
                            ? a
                            : pb <= pc
                              ? b
                              : c;
            row[i] = ((raw[offset + 1 + i] ?? 0) + predictor) & 255;
        }
        for (let x = 0; x < stride; x += bpp) {
            const alpha = bpp === 4 ? (row[x + 3] ?? 0) : 255;
            const pixel: [number, number, number, number] =
                alpha === 0 ? [0, 0, 0, 0] : [row[x] ?? 0, row[x + 1] ?? 0, row[x + 2] ?? 0, alpha];
            if (!colour) colour = pixel;
            else if (pixel.some((value, i) => value !== colour?.[i])) return null;
        }
        previous = row;
    }
    if (!colour) throw new Error("Empty PNG dimensions");
    return colour[3] === 0 ? { kind: "empty" } : { kind: "solid", rgba: colour };
}

export function compactTiles(
    folder: string,
    recipe: TileRecipe,
): { index: TileIndex; files: Map<string, string> } {
    const index: TileIndex = {
            descriptors: [],
            levels: [],
            lines: { level: 0, inner: recipe.bounds, bleed: 0, cells: [] },
        },
        ids = new Map<string, number>(),
        files = new Map<string, string>();
    const put = (descriptor: TileDescriptor): number => {
        const key = JSON.stringify(descriptor);
        let id = ids.get(key);
        if (id === undefined) {
            id = index.descriptors.length;
            ids.set(key, id);
            index.descriptors.push(descriptor);
        }
        return id;
    };
    for (const { level, span } of recipe.levels) {
        const columns = Math.ceil(recipe.bounds.w / span),
            rows = Math.ceil(recipe.bounds.h / span),
            cells: number[] = [];
        for (let y = 0; y < rows; y++)
            for (let x = 0; x < columns; x++)
                for (const layer of TILE_LAYERS) {
                    const source = `${level}/${x}-${y}-${layer}.png`,
                        png = readFileSync(join(folder, source));
                    const uniform = uniformPng(png);
                    const path = `images/${createHash("sha256").update(png).digest("hex")}.png`;
                    cells.push(
                        put(
                            uniform ?? {
                                kind: "image",
                                path,
                                bytes: (recipe.tileSize + 2 * recipe.gutter) ** 2 * 4,
                            },
                        ),
                    );
                    if (!uniform) files.set(path, source);
                }
        index.levels.push({ level, columns, rows, cells });
    }
    const meta = readLinesMeta(
        JSON.parse(readFileSync(join(folder, "lines.json"), "utf8")) as unknown,
    );
    const grid = index.levels.find((entry) => entry.level === meta.level);
    if (!grid) throw new Error(`No level ${meta.level} for the map's lines`);
    index.lines = { ...meta, cells: [] };
    for (let y = 0; y < grid.rows; y++)
        for (let x = 0; x < grid.columns; x++) {
            const source = `${meta.level}/${x}-${y}-lines.json`;
            if (!existsSync(join(folder, source))) {
                index.lines.cells.push(put({ kind: "empty" }));
                continue;
            }
            const data = readFileSync(join(folder, source));
            const path = `lines/${createHash("sha256").update(data).digest("hex")}.json`;
            index.lines.cells.push(put({ kind: "lines", path, bytes: data.length }));
            files.set(path, source);
        }
    return { index, files };
}
