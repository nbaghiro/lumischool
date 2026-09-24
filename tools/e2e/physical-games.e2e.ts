import { expect } from "@playwright/test";
import { test } from "./steps";

test("penny shove accepts a forward flick and offers keyboard angle controls", async ({
    page,
    hasTouch,
}) => {
    await page.goto("/games?g=pay");
    const pile = page.locator('[data-key="pile:penny:0"]');
    await expect(pile).toBeVisible();
    const box = await pile.boundingBox();
    if (!box) throw new Error("No coin pile");
    const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
    if (hasTouch) {
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
    const before = await page.locator(".field .ink").innerHTML();
    await page.keyboard.press("e");
    await expect.poll(() => page.locator(".field .ink").innerHTML()).not.toBe(before);
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
    "shunt",
    "weigh",
    "share",
    "pour",
    "race",
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
        await expect(
            page.locator(".board > :not([hidden]) svg[data-visual]").first(),
        ).toBeVisible();
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
        await expect(
            page.locator(".board > :not([hidden]) svg[data-visual]").first(),
        ).toBeVisible();
        expect(errors).toEqual([]);
    });
}

test("spelling tiles can be tapped into the word and removed from it", async ({ page }) => {
    await page.goto("/games?g=spell");
    const tile = page.locator('[data-key="sound:0"]');
    await expect(tile).toBeVisible();
    await tile.click();
    const filled = page.locator('[data-key="filled:0"]');
    await expect(filled).toBeVisible();
    await filled.click();
    await expect(filled).not.toBeVisible();
});

test("bead string follows a held point on the paper", async ({ page }) => {
    await page.goto("/games?g=snake");
    const head = page.locator('[data-key="head"]');
    await expect(head).toBeVisible();
    const before = await head.boundingBox();
    if (!before) throw new Error("No bead string head");
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

test("sound tiles can be dragged into a different word position", async ({ page, hasTouch }) => {
    await page.goto("/games?g=spell");
    await page.locator('[data-key="sound:0"]').click();
    await page.locator('[data-key="sound:1"]').click();
    const first = page.locator('[data-key="filled:0"]');
    const second = page.locator('[data-key="filled:1"]');
    await expect(second).toBeVisible();
    const word = await second.textContent();
    const a = await first.boundingBox(),
        b = await second.boundingBox();
    if (!a || !b) throw new Error("No placed sound tiles");
    const from = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
    const to = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    if (hasTouch) {
        const touch = await page.context().newCDPSession(page);
        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
        await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [to] });
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await touch.detach();
    } else {
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 5 });
        await page.mouse.up();
    }
    await expect(first).toHaveText(word ?? "");
});
