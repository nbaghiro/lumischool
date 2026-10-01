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

test("gone fishing: one click on a fish catches it on the first level, with nothing else to press", async ({
    page,
}, info) => {
    await page.goto("/games?g=fish&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const reads = page.locator('[data-game="reads"]');
    const box = await page.locator('[data-key="fish:0:0"]').boundingBox();
    if (!box) throw new Error("No fish");
    const from = Date.now();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(reads).toContainText("On the pan", { timeout: 10_000 });
    expect(Date.now() - from).toBeLessThan(8000);
    await page.screenshot({ path: `/tmp/gone-fishing-${info.project.name}-landed.png` });
});

test("gone fishing: from the third level a click on the fish casts and a click on the bite hooks it", async ({
    page,
}) => {
    await page.goto("/games?g=fish&v=2");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const reads = page.locator('[data-game="reads"]');
    const box = await page.locator('[data-key="fish:0:0"]').boundingBox();
    if (!box) throw new Error("No fish");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByRole("button", { name: "Hook", exact: true })).toBeVisible();
    const field = await page.locator(".field-gl").boundingBox();
    if (!field) throw new Error("No field");
    // a missed bite comes round again, so press as each bite shows until the fish is on
    for (let i = 0; i < 400; i++) {
        const now = (await reads.textContent()) ?? "";
        if (now.includes("On the pan") || now.includes("on the line")) break;
        if (now.includes("gone under"))
            await page.mouse.click(field.x + field.width * 0.6, field.y + field.height * 0.08);
        await page.waitForTimeout(50);
    }
    await expect(reads).toContainText("On the pan", { timeout: 15_000 });
});
