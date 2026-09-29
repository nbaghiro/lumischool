// A child at grade five or six, and one moved up into each: every one opens on their own year's land,
// the journal walks its first world, and the calendar plans that year's lessons (.docs/grades-5-6.md).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import { NOTICE_VERSION } from "../../school/family/privacy";
import {
    address,
    askForCode,
    atScreen,
    BASE,
    childsMap,
    FAMILY_PIN,
    openChildrensView,
    test,
    typeCode,
} from "./steps";

const LESSONS = join(import.meta.dirname, "../../content/curriculum/lessons");
const SOURCES = readdirSync(LESSONS)
    .filter((f) => f.endsWith(".lumi"))
    .map((f) => readFileSync(join(LESSONS, f), "utf8"));

/** Every title of one grade's lessons, as the calendar writes it. */
const titlesOf = (grade: number): Set<string> =>
    new Set(
        SOURCES.filter((text) =>
            new RegExp(String.raw`^\s*lesson\s+\S+[^\n{]*\bgrade=${grade}\b`, "m").test(text),
        ).flatMap((text) => /^\s*title\s+"([^"]+)"/m.exec(text)?.[1] ?? []),
    );

/** Each new year, the world its journal opens on, and the year before's last world. */
const YEARS = [
    { grade: 5, first: "The canal town", behind: /^The volcano island\./ },
    { grade: 6, first: "The midnight sun", behind: /^The old city\./ },
] as const;

type Year = (typeof YEARS)[number];

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

/** The id and grade of the kid a response carries as `kid`. */
async function kidOf(response: {
    json(): Promise<unknown>;
}): Promise<{ id: string; grade: number }> {
    const body: unknown = await response.json();
    const kid = isRecord(body) ? body.kid : null;
    if (!isRecord(kid) || typeof kid.id !== "string" || typeof kid.grade !== "number")
        throw new Error("the response carries no kid");
    return { id: kid.id, grade: kid.grade };
}

/** A new family with one child at `grade`, signed in on `page`; the child's id. */
async function familyWith(page: Page, name: string, grade: number): Promise<string> {
    const own = await page.context().newPage();
    let id = "";
    try {
        const email = address("g56", test.info());
        await askForCode(own, email, { name: "Test Parent", family: "Test Family" });
        await typeCode(own, own.context().request, email);
        await atScreen(own, own.getByRole("heading", { name: "Hello, Test Parent" }));
        const added = await own.context().request.post("/api/kids", {
            headers: { Origin: BASE },
            data: { name, grade, consent: { notice: NOTICE_VERSION } },
        });
        expect(added.ok(), await added.text()).toBe(true);
        id = (await kidOf(added)).id;
        const pin = await own.context().request.post("/api/family/pin", {
            headers: { Origin: BASE },
            data: { pin: FAMILY_PIN },
        });
        expect(pin.ok(), await pin.text()).toBe(true);
    } finally {
        await own.close();
    }
    await page.goto("/");
    await expect(page.getByRole("link", { name: `Open ${name}'s view` })).toBeVisible({
        timeout: 15_000,
    });
    return id;
}

/** The calendar plans only the year's own lessons for the kid, and marks none of their days missed. */
async function plansTheYear(page: Page, kid: string, year: Year): Promise<void> {
    await page
        .getByRole("navigation", { name: "The grown-ups' places" })
        .getByRole("link", { name: "Calendar", exact: true })
        .click();
    const cells = page.locator(`.cal-cell[data-kid="${kid}"]`);
    await expect(cells.locator(".cal-sticker").first()).toBeVisible({ timeout: 30_000 });
    const titles = await cells.locator(".gc-sticker-title").allInnerTexts();
    expect(titles.length).toBeGreaterThan(0);
    const own = titlesOf(year.grade);
    expect(titles.filter((t) => !own.has(t.trim()))).toEqual([]);
    await expect(cells.locator(".cal-sticker.missed")).toHaveCount(0);
}

/** The child's own map opens on the year's land with its title, key and compass, at its first world. */
async function opensOnTheYear(page: Page, name: string, year: Year): Promise<void> {
    await openChildrensView(page, [name]);
    const map = childsMap(page, name);
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    for (const piece of [".ow-title", ".ow-key", ".ow-compass"])
        await expect(map.locator(piece), `${name}'s own land has its ${piece}`).toHaveCount(1);
    const first = map.getByRole("button", { name: new RegExp(year.first) });
    await expect(first).toHaveAttribute("tabindex", "0");
    await expect(first).not.toHaveAttribute("aria-disabled", "true");
    await expect(first).toBeInViewport();
}

/** The first world's journal opens on today's lessons of the year, and none of the year before. */
async function walksTheFirstWorld(page: Page, name: string, year: Year): Promise<void> {
    const map = childsMap(page, name);
    const first = map.getByRole("button", { name: new RegExp(year.first) });
    await first.dispatchEvent("click");
    // a world already centred may open on the first click
    await first.evaluateAll((els) =>
        els[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    const roll = page.locator(".wd");
    await expect(roll).toHaveClass(/ready/, { timeout: 60_000 });
    await expect(roll.locator(".w.hand")).toHaveText(year.first);
    await expect(
        roll.getByText(new RegExp(`· Grade ${year.grade} · Unit \\d`)).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(roll.getByText(new RegExp(`· Grade ${year.grade - 1} · `))).toHaveCount(0);
}

for (const year of YEARS) {
    test(`a grade ${year.grade} child's map opens on their own year's land, the journal walks ${year.first.toLowerCase()}, and the calendar plans the year`, async ({
        page,
    }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        const kid = await familyWith(page, "Ada", year.grade);
        await plansTheYear(page, kid, year);
        await page.goto("/");
        await opensOnTheYear(page, "Ada", year);
        await walksTheFirstWorld(page, "Ada", year);
    });

    test(`a child moved up to grade ${year.grade} opens on the new year's land with the last one behind, and no day of theirs is missed`, async ({
        page,
    }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        const kid = await familyWith(page, "Ben", year.grade - 1);
        const moved = await page.request.post(`/api/kids/${kid}/move-up`, {
            headers: { Origin: BASE },
            data: { grade: year.grade },
        });
        expect(moved.ok(), await moved.text()).toBe(true);
        expect((await kidOf(moved)).grade).toBe(year.grade);
        await page.reload();
        await plansTheYear(page, kid, year);
        await page.goto("/");
        await opensOnTheYear(page, "Ben", year);
        // the year before's last world stays on the map behind them, across the sea; the ship's way
        // in is drawn on the day the new year's first world is first stamped, which a new move has
        // not reached
        const map = childsMap(page, "Ben");
        await expect(map.getByRole("button", { name: year.behind })).toHaveCount(1);
        await walksTheFirstWorld(page, "Ben", year);
    });
}
