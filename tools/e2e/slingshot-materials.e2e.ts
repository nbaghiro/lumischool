import { expect, type Page } from "@playwright/test";
import { test } from "./steps";
import { start } from "../../school/games/sling";

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
            field = page.locator(".field");
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
            // Transform the authored pouch and legal pull through the rendered, grown viewport.
            // The browser receives ordinary pointer events; no live game state is accessed or changed.
            const state = start(2),
                box = await field.boundingBox();
            if (!box) throw new Error("Missing sling field");
            const transform = await field.evaluate((element) => {
                const paper = element.querySelector(".field-paper");
                if (!paper) throw new Error("Missing fitted paper");
                const matrix = new DOMMatrix(getComputedStyle(paper).transform);
                return {
                    square: parseFloat(getComputedStyle(element).getPropertyValue("--sq")),
                    a: matrix.a,
                    d: matrix.d,
                    x: matrix.e,
                    y: matrix.f,
                };
            });
            const point = (x: number, y: number) => ({
                x: box.x + transform.x + x * transform.square * transform.a,
                y: box.y + transform.y + y * transform.square * transform.d,
            });
            const begin = point(state.L.pouch.x, state.L.pouch.y),
                angle = (10 * Math.PI) / 180;
            const end = point(
                state.L.pouch.x - Math.cos(angle) * 4.5,
                state.L.pouch.y + Math.sin(angle) * 4.5,
            );
            await page.mouse.move(begin.x, begin.y);
            await page.mouse.down();
            await page.mouse.move(end.x, end.y, { steps: 12 });
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
