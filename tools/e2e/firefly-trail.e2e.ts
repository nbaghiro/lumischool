import { expect } from "@playwright/test";
import { test } from "./steps";
import { countOf, start } from "../../school/games/snake";

test("Firefly trail: a finger held on each seed in turn flies the count to the end", async ({
    page,
}, info) => {
    test.skip(info.project.name.startsWith("phone"), "the finger is a mouse here");
    test.setTimeout(180_000);
    await page.goto("/games?g=snake&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    // the first play is the authored layout, so the spot of each number is known before it is flown
    const s = start(0, 1);
    const field = await page.locator(".field").boundingBox();
    if (!field) throw new Error("Missing the field");
    // the finger stays down and moves to each seed in turn, as a child's would
    await page.mouse.move(field.x + field.width / 2, field.y + field.height / 2);
    await page.mouse.down();
    for (const n of countOf(s.L)) {
        const spot = s.layout.indexOf(n),
            seed = page.locator(`[data-key="seed:${spot}"]`);
        for (let tries = 0; tries < 200 && (await seed.count()) > 0; tries++) {
            const box = await seed.boundingBox();
            if (!box) break;
            // a seed out of sight is flown towards by holding the finger at the field's edge nearest it
            const x = Math.max(
                    field.x + 30,
                    Math.min(field.x + field.width - 30, box.x + box.width / 2),
                ),
                y = Math.max(
                    field.y + 30,
                    Math.min(field.y + field.height - 30, box.y + box.height / 2),
                );
            await page.mouse.move(x, y, { steps: 3 });
            await page.waitForTimeout(150);
        }
        await expect(seed).toHaveCount(0);
    }
    await page.mouse.up();
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible({
        timeout: 15_000,
    });
    await page.screenshot({ path: `/tmp/firefly-trail-${info.project.name}.png` });
});
