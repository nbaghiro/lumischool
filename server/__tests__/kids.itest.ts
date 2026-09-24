// A children's view from end to end through the app function (.docs/auth.md, flows 5 to 7): a parent
// opens it and their session is put away, a grown-up adds another child to it with the PIN, the PIN
// gives the session back with its waits, and a parent or a sign-in on the same browser ends it. What a
// view's cookie can and cannot reach is in isolation.itest.ts.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { closeApp, open, type Store } from "../db/client";
import { prepare, truncate } from "../db/__tests__/test-db";
import {
    addKid,
    at,
    Browser,
    codeFor,
    items,
    local,
    openView,
    sessionInto,
    startFamily,
    text,
    type Answer,
} from "./browser";

const reason = await prepare();
const owner: Store | null = reason === null ? open() : null;

after(async () => {
    await closeApp();
    if (owner) await owner.close();
});

const EMAIL = "naib@example.test";
const PIN = "2468";
const { config, outbox } = local();
const made = { family: "", user: "", maya: "", theo: "" };

const db = (): Store => {
    if (!owner) throw new Error("no database");
    return owner;
};

/** A browser signed in as the parent, with a session made just now, so it counts as fresh. */
async function parent(): Promise<Browser> {
    const b = new Browser(config);
    await sessionInto(b, made.family, made.user);
    return b;
}

/** A browser that opened a children's view for these kids, holding its cookie and the session put away for it. */
async function viewFor(kids: readonly string[]): Promise<Browser> {
    const b = await parent();
    const opened = await openView(b, kids);
    assert.equal(opened.status, 204, JSON.stringify(opened.body));
    return b;
}

const sessionIdIn = (b: Browser): string => (b.jar.get("ls_session") ?? "").split(".")[1] ?? "";

async function keyRow(
    id: string,
): Promise<{ detail: unknown; seen_at: string | null } | undefined> {
    const [row] = await db().raw<{ detail: unknown; seen_at: string | null }[]>`
        select detail, seen_at from keys where id = ${id}`;
    return row;
}

const leave = (b: Browser, pin: string): Promise<Answer> =>
    b.call("POST", "/api/kid/leave", { body: { pin } });

async function lastEvent(kind: string): Promise<unknown> {
    const [row] = await db().raw<{ data: unknown; actor: string | null }[]>`
        select data, actor from events
        where family_id = ${made.family} and kind = ${kind}
        order by at desc, seq desc limit 1`;
    return row;
}

async function pinState(): Promise<{ attempts: number } | undefined> {
    const [row] = await db().raw<{ attempts: number }[]>`
        select attempts from keys where family_id = ${made.family} and kind = 'pin'`;
    return row;
}

/** Moves the PIN's count and the time of its last wrong try, as if the tries had happened. */
async function triedBefore(attempts: number, minutesAgo: number): Promise<void> {
    await db().raw`
        update keys set attempts = ${attempts},
            seen_at = utc_iso(now() - make_interval(mins => ${minutesAgo}))
        where family_id = ${made.family} and kind = 'pin'`;
}

describe("a children's view", { skip: reason ?? false }, () => {
    before(async () => {
        await truncate(db());
        const grown = new Browser(config);
        const me = await startFamily(grown, outbox, {
            email: EMAIL,
            name: "Naib",
            family: "Oakley",
        });
        made.family = me.family;
        made.user = me.user;
        made.maya = await addKid(grown, "Maya", 1);
        made.theo = await addKid(grown, "Theo", 3);
        const set = await grown.call("POST", "/api/family/pin", { body: { pin: PIN } });
        assert.equal(set.status, 204, JSON.stringify(set.body));
    });

    it("opens beside the parent's session, which is put away and refused by every adult route until the PIN, holding a key for each child the parent chose", async () => {
        const b = await parent();
        const session = sessionIdIn(b);
        const opened = await openView(b, [made.maya, made.theo, made.maya]);
        assert.equal(opened.status, 204);
        assert.ok(
            !opened.cookies.some((c) => c.startsWith("ls_session=;")),
            "the session's cookie is not cleared",
        );
        const kidCookie = opened.cookies.find((c) => c.startsWith("ls_kids="));
        assert.match(kidCookie ?? "", /HttpOnly; SameSite=Lax; Max-Age=\d+/);
        assert.deepEqual([...b.jar.keys()].sort(), ["ls_browser", "ls_kids", "ls_session"]);
        assert.equal((b.jar.get("ls_kids") ?? "").split("~").length, 2, "one credential per child");
        const after = await keyRow(session);
        assert.ok(after, "the parent's session key stays");
        assert.equal(
            at(after.detail, "putAway"),
            at(await lastEvent("kid-session-opened"), "data", "view"),
            "put away for this view",
        );
        const me = await b.call("GET", "/api/me");
        assert.deepEqual([me.status, at(me.body, "error")], [401, "put-away"]);
        assert.ok(
            !me.cookies.some((c) => c.startsWith("ls_session=")),
            "a put-away session's cookie is kept, since the PIN gives it back",
        );
        assert.equal(
            (await keyRow(session))?.seen_at,
            after.seen_at,
            "a refused use of a put-away session does not move seen_at",
        );
        const put = await lastEvent("session-changed");
        assert.deepEqual(
            [at(put, "data", "session"), at(put, "data", "change"), at(put, "actor")],
            [session, "put-away", made.user],
        );
        const view = await b.call("GET", "/api/kid");
        assert.deepEqual(
            [
                items(at(view.body, "kids")).map((k) => at(k, "name")),
                items(at(view.body, "others")),
                at(view.body, "pin"),
            ],
            [["Maya", "Theo"], [], true],
        );
        const recorded = await lastEvent("kid-session-opened");
        assert.deepEqual(
            items(at(recorded, "data", "keys")).map((k) => at(k, "kid")),
            [made.maya, made.theo],
        );
        assert.equal(at(recorded, "actor"), made.user);
    });

    it("refuses to open a view with no children, a child of no family here, or for someone not signed in", async () => {
        const b = await parent();
        const refused = async (kids: unknown, status: number, error: string) => {
            const res = await b.call("POST", "/api/kid-sessions", { body: { kids } });
            assert.deepEqual([res.status, at(res.body, "error")], [status, error]);
        };
        await refused([], 400, "bad-request");
        await refused("not a list", 400, "bad-request");
        await refused([made.maya, randomUUID()], 404, "not-found");
        assert.ok(b.jar.has("ls_session"), "a refused open leaves the session as it was");
        const nobody = await new Browser(config).call("POST", "/api/kid-sessions", {
            body: { kids: [made.maya] },
        });
        assert.equal(nobody.status, 401);
    });

    it("adds another child to the view with the family's PIN, under the parent who opened it, and refuses a child without the PIN", async () => {
        const b = await viewFor([made.maya]);
        const view = await b.call("GET", "/api/kid");
        assert.deepEqual(
            items(at(view.body, "others")).map((k) => [at(k, "id"), at(k, "name")]),
            [[made.theo, "Theo"]],
            "the family's other children with a consent are offered",
        );
        const add = (body: Record<string, unknown>) => b.call("POST", "/api/kid/add", { body });
        assert.equal((await add({ kid: made.theo })).status, 400, "the PIN is needed");
        assert.deepEqual((await add({ pin: "0000", kid: made.theo })).body, {
            error: "wrong-pin",
            attemptsLeft: 14,
        });
        assert.equal((await add({ pin: PIN, kid: randomUUID() })).status, 404);
        assert.equal(
            (await pinState())?.attempts,
            0,
            "a right PIN clears the count, whatever follows",
        );
        const before = b.jar.get("ls_kids") ?? "";
        const added = await add({ pin: PIN, kid: made.theo });
        assert.equal(added.status, 204, JSON.stringify(added.body));
        const after = b.jar.get("ls_kids") ?? "";
        assert.ok(after.startsWith(`${before}~`), "the cookie keeps its keys and gains one");
        assert.equal(after.split("~").length, 2);
        const both = await b.call("GET", "/api/kid");
        assert.deepEqual(
            [
                items(at(both.body, "kids")).map((k) => at(k, "name")),
                items(at(both.body, "others")),
            ],
            [["Maya", "Theo"], []],
        );
        const recorded = await lastEvent("kid-session-opened");
        assert.deepEqual(
            [items(at(recorded, "data", "keys")).map((k) => at(k, "kid")), at(recorded, "actor")],
            [[made.theo], made.user],
        );
        const listed = items(
            at((await (await parent()).call("GET", "/api/kid-sessions")).body, "views"),
        );
        assert.deepEqual(new Set(listed.map((v) => at(v, "kid"))), new Set([made.maya, made.theo]));
        const again = await add({ pin: PIN, kid: made.theo });
        assert.equal(again.status, 204, "a child already in the view is left as they are");
        assert.equal((b.jar.get("ls_kids") ?? "").split("~").length, 2);
    });

    it("ends every open view in the family from the family's page, and the sessions put away for them", async () => {
        const one = await viewFor([made.maya]);
        const two = await viewFor([made.theo]);
        const putAway = sessionIdIn(one);
        const grown = await parent();
        const ended = await grown.call("POST", "/api/kid-sessions/end-all", { body: {} });
        assert.equal(ended.status, 200, JSON.stringify(ended.body));
        assert.ok(Number(at(ended.body, "ended")) >= 2, "this case's two views at least");
        assert.equal((await one.call("GET", "/api/kid")).status, 401);
        assert.equal((await two.call("GET", "/api/kid")).status, 401);
        assert.equal(await keyRow(putAway), undefined, "nothing could give it back");
        const gone = await one.call("GET", "/api/me");
        assert.deepEqual([gone.status, at(gone.body, "error")], [401, "signed-out"]);
        assert.ok(
            gone.cookies.some((c) => c.startsWith("ls_session=;")),
            "and its cookie is cleared",
        );
        assert.equal(at(await lastEvent("session-changed"), "data", "change"), "ended");
        assert.deepEqual(
            items(at((await grown.call("GET", "/api/kid-sessions")).body, "views")),
            [],
        );
        const recorded = await lastEvent("kid-session-ended");
        assert.deepEqual(
            [at(recorded, "data", "reason"), at(recorded, "actor")],
            ["ended", made.user],
        );
        const none = await grown.call("POST", "/api/kid-sessions/end-all", { body: {} });
        assert.deepEqual([none.status, none.body], [200, { ended: 0 }]);
    });

    it("gives the browser's own session back for the right PIN, as it was, and ends the view", async () => {
        const b = await viewFor([made.maya]);
        const session = sessionIdIn(b);
        const kidCookie = b.jar.get("ls_kids") ?? "";
        assert.deepEqual(
            [(await leave(b, "12a4")).status, (await pinState())?.attempts],
            [400, 0],
            "four digits, and a malformed one is not counted",
        );
        const left = await leave(b, PIN);
        assert.equal(left.status, 204, JSON.stringify(left.body));
        assert.ok(left.cookies.some((c) => c.startsWith("ls_kids=;") && /Max-Age=0/.test(c)));
        assert.deepEqual([...b.jar.keys()].sort(), ["ls_browser", "ls_session"]);
        assert.equal(sessionIdIn(b), session, "the same key, not a new one");
        const me = await b.call("GET", "/api/me");
        assert.equal(at(me.body, "user", "id"), made.user);
        assert.equal(at(me.body, "session", "id"), session);
        const row = await keyRow(session);
        assert.equal(at(row?.detail, "putAway"), undefined, "no longer put away");
        assert.equal(at(row?.detail, "pin"), true, "and marked as the PIN's from now on");
        const stale = await b.call("POST", "/api/family/pin", { body: { pin: "1357" } });
        assert.equal(
            at(stale.body, "error"),
            "fresh-sign-in",
            "a session the PIN gave back is never fresh, however new it is",
        );
        const old = new Browser(config);
        old.jar.set("ls_kids", kidCookie);
        old.jar.set("ls_browser", b.jar.get("ls_browser") ?? "");
        assert.equal((await old.call("GET", "/api/kid")).status, 401, "the view's keys are gone");
        const back = await lastEvent("session-changed");
        assert.deepEqual(
            [
                at(await lastEvent("kid-session-ended"), "data", "reason"),
                at(back, "data", "session"),
                at(back, "data", "change"),
            ],
            ["pin", session, "restored"],
        );
    });

    it("goes round: open, refused on an adult route, out with the PIN and no code, in again", async () => {
        const b = await parent();
        const session = sessionIdIn(b);
        assert.equal((await openView(b, [made.maya])).status, 204);
        assert.equal(at((await b.call("GET", "/api/kid-sessions")).body, "error"), "put-away");
        assert.equal((await b.call("GET", "/api/kid")).status, 200, "the view is what governs");
        assert.equal((await leave(b, PIN)).status, 204);
        assert.equal(at((await b.call("GET", "/api/me")).body, "session", "id"), session);
        assert.equal((await openView(b, [made.theo])).status, 204, "opened again from the page");
        assert.equal(at((await b.call("GET", "/api/me")).body, "error"), "put-away");
        assert.equal((await leave(b, PIN)).status, 204);
        assert.equal(at((await b.call("GET", "/api/me")).body, "session", "id"), session);
    });

    it("hands the parent a shared session for the PIN, which never counts as a fresh sign-in, when the session put away has gone or the browser never held it", async () => {
        const b = await viewFor([made.maya]);
        const session = sessionIdIn(b);
        // the session runs out while it is put away, exactly as it would have in use
        await db().raw`
            update keys set created_at = utc_iso(now() - interval '91 days') where id = ${session}`;
        const left = await leave(b, PIN);
        assert.equal(left.status, 204, JSON.stringify(left.body));
        assert.notEqual(sessionIdIn(b), session, "a new key, since the old one had run out");
        assert.equal(at((await b.call("GET", "/api/me")).body, "user", "id"), made.user);
        const stale = await b.call("POST", "/api/family/pin", { body: { pin: "1357" } });
        assert.equal(at(stale.body, "error"), "fresh-sign-in", "a PIN's session is never fresh");
        assert.equal(at(await lastEvent("signed-in"), "data", "method"), "pin");
        // a copy of the view's cookie on a browser with no session gets the same
        const copy = new Browser(config);
        const opened = await viewFor([made.theo]);
        copy.jar.set("ls_kids", opened.jar.get("ls_kids") ?? "");
        copy.jar.set("ls_browser", opened.jar.get("ls_browser") ?? "");
        const other = sessionIdIn(opened);
        assert.equal((await leave(copy, PIN)).status, 204);
        assert.equal(at((await copy.call("GET", "/api/me")).body, "user", "id"), made.user);
        assert.equal(
            await keyRow(other),
            undefined,
            "the session put away on the other browser goes",
        );
        assert.equal(at((await opened.call("GET", "/api/me")).body, "error"), "signed-out");
    });

    it("counts wrong PINs in a row, waits a minute after five and fifteen after ten, and clears the count on a right one", async () => {
        const b = await viewFor([made.maya]);
        for (const left of [14, 13, 12, 11, 10]) {
            const wrong = await leave(b, "0000");
            assert.deepEqual(wrong.body, { error: "wrong-pin", attemptsLeft: left });
            assert.equal(wrong.status, 400);
        }
        const waiting = await leave(b, PIN);
        assert.equal(waiting.status, 429, "even the right PIN waits");
        const after = Number(at(waiting.body, "retryAfter"));
        assert.ok(after > 50 && after <= 60, `waits a minute, not ${after}s`);
        assert.equal((await pinState())?.attempts, 5, "a try while waiting is not counted");

        await triedBefore(5, 2);
        assert.deepEqual((await leave(b, "0000")).body, { error: "wrong-pin", attemptsLeft: 9 });
        await triedBefore(10, 5);
        const longer = await leave(b, PIN);
        const wait = Number(at(longer.body, "retryAfter"));
        assert.ok(
            longer.status === 429 && wait > 590 && wait <= 600,
            `waits ten more minutes, not ${wait}s`,
        );

        await triedBefore(10, 16);
        assert.equal((await leave(b, PIN)).status, 204);
        assert.equal((await pinState())?.attempts, 0);
    });

    it("stops the PIN at fifteen wrong tries in a row until a parent sets it again", async () => {
        const b = await viewFor([made.theo]);
        await triedBefore(14, 16);
        assert.deepEqual(
            [(await leave(b, "0000")).status, (await pinState())?.attempts],
            [409, 15],
        );
        const stopped = await leave(b, PIN);
        assert.deepEqual([stopped.status, stopped.body], [409, { error: "no-pin" }]);
        const views = await (await parent()).call("GET", "/api/kid-sessions");
        assert.equal(at(views.body, "pin"), true, "the PIN is still there to be set again");
        const set = await (await parent()).call("POST", "/api/family/pin", { body: { pin: PIN } });
        assert.equal(set.status, 204);
        assert.equal(at(await lastEvent("pin-set"), "actor"), made.user);
        assert.equal((await leave(b, PIN)).status, 204);
    });

    it("ends only the selected child within a legacy multi-child view", async () => {
        const b = await viewFor([made.maya, made.theo]);
        const grown = await parent();
        const listed = items(at((await grown.call("GET", "/api/kid-sessions")).body, "views"));
        const mine = listed.find((v) => at(v, "kid") === made.maya);
        const view = text(at(mine, "view"));
        assert.equal(at(mine, "name"), null, "no device name reaches the test browser");
        const ended = await grown.call("POST", "/api/kid-sessions/end", { body: { view } });
        assert.equal(ended.status, 204, JSON.stringify(ended.body));
        const refused = await b.call("GET", "/api/kid");
        assert.equal(refused.status, 200);
        assert.deepEqual(
            items(at(refused.body, "kids")).map((kid) => at(kid, "id")),
            [made.theo],
        );
        const unsent = await b.call("POST", `/api/kid/${made.maya}/events`, {
            body: { events: [] },
        });
        assert.equal(unsent.status, 404);
        const again = await grown.call("POST", "/api/kid-sessions/end", { body: { view } });
        assert.equal(again.status, 404);
        const recorded = await lastEvent("kid-session-ended");
        assert.deepEqual(
            [at(recorded, "data", "reason"), at(recorded, "actor")],
            ["ended", made.user],
        );
    });

    it("parent sign-in clears legacy routing cookies without ending independent child views", async () => {
        const b = await viewFor([made.maya]);
        const putAway = sessionIdIn(b);
        const kidCookie = b.jar.get("ls_kids") ?? "";
        assert.equal(
            (await b.call("POST", "/api/auth/email/start", { body: { email: EMAIL } })).status,
            202,
        );
        const verified = await b.call("POST", "/api/auth/email/verify", {
            body: { code: codeFor(outbox, EMAIL) },
        });
        assert.equal(verified.status, 200, JSON.stringify(verified.body));
        assert.ok(verified.cookies.some((c) => c.startsWith("ls_kids=;") && /Max-Age=0/.test(c)));
        assert.ok(b.jar.has("ls_session") && !b.jar.has("ls_kids"));
        assert.notEqual(sessionIdIn(b), putAway, "a sign-in replaces whatever session was there");
        assert.equal(await keyRow(putAway), undefined, "the put-away key went with it");
        const old = new Browser(config);
        old.jar.set("ls_kids", kidCookie);
        old.jar.set("ls_browser", b.jar.get("ls_browser") ?? "");
        assert.equal((await old.call("GET", "/api/kid")).status, 200);
    });

    it("sends the cookie again when a use moves seen_at, holding only the keys still alive", async () => {
        const b = await viewFor([made.maya, made.theo]);
        const [maya, theo] = (b.jar.get("ls_kids") ?? "").split("~");
        const theoKey = (theo ?? "").split(".")[1] ?? "";
        await db().raw`delete from keys where id = ${theoKey}`;
        await db().raw`
            update keys set seen_at = utc_iso(now() - interval '2 days')
            where family_id = ${made.family} and kind = 'kid-session'`;
        const view = await b.call("GET", "/api/kid");
        assert.deepEqual(
            items(at(view.body, "kids")).map((k) => at(k, "name")),
            ["Maya"],
        );
        assert.ok(view.cookies.some((c) => c.startsWith("ls_kids=") && /Max-Age=\d+/.test(c)));
        assert.equal(b.jar.get("ls_kids"), maya);
        const quiet = await b.call("GET", "/api/kid");
        assert.equal(quiet.cookies.length, 0, "not again until seen_at moves");
    });

    it("stamps a child's answers with that child's key in the view, and writes a retried chunk once", async () => {
        const b = await viewFor([made.maya]);
        const key = (b.jar.get("ls_kids") ?? "").split(".")[1] ?? "";
        const events = [0, 1, 2].map(() => ({
            id: randomUUID(),
            kid_id: made.maya,
            kind: "sitting-began",
            data: {
                sitting: randomUUID(),
                lesson: "g1-making-ten",
                lessonHash: "h",
                pack: "p",
                mode: "screen",
            },
            at: "2026-09-14T09:12:00.000Z",
        }));
        const sent = await b.call("POST", `/api/kid/${made.maya}/events`, { body: { events } });
        assert.deepEqual(sent.body, { ids: events.map((e) => e.id) });
        const retried = await b.call("POST", `/api/kid/${made.maya}/events`, { body: { events } });
        assert.deepEqual(retried.body, sent.body);
        const rows = await db().raw<{ device: string; seq: string; actor: string | null }[]>`
            select device, seq, actor from events where device = ${key} order by seq`;
        assert.deepEqual(
            rows.map((r) => [r.device, Number(r.seq), r.actor]),
            [
                [key, 0, null],
                [key, 1, null],
                [key, 2, null],
            ],
            "a new key's stream starts at 0, and a bigint arrives as a string",
        );
    });
});
