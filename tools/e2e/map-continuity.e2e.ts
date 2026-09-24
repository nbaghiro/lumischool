import { expect } from "@playwright/test";
import { signInAs, test } from "./steps";

// Headless Chrome did not reproduce the compositor's dropped artwork frames.
test.use({ headless: false, viewport: { width: 1978, height: 1140 }, deviceScaleFactor: 2 });

for (const movement of ["flight", "manual", "close manual"] as const) {
    test(`${movement} zoom retains painted map frames`, async ({ page, context }, info) => {
        test.skip(info.project.name !== "desktop", "Chrome screencast measures presented frames");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await signInAs(page);
        await page.goto("/map");
        const map = page.locator(".ow-host.ready");
        await map.waitFor();
        if (movement === "flight") {
            await map.getByRole("button", { name: "Fly the paper plane (P)" }).click();
            await map.getByRole("radio", { name: "Slow", exact: true }).click();
        } else {
            await map
                .locator('.ow-node[aria-label*="crystal caves" i]')
                .first()
                .dispatchEvent("click");
            await page.waitForTimeout(1800);
        }
        const client = await context.newCDPSession(page);
        const frames: string[] = [];
        client.on("Page.screencastFrame", (frame) => {
            frames.push(frame.data);
            void client.send("Page.screencastFrameAck", { sessionId: frame.sessionId });
        });
        try {
            await client.send("Page.startScreencast", {
                format: "jpeg",
                quality: 70,
                maxWidth: 1000,
                maxHeight: 650,
                everyNthFrame: 1,
            });
            if (movement === "flight") {
                for (let turn = 0; turn < 8; turn++) {
                    const key = turn % 2 ? "ArrowLeft" : "ArrowRight";
                    await page.keyboard.down(key);
                    await page.waitForTimeout(450);
                    await page.keyboard.up(key);
                    await map
                        .getByRole("button", {
                            name: turn % 2 ? "Zoom in while flying" : "Zoom out while flying",
                            exact: true,
                        })
                        .click();
                    await page.waitForTimeout(450);
                }
            } else {
                const box = await map.boundingBox();
                if (!box) throw new Error("map missing");
                for (let turn = 0; turn < 8; turn++) {
                    for (let step = 0; step < 20; step++) {
                        // Twenty 5-unit deltas double the scale; the close case stresses higher zoom.
                        const delta = movement === "manual" ? 5 : 18;
                        await map.dispatchEvent("wheel", {
                            deltaY: turn % 2 ? delta : -delta,
                            ctrlKey: true,
                            clientX: box.x + box.width / 2,
                            clientY: box.y + box.height * 0.65,
                        });
                        await page.waitForTimeout(25);
                    }
                    await page.waitForTimeout(300);
                }
            }
        } finally {
            await client.send("Page.stopScreencast");
            await client.detach();
        }
        expect(frames.length).toBeGreaterThan(30);
        // Decode after capture so the measurement does not add work to the moving map.
        const reader = await context.newPage();
        const blank: number[] = [];
        try {
            for (let start = 0; start < frames.length; start += 25) {
                const colours = await reader.evaluate(
                    async ({ images, corners }) => {
                        const canvas = document.createElement("canvas");
                        canvas.width = 100;
                        canvas.height = 40;
                        const paint = canvas.getContext("2d");
                        if (!paint) throw new Error("image inspection needs a canvas");
                        const scores: number[] = [];
                        for (const encoded of images) {
                            const bytes = Uint8Array.from(atob(encoded), (char) =>
                                char.charCodeAt(0),
                            );
                            const image = await createImageBitmap(
                                new Blob([bytes], { type: "image/jpeg" }),
                            );
                            // Exclude the header and controls; land and sea both have a colour wash.
                            paint.drawImage(image, 0, 100, image.width, 400, 0, 0, 100, 40);
                            image.close();
                            const pixels = paint.getImageData(0, 0, 100, 40).data;
                            let colour = 0;
                            for (let i = 0; i < pixels.length; i += 4)
                                colour += Math.abs((pixels[i] ?? 0) - (pixels[i + 1] ?? 0));
                            let score = colour / 4000;
                            // Inspect the empty corners too: a missing terrain tile can leave
                            // most of the map intact, with only a rectangular patch of bare grid.
                            if (corners)
                                for (const [x, y] of [
                                    [0, 0],
                                    [80, 0],
                                    [0, 32],
                                    [80, 32],
                                ]) {
                                    const corner = paint.getImageData(x ?? 0, y ?? 0, 20, 8).data;
                                    let wash = 0;
                                    for (let i = 0; i < corner.length; i += 4)
                                        wash += Math.abs((corner[i] ?? 0) - (corner[i + 1] ?? 0));
                                    score = Math.min(score, wash / 160);
                                }
                            scores.push(score);
                        }
                        return scores;
                    },
                    { images: frames.slice(start, start + 25), corners: movement !== "flight" },
                );
                colours.forEach((colour, i) => {
                    if (colour < 1.5) blank.push(start + i);
                });
            }
        } finally {
            await reader.close();
        }
        await info.attach("frame-check", {
            body: JSON.stringify({ frames: frames.length, blank }),
            contentType: "application/json",
        });
        if (blank.length) {
            const frame = frames[blank[0] ?? 0];
            if (frame)
                await info.attach("blank-map-frame", {
                    body: Buffer.from(frame, "base64"),
                    contentType: "image/jpeg",
                });
        }
        expect(blank, "the map's coloured artwork must survive every presented zoom frame").toEqual(
            [],
        );
    });
}
