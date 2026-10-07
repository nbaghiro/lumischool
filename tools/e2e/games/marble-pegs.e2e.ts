import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { openGame, reducedMotion } from "./play";
import { emptyPad, type Dir } from "../../../engine/motion/pad";
import { FIELD_AT, LAUNCHER, NOTCH, pegsGame, type PegState } from "../../../school/games/pegs";
import { pegPlan } from "../../../school/games/pegs-challenges";

const SHOTS = "/tmp";
const card = (page: Page) => page.locator(".round-end");

type Key = Dir | "space";

/** One key press as the page plays it under reduced motion: its steps with the key held, then the settling. */
function press(s: PegState, k: Key): void {
    const n = pegsGame.still.press(s);
    for (let i = 0; i < n; i++)
        pegsGame.step(
            s,
            k === "space"
                ? { ...emptyPad(), tapped: i === 0, go: true, keys: true }
                : { ...emptyPad(), holding: [k], held: k, pressed: i === 0 ? [k] : [] },
        );
    for (let i = 0; i < 60 * 30 && (pegsGame.still.settling?.(s) ?? false); i++)
        pegsGame.step(s, emptyPad());
}

/** The keys of a win of the first level as the page plays them under reduced motion: a press a notch, and space for each marble. */
function keysWin(): Key[] {
    const plan = pegPlan(pegsGame.start(0)) ?? [];
    const keys: Key[] = [];
    let aim = 0;
    for (const a of plan) {
        keys.push(...Array<Key>(Math.abs(a - aim)).fill(a > aim ? "left" : "right"), "space");
        aim = a;
    }
    const s = pegsGame.start(0);
    for (const k of keys) press(s, k);
    if (!pegsGame.won(s)) throw new Error("the planned keys do not win the first level");
    return keys;
}

const KEY: Record<Key, string> = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    space: " ",
};

/** A point `far` squares from the launcher along an aim, on the screen. */
async function along(page: Page, aim: number, far: number) {
    const f = await fieldPoints(page),
        a = Math.PI / 2 + aim * NOTCH;
    return f.toScreen(
        FIELD_AT.x + LAUNCHER.x + Math.cos(a) * far,
        FIELD_AT.y + LAUNCHER.y + Math.sin(a) * far,
    );
}

test("marble pegs: a finger drags the aim, lets go to fire, and lights pegs to 10 on the garden fence", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "a mouse plays the finger's part on the desktop");
    test.setTimeout(120_000);
    const errors: string[] = [];
    await openGame(page, "pegs", 0, errors, "launcher");
    const aims = [-40, 60, -100, 20, 120];
    for (const aim of aims) {
        if (await card(page).isVisible()) break;
        const from = await along(page, 0, 6),
            to = await along(page, aim, 8);
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 10 });
        await page.waitForTimeout(150);
        await page.mouse.up();
        // the shot, the pops and the next marble loading
        await expect
            .poll(
                async () =>
                    (await card(page).isVisible()) ||
                    (await page.locator('.field-probe [data-key="ball"]').count()) > 0,
                {
                    timeout: 20_000,
                },
            )
            .toBe(true);
        await page.waitForTimeout(400);
        for (let i = 0; i < 40 && !(await card(page).isVisible()); i++) {
            const flying = await page.locator('[data-game="reads"]').textContent();
            if (flying?.includes("launcher points")) break;
            await page.waitForTimeout(250);
        }
    }
    await expect(card(page)).toHaveAttribute("data-round-end", "won", { timeout: 20_000 });
    expect(errors).toEqual([]);
});

test("marble pegs: the arrows turn the launcher a notch a press, and space fires a winning round", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the keys are played on the desktop");
    test.setTimeout(120_000);
    const keys = keysWin();
    const errors: string[] = [];
    await openGame(page, "pegs", 0, errors, "launcher");
    await reducedMotion(page);
    for (const k of keys) await page.keyboard.press(KEY[k]);
    await expect(card(page)).toHaveAttribute("data-round-end", "won", { timeout: 10_000 });
    await expect(card(page).locator('[data-game="end-words"]')).toContainText("10");
    expect(errors).toEqual([]);
});

test("marble pegs: the aim's dots, a marble among lit pegs, the pops and the fever", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "one look on the desktop");
    test.setTimeout(60_000);
    const errors: string[] = [];
    await openGame(page, "pegs", 0, errors, "launcher");
    await expect(page.locator('[data-game="reads"]')).toContainText("Make 10 or more");
    const plan = pegPlan(pegsGame.start(0)) ?? [0];
    const aim = plan[0] ?? 0;
    // the page steps a game once it has been played, so a key starts it before the mouse rests on the aim
    await page.locator('[data-game="board"]').focus();
    await page.keyboard.press("ArrowLeft");
    const at = await along(page, aim, 7);
    await page.mouse.move(at.x - 20, at.y - 20);
    await page.mouse.move(at.x, at.y, { steps: 6 });
    await page.waitForTimeout(500);
    await expect(page.locator('[data-game="reads"]')).toContainText("degrees to the");
    await page.screenshot({ path: `${SHOTS}/pegs-aim.png` });
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/pegs-bounce.png` });
    // the winning shot closes in on the marble as it nears the last peg
    const zoom = async () =>
        Number((await page.locator(".field-gl").getAttribute("data-camera"))?.split(",")[2] ?? 1);
    await expect.poll(zoom, { timeout: 10_000, intervals: [50] }).toBeGreaterThan(1.4);
    await page.screenshot({ path: `${SHOTS}/pegs-fever.png` });
    await expect(page.locator('[data-game="reads"]')).toContainText("popping", { timeout: 10_000 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${SHOTS}/pegs-pop.png` });
    await expect(card(page)).toHaveAttribute("data-round-end", "won", { timeout: 15_000 });
    await page.screenshot({ path: `${SHOTS}/pegs-won.png` });
    expect(errors).toEqual([]);
});
