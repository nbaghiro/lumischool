import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { middleOf, squareNamed } from "../../../engine/motion/compass";
import { GRID } from "../../../engine/parts/outdoors/islandground";
import { SHOVEL_AT } from "../../../school/games/treasure";
import { openGame } from "./play";

const reads = (page: Page) => page.locator('[data-game="reads"]');
const card = (page: Page) => page.locator(".round-end");

/** The square Charlie stands in, as the page reads it out. */
async function square(page: Page): Promise<string> {
    return /square ([A-L]\d)/.exec((await reads(page).textContent()) ?? "")?.[1] ?? "";
}

/** Where Charlie's feet are, in the island's squares, from where the probe has her drawn. */
async function feet(page: Page) {
    const { toWorld } = await fieldPoints(page);
    const box = await page.locator('.field-probe [data-key="charlie"]').boundingBox();
    if (!box) throw new Error("No Charlie");
    return toWorld(box.x + box.width / 2, box.y + box.height);
}

/** Holds the arrows towards a spot, the way a child steers her there, and lets go near it. */
async function walk(page: Page, to: { x: number; y: number }, near = 0.6) {
    for (let i = 0; i < 80; i++) {
        const at = await feet(page);
        const dx = to.x - at.x,
            dy = to.y - at.y;
        if (Math.hypot(dx, dy) <= near) break;
        const keys: string[] = [];
        if (Math.abs(dx) > near * 0.7) keys.push(dx > 0 ? "ArrowRight" : "ArrowLeft");
        if (Math.abs(dy) > near * 0.7) keys.push(dy > 0 ? "ArrowDown" : "ArrowUp");
        for (const k of keys) await page.keyboard.down(k);
        await page.waitForTimeout(Math.min(160, Math.max(30, Math.hypot(dx, dy) * 35)));
        for (const k of keys) await page.keyboard.up(k);
    }
    await page.waitForTimeout(250);
}

/** Holds one arrow in short steps until her feet are well inside the square named, as a child counts squares. */
async function stepTo(page: Page, key: string, name: string) {
    const q = squareNamed(GRID, name);
    if (!q) throw new Error(`No square ${name}`);
    const m = middleOf(GRID, q);
    const inside = async () => {
        const at = await feet(page);
        return (
            Math.abs(at.x - m.x) < GRID.cell / 2 - 0.5 && Math.abs(at.y - m.y) < GRID.cell / 2 - 0.5
        );
    };
    for (let i = 0; i < 120 && !(await inside()); i++) {
        await page.keyboard.down(key);
        await page.waitForTimeout(70);
        await page.keyboard.up(key);
        await page.waitForTimeout(60);
    }
    await expect.poll(() => square(page)).toBe(name);
}

/** A tap on a place on the island, worked out afresh since the view follows her. */
async function tap(page: Page, x: number, y: number) {
    const { toScreen } = await fieldPoints(page);
    const at = toScreen(x, y);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(250);
}

test("treasure island by the keys: the spade, the palm tree, 3 north and 4 east, and the chest dug up and opened", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "played with a keyboard");
    const errors: string[] = [];
    await openGame(page, "treasure", 0, errors, "charlie");
    await page.locator('[data-game="board"]').focus();
    await walk(page, { x: SHOVEL_AT.x - 1.2, y: SHOVEL_AT.y });
    await expect(reads(page)).toContainText("The Action: pick up spade");
    await page.keyboard.press(" ");
    await expect(reads(page)).toContainText("She holds the spade");

    // to the palm tree first, where the counting starts, then the squares counted out one by one
    await walk(page, { x: 22.5, y: 26.6 });
    await expect.poll(() => square(page)).toBe("D6");
    await expect(reads(page)).toContainText("Step 3 of 6: Walk 3 north");
    await stepTo(page, "ArrowUp", "D3");
    await stepTo(page, "ArrowRight", "H3");
    await expect(reads(page)).toContainText("Step 5 of 6: Dig");
    await page.keyboard.press(" ");
    await expect(reads(page)).toContainText("The Action: open chest");
    await page.screenshot({ path: "/tmp/treasure-chest.png" });
    await page.keyboard.press(" ");
    await expect(card(page)).toHaveAttribute("data-round-end", "won");
    expect(errors).toEqual([]);
});

test("treasure island by a finger: tap to walk to G7, tap Charlie to dig, and tap the chest open", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "one tap path is enough");
    const errors: string[] = [];
    await openGame(page, "treasure", 2, errors, "charlie");
    const g7 = middleOf(GRID, { c: 6, r: 6 });
    // the view follows her, so the first tap is near enough to be in it
    await tap(page, 30, 32);
    await page.waitForTimeout(900);
    await tap(page, g7.x, g7.y + 0.4);
    await expect.poll(() => square(page), { timeout: 8000 }).toBe("G7");
    await page.waitForTimeout(500);
    const at = await feet(page);
    await tap(page, at.x, at.y - 1.3);
    await expect(reads(page)).toContainText("The Action: open chest", { timeout: 8000 });
    await tap(page, g7.x, g7.y);
    await expect(card(page)).toHaveAttribute("data-round-end", "won");
    expect(errors).toEqual([]);
});
