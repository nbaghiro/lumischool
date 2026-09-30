import { expect } from "@playwright/test";
import { childsMap, openChildrensView, signInAs, test } from "./steps";
import { readKidRecord } from "../../engine/ui/wire";

test("page reading keeps the same lesson nodes and scrolls natively", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home#/map/mountains");
    const dialog = page.getByRole("dialog", { name: "A sample child's map" });
    const host = dialog.locator(".wd-host");
    await expect(dialog.locator(".wd.ready")).toBeVisible({ timeout: 90_000 });
    await expect(dialog.locator(".wd")).not.toHaveClass(/rd-loading/);
    const sheet = host.locator(".wd-sheets .ls-sheet").first();
    await expect(sheet).toBeVisible();
    const original = await sheet.elementHandle();
    const toggle = dialog.getByRole("button", { name: "Page view", exact: true });
    await toggle.focus();
    await toggle.click();
    await expect(host).toHaveClass(/reading-page/);
    await expect.poll(() => original.evaluate((el) => el.isConnected)).toBe(true);
    const before = await host.evaluate((el) => el.scrollTop);
    await host.evaluate((el) => el.scrollBy(0, 240));
    await expect.poll(() => host.evaluate((el) => el.scrollTop)).toBeGreaterThan(before + 200);
    const position = await original.evaluate((el) => el.getBoundingClientRect().top);
    const back = dialog.getByRole("button", { name: "Canvas view", exact: true });
    await back.focus();
    await back.click();
    await expect(host).not.toHaveClass(/reading-page/);
    expect(await original.evaluate((el) => el.isConnected)).toBe(true);
    await toggle.focus();
    await toggle.click();
    await expect(host).toHaveClass(/reading-page/);
    await expect
        .poll(() => original.evaluate((el) => el.getBoundingClientRect().top))
        .toBeCloseTo(position, 0);
    const exit = dialog.getByRole("button", { name: "Back to the map", exact: true });
    await exit.focus();
    await exit.click();
    await expect(host).toHaveCount(0);
});

test("a child keeps an unfinished answer when changing reading format", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInAs(page);
    await page.route(/\/api\/kid\/[^/]+\/record$/, async (route) => {
        const response = await route.fetch();
        const record = readKidRecord(await response.json());
        if (!record) throw new Error("the record did not read");
        const day = record.plan
            .flatMap((track) => track.days)
            .find((day) => day.lesson === "g1-counting-to-twenty");
        if (!day) throw new Error("Missing maths fixture");
        await route.fulfill({ response, json: { ...record, today: day.on } });
    });
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    const meadow = map.getByRole("button", { name: /The meadow/ });
    await meadow.dispatchEvent("click");
    await meadow.evaluateAll((els) =>
        els[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    const host = page.locator(".wd-host");
    const input = host
        .locator('[data-lesson="g1-counting-to-twenty"] input:not(:disabled)')
        .first();
    await expect(input).toBeVisible({ timeout: 60_000 });
    await input.fill("7");
    const original = await input.elementHandle();
    const hostHeight = await host.evaluate((el) => el.clientHeight);
    const toggle = page.getByRole("button", { name: "Page view", exact: true });
    await toggle.focus();
    await toggle.click();
    await expect(host).toHaveClass(/reading-page/);
    await expect(input).toHaveValue("7");
    await expect.poll(() => host.evaluate((el) => el.clientHeight)).toBe(hostHeight);
    await expect(input).toBeInViewport();
    expect(await input.evaluate((el, old) => el === old, original)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("page-view.png") });
    await page.setViewportSize({ width: 480, height: 720 });
    await expect(input).toHaveValue("7");
    const back = page.getByRole("button", { name: "Canvas view", exact: true });
    await back.focus();
    await back.click();
    await expect(host).not.toHaveClass(/reading-page/);
    await expect(input).toHaveValue("7");
    expect(await input.evaluate((el, old) => el === old, original)).toBe(true);
});

test("the keyboard taking a child to something off the screen takes the roll there", async ({
    page,
}, info) => {
    test.skip(info.project.name === "phone-webkit", "focusVisible is Chromium's");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInAs(page);
    await page.route(/\/api\/kid\/[^/]+\/record$/, async (route) => {
        const response = await route.fetch();
        const record = readKidRecord(await response.json());
        if (!record) throw new Error("the record did not read");
        const day = record.plan
            .flatMap((track) => track.days)
            .find((day) => day.lesson === "g1-counting-to-twenty");
        if (!day) throw new Error("Missing maths fixture");
        await route.fulfill({ response, json: { ...record, today: day.on } });
    });
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    const meadow = map.getByRole("button", { name: /The meadow/ });
    await meadow.dispatchEvent("click");
    await meadow.evaluateAll((els) =>
        els[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    const host = page.locator(".wd-host");
    await expect(host.locator('[data-lesson="g1-counting-to-twenty"] input').first()).toBeVisible({
        timeout: 60_000,
    });
    // the last control of today's sheet, below the window
    const far = host.locator('[data-lesson="g1-counting-to-twenty"] button:not(:disabled)').last();
    await expect(far).not.toBeInViewport();
    await far.evaluate((el: HTMLElement) => el.focus({ focusVisible: true }));
    await expect(far).toBeInViewport({ timeout: 5000 });
});

test("today's sheet growing as the child works it moves the sheets after it down", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInAs(page);
    await page.route(/\/api\/kid\/[^/]+\/record$/, async (route) => {
        const response = await route.fetch();
        const record = readKidRecord(await response.json());
        if (!record) throw new Error("the record did not read");
        const day = record.plan
            .flatMap((track) => track.days)
            .find((day) => day.lesson === "g1-counting-to-twenty");
        if (!day) throw new Error("Missing maths fixture");
        await route.fulfill({ response, json: { ...record, today: day.on } });
    });
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    const meadow = map.getByRole("button", { name: /The meadow/ });
    await meadow.dispatchEvent("click");
    await meadow.evaluateAll((els) =>
        els[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    const host = page.locator(".wd-host");
    const first = host.locator('.ls-sheet[data-lesson="g1-counting-to-twenty"]').first();
    await expect(first).toBeVisible({ timeout: 60_000 });
    const sheets = host.locator(".wd-sheets .ls-sheet.today");
    await expect.poll(() => sheets.count()).toBeGreaterThan(1);
    // what a child's replies and hints add to a sheet, all at once
    await first.evaluate((el) => {
        const more = document.createElement("div");
        more.style.height = "800px";
        el.append(more);
    });
    await expect
        .poll(
            () =>
                sheets.evaluateAll((els) => {
                    const boxes = els
                        .map((el) => el.getBoundingClientRect())
                        .sort((a, b) => a.top - b.top);
                    return boxes.every((b, i) => i === 0 || b.top >= (boxes[i - 1]?.bottom ?? 0));
                }),
            { timeout: 10_000 },
        )
        .toBe(true);
});
