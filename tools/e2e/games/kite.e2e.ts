import { expect, type Page } from "@playwright/test";
import { fieldPoints } from "../field";
import { test } from "../steps";

async function open(page: Page, level: number, errors: string[]): Promise<void> {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/games?g=kite&v=${level}&probe=1`);
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await expect(page.locator('.field-probe [data-key="kite"]')).toBeAttached();
}

interface Seen {
    kite: { x: number; y: number; a: number } | null;
    reel: { x: number; y: number } | null;
    balloons: { x: number; y: number }[];
}

/** The kite, the reel and the balloons in the world's squares, read off the probe at one moment, so a balloon popped meanwhile is not looked for. */
async function look(page: Page): Promise<Seen> {
    const f = await fieldPoints(page);
    const all = await page.locator(".field-probe [data-key]").evaluateAll((els) =>
        els.map((e) => {
            const r = e.getBoundingClientRect(),
                key = e instanceof HTMLElement ? (e.dataset.key ?? "") : "",
                angle = e instanceof HTMLElement ? Number(e.dataset.angle ?? 0) : 0;
            // the box is turned with the sprite, so its middle is the rotated rectangle's middle
            return { key, x: r.left + r.width / 2, y: r.top + r.height / 2, angle };
        }),
    );
    const seen: Seen = { kite: null, reel: null, balloons: [] };
    for (const e of all) {
        const at = f.toWorld(e.x, e.y);
        if (e.key === "kite") seen.kite = { ...at, a: e.angle };
        else if (e.key === "reel") seen.reel = at;
        // a balloon sprite's middle is its body's middle less 0.45 of a square, as kite.ts places it
        else if (e.key.startsWith("balloon:")) seen.balloons.push({ x: at.x, y: at.y - 0.45 });
    }
    return seen;
}

const won = (page: Page) => page.locator('.round-end[data-round-end="won"]');

const nearest = (from: { x: number; y: number }, all: { x: number; y: number }[]) =>
    all.reduce<{ x: number; y: number } | null>(
        (best, p) =>
            !best ||
            Math.hypot(p.x - from.x, p.y - from.y) < Math.hypot(best.x - from.x, best.y - from.y)
                ? p
                : best,
        null,
    );

test("kite: a finger held in the sky flies the kite to it, and four balloons win the meadow", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the mouse is held on the desktop");
    test.setTimeout(90_000);
    const errors: string[] = [];
    await open(page, 0, errors);
    const box = await page.locator(".field-gl").boundingBox();
    if (!box) throw new Error("Missing the field");
    let pressed = false;
    for (let i = 0; i < 1500 && !(await won(page).isVisible()); i++) {
        const { kite, balloons } = await look(page),
            aim = kite ? nearest(kite, balloons) : null;
        if (!aim) {
            await page.waitForTimeout(40);
            continue;
        }
        const p = (await fieldPoints(page)).toScreen(aim.x, aim.y);
        await page.mouse.move(
            Math.min(box.x + box.width - 2, Math.max(box.x + 2, p.x)),
            Math.min(box.y + box.height - 2, Math.max(box.y + 2, p.y)),
        );
        if (!pressed) {
            await page.mouse.down();
            pressed = true;
        }
        await page.waitForTimeout(40);
    }
    if (pressed) await page.mouse.up();
    await expect(won(page)).toBeVisible({ timeout: 20_000 });
    await expect(won(page)).toContainText("balloons popped");
    expect(errors).toEqual([]);
});

test("kite: the keys steer the nose at each balloon and let the line out to it, and win the meadow", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the keys are played on the desktop");
    test.setTimeout(90_000);
    const errors: string[] = [];
    await open(page, 0, errors);
    await page.locator(".field-gl").click({ position: { x: 4, y: 4 } });
    const down = new Set<string>();
    const hold = async (keys: string[]) => {
        for (const k of down) if (!keys.includes(k)) await page.keyboard.up(k);
        for (const k of keys) if (!down.has(k)) await page.keyboard.down(k);
        down.clear();
        for (const k of keys) down.add(k);
    };
    for (let i = 0; i < 1500 && !(await won(page).isVisible()); i++) {
        const { kite, reel, balloons } = await look(page),
            aim = kite ? nearest(kite, balloons) : null;
        if (!kite || !reel || !aim) {
            await hold([]);
            await page.waitForTimeout(40);
            continue;
        }
        const keys: string[] = [];
        const line = Math.hypot(kite.x - reel.x, kite.y - reel.y),
            want = Math.hypot(aim.x - reel.x, aim.y - reel.y);
        if (line < want - 0.8) keys.push("ArrowUp");
        else if (line > want + 0.8) keys.push("ArrowDown");
        const diff = Math.atan2(
            Math.sin(Math.atan2(aim.x - kite.x, -(aim.y - kite.y)) - kite.a),
            Math.cos(Math.atan2(aim.x - kite.x, -(aim.y - kite.y)) - kite.a),
        );
        if (Math.abs(diff) > 0.25) keys.push(diff > 0 ? "ArrowRight" : "ArrowLeft");
        await hold(keys);
        await page.waitForTimeout(30);
    }
    await hold([]);
    await expect(won(page)).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
});
