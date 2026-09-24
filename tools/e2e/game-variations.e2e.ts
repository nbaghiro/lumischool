import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import type { GameAttempt } from "../../engine/answer";
import { GAMES } from "../../school/games/catalogue";
import { challengeFor } from "../../school/games/challenges";
import { signInAs, test } from "./steps";

const record = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

test("parent games stay unassigned and report-free while recovering already-owned attempts", async ({
    page,
}) => {
    await signInAs(page);
    const me: unknown = await (await page.request.get("/api/me")).json();
    const family: unknown = await (await page.request.get("/api/family")).json();
    if (
        !record(me) ||
        !record(me.family) ||
        !record(me.user) ||
        typeof me.family.id !== "string" ||
        typeof me.user.id !== "string" ||
        !record(family) ||
        !Array.isArray(family.kids) ||
        !record(family.kids[0]) ||
        typeof family.kids[0].id !== "string"
    )
        throw new Error("Missing family fixture");
    const familyId = me.family.id,
        user = me.user.id,
        kid = family.kids[0].id;
    const game = GAMES.find((g) => g.id === "spell");
    if (!game) throw new Error("Missing spelling game");
    const attempt: GameAttempt = {
        id: randomUUID(),
        challenge: challengeFor(game, 0, 1),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        outcome: "completed",
        moves: 3,
        assistance: 0,
        retries: 0,
        activeMs: 1000,
        input: "pointer",
        reducedMotion: false,
        objectives: { completed: 1, total: 1 },
    };
    // An explicitly bound past attempt, already written by the recording adapter while offline.
    // A stale selector preference must never bind today's parent play to this child.
    await page.evaluate(
        ({ familyId, user, kid, id, queued }) => {
            localStorage.setItem(`games.${familyId}.${user}.child`, kid);
            localStorage.setItem(`lumischool.game-attempt.v1.${id}`, queued);
        },
        {
            familyId,
            user,
            kid,
            id: attempt.id,
            queued: JSON.stringify({ family: familyId, user, kid, attempt }),
        },
    );
    await page.goto("/games");
    await expect(page.getByLabel("Playing as")).toHaveCount(0);
    await expect(page.getByText("Game progress", { exact: true })).toHaveCount(0);
    const read = async () => {
        const value: unknown = await (
            await page.request.get(`/api/events?kid=${kid}&kinds=game-attempted`)
        ).json();
        if (!record(value) || !Array.isArray(value.events)) throw new Error("Missing events");
        return value.events.length;
    };
    await expect.poll(read).toBe(1);
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    Object.keys(localStorage).filter((key) =>
                        key.startsWith("lumischool.game-attempt.v1."),
                    ).length,
            ),
        )
        .toBe(0);
    await page.locator('[data-game-id="spell"]').click();
    const player = page.locator(".game-player");
    const first = await player.getAttribute("data-challenge");
    await expect(page.locator(".game-menu")).not.toBeVisible();
    const finish = async () => {
        for (const sound of ["b", "u", "s"])
            await page
                .locator('[data-game="tray"]')
                .getByRole("button", {
                    name: `Put "${sound}" in the next box`,
                    exact: true,
                })
                .click();
        await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible();
        await expect(page.locator(".game-finished")).toContainText("That is how it is spelled.");
        await expect(page.locator(".game-finished .game-cover svg")).toBeVisible();
        await expect(page.locator(".game-toolbar [data-game=aside]")).toHaveCount(0);
        await expect(
            page.getByRole("button", { name: "Try the next phase", exact: true }),
        ).toHaveCount(0);
    };
    await finish();
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(player).toHaveAttribute("data-challenge", first ?? "");
    await finish();
    await page.getByRole("button", { name: "Play another", exact: true }).click();
    await expect(player).not.toHaveAttribute("data-challenge", first ?? "");
    const generated = await player.getAttribute("data-challenge");
    await page.reload();
    await expect(player).toHaveAttribute("data-challenge", generated ?? "");
    expect(await read()).toBe(1);
    await expect(page.locator(".game-menu")).not.toBeVisible();
    await page.getByRole("button", { name: "All games", exact: true }).click();
    await expect(page.getByLabel("Playing as")).toHaveCount(0);
    await expect(page.getByText("Game progress", { exact: true })).toHaveCount(0);
    await page.goBack();
    await expect(player).toHaveAttribute("data-challenge", generated ?? "");
    expect(await read()).toBe(1);
});
