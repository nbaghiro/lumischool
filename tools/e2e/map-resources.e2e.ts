import { expect } from "@playwright/test";
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
                        '[role="dialog"] canvas.paper',
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

test("multiple maps share a bounded paper canvas allocation across resizing", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Phone backdrops intentionally retain their snapshots instead of mounting a live map.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/home");
    await page.locator("#you").scrollIntoViewIfNeeded();
    const canvases = page.locator(".ow-host > canvas.paper");
    await expect.poll(() => canvases.count()).toBeGreaterThan(1);
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
                        pixels.every((n) => n <= 2_000_000) &&
                        pixels.reduce((a, b) => a + b, 0) <= 4_000_000
                    );
                }),
            )
            .toBe(true);
    }
});
