import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { openGame, reducedMotion } from "./play";
import { emptyPad, type Dir } from "../../../engine/motion/pad";
import { FEED_LEVELS, feedGame, type FeedState } from "../../../school/games/feedpup";

const SHOTS = "/tmp";
const card = (page: Page) => page.locator(".round-end");

type Key = Dir | "space";

/** One key press as the page plays it under reduced motion: its steps with the key held, then the settling. */
function press(s: FeedState, k: Key): void {
    const n = feedGame.still.press(s);
    for (let i = 0; i < n; i++)
        feedGame.step(
            s,
            k === "space"
                ? { ...emptyPad(), tapped: i === 0, go: true, keys: true }
                : { ...emptyPad(), holding: [k], held: k, pressed: i === 0 ? [k] : [] },
        );
    for (let i = 0; i < 60 * 20 && (feedGame.still.settling?.(s) ?? false); i++)
        feedGame.step(s, emptyPad());
}

/** Right presses to let the swing go on a press at a time, then space to cut, for the first level. */
function plan(): Key[] | null {
    for (let wait = 0; wait < 30; wait++) {
        const keys: Key[] = [...Array<Key>(wait).fill("right"), "space"];
        const s = feedGame.start(0);
        for (const k of keys) press(s, k);
        if (feedGame.won(s)) return keys;
    }
    return null;
}

const KEY: Record<Key, string> = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    space: "Space",
};

test("feed the pup: the first level is won from the keys alone, a press at a time", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "one keyboard win, on the desktop");
    const keys = plan();
    expect(keys, "a way through the first level by the keys").not.toBeNull();
    const errors: string[] = [];
    await openGame(page, "feedpup", 0, errors, "biscuit");
    await reducedMotion(page);
    for (const k of keys ?? []) await page.keyboard.press(KEY[k]);
    await expect(card(page)).toHaveAttribute("data-round-end", "won", { timeout: 20000 });
    await expect(card(page).locator('[data-game="end-words"]')).toContainText("Chomp");
    expect(errors).toEqual([]);
});

/** Where the biscuit is now, in the field's squares, from where the probe has it drawn. */
async function biscuit(page: Page, toWorld: (x: number, y: number) => { x: number; y: number }) {
    const box = await page.locator('.field-probe [data-key="biscuit"]').boundingBox();
    if (!box) throw new Error("No biscuit");
    return toWorld(box.x + box.width / 2, box.y + box.height / 2);
}

/** Whether the first level, with its biscuit at `at` going at `v`, is won by a cut `ahead` steps from now. */
function winsAfter(
    at: { x: number; y: number },
    v: { x: number; y: number },
    ahead: number,
): boolean {
    const s = feedGame.start(0);
    s.bob = { x: at.x, y: at.y, vx: v.x, vy: v.y };
    for (let i = 0; i < ahead; i++) feedGame.step(s, emptyPad());
    feedGame.step(s, { ...emptyPad(), go: true, tapped: true });
    for (let i = 0; i < 300 && !s.end; i++) feedGame.step(s, emptyPad());
    return s.end === "won";
}

const overlap = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
): boolean =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test("feed the pup: a tap on the rope while the dots are green cuts it, Pip catches the biscuit, and the card leaves Pip in sight", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the tap is made with a mouse");
    const errors: string[] = [];
    await openGame(page, "feedpup", 0, errors, "biscuit");
    const peg = FEED_LEVELS[0].pegs[0];
    if (!peg) throw new Error("No peg");
    let won = false;
    for (let attempt = 0; attempt < 4 && !won; attempt++) {
        // the swing starts with the child's first act, here an arrow that chooses the one rope
        await page.locator('[data-game="board"]').focus();
        await page.keyboard.press("ArrowRight");
        const { toScreen, toWorld } = await fieldPoints(page);
        // watches the swing until a cut a moment from now lands in the mouth with time to spare
        let tap: { x: number; y: number } | null = null;
        for (let i = 0; i < 300 && !tap; i++) {
            const a = await biscuit(page, toWorld),
                t0 = Date.now();
            await page.waitForTimeout(30);
            const b = await biscuit(page, toWorld),
                dt = (Date.now() - t0) / 1000;
            const v = { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
            if (winsAfter(b, v, 2) && winsAfter(b, v, 7))
                tap = { x: (peg.x + b.x) / 2, y: (peg.y + b.y) / 2 };
        }
        if (!tap) throw new Error("The dots never went green");
        if (attempt === 0) await page.screenshot({ path: `${SHOTS}/feedpup-swing.png` });
        const p = toScreen(tap.x, tap.y);
        await page.mouse.click(p.x, p.y);
        if (attempt === 0) await page.screenshot({ path: `${SHOTS}/feedpup-cut.png` });
        await page.waitForTimeout(450);
        if (attempt === 0) await page.screenshot({ path: `${SHOTS}/feedpup-catch.png` });
        await expect(card(page)).toBeVisible({ timeout: 5000 });
        won = (await card(page).getAttribute("data-round-end")) === "won";
        // the card is in after its rise, and the field has risen above it
        await page.waitForTimeout(500);
        const over = await card(page).boundingBox();
        for (const key of ["pip", "bowl"]) {
            const box = await page.locator(`.field-probe [data-key="${key}"]`).boundingBox();
            if (!box || !over) throw new Error(`No ${key} or no card`);
            expect(overlap(box, over), `the card covers ${key}`).toBe(false);
        }
        if (!won) {
            if (attempt === 0) await page.screenshot({ path: `${SHOTS}/feedpup-miss.png` });
            await card(page).locator('[data-end="again"]').click();
            await expect(card(page)).toBeHidden();
        } else await page.screenshot({ path: `${SHOTS}/feedpup-won.png` });
    }
    expect(won, "Pip never caught the biscuit").toBe(true);
    expect(errors).toEqual([]);
});

test("feed the pup: a miss bounces beside Pip and its card leaves Pip and the bowl in sight", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "one miss, on the desktop");
    const errors: string[] = [];
    await openGame(page, "feedpup", 0, errors, "biscuit");
    // space at once lets the biscuit go from where it starts, which lands beside the mouth
    await page.locator('[data-game="board"]').focus();
    await page.keyboard.press("Space");
    await expect(card(page)).toHaveAttribute("data-round-end", "not-won", { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/feedpup-miss.png` });
    const over = await card(page).boundingBox();
    for (const key of ["pip", "bowl", "biscuit"]) {
        const box = await page.locator(`.field-probe [data-key="${key}"]`).boundingBox();
        if (!box || !over) throw new Error(`No ${key} or no card`);
        expect(overlap(box, over), `the card covers ${key}`).toBe(false);
    }
    const started = Date.now();
    await card(page).locator('[data-end="again"]').click();
    await expect(card(page)).toBeHidden();
    await expect(page.locator('.field-probe [data-key="biscuit"]')).toBeAttached();
    expect(Date.now() - started, "Again took its time").toBeLessThan(1000);
    expect(errors).toEqual([]);
});
