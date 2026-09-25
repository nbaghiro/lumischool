import { expect, test } from "@playwright/test";

test("background dragging pans without selecting lesson text", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home#/map/mountains");
    const dialog = page.getByRole("dialog", { name: "A sample child's map" });
    const host = dialog.locator(".wd-host");
    const titles = dialog.locator(".ls-sheet .ls-head h2");
    await expect(titles.first()).toBeVisible({ timeout: 90_000 });
    await expect(dialog.locator(".wd")).not.toHaveClass(/rd-loading/);
    await host.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
    );
    const visibleTitle = () =>
        titles.evaluateAll((els) =>
            els.findIndex((el) => {
                const r = el.getBoundingClientRect();
                const host = el.closest(".wd-host")?.getBoundingClientRect();
                return host && r.top >= host.top && r.bottom < host.bottom - 100;
            }),
        );
    await expect.poll(visibleTitle).toBeGreaterThanOrEqual(0);
    const title = (
        await page.evaluateHandle(() =>
            [...document.querySelectorAll("dialog .ls-sheet .ls-head h2")].find((el) => {
                const r = el.getBoundingClientRect();
                const host = el.closest(".wd-host")?.getBoundingClientRect();
                return host && r.top >= host.top && r.bottom < host.bottom - 100;
            }),
        )
    ).asElement();
    if (!title) throw new Error("No visible lesson heading");
    const box = await host.boundingBox();
    const heading = await title.boundingBox();
    if (!box || !heading) throw new Error("The lesson is missing");
    const world = host.locator(":scope > .world");
    const before = await world.evaluate((el) => el.getAttribute("style"));
    const start = { x: box.x + 12, y: heading.y + heading.height / 2 };
    expect(
        await page.evaluate(
            ({ x, y }) => !!document.elementFromPoint(x, y)?.closest(".j-sheet"),
            start,
        ),
    ).toBe(false);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(heading.x + heading.width / 2, heading.y + heading.height / 2 + 60, {
        steps: 12,
    });
    await page.mouse.up();
    await expect.poll(() => world.evaluate((el) => el.getAttribute("style"))).not.toBe(before);
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
    // Direct text selection remains available; the camera must not steal the gesture.
    await title.dblclick();
    expect(
        await page.evaluate(() => window.getSelection()?.toString().length ?? 0),
    ).toBeGreaterThan(0);
});

test("lesson worlds keep manual zoom near two sheets", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home#/map/mountains");
    const dialog = page.getByRole("dialog", { name: "A sample child's map" });
    const host = dialog.locator(".wd-host");
    await expect(dialog.locator(".wd.ready")).toBeVisible({ timeout: 90_000 });
    await expect(dialog.locator(".wd")).not.toHaveClass(/rd-loading/, { timeout: 90_000 });
    await expect(dialog.locator(".wd-sheets .ls-sheet").first()).toBeVisible();
    const scale = () =>
        host
            .locator(":scope > .world")
            .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    const floor = async () =>
        Math.min(1.2, Math.max(0.5, (await host.evaluate((el) => el.clientHeight)) / 1400));
    const wheelOut = async () => {
        // Individual wheel deltas are intentionally capped; use a sustained outward gesture.
        for (let i = 0; i < 8; i++)
            await host.dispatchEvent("wheel", { deltaY: 2000, ctrlKey: true, bubbles: true });
    };
    await wheelOut();
    await expect.poll(scale).toBeCloseTo(await floor(), 4);
    await wheelOut();
    await expect.poll(scale).toBeCloseTo(await floor(), 4);
    await host.press("-");
    await expect.poll(scale).toBeCloseTo(await floor(), 4);
    // Home must not bypass the manual limit by fitting the entire lesson roll.
    await host.press("Home");
    await expect.poll(scale).toBeCloseTo(await floor(), 4);
    await host.press("+");
    await expect.poll(scale).toBeGreaterThan(await floor());
    // Exercise the two-touch path as well as trackpad/wheel and keyboard zoom.
    await host.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const send = (type: string, id: number, x: number) =>
            el.dispatchEvent(
                new PointerEvent(type, {
                    bubbles: true,
                    pointerId: id,
                    pointerType: "touch",
                    clientX: box.x + x,
                    clientY: box.y + 120,
                }),
            );
        send("pointerdown", 10, 40);
        send("pointerdown", 11, 240);
        send("pointermove", 11, 45);
        send("pointerup", 10, 40);
        send("pointerup", 11, 45);
    });
    await expect.poll(scale).toBeCloseTo(await floor(), 4);
    const vp = page.viewportSize();
    if (!vp) throw new Error("Missing viewport");
    await page.setViewportSize({ width: vp.width, height: vp.height + 160 });
    await host.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
    );
    await wheelOut();
    await expect.poll(scale).toBeCloseTo(await floor(), 4);
});
