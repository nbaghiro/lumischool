import { expect } from "@playwright/test";
import type { KidRecord } from "../../server/api";
import { nowIn } from "../../school/family/now";
import { childsMap, openChildrensView, signInAs, test } from "./steps";

test("a child can browse the grade journey without fetching closed lessons or changing today's sheet", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInAs(page);
    let current: string[] = [];
    await page.route(/\/api\/kid\/[^/]+\/record$/, async (route) => {
        const response = await route.fetch();
        const received = (await response.json()) as KidRecord;
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
    const meadow = map.getByRole("button", { name: /The meadow/ });
    await meadow.dispatchEvent("click");
    await meadow.dispatchEvent("click");
    const roll = page.locator(".wd");
    await expect(roll).toHaveClass(/ready/, { timeout: 60_000 });
    expect(current).toContain("g1-counting-to-twenty");
    expect(current).not.toContain("nature-living-or-not");
    // Capture the actual playable sheet, whose answer state must survive both projections.
    const sheet = roll.locator('[data-lesson="g1-counting-to-twenty"]').first();
    await expect(sheet).toBeAttached({ timeout: 60_000 });
    await expect(sheet).toHaveClass(/ls-sheet/, { timeout: 60_000 });
    const oldSheet = await sheet.elementHandle();
    expect(oldSheet).not.toBeNull();
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));
    await page.getByRole("button", { name: "Grade journey", exact: true }).click();
    await expect(page.getByRole("button", { name: "My lessons", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await expect(roll.locator('[data-lesson="nature-living-or-not"]')).toBeAttached();
    await expect(roll.locator('[data-lesson="nature-living-or-not"]')).toHaveAttribute(
        "aria-label",
        /closed/,
    );
    await expect(sheet).toBeAttached();
    expect(await sheet.evaluate((node, old) => node === old, oldSheet)).toBe(true);
    await page.getByRole("button", { name: "My lessons", exact: true }).click();
    await expect(page.getByRole("button", { name: "Grade journey", exact: true })).toHaveAttribute(
        "aria-pressed",
        "false",
    );
    await expect(sheet).toBeAttached();
    expect(await sheet.evaluate((node, old) => node === old, oldSheet)).toBe(true);
    expect(requested.filter((url) => url.includes("nature-living-or-not"))).toEqual([]);
    await expect(sheet).toHaveClass(/ls-sheet/);
});
