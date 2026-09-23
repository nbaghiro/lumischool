import { expect } from "@playwright/test";
import type { KidRecord } from "../../server/api";
import { childsMap, openChildrensView, signInAs, test } from "./steps";

test("a child's subject place opens its own lessons, returns to its map location, and explains locked places", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInAs(page);
    await page.route(/\/api\/kid\/[^/]+\/record$/, async (route) => {
        const response = await route.fetch();
        const record = (await response.json()) as KidRecord;
        const own = record.years.find((year) => year.grade === 1);
        if (!own) throw new Error("missing first-year record");
        own.progress.done["art-mixing-the-secondaries"] = {
            stars: 3,
            on: record.today,
            minutes: 10,
            right: 1,
        };
        record.plan = [];
        await route.fulfill({ response, json: record });
    });
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    await expect(map.locator(".ow-node")).toHaveCount(38);
    await expect(map.locator(".ow-region")).toHaveCount(8);
    await map.getByRole("button", { name: "Every world", exact: true }).click();
    await expect(map.getByRole("button", { name: "Near me", exact: true })).toBeVisible();
    await map.getByRole("button", { name: "Near me", exact: true }).click();
    const locked = map.locator('.ow-node[aria-disabled="true"]').first();
    await locked.dispatchEvent("click");
    await expect(map.getByRole("note")).toContainText("The way here opens as you learn.");
    await expect(page.locator(".wd")).toHaveCount(0);
    await map.getByRole("button", { name: "Back to the map" }).click();
    await expect(map.getByRole("note")).toHaveCount(0);

    const hut = map.getByRole("button", { name: /The painter's hut/ });
    await expect(hut).not.toHaveAttribute("aria-disabled", "true");
    await hut.dispatchEvent("click");
    await expect(hut).toHaveAttribute("tabindex", "0");
    await hut.dispatchEvent("click");
    const roll = page.locator(".wd");
    await expect(roll).toHaveClass(/ready/, { timeout: 60_000 });
    await expect(roll.locator(".w.hand")).toHaveText("The painter's hut");
    await expect(roll.locator('[data-lesson="art-mixing-the-secondaries"]')).toHaveCount(1);
    await page.locator(".wd-host").focus();
    await page.keyboard.press("Escape");
    await expect(page.locator(".pl")).toHaveClass(/ready/, { timeout: 60_000 });
    await page.locator(".pl-host").focus();
    await page.keyboard.press("Escape");
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    await expect(hut).toHaveAttribute("tabindex", "0");
    await expect
        .poll(async () => {
            const region = await map.boundingBox();
            const place = await hut.boundingBox();
            return (
                !!region &&
                !!place &&
                place.width > 60 &&
                Math.abs(place.x + place.width / 2 - region.x - region.width / 2) < 12 &&
                Math.abs(place.y + place.height / 2 - region.y - region.height / 2) < 12
            );
        })
        .toBe(true);

    await hut.dispatchEvent("click");
    await expect(roll).toHaveClass(/ready/, { timeout: 60_000 });
    await expect(roll.locator(".w.hand")).toHaveText("The painter's hut");
});
