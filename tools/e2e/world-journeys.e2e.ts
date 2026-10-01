import { expect } from "@playwright/test";
import { signInAs, test } from "./steps";

test("a world opens on a grade's journey, switched by grade chips, with the whole collection a press away", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/map?world=meadow&grade=1&journey=1");
    const grades = page.getByRole("group", { name: "Grade" });
    await expect(grades.getByRole("radio", { name: "Grade 1" })).toBeChecked({ timeout: 60_000 });
    await expect(grades.getByRole("radio", { name: "Kindergarten" })).toHaveCount(0);
    await expect(page.locator(".j-name .term").first()).toHaveText("Grade 1 journey");
    await expect(page.locator('.wd-sheets [data-lesson="nature-living-or-not"]')).toHaveCount(1);
    const sheets = await page.locator(".wd-sheets > .j-sheet").count();
    expect(sheets).toBeGreaterThanOrEqual(2);
    expect(sheets).toBeLessThanOrEqual(6);
    await grades.getByText("Grade 4", { exact: true }).click();
    await expect(page).toHaveURL(/grade=4&journey=1/);
    await expect(
        page.locator('.wd-sheets [data-lesson="nature-life-cycles-compared"]'),
    ).toHaveCount(1);
    await page.reload();
    await expect(grades.getByRole("radio", { name: "Grade 4" })).toBeChecked({ timeout: 60_000 });
    await page.getByRole("button", { name: "All lessons", exact: true }).click();
    await expect(page).toHaveURL(/\/map\?world=meadow$/);
    await expect(page.locator(".wd-sheets > .j-sheet")).toHaveCount(38, { timeout: 60_000 });
    await page.getByRole("button", { name: "By grade", exact: true }).click();
    await expect(grades.getByRole("radio", { name: "Grade 4" })).toBeChecked({ timeout: 60_000 });
});

test("the history and language places open on lessons, never on an empty roll", async ({
    page,
}) => {
    await signInAs(page);
    for (const world of ["old-tower", "ferry-town"]) {
        await page.goto(`/map?world=${world}&grade=2&journey=1`);
        await expect(page.locator(".wd")).toBeVisible({ timeout: 60_000 });
        await expect(page.locator(".wd-sheets > .j-sheet").first()).toBeAttached({
            timeout: 60_000,
        });
        await expect(page.getByText("Still to come", { exact: true })).toHaveCount(0);
    }
});

test("the garden offers kindergarten alone, and the far worlds start at grade 3", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/map?world=home-garden&journey=1");
    const grades = page.getByRole("group", { name: "Grade" });
    await expect(grades.getByRole("radio", { name: "Kindergarten" })).toBeChecked({
        timeout: 60_000,
    });
    await expect(grades.getByRole("radio")).toHaveCount(1);
    await page.goto("/map?world=moon&grade=1&journey=1");
    await expect(grades.getByRole("radio", { name: "Grade 3" })).toBeChecked({ timeout: 60_000 });
    await expect(grades.getByRole("radio", { name: "Grade 1" })).toHaveCount(0);
});

test("the sample overlay keeps the grade in its link", async ({ page }) => {
    await page.goto("/home#/map/star-cliffs?grade=4&journey=1");
    const dialog = page.getByRole("dialog", { name: "A sample child's map" });
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    const grades = dialog.getByRole("group", { name: "Grade" });
    await expect(grades.getByRole("radio", { name: "Grade 4" })).toBeChecked({ timeout: 60_000 });
    await expect(dialog.locator(".wd-sheets > .j-sheet")).not.toHaveCount(0);
    await grades.getByText("Grade 5", { exact: true }).click();
    await expect(page).toHaveURL(/grade=5&journey=1/);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
});
