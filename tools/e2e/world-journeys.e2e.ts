import { expect } from "@playwright/test";
import { signInAs, test } from "./steps";

test("grade journeys reuse real lessons and keep original collections reachable", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/map?world=meadow&grade=1&journey=1");
    const grades = page.getByRole("combobox", { name: "Lessons to browse" });
    await expect(grades).toHaveValue("1", { timeout: 60_000 });
    await expect(page.locator(".j-name .term").first()).toHaveText("Grade 1 journey");
    await expect(page.locator('.wd-sheets [data-lesson="nature-living-or-not"]')).toHaveCount(1);
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(2);
    await grades.selectOption("4");
    await expect(grades).toHaveValue("4");
    await expect(
        page.locator('.wd-sheets [data-lesson="nature-life-cycles-compared"]'),
    ).toHaveCount(1);
    await expect(page.locator('.wd-sheets [data-lesson="nature-living-or-not"]')).toHaveCount(0);
    await page.reload();
    await expect(grades).toHaveValue("4", { timeout: 60_000 });
    await page.getByRole("button", { name: "Original collection", exact: true }).click();
    await expect(page).toHaveURL(/\/map\?world=meadow$/);
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(34, { timeout: 60_000 });
    await page.getByRole("button", { name: "Grade journeys", exact: true }).click();
    await expect(grades).toHaveValue("4", { timeout: 60_000 });
    await page.screenshot({ path: `/tmp/world-journey-${test.info().project.name}.png` });
});

test("formerly empty observatory offers grade lessons in the sample overlay and remembers grade in its link", async ({
    page,
}) => {
    await page.goto("/home#/map/star-cliffs?grade=4&journey=1");
    const dialog = page.getByRole("dialog", { name: "A sample child's map" });
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    const grades = dialog.getByRole("combobox", { name: "Lessons to browse" });
    await expect(grades).toHaveValue("4", { timeout: 60_000 });
    await expect(dialog.locator(".wd-sheets > .j-sheet")).not.toHaveCount(0);
    await grades.selectOption("1");
    await expect(page).toHaveURL(/grade=1&journey=1/);
    await expect(grades).toHaveValue("1");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
});

test("missing history has an honest empty state and no pretend grade options", async ({ page }) => {
    await signInAs(page);
    await page.goto("/map?world=old-tower&grade=2&journey=1");
    await expect(page.locator(".wd")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("combobox", { name: "Lessons to browse" })).toHaveCount(0);
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(0);
    await expect(page.getByText("Still to come", { exact: true })).toBeVisible({ timeout: 60_000 });
});
