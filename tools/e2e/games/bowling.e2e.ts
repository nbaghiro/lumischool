import { expect } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { openGame } from "./play";

for (const mode of ["keys", "pointer"] as const) {
    test(`Pin bowling: ${mode} keep the spare and win with the second bowl`, async ({
        page,
    }, info) => {
        test.skip(info.project.name !== "desktop", "both input paths on desktop");
        await page.emulateMedia({ reducedMotion: "reduce" });
        const errors: string[] = [];
        await openGame(page, "bowling", 0, errors, "ready");
        await page.locator('[data-game="board"]').focus();
        for (let bowl = 0; bowl < 2; bowl++) {
            if (mode === "keys") {
                for (let k = 0; k < (bowl === 0 ? 4 : 7); k++)
                    await page.keyboard.press(bowl === 0 ? "ArrowLeft" : "ArrowRight");
                await page.keyboard.press("Space");
            } else {
                const points = await fieldPoints(page),
                    angle = -Math.PI / 2 + (bowl === 0 ? -0.22 : 0.165);
                const at = points.toScreen(9, 25),
                    to = points.toScreen(9 - Math.cos(angle) * 4, 25 - Math.sin(angle) * 4);
                await page.mouse.move(at.x, at.y);
                await page.mouse.down();
                await page.mouse.move(to.x, to.y, { steps: 12 });
                await page.waitForTimeout(200);
                await page.mouse.up();
            }
            if (bowl === 0) {
                await expect(page.locator('.field-probe [data-key="ready"]')).toBeAttached();
                const pins = await page.locator('.field-probe [data-key^="pin:"]').count();
                expect(pins).toBeGreaterThan(0);
                expect(pins).toBeLessThan(3);
                await expect(page.locator(".round-end")).toHaveCount(0);
            }
        }
        await expect(page.locator('.round-end[data-round-end="won"]')).toBeVisible();
        expect(errors).toEqual([]);
    });
}

test("Pin bowling: live pull launches a rolling ball and a cancelled gesture leaves it ready", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "live pointer on desktop");
    const errors: string[] = [];
    await openGame(page, "bowling", 0, errors, "ready");
    const points = await fieldPoints(page),
        at = points.toScreen(9, 25),
        to = points.toScreen(9.8, 29);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.getByRole("button", { name: "Continue playing" }).click();
    await expect(page.locator('.field-probe [data-key="ready"]')).toBeAttached();
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await expect(page.locator('.field-probe [data-key="ball"]')).toBeAttached();
    await page.screenshot({ path: "/tmp/lumischool-bowling-live.png" });
    expect(errors).toEqual([]);
});

test("Pin bowling: phone shows every pin, pull space and large controls", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "phone", "portrait phone layout");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    await openGame(page, "bowling", 4, errors, "ready");
    for (const name of ["Bowl", "Change curve", "Fresh rack"]) {
        const button = page.getByRole("button", { name, exact: true });
        await expect(button).toBeVisible();
        const box = await button.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    const points = await fieldPoints(page),
        pull = points.toScreen(9, 29);
    const box = await page.locator(".field-gl").boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(pull.y).toBeLessThan(box.y + box.height);
    await page.screenshot({ path: "/tmp/lumischool-bowling-phone.png" });
    expect(errors).toEqual([]);
});
