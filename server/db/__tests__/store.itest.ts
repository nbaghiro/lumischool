// Everything the schema holds that isolation.itest.ts and scope.itest.ts do not cover, against a real
// Postgres through the app role's one way in.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { after, beforeEach, describe, it } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { and, eq, sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
    EVENT_KINDS,
    check,
    type Envelope,
    type EventData,
    type EventKind,
} from "../../../engine/answer";
import { closeApp, open, withFamily, type Store } from "../client";
import { factsOf, saveCatalogue, saveContent } from "../content";
import {
    append,
    BadEnvelope,
    counts,
    createFamily,
    deleteFamily,
    deleteKid,
    exportFamily,
    log,
    nextSeq,
    visibleKids,
} from "../events";
import {
    credentialOf,
    endKids,
    hasPin,
    kidViewsOf,
    loginByAddress,
    issue,
    issueCode,
    myFamilies,
    openKids,
    pinFor,
    pinHash,
    pinTried,
    prove,
    setPin,
    sha256,
    useCode,
    verify,
    verifyKids,
} from "../keys";
import { apply } from "../migrations/migrate";
import { content, events, families, keys, kids, members, schema, users } from "../schema";
import { PG, codeOf, must, prepare, truncate } from "./test-db";

const reason = await prepare();
const owner: Store | null = reason === null ? open() : null;

after(async () => {
    await closeApp();
    if (owner) await owner.close();
});

const u = (n: number) => `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`;
const F = u(1);
const G = u(2);
const NAIB = u(11);
const SAM = u(12);
const KATE = u(13);
const GUY = u(14);
const MAYA = u(21);
const THEO = u(22);
const OTHER_KID = u(23);
const M_NAIB = u(31);
const M_SAM = u(32);
const M_KATE = u(33);
const M_GUY = u(34);
const VIEW_MAYA = u(41);
const VIEW_THEO = u(42);
const NAIB_PHONE = u(43);
const VIEW = u(44);

const used = (kind: "sign-in" | "confirm", hash: string) =>
    withFamily({ family: null }, (tx) => useCode(tx, kind, hash));

const q = {
    lesson: "g1-making-ten",
    lessonHash: "a".repeat(64),
    section: "do",
    n: 1,
    item: "bonds.make-ten",
    itemHash: "b".repeat(64),
    variant: "n=7",
    ask: "7 + ? = 10",
    skills: ["bonds-to-10"],
};

/**
 * One valid `data` of every kind, keyed by the kind, so this is a complete record over `EventData` the
 * same way the edge check is: adding a kind without a sample here is a type error.
 */
const SAMPLE: { [K in EventKind]: EventData[K] } = {
    "sitting-began": {
        sitting: "s1",
        lesson: q.lesson,
        lessonHash: q.lessonHash,
        pack: "p1",
        mode: "screen",
    },
    "sitting-ended": { sitting: "s1", finished: true, minutes: 24, withGrownUp: false },
    answered: {
        sitting: "s1",
        q,
        given: { k: "number", text: "3" },
        timing: { k: "screen", toFirstInput: 900, toAnswer: 400, leftPage: false },
        right: true,
        tries: 1,
        rule: null,
        hints: 0,
    },
    "hint-opened": { sitting: "s1", q, rung: 1 },
    "help-asked": { sitting: "s1", q, ask: "where", material: "bus" },
    "sheet-printed": {
        sheet: "h1",
        lesson: q.lesson,
        lessonHash: q.lessonHash,
        pack: "p1",
        paper: "A4",
        questions: [q],
        grownUps: true,
    },
    marked: {
        sheet: "h1",
        q,
        given: { k: "number", text: "3" },
        right: false,
        rule: "Count the empty squares.",
    },
    // A painting is responded to, never marked; this one was painted on the printed sheet.
    responded: {
        q,
        answer: null,
        sheet: "h1",
        noticed: ["A colour the child mixed", "Used on purpose in the picture"],
        note: null,
    },
    // Not in the seed, because there is no activity in the corpus to point at.
    "round-played": {
        round: {
            round: "r1",
            activity: "share.fair",
            kind: "share",
            activityHash: "c".repeat(64),
            values: "n=12",
            from: 3,
        },
        moves: [
            {
                say: "Move two to the left plate",
                key: "2|4",
                at: 4.2,
                gap: 4.2,
                dist: 2,
                undo: false,
            },
        ],
        outcome: "won",
        capped: false,
    },
    "plan-changed": { op: { op: "shift", from: "2026-09-14", weeks: 1 } },
    "world-chosen": {
        terms: { "1": ["farm", "harbour", "railway"] },
        tweaks: { meadow: { weather: "breezy" } },
    },
    "content-authored": { id: "oakley.make-ten", kind: "item", hash: "d".repeat(64), model: null },
    "content-verified": { hash: "d".repeat(64), errors: 0, played: null, verifier: "verify@0.1.0" },
    "day-added": { onDay: "2026-09-16", subject: "science", minutes: 90, note: "The water room." },
    "signed-in": { method: "email-code", session: NAIB_PHONE, shared: false },
    "signed-out": { everywhere: true },
    "session-changed": { session: NAIB_PHONE, change: "put-away" },
    "login-changed": { user: NAIB, change: "passkey-added" },
    "member-added": {
        user: KATE,
        name: "Kate",
        kid: MAYA,
        fromDay: "2026-09-10",
        toDay: "2026-10-16",
        invitedBy: NAIB,
    },
    "member-changed": { user: KATE, kid: MAYA, fromDay: "2026-09-10", toDay: "2026-11-16" },
    "member-removed": { user: KATE, kid: MAYA, left: false },
    "consent-given": { kid: MAYA, notice: "2026-09", method: "email-plus" },
    "consent-withdrawn": { kid: MAYA, notice: "2026-09" },
    "kid-session-opened": { view: VIEW, keys: [{ kid: MAYA, key: VIEW_MAYA }] },
    "kid-session-ended": { view: VIEW, keys: [{ kid: MAYA, key: VIEW_MAYA }], reason: "pin" },
    "pin-set": {},
    "kid-deleted": { kid: MAYA },
    exported: {},
};

let nextId = 1000;
function envelope<K extends EventKind>(
    kind: K,
    seq: number,
    over: Partial<Envelope> = {},
): Envelope {
    return {
        id: u(nextId++),
        family_id: F,
        kid_id: MAYA,
        kind,
        data: SAMPLE[kind],
        actor: null,
        device: VIEW_MAYA,
        seq,
        at: "2026-09-14T09:12:00.000Z",
        ...over,
    } as Envelope;
}

/**
 * F: two parents, a tutor on Maya, two kids in one children's view and a session for Naib. G: one
 * parent and one kid. Written by the owner, one family and its parent per transaction, since a family
 * with no active parent cannot commit.
 */
async function fixtures(
    store: Store,
    opts: { secondParent?: boolean; tutor?: boolean } = {},
): Promise<void> {
    const { secondParent = true, tutor = true } = opts;
    await truncate(store);
    await store.db.insert(users).values([
        { id: NAIB, email: "naib@example.test", name: "Naib" },
        { id: SAM, email: "sam@example.test", name: "Sam" },
        { id: KATE, email: "kate@example.test", name: "Kate" },
        { id: GUY, email: "guy@example.test", name: "Guy" },
    ]);
    await store.db.transaction(async (tx) => {
        await tx.insert(families).values({ id: F, name: "Oakley", time_zone: "America/New_York" });
        await tx.insert(members).values({ id: M_NAIB, user_id: NAIB, family_id: F });
        await tx.insert(kids).values([
            { id: MAYA, family_id: F, name: "Maya", grade: 1 },
            { id: THEO, family_id: F, name: "Theo", grade: 3 },
        ]);
        if (secondParent)
            await tx.insert(members).values({ id: M_SAM, user_id: SAM, family_id: F });
        if (tutor)
            await tx.insert(members).values({
                id: M_KATE,
                user_id: KATE,
                family_id: F,
                kid_id: MAYA,
                from_day: "2026-10-05",
                to_day: "2026-11-16",
            });
        await tx.insert(keys).values([
            {
                id: VIEW_MAYA,
                family_id: F,
                kind: "kid-session",
                hash: sha256("view-maya"),
                kid_id: MAYA,
                user_id: NAIB,
                name: "Safari on an iPad",
                detail: { view: VIEW },
            },
            {
                id: VIEW_THEO,
                family_id: F,
                kind: "kid-session",
                hash: sha256("view-theo"),
                kid_id: THEO,
                user_id: NAIB,
                name: "Safari on an iPad",
                detail: { view: VIEW },
            },
            {
                id: NAIB_PHONE,
                family_id: F,
                kind: "session",
                hash: sha256("naib-phone"),
                user_id: NAIB,
                name: "Naib's phone",
            },
        ]);
    });
    await store.db.transaction(async (tx) => {
        await tx
            .insert(families)
            .values({ id: G, name: "Someone else", time_zone: "Europe/London" });
        await tx.insert(members).values({ id: M_GUY, user_id: GUY, family_id: G });
        await tx.insert(kids).values({ id: OTHER_KID, family_id: G, name: "Someone", grade: 2 });
    });
}

const inF = { family: F, user: NAIB };

async function refused(work: Promise<unknown>, code: string, match?: RegExp): Promise<void> {
    await assert.rejects(work, (error: unknown) => {
        assert.equal(codeOf(error), code, String(error));
        if (match) {
            // The rule's name is in the message for a constraint, and in constraint_name for a trigger
            // that raises on its behalf.
            // At commit the driver's own error arrives unwrapped, so the name can be on either.
            const e = error as {
                message?: string;
                constraint_name?: string;
                cause?: { message?: string; constraint_name?: string };
            };
            assert.match(
                `${e.message} ${e.constraint_name ?? ""} ${e.cause?.message ?? ""} ${e.cause?.constraint_name ?? ""}`,
                match,
            );
        }
        return true;
    });
}

/** Moves a key's `created_at` into the past, as the owner, to test expiry without waiting. */
async function age(store: Store, where: ReturnType<typeof eq>, minutes: number): Promise<void> {
    await store.db
        .update(keys)
        .set({ created_at: sql`utc_iso(now() - make_interval(mins => ${minutes}))` })
        .where(where);
}

describe("the store", { skip: reason ?? false }, () => {
    const db = () => must(owner, "the owner connection");

    beforeEach(async () => {
        await fixtures(db());
    });

    describe("the database it builds", () => {
        it("applies the migrations to a database that already has them without changing anything", async () => {
            const before = await db()
                .raw`select count(*)::int as n from drizzle.__drizzle_migrations`;
            await apply();
            const after_ = await db()
                .raw`select count(*)::int as n from drizzle.__drizzle_migrations`;
            assert.equal(
                must(after_[0], "the count after").n,
                must(before[0], "the count before").n,
            );
        });

        it("has the seven tables and the columns the schema declares, and no others", async () => {
            const declared = new Map<string, string[]>();
            for (const table of Object.values(schema)) {
                const config = getTableConfig(table);
                declared.set(config.name, config.columns.map((c) => c.name).sort());
            }
            const rows = await db().raw<{ table_name: string; column_name: string }[]>`
                select table_name, column_name from information_schema.columns where table_schema = 'public' order by 1, 2`;
            const live = new Map<string, string[]>();
            for (const row of rows)
                live.set(row.table_name, [...(live.get(row.table_name) ?? []), row.column_name]);
            assert.deepEqual([...live.keys()].sort(), [...declared.keys()].sort());
            assert.equal(live.size, Object.keys(schema).length);
            for (const [table, columns] of declared)
                assert.deepEqual(
                    live.get(table)?.sort(),
                    columns,
                    `the columns of ${table} differ`,
                );
        });

        it("holds no enum type, no view and no materialised view", async () => {
            const [row] = await db().raw<{ enums: number; views: number; matviews: number }[]>`
                select (select count(*)::int from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typtype = 'e' and n.nspname = 'public') as enums,
                       (select count(*)::int from pg_views where schemaname = 'public') as views,
                       (select count(*)::int from pg_matviews where schemaname = 'public') as matviews`;
            assert.deepEqual(row, { enums: 0, views: 0, matviews: 0 });
        });

        it("forces row-level security on every table and gives each a policy", async () => {
            const rows = await db().raw<
                { relname: string; rls: boolean; forced: boolean; policies: number }[]
            >`
                select c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as forced,
                       (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
                from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'`;
            assert.equal(rows.length, Object.keys(schema).length);
            for (const r of rows)
                assert.ok(
                    r.rls && r.forced && r.policies > 0,
                    `${r.relname}: rls ${r.rls}, forced ${r.forced}, ${r.policies} policies`,
                );
        });

        it("connects the app as a role that owns nothing and cannot bypass row-level security", async () => {
            const [role] = await db().raw<
                { rolsuper: boolean; rolbypassrls: boolean }[]
            >`select rolsuper, rolbypassrls from pg_roles where rolname = 'lumischool_app'`;
            assert.deepEqual(role, { rolsuper: false, rolbypassrls: false });
            const owners = await db().raw<
                { tableowner: string }[]
            >`select distinct tableowner from pg_tables where schemaname = 'public'`;
            assert.ok(!owners.some((o) => o.tableowner === "lumischool_app"));
            const [who] = await withFamily(inF, (tx) =>
                tx.execute<{ current_user: string }>(sql`select current_user`),
            );
            assert.equal(must(who, "the current user").current_user, "lumischool_app");
        });

        it("lets the app append to events but never update or delete them, and never update content", async () => {
            const [p] = await db().raw<Record<string, boolean>[]>`
                select has_table_privilege('lumischool_app', 'events', 'UPDATE') as ev_upd, has_table_privilege('lumischool_app', 'events', 'DELETE') as ev_del,
                       has_table_privilege('lumischool_app', 'content', 'UPDATE') as ct_upd, has_table_privilege('lumischool_app', 'events', 'INSERT') as ev_ins`;
            assert.deepEqual(p, { ev_upd: false, ev_del: false, ct_upd: false, ev_ins: true });
            await withFamily(inF, (tx) => append(tx, [envelope("answered", 0)]));
            await refused(
                withFamily(inF, (tx) =>
                    tx.update(events).set({ kind: "answered" }).where(eq(events.family_id, F)),
                ),
                PG.denied,
                /permission denied/,
            );
            await refused(
                withFamily(inF, (tx) => tx.delete(events).where(eq(events.family_id, F))),
                PG.denied,
                /permission denied/,
            );
        });
    });

    describe("memberships", () => {
        it("treats a membership with no kid as a parent and one with a kid and a window as a tutor", async () => {
            const rows = await withFamily(inF, (tx) =>
                tx.select().from(members).where(eq(members.family_id, F)),
            );
            assert.deepEqual(
                rows
                    .filter((r) => r.kid_id === null)
                    .map((r) => r.user_id)
                    .sort(),
                [NAIB, SAM].sort(),
            );
            assert.deepEqual(
                rows.filter((r) => r.kid_id !== null).map((r) => r.user_id),
                [KATE],
            );
        });

        it("refuses a parent with a window, and a tutor without a kid or without both days", async () => {
            const shapes: (typeof members.$inferInsert)[] = [
                { user_id: KATE, family_id: F, from_day: "2026-10-01", to_day: "2026-10-02" },
                { user_id: KATE, family_id: F, kid_id: THEO },
                { user_id: KATE, family_id: F, kid_id: THEO, from_day: "2026-10-01" },
                {
                    user_id: KATE,
                    family_id: F,
                    kid_id: THEO,
                    from_day: "2026-10-05",
                    to_day: "2026-10-01",
                },
            ];
            for (const row of shapes)
                await refused(
                    withFamily(inF, (tx) => tx.insert(members).values(row)),
                    PG.check,
                    /members_parent_or_tutor/,
                );
        });

        it("allows one parent row per person per family and one tutor row per person per kid", async () => {
            await refused(
                withFamily(inF, (tx) => tx.insert(members).values({ user_id: NAIB, family_id: F })),
                PG.unique,
                /members_parent_key/,
            );
            await refused(
                withFamily(inF, (tx) =>
                    tx.insert(members).values({
                        user_id: KATE,
                        family_id: F,
                        kid_id: MAYA,
                        from_day: "2026-12-01",
                        to_day: "2026-12-02",
                    }),
                ),
                PG.unique,
                /members_tutor_key/,
            );
            // The same tutor on the other kid is a second row, and allowed.
            await withFamily(inF, (tx) =>
                tx.insert(members).values({
                    user_id: KATE,
                    family_id: F,
                    kid_id: THEO,
                    from_day: "2026-12-01",
                    to_day: "2026-12-02",
                }),
            );
        });

        it("lets a parent be removed while another remains, keeps their name readable, and grants them nothing", async () => {
            await withFamily(inF, (tx) =>
                tx
                    .update(members)
                    .set({ ended_at: new Date().toISOString() })
                    .where(eq(members.id, M_SAM)),
            );
            const names = await withFamily(inF, (tx) =>
                tx.select({ name: users.name }).from(users),
            );
            assert.ok(
                names.some((n) => n.name === "Sam"),
                "a removed parent's name stays readable to the family",
            );
            assert.deepEqual(
                await withFamily(inF, (tx) => visibleKids(tx, F, SAM, "2026-10-10")),
                [],
            );
            assert.deepEqual(
                (await myFamilies(SAM)).map((f) => f.family_id),
                [],
            );
            assert.deepEqual(
                (await myFamilies(NAIB)).map((f) => f.family_id),
                [F],
            );
        });

        it("refuses to leave a family with no active parent: by delete, by ending, by making them a tutor, or by deleting their account", async () => {
            await fixtures(db(), { secondParent: false, tutor: false });
            const lastParent = /at least one parent/;
            await refused(
                withFamily(inF, (tx) => tx.delete(members).where(eq(members.id, M_NAIB))),
                PG.check,
                lastParent,
            );
            await refused(
                withFamily(inF, (tx) =>
                    tx
                        .update(members)
                        .set({ ended_at: new Date().toISOString() })
                        .where(eq(members.id, M_NAIB)),
                ),
                PG.check,
                lastParent,
            );
            await refused(
                withFamily(inF, (tx) =>
                    tx
                        .update(members)
                        .set({ kid_id: MAYA, from_day: "2026-10-01", to_day: "2026-10-02" })
                        .where(eq(members.id, M_NAIB)),
                ),
                PG.check,
                lastParent,
            );
            await refused(
                withFamily(inF, (tx) => tx.delete(users).where(eq(users.id, NAIB))),
                PG.check,
                lastParent,
            );
        });

        it("lets a family with one parent be deleted, taking the membership with it", async () => {
            await fixtures(db(), { secondParent: false, tutor: false });
            assert.equal(await withFamily(inF, (tx) => deleteFamily(tx, F)), true);
            assert.equal(
                (await db().db.select().from(members).where(eq(members.family_id, F))).length,
                0,
            );
        });

        it("refuses the second of two parents removed at the same moment", async () => {
            let deleted!: () => void;
            let release!: () => void;
            const firstDeleted = new Promise<void>((r) => (deleted = r));
            const gate = new Promise<void>((r) => (release = r));
            const first = withFamily(inF, async (tx) => {
                await tx.delete(members).where(eq(members.id, M_NAIB));
                deleted();
                await gate;
            });
            await firstDeleted;
            const second = withFamily({ family: F, user: SAM }, (tx) =>
                tx.delete(members).where(eq(members.id, M_SAM)),
            ).then(
                () => "removed",
                (error: unknown) => codeOf(error),
            );
            await sleep(300);
            release();
            await first;
            assert.equal(await second, PG.check);
            const parents = await db()
                .db.select()
                .from(members)
                .where(and(eq(members.family_id, F), sql`kid_id is null`));
            assert.deepEqual(
                parents.map((p) => p.user_id),
                [SAM],
            );
        });

        it("cannot commit a family with no parent, and creates a family with its first parent in one call", async () => {
            const H = u(3);
            await refused(
                withFamily({ family: H, user: NAIB }, (tx) =>
                    tx.insert(families).values({ id: H, name: "Orphan", time_zone: "UTC" }),
                ),
                PG.check,
                /families_have_a_parent/,
            );
            await withFamily({ family: H, user: NAIB }, (tx) =>
                createFamily(tx, { id: H, name: "Second", time_zone: "UTC" }),
            );
            const rows = await withFamily({ family: H, user: NAIB }, (tx) =>
                tx.select().from(members),
            );
            assert.deepEqual(
                rows.map((r) => [r.user_id, r.kid_id]),
                [[NAIB, null]],
            );
            // With nobody signed in there is no first parent, so there is no family.
            await assert.rejects(
                withFamily({ family: u(4) }, (tx) =>
                    createFamily(tx, { id: u(4), name: "Nobody", time_zone: "UTC" }),
                ),
            );
        });

        it("keeps one account per address however it is capitalised", async () => {
            const U = u(15);
            await refused(
                withFamily({ family: F, user: U }, (tx) =>
                    tx.insert(users).values({ id: U, email: "Naib@Example.test" }),
                ),
                PG.unique,
                /users_email_key/,
            );
        });
    });

    describe("keys", () => {
        it("lets only codes held before a family have none, a children's view key always name its kid and its parent, and a PIN name no kid, one to a family", async () => {
            await refused(
                db().db.insert(keys).values({ kind: "invite", hash: "x1", email: "a@b.test" }),
                PG.check,
                /keys_family_null_only_before_a_family/,
            );
            await refused(
                db().db.insert(keys).values({ kind: "pin", hash: "x2" }),
                PG.check,
                /keys_family_null_only_before_a_family/,
            );
            await refused(
                withFamily(inF, (tx) =>
                    tx.insert(keys).values({ family_id: F, kind: "session", hash: "x3" }),
                ),
                PG.check,
                /keys_session_names_a_user/,
            );
            await refused(
                withFamily(inF, (tx) =>
                    tx
                        .insert(keys)
                        .values({ family_id: F, kind: "kid-session", hash: "x4", kid_id: MAYA }),
                ),
                PG.check,
                /keys_kid_session_names_a_kid_and_a_parent/,
            );
            await refused(
                withFamily(inF, (tx) =>
                    tx.insert(keys).values({ family_id: F, kind: "pin", hash: "x5", kid_id: MAYA }),
                ),
                PG.check,
                /keys_pin_names_no_kid/,
            );
            await withFamily(inF, (tx) =>
                tx.insert(keys).values({ family_id: F, kind: "pin", hash: "x6" }),
            );
            await refused(
                withFamily(inF, (tx) =>
                    tx.insert(keys).values({ family_id: F, kind: "pin", hash: "x7" }),
                ),
                PG.unique,
                /keys_pin_key/,
            );
        });

        it("checks a children's view's credentials inside their own family, moves seen_at, and refuses a wrong secret, a wrong family or two families at once", async () => {
            const { credential, id } = await withFamily(inF, (tx) =>
                issue(tx, F, {
                    kind: "kid-session",
                    kid_id: MAYA,
                    user_id: NAIB,
                    name: "A browser",
                    detail: { view: VIEW },
                }),
            );
            const ok = await verifyKids([credential]);
            assert.deepEqual(
                ok?.keys.map((k) => [k.id, k.kid_id, k.user_id, k.view]),
                [[id, MAYA, NAIB, VIEW]],
            );
            const [row] = await db()
                .db.select({ seen_at: keys.seen_at })
                .from(keys)
                .where(eq(keys.id, id));
            assert.ok(row?.seen_at);
            assert.equal((await verifyKids([credential]))?.seen, false, "seen_at moves once a day");
            const secret = credential.split(".")[2] ?? "";
            assert.equal(await verifyKids([credentialOf(F, id, "not-the-secret")]), null);
            assert.equal(
                await verifyKids([credentialOf(G, id, secret)]),
                null,
                "under G's policy the key does not exist",
            );
            assert.equal(
                await verifyKids([credential, credentialOf(G, OTHER_KID, secret)]),
                null,
                "one browser's view belongs to one family",
            );
            assert.deepEqual(
                (await verifyKids([credentialOf(F, id, "not-the-secret"), credential]))?.keys.map(
                    (k) => k.id,
                ),
                [id],
                "a dead credential beside a live one is left out",
            );
            assert.equal(
                await verify(credential, ["session"]),
                null,
                "a children's view key is not a session",
            );
            assert.equal(
                await verifyKids([credentialOf(F, NAIB_PHONE, "naib-phone")]),
                null,
                "and a session is not a children's view",
            );
        });

        it("opens one key per child for a view, lists the family's open views, and ends a view by its id or by its keys", async () => {
            const opened = await withFamily(inF, (tx) =>
                openKids(tx, F, { user: NAIB, name: "Chrome on a Mac", kids: [MAYA, THEO] }),
            );
            assert.deepEqual(
                opened.keys.map((k) => k.kid),
                [MAYA, THEO],
            );
            const held = await verifyKids(opened.keys.map((k) => k.credential));
            assert.deepEqual(
                held?.keys.map((k) => k.view),
                [opened.view, opened.view],
            );
            const views = await withFamily(inF, (tx) => kidViewsOf(tx));
            assert.deepEqual(
                views.map((v) => [v.view, v.user_id, [...v.kids].sort()]),
                [
                    [VIEW, NAIB, [MAYA, THEO]],
                    [opened.view, NAIB, [MAYA, THEO]],
                ],
            );
            const maya = must(opened.keys[0], "Maya's key");
            assert.deepEqual(await withFamily(inF, (tx) => endKids(tx, { ids: [maya.key] })), [
                { kid: MAYA, key: maya.key, view: opened.view },
            ]);
            assert.deepEqual(
                (await withFamily(inF, (tx) => endKids(tx, { view: opened.view }))).map(
                    (k) => k.kid,
                ),
                [THEO],
            );
            assert.equal(await verifyKids(opened.keys.map((k) => k.credential)), null);
            assert.deepEqual(await withFamily(inF, (tx) => endKids(tx, { view: opened.view })), []);
            assert.deepEqual(
                await withFamily({ family: G, user: GUY }, (tx) => endKids(tx, { view: VIEW })),
                [],
                "another family's view is not there to end",
            );
            assert.equal(
                (await verifyKids([credentialOf(F, VIEW_MAYA, "view-maya")]))?.keys.length,
                1,
            );
        });

        it("expires a shared session after thirty idle minutes", async () => {
            const { credential, id } = await withFamily(inF, (tx) =>
                issue(tx, F, { kind: "shared-session", user_id: NAIB }),
            );
            await db()
                .db.update(keys)
                .set({ seen_at: sql`utc_iso(now() - interval '31 minutes')` })
                .where(eq(keys.id, id));
            assert.equal(await verify(credential, ["shared-session"]), null);
        });

        it("lets a key's created_at be set on insert, and a PIN's attempts and seen_at be written on each wrong try", async () => {
            // auth.md's store confirmations: a switched session keeps the first one's created_at, and
            // wrong PINs are counted on the PIN's own key.
            const carried = "2026-09-01T10:00:00.000Z";
            const [session] = await withFamily(inF, (tx) =>
                tx
                    .insert(keys)
                    .values({
                        family_id: F,
                        kind: "session",
                        hash: sha256("switched"),
                        user_id: NAIB,
                        created_at: carried,
                    })
                    .returning({ created_at: keys.created_at }),
            );
            assert.equal(session?.created_at, carried);
            await withFamily(inF, (tx) => setPin(tx, F, { user: NAIB, hash: sha256("a-pin") }));
            const moved = await withFamily(inF, (tx) =>
                tx
                    .update(keys)
                    .set({ attempts: sql`${keys.attempts} + 1`, seen_at: new Date().toISOString() })
                    .where(eq(keys.kind, "pin"))
                    .returning({ attempts: keys.attempts }),
            );
            assert.deepEqual(moved, [{ attempts: 1 }]);
        });

        it("limits sign-in and confirm codes per address, counted from the rows", async () => {
            const code = (hash: string) => ({
                hash,
                email: "Parent@Example.test",
                ip: "ip-1",
                accept: [hash],
            });
            assert.equal(await issueCode("sign-in", code("h1")), true);
            assert.equal(
                await issueCode("confirm", code("h2")),
                false,
                "one a minute, whichever kind",
            );
            await age(db(), eq(keys.hash, "h1"), 2);
            assert.equal(await issueCode("confirm", code("h2")), true);
            await age(db(), eq(keys.hash, "h2"), 3);
            assert.equal(await issueCode("sign-in", code("h3")), true);
            await age(db(), eq(keys.hash, "h3"), 4);
            assert.equal(await issueCode("sign-in", code("h4")), false, "three in fifteen minutes");
            const [row] = await db()
                .db.select({ email: keys.email })
                .from(keys)
                .where(eq(keys.hash, "h1"));
            assert.equal(
                row?.email,
                "parent@example.test",
                "stored lowercased, so the limit counts one address",
            );
        });

        it("finds a sign-in or confirm code only by its pending cookie, counts wrong guesses on it, and uses it once", async () => {
            for (const kind of ["sign-in", "confirm"] as const) {
                const pending = `pending-${kind}`;
                await issueCode(kind, {
                    hash: pending,
                    email: `${kind}@example.test`,
                    ip: null,
                    user_id: kind === "confirm" ? NAIB : null,
                    accept: ["the-code", "the-link"],
                });
                assert.deepEqual(await prove(kind, pending, "wrong"), {
                    outcome: "wrong",
                    attemptsLeft: 4,
                });
                for (let i = 0; i < 3; i++) await prove(kind, pending, "wrong");
                const [row] = await db()
                    .db.select({ attempts: keys.attempts })
                    .from(keys)
                    .where(eq(keys.hash, pending));
                assert.equal(row?.attempts, 4, `${kind}: wrong guesses are counted on the key`);
                assert.deepEqual(
                    await prove(kind === "sign-in" ? "confirm" : "sign-in", pending, "the-code"),
                    { outcome: "unknown" },
                    "a code of one kind is not the other",
                );
                assert.equal(await used(kind, pending), null, "an unproven code cannot be used");
                const proven = await prove(kind, pending, "the-link");
                assert.equal(proven.outcome === "right" && proven.email, `${kind}@example.test`);
                assert.equal(
                    (await prove(kind, pending, "anything")).outcome,
                    "right",
                    "a proven code stays proven until it is used, for the family choice",
                );
                assert.equal((await used(kind, pending))?.email, `${kind}@example.test`);
                assert.equal(await used(kind, pending), null, "used codes are deleted");
                assert.deepEqual(await prove(kind, pending, "the-code"), { outcome: "unknown" });
            }
            await issueCode("confirm", {
                hash: "dead",
                email: "dead@example.test",
                ip: null,
                accept: ["the-code"],
            });
            for (let i = 0; i < 4; i++) await prove("confirm", "dead", "wrong");
            assert.deepEqual(await prove("confirm", "dead", "wrong"), { outcome: "dead" });
            assert.deepEqual(
                await prove("confirm", "dead", "the-code"),
                { outcome: "dead" },
                "five wrong guesses and even the right one is refused",
            );
            await issueCode("sign-in", {
                hash: "empty",
                email: "empty@example.test",
                ip: null,
                accept: [],
            });
            assert.equal(
                (await prove("sign-in", "empty", "")).outcome,
                "wrong",
                "a code that accepts nothing accepts nothing",
            );
        });

        it("finds a login by its address however it is written, and nothing for an address with none", async () => {
            assert.equal(await loginByAddress("  NAIB@Example.test "), NAIB);
            assert.equal(await loginByAddress("nobody@example.test"), null);
        });

        it("keeps one PIN to a family, set again in place, counting wrong tries on it until a right one clears them", async () => {
            assert.equal(await withFamily(inF, (tx) => hasPin(tx)), false);
            await withFamily(inF, (tx) => setPin(tx, F, { user: NAIB, hash: sha256("pin-1") }));
            assert.equal(await withFamily(inF, (tx) => hasPin(tx)), true);
            const first = must(await withFamily(inF, (tx) => pinFor(tx)), "the PIN");
            assert.deepEqual([first.hash, first.attempts], [sha256("pin-1"), 0]);
            await withFamily(inF, async (tx) => {
                await pinTried(tx, first.id, false);
                await pinTried(tx, first.id, false);
            });
            const tried = must(await withFamily(inF, (tx) => pinFor(tx)), "the PIN");
            assert.equal(tried.attempts, 2);
            assert.ok(tried.seen_at, "a wrong try says when it was");
            await withFamily(inF, (tx) => pinTried(tx, first.id, true));
            assert.equal((await withFamily(inF, (tx) => pinFor(tx)))?.attempts, 0);
            await withFamily(inF, (tx) => pinTried(tx, first.id, false));
            await withFamily(inF, (tx) => setPin(tx, F, { user: NAIB, hash: sha256("pin-2") }));
            const again = must(await withFamily(inF, (tx) => pinFor(tx)), "the PIN");
            assert.deepEqual(
                [again.hash, again.attempts],
                [sha256("pin-2"), 0],
                "set again, with no wrong tries",
            );
            assert.equal((await db().db.select().from(keys).where(eq(keys.kind, "pin"))).length, 1);
            assert.equal(
                await withFamily({ family: G, user: GUY }, (tx) => pinFor(tx)),
                null,
                "another family's PIN is not there",
            );
            assert.notEqual(
                pinHash("pepper", F, "2468"),
                pinHash("pepper", G, "2468"),
                "the same digits hash apart in two families",
            );
        });

        it("keeps codes with no family out of reach of the app role except through the functions", async () => {
            await issueCode("sign-in", {
                hash: "pending-9",
                email: "d@example.test",
                ip: null,
                accept: ["x"],
            });
            await issueCode("confirm", {
                hash: "confirm-9",
                email: "e@example.test",
                ip: null,
                accept: ["y"],
            });
            const seen = await withFamily(inF, (tx) =>
                tx
                    .select()
                    .from(keys)
                    .where(sql`${keys.family_id} is null`),
            );
            assert.equal(seen.length, 0);
        });
    });

    describe("the log", () => {
        it("round-trips every event kind the union declares, byte for byte, with the type only in kind", async () => {
            const batch = EVENT_KINDS.map((kind, i) => envelope(kind, i));
            assert.equal(
                (await withFamily(inF, (tx) => append(tx, batch))).written,
                EVENT_KINDS.length,
            );
            const read = await withFamily(inF, (tx) => log(tx, { family: F }));
            assert.deepEqual(read.map((r) => r.kind).sort(), [...EVENT_KINDS].sort());
            for (const r of read) {
                assert.deepEqual(r.data, SAMPLE[r.kind]);
                assert.ok(!("t" in (r.data as object)));
            }
        });

        it("writes a replayed upload once, by id", async () => {
            const batch = [envelope("sitting-began", 0), envelope("answered", 1)];
            assert.deepEqual(await withFamily(inF, (tx) => append(tx, batch)), {
                written: 2,
                skipped: 0,
            });
            assert.deepEqual(await withFamily(inF, (tx) => append(tx, batch)), {
                written: 0,
                skipped: 2,
            });
        });

        it("refuses a different event at a place in a writer's sequence another event holds", async () => {
            await withFamily(inF, (tx) => append(tx, [envelope("answered", 0)]));
            await refused(
                withFamily(inF, (tx) => append(tx, [envelope("answered", 0)])),
                PG.unique,
                /events_family_device_seq_key/,
            );
            assert.equal(await withFamily(inF, (tx) => nextSeq(tx, F, VIEW_MAYA)), 1);
        });

        it("refuses a whole batch when one envelope is bad, and refuses a type inside data", async () => {
            const bad = { ...envelope("answered", 1), data: { sitting: "s1" } };
            await assert.rejects(
                withFamily(inF, (tx) => append(tx, [envelope("sitting-began", 0), bad])),
                (e: unknown) => e instanceof BadEnvelope && e.at === 1,
            );
            assert.equal((await withFamily(inF, (tx) => log(tx, { family: F }))).length, 0);
            assert.equal(
                check({ ...envelope("answered", 0), data: { ...SAMPLE.answered, t: "answered" } })
                    .ok,
                false,
            );
            assert.equal(check({ ...envelope("answered", 0), kind: "invented-kind" }).ok, false);
            assert.equal(check({ ...envelope("answered", 0), id: "not-a-uuid" }).ok, false);
        });

        it("keeps the three dates of a printed sheet and reads the log in the order things happened", async () => {
            await withFamily(inF, (tx) =>
                append(tx, [
                    envelope("marked", 1, {
                        at: "2026-09-20T19:20:00.000Z",
                        actor: KATE,
                        device: NAIB_PHONE,
                    }),
                    envelope("sheet-printed", 0, {
                        at: "2026-09-13T20:15:00.000Z",
                        actor: NAIB,
                        device: NAIB_PHONE,
                    }),
                    envelope("sitting-ended", 0, { at: "2026-09-15T09:38:00.000Z" }),
                ]),
            );
            const read = await withFamily(inF, (tx) => log(tx, { family: F }));
            assert.deepEqual(
                read.map((r) => r.at.slice(0, 10)),
                ["2026-09-13", "2026-09-15", "2026-09-20"],
            );
            assert.deepEqual(
                read.map((r) => r.actor),
                [NAIB, null, KATE],
            );
        });

        it("counts a family's events by kind", async () => {
            await withFamily(inF, (tx) =>
                append(tx, [
                    envelope("sitting-began", 0),
                    envelope("answered", 1),
                    envelope("answered", 2),
                ]),
            );
            assert.deepEqual(await withFamily(inF, (tx) => counts(tx, F)), {
                "sitting-began": 1,
                answered: 2,
            });
        });
    });

    describe("content", () => {
        it("generates every hash from its body and keeps every name and kind in agreement with it, over the whole catalogue", async () => {
            const root = new URL("../../../content/curriculum/", import.meta.url);
            const bodies = ["items", "lessons"].flatMap((dir) =>
                readdirSync(new URL(`${dir}/`, root))
                    .filter((f) => f.endsWith(".lumi"))
                    .map((f) => readFileSync(new URL(`${dir}/${f}`, root), "utf8")),
            );
            bodies.push(JSON.stringify({ name: "catalogue", vocabulary: 1, revisions: [] }));
            await saveCatalogue(db().db, bodies);
            await withFamily(inF, (tx) =>
                saveContent(
                    tx,
                    F,
                    must(
                        bodies.find((body) => factsOf(body).name === "bonds.make-ten"),
                        "bonds.make-ten",
                    ).replace("1..9", "1..19"),
                ),
            );
            const rows = await db().db.select().from(content);
            assert.equal(rows.length, bodies.length + 1);
            for (const r of rows) {
                assert.equal(
                    r.hash,
                    sha256(r.body),
                    `${r.name}: the generated hash is not the body's`,
                );
                assert.deepEqual(
                    { name: r.name, kind: r.kind },
                    factsOf(r.body),
                    `${r.name}: name and kind disagree with the body`,
                );
            }
        });

        it("stores the same body once per family, and the app can never update a revision", async () => {
            const body = "item oakley.q v=1 {\n}\n";
            const a = await withFamily(inF, (tx) => saveContent(tx, F, body));
            const b = await withFamily(inF, (tx) => saveContent(tx, F, body));
            assert.equal(a.id, b.id);
            await refused(
                withFamily(inF, (tx) =>
                    tx.update(content).set({ name: "renamed" }).where(eq(content.id, a.id)),
                ),
                PG.denied,
                /permission denied/,
            );
            assert.throws(() => factsOf("not notation"));
        });
    });

    describe("deletion and export", () => {
        it("deletes a kid with one statement, taking their events, their tutor's membership and their key in any children's view", async () => {
            await withFamily(inF, (tx) =>
                append(tx, [
                    envelope("answered", 0),
                    envelope("answered", 0, { kid_id: THEO, device: VIEW_THEO }),
                    envelope("plan-changed", 0, { kid_id: null, actor: NAIB, device: NAIB_PHONE }),
                ]),
            );
            await withFamily(inF, (tx) => saveContent(tx, F, "item oakley.q v=1 {\n}\n"));
            assert.equal(await withFamily(inF, (tx) => deleteKid(tx, MAYA)), true);
            const read = await withFamily(inF, (tx) => log(tx, { family: F }));
            assert.deepEqual(new Set(read.map((r) => r.kid_id)), new Set([THEO, null]));
            assert.equal(
                (await db().db.select().from(members).where(eq(members.user_id, KATE))).length,
                0,
            );
            assert.deepEqual(
                (
                    await db()
                        .db.select({ id: keys.id })
                        .from(keys)
                        .where(eq(keys.kind, "kid-session"))
                ).map((k) => k.id),
                [VIEW_THEO],
            );
            assert.equal(await verifyKids([credentialOf(F, VIEW_MAYA, "view-maya")]), null);
            assert.ok(
                await verifyKids([credentialOf(F, VIEW_THEO, "view-theo")]),
                "Theo's key in the same view stays",
            );
            assert.equal(
                (await db().db.select().from(content).where(eq(content.family_id, F))).length,
                1,
            );
        });

        it("deletes a family with one statement, taking every row of every table and nothing of another family's", async () => {
            await withFamily(inF, (tx) => append(tx, [envelope("answered", 0)]));
            await withFamily(inF, (tx) => saveContent(tx, F, "item oakley.q v=1 {\n}\n"));
            await withFamily({ family: G }, (tx) =>
                append(tx, [
                    envelope("answered", 0, { family_id: G, kid_id: OTHER_KID, device: u(99) }),
                ]),
            );
            assert.equal(await withFamily(inF, (tx) => deleteFamily(tx, F)), true);
            for (const [name, table] of [
                ["kids", kids],
                ["members", members],
                ["keys", keys],
                ["events", events],
                ["content", content],
            ] as const) {
                assert.equal(
                    (await db().db.select().from(table).where(eq(table.family_id, F))).length,
                    0,
                    `${name} still holds F`,
                );
            }
            assert.equal(
                (await db().db.select().from(families).where(eq(families.id, F))).length,
                0,
            );
            assert.equal(
                (await db().db.select().from(events).where(eq(events.family_id, G))).length,
                1,
            );
            assert.equal(
                (await db().db.select().from(users)).length,
                4,
                "logins are not the family's, so they stay",
            );
        });

        it("exports one family with its removed members' names, and without passkeys or any key's hash", async () => {
            await withFamily(inF, (tx) =>
                tx
                    .update(members)
                    .set({ ended_at: new Date().toISOString() })
                    .where(eq(members.id, M_KATE)),
            );
            await withFamily(inF, (tx) => append(tx, [envelope("answered", 0)]));
            const out = await withFamily(inF, (tx) => exportFamily(tx, F));
            assert.ok(out);
            assert.deepEqual(
                new Set(out.users.map((x) => x.name)),
                new Set(["Kate", "Naib", "Sam"]),
            );
            assert.equal(out.keys.length, 3);
            const text = JSON.stringify(out);
            for (const secret of ["view-maya", "view-theo", "naib-phone"])
                assert.ok(!text.includes(sha256(secret)));
            assert.ok(!text.includes("passkeys"));
            assert.equal(out.log.length, 1);
        });
    });

    describe("who sees which kid", () => {
        it("shows both parents every kid, the tutor her kid only inside her window, and a removed tutor nothing", async () => {
            const both = [MAYA, THEO].sort();
            assert.deepEqual(
                await withFamily(inF, (tx) => visibleKids(tx, F, NAIB, "2026-10-10")),
                both,
            );
            assert.deepEqual(
                await withFamily(inF, (tx) => visibleKids(tx, F, SAM, "2026-10-10")),
                both,
            );
            assert.deepEqual(
                await withFamily(inF, (tx) => visibleKids(tx, F, KATE, "2026-10-05")),
                [MAYA],
            );
            assert.deepEqual(
                await withFamily(inF, (tx) => visibleKids(tx, F, KATE, "2026-11-17")),
                [],
            );
            await withFamily(inF, (tx) =>
                tx
                    .update(members)
                    .set({ ended_at: new Date().toISOString() })
                    .where(eq(members.id, M_KATE)),
            );
            assert.deepEqual(
                await withFamily(inF, (tx) => visibleKids(tx, F, KATE, "2026-10-10")),
                [],
            );
        });
    });
});
