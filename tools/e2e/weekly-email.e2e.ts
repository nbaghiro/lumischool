import { expect } from "@playwright/test";
import { signInAs, test } from "./steps";

test("weekly email preferences live in Account and persist without a letter page", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/account#weekly-email");
    const section = page.locator("#weekly-email");
    const choice = section.getByLabel("Send me");
    const save = section.getByRole("button", { name: "Save", exact: true });
    await expect(choice).toHaveValue("off");
    await expect(save).toBeDisabled();
    await choice.selectOption("private");
    await save.click();
    await expect(section.getByRole("status")).toContainText("saved");
    await page.reload();
    await expect(choice).toHaveValue("private");
    await choice.selectOption("detailed");
    await save.click();
    await expect(section.getByRole("status")).toContainText("saved");
    await page.reload();
    await expect(choice).toHaveValue("detailed");
    await choice.selectOption("off");
    await save.click();
    await expect(section.getByRole("status")).toContainText("saved");
    await expect(page.getByRole("link", { name: "Letters and email preferences" })).toHaveCount(0);
    await page.goto("/letters");
    await expect(page.getByRole("heading", { name: "There is no page here" })).toBeVisible();
});
