// The teaching board: a parent's preview walked to its recap, a board that survives a reload and a
// repeated turn, and a second family that cannot reach the session.

import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { atScreen, newDevice, signInAs, signInHere, smallTargets, test } from "../steps";

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

/** The right answer for every question the three bundles ask, so a walk is the lesson, not a guess. */
const answers = new Map<string, string>();
for (const file of ["making-ten", "reading-clues", "food-chains"]) {
    const material: unknown = JSON.parse(
        readFileSync(
            new URL(`../../../content/curriculum/teaching/${file}.json`, import.meta.url),
            {
                encoding: "utf8",
            },
        ),
    );
    const frames: unknown[] =
        isRecord(material) && Array.isArray(material.frames) ? material.frames : [];
    if (frames.length === 0) throw new Error(`${file} has no frames`);
    for (const frame of frames) {
        const question = isRecord(frame) ? frame.question : null;
        if (
            isRecord(question) &&
            typeof question.prompt === "string" &&
            typeof question.correct === "string"
        )
            answers.set(question.prompt.trim(), question.correct);
    }
}

const ended = (page: Page) =>
    page.getByText(/Ready to try it in your lesson|We can come back to this/);

/**
 * One step of the board: the doing beat first, where a step has something to move, then the check,
 * whose question stands in the caption and whose choices are the only action.
 */
async function teachStep(page: Page, wrongly = false): Promise<boolean> {
    const response = page.locator(".teaching-response");
    await expect(response).toHaveAttribute("aria-busy", "false");
    const ready = page.getByRole("button", { name: "I am ready" });
    if (await ready.count()) {
        await ready.first().click();
        await expect(ready).toHaveCount(0);
    }
    const choices = page.locator(".teaching-choices button");
    if (await choices.count()) {
        const prompt = (await page.locator(".teaching-caption p").first().textContent())?.trim();
        const correct = answers.get(prompt ?? "");
        const labels = await choices.allTextContents();
        const index = labels.findIndex((label) =>
            wrongly ? label.trim() !== correct : label.trim() === correct,
        );
        await choices.nth(index < 0 ? 0 : index).click();
    } else {
        const carry = page.getByRole("button", { name: "Continue", exact: true });
        if (!(await carry.count())) return false;
        await carry.first().click();
    }
    await expect(response).toHaveAttribute("aria-busy", "false");
    return true;
}

/** The quiet control holds what a child rarely wants: another way, a grown-up, a pause, a size. */
async function elseMenu(page: Page): Promise<void> {
    const opener = page.getByRole("button", { name: "I need something else" });
    if ((await opener.getAttribute("aria-expanded")) !== "true") await opener.click();
}

async function openPreview(page: Page): Promise<void> {
    await page.goto("/tutoring");
    await atScreen(page, page.getByRole("heading", { name: "A little help, together" }));
    await page.getByRole("button", { name: "Start a fresh lesson" }).click();
    await expect(page.locator(".teaching-caption p").first()).toBeVisible();
}

test("a parent teaches a lesson through to its recap, on a board that fits the window and answers a finger", async ({
    page,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await signInAs(page);
    await openPreview(page);
    const board = page.locator(".teaching");
    await expect(board).toHaveAttribute("aria-label", "A little bridge to ten");

    // a demonstration with nothing to move says nothing about moving, and the board keeps its width
    for (let step = 0; step < 24 && !(await ended(page).count()); step++)
        if (!(await teachStep(page))) break;
    await expect(ended(page)).toHaveText("Ready to try it in your lesson.");
    await elseMenu(page);
    await expect(page.getByRole("button", { name: "Ask a grown-up" })).toHaveCount(0);
    expect(await smallTargets(board)).toEqual([]);
    const width = page.viewportSize()?.width ?? 1440;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width + 1,
    );
    expect(errors).toEqual([]);
});

test("a board shrinks, pauses and comes back to the same step after a reload, and a repeated turn adds nothing", async ({
    page,
    browser,
}) => {
    await signInAs(page);
    await openPreview(page);
    const caption = page.locator(".teaching-caption p").first();
    const first = (await caption.textContent())?.trim();

    await elseMenu(page);
    await page.getByRole("button", { name: "Smaller", exact: true }).click();
    await expect(page.locator(".teaching")).toHaveClass(/teaching-compact/);
    await elseMenu(page);
    await page.getByRole("button", { name: "Open board" }).click();
    await elseMenu(page);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.getByText("Take your time.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue together" }).click();

    await page.reload();
    await expect(page.locator(".teaching-caption p").first()).toHaveText(first ?? "");

    // the same operation id is the same turn however many times it arrives, and a stale one is refused
    const turns = await page.evaluate(async () => {
        const id = crypto.randomUUID();
        const headers = { "content-type": "application/json" };
        const start = await fetch("/api/tutoring/start", {
            method: "POST",
            headers,
            body: JSON.stringify({ id, material: "making-ten", preferences: {} }),
        });
        const command = {
            operationId: crypto.randomUUID(),
            expectedRevision: 0,
            action: "continue",
        };
        const send = () =>
            fetch(`/api/tutoring/${id}/turn`, {
                method: "POST",
                headers,
                body: JSON.stringify(command),
            });
        const read = async (): Promise<{ revision: number; frameId: string }> => {
            const body: unknown = await (await send()).json();
            const state =
                typeof body === "object" && body !== null && "state" in body ? body.state : null;
            if (typeof state !== "object" || state === null || !("revision" in state))
                throw new Error("the turn did not answer a state");
            const step = "step" in state ? state.step : null;
            const frameId =
                typeof step === "object" && step !== null && "frameId" in step
                    ? step.frameId
                    : null;
            if (typeof state.revision !== "number" || typeof frameId !== "string")
                throw new Error("the turn's state did not read");
            return { revision: state.revision, frameId };
        };
        const once = await read();
        const again = await read();
        const stale = await fetch(`/api/tutoring/${id}/turn`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ...command, operationId: crypto.randomUUID() }),
        });
        return {
            id,
            started: start.status,
            once: once.revision,
            again: again.revision,
            step: once.frameId === again.frameId,
            stale: stale.status,
        };
    });
    expect(turns.started).toBe(200);
    expect(turns.once).toBe(1);
    expect(turns.again).toBe(1);
    expect(turns.step).toBe(true);
    expect(turns.stale).toBe(409);

    // another family's browser cannot read that session at all
    const other = await newDevice(browser, test.info());
    const theirs = await other.newPage();
    await signInHere(theirs);
    expect(
        await theirs.evaluate(async (id) => (await fetch(`/api/tutoring/${id}`)).status, turns.id),
    ).toBe(404);
    await other.close();
});

test("the tutor teaches a question the bundles do not cover, opening on the question's own hint", async ({
    page,
    browser,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await signInAs(page);
    await page.goto("/tutoring");
    await atScreen(page, page.getByRole("heading", { name: "A little help, together" }));
    await page.locator("select").first().selectOption("question:g1-counting-to-twenty");
    await page.getByRole("button", { name: "Start a fresh lesson" }).click();

    // The first line is the question's own, on screen before any turn, so nobody waits on a model.
    const caption = page.locator(".teaching-caption p").first();
    await expect(caption).toBeVisible();
    await expect(caption).not.toHaveText("");
    // The question's own picture is what the board draws, not a bundle's illustration.
    await expect(page.locator(".teaching-scene > svg.scene-svg")).toHaveCount(1);
    await expect(page.locator(".teaching-steps")).toHaveCount(0);
    const board = page.locator(".teaching");
    expect(await smallTargets(board)).toEqual([]);

    // Where the model is away, the board keeps teaching from the hints rather than emptying.
    const response = page.locator(".teaching-response");
    await expect(response).toHaveAttribute("aria-busy", "false");
    const helps = await page.evaluate(async () => {
        const headers = { "content-type": "application/json" };
        const id = crypto.randomUUID();
        const body = {
            id,
            lesson: "g1-counting-to-twenty",
            n: 2,
            variant: "t=5,b=6",
            tries: [{ answer: "5", told: null }],
        };
        const start = await fetch("/api/tutoring/help/start", {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
        const operationId = crypto.randomUUID();
        const turn = () =>
            fetch(`/api/tutoring/help/${id}/turn`, {
                method: "POST",
                headers,
                body: JSON.stringify({ operationId, expectedRevision: 0, answer: null, tries: [] }),
            });
        const revision = async (): Promise<number> => {
            const body: unknown = await (await turn()).json();
            const help =
                typeof body === "object" && body !== null && "help" in body ? body.help : null;
            const r =
                typeof help === "object" && help !== null && "revision" in help
                    ? help.revision
                    : null;
            if (typeof r !== "number") throw new Error("the turn did not answer a help");
            return r;
        };
        const once = await revision();
        const again = await revision();
        const stale = await fetch(`/api/tutoring/help/${id}/turn`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                operationId: crypto.randomUUID(),
                expectedRevision: 0,
                answer: null,
                tries: [],
            }),
        });
        return {
            id,
            started: start.status,
            once,
            again,
            stale: stale.status,
        };
    });
    expect(helps.started).toBe(200);
    expect(helps.once).toBe(1);
    expect(helps.again).toBe(1);
    expect(helps.stale).toBe(409);

    // another family cannot read that help either
    const other = await newDevice(browser, test.info());
    const theirs = await other.newPage();
    await signInHere(theirs);
    expect(
        await theirs.evaluate(
            async (id) => (await fetch(`/api/tutoring/help/${id}`)).status,
            helps.id,
        ),
    ).toBe(404);
    await other.close();
    expect(errors).toEqual([]);
});
