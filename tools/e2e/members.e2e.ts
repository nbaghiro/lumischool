import { expect } from "@playwright/test";
import { signInAs, test, BASE } from "./steps";

test("a parent invites another parent, who joins and can be removed", async ({ page, browser }) => {
    await signInAs(page);
    await page.goto("/account#family-members");
    const members = page.locator("#family-members");
    await members.getByRole("button", { name: "Invite a parent", exact: true }).click();
    const email = `joined-${crypto.randomUUID()}@example.test`;
    await members.getByLabel("Their email address").fill(email);
    await members.getByRole("button", { name: "Send invitation" }).click();
    await expect(members.getByRole("status")).toContainText("Invitation sent");
    await members.screenshot({ path: test.info().outputPath("family-members.png") });
    const outbox = await page.request.get("/api/dev/outbox");
    const data: unknown = await outbox.json();
    if (!data || typeof data !== "object" || !("emails" in data) || !Array.isArray(data.emails))
        throw new Error("Missing outbox");
    const mail: unknown = data.emails.find(
        (item: unknown) => !!item && typeof item === "object" && "to" in item && item.to === email,
    );
    if (!mail || typeof mail !== "object" || !("text" in mail) || typeof mail.text !== "string")
        throw new Error("Missing invitation");
    const match = mail.text.match(/https?:\/\/[^\s]+\/join#t=[^\s]+/);
    if (!match) throw new Error("Missing link");
    const context = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
    try {
        const other = await context.newPage();
        const invitation = new URL(match[0]);
        await other.goto(`${BASE}${invitation.pathname}${invitation.hash}`);
        await expect(other.getByRole("heading", { name: /Join/ })).toBeVisible();
        await other.locator("#main").screenshot({ path: test.info().outputPath("join.png") });
        await other.evaluate(() => window.dispatchEvent(new Event("focus")));
        await expect(other).toHaveURL(/\/join#/);
        await other.getByLabel("Your name", { exact: true }).fill("Alex");
        await other.getByRole("button", { name: "Send me a code", exact: true }).click();
        await expect(other.getByLabel("Email code", { exact: true })).toBeVisible();
        const sent = await page.request.get("/api/dev/outbox");
        const letters: unknown = await sent.json();
        if (
            !letters ||
            typeof letters !== "object" ||
            !("emails" in letters) ||
            !Array.isArray(letters.emails)
        )
            throw new Error("Missing outbox");
        const codeMail: unknown = letters.emails.find(
            (item: unknown) =>
                !!item &&
                typeof item === "object" &&
                "to" in item &&
                item.to === email &&
                "text" in item &&
                typeof item.text === "string" &&
                item.text.includes("Your code is"),
        );
        if (
            !codeMail ||
            typeof codeMail !== "object" ||
            !("text" in codeMail) ||
            typeof codeMail.text !== "string"
        )
            throw new Error("Missing code");
        const digits = codeMail.text.match(/Your code is (\d{4}) (\d{4})/);
        if (!digits) throw new Error("Missing digits");
        await other.getByLabel("Email code", { exact: true }).fill(`${digits[1]}${digits[2]}`);
        await other.getByRole("button", { name: "Join family", exact: true }).click();
        await expect(
            other.getByRole("heading", { name: "You’re part of the family" }),
        ).toBeVisible();
        await other.getByRole("link", { name: "Open your family’s page" }).click();
        await expect(other).toHaveURL(new RegExp("/$"));
        await page.reload();
        const row = members.locator("li").filter({ hasText: email });
        await expect(row).toContainText("Alex");
        await row.getByRole("button", { name: "Remove", exact: true }).click();
        await members.getByRole("button", { name: "Confirm removal" }).click();
        await expect(members.getByRole("status")).toContainText("Access ended");
        await expect(row).toHaveCount(0);
        const me = await other.request.get("/api/me");
        expect(me.status()).toBe(401);
        await other.goto(`${BASE}${invitation.pathname}${invitation.hash}`);
        await expect(
            other.getByRole("heading", { name: "This invitation is no longer available" }),
        ).toBeVisible();
    } finally {
        await context.close();
    }
});
