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

test("gone fishing: a click on a fish casts nothing, a click on the bite hooks it, and a held press reels it in", async ({
    page,
}, info) => {
    test.skip(info.project.name.startsWith("phone"), "the presses are made with a mouse here");
    await page.goto("/games?g=fish&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const reads = page.locator('[data-game="reads"]');
    const fish = await page.locator('[data-key="fish:0:0"]').boundingBox();
    if (!fish) throw new Error("No fish");
    await page.mouse.click(fish.x + fish.width / 2, fish.y + fish.height / 2);
    await page.waitForTimeout(400);
    expect((await reads.textContent()) ?? "").not.toContain("The hook is");
    // the keys cast, and the bite comes as a fish finds the bait
    await page.keyboard.press(" ");
    await expect(reads).toContainText("The hook is");
    const field = await page.locator(".field-gl").boundingBox();
    if (!field) throw new Error("No field");
    const at = { x: field.x + field.width * 0.6, y: field.y + field.height * 0.08 };
    // a missed bite comes round again, so click as each bite shows until the fish is on
    for (let i = 0; i < 600; i++) {
        const now = (await reads.textContent()) ?? "";
        if (now.includes("on the line")) break;
        if (now.includes("gone under")) await page.mouse.click(at.x, at.y);
        await page.waitForTimeout(50);
    }
    await expect(reads).toContainText("on the line");
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await expect(reads).toContainText("On the pan", { timeout: 20_000 });
    await page.mouse.up();
});
