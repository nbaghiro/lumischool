import { expect, type Page } from "@playwright/test";
import { test } from "./steps";
import { fieldPoints } from "./field";
import { HULL, RIVER_LEVELS, bankAt, gateX, halfAt, lineX, middle } from "../../school/games/row";

/** The canoe's middle on the screen, and how many pixels a square is, from its drawing's width. */
async function canoe(page: Page) {
    return page.locator('[data-key="canoe"]').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return {
            x: r.x + r.width / 2,
            y: r.y + r.height / 2,
            square: el instanceof HTMLElement ? el.offsetWidth / ((3.6 * 5) / 4.6) : 20,
        };
    });
}

/** Where the canoe's middle is in the world's squares. */
async function canoeInWorld(page: Page) {
    const c = await canoe(page),
        f = await fieldPoints(page);
    return f.toWorld(c.x, c.y);
}

/** Holds the mouse on the water at a place in the world until `done` says so, following it as the camera moves. */
async function steerTo(page: Page, at: { x: number; y: number }, done: () => Promise<boolean>) {
    for (let i = 0; i < 200 && !(await done()); i++) {
        const f = await fieldPoints(page),
            p = f.toScreen(at.x, at.y);
        await page.mouse.move(p.x, p.y);
        await page.waitForTimeout(150);
    }
}

test("down the river: a finger held on each gate and then on the bank steers the canoe to a win", async ({
    page,
}, info) => {
    test.skip(
        info.project.name === "phone",
        "the finger is held with the mouse, which this project has not got",
    );
    test.setTimeout(240_000);
    await page.goto("/games?g=straight&v=0&probe=1");
    const player = page.locator(".game-player");
    await expect(player).toHaveAttribute("data-game-ready", "true");
    const L = RIVER_LEVELS[0];
    const note = page.locator(".game-toolbar [data-game=aside]");
    await expect(note).toContainText("Hold a finger on the water");
    const start = await fieldPoints(page);
    const first = start.toScreen(gateX(L, 0), middle(L, gateX(L, 0)));
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (let k = 0; k < L.count.length; k++) {
        const x = gateX(L, k),
            side = L.sides[k] ?? 1;
        await steerTo(page, { x: x + 2, y: middle(L, x) + (side * halfAt(L, x)) / 2 }, async () => {
            const w = await canoeInWorld(page);
            return w.x > x + 1;
        });
    }
    const dock = lineX(L, L.dock);
    await steerTo(page, { x: dock, y: bankAt(L, dock) + HULL.r + 0.5 }, async () =>
        ((await note.textContent()) ?? "").includes(L.done),
    );
    await page.mouse.up();
    await expect(note).toContainText(L.done);
    await page.screenshot({ path: `/tmp/down-the-river-finger-${info.project.name}.png` });
});

test("down the river: the keys and the buttons still paddle, turn and back water", async ({
    page,
}, info) => {
    await page.goto("/games?g=straight&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    for (const name of ["Paddle", "Back water"])
        await expect(page.getByRole("button", { name, exact: true }).first()).toBeVisible();
    const before = await canoe(page);
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(350);
    await page.keyboard.up("ArrowUp");
    await page.waitForTimeout(600);
    const moved = await canoe(page);
    expect(Math.abs(moved.x - before.x) + Math.abs(moved.y - before.y)).toBeGreaterThan(
        before.square * 0.5,
    );
    const turning = await page.locator('[data-key="canoe"]').getAttribute("data-angle");
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(350);
    await page.keyboard.up("ArrowRight");
    await expect
        .poll(async () => page.locator('[data-key="canoe"]').getAttribute("data-angle"))
        .not.toBe(turning);
    await page.screenshot({ path: `/tmp/down-the-river-keys-${info.project.name}.png` });
});
