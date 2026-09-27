import { expect, type Locator } from "@playwright/test";
import { errorCard, signInAs, smallTargets, test } from "./steps";

/** One place for the calendar: the bar has no second plan screen, and a change outlives the page. */
test("the calendar keeps a placed lesson across a reload, and puts back only the last change", async ({
    page,
}, info) => {
    await signInAs(page);
    const places = page.getByRole("navigation", { name: "The grown-ups' places" });
    await places.getByRole("link", { name: "Calendar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await expect(places.getByRole("link", { name: "Change the plan" })).toHaveCount(0);
    await expect(errorCard(page)).toHaveCount(0);
    const shelf = page.locator(".cal-shelf");
    const place = async (day: Locator): Promise<string> => {
        const item = shelf.locator("li button").first();
        // the row's own title, since the lesson's drawing carries text of its own once it is drawn
        const title = (await item.locator(".cal-rowtitle").innerText()).trim();
        await item.click();
        await day.getByRole("button", { name: "Put it here" }).click();
        await expect(day.locator(".cal-sticker", { hasText: title })).toHaveCount(1);
        return title;
    };
    const last = page.locator(".cal-day").last();
    const first = await place(last);
    await expect(last.locator(".cal-sticker", { hasText: first })).toHaveCount(1);
    // the change is a row in the family's log, so the page it was made on is not what holds it
    await page.reload();
    await expect(
        page.locator(".cal-day").last().locator(".cal-sticker", { hasText: first }),
    ).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Put it back", exact: true })).toHaveCount(0);
    // a second lesson, and putting the last change back leaves the first one where it is
    const second = await place(page.locator(".cal-day").last());
    const put = page.getByRole("button", { name: "Put it back", exact: true });
    await expect(put).toBeVisible();
    await put.click();
    await expect(
        page.locator(".cal-day").last().locator(".cal-sticker", { hasText: second }),
    ).toHaveCount(0);
    await expect(
        page.locator(".cal-day").last().locator(".cal-sticker", { hasText: first }),
    ).toHaveCount(1);
    await page.screenshot({ path: info.outputPath("placed.png"), fullPage: true });
    // a view the calendar does not have opens the week rather than an empty card
    await page.goto("/calendar?view=year");
    await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await expect(errorCard(page)).toHaveCount(0);
});

test("a busy day keeps one child's lessons inside their own cell, in all four views", async ({
    page,
}, info) => {
    await signInAs(page);
    await page.goto("/calendar");
    const group = page.locator(".cal-shelf-kid").first();
    await expect(group.locator("li button").first()).toBeVisible();
    const who = (await group.getAttribute("data-kid")) ?? "";
    const cell = page.locator(".cal-day").last().locator(`.cal-cell[data-kid="${who}"]`);
    const before = await cell.locator(".cal-sticker").count();
    for (let n = 1; n <= 4; n++) {
        await group.locator("li button").first().click();
        await cell.getByRole("button", { name: "Put it here" }).click();
        await expect(cell.locator(".cal-sticker")).toHaveCount(before + n);
    }
    /** Nothing a card holds reaches past its edge, and the page never scrolls sideways. */
    const fits = async (where: string): Promise<void> => {
        expect(
            await page.locator(".cal-cell").evaluateAll((cells) =>
                cells.flatMap((c) => {
                    const box = c.getBoundingClientRect();
                    return [...c.querySelectorAll(".cal-sticker")]
                        .filter((s) => {
                            const r = s.getBoundingClientRect();
                            return r.left < box.left - 1 || r.right > box.right + 1;
                        })
                        .map((s) => (s.textContent ?? "").slice(0, 40));
                }),
            ),
            where,
        ).toEqual([]);
        expect(
            await page
                .locator(".cal-card, .cal-body")
                .evaluateAll((cards) =>
                    cards
                        .filter((c) => c.scrollWidth > c.clientWidth + 1)
                        .map((c) => c.getAttribute("class") ?? ""),
                ),
            where,
        ).toEqual([]);
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            where,
        ).toBe(true);
    };
    await fits("week");
    await page.screenshot({ path: info.outputPath("busy-week.png"), fullPage: true });
    for (const view of ["Day", "Month", "Term"]) {
        await page.getByRole("button", { name: view, exact: true }).click();
        await expect(errorCard(page)).toHaveCount(0);
        await fits(view);
    }
    expect(await smallTargets(page.locator(".cal"))).toEqual([]);
});

/** The workspace at `/calendar`: the plan is already there, and the shelf holds what is not. */
test("the calendar workspace opens on the plan, with the shelf holding what is not placed", async ({
    page,
}, info) => {
    await signInAs(page);
    await page.goto("/calendar");
    await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await expect(page.locator(".cal-day").first()).toBeVisible();
    // a family of several opens on everyone, so the week holds every child at once
    await expect(page.getByRole("button", { name: "Everyone", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    expect(
        new Set(await page.locator(".cal-cell").evaluateAll((c) => c.map((x) => x.dataset.kid)))
            .size,
    ).toBeGreaterThan(1);
    // the week it opens on carries the child's default curriculum, without anyone planning it
    await expect(page.locator(".cal-sticker").first()).toBeVisible();
    const shelf = page.locator(".cal-shelf");
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
    expect(await smallTargets(page.locator(".cal"))).toEqual([]);
    await page.screenshot({ path: info.outputPath("workspace.png"), fullPage: true });
    // what the evening prints is the day itself, without the chooser, the steps or the day before
    await page.getByRole("button", { name: "Day", exact: true }).click();
    // everyone is in view, so the day holds one agenda a child
    await expect(page.locator(".cal-agenda").first()).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".cal-views")).toBeHidden();
    await expect(page.locator(".cal-steps")).toBeHidden();
    await expect(page.locator(".cal-yesterday")).toBeHidden();
    await expect(page.locator(".cal-agenda").first()).toBeVisible();
    await page.emulateMedia({ media: null });
});

test("a lesson is placed from the shelf, moved between days and taken out, by keyboard", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/calendar");
    const shelf = page.locator(".cal-shelf");
    const first = shelf.locator("li button").first();
    const title = (await first.locator(".cal-rowtitle").innerText()).trim();
    await first.click();
    // the days that can take it say so, and pressing one places it
    const target = page.locator(".cal-day").last().getByRole("button", { name: "Put it here" });
    await expect(target).toBeVisible();
    await target.click();
    const placed = page.locator(".cal-day").last().locator(".cal-sticker", { hasText: title });
    await expect(placed).toHaveCount(1);
    // pick the placed one up and move it a day earlier
    await placed.getByRole("button", { name: /^Pick up/ }).click();
    const earlier = page.locator(".cal-day").nth(3).getByRole("button", { name: "Put it here" });
    await earlier.click();
    await expect(
        page.locator(".cal-day").nth(3).locator(".cal-sticker", { hasText: title }),
    ).toHaveCount(1);
    // and take it out again, back to the shelf
    await page
        .locator(".cal-day")
        .nth(3)
        .locator(".cal-sticker", { hasText: title })
        .getByRole("button", { name: /^Pick up/ })
        .click();
    await shelf.getByRole("button", { name: "Take it out of the plan" }).click();
    await expect(
        page.locator(".cal-day").nth(3).locator(".cal-sticker", { hasText: title }),
    ).toHaveCount(0);
    // and putting a lesson down leaves the plan as it was
    await shelf.locator("li button").first().click();
    await expect(page.getByRole("button", { name: "Put it here" }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Put it here" })).toHaveCount(0);
});

test("the workspace clears a child's plan ahead and puts it back", async ({ page }) => {
    await signInAs(page);
    await page.goto("/calendar");
    // the week shows every child, so clearing one child's plan leaves the others alone
    await expect(page.locator(".cal-cell").first()).toBeVisible();
    const who = await page.locator(".cal-cell").first().getAttribute("data-kid");
    const mine = page.locator(`.cal-cell[data-kid="${who ?? ""}"] .cal-sticker`);
    await expect(mine.first()).toBeVisible();
    const before = await mine.count();
    const others = await page.locator(".cal-sticker").count();
    await page
        .locator(`.cal-shelf-kid[data-kid="${who ?? ""}"]`)
        .getByRole("button", { name: /^Start .* plan again$/ })
        .click();
    const modal = page.getByRole("dialog");
    await expect(modal).toContainText("Finished work stays");
    await modal.getByRole("button", { name: "Clear the plan ahead", exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(mine).toHaveCount(0);
    await expect(page.locator(".cal-sticker")).toHaveCount(others - before);
    await page.getByRole("button", { name: "Put it back", exact: true }).click();
    await expect(mine).toHaveCount(before);
});

/** A day already gone says how it went: the mark on the cell, the word in the day. */
test("a past day carries how its lessons went", async ({ page }) => {
    await signInAs(page);
    await page.goto("/calendar");
    const item = page.locator(".cal-shelf li button").first();
    await expect(item).toBeVisible();
    const lesson = (await item.getAttribute("data-lesson")) ?? "";
    const track = (await item.getAttribute("data-track")) ?? "";
    const kid = (await page.locator(".cal-cell").first().getAttribute("data-kid")) ?? "";
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
    await page.goto(`/calendar?view=week&at=${gone}&who=${kid}`);
    const cell = page.locator(`.cal-day[data-date="${gone}"] .cal-cell[data-kid="${kid}"]`);
    await expect(cell.locator(".cal-sticker")).toHaveCount(1);
    // the mark is quiet: a state on the sticker, not a label across the cell
    await expect(cell.locator('.cal-mark[data-state="missed"]')).toHaveCount(1);
    await expect(cell).not.toContainText("Not done");
    await page.goto(`/calendar?view=day&at=${gone}&who=${kid}`);
    await expect(page.locator(".cal-agenda")).toContainText("not done");
});

/** The hand's path: the drag events a browser sends end in the same `place` the keyboard uses. */
test("a lesson is dragged from the shelf onto a day, and on to another day", async ({ page }) => {
    await signInAs(page);
    await page.goto("/calendar");
    const item = page.locator(".cal-shelf li button").first();
    await expect(item).toBeVisible();
    const title = (await item.locator(".cal-rowtitle").innerText()).trim();
    const kid = (await page.locator(".cal-cell").first().getAttribute("data-kid")) ?? "";
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
    const cell = page.locator(".cal-day").last().locator(`.cal-cell[data-kid="${kid}"]`);
    await dragOnto(item, cell);
    const placed = cell.locator(".cal-sticker", { hasText: title });
    await expect(placed).toHaveCount(1);
    const earlier = page.locator(".cal-day").nth(3).locator(`.cal-cell[data-kid="${kid}"]`);
    await dragOnto(placed.locator(".gc-sticker-in"), earlier);
    await expect(earlier.locator(".cal-sticker", { hasText: title })).toHaveCount(1);
    await expect(cell.locator(".cal-sticker", { hasText: title })).toHaveCount(0);
});

/** The pointer itself, pressed where a hand presses: on the lesson's drawing. */
test("a placed lesson is dragged to another day by a pointer on its drawing", async ({ page }) => {
    await signInAs(page);
    await page.goto("/calendar");
    // a touch screen has no drag of this kind; the case above covers the tap that replaces it
    test.skip(
        await page.evaluate(() => matchMedia("(hover: none)").matches),
        "the drag is the pointer's path",
    );
    const kid = (await page.locator(".cal-cell").first().getAttribute("data-kid")) ?? "";
    const cell = page.locator(".cal-day").first().locator(`.cal-cell[data-kid="${kid}"]`);
    await expect(cell.locator(".cal-sticker").first()).toBeVisible();
    const hold = async (where: Locator): Promise<{ x: number; y: number }> => {
        await where.scrollIntoViewIfNeeded();
        const box = await where.boundingBox();
        if (!box) throw new Error("nothing to take hold of");
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const target = page.locator(".cal-day").nth(3).locator(`.cal-cell[data-kid="${kid}"]`);
    // the sticker's own title, since its drawing carries text of its own and its state word changes
    const held = (
        await cell.locator(".cal-sticker").first().locator(".gc-sticker-title").innerText()
    ).trim();
    const waiting = await target.locator(".cal-sticker").count();
    const from = await hold(cell.locator(".cal-sticker").first().locator(".gc-pic"));
    const to = await hold(target);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await page.mouse.up();
    await expect(target.locator(".cal-sticker")).toHaveCount(waiting + 1);
    await expect(target.locator(".cal-sticker", { hasText: held })).toHaveCount(1);
});
