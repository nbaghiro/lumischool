import { expect, type Page } from "@playwright/test";
import { test } from "./steps";

const middle = async (page: Page, key: string) => {
    const b = await page.locator(`[data-key="${key}"]`).boundingBox();
    if (!b) throw new Error(`Missing ${key}`);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height };
};

test("a finished putt can be watched again from the tee, and the button comes back after", async ({
    page,
}) => {
    await page.goto("/games?g=golf&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const watch = page.getByRole("button", { name: "Watch it again", exact: true });
    await expect(watch).toBeHidden();
    const tee = await middle(page, "ball");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible();
    await expect(watch).toBeVisible();
    const holed = await middle(page, "ball");
    await watch.click();
    await expect(watch).toBeHidden();
    // the watched try starts with the ball back on the tee
    await expect
        .poll(async () => {
            const b = await middle(page, "ball");
            return Math.hypot(b.x - tee.x, b.y - tee.y);
        })
        .toBeLessThan(Math.hypot(holed.x - tee.x, holed.y - tee.y) / 2);
    await expect(watch).toBeVisible({ timeout: 15_000 });
    const after = await middle(page, "ball");
    expect(Math.hypot(after.x - holed.x, after.y - holed.y)).toBeLessThan(2);
});

test("the wheel, or a trackpad's pinch, zooms the park", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the touch projects have no wheel");
    await page.goto("/games?g=blocks&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const field = page.locator(".field-gl");
    const box = await field.boundingBox();
    if (!box) throw new Error("Missing the field");
    const before = await middle(page, "rug");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -60);
    await page.keyboard.up("Control");
    await expect
        .poll(async () => (await middle(page, "rug")).w / before.w, { timeout: 5_000 })
        .toBeGreaterThan(1.5);
    await page.keyboard.press("-");
    await page.keyboard.press("-");
    await page.keyboard.press("-");
    await expect
        .poll(async () => (await middle(page, "rug")).w / before.w, { timeout: 5_000 })
        .toBeLessThan(1.05);
});

test("two fingers spreading apart zoom into the park, and lifting them throws nothing", async ({
    page,
}, info) => {
    test.skip(
        info.project.name === "phone-webkit" || info.project.name === "desktop",
        "touches are sent through Chrome's protocol, on the touch projects",
    );
    await page.goto("/games?g=blocks&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const before = await middle(page, "rug");
    const field = await page.locator(".field-gl").boundingBox();
    if (!field) throw new Error("Missing the field");
    const touch = await page.context().newCDPSession(page);
    const send = (
        type: "touchStart" | "touchMove" | "touchEnd",
        touchPoints: { x: number; y: number; id: number }[],
    ) => touch.send("Input.dispatchTouchEvent", { type, touchPoints });
    const one = { x: field.x + field.width / 2, y: field.y + field.height * 0.3, id: 1 };
    await send("touchStart", [one]);
    await send("touchStart", [one, { x: one.x + 40, y: one.y, id: 2 }]);
    for (let k = 1; k <= 12; k++) {
        await send("touchMove", [one, { x: one.x + 40 + k * 6, y: one.y, id: 2 }]);
        await page.waitForTimeout(30);
    }
    await send("touchEnd", []);
    await touch.detach();
    await expect
        .poll(async () => (await middle(page, "rug")).w / before.w, { timeout: 5_000 })
        .toBeGreaterThan(1.3);
    await expect(page.locator('[data-game="reads"]')).toContainText("The ball is on the rug");
});
