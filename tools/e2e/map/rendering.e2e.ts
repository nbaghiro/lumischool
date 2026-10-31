import { expect } from "@playwright/test";
import { test } from "../steps";

declare global {
    interface Window {
        terrainRequests: number;
        mapZoom(z: number): void;
        mapMemory(): {
            bytes: number;
            limit: number;
            highWater: number;
            owners: number;
            active: number;
            presentation: number;
        };
        mapRefine(factor: number): void;
        mapDiagnostics(): { notes: Record<string, number>; counts: Record<string, number> };
    }
}

test("visible detailed terrain survives fresh refinement at a fixed camera", async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/home?mapDebug#/map");
    await page.getByRole("dialog").locator(".ow-host.ready").waitFor({ timeout: 60_000 });
    await page.evaluate(() => window.mapZoom(0.24 / Math.min(1.5, devicePixelRatio)));
    await expect
        .poll(
            async () =>
                page.evaluate(() => {
                    const { notes } = window.mapDiagnostics();
                    return (
                        (notes["terrain-live"] ?? 0) > 0 &&
                        notes["terrain-live"] === notes["terrain-regions"]
                    );
                }),
            { timeout: 30_000 },
        )
        .toBe(true);
    const before = await page.evaluate(() => window.mapDiagnostics());
    await page.evaluate(() => window.mapRefine(2));
    const during = await page.evaluate(async () => {
        const samples: { live: number; total: number; busy: number }[] = [];
        const end = performance.now() + 2500;
        while (performance.now() < end) {
            await new Promise<void>((done) => requestAnimationFrame(() => done()));
            const { notes } = window.mapDiagnostics();
            samples.push({
                live: notes["terrain-live"] ?? 0,
                total: notes["terrain-regions"] ?? 0,
                busy: notes["art-busy"] ?? 0,
            });
        }
        return { samples, report: window.mapDiagnostics() };
    });
    expect(during.samples.some((s) => s.busy > 0)).toBe(true);
    expect(during.samples.every((s) => s.live === s.total && s.live > 0)).toBe(true);
    expect(during.report.counts["terrain-lost"] ?? 0).toBe(before.counts["terrain-lost"] ?? 0);
    expect(errors).toEqual([]);
    await page.evaluate(() => window.mapRefine(0));
});

test("refinement and region transitions preserve premultiplied ink opacity", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/__rendering-fixture", (route) =>
        route.fulfill({
            contentType: "text/html",
            body: '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script type="module" src="/tools/e2e/map/rendering-fixture.ts"></script></body></html>',
        }),
    );
    await page.goto("/__rendering-fixture");
    await page.waitForFunction(() => typeof window.renderingProbe === "function");
    const report = await page.evaluate(() => window.renderingProbe());
    expect(errors).toEqual([]);
    expect(report.errors).toEqual(Array.from({ length: 16 }, () => 0));
    const expected = [0, 0.25, 0.5, 0.75, 1].flatMap((t) => [
        [128 * (1 - t), 0, 128 * t, 128],
        [128 * (1 - t), 0, 128 * t, 128],
        [128 * (1 - t), 0, 128 * t, 128],
    ]);
    expected.push([96, 0, 64, 160]);
    for (const [i, pixel] of report.samples.entries())
        for (const [channel, value] of pixel.entries())
            expect(
                Math.abs(value - (expected[i]?.[channel] ?? -999)),
                `sample ${i}, channel ${channel}`,
            ).toBeLessThanOrEqual(1);
});

test("stale handoffs and failed workers cannot poison the next owner", async ({ page }) => {
    await page.addInitScript(() => {
        window.probeWorkers = [];
        const OriginalWorker = Worker;
        window.Worker = class extends OriginalWorker {
            constructor(url: string | URL, options?: WorkerOptions) {
                super(url, options);
                window.probeWorkers.push(this);
            }
        };
    });
    await page.route("**/__rendering-fixture", (route) =>
        route.fulfill({
            contentType: "text/html",
            body: '<script type="module" src="/tools/e2e/map/rendering-fixture.ts"></script>',
        }),
    );
    await page.goto("/__rendering-fixture");
    await page.waitForFunction(() => typeof window.handoffProbe === "function");
    expect(await page.evaluate(() => window.allocationProbe())).toEqual([
        true,
        true,
        true,
        true,
        true,
    ]);
    expect(await page.evaluate(() => window.handoffProbe())).toEqual([
        true,
        true,
        true,
        true,
        true,
    ]);
    expect(
        await page.evaluate(async () => {
            const pending = window.rasterProbe();
            const failed = [...window.probeWorkers];
            for (const worker of failed)
                worker.dispatchEvent(new ErrorEvent("error", { cancelable: true }));
            return pending;
        }),
    ).toBe(false);
    expect(await page.evaluate(() => window.rasterProbe())).toBe(true);
    expect(await page.evaluate(() => window.decodeProbe())).toBe(true);
    await page.evaluate(() => {
        // The decoder was created after the raster workers.
        window.probeWorkers.at(-1)?.dispatchEvent(new MessageEvent("messageerror"));
    });
    expect(await page.evaluate(() => window.decodeProbe())).toBe(true);
});

test("twenty map and roll visits release their shared GPU reservations", async ({ page }, info) => {
    test.setTimeout(process.env.MAP_SOAK ? 900_000 : 300_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/home?mapDebug#/map");
    const samples: {
        bytes: number;
        limit: number;
        highWater: number;
        owners: number;
        active: number;
        presentation: number;
    }[] = [];
    for (let i = 0; i < 20; i++) {
        await expect(page.locator(".ow-host.ready")).toBeVisible({ timeout: 60_000 });
        await page.evaluate(() => {
            location.hash = "/map/harbour";
        });
        await expect(page.locator(".wd.ready")).toBeVisible({ timeout: 60_000 });
        samples.push(await page.evaluate(() => window.mapMemory()));
        await page.evaluate(() => {
            location.hash = "/map";
        });
    }
    await expect(page.locator(".ow-host.ready")).toBeVisible({ timeout: 60_000 });
    if (process.env.MAP_SOAK) {
        const end = Date.now() + 600_000;
        let turn = 0;
        while (Date.now() < end) {
            const zooms = [0.04, 0.08, 0.16, 0.3, 0.12];
            await page.evaluate((z) => window.mapZoom(z), zooms[turn++ % zooms.length] ?? 0.12);
            await page.waitForTimeout(1000);
            samples.push(await page.evaluate(() => window.mapMemory()));
        }
    }
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await expect.poll(() => page.evaluate(() => window.mapMemory().active)).toBe(0);
    const closed = await page.evaluate(() => window.mapMemory());
    // Desktop retains one bounded spare roll; small devices release every context.
    expect(closed.owners).toBeLessThanOrEqual(closed.limit <= 192 * 1024 * 1024 ? 0 : 1);
    expect(closed.bytes).toBeLessThanOrEqual(
        closed.limit <= 192 * 1024 * 1024 ? 0 : 96 * 1024 * 1024,
    );
    expect(samples.every((s) => s.bytes <= s.limit)).toBe(true);
    expect(errors).toEqual([]);
    await info.attach("map-memory", {
        body: JSON.stringify(samples),
        contentType: "application/json",
    });
});

test("a failed terrain index retries instead of leaving map readiness pending", async ({
    page,
}) => {
    await page.addInitScript(() => {
        const fetch = window.fetch.bind(window);
        window.terrainRequests = 0;
        window.fetch = (input, init) => {
            const url = input instanceof Request ? input.url : String(input);
            if (
                /\/assets\/map-tiles\/[^/]+\/index\.json/.test(url) &&
                ++window.terrainRequests === 1
            )
                return Promise.resolve(new Response("retry", { status: 503 }));
            return fetch(input, init);
        };
    });
    await page.goto("/home?mapDebug#/map");
    await expect(page.locator(".ow-host.ready")).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => page.evaluate(() => window.terrainRequests)).toBeGreaterThanOrEqual(2);
    await expect
        .poll(() => page.evaluate(() => window.mapDiagnostics().notes["terrain-regions"] ?? 0))
        .toBeGreaterThan(0);
});
