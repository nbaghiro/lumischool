import { expect } from "@playwright/test";
import { test } from "../steps";

test.describe("public learning pages without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("a visitor can read selected sample practice and reveal answers", async ({ page }) => {
        const response = await page.goto("/learn/math/counting-to-five");
        expect(response?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Counting to five");
        await expect(page.getByRole("heading", { name: "Look together" })).toBeVisible();
        await page.locator(".public-answers summary").click();
        await expect(page.locator(".public-answers p").first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await page.emulateMedia({ media: "print" });
        await expect(page.locator("footer")).toBeHidden();
        await expect(page.locator(".public-lesson-fallback")).toBeVisible();
        await expect(page.locator(".public-answers")).toBeVisible();
    });

    test("the opening has readable words and its map image before enhancement", async ({
        page,
    }) => {
        await page.goto("/");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
            "Homeschool lessons to use online or print.",
        );
        const image = page.locator(".site-opening img").first();
        await expect(image).toBeVisible();
        expect(
            await image.evaluate(
                (el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0,
            ),
        ).toBe(true);
        await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
            "href",
            "https://lumischool.ai/",
        );
        await expect(page.locator("#you .site-card")).toHaveCount(3);
        await expect(page.locator(".site-samples > a")).toHaveCount(3);
        await page.locator(".site-samples > a").first().click();
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Counting to five");
    });
});

test("retired catalogues return to homepage subjects", async ({ page }) => {
    for (const path of [
        "/curriculum",
        "/curriculum/kindergarten",
        "/curriculum/grade-1",
        "/homeschool-math",
    ]) {
        await page.goto(path);
        await expect(page).toHaveURL(/\/home#subjects$/);
        await expect(page.locator("#subjects")).toBeVisible();
    }
});

test("public sample uses the real lesson sheet and its declared levels", async ({ page }) => {
    await page.goto("/learn/math/counting-to-five");
    await expect(page.locator(".public-sheet .ls-sheet")).toBeVisible();
    await expect(page.locator(".public-lesson-fallback")).toBeHidden();
    await expect(page.locator(".public-sheet svg").first()).toBeVisible();
    await page.getByRole("radio", { name: "Easier", exact: true }).check();
    await expect(page.locator(".public-sheet")).toHaveAttribute("data-level", "easy");
    await page.getByRole("radio", { name: "Harder", exact: true }).check();
    await expect(page.locator(".public-sheet")).toHaveAttribute("data-level", "hard");
    await page.getByRole("checkbox", { name: "Answers and parent notes" }).check();
    await expect(page.locator(".public-sheet")).toContainText("At this level");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
});
