import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { openGame } from "./play";
import { aimFor } from "../../../school/games/aquarium-challenges";
import { FOOD, aquariumGame, innerOf, spotOf } from "../../../school/games/aquarium";

const SHOTS = "/tmp";
const card = (page: Page) => page.locator(".round-end");
const reads = (page: Page) => page.locator('[data-game="reads"]');

/** Charlie's tank's litres, as the page reads them out. */
async function litres(page: Page): Promise<number> {
    const m = /Charlie's tank holds ([\d.]+) of/.exec((await reads(page).textContent()) ?? "");
    return m ? Number(m[1]) : 0;
}

/** Where a sprite's middle is, in the field's squares, from where the probe has it drawn. */
async function middle(
    page: Page,
    key: string,
    toWorld: (x: number, y: number) => { x: number; y: number },
): Promise<{ x: number; y: number }> {
    const box = await page.locator(`.field-probe [data-key="${key}"]`).boundingBox();
    if (!box) throw new Error(`No ${key}`);
    return toWorld(box.x + box.width / 2, box.y + box.height / 2);
}

test("aquarium: fill to the line, net the guppy into the tank, feed it, and win the first level by the mouse", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the first level by a mouse, on the desktop");
    const errors: string[] = [];
    await openGame(page, "aquarium", 0, errors, "jug");
    const { toScreen, toWorld } = await fieldPoints(page);
    const s = aquariumGame.start(0);
    const t = s.tanks[0],
        bag = s.tanks[1];
    const goal = s.L.goals[0];
    if (!t || !bag || goal?.kind !== "fill") throw new Error("No tank");
    const jug = spotOf(s, "jug"),
        net = spotOf(s, "net"),
        food = spotOf(s, "food");
    if (!jug || !net || !food) throw new Error("No tools");

    // the jug: pressed on the shelf, carried level over the tank and lowered to pour, faster the lower it goes
    const level = toScreen(t.x - 1.5, innerOf(t).top - 3.4),
        low = toScreen(t.x - 1.5, innerOf(t).top - 0.5),
        gentle = toScreen(t.x - 1.5, innerOf(t).top - 2.2);
    const grabJug = async () => {
        const at = toScreen(jug.x, jug.y);
        await page.mouse.move(at.x, at.y);
        await page.mouse.down();
        await page.mouse.move(level.x, level.y, { steps: 10 });
    };
    await grabJug();
    await page.mouse.move(low.x, low.y, { steps: 6 });
    await expect
        .poll(() => litres(page), { timeout: 15000, intervals: [40] })
        .toBeGreaterThan(goal.litres - 1.6);
    await page.screenshot({ path: `${SHOTS}/aquarium-pour.png` });
    // near the line the first level's pour slows to a trickle, so lifting a little late still lands on it
    await page.mouse.move(gentle.x, gentle.y, { steps: 4 });
    await expect
        .poll(() => litres(page), { timeout: 15000, intervals: [40] })
        .toBeGreaterThan(goal.litres - goal.within * 0.6);
    await page.mouse.up();
    await page.waitForTimeout(1000);
    for (let i = 0; i < 6; i++) {
        const now = await litres(page);
        if (Math.abs(now - goal.litres) <= goal.within * 0.8) break;
        await grabJug();
        if (now < goal.litres) {
            await page.mouse.move(gentle.x, gentle.y, { steps: 4 });
            await expect
                .poll(() => litres(page), { timeout: 8000, intervals: [40] })
                .toBeGreaterThan(goal.litres - goal.within * 0.6);
        } else {
            // held down in the water the jug scoops out by degrees until it is lifted
            const under = toScreen(t.x - 1.5, innerOf(t).bottom - 1.5);
            await page.mouse.move(under.x, under.y, { steps: 6 });
            await expect
                .poll(() => litres(page), { timeout: 8000, intervals: [40] })
                .toBeLessThan(goal.litres + goal.within * 0.6);
        }
        await page.mouse.up();
        await page.waitForTimeout(1000);
    }
    expect(Math.abs((await litres(page)) - goal.litres)).toBeLessThanOrEqual(goal.within);
    await expect(reads(page)).toContainText("Nothing in hand");

    // the net: pressed on the shelf, carried over the guppy's bag, swept slowly onto it, then carried over and let go in the tank
    const fish = await middle(page, "f0", toWorld);
    let at = { x: fish.x, y: innerOf(bag).top + 0.3 };
    let p = toScreen(net.x, net.y);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    const above = toScreen(at.x, innerOf(bag).top - 1.5);
    await page.mouse.move(above.x, above.y, { steps: 14 });
    p = toScreen(at.x, at.y);
    await page.mouse.move(p.x, p.y, { steps: 10 });
    for (let i = 0; i < 400; i++) {
        if (/net with 1 fish/.test((await reads(page).textContent()) ?? "")) break;
        const f = await middle(page, "f0", toWorld);
        const dx = f.x - at.x,
            dy = f.y - at.y,
            d = Math.hypot(dx, dy),
            step = Math.min(d, 0.06);
        if (d > 0.01) at = { x: at.x + (dx / d) * step, y: at.y + (dy / d) * step };
        p = toScreen(at.x, at.y);
        await page.mouse.move(p.x, p.y);
        await page.waitForTimeout(25);
    }
    await expect(reads(page)).toContainText("net with 1 fish");
    await page.screenshot({ path: `${SHOTS}/aquarium-net.png` });
    const up = toScreen(at.x, innerOf(t).top - 2),
        across = toScreen(t.x, innerOf(t).top - 2),
        into = toScreen(t.x, innerOf(t).bottom - 2);
    await page.mouse.move(up.x, up.y, { steps: 8 });
    await page.mouse.move(across.x, across.y, { steps: 12 });
    await page.mouse.move(into.x, into.y, { steps: 8 });
    await page.mouse.up();
    await expect(reads(page)).toContainText("with 1 orange guppy");
    await expect(reads(page)).toContainText("Nothing in hand");

    // the food: pulled back from the tub itself and let go, a pinch of one flake at a time, twice
    const s2 = aquariumGame.start(0);
    s2.tanks[0] = { ...t, litres: goal.litres };
    const aim = aimFor(s2, 0);
    if (!aim) throw new Error("No aim into the tank");
    const pull = {
        x: -Math.cos(aim.angle) * (aim.power / FOOD.per),
        y: -Math.sin(aim.angle) * (aim.power / FOOD.per),
    };
    for (let k = 0; k < 2; k++) {
        const down = toScreen(food.x, food.y),
            back = toScreen(food.x + pull.x, food.y + pull.y);
        await page.mouse.move(down.x, down.y);
        await page.mouse.down();
        await page.mouse.move(back.x, back.y, { steps: 6 });
        if (k === 0) await page.screenshot({ path: `${SHOTS}/aquarium-aim.png` });
        await page.mouse.up();
        await page.waitForTimeout(500);
        if (k === 0) await page.screenshot({ path: `${SHOTS}/aquarium-toss.png` });
        await page.waitForTimeout(1500);
    }
    await expect(card(page)).toHaveAttribute("data-round-end", "won", { timeout: 20000 });
    await page.screenshot({ path: `${SHOTS}/aquarium-won.png` });
    expect(errors).toEqual([]);
});

test("aquarium: the warm water level is won from the keys alone", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one keyboard win, on the desktop");
    const phase = aquariumGame.levels.findIndex((L) => L.title === "Warm water");
    const s = aquariumGame.start(phase);
    const g = s.L.goals[0],
        t = s.tanks[0];
    if (g?.kind !== "heat" || !t || t.dial === null) throw new Error("No heater");
    const errors: string[] = [];
    await openGame(page, "aquarium", phase, errors, "dial0");
    await page.locator('[data-game="board"]').focus();
    for (let i = t.dial; i < g.degrees; i++) await page.keyboard.press("+");
    await expect(reads(page)).toContainText(`Heater ${g.degrees} degrees`);
    await expect(card(page)).toHaveAttribute("data-round-end", "won", { timeout: 20000 });
    expect(errors).toEqual([]);
});
