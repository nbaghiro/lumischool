import { expect, type Page } from "@playwright/test";
import { test } from "./steps";
import { startYard, YARD_WORLD } from "../../school/games/yard";
import { yardWay } from "../../school/games/yard-challenges";

const ARROWS = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };

/** Waits until the words say no wagon is rolling, read twice so a push that has only just begun is not missed. */
async function still(page: Page): Promise<void> {
    const reads = page.locator('[data-game="reads"]');
    let quiet = 0;
    for (let i = 0; i < 120 && quiet < 2; i++) {
        await page.waitForTimeout(300);
        quiet = ((await reads.textContent()) ?? "").includes("rolling") ? 0 : quiet + 1;
    }
}

test("shunting yard: the keys set the points and the push, and every siding is made up", async ({
    page,
}, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=shunt&v=2");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await page.locator('[data-game="board"]').focus();
    const way = yardWay(startYard(2), { by: "keys" });
    const reads = page.locator('[data-game="reads"]');
    let pushes = 0;
    if (!way) throw new Error("No way to make up the yard");
    for (const pad of way) {
        for (const d of pad.pressed) await page.keyboard.press(ARROWS[d]);
        if (pad.tapped) {
            // a press that lands just as the yard comes to rest can be missed, so each push is
            // checked on the count of pushes and made again if it did not go
            pushes++;
            for (let tries = 0; tries < 3; tries++) {
                await page.keyboard.press("Space");
                await still(page);
                if (((await reads.textContent()) ?? "").includes(`and ${pushes} push`)) break;
            }
        }
        if (pad.brake) await page.keyboard.press("Backspace");
    }
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible({
        timeout: 15000,
    });
    await page.screenshot({ path: `/tmp/shunting-yard-${info.project.name}.png` });
    expect(errors).toEqual([]);
});

test("shunting yard: a tap on a board sets the points and a drag from the front wagon pushes it", async ({
    page,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=shunt&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const reads = page.locator('[data-game="reads"]');
    await expect(reads).toContainText("The points are set for A");
    const board = await page.locator('[data-key="board1"]').first().boundingBox();
    if (!board) throw new Error("Missing board B");
    await page.mouse.click(board.x + board.width / 2, board.y + board.height / 3);
    await expect(reads).toContainText("The points are set for B");
    const wagon = await page.locator('[data-key="w0:2"]').first().boundingBox();
    const canvas = await page.locator(".board > .field-gl canvas").first().boundingBox();
    if (!wagon || !canvas) throw new Error("Missing wagon");
    const sq = canvas.width / Math.min(YARD_WORLD.w, canvas.width / 6),
        x = wagon.x + wagon.width / 2,
        y = wagon.y + wagon.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + Math.max(1.2 * sq, 12), y, { steps: 8 });
    await page.mouse.up();
    await expect(reads).toContainText(/rolling|standing loose|has 2/, { timeout: 5000 });
    await still(page);
    await expect(page.locator(".board")).not.toContainText("NaN");
    expect(errors).toEqual([]);
});
