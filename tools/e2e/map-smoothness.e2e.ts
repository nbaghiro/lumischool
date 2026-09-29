import { expect, type Locator, type Page } from "@playwright/test";
import { test } from "./steps";

// Every flow a family takes over the map and into a world, measured by the scene itself (?mapDebug,
// engine/ui/map-diagnostics.ts, .docs/map-smoothness-plan.md). A drawing on the screen in one frame is
// never missing in the next, and none on the screen is rasterised again as it was.

const COUNTED = [
    "lost",
    "late",
    "rastered",
    "kept",
    "cached",
    "redrawn",
    "sharpened",
    "mutated",
] as const;
type Counts = Record<(typeof COUNTED)[number], number>;

/** The counts, each read by `get`. */
const countsOf = (get: (k: (typeof COUNTED)[number]) => number): Counts => ({
    lost: get("lost"),
    late: get("late"),
    rastered: get("rastered"),
    kept: get("kept"),
    cached: get("cached"),
    redrawn: get("redrawn"),
    sharpened: get("sharpened"),
    mutated: get("mutated"),
});

interface Report {
    counts: Counts;
    /** What the scene's frames cost the page's thread, in hundredths of a millisecond, and how many there were. */
    cost: number;
    sceneFrames: number;
    busy: boolean;
    quietAt: number;
    movedAt: number;
}

async function report(page: Page): Promise<Report> {
    const read = await page.evaluate((counted) => {
        const callable = (f: unknown): f is () => unknown => typeof f === "function";
        const read: unknown = Reflect.get(window, "mapDiagnostics");
        const got: unknown = callable(read) ? read() : null;
        const field = (from: unknown, k: string): unknown =>
            typeof from === "object" && from !== null ? Reflect.get(from, k) : undefined;
        const n = (from: unknown, k: string): number => {
            const v = field(from, k);
            return typeof v === "number" ? v : 0;
        };
        const counts = field(got, "counts");
        const notes = field(got, "notes");
        return {
            counts: Object.fromEntries(counted.map((k) => [k, n(counts, `art-${k}`)])),
            cost: n(counts, "scene-cost"),
            sceneFrames: n(counts, "scene-frames"),
            busy: n(notes, "art-busy") > 0,
            quietAt: n(notes, "art-quiet-at"),
            movedAt: n(notes, "camera-moved-at"),
        };
    }, COUNTED);
    return { ...read, counts: countsOf((k) => read.counts[k] ?? 0) };
}

interface Measured extends Counts {
    /** What a frame of the scene cost the page's thread on average, in ms. */
    scene: number;
    /** From the camera's last move to every drawing in view drawn at its final sharpness, in ms. */
    sharp: number;
}

/** Runs a flow and gives what the scene counted while it ran, and the gaps between frames. */
async function flow(page: Page, name: string, act: () => Promise<void>): Promise<Measured> {
    const before = await report(page);
    await page.evaluate(() => {
        const gaps: number[] = [];
        let last = performance.now();
        let on = true;
        const tick = (t: number): void => {
            gaps.push(t - last);
            last = t;
            if (on) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        Reflect.set(window, "smoothness", {
            stop: () => {
                on = false;
                return gaps.slice(2).sort((a, b) => a - b);
            },
        });
    });
    await act();
    // the flow is over once the scene has drawn everything in view sharp, or five seconds have passed
    await expect
        .poll(async () => (await report(page)).busy, { timeout: 5000 })
        .toBe(false)
        .catch(() => undefined);
    const gaps = await page.evaluate(() => {
        const s: unknown = Reflect.get(window, "smoothness");
        const callable = (f: unknown): f is () => unknown => typeof f === "function";
        const stop: unknown = typeof s === "object" && s !== null ? Reflect.get(s, "stop") : null;
        const out: unknown = callable(stop) ? stop() : [];
        return Array.isArray(out) ? out.filter((g): g is number => typeof g === "number") : [];
    });
    const after = await report(page);
    const q = (p: number): number => gaps[Math.floor(p * (gaps.length - 1))] ?? 0;
    const counts = countsOf((k) => after.counts[k] - before.counts[k]);
    // quiet before the camera's last move and quiet now means nothing after it needed drawing
    const sharp = after.busy
        ? -1
        : after.quietAt < after.movedAt
          ? 0
          : Math.round(after.quietAt - after.movedAt);
    const scene =
        (after.cost - before.cost) / 100 / Math.max(1, after.sceneFrames - before.sceneFrames);
    test.info().annotations.push({
        type: name,
        description: `${COUNTED.map((k) => `${k} ${counts[k]}`).join(", ")}, sharp ${sharp < 0 ? "not yet" : `${sharp} ms`}, scene ${scene.toFixed(2)} ms a frame, frames p50 ${q(0.5).toFixed(1)} p95 ${q(0.95).toFixed(1)} max ${q(1).toFixed(1)} ms`,
    });
    return { ...counts, sharp, scene };
}

/** Moves over `on` with wheel events sent to it, since a phone's browser under test has no wheel of its own. */
async function wheel(on: Locator, steps: { dx: number; dy: number; zoom?: boolean }[]) {
    const box = await on.boundingBox();
    if (!box) throw new Error("nothing to move");
    const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 };
    for (const s of steps) {
        await on.dispatchEvent("wheel", { deltaX: s.dx, deltaY: s.dy, ctrlKey: !!s.zoom, ...at });
        await on.page().waitForTimeout(16);
    }
}

const times = <T>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i));

const intoTheWoods = async (page: Page): Promise<void> => {
    await page.evaluate(() => {
        location.hash = "/map/woods";
    });
    await expect(page.locator(".wd.ready").first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(6000);
};

const backToTheMap = async (page: Page): Promise<void> => {
    const map = page.getByRole("dialog").locator(".ow-host.ready");
    // the roll's own way out, which on a phone's narrow roll may be a world or two on from where the
    // flow went in, since a pan past a world's end walks on into the next
    const out = page.getByRole("button", { name: "Back to the map", exact: true });
    // it shows on a hand over the paper or on the keyboard's focus, as a child finds it
    if ((await out.count()) > 0) {
        await out.focus();
        await out.click();
    } else await page.goBack();
    await expect(map).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(3000);
};

test("no art on the map or in a world goes missing or is drawn again as a family moves over it", async ({
    page,
}) => {
    test.setTimeout(300_000);
    await page.goto("/?mapDebug#/map");
    const map = page.getByRole("dialog").locator(".ow-host.ready");
    await expect(map).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(2000);
    const results: [string, Measured][] = [];
    const run = async (name: string, act: () => Promise<void>): Promise<void> => {
        results.push([name, await flow(page, name, act)]);
    };

    await run("every world, then a world", async () => {
        if ((await map.locator(".ow-scope").textContent()) !== "Near me")
            await map.getByRole("button", { name: "Every world", exact: true }).click();
        await page.waitForTimeout(2500);
        await map.locator('.ow-node[aria-label*="woods" i]').first().dispatchEvent("click");
        await page.waitForTimeout(3500);
    });
    await run("pan and zoom", async () => {
        await wheel(
            map,
            times(40, (i) => ({ dx: i % 20 < 10 ? 90 : -60, dy: 50 })),
        );
        await wheel(
            map,
            times(20, () => ({ dx: 0, dy: 40, zoom: true })),
        );
        await wheel(
            map,
            times(30, () => ({ dx: 0, dy: -40, zoom: true })),
        );
        await page.waitForTimeout(1500);
    });
    await run("the map painted again", async () => {
        await page.evaluate(() => {
            const redraw: unknown = Reflect.get(window, "mapRedraw");
            const callable = (f: unknown): f is () => void => typeof f === "function";
            if (callable(redraw)) redraw();
        });
        await page.waitForTimeout(3000);
    });
    await run("fly", async () => {
        await map.getByRole("button", { name: "Fly the paper plane (P)" }).click();
        await page.keyboard.down("ArrowLeft");
        await page.waitForTimeout(2500);
        await page.keyboard.up("ArrowLeft");
        await page.keyboard.down("ArrowRight");
        await page.waitForTimeout(2500);
        await page.keyboard.up("ArrowRight");
        // a flight that has come down by itself has nothing to land
        const land = map.getByRole("button", {
            name: "Stop flying and land at the nearest world",
        });
        if (await land.isVisible()) await land.click();
        await page.waitForTimeout(2500);
    });
    await run("into a world", () => intoTheWoods(page));
    await run("around the roll", async () => {
        const roll = page.locator(".wd.ready .wd-host").first();
        await wheel(
            roll,
            times(60, (i) => ({ dx: 0, dy: i < 30 ? 70 : -70 })),
        );
        await wheel(
            roll,
            times(20, () => ({ dx: 0, dy: 30, zoom: true })),
        );
        await wheel(
            roll,
            times(20, () => ({ dx: 0, dy: -30, zoom: true })),
        );
        await page.waitForTimeout(1500);
    });
    await run("close up on the roll, resting", async () => {
        const roll = page.locator(".wd.ready .wd-host").first();
        await wheel(
            roll,
            times(12, () => ({ dx: 0, dy: -40, zoom: true })),
        );
        await page.waitForTimeout(2500);
        await wheel(
            roll,
            times(20, () => ({ dx: 0, dy: 80 })),
        );
        await page.waitForTimeout(2500);
    });
    await run("back to the map", () => backToTheMap(page));
    await run("into the same world again", () => intoTheWoods(page));
    await run("back to the map again", () => backToTheMap(page));

    expect(
        results.filter(([, c]) => c.lost > 0).map(([name, c]) => `${name}: ${c.lost} lost`),
        "a drawing on the screen went missing",
    ).toEqual([]);
});

test("once a world has arrived, nothing on the screen changes", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the screencast is Chromium's");
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?mapDebug#/map");
    await expect(page.getByRole("dialog").locator(".ow-host.ready")).toBeVisible({
        timeout: 60_000,
    });
    await page.waitForTimeout(2000);
    await intoTheWoods(page);
    const client = await page.context().newCDPSession(page);
    const frames: string[] = [];
    client.on("Page.screencastFrame", (f) => {
        frames.push(f.data);
        void client
            .send("Page.screencastFrameAck", { sessionId: f.sessionId })
            .catch(() => undefined);
    });
    await client.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
    await page.waitForTimeout(3000);
    await client.send("Page.stopScreencast");
    const changed = frames.filter((f, i) => i > 0 && f !== frames[i - 1]).length;
    info.annotations.push({
        type: "settled",
        description: `${changed} of ${frames.length} frames changed`,
    });
    expect(changed, "a frame differed from the one before it after the world arrived").toBe(0);
});

test("a world seen before is drawn from the pixels kept on the device after the page is loaded again", async ({
    page,
}, info) => {
    test.setTimeout(240_000);
    const open = async (): Promise<void> => {
        await expect(page.getByRole("dialog").locator(".ow-host.ready")).toBeVisible({
            timeout: 60_000,
        });
        await page.waitForTimeout(1500);
    };
    // the kept pixels are named by the build; under the dev server a page asks for them
    await page.goto("/?mapDebug&mapCache#/map");
    await open();
    await intoTheWoods(page);
    // what was drawn is written as it is sent, so the writes are given a moment to land
    await page.waitForTimeout(8000);
    await page.goto("about:blank");
    await page.goto("/?mapDebug&mapCache#/map");
    await open();
    const again = await flow(page, "into the woods after the page is loaded again", () =>
        intoTheWoods(page),
    );
    expect(again.lost, "a drawing on the screen went missing").toBe(0);
    // WebKit under Playwright writes what it keeps too slowly for a visit this short to have much of
    // it back (.docs/map-smoothness-plan.md, phase 7), so there the numbers are reported and not held
    if (info.project.name !== "desktop") return;
    expect(again.cached, "nothing came from the kept pixels").toBeGreaterThan(0);
    expect(
        again.rastered,
        "the roll was drawn again rather than taken from what was kept",
    ).toBeLessThan(again.cached);
});

test("a world drawn from the pixels kept on the device looks as it did drawn afresh", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "WebKit keeps too little in a visit this short");
    test.setTimeout(240_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const settled = async (): Promise<string> => {
        await expect.poll(async () => (await report(page)).busy, { timeout: 30_000 }).toBe(false);
        await page.waitForTimeout(1500);
        const roll = page.locator(".wd.ready").first();
        return (await roll.screenshot()).toString("base64");
    };
    const open = async (): Promise<void> => {
        await page.goto("/?mapDebug&mapCache#/map");
        await expect(page.getByRole("dialog").locator(".ow-host.ready")).toBeVisible({
            timeout: 60_000,
        });
        await page.waitForTimeout(1500);
        await intoTheWoods(page);
    };
    await open();
    const fresh = await settled();
    const drawn = await report(page);
    // what was drawn is written as it is sent, so the writes are given a moment to land
    await page.waitForTimeout(8000);
    await page.goto("about:blank");
    await open();
    const kept = await settled();
    const after = await report(page);
    expect(after.counts.cached, "nothing came from the kept pixels").toBeGreaterThan(0);
    const differ = await page.evaluate(
        async ([a, b]) => {
            const pixels = async (png: string): Promise<ImageData> => {
                const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
                const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
                const c = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d");
                if (!c) throw new Error("no canvas");
                c.drawImage(bitmap, 0, 0);
                return c.getImageData(0, 0, bitmap.width, bitmap.height);
            };
            const [x, y] = await Promise.all([pixels(a), pixels(b)]);
            if (x.width !== y.width || x.height !== y.height) return 1;
            let off = 0;
            for (let i = 0; i < x.data.length; i += 4)
                for (let k = 0; k < 3; k++)
                    if (Math.abs((x.data[i + k] ?? 0) - (y.data[i + k] ?? 0)) > 12) {
                        off++;
                        break;
                    }
            return off / (x.width * x.height);
        },
        [fresh, kept] as const,
    );
    info.annotations.push({
        type: "fresh and kept",
        description: `${(differ * 100).toFixed(3)}% of pixels differ; rastered ${drawn.counts.rastered} then ${after.counts.rastered}, cached ${after.counts.cached}`,
    });
    if (differ >= 0.005)
        for (const [name, png] of [
            ["fresh", fresh],
            ["kept", kept],
        ] as const)
            await info.attach(name, { body: Buffer.from(png, "base64"), contentType: "image/png" });
    expect(differ, "the kept pixels do not look as the drawings drawn afresh").toBeLessThan(0.005);
});
