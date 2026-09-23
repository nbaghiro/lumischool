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

/** A distant place first frames itself; the next click enters after its camera settles. */
async function goInto(page: Page, place: Locator): Promise<void> {
    const before = page.url();
    await place.dispatchEvent("click");
    let previous: string | null = null;
    await expect
        .poll(async () => {
            if (page.url() !== before) return true;
            const transform = await place.evaluate(
                (el) => el.closest(".world")?.getAttribute("style") ?? "",
            );
            const settled = previous === transform;
            previous = transform;
            return settled && (await place.getAttribute("tabindex")) === "0";
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
    await expect(map.locator(".ow-place")).toHaveCount(38);

    // a tap chooses a place, and the chip names it
    await map.locator('.ow-node[aria-label*="harbour" i]').first().dispatchEvent("click");
    await expect(map.locator(".ow-where")).toHaveText("The harbour", { timeout: 20_000 });
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
    await page.mouse.wheel(0, -400);
    await expect.poll(() => layerOf(page)).not.toBe(panned);
});

for (const world of ["harbour", "meadow"]) {
    test(`the overview smoothly centers the ${world} on its first click`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await signInAs(page);
        await page.goto("/map");
        const map = await mapReady(page);
        const place = map.locator(`.ow-node[aria-label*="${world}" i]`).first();
        const motion = await place.evaluate(async (el) => {
            const before = el.getBoundingClientRect();
            el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            const first = el.getBoundingClientRect();
            return {
                scale: first.width / before.width,
                distance: Math.hypot(first.x - before.x, first.y - before.y),
            };
        });
        expect(motion.scale).toBeLessThan(1.15);
        expect(motion.distance).toBeLessThan(40);
        await expect
            .poll(async () => {
                const region = await map.boundingBox();
                const box = await place.boundingBox();
                return (
                    !!region &&
                    !!box &&
                    box.width > 60 &&
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
                place.width > 60 &&
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
        await see.click();
        const look = page.getByRole("dialog", { name: "As a child sees it" });
        await expect(look).toBeVisible();
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
    const see = page.getByRole("link", { name: "See the map" });
    await expect(see).toBeVisible();
    await see.click();
    const look = page.getByRole("dialog", { name: "A sample child's map" });
    await expect(look).toBeVisible();
    await expect(page).toHaveURL(/\/home#\/map$/);
    await expect(look.locator(".ow-host.ready")).toBeVisible({ timeout: 60_000 });
    // the sample child's map, with every world open to go into and nothing of a real child on it
    await expect(look.locator('.ow-node[aria-disabled="true"]')).toHaveCount(0);
    expect(await smallTargets(look.locator(".ov-top"))).toEqual([]);
    const harbour = look.locator('.ow-node[aria-label*="harbour" i]').first();
    await goInto(page, harbour);
    const roll = look.locator(".wd");
    await expect(roll).toHaveClass(/ready/, { timeout: 60_000 });
    await expect(page).toHaveURL(/#\/map\/harbour$/);
    await expect(roll.locator(".rd-sheet.rd-read").first()).toBeVisible({ timeout: 60_000 });
    // the same address opened afresh is the same look, and Close gives the page back
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
