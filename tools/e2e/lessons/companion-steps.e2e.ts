// The companion's steps on a grown-up's lesson (.docs/hint-steps.md): Help with this one opens the
// question's first hint in Charlie's dock and on the sheet, Next opens the next one, then the worked
// example, then walks the question through to its answer, and Help after that says every step is
// given. A missing voice only leaves the words.

import { expect } from "@playwright/test";
import { signInAs, test } from "../steps";

test("a question's help climbs its hints and worked example to its answer, in Charlie's dock", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/explore/g1-tens-and-ones");
    const sheet = page.getByRole("dialog").locator(".ls-sheet").first();
    await expect(sheet).toBeVisible({ timeout: 40_000 });
    const question = sheet
        .locator(".ls-q")
        .filter({ has: page.locator(".ls-companion") })
        .first();
    const help = question.getByRole("button", { name: "Help with this one" });
    await expect(help).toBeVisible({ timeout: 20_000 });
    await help.click();

    const dock = page.getByRole("complementary", { name: "Charlie" });
    const words = dock.locator(".cp-said p").first();
    await expect(words).not.toHaveText("", { timeout: 20_000 });
    // the hint Charlie says is the one the sheet now shows
    const opened = question.locator(".ls-hints li");
    await expect(opened).toHaveCount(1);
    await expect(words).toHaveText((await opened.first().textContent()) ?? "");
    // no call and no microphone: nothing in the dock listens
    await expect(dock.getByRole("button", { name: /talk|Ask/i })).toHaveCount(0);

    // Next climbs the rest of the ladder, the last rung walking it through to the answer
    const more = dock.getByRole("button", { name: /Next hint|Show me an example|Show me how/ });
    for (let i = 0; i < 8 && (await more.count()); i++) {
        await more.click();
        await expect(words).not.toHaveText("");
    }
    await expect(words).toContainText("So the answer is");
    // with every rung climbed, Help again says so
    await help.click();
    await expect(words).toContainText("every hint");

    await dock.getByRole("button", { name: "Close" }).click();
    await expect(dock).toHaveCount(0);
});
