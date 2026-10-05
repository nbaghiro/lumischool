import { expect } from "@playwright/test";
import { rallyCourse } from "../../../school/games/rally";
import { fieldPoints } from "../field";
import { test } from "../steps";

test("rally can reverse with Down and the on-screen control", async ({ page }) => {
    await page.goto("/games?g=rally&v=0");
    const car = page.locator('[data-key="car"]');
    await expect(car).toBeVisible();
    const before = await car.boundingBox();
    if (!before) throw new Error("Missing car");
    await page.locator('[data-game="board"]').focus();
    await page.keyboard.down("ArrowDown");
    await expect
        .poll(async () => (await car.boundingBox())?.y ?? Infinity)
        .toBeLessThan(before.y - 10);
    await page.keyboard.up("ArrowDown");
    await page.getByRole("button", { name: "Back on the road", exact: true }).click();
    const parked = await car.boundingBox();
    const button = await page
        .getByRole("button", { name: "Brake / reverse", exact: true })
        .boundingBox();
    if (!parked || !button) throw new Error("Missing reverse control");
    await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
    await page.mouse.down();
    await expect
        .poll(async () => (await car.boundingBox())?.y ?? Infinity)
        .toBeLessThan(parked.y - 10);
    await page.mouse.up();
});

for (const input of ["pointer", "keyboard"]) {
    test(`pocket rally: ${input} completes a circuit without shortcuts`, async ({ page }, info) => {
        await page.goto("/games?g=rally&v=0");
        const car = page.locator('[data-key="car"]');
        await expect(car).toBeVisible();
        await expect(page.locator(".game-menu")).not.toBeVisible();
        const parked = await car.getAttribute("style");
        await page.waitForTimeout(250);
        expect(await car.getAttribute("style")).toBe(parked);
        const { toScreen, toWorld } = await fieldPoints(page);
        const points = rallyCourse(0, 0).points;
        const touch = input === "pointer" && info.project.name === "phone";
        const cdp = touch ? await page.context().newCDPSession(page) : null;
        let held = "",
            pressed = false;
        // the car's heading is read from how it moves, so the spec does not depend on how a view draws it
        const first = points[0],
            second = points[1];
        let heading = first && second ? Math.atan2(second.y - first.y, second.x - first.x) : 0;
        let last: { x: number; y: number } | null = null;
        await page.locator('[data-game="board"]').focus();
        if (input === "keyboard") await page.keyboard.down("Space");
        const end = Date.now() + 35000;
        while (
            Date.now() < end &&
            !(await page.locator(".game-toolbar .game-finished").isVisible())
        ) {
            const pos = await car.evaluate((element) => {
                const rect = element.getBoundingClientRect();
                return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            });
            const { x, y } = toWorld(pos.x, pos.y);
            if (last && Math.hypot(x - last.x, y - last.y) > 0.05)
                heading = Math.atan2(y - last.y, x - last.x);
            last = { x, y };
            let nearest = 0,
                distance = Infinity;
            for (const [index, p] of points.entries()) {
                const d = Math.hypot(p.x - x, p.y - y);
                if (d < distance) {
                    nearest = index;
                    distance = d;
                }
            }
            const target = points[(nearest + 4) % points.length];
            if (!target) throw new Error("Missing path target");
            if (input === "pointer") {
                const { x: tx, y: ty } = toScreen(target.x, target.y);
                if (cdp)
                    await cdp.send("Input.dispatchTouchEvent", {
                        type: pressed ? "touchMove" : "touchStart",
                        touchPoints: [{ x: tx, y: ty, id: 1 }],
                    });
                else {
                    await page.mouse.move(tx, ty);
                    if (!pressed) await page.mouse.down();
                }
                pressed = true;
            } else {
                const raw = Math.atan2(target.y - y, target.x - x) - heading;
                const error = Math.atan2(Math.sin(raw), Math.cos(raw));
                const next = Math.abs(error) < 0.08 ? "" : error > 0 ? "ArrowRight" : "ArrowLeft";
                if (next !== held) {
                    if (held) await page.keyboard.up(held);
                    if (next) await page.keyboard.down(next);
                    held = next;
                }
            }
            await page.waitForTimeout(45);
        }
        if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        else if (input === "pointer") await page.mouse.up();
        if (held) await page.keyboard.up(held);
        if (input === "keyboard") await page.keyboard.up("Space");
        await expect(page.locator(".game-toolbar .game-finished")).toBeVisible();
        await expect(page.locator('[data-game="aside"]')).toContainText("all the way round");
        await page.locator('[data-game="shuffle"]').click();
        await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    });
}

test("pocket rally: reduced motion advances by input and recovery keeps the game playable", async ({
    page,
}) => {
    await page.goto("/games?g=rally&v=1");
    const car = page.locator('[data-key="car"]');
    await expect(car).toBeVisible();
    await page.getByRole("button", { name: "Pause & help" }).click();
    await page.getByText("Sound & accessibility", { exact: true }).click();
    await page.getByLabel("Reduced motion").check();
    await page.getByRole("button", { name: "Continue playing" }).click();
    const before = await car.getAttribute("style");
    await page.keyboard.press("Space");
    await expect(car).not.toHaveAttribute("style", before ?? "");
    const stopped = await car.getAttribute("style");
    await page.waitForTimeout(300);
    expect(await car.getAttribute("style")).toBe(stopped);
    await page.getByRole("button", { name: "Back on the road", exact: true }).click();
    await expect(page.locator('[data-game="aside"]')).toContainText("Back on the road");
});

test("slow for the bends: the signs are read out, and the speed rises as the car goes", async ({
    page,
}) => {
    await page.goto("/games?g=rally&v=3");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const reads = page.locator('[data-game="reads"]');
    await expect(reads).toContainText("The bends' signs say 3 and 4");
    await expect(reads).toContainText("Speed 0");
    await page.locator('[data-game="board"]').focus();
    await page.keyboard.down("Space");
    await expect(reads).toContainText(/Speed [2-9]/, { timeout: 5_000 });
    await page.keyboard.up("Space");
});
