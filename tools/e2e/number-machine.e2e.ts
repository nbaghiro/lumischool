// The number machine in the browser: a ball pulled back by the pointer, or rolled with the keys,
// drops into a pocket, goes through the machine and fills an order.
import { expect } from "@playwright/test";
import { FEED, MACHINE_LEVELS, ruleGame, through } from "../../school/games/rule";
import { powerFor } from "../../school/games/rule-challenges";
import { test } from "./steps";

test("the number machine: a pull drops the ball into the pocket that fills the first order", async ({
    page,
}, info) => {
    test.skip(info.project.name.startsWith("phone"), "the ball is pulled with a mouse here");
    await page.goto("/games?g=rule&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const L = MACHINE_LEVELS[0];
    const n = L.numbers.find((x) => through(L, x) === L.orders[0]);
    if (n === undefined) throw new Error("No number fills the first order");
    const power = powerFor(L, n);
    if (power === null) throw new Error("No pull reaches the pocket");
    const field = await page.locator(".field").boundingBox();
    const ball = await page.locator('[data-key="ball"]').boundingBox();
    if (!field || !ball) throw new Error("Missing the field or the ball");
    // squares to pixels from the view, which is the whole world across
    const per = field.width / ruleGame.frame(ruleGame.start(0)).view.w;
    const from = { x: ball.x + ball.width / 2, y: ball.y + ball.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x - (power / FEED.per) * per, from.y, { steps: 10 });
    await page.mouse.up();
    const reads = page.locator('[data-game="reads"]');
    await expect(reads).toContainText(`${n} made ${L.orders[0]}`, { timeout: 15_000 });
    await expect(reads).toContainText("1 of 3 orders filled");
});

test("the number machine: the keys set how hard and roll, and a wrong ball is written in the table", async ({
    page,
}) => {
    await page.goto("/games?g=rule&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await page.locator('[data-game="board"]').focus();
    await page.keyboard.press(" ");
    const reads = page.locator('[data-game="reads"]');
    await expect(reads).toContainText(/So far: \d+ made \d+/, { timeout: 15_000 });
    await expect(reads).toContainText("0 of 3 orders filled");
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(600);
    await page.keyboard.up("ArrowRight");
    await expect(reads).toContainText(/Pull strength (4\.[5-9]|[5-9])/);
});
