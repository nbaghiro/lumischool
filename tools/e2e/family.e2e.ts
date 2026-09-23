import { expect, type BrowserContext } from "@playwright/test";
import {
    address,
    askForCode,
    atScreen,
    BASE,
    childsMap,
    codeFor,
    FAMILY_PIN,
    holdGrownUps,
    newDevice,
    openChildrensView,
    signInAs,
    signOut,
    test,
} from "./steps";

const cookieNames = async (context: BrowserContext): Promise<string[]> =>
    (await context.cookies()).map((c) => c.name);

test("a wrong code says how many tries are left, another code inside the minute is refused, and an address with no family starts one", async ({
    page,
    request,
}, info) => {
    const email = address("wrong", info);
    await askForCode(page, email);
    const code = await codeFor(request, email);
    await page.getByLabel("The 8-digit code").fill(code === "00000000" ? "11111111" : "00000000");
    await expect(page.locator("main").getByText(/does not match.*4 more tries/)).toBeVisible();
    await page.getByRole("button", { name: "Send the code again" }).click();
    await expect(page.locator("main").getByText(/Too many codes.*in a minute/)).toBeVisible();
    await page.getByLabel("The 8-digit code").fill(code);
    await expect(page.getByRole("heading", { name: "Start a family" })).toBeVisible();
    await page.getByLabel("Your name").fill("Sam");
    await page.getByLabel("Your family's name").fill("Brennan");
    await page.getByRole("button", { name: "Start the family" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    // a new grown-up has a portrait on their stamp from the start, one their id gives them, and the
    // account page shows it pressed before they pick another
    await expect(page.getByRole("banner").locator(".gb-me-stamp svg")).toHaveCount(2);
    await page.getByRole("button", { name: /: your account, and sign out$/ }).click();
    await page.getByRole("menuitem", { name: "Account" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Your picture" }));
    await expect(
        page
            .getByRole("list", { name: "Pictures to choose from" })
            .getByRole("button", { pressed: true }),
    ).toHaveCount(1);
    await expect(page.locator("main")).toContainText("was picked for you");
    await signOut(page);
});

test("a parent opens a child's view on this device, and that browser's session is held put away and unreachable until the PIN", async ({
    page,
    context,
}) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);
    const names = await cookieNames(context);
    expect(
        await page.evaluate(() => sessionStorage.getItem("lumischool-kid-session")),
    ).toBeTruthy();
    expect(names, "the session's cookie stays, put away").toContain("ls_session");
    const me = await page.evaluate(async () => {
        const r = await fetch("/api/me");
        return { status: r.status, body: (await r.json()) as { error?: string } };
    });
    expect([me.status, me.body.error], "every adult route refuses it").toEqual([401, "put-away"]);
    expect(await cookieNames(context), "and refusing it clears nothing").toContain("ls_session");
    await expect(page.getByRole("link", { name: "lumischool site" })).toHaveCount(0);
});

test("a grown-up goes round: the view opens, an adult route is refused, the PIN lands on the family's page with no code, and the view opens again", async ({
    page,
    context,
}) => {
    await signInAs(page);
    const before = await page.evaluate(async () => {
        const me = (await (await fetch("/api/me")).json()) as { session?: { id: string } };
        return me.session?.id ?? "";
    });
    expect(before).not.toBe("");
    await openChildrensView(page, ["Rosie"]);
    const refused = await page.evaluate(async () => (await fetch("/api/kid-sessions")).status);
    expect(refused).toBe(401);
    await holdGrownUps(page);
    await page.getByLabel("The family PIN").fill(FAMILY_PIN);
    await page.getByRole("button", { name: "Leave the children's view" }).click();
    // the family's page, with no code typed: the session that was put away is the one in use
    await atScreen(page, page.getByRole("heading", { name: "Hello, Test Parent" }));
    const after = await page.evaluate(async () => {
        const me = (await (await fetch("/api/me")).json()) as { session?: { id: string } };
        return me.session?.id ?? "";
    });
    expect(after, "the same session, given back").toBe(before);
    expect(await cookieNames(context)).not.toContain("ls_kids");
    await openChildrensView(page, ["Rosie"]);
    expect(
        await page.evaluate(() => sessionStorage.getItem("lumischool-kid-session")),
    ).toBeTruthy();
    await holdGrownUps(page);
    await page.getByLabel("The family PIN").fill(FAMILY_PIN);
    await page.getByRole("button", { name: "Leave the children's view" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Hello, Test Parent" }));
    await signOut(page);
});

test("the children move between their own pages, and a reload opens on the pictures", async ({
    page,
}, info) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie", "Leo", "Ivy"]);
    const stamps = ["Rosie", "Leo", "Ivy"].map((name) =>
        page.getByRole("button", { name, exact: true }),
    );
    if (info.project.name === "phone") {
        const width = page.viewportSize()?.width ?? 0;
        for (const stamp of stamps) {
            const box = await stamp.boundingBox();
            expect(box, "every child's stamp is on the page").not.toBeNull();
            if (box) {
                expect(box.x).toBeGreaterThanOrEqual(0);
                expect(box.x + box.width).toBeLessThanOrEqual(width);
            }
        }
    }
    await page.getByRole("button", { name: "Leo", exact: true }).click();
    await expect(childsMap(page, "Leo")).toBeVisible();
    await page.getByRole("button", { name: "Back to the pictures" }).click();
    await expect(page.getByRole("heading", { name: "Who is learning today?" })).toBeVisible();
    await page.getByRole("button", { name: "Ivy", exact: true }).click();
    await expect(childsMap(page, "Ivy")).toBeVisible();
    await page.reload();
    await atScreen(page, page.getByRole("heading", { name: "Who is learning today?" }));
});

test("a grown-up leaves the children's view with the family's PIN", async ({ page, context }) => {
    await signInAs(page);
    await openChildrensView(page, ["Rosie"]);
    await holdGrownUps(page);
    const pin = page.getByLabel("The family PIN");
    const leave = page.getByRole("button", { name: "Leave the children's view" });
    await pin.fill("1111");
    await leave.click();
    // the announcer for screen readers holds the same words
    await expect(page.locator("#main").getByText("That PIN is not right.")).toBeVisible();
    await pin.fill(FAMILY_PIN);
    await leave.click();
    await atScreen(page, page.getByRole("heading", { name: "Hello, Test Parent" }));
    const names = await cookieNames(context);
    expect(names).toContain("ls_session");
    expect(names).not.toContain("ls_kids");
    await signOut(page);
});

test("a stale session cookie at / ends on the site after one visit", async ({ browser }, info) => {
    const context = await newDevice(browser, info);
    await context.addCookies([{ name: "ls_session", value: "stale.stale.stale", url: BASE }]);
    try {
        const page = await context.newPage();
        await page.goto("/");
        await expect(page.locator('script[src*="/apps/site/"]')).toHaveCount(1);
        await expect(page).toHaveURL(`${BASE}/`);
        expect((await context.cookies()).some((c) => c.name === "ls_session")).toBe(false);
    } finally {
        await context.close();
    }
});
