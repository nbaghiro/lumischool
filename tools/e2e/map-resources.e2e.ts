import { expect, type Locator, type Page } from "@playwright/test";
import { signInAs, test } from "./steps";

declare global {
    interface Window {
        mapResourceProbe: {
            capture(): void;
            detachedObservers(): number;
            detachedPixels(): number;
        };
        mapTilesProbe: { el: Element; key: string; drawing: string }[];
    }
}

for (const motion of ["reduce", "no-preference"] as const) {
    test(`closing repeated map and world views releases their observers and canvas storage (${motion})`, async ({
        page,
    }) => {
        await page.emulateMedia({ reducedMotion: motion });
        await page.addInitScript(() => {
            const targets = new Map<ResizeObserver | IntersectionObserver, Set<Element>>();
            const track = (owner: ResizeObserver | IntersectionObserver, target: Element) => {
                let owned = targets.get(owner);
                if (!owned) targets.set(owner, (owned = new Set()));
                owned.add(target);
            };
            const canvases = new Set<HTMLCanvasElement>();
            const Native = ResizeObserver;
            window.ResizeObserver = class extends Native {
                override observe(target: Element, options?: ResizeObserverOptions): void {
                    track(this, target);
                    super.observe(target, options);
                }
                override unobserve(target: Element): void {
                    targets.get(this)?.delete(target);
                    super.unobserve(target);
                }
                override disconnect(): void {
                    targets.delete(this);
                    super.disconnect();
                }
            };
            const NativeIntersection = IntersectionObserver;
            window.IntersectionObserver = class extends NativeIntersection {
                override observe(target: Element): void {
                    track(this, target);
                    super.observe(target);
                }
                override unobserve(target: Element): void {
                    targets.get(this)?.delete(target);
                    super.unobserve(target);
                }
                override disconnect(): void {
                    targets.delete(this);
                    super.disconnect();
                }
            };
            window.mapResourceProbe = {
                capture() {
                    for (const canvas of document.querySelectorAll<HTMLCanvasElement>(
                        '[role="dialog"] canvas',
                    ))
                        canvases.add(canvas);
                },
                detachedObservers() {
                    let count = 0;
                    for (const owned of targets.values())
                        for (const target of owned)
                            if (
                                !target.isConnected &&
                                (target.matches(".ow-host, .wd-host, .pl-host, .ow-go, .m-feat") ||
                                    target.closest(".world"))
                            )
                                count++;
                    return count;
                },
                detachedPixels() {
                    let pixels = 0;
                    for (const canvas of canvases)
                        if (!canvas.isConnected) pixels += canvas.width * canvas.height;
                    return pixels;
                },
            };
        });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto("/home");
        for (let visit = 0; visit < 4; visit++) {
            await page.getByRole("link", { name: "See the map" }).click();
            const look = page.getByRole("dialog", { name: "A sample child's map" });
            await expect(look.locator(".ow-host.ready")).toBeVisible({ timeout: 60_000 });
            await page.evaluate(() => window.mapResourceProbe.capture());
            await page.evaluate(() => {
                location.hash = "/map/harbour";
            });
            await expect(look.locator(".wd.ready")).toBeVisible({ timeout: 60_000 });
            await page.evaluate(() => window.mapResourceProbe.capture());
            await look.getByRole("button", { name: "Close" }).click();
            await expect(look).toHaveCount(0);
            await expect
                .poll(() => page.evaluate(() => window.mapResourceProbe.detachedObservers()))
                .toBe(0);
            expect(await page.evaluate(() => window.mapResourceProbe.detachedPixels())).toBe(0);
        }
        expect(errors).toEqual([]);
    });
}

test("atlas terrain detail is released away from the camera and reconstructed with the same ink", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInAs(page);
    await page
        .getByRole("navigation", { name: "The grown-ups' places" })
        .getByRole("link", { name: "Map" })
        .click();
    const map = page.locator(".ow-host.ready");
    await expect(map).toBeVisible({ timeout: 60_000 });
    const meadow = map.locator('.ow-node[aria-label*="meadow" i]').first();
    const sky = map.locator('.ow-node[aria-label*="night sky" i]').first();
    await meadow.dispatchEvent("click");
    await expect(meadow).toHaveAttribute("tabindex", "0");
    await expect.poll(() => map.locator(".ow-marks").count()).toBeGreaterThan(0);
    await map.evaluate((root) => {
        window.mapTilesProbe = Array.from(root.querySelectorAll(".ow-marks")).map((el) => ({
            el,
            key: `${el.getAttribute("viewBox")}|${el.getAttribute("class")}`,
            drawing: Array.from(el.querySelectorAll("path"))
                .map((p) => p.getAttribute("d"))
                .join("|"),
        }));
    });
    await sky.dispatchEvent("click");
    await expect(sky).toHaveAttribute("tabindex", "0");
    await expect
        .poll(() =>
            page.evaluate(() => window.mapTilesProbe.filter((p) => !p.el.isConnected).length),
        )
        .toBeGreaterThan(0);
    await meadow.dispatchEvent("click");
    await expect(meadow).toHaveAttribute("tabindex", "0");
    await expect
        .poll(() =>
            map.evaluate((root) => {
                const now = Array.from(root.querySelectorAll(".ow-marks"));
                return window.mapTilesProbe.some(
                    (old) =>
                        !old.el.isConnected &&
                        now.some(
                            (el) =>
                                `${el.getAttribute("viewBox")}|${el.getAttribute("class")}` ===
                                    old.key &&
                                Array.from(el.querySelectorAll("path"))
                                    .map((p) => p.getAttribute("d"))
                                    .join("|") === old.drawing,
                        ),
                );
            }),
        )
        .toBe(true);
});

test("a map under the overlay lets its canvas go, and every canvas stays bounded across resizing", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Phone backdrops intentionally retain their snapshots instead of mounting a live map.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/home");
    await page.locator("#you").scrollIntoViewIfNeeded();
    const canvases = page.locator(".ow-host > canvas");
    const underneath = page.locator("main .ow-host > canvas");
    await expect.poll(() => underneath.count()).toBeGreaterThan(0);
    await page.evaluate(() => {
        location.hash = "/map";
    });
    await expect(page.getByRole("dialog").locator(".ow-host.ready")).toBeVisible();
    // the page's own maps are covered by the dialog, so they draw nothing and hold no canvas
    await expect.poll(() => underneath.count()).toBe(0);
    await expect.poll(() => canvases.count()).toBe(1);
    for (const size of [
        { width: 390, height: 844 },
        { width: 1440, height: 900 },
    ]) {
        await page.setViewportSize(size);
        await expect
            .poll(() =>
                canvases.evaluateAll((els) => {
                    const pixels = els.map((el) =>
                        el instanceof HTMLCanvasElement ? el.width * el.height : 0,
                    );
                    return (
                        pixels.every((n) => n <= 4_000_000) &&
                        pixels.reduce((a, b) => a + b, 0) <= 8_000_000
                    );
                }),
            )
            .toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect.poll(() => underneath.count()).toBeGreaterThan(0);
});

test("the map's GPU canvas and the world's clip stay viewport bounded through flight and resizing", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home#/map");
    const map = page.getByRole("dialog").locator(".ow-host.ready");
    await expect(map).toBeVisible({ timeout: 60_000 });
    await map.getByRole("button", { name: "Fly the paper plane (P)" }).click();
    for (const size of [
        { width: 390, height: 844 },
        { width: 844, height: 390 },
    ]) {
        await page.setViewportSize(size);
        for (let step = 0; step < 8; step++) await map.dispatchEvent("wheel", { deltaY: 120 });
        await expect
            .poll(() =>
                map.evaluate((root) => {
                    const host = root.getBoundingClientRect();
                    const world = root.querySelector<HTMLElement>(":scope > .view-frame > .world");
                    const canvas = root.querySelector<HTMLCanvasElement>(":scope > canvas.map-gl");
                    if (!world || !canvas) return false;
                    const camera = new DOMMatrix(getComputedStyle(world).transform);
                    const clip = world.style.clipPath.match(/-?[\d.]+(?=px)/g)?.map(Number);
                    if (!clip || clip.length !== 8) return false;
                    const width = ((clip[2] ?? 0) - (clip[0] ?? 0)) * camera.a;
                    const height = ((clip[5] ?? 0) - (clip[1] ?? 0)) * camera.d;
                    const density = Math.min(2, Math.max(1, devicePixelRatio));
                    // the clip reaches past the window and is written again only as the camera nears
                    // its edge or draws well in (view.ts), so it covers the window and is at most
                    // three times what the window with its margin needs
                    return (
                        width >= host.width &&
                        height >= host.height &&
                        width <= 3 * (host.width + 64) + 2 &&
                        height <= 3 * (host.height + 64) + 2 &&
                        Math.abs(canvas.width - Math.round(host.width * density)) <= 1 &&
                        Math.abs(canvas.height - Math.round(host.height * density)) <= 1
                    );
                }),
            )
            .toBe(true);
    }
});

test("marketing maps release offscreen scenes and recover on returning", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    const journey = page.locator(".site-journey-world");
    await page.locator("#map").scrollIntoViewIfNeeded();
    await expect(journey).toBeVisible({ timeout: 60_000 });
    await page.locator("footer").last().scrollIntoViewIfNeeded();
    await expect(journey).toHaveCount(0);
    await page.locator("#map").scrollIntoViewIfNeeded();
    await expect(journey).toBeVisible();
    const ids = await page
        .locator("[data-map-surface] [id]")
        .evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(new Set(ids).size).toBe(ids.length);
});

test("equivalent models and pending progress updates preserve a flight's scene", async ({
    page,
}) => {
    let release = (): void => {};
    const held = new Promise<void>((done) => {
        release = done;
    });
    await page.route("**/engine/ui/flight.ts*", async (route) => {
        await held;
        await route.continue();
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home");
    await page.addScriptTag({
        type: "module",
        content: `
        import { mountMap } from "/tools/e2e/map-fixture.tsx";
        import { look } from "/apps/site/ground.ts";
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;inset:0;z-index:9999";
        document.body.append(host);
        window.mapFixture = mountMap(host, (await look()).map());
    `,
    });
    const map = page.getByRole("region", { name: "Map continuity fixture" });
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    await map.getByRole("button", { name: "Fly the paper plane (P)" }).click();
    await map.evaluate((root) => {
        root.querySelector("canvas.map-gl")?.setAttribute("data-continuity", "same");
        root.querySelector(".ow-source")?.setAttribute("data-continuity", "same");
    });
    await page.evaluate("window.mapFixture.update(false)");
    await page.evaluate("window.mapFixture.update(true)");
    release();
    await map.dispatchEvent("wheel", { deltaY: 30, ctrlKey: true });
    await expect(
        map.getByRole("button", { name: "Stop flying and land at the nearest world", exact: true }),
    ).toBeVisible();
    // the changed model waits for the landing: the flight keeps its source and its scene
    await expect(map.locator("[data-continuity=same]")).toHaveCount(2);
    await map
        .getByRole("button", { name: "Stop flying and land at the nearest world", exact: true })
        .click();
    // then the map is painted again into a new source, and keeps the scene it hands to it
    await expect(map.locator(".ow-source[data-continuity=same]")).toHaveCount(0);
    await expect(map.locator("canvas.map-gl[data-continuity=same]")).toHaveCount(1);
    await expect(map).toHaveClass(/ready/);
    await page.evaluate("window.mapFixture.dispose()");
    await expect(map).toHaveCount(0);
});

test("lesson entry keeps populated scenery through background lesson preparation", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await signInAs(page);
    await page.goto("/map");
    const map = page.locator(".ow-host.ready");
    await map.waitFor();
    const probe = await page.evaluateHandle(() => {
        const changes: number[] = [];
        const jumps: number[] = [];
        let target: HTMLElement | null = null;
        let anchor: number | null = null;
        let lastCamera = "";
        let stable = 0;
        let frame = 0;
        const sample = (): void => {
            target ??= document.querySelector<HTMLElement>(".wd .rd-read");
            const camera =
                document.querySelector<HTMLElement>(".wd-host .world")?.style.transform ?? "";
            stable = camera && camera === lastCamera ? stable + 1 : 0;
            lastCamera = camera;
            if (target) {
                const top = target.getBoundingClientRect().top;
                if (anchor === null && stable >= 3 && top > 60 && top < innerHeight - 100)
                    anchor = top;
                if (anchor !== null && Math.abs(top - anchor) > 2) jumps.push(top - anchor);
            }
            frame = requestAnimationFrame(sample);
        };
        sample();
        const observer = new MutationObserver((records) => {
            const replaced = records.some(
                (record) =>
                    record.target instanceof Element &&
                    // the art is in the world, or in the source the GPU draws it from (world.tsx)
                    record.target.matches(".wd-host .world, .wd-host > .wd-source") &&
                    Array.from(record.removedNodes).some(
                        (node) => node instanceof Element && node.matches(".l-art"),
                    ),
            );
            if (replaced) changes.push(document.querySelectorAll(".wd-host .l-art > *").length);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return {
            changes,
            jumps,
            anchor: () => anchor,
            stop: () => {
                observer.disconnect();
                cancelAnimationFrame(frame);
            },
        };
    });
    try {
        const place = map.locator('.ow-node[aria-label*="mountains" i]').first();
        await place.dispatchEvent("click");
        let camera = "";
        await expect
            .poll(async () => {
                const transform = await map.locator(".world").evaluate((el) => el.style.transform);
                const settled = transform === camera;
                camera = transform;
                const host = await map.boundingBox();
                const node = await place.boundingBox();
                return (
                    settled &&
                    !!host &&
                    !!node &&
                    Math.abs(node.x + node.width / 2 - host.x - host.width / 2) < 12 &&
                    Math.abs(node.y + node.height / 2 - host.y - host.height / 2) < 12
                );
            })
            .toBe(true);
        await place.dispatchEvent("click");
        await expect(page.locator(".wd.ready")).toBeVisible({ timeout: 60000 });
        await expect.poll(() => probe.evaluate((p) => p.changes.length)).toBeGreaterThan(0);
        let previous = 0;
        let same = 0;
        await expect
            .poll(
                async () => {
                    const count = await probe.evaluate((p) => p.changes.length);
                    same = count === previous ? same + 1 : 0;
                    previous = count;
                    return same;
                },
                { intervals: [300] },
            )
            .toBeGreaterThanOrEqual(4);
        expect(await probe.evaluate((p) => p.changes.every((count) => count > 0))).toBe(true);
        await expect(page.locator(".wd .rd-sheet").first()).toBeVisible();
        expect(await probe.evaluate((p) => p.anchor())).not.toBeNull();
        expect(
            await probe.evaluate((p) => p.jumps),
            "neighbouring loads must not move the landed lesson",
        ).toEqual([]);
    } finally {
        await probe.evaluate((p) => p.stop());
        await probe.dispose();
    }
});

/**
 * Loses the GPU context of the canvas under `host`, moves the camera while it is lost, and restores it: the
 * canvas must come to rest on the moved view, which only a picture drawn again after the restore can show.
 * A lost context is confirmed by the context itself, since WebKit keeps showing the last frame until then.
 */
async function loseAndRestore(page: Page, host: Locator, canvas: Locator): Promise<void> {
    let before = await canvas.screenshot();
    await expect
        .poll(async () => {
            const now = await canvas.screenshot();
            const same = now.equals(before);
            before = now;
            return same;
        })
        .toBe(true);
    await canvas.evaluate((el) => {
        if (!(el instanceof HTMLCanvasElement)) return;
        const lose = el.getContext("webgl2")?.getExtension("WEBGL_lose_context");
        Object.assign(window, { restoreGl: () => lose?.restoreContext() });
        lose?.loseContext();
    });
    await expect
        .poll(() =>
            canvas.evaluate(
                (el) =>
                    el instanceof HTMLCanvasElement && !!el.getContext("webgl2")?.isContextLost(),
            ),
        )
        .toBe(true);
    for (let i = 0; i < 6; i++) await host.dispatchEvent("wheel", { deltaX: 60, deltaY: 40 });
    await page.evaluate("window.restoreGl()");
    await host.dispatchEvent("wheel", { deltaY: 1 });
    // drawn again once it holds a picture of the moved view that has stopped changing and is not bare
    // paper, whose encoded size is a small share of any drawn view's
    let last = before;
    await expect
        .poll(async () => {
            const now = await canvas.screenshot();
            const settled = now.equals(last) && !now.equals(before);
            last = now;
            return settled && now.length > before.length * 0.3;
        })
        .toBe(true);
}

test("a lost GPU context draws the map again once it is restored", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/home#/map");
    const map = page.getByRole("dialog").locator(".ow-host.ready");
    await expect(map).toBeVisible({ timeout: 60_000 });
    await loseAndRestore(page, map, map.locator(":scope > canvas.map-gl"));
    expect(errors).toEqual([]);
});

test("a lost GPU context draws a world's roll again once it is restored", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/#/map/woods");
    const roll = page.locator(".wd.ready").first();
    await expect(roll).toBeVisible({ timeout: 60_000 });
    // the roll's camera takes its wheel on its host, inside the roll
    await loseAndRestore(page, roll.locator(".wd-host"), roll.locator(".wd-host > canvas.map-gl"));
    expect(errors).toEqual([]);
});
