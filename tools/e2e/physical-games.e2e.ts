import { expect } from "@playwright/test";
import { test } from "./steps";

test("penny shove accepts a forward flick and offers keyboard angle controls", async ({
    page,
    hasTouch,
    browserName,
}) => {
    await page.goto("/games?g=pay");
    const pile = page.locator('[data-key="pile:penny:0"]');
    await expect(pile).toBeVisible();
    const box = await pile.boundingBox();
    if (!box) throw new Error("No coin pile");
    const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
    // touch is sent through Chrome's own protocol, which only Chromium has; other browsers flick with the mouse
    if (hasTouch && browserName === "chromium") {
        const touch = await page.context().newCDPSession(page);
        await touch.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x, y }],
        });
        await touch.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: x + 15, y }],
        });
        await touch.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: x + 30, y }],
        });
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await touch.detach();
    } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 30, y, { steps: 3 });
        await page.mouse.up();
    }
    const coin = page.locator('[data-key="coin:0"]');
    await expect(coin).toBeVisible();
    await expect.poll(async () => (await coin.boundingBox())?.x ?? 0).toBeGreaterThan(x);
    await page.getByRole("button", { name: "Turn left", exact: true }).click();
    // the aim line is ink on the field, so the picture changes
    const field = page.locator(".field");
    const before = await field.screenshot();
    await page.keyboard.press("e");
    await expect.poll(async () => (await field.screenshot()).equals(before)).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
});

test("fishing exposes compact cast and ease controls and safely cancels a held cast", async ({
    page,
}) => {
    await page.goto("/games?g=fish");
    await expect(
        page.getByRole("button", { name: "Cast / reel", exact: true }).locator("svg"),
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Ease the line", exact: true }).locator("svg"),
    ).toBeVisible();
    const float = page.locator('[data-key="float"]');
    await expect(float).toBeVisible();
    const box = await float.boundingBox();
    if (!box) throw new Error("No float");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 20, box.y + 20);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Cast / reel", exact: true }).click();
    await expect.poll(async () => (await float.boundingBox())?.x ?? 0).toBeGreaterThan(box.x + 10);
});

for (const id of [
    "jump",
    "road",
    "plane",
    "herd",
    "snake",
    "cargo-workshop",
    "marble-workshop",
    "wardrobe",
    "clear",
    "shunt",
    "weigh",
    "share",
    "pour",
    "shut",
    "rule",
    "spell",
]) {
    test(`${id}: refined game fits and survives pause without losing its scene`, async ({
        page,
    }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`/games?g=${id}`);
        const drawn = page.locator(".board > .field-gl[data-drawn]:not([hidden])");
        await expect(drawn.first()).toBeVisible();
        await expect(page.locator(".board")).not.toContainText("no drawing called");
        await expect(page.locator(".board")).not.toContainText("NaN");
        const controls = await page.locator(".hands").boundingBox();
        expect(controls).not.toBeNull();
        if (controls)
            expect(controls.y + controls.height).toBeLessThanOrEqual(
                await page.evaluate(() => innerHeight + 2),
            );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await page.getByRole("button", { name: "Pause & help" }).click();
        await expect(page.locator(".game-menu")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.locator(".game-menu")).not.toBeVisible();
        await expect(drawn.first()).toBeVisible();
        expect(errors).toEqual([]);
    });
}

test("shut the box: a die flicked across the felt throws both dice, which tumble to rest showing the throw", async ({
    page,
}, info) => {
    test.skip(info.project.name.startsWith("phone"), "the flick is made with a mouse here");
    await page.goto("/games?g=shut");
    const die = page.locator('[data-key="die:0"]');
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(die).toBeVisible();
    // the board is sized after its tray is drawn, so the die is measured once it has stopped moving
    let at = await die.boundingBox();
    for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(150);
        const now = await die.boundingBox();
        if (now && at && now.x === at.x && now.y === at.y) break;
        at = now;
    }
    if (!at) throw new Error("Missing the die");
    const x = at.x + at.width / 2,
        y = at.y + at.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 60, y - 15, { steps: 6 });
    await page.mouse.move(x - 160, y - 40, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    await page.screenshot({ path: `/tmp/shut-throw-${info.project.name}-flight.png` });
    await expect(page.locator('[data-game="reads"]')).toContainText("The dice show", {
        timeout: 10_000,
    });
    // once the tumble is over the dice lie still
    await page.waitForTimeout(3000);
    const rest = await die.boundingBox();
    await page.waitForTimeout(500);
    expect(await die.boundingBox()).toEqual(rest);
    await page.screenshot({ path: `/tmp/shut-throw-${info.project.name}-rest.png` });
});

test("the firefly flies towards a held finger", async ({ page }) => {
    await page.goto("/games?g=snake");
    const head = page.locator('[data-key="head"]');
    await expect(head).toBeVisible();
    const before = await head.boundingBox();
    if (!before) throw new Error("No firefly");
    await page.mouse.move(before.x + before.width / 2, before.y + before.height * 3);
    await page.mouse.down();
    try {
        await expect
            .poll(async () => (await head.boundingBox())?.y ?? 0)
            .toBeGreaterThan(before.y + 2);
    } finally {
        await page.mouse.up();
    }
});
