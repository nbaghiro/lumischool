import { expect } from "@playwright/test";
import { address, codeFor, signInAs, test } from "./steps";

test("account details autosave without buttons and email changes after verification", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/account");
    const name = page.getByLabel("Your name", { exact: true });
    await name.fill("Updated Parent");
    await name.press("Tab");
    await expect(page.getByRole("heading", { name: "Updated Parent", exact: true })).toBeVisible();
    const family = page.getByRole("textbox", { name: "Your family", exact: true });
    await family.fill("Updated Family");
    await family.press("Tab");
    await expect(
        page.locator(".ga-account-field").filter({ has: family }).getByRole("status"),
    ).toHaveText("Saved");
    const zone = page.getByRole("combobox", { name: "The family's time zone" });
    await zone.fill("no-such-city");
    await expect(page.getByText("No matches", { exact: true })).toBeVisible();
    await zone.press("Escape");
    await expect(zone).not.toHaveValue("no-such-city");
    await zone.fill("auck");
    await expect(page.locator(".search-select-menu").getByRole("option")).toHaveCount(1);
    await zone.press("ArrowDown");
    await zone.press("Enter");
    await expect(
        page
            .locator(".ga-account-field")
            .filter({ hasText: "The family's time zone" })
            .getByRole("status"),
    ).toHaveText("Saved");
    await page.reload();
    await expect(name).toHaveValue("Updated Parent");
    await expect(family).toHaveValue("Updated Family");
    await expect(page.getByRole("combobox", { name: "The family's time zone" })).toHaveValue(
        "Pacific / Auckland",
    );
    const field = page.locator(".search-select-field");
    const inputBox = await zone.boundingBox();
    const arrowBox = await field.locator(".search-select-arrow").boundingBox();
    expect(inputBox).not.toBeNull();
    expect(arrowBox).not.toBeNull();
    if (inputBox && arrowBox) {
        expect(arrowBox.y).toBeGreaterThanOrEqual(inputBox.y);
        expect(arrowBox.y + arrowBox.height).toBeLessThanOrEqual(inputBox.y + inputBox.height);
    }
    await field.locator(".search-select-arrow").click();
    await expect(zone).toHaveAttribute("aria-expanded", "true");
    await zone.fill("toronto");
    await page
        .locator(".search-select-menu")
        .getByRole("option", { name: "America / Toronto", exact: true })
        .click();
    await expect(zone).toHaveValue("America / Toronto");
    await expect(page.locator(".search-select-menu")).toHaveCount(0);
    const email = address("changed", test.info());
    await page.getByLabel("Your address", { exact: true }).fill(email);
    await page.getByLabel("Your address", { exact: true }).press("Tab");
    const verify = page.getByLabel("Email verification code");
    await expect(verify).toBeVisible();
    await verify.fill(await codeFor(page.request, email));
    await expect(verify).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel("Your address", { exact: true })).toHaveValue(email);
    await expect(page.locator(".ga-facts button")).toHaveCount(0);
    await page.route("**/api/me/details", (route) =>
        route.fulfill({ status: 503, json: { error: "server" } }),
    );
    await name.fill("Unsaved name");
    await name.press("Tab");
    await expect(page.locator(".ga-account-field").first().getByRole("status")).toContainText(
        "Something went wrong",
    );
    await expect(name).toHaveValue("Unsaved name");
});

test("returning to Account refreshes members without collapsing the card or replacing edits", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/account#family-members");
    const members = page.locator("#family-members");
    await members.getByRole("button", { name: "Invite a parent", exact: true }).click();
    const email = members.getByLabel("Their email address");
    await email.fill("draft@example.com");
    await email.evaluate((element) => {
        element.dataset.retained = "yes";
    });
    const before = await members.boundingBox();
    let release = (): void => {};
    const held = new Promise<void>((resolve) => {
        release = resolve;
    });
    let requests = 0;
    await page.route("**/api/members", async (route) => {
        requests++;
        const response = await route.fetch();
        await held;
        await route.fulfill({ response });
    });
    try {
        await page.evaluate(() => {
            window.dispatchEvent(new Event("focus"));
            document.dispatchEvent(new Event("visibilitychange"));
            window.dispatchEvent(new Event("focus"));
        });
        await expect.poll(() => requests).toBe(1);
        await expect(members.getByText("Loading family members…")).toHaveCount(0);
        await expect(email).toHaveAttribute("data-retained", "yes");
        await expect(email).toBeFocused();
        await expect(email).toHaveValue("draft@example.com");
        expect(await members.boundingBox()).toEqual(before);
        const finished = page.waitForResponse((response) =>
            response.url().endsWith("/api/members"),
        );
        release();
        await finished;
        await expect(email).toHaveAttribute("data-retained", "yes");
        await expect(email).toHaveValue("draft@example.com");
    } finally {
        release();
        await page.unroute("**/api/members");
    }
});
