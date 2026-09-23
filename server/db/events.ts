// The log: append, read, export, delete a kid, and create a family, and the family's own rows the
// server reads around it (its kids, its members and their names). Every function takes the
// `FamilyTx` that `withFamily` opens. Queries still name their family as defence in depth; the
// isolation test proves the policies hold without it.

import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, inArray, isNull, lt, lte, max, or, sql } from "drizzle-orm";
import {
    check,
    type Draft,
    type Envelope,
    type EventData,
    type EventKind,
} from "../../engine/answer";
import type { FamilyTx } from "./client";
import {
    content,
    events,
    families,
    keys,
    kids,
    members,
    users,
    type Content,
    type Event,
    type Family,
    type Key,
    type Kid,
    type Member,
    type User,
} from "./schema";

/**
 * Creates a family with the signed-in user as its first parent, in one call. Run it inside
 * `withFamily` with the new family's id and the user set; the policies admit the two rows only then,
 * and a family with no active parent cannot commit.
 */
export async function createFamily(
    tx: FamilyTx,
    family: { id: string; name: string; time_zone: string },
): Promise<void> {
    await tx.execute(
        sql`select create_family(${family.id}::uuid, ${family.name}, ${family.time_zone})`,
    );
}

export interface Appended {
    /** How many rows the append actually added. */
    written: number;
    /** How many were already there, by id. A replayed upload is all skipped. */
    skipped: number;
}

/** Thrown when an envelope does not pass the edge check in engine/answer.ts. */
export class BadEnvelope extends Error {
    /** Which envelope in the batch. */
    readonly at: number;
    readonly problem: string;

    constructor(at: number, problem: string) {
        super(`envelope ${at}: ${problem}`);
        this.name = "BadEnvelope";
        this.at = at;
        this.problem = problem;
    }
}

/**
 * Idempotent by id, so a replayed upload writes nothing twice. A batch with one bad envelope writes
 * nothing, since keeping its neighbours would hide a gap in `seq`, and a new id at a `seq` another
 * event holds fails loudly rather than being dropped as a duplicate.
 */
export async function append(tx: FamilyTx, batch: unknown[]): Promise<Appended> {
    if (batch.length === 0) return { written: 0, skipped: 0 };

    const valid: Envelope[] = [];
    batch.forEach((raw, i) => {
        const result = check(raw);
        if (!result.ok) throw new BadEnvelope(i, result.problem);
        valid.push(result.envelope);
    });

    const written = await tx
        .insert(events)
        .values(valid)
        .onConflictDoNothing({ target: events.id })
        .returning({ id: events.id });

    return { written: written.length, skipped: valid.length - written.length };
}

/**
 * Whether an append failed because an event claimed a place in a writer's stream that another event
 * holds, which the caller answers with the writer's next free number rather than as a fault.
 */
export function isSeqClash(error: unknown): boolean {
    for (let e: unknown = error; typeof e === "object" && e !== null;) {
        if ("constraint_name" in e && e.constraint_name === "events_family_device_seq_key")
            return true;
        e = "cause" in e ? e.cause : null;
    }
    return false;
}

/** The counter a writer that lost its own should carry on from. */
export async function nextSeq(tx: FamilyTx, family: string, device: string): Promise<number> {
    const [row] = await tx
        .select({ highest: max(events.seq) })
        .from(events)
        .where(and(eq(events.family_id, family), eq(events.device, device)));
    return (row?.highest ?? -1) + 1;
}

export interface LogQuery {
    family: string;
    /** One kid's log. Omit for the whole family, including events that belong to no kid. */
    kid?: string;
    /** Only these kinds, for a read that folds one thing, such as consent. */
    kinds?: EventKind[];
    /** Events at or after this instant, and before `before`. */
    since?: string;
    before?: string;
}

/**
 * The only read the fold needs: a whole log in the order things happened, then each writer's order.
 * Each row is read back through the edge check, so a caller can narrow an event by its kind; a row
 * that fails it was written around the check, and that is an error to hear about.
 */
export async function log(tx: FamilyTx, q: LogQuery): Promise<Envelope[]> {
    const where = [eq(events.family_id, q.family)];
    if (q.kid !== undefined) where.push(eq(events.kid_id, q.kid));
    if (q.kinds !== undefined) where.push(inArray(events.kind, q.kinds));
    if (q.since !== undefined) where.push(gte(events.at, q.since));
    if (q.before !== undefined) where.push(lt(events.at, q.before));
    const rows = await tx
        .select()
        .from(events)
        .where(and(...where))
        .orderBy(asc(events.at), asc(events.device), asc(events.seq));
    return rows.map(envelopeOf);
}

function envelopeOf(row: Event): Envelope {
    const checked = check(row);
    if (!checked.ok)
        throw new Error(`event ${row.id} does not pass the edge check: ${checked.problem}`);
    return checked.envelope;
}

/**
 * The stamp on the events the server writes itself (.docs/auth.md, "The server's own events"), which
 * no key can have, since every key's id is a random uuid and this is the nil one.
 */
export const SERVER_DEVICE = "00000000-0000-0000-0000-000000000000";

/** Locks the family's row until the transaction ends, and returns it. Every writer the server numbers takes it first. */
export async function lockFamily(tx: FamilyTx, family: string): Promise<Family | null> {
    const [row] = await tx.select().from(families).where(eq(families.id, family)).for("update");
    return row ?? null;
}

/** An event the server writes: everything but the stamp, the number and the id, which it makes. */
export type Written = {
    [K in EventKind]: {
        kid_id: string | null;
        kind: K;
        data: EventData[K];
        actor: string | null;
        /** When it happened, if not now. */
        at?: string;
    };
}[EventKind];

/**
 * The server's own events, numbered on its stamp under the family's lock and inserted plainly, so a
 * clash is an error and never a silent skip: a skipped `consent-given` would be a missing proof.
 */
export async function record(
    tx: FamilyTx,
    family: string,
    written: Written[],
): Promise<Envelope[]> {
    if (written.length === 0) return [];
    await lockFamily(tx, family);
    let seq = await nextSeq(tx, family, SERVER_DEVICE);
    const now = new Date().toISOString();
    const out = written.map((w, i) => {
        const checked = check({
            id: randomUUID(),
            family_id: family,
            kid_id: w.kid_id,
            kind: w.kind,
            data: w.data,
            actor: w.actor,
            device: SERVER_DEVICE,
            seq: seq++,
            at: w.at ?? now,
        });
        if (!checked.ok) throw new BadEnvelope(i, checked.problem);
        return checked.envelope;
    });
    await tx.insert(events).values(out);
    return out;
}

/**
 * A person's appends: the server numbers them on the person's session under the family's lock, so
 * two tabs on one session never collide. A draft whose id is already stored is not numbered again,
 * so a retry leaves no gap, and every draft comes back as the row that is stored.
 */
export async function appendAs(
    tx: FamilyTx,
    family: string,
    writer: { device: string; actor: string | null },
    drafts: Draft[],
): Promise<Envelope[]> {
    if (drafts.length === 0) return [];
    await lockFamily(tx, family);
    const ids = drafts.map((d) => d.id);
    const before = await tx
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.family_id, family), inArray(events.id, ids)));
    const stored = new Set(before.map((r) => r.id));
    let seq = await nextSeq(tx, family, writer.device);
    await append(
        tx,
        drafts
            .filter((d) => !stored.has(d.id))
            .map((d) => ({
                ...d,
                family_id: family,
                actor: writer.actor,
                device: writer.device,
                seq: seq++,
            })),
    );
    const rows = await tx
        .select()
        .from(events)
        .where(and(eq(events.family_id, family), inArray(events.id, ids)));
    const byId = new Map(rows.map((r) => [r.id, envelopeOf(r)]));
    return drafts.flatMap((d) => byId.get(d.id) ?? []);
}

/** The family's row. */
export async function familyRow(tx: FamilyTx, family: string): Promise<Family | null> {
    const [row] = await tx.select().from(families).where(eq(families.id, family));
    return row ?? null;
}

/** The family's kids, the youngest grade first. */
export async function kidsOf(tx: FamilyTx, family: string): Promise<Kid[]> {
    return tx.select().from(kids).where(eq(kids.family_id, family)).orderBy(asc(kids.grade));
}

/** Every membership the family has had, ended ones included, so a removed member still has a name. */
export async function membersOf(tx: FamilyTx, family: string): Promise<Member[]> {
    return tx.select().from(members).where(eq(members.family_id, family));
}

/** One person's rows in the family: one for a parent, one per kid for a tutor. */
export async function rowsOf(tx: FamilyTx, family: string, user: string): Promise<Member[]> {
    return tx
        .select()
        .from(members)
        .where(and(eq(members.family_id, family), eq(members.user_id, user)));
}

/** Everyone who has been a member, by name and address. */
export async function peopleOf(
    tx: FamilyTx,
    family: string,
): Promise<Pick<User, "id" | "email" | "name" | "settings">[]> {
    const rows = await tx
        .selectDistinct({
            id: users.id,
            email: users.email,
            name: users.name,
            settings: users.settings,
        })
        .from(users)
        .innerJoin(members, and(eq(members.user_id, users.id), eq(members.family_id, family)));
    return rows;
}

/** A login, as its owner or a fellow member of the current family may read it. */
export async function person(
    tx: FamilyTx,
    user: string,
): Promise<Pick<User, "id" | "email" | "name" | "settings"> | null> {
    const [row] = await tx
        .select({ id: users.id, email: users.email, name: users.name, settings: users.settings })
        .from(users)
        .where(eq(users.id, user));
    return row ?? null;
}

/** A grown-up's own picture, by the shelf's name for it, kept in their settings beside whatever else is there. */
export async function savePicture(tx: FamilyTx, user: string, picture: string): Promise<void> {
    await tx
        .update(users)
        .set({ settings: sql`${users.settings} || ${JSON.stringify({ picture })}::jsonb` })
        .where(eq(users.id, user));
}

/**
 * The version of the consent notice the app shows. A `consent-given` names it, and a new wording is a
 * new version that every parent is asked to consent to again (.docs/auth.md, flow 4).
 */
export const CONSENT_NOTICE = "2026-09-weekly";

/** A kid, as the add-a-kid form writes one: a name, a grade and the settings a parent chose. */
export async function addKid(
    tx: FamilyTx,
    family: string,
    kid: Pick<Kid, "name" | "grade"> & { id?: string; settings?: Record<string, unknown> },
): Promise<Kid> {
    const [row] = await tx
        .insert(kids)
        .values({
            ...(kid.id ? { id: kid.id } : {}),
            family_id: family,
            name: kid.name,
            grade: kid.grade,
            settings: kid.settings ?? {},
        })
        .returning();
    if (!row) throw new Error("addKid: the insert returned no row");
    return row;
}

/** Writes a new login, or refreshes its name: run with `app.user` set to it, the only row a person may write. */
export async function saveLogin(
    tx: FamilyTx,
    user: Pick<User, "id" | "email" | "name">,
): Promise<void> {
    await tx
        .insert(users)
        .values(user)
        .onConflictDoUpdate({ target: users.id, set: { email: user.email, name: user.name } });
}

/** How many of each kind a family has. */
export async function counts(tx: FamilyTx, family: string): Promise<Record<string, number>> {
    const rows = await tx
        .select({ kind: events.kind, n: sql<number>`count(*)::int` })
        .from(events)
        .where(eq(events.family_id, family))
        .groupBy(events.kind);
    return Object.fromEntries(rows.map((r) => [r.kind, r.n]));
}

/**
 * The kids a user may read in this family on a given day. An active parent (no kid, not ended) sees
 * every kid; an active tutor sees their kid on the days inside their window; a membership with
 * `ended_at` set grants nothing. Row-level security has already narrowed the rows to one family; this
 * narrows them to one person inside it, which is a rule about a person and so is code.
 */
export async function visibleKids(
    tx: FamilyTx,
    family: string,
    user: string,
    onDay: string,
): Promise<string[]> {
    const rows = await tx
        .select({ kid: kids.id })
        .from(kids)
        .innerJoin(
            members,
            and(
                eq(members.family_id, kids.family_id),
                eq(members.user_id, user),
                isNull(members.ended_at),
                or(
                    isNull(members.kid_id),
                    and(
                        eq(members.kid_id, kids.id),
                        lte(members.from_day, onDay),
                        gte(members.to_day, onDay),
                    ),
                ),
            ),
        )
        .where(eq(kids.family_id, family));
    return [...new Set(rows.map((r) => r.kid))].sort();
}

export interface Export {
    family: Family;
    /** Everyone who has been a member, with their name, including those whose membership ended. */
    users: Pick<User, "id" | "email" | "name">[];
    members: Omit<Member, "id" | "family_id">[];
    kids: Omit<Kid, "family_id">[];
    /** The family's sessions, children's views and PIN, by name and when they were last seen. Never a hash. */
    keys: Pick<Key, "kind" | "name" | "kid_id" | "seen_at" | "created_at">[];
    content: Pick<Content, "hash" | "name" | "kind" | "body">[];
    log: Event[];
}

/**
 * Everything we hold about one family, as one value. Passkeys and every key's hash, detail, address
 * and network are left out: they are ours to check with, not the family's to keep.
 */
export async function exportFamily(tx: FamilyTx, id: string): Promise<Export | null> {
    const [family] = await tx.select().from(families).where(eq(families.id, id));
    if (!family) return null;

    const memberRows = await tx.select().from(members).where(eq(members.family_id, id));
    const userRows = await tx
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .innerJoin(members, and(eq(members.user_id, users.id), eq(members.family_id, id)));
    const kidRows = await tx.select().from(kids).where(eq(kids.family_id, id));
    const keyRows = await tx
        .select({
            kind: keys.kind,
            name: keys.name,
            kid_id: keys.kid_id,
            seen_at: keys.seen_at,
            created_at: keys.created_at,
        })
        .from(keys)
        .where(eq(keys.family_id, id));
    const contentRows = await tx.select().from(content).where(eq(content.family_id, id));

    return {
        family,
        users: [...new Map(userRows.map((u) => [u.id, u])).values()],
        members: memberRows.map(({ id: _id, family_id: _family, ...m }) => m),
        kids: kidRows.map(({ family_id: _family, ...k }) => k),
        keys: keyRows,
        content: contentRows.map((c) => ({
            hash: c.hash,
            name: c.name,
            kind: c.kind,
            body: c.body,
        })),
        log: await log(tx, { family: id }),
    };
}

/** One statement, cascading through the `(family_id, kid_id)` keys. The caller runs `exportFamily` first. */
export async function deleteKid(tx: FamilyTx, id: string): Promise<boolean> {
    const gone = await tx.delete(kids).where(eq(kids.id, id)).returning({ id: kids.id });
    return gone.length === 1;
}

/** Deletes a family and everything under it: the same cascade, one level up. */
export async function deleteFamily(tx: FamilyTx, id: string): Promise<boolean> {
    const gone = await tx
        .delete(families)
        .where(eq(families.id, id))
        .returning({ id: families.id });
    return gone.length === 1;
}
