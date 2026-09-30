// Explore, the grown-ups' catalogue: a lesson found by grade, subject and the words of its title,
// opened as a preview over the catalogue rather than on a page of its own, as that lesson's sheet
// alone with no map or world to wander into, read as a child meets it with nothing filled in, at each of its levels, printed as the sheet alone with the answers and the
// notes when they are asked for, and nothing recorded.

import { expect, type Locator, type Page } from "@playwright/test";
import { atScreen, signInAs, smallTargets, test } from "./steps";

/** How many events the family's log holds, as the signed-in grown-up on this page reads it. */
const logged = (page: Page): Promise<number> =>
    page.evaluate(async (): Promise<number> => {
        const read: unknown = await (await fetch("/api/events")).json();
        const events =
            typeof read === "object" && read !== null && "events" in read ? read.events : null;
        return Array.isArray(events) ? events.length : -1;
    });

const TITLE = "Letters that sit on the line";
const LESSON = "/explore/writing-letters-on-the-line";

/** Chooses a subject on the row, opening the Filter control first where a phone folds the chips away. */
async function chooseSubject(page: Page, name: string): Promise<void> {
    const summary = page.locator(".explore-row-filter > summary");
    if (await summary.isVisible()) await summary.click();
    await page.locator(".explore-row-filter").getByRole("radio", { name, exact: true }).check();
}

/** Opens the preview's print menu, where the answers are chosen and the print is asked for. */
async function openTools(page: Page): Promise<void> {
    const open = await page.locator(".explore-print-menu").getAttribute("open");
    if (open === null) await page.locator(".explore-print-menu > summary").click();
    await expect(page.locator(".explore-print-menu-of")).toBeVisible();
}

/**
 * Takes the browser's own print dialog out of the way, and counts what asked for it. Nothing says the
 * print is over afterwards, so the sheet that was printed stays on the page to be read.
 */
async function holdPrint(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const w: Window & { __printed?: number } = window;
        w.__printed = 0;
        w.print = (): void => {
            w.__printed = (w.__printed ?? 0) + 1;
        };
    });
}

const printsAsked = (page: Page): Promise<number> =>
    page.evaluate((): number => {
        const w: Window & { __printed?: number } = window;
        return w.__printed ?? -1;
    });

test("a grown-up finds a lesson in Explore, reads it as a child meets it, prints it as the sheet alone, and nothing is recorded", async ({
    page,
}) => {
    await holdPrint(page);
    await signInAs(page);
    const before = await logged(page);
    await page
        .getByRole("navigation", { name: "The grown-ups' places" })
        .getByRole("link", { name: "Explore" })
        .click();
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    const said = page.locator(".search-found");
    await expect(said).toHaveText(/^All \d+ lessons$/);
    // the head is the card every grown-ups' tab opens with (engine/ui/postcard.css, `.page-head`):
    // one width, and a kicker, a name and two rows of controls that leave the shelves in view
    const head = page.locator(".page-head");
    if (page.viewportSize()?.width === 1440) {
        const box = await head.boundingBox();
        expect(box?.height ?? 999).toBeLessThan(280);
        expect(box?.width ?? 0).toBe(760);
    }
    expect(await smallTargets(head)).toEqual([]);

    // narrowed by grade through the address, and by subject and words on the row, which it keeps
    await page.goto("/explore?grade=1");
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    await chooseSubject(page, "Writing");
    await expect(said).toHaveText(/^\d+ lessons found$/);
    await expect(page.locator(".explore-grade:visible")).toHaveCount(1);
    await expect(page).toHaveURL(/\/explore\?grade=1&subject=writing$/);
    await page.getByRole("searchbox", { name: "Search the titles" }).fill("sit on the line");
    await expect(said).toHaveText("1 lesson found");
    const tile = page.getByRole("link", { name: new RegExp(TITLE) });
    await expect(tile.locator(".explore-pic > svg")).toBeAttached({ timeout: 20_000 });

    // the tile opens the preview over the catalogue, which is still behind it, at the lesson's address
    await tile.click();
    await expect(page).toHaveURL(new RegExp(`${LESSON}$`));
    const preview = page.getByRole("dialog");
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Every lesson", level: 1 })).toBeAttached();
    // the words over the sheet name the lesson, and the sheet is the one lesson alone: no map, no
    // world's roll, and no other lesson to go to
    await expect(preview.getByRole("region", { name: "As a child sees it" })).toBeVisible();
    await expect(preview.locator(".look-words b")).toHaveText(TITLE);
    const sheet = preview.locator(".ls-sheet").first();
    await expect(sheet).toBeVisible({ timeout: 40_000 });
    await expect(preview.locator(".ls-sheet")).toHaveCount(1);
    await expect(preview.locator(".wd, .ow-host, canvas")).toHaveCount(0);
    // behind the top of the sheet, the still picture of the world the lesson is met in
    await expect(preview.locator(".look-world .wd-picture > svg")).toBeAttached({
        timeout: 20_000,
    });
    await expect(preview.getByRole("button", { name: /world|map/i })).toHaveCount(0);
    expect(await smallTargets(preview.locator(".look-top"))).toEqual([]);

    // it is the child's own sheet: nothing filled in, nothing to press, and no help for a reader
    await expect(sheet.locator(".ls-answer")).toHaveCount(0);
    await expect(sheet.getByText("Look for")).toHaveCount(0);
    await expect(sheet.getByRole("button")).toHaveCount(0);

    // each level, said in the tools and in the address, and never on the sheet
    for (const [word, level] of [
        ["Easier", "easy"],
        ["Harder", "hard"],
        ["As written", "medium"],
    ] as const) {
        await page.getByRole("radio", { name: word }).check();
        await expect(page).toHaveURL(
            level === "medium" ? new RegExp(`${LESSON}$`) : new RegExp(`\\?level=${level}$`),
        );
        await expect(preview.locator(".ls-sheet").first()).toBeVisible({ timeout: 40_000 });
        // the sheet's own corner and heading, which a child reads, never name the level
        const corner = await preview.locator(".j-strip, .ls-head").allInnerTexts();
        expect(corner.join(" ")).not.toMatch(/easier|harder|as written/i);
    }

    // printed with the answers asked for, it is the sheet alone: no bar, no catalogue, no preview
    await openTools(page);
    await expect(
        page.getByText("It prints with the answers and the notes, for you."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Print this sheet" }).click();
    const printed = page.locator(".explore-print");
    await expect(printed.locator(".ls-sheet")).toBeVisible({ timeout: 40_000 });
    expect(await printsAsked(page)).toBe(1);
    await expect(printed.locator(".ls-answer").first()).toBeAttached();
    await expect(printed.getByText("Look for").first()).toBeAttached();
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.locator(".page-head")).toBeHidden();
    await expect(preview).toBeHidden();
    await expect(printed.locator(".ls-sheet")).toBeVisible();
    // on the squares it was laid out on, unless the grown-up turned them off
    const grid = (): Promise<string> =>
        printed.locator(".ls-sheet").evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(await grid()).toContain("linear-gradient");
    await page.emulateMedia({ media: "screen" });

    // and without them, it is a child's sheet, with nothing filled in
    await openTools(page);
    await page.getByLabel("Print the answers and the notes for grown-ups").uncheck();
    await expect(
        page.getByText("It prints as a child's sheet, with nothing filled in."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Print this sheet" }).click();
    await expect(printed.locator(".ls-sheet")).toBeVisible({ timeout: 40_000 });
    // the layer is already up, so the print is asked for two frames after the click
    await expect.poll(() => printsAsked(page)).toBe(2);
    await expect(printed.locator(".ls-answer")).toHaveCount(0);
    await expect(printed.getByText("Look for")).toHaveCount(0);

    // and on plain paper once the squares are turned off
    await page.getByLabel("Print on squared paper").uncheck();
    await page.getByRole("button", { name: "Print this sheet" }).click();
    await expect.poll(() => printsAsked(page)).toBe(3);
    await page.emulateMedia({ media: "print" });
    expect(await grid()).toBe("none");
    await page.emulateMedia({ media: "screen" });

    // the way back is the way in: the preview closes and the catalogue is as it was narrowed
    await page.goBack();
    await expect(preview).toHaveCount(0);
    await expect(page).toHaveURL(/\/explore\?grade=1&subject=writing&q=sit\+on\+the\+line$/);
    await expect(said).toHaveText("1 lesson found");

    // and reading recorded nothing
    expect(await logged(page)).toBe(before);
});

test("a lesson's own address opens the preview over Explore, and back leaves the parent on Explore", async ({
    page,
}) => {
    await signInAs(page);
    // as a bookmark, a shared link or a new tab opens it, with no entry of this app's behind it
    await page.goto(LESSON);
    const preview = page.getByRole("dialog");
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await expect(preview.getByRole("button", { name: "Close" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Every lesson", level: 1 })).toBeAttached();

    await page.goBack();
    await expect(preview).toHaveCount(0);
    await expect(page).toHaveURL(/\/explore$/);
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));

    // and Close from a look opened here goes the same way
    await page.goto(LESSON);
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await preview.getByRole("button", { name: "Close" }).click();
    await expect(preview).toHaveCount(0);
    await expect(page).toHaveURL(/\/explore$/);
});

test("Escape closes a preview opened from a tile, and the tile has the keyboard again", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/explore?q=sit+on+the+line");
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    const tile = page.getByRole("link", { name: new RegExp(TITLE) });
    await tile.focus();
    await tile.press("Enter");
    const preview = page.getByRole("dialog");
    await expect(preview.locator(".ls-sheet")).toBeVisible({ timeout: 40_000 });
    await page.keyboard.press("Escape");
    await expect(preview).toHaveCount(0);
    await expect(page).toHaveURL(/\/explore\?q=sit\+on\+the\+line$/);
    await expect(tile).toBeFocused();
});

test("a grade folds away and comes back, and narrowing opens a grade that has matches", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/explore");
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    const grade1 = page.getByRole("button", { name: /^Grade 1, \d+ lessons$/ });
    const tiles = page.locator(".explore-grade").first().locator(".explore-tile:visible");
    await expect(grade1).toHaveAttribute("aria-expanded", "true");
    await expect(tiles.first()).toBeVisible();

    // folded away: the lessons go, the count stays, and the grade is still there to open again
    await grade1.click();
    await expect(grade1).toHaveAttribute("aria-expanded", "false");
    await expect(tiles).toHaveCount(0);
    await expect(grade1).toHaveText(/84 lessons/);
    await grade1.click();
    await expect(grade1).toHaveAttribute("aria-expanded", "true");
    await expect(tiles.first()).toBeVisible();

    // a grade folded away opens again when a filter finds lessons in it, so nothing is hidden twice
    await grade1.click();
    await expect(grade1).toHaveAttribute("aria-expanded", "false");
    await chooseSubject(page, "Writing");
    await expect(grade1).toHaveAttribute("aria-expanded", "true");
    await expect(tiles.first()).toBeVisible();
});

test("the search opens the row's second line, with the count at its right", async ({ page }) => {
    await signInAs(page);
    await page.goto("/explore");
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    const field = page.getByRole("searchbox", { name: "Search the titles" });
    const said = page.locator(".search-found");
    const row = page.locator(".page-head");
    const [f, s, r] = await Promise.all([
        field.boundingBox(),
        said.boundingBox(),
        row.boundingBox(),
    ]);
    if (page.viewportSize()?.width === 1440) {
        // the field opens the line at the left, with the count beside it rather than across the row
        expect(f?.x ?? 0).toBeLessThan((r?.x ?? 0) + 260);
        const gap = (s?.x ?? 0) - ((f?.x ?? 0) + (f?.width ?? 0));
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThan(60);
        expect(Math.abs((f?.y ?? 0) - (s?.y ?? 0))).toBeLessThan(40);
        expect(f?.width ?? 0).toBeGreaterThan(300);
        // and the pair keeps to one line of the card rather than spreading across it
        expect((s?.x ?? 0) + (s?.width ?? 0)).toBeLessThan((r?.x ?? 0) + (r?.width ?? 0));
    }
    await field.fill("sit on the line");
    await expect(said).toHaveText("1 lesson found");
});

test("a lesson Explore does not have says so over the catalogue", async ({ page }) => {
    await signInAs(page);
    await page.goto("/explore/no-such-lesson");
    await atScreen(page, page.getByRole("heading", { name: "There is no such lesson" }));
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // the catalogue itself is under the note, so there is nowhere else to go
    await expect(page.getByRole("heading", { name: "Every lesson", level: 1 })).toBeVisible();
    await expect(page.locator(".explore-tile").first()).toBeVisible();
});

/** One shelf: a grade's lessons in one subject. */
const shelf = (page: Page, grade: number, subject: string): Locator =>
    page
        .getByRole("region", { name: `Grade ${grade}` })
        .locator(".explore-subject")
        .filter({ has: page.locator("h3", { hasText: subject }) });

test("each shelf reads on as the grown-up scrolls, with nothing to press", async ({ page }) => {
    await signInAs(page);
    await page.goto("/explore");
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    // the catalogue is no longer laid out whole: a shelf far down has read nothing yet, and its
    // heading still says what it holds
    const far = shelf(page, 6, "Maths");
    await expect(far.locator(".explore-tile")).toHaveCount(0);
    await expect(far.locator(".explore-subject-count")).toHaveText("21 lessons");
    expect(await page.locator(".explore-tile").count()).toBeLessThan(200);
    await expect(page.getByRole("button", { name: /show more|next|previous/i })).toHaveCount(0);

    // scrolled to, it reads its first page, and the rest while its end is still below the view
    await far.locator("h3").scrollIntoViewIfNeeded();
    await expect(far.locator(".explore-tile").first()).toBeVisible();
    await far.locator(".paged-end").scrollIntoViewIfNeeded();
    await expect(far.locator(".explore-tile")).toHaveCount(21);
    await expect(far.locator(".paged-loading")).toHaveCount(0);
});

test("a keyboard reaches every lesson of a shelf: Tab onto the last one read reads the next", async ({
    page,
    browserName,
}) => {
    // Safari's Tab passes over links unless Option is held, as a Safari user with a keyboard does
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    // a page nothing scrolls, so no end ever comes near: only the keyboard reads on
    await page.addInitScript(() => {
        const told = new WeakSet<Element>();
        window.IntersectionObserver = class {
            readonly root = null;
            readonly rootMargin = "";
            readonly scrollMargin = "";
            readonly thresholds = [];
            private readonly seen: IntersectionObserverCallback;
            constructor(seen: IntersectionObserverCallback) {
                this.seen = seen;
            }
            observe(el: Element): void {
                // the first grade's shelves are on the first screen, once, as at any size
                if (told.has(el) || !el.closest(".explore-grade")) return;
                if (el.closest(".explore-grade") !== document.querySelector(".explore-grade"))
                    return;
                told.add(el);
                const box = el.getBoundingClientRect();
                const entry: IntersectionObserverEntry = {
                    isIntersecting: true,
                    target: el,
                    boundingClientRect: box,
                    intersectionRect: box,
                    intersectionRatio: 1,
                    rootBounds: null,
                    time: performance.now(),
                };
                this.seen([entry], this);
            }
            unobserve(): void {}
            disconnect(): void {}
            takeRecords(): IntersectionObserverEntry[] {
                return [];
            }
        };
    });
    await signInAs(page);
    await page.goto("/explore");
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    const maths = shelf(page, 1, "Maths");
    const tiles = maths.locator(".explore-tile");
    await expect(tiles).toHaveCount(6);
    await tiles.nth(4).focus();
    await page.keyboard.press(tab);
    await expect(tiles.nth(5)).toBeFocused();
    await expect(tiles).toHaveCount(12);
    await expect(tiles.nth(5)).toBeFocused();
    await expect(maths.locator(".paged-said")).toHaveText("6 more lessons in Grade 1 Maths");
    for (let i = 6; i < 12; i++) await page.keyboard.press(tab);
    await expect(tiles).toHaveCount(15);
    await expect(tiles.nth(11)).toBeFocused();
});
test("a search looks across every shelf, each shelf pages its own matches, and a new search starts them again", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/explore");
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    const field = page.getByRole("searchbox", { name: "Search the titles" });
    const said = page.locator(".search-found");

    // a grade folded away is still searched, and opens when it holds a match
    const grade6 = page.getByRole("button", { name: /^Grade 6, \d+ lessons$/ });
    await grade6.scrollIntoViewIfNeeded();
    await grade6.click();
    await expect(grade6).toHaveAttribute("aria-expanded", "false");
    await field.fill("ratio");
    await expect(said).toHaveText("6 lessons found");
    await expect(page).toHaveURL(/\/explore\?q=ratio$/);
    await expect(grade6).toHaveAttribute("aria-expanded", "true");
    await expect(shelf(page, 6, "Maths").locator(".explore-subject-count")).toHaveText(
        "3 of 21 match",
    );
    await expect(page.locator(".explore-grade:visible")).toHaveCount(2);
    await expect(shelf(page, 1, "Maths")).toBeHidden();

    // a shelf of results is paged like any other: its first matches, and the rest as it is scrolled
    await field.fill("water");
    await expect(said).toHaveText("43 lessons found");
    const chemistry = shelf(page, 3, "Chemistry");
    await expect(chemistry.locator(".explore-subject-count")).toHaveText("7 of 12 match");
    await chemistry.locator("h3").scrollIntoViewIfNeeded();
    await expect(chemistry.locator(".explore-tile").first()).toBeVisible();
    await chemistry.locator(".paged-end").scrollIntoViewIfNeeded();
    await expect(chemistry.locator(".explore-tile")).toHaveCount(7);
    await expect(shelf(page, 6, "Maths")).toBeHidden();

    // a new search mid-scroll starts every shelf again with its own matches, and nothing of the old
    await field.fill("circuit");
    await expect(said).toHaveText("8 lessons found");
    await expect(chemistry).toBeHidden();
    const physics = shelf(page, 3, "Physics");
    await physics.scrollIntoViewIfNeeded();
    await expect(physics.locator(".explore-subject-count")).toHaveText("4 of 12 match");
    await expect(physics.locator(".explore-tile")).toHaveCount(4);
    for (const title of await page
        .locator(".explore-tile:visible .explore-tile-title")
        .allInnerTexts())
        expect(title.toLowerCase()).not.toContain("water");

    // nothing found says what was looked for, and how to look wider
    await field.fill("zebra");
    await expect(said).toHaveText("No lesson found");
    await expect(page.getByText("No lesson matches “zebra”.")).toBeVisible();
    await expect(page.locator(".explore-grade:visible")).toHaveCount(0);
    await page.getByRole("button", { name: "Clear the search" }).click();
    await expect(said).toHaveText(/^All \d+ lessons$/);
    await expect(field).toHaveValue("");
    await expect(page).toHaveURL(/\/explore$/);

    // a result opens at its own address, and back returns to the search
    await field.fill("circuit");
    await expect(said).toHaveText("8 lessons found");
    const result = physics.locator(".explore-tile").first();
    await result.click();
    await expect(page).toHaveURL(/\/explore\/[^?]+$/);
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/explore\?q=circuit$/);
    await expect(said).toHaveText("8 lessons found");
});

test("a lesson's address opens its preview when its shelf has not read that far", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/explore/g6-year-review");
    const preview = page.getByRole("dialog");
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await expect(preview.locator(".look-words b")).toHaveText("Year review");
    await expect(page.locator('.explore-tile[href="/explore/g6-year-review"]')).toHaveCount(0);
    await expect(preview.locator(".ls-sheet").first()).toBeVisible({ timeout: 40_000 });
});
