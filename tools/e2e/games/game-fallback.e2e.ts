// A browser without WebGL2, made by refusing the context: a turn game is drawn as a still picture
// and stays playable, and an action game says it needs a newer browser. See .docs/game-engine.md, P3.
import { expect, type Page } from "@playwright/test";
import { test } from "../steps";

async function withoutWebGl2(page: Page): Promise<void> {
    await page.addInitScript({
        content: `{
            const get = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
                return type === "webgl2" ? null : get.call(this, type, ...rest);
            };
        }`,
    });
}

test("without WebGL2 a turn game shows a still board and plays", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await withoutWebGl2(page);
    await page.goto("/games?g=shut");
    const board = page.locator(".board > .field-still:not([hidden])");
    await expect(board.locator("svg[data-visual]").first()).toBeVisible();
    await expect(page.locator(".board canvas")).toHaveCount(0);
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.getByRole("alert")).toHaveCount(0);
    const before = await board.innerHTML();
    await page.locator(".hands button").first().click();
    await expect.poll(async () => (await board.innerHTML()) !== before).toBe(true);
    expect(errors).toEqual([]);
});

test("without WebGL2 an action game says it needs a newer browser", async ({ page }) => {
    await withoutWebGl2(page);
    await page.goto("/games?g=golf");
    await expect(page.getByRole("alert")).toContainText("needs a newer browser");
    await expect(page.locator(".board .game-field")).toHaveCount(0);
});
