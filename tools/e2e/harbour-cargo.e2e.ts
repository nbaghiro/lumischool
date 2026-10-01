import { expect, type Page } from "@playwright/test";
import { test } from "./steps";
import { fieldPoints } from "./field";
import { startWorkshop } from "../../school/games/workshops";
import { cargoPlan } from "../../school/games/workshop-challenges";

/** Waits until `n` crates are aboard, as the words say; the words can lag a step, so the count is what is read. */
async function aboard(page: Page, n: number): Promise<void> {
    await expect(page.locator('[data-game="reads"]')).toContainText(`${n} crates aboard`, {
        timeout: 15000,
    });
}

test("harbour cargo: dragging each crate over the boat and letting go loads it, and the boat sails", async ({
    page,
}, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=cargo-workshop&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.getByRole("button", { name: "Ring the bell" })).toHaveCount(0);
    const level = startWorkshop(0).definition,
        plan = cargoPlan(level);
    for (const [i, p] of level.pieces.entries()) {
        // on a phone held upright the camera follows the play between crates, so it is read again once it rests
        await page.waitForTimeout(800);
        const { toScreen } = await fieldPoints(page);
        const from = toScreen(p.x, p.y),
            to = toScreen(plan[i] ?? 30, 10);
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 20 });
        await page.waitForTimeout(1500);
        await page.mouse.up();
        await aboard(page, i + 1);
    }
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible({
        timeout: 15000,
    });
    await page.screenshot({ path: `/tmp/harbour-cargo-drag-${info.project.name}.png` });
    expect(errors).toEqual([]);
});

/** How far the hook moves while an arrow is held, in squares a second: 0.14 a step at sixty steps. */
const HOOK = 8.4;

test("harbour cargo: driving the crane from the keys loads every crate, steadied low before it is let go", async ({
    page,
}, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=cargo-workshop&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.getByRole("button", { name: "Pick up / let go", exact: true })).toBeVisible();
    await page.locator('[data-game="board"]').focus();
    const level = startWorkshop(0).definition,
        plan = cargoPlan(level);
    // the hook's place is followed here as the game moves it, so each arrow is held for as long as the move takes
    const hook = { x: 5, y: 10 };
    const move = async (x: number, y: number) => {
        for (const [key, by] of [
            [y < hook.y ? "ArrowUp" : "ArrowDown", Math.abs(y - hook.y)],
            [x < hook.x ? "ArrowLeft" : "ArrowRight", Math.abs(x - hook.x)],
        ] as const) {
            if (by < 0.1) continue;
            await page.keyboard.down(key);
            await page.waitForTimeout((by / HOOK) * 1000);
            await page.keyboard.up(key);
        }
        hook.x = x;
        hook.y = y;
    };
    for (const [i, p] of level.pieces.entries()) {
        await move(hook.x, 10);
        await move(p.x, 10);
        await move(p.x, p.y - 1.2);
        await page.waitForTimeout(2000);
        await page.keyboard.press("Space");
        await move(p.x, 10);
        await move(plan[i] ?? 30, 10);
        // lowered close to the deck and left to stop swinging, as a crane driver would
        await move(plan[i] ?? 30, 17.9);
        await page.waitForTimeout(3000);
        await page.keyboard.press("Space");
        await aboard(page, i + 1);
    }
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible({
        timeout: 15000,
    });
    await page.screenshot({ path: `/tmp/harbour-cargo-keys-${info.project.name}.png` });
    expect(errors).toEqual([]);
});
