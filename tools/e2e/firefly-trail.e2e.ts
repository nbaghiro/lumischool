import { expect, type Page } from "@playwright/test";
import { test } from "./steps";
import { countOf, start } from "../../school/games/snake";

async function tapAt(page: Page, x: number, y: number, touch: boolean): Promise<void> {
    if (touch) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
}

test("Firefly trail: a tap on each seed of the count in turn flies the trail to the end", async ({
    page,
}, info) => {
    test.setTimeout(180_000);
    const touch = info.project.name.startsWith("phone");
    await page.goto("/games?g=snake&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    // the first play is the authored layout, so the spot of each number is known before it is tapped
    const s = start(0, 1);
    const field = await page.locator(".game-field").boundingBox();
    if (!field) throw new Error("Missing the field");
    for (const n of countOf(s.L)) {
        const seed = page.locator(`[data-key="seed:${s.layout.indexOf(n)}"]`);
        for (let tries = 0; tries < 40 && (await seed.count()) > 0; tries++) {
            const box = await seed.boundingBox();
            if (!box) break;
            const cx = box.x + box.width / 2,
                cy = box.y + box.height / 2;
            const inside =
                cx > field.x + 20 &&
                cx < field.x + field.width - 20 &&
                cy > field.y + 20 &&
                cy < field.y + field.height - 20;
            // a seed out of sight is reached by tapping the edge of the field nearest it first
            await tapAt(
                page,
                Math.max(field.x + 30, Math.min(field.x + field.width - 30, cx)),
                Math.max(field.y + 30, Math.min(field.y + field.height - 30, cy)),
                touch,
            );
            await page.waitForTimeout(inside ? 1500 : 900);
        }
        await expect(seed).toHaveCount(0);
    }
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible({
        timeout: 15_000,
    });
});

test("Firefly trail: the keys fly it as before, turning with the arrows and hurrying with space", async ({
    page,
}) => {
    await page.goto("/games?g=snake&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const fly = page.locator('[data-key="head"]');
    const before = await fly.boundingBox();
    if (!before) throw new Error("Missing the firefly");
    await page.keyboard.down(" ");
    await page.waitForTimeout(600);
    await page.keyboard.up(" ");
    await expect
        .poll(async () => ((await fly.boundingBox())?.x ?? before.x) > before.x + 10)
        .toBe(true);
    const flying = await fly.boundingBox();
    if (!flying) throw new Error("Missing the firefly");
    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(900);
    await page.keyboard.up("ArrowLeft");
    await expect
        .poll(async () => ((await fly.boundingBox())?.y ?? flying.y) < flying.y - 10)
        .toBe(true);
});
