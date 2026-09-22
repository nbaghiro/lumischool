// What each app's first view needs before its own script has run, made and linked at build: the site's
// data (the sample child's journey, the site's words about the child and the day's question drawn its
// ways, from `siteData` in tools/site-sample.ts) with the visitor's pack the site's pictures read
// (.docs/api.md, "a second, filtered pack of its own"), preloads for the site's map snapshots
// (engine/ui/snapshot.ts), and preloads for the faces every app waits for before it draws
// (engine/ui/fonts.ts), so that none of them waits for a script to ask (.docs/overworld.md,
// "Performance"). The curriculum is compiled once per change of its text, kept under
// node_modules/.cache/, and read back at every build and by the dev server, so it cannot go stale.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Connect, HtmlTagDescriptor, IndexHtmlTransformContext, Plugin } from "vite";
import { Workspace } from "../engine/notation/notation";
import { loadPack, type Pack } from "../server/pack";
import { compileLessons, curriculum, packOf, visitorOf, writePack } from "./pack";
import { readSiteData } from "../school/worlds/sample";
import { siteData } from "./site-sample";

const ROOT = join(import.meta.dirname, "..");
/** Where a compiled visitor pack and the site's data are kept, by the curriculum's text. */
const CACHE = join(ROOT, "node_modules/.cache/site-pack");

/** Where the dev server answers with the site's data. The build writes a hashed file under assets/. */
export const DEV_PATH = "/@site-data.json";
/** Where the dev server answers with the visitor's pack. The build writes it under assets/site-pack-<digest>/. */
export const DEV_PACK = "/@site-pack";

/** The Latin files of the faces a first screen waits for, which must stay in step with FIRST in engine/ui/fonts.ts. */
export const FACES = [
    "@fontsource/andika/files/andika-latin-400-normal.woff2",
    "@fontsource/andika/files/andika-latin-700-normal.woff2",
    "@fontsource-variable/shantell-sans/files/shantell-sans-latin-full-normal.woff2",
    "@fontsource-variable/spline-sans-mono/files/spline-sans-mono-latin-wght-normal.woff2",
];

/** The site's opening snapshots, each with the windows it is for: site.css's phone layout starts at 700 px. */
export const SITE_SNAPSHOTS = [
    { source: "engine/ui/snapshots/site-wide.webp", media: "(min-width: 701px)" },
    { source: "engine/ui/snapshots/site-narrow.webp", media: "(max-width: 700px)" },
];

/** The visitor's pack and the site's data, as JSON text, for a pack served from `packAt`. */
export interface Made {
    pack: Pack;
    data: string;
}

/** The first ten characters of a pack's digest, which names its folder under assets/. */
export const shortDigest = (digest: string): string => digest.slice(0, 10);

/**
 * The visitor's pack and the site's data from the curriculum as it is now, compiled once and kept
 * under the cache by a hash of the curriculum's text, since compiling takes about fifteen seconds
 * and the apps are built several times in one `npm run check`. `packAt` is where the page reads the
 * pack from, given its digest, which is the one part of the data that is not the curriculum's.
 */
export function made(packAt: (digest: string) => string): Made {
    const texts = curriculum();
    const key = createHash("sha256")
        .update(JSON.stringify(Object.entries(texts).sort(([a], [b]) => a.localeCompare(b))))
        .digest("hex")
        .slice(0, 16);
    const dir = join(CACHE, key);
    const dataFile = join(dir, "site-data.json");
    if (!existsSync(dataFile)) {
        const ws = new Workspace(texts);
        const built = packOf(compileLessons(ws), visitorOf);
        mkdirSync(dir, { recursive: true });
        writePack(built, dir);
        writeFileSync(dataFile, JSON.stringify(siteData(ws, built, "")));
    }
    const pack = loadPack(dir);
    if ("problem" in pack)
        throw new Error(`the visitor's pack in ${dir} cannot be read: ${pack.problem}`);
    const read = readSiteData(JSON.parse(readFileSync(dataFile, "utf8")));
    if (!read.ok) throw new Error(`${dataFile} is not the site's data: ${read.problem}`);
    return { pack, data: JSON.stringify({ ...read.data, pack: packAt(pack.digest) }) };
}

const isApp = (file: string, app: string): boolean =>
    file.replaceAll("\\", "/").endsWith(`apps/${app}/index.html`);

/** The path the build wrote a source file to, from the bundle a page's head is written with. */
function builtAt(ctx: IndexHtmlTransformContext, source: string): string | null {
    for (const out of Object.values(ctx.bundle ?? {})) {
        if (
            out.type === "asset" &&
            out.originalFileNames.some((name) => name.replaceAll("\\", "/").endsWith(source))
        )
            return `/${out.fileName}`;
    }
    return null;
}

const preload = (attrs: Record<string, string | boolean>): HtmlTagDescriptor => ({
    tag: "link",
    attrs: { rel: "preload", ...attrs },
    injectTo: "head",
});

/** The folder under assets/ a visitor pack is written to, by its digest. */
export const packFolder = (digest: string): string => `assets/site-pack-${shortDigest(digest)}`;

/** Makes the site's data and the visitor's pack, and links each app's first view from its page's head. */
export function firstView(): Plugin {
    let command: "build" | "serve" = "serve";
    let data: string | null = null;
    /** What the dev server serves, made on the first request after a change to the curriculum. */
    let dev: Promise<Made> | null = null;
    const serve = (): Connect.NextHandleFunction => (req, res, next) => {
        const path = (req.url ?? "").split("?")[0] ?? "";
        const file =
            path === DEV_PATH
                ? ""
                : path.startsWith(`${DEV_PACK}/`)
                  ? path.slice(DEV_PACK.length + 1)
                  : null;
        if (file === null) {
            next();
            return;
        }
        dev ??= new Promise((ok, fail) => {
            try {
                ok(made(() => DEV_PACK));
            } catch (error) {
                fail(error instanceof Error ? error : new Error(String(error)));
            }
        });
        dev.then(
            (m) => {
                const text =
                    file === ""
                        ? m.data
                        : file === "index.json"
                          ? JSON.stringify(m.pack.index)
                          : m.pack.file(file);
                if (text === null) {
                    res.statusCode = 404;
                    res.end();
                    return;
                }
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Cache-Control", "no-cache");
                res.end(text);
            },
            (error: unknown) => {
                dev = null;
                next(error);
            },
        );
    };
    return {
        name: "lumischool-first-view",
        configResolved(config) {
            command = config.command;
        },
        buildStart() {
            if (command !== "build") return;
            const m = made((digest) => `/${packFolder(digest)}`);
            const folder = packFolder(m.pack.digest);
            this.emitFile({
                type: "asset",
                fileName: `${folder}/index.json`,
                source: JSON.stringify(m.pack.index),
            });
            for (const l of m.pack.index.lessons)
                for (const path of l.first === null ? [l.file] : [l.file, l.first]) {
                    const text = m.pack.file(path);
                    if (text !== null)
                        this.emitFile({
                            type: "asset",
                            fileName: `${folder}/${path}`,
                            source: text,
                        });
                }
            const hash = createHash("sha256").update(m.data).digest("hex").slice(0, 10);
            data = `assets/site-data-${hash}.json`;
            this.emitFile({ type: "asset", fileName: data, source: m.data });
        },
        configureServer(server) {
            server.watcher.on("change", (file) => {
                if (file.includes("/content/")) dev = null;
            });
            server.middlewares.use(serve());
        },
        transformIndexHtml: {
            order: "post",
            handler(_html, ctx) {
                const tags: HtmlTagDescriptor[] = [];
                const site = isApp(ctx.filename, "site");
                const dataAt = command === "build" ? data && `/${data}` : DEV_PATH;
                if (site && dataAt) {
                    tags.push(
                        preload({
                            as: "fetch",
                            href: dataAt,
                            crossorigin: "anonymous",
                            "data-site-data": true,
                        }),
                    );
                }
                if (command !== "build") return tags;
                if (site) {
                    for (const s of SITE_SNAPSHOTS) {
                        const href = builtAt(ctx, s.source);
                        if (href) {
                            tags.push(
                                preload({
                                    as: "image",
                                    href,
                                    media: s.media,
                                    fetchpriority: "high",
                                }),
                            );
                        }
                    }
                }
                for (const face of FACES) {
                    const href = builtAt(ctx, face);
                    if (href) {
                        tags.push(
                            preload({
                                as: "font",
                                type: "font/woff2",
                                href,
                                crossorigin: "anonymous",
                            }),
                        );
                    }
                }
                return tags;
            },
        },
    };
}
