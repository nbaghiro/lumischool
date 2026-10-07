import { expect } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { openGame } from "./play";

for (const [id, key] of [
    ["paperboat", "boat"],
    ["bowling", "ready"],
    ["santa", "sleigh"],
]) {
    test(`${id}: resizing preserves the scene and uses the wide field`, async ({ page }, info) => {
        test.skip(info.project.name !== "desktop", "resize desktop through portrait and landscape");
        if (!id || !key) throw new Error("Missing game");
        await page.emulateMedia({ reducedMotion: "reduce" });
        const errors: string[] = [];
        await openGame(page, id, 0, errors, key);
        for (const viewport of [
            { width: 1980, height: 1280 },
            { width: 390, height: 844 },
            { width: 2560, height: 1080 },
        ]) {
            await page.setViewportSize(viewport);
            await page.waitForTimeout(400);
            const field = await page.locator(".field-gl").boundingBox();
            if (!field) throw new Error("Missing field");
            const points = await fieldPoints(page);
            if (viewport.width > viewport.height && id === "paperboat") {
                expect(points.toScreen(30, 11).x - points.toScreen(0, 11).x).toBeGreaterThan(
                    field.width * 0.94,
                );
            }
            if (id === "bowling") {
                const start = points.toScreen(9, 25),
                    end = points.toScreen(9, 8);
                if (viewport.width > viewport.height) {
                    expect(end.x - start.x).toBeGreaterThan(field.width * 0.3);
                    expect(Math.abs(end.y - start.y)).toBeLessThan(1);
                } else {
                    expect(start.y - end.y).toBeGreaterThan(field.height * 0.3);
                }
            }
            await expect(page.locator(`.field-probe [data-key="${key}"]`)).toBeAttached();
            expect(await page.locator("body").evaluate((el) => el.scrollWidth <= innerWidth)).toBe(
                true,
            );
            await page.screenshot({ path: `/tmp/responsive-${id}-${viewport.width}.png` });
        }
        expect(errors).toEqual([]);
    });
}

test("rotating the screen cancels a held bowl without releasing it", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "orientation change during a pointer gesture");
    const errors: string[] = [];
    await openGame(page, "bowling", 0, errors, "ready");
    const points = await fieldPoints(page),
        from = points.toScreen(9, 25),
        to = points.toScreen(9.8, 29);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.mouse.up();
    await expect(page.locator('.field-probe [data-key="ready"]')).toBeAttached();
    await expect(page.locator('.field-probe [data-key="ball"]')).toHaveCount(0);
    await expect(page.locator(".field-words")).toContainText("Bowl 1");
    expect(errors).toEqual([]);
});
