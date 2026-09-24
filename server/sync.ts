// Our own sync, and the reads the pages fold from (.docs/auth.md, "Sync" and "The binding checked on
// every append"): what a person and a children's view may read of a family's log, their appends, a
// child's state, and the family's content. Every event passes the edge check in engine/answer.ts,
// then the binding to its caller, then `appendAs`, which numbers it, all through `withFamily`.

import { randomUUID } from "node:crypto";
import { check, type Envelope, type EventKind } from "../engine/answer";
import { mayRead, mayWrite, reach, reaches, type Caller } from "../school/family/access";
import { childRecord } from "../school/family/family";
import { childWeek } from "../school/family/sheets";
import { addDays, dayIn } from "../school/record/record";
import type {
    FamilyView,
    GrownRecord,
    KidRecord,
    KidState,
    KidView,
    PackView,
    Problem,
} from "./api";
import { consented, type Adult, type KidSession } from "./auth";
import { withFamily, type FamilyTx } from "./db/client";
import { contentByHash, contentNamed, factsOf, familyContent, saveContent } from "./db/content";
import { appendAs, BadEnvelope, kidsOf, log, membersOf, peopleOf, person } from "./db/events";
import { hasPin, type KidKey } from "./db/keys";
import type { Content } from "./db/schema";
import type { Pack } from "./pack";

/** A request the caller may not make, answered with its status and a stable code (.docs/api.md). */
export class Refused extends Error {
    readonly status: number;
    readonly body: Problem;

    constructor(status: number, body: Problem) {
        super(`${status} ${body.error}${body.problem ? `: ${body.problem}` : ""}`);
        this.name = "Refused";
        this.status = status;
        this.body = body;
    }
}

/** The most a person's batch may hold, from auth.md's table of limits. The byte limit is the entry point's. */
export const BATCH = 500;

/** The most a children's view sends at once; its client's chunks hold no more (engine/ui/kid.ts). */
export const KID_BATCH = 50;

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const callerOf = (adult: Adult): Caller => (adult.parent ? "parent" : "tutor");

function batchOf(body: unknown, most: number): unknown[] {
    if (!isRecord(body) || !Array.isArray(body.events))
        throw new Refused(400, { error: "bad-request", problem: "the body is { events: [...] }" });
    if (body.events.length > most)
        throw new Refused(413, { error: "too-large", limit: `${most} events` });
    return body.events;
}

/** The family, its kids, its members and their names, as far as this person reaches, and whether it has a PIN. */
export async function familyView(adult: Adult): Promise<FamilyView> {
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        const kids = await kidsOf(tx, adult.family.id);
        const pin = await hasPin(tx);
        if (adult.parent)
            return {
                family: adult.family,
                kids,
                members: await membersOf(tx, adult.family.id),
                users: await peopleOf(tx, adult.family.id),
                pin,
            };
        const reached = reach(adult.rows, adult.today);
        const self = await person(tx, adult.user);
        return {
            family: adult.family,
            kids: kids.filter((k) => reached === "every kid" || reached.includes(k.id)),
            members: adult.rows,
            users: self ? [self] : [],
            pin,
        };
    });
}

async function kidIn(tx: FamilyTx, adult: Adult, kid: string): Promise<void> {
    if (!UUID.test(kid)) throw new Refused(400, { error: "bad-request", problem: "kid is a uuid" });
    const known = (await kidsOf(tx, adult.family.id)).some((k) => k.id === kid);
    if (!known || !reaches(adult.rows, kid, adult.today))
        throw new Refused(404, { error: "not-found" });
}

/**
 * A kid's log, or with no kid the whole family's, in the order it happened. A tutor names a kid their
 * window reaches today and reads only the kinds a tutor reads. `lesson` narrows it to that lesson's
 * own sittings, as the child's own state route does, for a page that draws one finished sheet.
 */
export async function eventsFor(
    adult: Adult,
    kid: string | null,
    options: { kinds?: EventKind[]; from?: string; to?: string; lesson?: string } = {},
): Promise<Envelope[]> {
    // the days are the family's, so the read is a day wider either side and narrowed in its zone
    const zone = adult.family.time_zone;
    const within = (e: Envelope): boolean => {
        const on = dayIn(e.at, zone);
        return (!options.from || on >= options.from) && (!options.to || on <= options.to);
    };
    const query = {
        family: adult.family.id,
        ...(options.kinds ? { kinds: options.kinds } : {}),
        ...(options.from ? { since: `${addDays(options.from, -1)}T00:00:00.000Z` } : {}),
        ...(options.to ? { before: `${addDays(options.to, 2)}T00:00:00.000Z` } : {}),
    };
    const only = (events: Envelope[]): Envelope[] =>
        options.lesson ? ofLesson(events, options.lesson) : events;
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        if (kid === null) {
            if (!adult.parent)
                throw new Refused(403, {
                    error: "not-allowed",
                    problem: "a tutor reads one kid's log",
                });
            return only((await log(tx, query)).filter(within));
        }
        await kidIn(tx, adult, kid);
        const caller = callerOf(adult);
        return only(
            (await log(tx, { ...query, kid })).filter((e) => mayRead(caller, e.kind) && within(e)),
        );
    });
}

function refusedWrite(error: unknown): never {
    if (error instanceof BadEnvelope)
        throw new Refused(400, { error: "bad-envelope", at: error.at, problem: error.problem });
    throw error;
}

/**
 * A person's appends. Each draft is checked as the envelope it will become, bound to this session
 * (family, person and device are the session's, never the draft's), to a kind this membership may
 * write, and to a kid they reach today; then the store numbers them under the family's lock.
 */
export async function appendDrafts(adult: Adult, body: unknown): Promise<Envelope[]> {
    if (
        isRecord(body) &&
        body.expected_family_id !== undefined &&
        body.expected_family_id !== adult.family.id
    )
        throw new Refused(403, { error: "not-allowed", problem: "the active family changed" });
    if (
        isRecord(body) &&
        body.expected_user_id !== undefined &&
        body.expected_user_id !== adult.user
    )
        throw new Refused(403, { error: "not-allowed", problem: "the active parent changed" });
    const batch = batchOf(body, BATCH);
    const caller = callerOf(adult);
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        const known = new Set((await kidsOf(tx, adult.family.id)).map((k) => k.id));
        const envelopes = batch.map((raw, at): Envelope => {
            const d = isRecord(raw) ? raw : {};
            const checked = check({
                id: d.id,
                family_id: adult.family.id,
                kid_id: d.kid_id ?? null,
                kind: d.kind,
                data: d.data,
                actor: adult.user,
                device: adult.session.id,
                seq: 0,
                at: d.at,
            });
            if (!checked.ok)
                throw new Refused(400, { error: "bad-envelope", at, problem: checked.problem });
            const e = checked.envelope;
            const why = mayWrite(caller, e);
            if (why) throw new Refused(403, { error: "not-allowed", at, problem: why });
            if (e.kid_id === null && !adult.parent)
                throw new Refused(403, {
                    error: "not-allowed",
                    at,
                    problem: "a tutor writes about their kid",
                });
            if (
                e.kid_id !== null &&
                (!known.has(e.kid_id) || !reaches(adult.rows, e.kid_id, adult.today))
            )
                throw new Refused(403, {
                    error: "not-allowed",
                    at,
                    problem: "that kid is not one this person reaches today",
                });
            return e;
        });
        try {
            return await appendAs(
                tx,
                adult.family.id,
                { device: adult.session.id, actor: adult.user },
                envelopes,
            );
        } catch (error) {
            return refusedWrite(error);
        }
    });
}

/** The key a children's view holds for one of its children, or 404 for a child it is not for. */
function keyFor(kid: KidSession, kidId: string): KidKey {
    const key = kid.keys.find((k) => k.kid_id === kidId);
    if (!key) throw new Refused(404, { error: "not-found" });
    return key;
}

/** The children a children's view is for, in the family's order, and whether the family has a PIN. */
export async function kidView(kid: KidSession): Promise<KidView> {
    return withFamily({ family: kid.family.id }, async (tx) => {
        const ids = new Set(kid.keys.map((k) => k.kid_id));
        const all = await kidsOf(tx, kid.family.id);
        const allowed = await consented(tx, kid.family.id);
        return {
            family: { name: kid.family.name, time_zone: kid.family.time_zone },
            kids: all.filter((k) => ids.has(k.id)),
            others: (kid.keys.some((key) => key.login) ? [] : all)
                .filter((k) => !ids.has(k.id) && allowed.has(k.id))
                .map((k) => ({ id: k.id, name: k.name })),
            pin: !kid.keys.some((key) => key.login) && (await hasPin(tx)),
        };
    });
}

/** A kid's own log, as far as a child's view reads it (school/family/access.ts). */
const kidLog = async (tx: FamilyTx, family: string, kid: string): Promise<Envelope[]> =>
    (await log(tx, { family, kid })).filter((e) => mayRead("kid", e.kind));

/** The events of one lesson: every event that names it, and the ends of the sittings that began it. */
function ofLesson(events: readonly Envelope[], lesson: string): Envelope[] {
    const sittings = new Set(
        events.flatMap((e) =>
            e.kind === "sitting-began" && e.data.lesson === lesson ? [e.data.sitting] : [],
        ),
    );
    return events.filter((e) => {
        switch (e.kind) {
            case "sitting-began":
                return e.data.lesson === lesson;
            case "sitting-ended":
                return sittings.has(e.data.sitting);
            case "answered":
            case "hint-opened":
            case "help-asked":
                return e.data.q.lesson === lesson;
            case "sheet-printed":
                return e.data.lesson === lesson;
            case "marked":
            case "responded":
                return e.data.q.lesson === lesson;
            default:
                return false;
        }
    });
}

/**
 * What one child sees in their view: their own row, the kinds of their log a child reads back, and the
 * tutors whose window is open today. Never a parent's note on a day, the family's authoring, anything
 * about who signed in, or anything of another child. With a lesson named, only that lesson's events,
 * which is how a view looks back at a finished lesson.
 */
export async function kidState(
    kid: KidSession,
    kidId: string,
    lesson: string | null = null,
): Promise<KidState> {
    keyFor(kid, kidId);
    return withFamily({ family: kid.family.id }, async (tx) => {
        const row = (await kidsOf(tx, kid.family.id)).find((k) => k.id === kidId);
        if (!row) throw new Refused(404, { error: "not-found" });
        const all = await kidLog(tx, kid.family.id, kidId);
        const events = lesson === null ? all : ofLesson(all, lesson);
        const people = await peopleOf(tx, kid.family.id);
        const tutors = (await membersOf(tx, kid.family.id)).flatMap((m) =>
            m.kid_id === kidId &&
            m.ended_at === null &&
            m.from_day !== null &&
            m.to_day !== null &&
            m.from_day <= kid.today &&
            kid.today <= m.to_day
                ? [{ name: people.find((p) => p.id === m.user_id)?.name ?? null, to_day: m.to_day }]
                : [],
        );
        return { kid: row, events, tutors };
    });
}

/** The pack the family's lessons are served from, or the reason there is none yet. */
export function packOf(pack: Pack | null): Pack {
    if (!pack)
        throw new Refused(503, {
            error: "server",
            problem: "no pack is built: run npm run pack and start the API again",
        });
    return pack;
}

export const packView = (pack: Pack | null): PackView => {
    const p = packOf(pack);
    return { pack: p.digest, index: p.index };
};

/** A lesson's file from the pack named, as JSON text, or 404 for any other pack or file. */
/** A file of the pack, a lesson's under `lessons/` or its first drawing's under `scenes/`, by the path the index names. */
export function packFile(pack: Pack | null, digest: string, path: string): string {
    const p = packOf(pack);
    const text = p.digest === digest ? p.file(path) : null;
    if (text === null) throw new Refused(404, { error: "not-found" });
    return text;
}

/** The pack as a child's view reads it, under that child's key. */
export function kidPack(kid: KidSession, kidId: string, pack: Pack | null): PackView {
    keyFor(kid, kidId);
    return packView(pack);
}

export function kidFile(
    kid: KidSession,
    kidId: string,
    pack: Pack | null,
    digest: string,
    path: string,
): string {
    keyFor(kid, kidId);
    return packFile(pack, digest, path);
}

/**
 * One child's record, folded from their log on the way out (school/family/family.ts): the plan as it
 * stands, each grade's progress, and the sitting left open. It is worked out on every read and never
 * stored, which keeps the log the one source and the answer small; a child's whole log ran to megabytes.
 */
export async function kidRecord(
    kid: KidSession,
    kidId: string,
    pack: Pack | null,
): Promise<KidRecord> {
    keyFor(kid, kidId);
    const p = packOf(pack);
    return withFamily({ family: kid.family.id }, async (tx) => {
        const row = (await kidsOf(tx, kid.family.id)).find((k) => k.id === kidId);
        if (!row) throw new Refused(404, { error: "not-found" });
        const events = await kidLog(tx, kid.family.id, kidId);
        const today = dayIn(new Date().toISOString(), kid.family.time_zone);
        return {
            kid: row,
            pack: p.digest,
            ...childRecord(events, row, p.index.lessons, kid.family.time_zone, today),
        };
    });
}

/**
 * One child as a parent's page reads them: the record their view reads, and the sheets that came back
 * with the one thing to look at, folded from their log on the way out as `kidRecord` is. Parents only,
 * since a tutor reads only the kinds a tutor reads and the fold needs the whole log.
 */
export async function grownRecord(
    adult: Adult,
    kidId: string,
    pack: Pack | null,
): Promise<GrownRecord> {
    if (!adult.parent)
        throw new Refused(403, {
            error: "not-allowed",
            problem: "a tutor reads one kid's log through /api/events",
        });
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        await kidIn(tx, adult, kidId);
        const row = (await kidsOf(tx, adult.family.id)).find((k) => k.id === kidId);
        if (!row) throw new Refused(404, { error: "not-found" });
        const p = packOf(pack);
        const events = await log(tx, { family: adult.family.id, kid: kidId });
        const zone = adult.family.time_zone;
        const today = dayIn(new Date().toISOString(), zone);
        const lessons = p.index.lessons;
        return {
            kid: row,
            pack: p.digest,
            ...childRecord(events, row, lessons, zone, today),
            ...childWeek(events, kidId, lessons, zone, today),
        };
    });
}

/**
 * What a child did, sent from their view (.docs/auth.md, "The binding checked on every append"). Each
 * draft is checked as the envelope it will become: the view's family, the child the path names and no
 * other, no grown-up as the actor, that child's key as the device, and a kind a child writes. The store
 * numbers them in that key's stream under the family's lock, and a draft whose id is stored already is
 * written once. The answer is the ids now stored, which the view takes out of its queue.
 */
export async function appendKid(
    kid: KidSession,
    kidId: string,
    body: unknown,
): Promise<{ ids: string[] }> {
    const key = keyFor(kid, kidId);
    const batch = batchOf(body, KID_BATCH);
    const envelopes = batch.map((raw, at): Envelope => {
        const d = isRecord(raw) ? raw : {};
        const checked = check({
            id: d.id,
            family_id: kid.family.id,
            kid_id: d.kid_id ?? null,
            kind: d.kind,
            data: d.data,
            actor: null,
            device: key.id,
            seq: 0,
            at: d.at,
        });
        if (!checked.ok)
            throw new Refused(400, { error: "bad-envelope", at, problem: checked.problem });
        const e = checked.envelope;
        const problem = e.kid_id !== kidId ? "kid_id is not this child's" : mayWrite("kid", e);
        if (problem) throw new Refused(403, { error: "not-allowed", at, problem });
        return e;
    });
    return withFamily({ family: kid.family.id }, async (tx) => {
        try {
            const stored = await appendAs(
                tx,
                kid.family.id,
                { device: key.id, actor: null },
                envelopes,
            );
            return { ids: stored.map((e) => e.id) };
        } catch (error) {
            return refusedWrite(error);
        }
    });
}

/**
 * A revision by hash. The catalogue is every family's; a family's own row goes to a parent, and to a
 * tutor or a child's view only when that kid's log names it, since a parent's question may carry a
 * sibling's name (auth.md, "What each caller may append, and read back").
 */
async function readable(
    tx: FamilyTx,
    family: string,
    hash: string,
    kid: string | null,
): Promise<Content> {
    const row = await contentByHash(tx, hash);
    if (!row) throw new Refused(404, { error: "not-found" });
    if (row.family_id === null || kid === null) return row;
    const named = (await log(tx, { family, kid })).some((e) =>
        JSON.stringify(e.data).includes(hash),
    );
    if (!named) throw new Refused(404, { error: "not-found" });
    return row;
}

export async function contentFor(adult: Adult, hash: string): Promise<Content> {
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        if (adult.parent) return readable(tx, adult.family.id, hash, null);
        const reached = reach(adult.rows, adult.today);
        for (const kid of reached === "every kid" ? [] : reached) {
            try {
                return await readable(tx, adult.family.id, hash, kid);
            } catch (error) {
                if (!(error instanceof Refused)) throw error;
            }
        }
        throw new Refused(404, { error: "not-found" });
    });
}

export async function contentForKid(
    kid: KidSession,
    kidId: string,
    hash: string,
): Promise<Content> {
    keyFor(kid, kidId);
    return withFamily({ family: kid.family.id }, (tx) => readable(tx, kid.family.id, hash, kidId));
}

/** The family's own revisions, or with a name every revision of it, the catalogue's too. Parents only for the family's list. */
export async function contentList(adult: Adult, name: string | null): Promise<Content[]> {
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        if (name !== null) {
            const rows = await contentNamed(tx, adult.family.id, name);
            return adult.parent ? rows : rows.filter((r) => r.family_id === null);
        }
        if (!adult.parent)
            throw new Refused(403, {
                error: "not-allowed",
                problem: "a tutor does not list the family's content",
            });
        return familyContent(tx, adult.family.id);
    });
}

/**
 * A question a parent wrote: the content row and its `content-authored`, in one transaction, under
 * this session's stamp. The name and kind are the body's own declaration.
 */
export async function saveAuthored(
    adult: Adult,
    body: unknown,
): Promise<{ content: Content; event: Envelope }> {
    if (!adult.parent)
        throw new Refused(403, { error: "not-allowed", problem: "only a parent authors content" });
    if (!isRecord(body) || typeof body.body !== "string" || !body.body.trim())
        throw new Refused(400, {
            error: "bad-request",
            problem: "the body is { body: <notation> }",
        });
    const text = body.body;
    let facts: ReturnType<typeof factsOf>;
    try {
        facts = factsOf(text);
    } catch (error) {
        throw new Refused(400, {
            error: "bad-request",
            problem: error instanceof Error ? error.message : "not notation",
        });
    }
    const kind = facts.kind;
    if (kind === "pack")
        throw new Refused(400, { error: "bad-request", problem: "a family does not write a pack" });
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        const saved = await saveContent(tx, adult.family.id, text);
        const [event] = await appendAs(
            tx,
            adult.family.id,
            { device: adult.session.id, actor: adult.user },
            [
                {
                    id: randomUUID(),
                    kid_id: null,
                    kind: "content-authored",
                    data: { id: facts.name, kind, hash: saved.hash, model: null },
                    at: new Date().toISOString(),
                },
            ],
        );
        const row = await contentByHash(tx, saved.hash);
        if (!event || !row)
            throw new Error("saveAuthored: the row or its event is missing after writing it");
        return { content: row, event };
    });
}
