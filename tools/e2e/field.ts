import type { Page } from "@playwright/test";
import { projectPoint, unprojectPoint } from "../../engine/motion/presentation";

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
    const values = ((await page.locator(".field-probe").getAttribute("data-projection")) ?? "")
        .split(" ")
        .map(Number);
    const [a, b, c, d, e, f] = values;
    const projection =
        values.length === 6 &&
        a !== undefined &&
        b !== undefined &&
        c !== undefined &&
        d !== undefined &&
        e !== undefined &&
        f !== undefined
            ? { a, b, c, d, e, f }
            : null;
    return {
        toScreen: (x, y) => {
            const p = projection ? projectPoint({ x, y }, projection) : { x, y };
            return { x: mx + (p.x - cx) * k, y: my + (p.y - cy) * k };
        },
        toWorld: (x, y) => {
            const p = { x: cx + (x - mx) / k, y: cy + (y - my) / k };
            return projection ? unprojectPoint(p, projection) : p;
        },
    };
}
