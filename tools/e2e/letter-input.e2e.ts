import { expect } from "@playwright/test";
import type { KidRecord } from "../../server/api";
import { childsMap, openChildrensView, signInAs, test } from "./steps";

test("word answers align one editable letter per box and check as a whole word", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInAs(page);
    await page.route(/\/api\/kid\/[^/]+\/record$/, async (route) => {
        const response = await route.fetch();
        const record = (await response.json()) as KidRecord;
        const day = record.plan
            .flatMap((track) => track.days)
            .find((day) => day.lesson === "reading-letter-sounds");
        if (!day) throw new Error("Missing reading fixture");
        await route.fulfill({ response, json: { ...record, today: day.on } });
    });
    await openChildrensView(page, ["Rosie"]);
    const map = childsMap(page, "Rosie");
    await expect(map).toHaveClass(/ready/, { timeout: 60_000 });
    const meadow = map.getByRole("button", { name: /The meadow/ });
    await meadow.dispatchEvent("click");
    await meadow.dispatchEvent("click");
    const question = page
        .locator('[data-lesson="reading-letter-sounds"] .ls-q[data-n="8"]')
        .first();
    const fields = question.locator(".ls-letter-boxes input");
    await expect(fields).toHaveCount(3, { timeout: 60_000 });
    const toggle = page.getByRole("button", { name: "Page view", exact: true });
    await toggle.focus();
    await toggle.click();
    await fields.first().scrollIntoViewIfNeeded();
    await fields.first().fill("c");
    await expect(fields.nth(1)).toBeFocused();
    await fields.nth(1).fill("u");
    await expect(fields.nth(2)).toBeFocused();
    await fields.nth(2).press("Backspace");
    await expect(fields.nth(1)).toBeFocused();
    await expect(fields.nth(1)).toHaveValue("");
    await fields.first().evaluate((el) => {
        const data = new DataTransfer();
        data.setData("text/plain", "cup");
        el.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, clipboardData: data }));
    });
    await expect(fields.nth(0)).toHaveValue("c");
    await expect(fields.nth(1)).toHaveValue("u");
    await expect(fields.nth(2)).toHaveValue("p");
    const boxes = await fields.evaluateAll((els) =>
        els.map((el) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right };
        }),
    );
    expect(boxes[1]?.left).toBeGreaterThan((boxes[0]?.right ?? 0) - 1);
    expect(boxes[2]?.left).toBeGreaterThan((boxes[1]?.right ?? 0) - 1);
    await question.getByRole("button", { name: "Check", exact: true }).click();
    await expect(question.locator('[data-state="right"]')).toBeVisible();
});
