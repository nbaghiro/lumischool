// Bakes the drawings of the map and of every world (engine/ui/baked.ts): opens the site in Chrome,
// has the map and each world's roll draw every drawing at every scale a family's device asks for, and
// writes what the workers kept (sprites.worker.ts) to public/assets/art/<bake>/<palette>, with an
// index in a part for each first letter of the keys, and the bake's name to engine/ui/art-manifest.ts. Run it with `npm run dev` up, after `map:tiles`;
// a first visit then fetches these rather than drawing them.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

const BASE = process.env.BAKE_BASE ?? "http://localhost:8500";
const ROOT = new URL("../../", import.meta.url).pathname;
const OUT = join(ROOT, "public/assets/art");
const DRAWN =
    /export const DRAWN = (\d+);/.exec(
        readFileSync(join(ROOT, "engine/ui/sprites.ts"), "utf8"),
    )?.[1] ?? "";
if (!DRAWN) throw new Error("engine/ui/sprites.ts has no DRAWN");

// a drawing is drawn at a power of two of pixels to a unit, the one past what the camera shows it at,
// so one scale just past each power of two meets every drawing at every scale between the least and
// the most a device shows it: the map from zoom 0.004 to 0.9, a roll from 0.08 to 1.2, at a density of
// one to two (engine/ui/overworld.tsx, world.tsx and gl.ts)
const steps = (from: number, to: number, most: number): number[] => [
    ...Array.from({ length: to - from + 1 }, (_, i) => 2 ** (from + i) * 1.001),
    most,
];
const MAP_SCALES = steps(-8, 0, 1.8);
const ROLL_SCALES = steps(-4, 1, 2.4);

async function call(page: Page, name: string, t?: number): Promise<unknown> {
    return page.evaluate(
        async ([hook, at]) => {
            const f: unknown = Reflect.get(window, hook);
            if (typeof f !== "function") return undefined;
            const got: unknown = await Reflect.apply(f, window, [at]);
            return got;
        },
        [name, t] as const,
    );
}

const fileOf = (key: string): string =>
    `${createHash("sha1").update(key).digest("hex").slice(0, 20)}.webp`;

async function main(): Promise<void> {
    // a bake served while this one draws would be fetched rather than drawn, and so not kept to write
    rmSync(OUT, { recursive: true, force: true });
    const browser = await chromium.launch({
        channel: "chrome",
        args: ["--disable-component-update"],
    });
    try {
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            reducedMotion: "reduce",
        });
        const page = await context.newPage();
        await page.goto(`${BASE}/?mapDebug&mapCache#/map`);
        await page.getByRole("dialog").locator(".ow-host.ready").waitFor({ timeout: 120_000 });
        for (const t of MAP_SCALES) {
            const started = Date.now();
            await call(page, "mapBake", t);
            process.stdout.write(
                `art bake: the map at ${t.toFixed(4)} in ${Date.now() - started} ms\n`,
            );
        }
        const listed = await call(page, "mapWorlds");
        const worlds = Array.isArray(listed)
            ? listed.filter((w): w is string => typeof w === "string")
            : [];
        for (const world of worlds) {
            await page.evaluate((w) => {
                location.hash = `/map/${w}`;
            }, world);
            await page.locator(".wd.ready").first().waitFor({ timeout: 120_000 });
            await page.waitForTimeout(1500);
            for (const t of ROLL_SCALES) await call(page, "rollBake", t);
            process.stdout.write(`art bake: ${world}\n`);
        }
        const stores = await page.evaluate(() => caches.keys());
        const store = stores.find((s) => s.startsWith("lumischool-art-dev~"));
        if (!store) throw new Error("the workers kept nothing");
        const palette = store.split("~")[1] ?? "";
        const urls = await page.evaluate(async (name) => {
            const kept = await caches.open(name);
            return (await kept.keys()).map((r) => r.url);
        }, store);
        // written aside, and named by what it holds once it is all written
        const aside = join(OUT, "baking", palette);
        mkdirSync(aside, { recursive: true });
        const index = new Map<string, Record<string, string | 0>>();
        let bytes = 0;
        for (let i = 0; i < urls.length; i += 100) {
            const got = await page.evaluate(
                async ([name, some]) => {
                    const kept = await caches.open(name);
                    return Promise.all(
                        some.map(async (url): Promise<[string, string | 0 | null]> => {
                            const hit = await kept.match(url);
                            if (!hit) return [url, null];
                            const kind = hit.headers.get("x-art");
                            if (kind === "empty") return [url, 0];
                            if (kind !== "drawn") return [url, null];
                            const b = new Uint8Array(await hit.arrayBuffer());
                            let s = "";
                            for (let k = 0; k < b.length; k += 0x8000)
                                s += String.fromCharCode(...b.subarray(k, k + 0x8000));
                            return [url, btoa(s)];
                        }),
                    );
                },
                [store, urls.slice(i, i + 100)] as const,
            );
            for (const [url, body] of got) {
                if (body === null) continue;
                const key = decodeURIComponent(
                    url.slice(url.indexOf("/__art/") + "/__art/".length),
                );
                const part = index.get(key.charAt(0)) ?? {};
                index.set(key.charAt(0), part);
                if (body === 0) {
                    part[key] = 0;
                    continue;
                }
                const file = fileOf(key);
                const data = Buffer.from(body, "base64");
                writeFileSync(join(aside, file), data);
                bytes += data.length;
                part[key] = file;
            }
        }
        const whole = createHash("sha1").update(DRAWN);
        for (const [letter, part] of [...index].sort(([a], [b]) => a.localeCompare(b))) {
            const text = JSON.stringify(part);
            whole.update(letter).update(text);
            writeFileSync(join(aside, `index-${letter}.json`), text);
        }
        // a bake is served as immutable, so a new one is at a new address the page is told of
        const version = whole.digest("hex").slice(0, 16);
        const dir = join(OUT, version);
        renameSync(join(OUT, "baking"), dir);
        writeFileSync(
            join(ROOT, "engine/ui/art-manifest.ts"),
            `// Generated by npm run art:bake: where the drawings baked with the build are (engine/ui/baked.ts).\nexport const ART_BAKE: string = "${version}";\n`,
        );
        process.stdout.write(
            `art bake: ${urls.length} drawings, ${(bytes / 1024 / 1024).toFixed(1)} MiB, in ${dir}\n`,
        );
    } finally {
        await browser.close();
    }
}

await main();
