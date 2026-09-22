// The site and the grown-ups' app handing over to each other on the one origin (.docs/auth.md,
// "Hosts"): a visitor with no session finds the site at `/`, and its Sign in reaches the sign-in page,
// whose logo leads back to the site; a parent who signs in finds the family's page at `/`, the site at
// `/home` from its logo, and one way back in the site's bar; signing out lands on the sign-in page, and
// `/` is the site again. Then the day section, which is a still picture of the sample child's day that
// a reader scrolls past, and which asks the API nothing.

import { expect, type Locator, type Page } from "@playwright/test";
import { BASE, signInAs, signOut, test } from "./steps";

/** The site's headline, which no other page has. */
async function onSite(page: Page): Promise<void> {
    await expect(
        page.getByRole("heading", { level: 1, name: "School at home, one world at a time" }),
    ).toBeVisible();
}

test("a visitor with no session sees the site at /, and its Sign in reaches the sign-in page", async ({
    page,
}) => {
    await page.goto("/");
    await onSite(page);
    await page.getByRole("banner").getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(`${BASE}/sign-in`);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("the logo on the sign-in page leads back to the site at /home", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "lumischool site" }).click();
    await expect(page).toHaveURL(`${BASE}/home`);
    await onSite(page);
});

test("a parent who signs in finds the family's page at /, the site from its logo and the way back in the site's bar, and signs out", async ({
    page,
}) => {
    await signInAs(page);
    await expect(page).toHaveURL(`${BASE}/`);
    const family = page.getByRole("heading", { name: "Hello, Test Parent" });

    await page.getByRole("link", { name: "lumischool site" }).click();
    await expect(page).toHaveURL(`${BASE}/home`);
    await onSite(page);
    const bar = page.getByRole("banner");
    const back = bar.getByRole("link", { name: "Open your family's page" });
    await expect(back).toBeVisible();
    await expect(bar.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);

    await back.click();
    await expect(page).toHaveURL(`${BASE}/`);
    await expect(family).toBeVisible();

    await signOut(page);
    await page.goto("/");
    await onSite(page);
});

/**
 * How the day's picture stands: how far today's sheet's middle is from the section's, how much world
 * the frame holds on the narrower side of the sheet, what the frame's edges cut through, and whether
 * the middle of the section's heading is the heading's own rather than something laid over it.
 */
async function picture(page: Page): Promise<{
    off: number;
    band: number;
    cut: string[];
    headingIsOwn: boolean;
}> {
    const read = await page.evaluate(() => {
        const sec = document.querySelector("#day");
        const frame = sec?.querySelector(".site-roll");
        const head = sec?.querySelector(".site-head h2");
        if (!sec || !frame || !head) return null;
        const f = frame.getBoundingClientRect();
        const area = (r: DOMRect): number =>
            Math.max(0, Math.min(r.right, f.right) - Math.max(r.left, f.left)) *
            Math.max(0, Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top));
        const sheet = [...frame.querySelectorAll(".wd-sheets > *")]
            .map((el) => el.getBoundingClientRect())
            .sort((a, b) => area(b) - area(a))[0];
        if (!sheet) return null;
        const s = sec.getBoundingClientRect();
        // the frame's foot fades out, so what only stands down there is not framed by its edges
        const foot = f.bottom - 0.14 * f.height;
        const cut = [...frame.querySelectorAll(".l-art > *, .l-flags > *, .l-over > *")]
            .filter((el) => {
                const d = el.getBoundingClientRect();
                if (d.width < 2 || d.height < 2) return false;
                const shown =
                    d.right > f.left && d.left < f.right && d.bottom > f.top && d.top < foot;
                return shown && (d.left < f.left - 1 || d.right > f.right + 1 || d.top < f.top - 1);
            })
            .map((el) => (typeof el.className === "string" ? el.className : "a drawing"));
        const r = head.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return {
            off: (sheet.left + sheet.right) / 2 - (s.left + s.right) / 2,
            band: Math.min(sheet.left - f.left, f.right - sheet.right),
            cut,
            headingIsOwn: top !== null && (top === head || head.contains(top)),
        };
    });
    if (!read) throw new Error("the day section has no picture with a sheet in it");
    return read;
}

/** Scrolls the page by the wheel, and by a finger where the case's device has one, with the pointer over `over`. */
async function scrollOver(page: Page, over: Locator): Promise<void> {
    const box = await over.boundingBox();
    if (!box) throw new Error("the picture is not on the page");
    const x = Math.round(box.x + box.width / 2);
    const y = Math.round(box.y + Math.min(box.height, page.viewportSize()?.height ?? 800) / 2);
    const scrolled = async (from: number): Promise<void> => {
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(from + 150);
    };
    const byWheel = await page.evaluate(() => window.scrollY);
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, 300);
    await scrolled(byWheel);
    if (!test.info().project.use.hasTouch) return;
    const byFinger = await page.evaluate(() => window.scrollY);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.synthesizeScrollGesture", {
        x,
        y,
        yDistance: -300,
        gestureSourceType: "touch",
        speed: 900,
        preventFling: true,
    });
    await scrolled(byFinger);
    await cdp.detach();
}

test("the day section is a still picture of a day, with the sheet in the middle and the page scrolling over it", async ({
    page,
}) => {
    const asked: string[] = [];
    page.on("request", (r) => {
        const { pathname } = new URL(r.url());
        if (pathname.startsWith("/api/")) asked.push(pathname);
    });
    await page.goto("/");
    await onSite(page);
    await page.locator("#day").evaluate((el) => el.scrollIntoView({ block: "start" }));
    await expect(
        page.getByRole("heading", { name: "Each day's lesson sits on the path" }),
    ).toBeVisible();

    // the picture reads the corpus in the browser, which takes a moment on the dev server
    const frame = page.locator("#day .site-roll");
    await expect(frame.locator(".wd.ready")).toBeAttached({ timeout: 90_000 });
    await expect(frame.locator(".wd-sheets > *").first()).toBeAttached();
    await page.locator("#day").evaluate((el) => el.scrollIntoView({ block: "start" }));
    await expect.poll(async () => (await picture(page)).band).toBeGreaterThan(8);

    // a picture, not a canvas to drive: nothing drawn in it to press, and the roll's own heading and
    // the world's name are not drawn either
    await expect(frame.locator("button:visible")).toHaveCount(0);
    await expect(frame.locator(".wd-where")).toBeHidden();
    const heading = await frame.locator("h1").boundingBox();
    expect(heading?.width ?? 0).toBeLessThanOrEqual(1);

    const stands = await picture(page);
    expect(
        Math.abs(stands.off),
        "today's sheet is in the middle of the section",
    ).toBeLessThanOrEqual(3);
    expect(stands.cut, "no drawing is cut by the frame's edges").toEqual([]);
    expect(stands.headingIsOwn, "nothing is laid over the section's heading").toBe(true);

    await scrollOver(page, frame);
    expect(asked, "a signed-out page asks the API nothing").toEqual([]);
});
