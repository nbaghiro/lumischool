import { expect } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { openGame } from "./play";

for (const mode of ["keys", "pointer"] as const) {
    test(`Paper boat: ${mode} race three reaches and open the end card`, async ({ page }) => {
        test.setTimeout(150_000);
        await page.emulateMedia({ reducedMotion: "reduce" });
        const errors: string[] = [];
        await openGame(page, "paperboat", 0, errors, "boat");
        await page.locator('[data-game="board"]').focus();
        for (let reach = 0; reach < 3; reach++) {
            const gate = page
                .locator(".field-words > span")
                .filter({ hasText: new RegExp(`^${reach + 1}$`) });
            const box = await gate.boundingBox();
            if (!box) throw new Error("Missing gate");
            const field = await fieldPoints(page);
            const target = field.toWorld(box.x + box.width / 2, box.y + box.height / 2).y - 0.2;
            if (mode === "pointer") {
                const from = field.toScreen(3, target),
                    to = field.toScreen(8, target);
                await page.mouse.move(from.x, from.y);
                await page.mouse.down();
                await page.mouse.move(to.x, to.y, { steps: 3 });
                await page.mouse.up();
            } else {
                for (let i = 0; i < 16; i++) {
                    const boat = await page.locator('.field-probe [data-key="boat"]').boundingBox();
                    if (!boat) throw new Error("Missing boat");
                    const y = (await fieldPoints(page)).toWorld(
                        boat.x + boat.width / 2,
                        boat.y + boat.height / 2,
                    ).y;
                    if (Math.abs(target - y) < 0.6) break;
                    await page.keyboard.press(target > y ? "ArrowDown" : "ArrowUp");
                }
                for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
                await page.keyboard.press("Space");
            }
            await expect(page.locator('.field-probe [data-key="rival"]')).toBeAttached();
            if (mode === "pointer") {
                await page.keyboard.down("Space");
                await page.mouse.down();
            }
            for (
                let i = 0;
                i < 45 && (await page.locator('.field-probe [data-key="rival"]').count());
                i++
            ) {
                const points = await fieldPoints(page);
                const boat = await page.locator('.field-probe [data-key="boat"]').boundingBox();
                if (!boat) throw new Error("Missing running boat");
                const at = points.toWorld(boat.x + boat.width / 2, boat.y + boat.height / 2);
                if (mode === "pointer") {
                    const to = points.toScreen(at.x, target);
                    await page.mouse.move(to.x, to.y);
                    await page.mouse.move(to.x + 1, to.y);
                } else {
                    if (Math.abs(target - at.y) > 0.4)
                        await page.keyboard.press(target > at.y ? "ArrowDown" : "ArrowUp");
                    await page.keyboard.press("Space");
                }
            }
            if (mode === "pointer") {
                await page.mouse.up();
                await page.keyboard.up("Space");
            }
            if (reach < 2)
                await expect(page.locator(".field-words")).toContainText(`${reach + 1} / 3 races`);
        }
        await expect(page.locator('.round-end[data-round-end="won"]')).toBeVisible();
        expect(errors).toEqual([]);
    });
}

test("Paper boat: live drag gives a moving boat and fits a phone", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    await openGame(page, "paperboat", 0, errors, "boat");
    const field = await fieldPoints(page),
        from = field.toScreen(3, 6),
        to = field.toScreen(8, 6);
    await page.screenshot({ path: "/tmp/lumischool-paperboat-phone.png" });
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
    await expect(page.locator('.field-probe [data-key="rival"]')).toBeAttached();
    const boat = await page.locator('.field-probe [data-key="boat"]').boundingBox();
    if (!boat) throw new Error("Missing launched boat");
    await page.waitForTimeout(600);
    const later = await page.locator('.field-probe [data-key="boat"]').boundingBox();
    if (!later) throw new Error("Missing moving boat");
    expect(later.x).toBeGreaterThan(boat.x);
    expect(await page.locator("body").evaluate((el) => el.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
});
