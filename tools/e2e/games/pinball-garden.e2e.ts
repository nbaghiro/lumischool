import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { openGame } from "./play";
import { TABLE_AT } from "../../../school/games/pinball";
import { PINBALL } from "../../../engine/parts/sport/pinballtable";

const won = (page: Page) => page.locator(".game-toolbar .game-finished");
const reads = (page: Page) => page.locator('[data-game="reads"]');

/** A place on the table, in its own squares, on the screen. */
async function onTable(page: Page, x: number, y: number) {
    const f = await fieldPoints(page);
    return f.toScreen(x + TABLE_AT.x, y + TABLE_AT.y);
}

/** Where the ball is on the table, in its own squares, from the probe's copy of the field, or null when it is not there. */
async function ballAt(page: Page): Promise<{ x: number; y: number } | null> {
    const box = await page.locator('.field-probe [data-key="ball"]').boundingBox();
    if (!box) return null;
    const f = await fieldPoints(page),
        w = f.toWorld(box.x + box.width / 2, box.y + box.height / 2);
    return { x: w.x - TABLE_AT.x, y: w.y - TABLE_AT.y };
}

/**
 * Plays the flowerbed: a firm pull and let go sends the ball round the arch and down through the
 * flowers, and a flipper swung as the ball comes down onto it keeps it in play, until three flowers
 * have been hit. `pull` and `flip` are the hands: the keys, or a finger on the field.
 */
async function flowerbed(
    page: Page,
    pull: () => Promise<void>,
    flip: (side: "left" | "right") => Promise<void>,
): Promise<void> {
    let last: { x: number; y: number } | null = null;
    const end = Date.now() + 90_000;
    while (Date.now() < end && !(await won(page).isVisible())) {
        const at = await ballAt(page);
        if (at && at.x > PINBALL.right && at.y > PINBALL.rest.y - 0.6) {
            await pull();
            last = null;
            await page.waitForTimeout(300);
            continue;
        }
        if (at && last && at.y > 27.5 && at.y > last.y) {
            await flip(at.x < PINBALL.mid ? "left" : "right");
            last = null;
            continue;
        }
        last = at;
        await page.waitForTimeout(30);
    }
    await expect(won(page)).toBeVisible({ timeout: 5_000 });
}

test("pinball garden: the keys pull the plunger, swing the flippers and hit three flowers", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the keys are played on the desktop");
    test.setTimeout(120_000);
    const errors: string[] = [];
    await openGame(page, "pinball", 0, errors, "ball");
    await page.locator('[data-game="board"]').focus();
    await flowerbed(
        page,
        async () => {
            await page.keyboard.down("ArrowDown");
            await page.waitForTimeout(650);
            await page.keyboard.up("ArrowDown");
        },
        async (side) => {
            const key = side === "left" ? "ArrowLeft" : "ArrowRight";
            await page.keyboard.down(key);
            await page.waitForTimeout(180);
            await page.keyboard.up(key);
        },
    );
    await page.screenshot({ path: `/tmp/pinball-win-${info.project.name}.png` });
    expect(errors).toEqual([]);
});

test("pinball garden: a finger draws the plunger down, holds a flipper and hits three flowers", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "a mouse plays the finger's part on the desktop");
    test.setTimeout(120_000);
    const errors: string[] = [];
    await openGame(page, "pinball", 0, errors, "ball");
    await flowerbed(
        page,
        async () => {
            const from = await onTable(page, PINBALL.rest.x, 28),
                to = await onTable(page, PINBALL.rest.x, 31.2);
            await page.mouse.move(from.x, from.y);
            await page.mouse.down();
            await page.mouse.move(to.x, to.y, { steps: 8 });
            await page.waitForTimeout(100);
            await page.mouse.up();
        },
        async (side) => {
            const at = await onTable(page, side === "left" ? 5 : 15.3, 32);
            await page.mouse.move(at.x, at.y);
            await page.mouse.down();
            await page.waitForTimeout(180);
            await page.mouse.up();
        },
    );
    expect(errors).toEqual([]);
});

test("pinball garden: pulling the plunger shows where the ball will go, and the board reads the target", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "one look on the desktop");
    const errors: string[] = [];
    await openGame(page, "pinball", 1, errors, "ball");
    await page.locator('[data-game="board"]').focus();
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `/tmp/pinball-pull-${info.project.name}.png` });
    await expect(reads(page)).toContainText("pulled back");
    await page.keyboard.up("ArrowDown");
    await expect(reads(page)).toContainText("Make exactly 10");
    expect(errors).toEqual([]);
});
