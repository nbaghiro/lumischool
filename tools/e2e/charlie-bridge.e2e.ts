import { expect, type Page } from "@playwright/test";
import { test } from "./steps";

/** The middle of a stone on the screen: stone 0 is the one at the near bank's edge. */
async function stoneX(page: Page, k: number): Promise<number> {
    const b = await page.locator(`[data-key="stone:${k}"]`).boundingBox();
    if (!b) throw new Error(`Missing stone ${k}`);
    return b.x + b.width / 2;
}

/** Drags a plank by its right end, which the pile keeps in view, and lets go with its near end over `x`. */
async function lay(page: Page, key: string, x: number): Promise<void> {
    const plank = await page.locator(`[data-key="${key}"]`).boundingBox();
    const stone = await page.locator('[data-key="stone:0"]').boundingBox();
    if (!plank || !stone) throw new Error(`Missing ${key} or the stone`);
    const from = { x: plank.x + plank.width - 25, y: plank.y + plank.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(x + (from.x - plank.x), stone.y - 25, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(900);
}

test("Charlie's bridge: a plank that sticks out tips her in, and planks long enough take her to the picnic", async ({
    page,
}, info) => {
    test.skip(info.project.name.startsWith("phone"), "the planks are dragged with a mouse here");
    await page.goto("/games?g=bridge&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const reads = page.locator('[data-game="reads"]');
    await lay(page, "plank:3", await stoneX(page, 0));
    await expect(reads).toContainText("Planks laid: 6 from 0");
    await page.keyboard.press(" ");
    await expect(reads).toContainText("Charlie is swimming back", { timeout: 10_000 });
    await expect(reads).toContainText("on the near bank", { timeout: 10_000 });
    await page.waitForTimeout(1500);
    await lay(page, "plank:2", await stoneX(page, 0));
    await lay(page, "plank:3", await stoneX(page, 1));
    await expect(reads).toContainText("Planks laid: 4 from 0, 6 from 4");
    await page.keyboard.press(" ");
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible({
        timeout: 15_000,
    });
    await page.screenshot({ path: `/tmp/charlie-bridge-${info.project.name}.png` });
});

test("Charlie's bridge is built and crossed with the keys alone", async ({ page }) => {
    await page.goto("/games?g=bridge&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const reads = page.locator('[data-game="reads"]');
    const keys = async (...names: string[]) => {
        for (const name of names) await page.keyboard.press(name);
    };
    // right moves the cursor along the pile and up picks a plank up; the words under the field say
    // which plank is held, once a second, so a wrong one is put back with down and the cursor moved on
    const pick = async (length: number) => {
        for (let i = 0; i < 8; i++) {
            await keys("ArrowUp");
            await page.waitForTimeout(1200);
            const said = (await reads.textContent()) ?? "";
            if (said.includes(`holding the ${length} plank`)) return;
            if (said.includes("You are holding")) await keys("ArrowDown");
            await keys("ArrowRight");
        }
        throw new Error(`never held the ${length} plank`);
    };
    await keys("ArrowRight");
    await pick(4);
    // a held plank starts with its near end over the bank's edge
    await keys("ArrowUp");
    await expect(reads).toContainText("Planks laid: 4 from 0");
    await pick(6);
    // each right moves it half a unit, so eight take its near end to the stone at 4
    await keys(...Array.from({ length: 8 }, () => "ArrowRight"), "ArrowUp");
    await expect(reads).toContainText("Planks laid: 4 from 0, 6 from 4");
    await page.keyboard.press(" ");
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible({
        timeout: 15_000,
    });
});

test("the pulley lift: sacks dragged into the basket carry Charlie up to the picnic", async ({
    page,
}, info) => {
    test.skip(info.project.name.startsWith("phone"), "the sacks are dragged with a mouse here");
    await page.goto("/games?g=bridge&v=7");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const reads = page.locator('[data-game="reads"]');
    // 9, 8 and 7 make 24, four more than Charlie
    for (const key of ["sack:4", "sack:1", "sack:6"]) {
        const sack = await page.locator(`[data-key="${key}"]`).boundingBox();
        const basket = await page.locator('[data-key="lift:basket"]').boundingBox();
        if (!sack || !basket) throw new Error(`Missing ${key} or the basket`);
        await page.mouse.move(sack.x + sack.width / 2, sack.y + sack.height / 2);
        await page.mouse.down();
        await page.mouse.move(basket.x + basket.width / 2, basket.y + basket.height / 3, {
            steps: 12,
        });
        await page.mouse.up();
        await page.waitForTimeout(300);
    }
    await expect(reads).toContainText("together 24 kg");
    await page.keyboard.press(" ");
    await expect(reads).toContainText("Charlie is at the picnic", { timeout: 20_000 });
});
