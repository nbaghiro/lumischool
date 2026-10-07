import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import { closeApp, open, type Store } from "../db/client";
import { prepare, truncate } from "../db/__tests__/test-db";
import { app } from "../http";
import { addKid, at, Browser, codeFor, local, sessionInto, startFamily, text } from "./browser";

await prepare();
const owner: Store = open();
after(async () => {
    await closeApp();
    await owner.close();
});

const count = async (query: string, value: string): Promise<number> => {
    const rows = await owner.raw.unsafe<{ n: number }[]>(query, [value]);
    return rows[0]?.n ?? -1;
};

describe("deleting one's own account", () => {
    const { config, outbox } = local();
    beforeEach(async () => {
        await truncate(owner);
        outbox.length = 0;
    });

    it("closes a family where the person is the only parent, removes the login, and lets the address start again", async () => {
        const parent = new Browser(config);
        const a = await startFamily(parent, outbox, {
            email: "only@example.test",
            name: "Only",
            family: "Alone",
        });
        const kid = await addKid(parent, "Maya", 1);
        const view = await parent.call("POST", "/api/kid-sessions", {
            body: { kids: [kid], tab: true },
        });
        const credential = text(at(view.body, "credential"));

        const deleted = await parent.call("POST", "/api/me/delete", {
            body: { email: " Only@Example.test " },
        });
        assert.equal(deleted.status, 204, JSON.stringify(deleted.body));
        assert.ok(deleted.cookies.some((c) => c.startsWith("ls_session=;") && /Max-Age=0/.test(c)));
        assert.equal((await parent.call("GET", "/api/me")).status, 401);
        assert.equal((await parent.call("GET", "/api/kid", { kid: credential })).status, 401);

        for (const table of ["families", "kids", "members", "events", "keys", "content"]) {
            const column = table === "families" ? "id" : "family_id";
            assert.equal(
                await count(
                    `select count(*)::int as n from ${table} where ${column} = $1`,
                    a.family,
                ),
                0,
                table,
            );
        }
        assert.equal(await count("select count(*)::int as n from users where id = $1", a.user), 0);
        assert.equal(
            await count("select count(*)::int as n from keys where user_id = $1", a.user),
            0,
        );
        assert.equal(
            await count(
                "select count(*)::int as n from users where lower(email) = $1",
                "only@example.test",
            ),
            0,
        );

        const again = new Browser(config);
        const fresh = await startFamily(again, outbox, {
            email: "only@example.test",
            name: "Only",
            family: "Again",
        });
        assert.notEqual(fresh.user, a.user);
        assert.notEqual(fresh.family, a.family);
    });

    it("leaves a family that has another parent, which stays with them, and closes the one it alone parents", async () => {
        const first = new Browser(config);
        const a = await startFamily(first, outbox, {
            email: "first@example.test",
            name: "First",
            family: "Shared",
        });
        const kid = await addKid(first, "Robin", 2);
        const second = new Browser(config);
        const b = await startFamily(second, outbox, {
            email: "second@example.test",
            name: "Second",
            family: "Second's own",
        });
        await owner.raw`insert into members (family_id, user_id) values (${a.family}, ${b.user})`;
        await sessionInto(second, a.family, b.user);
        // a picture the leaving parent last edited, and their save receipt, stay with the family
        const artwork = randomUUID();
        const now = new Date().toISOString();
        await owner.raw`insert into artworks (id, family_id, kid_id, title, document, thumbnail, revision, created_at, updated_at, updated_by)
            values (${artwork}, ${a.family}, ${kid}, 'Boats', '{}'::jsonb, '', 1, ${now}, ${now}, ${a.user})`;
        await owner.raw`insert into painting_saves (id, family_id, artwork_id, request_hash, document, thumbnail, revision, conflict, saved_at, user_id)
            values (${randomUUID()}, ${a.family}, ${artwork}, 'h', '{}'::jsonb, '', 1, 0, ${now}, ${a.user})`;
        // a family the person alone parents, reached from the session in the shared one
        const own = randomUUID();
        await owner.raw.begin(async (sql) => {
            await sql`insert into families (id, name, time_zone) values (${own}, 'First alone', 'America/Denver')`;
            await sql`insert into members (family_id, user_id) values (${own}, ${a.user})`;
        });
        const otherBrowser = new Browser(config);
        await sessionInto(otherBrowser, own, a.user);
        assert.equal((await otherBrowser.call("GET", "/api/me")).status, 200);
        const sent = outbox.length;

        const deleted = await first.call("POST", "/api/me/delete", {
            body: { email: "first@example.test" },
        });
        assert.equal(deleted.status, 204, JSON.stringify(deleted.body));

        assert.equal((await first.call("GET", "/api/me")).status, 401);
        assert.equal((await otherBrowser.call("GET", "/api/me")).status, 401);
        assert.equal(await count("select count(*)::int as n from families where id = $1", own), 0);
        assert.equal(await count("select count(*)::int as n from users where id = $1", a.user), 0);
        assert.equal(
            await count("select count(*)::int as n from keys where user_id = $1", a.user),
            0,
        );
        assert.equal(
            await count("select count(*)::int as n from members where user_id = $1", a.user),
            0,
        );

        assert.equal(
            await count("select count(*)::int as n from families where id = $1", a.family),
            1,
        );
        assert.equal(await count("select count(*)::int as n from kids where id = $1", kid), 1);
        assert.equal(
            await count("select count(*)::int as n from artworks where id = $1", artwork),
            1,
        );
        const me = await second.call("GET", "/api/me");
        assert.equal(me.status, 200);
        assert.equal(at(me.body, "family", "id"), a.family);
        const removed = await owner.raw<{ actor: string; data: unknown }[]>`
            select actor, data from events where family_id = ${a.family} and kind = 'member-removed'`;
        assert.equal(removed.length, 1);
        assert.equal(removed[0]?.actor, a.user);
        assert.equal(at(removed[0]?.data, "left"), true);
        assert.deepEqual(
            outbox.slice(sent).map((m) => m.to),
            ["second@example.test"],
            "the remaining parent is told",
        );
    });

    it("needs a fresh sign-in and the person's own address typed back", async () => {
        const parent = new Browser(config);
        const a = await startFamily(parent, outbox, {
            email: "careful@example.test",
            name: "Careful",
            family: "Careful",
        });
        for (const body of [{ email: "someone@example.test" }, { email: 42 }, {}]) {
            const refused = await parent.call("POST", "/api/me/delete", { body });
            assert.equal(refused.status, 400, JSON.stringify(body));
            assert.equal(at(refused.body, "error"), "bad-request");
        }
        await owner.raw`update keys set created_at = utc_iso(now() - interval '11 minutes') where family_id = ${a.family} and kind = 'session'`;
        const stale = await parent.call("POST", "/api/me/delete", {
            body: { email: "careful@example.test" },
        });
        assert.equal(stale.status, 403);
        assert.equal(at(stale.body, "error"), "fresh-sign-in");
        assert.equal((await parent.call("GET", "/api/me")).status, 200);
        assert.equal(await count("select count(*)::int as n from users where id = $1", a.user), 1);
        assert.equal(
            await count("select count(*)::int as n from families where id = $1", a.family),
            1,
        );
    });

    it("answers the app's bearer request without cookies, and its next call is signed out", async () => {
        const browser = new Browser(config);
        await startFamily(browser, outbox, {
            email: "phone@example.test",
            name: "Phone",
            family: "Pocket",
        });
        const handle = app(config);
        const call = async (
            path: string,
            body: unknown,
            headers: Record<string, string>,
        ): Promise<{ status: number; body: unknown; cookies: string[] }> => {
            const res = await handle(
                new Request(`http://127.0.0.1:8501${path}`, {
                    method: body === null ? "GET" : "POST",
                    headers: {
                        "user-agent": "lumischoolApp/1.0 (iPhone; iOS 19.0)",
                        ...(body === null ? {} : { "content-type": "application/json" }),
                        ...headers,
                    },
                    ...(body === null ? {} : { body: JSON.stringify(body) }),
                }),
                "198.51.100.4",
            );
            const raw = await res.text();
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            return { status: res.status, body: parsed, cookies: res.headers.getSetCookie() };
        };
        const asked = await call(
            "/api/auth/email/start",
            { email: "phone@example.test", tab: true, device: true },
            {},
        );
        assert.equal(asked.status, 202, JSON.stringify(asked.body));
        const verified = await call(
            "/api/auth/email/verify",
            { code: codeFor(outbox, "phone@example.test"), device: true },
            { "x-sign-in-challenge": text(at(asked.body, "challenge")) },
        );
        assert.equal(verified.status, 200, JSON.stringify(verified.body));
        const signedIn = {
            authorization: `Bearer ${text(at(verified.body, "native", "session"))}`,
            "x-lumi-device": text(at(verified.body, "native", "device")),
        };

        const deleted = await call("/api/me/delete", { email: "phone@example.test" }, signedIn);
        assert.equal(deleted.status, 204, JSON.stringify(deleted.body));
        assert.deepEqual(deleted.cookies, []);
        const after = await call("/api/me", null, signedIn);
        assert.equal(after.status, 401);
        assert.equal(at(after.body, "error"), "signed-out");
        assert.equal((await browser.call("GET", "/api/me")).status, 401);
    });
});
