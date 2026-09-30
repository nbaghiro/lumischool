// `npm run site:pictures`: the site's pictures of the sample child's map (apps/site/page.tsx), which its
// map sections show in place of a live map: the journey at each stop, each card's place and the
// journal's. It opens the site with `?livePictures`, where those sections draw the live map, pictures
// each at a wide screen's size and a phone's, and writes the WebP files to apps/site/pictures/ and
// their list to apps/site/pictures.ts. Run it with `npm run dev` up when the map or the sample changes.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Locator, type Page } from "@playwright/test";
import { format, resolveConfig } from "prettier";

const BASE = process.env.PICTURES_BASE ?? "http://localhost:8500";
const ROOT = join(import.meta.dirname, "..", "..");
const OUT = join(ROOT, "apps/site/pictures");
/** WebP's quality, 0 to 1, as the map's snapshots are kept (tools/scripts/map-snapshots.ts). */
const QUALITY = 0.72;
/** The sizes pictured: a laptop's window, and a phone's, which the site's narrow layout serves. */
const SIZES = {
    wide: { width: 1440, height: 900 },
    narrow: { width: 390, height: 844 },
} as const;

/** Waits for the map in `box` to be drawn and to have nothing left to draw. */
async function settled(page: Page, box: Locator): Promise<void> {
    await box.locator(".ow-host.ready").waitFor({ timeout: 120_000 });
    await page
        .waitForFunction(
            () => {
                const read: unknown = Reflect.get(window, "mapDiagnostics");
                if (typeof read !== "function") return true;
                const got: unknown = Reflect.apply(read, window, []);
                const notes: unknown =
                    typeof got === "object" && got !== null ? Reflect.get(got, "notes") : null;
                const busy: unknown =
                    typeof notes === "object" && notes !== null
                        ? Reflect.get(notes, "art-busy")
                        : 0;
                return busy === 0;
            },
            undefined,
            { timeout: 60_000, polling: 250 },
        )
        .catch(() => undefined);
    await page.waitForTimeout(1500);
}

/** `box` as it is drawn, as WebP. */
async function picture(page: Page, box: Locator): Promise<Buffer> {
    // the diagnostics' own button, which `mapDebug` puts at the window's edge, is not the map
    await page.evaluate(() => {
        for (const b of document.querySelectorAll("button"))
            if (b.textContent?.includes("map report")) b.remove();
    });
    const png = await box.screenshot({ animations: "disabled" });
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
            if (!blob) return "";
            let s = "";
            for (const b of new Uint8Array(await blob.arrayBuffer())) s += String.fromCharCode(b);
            return btoa(s);
        },
        { b64: png.toString("base64"), quality: QUALITY },
    );
    if (!encoded) throw new Error("this Chrome could not encode WebP");
    return Buffer.from(encoded, "base64");
}

async function main(): Promise<void> {
    const browser = await chromium.launch({
        channel: "chrome",
        args: ["--disable-component-update"],
    });
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const made: Record<"journey" | "cards" | "journal", Record<keyof typeof SIZES, string[]>> = {
        journey: { wide: [], narrow: [] },
        cards: { wide: [], narrow: [] },
        journal: { wide: [], narrow: [] },
    };
    const keep = (
        kind: keyof typeof made,
        size: keyof typeof SIZES,
        i: number,
        data: Buffer,
    ): void => {
        const file = `${kind}-${size}-${i}.webp`;
        writeFileSync(join(OUT, file), data);
        made[kind][size].push(file);
        process.stdout.write(`site pictures: ${file}, ${(data.length / 1024).toFixed(0)} KiB\n`);
    };
    try {
        for (const size of ["wide", "narrow"] as const) {
            const viewport = SIZES[size];
            const context = await browser.newContext({
                viewport,
                deviceScaleFactor: 2,
                reducedMotion: "reduce",
            });
            const page = await context.newPage();
            await page.goto(`${BASE}/home?livePictures&mapDebug`);
            // the pictures are of the map alone: the site's bar, which stays at the window's top, and
            // the boxes' own edges, which the page draws round each picture, are left out
            await page.addStyleTag({
                content:
                    ".site-bar,header{visibility:hidden!important}.site-window,.site-pic{border:0!important;border-radius:0!important}",
            });
            const journey = page.locator(".site-journey-map .site-window");
            await journey.scrollIntoViewIfNeeded();
            await settled(page, journey);
            const stops = await page.locator(".site-step").count();
            for (let i = 0; i < stops; i++) {
                await page.evaluate((at) => {
                    const go: unknown = Reflect.get(window, "siteStop");
                    if (typeof go === "function") Reflect.apply(go, window, [at]);
                }, i);
                await journey.scrollIntoViewIfNeeded();
                await settled(page, journey);
                keep("journey", size, i, await picture(page, journey));
            }
            const cards = page.locator(".site-card .site-pic");
            for (let i = 0; i < (await cards.count()); i++) {
                const card = cards.nth(i);
                await card.scrollIntoViewIfNeeded();
                await settled(page, card);
                keep("cards", size, i, await picture(page, card));
            }
            const journal = page.locator(".site-lesson .site-pic").first();
            await journal.scrollIntoViewIfNeeded();
            await settled(page, journal);
            keep("journal", size, 0, await picture(page, journal));
            await context.close();
        }
    } finally {
        await browser.close();
    }
    const list = (files: readonly string[]): string =>
        `[${files.map((f) => `new URL("./pictures/${f}", import.meta.url).href`).join(", ")}]`;
    const kind = (k: keyof typeof made): string =>
        `{ wide: ${list(made[k].wide)}, narrow: ${list(made[k].narrow)} }`;
    const listed = join(ROOT, "apps/site/pictures.ts");
    const text = `// Made by tools/scripts/site-pictures.ts (npm run site:pictures). Do not edit by hand.

/** Pictures of the sample child's map as the site's sections show it, for a wide screen and a phone. */
export const PICTURES: {
    journey: { wide: readonly string[]; narrow: readonly string[] };
    cards: { wide: readonly string[]; narrow: readonly string[] };
    journal: { wide: readonly string[]; narrow: readonly string[] };
} = {
    journey: ${kind("journey")},
    cards: ${kind("cards")},
    journal: ${kind("journal")},
};
`;
    writeFileSync(
        listed,
        await format(text, { ...(await resolveConfig(listed)), filepath: listed }),
    );
}

await main();
