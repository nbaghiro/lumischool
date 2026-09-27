import { expect } from "@playwright/test";
import { test } from "./steps";
import { playTrain } from "./train-hands";

test("sound train: the wagons are pushed on in order and the train leaves spelling the picture", async ({
    page,
}, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=spell&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await playTrain(page, 0);
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible();
    await expect(page.locator(".game-finished")).toContainText("bus");
    await page.screenshot({ path: `/tmp/sound-train-${info.project.name}.png` });
    expect(errors).toEqual([]);
});

test("sound train: with the sound on, a hard push from the keys knocks the train and rolls back", async ({
    page,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/games?g=spell&v=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    // the knock is heard through the train's own kit, so the sound is on
    await page.getByRole("button", { name: "Pause & help" }).click();
    await page.getByText("Sound & accessibility", { exact: true }).click();
    await page.getByLabel("Sound", { exact: true }).check();
    await page.getByRole("button", { name: "Continue playing" }).click();
    await page.keyboard.press("ArrowRight");
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowUp");
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(2000);
    await page.keyboard.up("ArrowUp");
    await page.keyboard.press("Space");
    await expect(page.locator(".game-player")).toContainText(/Too fast/, { timeout: 15000 });
    expect(errors).toEqual([]);
});
