// The number machine in the browser: a ball tapped in the tray, or chosen and dropped with the keys,
// goes through the machine and fills an order.
import { expect, type Page } from "@playwright/test";
import { MACHINE_LEVELS } from "../../../school/games/rule";
import { machineSolve } from "../../../school/games/rule-challenges";
import { test } from "../steps";

async function tapBall(page: Page, j: number, touch: boolean): Promise<void> {
    const box = await page.locator(`[data-key="tray:${j}"]`).boundingBox();
    if (!box) throw new Error(`Missing ball ${j}`);
    const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
    if (touch) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
}

test("the number machine: tapping the balls the orders need fills them all", async ({
    page,
}, info) => {
    const touch = info.project.name.startsWith("phone");
    await page.goto("/games?g=rule&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const L = MACHINE_LEVELS[0],
        places = machineSolve(L);
    if (!places) throw new Error("The first level cannot be filled");
    const reads = page.locator('[data-game="reads"]');
    for (const [k, j] of places.entries()) {
        await tapBall(page, j, touch);
        await expect(reads).toContainText(
            k + 1 < places.length ? `${k + 1} of 3 orders filled` : "Every order is filled",
            { timeout: 10_000 },
        );
    }
    await expect(page.locator(".game-toolbar button", { hasText: "Roll" })).toHaveCount(0);
    for (const name of ["Ball before", "Ball after", "Drop"])
        await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
});

test("the number machine: the keys choose a ball and drop it, and a wrong ball is written in the table", async ({
    page,
}) => {
    await page.goto("/games?g=rule&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await page.locator('[data-game="board"]').focus();
    const reads = page.locator('[data-game="reads"]');
    // the first ball is the 1, which makes 4, and the first order wants 7
    await page.keyboard.press(" ");
    await expect(reads).toContainText("So far: 1 made 4", { timeout: 10_000 });
    await expect(reads).toContainText("0 of 3 orders filled");
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    await expect(reads).toContainText("Ball 4 is chosen");
    await page.keyboard.press(" ");
    await expect(reads).toContainText("1 of 3 orders filled", { timeout: 10_000 });
});
