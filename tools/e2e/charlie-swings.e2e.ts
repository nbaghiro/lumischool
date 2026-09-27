import { expect, type Page } from "@playwright/test";
import { test } from "./steps";

async function open(page: Page, level: number, errors: string[]): Promise<void> {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/games?g=bridge&v=${level}&probe=1`);
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await expect(page.locator('.field-probe [data-key="charlie"]')).toBeAttached();
}

const played = (page: Page) =>
    page.getByRole("button", { name: "Play another", exact: true }).isVisible();

test("rope swings: Swing held for about a second and let go flies Charlie to the far bank", async ({
    page,
}, info) => {
    const errors: string[] = [];
    await open(page, 0, errors);
    // a hold between about 0.85 and 1.4 seconds lands her across; a miss is a splash and a try again
    for (let attempt = 0; attempt < 3 && !(await played(page)); attempt++) {
        await page.keyboard.down("Space");
        await page.waitForTimeout(1100);
        await page.keyboard.up("Space");
        await page.waitForTimeout(3500);
    }
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible();
    await page.screenshot({ path: `/tmp/charlie-swings-${info.project.name}.png` });
    expect(errors).toEqual([]);
});

test("rope swings: a finger held on the field swings her, and lifted she lets go", async ({
    page,
}, info) => {
    test.skip(info.project.name.includes("phone"), "the mouse stands for a finger on the desk");
    const errors: string[] = [];
    await open(page, 0, errors);
    const reads = page.locator('[data-game="reads"]');
    const box = await page.locator(".field-gl").first().boundingBox();
    if (!box) throw new Error("Missing the field");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
    await page.mouse.down();
    await expect.poll(() => reads.textContent(), { timeout: 4000 }).toMatch(/swinging/);
    await page.waitForTimeout(600);
    await page.mouse.up();
    await expect
        .poll(() => reads.textContent(), { timeout: 4000 })
        .toMatch(/flying|far side|picnic|climbing/);
    expect(errors).toEqual([]);
});

test("rope swings: the words under the field say which stone is steady next", async ({ page }) => {
    const errors: string[] = [];
    await open(page, 1, errors);
    const reads = page.locator('[data-game="reads"]');
    await expect.poll(() => reads.textContent()).toMatch(/Next: the stone at 4\./);
    await expect(reads).toContainText("Stones stand at 2, 4, 6.");
    expect(errors).toEqual([]);
});
