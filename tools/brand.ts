// The logo's files for the apps, made from engine/parts/brand.ts at every run rather than kept by
// hand, so they cannot go stale: the dev server on 8500 serves them and the build writes them beside
// the apps. resvg turns the drawings into PNGs, and nothing of it ships. Run on its own, this file
// also writes the files we upload by hand into a folder (.docs/brand.md, "Using the files").

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { Connect, Plugin } from "vite";
import { BIRD, files, icon, profile, social, svgFile, type Art } from "../engine/parts/brand";
import { PALETTE } from "../engine/paper";

export interface BrandFile {
    type: string;
    body: string | Uint8Array;
}

/** The browser's colour round the page: the card the apps' pages are drawn on. */
export const THEME = PALETTE.desk.card;

const png = (a: Art, px: number): BrandFile => ({
    type: "image/png",
    body: new Resvg(svgFile(a), {
        fitTo: { mode: "width", value: px },
        font: { loadSystemFonts: false },
    })
        .render()
        .asPng(),
});

let made: Map<string, BrandFile> | undefined;

/** Every file the apps link to, by the path it is served at. Drawn once, on first use. */
export function served(): Map<string, BrandFile> {
    made ??= new Map<string, BrandFile>([
        ["/favicon.svg", { type: "image/svg+xml", body: svgFile(BIRD.small(16)) }],
        ["/favicon-16.png", png(BIRD.small(16), 16)],
        ["/favicon-32.png", png(BIRD.small(32), 32)],
        ["/apple-touch-icon.png", png(icon(BIRD), 180)],
        ["/icon-192.png", png(icon(BIRD), 192)],
        ["/icon-512.png", png(icon(BIRD), 512)],
        ["/icon-maskable-512.png", png(icon(BIRD, { safe: true }), 512)],
        ["/social.png", png(social(BIRD), 1200)],
    ]);
    return made;
}

/**
 * The files we upload by hand and never serve: square profile pictures for social accounts, and
 * the vector files for print, letterheads and anyone who asks for the logo.
 */
export function uploads(): Map<string, BrandFile> {
    const out = new Map<string, BrandFile>([
        ["profile-400.png", png(profile(BIRD), 400)],
        ["profile-800.png", png(profile(BIRD), 800)],
    ]);
    for (const [name, text] of Object.entries(files(BIRD))) {
        out.set(`svg/${name}`, {
            type: "image/svg+xml",
            body: `<?xml version="1.0" encoding="UTF-8"?>\n${text}\n`,
        });
    }
    return out;
}

const serve: Connect.NextHandleFunction = (req, res, next) => {
    const path = (req.url ?? "").split("?")[0] ?? "";
    const file = req.method === "GET" || req.method === "HEAD" ? served().get(path) : undefined;
    if (file === undefined) {
        next();
        return;
    }
    res.setHeader("Content-Type", file.type);
    res.setHeader("Cache-Control", "no-cache");
    res.end(file.body);
};

/** Serves the files in dev and writes them at the root of the build. */
export function brand(): Plugin {
    return {
        name: "lumischool-brand",
        configureServer(server) {
            server.middlewares.use(serve);
        },
        generateBundle() {
            for (const [path, file] of served()) {
                this.emitFile({ type: "asset", fileName: path.slice(1), source: file.body });
            }
        },
    };
}

if (import.meta.main) {
    const folder = process.argv[2];
    if (folder === undefined) {
        process.stderr.write("usage: npm run brand:export -- <folder>\n");
        process.exit(1);
    }
    const out = resolve(folder);
    const all = [
        ...[...served()].map(([path, file]) => [path.slice(1), file] as const),
        ...uploads(),
    ];
    for (const [name, file] of all) {
        const to = join(out, name);
        mkdirSync(dirname(to), { recursive: true });
        writeFileSync(to, file.body);
    }
    process.stdout.write(`wrote ${all.length} files to ${out}\n`);
}
