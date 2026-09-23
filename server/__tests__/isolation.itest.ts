// One family's session reaches nothing of another's, a children's view reaches only its own children,
// and what a view sends is stamped with that child's key whatever it claims, through the app function
// against the test database. Both families are made through the API itself: flows 1, 4 and 5.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { closeApp, open, type Store } from "../db/client";
import { prepare, truncate } from "../db/__tests__/test-db";
import {
    addKid,
    at,
    Browser,
    items,
    local,
    openView,
    sessionInto,
    startFamily,
    text,
} from "./browser";

const reason = await prepare();
const owner: Store | null = reason === null ? open() : null;

after(async () => {
    await closeApp();
    if (owner) await owner.close();
});

interface Side {
    parent: Browser;
    /** A browser holding a children's view for `kid` only. */
    view: Browser;
    family: string;
    user: string;
    kid: string;
    /** A child of the family the view was not opened for. */
    other: string;
    /** The id of the view's key for `kid`, which stamps what it sends. */
    keyId: string;
    authored: string;
}

const { config, outbox } = local();
const sides: Record<"a" | "b", Side | null> = { a: null, b: null };
const side = (s: "a" | "b"): Side => {
    const found = sides[s];
    if (!found) throw new Error("the fixture was not built");
    return found;
};

const sitting = (kid: string, over: Record<string, unknown> = {}) => ({
    id: randomUUID(),
    kid_id: kid,
    kind: "sitting-began",
    data: {
        sitting: randomUUID(),
        lesson: "g1-making-ten",
        lessonHash: "h",
        pack: "p",
        mode: "screen",
    },
    at: "2026-09-14T09:12:00.000Z",
    ...over,
});

async function build(name: string, kidName: string, otherName: string, ip: string): Promise<Side> {
    const parent = new Browser(config, ip);
    const me = await startFamily(parent, outbox, {
        email: `${name.toLowerCase()}@example.test`,
        name,
        family: name,
    });
    const kid = await addKid(parent, kidName, 1);
    const other = await addKid(parent, otherName, 3);
    const authored = await parent.call("POST", "/api/content", {
        body: {
            body: `item ${name.toLowerCase()}.own v=1 skills=[count] {\n  title "${kidName}'s own"\n}\n`,
        },
    });
    const view = new Browser(config, ip);
    await sessionInto(view, me.family, me.user);
    const opened = await openView(view, [kid]);
    assert.equal(opened.status, 204, JSON.stringify(opened.body));
    const credential = view.jar.get("ls_kids") ?? "";
    return {
        parent,
        view,
        family: me.family,
        user: me.user,
        kid,
        other,
        keyId: credential.split(".")[1] ?? "",
        authored: text(at(authored.body, "content", "hash")),
    };
}

describe(
    "isolation between families, and a children's view's reach",
    { skip: reason ?? false },
    () => {
        before(async () => {
            if (!owner) return;
            await truncate(owner);
            sides.a = await build("Oakley", "Maya", "Theo", "198.51.100.21");
            sides.b = await build("Harlow", "Rosie", "Leo", "198.51.100.22");
            const a = side("a");
            const written = await a.view.call("POST", `/api/kid/${a.kid}/events`, {
                body: { events: [sitting(a.kid)] },
            });
            assert.equal(written.status, 200, JSON.stringify(written.body));
        });

        it("reads nothing of family B inside a session of family A, on every read route", async () => {
            const a = side("a");
            const b = side("b");
            assert.equal((await a.parent.call("GET", `/api/events?kid=${b.kid}`)).status, 404);
            assert.equal((await a.parent.call("GET", `/api/kids/${b.kid}/record`)).status, 404);
            assert.equal((await a.parent.call("GET", `/api/content/${b.authored}`)).status, 404);
            assert.equal((await a.parent.call("GET", `/api/content/${a.authored}`)).status, 200);
            const family = await a.parent.call("GET", "/api/family");
            assert.deepEqual(
                items(at(family.body, "kids")).map((k) => at(k, "id")),
                [a.kid, a.other],
            );
            assert.ok(items(at(family.body, "users")).every((u) => at(u, "id") !== b.user));
            const log = items(at((await a.parent.call("GET", "/api/events")).body, "events"));
            assert.ok(log.length > 0 && log.every((e) => at(e, "family_id") === a.family));
            const views = items(
                at((await a.parent.call("GET", "/api/kid-sessions")).body, "views"),
            );
            assert.deepEqual(
                views.map((v) => at(v, "kids")),
                [[a.kid]],
                "A's own view, and not B's",
            );
            const content = items(at((await a.parent.call("GET", "/api/content")).body, "content"));
            assert.deepEqual(
                content.map((c) => at(c, "hash")),
                [a.authored],
            );
        });

        it("finds no key for a credential that names family B with family A's key id and secret", async () => {
            const a = side("a");
            const b = side("b");
            const [, id, secret] = (a.parent.jar.get("ls_session") ?? "").split(".");
            const forged = new Browser(config);
            forged.jar.set("ls_session", `${b.family}.${id}.${secret}`);
            assert.equal((await forged.call("GET", "/api/me")).status, 401);
            const [, kid, kidSecret] = (a.view.jar.get("ls_kids") ?? "").split(".");
            const view = new Browser(config);
            view.jar.set("ls_kids", `${b.family}.${kid}.${kidSecret}`);
            const refused = await view.call("GET", "/api/kid");
            assert.deepEqual([refused.status, refused.body], [401, { error: "no-kid-session" }]);
            assert.ok(
                refused.cookies.some((c) => c.startsWith("ls_kids=;") && /Max-Age=0/.test(c)),
                "a cookie that opens nothing is cleared",
            );
        });

        it("lets a children's view read only the children it was opened for, and none of the family's own records", async () => {
            const a = side("a");
            const b = side("b");
            const view = await a.view.call("GET", "/api/kid");
            assert.deepEqual(
                items(at(view.body, "kids")).map((k) => at(k, "id")),
                [a.kid],
            );
            const state = await a.view.call("GET", `/api/kid/${a.kid}/state`);
            assert.equal(state.status, 200);
            assert.equal(at(state.body, "kid", "id"), a.kid);
            const events = items(at(state.body, "events"));
            assert.ok(events.length > 0);
            assert.ok(events.every((e) => at(e, "kid_id") === a.kid));
            assert.ok(
                events.every(
                    (e) =>
                        !["signed-in", "consent-given", "content-authored", "day-added"].includes(
                            text(at(e, "kind")),
                        ),
                ),
            );
            assert.equal(
                (await a.view.call("GET", `/api/kid/${a.other}/state`)).status,
                404,
                "a brother the view was not opened for",
            );
            assert.equal((await a.view.call("GET", `/api/kid/${b.kid}/state`)).status, 404);
            assert.equal(
                (await a.view.call("GET", `/api/kid/${a.kid}/content/${a.authored}`)).status,
                404,
                "a parent's own question is not the child's unless their log names it",
            );
        });

        it("stamps what a view sends with that child's key, no grown-up and the next place in its stream, whatever the draft claims", async () => {
            const a = side("a");
            const b = side("b");
            const draft = sitting(a.kid, {
                family_id: b.family,
                device: b.keyId,
                actor: a.user,
                seq: 999,
            });
            const sent = await a.view.call("POST", `/api/kid/${a.kid}/events`, {
                body: { events: [draft] },
            });
            assert.deepEqual(sent.body, { ids: [draft.id] });
            const log = items(
                at((await a.parent.call("GET", `/api/events?kid=${a.kid}`)).body, "events"),
            );
            const stored = log.find((e) => at(e, "id") === draft.id);
            assert.deepEqual(
                [
                    at(stored, "family_id"),
                    at(stored, "device"),
                    at(stored, "actor"),
                    at(stored, "seq"),
                ],
                [a.family, a.keyId, null, 1],
            );
            const again = await a.view.call("POST", `/api/kid/${a.kid}/events`, {
                body: { events: [draft] },
            });
            assert.deepEqual(again.body, { ids: [draft.id] }, "a resent draft is written once");
            const after = items(
                at((await a.parent.call("GET", `/api/events?kid=${a.kid}`)).body, "events"),
            );
            assert.equal(after.length, log.length);
        });

        it("refuses what a view may not send: another child, a kid's view for another family, a paper sitting, or too many at once", async () => {
            const a = side("a");
            const b = side("b");
            const refused = async (
                path: string,
                events: unknown[],
                status: number,
                why: RegExp,
            ) => {
                const res = await a.view.call("POST", path, { body: { events } });
                assert.equal(res.status, status, JSON.stringify(res.body));
                assert.match(JSON.stringify(res.body), why);
            };
            await refused(`/api/kid/${a.kid}/events`, [sitting(a.other)], 403, /this child/);
            await refused(`/api/kid/${a.other}/events`, [sitting(a.other)], 404, /not-found/);
            await refused(`/api/kid/${b.kid}/events`, [sitting(b.kid)], 404, /not-found/);
            await refused(
                `/api/kid/${a.kid}/events`,
                [
                    sitting(a.kid, {
                        data: {
                            sitting: "s",
                            lesson: "l",
                            lessonHash: "h",
                            pack: "p",
                            mode: "paper",
                        },
                    }),
                ],
                403,
                /screen sittings/,
            );
            await refused(
                `/api/kid/${a.kid}/events`,
                Array.from({ length: 51 }, () => sitting(a.kid)),
                413,
                /50 events/,
            );
            await refused(
                `/api/kid/${a.kid}/events`,
                [sitting(a.kid, { kind: "marked" })],
                400,
                /bad-envelope/,
            );
        });

        it("reads only the session cookie on an adult route and only the view's cookie on a kid route, whatever else comes with them", async () => {
            const a = side("a");
            const b = side("b");
            const kidOnly = new Browser(config);
            kidOnly.jar.set("ls_kids", a.view.jar.get("ls_kids") ?? "");
            for (const [method, path] of [
                ["GET", "/api/me"],
                ["GET", "/api/family"],
                ["GET", `/api/events?kid=${a.kid}`],
                ["POST", "/api/events"],
                ["GET", "/api/kid-sessions"],
                ["POST", "/api/family/pin"],
            ] as const)
                assert.equal(
                    (await kidOnly.call(method, path, { body: {} })).status,
                    401,
                    `a children's view reached ${method} ${path}`,
                );
            const parentOnly = new Browser(config);
            parentOnly.jar.set("ls_session", a.parent.jar.get("ls_session") ?? "");
            parentOnly.jar.set("ls_browser", a.parent.jar.get("ls_browser") ?? "");
            for (const [method, path] of [
                ["GET", "/api/kid"],
                ["GET", `/api/kid/${a.kid}/state`],
                ["POST", `/api/kid/${a.kid}/events`],
                ["POST", "/api/kid/leave"],
            ] as const) {
                const res = await parentOnly.call(method, path, {
                    body: { events: [], pin: "0000" },
                });
                assert.deepEqual(
                    [res.status, res.body],
                    [401, { error: "no-kid-session" }],
                    `a session reached ${method} ${path}`,
                );
            }
            parentOnly.jar.set("ls_kids", b.view.jar.get("ls_kids") ?? "");
            const me = await parentOnly.call("GET", "/api/me");
            assert.equal(
                at(me.body, "family", "id"),
                a.family,
                "B's view beside A's session is ignored",
            );
            assert.equal(
                (await parentOnly.call("GET", "/api/kid")).status,
                401,
                "a child credential copied without its browser binding is refused",
            );
            parentOnly.jar.set("ls_browser", b.view.jar.get("ls_browser") ?? "");
            const view = await parentOnly.call("GET", "/api/kid");
            assert.deepEqual(
                items(at(view.body, "kids")).map((k) => at(k, "id")),
                [b.kid],
                "and A's session beside B's view is ignored on a kid route",
            );
        });

        it("numbers a person's appends on their session, and returns a retried draft as it was stored", async () => {
            const a = side("a");
            const draft = (id: string, onDay: string) => ({
                id,
                kid_id: a.kid,
                kind: "day-added",
                data: { onDay, subject: "science", minutes: 90, note: "The museum." },
                at: `${onDay}T18:00:00.000Z`,
            });
            const first = randomUUID();
            const sent = await a.parent.call("POST", "/api/events", {
                body: { events: [draft(first, "2026-09-10"), draft(randomUUID(), "2026-09-11")] },
            });
            const rows = items(at(sent.body, "events"));
            const session = (a.parent.jar.get("ls_session") ?? "").split(".")[1];
            assert.ok(rows.every((r) => at(r, "device") === session && at(r, "actor") === a.user));
            const [s0, s1] = rows.map((r) => at(r, "seq"));
            assert.equal(typeof s0 === "number" && typeof s1 === "number" && s1 - s0, 1);
            const again = await a.parent.call("POST", "/api/events", {
                body: { events: [draft(first, "2026-09-10")] },
            });
            assert.equal(
                at(again.body, "events", 0, "seq"),
                s0,
                "the stored row, not a new number",
            );
            const childKind = await a.parent.call("POST", "/api/events", {
                body: { events: [{ ...draft(randomUUID(), "2026-09-12"), kind: "answered" }] },
            });
            assert.equal(
                childKind.status,
                400,
                "an answer with a day's data fails the edge check first",
            );
        });
    },
);
