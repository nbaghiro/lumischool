import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { closeApp, open } from "../db/client";
import { prepare, truncate } from "../db/__tests__/test-db";
import { addKid, at, Browser, codeFor, local, sessionInto, startFamily, text } from "./browser";

const reason = await prepare();
const owner = reason === null ? open() : null;
after(async () => {
    await closeApp();
    await owner?.close();
});

describe("kids’ username sign-in", { skip: reason ?? false }, () => {
    const { config, outbox } = local();
    let parent: Browser;
    let browser: Browser;
    let family: string;
    let user: string;
    let maya: string;
    let theo: string;
    beforeEach(async () => {
        if (!owner) throw new Error("no database");
        await truncate(owner);
        parent = new Browser(config);
        browser = new Browser(config);
        const made = await startFamily(parent, outbox, {
            email: "parent@example.test",
            name: "Parent",
            family: "Family",
        });
        family = made.family;
        user = made.user;
        maya = await addKid(parent, "Maya", 1);
        theo = await addKid(parent, "Theo", 2);
        assert.equal(
            (await parent.call("POST", "/api/family/pin", { body: { pin: "2468" } })).status,
            204,
        );
        assert.equal(
            (await parent.call("POST", "/api/kid-logins/pin", { body: { pin: "1357" } })).status,
            204,
        );
        for (const [kid, username] of [
            [maya, "maya-star"],
            [theo, "theo-moon"],
        ]) {
            assert.equal(
                (
                    await parent.call("POST", "/api/kid-logins", {
                        body: { kid, username },
                    })
                ).status,
                204,
            );
        }
    });
    const login = (username: string, pin = "1357") =>
        browser.call("POST", "/api/kid/sign-in", { body: { username, pin } });
    const token = async (username: string): Promise<string> => {
        const a = await login(username);
        assert.equal(a.status, 200, JSON.stringify(a.body));
        assert.equal(
            a.cookies.some((c) => c.startsWith("ls_kids=")),
            false,
        );
        return text(at(a.body, "credential"));
    };

    it("keeps two tabs independent, never falls back from a bad tab token to a cookie, and signs out only one", async () => {
        const one = await token("  MAYA-STAR ");
        const two = await token("theo-moon");
        const [a, b] = await Promise.all([
            browser.call("GET", "/api/kid", { kid: one }),
            browser.call("GET", "/api/kid", { kid: two }),
        ]);
        assert.equal(at(a.body, "kids", 0, "id"), maya);
        assert.equal(at(b.body, "kids", 0, "id"), theo);
        assert.deepEqual(at(a.body, "others"), []);
        assert.equal(at(a.body, "pin"), false);
        assert.equal(
            (await browser.call("GET", `/api/kid/${theo}/state`, { kid: one })).status,
            404,
        );
        assert.equal((await browser.call("GET", "/api/me", { kid: one })).status, 403);
        assert.equal(
            (await browser.call("POST", "/api/kid/leave", { kid: one, body: { pin: "2468" } }))
                .status,
            403,
        );
        assert.equal(
            (
                await browser.call("POST", "/api/kid/add", {
                    kid: one,
                    body: { pin: "2468", kid: theo },
                })
            ).status,
            403,
        );
        browser.jar.set("ls_kids", two);
        const bad = await browser.call("GET", "/api/kid", { kid: "bad" });
        assert.equal(bad.status, 401);
        assert.deepEqual(bad.cookies, []);
        assert.equal((await browser.call("POST", "/api/kid/sign-out", { kid: one })).status, 204);
        assert.equal((await browser.call("GET", "/api/kid", { kid: one })).status, 401);
        assert.equal((await browser.call("GET", "/api/kid", { kid: two })).status, 200);
    });

    it("revokes only the edited child's logins, and revokes all username logins when the PIN changes", async () => {
        const one = await token("maya-star"),
            two = await token("theo-moon");
        assert.equal(
            (
                await parent.call("POST", "/api/kid-logins", {
                    body: { kid: maya, username: "maya-new" },
                })
            ).status,
            204,
        );
        assert.equal((await browser.call("GET", "/api/kid", { kid: one })).status, 401);
        assert.equal((await browser.call("GET", "/api/kid", { kid: two })).status, 200);
        assert.equal((await login("maya-star")).status, 400);
        assert.equal(
            (await parent.call("POST", "/api/kid-logins/pin", { body: { pin: "1358" } })).status,
            204,
        );
        assert.equal((await browser.call("GET", "/api/kid", { kid: two })).status, 401);
        assert.equal((await login("theo-moon")).status, 400);
        assert.equal((await login("theo-moon", "1358")).status, 200);
    });

    it("accepts a username even when an older row still has kidLogin false", async () => {
        if (!owner) throw new Error("no database");
        await owner.raw`update kids set settings = settings || '{"kidLogin": false}'::jsonb where id = ${maya}`;
        assert.equal((await token("maya-star")).length > 0, true);
        const listed = await parent.call("GET", "/api/kid-logins");
        assert.equal(at(listed.body, "kids", 0, "enabled"), undefined);
    });

    it("keeps the adult PIN separate, hides missing names, and limits concurrent guesses", async () => {
        assert.equal(
            (await parent.call("POST", "/api/kid-logins/pin", { body: { pin: "2468" } })).status,
            400,
        );
        assert.equal(
            (await parent.call("POST", "/api/family/pin", { body: { pin: "1357" } })).status,
            400,
        );
        assert.equal((await login("maya-star", "2468")).status, 400);
        assert.deepEqual(
            (await login("missing-kid")).body,
            (await login("maya-star", "0000")).body,
        );
        await Promise.all(Array.from({ length: 8 }, () => login("maya-star", "0000")));
        assert.equal((await login("maya-star")).status, 400);
        assert.equal(
            (await login("theo-moon")).status,
            400,
            "the shared PIN also limits guessing across siblings",
        );
    });

    it("enforces global case-insensitive usernames and fresh parent authentication", async () => {
        const other = new Browser(config, "203.0.113.9");
        await startFamily(other, outbox, {
            email: "other@example.test",
            name: "Other",
            family: "Other",
        });
        const kid = await addKid(other, "Maya", 1);
        const d = await other.call("GET", "/api/kid-logins");
        assert.equal(text(at(d.body, "kids", 0, "username")), "maya");
        assert.equal(at(d.body, "kids", 0, "enabled"), undefined);
        assert.equal(
            (
                await other.call("POST", "/api/kid-logins", {
                    body: { kid, username: "MAYA-STAR" },
                })
            ).status,
            400,
        );
        assert.equal(
            (
                await other.call("POST", "/api/kid-logins", {
                    body: { kid: maya, username: "stolen" },
                })
            ).status,
            404,
        );
        if (!owner) throw new Error("no database");
        await owner.raw`update keys set created_at = utc_iso(now() - interval '11 minutes') where kind = 'session' and family_id = ${family}`;
        assert.equal(
            (await parent.call("POST", "/api/kid-logins/pin", { body: { pin: "9999" } })).status,
            403,
        );
        await sessionInto(parent, family, user);
        assert.equal(
            (await parent.call("POST", "/api/kid-logins/pin", { body: { pin: "9999" } })).status,
            204,
        );
    });

    it("returns tab credentials for parent-opened views without overwriting a sibling's cookie", async () => {
        browser = parent;
        const sibling = await token("theo-moon");
        parent.jar.set("ls_kids", sibling);
        const opened = await parent.call("POST", "/api/kid-sessions", {
            body: { kids: [maya], tab: true },
        });
        assert.equal(opened.status, 200);
        assert.ok(opened.cookies.every((c) => c.startsWith("ls_browser=")));
        const own = text(at(opened.body, "credential"));
        assert.equal(
            at((await parent.call("GET", "/api/kid", { kid: own })).body, "kids", 0, "id"),
            maya,
        );
        assert.equal((await parent.call("GET", "/api/kid", { kid: sibling })).status, 200);
    });
    it("keeps parent and child tabs active in either sign-in order, including locked parent access", async () => {
        browser = parent;
        const one = await token("maya-star");
        const two = await token("theo-moon");
        assert.equal((await parent.call("GET", "/api/me")).status, 200);
        for (const credential of [one, two, "", "invalid"]) {
            assert.equal((await parent.call("GET", "/api/me", { kid: credential })).status, 403);
        }
        assert.equal((await parent.call("POST", "/api/auth/lock")).status, 204);
        assert.equal((await parent.call("GET", "/api/me")).status, 401);
        assert.equal((await parent.call("GET", "/api/kid", { kid: one })).status, 200);
        assert.equal(
            (await parent.call("POST", "/api/auth/unlock", { body: { pin: "1357" } })).status,
            403,
        );
        assert.equal(
            (await parent.call("POST", "/api/auth/unlock", { body: { pin: "2468" } })).status,
            204,
        );
        assert.equal((await parent.call("GET", "/api/me")).status, 200);
        assert.equal(
            (await parent.call("POST", "/api/kid-logins/pin", { body: { pin: "9999" } })).status,
            403,
            "PIN unlock is not fresh email verification",
        );
        assert.equal((await parent.call("POST", "/api/auth/sign-out")).status, 204);
        assert.equal((await parent.call("GET", "/api/kid", { kid: two })).status, 200);
        await parent.call("POST", "/api/auth/email/start", {
            body: { email: "parent@example.test" },
        });
        assert.equal(
            (
                await parent.call("POST", "/api/auth/email/verify", {
                    body: { code: codeFor(outbox, "parent@example.test") },
                    kid: one,
                })
            ).status,
            200,
        );
        assert.equal((await parent.call("GET", "/api/kid", { kid: one })).status, 200);
        assert.equal((await parent.call("GET", "/api/kid", { kid: two })).status, 200);
    });

    it("revokes this browser's bound sessions without affecting another browser", async () => {
        const other = await token("theo-moon");
        const otherBrowser = browser;
        browser = parent;
        const own = await token("maya-star");
        const copied = new Browser(config);
        assert.equal(
            (await copied.call("GET", "/api/kid", { kid: own })).status,
            401,
            "a tab credential alone cannot be moved to another browser",
        );
        const heldBrowser = parent.jar.get("ls_browser") ?? "";
        assert.equal((await parent.call("POST", "/api/auth/browser/sign-out")).status, 204);
        assert.equal((await parent.call("GET", "/api/kid", { kid: own })).status, 401);
        copied.jar.set("ls_browser", heldBrowser);
        assert.equal(
            (await copied.call("GET", "/api/kid", { kid: own })).status,
            401,
            "even the old cookie cannot revive a revoked browser key",
        );
        assert.equal((await otherBrowser.call("GET", "/api/kid", { kid: other })).status, 200);
        const observer = new Browser(config);
        await sessionInto(observer, family, user);
        const views = at((await observer.call("GET", "/api/kid-sessions")).body, "views");
        assert.ok(Array.isArray(views));
        assert.equal(views.length, 1, "revoked browser views disappear from the account list");
    });

    it("keeps simultaneous email challenges separate and never falls back from an invalid explicit challenge", async () => {
        const a = await parent.call("POST", "/api/auth/email/start", {
            body: { email: "parent@example.test", tab: true },
        });
        const codeA = codeFor(outbox, "parent@example.test");
        const b = await parent.call("POST", "/api/auth/email/start", {
            body: { email: "other@example.test", tab: true },
        });
        const codeB = codeFor(outbox, "other@example.test");
        assert.equal(a.cookies.length, 0);
        assert.equal(b.cookies.length, 0);
        assert.equal(
            (
                await parent.call("POST", "/api/auth/email/verify", {
                    challenge: "bad",
                    body: { code: codeA },
                })
            ).status,
            400,
        );
        assert.equal(
            (
                await parent.call("POST", "/api/auth/email/verify", {
                    challenge: text(at(a.body, "challenge")),
                    body: { code: codeA },
                })
            ).status,
            200,
        );
        assert.equal(
            (
                await parent.call("POST", "/api/auth/email/verify", {
                    challenge: text(at(b.body, "challenge")),
                    body: { code: codeB },
                })
            ).status,
            200,
        );
    });
    it("requires a fresh sign-in for old sessions without a browser binding", async () => {
        if (!owner) throw new Error("no database");
        const session = text(at((await parent.call("GET", "/api/me")).body, "session", "id"));
        await owner.raw`update keys set detail = detail - 'browser' where id = ${session}`;
        assert.equal((await parent.call("GET", "/api/me")).status, 401);
        assert.equal(at((await parent.call("GET", "/api/auth/status")).body, "available"), false);
    });
});
