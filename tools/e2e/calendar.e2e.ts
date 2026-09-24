import { expect } from "@playwright/test";
import { signInAs, test, errorCard } from "./steps";

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
    await page.getByRole("button", { name: "The year", exact: true }).click();
    await expect(page.getByRole("heading", { name: "The school year", exact: true })).toBeVisible();
    await page.locator(".gc-weeks button").first().click();
    await expect(page).toHaveURL(/view=week/);
    await page.goto("/calendar?view=subjects");
    await expect(page).toHaveURL(/\/calendar\?view=subjects/);
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
    await page.getByRole("button", { name: "The year", exact: true }).click();
    await expect(page.getByRole("heading", { name: "The school year", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
});
