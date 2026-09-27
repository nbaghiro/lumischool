// Reuses the actual seeded painter; each raster allocation is one small tile, never an atlas bitmap.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { build } from "vite";
import solid from "vite-plugin-solid";
import { intersects, type Rect } from "../../engine/space";
import { TILE_LAYERS, type TileLayer } from "../../engine/ui/map-tile-schema";

import { publishCompactMapTiles, tileSourceHash } from "./map-tile-artifacts";
import { cellLines, type Stroke } from "./map-tile-lines";

const ROOT = join(import.meta.dirname, "../..");
const SIZE = 256;
const GUTTER = 2;
const LEVELS = 7;
// line chunks sit on this level's grid: a few at close zoom, the whole map in 56 at the overview
const LINE_LEVEL = 3;

/** One landscape tile's drawing in world units, and the box its strokes stay within. */
interface Baked {
    box: Rect;
    body: string;
}

interface Source {
    bounds: Rect;
    inner: Rect;
    layers: Record<string, string>;
    bare: Record<string, string>;
    strokes: Partial<Record<"pencil" | "colour", Stroke[]>>;
    /** The landscape's layers, a piece at a time, composed into each tile from the pieces over it. */
    pieces: Partial<Record<TileLayer, Baked[]>>;
}

/** How far a landscape tile's marks reach past its rect: a tree or a range stands over its edge. */
const REACH = 800;

export async function exportMapTiles(): Promise<void> {
    const dependencies = new Set<string>([
        "tools/scripts/map-tiles.ts",
        "tools/scripts/map-tile-artifacts.ts",
        "tools/scripts/map-tile-compaction.ts",
        "tools/scripts/map-tile-lines.ts",
        "engine/ui/map-tile-schema.ts",
        "engine/ui/overworld.css",
        "package-lock.json",
    ]);
    const cache = join(ROOT, "node_modules/.cache");
    mkdirSync(cache, { recursive: true });
    const dir = await mkdtemp(join(cache, "map-tiles-"));
    writeFileSync(
        join(dir, "index.html"),
        '<!doctype html><html><body><div class="world"><div id="art"></div></div><script type="module" src="./export.ts"></script></body></html>',
    );
    // The page carries the map's own stylesheet, so an opacity the live map takes from CSS is written
    // onto its element and survives serialising each layer into a standalone image.
    writeFileSync(
        join(dir, "export.ts"),
        `
import "../../../engine/ui/palette.css";
import "../../../engine/ui/overworld.css";
import { paintTerrain } from "../../../engine/ui/map";
import { loadDrawings, declaredOf } from "../../../engine/ui/drawings";
import { readTokens } from "../../../engine/ui/read-tokens";
import { refsOf, sizeOn } from "../../../school/worlds/art";
import { WORLDS } from "../../../school/worlds/worlds";
import { countryViewOf } from "../../../school/worlds/view";
import { takeStrokes } from "../../../tools/scripts/map-tile-lines";
const drawings = await loadDrawings(refsOf(WORLDS.map(w => w.id)));
const view = countryViewOf({size:sizeOn(drawings), still:true, declared:declaredOf});
const host = document.getElementById("art");
const land = paintTerrain({layer:host, host, t:readTokens(host), view, still:true});
const source = host.querySelector(".ow-land");
for (const n of source.querySelectorAll("*")) {
 const o = getComputedStyle(n).opacity;
 if (o !== "1" && !n.hasAttribute("opacity")) n.setAttribute("opacity", o);
}
const layers = {}, bare = {}, strokes = {};
for (const kind of ["sea", "pencil", "land", "colour"]) {
 const svg = source.cloneNode(true);
 const water = svg.querySelector(".ow-sea"), pencil = svg.querySelector(".ow-pencil"), colour = svg.querySelector(".ow-colour");
 if(kind === "sea") { water.querySelector("g")?.remove(); pencil.remove(); colour.remove(); }
 if(kind === "pencil") { water.querySelector("path")?.remove(); colour.remove(); }
 if(kind === "land" || kind === "colour") {
   water.remove(); pencil.remove(); colour.removeAttribute("mask");
   if(kind === "land") { const wash=colour.querySelector(".ow-land-wash");colour.replaceChildren(wash); }
   else {colour.querySelector(".ow-land-wash").remove();colour.querySelector(".ow-patches").remove();}
 }
 svg.removeAttribute("style"); svg.setAttribute("xmlns","http://www.w3.org/2000/svg");
 layers[kind] = new XMLSerializer().serializeToString(svg);
 const thin = takeStrokes(svg);
 if (kind === "pencil" || kind === "colour") strokes[kind] = thin;
 else if (thin.length) throw new Error(kind + " has thin strokes the tiles do not draw");
 bare[kind] = new XMLSerializer().serializeToString(svg);
}
// the landscape, all in colour and all in pencil, which the masks choose between on the page
const pieces = {};
for (const marks of ["colour", "pencil"]) {
 const layer = document.createElement("div");
 document.querySelector(".world").append(layer);
 const painted = paintTerrain({layer, host:layer, t:readTokens(host), view, still:true, marks, drawnElsewhere:true});
 for (const piece of painted.landscape) {
  for (const svg of piece.paint()) {
   for (const n of svg.querySelectorAll("*")) {
    const o = getComputedStyle(n).opacity;
    if (o !== "1" && !n.hasAttribute("opacity")) n.setAttribute("opacity", o);
   }
   // the waves are baked once, in ink, and take their colour on the page
   if (svg.classList.contains("ow-waves") && marks === "pencil") { svg.remove(); continue; }
   const kind = svg.classList.contains("ow-waves") ? "waves" : svg.classList.contains("ow-pencil") ? "marks-pencil" : "marks-colour";
   const body = [...svg.childNodes].map((n) => new XMLSerializer().serializeToString(n)).join("");
   const r = piece.rect;
   (pieces[kind] ??= []).push({ box: { x: r.x - ${REACH}, y: r.y - ${REACH}, w: r.w + 2 * ${REACH}, h: r.h + 2 * ${REACH} }, body: '<g opacity="' + getComputedStyle(svg).opacity + '">' + body + "</g>" });
   svg.remove();
  }
 }
 layer.remove();
}
window.exported = { bounds:view.country.bounds, inner:view.layout.bounds, layers, bare, strokes, pieces };
land.stop();
`,
    );
    const dist = join(dir, "dist");
    const browser = await chromium.launch({
        channel: "chrome",
        args: ["--disable-component-update"],
    });
    try {
        await build({
            configFile: false,
            root: dir,
            plugins: [
                solid(),
                {
                    name: "tile-source-dependencies",
                    generateBundle(_options, output) {
                        for (const entry of Object.values(output)) {
                            if (entry.type !== "chunk") continue;
                            for (const id of Object.keys(entry.modules)) {
                                const file = id.split("?")[0];
                                if (
                                    !file ||
                                    !file.startsWith(ROOT + "/") ||
                                    file.includes("/node_modules/")
                                )
                                    continue;
                                const path = relative(ROOT, file);
                                if (path !== "engine/ui/map-tile-manifest.ts" && existsSync(file))
                                    dependencies.add(path);
                            }
                        }
                    },
                },
            ],
            logLevel: "error",
            build: { outDir: dist },
        });
        let page = await browser.newPage();
        await page.route("http://tiles.test/**", async (route) => {
            const file = join(dist, new URL(route.request().url()).pathname);
            if (!existsSync(file)) {
                await route.fulfill({ status: 404, body: "" });
                return;
            }
            await route.fulfill({
                body: readFileSync(file),
                contentType:
                    extname(file) === ".js"
                        ? "text/javascript"
                        : extname(file) === ".css"
                          ? "text/css"
                          : "text/html",
            });
        });
        page.on("pageerror", (e) => process.stderr.write(`${e.message}\n`));
        await page.goto("http://tiles.test/index.html");
        await page.waitForFunction(() => "exported" in window, { timeout: 120_000 });
        const source = await page.evaluate<Source>("window.exported");
        if (process.argv.includes("--inspect-source")) {
            writeFileSync(join(cache, "map-tile-source.json"), JSON.stringify(source));
            return;
        }
        await page.goto("about:blank");
        const sourceFingerprint = createHash("sha256")
            .update(
                JSON.stringify({
                    source,
                    size: SIZE,
                    gutter: GUTTER,
                    levels: LEVELS,
                    lines: { level: LINE_LEVEL, bareFrom: 1 },
                }),
            )
            .digest("hex")
            .slice(0, 16);
        const renderer = browser.version();
        const stagingKey = createHash("sha256").update(renderer).digest("hex").slice(0, 12);
        const out = join(cache, `tile-staging-${sourceFingerprint}-${stagingKey}`);
        mkdirSync(out, { recursive: true });
        const bounds = source.bounds;
        const rootSpan = Math.max(bounds.w, bounds.h);
        const levels = Array.from({ length: LEVELS }, (_, level) => ({
            level,
            span: rootSpan / 2 ** level,
        }));
        const recipe = { bounds, tileSize: SIZE, gutter: GUTTER, levels };
        const sourceFiles = [...dependencies].sort();
        const sourceHash = tileSourceHash(ROOT, sourceFiles);
        const buildInfo = { sourceFingerprint, sourceHash, sourceFiles, renderer };
        let files = 0,
            bytes = 0;
        for (const { level, span } of levels) {
            const folder = join(out, String(level));
            mkdirSync(folder, { recursive: true });
            const pad = (span * GUTTER) / SIZE;
            // the canvas draws the thin strokes as vectors at screen resolution, so every level but the
            // root, which stands in while they load, is rasterized without them
            const drawn: Partial<Record<TileLayer, string>> =
                level === 0 ? source.layers : source.bare;
            for (let y = 0; y < Math.ceil(bounds.h / span); y++)
                for (let x = 0; x < Math.ceil(bounds.w / span); x++) {
                    const box = `${bounds.x + x * span - pad} ${bounds.y + y * span - pad} ${span + pad * 2} ${span + pad * 2}`;
                    const tile = {
                        x: bounds.x + x * span - pad,
                        y: bounds.y + y * span - pad,
                        w: span + pad * 2,
                        h: span + pad * 2,
                    };
                    for (const layer of TILE_LAYERS) {
                        const target = join(folder, `${x}-${y}-${layer}.png`);
                        if (existsSync(target)) {
                            files++;
                            bytes += readFileSync(target).length;
                            continue;
                        }
                        if (files % 100 === 0) {
                            await page.close();
                            page = await browser.newPage();
                        }
                        const svg = drawn[layer];
                        const over = (source.pieces[layer] ?? []).filter((p) =>
                            intersects(p.box, tile),
                        );
                        const local =
                            svg !== undefined
                                ? svg
                                      .replace(/<mask\b[^>]*>/g, (tag) =>
                                          tag
                                              .replace(/\s(?:x|y|width|height)="[^"]*"/g, "")
                                              .replace(
                                                  />$/,
                                                  ` x="${tile.x}" y="${tile.y}" width="${tile.w}" height="${tile.h}">`,
                                              ),
                                      )
                                      .replace(/viewBox="[^"]*"/, `viewBox="${box}"`)
                                      .replace(
                                          /<svg /,
                                          `<svg width="${SIZE + 2 * GUTTER}" height="${SIZE + 2 * GUTTER}" `,
                                      )
                                : `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE + 2 * GUTTER}" height="${SIZE + 2 * GUTTER}" viewBox="${box}">${over.map((p) => p.body).join("")}</svg>`;
                        const png = await page
                            .evaluate(async (svg) => {
                                const url = URL.createObjectURL(
                                    new Blob([svg], { type: "image/svg+xml" }),
                                );
                                const img = new Image();
                                img.src = url;
                                try {
                                    await img.decode();
                                    const canvas = document.createElement("canvas");
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    const context = canvas.getContext("2d");
                                    if (!context) throw new Error("No export canvas");
                                    context.drawImage(img, 0, 0);
                                    return canvas.toDataURL("image/png").split(",")[1] ?? "";
                                } finally {
                                    URL.revokeObjectURL(url);
                                    img.removeAttribute("src");
                                }
                            }, local)
                            .catch((error) => {
                                writeFileSync("/tmp/map-tile-failed.svg", local);
                                throw new Error(
                                    `Tile ${level}/${x}-${y}-${layer}: ${String(error)}`,
                                );
                            });
                        const image = Buffer.from(png, "base64");
                        writeFileSync(target, image);
                        files++;
                        bytes += image.length;
                    }
                }
            process.stdout.write(`map tiles: level ${level} complete\n`);
        }
        const span = rootSpan / 2 ** LINE_LEVEL;
        const columns = Math.ceil(bounds.w / span);
        const { cells: lines, bleed } = cellLines(source.strokes, {
            bounds,
            span,
            columns,
            rows: Math.ceil(bounds.h / span),
        });
        for (const [id, cell] of lines)
            writeFileSync(
                join(
                    out,
                    String(LINE_LEVEL),
                    `${id % columns}-${Math.floor(id / columns)}-lines.json`,
                ),
                JSON.stringify(cell),
            );
        writeFileSync(
            join(out, "lines.json"),
            JSON.stringify({ level: LINE_LEVEL, inner: source.inner, bleed }),
        );
        if (tileSourceHash(ROOT, sourceFiles) !== sourceHash)
            throw new Error("Map tile sources changed during export; publication cancelled");
        const version = publishCompactMapTiles(ROOT, out, recipe, buildInfo);
        process.stdout.write(
            `map tiles: ${version}, ${files} PNG files, ${(bytes / 1024 / 1024).toFixed(1)} MiB, ${lines.size} line cells; bounds ${JSON.stringify(bounds)}\n`,
        );
    } finally {
        await browser.close();
        await rm(dir, { recursive: true, force: true });
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
    await exportMapTiles();
