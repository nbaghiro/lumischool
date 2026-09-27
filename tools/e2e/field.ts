import type { Page } from "@playwright/test";

/** Where a place in the world's squares is on the screen, and back, from the camera the probe records. */
export async function fieldPoints(page: Page): Promise<{
    toScreen: (x: number, y: number) => { x: number; y: number };
    toWorld: (x: number, y: number) => { x: number; y: number };
}> {
    const camera = (await page.locator(".field-probe").getAttribute("data-camera")) ?? "";
    const [cx, cy, k] = camera.split(" ").map(Number);
    const box = await page.locator(".field-gl").boundingBox();
    if (!box || cx === undefined || cy === undefined || !k) throw new Error("No field camera");
    const mx = box.x + box.width / 2,
        my = box.y + box.height / 2;
    return {
        toScreen: (x, y) => ({ x: mx + (x - cx) * k, y: my + (y - cy) * k }),
        toWorld: (x, y) => ({ x: cx + (x - mx) / k, y: cy + (y - my) / k }),
    };
}
