import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { closeApp, open } from "../db/client";
import { prepare, truncate } from "../db/__tests__/test-db";
import { addKid, at, Browser, local, sessionInto, startFamily, text } from "./browser";

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
                        body: { kid, username, enabled: true },
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
        assert.equal((await browser.call("GET", "/api/me", { kid: one })).status, 401);
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
                    body: { kid: maya, username: "maya-new", enabled: false },
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

    it("enforces global case-insensitive usernames, explicit enablement, and fresh parent authentication", async () => {
        const other = new Browser(config, "203.0.113.9");
        await startFamily(other, outbox, {
            email: "other@example.test",
            name: "Other",
            family: "Other",
        });
        const kid = await addKid(other, "Maya", 1);
        const d = await other.call("GET", "/api/kid-logins");
        assert.match(text(at(d.body, "kids", 0, "username")), /^maya-/);
        assert.equal(at(d.body, "kids", 0, "enabled"), false);
        assert.equal(
            (
                await other.call("POST", "/api/kid-logins", {
                    body: { kid, username: "MAYA-STAR", enabled: false },
                })
            ).status,
            400,
        );
        assert.equal(
            (
                await other.call("POST", "/api/kid-logins", {
                    body: { kid: maya, username: "stolen", enabled: false },
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
        const sibling = await token("theo-moon");
        parent.jar.set("ls_kids", sibling);
        const opened = await parent.call("POST", "/api/kid-sessions", {
            body: { kids: [maya], tab: true },
        });
        assert.equal(opened.status, 200);
        assert.deepEqual(opened.cookies, []);
        const own = text(at(opened.body, "credential"));
        assert.equal(
            at((await parent.call("GET", "/api/kid", { kid: own })).body, "kids", 0, "id"),
            maya,
        );
        assert.equal((await parent.call("GET", "/api/kid", { kid: sibling })).status, 200);
    });
});
