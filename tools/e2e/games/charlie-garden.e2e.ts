import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { cellMiddle } from "../../../engine/motion/garden";
import { BASKET, CAN_HOME, DIAL, GARDEN_LEVELS, packetAt } from "../../../school/games/garden";

const SHOTS = "/tmp";
const LEVEL = 0;
const reads = (page: Page) => page.locator('[data-game="reads"]');
const action = (page: Page) => page.locator(".game-player .key.big");

/** The first bed's litres, as the page reads them out. */
async function litres(page: Page): Promise<number> {
    const m = /Bed 1 has \d+ plants, \d+ ripe, with ([\d.]+) litres/.exec(
        (await reads(page).textContent()) ?? "",
    );
    return m ? Number(m[1]) : 0;
}

async function open(page: Page, errors: string[]) {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/games?g=garden&v=${LEVEL}&probe=1`);
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator('.field-probe [data-key="gardener"]')).toBeAttached();
    await page.waitForTimeout(600);
    const points = await fieldPoints(page);
    const def = GARDEN_LEVELS[LEVEL]?.beds[0];
    if (!def) throw new Error("No bed");
    const bed = { ...def, cell: 2, water: 0, today: 0 };
    return { ...points, bed };
}

/** Where Charlie's feet are, in the plot's squares, from where the probe has her drawn. */
async function feet(page: Page, toWorld: (x: number, y: number) => { x: number; y: number }) {
    const box = await page.locator('.field-probe [data-key="gardener"]').boundingBox();
    if (!box) throw new Error("No gardener");
    return toWorld(box.x + box.width / 2, box.y + box.height);
}

/** Holds the arrows towards a spot, the way a child steers her there, and lets go near it. */
async function walk(
    page: Page,
    toWorld: (x: number, y: number) => { x: number; y: number },
    to: { x: number; y: number },
    near = 0.5,
) {
    for (let i = 0; i < 80; i++) {
        const at = await feet(page, toWorld);
        const dx = to.x - at.x,
            dy = to.y - at.y;
        if (Math.hypot(dx, dy) <= near) break;
        const keys: string[] = [];
        if (Math.abs(dx) > near * 0.7) keys.push(dx > 0 ? "ArrowRight" : "ArrowLeft");
        if (Math.abs(dy) > near * 0.7) keys.push(dy > 0 ? "ArrowDown" : "ArrowUp");
        for (const k of keys) await page.keyboard.down(k);
        await page.waitForTimeout(Math.min(140, Math.max(30, Math.hypot(dx, dy) * 40)));
        for (const k of keys) await page.keyboard.up(k);
    }
    await page.waitForTimeout(200);
}

/** A quick tap of an arrow turns her to face that way. */
async function turn(page: Page, key: string) {
    await page.keyboard.press(key);
    await page.waitForTimeout(200);
}

test("charlie's garden by the keys: seeds to the bed, a row of 5 planted by walking, watered, grown and picked", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "played with a keyboard");
    const errors: string[] = [];
    const { toWorld, bed } = await open(page, errors);
    await page.locator('[data-game="board"]').focus();
    await expect(action(page)).toHaveAttribute("aria-label", "Pick up carrot seeds");
    await page.keyboard.press(" ");
    await expect(reads(page)).toContainText("Holding the carrot seeds");

    // she walks with the packet in hand to the bed's corner, and the Action starts the row
    const start = cellMiddle(bed, 0, 0),
        end = cellMiddle(bed, 4, 0);
    await walk(page, toWorld, { x: start.x, y: bed.y - 0.7 }, 0.45);
    await page.screenshot({ path: `${SHOTS}/garden-walking-seeds.png` });
    await turn(page, "ArrowDown");
    await expect(action(page)).toHaveAttribute("aria-label", "Plant");
    await page.keyboard.press(" ");
    await expect(action(page)).toHaveAttribute("aria-label", "Sow");
    await walk(page, toWorld, { x: end.x, y: bed.y - 0.7 }, 0.45);
    await page.screenshot({ path: `${SHOTS}/garden-planting.png` });
    await page.keyboard.press(" ");
    await expect(reads(page)).toContainText("Bed 1 has 5 plants");

    // the can, from beside the water butt, and Space held over the bed pours
    await walk(page, toWorld, { x: CAN_HOME.x, y: CAN_HOME.y - 2 }, 0.5);
    await turn(page, "ArrowDown");
    await expect(action(page)).toHaveAttribute("aria-label", "Pick up can");
    await page.keyboard.press(" ");
    await expect(reads(page)).toContainText("Holding the watering can");
    const mid = cellMiddle(bed, 2, 0);
    await walk(page, toWorld, { x: mid.x, y: bed.y - 0.7 }, 0.5);
    await turn(page, "ArrowDown");
    await expect(action(page)).toHaveAttribute("aria-label", "Water");
    // 5 carrots drink 1.25 litres a night, so each day the bed is given about one and a half
    for (const day of [2, 3]) {
        await page.keyboard.down(" ");
        for (let i = 0; i < 120 && (await litres(page)) < 1.5; i++) {
            if (day === 2 && i === 8)
                await page.screenshot({ path: `${SHOTS}/garden-watering.png` });
            await page.waitForTimeout(100);
        }
        await page.keyboard.up(" ");
        await page.waitForTimeout(1200);
        // N passes the night
        await page.keyboard.press("n");
        await expect(reads(page)).toContainText(`Day ${day}.`);
    }
    await expect(reads(page)).toContainText("5 ripe");

    // the basket, swapped for the can, and Space held while she walks along the row picks it
    await walk(page, toWorld, { x: BASKET.x - 2.2, y: BASKET.y }, 0.5);
    await turn(page, "ArrowRight");
    await expect(action(page)).toHaveAttribute("aria-label", "Pick up basket");
    await page.keyboard.press(" ");
    await expect(reads(page)).toContainText("Holding the basket");
    await walk(page, toWorld, { x: end.x, y: bed.y - 0.7 }, 0.5);
    await turn(page, "ArrowDown");
    await expect(action(page)).toHaveAttribute("aria-label", "Pick");
    await page.keyboard.down(" ");
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${SHOTS}/garden-picking.png` });
    await walk(page, toWorld, { x: start.x - 0.6, y: bed.y - 0.7 }, 0.5);
    await page.keyboard.up(" ");
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 15000 });
    expect(errors).toEqual([]);
});

test("charlie's garden by taps: a tap sends her to a thing, a drag plants the row, a held finger pours", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the taps are made with the desktop's mouse");
    const errors: string[] = [];
    const { toScreen, bed } = await open(page, errors);
    const tap = async (x: number, y: number) => {
        const p = toScreen(x, y);
        await page.mouse.click(p.x, p.y);
    };

    const packet = packetAt(0);
    await tap(packet.x, packet.y);
    await expect(reads(page)).toContainText("Holding the carrot seeds");

    const a = toScreen(cellMiddle(bed, 0, 0).x, cellMiddle(bed, 0, 0).y),
        b = toScreen(cellMiddle(bed, 4, 0).x, cellMiddle(bed, 4, 0).y);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 12 });
    await page.mouse.up();
    await expect(reads(page)).toContainText("Bed 1 has 5 plants");

    await tap(CAN_HOME.x, CAN_HOME.y);
    await expect(reads(page)).toContainText("Holding the watering can");
    const mid = toScreen(cellMiddle(bed, 2, 0).x, cellMiddle(bed, 2, 0).y);
    for (const day of [2, 3]) {
        await page.mouse.move(mid.x, mid.y);
        await page.mouse.down();
        for (let i = 0; i < 150 && (await litres(page)) < 1.5; i++) await page.waitForTimeout(100);
        await page.mouse.up();
        await page.waitForTimeout(1200);
        await tap(DIAL.x, DIAL.y);
        await expect(reads(page)).toContainText(`Day ${day}.`, { timeout: 8000 });
    }
    await expect(reads(page)).toContainText("5 ripe");

    await tap(BASKET.x, BASKET.y);
    await expect(reads(page)).toContainText("Holding the basket", { timeout: 8000 });
    for (let c = 0; c < 5; c++) {
        const p = cellMiddle(bed, c, 0);
        await tap(p.x, p.y);
        await page.waitForTimeout(250);
    }
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 15000 });
    expect(errors).toEqual([]);
});

test("charlie's garden opens on its first step with the arrow on the seeds, and the sundial waits for something planted", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "one check of the guide, on the desktop");
    const errors: string[] = [];
    const { toScreen } = await open(page, errors);
    await expect(reads(page)).toContainText("Day 1.");
    await expect(reads(page)).toContainText("Step 1 of 5: Get carrot seeds.");
    await expect(reads(page)).toContainText("The arrow points at the carrot seeds.");
    await expect(page.locator('.field-probe [data-key="steps:now"]')).toBeAttached();

    // a tap on the sundial with nothing planted says so, and no day passes
    const dial = toScreen(DIAL.x, DIAL.y);
    await page.mouse.click(dial.x, dial.y);
    await expect(page.locator(".game-feedback-live")).toContainText("Plant something first", {
        timeout: 8000,
    });
    await page.waitForTimeout(400);
    await expect(reads(page)).toContainText("Day 1.");
    await expect(reads(page)).not.toContainText("Day 2.");
    expect(errors).toEqual([]);
});
