import { expect, test } from "@playwright/test";

test("Back to the map remains reachable after neighbouring lessons finish loading", async ({
    page,
}) => {
    await page.goto("/home#/map");
    const atlas = page.locator(".ov-map");
    await expect(atlas).toHaveClass(/ready/);
    const mountains = atlas.locator('.ow-node[aria-label*="mountains" i]').first();
    await mountains.dispatchEvent("click");
    await mountains.click();
    const world = page.locator(".wd-host");
    await expect(page.locator(".rd-neighbours")).toBeVisible({ timeout: 60_000 });
    await expect(world).toHaveClass(/mo-rest/, { timeout: 30_000 });
    await world.hover({ position: { x: 240, y: 160 } });
    const back = page.getByRole("button", { name: "Back to the map", exact: true });
    await expect(back).toHaveCSS("pointer-events", "auto");
    await expect(back).toHaveCSS("opacity", "1");
    await back.click();
    await expect(atlas).toHaveClass(/ready/);
});
