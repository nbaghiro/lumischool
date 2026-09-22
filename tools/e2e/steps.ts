import { randomUUID } from "node:crypto";
import { cleanup } from "./ready";
import { NOTICE_VERSION } from "../../school/family/privacy";
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

const addresses = new Set<string>();

export function address(what: string, info: TestInfo): string {
    const email = `e2e-${what}-${info.project.name}-${randomUUID()}@example.com`;
    addresses.add(email);
    return email;
}

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
        try {
            await use(await withoutHotUpdates(context));
        } finally {
            cleanup([...addresses]);
            addresses.clear();
        }
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

export const FAMILY_PIN = "2468";

/** A fresh family created through signup, on a page unaffected by the case's route mocks. */
export async function signInAs(page: Page): Promise<void> {
    const own = await page.context().newPage();
    try {
        await signInHere(own);
    } finally {
        await own.close();
    }
    await page.goto("/");
    await atScreen(page, page.getByRole("heading", { name: "Hello, Test Parent" }));
}

export async function signInHere(page: Page): Promise<void> {
    const email = address("family", test.info());
    await askForCode(page, email, { name: "Test Parent", family: "Test Family" });
    await typeCode(page, page.context().request, email);
    await atScreen(page, page.getByRole("heading", { name: "Hello, Test Parent" }));
    for (const name of ["Rosie", "Leo", "Ivy"]) {
        const added = await page.context().request.post("/api/kids", {
            headers: { Origin: BASE },
            data: { name, grade: 1, consent: { notice: NOTICE_VERSION } },
        });
        expect(added.ok(), await added.text()).toBe(true);
    }
    const pin = await page.context().request.post("/api/family/pin", {
        headers: { Origin: BASE },
        data: { pin: FAMILY_PIN },
    });
    expect(pin.ok(), await pin.text()).toBe(true);
    // Refresh the family's data without reloading the modules whose identity some cases check.
    await page
        .getByRole("navigation", { name: "The grown-ups' places" })
        .getByRole("link", { name: "Calendar" })
        .click();
    await page
        .getByRole("navigation", { name: "The grown-ups' places" })
        .getByRole("link", { name: "Home" })
        .click();
    await expect(page.getByRole("button", { name: "Open Rosie's view" })).toBeVisible();
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

/** Presses and holds, as a grown-up holds the tab in a child's corner. */
async function hold(page: Page, target: Locator, ms: number): Promise<void> {
    const box = await target.boundingBox();
    if (!box) throw new Error("there is nothing on the page to hold");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
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
