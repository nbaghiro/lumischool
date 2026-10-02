import { expect } from "@playwright/test";
import { readKidRecord } from "../../engine/ui/wire";
import { nowIn } from "../../school/family/now";
import { childsMap, openChildrensView, signInAs, test } from "./steps";

test("a child's own term world keeps its roll, and another world of their year is its journey, every lesson theirs to do", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInAs(page);
    let current: string[] = [];
    await page.route(/\/api\/kid\/[^/]+\/record$/, async (route) => {
        const response = await route.fetch();
        const received = readKidRecord(await response.json());
        if (!received) throw new Error("the record did not read");
        // Anchor the fixture to its maths day instead of the machine's weekday.
        const maths = received.plan
            .flatMap((track) => track.days)
            .find((day) => day.lesson === "g1-counting-to-twenty");
        if (!maths) throw new Error("The fixture has no first maths lesson");
        const record = { ...received, today: maths.on };
        current = nowIn(record);
        await route.fulfill({ response, json: record });
    });
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    const goInto = async (name: RegExp) => {
        const place = map.getByRole("button", { name });
        await place.dispatchEvent("click");
        // A world already centred on a phone may open on the first click.
        await place.evaluateAll((els) =>
            els[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
        );
    };
    await goInto(/The meadow/);
    const roll = page.locator(".wd");
    await expect(roll).toHaveClass(/ready/, { timeout: 60_000 });
    expect(current).toContain("g1-counting-to-twenty");
    await expect(roll.locator('[data-lesson="g1-counting-to-twenty"]').first()).toHaveClass(
        /ls-sheet/,
        { timeout: 60_000 },
    );
    // the current term's world is the year's roll, with no switch to anything else
    await expect(page.getByRole("button", { name: "Grade journey", exact: true })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Grade" })).toHaveCount(0);
    await page.getByRole("button", { name: "Back to the map", exact: true }).click();
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    await goInto(/The harbour/);
    await expect(roll).toHaveClass(/ready/, { timeout: 60_000 });
    await expect(roll.locator(".j-name .term").first()).toHaveText("Grade 1 journey");
    // a journey's lesson not done yet is a sheet to answer, drawn as today's are
    const first = roll.locator(".wd-sheets > *").first();
    await expect(first.locator(".ls-sheet, [class*=ls-sheet]").first()).toBeAttached({
        timeout: 60_000,
    });
    // and it is never held at the height the roll first laid it at, which cut it off half through
    await expect
        .poll(() =>
            roll
                .locator(".wd-sheets .ls-sheet")
                .evaluateAll(
                    (els) => els.filter((el) => el.scrollHeight > el.clientHeight + 1).length,
                ),
        )
        .toBe(0);
    await expect(page.getByRole("group", { name: "Grade" })).toHaveCount(0);
});
