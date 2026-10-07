import { expect, type Page } from "@playwright/test";
import { fieldPoints } from "../field";
import { test } from "../steps";
import { openGame } from "./play";
import { FIELD_AT, TRAY_Y } from "../../../school/games/knock";

const SHOTS = "/tmp";
const won = (page: Page) => page.locator('.round-end[data-round-end="won"]');

interface Seen {
    balls: { x: number; y: number }[];
    tray: { x: number; y: number } | null;
}

/** The balls and the tray in the field's squares, read off the probe at one moment. */
async function look(page: Page): Promise<Seen> {
    const f = await fieldPoints(page);
    const all = await page.locator(".field-probe [data-key]").evaluateAll((els) =>
        els.map((e) => {
            const r = e.getBoundingClientRect(),
                key = e instanceof HTMLElement ? (e.dataset.key ?? "") : "";
            return { key, x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }),
    );
    const seen: Seen = { balls: [], tray: null };
    for (const e of all) {
        const at = f.toWorld(e.x, e.y),
            local = { x: at.x - FIELD_AT.x, y: at.y - FIELD_AT.y };
        if (e.key.startsWith("ball:")) seen.balls.push(local);
        else if (e.key === "tray") seen.tray = local;
    }
    return seen;
}

/** Where the tray should go: under the lowest ball, a little to one side so the ball goes up at a slant. */
function under(seen: Seen, side: number): number | null {
    const low = seen.balls.reduce<{ x: number; y: number } | null>(
        (best, b) => (!best || b.y > best.y ? b : best),
        null,
    );
    return low ? low.x - side * 1.6 : null;
}

test("knock it down: a finger holds the tray under the ball, lets go to serve, and knocks down 8 blocks", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the mouse is held on the desktop");
    test.setTimeout(150_000);
    const errors: string[] = [];
    await openGame(page, "knock", 0, errors, "tray");
    let side = 1,
        pressed = false,
        held = 0;
    for (let i = 0; i < 4000 && !(await won(page).isVisible()); i++) {
        const seen = await look(page),
            x = under(seen, side),
            serving =
                seen.balls.length === 1 &&
                seen.tray &&
                Math.abs((seen.balls[0]?.y ?? 0) - TRAY_Y) < 0.8;
        const f = await fieldPoints(page),
            at = f.toScreen(FIELD_AT.x + (x ?? 11), FIELD_AT.y + TRAY_Y + 2.5);
        await page.mouse.move(at.x, at.y);
        if (!pressed) {
            await page.mouse.down();
            pressed = true;
        }
        // a ball resting on the tray is served by letting go
        if (serving && ++held > 6) {
            await page.mouse.up();
            pressed = false;
            held = 0;
            side = -side;
        }
        await page.waitForTimeout(25);
    }
    if (pressed) await page.mouse.up();
    await expect(won(page)).toBeVisible({ timeout: 20_000 });
    await expect(won(page)).toContainText("8 blocks");
    expect(errors).toEqual([]);
});

test("knock it down: the arrows slide the tray under the ball, space serves, and knock down 8 blocks", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the keys are played on the desktop");
    test.setTimeout(150_000);
    const errors: string[] = [];
    await openGame(page, "knock", 0, errors, "tray");
    await page.locator('[data-game="board"]').focus();
    const down = new Set<string>();
    const hold = async (keys: string[]) => {
        for (const k of down) if (!keys.includes(k)) await page.keyboard.up(k);
        for (const k of keys) if (!down.has(k)) await page.keyboard.down(k);
        down.clear();
        for (const k of keys) down.add(k);
    };
    let side = 1,
        rests = 0;
    for (let i = 0; i < 5000 && !(await won(page).isVisible()); i++) {
        const seen = await look(page),
            x = under(seen, side),
            tray = seen.tray;
        if (x === null || !tray) {
            await hold([]);
            await page.waitForTimeout(25);
            continue;
        }
        const resting = seen.balls.length === 1 && Math.abs((seen.balls[0]?.y ?? 0) - TRAY_Y) < 0.8;
        if (resting && ++rests > 6) {
            await hold([]);
            await page.keyboard.press(" ");
            rests = 0;
            side = -side;
            continue;
        }
        const e = x - tray.x;
        await hold(Math.abs(e) > 0.6 ? [e > 0 ? "ArrowRight" : "ArrowLeft"] : []);
        await page.waitForTimeout(25);
    }
    await hold([]);
    await expect(won(page)).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
});

test("knock it down: a serve with its dotted path, a piece coming down, a gift falling and the won card", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "one look on the desktop");
    test.setTimeout(150_000);
    const errors: string[] = [];
    await openGame(page, "knock", 0, errors, "tray");
    await page.locator('[data-game="board"]').focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/knock-serve.png` });
    let side = 1,
        pressed = false,
        held = 0,
        shot = 0;
    for (let i = 0; i < 4000 && !(await won(page).isVisible()); i++) {
        const seen = await look(page),
            x = under(seen, side),
            serving = seen.balls.length === 1 && Math.abs((seen.balls[0]?.y ?? 0) - TRAY_Y) < 0.8;
        const f = await fieldPoints(page),
            at = f.toScreen(FIELD_AT.x + (x ?? 11), FIELD_AT.y + TRAY_Y + 2.5);
        await page.mouse.move(at.x, at.y);
        if (!pressed) {
            await page.mouse.down();
            pressed = true;
        }
        if (serving && ++held > 6) {
            await page.mouse.up();
            pressed = false;
            held = 0;
            side = -side;
        }
        const gifts = await page.locator('.field-probe [data-key^="g"]').count();
        if (gifts > 0 && shot < 1) {
            await page.screenshot({ path: `${SHOTS}/knock-gift.png` });
            shot = 1;
        }
        if (i === 120) await page.screenshot({ path: `${SHOTS}/knock-play.png` });
        await page.waitForTimeout(25);
    }
    if (pressed) await page.mouse.up();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SHOTS}/knock-collapse.png` });
    await expect(won(page)).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/knock-won.png` });
    expect(errors).toEqual([]);
});
