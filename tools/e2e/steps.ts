// The steps the end-to-end cases share: a fresh address for each run, a code read from the local
// outbox, a seeded parent signed in with the fixed local code, a parent opening the children's view on
// a device and adding the other children to it with the PIN, and holding the grown-ups' tab.

import {
    expect,
    test as base,
    type APIRequestContext,
    type Browser,
    type BrowserContext,
    type BrowserContextOptions,
    type Locator,
    type Page,
    type TestInfo,
} from "@playwright/test";

/** The one origin the cases run against, which the config's `baseURL` is too. */
export const BASE = process.env.E2E_BASE ?? "http://localhost:8500";

/** A new address for each run and size, so no case meets the codes an earlier one asked for. */
export const address = (what: string, info: TestInfo): string =>
    `e2e-${what}-${info.project.name}-${Date.now().toString(36)}@example.com`;

/** The size and browser of this case's project. */
function device(info: TestInfo): BrowserContextOptions {
    const u = info.project.use;
    return {
        baseURL: u.baseURL ?? BASE,
        viewport: u.viewport,
        userAgent: u.userAgent,
        deviceScaleFactor: u.deviceScaleFactor,
        isMobile: u.isMobile,
        hasTouch: u.hasTouch,
    };
}

/**
 * Holds the dev server's hot-update socket open and silent, so a page runs the code it loaded, as a
 * built app does. Other files are saved while the cases run, and a hot update can leave an open page
 * on a stale or empty screen, since solid-refresh skips a lazy screen it cannot swap.
 */
async function withoutHotUpdates(context: BrowserContext): Promise<BrowserContext> {
    await context.routeWebSocket(
        (url) => url.pathname === "/" && url.searchParams.has("token"),
        () => undefined,
    );
    return context;
}

/** Playwright's `test`, with the case's own pages kept from hot updates. */
export const test = base.extend({
    context: async ({ context }, use) => {
        await use(await withoutHotUpdates(context));
    },
});

/** A second device for a case, such as one a child's view is open on, at the size of the case's project. */
export async function newDevice(browser: Browser, info: TestInfo): Promise<BrowserContext> {
    return withoutHotUpdates(await browser.newContext(device(info)));
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

/** The newest sign-in code the console transport printed for `email`, or null. */
export async function newestCode(
    request: APIRequestContext,
    email: string,
): Promise<string | null> {
    const body: unknown = await (await request.get("/api/dev/outbox")).json();
    const emails: unknown = isRecord(body) ? body.emails : null;
    if (!Array.isArray(emails)) return null;
    for (const e of emails as unknown[]) {
        if (!isRecord(e) || e.to !== email || typeof e.text !== "string") continue;
        const m = /code is (\d{4}) (\d{4})/.exec(e.text);
        return m ? `${m[1] ?? ""}${m[2] ?? ""}` : null;
    }
    return null;
}

/** The code sent to `email`, once one other than `not` has arrived in the local outbox. */
export async function codeFor(
    request: APIRequestContext,
    email: string,
    not: string | null = null,
): Promise<string> {
    let code: string | null = null;
    await expect
        .poll(async () => {
            code = await newestCode(request, email);
            return code !== null && code !== not;
        })
        .toBe(true);
    if (code === null) throw new Error(`no code for ${email}`);
    return code;
}

/** Asks for a code at `/sign-in`, or at `/start` with a new family's answers. */
export async function askForCode(
    page: Page,
    email: string,
    start?: { name: string; family: string },
): Promise<void> {
    await page.goto(start ? "/start" : "/sign-in");
    await page.getByLabel("Your email address").fill(email);
    if (start) {
        await page.getByLabel("Your name").fill(start.name);
        await page.getByLabel("Your family's name").fill(start.family);
    }
    await page.getByRole("button", { name: "Send me a code" }).click();
    await expect(page.getByRole("heading", { name: "Type the code" })).toBeVisible();
}

/** Types the code the outbox holds for `email`; the eighth digit sends it. */
export async function typeCode(
    page: Page,
    request: APIRequestContext,
    email: string,
    not: string | null = null,
): Promise<string> {
    const code = await codeFor(request, email, not);
    await page.getByLabel("The 8-digit code").fill(code);
    return code;
}

/** The seeded parents the cases sign in as, with the addresses `npm run db:demo` gives them. */
const PARENTS = {
    "Anna Harlow": "demo-parent1@lumischool.ai",
    "Ben Harlow": "demo-parent2@lumischool.ai",
} as const;

type Parent = keyof typeof PARENTS;

type Kept = Awaited<ReturnType<BrowserContext["storageState"]>>;

/** Each seeded parent's session once signed in, by project, so that a project signs each in once. */
const kept = new Map<string, Kept>();

/** The fixed code a local server accepts beside the emailed one (.docs/auth.md, flow 2). */
const FIXED_CODE = "12345678";

/** The seeded family's PIN (server/db/seed/demo-household.ts). */
export const FAMILY_PIN = "2468";

/**
 * Asks for a code for a seeded parent. A code asked for inside the last minute, by hand or by an
 * earlier case, holds the next one back for the rest of that minute, so this waits it out once.
 */
async function askAsSeeded(page: Page, email: string): Promise<void> {
    await page.goto("/sign-in");
    await page.getByLabel("Your email address").fill(email);
    const typing = page.getByRole("heading", { name: "Type the code" });
    const held = page.locator("main").getByText(/^Too many codes/);
    for (let waited = false; ; waited = true) {
        await page.getByRole("button", { name: "Send me a code" }).click();
        await expect(typing.or(held)).toBeVisible();
        if (await typing.isVisible()) return;
        if (waited) throw new Error(`a code for ${email} was still refused after a minute`);
        test.info().setTimeout(test.info().timeout + 70_000);
        await page.waitForTimeout(61_000);
    }
}

/**
 * Signs a seeded parent in as any parent signs in: the address, then the fixed local code typed on
 * the code step. The session is kept for the project's later cases and put into a case's browser
 * while it still works; a case that signs out or opens a children's view ends it, and the next case
 * signs in again. The sign-in runs on a page of its own, so a route a case set on its page does not
 * answer it.
 */
export async function signInAs(page: Page, who: Parent = "Anna Harlow"): Promise<void> {
    const context = page.context();
    const key = `${test.info().project.name} ${who}`;
    const hello = (p: Page): Locator => p.getByRole("heading", { name: `Hello, ${who}` });
    const own = await context.newPage();
    try {
        const state = kept.get(key);
        if (state) {
            await context.addCookies(state.cookies);
            if ((await context.request.get("/api/me")).ok()) {
                // the hint the grown-ups' client keeps beside the session, put back on the one origin
                await own.goto("/api/health");
                await own.evaluate(
                    (items) => {
                        for (const { name, value } of items)
                            try {
                                localStorage.setItem(name, value);
                            } catch {
                                // a browser that keeps nothing in storage signs in without the hint
                            }
                    },
                    state.origins.flatMap((o) => o.localStorage),
                );
            } else {
                await context.clearCookies();
                kept.delete(key);
            }
        }
        if (!kept.has(key)) {
            await signInHere(own, who);
            kept.set(key, await context.storageState());
        }
    } finally {
        await own.close();
    }
    await page.goto("/");
    await atScreen(page, hello(page));
}

/**
 * Signs a seeded parent in on this page at `/sign-in`, with the fixed local code, and waits for the
 * family's page, which the sign-in page opens without loading the page again. The session is not kept
 * for later cases.
 */
export async function signInHere(page: Page, who: Parent = "Anna Harlow"): Promise<void> {
    await askAsSeeded(page, PARENTS[who]);
    await page.getByLabel("The 8-digit code").fill(FIXED_CODE);
    await atScreen(page, page.getByRole("heading", { name: `Hello, ${who}` }));
}

/** The card a grown-ups' screen shows when its code did not load or failed as it drew. */
export const errorCard = (page: Page): Locator =>
    page.getByRole("heading", { name: "This page did not load" });

/**
 * Waits for a screen, and fails as soon as the page shows its error card instead, rather than
 * waiting the screen out or loading the page again past it.
 */
export async function atScreen(page: Page, screen: Locator, wait = 15_000): Promise<void> {
    await expect(screen.or(errorCard(page))).toBeVisible({ timeout: wait });
    await expect(errorCard(page), "the page showed its error card").toHaveCount(0);
    await expect(screen).toBeVisible();
}

/** Sign out in the menu under the grown-up's own stamp on the bar, opened if it is not open already. */
export async function signOutItem(page: Page): Promise<Locator> {
    const item = page.getByRole("menuitem", { name: "Sign out" });
    if (!(await item.isVisible()))
        await page.getByRole("button", { name: /: your account, and sign out$/ }).click();
    await expect(item).toBeVisible();
    return item;
}

/** Signs out, which loads the sign-in page afresh. */
export async function signOut(page: Page): Promise<void> {
    await (await signOutItem(page)).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
}

/**
 * From the family's page of a signed-in parent, opens the children's view on this device for the first
 * child named in one tap, and adds the rest from inside the view with the family's PIN, as a grown-up
 * does (.docs/auth.md, flows 5 and 6), and waits for the view.
 */
export async function openChildrensView(page: Page, names: readonly string[]): Promise<void> {
    const [first, ...more] = names;
    if (first === undefined) throw new Error("name at least one child");
    await page.getByRole("button", { name: `Open ${first}'s view` }).click();
    await expect(page).toHaveURL(/\/kids$/);
    await atScreen(page, childsMap(page, first));
    for (const name of more) {
        await holdGrownUps(page);
        await page.getByLabel("The family PIN").fill(FAMILY_PIN);
        await page.getByRole("button", { name: `Add ${name}` }).click();
        await atScreen(page, page.getByRole("heading", { name: "Who is learning today?" }));
    }
}

/** Holds the grown-ups' tab in the corner of the children's view until its card opens. */
export async function holdGrownUps(page: Page): Promise<void> {
    await hold(page, page.getByRole("button", { name: "Grown-ups: hold for two seconds" }), 2600);
    await expect(page.getByRole("heading", { name: "For grown-ups" })).toBeVisible();
}

/** A child's own page: their map, which the region on it is named for. */
export const childsMap = (page: Page, name: string): Locator =>
    page.getByRole("region", { name: `${name}'s map` });

/**
 * A child goes into the world they are in. There is no button for it: the place the map has its own
 * focus on, which is where the child stands, is the way in by a tap or by Enter, and pinching into it
 * does the same (.docs/journal.md). A child who has done nothing yet stands at their first world the
 * same way, so nothing here names a world.
 */
export async function goIntoWorld(map: Locator): Promise<void> {
    await map.locator('.ow-node[tabindex="0"]').click();
}

/**
 * Out of the roll and back to the map, a step at a time, as a child does it: Escape hands the roll to
 * the place the world is seen as, and Escape again hands the place back to the map. A world with no
 * day on it has no place to be seen as, so its roll hands straight back to the map.
 */
export async function outToMap(page: Page, map: Locator): Promise<void> {
    const place = page.locator(".pl");
    await page.locator(".wd-host").focus();
    await page.keyboard.press("Escape");
    await expect(place.or(map)).toHaveClass(/ready/, { timeout: 20_000 });
    if (await place.count()) {
        await page.locator(".pl-host").focus();
        await page.keyboard.press("Escape");
    }
    await expect(map).toHaveClass(/ready/, { timeout: 20_000 });
}

/** Presses and holds, as a grown-up holds the tab in a child's corner. */
async function hold(page: Page, target: Locator, ms: number): Promise<void> {
    const box = await target.boundingBox();
    if (!box) throw new Error("there is nothing on the page to hold");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
}

/**
 * What each question on a sheet shows, by its number: its words, or its picture at a size that can
 * be seen. A question that carries a scene draws its words inside the picture, so a picture with no
 * size is a question with nothing on it, and the boxes and buttons under it prove nothing.
 */
export async function questionsShown(
    sheet: Locator,
): Promise<{ n: string; words: boolean; picture: boolean }[]> {
    return sheet.locator(".ls-q").evaluateAll((qs) =>
        qs.map((q) => {
            const ask = q.querySelector(".ls-ask");
            const box = q.querySelector(".ls-scene svg")?.getBoundingClientRect();
            return {
                n: q.getAttribute("data-n") ?? "",
                words: !!ask && (ask.textContent ?? "").trim().length > 0,
                picture: !!box && box.width >= 16 && box.height >= 16,
            };
        }),
    );
}

/** The questions of `sheet` that show neither words nor a picture, which should be none. */
export async function blankQuestions(sheet: Locator): Promise<string[]> {
    return (await questionsShown(sheet))
        .filter((q) => q.n !== "0" && !q.words && !q.picture)
        .map((q) => q.n);
}

/** Every visible target in `scope` under 44 px a side, named with its size; a tick is measured by its label. */
export async function smallTargets(scope: Locator): Promise<string[]> {
    return scope
        .locator("a:visible, button:visible, input:visible, select:visible")
        .evaluateAll((els) =>
            els.flatMap((el) => {
                // a checkbox or a radio is pressed by its label, so the label is the target a
                // finger has, and the box the rule is about
                const tick =
                    el instanceof HTMLInputElement &&
                    (el.type === "checkbox" || el.type === "radio")
                        ? el.closest("label")
                        : null;
                const r = (tick ?? el).getBoundingClientRect();
                const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();
                return r.width < 44 || r.height < 44
                    ? [`${name || el.tagName} ${Math.round(r.width)}x${Math.round(r.height)}`]
                    : [];
            }),
        );
}
