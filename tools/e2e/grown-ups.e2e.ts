import { expect, type Locator, type Page } from "@playwright/test";
import {
    atScreen,
    errorCard,
    signInAs,
    signInHere,
    signOut,
    signOutItem,
    smallTargets,
    test,
} from "./steps";

const HINT = "lumischool.signed-in";

/** The code step, at `/sign-in` or `/start`, with the API's answer given here so no code is sent. */
async function codeStep(page: Page, start: boolean): Promise<void> {
    await page.route("**/api/auth/email/start", (r) => r.fulfill({ status: 202, body: "" }));
    await page.goto(start ? "/start" : "/sign-in");
    if (start) {
        await page.getByLabel("Your name").fill("Nia");
        await page.getByLabel("Your family's name").fill("Okafor");
    }
    await page.getByLabel("Your email address").fill("e2e-steady@example.com");
    await page.getByRole("button", { name: "Send me a code" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Type the code" }));
}

const hint = (page: Page): Promise<string | null> =>
    page.evaluate((key) => localStorage.getItem(key), HINT);

test("no grown-ups' screen shows the card for a page that did not load", async ({ page }) => {
    for (const [path, heading] of [
        ["/sign-in", "Sign in"],
        ["/start", "Start your family"],
        ["/outbox", "The outbox"],
        ["/no-such-page", "There is no page here"],
    ] as const) {
        await page.goto(path);
        await atScreen(page, page.getByRole("heading", { name: heading, exact: true }));
    }
    await codeStep(page, false);
    await signInAs(page);
    // Add a child is a card lifted over the home, and the home stays under it
    await page.getByRole("button", { name: "Add another child" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add a child" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hello, Test Parent" })).toBeAttached();
    await dialog.getByRole("button", { name: "Not now" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add another child" })).toBeFocused();
    // Bring the phone's below-the-fold map into view before expecting its deferred drawing.
    await page.locator(".page-ground").scrollIntoViewIfNeeded();
    await expect(page.locator(".page-ground svg, .page-ground img").first()).toBeAttached();
    await expect(errorCard(page)).toHaveCount(0);
    await signOut(page);
});

test("a grown-up signs in twice in a row in one browser, and the family's page opens each time, even from a second copy of the page's code", async ({
    page,
}) => {
    // Under the dev server, a hot update to anything engine/ui/page.tsx imports gives page.tsx a newer
    // `?t=` without running it again on an open page, so a screen loaded afterwards imports a copy of
    // its own. The family's screen is served that way here, with no file saved.
    let copies = 0;
    await page.route(/\/apps\/home\/family\.tsx/, async (r) => {
        const served = await r.fetch();
        const text = await served.text();
        const body = text.replace(/(\/engine\/ui\/page\.tsx)(\?t=\d+)?(?=["'])/g, "$1?t=1");
        if (body !== text) copies++;
        await r.fulfill({ response: served, body });
    });
    for (let time = 0; time < 2; time++) {
        await signInHere(page);
        await expect(kidItem(page, "Rosie")).toBeVisible();
        await signOut(page);
    }
    expect(copies, "the family's screen was served importing its own copy each time").toBe(2);
});

test("the card for a screen that did not load clears once the app moves to another path", async ({
    page,
}) => {
    await page.goto("/sign-in");
    await atScreen(page, page.getByRole("heading", { name: "Sign in", exact: true }));
    // the missing page's code, which this page has not loaded, does not arrive
    await page.route(/\/apps\/home\/missing\.tsx/, (r) => r.abort());
    await page.evaluate(() => {
        history.pushState(null, "", "/no-such-page");
        dispatchEvent(new PopStateEvent("popstate"));
    });
    await expect(errorCard(page)).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(errorCard(page)).toHaveCount(0);
});

test("the code step takes digits typed straight away, and its button says what the code does", async ({
    page,
}) => {
    await codeStep(page, true);
    const code = page.getByLabel("The 8-digit code");
    await expect(code).toBeFocused();
    await page.keyboard.type("1234");
    await expect(code).toHaveValue("1234");
    await expect(page.getByRole("button", { name: "Start the family" })).toBeVisible();

    await codeStep(page, false);
    await expect(page.getByLabel("The 8-digit code")).toBeFocused();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});

test("adding a child puts focus in the name, keeps the family's page while it asks again, and moves focus to the line that says the child is added", async ({
    page,
}) => {
    await signInAs(page);
    // Hold the response to check focus while the family refresh is pending.
    await page.route("**/api/kids", (r) =>
        r.request().method() === "POST"
            ? r.fulfill({
                  status: 201,
                  json: {
                      kid: {
                          id: "00000000-0000-4000-8000-000000000001",
                          family_id: "00000000-0000-4000-8000-000000000002",
                          name: "Maya",
                          grade: 2,
                          settings: {},
                      },
                  },
              })
            : r.continue(),
    );
    await page.getByRole("button", { name: "Add another child" }).click();
    await expect(page.getByLabel("Their name")).toBeFocused();
    await page.keyboard.type("Maya");
    await page.getByLabel(/I have read the notice/).check();
    // the page's scroll is locked under the modal card
    expect(await page.evaluate(() => document.querySelector("dialog")?.matches(":modal"))).toBe(
        true,
    );

    let answer = (): void => undefined;
    const held = new Promise<void>((done) => {
        answer = done;
    });
    await page.route("**/api/family", async (r) => {
        await held;
        await r.continue();
    });
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const added = page.locator(".say").filter({ hasText: "Maya is added." });
    await expect(added).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hello, Test Parent" })).toBeVisible();
    await expect(kidItem(page, "Rosie")).toBeVisible();
    await expect(added).toBeFocused();
    answer();
    await page.waitForResponse("**/api/family");
    await expect(added).toBeFocused();
    await page.unroute("**/api/family");
    await signOut(page);
});

test("the grown-up's own stamp on the bar opens a menu with their name, their account and Sign out, by pointer and by keyboard", async ({
    page,
}) => {
    await signInAs(page);
    const stamp = page.getByRole("button", { name: "Test Parent: your account, and sign out" });
    await expect(stamp).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(0);
    expect(await smallTargets(page.getByRole("banner"))).toEqual([]);
    // by keyboard: Enter opens with the keyboard on the first item, the arrows move, Escape closes
    // and gives the stamp the keyboard back
    await stamp.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu", { name: "Test Parent's menu" });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("banner")).toContainText(/@example\.com/);
    const account = page.getByRole("menuitem", { name: "Account" });
    const out = page.getByRole("menuitem", { name: "Sign out" });
    await expect(account).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(out).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(account).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(stamp).toBeFocused();
    await expect(stamp).toHaveAttribute("aria-expanded", "false");
    // by pointer: a click opens it, and a click anywhere else closes it
    await stamp.click();
    await expect(menu).toBeVisible();
    // the menu lifts in over a moment, and a rect read mid-lift snaps to the phone's third of a
    // pixel, so the targets are measured once it has settled, which is when a finger meets them
    await page.evaluate(() =>
        Promise.all(
            (document.querySelector(".gb-me-pop")?.getAnimations() ?? []).map((a) =>
                a.finished.catch(() => undefined),
            ),
        ),
    );
    expect(await smallTargets(menu)).toEqual([]);
    // a press on the page well below the menu, since on a phone the menu covers the greeting
    await page.mouse.click(16, 500);
    await expect(menu).toHaveCount(0);
    await signOut(page);
});

test("the bar stays as a grown-up moves between Home, Calendar and Explore and back: the same bar and the same stamps, nothing drawn again", async ({
    page,
}) => {
    await signInAs(page);
    const bar = page.getByRole("banner").locator(".gb");
    await expect(bar).toBeVisible();
    // the stamps are drawn once their code has come: the grown-up's own, a stamp and their portrait,
    // and each child's two drawings only where the page is wide enough to show the children
    await expect(bar.locator(".gb-me-stamp svg")).toHaveCount(2);
    const kids = bar.getByRole("navigation", { name: "Each child" });
    const kidsShown = await kids.isVisible();
    if (kidsShown)
        await expect(kids.locator(".gb-kid svg")).toHaveCount(
            2 * (await kids.locator(".gb-kid").count()),
        );
    const PARTS = kidsShown
        ? ".gb .gb-kid, .gb .gb-kid svg, .gb .gb-me-stamp, .gb .gb-me-stamp svg"
        : ".gb .gb-kid, .gb .gb-me-stamp, .gb .gb-me-stamp svg";
    const was = await page.evaluateHandle(
        (sel) => ({
            bar: document.querySelector(".gb"),
            parts: [...document.querySelectorAll(sel)],
        }),
        PARTS,
    );
    const places = page.getByRole("navigation", { name: "The grown-ups' places" });
    const current = (name: string): Promise<void> =>
        expect(places.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    await current("Home");
    await places.getByRole("link", { name: "Calendar" }).click();
    await atScreen(page, page.getByRole("heading", { name: "The calendar", exact: true }));
    await current("Calendar");
    await places.getByRole("link", { name: "Explore" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    await current("Explore");
    await places.getByRole("link", { name: "Home" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Hello, Test Parent" }));
    await current("Home");
    // the same nodes in the same order and no more of them, since a bar or a stamp drawn again
    // would be new nodes
    expect(
        await was.evaluate((w, sel) => {
            const now = [...document.querySelectorAll(sel)];
            return {
                bar: w.bar !== null && w.bar === document.querySelector(".gb"),
                parts: w.parts.length === now.length && w.parts.every((el, i) => el === now[i]),
            };
        }, PARTS),
    ).toEqual({ bar: true, parts: true });
});

test("the account page opens from the menu with concise settings and Sign out", async ({
    page,
}) => {
    await signInAs(page);
    await page.getByRole("button", { name: "Test Parent: your account, and sign out" }).click();
    await page.getByRole("menuitem", { name: "Account" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Test Parent" }));
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText(/@example\.com/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Signed-in browsers" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Your family", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign-in & PINs", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Paying for lumischool" })).toHaveCount(0);
    expect(await smallTargets(page.locator("#main"))).toEqual([]);
    // a picture picked here is the one on the stamp on the bar
    await page.getByRole("button", { name: "A beard", exact: true }).click();
    await expect(page.getByRole("button", { name: "A beard", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await expect(page.getByRole("banner").locator(".gb-me-stamp svg")).toHaveCount(2);
    await page.getByRole("button", { name: "Curly hair", exact: true }).click();
    await expect(page.getByRole("button", { name: "Curly hair", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await page
        .locator("section.part")
        .filter({ has: page.getByRole("heading", { name: "Sign out", exact: true }) })
        .getByRole("button", { name: "Sign out", exact: true })
        .click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("a sign-out that never reaches lumischool says so on the page and keeps the grown-up signed in", async ({
    page,
}) => {
    await signInAs(page);
    await page.route("**/api/auth/sign-out", (r) => r.abort("internetdisconnected"));
    await (await signOutItem(page)).click();
    await expect(page.getByRole("banner").getByText(/^You are still signed in\./)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(await hint(page)).not.toBeNull();
    await page.unroute("**/api/auth/sign-out");
    await signOut(page);
    expect(await hint(page)).toBeNull();
});

test("the family's page loads in a browser that keeps nothing in storage", async ({ page }) => {
    await page.addInitScript(() => {
        Storage.prototype.setItem = () => {
            throw new DOMException("storage is off", "SecurityError");
        };
    });
    await signInAs(page);
    await expect(kidItem(page, "Rosie")).toBeVisible();
    await signOut(page);
});

/**
 * A child in the home's own list of children. The morning's order names children too, so a case that
 * asks whether the family's page still lists a child asks the children's part of it.
 */
const kidItem = (page: Page, name: string): Locator =>
    page
        .getByRole("region", { name: "Children", exact: true })
        .getByRole("listitem")
        .filter({ hasText: name });

test("account does not request session lists and parent PIN edits stay within the card", async ({
    page,
}) => {
    await signInAs(page);
    const requests: string[] = [];
    await page.route(/\/api\/(sessions|kid-sessions)$/, async (route) => {
        requests.push(route.request().url());
        await route.fulfill({ status: 500, json: { error: "server" } });
    });
    await page.goto("/account");
    const pins = page.locator("article.postcard").filter({
        has: page.getByRole("heading", { name: "Sign-in & PINs", exact: true }),
    });
    await expect(pins.getByRole("button", { name: "Change parent PIN" })).toBeVisible();
    expect(requests).toEqual([]);
    await pins.getByRole("button", { name: "Change parent PIN" }).click();
    await expect(pins.getByLabel("The new PIN", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Test Parent", exact: true })).toBeVisible();
    await pins.getByLabel("The new PIN", { exact: true }).fill("8642");
    await pins.getByLabel("The same PIN again", { exact: true }).fill("8642");
    await expect(pins.getByText("Parent PIN saved.", { exact: true })).toBeVisible();
    await pins.getByRole("button", { name: "Dismiss message", exact: true }).click();
    await expect(pins.getByText("Parent PIN saved.", { exact: true })).toHaveCount(0);
    await pins.getByRole("button", { name: "Change parent PIN" }).click();
    await pins.getByLabel("The new PIN", { exact: true }).fill("7531");
    await pins.getByLabel("The same PIN again", { exact: true }).fill("7531");
    await expect(pins.getByText("Parent PIN saved.", { exact: true })).toBeVisible();
    await expect(pins.getByLabel("The new PIN", { exact: true })).toHaveCount(0);
    await expect(pins.getByRole("button", { name: "Lock parent pages" })).toHaveCount(0);
});

test("parents can confirm deletion of only their test family from the last account card", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/account");
    const card = page
        .locator("article.postcard")
        .filter({ has: page.getByRole("heading", { name: "Delete family", exact: true }) });
    await expect(
        page
            .locator(".ga > article.postcard")
            .last()
            .getByRole("heading", { name: "Delete family", exact: true }),
    ).toBeVisible();
    await card.getByRole("button", { name: "Delete family", exact: true }).click();
    const remove = card.getByRole("button", { name: "Permanently delete family" });
    await expect(remove).toBeDisabled();
    await card.getByLabel("Family name to delete").fill("Wrong family");
    await expect(remove).toBeDisabled();
    await card.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(remove).toHaveCount(0);
    await card.getByRole("button", { name: "Delete family", exact: true }).click();
    await card.getByLabel("Family name to delete").fill("Test Family");
    await expect(remove).toBeEnabled();
    await remove.click();
    await expect(page).toHaveURL(/\/sign-in$/);
    expect((await page.context().request.get("/api/me")).status()).toBe(401);
});
