import { expect, type Page } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { emptyPad, type Dir } from "../../../engine/motion/pad";
import {
    CURL_LEVELS,
    POND,
    THROW,
    curlingGame,
    sheetOf,
    startCurl,
    type CurlState,
} from "../../../school/games/curling";
import { speedFor } from "../../../engine/motion/ice";

const reads = (page: Page) => page.locator('[data-game="reads"]');

async function reducedMotion(page: Page): Promise<void> {
    await page.getByRole("button", { name: "Pause & help" }).click();
    await page.getByText("Sound & accessibility", { exact: true }).click();
    await page.getByLabel("Reduced motion").check();
    await page.getByRole("button", { name: "Continue playing" }).click();
    await page.locator('[data-game="board"]').focus();
}

type Key = Dir | "space";

/** One key press as the page plays it under reduced motion: its steps with the key held, then the settling with nothing held. */
function press(s: CurlState, k: Key): void {
    const n = curlingGame.still.press(s);
    for (let i = 0; i < n; i++)
        curlingGame.step(
            s,
            k === "space"
                ? { ...emptyPad(), tapped: i === 0, go: true }
                : { ...emptyPad(), holding: [k], held: k, pressed: i === 0 ? [k] : [] },
        );
    for (let i = 0; i < 60 * 40 && (curlingGame.still.settling?.(s) ?? false); i++)
        curlingGame.step(s, emptyPad());
}

/** The presses that win the first level from the keys alone: a little weight added a press at a time, a turn of the line, and space. */
function plan(): Key[] | null {
    const L = CURL_LEVELS[0];
    const per = curlingGame.still.press(startCurl(L)) / curlingGame.rate;
    const want = speedFor(POND.tee - POND.hack, sheetOf(L));
    const start = startCurl(L).aim.power;
    const near = Math.round((want - start) / (per * THROW.ramp));
    for (const dm of [0, -1, 1, -2, 2, -3, 3, -4, 4])
        for (const t of [0, -1, 1, -2, 2]) {
            const keys: Key[] = [
                ...Array<Key>(Math.abs(t)).fill(t < 0 ? "up" : "down"),
                ...Array<Key>(Math.max(0, near + dm)).fill("right"),
                "space",
            ];
            const s = startCurl(L);
            for (const k of keys) press(s, k);
            if (curlingGame.won(s)) return keys;
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

test("curling: the first level is won from the keys alone, a press at a time", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop" && info.project.name !== "phone-webkit");
    const keys = plan();
    expect(keys, "a way through the first level by the keys").not.toBeNull();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=curling&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await reducedMotion(page);
    for (const k of keys ?? []) await page.keyboard.press(KEY[k]);
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: `/tmp/curling-keys-${info.project.name}.png` });
    expect(errors).toEqual([]);
});

test("curling: pulling the stone back and letting go throws it, holding the ice sweeps it, and it stops in the house", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the pull and the sweep are made with a mouse");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=curling&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await page.waitForTimeout(1500);
    const f = await fieldPoints(page);
    const from = f.toScreen(POND.hack, POND.mid);
    // pulled straight back far enough to slide just short of the button, so a moment's sweeping carries it in
    const len = 9.6 / THROW.per,
        to = f.toScreen(POND.hack - len, POND.mid);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    await expect(reads(page)).toContainText("gliding", { timeout: 5000 });
    const field = await page.locator(".field-gl").boundingBox();
    if (!field) throw new Error("No field");
    await page.waitForTimeout(3000);
    await page.mouse.move(field.x + field.width / 2, field.y + field.height / 2);
    await page.mouse.down();
    for (let i = 0; i < 8; i++)
        await page.mouse.move(
            field.x + field.width / 2 + (i % 2 ? 40 : -40),
            field.y + field.height / 2,
            { steps: 3 },
        );
    await expect(reads(page)).toContainText("Sweeping", { timeout: 3000 });
    await page.mouse.up();
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: `/tmp/curling-pull-${info.project.name}.png` });
    expect(errors).toEqual([]);
});
