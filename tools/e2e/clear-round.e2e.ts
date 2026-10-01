import { expect, type Page } from "@playwright/test";
import { test } from "./steps";

/** The top of the pony's box on the page, from the field's hidden copy of its sprites. */
const ponyTop = async (page: Page): Promise<number> =>
    (await page.locator('.field-probe [data-key="pony"]').boundingBox())?.y ?? NaN;

async function open(page: Page, level: number, errors: string[]): Promise<void> {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/games?g=clear&v=${level}&probe=1`);
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await expect(page.locator('.field-probe [data-key="pony"]')).toBeAttached();
}

test("clear round: space held gathers the pony, and let go it leaps off the grass", async ({
    page,
}, info) => {
    const errors: string[] = [];
    await open(page, 0, errors);
    const rest = await ponyTop(page);
    await page.keyboard.down("Space");
    await page.waitForTimeout(450);
    await page.keyboard.up("Space");
    await expect.poll(() => ponyTop(page), { timeout: 4000 }).toBeLessThan(rest - 20);
    await page.screenshot({ path: `/tmp/clear-round-${info.project.name}.png` });
    expect(errors).toEqual([]);
});

test("clear round: one tap on the field a fence rides the first course clean", async ({
    page,
}, info) => {
    test.setTimeout(90_000);
    const touch = info.project.name.startsWith("phone");
    const errors: string[] = [];
    await open(page, 0, errors);
    const box = await page.locator(".field-gl").first().boundingBox();
    if (!box) throw new Error("Missing the field");
    const x = box.x + box.width / 2,
        y = box.y + box.height / 3;
    const note = page.locator(".game-feedback-live");
    const another = page.getByRole("button", { name: "Play another", exact: true });
    const due = async () => /Tap now/.test((await note.textContent()) ?? "");
    const tap = () => (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
    // the first tap starts the round and asks for nothing
    await tap();
    for (let fence = 0; fence < 6 && !(await another.isVisible()); fence++) {
        await expect
            .poll(async () => (await another.isVisible()) || (await due()), {
                timeout: 20_000,
                intervals: [40],
            })
            .toBe(true);
        if (await another.isVisible()) break;
        await tap();
        await expect.poll(due, { timeout: 5_000 }).toBe(false);
    }
    await expect(another).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
});

test("clear round: the stride keys choose the stride the prints are counted at", async ({
    page,
}) => {
    const errors: string[] = [];
    await open(page, 1, errors);
    const reads = page.locator('[data-game="reads"]');
    await expect.poll(() => reads.textContent()).toMatch(/^Stride 3\./);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => reads.textContent(), { timeout: 4000 }).toMatch(/^Stride 4\./);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => reads.textContent(), { timeout: 4000 }).toMatch(/^Stride 2\./);
    expect(errors).toEqual([]);
});
