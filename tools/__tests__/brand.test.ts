import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inflateSync } from "node:zlib";
import { BIRD, svgFile } from "../../engine/parts/brand";
import { PALETTE } from "../../engine/paper";
import { THEME, served, uploads, type BrandFile } from "../brand";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** A PNG's width and height from its header, or undefined when the bytes are not a PNG. */
function pngSize(file: BrandFile): [number, number] | undefined {
    if (typeof file.body === "string") return undefined;
    const bytes = Buffer.from(file.body);
    if (!PNG.every((b, i) => bytes[i] === b)) return undefined;
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

/**
 * The alpha of a PNG's top-left pixel: 255 for a PNG with no alpha channel, and read from the image
 * data for an 8-bit one with it. A row's first pixel is stored as it is under every row filter.
 */
function cornerAlpha(file: BrandFile): number | undefined {
    if (typeof file.body === "string") return undefined;
    const bytes = Buffer.from(file.body);
    const [depth, colour] = [bytes[24], bytes[25]];
    if (depth !== 8) return undefined;
    if (colour === 2) return 255;
    if (colour !== 6) return undefined;
    const data: Buffer[] = [];
    for (let at = 8; at + 8 <= bytes.length;) {
        const length = bytes.readUInt32BE(at);
        if (bytes.toString("ascii", at + 4, at + 8) === "IDAT") {
            data.push(bytes.subarray(at + 8, at + 8 + length));
        }
        at += 12 + length;
    }
    return inflateSync(Buffer.concat(data))[4];
}

/** Each `<link>` and `<meta>` in a page's head, as its attributes by name. */
function tags(html: string): Record<string, string>[] {
    return [...html.matchAll(/<(?:link|meta)\b([^>]*)>/g)].map(([, inside = ""]) =>
        Object.fromEntries(
            [...inside.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k = "", v = ""]) => [k, v]),
        ),
    );
}

const page = (app: string): string =>
    readFileSync(new URL(`../../apps/${app}/index.html`, import.meta.url), "utf8");

test("every PNG is the size its name says, and the favicon is the 16 px drawing", () => {
    const expected: Record<string, number> = {
        "/favicon-16.png": 16,
        "/favicon-32.png": 32,
        "/apple-touch-icon.png": 180,
        "/icon-192.png": 192,
        "/icon-512.png": 512,
        "/icon-maskable-512.png": 512,
    };
    const files = served();
    for (const [path, px] of Object.entries(expected)) {
        const file = files.get(path);
        assert.ok(file, `${path} is not served`);
        assert.equal(file.type, "image/png");
        assert.deepEqual(pngSize(file), [px, px], `${path} is not ${px} px square`);
    }
    const social = files.get("/social.png");
    assert.ok(social);
    assert.deepEqual(pngSize(social), [1200, 630]);
    assert.equal(files.get("/favicon.svg")?.body, svgFile(BIRD.small(16)));
});

test("the tab favicon is drawn on no ground, and every app icon keeps its tile", () => {
    const files = served();
    for (const path of ["/favicon-16.png", "/favicon-32.png"]) {
        const file = files.get(path);
        assert.ok(file);
        assert.equal(cornerAlpha(file), 0, `${path} has lost its transparent ground`);
    }
    // iOS fills a transparent touch icon with black, and Android crops a maskable one
    for (const path of [
        "/apple-touch-icon.png",
        "/icon-192.png",
        "/icon-512.png",
        "/icon-maskable-512.png",
    ]) {
        const file = files.get(path);
        assert.ok(file);
        assert.equal(cornerAlpha(file), 255, `${path} is not opaque at its corner`);
    }
});

test("every app's head links to served files and takes its colour from the palette", () => {
    assert.equal(THEME, PALETTE.desk.card);
    for (const app of ["home", "kids", "site"]) {
        const head = tags(page(app));
        const icons = head.filter((t) => t.rel === "icon" || t.rel === "apple-touch-icon");
        assert.ok(
            icons.some((t) => t.href === "/favicon.svg" && t.type === "image/svg+xml"),
            app,
        );
        assert.ok(
            icons.some((t) => t.rel === "apple-touch-icon"),
            `${app} has no touch icon`,
        );
        for (const t of head.filter((x) => x.rel !== undefined && x.href?.startsWith("/"))) {
            if (t.rel === "stylesheet" || t.rel === "preload" || t.rel === "modulepreload")
                continue;
            assert.ok(served().has(t.href ?? ""), `${app} links to ${t.href}, which is not served`);
        }
        const theme = head.find((t) => t.name === "theme-color");
        assert.equal(theme?.content, THEME, `${app}'s theme-color is not the palette's card`);
        assert.ok(
            !head.some((t) => t.rel === "manifest"),
            `${app} links a manifest, and no app installs as one of its own`,
        );
    }
    assert.ok(![...served().keys()].some((path) => path.endsWith(".webmanifest")));
});

test("the site's link preview is the social image, and says what the page's own head says", () => {
    const html = page("site");
    const head = tags(html);
    const meta = (key: string): string | undefined =>
        head.find((t) => t.property === key || t.name === key)?.content;
    for (const key of ["og:image", "twitter:image"]) {
        const url = meta(key) ?? "";
        assert.match(url, /^https:\/\/[^/]+\/social\.png$/, `${key} is ${url}`);
    }
    assert.equal(meta("og:image:width"), "1200");
    assert.equal(meta("og:image:height"), "630");
    assert.equal(meta("twitter:card"), "summary_large_image");
    assert.equal(meta("og:title"), /<title>([^<]*)<\/title>/.exec(html)?.[1]);
    assert.equal(meta("og:description"), meta("description"));
});

test("the profile pictures are square and exported for us to upload, never served", () => {
    const out = uploads();
    for (const [name, px] of [
        ["profile-400.png", 400],
        ["profile-800.png", 800],
    ] as const) {
        const file = out.get(name);
        assert.ok(file, `${name} is not exported`);
        assert.deepEqual(pngSize(file), [px, px]);
        assert.ok(![...served().keys()].some((path) => path.endsWith(name)), `${name} is served`);
    }
    assert.ok(out.has("svg/lockup-horizontal.svg"));
});
