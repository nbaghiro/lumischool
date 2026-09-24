import { expect } from "@playwright/test";
import { signInAs, test } from "./steps";

test("a written term stays in its world and follows neighbouring worlds without leaving the app", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/map?world=mountains");
    await expect(page.locator(".rd-neighbours")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(23);
    await page.getByRole("button", { name: "Next world", exact: true }).click();
    await expect(page).toHaveURL(/world=open-sea/);
    await expect(page.locator(".rd-neighbours")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(34);
    await page.getByRole("button", { name: "Previous world", exact: true }).click();
    await expect(page).toHaveURL(/world=mountains/);
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(23);
});

test("alternative world term selection browses canonical lessons without changing the family plan", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/map?world=valley-farm");
    const choices = page.getByRole("combobox", { name: "Lessons to browse" });
    await expect(choices).toBeVisible({ timeout: 60_000 });
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(34);
    await choices.selectOption("2");
    await expect(page).toHaveURL(/world=valley-farm&grade=2/);
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(39);
    await expect(choices).toHaveValue("2");
    await page.reload();
    await expect(choices).toHaveValue("2", { timeout: 60_000 });
});
