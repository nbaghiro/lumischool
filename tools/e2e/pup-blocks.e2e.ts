import { expect, type Page } from "@playwright/test";
import { test } from "./steps";
import { blocksGame } from "../../school/games/blocks";
import { planFor } from "../../school/games/blocks-challenges";

/** Page pixels from the world's squares, and back, through the camera the probe mirror publishes. */
async function camera(page: Page) {
    const probe = page.locator(".field-probe");
    const box = await probe.boundingBox();
    const cam = (await probe.getAttribute("data-camera"))?.split(" ").map(Number) ?? [];
    const [cx = 0, cy = 0, sq = 1] = cam;
    if (!box) throw new Error("Missing the probe mirror");
    return {
        toPage: (x: number, y: number) => ({
            x: box.x + box.width / 2 + (x - cx) * sq,
            y: box.y + box.height / 2 + (y - cy) * sq,
        }),
        toWorld: (px: number) => cx + (px - box.x - box.width / 2) / sq,
        /** A height in the sky over the site, inside the field whatever size it is drawn at. */
        sky: cy - 3,
        sq,
    };
}

/** Where the hanging block's middle is across, in squares, while it hangs. */
async function hangingAt(page: Page, key: string): Promise<number> {
    const b = await page.locator(`[data-key="${key}"]`).boundingBox();
    if (!b) throw new Error(`Missing ${key}`);
    return (await camera(page)).toWorld(b.x + b.width / 2);
}

/** Waits until the hanging block hangs still over `x`, give or take `near` squares. */
async function steadyOver(page: Page, key: string, x: number, near: number): Promise<void> {
    let last = Number.NaN;
    await expect
        .poll(
            async () => {
                const now = await hangingAt(page, key);
                const still = Math.abs(now - last) < 0.02 && Math.abs(now - x) < near;
                last = now;
                return still;
            },
            { timeout: 20_000, intervals: [150] },
        )
        .toBe(true);
}

test("A home for the pups: a finger drives the crane, and Dot's room stands to the wolf", async ({
    page,
}, info) => {
    test.skip(info.project.name.startsWith("phone"), "the crane is driven with a mouse here");
    await page.goto("/games?g=blocks&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const plan = planFor(blocksGame.start(0).L);
    for (const [i, d] of plan.entries()) {
        const cam = await camera(page);
        const at = cam.toPage(d.x, cam.sky);
        await page.mouse.move(at.x, at.y);
        await page.mouse.down();
        await steadyOver(page, `block:${i}`, d.x, 0.08);
        await page.mouse.up();
        await page.waitForTimeout(1_000);
    }
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible({
        timeout: 30_000,
    });
    await page.screenshot({ path: `/tmp/pup-blocks-${info.project.name}.png` });
});

test("A home for the pups is built with the keys alone", async ({ page }, info) => {
    test.skip(
        info.project.name.startsWith("phone"),
        "a phone draws a square too small to read the crane to a tenth of one, and has no keys",
    );
    await page.goto("/games?g=blocks&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const plan = planFor(blocksGame.start(0).L);
    for (const [i, d] of plan.entries()) {
        const key = `block:${i}`;
        await expect(page.locator(`[data-key="${key}"]`)).toBeVisible({ timeout: 5_000 });
        // long holds to cross the site, then taps too short for the crane to get going, to line it up
        for (let tries = 0; tries < 40; tries++) {
            await steadyOver(page, key, d.x, 99);
            const gap = d.x - (await hangingAt(page, key));
            if (Math.abs(gap) < 0.15) break;
            const arrow = gap > 0 ? "ArrowRight" : "ArrowLeft";
            await page.keyboard.down(arrow);
            await page.waitForTimeout(
                Math.abs(gap) > 0.6 ? Math.min(900, Math.abs(gap) * 200) : 20,
            );
            await page.keyboard.up(arrow);
        }
        await steadyOver(page, key, d.x, 0.25);
        await page.keyboard.press(" ");
        await page.waitForTimeout(1_000);
    }
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible({
        timeout: 30_000,
    });
});
