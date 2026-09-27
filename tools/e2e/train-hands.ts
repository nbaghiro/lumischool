import { expect, type Page } from "@playwright/test";
import { loose, startTrain, stepTrain, TRAIN_LEVELS, TRAIN_WORLD } from "../../school/games/train";
import { trainWay } from "../../school/games/train-challenges";
import type { SpellVersion } from "../../school/games/spell";

/**
 * Plays a sound train level to its win the way a hand would: the arrow keys pick each wagon, and a
 * drag from the wagon, found by its probe, pushes it by the pull the solver found. The solver's way
 * stops each wagon short and nudges it on, so a hand a few pixels off still couples.
 */
export async function playTrain(
    page: Page,
    phase: number,
    by: "touch" | "keys" = "touch",
): Promise<void> {
    const reads = page.locator('[data-game="reads"]');
    await expect(reads).toContainText("The picture is a");
    const named = /The picture is a (\w+)/.exec((await reads.textContent()) ?? "")?.[1];
    const word = TRAIN_LEVELS[phase]?.words.find((w) => w.word === named);
    if (!word) throw new Error(`No word ${named} on level ${phase}`);
    if (by === "keys") return byKeys(page, phase, word);
    const way = trainWay(startTrain(phase, word), { sure: true });
    if (!way) throw new Error("No way to win this train");
    const sim = startTrain(phase, word);
    // the page's loop can run slower than the clock, so a wagon has stopped when its box holds still
    const still = async (key: string) => {
        const wagon = page.locator(`[data-key="${key}"]`).first();
        let last = "";
        for (let i = 0; i < 120; i++) {
            const box = await wagon.boundingBox();
            const now = box ? `${Math.round(box.x)},${Math.round(box.y)}` : "";
            if (box && now === last) return box;
            last = now;
            await page.waitForTimeout(250);
        }
        throw new Error(`${key} never came to rest`);
    };
    const drag = async (key: string, pull: number) => {
        const box = await still(key);
        const canvas = await page.locator(".board > .field-gl canvas").first().boundingBox();
        if (!canvas) throw new Error("Missing train field");
        const sq = canvas.width / TRAIN_WORLD.w,
            x = box.x + box.width / 2,
            y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + pull * sq, y, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        await still(key);
    };
    // a drag a pixel off on a small screen can leave a wagon short, so each is checked from the words
    // and nudged on no faster than it couples, which can never knock the train
    const coupledOn = async (k: number) => {
        const sounds = word.sounds
            .slice(0, k + 1)
            .map((t) => `"${t}"`)
            .join(", ");
        for (let n = 0; n < 8; n++) {
            await page.waitForTimeout(1300);
            const said = (await reads.textContent()) ?? "";
            if (said.includes(`The train has ${sounds}`) || !said.includes("squares from")) return;
            const gap = Number(/is (\d+) squares from the train/.exec(said)?.[1] ?? 0);
            await drag(
                `w:${word.sounds[k] ?? ""}`,
                Math.min(3.3, Math.sqrt(1.2 * (gap + 1))) / 1.5,
            );
        }
    };
    let k = -1;
    for (let i = 0; i < way.length; i++) {
        const pad = way[i];
        if (!pad) continue;
        if (pad.pressed.length) {
            if (!way[i - 1]?.pressed.length) {
                if (k >= 0) await coupledOn(k);
                k++;
            }
            for (const d of pad.pressed)
                await page.keyboard.press(d === "right" ? "ArrowRight" : "ArrowLeft");
        } else if (pad.touch && !way[i - 1]?.touch) {
            const w = loose(sim),
                to = way[i + 1]?.touch;
            if (!w || !to) throw new Error("A push without a wagon");
            await drag(w.id, to.x - pad.touch.x);
        }
        stepTrain(sim, pad);
    }
    await coupledOn(k);
}

/**
 * The same win from the keys under reduced motion, where each press of up or down steps the push by
 * the same amount and a push settles at once, so the pushes are exact on any screen.
 */
async function byKeys(page: Page, phase: number, word: SpellVersion): Promise<void> {
    const way = trainWay(startTrain(phase, word), { by: "keys" });
    if (!way) throw new Error("No way to win this train");
    await page.getByRole("button", { name: "Pause & help" }).click();
    await page.getByText("Sound & accessibility", { exact: true }).click();
    await page.getByLabel("Reduced motion").check();
    await page.getByRole("button", { name: "Continue playing" }).click();
    await page.locator('[data-game="board"]').focus();
    const keys = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
    for (const pad of way) {
        for (const d of pad.pressed) await page.keyboard.press(keys[d]);
        if (pad.tapped) await page.keyboard.press("Space");
    }
}
