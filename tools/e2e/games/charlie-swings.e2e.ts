import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { openGame } from "./play";

const played = (page: Page) => page.locator(".game-toolbar .game-finished").isVisible();

test("rope swings: from the keys, pulled back with the arrows, Pull starts the swing and Let go flies her across", async ({
    page,
}) => {
    const errors: string[] = [];
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openGame(page, "bridge", 0, errors, "charlie");
    const button = (word: string) => page.getByRole("button", { name: word, exact: true });
    await expect(button("Pull")).toBeVisible();
    // held still, each press is one move: a pull of four or more crosses the stream, a smaller one splashes
    for (const pulls of [6, 8, 5]) {
        if (await played(page)) break;
        for (let i = 0; i < pulls; i++) await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("Space");
        await expect(button("Let go")).toBeVisible();
        await page.keyboard.press("Space");
    }
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible();
    expect(errors).toEqual([]);
});

test("rope swings: a finger pulls her back and lifts to swing, and a tap on the field lets her go", async ({
    page,
}, info) => {
    test.skip(info.project.name.includes("phone"), "the mouse stands for a finger on the desk");
    const errors: string[] = [];
    await openGame(page, "bridge", 0, errors, "charlie");
    const reads = page.locator('[data-game="reads"]');
    const charlie = await page.locator('.field-probe [data-key="charlie"]').boundingBox();
    const field = await page.locator(".field-gl").first().boundingBox();
    if (!charlie || !field) throw new Error("Missing the field or Charlie");
    await page.mouse.move(charlie.x + charlie.width / 2, charlie.y + charlie.height / 3);
    await page.mouse.down();
    await page.mouse.move(charlie.x - charlie.width * 2, charlie.y - charlie.height / 2, {
        steps: 8,
    });
    await expect.poll(() => reads.textContent(), { timeout: 4000 }).toMatch(/pulled back/);
    await page.mouse.up();
    await expect.poll(() => reads.textContent(), { timeout: 4000 }).toMatch(/swinging/);
    await page.waitForTimeout(700);
    await page.mouse.click(field.x + field.width / 2, field.y + field.height / 2);
    await expect
        .poll(() => reads.textContent(), { timeout: 4000 })
        .toMatch(/flying|far side|picnic|climbing|near bank/);
    expect(errors).toEqual([]);
});

test("rope swings: the words under the field say which stone is steady next", async ({ page }) => {
    const errors: string[] = [];
    await openGame(page, "bridge", 1, errors, "charlie");
    const reads = page.locator('[data-game="reads"]');
    await expect.poll(() => reads.textContent()).toMatch(/Next: the stone at 4\./);
    await expect(reads).toContainText("Stones stand at 2, 4, 6.");
    expect(errors).toEqual([]);
});
