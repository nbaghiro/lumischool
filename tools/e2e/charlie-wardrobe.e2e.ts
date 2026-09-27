import { expect, type Page } from "@playwright/test";
import { fieldPoints } from "./field";
import { test } from "./steps";

async function toScreen(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
    return (await fieldPoints(page)).toScreen(x, y);
}

async function tap(page: Page, x: number, y: number): Promise<void> {
    const p = await toScreen(page, x, y);
    await page.mouse.click(p.x, p.y);
}

/** Pulls the coin in Charlie's hand back by `dx`, `dy` squares and lets go. */
async function pitch(page: Page, dx: number, dy: number): Promise<void> {
    const a = await toScreen(page, 6.6, 16.9),
        b = await toScreen(page, 6.6 + dx, 16.9 + dy);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 });
    await page.mouse.up();
}

test("Charlie's market stall: dressed by tapping, then paid exactly by pitching coins into the dish", async ({
    page,
}, info) => {
    test.skip(info.project.name.startsWith("phone"), "the coins are pitched with a mouse here");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/games?g=wardrobe&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const reads = page.locator('[data-game="reads"]');
    await tap(page, 22.75, 5.6);
    await tap(page, 25.6, 5.6);
    await tap(page, 20, 10.1);
    await expect(reads).toContainText("the receipt says 7¢");
    await pitch(page, -3.6, 5.05);
    await expect(reads).toContainText("The dish holds 1¢");
    await pitch(page, -3.6, 5.05);
    await expect(reads).toContainText("The dish holds 2¢");
    await tap(page, 8.4, 26.1);
    await expect(reads).toContainText("Charlie holds a nickel");
    await pitch(page, -3.6, 5.05);
    await expect(page.locator('[data-game="another"]')).toBeVisible();
    await expect(reads).toContainText("The dish holds 7¢");
    await page.screenshot({ path: `/tmp/charlie-stall-${info.project.name}.png` });
});

test("Charlie's market stall is dressed and a coin thrown with the keys alone", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/games?g=wardrobe&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const reads = page.locator('[data-game="reads"]');
    await page.locator(".field").focus();
    for (const key of ["n", "n", "t", "n", "t", "n", "n", "t"]) await page.keyboard.press(key);
    await expect(reads).toContainText("the receipt says 7¢");
    await page.keyboard.press("c");
    await expect(reads).toContainText("Charlie holds a nickel");
    await page.keyboard.press(" ");
    await expect(page.locator(".game-feedback-live")).toHaveText(
        /goes back to the purse|In the dish/,
    );
});
