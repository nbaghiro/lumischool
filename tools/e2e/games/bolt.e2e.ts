// Bolt's rescue on the moon: the keys run, jump and spin Bolt to its three crew and the ship; a finger
// held on the field does the same, with a tap on Bolt for the spin; either way the ship lifts off.
import { expect, type Page } from "@playwright/test";
import { fieldPoints } from "../field";
import { test } from "../steps";

async function open(page: Page, errors: string[]): Promise<void> {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=bolt&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await expect(page.locator('.field-probe [data-key="bolt"]')).toBeAttached();
}

/** Where Bolt's feet are, in the world's squares, from the probe and the camera it records. */
async function feet(page: Page): Promise<{ x: number; y: number }> {
    const b = await page.locator('.field-probe [data-key="bolt"]').boundingBox();
    if (!b) throw new Error("Missing Bolt");
    const f = await fieldPoints(page);
    return f.toWorld(b.x + b.width / 2, b.y + b.height);
}

const won = (page: Page) => page.locator(".game-toolbar .game-finished");

/** Holds an arrow in short presses until Bolt's feet are at `x`. */
async function runTo(page: Page, x: number): Promise<void> {
    for (let i = 0; i < 300; i++) {
        const at = (await feet(page)).x;
        if (Math.abs(at - x) < 0.4) return;
        const key = at < x ? "ArrowRight" : "ArrowLeft";
        await page.keyboard.down(key);
        await page.waitForTimeout(Math.abs(at - x) > 2 ? 80 : 25);
        await page.keyboard.up(key);
    }
}

/** From a standstill at the edge, jumps right, holding space `ms` and the arrow until it lands. */
async function leap(page: Page, ms: number): Promise<void> {
    await page.keyboard.down("ArrowRight");
    await page.keyboard.down("Space");
    await page.waitForTimeout(ms);
    await page.keyboard.up("Space");
    await page.waitForTimeout(1100);
    await page.keyboard.up("ArrowRight");
}

test("bolt: the keys run, jump and spin Bolt to the three crew, and the ship lifts off", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the keys are played on the desktop");
    test.setTimeout(90_000);
    const errors: string[] = [];
    await open(page, errors);
    await page.locator('[data-game="board"]').focus();
    await runTo(page, 19.4);
    await leap(page, 350);
    // the crate: a spin breaks it open
    await runTo(page, 28.4);
    await page.keyboard.press("x");
    await page.waitForTimeout(300);
    await runTo(page, 31);
    // straight up onto the high ledge, as the moon's jump goes 6 squares
    await runTo(page, 36.5);
    await page.keyboard.down("Space");
    await page.waitForTimeout(700);
    await page.keyboard.up("Space");
    await page.waitForTimeout(1200);
    await expect(page.locator(".game-feedback")).toContainText("3 of");
    await runTo(page, 43.6);
    await leap(page, 350);
    await runTo(page, 57);
    await expect(won(page)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".round-end")).toHaveAttribute("data-round-end", "won");
    await expect(page.locator(".game-feedback")).toContainText("Lift off");
    expect(errors).toEqual([]);
});

test("bolt: a finger held on the field runs and jumps Bolt, a tap on Bolt spins, and the ship lifts off", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the mouse is held on the desktop");
    test.setTimeout(120_000);
    const errors: string[] = [];
    await open(page, errors);
    const box = await page.locator(".field-gl").boundingBox();
    if (!box) throw new Error("Missing the field");
    const inside = (p: { x: number; y: number }) => ({
        x: Math.min(box.x + box.width - 2, Math.max(box.x + 2, p.x)),
        y: Math.min(box.y + box.height - 2, Math.max(box.y + 2, p.y)),
    });
    /** Holds the finger ahead of Bolt, or above and ahead for a jump, until its feet are at `x`. */
    async function hold(x: number, jumpFrom?: number): Promise<void> {
        let f = await fieldPoints(page);
        let at = await feet(page);
        const start = inside(f.toScreen(at.x + 3, at.y - 1));
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        for (let i = 0; i < 400; i++) {
            f = await fieldPoints(page);
            at = await feet(page);
            if (Math.abs(at.x - x) < 0.5) break;
            const up = jumpFrom !== undefined && at.x >= jumpFrom && at.x < x - 1;
            const dir = x > at.x ? 1 : -1;
            const p = inside(f.toScreen(at.x + dir * 3, at.y - (up ? 5 : 1)));
            await page.mouse.move(p.x, p.y);
            await page.waitForTimeout(25);
        }
        await page.mouse.up();
        await page.waitForTimeout(150);
    }
    async function tapBolt(): Promise<void> {
        const f = await fieldPoints(page);
        const at = await feet(page);
        const p = inside(f.toScreen(at.x, at.y - 0.9));
        await page.mouse.click(p.x, p.y);
        await page.waitForTimeout(300);
    }
    await hold(12.5);
    await hold(27, 19.3);
    await hold(28.4);
    await tapBolt();
    await hold(31);
    await hold(36.5);
    // a finger held above Bolt, standing, jumps it straight up onto the ledge
    const f = await fieldPoints(page);
    const at = await feet(page);
    const p = inside(f.toScreen(at.x, at.y - 5));
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.waitForTimeout(900);
    await page.mouse.up();
    await page.waitForTimeout(600);
    await hold(41.5);
    await hold(51, 43.2);
    await hold(57);
    await expect(won(page)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".round-end")).toHaveAttribute("data-round-end", "won");
    expect(errors).toEqual([]);
});
