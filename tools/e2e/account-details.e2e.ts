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
    const family = page.getByLabel("Your family", { exact: true });
    await family.fill("Updated Family");
    await family.press("Tab");
    await expect(
        page.locator(".ga-account-field").filter({ has: family }).getByRole("status"),
    ).toHaveText("Saved");
    await page
        .getByLabel("The family's time zone", { exact: true })
        .selectOption("Pacific/Auckland");
    await expect(
        page
            .locator(".ga-account-field")
            .filter({ hasText: "The family's time zone" })
            .getByRole("status"),
    ).toHaveText("Saved");
    await page.reload();
    await expect(name).toHaveValue("Updated Parent");
    await expect(family).toHaveValue("Updated Family");
    await expect(page.getByLabel("The family's time zone", { exact: true })).toHaveValue(
        "Pacific/Auckland",
    );
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
