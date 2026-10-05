import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { reducedMotion } from "./play";
import {
    HOME,
    STAND_LEVELS,
    STEP,
    changeOf,
    owedTo,
    startStand,
} from "../../../school/games/lemonade";

const reads = (page: Page) => page.locator('[data-game="reads"]');

async function said(page: Page): Promise<string> {
    return (await reads(page).textContent()) ?? "";
}

/** How full the cup under the jug is, as the words for the screen reader say, from nought to one. */
async function cupShare(page: Page, max: number): Promise<number> {
    const text = await said(page);
    const ml = /has (\d+) ml in it/.exec(text)?.[1];
    if (ml) return Number(ml) / max;
    return Number(/is (\d+)% full/.exec(text)?.[1] ?? 0) / 100;
}

/**
 * Serves every customer of a level from the keys under reduced motion, where each press of down
 * pours a little and settles, so the pour is read after every press and stops on the order; each cup
 * is then pushed by the arrows to its customer, as a child counting the squares would.
 */
async function serveByKeys(page: Page, phase: number, only?: number): Promise<void> {
    const L = STAND_LEVELS[phase];
    if (!L) throw new Error("Unknown level");
    let power = startStand(phase).power;
    for (const [k, c] of L.customers.slice(0, only ?? L.customers.length).entries())
        for (let cup = 0; cup < c.cups; cup++) {
            await expect(reads(page)).toContainText("The cup under the jug", { timeout: 15000 });
            for (let i = 0; i < 60 && (await cupShare(page, L.cup.max)) < c.want - 0.03; i++)
                await page.keyboard.press("ArrowDown");
            const target = Math.round(((L.slots[k] ?? 0) - HOME) / STEP) * STEP;
            while (power < target) {
                await page.keyboard.press("ArrowRight");
                power += STEP;
            }
            while (power > target) {
                await page.keyboard.press("ArrowLeft");
                power -= STEP;
            }
            await page.keyboard.press("Space");
            await page.waitForTimeout(300);
        }
}

test("lemonade stand: the first level is served from the keys, a pour at a time, to the last customer", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop" && info.project.name !== "phone-webkit");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=wardrobe&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await reducedMotion(page);
    await serveByKeys(page, 0);
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({
        timeout: 20000,
    });
    expect(errors).toEqual([]);
});

test("lemonade stand: a hand drawing the jug down pours, and a cup pulled back slides along the counter", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the jug is dragged with a mouse");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=wardrobe&v=1&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const jug = await page.locator('[data-key="jug"]').first().boundingBox();
    if (!jug) throw new Error("Missing the jug");
    await page.mouse.move(jug.x + jug.width / 2, jug.y + jug.height / 2);
    await page.mouse.down();
    await page.mouse.move(jug.x + jug.width / 2, jug.y + jug.height * 1.3, { steps: 8 });
    await expect.poll(async () => cupShare(page, 200), { timeout: 10000 }).toBeGreaterThan(0.1);
    await page.mouse.up();
    await page.waitForTimeout(1200);
    const cup = await page.locator('[data-key="cup"]').first().boundingBox();
    if (!cup) throw new Error("Missing the cup");
    const x = cup.x + cup.width / 2,
        y = cup.y + cup.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - cup.width * 0.5, y, { steps: 8 });
    await page.mouse.up();
    await expect
        .poll(async () => (await page.locator('[data-key="cup"]').first().boundingBox())?.x ?? 0, {
            timeout: 5000,
        })
        .toBeGreaterThan(cup.x + 20);
    expect(errors).toEqual([]);
});

test("lemonade stand: tapping Charlie's coins gives the change, and the customer says thank you", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop" && info.project.name !== "phone-webkit");
    const phase = 2,
        L = STAND_LEVELS[phase],
        first = L?.customers[0];
    if (!L || !first) throw new Error("Unknown level");
    const coins = changeOf(L.tray, owedTo(L, first));
    if (!coins?.length) throw new Error("The first customer owes change");
    await page.goto(`/games?g=wardrobe&v=${phase}&probe=1`);
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await reducedMotion(page);
    await serveByKeys(page, phase, 1);
    await expect(reads(page)).toContainText("of change in the dish", { timeout: 20000 });
    await expect(page.getByRole("button", { name: "Next coin" })).toHaveCount(0);
    for (const kind of coins) {
        const box = await page.locator(`[data-key="tray:${kind}"]`).first().boundingBox();
        if (!box) throw new Error(`Missing the ${kind} in Charlie's dish`);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(400);
    }
    await expect(page.locator('[data-game="aside"]').first()).toContainText("Thank you", {
        timeout: 10000,
    });
});
