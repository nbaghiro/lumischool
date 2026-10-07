import { expect } from "@playwright/test";
import { test } from "../steps";
import { fieldPoints } from "../field";
import { openGame } from "./play";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import {
    santaGame,
    santaPreview,
    startSanta,
    stepSanta,
    type SantaState,
} from "../../../school/games/santa";

function press(s: SantaState, p: Pad): void {
    for (let i = 0; i < santaGame.still.press(s); i++) {
        stepSanta(s, p);
        p.tapped = false;
        p.lifted = null;
    }
    for (let i = 0; i < 1200 && santaGame.still.settling?.(s); i++) stepSanta(s, emptyPad());
}

for (const mode of ["keys", "pointer"] as const) {
    test(`Santa: ${mode} deliver the first village and open the end card`, async ({
        page,
    }, info) => {
        test.skip(info.project.name !== "desktop", "both input paths on desktop");
        test.setTimeout(120_000);
        await page.emulateMedia({ reducedMotion: "reduce" });
        const errors: string[] = [];
        await openGame(page, "santa", 0, errors, "sleigh");
        const house = await page.locator('.field-probe [data-key="house:1"]').boundingBox();
        if (!house) throw new Error("Missing second house");
        const x = (await fieldPoints(page)).toWorld(house.x + house.width / 2, house.y).x;
        const s = startSanta(0, Math.abs(x - 38) < 0.5 ? 1 : Math.abs(x - 37) < 0.5 ? 2 : 0);
        await page.locator('[data-game="board"]').focus();
        for (let i = 0; i < 450 && !s.won; i++) {
            const tryDrop = mode === "pointer" ? structuredClone(s) : s;
            if (mode === "pointer") press(tryDrop, { ...emptyPad(), touch: { x: s.x, y: s.y } });
            const target = santaPreview(tryDrop).house;
            const need = (tryDrop.L.houses[target]?.want ?? 0) > (tryDrop.got[target] ?? 0);
            if (need && tryDrop.cooldown === 0) {
                if (mode === "keys") {
                    await page.keyboard.press("Space");
                    press(s, { ...emptyPad(), tapped: true, go: true, keys: true });
                } else {
                    const at = (await fieldPoints(page)).toScreen(s.x, s.y);
                    await page.mouse.move(at.x, at.y);
                    await page.mouse.down();
                    press(s, { ...emptyPad(), touch: { x: s.x, y: s.y } });
                    await page.mouse.up();
                    press(s, { ...emptyPad(), lifted: { x: s.x, y: s.y } });
                }
            } else {
                const direction = s.direction > 0 ? "right" : "left";
                if (mode === "keys")
                    await page.keyboard.press(direction === "right" ? "ArrowRight" : "ArrowLeft");
                else
                    await page
                        .getByRole("button", {
                            name: direction === "right" ? "Fly right" : "Fly left",
                            exact: true,
                        })
                        .click();
                press(s, { ...emptyPad(), held: direction, holding: [direction] });
            }
        }
        expect(s.won, "the planned input path wins").toBe(true);
        await expect(page.locator('.round-end[data-round-end="won"]')).toBeVisible();
        await expect(page.locator(".round-end")).toContainText("Merry Christmas");
        expect(errors).toEqual([]);
    });
}

test("Santa: dragging changes altitude in live play and releasing drops one moving gift", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "live pointer input on desktop");
    const errors: string[] = [];
    await openGame(page, "santa", 0, errors, "sleigh");
    const to = (await fieldPoints(page)).toScreen(10, 5);
    await page.mouse.move(to.x, to.y);
    await page.mouse.down();
    await page.waitForTimeout(800);
    const sleigh = await page.locator('.field-probe [data-key="sleigh"]').boundingBox();
    if (!sleigh) throw new Error("Missing sleigh");
    const altitude = (await fieldPoints(page)).toWorld(
        sleigh.x + sleigh.width / 2,
        sleigh.y + sleigh.height / 2,
    ).y;
    expect(altitude).toBeLessThan(8);
    await page.mouse.up();
    await expect(page.locator('.field-probe [data-key^="gift:"]')).toHaveCount(1);
    await page.waitForTimeout(150);
    await page.screenshot({ path: "/tmp/lumischool-santa-live.png" });
    expect(errors).toEqual([]);
});

test("Santa: phone controls and the complete sky fit the screen", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "portrait phone layout");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    await openGame(page, "santa", 4, errors, "sleigh");
    const button = page.getByRole("button", { name: "Drop present", exact: true });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: "/tmp/lumischool-santa-phone.png" });
    expect(errors).toEqual([]);
});
