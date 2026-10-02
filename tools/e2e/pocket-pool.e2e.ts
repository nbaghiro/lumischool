import { expect, type Page } from "@playwright/test";
import { test } from "./steps";
import { fieldPoints } from "./field";
import { emptyPad, type Dir } from "../../engine/motion/pad";
import { POOL_LEVELS, poolGame, startPool, type PoolState } from "../../school/games/pool";

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
function press(s: PoolState, k: Key): void {
    const n = poolGame.still.press(s);
    for (let i = 0; i < n; i++)
        poolGame.step(
            s,
            k === "space"
                ? { ...emptyPad(), tapped: i === 0, go: true }
                : { ...emptyPad(), holding: [k], held: k, pressed: i === 0 ? [k] : [] },
        );
    for (let i = 0; i < 60 * 20 && (poolGame.still.settling?.(s) ?? false); i++)
        poolGame.step(s, emptyPad());
}

/**
 * The key presses that win a level under reduced motion, found by playing each shot's presses on a
 * copy of the table: a turn of the aim a press at a time towards a ball the target needs, a change
 * of strength, and space. Returns null when no run of shots among those tried wins.
 */
function plan(s: PoolState, depth = 6): Key[] | null {
    if (s.won) return [];
    if (depth === 0) return null;
    const cue = s.balls[0];
    if (!cue) return null;
    const per = poolGame.still.press(s) / poolGame.rate;
    const turnStep = per * 1,
        powerStep = per * 6;
    const tried = new Set<string>();
    for (const b of s.balls) {
        if (b.n === 0 || b.potted) continue;
        for (const p of s.table.pockets) {
            const l = Math.hypot(p.x - b.x, p.y - b.y),
                gx = b.x - ((p.x - b.x) / l) * 1.4,
                gy = b.y - ((p.y - b.y) / l) * 1.4,
                want = Math.atan2(gy - cue.y, gx - cue.x),
                diff = Math.atan2(Math.sin(want - s.aim.angle), Math.cos(want - s.aim.angle)),
                turns = Math.round(diff / turnStep);
            for (const off of [0, -1, 1])
                for (const power of [8, 11, 14, 17, 20]) {
                    const t = turns + off,
                        m = Math.round((power - s.aim.power) / powerStep),
                        key = `${t}:${m}`;
                    if (tried.has(key)) continue;
                    tried.add(key);
                    const keys: Key[] = [
                        ...Array<Key>(Math.abs(t)).fill(t < 0 ? "left" : "right"),
                        ...Array<Key>(Math.abs(m)).fill(m < 0 ? "down" : "up"),
                        "space",
                    ];
                    const probe = structuredClone(s),
                        before = probe.potted.length;
                    for (const k of keys) press(probe, k);
                    if (!probe.won && probe.potted.length <= before) continue;
                    const rest = plan(probe, depth - 1);
                    if (rest) return [...keys, ...rest];
                }
        }
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

test("pocket pool: the first level is won from the keys alone, a press at a time", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop" && info.project.name !== "phone-webkit");
    const L = POOL_LEVELS[0];
    const keys = plan(startPool(L, 0));
    expect(keys, "a way through the first level by the keys").not.toBeNull();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=pool&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await reducedMotion(page);
    for (const k of keys ?? []) await page.keyboard.press(KEY[k]);
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible({
        timeout: 20000,
    });
    await page.screenshot({ path: `/tmp/pocket-pool-keys-${info.project.name}.png` });
    expect(errors).toEqual([]);
});

test("pocket pool: pulling back from the white ball and letting go strikes it, and the balls come to rest", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the pull is made with a mouse");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=pool&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const s = startPool(POOL_LEVELS[0], 0);
    const cue = s.balls[0],
        three = s.balls.find((b) => b.n === 3);
    if (!cue || !three) throw new Error("No white ball or 3");
    const f = await fieldPoints(page);
    const from = f.toScreen(cue.x, cue.y);
    // back from the white ball, away from the 3, four squares long
    const l = Math.hypot(three.x - cue.x, three.y - cue.y),
        to = f.toScreen(cue.x - ((three.x - cue.x) / l) * 4, cue.y - ((three.y - cue.y) / l) * 4);
    const before = await reads(page).textContent();
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    await expect(reads(page)).toContainText("rolling", { timeout: 5000 });
    await expect(reads(page)).not.toContainText("rolling", { timeout: 20000 });
    expect(await reads(page).textContent()).not.toEqual(before);
    await expect(page.locator('[data-game="aside"]').first()).not.toContainText(
        "Pull back from the white ball",
    );
    await page.screenshot({ path: `/tmp/pocket-pool-pull-${info.project.name}.png` });
    expect(errors).toEqual([]);
});
