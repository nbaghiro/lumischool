import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import {
    BRIDGE_LEVELS,
    coins,
    pickCentre,
    startBridge,
    viewOf,
    type BridgeLevel,
} from "../../../school/games/bridgebuild";
import type { Material } from "../../../engine/motion/truss";
import { buildByKeys } from "../../../school/games/bridgebuild-challenges";

/** The page's key for each of the game's commands and arrows, as `commands` in the game names them. */
const KEY: Record<string, string> = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    join: "Enter",
    material: "m",
    remove: "Delete",
};

async function open(page: Page, level: number, errors: string[]): Promise<void> {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/games?g=bridgebuild&v=${level}&probe=1`);
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await page.waitForTimeout(400);
}

/** The mouse pressed at one place in the world's squares, moved to another and let go. */
async function drag(
    page: Page,
    from: { x: number; y: number },
    to: { x: number; y: number },
    hold?: () => Promise<unknown>,
): Promise<void> {
    const { toScreen } = await fieldPoints(page);
    const a = toScreen(from.x, from.y),
        b = toScreen(to.x, to.y);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 16 });
    await page.waitForTimeout(150);
    await hold?.();
    await page.mouse.up();
    await page.waitForTimeout(250);
}

async function click(page: Page, at: { x: number; y: number }): Promise<void> {
    const { toScreen } = await fieldPoints(page);
    const p = toScreen(at.x, at.y);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(200);
}

/** A material's tile of the picker clicked, placed as a share of the view as the page places it. */
async function pick(page: Page, L: BridgeLevel, m: Material): Promise<void> {
    const box = await page.locator(".field-gl").boundingBox();
    if (!box) throw new Error("No field");
    const v = viewOf(L),
        at = pickCentre(L, m);
    await page.mouse.click(box.x + (at.x / v.w) * box.width, box.y + (at.y / v.h) * box.height);
    await page.waitForTimeout(200);
}

test("bridge builder: a road dragged over the stream, Go, and the pups' car crosses", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the bridge is dragged with a mouse on the desktop");
    const errors: string[] = [];
    await open(page, 0, errors);
    const L = BRIDGE_LEVELS[0];
    const road = L.plan[0];
    if (!road) throw new Error("No plan for the stream");
    await drag(page, road.a, road.b, () =>
        page.screenshot({ path: `/tmp/bridge-builder-ghost-${info.project.name}.png` }),
    );
    await expect(page.locator('[data-game="reads"]')).toContainText("road beam 4.0 squares long");
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `/tmp/bridge-builder-crossing-${info.project.name}.png` });
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
});

test("bridge builder: a triangle built by the mouse glows as it works while the car crosses", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the bridge is dragged with a mouse on the desktop");
    const errors: string[] = [];
    await open(page, 1, errors);
    const L = BRIDGE_LEVELS[1];
    if (!L) throw new Error("No wider stream");
    let pen = "road";
    for (const [i, seg] of L.plan.entries()) {
        if (seg.m !== pen) {
            await pick(page, L, seg.m);
            pen = seg.m;
        }
        await drag(page, seg.a, seg.b, async () => {
            if (i === L.plan.length - 1)
                await page.screenshot({
                    path: `/tmp/bridge-builder-building-${info.project.name}.png`,
                });
        });
    }
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await page.waitForTimeout(4600);
    await page.screenshot({ path: `/tmp/bridge-builder-strain-${info.project.name}.png` });
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
});

test("bridge builder: a chain of taps builds the wider stream's bridge, and Again keeps it", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the bridge is tapped with a mouse on the desktop");
    const errors: string[] = [];
    await open(page, 1, errors);
    const L = BRIDGE_LEVELS[1];
    if (!L) throw new Error("No wider stream");
    // the road across as one chain of taps, stopped on its far end; then each strut as a tap and a tap
    const [a, b, ...struts] = L.plan;
    if (!a || !b) throw new Error("No road across");
    await click(page, a.a);
    await click(page, a.b);
    await click(page, b.b);
    await expect(page.locator('[data-game="reads"]')).toContainText("road beam 3.0 squares long");
    await click(page, b.b);
    await pick(page, L, "wood");
    for (const [i, seg] of struts.entries()) {
        await click(page, seg.a);
        if (i === 0) {
            const { toScreen } = await fieldPoints(page);
            const end = toScreen(seg.b.x + 0.2, seg.b.y + 0.3);
            await page.mouse.move(end.x, end.y, { steps: 8 });
            await page.waitForTimeout(200);
            await page.screenshot({ path: `/tmp/bridge-builder-chain-${info.project.name}.png` });
        }
        await click(page, seg.b);
        await click(page, seg.b);
    }
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 20_000 });
    await page.locator('.round-end [data-end="again"]').click();
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await page.waitForTimeout(400);
    // the try starts again from the bridge as built, not from the empty banks
    await expect(page.locator('[data-game="reads"]')).not.toContainText("Nothing is built yet");
    await expect(page.locator('[data-game="reads"]')).toContainText(`Spent ${coins(L.plan)} coins`);
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
});

test("bridge builder: a bridge of squares folds, says so, and Go takes it back to build", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "a desktop's run");
    const errors: string[] = [];
    await open(page, 2, errors);
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await page.waitForTimeout(5200);
    await page.screenshot({ path: `/tmp/bridge-builder-collapse-${info.project.name}.png` });
    await expect(page.getByText("Add a triangle?").first()).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
});

test("bridge builder: the stream is bridged and crossed with the keys alone", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the keys are a desktop's");
    await page.goto("/games?g=bridgebuild&v=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await page.locator('[data-game="board"]').focus();
    const L = BRIDGE_LEVELS[1];
    if (!L) throw new Error("No wider stream");
    const keys: string[] = [];
    expect(buildByKeys(startBridge(L, 1), L.plan, undefined, keys)).toBe(true);
    for (const id of keys) await page.keyboard.press(KEY[id] ?? id);
    await page.keyboard.press(" ");
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 20_000 });
});
