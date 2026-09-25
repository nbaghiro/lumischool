// The built apps served from the Node process, in production only (.docs/deploy.md, "What the code
// needs first", item 5): a page request answered with its app's index.html, Vite's hashed assets with
// a year's cache, and the brand files tools/brand.ts wrote beside them with a short one. Every request
// reads its file from disk again rather than keeping one in memory: dist/ never changes while this
// process runs, since a new deploy is a new process, so there is nothing to invalidate.

import { readFile } from "node:fs/promises";
import { join, sep } from "node:path";
import { hasKidSession, hasSession, isPage, pageFor } from "./pages";
import { MAIL_WORLDS, mailCover } from "./mail-design";

const DIST = join(import.meta.dirname, "..", "dist");

/** The brand files tools/brand.ts writes at the root of the build (.docs/local.md, "The apps"). */
const BRAND_FILES: ReadonlySet<string> = new Set([
    ...MAIL_WORLDS.map(mailCover),
    "/favicon.svg",
    "/favicon-16.png",
    "/favicon-32.png",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/icon-maskable-512.png",
    "/social.png",
]);

const TYPES: Readonly<Record<string, string>> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webmanifest": "application/manifest+json",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
};

function typeFor(path: string): string {
    const dot = path.lastIndexOf(".");
    return dot < 0
        ? "application/octet-stream"
        : (TYPES[path.slice(dot)] ?? "application/octet-stream");
}

/** A year: Vite names every asset by its own hash, so a cached copy is never stale. */
const ASSET_CACHE = "public, max-age=31536000, immutable";

/** An hour: the brand files keep their name across a deploy, so a cache outlives one, but not by much. */
const BRAND_CACHE = "public, max-age=3600";

/** Scripts and styles from this origin only, framed by nobody, modelled on the API's own header. */
// Paintings use embedded PNG thumbnails and temporary SVG blobs when composing previews.
const PAGE_CSP =
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; frame-ancestors 'none'";

const HEADERS = { "x-content-type-options": "nosniff" };

/**
 * A file under `dist`, or null for one that is not there, refuses to read, or would read outside it:
 * `path.join` folds a `..` segment away rather than climbing past `dist`, and the check below is a
 * second guard against whatever survived that, since serving a stranger's filesystem is the one bug
 * here worth being paranoid about.
 */
async function read(dist: string, relative: string): Promise<Uint8Array<ArrayBuffer> | null> {
    const full = join(dist, relative);
    if (full !== dist && !full.startsWith(dist + sep)) return null;
    try {
        // A Response body wants a plain Uint8Array<ArrayBuffer>, not the Buffer<ArrayBufferLike>
        // readFile answers with, so this copies rather than viewing the same memory.
        return Uint8Array.from(await readFile(full));
    } catch {
        return null;
    }
}

/**
 * The static half of the app, tried after the route table misses and only in production: a page by
 * `isPage`, `pageFor`, `hasSession` and `hasKidSession` (server/pages.ts), then an asset, then a brand
 * file. Null for anything else, including every `/api/` path, which never matches one of the three and
 * so falls back to the route table's own 404. `dist` is the built apps' root; a test passes its own.
 */
export function staticFrom(
    secure: boolean,
    dist: string = DIST,
): (req: Request) => Promise<Response | null> {
    return async (req) => {
        if (req.method !== "GET") return null;
        const { pathname } = new URL(req.url);

        if (pathname.startsWith("/assets/")) {
            const body = await read(dist, pathname.slice(1));
            if (!body) return null;
            return new Response(body, {
                status: 200,
                headers: {
                    ...HEADERS,
                    "content-type": typeFor(pathname),
                    "cache-control": ASSET_CACHE,
                },
            });
        }

        if (BRAND_FILES.has(pathname)) {
            const body = await read(dist, pathname.slice(1));
            if (!body) return null;
            return new Response(body, {
                status: 200,
                headers: {
                    ...HEADERS,
                    "content-type": typeFor(pathname),
                    "cache-control": BRAND_CACHE,
                },
            });
        }

        if (
            !isPage({ method: req.method, accept: req.headers.get("accept") ?? "", path: pathname })
        )
            return null;
        const cookie = req.headers.get("cookie") ?? "";
        const app = pageFor(pathname, {
            session: hasSession(cookie, secure),
            kids: hasKidSession(cookie, secure),
        });
        const body = await read(dist, `apps/${app}/index.html`);
        if (!body) return null;
        return new Response(body, {
            status: 200,
            headers: {
                ...HEADERS,
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
                "content-security-policy": PAGE_CSP,
            },
        });
    };
}
