import { expect } from "@playwright/test";
import { test } from "./steps";

for (const input of ["keyboard", "pointer", "reduced motion"]) {
    test(`garden golf: ${input} putt finishes and another keeps its phase`, async ({
        page,
    }, info) => {
        await page.goto("/games?g=golf&v=0");
        const field = page.locator(".field");
        await expect(field).toBeVisible();
        await expect(page.locator(".game-menu")).not.toBeVisible();
        await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
        if (input === "reduced motion") {
            await page.getByRole("button", { name: "Pause & help" }).click();
            await page.getByText("Sound & accessibility", { exact: true }).click();
            await page.getByLabel("Reduced motion").check();
            await page.getByRole("button", { name: "Continue playing" }).click();
        }
        if (input === "pointer") {
            const box = await field.boundingBox();
            if (!box) throw new Error("Missing golf field");
            if (info.project.name === "phone") {
                const touch = await page.context().newCDPSession(page);
                await touch.send("Input.dispatchTouchEvent", {
                    type: "touchStart",
                    touchPoints: [
                        { x: box.x + (box.width * 8) / 36, y: box.y + box.height / 2, id: 1 },
                    ],
                });
                await touch.send("Input.dispatchTouchEvent", {
                    type: "touchMove",
                    touchPoints: [
                        {
                            x: box.x + (box.width * (8 - Math.sqrt(15))) / 36,
                            y: box.y + box.height / 2,
                            id: 1,
                        },
                    ],
                });
                await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
                await touch.detach();
            } else {
                await page.mouse.move(box.x + (box.width * 8) / 36, box.y + box.height / 2);
                await page.mouse.down();
                await page.mouse.move(
                    box.x + (box.width * (8 - Math.sqrt(15))) / 36,
                    box.y + box.height / 2,
                    { steps: 12 },
                );
                await page.mouse.up();
            }
        } else await page.keyboard.press("Enter");
        await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible();
        await page.screenshot({
            path: `/tmp/garden-golf-${info.project.name}-${input.replaceAll(" ", "-")}.png`,
        });
        await page.getByRole("button", { name: "Play another", exact: true }).click();
        await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
        await expect(page).toHaveURL(/v=0/);
    });
}
