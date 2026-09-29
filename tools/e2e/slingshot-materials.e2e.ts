import { expect, type Page } from "@playwright/test";
import { test } from "./steps";

async function keyboardShot(page: Page): Promise<void> {
    for (let turn = 0; turn < 5; turn++) await page.keyboard.press("ArrowDown", { delay: 40 });
    for (let power = 0; power < 3; power++) await page.keyboard.press("ArrowRight", { delay: 40 });
    await page.keyboard.press("Enter");
}

for (const input of ["pointer", "keyboard", "reduced motion"] as const) {
    test(`rolling stone: ${input} wins, exact retry and another keep the new phase`, async ({
        page,
    }, info) => {
        await page.goto("/games?g=sling&v=2");
        const player = page.locator(".game-player"),
            field = page.locator(".game-field");
        await expect(player).toHaveAttribute("data-game-ready", "true");
        await expect(field).toBeVisible();
        await expect(page.locator(".game-menu")).not.toBeVisible();
        const challenge = await player.getAttribute("data-challenge");
        expect(challenge).toBeTruthy();
        if (input === "reduced motion") {
            await page.getByRole("button", { name: "Pause & help" }).click();
            await page.getByText("Sound & accessibility", { exact: true }).click();
            await page.getByLabel("Reduced motion").check();
            await page.getByRole("button", { name: "Continue playing" }).click();
        }
        await page.screenshot({
            path: `/tmp/slingshot-materials-${info.project.name}-${input.replaceAll(" ", "-")}-before.png`,
        });
        if (input === "pointer") {
            // Press on the loaded ball as it is drawn and pull back past the sling's longest pull
            // at ten degrees; the game clamps a pull to its longest, so the shot does not depend on
            // the field's scale. The browser receives ordinary pointer events.
            const ball = await page.locator('[data-key="loaded:0"]').boundingBox();
            const field = await page.locator(".game-field").boundingBox();
            if (!ball || !field) throw new Error("Missing the loaded ball");
            const begin = { x: ball.x + ball.width / 2, y: ball.y + ball.height / 2 },
                angle = (10 * Math.PI) / 180,
                far = Math.min(begin.x - field.x - 4, 400);
            await page.mouse.move(begin.x, begin.y);
            await page.mouse.down();
            await page.mouse.move(
                begin.x - Math.cos(angle) * far,
                begin.y + Math.sin(angle) * far,
                {
                    steps: 12,
                },
            );
            await page.mouse.up();
        } else await keyboardShot(page);
        const another = page.getByRole("button", { name: "Play another", exact: true });
        await expect(another).toBeVisible();
        await page.screenshot({
            path: `/tmp/slingshot-materials-${info.project.name}-${input.replaceAll(" ", "-")}-won.png`,
        });
        await page.getByRole("button", { name: "Try again", exact: true }).click();
        await expect(player).toHaveAttribute("data-challenge", challenge ?? "");
        await expect(player).toHaveAttribute("data-game-ready", "true");
        await keyboardShot(page);
        await expect(another).toBeVisible();
        await another.click();
        await expect(player).toHaveAttribute("data-game-ready", "true");
        await expect(player).not.toHaveAttribute("data-challenge", challenge ?? "");
        await expect(page).toHaveURL(/v=2/);
        await keyboardShot(page);
        await expect(another).toBeVisible();
    });
}

test("stone wall: hard throws with the keys break the wall and knock both stars down", async ({
    page,
}) => {
    await page.goto("/games?g=sling&v=3");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    // the aim starts at 35 degrees and a pull of 3; each arrow turns it 5 degrees or pulls half a square
    let aim = { deg: 35, pull: 3 };
    const another = page.getByRole("button", { name: "Play another", exact: true });
    // every certified wall falls to one of these pairs of throws (school/games/__tests__/sling-materials.test.ts)
    const throws = [
        [15, 4.5],
        [5, 4.5],
        [30, 3.5],
        [15, 4],
        [25, 4],
        [10, 4.5],
    ] as const;
    for (const [deg, pull] of throws) {
        if (await another.isVisible()) break;
        while (aim.deg !== deg) {
            await page.keyboard.press(aim.deg > deg ? "ArrowDown" : "ArrowUp", { delay: 30 });
            aim = { ...aim, deg: aim.deg + (aim.deg > deg ? -5 : 5) };
        }
        while (aim.pull !== pull) {
            await page.keyboard.press(aim.pull > pull ? "ArrowLeft" : "ArrowRight", { delay: 30 });
            aim = { ...aim, pull: aim.pull + (aim.pull > pull ? -0.5 : 0.5) };
        }
        await page.keyboard.press("Enter");
        await expect(another.or(page.locator('[data-key="loaded:0"]'))).toBeVisible({
            timeout: 20_000,
        });
        await page.waitForTimeout(400);
    }
    await expect(another).toBeVisible({ timeout: 20_000 });
});
