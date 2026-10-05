import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { openGame } from "./play";

const middle = async (page: Page, key: string) => {
    const b = await page.locator(`.field-probe [data-key="${key}"]`).boundingBox();
    if (!b) throw new Error(`Missing ${key}`);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test("fetch: a throw from the keys lands, a pup brings it back and the ball is ready again", async ({
    page,
}) => {
    const errors: string[] = [];
    await openGame(page, "blocks", 0, errors, "toy:0");
    const reads = page.locator('[data-game="reads"]');
    await expect(reads).toContainText("The ball is on the rug");
    const pip = await middle(page, "pup:pip");
    await page.keyboard.press("Space");
    await expect(reads).toContainText("landed at about", { timeout: 6000 });
    await expect.poll(async () => (await middle(page, "pup:pip")).x - pip.x).toBeGreaterThan(20);
    await expect(reads).toContainText("The ball is on the rug", { timeout: 15_000 });
    expect(errors).toEqual([]);
});

test("fetch: the first ask is said and staked out, and a throw from the keys onto it counts", async ({
    page,
}) => {
    const errors: string[] = [];
    await openGame(page, "blocks", 0, errors, "toy:0");
    await expect(page.locator(".game-feedback")).toContainText("Throw it to the 6.");
    await expect(page.locator('.field-probe [data-key="target"]')).toBeAttached();
    const reads = page.locator('[data-game="reads"]');
    await page.keyboard.press("Space");
    await expect(reads).toContainText("That is the 6.", { timeout: 6000 });
    await expect(reads).toContainText("1 of 4 done", { timeout: 15_000 });
    expect(errors).toEqual([]);
});

test("fetch: pulled back and let go, the ball flies the other way", async ({ page }, info) => {
    test.skip(info.project.name.includes("phone"), "the mouse stands for a finger on the desk");
    const errors: string[] = [];
    await openGame(page, "blocks", 0, errors, "toy:0");
    const ball = await middle(page, "toy:0");
    await page.mouse.move(ball.x, ball.y);
    await page.mouse.down();
    await page.mouse.move(ball.x - 90, ball.y + 70, { steps: 10 });
    await page.mouse.up();
    await expect.poll(async () => (await middle(page, "toy:1")).x - ball.x).toBeGreaterThan(40);
    await expect(page.locator('[data-game="reads"]')).toContainText("landed at about", {
        timeout: 6000,
    });
    expect(errors).toEqual([]);
});

test("fetch: B swaps the ball for the stick on the pond level", async ({ page }) => {
    const errors: string[] = [];
    await openGame(page, "blocks", 1, errors, "toy:0");
    const reads = page.locator('[data-game="reads"]');
    await expect(reads).toContainText("The ball is on the rug");
    await page.keyboard.press("b");
    await expect(reads).toContainText("The stick is on the rug");
    expect(errors).toEqual([]);
});
