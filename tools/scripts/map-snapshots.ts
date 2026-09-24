// `npm run map:snapshots`: the pictures of the map a page shows before its live map is drawn
// (engine/ui/snapshot.ts, .docs/overworld.md "Performance"). It builds a page that draws the map with
// the apps' own MapBackdrop, opens it in Chrome through request interception rather than a port,
// photographs each framing, and writes the WebP files and their framing (engine/ui/snapshots/country.ts
// for the country with nobody on it, site.ts for the sample child's map).
// tools/scripts/__tests__/map-snapshots.test.ts draws them again and fails when a picture has changed.
// `--compare` builds the apps and measures each snapshot against the live map it stands in for.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { chromium, type Browser, type BrowserContext } from "@playwright/test";
import { format, resolveConfig } from "prettier";
import { build } from "vite";
import solid from "vite-plugin-solid";
import type { Pt } from "../../engine/space";
import {
    aimKey,
    OPENING,
    PHONE_OPENING,
    placeStill,
    stillFor,
    type Aimed,
    type Area,
    type Box,
    type Snapshot,
} from "../../engine/ui/snapshot";
import { isPage, pageFor } from "../../server/pages";
import { made } from "../first-view";

const ROOT = join(import.meta.dirname, "..", "..");
export const OUT = join(ROOT, "engine/ui/snapshots");
/** WebP's quality, 0 to 1; a map of thin pencil lines stays legible down to about 0.6. */
const QUALITY = 0.64;

const MIDDLE = { x: 0.5, y: 0.5 };
/** Where a tablet's screens put the aimed point on a wide page (aimAt in engine/ui/page.tsx). */
const CENTERED = { x: 0.75, y: 0.55 };
const WIDE = { across: OPENING.wide.across, width: 1440, scale: 1, budget: 200_000 };
const NARROW = { across: OPENING.narrow.across, width: 390, scale: 2, budget: 80_000 };

export interface Framing {
    /** The image's name in engine/ui/snapshots/. */
    file: string;
    sample: boolean;
    /** The place the pages aim at, and how far along the road toward another. */
    aim: { place?: string; along?: number; toward?: string };
    /** Map units across a page's box at the zoom the page opens on. */
    across: number;
    /** The box width the image is drawn for, in CSS pixels, which with `across` sets its scale. */
    width: number;
    /** The tallest box it covers, as its height over its width. */
    tall: number;
    /** Every share of the box a page puts the aimed point at. */
    ats: readonly { x: number; y: number }[];
    /** Device pixels to a CSS pixel in the image. */
    scale: number;
    /** The most the image may weigh, in bytes. */
    budget: number;
    /** A page that opens on it, for `--compare`: its path, its window, the map's box and what stands over it. */
    compare?: { path: string; width: number; height: number; box: string; over: string };
}

/** What each page opens on (apps/site/page.tsx, engine/ui/page.tsx and its screens' places). */
export const FRAMINGS: readonly Framing[] = [
    {
        file: "site-wide",
        sample: true,
        aim: {},
        ...WIDE,
        tall: 0.72,
        ats: [OPENING.wide.at ?? MIDDLE],
        compare: { path: "/home", width: 1440, height: 900, box: ".site-map", over: ".site-sheet" },
    },
    {
        file: "site-narrow",
        sample: true,
        aim: {},
        ...NARROW,
        tall: 1.24,
        ats: [MIDDLE],
        compare: { path: "/home", width: 390, height: 844, box: ".site-map", over: ".site-sheet" },
    },
    {
        file: "country-harbour-wide",
        sample: false,
        aim: { place: "harbour" },
        ...WIDE,
        tall: 0.72,
        ats: [OPENING.wide.at ?? MIDDLE],
        compare: {
            path: "/sign-in",
            width: 1440,
            height: 900,
            box: ".page-ground",
            over: ".page-cards [data-clear]",
        },
    },
    {
        file: "country-harbour-narrow",
        sample: false,
        aim: { place: "harbour" },
        ...NARROW,
        tall: 1,
        ats: [MIDDLE],
    },
    {
        file: "country-meadow-wide",
        sample: false,
        aim: { place: "harbour", along: 0.45, toward: "meadow" },
        ...WIDE,
        tall: 0.72,
        ats: [OPENING.wide.at ?? MIDDLE],
    },
    {
        file: "country-harbour-centered",
        sample: false,
        aim: { place: "harbour" },
        ...WIDE,
        tall: 0.72,
        ats: [CENTERED],
    },
    {
        file: "country-meadow-narrow",
        sample: false,
        aim: { place: "harbour", along: 0.45, toward: "meadow" },
        ...NARROW,
        tall: 1,
        ats: [MIDDLE],
    },
];

/**
 * How near a fresh drawing must be to its snapshot for the snapshot to stand: a mean difference per
 * channel of 0 to 255, and a share of pixels far apart. The mean was 1.5 until, when it was
 * measured to be below what this machine reproduces: an unchanged map drawn again comes back
 * between 1.71 and 1.97 of 255, thin and even, with 0.00 to 0.02 per cent of pixels far apart, and
 * the test failed twice on a tree nobody had touched. The share of pixels far apart is the signal
 * that a map has really changed, and at 0.003 it keeps a hundredfold of room over what a redrawing
 * moves. */
export const SAME = { mean: 2.5, far: 0.003 };

/** The modules the snapshots are written to, one for each kind of map, by whether it is the sample child's. */
export const MODULES: readonly (readonly [name: "country" | "site", sample: boolean])[] = [
    ["country", false],
    ["site", true],
];

/** Every snapshot there is, across both modules. */
export async function allSnapshots(): Promise<Snapshot[]> {
    const [{ COUNTRY }, { SITE }] = await Promise.all([
        import("../../engine/ui/snapshots/country"),
        import("../../engine/ui/snapshots/site"),
    ]);
    return [...COUNTRY, ...SITE];
}

/** How close a snapshot must be to the live map, which differs by WebP's loss and a pixel's placing. */
export const COMPARE = { mean: 10, far: 0.03 };

const TYPES: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".json": "application/json",
};

/** Answers a context's requests to `origin` from a folder, the way `route` names each path's file. */
async function serveFolder(
    context: BrowserContext,
    origin: string,
    folder: string,
    route: (path: string, accept: string) => string,
): Promise<void> {
    await context.route(`${origin}/**`, async (r) => {
        const url = new URL(r.request().url());
        if (url.pathname.startsWith("/api/")) {
            await r.fulfill({ status: 404, contentType: "application/json", body: "{}" });
            return;
        }
        const file = join(
            folder,
            route(url.pathname, (await r.request().allHeaders()).accept ?? ""),
        );
        if (!file.startsWith(folder) || !existsSync(file) || statSync(file).isDirectory()) {
            await r.fulfill({ status: 404, body: "" });
            return;
        }
        await r.fulfill({
            status: 200,
            body: readFileSync(file),
            contentType: TYPES[extname(file)] ?? "application/octet-stream",
        });
    });
}

/** Chrome as the scripts and the end-to-end tests open it. */
export const openChrome = (): Promise<Browser> =>
    chromium.launch({ channel: "chrome", args: ["--disable-component-update"] });

/** A page of its own that draws the map with MapBackdrop, built under node_modules/.cache. */
export async function buildHarness(): Promise<{ dir: string; dist: string }> {
    const cache = join(ROOT, "node_modules/.cache");
    mkdirSync(cache, { recursive: true });
    const dir = await mkdtemp(join(cache, "map-snapshots-"));
    writeFileSync(
        join(dir, "index.html"),
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}#snap{position:fixed;inset:0}#snap>.snap{position:absolute;inset:0}.backdrop-still,.m-life{display:none!important}</style></head><body><div id="snap"></div><script type="module" src="./snap.ts"></script></body></html>`,
    );
    writeFileSync(
        join(dir, "snap.ts"),
        `import "../../../engine/ui/palette.css";
import { createComponent, render } from "solid-js/web";
import { still } from "../../../engine/ui/art";
import { declaredOf, loadDrawings } from "../../../engine/ui/drawings";
import { fontsReady } from "../../../engine/ui/fonts";
import { MapBackdrop } from "../../../engine/ui/backdrop";
import { Overworld } from "../../../engine/ui/overworld";
import { COUNTRY } from "../../../engine/ui/snapshots/country";
import { SITE } from "../../../engine/ui/snapshots/site";
import { aimedAt } from "../../../engine/space";
import { refsOf, sizeOn } from "../../../school/worlds/art";
import { apply } from "../../../school/worlds/choice";
import { readSiteData, viewOfTrip } from "../../../school/worlds/sample";
import { countryViewOf } from "../../../school/worlds/view";
import { WORLDS, worldById } from "../../../school/worlds/worlds";
const q = new URLSearchParams(location.search);
const host = document.getElementById("snap");
const sample = q.get("sample") === "1";
const aim = JSON.parse(q.get("aim") ?? "{}");
await fontsReady(5000);
// the sample child's journey, as the site's build writes it, from the file the tool put beside this page
const journeyOf = async () => { const read = readSiteData(await (await fetch("/site-data.json")).json()); if (!read.ok) throw new Error(read.problem); return read.data.journey; };
const worldOf = (id) => apply(worldById(id), undefined, still()).world;
// what the map aims at, by the map's own reading of its layout, for the tool to record beside the picture
if (host) render(() => createComponent(MapBackdrop, { class: "snap", aim, sample, stills: sample ? SITE : COUNTRY, ground: async () => { const drawings = await loadDrawings(refsOf(WORLDS.map((w) => w.id))); const size = sizeOn(drawings); const view = sample ? viewOfTrip(await journeyOf(), { worldOf, grown: true, still: still(), size, declared: declaredOf }) : countryViewOf({ size, still: still(), declared: declaredOf }); host.dataset.aimed = JSON.stringify(aimedAt(view.layout, view.here, aim)); return { view, map: Overworld }; } }), host);
`,
    );
    const dist = join(dir, "dist");
    process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = "true";
    await build({
        configFile: false,
        root: dir,
        logLevel: "error",
        plugins: [solid()],
        build: { outDir: dist, emptyOutDir: true },
    });
    // the sample child's journey as the site's build writes it (tools/first-view.ts), beside the page
    writeFileSync(join(dist, "site-data.json"), made(() => "").data);
    return { dir, dist };
}

export interface Drawn {
    file: string;
    snapshot: Omit<Snapshot, "src">;
    webp: Buffer;
}

const numbers = (v: unknown, keys: readonly string[]): boolean =>
    typeof v === "object" &&
    v !== null &&
    keys.every((k) => typeof (v as Record<string, unknown>)[k] === "number");
const isPt = (v: unknown): v is Pt => numbers(v, ["x", "y"]);
const isArea = (v: unknown): v is Area => numbers(v, ["x", "y", "w", "h"]);

/** What the harness wrote on its box as the aim the map drew, or null when it is not an aim. */
function aimedOf(text: string): Aimed | null {
    try {
        const v: unknown = JSON.parse(text);
        if (!isArea(v)) return null;
        const place: unknown = "place" in v ? v.place : undefined;
        return isPt(place) ? { ...v, place } : { x: v.x, y: v.y, w: v.w, h: v.h };
    } catch {
        return null;
    }
}

/** A snapshot's name, the image's file without its `.webp`, from where the page loads it. */
export const fileOf = (s: Pick<Snapshot, "src">): string =>
    basename(new URL(s.src).pathname, ".webp");

/**
 * Photographs one framing on the harness and works out where its image lies on the map, with what the
 * map aimed at as the harness wrote it on its box (`data-aimed`, from `aimedAt` over the map's own
 * layout), so the still stands in for exactly the aim the map drew.
 */
export async function photograph(browser: Browser, dist: string, f: Framing): Promise<Drawn> {
    const z = f.width / f.across;
    const xs = f.ats.map((a) => a.x);
    const ys = f.ats.map((a) => a.y);
    const margin = 0.03 * f.across;
    const left = Math.max(...xs) * f.across + margin;
    const right = (1 - Math.min(...xs)) * f.across + margin;
    const up = Math.max(...ys) * f.tall * f.across + margin;
    const down = (1 - Math.min(...ys)) * f.tall * f.across + margin;
    const width = Math.ceil((left + right) * z);
    const height = Math.ceil((up + down) * z);
    const nudge = { x: (right - left) / 2, y: (down - up) / 2 };
    const aim = { ...f.aim, nudge, at: MIDDLE, across: width / z };

    const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: f.scale,
        reducedMotion: "reduce",
    });
    try {
        const origin = "http://snapshots.test";
        await serveFolder(context, origin, dist, (path) => path);
        const page = await context.newPage();
        const query = new URLSearchParams({
            aim: JSON.stringify(aim),
            sample: f.sample ? "1" : "0",
        });
        await page.goto(`${origin}/index.html?${query}`);
        await page.waitForSelector(".backdrop.drawn", { state: "attached", timeout: 120_000 });
        await page.evaluate(
            () =>
                new Promise<void>((done) => {
                    void document.fonts.ready.then(() =>
                        requestAnimationFrame(() => requestAnimationFrame(() => done())),
                    );
                }),
        );
        const read = await page.evaluate(() => {
            const world = document.querySelector<HTMLElement>(".backdrop-live .world");
            const snap = document.getElementById("snap");
            if (!world || !snap) return null;
            const m = new DOMMatrix(getComputedStyle(world).transform);
            return { z: m.a, tx: m.e, ty: m.f, aimed: snap.dataset.aimed ?? "" };
        });
        if (!read) throw new Error(`${f.file}: the map did not draw`);
        const world: Area = {
            x: -read.tx / read.z,
            y: -read.ty / read.z,
            w: width / read.z,
            h: height / read.z,
        };
        const aimed = aimedOf(read.aimed);
        if (!aimed) throw new Error(`${f.file}: the map did not say what it aimed at`);

        const png = await page.screenshot({
            clip: { x: 0, y: 0, width, height },
            animations: "disabled",
        });
        const encoded = await page.evaluate(
            async ({ b64, quality }) => {
                const img = new Image();
                img.src = `data:image/png;base64,${b64}`;
                await img.decode();
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext("2d")?.drawImage(img, 0, 0);
                const blob = await new Promise<Blob | null>((done) =>
                    canvas.toBlob(done, "image/webp", quality),
                );
                if (!blob || blob.type !== "image/webp") return "";
                let s = "";
                for (const b of new Uint8Array(await blob.arrayBuffer()))
                    s += String.fromCharCode(b);
                return btoa(s);
            },
            { b64: png.toString("base64"), quality: QUALITY },
        );
        if (!encoded) throw new Error(`${f.file}: this Chrome could not encode WebP`);
        const tenth = (n: number): number => Math.round(n * 10) / 10;
        const roundPt = (p: Pt): Pt => ({ x: tenth(p.x), y: tenth(p.y) });
        const round = (a: Area): Area => ({ ...roundPt(a), w: tenth(a.w), h: tenth(a.h) });
        return {
            file: f.file,
            snapshot: {
                sample: f.sample,
                across: f.across,
                world: round(world),
                aims: {
                    [aimKey(f.aim)]: {
                        ...round(aimed),
                        ...(aimed.place ? { place: roundPt(aimed.place) } : {}),
                    },
                },
            },
            webp: Buffer.from(encoded, "base64"),
        };
    } finally {
        await context.close();
    }
}

/** How far apart two WebP images of the same size are: the mean difference per channel, and the share of pixels far apart. */
export async function difference(
    browser: Browser,
    a: Buffer,
    b: Buffer,
): Promise<{ mean: number; far: number }> {
    const page = await browser.newPage();
    try {
        return await page.evaluate(
            async ({ a, b }) => {
                const pixels = async (b64: string): Promise<ImageData | null> => {
                    const img = new Image();
                    img.src = `data:image/webp;base64,${b64}`;
                    await img.decode();
                    const canvas = document.createElement("canvas");
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const g = canvas.getContext("2d");
                    g?.drawImage(img, 0, 0);
                    return g ? g.getImageData(0, 0, canvas.width, canvas.height) : null;
                };
                const [pa, pb] = [await pixels(a), await pixels(b)];
                if (!pa || !pb || pa.width !== pb.width || pa.height !== pb.height) {
                    return { mean: 255, far: 1 };
                }
                let sum = 0;
                let far = 0;
                for (let i = 0; i < pa.data.length; i += 4) {
                    const d =
                        (Math.abs((pa.data[i] ?? 0) - (pb.data[i] ?? 0)) +
                            Math.abs((pa.data[i + 1] ?? 0) - (pb.data[i + 1] ?? 0)) +
                            Math.abs((pa.data[i + 2] ?? 0) - (pb.data[i + 2] ?? 0))) /
                        3;
                    sum += d;
                    if (d > 48) far++;
                }
                const n = pa.data.length / 4;
                return { mean: sum / n, far: far / n };
            },
            { a: a.toString("base64"), b: b.toString("base64") },
        );
    } finally {
        await page.close();
    }
}

/** Text as Prettier writes it with the repository's settings. */
const formatted = async (text: string, file: string): Promise<string> =>
    format(text, { ...(await resolveConfig(file)), filepath: file });

// Rebuild against the preceding pass's framing; rasterization may differ without moving the map.
async function snapshotAll(browser: Browser): Promise<void> {
    let before: Drawn[] = [];
    for (let pass = 1; pass <= 4; pass++) {
        if (pass > 1) process.stdout.write("checking against a fresh drawing\n");
        const after = await snapshotPass(browser);
        if (pass > 1) {
            let stable = true;
            for (const fresh of after) {
                const kept = before.find((d) => d.file === fresh.file);
                if (!kept) throw new Error(`missing preceding drawing for ${fresh.file}`);
                const d = await difference(browser, fresh.webp, kept.webp);
                const placed = JSON.stringify(fresh.snapshot) === JSON.stringify(kept.snapshot);
                const same = placed && d.mean <= SAME.mean && d.far <= SAME.far;
                stable &&= same;
                process.stdout.write(
                    `${fresh.file}: mean ${d.mean.toFixed(4)}, ${(d.far * 100).toFixed(4)}% far apart, framing ${placed ? "unchanged" : "changed"}\n`,
                );
            }
            if (stable) {
                process.stdout.write(
                    "snapshots match a fresh drawing within the visual test limits\n",
                );
                return;
            }
        }
        before = after;
    }
    throw new Error(
        "snapshots did not converge after four passes; inspect the reported differences",
    );
}

/** One drawing of every framing, written out for the next harness build. */
async function snapshotPass(browser: Browser): Promise<Drawn[]> {
    const { dir, dist } = await buildHarness();
    try {
        const drawn: Drawn[] = [];
        for (const f of FRAMINGS) {
            const d = await photograph(browser, dist, f);
            if (d.webp.length > f.budget) {
                throw new Error(
                    `${f.file} weighs ${d.webp.length} bytes, over its budget of ${f.budget}`,
                );
            }
            drawn.push(d);
            process.stdout.write(`${f.file}: ${d.webp.length} bytes\n`);
        }
        mkdirSync(OUT, { recursive: true });
        for (const d of drawn) writeFileSync(join(OUT, `${d.file}.webp`), d.webp);
        // one module per kind of map, so a page carries only the stills it can show
        for (const [name, sample] of MODULES) {
            const mine = drawn.filter((d) => d.snapshot.sample === sample);
            const module = `// Made by tools/scripts/map-snapshots.ts (npm run map:snapshots). Do not edit by hand.

import type { Snapshot } from "../snapshot";

/** ${sample ? "The sample child's map at the site's opening" : "The country with nobody on it, behind a page's cards"}, as the pages frame it. */
export const ${name.toUpperCase()}: readonly Snapshot[] = [
${mine.map(({ file, snapshot: s }) => `{ src: new URL(${JSON.stringify(`./${file}.webp`)}, import.meta.url).href, sample: ${s.sample}, across: ${s.across}, world: ${JSON.stringify(s.world)}, aims: ${JSON.stringify(s.aims)} },`).join("\n")}
];
`;
            writeFileSync(
                join(OUT, `${name}.ts`),
                await formatted(module, join(OUT, `${name}.ts`)),
            );
        }
        return drawn;
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

/** How one snapshot compared with the live map on the page that opens on it. */
export interface Compared {
    file: string;
    path: string;
    width: number;
    height: number;
    mean: number;
    far: number;
    ok: boolean;
}

/**
 * How far each snapshot is from the live map it stands in for, on the page that opens on it, within
 * COMPARE or not. `keep` is a folder to save the two pictures compared in.
 */
export async function compareAll(browser: Browser, keep?: string): Promise<Compared[]> {
    const SNAPSHOTS = await allSnapshots();
    const cache = join(ROOT, "node_modules/.cache");
    mkdirSync(cache, { recursive: true });
    const dist = await mkdtemp(join(cache, "map-compare-"));
    const compared: Compared[] = [];
    try {
        process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = "true";
        await build({
            configFile: join(ROOT, "vite.config.ts"),
            logLevel: "error",
            build: { outDir: dist, emptyOutDir: true },
        });
        for (const f of FRAMINGS) {
            if (!f.compare) continue;
            const c = f.compare;
            const phoneOpening = f.sample && c.width <= 700;
            const source = SNAPSHOTS.find(
                (s) => fileOf(s) === (phoneOpening ? "site-wide" : f.file),
            );
            if (!source) continue;
            const snapshot = phoneOpening ? { ...source, across: PHONE_OPENING.across } : source;
            const context = await browser.newContext({
                viewport: { width: c.width, height: c.height },
                deviceScaleFactor: f.scale,
                reducedMotion: "reduce",
            });
            try {
                const origin = "http://apps.test";
                await serveFolder(context, origin, dist, (path, accept) =>
                    isPage({ method: "GET", accept, path })
                        ? `apps/${pageFor(path, { session: false, kids: false })}/index.html`
                        : path,
                );
                const page = await context.newPage();
                const snapshotOnly = c.width <= 700;
                await page.addInitScript((snapshotOnly) => {
                    addEventListener("DOMContentLoaded", () => {
                        const style = document.createElement("style");
                        style.textContent =
                            ".site-over,.site-cap,.site-bar,.page-main,.page-top,.page-foot,.m-life{visibility:hidden!important}" +
                            (snapshotOnly ? "" : ".backdrop-still{display:none!important}");
                        document.head.append(style);
                    });
                }, snapshotOnly);
                await page.goto(`${origin}${c.path}`);
                if (snapshotOnly) {
                    await page.waitForFunction(
                        (box) => {
                            const image = document.querySelector<HTMLImageElement>(
                                `${box} .backdrop-still`,
                            );
                            return image?.complete && image.naturalWidth > 0;
                        },
                        c.box,
                        { timeout: 30_000 },
                    );
                    if (await page.locator(`${c.box} .backdrop-live`).count())
                        throw new Error(`${f.file}: a mobile backdrop loaded the live map`);
                } else {
                    await page.waitForSelector(`${c.box}.drawn`, {
                        state: "attached",
                        timeout: 120_000,
                    });
                }
                await page.waitForTimeout(800);
                const at = await page.evaluate(
                    ({ box, over }) => {
                        const el = document.querySelector(box);
                        const b = el?.getBoundingClientRect();
                        // a box that fades into the page fades its last 80 px (backdrop.css), which a snapshot does not
                        const fade = el?.classList.contains("fade") ? 80 : 0;
                        const k = [...document.querySelectorAll(over)].map((e) =>
                            e.getBoundingClientRect(),
                        );
                        const plain = (r: DOMRect) => ({
                            left: r.left,
                            top: r.top,
                            width: r.width,
                            height: r.height,
                        });
                        return b
                            ? {
                                  box: plain(b),
                                  over: k.map(plain),
                                  vw: innerWidth,
                                  vh: innerHeight,
                                  fade,
                              }
                            : null;
                    },
                    { box: c.box, over: c.over },
                );
                if (!at) throw new Error(`${f.file}: ${c.path} has no ${c.box}`);
                const aim = phoneOpening
                    ? PHONE_OPENING
                    : { ...f.aim, at: f.ats[0], across: f.across };
                const placed = snapshotOnly
                    ? stillFor([snapshot], aim, at.box, null, at.over)?.at
                    : placeStill(snapshot, aim, at.box, null, at.over);
                if (!placed) {
                    throw new Error(`${f.file}: the snapshot does not stand in for ${aimKey(aim)}`);
                }
                const clip: Box = {
                    left: Math.max(0, at.box.left),
                    top: Math.max(0, at.box.top),
                    width: Math.min(at.box.width, at.vw - Math.max(0, at.box.left)),
                    height:
                        Math.min(at.box.top + at.box.height - at.fade, at.vh) -
                        Math.max(0, at.box.top),
                };
                const live = await page.screenshot({
                    clip: { x: clip.left, y: clip.top, width: clip.width, height: clip.height },
                    animations: "disabled",
                });
                const still = readFileSync(join(OUT, `${fileOf(source)}.webp`)).toString("base64");
                const diff = await page.evaluate(
                    async ({ live, still, placed, clip, box, scale }) => {
                        const load = async (src: string) => {
                            const img = new Image();
                            img.src = src;
                            await img.decode();
                            return img;
                        };
                        const w = Math.round(clip.width * scale);
                        const h = Math.round(clip.height * scale);
                        const pixels = (draw: (g: CanvasRenderingContext2D) => void) => {
                            const canvas = document.createElement("canvas");
                            canvas.width = w;
                            canvas.height = h;
                            const g = canvas.getContext("2d");
                            if (!g) return new Uint8ClampedArray(0);
                            g.fillStyle = "#fff";
                            g.fillRect(0, 0, w, h);
                            draw(g);
                            return g.getImageData(0, 0, w, h).data;
                        };
                        const a = await load(`data:image/png;base64,${live}`);
                        const b = await load(`data:image/webp;base64,${still}`);
                        const pa = pixels((g) => g.drawImage(a, 0, 0, w, h));
                        const pb = pixels((g) =>
                            g.drawImage(
                                b,
                                (box.left + placed.left - clip.left) * scale,
                                (box.top + placed.top - clip.top) * scale,
                                placed.width * scale,
                                placed.height * scale,
                            ),
                        );
                        let sum = 0;
                        let far = 0;
                        for (let i = 0; i < pa.length; i += 4) {
                            const d =
                                (Math.abs((pa[i] ?? 0) - (pb[i] ?? 0)) +
                                    Math.abs((pa[i + 1] ?? 0) - (pb[i + 1] ?? 0)) +
                                    Math.abs((pa[i + 2] ?? 0) - (pb[i + 2] ?? 0))) /
                                3;
                            sum += d;
                            if (d > 48) far++;
                        }
                        const n = pa.length / 4;
                        const png = (px: Uint8ClampedArray) => {
                            const canvas = document.createElement("canvas");
                            canvas.width = w;
                            canvas.height = h;
                            canvas
                                .getContext("2d")
                                ?.putImageData(
                                    new ImageData(new Uint8ClampedArray(px), w, h),
                                    0,
                                    0,
                                );
                            return canvas.toDataURL("image/png").split(",")[1] ?? "";
                        };
                        return { mean: sum / n, far: far / n, live: png(pa), still: png(pb) };
                    },
                    {
                        live: live.toString("base64"),
                        still,
                        placed,
                        clip,
                        box: at.box,
                        scale: f.scale,
                    },
                );
                if (keep) {
                    mkdirSync(keep, { recursive: true });
                    writeFileSync(
                        join(keep, `${f.file}.live.png`),
                        Buffer.from(diff.live, "base64"),
                    );
                    writeFileSync(
                        join(keep, `${f.file}.still.png`),
                        Buffer.from(diff.still, "base64"),
                    );
                }
                compared.push({
                    file: f.file,
                    path: c.path,
                    width: c.width,
                    height: c.height,
                    mean: diff.mean,
                    far: diff.far,
                    ok: diff.mean <= COMPARE.mean && diff.far <= COMPARE.far,
                });
            } finally {
                await context.close();
            }
        }
    } finally {
        await rm(dist, { recursive: true, force: true });
    }
    return compared;
}

if (import.meta.main) {
    const browser = await openChrome();
    try {
        if (process.argv.includes("--compare")) {
            const keepAt = process.argv.indexOf("--keep");
            const compared = await compareAll(
                browser,
                keepAt < 0 ? undefined : process.argv[keepAt + 1],
            );
            for (const r of compared) {
                process.stdout.write(
                    `${r.file} on ${r.path} at ${r.width}x${r.height}: mean difference ${r.mean.toFixed(2)} of 255, ${(r.far * 100).toFixed(2)}% of pixels far apart${r.ok ? "" : " (over the tolerance)"}\n`,
                );
            }
            if (compared.some((r) => !r.ok)) process.exitCode = 1;
        } else {
            await snapshotAll(browser);
        }
    } finally {
        await browser.close();
    }
}
