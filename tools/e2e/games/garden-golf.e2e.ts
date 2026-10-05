import { expect } from "@playwright/test";
import { fieldPoints } from "../field";
import { test } from "../steps";

for (const input of ["keyboard", "pointer", "reduced motion"]) {
    test(`garden golf: ${input} putt finishes and another keeps its phase`, async ({
        page,
    }, info) => {
        await page.goto("/games?g=golf&v=0&probe=1");
        await expect(page.locator(".game-field")).toBeVisible();
        await expect(page.locator(".game-menu")).not.toBeVisible();
        await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
        if (input === "reduced motion") {
            await page.getByRole("button", { name: "Pause & help" }).click();
            await page.getByText("Sound & accessibility", { exact: true }).click();
            await page.getByLabel("Reduced motion").check();
            await page.getByRole("button", { name: "Continue playing" }).click();
        }
        if (input === "pointer") {
            const { toScreen } = await fieldPoints(page);
            const from = toScreen(8, 13),
                to = toScreen(8 - Math.sqrt(15), 13);
            if (info.project.name === "phone") {
                const touch = await page.context().newCDPSession(page);
                await touch.send("Input.dispatchTouchEvent", {
                    type: "touchStart",
                    touchPoints: [{ ...from, id: 1 }],
                });
                await touch.send("Input.dispatchTouchEvent", {
                    type: "touchMove",
                    touchPoints: [{ ...to, id: 1 }],
                });
                await touch.send("Input.dispatchTouchEvent", {
                    type: "touchEnd",
                    touchPoints: [],
                });
                await touch.detach();
            } else {
                await page.mouse.move(from.x, from.y);
                await page.mouse.down();
                await page.mouse.move(to.x, to.y, { steps: 12 });
                await page.mouse.up();
            }
        } else await page.keyboard.press("Enter");
        await expect(page.locator(".game-toolbar .game-finished")).toBeVisible();
        await page.locator('[data-game="shuffle"]').click();
        await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
        await expect(page).toHaveURL(/v=0/);
        await expect(page.locator(".field-gl canvas")).toBeVisible();
    });
}

test("garden golf: a new hole, through the pipe, is sunk by a putt from the keys", async ({
    page,
}) => {
    await page.goto("/games?g=golf&v=7&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator('[data-key="pipe0in"]')).toHaveCount(1);
    await page.keyboard.press("Enter");
    await expect(page.locator(".game-toolbar .game-finished")).toBeVisible();
    await expect(page.locator(".game-toolbar .game-finished")).toContainText("hole in one");
});
