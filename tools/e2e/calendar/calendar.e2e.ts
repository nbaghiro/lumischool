import { expect, type Locator } from "@playwright/test";
import { errorCard, signInAs, smallTargets, test } from "../steps";

/** One place for the calendar: the bar has no second plan screen, and a change outlives the page. */
test("the calendar keeps a placed lesson across a reload, and places a second beside it", async ({
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
    // a second lesson is a placement of its own: it lands on the day and leaves the first alone
    const second = await place(page.locator(".cal-day").last());
    await expect(
        page.locator(".cal-day").last().locator(".cal-sticker", { hasText: second }),
    ).toHaveCount(1);
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
        // the tape across a card's top corners overhangs it on purpose, so a card is measured by
        // what it holds rather than by its own scrollWidth, which the tape would always exceed
        expect(
            await page.locator(".page-head, .cal-card, .cal-body").evaluateAll((cards) =>
                cards.flatMap((c) => {
                    const box = c.getBoundingClientRect();
                    return [...c.children]
                        .filter((kid) => {
                            if (kid.classList.contains("postcard-tape")) return false;
                            const r = kid.getBoundingClientRect();
                            return r.left < box.left - 1 || r.right > box.right + 1;
                        })
                        .map((kid) => `${c.className} > ${kid.className}`);
                }),
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
    // what the evening prints is the day itself, without the chooser, the steps or the shelf
    await page.getByRole("button", { name: "Day", exact: true }).click();
    // everyone is in view, so the day holds one lane a child, and the shelf stands beside them
    await expect(page.locator(".cal-lane")).toHaveCount(
        await page.locator(".cal-shelf-kid").count(),
    );
    await expect(page.locator(".cal-body.withshelf")).toHaveCount(1);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".cal-views")).toBeHidden();
    await expect(page.locator(".cal-steps")).toBeHidden();
    await expect(page.locator(".cal-shelf")).toBeHidden();
    await expect(page.locator(".cal-lane").first()).toBeVisible();
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

/**
 * The day is the same workspace one day wide: the shelf stands beside one lane a child, and the
 * order inside a lane is the parent's to set. The day says nothing when a change lands, so what
 * proves each move is where the lesson ends up, not a line of text.
 */
test("the day view places a lesson from the shelf, reorders the lane by keyboard, and takes one out", async ({
    page,
}, info) => {
    await signInAs(page);
    await page.goto("/calendar");
    const who = (await page.locator(".cal-shelf-kid").first().getAttribute("data-kid")) ?? "";
    expect(who).toBeTruthy();
    await page.goto(`/calendar?view=day&who=${who}`);
    const lane = page.locator(`.cal-lane[data-kid="${who}"]`);
    const shelf = page.locator(".cal-shelf");
    /** The lane's lessons in the order it holds them, which is what every move is read by. */
    const order = (): Promise<string[]> => lane.locator(".cal-rowname").allInnerTexts();
    const ordered = async (want: string[]): Promise<void> => {
        await expect.poll(order).toEqual(want);
    };
    /**
     * The lane once it has drawn as many rows as its own head says it holds, since a lane read
     * before the day has finished drawing reads as empty and the case would then prove nothing.
     */
    const drawn = async (): Promise<string[]> => {
        const head = await lane.locator(".cal-lanewho .note").innerText();
        await expect(lane.locator(".cal-row")).toHaveCount(Number(/^\d+/.exec(head)?.[0] ?? "0"));
        return order();
    };
    /** Takes the shelf's first lesson and puts it at `n`, counting the gaps from one. */
    const putAt = async (n: number): Promise<string> => {
        const item = shelf.locator("li button").first();
        const title = (await item.locator(".cal-rowtitle").innerText()).trim();
        await item.click();
        await lane.getByRole("button", { name: new RegExp(`here, number ${n} `) }).click();
        await expect(lane.locator(".cal-rowname", { hasText: title })).toHaveCount(1);
        return title;
    };
    const was = await drawn();
    // from the shelf into the lane, at the top and then under it
    const first = await putAt(1);
    const second = await putAt(2);
    await ordered([first, second, ...was]);
    await page.screenshot({ path: info.outputPath("day-lane.png"), fullPage: true });
    // and the change is a row in the family's log, so a reload finds it where it was put
    await page.reload();
    await ordered([first, second, ...was]);
    // picking a row up opens a place between every pair of rows, and the last one puts it at the end
    await lane
        .locator(".cal-row")
        .first()
        .getByRole("button", { name: /^Pick up/ })
        .click();
    const gaps = lane.getByRole("button", { name: /here, number / });
    await expect(gaps).toHaveCount((await order()).length + 1);
    await gaps.last().click();
    await ordered([second, ...was, first]);
    // out of the plan, from the day, and the shelf has it again
    await lane
        .locator(".cal-row")
        .last()
        .getByRole("button", { name: /^Pick up/ })
        .click();
    await shelf.getByRole("button", { name: "Take it out of the plan" }).click();
    await ordered([second, ...was]);
    await expect(shelf.locator(".cal-rowtitle", { hasText: first }).first()).toBeVisible();
    expect(await smallTargets(page.locator(".cal"))).toEqual([]);
});

/** The hand's path through a lane: a row dragged over the half of another lands above it. */
test("a lesson is dragged from the shelf into a day lane, and above a row already in it", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/calendar");
    const who = (await page.locator(".cal-shelf-kid").first().getAttribute("data-kid")) ?? "";
    await page.goto(`/calendar?view=day&who=${who}`);
    const lane = page.locator(`.cal-lane[data-kid="${who}"]`);
    const shelf = page.locator(".cal-shelf");
    const order = (): Promise<string[]> => lane.locator(".cal-rowname").allInnerTexts();
    const ordered = async (want: string[]): Promise<void> => {
        await expect.poll(order).toEqual(want);
    };
    const drawn = async (): Promise<string[]> => {
        const head = await lane.locator(".cal-lanewho .note").innerText();
        await expect(lane.locator(".cal-row")).toHaveCount(Number(/^\d+/.exec(head)?.[0] ?? "0"));
        return order();
    };
    // the drag is sent as its events, with the point it is over, since the lane reads the halves
    const dragTo = async (from: Locator, to: Locator, edge: "top" | "bottom"): Promise<void> => {
        const target = await to.elementHandle();
        if (!target) throw new Error("the lane to drop on is not on the page");
        await from.evaluate(
            (source, [host, where]) => {
                const data = new DataTransfer();
                const box = host.getBoundingClientRect();
                const clientY = where === "top" ? box.top + 1 : box.bottom - 1;
                const send = (el: Element, type: string, init: DragEventInit = {}): void => {
                    el.dispatchEvent(
                        new DragEvent(type, {
                            bubbles: true,
                            cancelable: true,
                            dataTransfer: data,
                            ...init,
                        }),
                    );
                };
                send(source, "dragstart");
                send(host, "dragover", { clientY });
                send(host, "drop", { clientY });
                send(source, "dragend");
            },
            [target, edge] as const,
        );
    };
    const was = await drawn();
    const item = shelf.locator("li button").first();
    const dragged = (await item.locator(".cal-rowtitle").innerText()).trim();
    // dropped over the lane's own foot, the lesson goes under everything the lane holds
    await dragTo(item, lane, "bottom");
    await expect(lane.locator(".cal-rowname", { hasText: dragged })).toHaveCount(1);
    await ordered([...was, dragged]);
    // and dragged over the top half of the first row, it goes above it
    await dragTo(lane.locator(".cal-row").last().locator(".cal-lift"), lane, "top");
    await ordered([dragged, ...was]);
});

/** Clearing a plan is a rearrangement, not a loss: what it takes off the days is on the shelf. */
test("the workspace clears a child's plan ahead and the lessons come back to the shelf", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/calendar");
    // the week ahead, since the clearing starts at tomorrow and this week's own days move with the
    // day the case is run on: on a Friday the week in view has no day left for it to reach
    await page.getByRole("button", { name: "Go forward" }).click();
    // the week shows every child, so clearing one child's plan leaves the others alone
    await expect(page.locator(".cal-cell").first()).toBeVisible();
    const who = (await page.locator(".cal-cell").first().getAttribute("data-kid")) ?? "";
    await expect(page.locator(`.cal-cell[data-kid="${who}"] .cal-sticker`).first()).toBeVisible();
    /** This child's lessons in the week in view, every day of which the clearing reaches. */
    const ahead = (): Promise<string[]> =>
        page
            .locator(".cal-week")
            .evaluate(
                (week, kid) =>
                    [
                        ...week.querySelectorAll(`.cal-cell[data-kid="${kid}"] .gc-sticker-title`),
                    ].map((t) => (t.textContent ?? "").trim()),
                who,
            );
    // a lesson this case places itself, since a placed session is what the clearing marks removed,
    // and it is on no other day, unlike a lesson the curriculum repeats until one is finished
    const shelf = page.locator(`.cal-shelf-kid[data-kid="${who}"]`);
    const item = shelf.locator("li button").first();
    const placed = (await item.locator(".cal-rowtitle").innerText()).trim();
    await item.click();
    const day = page.locator(".cal-day").last();
    await day.getByRole("button", { name: "Put it here" }).first().click();
    await expect(day.locator(".cal-sticker", { hasText: placed })).toHaveCount(1);
    const cleared = await ahead();
    expect(cleared).toContain(placed);
    const others = await page.locator(".cal-sticker").count();
    await shelf.getByRole("button", { name: /^Start .* plan again$/ }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toContainText("Finished work stays");
    await modal.getByRole("button", { name: "Clear the plan ahead", exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect.poll(ahead).toEqual([]);
    await expect(page.locator(".cal-sticker")).toHaveCount(others - cleared.length);
    // and what it took off a day is waiting to be placed again, so the clearing lost nothing
    await expect(shelf.locator(".cal-rowtitle", { hasText: placed }).first()).toBeVisible();
});

/**
 * The one way a lesson is taken out: the plan's band in its own look, opened from the sticker in the
 * week and from the row's name in the day. The shelf and the band say the same words for it.
 */
test("a lesson is taken out of the plan from its own look, in the week and in the day", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/calendar");
    const shelf = page.locator(".cal-shelf");
    const kid = (await page.locator(".cal-cell").first().getAttribute("data-kid")) ?? "";
    /** Puts the shelf's first lesson somewhere, so the case takes out a lesson it put there. */
    const take = async (put: (title: string) => Promise<void>): Promise<string> => {
        const item = shelf.locator("li button").first();
        const title = (await item.locator(".cal-rowtitle").innerText()).trim();
        await item.click();
        await put(title);
        return title;
    };
    const look = page.getByRole("dialog");
    const day = page.locator(".cal-day").last();
    const at = (await day.getAttribute("data-date")) ?? "";
    const inWeek = await take(async (title) => {
        await day.getByRole("button", { name: "Put it here" }).first().click();
        await expect(day.locator(".cal-sticker", { hasText: title })).toHaveCount(1);
        await day.locator(".cal-sticker", { hasText: title }).locator(".gc-sticker-in").click();
    });
    // the band offers the removal beside the day and the minutes, worded as the shelf words it
    await expect(look.locator(".look-plan .cal-plan-row")).toBeVisible();
    await look.getByRole("button", { name: "Take it out of the plan", exact: true }).click();
    await expect(look).toHaveCount(0);
    await expect(day.locator(".cal-sticker", { hasText: inWeek })).toHaveCount(0);
    await expect(shelf.locator(".cal-rowtitle", { hasText: inWeek }).first()).toBeVisible();
    // the day: the row's name opens the same look, and the same button takes the lesson out
    await page.goto(`/calendar?view=day&who=${kid}&at=${at}`);
    const lane = page.locator(`.cal-lane[data-kid="${kid}"]`);
    await expect(lane).toBeVisible();
    const inDay = await take(async (title) => {
        await lane.getByRole("button", { name: /here, number 1 / }).click();
        await expect(lane.locator(".cal-rowname", { hasText: title })).toHaveCount(1);
        await lane.locator(".cal-rowname", { hasText: title }).click();
    });
    await look.getByRole("button", { name: "Take it out of the plan", exact: true }).click();
    await expect(look).toHaveCount(0);
    await expect(lane.locator(".cal-rowname", { hasText: inDay })).toHaveCount(0);
    await expect(shelf.locator(".cal-rowtitle", { hasText: inDay }).first()).toBeVisible();
    expect(await smallTargets(page.locator(".cal"))).toEqual([]);
});

/**
 * A lesson's name opens the look Explore opens, over the calendar rather than over the catalogue:
 * the sheet as a child meets it, with nothing to answer on it, and the plan's own fields in the band
 * over it, so the sheet and the day it falls on are one card rather than two.
 */
test("a lesson's name opens the lesson view, in the week and in the day, and the plan is changed in it", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/calendar");
    const shelf = page.locator(".cal-shelf");
    const kid = (await page.locator(".cal-cell").first().getAttribute("data-kid")) ?? "";
    const day = page.locator(".cal-day").last();
    const at = (await day.getAttribute("data-date")) ?? "";
    const item = shelf.locator("li button").first();
    const title = (await item.locator(".cal-rowtitle").innerText()).trim();
    await item.click();
    await day.getByRole("button", { name: "Put it here" }).first().click();
    const sticker = day.locator(".cal-sticker", { hasText: title });
    await expect(sticker).toHaveCount(1);

    // the week's sticker opens it: the lesson's own sheet alone, with no map and no world's roll
    await sticker.locator(".gc-sticker-in").click();
    const look = page.getByRole("dialog");
    await expect(look.locator(".look-words b")).toHaveText(title);
    const sheet = look.locator(".ls-sheet").first();
    await expect(sheet).toBeVisible({ timeout: 40_000 });
    await expect(look.locator(".ls-sheet")).toHaveCount(1);
    await expect(look.locator(".wd, .ow-host, canvas")).toHaveCount(0);
    // it is the child's own sheet: nothing filled in and nothing to press but a program's Run
    // controls, which a coding lesson plays and never records (engine/ui/code-controls.tsx)
    await expect(sheet.locator(".ls-answer")).toHaveCount(0);
    await expect(sheet.locator("button:not(.cr button), [role=button]")).toHaveCount(0);
    // and behind it, the still picture of the world the lesson is met in
    await expect(look.locator(".look-world .wd-picture > svg")).toBeAttached({ timeout: 20_000 });
    expect(await smallTargets(look)).toEqual([]);

    // Escape closes it and the sticker has the keyboard again
    await page.keyboard.press("Escape");
    await expect(look).toHaveCount(0);
    await expect(sticker.locator(".gc-sticker-in")).toBeFocused();

    // the day's row opens the same look by the lesson's name, and the plan is changed from its band
    await page.goto(`/calendar?view=day&who=${kid}&at=${at}`);
    const lane = page.locator(`.cal-lane[data-kid="${kid}"]`);
    await lane.locator(".cal-rowname", { hasText: title }).click();
    await expect(look.locator(".look-words b")).toHaveText(title);
    await look.getByLabel("Minutes planned").fill("35");
    await look.getByRole("button", { name: "Keep this" }).click();
    await expect(look).toHaveCount(0);
    await expect(lane.locator(".cal-row", { hasText: title })).toContainText("35 min");
    // and the change is a row in the family's log, not the page's own state
    await page.reload();
    await expect(lane.locator(".cal-row", { hasText: title })).toContainText("35 min");
});

/**
 * Work a child has begun opens the same way, and offers nothing to change, since the record is what
 * it is and the plan no longer decides it.
 */
test("a lesson a child has begun opens the lesson view with nothing to change", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/calendar");
    const item = page.locator(".cal-shelf li button").first();
    await expect(item).toBeVisible();
    const lesson = (await item.getAttribute("data-lesson")) ?? "";
    const track = (await item.getAttribute("data-track")) ?? "";
    const kid = (await page.locator(".cal-cell").first().getAttribute("data-kid")) ?? "";
    expect(lesson && track && kid).toBeTruthy();
    // a sitting begun and never ended, on a past weekday the plan also holds, which is "part"
    const began = await page.evaluate(
        async ([kidId, lessonId, trackId]) => {
            const d = new Date();
            do d.setDate(d.getDate() - 1);
            while (d.getDay() === 0 || d.getDay() === 6);
            const on = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const sitting = crypto.randomUUID();
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
                        {
                            id: crypto.randomUUID(),
                            kid_id: kidId,
                            // midday in UTC, so the sitting falls on this day in every family's zone
                            at: `${on}T12:00:00.000Z`,
                            kind: "sitting-began",
                            data: {
                                sitting,
                                lesson: lessonId,
                                lessonHash: "test",
                                pack: "test",
                                mode: "paper",
                            },
                        },
                    ],
                }),
            });
            if (!res.ok) throw new Error(`the sitting was refused: ${res.status}`);
            return on;
        },
        [kid, lesson, track],
    );
    await page.goto(`/calendar?view=day&at=${began}&who=${kid}`);
    const lane = page.locator(`.cal-lane[data-kid="${kid}"]`);
    await expect(lane.locator('.cal-row[data-state="part"]')).toHaveCount(1);
    await lane.locator('.cal-row[data-state="part"] .cal-rowname').click();
    const look = page.getByRole("dialog");
    await expect(look.locator(".ls-sheet").first()).toBeVisible({ timeout: 40_000 });
    // the band says why, and holds none of the fields a planned lesson has
    await expect(look.locator(".look-plan")).toContainText(
        "Work already begun stays in the record",
    );
    await expect(look.getByRole("button", { name: "Keep this" })).toHaveCount(0);
    await expect(look.getByRole("button", { name: "Take it out of the plan" })).toHaveCount(0);
    await expect(look.getByLabel("Day")).toHaveCount(0);
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
    await expect(page.locator(".cal-lane")).toContainText("not done");
    // a day already gone takes nothing, so picking its lesson up offers nowhere in the lane to put it
    await page.locator(".cal-lane .cal-lift").first().click();
    await expect(page.locator(".cal-lane .cal-gap")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Take it out of the plan" })).toBeVisible();
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
    // a new family's plan starts today, so the week's first planned day is found rather than assumed
    const days = page.locator(".cal-day");
    const inDay = (i: number): Locator => days.nth(i).locator(`.cal-cell[data-kid="${kid}"]`);
    await expect(page.locator(`.cal-cell[data-kid="${kid}"] .cal-sticker`).first()).toBeVisible();
    const count = await days.count();
    let first = 0;
    while (first < count - 1 && (await inDay(first).locator(".cal-sticker").count()) === 0) first++;
    const cell = inDay(first);
    await expect(cell.locator(".cal-sticker").first()).toBeVisible();
    const hold = async (where: Locator): Promise<{ x: number; y: number }> => {
        await where.scrollIntoViewIfNeeded();
        const box = await where.boundingBox();
        if (!box) throw new Error("nothing to take hold of");
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const target = inDay(first + 2 < count ? first + 2 : first + 1);
    // the sticker's own title, since its drawing carries text of its own and its state word changes
    const held = (
        await cell.locator(".cal-sticker").first().locator(".gc-sticker-title").innerText()
    ).trim();
    const waiting = await target.locator(".cal-sticker").count();
    // a lesson not finished is planned again on later days, so the target may hold it already
    const alike = await target.locator(".cal-sticker", { hasText: held }).count();
    const from = await hold(cell.locator(".cal-sticker").first().locator(".gc-pic"));
    const to = await hold(target);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await page.mouse.up();
    await expect(target.locator(".cal-sticker")).toHaveCount(waiting + 1);
    await expect(target.locator(".cal-sticker", { hasText: held })).toHaveCount(alike + 1);
});

/**
 * The week and the shelf end on one line. Beside the week the shelf fills the card's own column and
 * never passes the window, so a week taller than the window carries it down and it comes to rest on
 * the week's last line at the foot of the card. Stacked under the week it has no scroller of its
 * own, so the page's own scroll is the only one a finger finds over the shelf.
 */
test("the week and the shelf end on the same line, at every width", async ({ page }, info) => {
    await signInAs(page);
    await page.goto("/calendar");
    await expect(page.locator(".cal-shelf li button").first()).toBeVisible();
    /** The card and its two columns, in the page's own coordinates rather than the window's. */
    const columns = () =>
        page.locator(".cal-body").evaluate((card) => {
            const box = (el: Element | null): { top: number; bottom: number; height: number } => {
                const r = el?.getBoundingClientRect();
                return r
                    ? {
                          top: Math.round(r.top + scrollY),
                          bottom: Math.round(r.bottom + scrollY),
                          height: Math.round(r.height),
                      }
                    : { top: 0, bottom: 0, height: 0 };
            };
            const shelf = card.querySelector(".cal-shelf");
            const list = card.querySelector(".cal-shelf-in");
            return {
                card: box(card),
                week: box(card.querySelector(".cal-main")),
                shelf: box(shelf),
                // the two layouts differ by this alone, so the case reads the page rather than a width
                beside: !!shelf && getComputedStyle(shelf).position === "sticky",
                hidden: list ? list.scrollHeight - list.clientHeight : 0,
                window: innerHeight,
            };
        });
    const at = await columns();
    expect(at.card.height).toBeGreaterThan(0);
    if (!at.beside) {
        expect(at.shelf.top).toBeGreaterThanOrEqual(at.week.bottom - 1);
        expect(at.hidden, "the stacked shelf keeps a scroller of its own").toBe(0);
        return;
    }
    expect(Math.abs(at.shelf.top - at.week.top)).toBeLessThanOrEqual(1);
    expect(at.shelf.height, "the shelf is taller than the window").toBeLessThanOrEqual(at.window);
    // the foot of the page is the one place both bottoms are on screen at once
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const end = await columns();
    expect(
        Math.abs(end.week.bottom - end.shelf.bottom),
        "the week and the shelf end on different lines",
    ).toBeLessThanOrEqual(2);
    // and a week taller than the window keeps the shelf in view as it goes past
    if (end.card.height > end.window) {
        await page.evaluate(() => {
            const card = document.querySelector(".cal-body");
            if (card) scrollTo(0, Math.round(card.getBoundingClientRect().top + scrollY) + 200);
        });
        const top = await page
            .locator(".cal-shelf")
            .evaluate((s) => Math.round(s.getBoundingClientRect().top));
        expect(top, "the shelf did not follow the week down").toBeLessThanOrEqual(13);
    }
    await page.screenshot({ path: info.outputPath("columns-end.png") });
});

test("a lesson on the shelf opens its own look, and is picked up from it to be placed", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/calendar");
    const shelf = page.locator(".cal-shelf");
    const item = shelf.locator("li").first();
    await expect(item).toBeVisible({ timeout: 30_000 });
    const card = item.locator(".cal-shelf-card");
    const title = (await card.locator(".cal-rowtitle").innerText()).trim();
    await item.getByRole("button", { name: `Open ${title}` }).click();
    const look = page.getByRole("dialog");
    await expect(look.locator(".look-words b")).toHaveText(title);
    await expect(look.locator(".ls-sheet").first()).toBeVisible({ timeout: 40_000 });
    // a lesson not placed yet has no day or minutes to change, only the way to place it
    await expect(look.locator(".cal-plan-row")).toHaveCount(0);
    expect(await smallTargets(look)).toEqual([]);
    await look.getByRole("button", { name: "Pick it up to place" }).click();
    await expect(look).toHaveCount(0);
    await expect(card).toHaveAttribute("aria-pressed", "true");
    expect(await smallTargets(shelf)).toEqual([]);
});

test("the shelf finds any lesson of any grade by its words, and one found is placed like any other", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/calendar");
    const shelf = page.locator(".cal-shelf");
    await expect(shelf.locator("li").first()).toBeVisible({ timeout: 30_000 });
    await shelf.getByLabel("Find any lesson").fill("million");
    const card = shelf.locator(".cal-shelf-card", { hasText: "Numbers to a million" }).first();
    await expect(card).toBeVisible();
    // a lesson of another grade than the child's says which grade it is
    await expect(card.locator(".cal-aside")).toContainText("Grade");
    await expect(shelf.locator(".cal-shelf-title")).toContainText("found");
    const title = (await card.locator(".cal-rowtitle").innerText()).trim();
    await card.click();
    const day = page.locator(".cal-day").last();
    await day.getByRole("button", { name: "Put it here" }).first().click();
    await expect(day.locator(".cal-sticker", { hasText: title })).toHaveCount(1);
    await shelf.getByLabel("Find any lesson").fill("no lesson has these words zz");
    await expect(shelf).toContainText("No lesson matches");
    expect(await smallTargets(shelf)).toEqual([]);
});
