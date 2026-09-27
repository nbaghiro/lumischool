import { expect, type Page } from "@playwright/test";
import { signInAs, test } from "./steps";

/** Pictures straight through the save route, since forty drawn by hand would be a different test. */
async function seedPictures(page: Page, from: number, count: number): Promise<void> {
    const result = await page.evaluate(
        async (range) => {
            const colours = ["#e46a6a", "#4f7fd6", "#5fa96a", "#d9a441", "#8a63c9"];
            for (let i = range.from; i < range.from + range.count; i++) {
                const colour = colours[i % colours.length] ?? "#4f7fd6";
                const canvas = document.createElement("canvas");
                canvas.width = 240;
                canvas.height = 160;
                const paint = canvas.getContext("2d");
                if (!paint) return "no canvas";
                paint.fillStyle = "#fdfdf8";
                paint.fillRect(0, 0, 240, 160);
                paint.strokeStyle = colour;
                paint.lineWidth = 10;
                paint.beginPath();
                paint.moveTo(20, 20 + (i % 5) * 20);
                paint.lineTo(220, 140 - (i % 7) * 12);
                paint.stroke();
                const response = await fetch("/api/paintings/save", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        scope: { kid_id: null },
                        document: {
                            version: 1,
                            id: crypto.randomUUID(),
                            title: `Picture ${i + 1}`,
                            painting: { k: "painting", paper: "plain", w: 30, h: 20, marks: [] },
                            activity: "draw",
                            idea: "butterfly",
                            fills: { "0-0": colour },
                            step: 0,
                            guides: true,
                        },
                        expected_revision: 0,
                        operation_id: crypto.randomUUID(),
                        thumbnail: canvas.toDataURL("image/png"),
                    }),
                });
                if (!response.ok) return `save ${response.status}`;
            }
            return "ok";
        },
        { from, count },
    );
    expect(result).toBe("ok");
}

/** Marks live on a canvas, so what is on the sheet is counted in pixels that carry paint. */
const painted = (page: Page): Promise<number> =>
    page.locator(".ez-paint").evaluate((node) => {
        if (!(node instanceof HTMLCanvasElement)) throw new Error("No paint canvas");
        const pixels = node.getContext("2d")?.getImageData(0, 0, node.width, node.height).data;
        if (!pixels) throw new Error("No paint canvas");
        let inked = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) inked++;
        return inked;
    });

for (const width of [1440, 390])
    test(`parent painting at ${width}px keeps marks, colouring, mixes and pictures across visits`, async ({
        page,
    }) => {
        await page.setViewportSize({ width, height: 900 });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await signInAs(page);
        await page.goto("/painting");
        await expect(page.locator(".ez-sheet")).toBeVisible();
        await page.getByRole("button", { name: "Save", exact: true }).click();
        await expect(page.locator("#done")).toBeEnabled();
        await page.getByRole("button", { name: "Gallery", exact: true }).click();
        await expect(page.locator(".painting-item")).toHaveCount(0);
        await page
            .locator(".painting-gallery")
            .getByRole("button", { name: "New painting", exact: true })
            .click();
        const room = page.locator(".painting-room");
        await expect(room.locator(".ez-sheet")).toBeVisible();
        const sheet = room.locator(".ez-sheet");
        const box = await sheet.boundingBox();
        expect(box).not.toBeNull();
        if (!box) return;
        if (width === 390 && page.context().browser()?.browserType().name() === "chromium") {
            const cdp = await page.context().newCDPSession(page);
            await cdp.send("Input.dispatchTouchEvent", {
                type: "touchStart",
                touchPoints: [{ x: box.x + 30, y: box.y + 30 }],
            });
            await cdp.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [{ x: box.x + 100, y: box.y + 110 }],
            });
            await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            await cdp.detach();
        } else {
            await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.3);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, { steps: 15 });
            await page.mouse.up();
        }
        await expect(room.getByRole("button", { name: "Undo", exact: true }).first()).toBeEnabled();
        await room.locator("#title").fill("Our first painting");
        await room.locator("#materials").click();
        await room.getByRole("button", { name: /Colouring pictures/ }).click();
        await room.getByRole("button", { name: /A butterfly/ }).click();
        await expect(room.locator(".idea-outlines")).toBeVisible();
        await room.locator(".idea-hits [data-region]").first().focus();
        await page.keyboard.press("Enter");
        await room.locator("#mix-open").click();
        await room.getByRole("button", { name: "yellow paint", exact: true }).last().click();
        await room.getByRole("button", { name: "blue paint", exact: true }).last().click();
        await room.getByRole("button", { name: "Paint with this", exact: true }).click();
        await room.locator("#done").click();
        await expect(room.locator("#done")).toBeEnabled();
        await room.locator("#gallery").click();
        await expect(page.locator(".painting-item")).toHaveCount(1);
        await page.waitForTimeout(300);
        await page.screenshot({ path: `/tmp/painting-shelf-${width}.png` });
        await page.reload();
        await page.getByRole("button", { name: "Gallery", exact: true }).click();
        await page.locator(".painting-picture").first().click();
        await expect(room.locator("#title")).toHaveValue("Our first painting");
        await expect(room.locator(".idea-outlines")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        const dock = await room.locator(".materials-dock").boundingBox();
        const paper = await room.locator("#paper").boundingBox();
        if (!dock || !paper) throw new Error("Painting layout missing");
        // the page itself keeps the materials under the sheet and carries no heading card
        expect(dock.y).toBeGreaterThanOrEqual(paper.y + paper.height - 1);
        expect(dock.y + dock.height).toBeLessThanOrEqual(901);
        expect(paper.width / paper.height).toBeCloseTo(width < 600 ? 2 / 3 : 3 / 2, 1);
        await expect(room.locator(".postcard")).toHaveCount(0);
        expect(
            await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
        ).toBe(true);
        await page.waitForTimeout(300);
        await page.screenshot({ path: `/tmp/painting-app-${width}.png` });
        await page.getByRole("link", { name: "Games", exact: true }).click();
        await expect(room).toHaveCount(0);
        await page.getByRole("link", { name: "Painting", exact: true }).click();
        await page.getByRole("button", { name: "Gallery", exact: true }).click();
        await page.locator(".painting-picture").first().click();
        await expect(room.locator("#title")).toHaveValue("Our first painting");
        await room.locator("#materials").click();
        await room.getByRole("button", { name: "Paper & download", exact: true }).click();
        const downloaded = page.waitForEvent("download");
        await room.getByRole("button", { name: "Download picture", exact: true }).click();
        const file = await downloaded;
        expect(file.suggestedFilename()).toBe("Our first painting.png");
        expect(await file.failure()).toBeNull();
        await page.keyboard.press("Escape");
        expect(errors).toEqual([]);
    });

test("signed-out visitors cannot open the painting workspace", async ({ page }) => {
    await page.goto("/painting");
    await expect(page.getByRole("link", { name: "Sign in", exact: true }).last()).toBeVisible();
    await expect(page.locator(".painting-room")).toHaveCount(0);
});

test("parent can manage a child gallery without changing their own pictures", async ({ page }) => {
    await signInAs(page);
    await page.goto("/painting");
    await page.getByRole("button", { name: "Gallery", exact: true }).click();
    await page.getByLabel("Whose pictures").selectOption({ label: "Rosie" });
    await page
        .locator(".painting-gallery")
        .getByRole("button", { name: "New painting", exact: true })
        .click();
    await page.getByLabel("Painting name", { exact: true }).fill("Rosie’s sky");
    const sheet = page.locator(".ez-sheet");
    const box = await sheet.boundingBox();
    if (!box) throw new Error("Painting sheet missing");
    await page.mouse.move(box.x + 30, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + 140, box.y + 100, { steps: 8 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator("#done")).toBeEnabled();
    await page.getByRole("button", { name: "Gallery", exact: true }).click();
    await expect(page.locator(".painting-item")).toHaveCount(1);
    await page.locator(".painting-picture").click();
    await expect(page.locator(".painting-gallery-dialog")).toBeVisible();
    await page.getByRole("button", { name: "Continue painting", exact: true }).click();
    await expect(page.getByLabel("Painting name", { exact: true })).toHaveValue("Rosie’s sky");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator("#done")).toBeEnabled();
    await page.getByRole("button", { name: "Gallery", exact: true }).click();
    await page.locator(".painting-picture-menu summary").click();
    await page.getByRole("button", { name: "Make a copy", exact: true }).click();
    await expect(page.locator(".painting-item")).toHaveCount(2);
    await page.getByLabel("Whose pictures").selectOption("");
    await expect(page.locator(".painting-item")).toHaveCount(0);
    await page.getByLabel("Whose pictures").selectOption({ label: "Rosie" });
    await page.locator(".painting-picture-menu summary").first().click();
    await page.getByRole("button", { name: "Delete", exact: true }).first().click();
    await page.getByRole("button", { name: "Delete picture", exact: true }).click();
    await expect(page.locator(".painting-item")).toHaveCount(1);
});

test("offline painting survives reload and saves only on request", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await signInAs(page);
    await page.goto("/painting");
    await page.route("**/api/paintings/save", (route) => route.abort());
    await page.getByLabel("Painting name", { exact: true }).fill("Offline sky");
    const box = await page.locator(".ez-sheet").boundingBox();
    if (!box) throw new Error("Missing sheet");
    await page.mouse.move(box.x + 30, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + 130, box.y + 110, { steps: 8 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your picture is still here" })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Gallery", exact: true }).click();
    await expect(page.locator(".painting-drafts")).toContainText("Offline sky");
    await page.locator(".painting-drafts summary").click();
    await page.unroute("**/api/paintings/save");
    await page.locator(".painting-drafts button").click();
    await expect(page.getByLabel("Painting name", { exact: true })).toHaveValue("Offline sky");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator("#done")).toBeEnabled();
    await page.getByRole("button", { name: "Gallery", exact: true }).click();
    await expect(page.locator(".painting-item")).toHaveCount(1);
    await expect(page.locator(".painting-drafts")).toHaveCount(0);
});

test("two tabs preserve both versions of a painting", async ({ page }) => {
    await signInAs(page);
    await page.goto("/painting");
    const box = await page.locator(".ez-sheet").boundingBox();
    if (!box) throw new Error("Missing sheet");
    await page.mouse.move(box.x + 30, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + 130, box.y + 110, { steps: 8 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator("#done")).toBeEnabled();
    await page.getByRole("button", { name: "Gallery", exact: true }).click();
    await expect(page.locator(".painting-item")).toHaveCount(1);
    await page.locator(".painting-picture").click();
    const other = await page.context().newPage();
    await other.goto("/painting");
    await other.getByRole("button", { name: "Gallery", exact: true }).click();
    await other.locator(".painting-picture").click();
    await expect(other.locator(".ez-sheet")).toBeVisible();
    await page.getByLabel("Painting name", { exact: true }).fill("First tab sky");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator("#done")).toBeEnabled();
    await page.getByRole("button", { name: "Gallery", exact: true }).click();
    await expect(page.locator(".painting-picture img")).toHaveAttribute("alt", "First tab sky");
    await other.getByLabel("Painting name", { exact: true }).fill("Second tab sky");
    await other.getByRole("button", { name: "Save", exact: true }).click();
    await expect(other.locator("#done")).toBeEnabled();
    await other.getByRole("button", { name: "Gallery", exact: true }).click();
    await expect(other.locator(".painting-item")).toHaveCount(2);
    await expect(other.locator('.painting-gallery-grid img[alt="First tab sky"]')).toHaveCount(1);
    await expect(other.locator('.painting-gallery-grid img[alt="Second tab sky"]')).toHaveCount(1);
    await other.close();
});

test("drawing and opening Gallery do not publish a draft", async ({ page }) => {
    await signInAs(page);
    await page.goto("/painting");
    await page.locator("#materials").click();
    await page.getByRole("button", { name: /Colouring pictures/ }).click();
    await page.getByRole("button", { name: /A butterfly/ }).click();
    await page.getByRole("button", { name: "Gallery", exact: true }).click();
    await expect(page.locator(".painting-item")).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".idea-outlines")).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator("#done")).toBeEnabled();
    await page.getByRole("button", { name: "Gallery", exact: true }).click();
    await expect(page.locator(".painting-item")).toHaveCount(1);
});

for (const width of [1440, 390])
    test(`clearing the sheet at ${width}px needs no menu and Undo puts the picture back`, async ({
        page,
    }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await signInAs(page);
        await page.goto("/painting");
        const room = page.locator(".painting-room");
        await expect(room.locator(".ez-sheet")).toBeVisible();
        const clear = room.getByRole("button", { name: "Clear the sheet", exact: true });
        await expect(clear).toBeVisible();
        const reach = await clear.boundingBox();
        expect(reach?.height).toBeGreaterThanOrEqual(44);
        await clear.click();
        await expect(room.locator("#say")).toHaveText("The sheet is already empty.");
        const box = await room.locator(".ez-sheet").boundingBox();
        if (!box) throw new Error("Missing sheet");
        await page.mouse.move(box.x + 30, box.y + 30);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, { steps: 12 });
        await page.mouse.up();
        await expect.poll(() => painted(page)).toBeGreaterThan(0);
        const marks = await painted(page);
        await clear.click();
        await expect(room.locator("#say")).toHaveText("The sheet is empty. Undo puts it back.");
        await expect.poll(() => painted(page)).toBe(0);
        await room.getByRole("button", { name: "Undo", exact: true }).first().click();
        await expect(room.locator("#say")).toHaveText("Undone");
        await expect.poll(() => painted(page)).toBe(marks);
    });

for (const width of [1440, 390])
    test(`a new painting starts from the easel at ${width}px and keeps the one before it`, async ({
        page,
    }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await signInAs(page);
        await page.goto("/painting");
        const room = page.locator(".painting-room");
        await expect(room.locator(".ez-sheet")).toBeVisible();
        await room.locator("#title").fill("A painted morning");
        const box = await room.locator(".ez-sheet").boundingBox();
        if (!box) throw new Error("Missing sheet");
        await page.mouse.move(box.x + 30, box.y + 30);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 10 });
        await page.mouse.up();
        await expect.poll(() => painted(page)).toBeGreaterThan(0);
        const fresh = room.getByRole("button", { name: "New painting", exact: true });
        const reach = await fresh.boundingBox();
        expect(reach?.height).toBeGreaterThanOrEqual(44);
        await fresh.click();
        await expect(room.locator("#title")).toHaveValue("My painting");
        await expect(page.locator(".painting-gallery")).toHaveCount(0);
        await expect.poll(() => painted(page)).toBe(0);
        await room.locator("#gallery").click();
        await expect(page.locator(".painting-item")).toHaveCount(1);
        await expect(page.locator(".painting-picture img")).toHaveAttribute(
            "alt",
            "A painted morning",
        );
    });

for (const width of [1440, 1024, 390])
    test(`the gallery at ${width}px is pictures and nothing else, at one, three and forty`, async ({
        page,
    }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await signInAs(page);
        await page.goto("/painting");
        await expect(page.locator(".ez-sheet")).toBeVisible();
        const shelf = page.locator(".painting-gallery");
        const grid = page.locator(".painting-gallery-grid");
        const items = page.locator(".painting-item");
        const open = async () => {
            await page.getByRole("button", { name: "Gallery", exact: true }).click();
            await expect(shelf).toBeVisible();
        };
        const close = async () => {
            await page.keyboard.press("Escape");
            await expect(shelf).toHaveCount(0);
        };
        await open();
        await expect(page.locator(".painting-gallery-empty")).toHaveText(
            "No pictures here yet. Start a new painting and it will appear.",
        );
        await close();
        let made = 0;
        for (const count of [1, 3, 40]) {
            await seedPictures(page, made, count - made);
            made = count;
            await open();
            // The gallery pages as it is scrolled, so it goes on until every picture has arrived.
            await expect
                .poll(
                    async () => {
                        await shelf.evaluate((node) => node.scrollTo(0, node.scrollHeight));
                        return items.count();
                    },
                    { timeout: 30_000 },
                )
                .toBe(count);
            const first = items.first();
            await expect(first.locator("img")).toHaveAttribute("alt", /^Picture \d+$/);
            await expect(grid.locator(`img[alt="Picture ${count}"]`)).toHaveCount(1);
            await expect(first.locator(".painting-picture-menu summary")).toBeVisible();
            await expect(first).not.toContainText("Picture");
            expect(
                await first.evaluate((node) => {
                    const style = getComputedStyle(node);
                    return [
                        style.backgroundColor,
                        style.borderTopWidth,
                        style.boxShadow,
                        style.paddingTop,
                    ].join(" ");
                }),
            ).toBe("rgba(0, 0, 0, 0) 0px none 0px");
            expect(await grid.evaluate((node) => getComputedStyle(node).gap)).toBe(
                width === 390 ? "6px" : "8px",
            );
            const columns = await grid.evaluate(
                (node) => getComputedStyle(node).gridTemplateColumns.split(" ").length,
            );
            if (width === 390) expect(columns).toBe(1);
            else expect(columns).toBeGreaterThanOrEqual(3);
            const gridBox = await grid.boundingBox();
            const imageBox = await first.locator("img").boundingBox();
            if (!gridBox || !imageBox) throw new Error("Missing grid");
            if (width === 390) expect(imageBox.width).toBeGreaterThan(gridBox.width * 0.95);
            else expect(imageBox.width).toBeLessThan(gridBox.width / 2);
            expect(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBe(true);
            await close();
        }
    });

const ADDRESSES = [
    ["", "now"],
    ["?v1", "box"],
    ["?v2", "hand"],
    ["?v3", "pages"],
    ["?v4", "table"],
] as const;

for (const [address, layout] of ADDRESSES)
    for (const width of [1440, 390])
        test(`/painting${address} opens the ${layout} arrangement at ${width}px`, async ({
            page,
        }) => {
            await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
            await signInAs(page);
            await page.goto(`/painting${address}`);
            const room = page.locator(".painting-room");
            await expect(room.locator(".ez-sheet")).toBeVisible();
            await expect(room).toHaveAttribute("data-layout", layout);
            // the picture's name and the four actions are in the strip in every arrangement
            const strip = room.locator(".painting-header");
            await expect(strip.locator("#title")).toBeVisible();
            for (const name of ["Clear the sheet", "New painting", "Save", "Gallery"]) {
                const control = strip.getByRole("button", { name, exact: true });
                await expect(control).toBeVisible();
                expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
            }
            await expect(room.locator(".postcard")).toHaveCount(0);
            if (layout === "box") {
                await expect(room.locator(".tool-line")).toBeHidden();
                await room.locator("#box-lid").click();
                await expect(room.locator(".tool-line")).toBeVisible();
            }
            if (layout === "pages") await expect(room.locator(".pages-rail")).toBeVisible();
            const box = await room.locator(".ez-sheet").boundingBox();
            if (!box) throw new Error("Missing sheet");
            await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.3);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.72, {
                steps: 12,
            });
            await page.mouse.up();
            await expect.poll(() => painted(page)).toBeGreaterThan(0);
            expect(
                await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
            ).toBe(true);
        });
