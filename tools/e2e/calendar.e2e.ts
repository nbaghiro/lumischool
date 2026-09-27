import { expect, type Locator } from "@playwright/test";
import { errorCard, signInAs, smallTargets, test } from "./steps";

test("the merged calendar saves extra sessions, removes only one, and preserves the change across reloads", async ({
    page,
}, info) => {
    await signInAs(page);
    await page
        .getByRole("navigation", { name: "The grown-ups' places" })
        .getByRole("link", { name: "Calendar", exact: true })
        .click();
    await expect(page.getByRole("heading", { name: "The calendar", exact: true })).toBeVisible();
    await expect(errorCard(page)).toHaveCount(0);
    await expect(
        page
            .getByRole("navigation", { name: "The grown-ups' places" })
            .getByRole("link", { name: "Change the plan" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Rosie", exact: true }).click();
    const detail = page.locator(".cp-detail");
    const before = await detail.locator(".cp-agenda").count();
    await detail.getByRole("button", { name: "Add a lesson", exact: true }).click();
    const modal = page.getByRole("dialog");
    const first = modal.locator(".cp-library-row").first();
    await first.getByRole("button", { name: "Add", exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(detail.locator(".cp-agenda")).toHaveCount(before + 1);
    await expect(page.locator(".cp-said")).toHaveCount(0);
    await detail.getByRole("button", { name: "Add a lesson", exact: true }).click();
    await first.getByRole("button", { name: "Add", exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(detail.locator(".cp-agenda")).toHaveCount(before + 2);
    await page.reload();
    await expect(detail.locator(".cp-agenda")).toHaveCount(before + 2);
    await detail
        .locator(".cp-agenda")
        .last()
        .getByRole("button", { name: "Move / edit", exact: true })
        .click();
    await modal.getByRole("button", { name: "Remove session", exact: true }).click();
    await modal.getByRole("button", { name: "Remove this session", exact: true }).click();
    await expect(detail.locator(".cp-agenda")).toHaveCount(before + 1);
    await page.getByRole("button", { name: "Put it back", exact: true }).click();
    await expect(detail.locator(".cp-agenda")).toHaveCount(before + 2);
    await detail.getByRole("button", { name: "Day off / family activity", exact: true }).click();
    await modal.getByRole("button", { name: "A day off", exact: true }).click();
    await modal.getByRole("button", { name: "Keep this", exact: true }).click();
    await expect(detail.locator(".cp-agenda")).toHaveCount(0);
    await page.getByRole("button", { name: "For later", exact: true }).click();
    await expect(modal.locator(".cp-later")).toHaveCount(2);
    await modal.getByRole("button", { name: "Choose a date", exact: true }).first().click();
    await modal.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(modal).toContainText("day off");
    await modal.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Put it back", exact: true }).click();
    await expect(detail.locator(".cp-agenda")).toHaveCount(before + 2);
    await page.getByRole("button", { name: "Subjects & pace", exact: true }).click();
    await page.getByRole("button", { name: "Rosie, Maths, 2 days a week", exact: true }).click();
    await modal.getByLabel("Sessions on each chosen day").fill("2");
    await modal.getByRole("button", { name: "Apply routine", exact: true }).click();
    await expect(modal).toHaveCount(0);
    const notice = page.locator(".cp-said");
    await expect(notice.locator(".say.success.dismissible")).toBeVisible();
    const close = notice.getByRole("button", { name: "Dismiss message", exact: true });
    const bounds = await notice.boundingBox();
    const closeBounds = await close.boundingBox();
    if (!bounds || !closeBounds) throw new Error("Missing calendar notice");
    expect(closeBounds.x).toBeGreaterThanOrEqual(bounds.x);
    expect(closeBounds.x + closeBounds.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    await close.click();
    await expect(notice).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Put it back", exact: true })).toHaveCount(0);
    await page.reload();
    await expect(
        page
            .locator(".gp-subj")
            .filter({ has: page.getByRole("heading", { name: "Maths", exact: true }) }),
    ).toContainText("4 sessions a week");
    await page.getByRole("button", { name: "The month", exact: true }).click();
    await expect(page.locator(".cp-month-day").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
    await page.screenshot({ path: info.outputPath("calendar.png"), fullPage: true });
    await page.goto("/calendar?view=subjects");
    await expect(page).toHaveURL(/\/calendar\?view=subjects/);
    // a view that no longer exists opens the week rather than an empty page
    await page.goto("/calendar?view=year");
    await expect(page.getByRole("button", { name: "The week", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
});

test("busy days keep every child's lessons inside the calendar across views", async ({
    page,
}, info) => {
    await signInAs(page);
    await page
        .getByRole("navigation", { name: "The grown-ups' places" })
        .getByRole("link", { name: "Calendar", exact: true })
        .click();
    const detail = page.locator(".cp-detail");
    await expect(detail.getByRole("button", { name: "Add a lesson", exact: true })).toBeVisible();
    const before = await detail.locator(".cp-agenda").count();
    for (let n = 0; n < 6; n++) {
        await detail.getByRole("button", { name: "Add a lesson", exact: true }).click();
        const modal = page.getByRole("dialog");
        await modal
            .locator(".cp-library-row")
            .first()
            .getByRole("button", { name: "Add", exact: true })
            .click();
        await expect(modal).toHaveCount(0);
        await expect(detail.locator(".cp-agenda")).toHaveCount(before + n + 1);
        await expect(page.locator(".cp-said")).toHaveCount(0);
    }
    const checkCells = async (): Promise<void> => {
        expect(
            await page.locator(".cp-cell").evaluateAll((cells) =>
                cells.flatMap((cell) => {
                    const bounds = cell.getBoundingClientRect();
                    const add = cell.querySelector(".gc-more")?.getBoundingClientRect();
                    return [...cell.querySelectorAll(".gc-sticker")]
                        .filter((card) => {
                            const r = card.getBoundingClientRect();
                            return (
                                r.bottom > (add?.top ?? bounds.bottom) + 1 ||
                                r.left < bounds.left - 1 ||
                                r.right > bounds.right + 1
                            );
                        })
                        .map(() => cell.textContent?.slice(0, 80));
                }),
            ),
        ).toEqual([]);
        if ((page.viewportSize()?.width ?? 0) > 700) {
            expect(
                await page.locator(".cp-day").evaluateAll((days) => {
                    const rows = days.map((day) =>
                        [...day.querySelectorAll(".cp-cell")].map(
                            (cell) => cell.getBoundingClientRect().top,
                        ),
                    );
                    return rows.every((row) =>
                        row.every((top, i) => Math.abs(top - (rows[0]?.[i] ?? top)) < 1),
                    );
                }),
            ).toBe(true);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
    };
    await checkCells();
    await page.getByRole("checkbox", { name: /weekends/i }).check();
    await checkCells();
    await page.screenshot({ path: info.outputPath("busy-week.png"), fullPage: true });
    await page.getByRole("button", { name: "The month", exact: true }).click();
    await expect(page.locator(".cp-month-day").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
    await page.getByRole("button", { name: "Subjects & pace", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Rosie", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
});

/** The workspace at `/calendar?v2`: the plan is already there, and the shelf holds what is not. */
test("the calendar workspace opens on the plan, with the shelf holding what is not placed", async ({
    page,
}, info) => {
    await signInAs(page);
    await page.goto("/calendar?v2");
    await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await expect(page.locator(".c2-day").first()).toBeVisible();
    // a family of several opens on everyone, so the week holds every child at once
    await expect(page.getByRole("button", { name: "Everyone", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    expect(
        new Set(await page.locator(".c2-cell").evaluateAll((c) => c.map((x) => x.dataset.kid)))
            .size,
    ).toBeGreaterThan(1);
    // the week it opens on carries the child's default curriculum, without anyone planning it
    await expect(page.locator(".c2-sticker").first()).toBeVisible();
    const shelf = page.locator(".c2-shelf");
    await expect(shelf).toContainText("to place");
    await expect(shelf.locator("li button").first()).toBeVisible();
    for (const view of ["Day", "Month", "Term", "Week"]) {
        await page.getByRole("button", { name: view, exact: true }).click();
        await expect(page.getByRole("button", { name: view, exact: true })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        await expect(errorCard(page)).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
    expect(await smallTargets(page.locator(".c2"))).toEqual([]);
    await page.screenshot({ path: info.outputPath("workspace.png"), fullPage: true });
    // what the evening prints is the day itself, without the chooser, the steps or the day before
    await page.getByRole("button", { name: "Day", exact: true }).click();
    // everyone is in view, so the day holds one agenda a child
    await expect(page.locator(".c2-agenda").first()).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".c2-views")).toBeHidden();
    await expect(page.locator(".c2-steps")).toBeHidden();
    await expect(page.locator(".c2-yesterday")).toBeHidden();
    await expect(page.locator(".c2-agenda").first()).toBeVisible();
    await page.emulateMedia({ media: null });
});

test("a lesson is placed from the shelf, moved between days and taken out, by keyboard", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/calendar?v2");
    const shelf = page.locator(".c2-shelf");
    const first = shelf.locator("li button").first();
    const title = ((await first.textContent()) ?? "").replace("set aside", "").trim();
    await first.click();
    await expect(page.locator(".c2-said")).toContainText("in your hand");
    // the days that can take it say so, and pressing one places it
    const target = page.locator(".c2-day").last().getByRole("button", { name: "Put it here" });
    await expect(target).toBeVisible();
    await target.click();
    await expect(page.locator(".c2-said")).toContainText(`Put ${title}`);
    const placed = page.locator(".c2-day").last().locator(".c2-sticker", { hasText: title });
    await expect(placed).toHaveCount(1);
    // pick the placed one up and move it a day earlier
    await placed.getByRole("button", { name: /^Pick up/ }).click();
    const earlier = page.locator(".c2-day").nth(3).getByRole("button", { name: "Put it here" });
    await earlier.click();
    await expect(page.locator(".c2-said")).toContainText(`Moved ${title}`);
    await expect(
        page.locator(".c2-day").nth(3).locator(".c2-sticker", { hasText: title }),
    ).toHaveCount(1);
    // and take it out again, back to the shelf
    await page
        .locator(".c2-day")
        .nth(3)
        .locator(".c2-sticker", { hasText: title })
        .getByRole("button", { name: /^Pick up/ })
        .click();
    await shelf.getByRole("button", { name: "Take it out of the plan" }).click();
    await expect(page.locator(".c2-said")).toContainText(`Took ${title} out`);
    await expect(
        page.locator(".c2-day").nth(3).locator(".c2-sticker", { hasText: title }),
    ).toHaveCount(0);
    // and putting a lesson down leaves the plan as it was
    await shelf.locator("li button").first().click();
    await expect(page.locator(".c2-said")).toContainText("in your hand");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Put it here" })).toHaveCount(0);
});

test("the workspace clears a child's plan ahead and puts it back", async ({ page }) => {
    await signInAs(page);
    await page.goto("/calendar?v2");
    // the week shows every child, so clearing one child's plan leaves the others alone
    await expect(page.locator(".c2-cell").first()).toBeVisible();
    const who = await page.locator(".c2-cell").first().getAttribute("data-kid");
    const mine = page.locator(`.c2-cell[data-kid="${who ?? ""}"] .c2-sticker`);
    await expect(mine.first()).toBeVisible();
    const before = await mine.count();
    const others = await page.locator(".c2-sticker").count();
    await page
        .locator(`.c2-shelf-kid[data-kid="${who ?? ""}"]`)
        .getByRole("button", { name: /^Start .* plan again$/ })
        .click();
    const modal = page.getByRole("dialog");
    await expect(modal).toContainText("Finished work stays");
    await modal.getByRole("button", { name: "Clear the plan ahead", exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(mine).toHaveCount(0);
    await expect(page.locator(".c2-sticker")).toHaveCount(others - before);
    await page.getByRole("button", { name: "Put it back", exact: true }).click();
    await expect(mine).toHaveCount(before);
});

/** A day already gone says how it went: the mark on the cell, the word in the day. */
test("a past day carries how its lessons went", async ({ page }) => {
    await signInAs(page);
    await page.goto("/calendar?v2");
    const item = page.locator(".c2-shelf li button").first();
    await expect(item).toBeVisible();
    const lesson = (await item.getAttribute("data-lesson")) ?? "";
    const track = (await item.getAttribute("data-track")) ?? "";
    const kid = (await page.locator(".c2-cell").first().getAttribute("data-kid")) ?? "";
    expect(lesson && track && kid).toBeTruthy();
    // nothing a fresh family has is in the past, so the day that went by is written into the log
    const gone = await page.evaluate(
        async ([kidId, lessonId, trackId]) => {
            const d = new Date();
            do d.setDate(d.getDate() - 1);
            while (d.getDay() === 0 || d.getDay() === 6);
            const on = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const res = await fetch("/api/events", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    events: [
                        {
                            id: crypto.randomUUID(),
                            kid_id: kidId,
                            kind: "plan-changed",
                            at: new Date().toISOString(),
                            data: {
                                op: {
                                    op: "session",
                                    id: crypto.randomUUID(),
                                    track: trackId,
                                    source: null,
                                    onDay: on,
                                    lesson: lessonId,
                                    kind: "lesson",
                                    minutes: 20,
                                    order: 1000,
                                    note: "",
                                    removed: false,
                                },
                            },
                        },
                    ],
                }),
            });
            if (!res.ok) throw new Error(`the day that went by was refused: ${res.status}`);
            return on;
        },
        [kid, lesson, track],
    );
    await page.goto(`/calendar?v2&view=week&at=${gone}&who=${kid}`);
    const cell = page.locator(`.c2-day[data-date="${gone}"] .c2-cell[data-kid="${kid}"]`);
    await expect(cell.locator(".c2-sticker")).toHaveCount(1);
    // the mark is quiet: a state on the sticker, not a label across the cell
    await expect(cell.locator('.c2-mark[data-state="missed"]')).toHaveCount(1);
    await expect(cell).not.toContainText("Not done");
    await page.goto(`/calendar?v2&view=day&at=${gone}&who=${kid}`);
    await expect(page.locator(".c2-agenda")).toContainText("not done");
});

/** The hand's path: the drag events a browser sends end in the same `place` the keyboard uses. */
test("a lesson is dragged from the shelf onto a day, and on to another day", async ({ page }) => {
    await signInAs(page);
    await page.goto("/calendar?v2");
    const item = page.locator(".c2-shelf li button").first();
    await expect(item).toBeVisible();
    const title = ((await item.textContent()) ?? "").replace("set aside", "").trim();
    const kid = (await page.locator(".c2-cell").first().getAttribute("data-kid")) ?? "";
    // the drag is sent as its events: a synthetic pointer drag does not start HTML5 drag here
    const dragOnto = async (from: Locator, to: Locator): Promise<void> => {
        const day = await to.elementHandle();
        if (!day) throw new Error("the day to drop on is not on the page");
        await from.evaluate((source, target) => {
            const data = new DataTransfer();
            const send = (el: Element, type: string): void => {
                el.dispatchEvent(
                    new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data }),
                );
            };
            send(source, "dragstart");
            send(target, "dragover");
            send(target, "drop");
            send(source, "dragend");
        }, day);
    };
    const cell = page.locator(".c2-day").last().locator(`.c2-cell[data-kid="${kid}"]`);
    await dragOnto(item, cell);
    await expect(page.locator(".c2-said")).toContainText(`Put ${title}`);
    const placed = cell.locator(".c2-sticker", { hasText: title });
    await expect(placed).toHaveCount(1);
    const earlier = page.locator(".c2-day").nth(3).locator(`.c2-cell[data-kid="${kid}"]`);
    await dragOnto(placed.locator(".gc-sticker-in"), earlier);
    await expect(page.locator(".c2-said")).toContainText(`Moved ${title}`);
    await expect(earlier.locator(".c2-sticker", { hasText: title })).toHaveCount(1);
    await expect(cell.locator(".c2-sticker", { hasText: title })).toHaveCount(0);
});

/** The pointer itself, pressed where a hand presses: on the lesson's drawing. */
test("a placed lesson is dragged to another day by a pointer on its drawing", async ({ page }) => {
    await signInAs(page);
    await page.goto("/calendar?v2");
    // a touch screen has no drag of this kind; the case above covers the tap that replaces it
    test.skip(
        await page.evaluate(() => matchMedia("(hover: none)").matches),
        "the drag is the pointer's path",
    );
    const kid = (await page.locator(".c2-cell").first().getAttribute("data-kid")) ?? "";
    const cell = page.locator(".c2-day").first().locator(`.c2-cell[data-kid="${kid}"]`);
    await expect(cell.locator(".c2-sticker").first()).toBeVisible();
    const hold = async (where: Locator): Promise<{ x: number; y: number }> => {
        await where.scrollIntoViewIfNeeded();
        const box = await where.boundingBox();
        if (!box) throw new Error("nothing to take hold of");
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const from = await hold(cell.locator(".c2-sticker").first().locator(".gc-pic"));
    const to = await hold(page.locator(".c2-day").nth(3).locator(`.c2-cell[data-kid="${kid}"]`));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator(".c2-said")).toContainText("Moved");
});
