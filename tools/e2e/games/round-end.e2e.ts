// Every round ends on one card over the field: won, with the way on, or not won, with another go.
import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { reducedMotion } from "./play";

const card = (page: Page) => page.locator(".round-end");
const challenge = (page: Page) => page.locator(".game-player").getAttribute("data-challenge");

test("a won putt ends on the card, Again plays the same hole and New one another", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the card is the same on every screen");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=golf&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(card(page)).toBeHidden();
    await page.locator('[data-game="board"]').focus();
    await page.keyboard.press("Enter");
    await expect(card(page)).toHaveAttribute("data-round-end", "won");
    await expect(card(page).getByRole("heading")).toHaveText("Well played!");
    await expect(card(page).locator('[data-game="end-words"]')).not.toBeEmpty();
    await expect(card(page).locator('[data-end="another"]')).toBeVisible();
    await expect(card(page).locator('[data-end="again"]')).toBeVisible();
    await expect(card(page).locator('[data-end="next"]')).toBeFocused();
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible();

    // closed, the board stays in sight and a chip in the top bar opens the card again
    await page.keyboard.press("Escape");
    await expect(card(page)).toBeHidden();
    await page.locator('[data-game="end-chip"]').click();
    await expect(card(page)).toBeVisible();

    const first = await challenge(page);
    await card(page).locator('[data-end="again"]').click();
    await expect(card(page)).toBeHidden();
    expect(await challenge(page)).toBe(first);

    await page.locator('[data-game="board"]').focus();
    await page.keyboard.press("Enter");
    await expect(card(page)).toBeVisible();
    await card(page).locator('[data-end="another"]').click();
    await expect(card(page)).toBeHidden();
    await expect.poll(() => challenge(page)).not.toBe(first);
    expect(errors).toEqual([]);
});

test("a curling end thrown short ends on the not-won card, and Again starts it over", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the card is the same on every screen");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=curling&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await reducedMotion(page);
    // the lightest weight there is, so every stone stops short of the house
    for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowLeft");
    for (let t = 0; t < 8 && !(await card(page).isVisible()); t++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(400);
    }
    await expect(card(page)).toHaveAttribute("data-round-end", "not-won");
    await expect(card(page).getByRole("heading")).not.toContainText(/lost|lose/i);
    await expect(card(page).locator('[data-end="again"]')).toBeFocused();
    await expect(page.locator(".game-toolbar .game-finished")).toBeHidden();
    await page.keyboard.press("Enter");
    await expect(card(page)).toBeHidden();
    expect(errors).toEqual([]);
});
