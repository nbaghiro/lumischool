import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { openGame } from "./play";

/** The top of the pony's box on the page, from the field's hidden copy of its sprites. */
const ponyTop = async (page: Page): Promise<number> =>
    (await page.locator('.field-probe [data-key="pony"]').boundingBox())?.y ?? NaN;

test("clear round: space held gathers the pony, and let go it leaps off the grass", async ({
    page,
}) => {
    const errors: string[] = [];
    await openGame(page, "clear", 0, errors, "pony");
    const rest = await ponyTop(page);
    await page.keyboard.down("Space");
    await page.waitForTimeout(450);
    await page.keyboard.up("Space");
    await expect.poll(() => ponyTop(page), { timeout: 4000 }).toBeLessThan(rest - 20);
    expect(errors).toEqual([]);
});

/** Rides the first course clean, pressing once a fence when the note says "Tap!". */
async function rideFirst(page: Page, press: () => Promise<void>): Promise<void> {
    const note = page.locator(".game-feedback-live");
    const another = page.locator(".game-toolbar .game-finished");
    const due = async () => /Tap!/.test((await note.textContent()) ?? "");
    // the first press starts the round and asks for nothing
    await press();
    for (let fence = 0; fence < 6 && !(await another.isVisible()); fence++) {
        await expect
            .poll(async () => (await another.isVisible()) || (await due()), {
                timeout: 20_000,
                intervals: [40],
            })
            .toBe(true);
        if (await another.isVisible()) break;
        await press();
        await expect.poll(due, { timeout: 5_000 }).toBe(false);
    }
    await expect(another).toBeVisible({ timeout: 20_000 });
}

test("clear round: one tap on the field a fence rides the first course clean", async ({
    page,
}, info) => {
    test.setTimeout(90_000);
    const touch = info.project.name.startsWith("phone");
    const errors: string[] = [];
    await openGame(page, "clear", 0, errors, "pony");
    const box = await page.locator(".field-gl").first().boundingBox();
    if (!box) throw new Error("Missing the field");
    const x = box.x + box.width / 2,
        y = box.y + box.height / 3;
    await rideFirst(page, () => (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y)));
    expect(errors).toEqual([]);
});

test("clear round: Enter on the keyboard a fence rides the first course clean", async ({
    page,
}, info) => {
    test.skip(info.project.name.startsWith("phone"), "phones have no keyboard");
    test.setTimeout(90_000);
    const errors: string[] = [];
    await openGame(page, "clear", 0, errors, "pony");
    await rideFirst(page, () => page.keyboard.press("Enter"));
    expect(errors).toEqual([]);
});

test("clear round: the stride keys choose the stride the prints are counted at", async ({
    page,
}) => {
    const errors: string[] = [];
    await openGame(page, "clear", 1, errors, "pony");
    const reads = page.locator('[data-game="reads"]');
    await expect.poll(() => reads.textContent()).toMatch(/^Stride 3\./);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => reads.textContent(), { timeout: 4000 }).toMatch(/^Stride 4\./);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => reads.textContent(), { timeout: 4000 }).toMatch(/^Stride 2\./);
    expect(errors).toEqual([]);
});
