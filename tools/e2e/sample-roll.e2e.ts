import { expect, test } from "@playwright/test";

test("the sample lesson settles before appearing and keeps one world through fitting and resize", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
        const worlds = new Set<Element>();
        let ready = false;
        let reveals = 0;
        new MutationObserver(() => {
            const frame = document.querySelector<HTMLElement>(".site-roll");
            if (!frame) return;
            for (const world of frame.querySelectorAll(".site-roll-world")) worlds.add(world);
            frame.dataset.mounts = String(worlds.size);
            const next = frame.classList.contains("is-ready");
            if (next && !ready) reveals++;
            ready = next;
            frame.dataset.reveals = String(reveals);
        }).observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
        });
    });
    await page.goto("/home");
    const frame = page.locator(".site-roll");
    await frame.scrollIntoViewIfNeeded();
    await expect(frame).toHaveClass(/is-ready/, { timeout: 90_000 });
    await expect(frame).toHaveAttribute("data-mounts", "1");
    const sheet = frame.locator(".wd-sheets .ls-sheet").first();
    await expect(sheet).toBeVisible();
    const vp = page.viewportSize();
    if (!vp) throw new Error("Missing viewport");
    await page.setViewportSize({
        width: vp.width > 700 ? vp.width - 100 : vp.width + 30,
        height: vp.height,
    });
    await expect(frame).toHaveAttribute("data-reveals", "2");
    await expect(frame).toHaveClass(/is-ready/);
    await expect(sheet).toBeVisible();
    await expect(frame).toHaveAttribute("data-mounts", "1");
});
