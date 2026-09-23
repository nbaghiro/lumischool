import { expect } from "@playwright/test";
import { test } from "./steps";

declare global {
    interface Window {
        mapResourceProbe: {
            capture(): void;
            detachedObservers(): number;
            detachedPixels(): number;
        };
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
