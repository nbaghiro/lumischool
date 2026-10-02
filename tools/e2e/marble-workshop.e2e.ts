import { expect, type Page } from "@playwright/test";
import { test } from "./steps";

/** A place on the workbench on the page, from where the field says its grid starts and how big a square is. */
async function screenOf(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
    const field = page.locator(".field-gl");
    const box = await field.boundingBox();
    const [ox, oy, sq] = ((await field.getAttribute("data-grid")) ?? "").split(",").map(Number);
    if (!box || ox === undefined || oy === undefined || !sq) throw new Error("No marble field");
    return { x: box.x + ox + x * sq, y: box.y + oy + y * sq };
}

test("marble workshop: the first run is built and run with the keys alone", async ({ page }) => {
    await page.goto("/games?g=marble-workshop&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    // the first part is chosen already: an arrow puts it on the bench, arrows move it, E turns it
    const keys = async (key: string, times = 1) => {
        for (let n = 0; n < times; n++) await page.keyboard.press(key);
    };
    await keys("ArrowRight");
    await keys("ArrowLeft", 20);
    await keys("e", 4);
    await keys("n");
    await keys("ArrowRight");
    await keys("ArrowLeft", 11);
    await keys("ArrowDown", 16);
    await keys("e", 7);
    await keys(" ");
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({
        timeout: 30_000,
    });
    await expect(page.locator(".game-toolbar .game-finished")).toContainText("Every cup");
});

test("marble workshop: a part is dragged from the tray onto the bench and turned by its end", async ({
    page,
}, info) => {
    test.skip(info.project.name.startsWith("phone"), "the parts are dragged with a mouse here");
    await page.goto("/games?g=marble-workshop&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const part = page.locator('[data-key="long:0"]');
    const before = await part.boundingBox();
    if (!before) throw new Error("No tray part");
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    const to = await screenOf(page, 12, 12);
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
    const reads = page.locator('[data-game="reads"]');
    await expect(reads).toContainText("On the bench: long at 12.0, 12.0");
    // its right end is four and a half squares along it; pull it round to a slope
    const end = await screenOf(page, 12 + 4.5 * Math.cos(0.3), 12 + 4.5 * Math.sin(0.3));
    const turned = await screenOf(page, 12 + 4.5 * Math.cos(0.6), 12 + 4.5 * Math.sin(0.6));
    await page.mouse.move(end.x, end.y);
    await page.mouse.down();
    await page.mouse.move(turned.x, turned.y, { steps: 6 });
    await page.mouse.up();
    await expect(reads).toContainText("turned 34 degrees");
    await page.keyboard.press("z");
    await expect(reads).toContainText("turned 17 degrees");
});

test("marble workshop: the water run is built with the keys and fills the cup", async ({
    page,
}) => {
    await page.goto("/games?g=marble-workshop&v=9");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const keys = async (key: string, times = 1) => {
        for (let n = 0; n < times; n++) await page.keyboard.press(key);
    };
    // the witness in school/games/__tests__/marble.test.ts, entered as the keys place it
    await keys("ArrowRight");
    await keys("ArrowLeft", 24);
    await keys("ArrowUp", 10);
    await keys("e");
    await keys("n");
    await keys("ArrowRight");
    await keys("ArrowLeft", 7);
    await keys("ArrowUp", 3);
    await keys("n");
    await keys("ArrowRight");
    await keys("ArrowLeft", 2);
    await keys("ArrowDown", 1);
    await keys(" ");
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({
        timeout: 40_000,
    });
    await expect(page.locator(".game-toolbar .game-finished")).toContainText("8 litres");
});
