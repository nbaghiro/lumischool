// A family's rows are unreachable from another family, on all seven tables. X is a parent in A and a
// tutor in B, because the real risk is someone who belongs to both sending the wrong family. Reads go
// through `withFamily` with no `family_id` filter, so what passes is the policies, not the query.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq, inArray, isNull, sql } from "drizzle-orm";
import type { Envelope } from "../../../engine/answer";
import { closeApp, open, withFamily, type FamilyTx, type Store } from "../client";
import { saveCatalogue, saveContent } from "../content";
import { append, createFamily, exportFamily } from "../events";
import { credentialOf, issue, issueCode, sha256, verifyKids } from "../keys";
import { TABLES, content, events, families, keys, kids, members, users } from "../schema";
import { PG, codeOf, must, prepare, truncate } from "./test-db";

const reason = await prepare();
const owner: Store | null = reason === null ? open() : null;

after(async () => {
    await closeApp();
    if (owner) await owner.close();
});

const A = "a0000000-0000-5000-8000-00000000000a";
const B = "b0000000-0000-5000-8000-00000000000b";
const UA = "a0000000-0000-5000-8000-0000000000a1";
const UB = "b0000000-0000-5000-8000-0000000000b1";
const UX = "c0000000-0000-5000-8000-0000000000c1";
const KA = "a0000000-0000-5000-8000-0000000000a2";
const KB = "b0000000-0000-5000-8000-0000000000b2";

const inA = { family: A, user: UA };

/** Ids learned while writing, per family. */
const made: Record<
    string,
    {
        view: string;
        viewCredential: string;
        session: string;
        content: string;
        members: string[];
        events: string[];
    }
> = {};

let seq = 0;
function answered(family: string, kid: string | null, device: string): Envelope {
    const id = crypto.randomUUID();
    return kid
        ? {
              id,
              family_id: family,
              kid_id: kid,
              kind: "answered",
              actor: null,
              device,
              seq: seq++,
              at: "2026-09-14T09:12:00.000Z",
              data: {
                  sitting: "s1",
                  q: {
                      lesson: "g1-making-ten",
                      lessonHash: "a".repeat(64),
                      section: "do",
                      n: 1,
                      item: "bonds.make-ten",
                      itemHash: "b".repeat(64),
                      variant: "n=7",
                      ask: "7 + ? = 10",
                      skills: ["bonds-to-10"],
                  },
                  given: { k: "number", text: "3" },
                  timing: { k: "paper" },
                  right: true,
                  tries: 1,
                  rule: null,
                  hints: 0,
              },
          }
        : {
              id,
              family_id: family,
              kid_id: null,
              kind: "day-added",
              actor: null,
              device,
              seq: seq++,
              at: "2026-09-16T10:00:00.000Z",
              data: { onDay: "2026-09-16", subject: "science", minutes: 60, note: "A museum." },
          };
}

/** Writes one family through the app role, as the server would. */
async function writeFamily(family: string, parent: string, kid: string): Promise<void> {
    await withFamily({ family, user: parent }, (tx) =>
        tx
            .insert(users)
            .values({ id: parent, email: `${parent.slice(-2)}@example.test` })
            .then(() => undefined),
    );
    await withFamily({ family, user: parent }, (tx) =>
        createFamily(tx, { id: family, name: `Family ${family.slice(0, 1)}`, time_zone: "UTC" }),
    );
    made[family] = await withFamily({ family, user: parent }, async (tx) => {
        await tx
            .insert(kids)
            .values({ id: kid, family_id: family, name: `Kid ${family.slice(0, 1)}`, grade: 2 });
        const view = await issue(tx, family, {
            kind: "kid-session",
            kid_id: kid,
            user_id: parent,
            name: "A children's view",
            detail: { view: crypto.randomUUID() },
        });
        const session = await issue(tx, family, {
            kind: "session",
            user_id: parent,
            name: "A phone",
        });
        const saved = await saveContent(tx, family, `item family.${family.slice(0, 1)} v=1 {\n}\n`);
        const envs = [answered(family, kid, view.id), answered(family, null, session.id)];
        await append(tx, envs);
        return {
            view: view.id,
            viewCredential: view.credential,
            session: session.id,
            content: saved.id,
            members: [],
            events: envs.map((e) => e.id),
        };
    });
}

/** B's row ids per table, read by the owner, which is the one role that can see them all. */
let bRows: Record<(typeof TABLES)[number], string[]> = {
    families: [],
    users: [],
    members: [],
    kids: [],
    keys: [],
    events: [],
    content: [],
};
let catalogueRow = "";
let noFamily: string[] = [];

describe("isolation between families", { skip: reason ?? false }, () => {
    const db = () => must(owner, "the owner connection");
    const madeIn = (family: string) => must(made[family], `the rows made in ${family}`);

    before(async () => {
        await truncate(db());
        await saveCatalogue(db().db, ["item bonds.make-ten v=1 {\n}\n"]);
        const [catalogue] = await db().db.select({ id: content.id }).from(content);
        catalogueRow = must(catalogue, "the catalogue row").id;

        await writeFamily(A, UA, KA);
        await writeFamily(B, UB, KB);

        // X signs up once, then joins A as a parent and B as a tutor on B's kid.
        await withFamily({ family: A, user: UX }, (tx) =>
            tx
                .insert(users)
                .values({ id: UX, email: "x@example.test" })
                .then(() => undefined),
        );
        await withFamily(inA, (tx) =>
            tx
                .insert(members)
                .values({ user_id: UX, family_id: A })
                .then(() => undefined),
        );
        await withFamily({ family: B, user: UB }, (tx) =>
            tx
                .insert(members)
                .values({
                    user_id: UX,
                    family_id: B,
                    kid_id: KB,
                    from_day: "2026-09-01",
                    to_day: "2026-12-31",
                })
                .then(() => undefined),
        );

        // Keys that belong to no family: two sign-in codes and a confirm code.
        await issueCode("sign-in", {
            hash: sha256("pending"),
            email: "someone@example.test",
            ip: null,
            accept: ["x"],
        });
        await issueCode("confirm", {
            hash: sha256("pending-confirm"),
            email: "new@example.test",
            ip: null,
            user_id: UA,
            accept: ["y"],
        });
        await issueCode("sign-in", {
            hash: sha256("pending-2"),
            email: "other@example.test",
            ip: null,
            accept: ["z"],
        });
        noFamily = (
            await db().db.select({ id: keys.id }).from(keys).where(isNull(keys.family_id))
        ).map((k) => k.id);
        assert.equal(noFamily.length, 3);

        const ids = async (q: Promise<{ id: string }[]>) => (await q).map((r) => r.id);
        bRows = {
            families: [B],
            users: [UB],
            members: await ids(
                db().db.select({ id: members.id }).from(members).where(eq(members.family_id, B)),
            ),
            kids: await ids(
                db().db.select({ id: kids.id }).from(kids).where(eq(kids.family_id, B)),
            ),
            keys: await ids(
                db().db.select({ id: keys.id }).from(keys).where(eq(keys.family_id, B)),
            ),
            events: await ids(
                db().db.select({ id: events.id }).from(events).where(eq(events.family_id, B)),
            ),
            content: await ids(
                db().db.select({ id: content.id }).from(content).where(eq(content.family_id, B)),
            ),
        };
        assert.equal(bRows.members.length, 2, "B's parent and X's tutor row");
        assert.equal(bRows.keys.length, 2);
        assert.equal(bRows.events.length, 2);
    });

    /** Every table, read with no filter at all, inside one transaction. */
    async function everything(tx: FamilyTx) {
        const ids = async (q: Promise<{ id: string }[]>) => (await q).map((r) => r.id).sort();
        return {
            families: await ids(tx.select({ id: families.id }).from(families)),
            users: await ids(tx.select({ id: users.id }).from(users)),
            members: await ids(tx.select({ id: members.id }).from(members)),
            kids: await ids(tx.select({ id: kids.id }).from(kids)),
            keys: await ids(tx.select({ id: keys.id }).from(keys)),
            events: await ids(tx.select({ id: events.id }).from(events)),
            content: await ids(tx.select({ id: content.id }).from(content)),
        };
    }

    it("shows a family every row of its own and none of the other's, on all seven tables, with no filter in the query", async () => {
        const seen = await withFamily(inA, everything);
        assert.deepEqual(seen.families, [A]);
        assert.deepEqual(seen.users, [UA, UX].sort(), "A's members, and nobody who is only in B");
        assert.equal(seen.members.length, 2, "A's two parents; X's tutor row in B is B's");
        assert.deepEqual(seen.kids, [KA]);
        assert.deepEqual(
            seen.keys,
            [madeIn(A).view, madeIn(A).session].sort(),
            "A's keys, not B's, and none of the keys with no family",
        );
        assert.deepEqual(seen.events, [...madeIn(A).events].sort());
        assert.deepEqual(
            seen.content,
            [madeIn(A).content, catalogueRow].sort(),
            "A's own content and the catalogue",
        );
        for (const table of TABLES) {
            assert.deepEqual(
                seen[table].filter((id) => bRows[table].includes(id)),
                [],
                `${table} showed B's rows to A`,
            );
        }
        assert.ok(noFamily.every((id) => !seen.keys.includes(id)));
    });

    it("updates nothing of the other family's, and cannot update events or content at all", async () => {
        const changed = await withFamily(inA, async (tx) => ({
            families: (
                await tx
                    .update(families)
                    .set({ name: "taken" })
                    .where(eq(families.id, B))
                    .returning({ id: families.id })
            ).length,
            users: (
                await tx
                    .update(users)
                    .set({ name: "taken" })
                    .where(eq(users.id, UB))
                    .returning({ id: users.id })
            ).length,
            members: (
                await tx
                    .update(members)
                    .set({ to_day: "2027-01-01" })
                    .where(inArray(members.id, bRows.members))
                    .returning({ id: members.id })
            ).length,
            kids: (
                await tx
                    .update(kids)
                    .set({ name: "taken" })
                    .where(eq(kids.id, KB))
                    .returning({ id: kids.id })
            ).length,
            keys: (
                await tx
                    .update(keys)
                    .set({ name: "taken" })
                    .where(inArray(keys.id, [...(bRows.keys ?? []), ...noFamily]))
                    .returning({ id: keys.id })
            ).length,
        }));
        assert.deepEqual(changed, { families: 0, users: 0, members: 0, kids: 0, keys: 0 });
        for (const table of [events, content]) {
            await assert.rejects(
                withFamily(inA, (tx) =>
                    tx.update(table).set({ family_id: B }).where(eq(table.family_id, B)),
                ),
                (e: unknown) => codeOf(e) === PG.denied,
            );
        }
        const [bName] = await db()
            .db.select({ name: families.name })
            .from(families)
            .where(eq(families.id, B));
        assert.equal(bName?.name, "Family b");
    });

    it("deletes nothing of the other family's, and cannot delete events at all", async () => {
        const removed = await withFamily(inA, async (tx) => ({
            families: (
                await tx.delete(families).where(eq(families.id, B)).returning({ id: families.id })
            ).length,
            users: (await tx.delete(users).where(eq(users.id, UB)).returning({ id: users.id }))
                .length,
            members: (
                await tx
                    .delete(members)
                    .where(inArray(members.id, bRows.members))
                    .returning({ id: members.id })
            ).length,
            kids: (await tx.delete(kids).where(eq(kids.id, KB)).returning({ id: kids.id })).length,
            keys: (
                await tx
                    .delete(keys)
                    .where(inArray(keys.id, [...(bRows.keys ?? []), ...noFamily]))
                    .returning({ id: keys.id })
            ).length,
            content: (
                await tx
                    .delete(content)
                    .where(inArray(content.id, [...bRows.content, catalogueRow]))
                    .returning({ id: content.id })
            ).length,
        }));
        assert.deepEqual(removed, {
            families: 0,
            users: 0,
            members: 0,
            kids: 0,
            keys: 0,
            content: 0,
        });
        await assert.rejects(
            withFamily(inA, (tx) => tx.delete(events).where(eq(events.family_id, B))),
            (e: unknown) => codeOf(e) === PG.denied,
        );
        const [row] = await db().raw<{ n: string }[]>`
            select (select count(*) from families where id = ${B}) + (select count(*) from kids where family_id = ${B})
                 + (select count(*) from members where family_id = ${B}) + (select count(*) from keys where family_id = ${B} or family_id is null)
                 + (select count(*) from events where family_id = ${B}) + (select count(*) from content where family_id = ${B} or family_id is null)
                 + (select count(*) from users where id = ${UB}) as n`;
        assert.equal(Number(row?.n), 1 + 1 + 2 + 2 + 3 + 2 + 2 + 1);
    });

    it("refuses an insert that names the other family's kid, or the other family, or no family", async () => {
        const attempts: [string, (tx: FamilyTx) => Promise<unknown>, string][] = [
            [
                "an event for A naming B's kid",
                (tx) => append(tx, [answered(A, KB, madeIn(A).view)]),
                PG.foreignKey,
            ],
            ["an event for B", (tx) => append(tx, [answered(B, KB, madeIn(A).view)]), PG.policy],
            [
                "a tutor in A on B's kid",
                (tx) =>
                    tx.insert(members).values({
                        user_id: UA,
                        family_id: A,
                        kid_id: KB,
                        from_day: "2026-09-01",
                        to_day: "2026-09-02",
                    }),
                PG.foreignKey,
            ],
            [
                "a member of B",
                (tx) => tx.insert(members).values({ user_id: UA, family_id: B }),
                PG.policy,
            ],
            [
                "a kid in B",
                (tx) => tx.insert(kids).values({ family_id: B, name: "planted", grade: 1 }),
                PG.policy,
            ],
            [
                "a children's view key in A for B's kid",
                (tx) =>
                    tx.insert(keys).values({
                        family_id: A,
                        kind: "kid-session",
                        hash: "p1",
                        kid_id: KB,
                        user_id: UA,
                    }),
                PG.foreignKey,
            ],
            [
                "a key in B",
                (tx) =>
                    tx
                        .insert(keys)
                        .values({ family_id: B, kind: "invite", hash: "p2", email: "a@b.test" }),
                PG.policy,
            ],
            [
                "a sign-in code, which only a definer function may write",
                (tx) => tx.insert(keys).values({ kind: "sign-in", hash: "p3", email: "a@b.test" }),
                PG.policy,
            ],
            [
                "a PIN with no family",
                (tx) => tx.insert(keys).values({ kind: "pin", hash: "p4" }),
                PG.policy,
            ],
            ["content in B", (tx) => saveContent(tx, B, "item planted.b v=1 {\n}\n"), PG.policy],
            [
                "catalogue content",
                (tx) =>
                    tx.execute(
                        sql`insert into content (family_id, body, name, kind) values (null, 'item planted.c v=1 {}', 'planted.c', 'item')`,
                    ),
                PG.policy,
            ],
            [
                "a new family that is not A",
                (tx) => tx.insert(families).values({ name: "planted", time_zone: "UTC" }),
                PG.policy,
            ],
            [
                "a user who is not the signed-in user",
                (tx) => tx.insert(users).values({ email: "planted@example.test" }),
                PG.policy,
            ],
        ];
        for (const [what, work, code] of attempts) {
            await assert.rejects(withFamily(inA, work), (e: unknown) => {
                assert.equal(codeOf(e), code, `${what}: ${String(e)}`);
                return true;
            });
        }
    });

    it("returns nothing, rather than everything or an error, when no family is set", async () => {
        const seen = await withFamily({ family: null }, everything);
        assert.deepEqual(
            seen,
            {
                families: [],
                users: [],
                members: [],
                kids: [],
                keys: [],
                events: [],
                content: [catalogueRow],
            },
            "only the catalogue, which is everybody's",
        );
        const self = await withFamily({ family: null, user: UX }, everything);
        assert.deepEqual(
            self.users,
            [UX],
            "a signed-in person with no family sees themselves and nothing else",
        );
        assert.deepEqual(self.members, []);
    });

    it("does not carry a family past its transaction on a connection the pool reuses", async () => {
        let reused = 0;
        for (let i = 0; i < 10; i++) {
            const first = await withFamily(inA, (tx) =>
                tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`),
            );
            const next = await withFamily({ family: null }, async (tx) => ({
                pid: must(
                    (await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`))[0],
                    "the backend pid",
                ).pid,
                setting: must(
                    (
                        await tx.execute<{ s: string | null }>(
                            sql`select current_setting('app.family', true) as s`,
                        )
                    )[0],
                    "the app.family setting",
                ).s,
                rows:
                    (await tx.select({ id: kids.id }).from(kids)).length +
                    (await tx.select({ id: keys.id }).from(keys)).length,
            }));
            if (must(first[0], "the first backend pid").pid === next.pid) reused++;
            assert.equal(next.rows, 0);
            assert.ok(
                next.setting === "" || next.setting === null,
                `app.family leaked as ${next.setting}`,
            );
        }
        assert.ok(reused > 0, "the pool never reused a connection, so this test proved nothing");
    });

    it("shows a person who belongs to both families only the family that is set", async () => {
        const asXinA = await withFamily({ family: A, user: UX }, everything);
        const asXinB = await withFamily({ family: B, user: UX }, everything);
        assert.deepEqual(asXinA.kids, [KA]);
        assert.deepEqual(asXinB.kids, [KB]);
        assert.deepEqual(asXinB.members.sort(), [...bRows.members].sort());
        assert.ok(!asXinB.users.includes(UA), "A's parent is not visible from B");
        assert.deepEqual(asXinB.keys, [...bRows.keys].sort());
    });

    it("refuses one family's credential when it names another family", async () => {
        const secret = must(madeIn(A).viewCredential.split(".")[2], "the credential's secret");
        assert.equal(await verifyKids([credentialOf(B, madeIn(A).view, secret)]), null);
        const ok = await verifyKids([madeIn(A).viewCredential]);
        assert.equal(ok?.family_id, A);
    });

    it("exports one family with none of the other's rows, and cannot export the other at all", async () => {
        const out = await withFamily(inA, (tx) => exportFamily(tx, A));
        const text = JSON.stringify(out);
        for (const id of [B, UB, KB, ...Object.values(bRows).flat()])
            assert.ok(!text.includes(id), `A's export contains ${id}`);
        assert.equal(out?.log.length, 2);
        assert.equal(await withFamily(inA, (tx) => exportFamily(tx, B)), null);
    });
});
