import { expect } from "@playwright/test";
import { signInAs, test } from "./steps";

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
        await page.getByRole("button", { name: "Done", exact: true }).click();
        await expect(page.locator(".painting-gallery-card")).toHaveCount(0);
        await page.getByRole("button", { name: "New painting", exact: true }).click();
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
        await expect(page.locator(".painting-gallery-card")).toHaveCount(1);
        await page.screenshot({ path: `/tmp/painting-shelf-${width}.png` });
        await page.reload();
        await page.getByRole("button", { name: "Open your pictures", exact: true }).click();
        await page.locator(".painting-picture").first().click();
        await expect(room.locator("#title")).toHaveValue("Our first painting");
        await expect(room.locator(".idea-outlines")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        const dock = await room.locator(".materials-dock").boundingBox();
        expect(dock?.height).toBeLessThan(170);
        expect((dock?.y ?? 0) + (dock?.height ?? 0)).toBeLessThanOrEqual(901);
        const header = await room.locator(".painting-header").boundingBox();
        const paper = await room.locator("#paper").boundingBox();
        if (!header || !paper) throw new Error("Painting layout missing");
        expect(Math.abs(header.x - paper.x)).toBeLessThan(3);
        expect(Math.abs(header.width - paper.width)).toBeLessThan(3);
        expect(paper.width / paper.height).toBeCloseTo(width < 600 ? 2 / 3 : 3 / 2, 1);
        await page.screenshot({ path: `/tmp/painting-app-${width}.png` });
        await page.getByRole("link", { name: "Games", exact: true }).click();
        await expect(room).toHaveCount(0);
        await page.getByRole("link", { name: "Painting", exact: true }).click();
        await page.getByRole("button", { name: "Open your pictures", exact: true }).click();
        await page.locator(".painting-picture").first().click();
        await expect(room.locator("#title")).toHaveValue("Our first painting");
        await room.locator("#options").click();
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
    await page.getByRole("button", { name: "Open your pictures", exact: true }).click();
    await page.getByLabel("Whose pictures").selectOption({ label: "Rosie" });
    await page.getByRole("button", { name: "New painting", exact: true }).click();
    await page.getByLabel("Painting name", { exact: true }).fill("Rosie’s sky");
    const sheet = page.locator(".ez-sheet");
    const box = await sheet.boundingBox();
    if (!box) throw new Error("Painting sheet missing");
    await page.mouse.move(box.x + 30, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + 140, box.y + 100, { steps: 8 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.locator(".painting-gallery-card")).toHaveCount(1);
    await page.locator(".painting-picture").click();
    await expect(page.locator(".painting-gallery-dialog")).toBeVisible();
    await page.getByRole("button", { name: "Continue painting", exact: true }).click();
    await expect(page.getByLabel("Painting name", { exact: true })).toHaveValue("Rosie’s sky");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.locator(".painting-picture-menu summary").click();
    await page.getByRole("button", { name: "Make a copy", exact: true }).click();
    await expect(page.locator(".painting-gallery-card")).toHaveCount(2);
    await page.getByLabel("Whose pictures").selectOption("");
    await expect(page.locator(".painting-gallery-card")).toHaveCount(0);
    await page.getByLabel("Whose pictures").selectOption({ label: "Rosie" });
    await page.locator(".painting-picture-menu summary").first().click();
    await page.getByRole("button", { name: "Delete", exact: true }).first().click();
    await page.getByRole("button", { name: "Delete picture", exact: true }).click();
    await expect(page.locator(".painting-gallery-card")).toHaveCount(1);
});

test("offline painting survives reload and syncs when reopened", async ({ page }) => {
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
    await expect(page.locator("#save-state")).toContainText("waiting to sync");
    await expect(page.locator("#save-state")).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Open your pictures", exact: true }).click();
    await expect(page.locator(".painting-recovery")).toContainText("Offline sky");
    await page.unroute("**/api/paintings/save");
    await page.locator(".painting-recovery").click();
    await expect(page.getByLabel("Painting name", { exact: true })).toHaveValue("Offline sky");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.locator(".painting-gallery-card")).toHaveCount(1);
    await expect(page.locator(".painting-recovery")).toHaveCount(0);
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
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.locator(".painting-gallery-card")).toHaveCount(1);
    await page.locator(".painting-picture").click();
    const other = await page.context().newPage();
    await other.goto("/painting");
    await other.getByRole("button", { name: "Open your pictures", exact: true }).click();
    await other.locator(".painting-picture").click();
    await expect(other.locator(".ez-sheet")).toBeVisible();
    await page.getByLabel("Painting name", { exact: true }).fill("First tab sky");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.locator(".painting-picture")).toContainText("First tab sky");
    await other.getByLabel("Painting name", { exact: true }).fill("Second tab sky");
    await other.getByRole("button", { name: "Done", exact: true }).click();
    await expect(other.locator(".painting-gallery-card")).toHaveCount(2);
    await expect(other.locator(".painting-gallery-grid")).toContainText("First tab sky");
    await expect(other.locator(".painting-gallery-grid")).toContainText("Second tab sky");
    await other.close();
});
