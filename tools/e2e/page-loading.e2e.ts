import { expect } from "@playwright/test";
import { signInAs, test } from "./steps";

test("slow pages show a centered map loader before their content arrives", async ({ page }) => {
    await signInAs(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const [path, title, ready] of [
        ["/", "Opening your family…", "Hello, Test Parent"],
        ["/account", "Opening your account…", "Test Parent"],
    ] as const) {
        let release = (): void => {};
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });
        await page.route("**/api/family", async (route) => {
            await held;
            await route.continue();
        });
        try {
            await page.goto(path);
            const loader = page.getByRole("status").filter({ hasText: title });
            await expect(loader).toBeVisible();
            await expect(page.getByText("One moment.", { exact: true })).toHaveCount(0);
            await expect(page.locator(".page-ground")).toBeVisible();
            const centered = await page.locator(".page-waiting-label").evaluate((element) => {
                const box = element.getBoundingClientRect();
                const bar = Number.parseFloat(
                    getComputedStyle(element).getPropertyValue("--bar-h"),
                );
                return {
                    x: Math.abs(box.x + box.width / 2 - innerWidth / 2),
                    y: Math.abs(box.y + box.height / 2 - (innerHeight + bar) / 2),
                };
            });
            expect(centered.x).toBeLessThan(2);
            expect(centered.y).toBeLessThan(2);
            await expect(page.locator(".page-waiting-spinner")).toHaveCSS("animation-name", "none");
            release();
            await expect(loader).toHaveCount(0);
            await expect(page.getByRole("heading", { name: ready, exact: true })).toBeVisible();
        } finally {
            release();
            await page.unroute("**/api/family");
        }
    }
});
