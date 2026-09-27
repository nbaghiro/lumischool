import { expect, type Page } from "@playwright/test";
import { test } from "./steps";

/** The canoe's middle on the screen, and how many pixels a square is, from its drawing's width. */
async function canoe(page: Page) {
    return page.locator('[data-key="canoe"]').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return {
            x: r.x + r.width / 2,
            y: r.y + r.height / 2,
            square: el instanceof HTMLElement ? el.offsetWidth / ((3.6 * 5) / 4.6) : 20,
        };
    });
}

test("down the river: a drag beside the canoe paddles it, and so does a held key", async ({
    page,
}, info) => {
    await page.goto("/games?g=straight&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const note = page.locator(".game-toolbar [data-game=aside]");
    await expect(note).toContainText("Drag back beside the canoe");
    const c = await canoe(page);
    if (!info.project.name.startsWith("phone")) {
        // a drag drawn back through the water on the right of the canoe is a stroke on that side
        await page.mouse.move(c.x, c.y + 1.4 * c.square);
        await page.mouse.down();
        await page.mouse.move(c.x - 3 * c.square, c.y + 1.4 * c.square, { steps: 6 });
        await page.mouse.up();
        await expect(note).not.toContainText("Drag back beside the canoe");
        await page.waitForTimeout(800);
        const after = await canoe(page);
        expect(Math.abs(after.x - c.x) + Math.abs(after.y - c.y)).toBeGreaterThan(c.square);
    }
    const before = await canoe(page);
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(350);
    await page.keyboard.up("ArrowUp");
    await page.waitForTimeout(600);
    const moved = await canoe(page);
    expect(Math.abs(moved.x - before.x) + Math.abs(moved.y - before.y)).toBeGreaterThan(
        before.square * 0.5,
    );
    await page.screenshot({ path: `/tmp/down-the-river-${info.project.name}.png` });
});
