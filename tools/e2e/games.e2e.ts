import { expect } from "@playwright/test";
import { signInAs, test } from "./steps";

for (const game of ["straight", "jump", "pour"]) {
    test(`${game}: ready, play, pause and return`, async ({ page }) => {
        await page.goto(`/games?g=${game}`);
        const menu = page.locator(".game-menu");
        await expect(menu).toBeVisible();
        await expect(page.locator(".page-main")).toHaveClass(/stage/);
        await menu.getByRole("button", { name: "Play", exact: true }).click();
        await expect(menu).not.toBeVisible();
        await expect(page.locator(".board > :not([hidden])").first()).toBeVisible();
        await expect(page.locator(".board")).not.toContainText("no drawing called");
        await expect(page.locator(".board > :not([hidden]) svg").first()).toBeVisible();
        const bounds = await page.locator(".hands").boundingBox();
        expect(bounds).not.toBeNull();
        if (bounds)
            expect(bounds.y + bounds.height).toBeLessThanOrEqual(
                await page.evaluate(() => innerHeight + 1),
            );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await page.getByRole("button", { name: "Pause & help" }).click();
        await expect(menu).toBeVisible();
        await menu.getByLabel("Choose a challenge").selectOption("1");
        await expect(menu).toBeVisible();
        await menu.getByRole("button", { name: "Play", exact: true }).click();
        await page.keyboard.press("Escape");
        await expect(menu).toBeVisible();
        await menu.getByRole("button", { name: "All games", exact: true }).click();
        await expect(page.locator(".game-library")).toBeVisible();
        await expect(page.locator(".page-main")).not.toHaveClass(/stage/);
    });
}

test("rowing buttons move the boat and pause holds its state", async ({ page }) => {
    await page.goto("/games?g=straight");
    const menu = page.locator(".game-menu");
    await menu.getByText("Sound & accessibility", { exact: true }).click();
    await menu.getByLabel("Describe the scene").check();
    await menu.getByRole("button", { name: "Play", exact: true }).click();
    const description = page.locator('[data-game="reads"]');
    const before = await description.textContent();
    await page.getByRole("button", { name: "Row forwards", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(description).not.toHaveText(before ?? "");
    await page.getByRole("button", { name: "Pause & help" }).click();
    const paused = await description.textContent();
    await page.waitForTimeout(1100);
    await expect(description).toHaveText(paused ?? "");
    await menu.getByRole("button", { name: "Continue playing" }).click();
    await expect(menu).not.toBeVisible();
});

test("browser back returns from play to the library", async ({ page }) => {
    await page.goto("/games");
    await page.locator('[data-game-id="jump"]').click();
    await expect(page.locator(".game-menu")).toBeVisible();
    await page.goBack();
    await expect(page.locator(".game-library")).toBeVisible();
    await page.goForward();
    await expect(page.locator(".game-menu")).toBeVisible();
});

test("the signed-in parent header leaves room for play controls", async ({ page }) => {
    await signInAs(page);
    await page.goto("/games?g=straight");
    await page.locator(".game-menu").getByRole("button", { name: "Play", exact: true }).click();
    await expect
        .poll(async () => {
            const controls = await page.locator(".hands").boundingBox();
            return controls ? controls.y + controls.height : Infinity;
        })
        .toBeLessThanOrEqual(await page.evaluate(() => innerHeight + 1));
});

test("road controls expose each action once and keep navigation compact", async ({ page }) => {
    await page.goto("/games?g=road");
    await page.locator(".game-menu").getByRole("button", { name: "Play", exact: true }).click();
    await expect(
        page.locator('[data-game="pad"]').getByRole("button", { name: "Go", exact: true }),
    ).toHaveCount(1);
    await expect(
        page.locator('[data-game="pad"]').getByRole("button", { name: "Brake", exact: true }),
    ).toHaveCount(1);
    await expect(page.locator('[data-game="pad"] button')).toHaveCount(4);
    await expect(
        page.locator(".game-toolbar").getByRole("button", { name: "All games", exact: true }),
    ).toHaveCSS("width", "44px");
    await page.getByRole("button", { name: "Pause & help" }).click();
    await expect(page.locator(".game-stamp svg")).toBeVisible();
    await expect(page.locator('[data-game="keys"]')).not.toBeVisible();
    await page.getByText("How to play", { exact: true }).click();
    await expect(page.locator('[data-game="keys"]')).toBeVisible();
});

test("undo uses the shared drawing and keeps its action name", async ({ page }) => {
    await page.goto("/games?g=spell");
    await page.locator(".game-menu").getByRole("button", { name: "Play", exact: true }).click();
    const undo = page.getByRole("button", { name: "Undo last move", exact: true });
    await expect(undo.locator('svg[data-visual="icon"]')).toBeVisible();
    await expect(undo).toHaveAttribute("title", "Undo last move");
    await page.locator('[data-game="tray"] button').first().click();
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(undo).toBeDisabled();
});

test("rabbit mouse drag lands on a stone and leaves no old dots", async ({ page }) => {
    await page.goto("/games?g=jump");
    const menu = page.locator(".game-menu");
    await menu.getByText("Sound & accessibility", { exact: true }).click();
    await menu.getByLabel("Describe the scene").check();
    await menu.getByRole("button", { name: "Play", exact: true }).click();
    const rabbit = page.locator('[data-key="rabbit"]');
    await expect(rabbit).toBeVisible();
    const box = await rabbit.boundingBox();
    if (!box) throw new Error("Rabbit has no bounds");
    const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - (((3 * 4.5) / 5.5) * box.width) / 2.6, y, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator('[data-game="reads"]')).toContainText("on the stone at 3");
    await expect(page.locator(".field .dot")).toHaveCount(0);
});

test("road supports mouse acceleration and braking directly on the field", async ({ page }) => {
    await page.goto("/games?g=road");
    await page.locator(".game-menu").getByRole("button", { name: "Play", exact: true }).click();
    const field = page.locator(".field");
    const box = await field.boundingBox();
    if (!box) throw new Error("Road has no bounds");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(250);
    await page.mouse.up();
    await page.mouse.down({ button: "right" });
    await page.waitForTimeout(500);
    const car = page.locator('[data-key="car"]');
    const before = await car.getAttribute("style");
    await page.waitForTimeout(300);
    expect(await car.getAttribute("style")).toBe(before);
    await page.mouse.up({ button: "right" });
});
