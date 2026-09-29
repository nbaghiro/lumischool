// Every game's first level at rest on the GPU's view, against its golden frame. After a change
// that means to move what a game draws, refresh that game's frame with
// `npm run test:e2e -- game-gl-frames --project desktop --update-snapshots -g "<id>"`, and look at
// the new image before keeping it.
import { expect } from "@playwright/test";
import { GAMES } from "../../school/games/catalogue";
import { test } from "./steps";

const golden = { maxDiffPixelRatio: 0.01, animations: "disabled" as const };

for (const id of GAMES.map((g) => g.id))
    test(`games on the GPU: ${id}'s first level at rest matches its golden frame`, async ({
        page,
    }, info) => {
        test.skip(
            info.project.name !== "desktop",
            "one golden frame each, on the desktop's Chrome",
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`/games?g=${id}&v=0`);
        await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
        await expect(page.locator(".field-gl[data-drawn]")).toBeVisible();
        // a look drawn soft while the camera settled is drawn sharp 200 ms after it rests
        await page.waitForTimeout(600);
        await expect(page.locator(".game-field")).toHaveScreenshot(`${id}-0-gl.png`, golden);
    });

const scene = { camera: { x: 15, y: 8 }, view: { w: 30, h: 16 }, world: { w: 30, h: 16 } };
/** Each effect on its own, drawn by the game view straight from a frame with no drawings in it. */
const EFFECTS: Record<string, { still: boolean; frame: object }> = {
    water: {
        still: false,
        frame: {
            ...scene,
            sprites: [],
            marks: [],
            time: 1.3,
            water: [
                { x: 2, w: 12, level: 9, bottom: 15, waves: 0.3 },
                {
                    x: 16,
                    w: 12,
                    level: 8,
                    bottom: 15,
                    hue: "mint",
                    flow: 1.5,
                    ripples: [{ x: 22, age: 0.7 }],
                },
            ],
        },
    },
    lights: {
        still: true,
        frame: {
            ...scene,
            sprites: [],
            marks: [
                {
                    kind: "dots",
                    pts: [
                        { x: 5, y: 4 },
                        { x: 6, y: 4 },
                    ],
                },
            ],
            lights: [
                { x: 8, y: 6, r: 4, flicker: true },
                { x: 22, y: 6, r: 3, hue: "tang" },
                { x: 24, y: 11, r: 2, hue: "sky", strength: 0.6 },
            ],
        },
    },
    liquid: {
        still: true,
        frame: {
            ...scene,
            sprites: [],
            marks: [],
            liquid: [
                {
                    r: 0.18,
                    drops: [
                        ...Array.from({ length: 40 }, (_, i) => [
                            5 + (i % 10) * 0.3,
                            13 - Math.floor(i / 10) * 0.3,
                        ]).flat(),
                        ...Array.from({ length: 30 }, (_, i) => [
                            9.5 + i * 0.02,
                            4 + i * 0.22,
                        ]).flat(),
                        20,
                        8,
                        21.5,
                        9,
                    ],
                },
            ],
        },
    },
    glow: {
        still: true,
        frame: {
            ...scene,
            sprites: [],
            marks: [{ kind: "ring", x: 8, y: 8, r: 1.5 }],
            lights: [
                { x: 8, y: 8, r: 3 },
                { x: 20, y: 8, r: 4, hue: "berry" },
            ],
        },
    },
};

for (const [name, { still, frame }] of Object.entries(EFFECTS))
    test(`games on the GPU: the ${name} matches its golden frame`, async ({ page }, info) => {
        test.skip(
            info.project.name !== "desktop",
            "one golden frame each, on the desktop's Chrome",
        );
        await page.goto("/games");
        await page.addScriptTag({
            type: "module",
            content: `
                import { GameView } from "/engine/ui/game-view.ts";
                const host = document.createElement("div");
                host.className = "squared effect";
                Object.assign(host.style, { position: "fixed", left: "0", top: "0", background: "#fff" });
                document.body.replaceChildren(host);
                const view = new GameView({ host, art: new Map(), still: () => ${String(still)} });
                view.fit({ w: 30, h: 16 }, { w: 30, h: 16 }, { w: 720, h: 384 });
                view.draw(${JSON.stringify(frame)}, 0);
                host.dataset.drawn = "true";
            `,
        });
        await expect(page.locator(".effect[data-drawn]")).toBeAttached();
        await page.waitForTimeout(300);
        await expect(page.locator(".effect .game-field")).toHaveScreenshot(
            `effect-${name}-gl.png`,
            golden,
        );
    });

test("games on the GPU: a pour in progress matches its golden frame", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one golden frame each, on the desktop's Chrome");
    await page.goto("/games");
    await page.addScriptTag({
        type: "module",
        content: `
            import { GameView } from "/engine/ui/game-view.ts";
            import { loadDrawings } from "/engine/ui/drawings.ts";
            import { pourGame, keyPlaces } from "/school/games/pour-hands.ts";
            import { emptyPad, spent } from "/engine/motion/pad.ts";
            const s = pourGame.start(0);
            const pad = emptyPad();
            const tick = (n = 1) => { for (let i = 0; i < n; i++) { pourGame.step(s, pad); spent(pad); } };
            const press = (d) => { pad.pressed.push(d); tick(); };
            const to = (id) => { for (let k = 0; k < 8 && keyPlaces(s, s.held)[s.keyAt]?.id !== id; k++) press("right"); };
            press("right");
            press("up");
            to("tap");
            press("up");
            pad.go = true;
            tick(220);
            pad.go = false;
            tick(60);
            press("up");
            to("jug:1");
            pad.holding = ["down"];
            tick(70);
            const f = pourGame.frame(s);
            const ids = [...new Set(f.sprites.map((x) => x.art))];
            const shelf = await loadDrawings(ids);
            const art = new Map(ids.flatMap((id) => { const d = shelf.drawing(id); return d ? [[id, d]] : []; }));
            const host = document.createElement("div");
            host.className = "squared pour";
            Object.assign(host.style, { position: "fixed", left: "0", top: "0", background: "#fff" });
            document.body.replaceChildren(host);
            const view = new GameView({ host, art, still: () => true });
            view.fit(f.view, f.world, { w: f.view.w * 16, h: f.view.h * 16 }, "side");
            view.draw(f, 0);
            await view.ready();
            view.draw(f, 0);
            host.dataset.drawn = String(s.drops.tags.length);
        `,
    });
    await expect(page.locator(".pour[data-drawn]")).toBeAttached();
    expect(Number(await page.locator(".pour").getAttribute("data-drawn"))).toBeGreaterThan(10);
    await page.waitForTimeout(300);
    await expect(page.locator(".pour .game-field")).toHaveScreenshot(
        "pour-in-progress-gl.png",
        golden,
    );
});
