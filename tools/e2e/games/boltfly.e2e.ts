import { expect, type Page } from "@playwright/test";
import { fieldPoints } from "../field";
import { test } from "../steps";

async function open(page: Page, level: number, errors: string[]): Promise<void> {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/games?g=boltfly&v=${level}&probe=1`);
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await expect(page.locator('.field-probe [data-key="bolt"]')).toBeAttached();
}

interface Seen {
    bolt: { x: number; y: number } | null;
    stars: { x: number; y: number }[];
}

/** Bolt's middle and the stars in the world's squares, read off the probe at one moment. */
async function look(page: Page): Promise<Seen> {
    const f = await fieldPoints(page);
    const all = await page.locator(".field-probe [data-key]").evaluateAll((els) =>
        els.map((e) => {
            const r = e.getBoundingClientRect(),
                key = e instanceof HTMLElement ? (e.dataset.key ?? "") : "";
            return { key, x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }),
    );
    const seen: Seen = { bolt: null, stars: [] };
    for (const e of all) {
        const at = f.toWorld(e.x, e.y);
        if (e.key === "bolt") seen.bolt = at;
        else if (e.key.startsWith("star:")) seen.stars.push(at);
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

test("boltfly: a finger held in the sky flies Bolt to it, and four stars win the garden", async ({
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
        const { bolt, stars } = await look(page),
            aim = bolt ? nearest(bolt, stars) : null;
        if (!aim) {
            await page.waitForTimeout(40);
            continue;
        }
        // the finger goes on the star: Bolt's feet come to the finger, and its middle passes through the star
        const p = (await fieldPoints(page)).toScreen(aim.x, aim.y + 1);
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
    await expect(won(page)).toContainText("stars caught");
    expect(errors).toEqual([]);
});

test("boltfly: the keys pulse the jets and steer to each star, and win the garden", async ({
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
    let last: { x: number; y: number; t: number } | null = null;
    for (let i = 0; i < 2000 && !(await won(page).isVisible()); i++) {
        const { bolt, stars } = await look(page),
            aim = bolt ? nearest(bolt, stars) : null,
            now = Date.now();
        if (!bolt || !aim) {
            await hold([]);
            await page.waitForTimeout(40);
            continue;
        }
        const dt = last ? Math.max(0.02, (now - last.t) / 1000) : 0.05,
            vx = last ? (bolt.x - last.x) / dt : 0,
            vy = last ? (bolt.y - last.y) / dt : 0;
        last = { ...bolt, t: now };
        const keys: string[] = [];
        // hold the jets while Bolt falls faster than the climb it needs, and steer across to the star
        if (vy > Math.max(-4, Math.min(6, (aim.y - bolt.y) * 1.5))) keys.push("ArrowUp");
        const want = Math.max(-6, Math.min(6, (aim.x - bolt.x) * 1.2));
        if (vx < want - 0.6) keys.push("ArrowRight");
        else if (vx > want + 0.6) keys.push("ArrowLeft");
        await hold(keys);
        await page.waitForTimeout(30);
    }
    await hold([]);
    await expect(won(page)).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
});
