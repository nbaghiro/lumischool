import { expect } from "@playwright/test";
import { signInAs, test } from "./steps";

test("a written term stays in its world and follows neighbouring worlds without leaving the app", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/map?world=mountains");
    await expect(page.locator(".rd-neighbours")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(28);
    await page.getByRole("button", { name: "Next world", exact: true }).click();
    await expect(page).toHaveURL(/world=open-sea/);
    await expect(page.locator(".rd-neighbours")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(39);
    await page.getByRole("button", { name: "Previous world", exact: true }).click();
    await expect(page).toHaveURL(/world=mountains/);
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(28);
});

test("alternative world term selection browses canonical lessons without changing the family plan", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/map?world=valley-farm");
    const choices = page.getByRole("group", { name: "Grade" });
    await expect(choices).toBeVisible({ timeout: 60_000 });
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(38);
    await choices.getByText("Grade 2, term 3", { exact: true }).click();
    await expect(page).toHaveURL(/world=valley-farm&grade=2/);
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(47);
    await expect(choices.getByRole("radio", { name: "Grade 2, term 3" })).toBeChecked();
    await page.reload();
    await expect(choices.getByRole("radio", { name: "Grade 2, term 3" })).toBeChecked({
        timeout: 60_000,
    });
});
