// `npm run perf:games`: the GPU's view of the action games drawing 600 sprites that all move, in
// Chrome, on this machine. It builds a page that draws the frames with GameView, lets every look land
// in the atlas, then times the main thread's work for each of 300 frames and fails above 4 ms at the
// median (.docs/game-engine.md, P0). Then, when `npm run dev` is serving, it plays the six heaviest
// games on the GPU's view for five seconds each, at full speed and with the CPU slowed four times, and
// reports the main thread's busy time and the gaps between frames; these are recorded, not budgeted.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { extname, join } from "node:path";
import { build } from "vite";
import type { Browser } from "@playwright/test";
import { openChrome } from "./map-snapshots";

const ROOT = join(import.meta.dirname, "..", "..");
const SPRITES = 600;
const BUDGET = 4;

async function harness(): Promise<{ dir: string; dist: string }> {
    const cache = join(ROOT, "node_modules/.cache");
    mkdirSync(cache, { recursive: true });
    const dir = await mkdtemp(join(cache, "perf-games-"));
    writeFileSync(
        join(dir, "index.html"),
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}#host{position:fixed;inset:0}</style></head><body><div id="host"></div><script type="module" src="./perf.ts"></script></body></html>`,
    );
    writeFileSync(
        join(dir, "perf.ts"),
        `import "../../../engine/ui/palette.css";
import "../../../engine/ui/games.css";
import { loadDrawings } from "../../../engine/ui/drawings";
import { fontsReady } from "../../../engine/ui/fonts";
import { GameView } from "../../../engine/ui/game-view";
const refs = ["prop.ball", "golfcup", "tree", "flowers", "windmill"];
await fontsReady(5000);
const shelf = await loadDrawings(refs);
const art = new Map();
for (const r of refs) { const d = shelf.drawing(r); if (d) art.set(r, d); }
const host = document.getElementById("host");
const view = new GameView({ host, art, still: () => false });
const world = { w: 36, h: 20 };
view.fit(world, world, { w: innerWidth, h: innerHeight });
const frame = (t) => ({
    camera: { x: 18, y: 10 },
    view: world,
    world,
    marks: [],
    sprites: Array.from({ length: ${SPRITES} }, (_, i) => ({
        key: "s" + i,
        art: refs[i % refs.length],
        size: 1 + (i % 3) * 0.5,
        x: 18 + Math.cos(t * 0.7 + i) * (4 + (i % 13)),
        y: 10 + Math.sin(t * 0.9 + i * 1.3) * (2 + (i % 7)),
        angle: t + i,
        z: i % 5,
    })),
});
view.draw(frame(0), 0);
await view.ready();
const times = [];
let t = 0;
await new Promise((done) => {
    const step = () => {
        t += 1 / 60;
        const t0 = performance.now();
        view.draw(frame(t), 1 / 60);
        times.push(performance.now() - t0);
        if (times.length < 360) requestAnimationFrame(step);
        else done();
    };
    requestAnimationFrame(step);
});
document.body.dataset.times = JSON.stringify(times.slice(60));
const probe = new OffscreenCanvas(1, 1).getContext("webgl2");
const named = probe?.getExtension("WEBGL_debug_renderer_info");
document.body.dataset.gpu = String((named && probe?.getParameter(named.UNMASKED_RENDERER_WEBGL)) ?? "");
document.body.dataset.drawn = String(view.stats.sprites);
`,
    );
    const dist = join(dir, "dist");
    process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = "true";
    await build({
        configFile: false,
        root: dir,
        logLevel: "error",
        build: { outDir: dist, emptyOutDir: true },
    });
    return { dir, dist };
}

const TYPES: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".woff2": "font/woff2",
    ".svg": "image/svg+xml",
};

const HEAVIEST = [
    "g=plane&v=0",
    "g=marble-workshop&v=5",
    "g=snake&v=5",
    "g=snake&v=2",
    "g=fish&v=0",
    "g=herd&v=0",
    "g=sling&v=1",
];
const BASE = process.env.E2E_BASE ?? "http://localhost:8500";

async function serving(): Promise<boolean> {
    try {
        return (await fetch(`${BASE}/games`, { headers: { accept: "text/html" } })).ok;
    } catch {
        return false;
    }
}

/** Busy main-thread time a frame and the gaps between frames, over five seconds of play. */
async function play(browser: Browser, game: string, slowed: number): Promise<string> {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    try {
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await page.goto(`${BASE}/games?${game}`);
        await page.locator('.game-player[data-game-ready="true"]').waitFor({ timeout: 30_000 });
        await cdp.send("Performance.enable");
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: slowed });
        const busy = async (): Promise<number> => {
            const { metrics } = await cdp.send("Performance.getMetrics");
            return metrics.find((m) => m.name === "TaskDuration")?.value ?? 0;
        };
        await page.evaluate(() => {
            const gaps: number[] = [];
            let last = performance.now();
            const tick = (now: number) => {
                gaps.push(now - last);
                last = now;
                document.body.dataset.gaps = JSON.stringify(gaps);
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
        const before = await busy();
        // a game waits for its first move, so the keys and a drag across the field play it
        const field = await page.locator(".field").boundingBox();
        const cx = (field?.x ?? 0) + (field?.width ?? 0) / 2,
            cy = (field?.y ?? 0) + (field?.height ?? 0) / 2;
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx - 120, cy + 60, { steps: 20 });
        await page.mouse.up();
        for (let i = 0; i < 10; i++) {
            await page.keyboard.down(i % 2 ? "ArrowLeft" : "ArrowRight");
            await page.keyboard.down("ArrowUp");
            await page.waitForTimeout(500);
            await page.keyboard.up("ArrowUp");
            await page.keyboard.up(i % 2 ? "ArrowLeft" : "ArrowRight");
        }
        const spent = (await busy()) - before;
        const read: unknown = JSON.parse(
            (await page.evaluate(() => document.body.dataset.gaps)) ?? "[]",
        );
        const gaps = (Array.isArray(read) ? read : [])
            .filter((n): n is number => typeof n === "number")
            .slice(1)
            .sort((a, b) => a - b);
        const at = (q: number) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * q))] ?? 0;
        const late = gaps.filter((g) => g > 1000 / 30).length;
        return (
            `${game.padEnd(24)} ${String(slowed).padStart(2)}x  busy ${((spent * 1000) / Math.max(1, gaps.length)).toFixed(1)} ms a frame, ` +
            `gap median ${at(0.5).toFixed(1)} ms, 95th ${at(0.95).toFixed(1)} ms, ` +
            `${((late / Math.max(1, gaps.length)) * 100).toFixed(1)}% of frames under 30 fps`
        );
    } finally {
        await context.close();
    }
}

const { dir, dist } = await harness();
const browser = await openChrome();
try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const origin = "http://perf.games";
    await context.route(`${origin}/**`, async (r) => {
        const path = new URL(r.request().url()).pathname;
        const file = join(dist, path === "/" ? "index.html" : path);
        try {
            await r.fulfill({
                status: 200,
                body: readFileSync(file),
                contentType: TYPES[extname(file)] ?? "application/octet-stream",
            });
        } catch {
            await r.fulfill({ status: 404, body: "" });
        }
    });
    const page = await context.newPage();
    await page.goto(`${origin}/`);
    await page.waitForFunction(() => document.body.dataset.times, undefined, { timeout: 60_000 });
    const read: unknown = JSON.parse(
        (await page.evaluate(() => document.body.dataset.times)) ?? "[]",
    );
    const gpu = await page.evaluate(() => document.body.dataset.gpu ?? "");
    const drawn = Number(await page.evaluate(() => document.body.dataset.drawn));
    const times = (Array.isArray(read) ? read : [])
        .filter((n): n is number => typeof n === "number")
        .sort((a, b) => a - b);
    const at = (q: number) => times[Math.min(times.length - 1, Math.floor(times.length * q))] ?? 0;
    const median = at(0.5);
    process.stdout.write(
        `${SPRITES} moving sprites over ${times.length} frames on ${gpu || "an unnamed GPU"}: ` +
            `median ${median.toFixed(2)} ms, 95th ${at(0.95).toFixed(2)} ms, worst ${at(1).toFixed(2)} ms\n`,
    );
    if (drawn !== SPRITES) {
        process.stderr.write(`drew ${drawn} of ${SPRITES} sprites\n`);
        process.exitCode = 1;
    } else if (!times.length || median > BUDGET) {
        process.stderr.write(`over the budget of ${BUDGET} ms a frame\n`);
        process.exitCode = 1;
    }
    if (!(await serving()))
        process.stdout.write(`${BASE} is not serving, so the games were not played\n`);
    else
        for (const game of HEAVIEST)
            for (const slowed of [1, 4])
                process.stdout.write(`${await play(browser, game, slowed)}\n`);
} finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
}
