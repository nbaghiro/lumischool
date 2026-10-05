// A phone held upright shows wide games larger: the squares are bigger than the whole view would
// allow, the field stays the room's width, and the thing in play is in view.
import { expect } from "@playwright/test";
import { test } from "../steps";

const CASES = [
    { id: "cargo-workshop", least: 12, subject: null },
    { id: "road", least: 16, subject: "car" },
    { id: "plane", least: 16, subject: "plane" },
    { id: "straight", least: 16, subject: "canoe" },
    { id: "pool", least: 13, subject: null },
    { id: "clear", least: 18, subject: null },
];

for (const c of CASES)
    test(`held upright, ${c.id} shows squares of at least ${c.least} pixels with the field inside the screen`, async ({
        page,
    }, info) => {
        test.skip(
            info.project.name !== "phone-webkit" && info.project.name !== "phone",
            "the phones are the ones held upright",
        );
        await page.goto(`/games?g=${c.id}&v=0&probe=1`);
        await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
        const field = page.locator(".field-gl");
        const sq = await field.evaluate((el) =>
            parseFloat(getComputedStyle(el).getPropertyValue("--sq")),
        );
        expect(sq).toBeGreaterThanOrEqual(c.least);
        const box = await field.boundingBox();
        if (!box) throw new Error("Missing the field");
        const width = page.viewportSize()?.width ?? 0;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
        if (c.subject) {
            const thing = await page.locator(`[data-key="${c.subject}"]`).boundingBox();
            if (!thing) throw new Error(`Missing the ${c.subject}`);
            const middle = thing.x + thing.width / 2;
            expect(middle).toBeGreaterThan(box.x);
            expect(middle).toBeLessThan(box.x + box.width);
        }
    });
