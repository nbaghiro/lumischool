// The grown-ups' screens holding steady (.docs/auth.md, flows 1, 2 and 4): no screen shows the card
// for a page that did not load; a grown-up signs in twice in one browser, even when the dev server
// hands the family's screen its own copy of the page's code; the card clears once the app moves to
// another path; typing goes where a step puts focus; the family's page stays in place while it asks
// again; a sign-out that never arrived says so; and the family's page loads in a browser that keeps
// nothing. A seeded parent signs in with a code once and the session is kept while it works, and a
// code asked for here is answered here.

import {
    expect,
    type APIRequestContext,
    type Locator,
    type Page,
    type TestInfo,
} from "@playwright/test";
import {
    address,
    askForCode,
    atScreen,
    blankQuestions,
    errorCard,
    signInAs,
    signInHere,
    signOut,
    signOutItem,
    smallTargets,
    test,
    typeCode,
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
    await expect(page.getByRole("heading", { name: "Hello, Anna Harlow" })).toBeAttached();
    await dialog.getByRole("button", { name: "Not now" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add another child" })).toBeFocused();
    // and none after the map, which is drawn last
    await expect(page.locator(".page-ground svg").first()).toBeAttached();
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
    // the seeded family is left as it is: the child is added here, and the page asks the API again
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
    await expect(page.getByRole("heading", { name: "Hello, Anna Harlow" })).toBeVisible();
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
    const stamp = page.getByRole("button", { name: "Anna Harlow: your account, and sign out" });
    await expect(stamp).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(0);
    expect(await smallTargets(page.getByRole("banner"))).toEqual([]);
    // by keyboard: Enter opens with the keyboard on the first item, the arrows move, Escape closes
    // and gives the stamp the keyboard back
    await stamp.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu", { name: "Anna Harlow's menu" });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("banner")).toContainText("demo-parent1@lumischool.ai");
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
    await atScreen(page, page.getByRole("heading", { name: /^Week of / }));
    await current("Calendar");
    await places.getByRole("link", { name: "Explore" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Every lesson", level: 1 }));
    await current("Explore");
    await places.getByRole("link", { name: "Home" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Hello, Anna Harlow" }));
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

test("the account page opens from the menu, lists this browser's session, and Sign out everywhere ends it", async ({
    page,
}) => {
    await signInAs(page);
    await page.getByRole("button", { name: "Anna Harlow: your account, and sign out" }).click();
    await page.getByRole("menuitem", { name: "Account" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Anna Harlow" }));
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText("demo-parent1@lumischool.ai").first()).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "The children's view and the family PIN" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Where you are signed in" })).toBeVisible();
    await expect(page.locator(".ga-row.own")).toHaveCount(1);
    await expect(page.locator(".ga-row.own")).toContainText("this browser");
    await expect(page.getByRole("heading", { name: "Your family's data" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Paying for lumischool" })).toBeVisible();
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
    await page.getByRole("button", { name: "Sign out everywhere" }).click();
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

/** Drags the paper of a roll down by `by` pixels, from a corner no sheet's own controls are in. */
async function dragRoll(page: Page, roll: Locator, by: number): Promise<void> {
    // the mouse works in the window's own coordinates, so the roll has to be in the window first
    await roll.scrollIntoViewIfNeeded();
    const box = await roll.boundingBox();
    if (!box) return;
    // the paper takes the drag where the sheets are, so the middle, starting where the pull has room
    // to go: near the top to pull the roll down, near the foot to pull it up
    const x = box.x + box.width / 2;
    const y = by >= 0 ? box.y + 30 : box.y + box.height - 30;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + by, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);
}

/**
 * The first of `all` that stands well inside `within`, or null when none of them does. The roll's
 * sheets sit in a world that is clipped by its box and moves under the reader, so a sheet's button is
 * reachable only while its own card is inside that box. `room` keeps it off the edges, since a button
 * that only just fits can still be out of the window once the page itself is scrolled to it, which is
 * what a phone does with a tall card.
 */
async function inView(all: Locator, within: Locator, room = 0.15): Promise<Locator | null> {
    const frame = await within.boundingBox();
    if (!frame) return null;
    const pad = { x: frame.width * room, y: frame.height * room };
    for (let i = 0; i < (await all.count()); i++) {
        const one = all.nth(i);
        const box = await one.boundingBox();
        if (!box) continue;
        const inside =
            box.x >= frame.x &&
            box.y >= frame.y + pad.y &&
            box.x + box.width <= frame.x + frame.width &&
            box.y + box.height <= frame.y + frame.height - pad.y;
        if (inside) return one;
    }
    return null;
}

/** Every control in `scope` that a finger presses, with the ones under 44 pixels either way. */
/**
 * A family of its own whose one school day is today, whichever day of the week that is, with a child
 * in grade 1 doing maths and reading one day a week each, so that today's page holds two lessons:
 * the parent signed in on this page, and the child's id. The Harlows keep the default week, Monday
 * to Friday, so a case that needs a lesson on today's page fails every weekend on them. The plan is
 * written three days back rather than now, since a child's start is the first weekday on or after
 * the first track turned on (school/family/family.ts, startOf), and a plan written on a Sunday would
 * start on the Monday. The rest of grade 1's default is turned off in so many words, since a plan
 * nobody changes carries it, and with one school day every default track would land on today.
 */
async function familyWithToday(
    page: Page,
    request: APIRequestContext,
    info: TestInfo,
): Promise<{ kid: string }> {
    const email = address("today", info);
    await askForCode(page, email, { name: "Sam", family: "Okafor" });
    await typeCode(page, request, email);
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    const fixture: unknown = await page.evaluate(async (): Promise<unknown> => {
        const post = async (path: string, body: unknown): Promise<unknown> =>
            (
                await fetch(path, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(body),
                })
            ).json();
        const added = (await post("/api/kids", {
            name: "Pip",
            grade: 1,
            consent: { notice: "2026-09" },
        })) as { kid?: { id: string } };
        const kid = added.kid?.id;
        if (!kid) return { problem: JSON.stringify(added) };
        // the plan counts Monday as 1 and Sunday as 7 (engine/answer.ts, school-days)
        const weekday = new Date().getDay() || 7;
        const at = new Date(Date.now() - 3 * 864e5).toISOString();
        const tracks = [
            "maths",
            "coding",
            "physics",
            "chemistry",
            "reading",
            "writing",
            "music",
            "nature",
        ];
        const events: unknown[] = [
            {
                id: crypto.randomUUID(),
                kid_id: kid,
                kind: "plan-changed",
                at,
                data: { op: { op: "school-days", weekdays: [weekday] } },
            },
            ...tracks.map((track) => ({
                id: crypto.randomUUID(),
                kid_id: kid,
                kind: "plan-changed",
                at,
                data:
                    track === "maths" || track === "reading"
                        ? { op: { op: "track", track, on: true, perWeek: 1 } }
                        : { op: { op: "track", track, on: false, perWeek: 0 } },
            })),
        ];
        const written = (await post("/api/events", { events })) as { events?: unknown[] };
        return { kid, written: written.events?.length ?? 0, expected: events.length };
    });
    if (typeof fixture !== "object" || fixture === null || !("kid" in fixture))
        throw new Error(`the family was not written: ${JSON.stringify(fixture)}`);
    const { kid, written, expected } = fixture as {
        kid: string;
        written: number;
        expected: number;
    };
    expect(written, "the plan was not written in full").toBe(expected);
    return { kid };
}

test("every stamp on the home is drawn from the page's palette with its picture on it, none in print ink", async ({
    page,
}) => {
    // A drawing reads its colours from where it sits, and one that finishes while its host is out of
    // the document paints the print palette instead, whose ink is #161616 and is never the page's;
    // that was the black stamps of 21 September, when the Router's Suspense took the screen out of
    // the document for a card's late request.
    await signInAs(page);
    const portraits = page.locator(".gh-kid .kid-portrait");
    await expect(portraits).toHaveCount(2 * (await page.locator(".gh-kid").count()));
    // a portrait is two drawings, the stamp's paper and the child's picture
    for (const p of await portraits.all()) await expect(p.locator("svg")).toHaveCount(2);
    await expect(page.locator(".gh-kid .kid-portrait svg [fill='#161616']")).toHaveCount(0);
    await expect(page.locator(".gh-kid .kid-portrait svg [stroke='#161616']")).toHaveCount(0);
    await expect(page.locator(".gb-kid .kid-portrait svg [fill='#161616']")).toHaveCount(0);
});

test("a grown-up's home has a card for each child with today's lessons, the week, where they are on their map, what came back and the one thing to look at", async ({
    page,
}) => {
    // What the home shows of each child holds on any day, a day with nothing planned included. A
    // lesson of today opening in Explore, and Print recording it, need a day with a lesson on it,
    // which the Harlows have on weekdays only, so they are the next case, on a family whose one
    // school day is today.
    await signInAs(page);
    const hello = page
        .locator(".postcard")
        .filter({ has: page.getByRole("heading", { name: "Hello, Anna Harlow" }) });
    await expect(hello.locator(".postcard-lead")).toHaveText(
        /^(\d+ lessons? today|Nothing is planned today) for Rosie, Leo and Ivy\. (\d+ sheets? came back on paper and waits? to be marked|Nothing is waiting to be marked)\.$/,
    );
    const children = page.getByRole("region", { name: "Children", exact: true });
    for (const name of ["Rosie", "Leo", "Ivy"]) {
        const card = children.getByRole("article", { name });
        await expect(card).toBeVisible();
        await expect(card.getByText(/^Grade \d · The .+, term \d$/)).toBeVisible();
        for (const part of [
            "Today",
            "This week",
            "On the map",
            "Came back",
            "One thing to look at",
        ])
            await expect(card.getByRole("region", { name: part })).toBeVisible();
        await expect(
            card.getByRole("list", { name: `${name}'s week` }).getByRole("listitem"),
        ).toHaveCount(5);
        await expect(card.getByRole("region", { name: "On the map" })).toContainText(
            /waits for|happened/,
        );
        await expect(card.getByRole("button", { name: `Open ${name}'s view` })).toBeVisible();
    }
    // nothing a finger presses on the home is under 44 pixels
    expect(await smallTargets(page.locator("main"))).toEqual([]);
    expect(await smallTargets(page.getByRole("banner"))).toEqual([]);

    // a child's stamp in the bar takes the page to their card
    const bar = page.getByRole("banner");
    if (await bar.getByRole("navigation", { name: "Each child" }).isVisible()) {
        await bar.getByRole("link", { name: "Ivy, Grade 4" }).click();
        await expect(page.getByRole("heading", { name: "Ivy", level: 2 })).toBeFocused();
        await expect(page).toHaveURL(/\/\?kid=/);
    }
});

test("a lesson of today opens from the child's card in Explore with its answers, and Print records the sheet for the child", async ({
    page,
    request,
}, info) => {
    // This needs a day with a lesson on it: today's part of a child's card is empty on a day with
    // nothing planned, and the Harlows' plan keeps the default week, Monday to Friday, so on them
    // this would fail every weekend. The family here has today as its one school day, whichever day
    // of the week the case runs on.
    const { kid } = await familyWithToday(page, request, info);
    await page.goto("/");
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    const pip = page
        .getByRole("region", { name: "Children", exact: true })
        .getByRole("article", { name: "Pip" });
    const today = pip.getByRole("region", { name: "Today" });

    // a lesson of today opens in Explore with its answers
    const open = today.getByRole("link", { name: /^Open / }).first();
    await expect(open, "today's part of the card has no lesson to open").toBeVisible();
    const title = ((await open.textContent()) ?? "").replace(/^Open /, "");
    await open.click();
    await atScreen(page, page.getByRole("heading", { level: 1, name: title }));
    await expect(page.locator(".explore-sheet .ls-answer").first()).toBeVisible({
        timeout: 20_000,
    });
    await page.goBack();
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));

    // Print records the sheet for the child, with its questions, and prints the child's sheet
    const written: unknown[] = [];
    await page.route("**/api/events", async (r) => {
        if (r.request().method() !== "POST") return r.continue();
        written.push(r.request().postDataJSON());
        await r.fulfill({ status: 200, json: { events: [] } });
    });
    await page.evaluate(() => {
        window.print = () => {
            document.documentElement.dataset.printed = "yes";
        };
    });
    await today
        .getByRole("button", { name: /^Print .+ for Pip$/ })
        .first()
        .click();
    await expect(page).toHaveURL(/\/explore\/[^?]+$/);
    await expect(page.locator("html")).toHaveAttribute("data-printed", "yes", { timeout: 20_000 });
    await expect(page.getByLabel("Show the answers and the notes for grown-ups")).not.toBeChecked();
    expect(written).toMatchObject([
        {
            events: [
                {
                    kind: "sheet-printed",
                    kid_id: kid,
                    data: {
                        grownUps: false,
                        questions: expect.arrayContaining([expect.objectContaining({ n: 1 })]),
                    },
                },
            ],
        },
    ]);
    await page.unroute("**/api/events");
});

test("a grown-up marks the sheets that came back, one after another from the hello card, tapping only what was wrong and the author's line for it", async ({
    page,
}) => {
    await signInAs(page);
    const hello = page
        .locator(".postcard")
        .filter({ has: page.getByRole("heading", { name: "Hello, Anna Harlow" }) });
    const lead = hello.locator(".postcard-lead");
    await expect(lead).toHaveText(/came back on paper and waits? to be marked\.$/);
    const waiting = Number(/(\d+) sheets? came back/.exec((await lead.textContent()) ?? "")?.[1]);
    expect(waiting).toBeGreaterThan(1);

    // the marks are answered here, so the seeded family is left as it is
    const written: unknown[] = [];
    await page.route("**/api/events", async (r) => {
        if (r.request().method() !== "POST") return r.continue();
        written.push(r.request().postDataJSON());
        await r.fulfill({ status: 200, json: { events: [] } });
    });
    await hello.getByRole("button", { name: "Mark them" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(`1 of ${waiting} sheets to mark`);
    await expect(dialog.getByRole("button", { name: "Back to the page" })).toBeFocused();
    await expect(dialog.locator(".ls-sheet .ls-answer").first()).toBeVisible({ timeout: 20_000 });

    // one question wrong with the author's line, another wrong with none, and the rest right
    const column = dialog.getByRole("complementary");
    const boxes = column.getByRole("button", { name: /^Question \d+ was wrong$/ });
    const total = await boxes.count();
    expect(total).toBeGreaterThan(2);
    const withLine = column
        .locator("li")
        .filter({ has: page.locator(".gm-rule") })
        .first();
    const line = ((await withLine.locator(".gm-rule").first().textContent()) ?? "").trim();
    await withLine.locator(".gm-rule").first().click();
    await expect(withLine.getByRole("button", { name: /was wrong$/ })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    const plain = column
        .locator("li")
        .filter({ has: page.locator(".gm-box[aria-pressed='false']") })
        .first();
    await plain.getByRole("button", { name: /was wrong$/ }).click();
    await expect(column.locator(".gm-tally")).toHaveText(
        `${total - 2} of ${total} right first time`,
    );
    expect(await smallTargets(dialog)).toEqual([]);
    await column.getByRole("button", { name: `Done, and the next of ${waiting - 1}` }).click();
    await expect(dialog).toContainText(`2 of ${waiting} sheets to mark`);
    await expect(dialog.locator(".say")).toContainText(
        /is marked for \w+: \d+ of \d+ right first time\./,
    );

    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
        events: expect.arrayContaining([
            expect.objectContaining({
                kind: "marked",
                data: expect.objectContaining({ right: false, rule: line }),
            }),
            expect.objectContaining({
                kind: "marked",
                data: expect.objectContaining({ right: false, rule: null }),
            }),
            expect.objectContaining({
                kind: "marked",
                data: expect.objectContaining({
                    right: true,
                    rule: null,
                    given: { k: "unmarked" },
                }),
            }),
        ]),
    });
    const body = written[0];
    const events = typeof body === "object" && body !== null && "events" in body ? body.events : [];
    expect(Array.isArray(events) ? events.length : 0).toBe(total);

    // Escape goes back to the page, which says what was marked
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(hello.locator(".say")).toContainText("is marked for");
    await page.unroute("**/api/events");
});

test("the home lays today's lessons in one order for one adult, on the family's own times, and says whose times they are", async ({
    page,
}) => {
    await signInAs(page);
    const hello = page
        .locator(".postcard")
        .filter({ has: page.getByRole("heading", { name: "Hello, Anna Harlow" }) });
    await expect(hello.locator(".postcard-lead")).not.toHaveText("Reading today's lessons.");
    const toOrder = hello.getByRole("button", { name: "The morning's order" });
    test.skip(!(await toOrder.isVisible()), "today holds no more than one lesson for the family");

    await toOrder.click();
    const card = page.locator("#gh-morning .postcard");
    await expect(
        card.getByRole("heading", { name: /^Start at \d{1,2}:\d\d with \w+$/ }),
    ).toBeVisible();
    await expect(card.locator(".postcard-lead")).toContainText(
        /You are needed for about \d+ of the next \d+ minutes\./,
    );
    // the card says which the lengths are, the family's own or the table of guesses
    await expect(card.locator(".gh-guess")).toContainText(
        /the family's own|from their own lessons|our guess/,
    );

    // every block says the time, whose it is and whether it needs the adult, in the lesson's order
    const rows = card.locator(".gh-blocks li");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(1);
    await expect(rows.first().locator(".gh-time")).toHaveText(/^\d{1,2}:\d\d$/);
    await expect(rows.first()).toContainText(/You teach this|You read it aloud|On their own/);
    const times = await rows.locator(".gh-time").allTextContents();
    const minutes = times.map((t) => {
        const [h, m] = t.split(":").map(Number);
        return (h ?? 0) * 60 + (m ?? 0);
    });
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));

    // the start is a grown-up's to set, and the whole order follows it
    const started = card.locator(".gh-start input");
    await started.fill("08:15");
    await started.dispatchEvent("change");
    await expect(
        card.getByRole("heading", {
            name:
                "Start at 8:15 with " +
                (await rows.first().locator(".gh-bw b").textContent())?.split(",")[0],
        }),
    ).toBeVisible();
    await expect(rows.first().locator(".gh-time")).toHaveText("8:15");
    await expect(card.locator(".gh-start")).toContainText(
        /begun at \d{1,2}:\d\d\.|Kept on this device\./,
    );
    expect(await smallTargets(page.locator("#gh-morning"))).toEqual([]);
});

test("the calendar opens on the week, with a sticker for every planned lesson, and a day opens what can be done with it", async ({
    page,
}) => {
    await signInAs(page);
    await page.goto("/calendar");
    await atScreen(page, page.getByRole("heading", { name: /^Week of / }));
    expect(await page.locator(".gc-sticker").count()).toBeGreaterThan(0);
    // the card above the sheet is compact: one line of words and the two segs on one row, so on a
    // desk the whole card is under 300 px and the week is on the first screen, every button a target
    const head = page.locator(".gc > .postcard").first();
    const filters = head.locator(".gc-filters");
    await expect(filters.getByRole("button", { name: "The month", exact: true })).toBeVisible();
    await expect(filters.getByRole("button", { name: "Everyone", exact: true })).toBeVisible();
    if (page.viewportSize()?.width === 1440)
        expect((await head.boundingBox())?.height ?? 999).toBeLessThan(300);
    expect(await smallTargets(filters)).toEqual([]);
    // Add a child from the bar opens over the week (a phone's bar has no Add a child), and Escape
    // closes it with the week still under and the keyboard back on the button
    const addButton = page.getByRole("banner").getByRole("button", { name: "Add a child" });
    if (await addButton.isVisible()) {
        await addButton.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("heading", { name: "Add a child" })).toBeVisible();
        await expect(page.getByLabel("Their name")).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole("heading", { name: /^Week of / })).toBeVisible();
        await expect(addButton).toBeFocused();
    }

    // a day's own heading opens what can be done with the day. "A week went wrong" is offered only
    // for a day the plan still has ahead of it, since a shift moves every planned day from that day
    // on by whole weeks and from a day gone by would rewrite what happened, so it is not asked for
    // here, where the first heading may be a day gone by
    await page
        .getByRole("button", { name: /^More for / })
        .first()
        .click();
    const card = page.locator(".gc-card");
    // a postcard lifted off the calendar: one choice of what happened, showing one form at a time
    await expect(card.getByRole("button", { name: "A day off", exact: true })).toBeFocused();
    for (const what of ["A day off", "A holiday", "A family day"])
        await expect(card.getByRole("button", { name: what, exact: true })).toBeVisible();
    await expect(card.getByLabel("Reason")).toHaveCount(0);
    await card.getByRole("button", { name: "A day off", exact: true }).click();
    await expect(card.getByRole("button", { name: "A day off", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
    );
    await expect(card.getByLabel("Reason")).toBeVisible();
    await expect(card.getByLabel("Until")).toHaveCount(0);
    await card.getByRole("button", { name: "A family day", exact: true }).click();
    await expect(card.getByLabel("Reason")).toHaveCount(0);
    await expect(card.getByLabel("What it was")).toBeVisible();
    expect(await smallTargets(card)).toEqual([]);
    // the keyboard came in on the first choice, not on the X, and goes back to the heading that
    // opened the card when it closes
    await card.getByRole("button", { name: "Close" }).click();
    await expect(card).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^More for / }).first()).toBeFocused();

    // a sticker opens its lesson's card: the picture beside the title, Open the lesson where the
    // eye and the keyboard land, one choice of change, and Escape gives the sticker the keyboard back
    const sticker = page.locator(".gc-sticker-in").first();
    await sticker.click();
    await expect(card.getByRole("button", { name: "Open the lesson" })).toBeFocused();
    await expect(card.getByRole("button", { name: "Do it again" })).toBeVisible();
    const how = card.getByRole("combobox", { name: "How", exact: true });
    await expect(how).toHaveCount(0);
    await card.getByRole("button", { name: "Do it again" }).click();
    await expect(how).toBeVisible();
    await expect(card.getByRole("button", { name: /^Put it on / })).toBeVisible();
    expect(await smallTargets(card)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);
    await expect(sticker).toBeFocused();

    // the month and the year are for reading, and each says what it holds
    await page.getByRole("button", { name: "The month", exact: true }).click();
    await expect(page.getByRole("heading", { name: /^[A-Z][a-z]+ \d{4}$/ })).toBeVisible();
    await page.getByRole("button", { name: "The year", exact: true }).click();
    await expect(page.getByRole("heading", { name: "The school year" })).toBeVisible();
    await expect(page.locator(".gc-sheet")).toContainText(/days done|Nothing planned this term/);
    expect(await smallTargets(page.locator(".gc"))).toEqual([]);
});

test("a change of pace on the plan writes one plan event and the page says what it did, a subject not planned starts at once a week, and the school days and the terms open the calendar's cards", async ({
    page,
}) => {
    await signInAs(page);
    const written: unknown[] = [];
    await page.route("**/api/events", async (r) => {
        if (r.request().method() !== "POST") return r.continue();
        written.push(r.request().postDataJSON());
        await r.fulfill({ status: 200, json: { events: [] } });
    });
    await page.goto("/plan");
    await atScreen(page, page.getByRole("heading", { name: "Change the plan", exact: true }));
    // one sheet per child, each an article named for the child
    const sheets = page.locator(".gp-sheet");
    await expect(sheets).toHaveCount(3);
    await expect(page.getByRole("article", { name: "Rosie" })).toBeVisible();

    // the first subject's pace that is not the one it is on
    const pace = page
        .locator(".gp-scale button[aria-pressed='false'][aria-label$=', twice a week']")
        .first();
    const label = (await pace.getAttribute("aria-label")) ?? "";
    await pace.click();
    await expect(page.locator(".say").first()).toContainText(/week|Nothing/);
    // the page reads the plan back from the log, and this case keeps the demo family's log as it
    // is, so what the scale shows afterwards is the plan as it stands rather than the press

    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
        events: [
            expect.objectContaining({
                kind: "plan-changed",
                data: { op: expect.objectContaining({ op: "track", on: true, perWeek: 2 }) },
            }),
        ],
    });
    expect(label).toMatch(/twice a week$/);
    // the line said offers to put the change back, and the child's week
    await expect(page.getByRole("button", { name: "Put it back" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^See .+'s week$/ })).toBeVisible();

    // a subject not planned this year starts at once a week with one press
    const chip = page.locator(".gp-chip").first();
    const chipLabel = (await chip.getAttribute("aria-label")) ?? "";
    await chip.click();
    await expect(page.locator(".say").first()).toContainText("once a week");
    expect(written).toHaveLength(2);
    expect(written[1]).toMatchObject({
        events: [
            expect.objectContaining({
                kind: "plan-changed",
                data: { op: expect.objectContaining({ op: "track", on: true, perWeek: 1 }) },
            }),
        ],
    });
    expect(chipLabel).toMatch(/^Start .+, once a week$/);

    // the school days open the calendar's card over the sheet, and Close gives the link the keyboard back
    const days = page
        .getByRole("article", { name: "Rosie" })
        .getByRole("button", { name: /school days/ });
    await days.click();
    const dialog = page.locator("dialog.dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Rosie's school days" })).toBeVisible();
    // the card lifts as it opens (dialog.css, 240 ms), so its targets are measured once it has landed
    await dialog.evaluate((el) =>
        Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)),
    );
    expect(await smallTargets(dialog)).toEqual([]);
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(days).toBeFocused();

    // and the terms open theirs
    await page.getByRole("button", { name: "Change the dates" }).click();
    await expect(dialog.getByRole("heading", { name: "When the terms fall" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    expect(await smallTargets(page.locator(".gp"))).toEqual([]);
    await page.unroute("**/api/events");
});

test("a child's journal opens inside their card, says how a sheet went, and closes again", async ({
    page,
}) => {
    await signInAs(page);
    const rosie = page
        .getByRole("region", { name: "Children", exact: true })
        .getByRole("article", { name: "Rosie" });
    await rosie.getByRole("button", { name: /^Open Rosie's journal/ }).click();
    const sheets = rosie.locator(".gj-sheet");
    await expect(sheets.first()).toBeVisible({ timeout: 30000 });
    expect(await sheets.count()).toBeGreaterThan(1);

    // The journal opens on today, and a sheet that came back is further up the roll, so the roll is
    // dragged until one is inside the journal's own box, as a grown-up would drag it. How far up it
    // stands moves with the calendar: the journal's window is last week and today, so the days that
    // came back are at a different distance on a Monday from the Sunday before, and a failure here
    // that follows a change of day is that distance, not the journal. So the pull goes on until a
    // day that came back is inside the window or the paper no longer moves under the hand, which
    // is the roll's end, and the count is only a guard against a roll that moves for ever.
    const world = rosie.locator(".gj-world");
    const paper = world.locator(".wd-host .world");
    const camera = (): Promise<string> => paper.evaluate((el) => el.style.transform);
    const acts = rosie.getByRole("button", { name: /^How .+ went$/ });
    expect(await acts.count(), "no day that came back is on the roll").toBeGreaterThan(0);
    // How far the first day that came back stands from the middle of the window, on the screen:
    // above it when negative.
    const distance = async (): Promise<number | null> => {
        const frame = await world.boundingBox();
        if (!frame) return null;
        for (let k = 0; k < (await acts.count()); k++) {
            const box = await acts.nth(k).boundingBox();
            if (box) return box.y + box.height / 2 - (frame.y + frame.height / 2);
        }
        return null;
    };
    // A short pull each time, toward wherever the day that came back is: the roll lays out again
    // round a card as its paper lands, so a day that was above the window can end up below it, and a
    // pull that is always the same way would walk past it. Short, and shorter on a small window:
    // the roll moves about two and a half times what the hand does and glides on after it, so a
    // long pull carries a card past the window between one look and the next.
    const guard = 200;
    let reachable: Locator | null = null;
    let left: number | null = null;
    let moved = true;
    for (let pulls = 0; pulls < guard && moved; pulls++) {
        reachable = await inView(acts, world);
        if (reachable) break;
        const frame = await world.boundingBox();
        left = await distance();
        if (!frame || left === null) break;
        const step = Math.max(20, Math.min(40, Math.round(frame.height / 12)));
        const before = await camera();
        await dragRoll(page, world, left < 0 ? step : -step);
        // the glide after the hand lifts, before the paper is read as stopped
        await page.waitForTimeout(350);
        moved = (await camera()) !== before;
    }
    expect(
        reachable,
        `no sheet that came back could be dragged into the journal: the nearest was still ${Math.round(Math.abs(left ?? 0))} px ` +
            `${(left ?? 0) < 0 ? "above" : "below"} the middle of the window, and the paper ` +
            (moved ? `was still moving after ${guard} pulls` : "had stopped moving under the hand"),
    ).not.toBeNull();
    await reachable?.scrollIntoViewIfNeeded();
    await reachable?.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".gm-tally")).toContainText(/\d+ of \d+ right first time/);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    await rosie.getByRole("button", { name: /^Close Rosie's journal/ }).click();
    await expect(sheets).toHaveCount(0);
});

test("a grown-up prints the whole day in one go, and only the children's sheets are recorded", async ({
    page,
    request,
}, info) => {
    // This needs a day with more than one lesson on it, since the day is printed as one set of
    // sheets and the count is what is held. The Harlows' plan keeps the default week, Monday to
    // Friday, so on them this would fail every weekend; the family here has today as its one
    // school day, with two lessons on it, whichever day of the week the case runs on.
    //
    // the printer is not asked for anything here, only counted, and the count is kept on the page
    // itself so that reading it needs nothing of the window but what the DOM already declares
    await page.addInitScript(() => {
        // the document itself is not there yet when this runs, so the count is written on the first
        // print rather than set up here, and no count on the page means nothing has printed
        let count = 0;
        window.print = (): void => {
            count += 1;
            document.documentElement.dataset.prints = String(count);
        };
    });
    const prints = async (): Promise<number> =>
        Number((await page.locator("html").getAttribute("data-prints")) ?? 0);
    await familyWithToday(page, request, info);
    await page.goto("/");
    await atScreen(page, page.getByRole("heading", { name: "Hello, Sam" }));
    const written: unknown[] = [];
    await page.route("**/api/events", async (r) => {
        if (r.request().method() !== "POST") return r.continue();
        written.push(r.request().postDataJSON());
        await r.fulfill({ status: 200, json: { events: [] } });
    });

    await page.getByRole("link", { name: "Print the day" }).click();
    await atScreen(page, page.getByRole("heading", { name: "Print the day" }));
    const sheets = page.locator(".gd-sheet");
    await expect(sheets.first().locator(".ls-sheet")).toBeVisible({ timeout: 60000 });
    const all = await sheets.count();
    expect(all).toBeGreaterThan(1);
    await expect(page.locator(".gd-line")).toContainText(`${all} sheets`);

    // the children's sheets print with nothing filled in, and each is recorded as printed
    await page.getByRole("button", { name: "Print the children's sheets" }).click();
    await expect(page.locator(".gd .say").first()).toContainText(`${all} sheets`);
    // the sheets are drawn a frame after the page has them, so the printer is asked a moment later
    await expect.poll(prints).toBe(1);
    await expect(page.locator(".gd-sheets")).toHaveAttribute("data-key", "no");
    expect(written).toHaveLength(1);
    const body = written[0];
    const events =
        typeof body === "object" && body !== null && "events" in body && Array.isArray(body.events)
            ? body.events
            : [];
    expect(events).toHaveLength(all);
    for (const e of events)
        expect(e).toMatchObject({
            kind: "sheet-printed",
            data: expect.objectContaining({ grownUps: false }),
        });

    // the grown-up's own copies carry the answers and are recorded nowhere
    await page.getByRole("button", { name: "Print my copies" }).click();
    await expect(page.locator(".gd-sheets")).toHaveAttribute("data-key", "yes");
    await expect.poll(prints).toBe(2);
    expect(written).toHaveLength(1);

    expect(await smallTargets(page.locator(".gd"))).toEqual([]);
    await page.unroute("**/api/events");
});

test("a grown-up reads a past day in the journal: the day's own paper with the answers the child gave, read-only, and nothing of the child's own route", async ({
    page,
}) => {
    // every request to a child's own route, which a grown-up's page must never make: the journal
    // reads the same log through /api/events (tools/scripts/check-kids-build.ts holds the other way)
    const kidCalls: string[] = [];
    page.on("request", (r) => {
        if (r.url().includes("/api/kid/")) kidCalls.push(new URL(r.url()).pathname);
    });
    await signInAs(page);
    const rosie = page
        .getByRole("region", { name: "Children", exact: true })
        .getByRole("article", { name: "Rosie" });
    await rosie.getByRole("button", { name: /^Open Rosie's journal/ }).click();
    const world = rosie.locator(".gj-world");
    await expect(rosie.locator(".gj-sheet").first()).toBeVisible({ timeout: 30_000 });
    // A day that is done is up the roll from today, and its paper is drawn as the roll rests near
    // it. How far up it stands moves with the calendar, since the journal's window is last week and
    // today, so the roll is pulled toward the nearest done day until some day's paper has landed or
    // the paper no longer moves under the hand, and the count is only a guard.
    const paper = world.locator(".ls-sheet");
    const done = rosie
        .locator(".gj-sheet")
        .filter({ hasNot: page.locator(".j-strip .date", { hasText: /^(Today|Next)$/ }) });
    expect(await done.count(), "no done day is on the roll").toBeGreaterThan(0);
    const camera = (): Promise<string> =>
        world.locator(".wd-host .world").evaluate((el) => el.style.transform);
    const distance = async (): Promise<number | null> => {
        const frame = await world.boundingBox();
        if (!frame) return null;
        let nearest: number | null = null;
        for (let k = 0; k < (await done.count()); k++) {
            const box = await done.nth(k).boundingBox();
            if (!box) continue;
            const d = box.y + box.height / 2 - (frame.y + frame.height / 2);
            if (nearest === null || Math.abs(d) < Math.abs(nearest)) nearest = d;
        }
        return nearest;
    };
    const guard = 200;
    let left: number | null = null;
    let moved = true;
    for (let pulls = 0; pulls < guard && moved && (await paper.count()) === 0; pulls++) {
        const frame = await world.boundingBox();
        left = await distance();
        if (!frame || left === null) break;
        const step = Math.max(20, Math.min(60, Math.round(frame.height / 8)));
        const before = await camera();
        await dragRoll(page, world, left < 0 ? step : -step);
        await page.waitForTimeout(350);
        moved = (await camera()) !== before;
    }
    expect(
        await paper.count(),
        `no day's paper was drawn as the journal came near it: the nearest done day was still ${Math.round(Math.abs(left ?? 0))} px ` +
            `${(left ?? 0) < 0 ? "above" : "below"} the middle of the window, and the paper ` +
            (moved ? `was still moving after ${guard} pulls` : "had stopped moving under the hand"),
    ).toBeGreaterThan(0);
    const drawn = await paper.evaluateAll((sheets) =>
        sheets.map((sheet) => ({
            lesson: sheet.getAttribute("data-lesson") ?? "",
            label: sheet.querySelector(".j-strip .label")?.textContent ?? "",
            date: sheet.querySelector(".j-strip .date")?.textContent ?? "",
            open: sheet.querySelectorAll(
                "input:not([disabled]), textarea:not([disabled]), .ls-go:not([disabled]), .ls-pick:not([disabled])",
            ).length,
            given: Array.from(sheet.querySelectorAll("input"))
                .map((box) => (box instanceof HTMLInputElement ? box.value : ""))
                .filter((v) => v !== "").length,
            ticks: sheet.querySelectorAll(".ls-q.done .ls-tick").length,
            handed: sheet.querySelectorAll('.ls-strip[data-state]:not([data-state=""])').length,
            note: sheet.querySelector(".ls-looked")?.textContent ?? "",
        })),
    );
    for (const sheet of drawn) {
        expect(sheet.open, `${sheet.lesson} lets a grown-up answer it`).toBe(0);
        // the corner carries the subject and the day, so the card needs no second strip over it
        expect(sheet.label, `${sheet.lesson} has no subject in its corner`).not.toBe("");
        expect(sheet.date, `${sheet.lesson} has no day in its corner`).not.toBe("");
        if (sheet.note) continue;
        expect(
            sheet.given + sheet.ticks + sheet.handed,
            `${sheet.lesson} shows nothing the child did and says nothing about why`,
        ).toBeGreaterThan(0);
    }
    // the card the paper went into is the one that carries how it went, so a grown-up reads the work
    // and what came of it together
    const card = rosie.locator(".gj-sheet.gj-read").first();
    expect(await card.locator(".ls-sheet").count()).toBe(1);
    // and every question on it shows its words or its picture, not only its box
    for (const sheet of await paper.all()) {
        const lesson = await sheet.getAttribute("data-lesson");
        expect(await blankQuestions(sheet), `${lesson} has questions with nothing on them`).toEqual(
            [],
        );
    }
    expect(kidCalls, "the journal asked for something on the child's own route").toEqual([]);
});

test("the journal keeps only the paper near the grown-up drawn, and the day being read stays where it was as paper lands", async ({
    page,
}) => {
    await signInAs(page);
    const rosie = page
        .getByRole("region", { name: "Children", exact: true })
        .getByRole("article", { name: "Rosie" });
    await rosie.getByRole("button", { name: /^Open Rosie's journal/ }).click();
    const world = rosie.locator(".gj-world");
    const cards = rosie.locator(".gj-sheet");
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
    /**
     * What the journal holds now: the paper drawn, and the cards the roll counts as near, which is
     * its own band and not a guess: `Math.max(vp.h, 700) * 2` in world units either side of what the
     * window shows (engine/ui/world.tsx, lookBackNear), which on screen is that band times the zoom.
     */
    const held = (): Promise<{ paper: number; near: number; cards: number }> =>
        page.evaluate(() => {
            const host = document.querySelector(".gj-world .wd-host");
            const world = document.querySelector(".gj-world .j-world");
            const frame = host?.getBoundingClientRect();
            const zoom = world
                ? new DOMMatrixReadOnly(getComputedStyle(world).transform).a || 1
                : 1;
            const band = frame ? Math.max(frame.height, 700 * zoom) * 2 : 0;
            const all = [...document.querySelectorAll(".gj-sheet")];
            const near = frame
                ? all.filter((c) => {
                      const r = c.getBoundingClientRect();
                      return (
                          r.width > 0 && r.bottom > frame.top - band && r.top < frame.bottom + band
                      );
                  }).length
                : 0;
            return {
                paper: document.querySelectorAll(".gj-sheet .ls-sheet").length,
                near,
                cards: all.length,
            };
        });
    await expect.poll(async () => (await held()).paper, { timeout: 30_000 }).toBeGreaterThan(0);
    // the day being read stays where it was when paper lands under it: the roll lays out again round
    // what it measured, keeping the day under the camera where it is (engine/ui/world.tsx)
    const midway = async (): Promise<{ lesson: string; y: number } | null> =>
        page.evaluate(() => {
            const host = document.querySelector(".gj-world .wd-host");
            const frame = host?.getBoundingClientRect();
            if (!frame) return null;
            const mid = frame.top + frame.height / 2;
            let best: { lesson: string; y: number } | null = null;
            for (const c of document.querySelectorAll(".gj-sheet")) {
                const r = c.getBoundingClientRect();
                if (!r.width) continue;
                const d = Math.abs(r.top + r.height / 2 - mid);
                if (!best || d < Math.abs(best.y - mid)) {
                    best = { lesson: c.getAttribute("data-lesson") ?? "", y: r.top + r.height / 2 };
                }
            }
            return best;
        });
    const was = await midway();
    expect(was, "no card is in the journal's window").not.toBeNull();
    const before = (await held()).paper;
    for (let pulls = 0; pulls < 24 && (await held()).paper <= before; pulls++) {
        await dragRoll(page, world, 60);
        await page.waitForTimeout(250);
    }
    const now = await midway();
    if (was && now && was.lesson === now.lesson)
        expect(
            Math.abs(now.y - was.y),
            "the day being read moved as paper landed under it",
        ).toBeLessThan(140);
    // a whole term pulled through the journal keeps no more paper alive than the window can reach.
    // The roll names what is near when it comes to rest, so the count is read until it holds rather
    // than the moment the hand lets go, when a day just left behind is still drawn.
    for (let pulls = 0; pulls < 20; pulls++) await dragRoll(page, world, 80);
    await expect
        .poll(
            async () => {
                const now = await held();
                return now.paper <= now.near
                    ? "no more paper than the journal can reach"
                    : `${now.paper} days' paper alive, ${now.near} of ${now.cards} cards near`;
            },
            { timeout: 20_000 },
        )
        .toBe("no more paper than the journal can reach");
});
