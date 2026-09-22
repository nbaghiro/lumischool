// Sign-in by code, the session cookie, choosing and switching a family, and signing out, through the
// app function against the test database.

import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { closeApp, open, type Store } from "../db/client";
import { loginByAddress, sha256 } from "../db/keys";
import { keys, kids, members, users } from "../db/schema";
import { prepare, truncate } from "../db/__tests__/test-db";
import type { Config } from "../http";
import { at, Browser, codeFor, items, local, ORIGIN, startFamily, text } from "./browser";

const reason = await prepare();
const owner: Store | null = reason === null ? open() : null;

after(async () => {
    await closeApp();
    if (owner) await owner.close();
});

const db = (): Store => {
    if (!owner) throw new Error("no database");
    return owner;
};

/** A `Set-Cookie` line's attributes, after its name and value. */
const flags = (line: string): Set<string> =>
    new Set(
        line
            .split(";")
            .slice(1)
            .map((s) => s.trim()),
    );

const keyRow = async (id: string) => (await db().db.select().from(keys)).find((k) => k.id === id);

describe("signing in", { skip: reason ?? false }, () => {
    beforeEach(async () => truncate(db()));

    it("signs a person in by the code printed for them, and writes no login until the code comes back", async () => {
        const { config, outbox } = local();
        const b = new Browser(config);
        const email = "anna@example.test";
        const asked = await b.call("POST", "/api/auth/email/start", {
            body: {
                email: "  Anna@Example.test ",
                start: { name: "Anna", family: "Harlow", timeZone: "America/Denver" },
            },
        });
        assert.equal(asked.status, 202);
        assert.ok(b.jar.has("ls_pending"), "the pending cookie holds the code's place");
        assert.equal(await loginByAddress(email), null, "no login before the code comes back");
        assert.match(outbox.at(-1)?.subject ?? "", /Your lumischool code is \d{4} \d{4}/);

        const wrong = await b.call("POST", "/api/auth/email/verify", {
            body: { code: "00000000" },
        });
        assert.equal(wrong.status, 400);
        assert.deepEqual(wrong.body, { error: "wrong-code", attemptsLeft: 4 });

        const right = await b.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, email) },
        });
        assert.equal(right.status, 200);
        assert.equal(at(right.body, "me", "user", "email"), email, "stored trimmed and lowercased");
        assert.equal(at(right.body, "me", "family", "name"), "Harlow");
        assert.equal(
            at(right.body, "me", "members", 0, "kid_id"),
            null,
            "the first member is a parent",
        );
        assert.ok(await loginByAddress(email));
        assert.ok(!b.jar.has("ls_pending"), "the pending cookie is cleared");

        const log = await b.call("GET", "/api/events");
        const kinds = items(at(log.body, "events")).map((e) => at(e, "kind"));
        assert.deepEqual(kinds, ["member-added", "signed-in"]);

        const again = await b.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, email) },
        });
        assert.equal(again.status, 400, "a used code is gone");
    });

    it("answers the same for an address with a login and one without", async () => {
        const { config, outbox } = local();
        await startFamily(new Browser(config), outbox, {
            email: "known@example.test",
            name: "Known",
            family: "Known",
        });
        const known = await new Browser(config, "198.51.100.1").call(
            "POST",
            "/api/auth/email/start",
            {
                body: { email: "known@example.test" },
            },
        );
        const unknown = await new Browser(config, "198.51.100.2").call(
            "POST",
            "/api/auth/email/start",
            {
                body: { email: "nobody@example.test" },
            },
        );
        assert.equal(known.status, unknown.status);
        assert.deepEqual(known.body, unknown.body);
    });

    it("keeps the session in an HttpOnly cookie that names its family, and only the secret's hash in the database", async () => {
        const { config, outbox } = local();
        const b = new Browser(config);
        const email = "sam@example.test";
        const asked = await b.call("POST", "/api/auth/email/start", {
            body: { email, start: { name: "Sam", family: "Oakley", timeZone: "America/Denver" } },
        });
        const pending = asked.cookies.find((c) => c.startsWith("ls_pending=")) ?? "";
        assert.deepEqual(
            flags(pending),
            new Set(["Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=900"]),
        );
        const verified = await b.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, email) },
        });
        const session = verified.cookies.find((c) => c.startsWith("ls_session=")) ?? "";
        assert.deepEqual(
            flags(session),
            new Set(["Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=2592000"]),
            "thirty days, no Secure on a local server with no HTTPS, and no Domain",
        );
        assert.ok(verified.cookies.some((c) => /^ls_pending=;.*Max-Age=0/.test(c)));

        const set = b.jar.get("ls_session") ?? "";
        const [family, id, secret] = set.split(".");
        assert.equal(family, at(verified.body, "me", "family", "id"));
        assert.equal(id, at(verified.body, "me", "session", "id"));
        const row = await keyRow(id ?? "");
        assert.ok(row && secret);
        assert.equal(row.hash, sha256(secret));
        assert.notEqual(row.hash, secret);
        assert.equal(row.kind, "session");
    });

    it("names both cookies with the __Host- prefix and marks them Secure over HTTPS, and reads no cookie without the prefix", async () => {
        const { config, outbox } = local();
        const secure: Config = { ...config, secure: true };
        const b = new Browser(secure);
        const email = "sam@example.test";
        const asked = await b.call("POST", "/api/auth/email/start", {
            body: { email, start: { name: "Sam", family: "Oakley", timeZone: "America/Denver" } },
        });
        const pending = asked.cookies.find((c) => c.startsWith("__Host-ls_pending=")) ?? "";
        assert.deepEqual(
            flags(pending),
            new Set(["Path=/", "HttpOnly", "SameSite=Lax", "Secure", "Max-Age=900"]),
        );
        const verified = await b.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, email) },
        });
        assert.equal(verified.status, 200);
        const session = verified.cookies.find((c) => c.startsWith("__Host-ls_session=")) ?? "";
        assert.deepEqual(
            flags(session),
            new Set(["Path=/", "HttpOnly", "SameSite=Lax", "Secure", "Max-Age=2592000"]),
        );
        assert.ok(verified.cookies.some((c) => /^__Host-ls_pending=;.*Max-Age=0/.test(c)));
        assert.equal((await b.call("GET", "/api/me")).status, 200);

        const planted = new Browser(secure);
        planted.jar.set("ls_session", b.jar.get("__Host-ls_session") ?? "");
        const refused = await planted.call("GET", "/api/me");
        assert.equal(
            refused.status,
            401,
            "a live credential under the unprefixed name is not read",
        );
        assert.deepEqual(refused.cookies, []);
    });

    it("ends the session a browser held when the same person signs in again, and leaves another person's", async () => {
        const { config, outbox } = local();
        const b = new Browser(config);
        const email = "anna@example.test";
        await startFamily(b, outbox, { email, name: "Anna", family: "Harlow" });
        const first = b.jar.get("ls_session") ?? "";
        await b.call("POST", "/api/auth/email/start", { body: { email } });
        const again = await b.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, email) },
        });
        assert.equal(again.status, 200);
        const second = b.jar.get("ls_session") ?? "";
        assert.notEqual(second, first);
        const old = new Browser(config);
        old.jar.set("ls_session", first);
        assert.equal((await old.call("GET", "/api/me")).status, 401, "the first session is gone");
        const [sessions] = await db().raw<
            { n: number }[]
        >`select count(*)::int as n from keys where kind = 'session'`;
        assert.equal(sessions?.n, 1);

        const borrowed = new Browser(config, "198.51.100.30");
        borrowed.jar.set("ls_session", second);
        await startFamily(borrowed, outbox, {
            email: "ben@example.test",
            name: "Ben",
            family: "Oakley",
        });
        const anna = new Browser(config);
        anna.jar.set("ls_session", second);
        assert.equal(
            (await anna.call("GET", "/api/me")).status,
            200,
            "Ben signing in on this browser does not end Anna's session",
        );
    });

    it("asks a login in two families which one, makes the session in the one chosen, and switches without counting as a fresh sign-in", async () => {
        const { config, outbox } = local();
        const email = "kate@example.test";
        const first = await startFamily(new Browser(config), outbox, {
            email,
            name: "Kate",
            family: "Kate's",
        });
        const second = await startFamily(new Browser(config, "198.51.100.9"), outbox, {
            email,
            name: "Kate",
            family: "Riverside",
        });
        assert.notEqual(first.family, second.family);
        assert.equal(first.user, second.user, "one login across both families");

        const b = new Browser(config, "198.51.100.10");
        await b.call("POST", "/api/auth/email/start", { body: { email } });
        const verified = await b.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, email) },
        });
        const choices = items(at(verified.body, "choose")).map((c) => text(at(c, "name")));
        assert.deepEqual(
            choices.sort((x, y) => x.localeCompare(y)),
            ["Kate's", "Riverside"],
        );
        assert.ok(!b.jar.has("ls_session"), "no session until a family is chosen");

        const chosen = await b.call("POST", "/api/auth/email/choose", {
            body: { family_id: second.family },
        });
        assert.equal(chosen.status, 200);
        assert.equal(at(chosen.body, "me", "family", "id"), second.family);
        const created = at(chosen.body, "me", "session", "created_at");
        const inSecond = b.jar.get("ls_session") ?? "";

        const switched = await b.call("POST", "/api/auth/switch", {
            body: { family_id: first.family },
        });
        assert.equal(at(switched.body, "me", "family", "id"), first.family);
        assert.equal(at(switched.body, "me", "session", "created_at"), created);
        const me = await b.call("GET", "/api/me");
        assert.equal(at(me.body, "family", "id"), first.family);
        const before = new Browser(config);
        before.jar.set("ls_session", inSecond);
        assert.equal(
            (await before.call("GET", "/api/me")).status,
            401,
            "the switch ended the old key",
        );

        const stranger = await b.call("POST", "/api/auth/switch", {
            body: { family_id: "00000000-0000-4000-8000-000000000999" },
        });
        assert.equal(stranger.status, 404);

        const inFirst = b.jar.get("ls_session") ?? "";
        await b.call("POST", "/api/auth/email/start", { body: { email } });
        await b.call("POST", "/api/auth/email/verify", { body: { code: codeFor(outbox, email) } });
        const rechosen = await b.call("POST", "/api/auth/email/choose", {
            body: { family_id: second.family },
        });
        assert.equal(rechosen.status, 200);
        const held = new Browser(config);
        held.jar.set("ls_session", inFirst);
        assert.equal(
            (await held.call("GET", "/api/me")).status,
            401,
            "choosing after a new code ends the session this browser held in the other family",
        );
    });

    it("starts one login from two codes for a new address used at the same moment, and leaves no code", async () => {
        const { config, outbox } = local();
        const email = "nia@example.test";
        const start = { name: "Nia", family: "Mensah", timeZone: "America/Toronto" };
        const one = new Browser(config, "198.51.100.75");
        const two = new Browser(config, "198.51.100.76");
        await one.call("POST", "/api/auth/email/start", { body: { email, start } });
        const first = codeFor(outbox, email);
        await db()
            .raw`update keys set created_at = utc_iso(now() - interval '2 minutes') where email = ${email}`;
        assert.equal(
            (await two.call("POST", "/api/auth/email/start", { body: { email, start } })).status,
            202,
        );
        const second = codeFor(outbox, email);
        const [a, b] = await Promise.all([
            one.call("POST", "/api/auth/email/verify", { body: { code: first } }),
            two.call("POST", "/api/auth/email/verify", { body: { code: second } }),
        ]);
        assert.deepEqual([a.status, b.status], [200, 200], JSON.stringify([a.body, b.body]));
        assert.equal(at(a.body, "me", "user", "id"), at(b.body, "me", "user", "id"));
        assert.notEqual(at(a.body, "me", "family", "id"), at(b.body, "me", "family", "id"));
        assert.equal(
            (await db().db.select().from(users)).filter((u) => u.email === email).length,
            1,
        );
        assert.equal(
            (await db().db.select().from(keys)).filter((k) => k.email === email).length,
            0,
        );
    });

    it("keeps the code, and writes no login, when starting the family fails part way", async () => {
        const { config, outbox } = local();
        const lines: string[] = [];
        const b = new Browser({
            ...config,
            log: (line) => {
                lines.push(line);
            },
        });
        const email = "zoe@example.test";
        await b.call("POST", "/api/auth/email/start", {
            body: { email, start: { name: "Zoe", family: "Refused", timeZone: "Europe/London" } },
        });
        // A rule on this test database alone, so the family's insert fails after the code was used
        // and the login written, in the same transaction.
        await db()
            .raw`alter table families add constraint refused_for_the_test check (name <> 'Refused')`;
        try {
            const failed = await b.call("POST", "/api/auth/email/verify", {
                body: { code: codeFor(outbox, email) },
            });
            assert.equal(failed.status, 500);
        } finally {
            await db().raw`alter table families drop constraint refused_for_the_test`;
        }
        assert.equal(lines.length, 1);
        assert.equal(await loginByAddress(email), null, "no login without its family");
        assert.equal(
            (await db().db.select().from(keys)).filter((k) => k.email === email).length,
            1,
            "the code is still there",
        );
    });

    it("moves seen_at at most once a day for a session and once a minute for a shared one, and sends the cookie again when it moves", async () => {
        const { config, outbox } = local();
        const b = new Browser(config);
        const email = "ivy@example.test";
        const me = await startFamily(b, outbox, { email, name: "Ivy", family: "Harlow" });
        const renewed = (cookies: string[]): string | undefined =>
            cookies.find((c) => c.startsWith("ls_session=") && !/Max-Age=0\b/.test(c));
        const ageOf = (line: string | undefined): number =>
            Number(/Max-Age=(\d+)/.exec(line ?? "")?.[1]);

        const first = await b.call("GET", "/api/me");
        assert.equal(ageOf(renewed(first.cookies)), 30 * 24 * 3600, "the first use sets seen_at");
        const seen = (await keyRow(me.session))?.seen_at;
        assert.ok(seen);
        const next = await b.call("GET", "/api/me");
        assert.equal(renewed(next.cookies), undefined, "no second write the same day");
        assert.equal((await keyRow(me.session))?.seen_at, seen);

        await db()
            .raw`update keys set seen_at = utc_iso(now() - interval '2 days'), created_at = utc_iso(now() - interval '80 days') where id = ${me.session}`;
        const later = await b.call("GET", "/api/family");
        assert.equal(later.status, 200);
        const age = ageOf(renewed(later.cookies));
        assert.ok(
            Math.abs(age - 10 * 24 * 3600) < 60,
            `Max-Age=${age} is what is left of ninety days`,
        );
        assert.notEqual((await keyRow(me.session))?.seen_at, seen);

        const shared = new Browser(config, "198.51.100.40");
        await shared.call("POST", "/api/auth/email/start", { body: { email, shared: true } });
        const verified = await shared.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, email) },
        });
        const id = text(at(verified.body, "me", "session", "id"));
        const cookie = verified.cookies.find((c) => c.startsWith("ls_session=")) ?? "";
        assert.ok(
            cookie && !/Max-Age/.test(cookie),
            "a shared session's cookie ends with the browser",
        );
        await shared.call("GET", "/api/me");
        const sharedSeen = (await keyRow(id))?.seen_at;
        assert.ok(sharedSeen);
        const soon = await shared.call("GET", "/api/me");
        assert.equal((await keyRow(id))?.seen_at, sharedSeen, "not again within the minute");
        assert.deepEqual(soon.cookies, [], "and a shared session's cookie is never sent again");
        await db()
            .raw`update keys set seen_at = utc_iso(now() - interval '2 minutes') where id = ${id}`;
        await shared.call("GET", "/api/me");
        assert.notEqual((await keyRow(id))?.seen_at, sharedSeen);
    });

    it("signs out, after which the old cookie opens nothing, and signs out everywhere in one family", async () => {
        const { config, outbox } = local();
        const b = new Browser(config);
        const email = "ben@example.test";
        await startFamily(b, outbox, { email, name: "Ben", family: "Harlow" });
        const old = b.jar.get("ls_session") ?? "";
        const other = new Browser(config, "198.51.100.3");
        await other.call("POST", "/api/auth/email/start", { body: { email } });
        await other.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, email) },
        });
        assert.equal((await other.call("GET", "/api/me")).status, 200);

        const out = await b.call("POST", "/api/auth/sign-out", { body: {} });
        assert.equal(out.status, 204);
        assert.ok(!b.jar.has("ls_session"));
        b.jar.set("ls_session", old);
        const stale = await b.call("GET", "/api/me");
        assert.equal(stale.status, 401);
        assert.ok(
            stale.cookies.some((c) => /^ls_session=;.*Max-Age=0/.test(c)),
            "a cookie that opens nothing is cleared, so / is the site again",
        );
        assert.ok(!b.jar.has("ls_session"));
        const none = await b.call("GET", "/api/me");
        assert.equal(none.status, 401);
        assert.deepEqual(none.cookies, [], "with no cookie there is nothing to clear");
        assert.equal(
            (await other.call("GET", "/api/me")).status,
            200,
            "only this browser was signed out",
        );

        await other.call("POST", "/api/auth/sign-out", { body: { everywhere: true } });
        assert.equal((await other.call("GET", "/api/me")).status, 401);
    });

    it("lists a person's own sessions with this browser's marked and never a hash, and ends one of them, this browser's by clearing its cookie", async () => {
        const { config, outbox } = local();
        const b = new Browser(config);
        const email = "cara@example.test";
        await startFamily(b, outbox, { email, name: "Cara", family: "Nkemelu" });
        const phone = new Browser(config, "198.51.100.4");
        await phone.call("POST", "/api/auth/email/start", { body: { email } });
        await phone.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, email) },
        });
        const listed = await b.call("GET", "/api/sessions");
        assert.equal(listed.status, 200, JSON.stringify(listed.body));
        const rows = items(at(listed.body, "sessions"));
        assert.equal(rows.length, 2, "this browser's and the phone's");
        const own = rows.filter((r) => at(r, "own") === true);
        assert.equal(own.length, 1, "exactly one is this browser's");
        for (const r of rows) {
            assert.ok(typeof r === "object" && r !== null);
            assert.deepEqual(
                Object.keys(r).sort(),
                ["byPin", "created_at", "id", "kind", "name", "own", "putAway", "seen_at"],
                "never a hash",
            );
            assert.equal(at(r, "putAway"), false);
        }
        const other = rows.find((r) => at(r, "own") !== true);
        const ended = await b.call("POST", "/api/sessions/end", { body: { id: at(other, "id") } });
        assert.equal(ended.status, 204, JSON.stringify(ended.body));
        assert.ok(
            !ended.cookies.some((c) => c.startsWith("ls_session=")),
            "not this browser's cookie",
        );
        assert.equal((await phone.call("GET", "/api/me")).status, 401, "the phone is signed out");
        assert.equal(items(at((await b.call("GET", "/api/sessions")).body, "sessions")).length, 1);
        const again = await b.call("POST", "/api/sessions/end", { body: { id: at(other, "id") } });
        assert.equal(again.status, 404, "a session that has gone");
        const mine = await b.call("POST", "/api/sessions/end", { body: { id: at(own[0], "id") } });
        assert.equal(mine.status, 204);
        assert.ok(
            mine.cookies.some((c) => /^ls_session=;.*Max-Age=0/.test(c)),
            "this browser's cookie is cleared",
        );
        assert.equal((await b.call("GET", "/api/me")).status, 401);
    });

    it("signs out a member whose membership has ended, and clears the cookie", async () => {
        const { config, outbox } = local();
        const harlow = await startFamily(new Browser(config), outbox, {
            email: "anna@example.test",
            name: "Anna",
            family: "Harlow",
        });
        const ben = new Browser(config, "198.51.100.60");
        const oakley = await startFamily(ben, outbox, {
            email: "ben@example.test",
            name: "Ben",
            family: "Oakley",
        });
        await db().db.insert(members).values({ user_id: oakley.user, family_id: harlow.family });
        await ben.call("POST", "/api/auth/email/start", { body: { email: "ben@example.test" } });
        await ben.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, "ben@example.test") },
        });
        const chosen = await ben.call("POST", "/api/auth/email/choose", {
            body: { family_id: harlow.family },
        });
        assert.equal(chosen.status, 200);
        assert.equal((await ben.call("GET", "/api/family")).status, 200);

        await db()
            .raw`update members set ended_at = utc_iso(now()) where user_id = ${oakley.user} and family_id = ${harlow.family}`;
        const ended = await ben.call("GET", "/api/family");
        assert.deepEqual([ended.status, ended.body], [401, { error: "signed-out" }]);
        assert.ok(ended.cookies.some((c) => /^ls_session=;.*Max-Age=0/.test(c)));
        assert.ok(!ben.jar.has("ls_session"));
    });

    it("refuses a state-changing request with no Origin, a foreign Origin or site, or without the JSON type, an empty one included", async () => {
        const { config } = local();
        const b = new Browser(config);
        const body = { email: "x@example.test" };
        assert.equal(
            (await b.call("POST", "/api/auth/email/start", { body, origin: null })).status,
            403,
        );
        assert.equal(
            (
                await b.call("POST", "/api/auth/email/start", {
                    body,
                    origin: "https://evil.example",
                })
            ).status,
            403,
        );
        assert.equal(
            (await b.call("POST", "/api/auth/email/start", { body, type: "text/plain" })).status,
            415,
        );
        const post = (path: string, headers: Record<string, string>, sent?: string) =>
            b.handle(
                new Request(`http://127.0.0.1:8501${path}`, {
                    method: "POST",
                    headers: { origin: ORIGIN, ...headers },
                    ...(sent === undefined ? {} : { body: sent }),
                }),
                b.ip,
            );
        const json = { "content-type": "application/json" };
        const crossSite = await post(
            "/api/auth/email/start",
            { ...json, "sec-fetch-site": "cross-site" },
            JSON.stringify(body),
        );
        assert.equal(crossSite.status, 403);
        const refused: unknown = await crossSite.json();
        assert.deepEqual(refused, { error: "origin" });
        assert.equal(
            (
                await post(
                    "/api/auth/email/start",
                    { ...json, "sec-fetch-site": "same-site" },
                    JSON.stringify({ email: "same-site@example.test" }),
                )
            ).status,
            202,
            "a local page calling 8501 directly is same-site",
        );
        assert.equal(
            (await post("/api/auth/sign-out", { "content-type": "text/plain" })).status,
            415,
            "an empty body still declares JSON",
        );
        assert.equal(
            (await post("/api/auth/sign-out", {})).status,
            415,
            "as does one with no type",
        );
        assert.equal(
            (await post("/api/auth/sign-out", json)).status,
            401,
            "an empty JSON POST reaches its route, which asks for a session",
        );
        assert.equal(
            (await b.call("GET", "/api/health", { origin: null })).status,
            200,
            "a GET needs no Origin",
        );
    });

    it("refuses a body over a megabyte, and a batch of more than 500 drafts", async () => {
        const { config, outbox } = local();
        const b = new Browser(config);
        await startFamily(b, outbox, { email: "leo@example.test", name: "Leo", family: "Harlow" });
        const batch = await b.call("POST", "/api/events", {
            body: { events: Array.from({ length: 501 }, () => ({})) },
        });
        assert.deepEqual(
            [batch.status, batch.body],
            [413, { error: "too-large", limit: "500 events" }],
        );
        const big = await b.call("POST", "/api/auth/email/start", {
            body: { email: "big@example.test", padding: "x".repeat(1024 * 1024) },
        });
        assert.deepEqual([big.status, big.body], [413, { error: "too-large", limit: "1 MB" }]);
    });

    it("takes the fixed local code in place of the emailed one, which still works, and only for an address asked for in this browser", async () => {
        const { config, outbox } = local();
        const start = { name: "Nia", family: "Okafor", timeZone: "America/Denver" };
        const b = new Browser(config, "198.51.100.40");
        const none = await b.call("POST", "/api/auth/email/verify", { body: { code: "12345678" } });
        assert.equal(at(none.body, "error"), "no-pending", "no code was asked for in this browser");
        await b.call("POST", "/api/auth/email/start", {
            body: { email: "fixed@example.test", start },
        });
        const fixed = await b.call("POST", "/api/auth/email/verify", {
            body: { code: "1234 5678" },
        });
        assert.equal(fixed.status, 200, JSON.stringify(fixed.body));
        assert.equal(at(fixed.body, "me", "user", "email"), "fixed@example.test");
        const signedIn = items(at((await b.call("GET", "/api/events")).body, "events")).find(
            (e) => at(e, "kind") === "signed-in",
        );
        assert.equal(at(signedIn, "data", "method"), "email-code", "recorded as any code is");

        const real = new Browser(config, "198.51.100.41");
        await real.call("POST", "/api/auth/email/start", {
            body: { email: "real@example.test", start },
        });
        const right = await real.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, "real@example.test") },
        });
        assert.equal(right.status, 200, "the emailed code works beside it");
    });

    it("refuses the fixed code in production like any wrong code, even with the value in the configuration", async () => {
        const { config, outbox } = local();
        const production: Config = { ...config, env: "production" };
        assert.equal(production.devCode, "12345678");
        const b = new Browser(production, "198.51.100.42");
        await b.call("POST", "/api/auth/email/start", { body: { email: "prod@example.test" } });
        const fixed = await b.call("POST", "/api/auth/email/verify", {
            body: { code: "12345678" },
        });
        assert.deepEqual(
            [fixed.status, fixed.body],
            [400, { error: "wrong-code", attemptsLeft: 4 }],
        );
        const right = await b.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, "prod@example.test") },
        });
        assert.equal(right.status, 200);
    });

    it("answers a code that ran out with expired, and five wrong guesses with dead-code", async () => {
        const { config, outbox } = local();
        const late = new Browser(config, "198.51.100.50");
        await late.call("POST", "/api/auth/email/start", { body: { email: "late@example.test" } });
        await db()
            .raw`update keys set created_at = utc_iso(now() - interval '11 minutes') where email = 'late@example.test'`;
        const expired = await late.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, "late@example.test") },
        });
        assert.deepEqual([expired.status, expired.body], [410, { error: "expired" }]);

        const guesser = new Browser(config, "198.51.100.51");
        await guesser.call("POST", "/api/auth/email/start", {
            body: { email: "guess@example.test" },
        });
        const code = codeFor(outbox, "guess@example.test");
        const wrong = `${(Number(code[0]) + 1) % 10}${code.slice(1)}`;
        for (let left = 4; left > 0; left--) {
            const guess = await guesser.call("POST", "/api/auth/email/verify", {
                body: { code: wrong },
            });
            assert.deepEqual(guess.body, { error: "wrong-code", attemptsLeft: left });
        }
        const fifth = await guesser.call("POST", "/api/auth/email/verify", {
            body: { code: wrong },
        });
        assert.deepEqual([fifth.status, fifth.body], [410, { error: "dead-code" }]);
        const right = await guesser.call("POST", "/api/auth/email/verify", { body: { code } });
        assert.deepEqual([right.status, right.body], [410, { error: "dead-code" }]);
    });

    it("refuses consent to an old notice, a children's view for a kid without consent, and a PIN without a fresh sign-in", async () => {
        const { config, outbox } = local();
        const parent = new Browser(config);
        const me = await startFamily(parent, outbox, {
            email: "anna@example.test",
            name: "Anna",
            family: "Harlow",
        });
        const notice = await parent.call("POST", "/api/kids", {
            body: { name: "Maya", grade: 1, consent: { notice: "2025-01" } },
        });
        assert.deepEqual(
            [notice.status, notice.body],
            [409, { error: "notice-changed", notice: "2026-09" }],
        );

        const [theo] = await db()
            .db.insert(kids)
            .values({ family_id: me.family, name: "Theo", grade: 2 })
            .returning();
        assert.ok(theo);
        const unconsented = await parent.call("POST", "/api/kid-sessions", {
            body: { kids: [theo.id] },
        });
        assert.deepEqual(
            [unconsented.status, unconsented.body],
            [409, { error: "no-consent", kid: theo.id }],
        );
        await db()
            .raw`update keys set created_at = utc_iso(now() - interval '11 minutes') where id = ${me.session}`;
        const stale = await parent.call("POST", "/api/family/pin", { body: { pin: "2468" } });
        assert.deepEqual([stale.status, stale.body], [403, { error: "fresh-sign-in" }]);
    });

    it("refuses a malformed address, and a second code for one address within the minute", async () => {
        const { config } = local();
        const b = new Browser(config);
        assert.deepEqual(
            (await b.call("POST", "/api/auth/email/start", { body: { email: "not an address" } }))
                .body,
            {
                error: "bad-email",
            },
        );
        assert.equal(
            (
                await b.call("POST", "/api/auth/email/start", {
                    body: { email: "rate@example.test" },
                })
            ).status,
            202,
        );
        const again = await b.call("POST", "/api/auth/email/start", {
            body: { email: "rate@example.test" },
        });
        assert.equal(again.status, 429);
        assert.equal(text(at(again.body, "error")), "rate-limited");
    });
});
