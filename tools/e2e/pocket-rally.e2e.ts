import { expect } from "@playwright/test";
import { rallyCourse } from "../../school/games/rally";

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
import { test } from "./steps";

for (const input of ["pointer", "keyboard"]) {
    test(`pocket rally: ${input} completes a circuit without shortcuts`, async ({ page }, info) => {
        await page.goto("/games?g=rally&v=0");
        const field = page.locator(".field"),
            car = page.locator('[data-key="car"]');
        await expect(car).toBeVisible();
        await expect(page.locator(".game-menu")).not.toBeVisible();
        const parked = await car.getAttribute("style");
        await page.waitForTimeout(250);
        expect(await car.getAttribute("style")).toBe(parked);
        const box = await field.boundingBox();
        if (!box) throw new Error("Missing rally field");
        const points = rallyCourse(0, 0).points;
        const touch = input === "pointer" && info.project.name === "phone";
        const cdp = touch ? await page.context().newCDPSession(page) : null;
        let held = "",
            pressed = false;
        await page.locator('[data-game="board"]').focus();
        if (input === "keyboard") await page.keyboard.down("Space");
        const end = Date.now() + 35000;
        while (
            Date.now() < end &&
            !(await page.getByRole("button", { name: "Play another", exact: true }).isVisible())
        ) {
            const pos = await car.evaluate((element) => {
                const rect = element.getBoundingClientRect();
                const angle = /rotate\(([-.\d]+)rad\)/.exec(
                    (element as HTMLElement).style.transform,
                )?.[1];
                return {
                    x: rect.x + rect.width / 2,
                    y: rect.y + rect.height / 2,
                    angle: Number(angle ?? 0),
                };
            });
            const x = ((pos.x - box.x) / box.width) * 36,
                y = ((pos.y - box.y) / box.height) * 24;
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
                const tx = box.x + (target.x / 36) * box.width,
                    ty = box.y + (target.y / 24) * box.height;
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
                const raw = Math.atan2(target.y - y, target.x - x) - pos.angle;
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
        await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible();
        await expect(page.locator('[data-game="aside"]')).toContainText("all the way round");
        await page.screenshot({ path: `/tmp/pocket-rally-${info.project.name}-${input}.png` });
        await page.getByRole("button", { name: "Play another", exact: true }).click();
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
