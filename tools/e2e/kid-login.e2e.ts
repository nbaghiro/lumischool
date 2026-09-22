import { expect, type Page } from "@playwright/test";
import { test, signInHere } from "./steps";

async function login(page: Page, username: string): Promise<void> {
    await page.goto("/kids/sign-in");
    await page.getByLabel("Your username", { exact: true }).fill(username);
    await page.getByLabel("Your kids’ PIN", { exact: true }).fill("1357");
    await page.getByRole("button", { name: "Open my page" }).click();
    await expect(page).toHaveURL(/\/kids$/);
    await expect(page.getByRole("button", { name: "Sign out of this tab" })).toBeVisible();
}

async function who(page: Page): Promise<string[]> {
    return page.evaluate(async () => {
        const response = await fetch("/api/kid", {
            headers: { "x-kid-session": sessionStorage.getItem("lumischool-kid-session") ?? "" },
        });
        const body: unknown = await response.json();
        if (
            typeof body !== "object" ||
            body === null ||
            !("kids" in body) ||
            !Array.isArray(body.kids)
        )
            return [];
        return body.kids.flatMap((kid: unknown) =>
            typeof kid === "object" && kid !== null && "name" in kid && typeof kid.name === "string"
                ? [kid.name]
                : [],
        );
    });
}

test("parents configure kids’ sign-in and siblings keep independent tabs and answer queues", async ({
    page,
    context,
}) => {
    await signInHere(page);
    await page.goto("/account");
    await page.getByLabel("New kids’ PIN", { exact: true }).fill("1357");
    await page.getByLabel("Type the kids’ PIN again", { exact: true }).fill("1357");
    await page.getByRole("button", { name: "Save kids’ PIN" }).click();
    await expect(
        page
            .locator("#main")
            .getByText("The kids’ PIN is set. Previous username sign-ins are closed."),
    ).toBeVisible();
    const suffix = Date.now().toString(36);
    for (const name of ["Rosie", "Leo"]) {
        await page
            .getByLabel(`${name}’s username`, { exact: true })
            .fill(`${name.toLowerCase()}-${suffix}`);
        await page.getByLabel(`Allow ${name} to sign in`).check();
        const saved = page.waitForResponse(
            (r) => r.url().endsWith("/api/kid-logins") && r.request().method() === "POST",
        );
        await page.getByRole("button", { name: `Save ${name}’s sign-in` }).click();
        expect((await saved).status()).toBe(204);
        await expect(page.getByLabel(`${name}’s username`, { exact: true })).toHaveValue(
            `${name.toLowerCase()}-${suffix}`,
        );
    }
    await page.goto("/home");
    await expect(page.getByRole("link", { name: "Kids’ sign in", exact: true })).toBeVisible();
    const popup = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Kids’ sign in", exact: true }).click();
    const rosie = await popup;
    const leo = await context.newPage();
    await login(rosie, `rosie-${suffix}`);
    await login(leo, `leo-${suffix}`);
    expect(await who(rosie)).toEqual(["Rosie"]);
    expect(await who(leo)).toEqual(["Leo"]);
    await rosie.reload();
    await expect(rosie.getByRole("button", { name: "Sign out of this tab" })).toBeVisible();
    expect(await who(rosie)).toEqual(["Rosie"]);

    for (const tab of [rosie, leo]) {
        const queues = await tab.evaluate(async () =>
            (await indexedDB.databases())
                .map((d) => d.name)
                .filter((n) => n?.startsWith("lumischool-kid-")),
        );
        expect(new Set(queues).size).toBeGreaterThanOrEqual(2);
        expect(queues.every((q) => /^lumischool-kid-[a-f0-9-]+$/.test(q ?? ""))).toBe(true);
    }
    await rosie.getByRole("button", { name: "Sign out of this tab" }).click();
    await expect(rosie.getByRole("heading", { name: "Your learning page" })).toBeVisible();
    await leo.reload();
    await expect(leo.getByRole("button", { name: "Sign out of this tab" })).toBeVisible();
    expect(await who(leo)).toEqual(["Leo"]);
    await leo.getByRole("button", { name: "Sign out of this tab" }).click();
    await expect(leo.getByRole("heading", { name: "Your learning page" })).toBeVisible();
});
