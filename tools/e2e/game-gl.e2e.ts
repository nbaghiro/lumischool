// The GPU's view of the action games, against the golden frame of the golf's first level. After a
// change that means to move what it draws, refresh the frame with
// `npm run test:e2e -- game-gl --project desktop --update-snapshots` and look at the new image.
import { expect, type Page } from "@playwright/test";
import { test } from "./steps";

async function atRest(page: Page): Promise<void> {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/games?g=golf&v=0&probe=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    await expect(page.locator('.field-probe [data-key="ball"]')).toBeAttached();
    // a look drawn soft while the camera settled is drawn sharp 200 ms after it rests
    await page.waitForTimeout(600);
}

const golden = { maxDiffPixelRatio: 0.01, animations: "disabled" as const };

test("games on the GPU: golf's first level at rest matches its golden frame", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "one golden frame, on the desktop's Chrome");
    await atRest(page);
    await expect(page.locator(".field-gl canvas")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".field")).toHaveScreenshot("golf-0-gl.png", golden);
});

test("games on the GPU: twenty lost contexts leave the game as it was and drawing again", async ({
    page,
}, info) => {
    test.skip(
        info.project.name !== "desktop",
        "the desktop's Chrome can lose a context on request",
    );
    await atRest(page);
    const ball = page.locator('.field-probe [data-key="ball"]');
    const before = await ball.evaluate((d) => d.getAttribute("style"));
    const said = await page.locator(".game-player").innerText();
    for (let i = 0; i < 20; i++)
        await page.locator(".field-gl canvas").evaluate(
            (canvas) =>
                new Promise<void>((done, failed) => {
                    if (!(canvas instanceof HTMLCanvasElement))
                        return failed(new Error("no canvas"));
                    const gl = canvas.getContext("webgl2");
                    const lose = gl?.getExtension("WEBGL_lose_context");
                    if (!lose) return failed(new Error("no WEBGL_lose_context"));
                    canvas.addEventListener(
                        "webglcontextlost",
                        () => setTimeout(() => lose.restoreContext(), 20),
                        { once: true },
                    );
                    canvas.addEventListener(
                        "webglcontextrestored",
                        () => requestAnimationFrame(() => requestAnimationFrame(() => done())),
                        { once: true },
                    );
                    lose.loseContext();
                }),
        );
    await page.waitForTimeout(600);
    expect(await ball.evaluate((d) => d.getAttribute("style"))).toBe(before);
    expect(await page.locator(".game-player").innerText()).toBe(said);
    await expect(page.locator(".field")).toHaveScreenshot("golf-0-gl.png", golden);
});
