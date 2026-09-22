// Explore, the grown-ups' catalogue: a lesson found by grade, subject and the words of its title,
// read at each of its levels with its answers, the level said on the grown-up's card and never on the
// sheet, printed as the sheet alone, and nothing recorded.

import { expect, type Page } from "@playwright/test";
import { atScreen, signInAs, smallTargets, test } from "./steps";

/** How many events the family's log holds, as the signed-in grown-up on this page reads it. */
const logged = (page: Page): Promise<number> =>
    page.evaluate(async (): Promise<number> => {
        const read = (await (await fetch("/api/events")).json()) as { events?: unknown[] };
        return read.events?.length ?? -1;
    });

const TITLE = "Letters that sit on the line";

test("a grown-up finds a lesson in Explore, reads it at each level with its answers, prints it as the sheet alone, and nothing is recorded", async ({
    page,
}) => {
    await signInAs(page);
    const before = await logged(page);
    await page
        .getByRole("navigation", { name: "The grown-ups' places" })
        .getByRole("link", { name: "Explore" })
        .click();
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    const said = page.locator(".explore-said");
    await expect(said).toHaveText(/^All \d+ lessons$/);
    // the card is compact: one line of words, the grade row, the subject row and the search on one
    // row with its count, so on a desk the whole card is under 420 px, with every chip a target
    const card = page.locator(".explore > .postcard").first();
    if (page.viewportSize()?.width === 1440)
        expect((await card.boundingBox())?.height ?? 999).toBeLessThan(420);
    expect(await smallTargets(card.locator(".explore-filters"))).toEqual([]);

    // narrowed by grade, subject and words, which the address keeps
    await page.getByRole("radio", { name: "Grade 1", exact: true }).check();
    await page.getByRole("radio", { name: "Writing", exact: true }).check();
    await expect(said).toHaveText(/^\d+ lessons match$/);
    await expect(page.locator(".explore-grade:visible")).toHaveCount(1);
    await expect(page).toHaveURL(/\/explore\?grade=1&subject=writing$/);
    await page.getByRole("searchbox", { name: "Search the titles" }).fill("sit on the line");
    await expect(said).toHaveText("1 lesson matches");
    const tile = page.getByRole("link", { name: new RegExp(TITLE) });
    await expect(tile.locator(".explore-pic > svg")).toBeAttached({ timeout: 20_000 });

    // the lesson, with its answers and what a grown-up looks for in the pieces they read
    await tile.click();
    await expect(page).toHaveURL(/\/explore\/writing-letters-on-the-line$/);
    await atScreen(page, page.getByRole("heading", { name: TITLE, level: 1 }));
    const sheet = page.locator(".explore-sheet .ls-sheet");
    await expect(sheet).toBeVisible({ timeout: 20_000 });
    await expect(sheet.locator(".ls-answer").first()).toBeVisible();
    await expect(sheet.getByText("Look for").first()).toBeVisible();
    await expect(sheet.getByRole("button")).toHaveCount(0);

    // each level, said on the card and never on the sheet
    for (const [word, level] of [
        ["Easier", "easy"],
        ["Harder", "hard"],
        ["As written", "medium"],
    ] as const) {
        await page.getByRole("radio", { name: word }).check();
        await expect(page.locator(".explore-sheet")).toHaveAttribute("data-level", level);
        await expect(page).toHaveURL(
            level === "medium" ? /line$/ : new RegExp(`\\?level=${level}$`),
        );
        // the sheet's own corner and heading, which a child reads, never name the level
        const corner = await sheet.locator(".j-strip, .ls-head").allInnerTexts();
        expect(corner.join(" ")).not.toMatch(/easier|harder|as written/i);
    }

    // printed, it is the sheet alone; without the key, nothing is filled in for the grown-up
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("heading", { name: TITLE, level: 1 })).toBeHidden();
    await expect(sheet).toBeVisible();
    await page.emulateMedia({ media: "screen" });
    await page.getByLabel("Show the answers and the notes for grown-ups").uncheck();
    await expect(sheet.getByText("Look for")).toHaveCount(0);
    await expect(
        page.getByText("It prints as a child's sheet, with nothing filled in."),
    ).toBeVisible();

    // the way back keeps what the catalogue was narrowed to
    await page.getByRole("link", { name: "Every lesson", exact: true }).click();
    await expect(page).toHaveURL(/\/explore\?grade=1&subject=writing&q=sit\+on\+the\+line$/);
    await expect(said).toHaveText("1 lesson matches");

    // and reading recorded nothing
    expect(await logged(page)).toBe(before);
});

test("a lesson Explore does not have says so, with the way back", async ({ page }) => {
    await signInAs(page);
    await page.goto("/explore/no-such-lesson");
    await atScreen(page, page.getByRole("heading", { name: "There is no such lesson" }));
    await page.getByRole("link", { name: "Every lesson", exact: true }).click();
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
});
