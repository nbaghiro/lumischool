import { expect } from "@playwright/test";
import { signInAs, test } from "./steps";

for (const game of ["straight", "jump", "pour"]) {
    test(`${game}: ready, play, pause and return`, async ({ page }) => {
        await page.goto(`/games?g=${game}`);
        const menu = page.locator(".game-menu");
        await expect(menu).not.toBeVisible();
        await expect(page.locator(".page-main")).toHaveClass(/stage/);
        await expect(page.locator(".board > :not([hidden])").first()).toBeVisible();
        await expect(page.locator(".board")).not.toContainText("no drawing called");
        await expect(page.locator(".board > :not([hidden]) svg").first()).toBeVisible();
        const bounds = await page.locator(".hands").boundingBox();
        expect(bounds).not.toBeNull();
        if (bounds)
            expect(bounds.y + bounds.height).toBeLessThanOrEqual(
                await page.evaluate(() => innerHeight + 1),
            );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await page.getByRole("button", { name: "Pause & help" }).click();
        await expect(menu).toBeVisible();
        await menu.getByText("Choose a challenge", { exact: true }).click();
        await menu.locator('[data-game-phase="1"]').click();
        await expect(menu).not.toBeVisible();
        await page.keyboard.press("Escape");
        await expect(menu).toBeVisible();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "All games", exact: true }).click();
        await expect(page.locator(".game-library")).toBeVisible();
        await expect(page.locator(".page-main")).not.toHaveClass(/stage/);
    });
}

test("rowing buttons move the boat and pause holds its state", async ({ page }) => {
    await page.goto("/games?g=straight");
    const menu = page.locator(".game-menu");
    await page.getByRole("button", { name: "Pause & help" }).click();
    await menu.getByText("Sound & accessibility", { exact: true }).click();
    await menu.getByLabel("Describe the scene").check();
    await menu.getByRole("button", { name: "Continue playing", exact: true }).click();
    const description = page.locator('[data-game="reads"]');
    const before = await description.textContent();
    await page.getByRole("button", { name: "Row forwards", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(description).not.toHaveText(before ?? "");
    await page.getByRole("button", { name: "Pause & help" }).click();
    const paused = await description.textContent();
    await page.waitForTimeout(1100);
    await expect(description).toHaveText(paused ?? "");
    await menu.getByRole("button", { name: "Continue playing" }).click();
    await expect(menu).not.toBeVisible();
});

test("browser back returns from play to the library", async ({ page }) => {
    await page.goto("/games");
    await page.locator('[data-game-id="jump"]').click();
    await expect(page.locator(".game-menu")).not.toBeVisible();
    await expect(page.locator(".game-player")).toBeVisible();
    await page.goBack();
    await expect(page.locator(".game-library")).toBeVisible();
    await page.goForward();
    await expect(page.locator(".game-menu")).not.toBeVisible();
    await expect(page.locator(".game-player")).toBeVisible();
});

test("the signed-in parent header leaves room for play controls", async ({ page }) => {
    await signInAs(page);
    await page.goto("/games?g=straight");
    await expect
        .poll(async () => {
            const controls = await page.locator(".hands").boundingBox();
            return controls ? controls.y + controls.height : Infinity;
        })
        .toBeLessThanOrEqual(await page.evaluate(() => innerHeight + 1));
});

test("road controls expose each action once and keep navigation compact", async ({ page }) => {
    await page.goto("/games?g=road");
    await expect(
        page.locator('[data-game="pad"]').getByRole("button", { name: "Go", exact: true }),
    ).toHaveCount(1);
    await expect(
        page
            .locator('[data-game="pad"]')
            .getByRole("button", { name: "Brake / reverse", exact: true }),
    ).toHaveCount(1);
    await expect(page.locator('[data-game="pad"] button')).toHaveCount(4);
    await expect(
        page.locator(".game-toolbar").getByRole("button", { name: "All games", exact: true }),
    ).toHaveCSS("width", "44px");
    await page.getByRole("button", { name: "Pause & help" }).click();
    await expect(page.locator(".game-stamp svg")).toBeVisible();
    await expect(page.locator('[data-game="keys"]')).not.toBeVisible();
    await page.getByText("How to play", { exact: true }).click();
    await expect(page.locator('[data-game="keys"]')).toBeVisible();
});

test("undo uses the shared drawing and keeps its action name", async ({ page }) => {
    await page.goto("/games?g=spell");
    const undo = page.getByRole("button", { name: "Undo last move", exact: true });
    await expect(undo.locator('svg[data-visual="icon"]')).toBeVisible();
    await expect(undo).toHaveAttribute("title", "Undo last move");
    await page.locator('[data-game="tray"] button').first().click();
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(undo).toBeDisabled();
});

test("rabbit mouse drag lands on a stone and leaves no old dots", async ({ page }) => {
    await page.goto("/games?g=jump");
    const menu = page.locator(".game-menu");
    await page.getByRole("button", { name: "Pause & help" }).click();
    await menu.getByText("Sound & accessibility", { exact: true }).click();
    await menu.getByLabel("Describe the scene").check();
    await menu.getByRole("button", { name: "Continue playing", exact: true }).click();
    const rabbit = page.locator('[data-key="rabbit"]');
    await expect(rabbit).toBeVisible();
    const box = await rabbit.boundingBox();
    if (!box) throw new Error("Rabbit has no bounds");
    const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - (((3 * 4.5) / 5.5) * box.width) / 2.6, y, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator('[data-game="reads"]')).toContainText("on the stone at 3");
    await expect(page.locator(".field .dot")).toHaveCount(0);
});

test("road supports mouse acceleration, braking and reverse directly on the field", async ({
    page,
}) => {
    await page.goto("/games?g=road");
    const field = page.locator(".field");
    await expect(field).toBeVisible();
    const box = await field.boundingBox();
    if (!box) throw new Error("Road has no bounds");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(250);
    await page.mouse.up();
    await page.mouse.down({ button: "right" });
    await page.waitForTimeout(500);
    const car = page.locator('[data-key="car"]');
    const before = await car.getAttribute("style");
    await page.waitForTimeout(1300);
    expect(await car.getAttribute("style")).not.toBe(before);
    await page.mouse.up({ button: "right" });
});

test("clicking the pause backdrop resumes, while clicking inside keeps it open", async ({
    page,
}) => {
    await page.goto("/games?g=marble-workshop&v=1");
    const menu = page.locator(".game-menu");
    await expect(menu.getByRole("button", { name: "All games", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Pause & help" }).click();
    await menu.getByRole("heading", { name: "Marble workshop" }).click();
    await expect(menu).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(menu).not.toBeVisible();
    await expect(page.getByRole("button", { name: "All games", exact: true })).toBeVisible();
});

test("the two-ramp challenge can be solved with the visible workshop controls", async ({
    page,
}) => {
    await page.goto("/games?g=marble-workshop&v=1");
    for (const name of ["Next ramp", "Turn left", "Turn right", "Undo", "Redo"])
        await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    const field = await page.locator(".field").boundingBox();
    if (!field) throw new Error("No workshop field");
    const place = async (id: string, x: number, y: number, turns: number) => {
        const ramp = await page.locator('[data-key="' + id + '"]').boundingBox();
        if (!ramp) throw new Error("No ramp");
        await page.mouse.move(ramp.x + ramp.width / 2, ramp.y + ramp.height / 2);
        await page.mouse.down();
        await page.mouse.move(field.x + (x * field.width) / 42, field.y + (y * field.height) / 27, {
            steps: 3,
        });
        await page.mouse.up();
        for (let n = 0; n < turns; n++)
            await page.getByRole("button", { name: "Turn right", exact: true }).click();
    };
    await place("ramp-1", 6.5, 5.5, 1);
    await place("ramp-2", 15, 12, 4);
    await expect(page.locator('[data-game="board"]')).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-game="aside"]')).toContainText("It works!", {
        timeout: 20000,
    });
    await expect(page.locator(".game-finished .game-cover svg")).toBeVisible();
    await expect(page.locator(".game-toolbar [data-game=aside]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Play another", exact: true })).toBeVisible();
});

test("cargo exposes its delivery bell without duplicating the hook control", async ({ page }) => {
    await page.goto("/games?g=cargo-workshop");
    await expect(page.getByRole("button", { name: "Ring the bell", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pick up / release", exact: true })).toHaveCount(
        1,
    );
});

test("keyboard activation of a focused rotation control keeps its normal button behaviour", async ({
    page,
}) => {
    await page.goto("/games?g=marble-workshop&v=1");
    const rotate = page.getByRole("button", { name: "Turn right", exact: true });
    const ramp = page.locator('[data-key="ramp-1"]');
    const before = await ramp.getAttribute("style");
    await rotate.focus();
    await page.keyboard.press("Enter");
    await expect(rotate).toBeFocused();
    await expect(ramp).not.toHaveAttribute("style", before ?? "");
    await expect(page.locator(".game-feedback-live")).not.toContainText("Watch its path");
});

for (const game of ["road", "plane"]) {
    for (const input of ["keyboard", "pointer"]) {
        test(`${game}: waits for ${input} input, including after opening help`, async ({
            page,
        }) => {
            await page.goto(`/games?g=${game}&v=0`);
            const menu = page.locator(".game-menu");
            const sprite = page.locator(`[data-key="${game === "road" ? "car" : "plane"}"]`);
            await expect(sprite).toBeVisible();
            await expect(menu).not.toBeVisible();
            const initial = await sprite.getAttribute("style");
            await page.waitForTimeout(500);
            expect(await sprite.getAttribute("style")).toBe(initial);
            await page.getByRole("button", { name: "Pause & help" }).click();
            await expect(menu).toBeVisible();
            await menu.getByRole("button", { name: "Continue playing", exact: true }).click();
            await page.waitForTimeout(500);
            expect(await sprite.getAttribute("style")).toBe(initial);
            if (input === "keyboard") {
                await page.locator('[data-game="board"]').focus();
                const key = game === "road" ? "ArrowRight" : "ArrowUp";
                await page.keyboard.down(key);
                await expect(sprite).not.toHaveAttribute("style", initial ?? "");
                await page.keyboard.up(key);
            } else {
                const field = await page.locator(".field").boundingBox();
                if (!field) throw new Error("Missing play field");
                await page.mouse.move(field.x + field.width * 0.6, field.y + field.height * 0.4);
                await page.mouse.down();
                await expect(sprite).not.toHaveAttribute("style", initial ?? "");
                await page.mouse.up();
            }
        });
    }
}

test("phase cards remember each game's selection and explicit links override it", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/games?g=road&v=0");
    const menu = page.locator(".game-menu");
    await page.getByRole("button", { name: "Pause & help" }).click();
    await menu.getByText("Choose a challenge", { exact: true }).click();
    await expect(menu.locator('[data-game-phase="0"]')).toHaveAttribute("aria-pressed", "true");
    await menu.locator('[data-game-phase="1"]').click();
    await expect(menu).not.toBeVisible();
    await expect(page.locator(".game-toolbar")).toContainText("Stop on 70");
    await page.getByRole("button", { name: "All games", exact: true }).click();
    await page.locator('[data-game-id="plane"]').click();
    await expect(page.locator(".game-toolbar")).toContainText("Up to ten");
    await page.getByRole("button", { name: "All games", exact: true }).click();
    await page.locator('[data-game-id="road"]').click();
    await expect(page.locator(".game-toolbar")).toContainText("Stop on 70");
    await page.reload();
    await expect(page.locator(".game-toolbar")).toContainText("Stop on 70");
    await page.goto("/games?g=road&v=0");
    await expect(page.locator(".game-toolbar")).toContainText("Stop on 20");
    await expect(menu).not.toBeVisible();
});

test("opening a game with Enter is not its first gameplay input", async ({ page }) => {
    await page.goto("/games");
    await page.locator('[data-game-id="road"]').focus();
    await page.keyboard.press("Enter");
    const player = page.locator(".game-player");
    await expect(player).toHaveAttribute("data-game-ready", "true");
    const car = page.locator('[data-key="car"]');
    const initial = await car.getAttribute("style");
    await page.waitForTimeout(500);
    expect(await car.getAttribute("style")).toBe(initial);
    await page.keyboard.press("ArrowRight");
    await expect(player).toHaveAttribute("data-game-ready", "false");
    await expect(car).not.toHaveAttribute("style", initial ?? "");
    await page.getByRole("button", { name: "Pause & help" }).click();
    await page.getByRole("button", { name: "Start again", exact: true }).click();
    await expect(player).toHaveAttribute("data-game-ready", "true");
    const reset = await car.getAttribute("style");
    await page.waitForTimeout(500);
    expect(await car.getAttribute("style")).toBe(reset);
    await page.getByRole("button", { name: "Pause & help" }).click();
    await page.getByRole("button", { name: "New arrangement", exact: true }).click();
    await expect(player).toHaveAttribute("data-game-ready", "true");
});

test("touch on the plane field is a deliberate first input", async ({ page }, info) => {
    test.skip(!info.project.use.hasTouch, "Touch-enabled project");
    await page.goto("/games?g=plane");
    const player = page.locator(".game-player");
    await expect(player).toHaveAttribute("data-game-ready", "true");
    const field = await page.locator(".field").boundingBox();
    if (!field) throw new Error("Missing plane field");
    await page.touchscreen.tap(field.x + field.width / 2, field.y + field.height / 2);
    await expect(player).toHaveAttribute("data-game-ready", "false");
});

for (const game of ["sling&v=2", "plane", "rally"]) {
    test(`${game}: grid fills the viewport and follows the camera`, async ({ page }) => {
        await page.goto(`/games?g=${game}`);
        await expect(page.locator(".field .world svg").first()).toBeVisible();
        const check = async () => {
            const result = await page.locator(".field").evaluate((field) => {
                const paper = field.querySelector(".field-paper");
                const world = field.querySelector(".world");
                if (!paper || !world) throw new Error("Missing field layers");
                const outer = field.getBoundingClientRect();
                const sheet = paper.getBoundingClientRect();
                const grid = getComputedStyle(paper);
                const camera = new DOMMatrix(getComputedStyle(world).transform);
                return {
                    width: sheet.width - field.clientWidth,
                    height: sheet.height - field.clientHeight,
                    left: sheet.left - outer.left - field.clientLeft,
                    top: sheet.top - outer.top - field.clientTop,
                    x: parseFloat(grid.backgroundPositionX) - camera.e,
                    y: parseFloat(grid.backgroundPositionY) - camera.f,
                    size:
                        parseFloat(grid.backgroundSize) -
                        parseFloat(getComputedStyle(field).getPropertyValue("--sq")) * camera.a,
                };
            });
            for (const value of Object.values(result)) expect(Math.abs(value)).toBeLessThan(0.1);
        };
        await check();
        await page.keyboard.down("ArrowUp");
        await page.waitForTimeout(400);
        await page.keyboard.up("ArrowUp");
        await check();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
    });
}

test("tabletop games use the available room without a fixed desktop width cap", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1920, height: 1600 });
    await page.goto("/games?g=rule&v=0");
    await expect(page.locator(".sheet")).toBeVisible();
    await expect
        .poll(async () =>
            page.locator(".sheet").evaluate((sheet) => {
                const board = sheet.parentElement;
                if (!board) return false;
                const style = getComputedStyle(sheet);
                const w = Number(style.getPropertyValue("--w")) + 2;
                const h = Number(style.getPropertyValue("--h")) + 2;
                const sq = Number.parseFloat(style.getPropertyValue("--sq"));
                return (
                    sq ===
                    Math.max(
                        6,
                        Math.floor(
                            Math.min(
                                board.clientWidth / Math.max(16, w),
                                board.clientHeight / Math.max(10, h),
                            ),
                        ),
                    )
                );
            }),
        )
        .toBe(true);
    const room = await page.locator(".game-stage-wrap").boundingBox();
    expect(room?.width).toBeGreaterThan(1800);
    const sheet = await page.locator(".sheet").boundingBox();
    expect(sheet?.width).toBeGreaterThan(1100);
});
