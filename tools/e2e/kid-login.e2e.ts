import { expect, type Page } from "@playwright/test";
import { test, signInHere } from "./steps";

async function login(page: Page, username: string): Promise<void> {
    await page.goto("/sign-in?for=kids");
    await page.getByLabel("Your username", { exact: true }).fill(username);
    await page.getByLabel("Your kids’ PIN", { exact: true }).fill("1357");
    await page.getByRole("button", { name: "Open my page" }).click();
    await expect(page).toHaveURL(/\/kids$/);
    await expect(page.getByRole("button", { name: "Your profile" })).toBeVisible();
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
    // Two first sign-ins on a fresh browser binding must not overwrite one another.
    await context.clearCookies({ name: "ls_browser" });
    await Promise.all([login(rosie, `rosie-${suffix}`), login(leo, `leo-${suffix}`)]);
    expect(await who(rosie)).toEqual(["Rosie"]);
    expect(await who(leo)).toEqual(["Leo"]);
    await rosie.reload();
    await expect(rosie.getByRole("button", { name: "Your profile" })).toBeVisible();
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
    await rosie.getByRole("button", { name: "Your profile" }).click();
    await expect(rosie.getByRole("button", { name: "Switch child", exact: true })).toBeVisible();
    await rosie.keyboard.press("Escape");
    await expect(rosie.getByRole("button", { name: "Your profile" })).toBeFocused();
    await queueOne(rosie);
    await queueOne(leo);
    await rosie.getByRole("button", { name: "Your profile" }).click();
    await rosie.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(rosie.locator("output")).toContainText("Connect to the internet");
    expect(await waiting(rosie)).toBe(1);
    expect(await waiting(leo)).toBe(1);
    await rosie.unroute("**/api/kid/*/events");
    if (
        (await rosie
            .getByRole("button", { name: "Your profile" })
            .getAttribute("aria-expanded")) === "false"
    ) {
        await rosie.getByRole("button", { name: "Your profile" }).click();
    }
    await rosie.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(rosie.getByRole("heading", { name: "Your learning page" })).toBeVisible();
    await rosie.screenshot({ path: info.outputPath("kids-sign-in.png"), fullPage: true });
    expect(await waiting(leo)).toBe(1);
    await leo.unroute("**/api/kid/*/events");
    await leo.reload();
    await expect(leo.getByRole("button", { name: "Your profile" })).toBeVisible();
    expect(await who(leo)).toEqual(["Leo"]);
    await leo.getByRole("button", { name: "Your profile" }).click();
    await leo.getByRole("button", { name: "Switch child", exact: true }).click();
    await expect(leo.getByRole("heading", { name: "Your learning page" })).toBeVisible();
});

test("parent tabs stay signed in beside child tabs, lock together, and can sign out the whole browser", async ({
    page,
    context,
}) => {
    await signInHere(page);
    await page.goto("/");
    const account = await context.newPage();
    await account.goto("/account");
    await expect(
        account.getByRole("button", { name: "Lock parent access on this browser", exact: true }),
    ).toBeVisible();
    const open = async (name: string) => {
        const opened = context.waitForEvent("page");
        await page.getByRole("link", { name: `Open ${name}'s view`, exact: true }).click();
        const child = await opened;
        await expect(child).toHaveURL(/\/kids$/);
        await expect(child.getByRole("button", { name: "Your profile" })).toBeVisible();
        return child;
    };
    const rosie = await open("Rosie");
    const leo = await open("Leo");
    expect(await who(rosie)).toEqual(["Rosie"]);
    expect(await who(leo)).toEqual(["Leo"]);
    expect((await context.request.get("/api/me")).status()).toBe(200);
    await account
        .getByRole("button", { name: "Lock parent access on this browser", exact: true })
        .click();
    await expect(
        account.getByRole("heading", { name: "Unlock parent access", exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "Unlock parent access", exact: true }),
    ).toBeVisible();
    expect(await who(rosie)).toEqual(["Rosie"]);
    await account.getByLabel("Adult family PIN", { exact: true }).fill("2468");
    await account.getByRole("button", { name: "Unlock parent access", exact: true }).click();
    await expect(
        account.getByRole("heading", { name: "Hello, Test Parent", exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "Hello, Test Parent", exact: true }),
    ).toBeVisible();
    // A child following a parent URL stays in child mode even though the cookie is available.
    await rosie.goto("/account");
    await expect(rosie).toHaveURL(/\/kids$/);
    expect(await who(rosie)).toEqual(["Rosie"]);
    await account.goto("/account");
    account.once("dialog", (dialog) => void dialog.accept());
    await account
        .getByRole("button", { name: "Sign out everyone on this browser", exact: true })
        .click();
    await expect(account.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(
        rosie.getByRole("heading", { name: "Your learning page", exact: true }),
    ).toBeVisible();
    await expect(
        leo.getByRole("heading", { name: "Your learning page", exact: true }),
    ).toBeVisible();
});

for (const capability of ["storage", "locks"] as const) {
    test(`kids’ sign-in explains unavailable ${capability} without sending credentials`, async ({
        page,
    }) => {
        await page.addInitScript((missing) => {
            if (missing === "storage") {
                Object.defineProperty(window, "sessionStorage", {
                    get() {
                        throw new Error("blocked");
                    },
                });
            } else {
                Object.defineProperty(navigator, "locks", { value: undefined });
            }
        }, capability);
        let requests = 0;
        page.on("request", (request) => {
            if (request.url().endsWith("/api/kid/sign-in")) requests++;
        });
        await page.goto("/sign-in?for=kids");
        await page.getByLabel("Your username", { exact: true }).fill("rosie");
        await page.getByLabel("Your kids’ PIN", { exact: true }).fill("1357");
        await page.getByRole("button", { name: "Open my page" }).click();
        await expect(
            page
                .locator("#main")
                .getByText(
                    capability === "storage"
                        ? "Allow this site to save browser data, then try signing in again."
                        : "Please update your browser to sign in safely across tabs.",
                ),
        ).toBeVisible();
        expect(requests).toBe(0);
    });
}
