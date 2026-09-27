import { expect } from "@playwright/test";
import { test } from "./steps";

test("gone fishing: a cast with the keys brings a fish to the bait, and a strike on the bite hooks it", async ({
    page,
}) => {
    await page.goto("/games?g=fish&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    // under reduced motion time moves only when the child acts, and a fish's approach plays out at once
    await page.getByRole("button", { name: "Pause & help" }).click();
    await page.getByText("Sound & accessibility", { exact: true }).click();
    await page.getByLabel("Reduced motion").check();
    await page.getByRole("button", { name: "Continue playing" }).click();
    const reads = page.locator('[data-game="reads"]');
    await page.keyboard.press(" ");
    await expect(reads).toContainText("The hook is");
    for (let i = 0; i < 300; i++) {
        if (((await reads.textContent()) ?? "").includes("gone under")) break;
        await page.keyboard.press("ArrowLeft");
    }
    await expect(reads).toContainText("gone under");
    await page.keyboard.press(" ");
    await expect(reads).toContainText("A fish is on the line");
});

test("gone fishing: a pull back from the float and a let go casts it out over the water", async ({
    page,
}, info) => {
    test.skip(info.project.name.startsWith("phone"), "the pull is made with a mouse here");
    await page.goto("/games?g=fish&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const float = page.locator('[data-key="float"]');
    await expect(float).toBeVisible();
    const box = await float.boundingBox();
    if (!box) throw new Error("No float");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 40, box.y + 40, { steps: 8 });
    await page.mouse.up();
    await expect
        .poll(async () => (await float.boundingBox())?.x ?? 0, { timeout: 5000 })
        .toBeGreaterThan(box.x + 60);
    await expect(page.locator('[data-game="reads"]')).toContainText("The hook is", {
        timeout: 5000,
    });
    await page.screenshot({ path: `/tmp/gone-fishing-${info.project.name}-cast.png` });
});
