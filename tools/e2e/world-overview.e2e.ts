import { expect } from "@playwright/test";
import { signInAs, test } from "./steps";

test("a distant lesson roll shows complete day cards and opens a day again", async ({
    page,
}, info) => {
    await signInAs(page);
    await page.goto("/map?world=mountains");
    const host = page.locator(".wd-host");
    await expect(page.locator(".rd-neighbours")).toBeVisible({ timeout: 60_000 });
    await expect
        .poll(
            () =>
                host.locator(".rd-read").evaluateAll((els) =>
                    els.some((el) => {
                        const r = el.getBoundingClientRect();
                        return r.top > 100 && r.top < innerHeight * 0.6;
                    }),
                ),
            { timeout: 60_000 },
        )
        .toBe(true);
    const box = await host.boundingBox();
    if (!box) throw new Error("Missing world viewport");
    for (let i = 0; i < 6; i++) {
        if ((await host.locator(".world").getAttribute("data-level")) === "days") break;
        const before = await host.locator(".world").evaluate((el) => el.style.transform);
        await host.dispatchEvent("wheel", {
            ctrlKey: true,
            deltaY: 40,
            clientX: box.x + box.width / 2,
            clientY: box.y + box.height / 2,
        });
        await expect
            .poll(() => host.locator(".world").evaluate((el) => el.style.transform))
            .not.toBe(before);
    }
    await expect(host.locator(".world")).toHaveAttribute("data-level", "days");
    const cards = host.locator(".wd-day-card");
    await expect(cards.first()).toBeVisible();
    const bounds = await cards.evaluateAll((els) =>
        els.map((el) => {
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, width: r.width, height: r.height };
        }),
    );
    expect(bounds.length).toBeGreaterThan(0);
    for (const [i, b] of bounds.entries()) {
        expect(b.width).toBeGreaterThanOrEqual(179);
        expect(b.height).toBeGreaterThanOrEqual(43);
        const previous = bounds[i - 1];
        if (previous) expect(b.top).toBeGreaterThanOrEqual(previous.bottom);
    }
    await page.screenshot({ path: info.outputPath("overview.png") });
    const visible = await cards.evaluateAll((els) =>
        els.findIndex((el) => {
            const r = el.getBoundingClientRect();
            return r.top > 150 && r.bottom < innerHeight - 100;
        }),
    );
    expect(visible).toBeGreaterThanOrEqual(0);
    await cards.nth(visible).click();
    await expect(host.locator(".world")).toHaveAttribute("data-level", "day");
    await expect(page.locator(".rd-read").first()).toBeAttached({ timeout: 60_000 });
});
