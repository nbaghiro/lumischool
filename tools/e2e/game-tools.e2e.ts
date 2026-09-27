import { expect } from "@playwright/test";
import { test } from "./steps";

test("the developer's tools read a physics game, turn its knobs, and scrub, cut and reload its tape", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "desktop", "the tools are for a developer at a desk");
    await page.goto("/games?g=sling&v=0&tools=1");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const tools = page.getByRole("complementary", { name: "Developer tools" });
    await expect(tools).toBeVisible();

    await page.locator(".field-gl").click();
    for (let power = 0; power < 3; power++) await page.keyboard.press("ArrowRight", { delay: 40 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(800);

    await expect(tools.getByText("bodies that move")).toBeVisible();
    await expect(tools.locator("dd").first()).not.toHaveText("0");
    // the probe's copy of each sprite's box says where the drawings are; scenery at another depth is passed over, so try a few
    const boxes = await page.locator(".field-probe [data-key]").evaluateAll((els) =>
        els.slice(0, 12).map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }),
    );
    const none = tools.getByText("Point at the field.");
    for (const b of boxes) {
        await page.mouse.move(b.x, b.y);
        await page.waitForTimeout(300);
        if (!(await none.isVisible())) break;
    }
    await expect(none).toBeHidden();
    await expect(tools.getByText("art", { exact: true })).toBeVisible();

    await tools.getByRole("tab", { name: "Frame" }).click();
    await expect(tools.getByText("frames a second")).toBeVisible();
    await expect(tools.getByText("atlas pages")).toBeVisible();

    await tools.getByRole("tab", { name: "Tuning" }).click();
    const knob = tools.locator(".tools-knob input").first();
    const [min, max, now] = await Promise.all(
        ["min", "max", "value"].map((a) => knob.evaluate((el, name) => el.getAttribute(name), a)),
    );
    await knob.fill((min === now ? max : min) ?? "0");
    await expect(tools.getByText(/^1 turned/)).toBeVisible();
    await tools.getByRole("button", { name: "Put every knob back" }).click();
    await expect(tools.getByText(/^0 turned/)).toBeVisible();

    await tools.getByRole("tab", { name: "Replay" }).click();
    await expect(tools.getByText(/^Playing, \d+ steps in\./)).toBeVisible();
    await tools.getByRole("slider", { name: "Step" }).fill("0");
    await expect(tools.getByText(/^Held on step 0 of \d+\./)).toBeVisible();
    const held = await tools.getByText(/^Held on step 0 of \d+\./).textContent();
    const before = Number(/of (\d+)/.exec(held ?? "")?.[1]);
    await tools.getByRole("button", { name: "Cut here" }).click();
    const playing = tools.getByText(/^Playing, \d+ steps in\./);
    await expect(playing).toBeVisible();
    // the game plays on from the cut, so the count starts again from nought rather than staying there
    const after = Number(/(\d+) steps/.exec((await playing.textContent()) ?? "")?.[1]);
    expect(after).toBeLessThan(before);

    await tools.getByRole("button", { name: "Copy out" }).click();
    await expect(tools.getByRole("textbox", { name: "Tape" })).toHaveValue(/"entries"/);
    await tools.getByRole("textbox", { name: "Tape" }).fill('{"entries": [{"jump": true}]}');
    await tools.getByRole("button", { name: "Load" }).click();
    await expect(tools.getByRole("alert")).toHaveText(/not a step/);

    await page.keyboard.press("Alt+Shift+KeyD");
    await expect(tools).toBeHidden();
});

test("the tools stay off the page until they are asked for", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the tools are for a developer at a desk");
    await page.goto("/games?g=sling&v=0");
    await expect(page.locator(".game-player")).toHaveAttribute("data-game-ready", "true");
    const tools = page.getByRole("complementary", { name: "Developer tools" });
    await expect(tools).toHaveCount(0);
    await page.keyboard.press("Alt+Shift+KeyD");
    await expect(tools).toBeVisible();
    await expect(tools.getByRole("tab")).toHaveCount(4);
});
