import { expect } from "@playwright/test";
import { test } from "./steps";

test("challenge cards choose a challenge from the pause dialog", async ({ page }) => {
    await page.goto("/games?g=plane");
    const menu = page.locator(".game-menu");
    await page.getByRole("button", { name: "Pause & help" }).click();
    await expect(menu).toBeVisible();
    const cards = menu.getByRole("group", { name: "Choose a challenge" });
    await expect(cards.getByRole("button", { name: "Up to ten", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    const second = cards.getByRole("button", { name: "Tens to a hundred", exact: true });
    await expect(second).toHaveAttribute("aria-pressed", "false");
    await second.click();
    await expect(page).toHaveURL(/v=1/);
    await expect(menu).not.toBeVisible();
    await page.getByRole("button", { name: "Pause & help" }).click();
    await expect(menu.locator('[data-game-phase="1"]')).toHaveAttribute("aria-pressed", "true");
});

test("challenge cards take a keyboard choice", async ({ page }) => {
    await page.goto("/games?g=plane");
    const menu = page.locator(".game-menu");
    await page.getByRole("button", { name: "Pause & help" }).click();
    await menu
        .getByRole("group", { name: "Choose a challenge" })
        .getByRole("button", { name: "Tenths", exact: true })
        .focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/v=3/);
    await expect(menu).not.toBeVisible();
});
