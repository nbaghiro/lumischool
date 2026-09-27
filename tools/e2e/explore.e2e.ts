// Explore, the grown-ups' catalogue: a lesson found by grade, subject and the words of its title,
// opened as a preview over the catalogue rather than on a page of its own, read as a child meets it
// with nothing filled in, at each of its levels, printed as the sheet alone with the answers and the
// notes when they are asked for, and nothing recorded.

import { expect, type Page } from "@playwright/test";
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

/** Opens the preview's tools, which a phone folds behind one control. */
async function openTools(page: Page): Promise<void> {
    const summary = page.locator(".explore-tools > summary");
    if (await summary.isVisible()) {
        const open = await page.locator(".explore-tools").getAttribute("open");
        if (open === null) await summary.click();
    }
    await expect(page.locator(".explore-tools-of")).toBeVisible();
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
    const said = page.locator(".explore-said");
    await expect(said).toHaveText(/^All \d+ lessons$/);
    // the head is a card of its own, narrower than the shelves and centred: two rows of subjects and
    // the search, in a postcard's padding, come to about 240 px on a desk, so lessons begin at once
    const head = page.locator(".explore-row");
    if (page.viewportSize()?.width === 1440) {
        const box = await head.boundingBox();
        expect(box?.height ?? 999).toBeLessThan(260);
        expect(box?.width ?? 9999).toBeLessThan(760);
    }
    expect(await smallTargets(head)).toEqual([]);

    // narrowed by grade through the address, and by subject and words on the row, which it keeps
    await page.goto("/explore?grade=1");
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    await chooseSubject(page, "Writing");
    await expect(said).toHaveText(/^\d+ lessons match$/);
    await expect(page.locator(".explore-grade:visible")).toHaveCount(1);
    await expect(page).toHaveURL(/\/explore\?grade=1&subject=writing$/);
    await page.getByRole("searchbox", { name: "Search the titles" }).fill("sit on the line");
    await expect(said).toHaveText("1 lesson matches");
    const tile = page.getByRole("link", { name: new RegExp(TITLE) });
    await expect(tile.locator(".explore-pic > svg")).toBeAttached({ timeout: 20_000 });

    // the tile opens the preview over the catalogue, which is still behind it, at the lesson's address
    await tile.click();
    await expect(page).toHaveURL(new RegExp(`${LESSON}$`));
    const preview = page.locator("dialog.ov");
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Every lesson", level: 1 })).toBeAttached();
    // the words over the stage name the lesson before the map has come, then the world it is met in
    await expect(preview.locator(".ov-words b")).not.toBeEmpty();
    const sheet = preview.locator(".ls-sheet").first();
    await expect(sheet).toBeVisible({ timeout: 40_000 });

    // it is the child's own sheet: nothing filled in, nothing to press, and no help for a reader
    await expect(sheet.locator(".ls-answer")).toHaveCount(0);
    await expect(sheet.getByText("Look for")).toHaveCount(0);
    await expect(sheet.getByRole("button")).toHaveCount(0);

    // each level, said in the tools and in the address, and never on the sheet
    await openTools(page);
    for (const [word, level] of [
        ["Easier", "easy"],
        ["Harder", "hard"],
        ["As written", "medium"],
    ] as const) {
        await openTools(page);
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
    await expect(page.locator(".explore-row")).toBeHidden();
    await expect(preview).toBeHidden();
    await expect(printed.locator(".ls-sheet")).toBeVisible();
    await page.emulateMedia({ media: "screen" });

    // and without them, it is a child's sheet, with nothing filled in
    await openTools(page);
    await page.getByLabel("Print the answers and the notes for grown-ups").uncheck();
    await expect(
        page.getByText("It prints as a child's sheet, with nothing filled in."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Print this sheet" }).click();
    await expect(printed.locator(".ls-sheet")).toBeVisible({ timeout: 40_000 });
    expect(await printsAsked(page)).toBe(2);
    await expect(printed.locator(".ls-answer")).toHaveCount(0);
    await expect(printed.getByText("Look for")).toHaveCount(0);

    // the way back is the way in: the preview closes and the catalogue is as it was narrowed
    await page.goBack();
    await expect(preview).toHaveCount(0);
    await expect(page).toHaveURL(/\/explore\?grade=1&subject=writing&q=sit\+on\+the\+line$/);
    await expect(said).toHaveText("1 lesson matches");

    // and reading recorded nothing
    expect(await logged(page)).toBe(before);
});

test("a lesson's own address opens the preview over Explore, and back leaves the parent on Explore", async ({
    page,
}) => {
    await signInAs(page);
    // as a bookmark, a shared link or a new tab opens it, with no entry of this app's behind it
    await page.goto(LESSON);
    const preview = page.locator("dialog.ov");
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
    const said = page.locator(".explore-said");
    const row = page.locator(".explore-row");
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
    await expect(said).toHaveText("1 lesson matches");
});

test("a lesson Explore does not have says so over the catalogue", async ({ page }) => {
    await signInAs(page);
    await page.goto("/explore/no-such-lesson");
    await atScreen(page, page.getByRole("heading", { name: "There is no such lesson" }));
    await expect(page.locator("dialog.ov")).toHaveCount(0);
    // the catalogue itself is under the note, so there is nowhere else to go
    await expect(page.getByRole("heading", { name: "Every lesson", level: 1 })).toBeVisible();
    await expect(page.locator(".explore-tile").first()).toBeVisible();
});
