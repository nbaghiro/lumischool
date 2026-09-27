import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
    compactArtifactVersion,
    readIndexFile,
    readTileBuild,
    tileSourceHash,
} from "../map-tile-artifacts";
import { test } from "node:test";
import { lineDescriptor, TILE_LAYERS, tileDescriptor } from "../../../engine/ui/map-tile-schema";
import { MAP_TILES } from "../../../engine/ui/map-tile-manifest";

const assets = new URL(`../../../public/assets/map-tiles/${MAP_TILES.version}/`, import.meta.url);

test("published map manifest and every tile agree on coverage, version and bounded pixel size", async () => {
    assert.match(MAP_TILES.version, /^[a-f0-9]{16}$/);
    assert.deepEqual(
        JSON.parse(await readFile(new URL("manifest.json", assets), "utf8")),
        MAP_TILES,
    );
    const side = MAP_TILES.tileSize + 2 * MAP_TILES.gutter;
    assert.ok(side > 0 && side <= 1024);
    assert.ok(MAP_TILES.bounds.w > 0 && MAP_TILES.bounds.h > 0);
    assert.ok(MAP_TILES.levels.length > 0);
    let previous: number | undefined;
    for (const [index, level] of MAP_TILES.levels.entries()) {
        assert.equal(level.level, index);
        assert.ok(level.span > 0);
        if (previous !== undefined) assert.equal(level.span, previous / 2);
        else assert.ok(level.span >= Math.max(MAP_TILES.bounds.w, MAP_TILES.bounds.h));
        previous = level.span;
        const tileIndex = readIndexFile(fileURLToPath(new URL("index.json", assets)));
        const grid = tileIndex.levels.find((entry) => entry.level === level.level);
        assert.ok(grid);
        assert.equal(grid.columns, Math.ceil(MAP_TILES.bounds.w / level.span));
        assert.equal(grid.rows, Math.ceil(MAP_TILES.bounds.h / level.span));
        assert.equal(grid.cells.length, grid.columns * grid.rows * TILE_LAYERS.length);
        for (let y = 0; y < grid.rows; y++)
            for (let x = 0; x < grid.columns; x++)
                for (const layer of TILE_LAYERS)
                    assert.ok(tileDescriptor(tileIndex, level.level, x, y, layer));
    }
    const index = readIndexFile(fileURLToPath(new URL("index.json", assets)));
    const chunks = index.levels.find((entry) => entry.level === index.lines.level);
    assert.ok(chunks);
    assert.equal(index.lines.cells.length, chunks.columns * chunks.rows);
    assert.ok(index.lines.bleed >= 0 && index.lines.bleed < chunks.columns * 1000);
    for (let y = 0; y < chunks.rows; y++)
        for (let x = 0; x < chunks.columns; x++)
            assert.match(lineDescriptor(index, chunks.level, x, y)?.kind ?? "", /^(lines|empty)$/);
    assert.equal(lineDescriptor(index, chunks.level + 1, 0, 0), undefined);
});

test("published tiles match source dependencies and their immutable image-byte identity", async () => {
    const build = readTileBuild(
        JSON.parse(await readFile(new URL("build.json", assets), "utf8")) as unknown,
    );
    if (build instanceof Error) throw build;
    const root = fileURLToPath(new URL("../../../", import.meta.url));
    assert.ok(build.sourceFiles.length > 0);
    assert.equal(
        tileSourceHash(root, build.sourceFiles),
        build.sourceHash,
        "Tile source changed: run npm run map:tiles before release",
    );
    const recipe = {
        bounds: MAP_TILES.bounds,
        tileSize: MAP_TILES.tileSize,
        gutter: MAP_TILES.gutter,
        levels: MAP_TILES.levels,
    };
    const index = readIndexFile(fileURLToPath(new URL("index.json", assets)));
    const paths = index.descriptors.flatMap((d) => (d.kind === "image" ? [d.path] : []));
    assert.equal(new Set(paths).size, paths.length);
    assert.deepEqual(
        (await readdir(new URL("images/", assets))).sort(),
        paths.map((p) => p.slice(7)).sort(),
    );
    const lines = index.descriptors.flatMap((d) => (d.kind === "lines" ? [d] : []));
    assert.ok(lines.length > 0);
    assert.deepEqual(
        (await readdir(new URL("lines/", assets))).sort(),
        lines.map((d) => d.path.slice(6)).sort(),
    );
    for (const d of lines) {
        assert.match(d.path, /^lines\/[a-f0-9]{64}\.json$/);
        assert.equal((await readFile(new URL(d.path, assets))).length, d.bytes);
    }
    for (const descriptor of index.descriptors) {
        if (descriptor.kind === "image") {
            assert.match(descriptor.path, /^images\/[a-f0-9]{64}\.png$/);
            const png = await readFile(new URL(descriptor.path, assets));
            assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
            const side = MAP_TILES.tileSize + 2 * MAP_TILES.gutter;
            assert.equal(png.readUInt32BE(16), side);
            assert.equal(png.readUInt32BE(20), side);
            assert.equal(descriptor.bytes, side ** 2 * 4);
        } else if (descriptor.kind === "solid") {
            assert.equal(descriptor.rgba.length, 4);
            assert.ok(descriptor.rgba.every((n) => Number.isInteger(n) && n >= 0 && n <= 255));
        } else assert.match(descriptor.kind, /^(empty|lines)$/);
    }
    assert.equal(
        compactArtifactVersion(fileURLToPath(assets), recipe, build, index),
        MAP_TILES.version,
    );
});
