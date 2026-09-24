// The grown-ups' map (.docs/parent-app.md, "The map, for grown-ups") and the look a lesson page opens
// over itself: the map of every world opens from the bar with every place open and nobody on it, pans
// and zooms; a world of another year opens from it, its lessons read as written with the notes, and
// the way back reaches the map and the home; a lesson in Explore opens as a child sees it over the
// page and Escape, the back button and Close each return the grown-up to the lesson; and the site's
// See the map opens the sample child's map over the page. Nothing any of it does is recorded.

import { expect, type Locator, type Page } from "@playwright/test";
import { atScreen, signInAs, smallTargets, test } from "./steps";

const mapOf = (page: Page): Locator => page.getByRole("region", { name: "The map of every world" });

/** The map's places, as its buttons, once its first frame is all there. */
async function mapReady(page: Page): Promise<Locator> {
    const map = mapOf(page);
    await atScreen(page, map);
    await expect(page.locator(".ow-host.ready").first()).toBeVisible({ timeout: 60_000 });
    return map;
}

/** Where the map's world layer stands, as its transform, which a pan or a zoom changes. */
const layerOf = (page: Page): Promise<string> =>
    page
        .locator(".ow-host .world")
        .first()
        .evaluate((el) => el.style.transform);

async function cameraSettled(map: Locator): Promise<void> {
    let previous = "";
    let same = 0;
    await expect
        .poll(
            async () => {
                const current = await map.locator(".world").evaluate((el) => el.style.transform);
                same = current && current === previous ? same + 1 : 0;
                previous = current;
                return same;
            },
            { intervals: [100] },
        )
        .toBeGreaterThanOrEqual(2);
}

/** A distant place first frames itself; the next click enters after its camera settles. */
async function goInto(page: Page, place: Locator): Promise<void> {
    await cameraSettled(place.locator("xpath=ancestor::section[contains(@class, 'ow-host')]"));
    const before = page.url();
    await place.dispatchEvent("click");
    let previous: string | null = null;
    await expect
        .poll(async () => {
            if (page.url() !== before) return true;
            const state = await place.evaluateAll((els) => {
                const el = els[0];
                return el
                    ? {
                          transform: el.closest(".world")?.getAttribute("style") ?? "",
                          focused: el.getAttribute("tabindex") === "0",
                          centered: (() => {
                              const host = el.closest(".ow-host")?.getBoundingClientRect();
                              const box = el.getBoundingClientRect();
                              return (
                                  !!host &&
                                  Math.abs(box.x + box.width / 2 - host.x - host.width / 2) < 12 &&
                                  Math.abs(box.y + box.height / 2 - host.y - host.height / 2) < 12
                              );
                          })(),
                      }
                    : null;
            });
            if (!state) return page.url() !== before;
            const settled = previous === state.transform;
            previous = state.transform;
            return settled && state.focused && state.centered;
        })
        .toBe(true);
    if (page.url() === before) await place.dispatchEvent("click");
}

/** A world's roll for reading, once its first frame is there. */
async function rollReady(page: Page): Promise<Locator> {
    const roll = page.locator(".wd");
    await expect(roll).toHaveClass(/ready/, { timeout: 60_000 });
    return roll;
}

test("the map opens from the bar for a signed-in grown-up, with every land drawn, every world open and nobody on it, and pans and zooms", async ({
    page,
}) => {
    await signInAs(page);
    await page
        .getByRole("navigation", { name: "The grown-ups' places" })
        .getByRole("link", { name: "Map" })
        .click();
    const map = await mapReady(page);
    await expect(page).toHaveURL(/\/map$/);
    // Each world has one location, with geographic region names.
    const places = map.locator(".ow-node");
    expect(await places.count()).toBe(38);
    await expect(map.locator('.ow-node[aria-disabled="true"]')).toHaveCount(0);
    expect(await map.locator(".ow-region").count()).toBe(8);
    // nobody stands on it: no guide, no "You are here", no place chosen, so no ring and no name
    await expect(map.locator(".ow-token")).toHaveCount(0);
    await expect(map.getByText("You are here")).toHaveCount(0);
    await expect(map.locator(".ow-where")).toHaveCount(0);
    await expect(map.locator(".ow-node.focus")).toHaveCount(0);
    expect(await smallTargets(map)).toEqual([]);
    // All destinations remain accessible; artwork is only required near the camera.
    await expect.poll(() => map.locator(".ow-place").count()).toBeGreaterThan(0);
    await cameraSettled(map);

    const scale = () =>
        map.locator(".world").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    const openingScale = await scale();
    await expect(map.locator(".ow-scope")).toHaveText("Near me");
    await map.locator(".ow-scope").click();
    await expect.poll(scale).toBeGreaterThan(openingScale * 1.5);

    // A tap chooses a place without adding a floating name chip.
    await map.locator('.ow-node[aria-label*="harbour" i]').first().dispatchEvent("click");
    await expect(map.locator('.ow-node[tabindex="0"][aria-label*="harbour" i]')).toHaveCount(1);
    await expect(map.locator('.ow-place[data-world="harbour"] .j-art svg').first()).toBeVisible();
    await expect(map.locator(".ow-where")).toHaveCount(0);
    // a drag pans, and the wheel zooms
    const box = await map.boundingBox();
    if (!box) throw new Error("the map has no box");
    const was = await layerOf(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 160, box.y + box.height / 2 - 80, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => layerOf(page)).not.toBe(was);
    const panned = await layerOf(page);
    // Mobile WebKit cannot inject a native mouse wheel; exercise the shared gesture handler.
    await map.dispatchEvent("wheel", {
        deltaY: -400,
        ctrlKey: true,
        clientX: box.x + box.width / 2,
        clientY: box.y + box.height / 2,
    });
    await expect.poll(() => layerOf(page)).not.toBe(panned);
});

for (const world of ["harbour", "meadow"]) {
    test(`the overview smoothly centers the ${world} on its first click`, async ({ page }) => {
        await page.clock.install();
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await signInAs(page);
        await page.goto("/map");
        const map = await mapReady(page);
        // Setup and measurement share a clock so slow rendering cannot stretch camera waits.
        await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60_000));
        await page.clock.runFor(32);
        if ((await map.locator(".ow-scope").textContent()) === "Near me") {
            await map.locator(".ow-scope").dispatchEvent("click");
            await page.clock.fastForward(1500);
        }
        await map.getByRole("button", { name: "Every world", exact: true }).dispatchEvent("click");
        await page.clock.fastForward(1500);
        const place = map.locator(`.ow-node[aria-label*="${world}" i]`).first();
        const before = await place.evaluate((el) => {
            const layer = el.closest<HTMLElement>(".world");
            if (!layer) throw new Error("the map has no camera layer");
            const before = new DOMMatrix(layer.style.transform);
            el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            return { z: before.a, x: before.e, y: before.f };
        });
        await page.clock.runFor(32);
        const first = await map.locator(".world").evaluate((el) => {
            const m = new DOMMatrix(el.style.transform);
            return { z: m.a, x: m.e, y: m.f };
        });
        expect(first.z / before.z).toBeLessThan(1.15);
        expect(Math.hypot(first.x - before.x, first.y - before.y)).toBeLessThan(40);
        await page.clock.fastForward(1200);
        await page.clock.resume();
        await expect
            .poll(() => map.locator(".world").evaluate((el) => new DOMMatrix(el.style.transform).a))
            .toBeGreaterThan(before.z * 1.5);
        await expect
            .poll(async () => {
                const region = await map.boundingBox();
                const box = await place.boundingBox();
                return (
                    !!region &&
                    !!box &&
                    box.width > 0 &&
                    Math.abs(box.x + box.width / 2 - region.x - region.width / 2) < 12 &&
                    Math.abs(box.y + box.height / 2 - region.y - region.height / 2) < 12
                );
            })
            .toBe(true);
        await expect(page.locator(".wd")).toHaveCount(0);
        await place.dispatchEvent("click");
        await rollReady(page);
    });
}

test("a grown-up goes into a world of another year from the map, reads a lesson there as written with the notes, and comes back out to the map and to the home", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/map");
    const map = await mapReady(page);
    // the fourth year's mountains: no test child is in that year, and nothing of theirs is drawn here
    const mountains = map.locator('.ow-node[aria-label*="mountains" i]').first();
    await expect(mountains).toHaveAttribute("aria-label", "The mountains. Year 4, term 1.");
    const entries = await page.evaluate(() => history.length);
    await goInto(page, mountains);
    const roll = await rollReady(page);
    await expect(page).toHaveURL(/\/map\?world=mountains$/);
    // the roll is every day of the year as written, numbered rather than dated, and the first day's
    // paper lands at reading distance, the lesson as written with the answers and the notes
    await expect(roll.locator(".j-date .d").first()).toHaveText("Day 1");
    const first = roll.locator(".rd-sheet.rd-read").first();
    await expect(first).toBeVisible({ timeout: 30_000 });
    await expect(first.locator(".ls-answer").first()).toBeVisible();
    await expect(roll.locator(".wd-sheet-note", { hasText: "Finished on" })).toHaveCount(0);
    // a map that has gone in never dives again: two seconds on, the roll is still the one screen and
    // going in pushed one entry, not one every 0.8 s (engine/ui/overworld.tsx)
    await page.waitForTimeout(2000);
    await expect(page.locator(".wd")).toHaveCount(1);
    expect(await page.evaluate(() => history.length)).toBe(entries + 1);
    // out to the map by Escape, which lands on the mountains, and home by the bar
    await page.locator(".wd-host").focus();
    await page.keyboard.press("Escape");
    await mapReady(page);
    await expect(page).toHaveURL(/\/map$/);
    await expect(page.locator(".wd")).toHaveCount(0);
    await expect(mountains).toHaveAttribute("tabindex", "0");
    await expect
        .poll(async () => {
            const region = await map.boundingBox();
            const place = await mountains.boundingBox();
            return (
                !!region &&
                !!place &&
                place.width > 0 &&
                Math.abs(place.x + place.width / 2 - region.x - region.width / 2) < 12 &&
                Math.abs(place.y + place.height / 2 - region.y - region.height / 2) < 12
            );
        })
        .toBe(true);

    await page
        .getByRole("navigation", { name: "The grown-ups' places" })
        .getByRole("link", { name: "Home" })
        .click();
    await atScreen(page, page.getByRole("heading", { name: "Hello, Test Parent" }));
});

test("a lesson in Explore opens as a child sees it over the page, in its world, and Escape, the back button and Close each return to the lesson with focus on what opened it", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/explore/g1-adding-to-twenty");
    const title = page.getByRole("heading", { name: "Adding to twenty", level: 1 });
    await atScreen(page, title);
    const see = page.getByRole("link", { name: "See it as a child sees it" });
    await expect(see).toBeVisible();
    await expect(page.getByRole("link", { name: "Open on the map" })).toHaveAttribute(
        "href",
        "/map?lesson=g1-adding-to-twenty",
    );
    expect(
        await smallTargets(page.getByRole("navigation", { name: /This lesson in the app/ })),
    ).toEqual([]);
    const opens = async (): Promise<Locator> => {
        await see.focus();
        await see.press("Enter");
        const look = page.getByRole("dialog", { name: "As a child sees it" });
        await expect(look).toBeVisible();
        await look.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
        await expect(page).toHaveURL(/#\/lesson\/g1-adding-to-twenty$/);
        const roll = look.locator(".wd");
        await expect(roll).toHaveClass(/ready/, { timeout: 60_000 });
        // the lesson's own sheet, as a child has it: nothing filled in, no notes for grown-ups
        const sheet = roll.locator(".rd-sheet.rd-read").first();
        await expect(sheet).toBeVisible({ timeout: 30_000 });
        await expect(sheet.locator(".ls-answer")).toHaveCount(0);
        await expect(sheet.getByText("For grown-ups")).toHaveCount(0);
        expect(await smallTargets(look.locator(".ov-top"))).toEqual([]);
        return look;
    };
    // Escape from the roll goes out to the map, and Escape from the map closes the look
    let look = await opens();
    await look.locator(".wd-host").focus();
    await page.keyboard.press("Escape");
    await expect(look.locator(".ow-host.ready")).toBeVisible({ timeout: 60_000 });
    await expect(page).toHaveURL(/#\/map$/);
    await page.keyboard.press("Escape");
    await expect(look).toBeHidden();
    await expect(page).not.toHaveURL(/#/);
    await expect(see).toBeFocused();
    // the back button closes it, as one entry
    look = await opens();
    await page.goBack();
    await expect(look).toBeHidden();
    await expect(page).toHaveURL(/\/explore\/g1-adding-to-twenty$/);
    await expect(title).toBeVisible();
    // and so does Close
    look = await opens();
    await look.getByRole("button", { name: "Close" }).click();
    await expect(look).toBeHidden();
    await expect(see).toBeFocused();
    await expect(title).toBeVisible();
});

test("See the map on the site opens the sample child's map over the page, a world opens with its lessons, and the address after the # brings it back", async ({
    page,
}) => {
    await page.goto("/home");
    const mapLink = page
        .getByRole("navigation", { name: "Sections of this page" })
        .getByRole("link", { name: "The map", exact: true });
    if (await mapLink.isVisible()) await mapLink.click();
    else await page.goto("/home#map");
    await expect(page).toHaveURL(/\/home#map$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("section#map")).toBeInViewport();
    const see = page.getByRole("link", { name: "See the map" });
    await see.scrollIntoViewIfNeeded();
    await see.click();
    const look = page.getByRole("dialog", { name: "A sample child's map" });
    await expect(look).toBeVisible();
    const bounds = await look.boundingBox();
    const viewport = page.viewportSize();
    if (bounds && viewport && viewport.width > 700) {
        expect(bounds.width).toBeLessThanOrEqual(viewport.width * 0.89);
        expect(bounds.x).toBeGreaterThan(viewport.width * 0.05);
        expect(bounds.y).toBeGreaterThan(viewport.height * 0.05);
    }
    await expect(page).toHaveURL(/\/home#\/map$/);
    await expect(look.locator(".ow-host.ready")).toBeVisible({ timeout: 60_000 });
    // the sample child's map, with every world open to go into and nothing of a real child on it
    await expect(look.locator('.ow-node[aria-disabled="true"]')).toHaveCount(0);
    expect(await smallTargets(look.locator(".ov-top"))).toEqual([]);
    await look.getByRole("button", { name: "Fly the paper plane (P)" }).click();
    await expect(look.locator(".ow-host[data-fly]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(look).toBeVisible();
    await expect(look.locator(".ow-host[data-fly]")).toHaveCount(0);
    const harbour = look.locator('.ow-node[aria-label*="harbour" i]').first();
    await goInto(page, harbour);
    const roll = look.locator(".wd");
    await expect(roll).toHaveClass(/ready/, { timeout: 60_000 });
    await expect(page).toHaveURL(/#\/map\/harbour$/);
    await expect(roll.locator(".rd-sheet.rd-read").first()).toBeVisible({ timeout: 60_000 });
    await look.getByRole("button", { name: "Close" }).click();
    await expect(look).toBeHidden();
    await expect(page).toHaveURL(/\/home#map$/);
    // A fresh document has no overlay history entry; closing its deep link clears the route.
    await page.goto("/home");
    await page.goto("/home#/map/harbour");
    const again = page.getByRole("dialog", { name: "A sample child's map" });
    await expect(again).toBeVisible();
    await expect(again.locator(".wd")).toHaveClass(/ready/, { timeout: 60_000 });
    await again.getByRole("button", { name: "Close" }).click();
    await expect(again).toBeHidden();
    await expect(page).toHaveURL(/\/home$/);
    await expect(
        page.getByRole("heading", { name: "School at home, one world at a time" }),
    ).toBeVisible();
});

for (const motion of ["no-preference", "reduce"] as const) {
    test(`paper plane steering, speed and landing with ${motion} motion`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: motion });
        await signInAs(page);
        await page.goto("/map");
        const map = await mapReady(page);
        await map.getByRole("button", { name: "Near me", exact: true }).click();
        await cameraSettled(map);
        const zoom = () =>
            map
                .locator(".world")
                .evaluate((el) => Number((el as HTMLElement).style.getPropertyValue("--mz")));
        const nearZoom = await zoom();
        await map
            .getByRole("button", { name: "Fly the paper plane (P)" })
            .click({ timeout: 10000 });
        const host = page.locator(".ow-host[data-fly]");
        await expect(host.locator(".ow-plane-body svg")).toBeVisible();
        await expect.poll(async () => (await zoom()) / nearZoom).toBeCloseTo(1, 2);
        await host.dispatchEvent("wheel", { deltaY: 8, deltaX: 2 });
        await page.waitForTimeout(150);
        expect((await zoom()) / nearZoom).toBeCloseTo(1, 2);
        await host.dispatchEvent("wheel", { deltaY: 30, ctrlKey: true });
        await expect.poll(async () => (await zoom()) / nearZoom).toBeCloseTo(2 ** -0.3, 2);
        for (let i = 0; i < 12; i++) await page.keyboard.press("-");
        await expect.poll(async () => (await zoom()) / nearZoom).toBeCloseTo(0.4, 2);
        await expect(host.getByRole("button", { name: "Zoom out while flying" })).toBeDisabled();
        for (let i = 0; i < 12; i++)
            await host
                .locator(".ow-flytouch")
                .dispatchEvent("wheel", { deltaY: -100, ctrlKey: true });
        await expect.poll(async () => (await zoom()) / nearZoom).toBeCloseTo(1.4, 2);
        await expect(host.getByRole("button", { name: "Zoom in while flying" })).toBeDisabled();
        await host.getByRole("button", { name: "Zoom out while flying" }).click();
        await expect.poll(async () => (await zoom()) / nearZoom).toBeCloseTo(1.4 / 1.15, 2);
        const controls = await host.locator(".ow-flyhud").boundingBox();
        expect(controls?.height).toBeLessThan(100);
        expect(controls?.width).toBeLessThan(page.viewportSize()?.width ?? 0);
        await expect(host.locator(".ow-sock svg").first()).toBeAttached();
        await host.getByRole("radio", { name: "Fast", exact: true }).click();
        await expect(host.getByRole("radio", { name: "Fast", exact: true })).toHaveAttribute(
            "aria-checked",
            "true",
        );
        const before = await host.getAttribute("data-plane");
        await host.getByRole("button", { name: "Steer left", exact: true }).focus();
        await page.keyboard.press("ArrowLeft");
        await expect.poll(() => host.getAttribute("data-plane")).not.toBe(before);
        await host.getByRole("radio", { name: "Slow", exact: true }).click();
        await expect(host.getByRole("radio", { name: "Slow", exact: true })).toHaveAttribute(
            "aria-checked",
            "true",
        );
        if (motion === "reduce") {
            const rested = await host.getAttribute("data-plane");
            await page.waitForTimeout(250);
            expect(await host.getAttribute("data-plane")).toBe(rested);
        }
        const destination = (await host.locator(".ow-landing-hint").innerText()).replace(
            "L to land at ",
            "",
        );
        await page.keyboard.press("l");
        if (motion === "no-preference") {
            await expect(host.locator(".ow-landing-hint")).toContainText("Landing at");
            await expect(host.locator(".ow-plane-body")).toBeAttached();
            await expect(
                host.getByRole("button", { name: "Stop flying and land at the nearest world" }),
            ).toBeDisabled();
            await page.waitForTimeout(200);
            await expect(host.locator(".ow-plane-body")).toBeAttached();
        }
        await expect(map.locator('.ow-node[tabindex="0"]')).toHaveAttribute(
            "aria-label",
            new RegExp(destination, "i"),
        );
        await expect(page.locator(".ow-host[data-fly]")).toHaveCount(0);
        await expect(map.locator('.ow-node[tabindex="0"]')).toBeFocused();
        await expect(page.locator(".wd")).toHaveCount(0);
        await map
            .getByRole("button", { name: "Fly the paper plane (P)" })
            .click({ timeout: 10000 });
        await expect(page.locator(".ow-host[data-fly]")).toHaveCount(1);
        await page.keyboard.press("Escape");
        await expect(page.locator(".ow-host[data-fly]")).toHaveCount(0);
        await expect(map).toBeVisible();
        await map.getByRole("button", { name: "Fly the paper plane (P)" }).click();
        await expect(host.locator(".ow-flyhud")).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.locator(".ow-host[data-fly]")).toHaveCount(0);
        await expect(page.locator(".wd")).toHaveCount(0);
    });
}

test("the map scope switch returns to the selected world without changing button width", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/home#/map");
    const look = page.getByRole("dialog", { name: "A sample child's map" });
    const map = look.locator(".ow-host.ready");
    await expect(map).toBeVisible({ timeout: 60_000 });
    const harbour = map.locator('.ow-node[aria-label*="harbour" i]').first();
    await map.getByRole("button", { name: "Every world", exact: true }).click();
    await harbour.dispatchEvent("click");
    const scope = map.locator(".ow-scope");
    await expect(scope).toHaveText("Every world");
    const closeWidth = (await scope.boundingBox())?.width;
    await scope.click();
    await expect(scope).toHaveText("Near me");
    expect((await scope.boundingBox())?.width).toBe(closeWidth);
    const far = (await harbour.boundingBox())?.width ?? 0;
    await scope.click();
    await expect(scope).toHaveText("Every world");
    const near = await harbour.boundingBox();
    const region = await map.boundingBox();
    if (!near || !region) throw new Error("the map must be visible");
    expect(near.width).toBeGreaterThan(far * 1.5);
    expect(Math.abs(near.x + near.width / 2 - region.x - region.width / 2)).toBeLessThan(12);
    expect(Math.abs(near.y + near.height / 2 - region.y - region.height / 2)).toBeLessThan(12);
    for (let i = 0; i < 18; i++) {
        await map.dispatchEvent("wheel", {
            deltaY: 100,
            ctrlKey: true,
            clientX: region.x + region.width / 2,
            clientY: region.y + region.height / 2,
        });
    }
    await expect(scope).toHaveText("Near me");
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test(`a cold sample world waits for its real sheets before landing (${reducedMotion})`, async ({
        page,
    }) => {
        await page.emulateMedia({ reducedMotion });
        let release = (): void => {};
        const held = new Promise<void>((done) => {
            release = done;
        });
        await page.route("**/@site-pack/lessons/**", async (route) => {
            await held;
            await route.continue();
        });
        try {
            await page.goto("/home#/map/harbour");
            const look = page.getByRole("dialog", { name: "A sample child's map" });
            await expect(look.locator(".wd.ready")).toBeVisible({ timeout: 60_000 });
            await expect(look.getByRole("status")).toHaveText("Opening your lessons…");
            await page.waitForTimeout(2000);
            await expect(look.getByRole("status")).toBeVisible();
            await expect(look.locator(".rd-read")).toHaveCount(0);
            if (reducedMotion === "no-preference")
                await page.screenshot({
                    path: `/tmp/lumischool-world-loading-${test.info().project.name}.png`,
                });
            release();
            await expect(look.getByRole("status")).toHaveCount(0, { timeout: 30_000 });
            await expect(look.locator(".rd-read").first()).toBeVisible();
            await expect(page).toHaveURL(/#\/map\/harbour$/);
        } finally {
            release();
        }
    });
}

test("a failed sample lesson can retry without changing worlds", async ({ page }) => {
    let failing = true;
    await page.route("**/@site-pack/lessons/**", async (route) => {
        if (failing) await route.fulfill({ status: 503, body: "Unavailable" });
        else await route.continue();
    });
    await page.goto("/home#/map/harbour");
    const look = page.getByRole("dialog", { name: "A sample child's map" });
    await expect(look.getByRole("button", { name: "Try again" })).toBeVisible({ timeout: 60_000 });
    failing = false;
    await look.getByRole("button", { name: "Try again" }).click();
    await expect(look.getByRole("status")).toHaveCount(0, { timeout: 30_000 });
    await expect(look.locator(".rd-read").first()).toBeVisible();
    await expect(page).toHaveURL(/#\/map\/harbour$/);
});

test("choosing a sample world prepares lessons before entry and reuses their requests", async ({
    page,
}) => {
    const counts = new Map<string, number>();
    page.on("request", (request) => {
        if (request.url().includes("/@site-pack/lessons/"))
            counts.set(request.url(), (counts.get(request.url()) ?? 0) + 1);
    });
    await page.goto("/home#/map");
    const look = page.getByRole("dialog", { name: "A sample child's map" });
    await expect(look.locator(".ow-host.ready")).toBeVisible({ timeout: 60_000 });
    await expect(look.locator(".ow-scope")).toHaveText("Every world");
    const before = counts.size;
    const meadow = look.locator('.ow-node[aria-label*="meadow" i]').first();
    await meadow.dispatchEvent("click");
    await expect.poll(() => counts.size).toBeGreaterThan(before);
    await expect(page).toHaveURL(/#\/map$/);
    const enteredAt = Date.now();
    await goInto(page, meadow);
    await expect(look.locator(".rd-read").first()).toBeVisible({ timeout: 30_000 });
    await expect(look.getByRole("status")).toHaveCount(0);
    await test.info().attach("prepared-entry", {
        body: JSON.stringify({ readyMs: Date.now() - enteredAt, requests: [...counts] }),
        contentType: "application/json",
    });
    expect([...counts.values()].every((count) => count === 1)).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(look.getByRole("status")).toHaveCount(0, { timeout: 30_000 });
    await expect(look.locator(".rd-read").first()).toBeVisible();
    expect([...counts.values()].every((count) => count === 1)).toBe(true);
});

test("closing a sample world during loading leaves no late sheets or errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let release = (): void => {};
    const held = new Promise<void>((done) => {
        release = done;
    });
    await page.route("**/@site-pack/lessons/**", async (route) => {
        await held;
        await route.continue();
    });
    try {
        await page.goto("/home#/map/harbour");
        const look = page.getByRole("dialog", { name: "A sample child's map" });
        await expect(look.getByRole("status")).toBeVisible({ timeout: 60_000 });
        await look.getByRole("button", { name: "Close" }).click();
        release();
        await expect(look).toHaveCount(0);
        await page.waitForTimeout(500);
        await expect(page.locator(".rd-measure, .rd-status, .rd-read")).toHaveCount(0);
        expect(errors).toEqual([]);
    } finally {
        release();
    }
});

test("failed map imports never reload an active or departing document", async ({ page }) => {
    await page.goto("/home");
    const navigations: string[] = [];
    page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame()) navigations.push(frame.url());
    });
    for (const phase of ["beforeunload", "pageshow"]) {
        await page.addScriptTag({
            type: "module",
            content: `import { onDemand } from "/engine/ui/art.tsx";
                window.dispatchEvent(new Event("${phase}"));
                onDemand(() => Promise.reject(new Error("missing chunk")))
                    .catch(() => { document.documentElement.dataset.importRejected = "${phase}"; });`,
        });
        await expect(page.locator("html")).toHaveAttribute("data-import-rejected", phase);
    }
    expect(navigations).toEqual([]);
    expect(await page.evaluate(() => sessionStorage.getItem("reloaded:/home"))).toBeNull();
});

test("flight zoom catches up after a delayed frame without advancing plane physics by the gap", async ({
    page,
}) => {
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/home#/map");
    const map = await mapReady(page);
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60_000));
    await page.clock.runFor(32);
    await map.getByRole("button", { name: "Fly the paper plane (P)" }).dispatchEvent("click");
    await page.clock.runFor(2000);
    const zoom = () => map.locator(".world").evaluate((el) => new DOMMatrix(el.style.transform).a);
    const before = await zoom();
    const position = () => map.getAttribute("data-plane");
    const from = (await position())?.split(",").map(Number);
    await map.dispatchEvent("wheel", { deltaY: 30, ctrlKey: true });
    // Deliver just one delayed animation frame, as happens when rendering stalls.
    await page.clock.fastForward(3000);
    await page.clock.runFor(32);
    expect((await zoom()) / before).toBeCloseTo(2 ** -0.3, 2);
    const to = (await position())?.split(",").map(Number);
    if (!from || !to) throw new Error("the flight must report its position");
    expect(Math.hypot((to[0] ?? 0) - (from[0] ?? 0), (to[1] ?? 0) - (from[1] ?? 0))).toBeLessThan(
        250,
    );
});
