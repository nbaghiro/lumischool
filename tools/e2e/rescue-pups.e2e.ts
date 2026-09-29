import { expect, type Page } from "@playwright/test";
import { test } from "./steps";
import { fieldPoints } from "./field";
import { emptyPad, type Dir } from "../../engine/motion/pad";
import { RESCUE_LEVELS, rescueGame, startLevel, type RescueState } from "../../school/games/rescue";

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
function press(s: RescueState, k: Key): void {
    const n = rescueGame.still.press(s);
    for (let i = 0; i < n; i++)
        rescueGame.step(
            s,
            k === "space"
                ? { ...emptyPad(), tapped: i === 0, go: true }
                : { ...emptyPad(), holding: [k], held: k, pressed: i === 0 ? [k] : [] },
        );
    for (let i = 0; i < 60 * 20 && (rescueGame.still.settling?.(s) ?? false); i++)
        rescueGame.step(s, emptyPad());
}

/**
 * The key presses that put out the first level's fires under reduced motion, found by playing them
 * on a copy: a few presses of the aim and the pressure towards a fire, then space until it is out.
 */
function plan(s: RescueState, depth = 4): Key[] | null {
    if (s.won) return [];
    if (depth === 0) return null;
    const st = s.st;
    if (st.kind !== "fire") return null;
    const target = st.fires.findIndex((f) => f.need > 0);
    for (let a = -2; a <= 6; a++)
        for (let m = -6; m <= 6; m++) {
            const keys: Key[] = [
                ...Array<Key>(Math.abs(a)).fill(a < 0 ? "down" : "up"),
                ...Array<Key>(Math.abs(m)).fill(m < 0 ? "left" : "right"),
            ];
            const probe = structuredClone(s);
            for (const k of keys) press(probe, k);
            const pst = probe.st;
            if (pst.kind !== "fire") continue;
            for (let i = 0; i < 12 && !probe.won && (pst.fires[target]?.need ?? 0) > 0; i++) {
                press(probe, "space");
                keys.push("space");
            }
            if (!probe.won && (pst.fires[target]?.need ?? 1) > 0) continue;
            const rest = plan(probe, depth - 1);
            if (rest) return [...keys, ...rest];
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

test("rescue pups: the cottage fire is put out from the keys alone, a press at a time", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop" && info.project.name !== "phone-webkit");
    const s = startLevel(RESCUE_LEVELS[0], 0);
    // the first press sends Rufus to the truck, and is played as the page plays it
    press(s, "left");
    const keys = plan(s);
    expect(keys, "a way through the first level by the keys").not.toBeNull();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=rescue&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await reducedMotion(page);
    await page.keyboard.press("ArrowLeft");
    for (const k of keys ?? []) await page.keyboard.press(KEY[k]);
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible({
        timeout: 20000,
    });
    await page.screenshot({ path: `/tmp/rescue-pups-keys-${info.project.name}.png` });
    expect(errors).toEqual([]);
});

test("rescue pups: a finger held on the fire sprays the hose at it, and the tank runs down", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the hose is held with a mouse");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=rescue&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const fire = RESCUE_LEVELS[0].stages[0];
    if (fire.kind !== "fire") throw new Error("The first level is a fire");
    const f = await fieldPoints(page);
    const at = f.toScreen(fire.fires[0]?.x ?? 25, (fire.fires[0]?.y ?? 16) - 5);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await expect(reads(page)).toContainText("aims the hose", { timeout: 8000 });
    await expect(reads(page)).not.toContainText("20 litres are in the tank", { timeout: 8000 });
    await page.mouse.up();
    await page.screenshot({ path: `/tmp/rescue-pups-hose-${info.project.name}.png` });
    expect(errors).toEqual([]);
});

test("rescue pups: the helicopter follows a held finger and lets its rope down", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the helicopter is flown with a mouse");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=rescue&v=1&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const f = await fieldPoints(page);
    const start = f.toScreen(20, 12);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await expect(reads(page)).toContainText("flies the helicopter", { timeout: 8000 });
    await expect(reads(page)).not.toContainText("with 1 metres of rope out", { timeout: 8000 });
    await page.mouse.up();
    expect(errors).toEqual([]);
});
