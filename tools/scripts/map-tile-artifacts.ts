import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    constants,
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { join, relative, isAbsolute } from "node:path";
import { compactTiles } from "./map-tile-compaction";
import {
    isRecord,
    readTileIndex,
    TILE_LAYERS,
    type TileIndex,
} from "../../engine/ui/map-tile-schema";
import type { Rect } from "../../engine/space";

export interface TileRecipe {
    bounds: Rect;
    tileSize: number;
    gutter: number;
    levels: readonly { level: number; span: number }[];
}
export interface TileBuild {
    sourceFingerprint: string;
    sourceHash: string;
    sourceFiles: string[];
    renderer: string;
}

/** A build record as the exporter writes it, or a problem. */
export function readTileBuild(value: unknown): TileBuild | Error {
    if (
        !isRecord(value) ||
        typeof value.sourceFingerprint !== "string" ||
        typeof value.sourceHash !== "string" ||
        typeof value.renderer !== "string" ||
        !Array.isArray(value.sourceFiles) ||
        !value.sourceFiles.every((f): f is string => typeof f === "string")
    )
        return new Error("The tile build record is malformed");
    return {
        sourceFingerprint: value.sourceFingerprint,
        sourceHash: value.sourceHash,
        sourceFiles: value.sourceFiles,
        renderer: value.renderer,
    };
}

/** A published index read back, which must be what the exporter wrote. */
export function readIndexFile(path: string): TileIndex {
    const index = readTileIndex(JSON.parse(readFileSync(path, "utf8")) as unknown);
    if (index instanceof Error) throw index;
    return index;
}

export function tileNames(recipe: TileRecipe): string[] {
    const files: string[] = [];
    for (const { level, span } of recipe.levels)
        for (let y = 0; y < Math.ceil(recipe.bounds.h / span); y++)
            for (let x = 0; x < Math.ceil(recipe.bounds.w / span); x++)
                for (const layer of TILE_LAYERS) files.push(`${level}/${x}-${y}-${layer}.png`);
    return files;
}

export function tileSourceHash(root: string, files: readonly string[]): string {
    const hash = createHash("sha256");
    for (const file of [...files].sort()) {
        const path = relative(root, join(root, file));
        if (isAbsolute(file) || path.startsWith(".."))
            throw new Error(`Invalid tile source path: ${file}`);
        const data = readFileSync(join(root, file));
        hash.update(`${file}\0${data.length}\0`).update(data);
    }
    return hash.digest("hex");
}

/** The final identity covers actual compressed pixels, not just the instructions used to draw them. */
export function tileArtifactVersion(folder: string, recipe: TileRecipe, build: TileBuild): string {
    const hash = createHash("sha256").update(
        JSON.stringify({
            recipe,
            sourceFingerprint: build.sourceFingerprint,
            sourceHash: build.sourceHash,
        }),
    );
    for (const name of tileNames(recipe)) {
        const data = readFileSync(join(folder, name));
        hash.update(`${name}\0${data.length}\0`).update(data);
    }
    return hash.digest("hex").slice(0, 16);
}

export function publishMapTiles(
    root: string,
    staging: string,
    recipe: TileRecipe,
    build: TileBuild,
): string {
    const version = tileArtifactVersion(staging, recipe, build);
    mkdirSync(join(root, "public/assets/map-tiles"), { recursive: true });
    const target = join(root, "public/assets/map-tiles", version);
    const manifest = { version, ...recipe };
    if (!existsSync(target)) {
        const temporary = mkdtempSync(join(root, "node_modules/.cache/map-publish-"));
        try {
            for (const name of tileNames(recipe)) {
                const destination = join(temporary, name);
                mkdirSync(join(temporary, String(name.split("/")[0])), { recursive: true });
                copyFileSync(join(staging, name), destination, constants.COPYFILE_FICLONE);
            }
            writeFileSync(join(temporary, "build.json"), JSON.stringify(build));
            writeFileSync(join(temporary, "manifest.json"), JSON.stringify(manifest));
            renameSync(temporary, target);
        } finally {
            rmSync(temporary, { recursive: true, force: true });
        }
    } else {
        if (tileArtifactVersion(target, recipe, build) !== version)
            throw new Error(`Immutable tile collision: ${version}`);
        if (!existsSync(join(target, "manifest.json")))
            throw new Error(`Incomplete tile publication: ${version}`);
    }
    writeManifest(root, manifest);
    keepOnly(root, version);
    return version;
}

export function compactArtifactVersion(
    folder: string,
    recipe: TileRecipe,
    build: TileBuild,
    index: TileIndex,
): string {
    const hash = createHash("sha256").update(
        JSON.stringify({
            recipe,
            sourceFingerprint: build.sourceFingerprint,
            sourceHash: build.sourceHash,
            index,
        }),
    );
    for (const descriptor of index.descriptors)
        if (descriptor.kind === "image" || descriptor.kind === "lines") {
            const data = readFileSync(join(folder, descriptor.path));
            hash.update(`${descriptor.path}\0${data.length}\0`).update(data);
        }
    return hash.digest("hex").slice(0, 16);
}

export function publishCompactMapTiles(
    root: string,
    staging: string,
    recipe: TileRecipe,
    build: TileBuild,
): string {
    const { index, files } = compactTiles(staging, recipe);
    const temporary = mkdtempSync(join(root, "node_modules/.cache/map-publish-"));
    try {
        mkdirSync(join(temporary, "images"));
        mkdirSync(join(temporary, "lines"));
        for (const [path, source] of files)
            copyFileSync(join(staging, source), join(temporary, path), constants.COPYFILE_FICLONE);
        const version = compactArtifactVersion(temporary, recipe, build, index);
        const manifest = { version, ...recipe, index: "index.json" };
        const target = join(root, "public/assets/map-tiles", version);
        mkdirSync(join(root, "public/assets/map-tiles"), { recursive: true });
        writeFileSync(join(temporary, "build.json"), JSON.stringify(build));
        writeFileSync(join(temporary, "manifest.json"), JSON.stringify(manifest));
        writeFileSync(join(temporary, "index.json"), JSON.stringify(index));
        if (existsSync(target)) {
            const saved = readIndexFile(join(target, "index.json"));
            if (compactArtifactVersion(target, recipe, build, saved) !== version)
                throw new Error(`Immutable tile collision: ${version}`);
        } else renameSync(temporary, target);
        writeManifest(root, manifest);
        keepOnly(root, version);
        process.stdout.write(
            `compact tiles: ${files.size} unique files, ${index.descriptors.length} descriptors, ${JSON.stringify(index).length} index bytes\n`,
        );
        return version;
    } finally {
        rmSync(temporary, { recursive: true, force: true });
    }
}

/**
 * Removes every published version but `version`, so one tile set is kept and tracked in git and
 * production serves only it; a page still holding an older manifest loads the new one when reloaded.
 */
function keepOnly(root: string, version: string): void {
    const folder = join(root, "public/assets/map-tiles");
    for (const entry of readdirSync(folder))
        if (entry !== version) rmSync(join(folder, entry), { recursive: true, force: true });
}

function writeManifest(root: string, manifest: object): void {
    const file = join(root, "engine/ui/map-tile-manifest.ts");
    writeFileSync(
        file,
        `// Generated by npm run map:tiles from the seeded terrain painter.\nexport const MAP_TILES = ${JSON.stringify(manifest, null, 4)} as const;\n`,
    );
    execFileSync(join(import.meta.dirname, "../../node_modules/.bin/prettier"), ["--write", file], {
        stdio: "ignore",
    });
}
