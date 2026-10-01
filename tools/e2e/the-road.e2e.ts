import { expect, type Page } from "@playwright/test";
import { test } from "./steps";

const note = (page: Page) => page.locator(".game-feedback-live").first();

/** Holds a key for a while, as a child holds Go or Brake. */
async function hold(page: Page, key: string, ms: number): Promise<void> {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
}

test("the road: the keys drive to the first bay on the list and deliver its parcel", async ({
    page,
}) => {
    await page.goto("/games?g=road&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(note(page)).toContainText("Deliver to 4, then 8");
    await expect(page.locator('[data-key="list"]')).toBeVisible();
    await page.locator('[data-game="board"]').focus();
    let last = (await note(page).textContent()) ?? "";
    await hold(page, "ArrowRight", 1000);
    // each stop says how far the bay is, so the next push is sized by it, as a child would
    for (let i = 0; i < 30 && !/Delivered to 4/.test(last); i++) {
        const before = last;
        await expect
            .poll(async () => (await note(page).textContent()) ?? "", { timeout: 6000 })
            .not.toBe(before)
            .catch(() => undefined);
        last = (await note(page).textContent()) ?? "";
        if (/Delivered to 4/.test(last)) break;
        const m = /is ([\d.]+) (further on|back)/.exec(last),
            gap = m ? Number(m[1]) : 1;
        if (m?.[2] === "back") await hold(page, "ArrowLeft", 700 + gap * 150);
        else await hold(page, "ArrowRight", Math.min(600, 150 + gap * 90));
    }
    await expect(note(page)).toContainText("Delivered to 4. Next is 8.");
    await expect(page.locator('[data-key="parcel:0"]')).toBeVisible();
});

test("the road: the finish waits for the list", async ({ page }) => {
    await page.goto("/games?g=road&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await page.locator('[data-game="board"]').focus();
    await hold(page, "ArrowRight", 4500);
    await expect(note(page)).toContainText(/still on the list|Stopped past 10/, { timeout: 8000 });
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeHidden();
});
