// A program a sheet shows plays under its scene in Explore's preview: Run walks a grade one robot
// frame by frame, a grade two child's lamps switch and add up, a grade five list's cells are redrawn
// as a for each walks them, a grade five die rolls a fresh number on each Run and says it in a
// bubble, and a grade six block that uses itself draws its tree. Nothing prints but the sheet. In a
// child's own question that asks where the program ends, Run comes only once it is answered
// (.docs/coding.md, "On the lesson page").

import { expect, type Locator, type Page } from "@playwright/test";
import { readKidRecord } from "../../../engine/ui/wire";
import { childsMap, openChildrensView, signInAs, smallTargets, test } from "../steps";

/** Opens a lesson's preview and waits for its sheet. */
async function openLesson(page: Page, id: string): Promise<Locator> {
    await page.goto(`/explore/${id}`);
    const sheet = page.getByRole("dialog").locator(".ls-sheet").first();
    await expect(sheet).toBeVisible({ timeout: 40_000 });
    await expect(sheet.locator(".cr").first()).toBeVisible({ timeout: 20_000 });
    return sheet;
}

/** The scene a set of controls plays, which is drawn just before them. */
const sceneOf = (controls: Locator): Locator =>
    controls.locator("xpath=preceding-sibling::div[contains(@class,'scene-tile')][1]");

/** Marks every drawing in a scene, so a drawing drawn again is one without the mark. */
async function markDrawings(scene: Locator): Promise<void> {
    await scene
        .locator("svg[data-visual]")
        .evaluateAll((els) => els.forEach((el) => el.setAttribute("data-was", "")));
}

const redrawn = (scene: Locator, type: string): Locator =>
    scene.locator(`svg[data-visual="${type}"]:not([data-was])`);

test.beforeEach(async ({ page }) => {
    await signInAs(page);
});

test("a grade one robot walks its program a frame at a time, and the controls leave the paper", async ({
    page,
}) => {
    const sheet = await openLesson(page, "coding-following-instructions");
    const controls = sheet.locator(".cr").first();
    const scene = sceneOf(controls);
    await expect(scene.locator('svg[data-visual="maze"]')).toHaveCount(1);
    expect(await smallTargets(controls)).toEqual([]);
    await markDrawings(scene);
    const run = controls.getByRole("button", { name: "Run", exact: true });
    await run.click();
    await expect(controls.locator(".cr-said")).toHaveText("Running.");
    await expect(run).toBeDisabled();
    await expect(redrawn(scene, "maze")).toHaveCount(1);
    await expect(controls.locator(".cr-said")).toHaveText(
        /^It (reached the flag|stopped on column \d+, row \d+|bumped)/,
        { timeout: 30_000 },
    );
    await expect(run).toBeEnabled();

    await controls.getByRole("button", { name: "Start again" }).click();
    await expect(controls.locator(".cr-said")).toBeHidden();
    await controls.getByRole("button", { name: "Step" }).click();
    await expect(controls.locator(".cr-said")).toHaveText(
        /^Step 1 of \d+\. Line 1: .+\. The robot is on column \d+, row \d+\.$/,
    );

    await page.emulateMedia({ media: "print" });
    await expect(sheet.locator(".cr").first()).toBeHidden();
    await page.emulateMedia({ media: "screen" });
});

test("a grade two child switches the lamps and reads the number they make", async ({ page }) => {
    const sheet = await openLesson(page, "coding-lamps-that-count");
    const toy = sheet.locator('.cr[data-mode="toy"]').first();
    await expect(toy).toBeVisible();
    expect(await smallTargets(toy)).toEqual([]);
    const scene = sceneOf(toy);
    await markDrawings(scene);
    const eight = toy.getByRole("button", { name: "Lamp 8" });
    const was = await eight.getAttribute("aria-pressed");
    await eight.click();
    await expect(eight).toHaveAttribute("aria-pressed", was === "true" ? "false" : "true");
    await expect(toy.locator(".cr-said")).toHaveText(
        /^The 8 lamp is (on|off)\. The lamps show \d+\.$/,
    );
    await expect(redrawn(scene, "lamps")).toHaveCount(1);
    await toy.getByRole("button", { name: "Start again" }).click();
    await expect(eight).toHaveAttribute("aria-pressed", was ?? "false");
});

test("a grade five list is walked item by item by a for each", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const sheet = await openLesson(page, "coding-a-repeat-through-a-list");
    const controls = sheet.locator(".cr").first();
    const scene = sceneOf(controls);
    await expect(scene.locator('svg[data-visual="listbox"]')).toHaveCount(1);
    await markDrawings(scene);
    const step = controls.getByRole("button", { name: "Step" });
    await step.click();
    await step.click();
    await expect(controls.locator(".cr-said")).toHaveText(
        /^Step 2 of \d+\. Line 2: for each h in hops\./,
    );
    await expect(redrawn(scene, "listbox")).toHaveCount(1);
    await expect(redrawn(scene, "program")).toHaveCount(1);
    await controls.getByRole("button", { name: "Run", exact: true }).click();
    await expect(controls.locator(".cr-said")).toHaveText(/^It stopped on column \d+, row 1\./);
});

test("a grade five die rolls a fresh number on each Run and says it in a bubble", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const sheet = await openLesson(page, "coding-random-numbers-and-a-fair-die");
    const controls = sheet.locator(".cr").first();
    const run = controls.getByRole("button", { name: "Run", exact: true });
    const rolls = new Set<string>();
    for (let i = 0; i < 20 && rolls.size < 2; i++) {
        await run.click();
        const said = controls.locator(".cr-said");
        await expect(said).toHaveText(/random gave \d/);
        const roll = /random gave (\d)/.exec((await said.textContent()) ?? "")?.[1] ?? "";
        expect(Number(roll)).toBeGreaterThanOrEqual(1);
        expect(Number(roll)).toBeLessThanOrEqual(6);
        await expect(controls.locator(".cr-bubble")).toContainText(`It says ${roll}.`);
        await expect(controls.locator(".cr-bubble svg")).toBeVisible();
        rolls.add(roll);
    }
    expect(rolls.size, "twenty Runs gave only one number").toBeGreaterThan(1);
});

test("a grade six block that uses itself draws its tree", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const sheet = await openLesson(page, "coding-a-block-that-uses-itself");
    const controls = sheet.locator(".cr").first();
    const scene = sceneOf(controls);
    await markDrawings(scene);
    await controls.getByRole("button", { name: "Step" }).click();
    await expect(controls.locator(".cr-said")).toHaveText(/^Step 1 of \d+\. Line \d+: .+\./);
    await expect(redrawn(scene, "program")).toHaveCount(1);
    await controls.getByRole("button", { name: "Run", exact: true }).click();
    await expect(controls.locator(".cr-said")).toHaveText(/^It drew /);
    await expect(redrawn(scene, "turtle")).toHaveCount(1);
});

test("a child's question about where the robot stops offers Run only once it is answered", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    // coding is not in grade one's plan, so the record puts today's lesson on a coding one
    const lesson = "coding-following-instructions";
    await page.route(/\/api\/kid\/[^/]+\/record$/, async (route) => {
        const response = await route.fetch();
        const record = readKidRecord(await response.json());
        if (!record) throw new Error("the record did not read");
        const first = record.plan.flatMap((track) => track.days).find((d) => d.kind === "lesson");
        if (!first) throw new Error("the plan has no lesson day");
        const plan = record.plan.map((track, i) => ({
            ...track,
            days: [
                ...(i === 0 ? [{ on: first.on, kind: "lesson" as const, lesson }] : []),
                ...track.days.filter((d) => d.on !== first.on),
            ],
        }));
        const tracks = [
            ...record.tracks.filter((t) => t.track !== "coding"),
            { track: "coding", on: true, perWeek: 1, day: first.on, own: true },
        ];
        await route.fulfill({ response, json: { ...record, tracks, plan, today: first.on } });
    });
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    const meadow = map.getByRole("button", { name: /The meadow/ });
    await meadow.dispatchEvent("click");
    await meadow.dispatchEvent("click");
    const question = page
        .locator(`[data-lesson="${lesson}"] .ls-q`)
        .filter({ has: page.locator('svg[data-visual="maze"]') })
        .filter({ has: page.getByRole("button", { name: "Check", exact: true }) })
        .first();
    await expect(question).toBeAttached({ timeout: 60_000 });
    await question.scrollIntoViewIfNeeded();
    const run = question.getByRole("button", { name: "Run", exact: true });
    await expect(question.locator(".cr-said")).toHaveText(/^Work it out first\./);
    await expect(run).toHaveCount(0);
    await expect(question.getByRole("button", { name: "Step", exact: true })).toHaveCount(0);

    // the robot starts on column 1, row 1 and every program moves it, so this is never right
    const boxes = question.locator("input.ls-in");
    for (let i = 0; i < 6 && !(await question.evaluate((q) => q.classList.contains("done"))); i++) {
        await boxes.nth(0).fill("1");
        await boxes.nth(1).fill("1");
        await question.getByRole("button", { name: "Check", exact: true }).click();
        await expect(question.locator(".ls-strip.taken")).toBeAttached();
        if (!(await question.evaluate((q) => q.classList.contains("done"))))
            await expect(run, "a wrong try does not open Run").toHaveCount(0);
        await expect(question.locator(".ls-strip.taken")).toHaveCount(0);
    }
    await expect(question).toHaveClass(/\bdone\b/);
    await expect(run).toBeVisible();
    // the paper is drawn scaled, so the button is pressed where it is rather than scrolled to
    await run.dispatchEvent("click");
    await expect(question.locator(".cr-said")).toHaveText(
        /^Your answer was 1, 1\. It (reached the flag|stopped on column \d+, row \d+)/,
    );
});
