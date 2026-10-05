import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { PLOT, SHOP_ITEMS } from "../../../school/games/dollhouse";
import { ROOM_FLOOR } from "../../../engine/parts/home/dollroom";

const SHOTS = "/tmp";

/** The middle of a sprite on the screen, from the probe's copy of its box. */
async function middle(page: Page, key: string): Promise<{ x: number; y: number }> {
    const box = await page.locator(`.field-probe [data-key="${key}"]`).boundingBox();
    if (!box) throw new Error(`No ${key} on the field`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Drags from a sprite to a place in the world with the mouse, as a finger would, and can stop before letting go. */
async function drag(
    page: Page,
    from: string,
    to: { x: number; y: number },
    held?: () => Promise<void>,
) {
    const a = await middle(page, from);
    const { toScreen } = await fieldPoints(page);
    const b = toScreen(to.x, to.y);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 16 });
    await page.waitForTimeout(150);
    await held?.();
    await page.mouse.up();
    await page.waitForTimeout(250);
}

async function click(page: Page, at: { x: number; y: number }) {
    await page.mouse.click(at.x, at.y);
    // the view eases into a room or back out over about half a second
    await page.waitForTimeout(900);
}

const chip = (kind: string) =>
    `chip:${SHOP_ITEMS.findIndex((i) => i.what === "thing" && i.kind === kind)}`;

const reads = (page: Page) => page.locator('[data-game="reads"]');

test("charlie's dollhouse: a bedroom dropped in its slot, then decorated from inside, finishes the first job", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "dragging is checked with the desktop's mouse");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=dollhouse&v=1&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(reads(page)).toContainText("Building");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/dollhouse-shell.png` });
    // the job's slot is at the shell's column 8, and a room held over it glows there
    const slot = { x: PLOT.x0 + 10, y: PLOT.ground - 1.5 };
    await drag(page, "tray:bedroom", slot, async () => {
        await expect(page.locator('.field-probe [data-key^="glow:slot"]').first()).toBeAttached();
        await page.screenshot({ path: `${SHOTS}/dollhouse-build.png` });
    });
    await expect(reads(page)).toContainText("Bedroom, 12 squares");
    const sw = await page.locator('.field-probe [data-key="switch"]').boundingBox();
    if (!sw) throw new Error("No switch");
    await click(page, { x: sw.x + sw.width * 0.72, y: sw.y + sw.height / 2 });
    await expect(reads(page)).toContainText("Decorating.");
    await page.screenshot({ path: `${SHOTS}/dollhouse-decorate.png` });
    // a tap near the room's ceiling looks inside it
    const { toScreen } = await fieldPoints(page);
    await click(page, toScreen(PLOT.x0 + 10, PLOT.ground - 2.75));
    await expect(reads(page)).toContainText("Decorating the bedroom");
    await expect(page.locator('.field-probe [data-key="back"]')).toBeAttached();
    const floor = PLOT.ground - ROOM_FLOOR;
    await drag(page, chip("bed"), { x: PLOT.x0 + 9.2, y: floor - 0.6 }, async () => {
        await expect(page.locator('.field-probe [data-key^="glow:room"]').first()).toBeAttached();
        await expect(page.locator('.field-probe [data-key="ghost"]')).toBeAttached();
    });
    await expect(reads(page)).toContainText("with bed");
    await click(page, await middle(page, "tab:walls"));
    await drag(page, chip("picture"), { x: PLOT.x0 + 11, y: PLOT.ground - 2.4 });
    await page.screenshot({ path: `${SHOTS}/dollhouse-room.png` });
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 15000 });
    await click(page, await middle(page, "back"));
    await expect(reads(page)).toContainText("Decorating.");
    expect(errors).toEqual([]);
});

test("charlie's dollhouse: a free build is kept, and is there again when the page comes back", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "dragging is checked with the desktop's mouse");
    await page.goto("/games?g=dollhouse&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await drag(page, "tray:kitchen", { x: PLOT.x0 + 8, y: PLOT.ground - 1.5 });
    await expect(reads(page)).toContainText("Kitchen, 12 squares");
    await page.reload();
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(reads(page)).toContainText("Kitchen, 12 squares");
    await page.keyboard.press("n");
    await expect(reads(page)).toContainText("The shell is empty");
});

test("charlie's dollhouse: the keys build and decorate the first job", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the keys are checked on the desktop");
    await page.goto("/games?g=dollhouse&v=1&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await page.locator('[data-game="board"]').focus();
    // a step reads one press of the big button, so each waits for the next
    const press = async (key: string, times = 1) => {
        for (let i = 0; i < times; i++) {
            await page.keyboard.press(key);
            await page.waitForTimeout(120);
        }
    };
    // the highlight starts on the bedroom card, which goes down in the shell's slot
    await press("Enter", 2);
    await expect(reads(page)).toContainText("Bedroom, 12 squares");
    // D decorates and Z looks into the room, its drawer open on the Sleep tab with the bed first
    await press("d");
    await press("z");
    await expect(reads(page)).toContainText("Decorating the bedroom");
    await press("ArrowRight", 6);
    await press("Enter", 2);
    await expect(reads(page)).toContainText("with bed");
    // back two to the Walls tab, then on two to the picture
    await press("ArrowLeft", 2);
    await press("Enter");
    await press("ArrowRight", 2);
    await press("Enter", 2);
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 15000 });
});

test("charlie's dollhouse: a free build runs past the old right edge, the view follows, and the wheel pans back", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the mouse and the wheel are checked on desktop");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=dollhouse&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await page.waitForTimeout(400);
    const ground = PLOT.ground - 1.5;
    // the right end of the row in world squares, read from the probe's room boxes
    const rightEnd = async () => {
        const { toWorld } = await fieldPoints(page);
        let end = PLOT.x0 + 6;
        for (const box of await page.locator('.field-probe [data-key^="room:"]').all()) {
            const b = await box.boundingBox();
            if (b) end = Math.max(end, toWorld(b.x + b.width, b.y).x);
        }
        return end;
    };
    for (let n = 0; n < 7; n++) {
        await drag(page, "tray:living", { x: (await rightEnd()) + 2, y: ground });
        // the view eases after the new room
        await page.waitForTimeout(900);
    }
    expect(await rightEnd(), "the row reaches past the old 20-square plot").toBeGreaterThan(
        PLOT.x0 + PLOT.cols + 4,
    );
    const field = await page.locator(".field-gl").boundingBox();
    if (!field) throw new Error("No field");
    const end = (await fieldPoints(page)).toScreen(await rightEnd(), ground).x;
    expect(end, "the newest room is in view").toBeLessThanOrEqual(field.x + field.width + 1);
    await page.screenshot({ path: `${SHOTS}/dollhouse-long.png` });
    await page.mouse.move(field.x + field.width / 2, field.y + field.height * 0.3);
    const before = await fieldPoints(page);
    await page.mouse.wheel(-900, 0);
    await page.waitForTimeout(900);
    const after = await fieldPoints(page);
    expect(
        after.toScreen(PLOT.x0, ground).x,
        "the wheel moved the view back along the house",
    ).toBeGreaterThan(before.toScreen(PLOT.x0, ground).x + 40);
    expect(errors).toEqual([]);
});
