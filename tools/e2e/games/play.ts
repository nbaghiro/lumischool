// What a game's spec does before and around its play. A new spec opens its game with `openGame` and
// finds the field's things with `fieldPoints` in ../field.ts; ../steps.ts holds the family's steps.

import { expect, type Page } from "@playwright/test";

/**
 * A game at a level on the Games tab, with its probe drawn so a spec can find each thing by its key, and
 * every page error kept in `errors` for the spec to check at its end.
 */
export async function openGame(
    page: Page,
    game: string,
    level: number,
    errors: string[],
    probe: string,
): Promise<void> {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/games?g=${game}&v=${level}&probe=1`);
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator(".field-gl canvas").first()).toBeVisible();
    await expect(page.locator(`.field-probe [data-key="${probe}"]`)).toBeAttached();
}

/** Turns on reduced motion from the pause dialog, and gives the board the keys again. */
export async function reducedMotion(page: Page): Promise<void> {
    await page.getByRole("button", { name: "Pause & help" }).click();
    await page.getByText("Sound & accessibility", { exact: true }).click();
    await page.getByLabel("Reduced motion").check();
    await page.getByRole("button", { name: "Continue playing" }).click();
    await page.locator('[data-game="board"]').focus();
}
