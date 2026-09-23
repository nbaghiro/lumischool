import { expect } from "@playwright/test";
import { test } from "./steps";

test("shared picker selects a challenge inside the pause dialog", async ({ page }) => {
    await page.goto("/games?g=plane");
    const menu = page.locator(".game-menu");
    const select = menu.getByLabel("Choose a challenge");
    await expect(select).toHaveClass(/select-control/);
    await expect(select).toHaveValue("0");
    await select.click();
    await expect(select).toHaveCSS("appearance", "base-select");
    await page.getByRole("option", { name: "2. Tens to a hundred", exact: true }).click();
    await expect(select).toHaveValue("1");
    await expect(menu).toBeVisible();
    await expect(page).toHaveURL(/v=1/);
    await select.click();
    await page.keyboard.press("Escape");
    await expect(menu).toBeVisible();
    await expect(select).toHaveValue("1");
    await expect(select).toBeFocused();
    await menu.getByRole("button", { name: "Play", exact: true }).click();
    await expect(menu).not.toBeVisible();
});

test("shared picker supports keyboard choice and outside dismissal", async ({ page }) => {
    await page.goto("/games?g=plane");
    const menu = page.locator(".game-menu");
    const select = menu.getByLabel("Choose a challenge");
    await expect(menu).toBeVisible();
    await select.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(select).toHaveValue("3");
    await select.click();
    const bounds = await menu.boundingBox();
    if (!bounds) throw new Error("The pause panel is missing");
    await page.mouse.click(bounds.x + 5, bounds.y + 5);
    expect(await select.evaluate((el) => el.matches(":open"))).toBe(false);
    await expect(menu).toBeVisible();
    await expect(select).toHaveValue("3");
});
