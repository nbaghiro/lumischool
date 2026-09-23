import { expect, type Page } from "@playwright/test";
import { test, signInHere } from "./steps";

async function login(page: Page, username: string): Promise<void> {
    await page.goto("/sign-in?for=kids");
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

async function queueOne(page: Page): Promise<void> {
    await page.route("**/api/kid/*/events", (route) => route.abort());
    await page.evaluate(async () => {
        const credential = sessionStorage.getItem("lumischool-kid-session") ?? "";
        const body: unknown = await (
            await fetch("/api/kid", { headers: { "x-kid-session": credential } })
        ).json();
        if (
            typeof body !== "object" ||
            body === null ||
            !("kids" in body) ||
            !Array.isArray(body.kids)
        )
            throw new Error("missing child");
        const kid: unknown = body.kids[0];
        if (typeof kid !== "object" || kid === null || !("id" in kid) || typeof kid.id !== "string")
            throw new Error("missing child id");
        const draft = {
            id: crypto.randomUUID(),
            kid_id: kid.id,
            at: new Date().toISOString(),
            kind: "sitting-began",
            data: {
                sitting: crypto.randomUUID(),
                lesson: "g1-making-ten",
                lessonHash: "test",
                pack: "test",
                mode: "screen",
            },
        };
        const request = indexedDB.open(
            `lumischool-kid-${credential.split(".").slice(0, 2).join("-")}`,
        );
        await new Promise<void>((resolve, reject) => {
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction("queue", "readwrite");
                tx.objectStore("queue").put({
                    id: draft.id,
                    kid_id: kid.id,
                    draft,
                    order: Date.now() * 1000,
                    bytes: new TextEncoder().encode(JSON.stringify(draft)).length,
                });
                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => {
                    db.close();
                    reject(tx.error);
                };
            };
        });
    });
}

async function waiting(page: Page): Promise<number> {
    return page.evaluate(async () => {
        const credential = sessionStorage.getItem("lumischool-kid-session") ?? "";
        const request = indexedDB.open(
            `lumischool-kid-${credential.split(".").slice(0, 2).join("-")}`,
        );
        return new Promise<number>((resolve, reject) => {
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const count = db.transaction("queue").objectStore("queue").count();
                count.onsuccess = () => {
                    db.close();
                    resolve(count.result);
                };
                count.onerror = () => {
                    db.close();
                    reject(count.error);
                };
            };
        });
    });
}

test("parents configure kids’ sign-in and siblings keep independent tabs and answer queues", async ({
    page,
    context,
}, info) => {
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
    await page.screenshot({ path: info.outputPath("parent-settings.png"), fullPage: true });
    expect(
        (
            await context.request.post("/api/auth/sign-out", {
                headers: { Origin: new URL(page.url()).origin },
                data: {},
            })
        ).ok(),
    ).toBe(true);
    await page.goto("/home");
    await expect(page.getByRole("link", { name: "Kids’ sign in", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
    );
    await page.screenshot({ path: info.outputPath("marketing.png") });
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("button", { name: "Grown-ups", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await page.getByRole("button", { name: "Kids", exact: true }).click();
    await expect(page.getByLabel("Your username", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Kids", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
    await expect(page.getByLabel("Your username", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Kids", exact: true }).click();
    const rosie = page;
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
    await queueOne(rosie);
    await queueOne(leo);
    await rosie.getByRole("button", { name: "Sign out of this tab" }).click();
    await expect(rosie.locator("output")).toContainText("Connect to the internet");
    expect(await waiting(rosie)).toBe(1);
    expect(await waiting(leo)).toBe(1);
    await rosie.unroute("**/api/kid/*/events");
    await rosie.getByRole("button", { name: "Sign out of this tab" }).click();
    await expect(rosie.getByRole("heading", { name: "Your learning page" })).toBeVisible();
    await rosie.screenshot({ path: info.outputPath("kids-sign-in.png"), fullPage: true });
    expect(await waiting(leo)).toBe(1);
    await leo.unroute("**/api/kid/*/events");
    await leo.reload();
    await expect(leo.getByRole("button", { name: "Sign out of this tab" })).toBeVisible();
    expect(await who(leo)).toEqual(["Leo"]);
    await leo.getByRole("button", { name: "Sign out of this tab" }).click();
    await expect(leo.getByRole("heading", { name: "Your learning page" })).toBeVisible();
});
