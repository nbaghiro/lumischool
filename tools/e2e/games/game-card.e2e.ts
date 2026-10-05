import { expect, type Locator, type Page } from "@playwright/test";
import { test } from "../steps";

/** Three game cards on one page, from tools/e2e/games/game-card-harness.tsx. */
async function cards(page: Page): Promise<Locator> {
    await page.goto("/games?probe=1");
    await page.addScriptTag({ type: "module", url: "/tools/e2e/games/game-card-harness.tsx" });
    const all = page.locator("#card-harness section.gc");
    await expect(all).toHaveCount(3);
    for (let i = 0; i < 3; i++)
        await expect(all.nth(i)).toHaveAttribute("data-card-ready", "true", { timeout: 15_000 });
    return all;
}

test("cards show a still picture until played, and only one card on a page is live", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "one page of cards, on the desktop's Chrome");
    const all = await cards(page);
    for (let i = 0; i < 3; i++) {
        await expect(all.nth(i)).toHaveAttribute("data-card-state", "poster");
        await expect(all.nth(i).locator(".field-gl")).toHaveCount(0);
    }
    await all.nth(0).locator('[data-card="play"]').click();
    await expect(all.nth(0)).toHaveAttribute("data-card-state", "live");
    await expect(all.nth(0).locator(".field-gl canvas")).toBeVisible();
    await all.nth(1).locator('[data-card="play"]').click();
    await expect(all.nth(1)).toHaveAttribute("data-card-state", "live");
    await expect(all.nth(0)).toHaveAttribute("data-card-state", "poster");
    await expect(all.nth(0).locator(".field-gl")).toHaveCount(0);
    await expect(page.locator("#card-harness .field-gl")).toHaveCount(1);
    // a turn game's card shows its tray, an action game played from the field shows no buttons
    await expect(all.nth(2).locator(".gc-hands")).toBeVisible();
    await expect(all.nth(1).locator(".gc-hands")).toBeHidden();
});

test("a round won on the field reports one result, and Enter plays a focused card", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "one page of cards, on the desktop's Chrome");
    const all = await cards(page);
    const golf = all.nth(1);
    await golf.locator('[data-card="play"]').focus();
    await page.keyboard.press("Enter");
    await expect(golf).toHaveAttribute("data-card-state", "live");
    await expect(golf).toHaveAttribute("data-card-ready", "true", { timeout: 15_000 });
    const probe = golf.locator(".field-probe");
    const camera = (await probe.getAttribute("data-camera")) ?? "";
    const [cx, cy, k] = camera.split(" ").map(Number);
    const box = await golf.locator(".field-gl").boundingBox();
    if (!box || cx === undefined || cy === undefined || !k) throw new Error("No field camera");
    const at = (x: number, y: number) => ({
        x: box.x + box.width / 2 + (x - cx) * k,
        y: box.y + box.height / 2 + (y - cy) * k,
    });
    const from = at(8, 13),
        to = at(8 - Math.sqrt(15), 13);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    await expect(golf).toHaveAttribute("data-card-state", "won", { timeout: 15_000 });
    const end = golf.locator('[data-round-end="won"]');
    await expect(end).toBeVisible();
    await expect(end.locator('[data-end="again"]')).toBeVisible();
    const results = async (): Promise<unknown> => {
        const read: unknown = JSON.parse(
            (await page.locator("#card-results").textContent()) ?? "[]",
        );
        return read;
    };
    await expect.poll(results).toMatchObject([{ game: "golf", won: true, tries: 1 }]);
    // a won round is reported once, however long the card then stays won
    await page.waitForTimeout(500);
    const after = await results();
    expect(Array.isArray(after) ? after.length : 0).toBe(1);
});
