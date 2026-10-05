import { expect } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { DOMINO } from "../../../engine/motion/contraption";
import { MACHINE_LEVELS, slotOf, startMachine } from "../../../school/games/machine";
import { buildByKeys, dominoWay } from "../../../school/games/machine-challenges";

/** The page's key for each of the game's commands, as `commands` in the game names them. */
const KEY: Record<string, string> = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    next: "n",
    more: "=",
    fewer: "-",
    "turn-left": "q",
    "turn-right": "r",
};

test("domino machine: the row is dragged up from the drawer, its grip drawn out to fill the gap, and Go rings the bell", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the build is dragged with a mouse on the desktop");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=machine&v=1&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const L = MACHINE_LEVELS[1];
    const plan = L?.plan[0];
    if (!plan || plan.n === undefined) throw new Error("No plan for the gap");
    const drag = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
        const { toScreen } = await fieldPoints(page);
        const a = toScreen(from.x, from.y),
            b = toScreen(to.x, to.y);
        await page.mouse.move(a.x, a.y);
        await page.mouse.down();
        await page.mouse.move(b.x, b.y, { steps: 20 });
        await page.waitForTimeout(200);
        await page.mouse.up();
        await page.waitForTimeout(300);
    };
    await drag(slotOf(0), { x: plan.x, y: plan.y - 0.51 });
    const gripY = plan.y - DOMINO.h - 0.7;
    await drag({ x: plan.x + 2 * 2, y: gripY }, { x: plan.x + (plan.n - 1) * 2, y: gripY });
    await page.screenshot({ path: `/tmp/domino-machine-built-${info.project.name}.png` });
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
});

test("domino machine: the gap is filled and rung with the keys alone", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the keys are a desktop's");
    await page.goto("/games?g=machine&v=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await page.locator('[data-game="board"]').focus();
    const L = MACHINE_LEVELS[1];
    if (!L) throw new Error("No gap level");
    const plan = dominoWay(L, 1);
    if (!plan) throw new Error("The gap has no plan");
    const keys: string[] = [];
    expect(buildByKeys(startMachine(L, 1), plan, undefined, keys)).toBe(true);
    for (const id of keys) await page.keyboard.press(KEY[id] ?? id);
    await page.keyboard.press(" ");
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 20_000 });
});

test("domino machine: the first row is dragged under the slide, counted up with More, and the ball rings the bell", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the build is dragged with a mouse on the desktop");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=machine&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const plan = MACHINE_LEVELS[0]?.plan[0];
    if (!plan || plan.n === undefined) throw new Error("No plan for the slide");
    const more = page.getByRole("button", { name: "More", exact: true });
    await expect(more).toBeHidden();
    const { toScreen } = await fieldPoints(page);
    const a = toScreen(slotOf(0).x, slotOf(0).y),
        b = toScreen(plan.x, plan.y - 0.51);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 20 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await expect(more).toBeVisible();
    for (let n = 2; n < plan.n; n++) await more.click();
    await page.screenshot({ path: `/tmp/domino-machine-slide-${info.project.name}.png` });
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `/tmp/domino-machine-slide-run-${info.project.name}.png` });
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
});
