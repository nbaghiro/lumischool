import { expect } from "@playwright/test";
import { signInAs, test, BASE, newDevice, typeCode, codeFor, address } from "../steps";

for (const scenario of [
    "joins and can be removed",
    "cancelled before code",
    "cancelled during signup",
    "cancelled on foreground",
    "interrupted acceptance",
    "acceptance wins cancellation",
    "resend replaces the old link",
] as const)
    test(`an invited parent: ${scenario}`, async ({ page, browser }, info) => {
        await signInAs(page);
        await page.goto("/account#family-members");
        const members = page.locator("#family-members");
        await members.getByRole("button", { name: "Invite a parent", exact: true }).click();
        const email = address("join", info);
        await members.getByLabel("Their email address").fill(email);
        const invitedAt = Date.now();
        await members.getByRole("button", { name: "Send invitation" }).click();
        await expect(members.getByRole("status")).toContainText("Invitation sent");
        await members.screenshot({ path: test.info().outputPath("family-members.png") });
        const outbox = await page.request.get("/api/dev/outbox");
        const data: unknown = await outbox.json();
        if (!data || typeof data !== "object" || !("emails" in data) || !Array.isArray(data.emails))
            throw new Error("Missing outbox");
        const mail: unknown = data.emails.find(
            (item: unknown) =>
                !!item && typeof item === "object" && "to" in item && item.to === email,
        );
        if (!mail || typeof mail !== "object" || !("text" in mail) || typeof mail.text !== "string")
            throw new Error("Missing invitation");
        const match = mail.text.match(/https?:\/\/[^\s]+\/join#t=[^\s]+/);
        if (!match) throw new Error("Missing link");
        const context = await newDevice(browser, info);
        try {
            const other = await context.newPage();
            const invitation = new URL(match[0]);
            await other.goto(`${BASE}${invitation.pathname}${invitation.hash}`);
            await expect(other.getByRole("heading", { name: /Join/ })).toBeVisible();
            await other.locator("#main").screenshot({ path: test.info().outputPath("join.png") });
            await other.evaluate(() => window.dispatchEvent(new Event("focus")));
            await expect(other).toHaveURL(/\/join#/);
            const invitedName = `Alex ${crypto.randomUUID().slice(0, 8)}`;
            await other.getByLabel("Your name", { exact: true }).fill(invitedName);
            if (scenario === "cancelled before code") {
                await members
                    .locator("li")
                    .filter({ hasText: email })
                    .getByRole("button", { name: "Cancel", exact: true })
                    .click();
                await expect(members.getByRole("status")).toContainText("Invitation cancelled");
                await other.getByRole("button", { name: "Send me a code", exact: true }).click();
                await expect(
                    other.getByRole("heading", { name: "This invitation is no longer available" }),
                ).toBeVisible();
                await expect(other.getByLabel("Email code", { exact: true })).toHaveCount(0);
                await page.reload();
                await expect(members.locator("li").filter({ hasText: email })).toHaveCount(0);
                return;
            }
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
            if (scenario === "cancelled during signup" || scenario === "cancelled on foreground") {
                await members
                    .locator("li")
                    .filter({ hasText: email })
                    .getByRole("button", { name: "Cancel", exact: true })
                    .click();
                await expect(members.getByRole("status")).toContainText("Invitation cancelled");
                if (scenario === "cancelled on foreground")
                    await other.evaluate(() => window.dispatchEvent(new Event("focus")));
                else await other.getByRole("button", { name: "Join family", exact: true }).click();
                await expect(
                    other.getByRole("heading", { name: "This invitation is no longer available" }),
                ).toBeVisible();
                await expect(
                    other.getByRole("link", { name: "Sign in", exact: true }),
                ).toBeVisible();
                expect((await other.request.get("/api/me")).status()).toBe(401);
                await page.reload();
                await expect(members.locator("li").filter({ hasText: email })).toHaveCount(0);
                return;
            }
            if (scenario === "interrupted acceptance") {
                await other.route("**/api/auth/email/invitation/accept", async (route) => {
                    const accepted = await route.fetch();
                    expect(accepted.status()).toBe(200);
                    await route.fulfill({ status: 503, json: { error: "server" } });
                });
                await other.getByRole("button", { name: "Join family", exact: true }).click();
                await expect(
                    other.getByRole("heading", { name: "This invitation is no longer available" }),
                ).toBeVisible();
                await expect(
                    other.getByRole("link", { name: "Sign in", exact: true }),
                ).toBeVisible();
                await page.reload();
                await expect(members.locator("li").filter({ hasText: email })).toContainText(
                    invitedName,
                );
                // No session cookie survived the lost response. Recover entirely through the UI.
                await context.clearCookies();
                await other.getByRole("link", { name: "Sign in", exact: true }).click();
                await other.getByLabel("Your email address").fill(email);
                await other.getByRole("button", { name: "Send me a code", exact: true }).click();
                await typeCode(other, page.request, email, `${digits[1]}${digits[2]}`);
                await expect(other).toHaveURL(new RegExp("/$"));
                await other.goto("/account#family-members");
                await expect(
                    other.locator("#family-members li").filter({ hasText: email }),
                ).toContainText("You");
                return;
            }
            if (scenario === "resend replaces the old link") {
                // Exercise the real server cooldown rather than bypassing its database rules.
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.max(0, 61_000 - (Date.now() - invitedAt))),
                );
                await members
                    .locator("li")
                    .filter({ hasText: email })
                    .getByRole("button", { name: "Resend", exact: true })
                    .click();
                await expect(members.getByRole("status")).toContainText("Invitation sent");
                await other.getByRole("button", { name: "Join family", exact: true }).click();
                await expect(
                    other.getByRole("heading", { name: "This invitation is no longer available" }),
                ).toBeVisible();
                const body: unknown = await (await page.request.get("/api/dev/outbox")).json();
                if (
                    !body ||
                    typeof body !== "object" ||
                    !("emails" in body) ||
                    !Array.isArray(body.emails)
                )
                    throw new Error("Missing outbox");
                const replacement: unknown = body.emails.find(
                    (m: unknown) =>
                        !!m &&
                        typeof m === "object" &&
                        "to" in m &&
                        m.to === email &&
                        "text" in m &&
                        typeof m.text === "string" &&
                        m.text.includes("/join#"),
                );
                if (
                    !replacement ||
                    typeof replacement !== "object" ||
                    !("text" in replacement) ||
                    typeof replacement.text !== "string"
                )
                    throw new Error("Missing replacement email");
                const link = replacement.text.match(/https?:\/\/[^\s]+\/join#t=[^\s]+/);
                if (!link) throw new Error("Missing replacement link");
                const next = new URL(link[0]);
                expect(next.hash).not.toBe(invitation.hash);
                await other.goto(`${BASE}${next.pathname}${next.hash}`);
                await other.getByLabel("Your name", { exact: true }).fill(invitedName);
                await other.getByRole("button", { name: "Send me a code", exact: true }).click();
                await other
                    .getByLabel("Email code", { exact: true })
                    .fill(await codeFor(page.request, email, `${digits[1]}${digits[2]}`));
            }
            let releaseCancel = () => {};
            if (scenario === "acceptance wins cancellation") {
                const held = new Promise<void>((resolve) => {
                    releaseCancel = resolve;
                });
                await page.route("**/api/members/cancel", async (route) => {
                    await held;
                    await route.continue();
                });
                await members
                    .locator("li")
                    .filter({ hasText: email })
                    .getByRole("button", { name: "Cancel", exact: true })
                    .click();
            }
            try {
                await other.getByRole("button", { name: "Join family", exact: true }).click();
                await expect(
                    other.getByRole("heading", { name: "You’re part of the family" }),
                ).toBeVisible();
            } finally {
                releaseCancel();
            }
            if (scenario === "acceptance wins cancellation") {
                await expect(members.getByRole("status")).toContainText("already accepted");
                await expect(
                    members
                        .locator("li")
                        .filter({ hasText: email })
                        .getByRole("button", { name: "Remove", exact: true }),
                ).toBeVisible();
                await expect(members.getByRole("status")).not.toContainText("Invitation cancelled");
            }
            await expect
                .poll(async () => {
                    const body: unknown = await (await page.request.get("/api/dev/outbox")).json();
                    if (
                        !body ||
                        typeof body !== "object" ||
                        !("emails" in body) ||
                        !Array.isArray(body.emails)
                    )
                        return [];
                    return body.emails
                        .filter(
                            (m: unknown) =>
                                !!m &&
                                typeof m === "object" &&
                                "subject" in m &&
                                m.subject === "Another pair of helping hands" &&
                                "text" in m &&
                                typeof m.text === "string" &&
                                m.text.includes(invitedName),
                        )
                        .map((m: { to: string }) =>
                            m.to === email ? "invitee" : "existing parent",
                        );
                })
                .toEqual(["existing parent"]);
            await other.getByRole("link", { name: "Open your family’s page" }).click();
            await expect(other).toHaveURL(new RegExp("/$"));
            await other.goto("/account#family-members");
            await expect(
                other.locator("#family-members li").filter({ hasText: email }),
            ).toContainText("You");
            await other.reload();
            await expect(
                other.locator("#family-members li").filter({ hasText: email }),
            ).toContainText("You");
            await page.evaluate(() => window.dispatchEvent(new Event("focus")));
            const row = members.locator("li").filter({ hasText: email });
            await expect(row).toContainText("Alex");
            await row.getByRole("button", { name: "Remove", exact: true }).click();
            await members.getByRole("button", { name: "Confirm removal" }).click();
            await expect(members.getByRole("status")).toContainText("Access ended");
            await expect(row).toHaveCount(0);
            const me = await other.request.get("/api/me");
            expect(me.status()).toBe(401);
            await other.reload();
            await expect(
                other.getByRole("heading", { name: "Sign in", exact: true }),
            ).toBeVisible();
            await other.goto(`${BASE}${invitation.pathname}${invitation.hash}`);
            await expect(
                other.getByRole("heading", { name: "This invitation is no longer available" }),
            ).toBeVisible();
        } finally {
            await context.close();
        }
    });
