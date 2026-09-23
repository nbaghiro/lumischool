import { expect, test } from "@playwright/test";

test("phone backgrounds keep their map picture through loading and rotation", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) > 700, "Phone background policy");
    await page.goto("/");
    const picture = page.locator(".backdrop-still").first();
    await expect(picture).toBeVisible();
    await expect
        .poll(() => picture.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
        .toBe(true);
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".backdrop-live")).toHaveCount(0);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(picture).toBeVisible();
    await expect(page.locator(".backdrop-live")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(picture).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
