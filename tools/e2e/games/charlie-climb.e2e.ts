import { expect, type Page } from "@playwright/test";
import { fieldPoints } from "../field";
import { test } from "../steps";

async function open(page: Page, errors: string[]): Promise<void> {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=climb&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await expect(page.locator('.field-probe [data-key="climber"]')).toBeAttached();
}

/** Where the climber's feet are, in the world's squares, from the probe and the camera it records. */
async function feet(page: Page): Promise<{ x: number; y: number }> {
    const b = await page.locator('.field-probe [data-key="climber"]').boundingBox();
    if (!b) throw new Error("Missing the climber");
    const f = await fieldPoints(page);
    return f.toWorld(b.x + b.width / 2, b.y + b.height);
}

/** Places on the garden wall's level where a jump carries her over: the gap, and the low wall. */
const JUMPS = [
    [21.1, 21.9],
    [33.8, 34.8],
] as const;

const won = (page: Page) => page.locator(".game-toolbar .game-finished");

test("climb: the keys run her right, jumps clear the gap and the wall, the coins open the door, and she gets home", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the keys are played on the desktop");
    test.setTimeout(60_000);
    const errors: string[] = [];
    await open(page, errors);
    await page.locator(".field-gl").click();
    await page.keyboard.down("ArrowRight");
    const done = new Set<number>();
    for (let i = 0; i < 600 && !(await won(page).isVisible()); i++) {
        const at = (await feet(page)).x;
        const k = JUMPS.findIndex(([a, b]) => at >= a && at <= b);
        if (k >= 0 && !done.has(k)) {
            done.add(k);
            await page.keyboard.down("Space");
            await page.waitForTimeout(420);
            await page.keyboard.up("Space");
        } else await page.waitForTimeout(25);
        // a fall puts her back before the jump, so it can be tried again
        if (at < 18) done.clear();
    }
    await page.keyboard.up("ArrowRight");
    await expect(won(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".game-feedback")).toContainText("made it home");
    expect(errors).toEqual([]);
});

test("climb: a finger held ahead of her runs her, and held above her jumps, all the way home", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the mouse is held on the desktop");
    test.setTimeout(120_000);
    const errors: string[] = [];
    await open(page, errors);
    const box = await page.locator(".field-gl").boundingBox();
    if (!box) throw new Error("Missing the field");
    let f = await fieldPoints(page);
    let at = await feet(page);
    let p = f.toScreen(at.x + 3, at.y - 1.2);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    const done = new Set<number>();
    for (let i = 0; i < 800 && !(await won(page).isVisible()); i++) {
        f = await fieldPoints(page);
        at = await feet(page);
        const k = JUMPS.findIndex(([a, b]) => at.x >= a && at.x <= b);
        const jump = k >= 0 && !done.has(k);
        if (jump) done.add(k);
        if (at.x < 18) done.clear();
        // a jump's finger goes far enough ahead that she runs on under it while it is held
        p = f.toScreen(at.x + (jump ? 7 : 3), at.y - (jump ? 5 : 1.2));
        await page.mouse.move(
            Math.min(box.x + box.width - 2, Math.max(box.x + 2, p.x)),
            Math.max(box.y + 2, p.y),
        );
        await page.waitForTimeout(jump ? 420 : 25);
    }
    await page.mouse.up();
    await expect(won(page)).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
});
