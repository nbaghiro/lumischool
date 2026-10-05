// A game card on a lesson (.docs/game-cards.md): a grown-up's preview shows its still picture and
// plays it without recording, print gives the still picture with "Play this on screen", and a
// child's own lesson plays the round from the field and sends a `played` event.

import { expect, type Locator, type Page } from "@playwright/test";
import { readKidRecord } from "../../../engine/ui/wire";
import { countOf, start } from "../../../school/games/snake";
import { childsMap, openChildrensView, signInAs, test } from "../steps";

/** Counting in steps holds Firefly trail's first level as a card in its first try section. */
const LESSON = "g1-counting-in-steps";

/** Taps each seed of the count in turn, reaching one out of sight by tapping the field's edge nearest it. */
async function flyTheCount(page: Page, card: Locator): Promise<void> {
    const s = start(0, 1);
    const field = await card.locator(".gc-stage").boundingBox();
    if (!field) throw new Error("Missing the card's field");
    for (const n of countOf(s.L)) {
        const seed = card.locator(`[data-key="seed:${s.layout.indexOf(n)}"]`);
        for (let tries = 0; tries < 40 && (await seed.count()) > 0; tries++) {
            const box = await seed.boundingBox();
            if (!box) break;
            const cx = box.x + box.width / 2,
                cy = box.y + box.height / 2;
            await page.mouse.click(
                Math.max(field.x + 24, Math.min(field.x + field.width - 24, cx)),
                Math.max(field.y + 24, Math.min(field.y + field.height - 24, cy)),
            );
            await page.waitForTimeout(1200);
        }
        await expect(seed).toHaveCount(0);
    }
}

test.beforeEach(async ({ page }) => {
    await signInAs(page);
});

test("a grown-up's preview shows the card's still picture, plays it, records nothing and prints it", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "a lesson's card, on the desktop's Chrome");
    const sent: string[] = [];
    page.on("request", (r) => {
        if (r.method() === "POST" && r.url().includes("/events")) sent.push(r.postData() ?? "");
    });
    await page.goto(`/explore/${LESSON}`);
    const sheet = page.getByRole("dialog").locator(".ls-sheet").first();
    await expect(sheet).toBeVisible({ timeout: 40_000 });
    // by its class rather than the dialog's role, which print takes out of the accessibility tree
    const card = page.locator(".ls-sheet section.gc").first();
    await expect(card).toHaveAttribute("data-card-ready", "true", { timeout: 30_000 });
    await expect(card).toHaveAttribute("data-card-state", "poster");
    await expect(card.locator('[data-card="play"]')).toBeVisible();
    await card.locator('[data-card="play"]').click();
    await expect(card).toHaveAttribute("data-card-state", "live");
    await page.mouse.click(10, 10);

    await page.emulateMedia({ media: "print" });
    await expect(card).toHaveAttribute("data-card-state", "poster");
    await expect(page.locator(".ls-sheet .ls-game-print").first()).toHaveText(
        "Play this on screen",
    );
    await expect(card.locator('[data-card="play"]')).toBeHidden();
    await expect(card.locator(".gc-board svg").first()).toBeVisible();
    await page.emulateMedia({ media: "screen" });
    expect(sent.filter((b) => b.includes('"played"'))).toEqual([]);
});

test("a child plays a lesson's card from the field, and the round is sent as played", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "a lesson's card, on the desktop's Chrome");
    test.setTimeout(240_000);
    // the fixture's first maths day becomes the lesson that holds the card, and today is that day
    await page.route(/\/api\/kid\/[^/]+\/record$/, async (route) => {
        const response = await route.fetch();
        const record = readKidRecord(await response.json());
        if (!record) throw new Error("the record did not read");
        const maths = record.plan
            .flatMap((track) => track.days)
            .find((day) => day.lesson === "g1-counting-to-twenty");
        if (!maths) throw new Error("The fixture has no first maths lesson");
        const plan = record.plan.map((track) => ({
            ...track,
            days: track.days.map((d) =>
                d.lesson === "g1-counting-to-twenty" ? { ...d, lesson: LESSON } : d,
            ),
        }));
        await route.fulfill({ response, json: { ...record, plan, today: maths.on } });
    });
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    const meadow = map.getByRole("button", { name: /The meadow/ });
    await meadow.dispatchEvent("click");
    // a world already centred may open on the first click
    await meadow.evaluateAll((els) =>
        els[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    await expect(page.locator(".wd")).toHaveClass(/ready/, { timeout: 60_000 });
    const card = page.locator(`[data-lesson="${LESSON}"] section.gc`).first();
    await expect(card).toBeAttached({ timeout: 60_000 });
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-card-ready", "true", { timeout: 30_000 });
    const played = page.waitForRequest(
        (r) =>
            r.method() === "POST" &&
            r.url().includes("/events") &&
            (r.postData() ?? "").includes('"kind":"played"'),
        { timeout: 200_000 },
    );
    await card.locator('[data-card="play"]').click();
    await expect(card).toHaveAttribute("data-card-ready", "true", { timeout: 15_000 });
    await flyTheCount(page, card);
    await expect(card).toHaveAttribute("data-card-state", "won", { timeout: 15_000 });
    const sent = await played;
    const body = sent.postData() ?? "";
    expect(body).toContain('"game":"snake"');
    expect(body).toContain('"won":true');
    const answer = await sent.response();
    expect(answer?.ok()).toBe(true);
});
