import { expect, test } from "@playwright/test";

// A page's background map is its snapshot wherever one was made for its framing (backdrop.tsx): no
// live map is drawn behind it on any screen, so nothing is drawn in as the page opens.
test("backgrounds keep their map picture through loading and turning, with no live map behind", async ({
    page,
}) => {
    const wide = page.viewportSize()?.width ?? 0;
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
    await expect(page.locator(".backdrop-live")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    if (wide <= 700) return;
    await page.setViewportSize({ width: wide, height: 900 });
    await expect(picture).toBeVisible();
    await page.waitForTimeout(3000);
    await expect(page.locator(".backdrop-live")).toHaveCount(0);
});
