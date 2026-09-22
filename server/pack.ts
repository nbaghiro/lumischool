// The pack the API serves a family's lessons from, read from the folder `npm run pack` wrote
// (tools/pack.ts). A file is read once and kept, and only a file the index names is served, a
// lesson's or its first drawing's, so a path is never a way past the folder.

import { existsSync, readFileSync, watch } from "node:fs";
import { join } from "node:path";
import { readIndex, type PackIndex } from "../engine/pack";

export interface Pack {
    /** sha256 of the index's text, which names the pack and every request for its files. */
    digest: string;
    index: PackIndex;
    /** A file the index names, a lesson's or its first drawing's, as JSON text, or null for any other path. */
    file(path: string): string | null;
}

/** The pack `current` names in a folder, or null when there is none, with the reason on `problem`. */
export function loadPack(dir: string): Pack | { problem: string } {
    const current = join(dir, "current");
    if (!existsSync(current)) return { problem: `${current} does not exist: run npm run pack` };
    const digest = readFileSync(current, "utf8").trim();
    if (!/^[0-9a-f]{64}$/.test(digest)) return { problem: `${current} does not name a pack` };
    const indexFile = join(dir, digest, "index.json");
    if (!existsSync(indexFile)) return { problem: `${indexFile} does not exist` };
    let raw: unknown;
    try {
        raw = JSON.parse(readFileSync(indexFile, "utf8"));
    } catch (error) {
        return { problem: `${indexFile} is not JSON: ${String(error)}` };
    }
    const read = readIndex(raw);
    if (!read.ok) return { problem: `${indexFile}: ${read.problem}` };
    const files = new Set(
        read.index.lessons.flatMap((l) => (l.first === null ? [l.file] : [l.file, l.first])),
    );
    const texts = new Map<string, string>();
    return {
        digest,
        index: read.index,
        file(path) {
            if (!files.has(path)) return null;
            const had = texts.get(path);
            if (had !== undefined) return had;
            const text = readFileSync(join(dir, digest, path), "utf8");
            texts.set(path, text);
            return text;
        },
    };
}

/**
 * Serves the pack `current` names as it changes: `npm run pack` writes a new pack and rewrites
 * `current`, and a content batch lands several times a day, so the API re-reads the folder rather
 * than being started again. A change that leaves no readable pack keeps the one being served, and
 * says so. Returns what stops watching.
 */
export function watchPack(
    dir: string,
    onPack: (pack: Pack) => void,
    log: (line: string) => void,
    settle = 250,
): () => void {
    let served: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reread = (): void => {
        timer = null;
        const pack = loadPack(dir);
        if ("problem" in pack) {
            log(`the pack in ${dir} cannot be read, so the one served stays: ${pack.problem}`);
            return;
        }
        if (pack.digest === served) return;
        served = pack.digest;
        onPack(pack);
        log(`pack ${pack.digest.slice(0, 10)} now served, from ${dir}`);
    };
    if (!existsSync(dir)) return () => {};
    const watcher = watch(dir, (_event, file) => {
        if (file !== null && file !== "current") return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(reread, settle);
    });
    return () => {
        if (timer) clearTimeout(timer);
        watcher.close();
    };
}
