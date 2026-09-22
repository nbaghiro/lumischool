// Fills the local database with one family's weeks, writing the way the server will: the catalogue as
// the owner through the one content path, and the family's rows through `withFamily` as the app role,
// so the seed also proves the policies let the legitimate writes through. Ids are derived from names,
// so a second run writes nothing new.

import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import {
    check,
    type AnyEventData,
    type Envelope,
    type EventData,
    type EventKind,
    type Given,
    type QuestionRef,
    type Timing,
} from "../../../engine/answer";
import { closeApp, open, ownerUrl, withFamily, type FamilyTx, type Store } from "../client";
import { saveCatalogue, saveContent } from "../content";
import { append, createFamily } from "../events";
import { sha256 } from "../keys";
import { families, keys, kids, members, users } from "../schema";
import {
    chooseVariant,
    cleanLessons,
    evalArithmetic,
    readCorpus,
    type Corpus,
    type ItemFacts,
    type LessonFacts,
} from "./corpus";
import {
    AUTHORED,
    FAMILY,
    KEYLESS_WRITERS,
    KEYS,
    KIDS,
    MARKED_DAYS_AFTER,
    PAPER_EVERY,
    PARENTS,
    PRINTED_DAYS_BEFORE,
    START_DAY,
    TUTORS,
    type KidSpec,
} from "./household";

const CONTENT = fileURLToPath(new URL("../../../content/curriculum", import.meta.url));

/** A uuid derived from a name, so re-seeding updates the same row rather than adding another. */
export function idFor(...parts: string[]): string {
    const h = createHash("sha256")
        .update(["lumischool-seed", ...parts].join(":"))
        .digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** A number from 0 to 99, derived rather than random, so the fixture is the same every time. */
function roll(...parts: (string | number)[]): number {
    return (
        parseInt(createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 8), 16) % 100
    );
}

const DAY_MS = 86_400_000;
const shift = (iso: string, days: number): string =>
    new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
const at = (day: string, time: string): string => `${day}T${time}:00.000Z`;

/** Weekdays only, because a family's week is Monday to Friday. */
function schoolDays(from: string, count: number): string[] {
    const days: string[] = [];
    for (let i = 0; days.length < count; i++) {
        const day = shift(from, i);
        const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
        if (weekday !== 0 && weekday !== 6) days.push(day);
    }
    return days;
}

/** One kid's lessons: clean ones of their grade, cycling their subjects, in corpus order. */
function lessonsFor(corpus: Corpus, kid: KidSpec): LessonFacts[] {
    const clean = cleanLessons(corpus);
    const bySubject = new Map(
        kid.subjects.map((subject) => [
            subject,
            clean.filter((l) => l.subject === subject && l.grade === kid.grade),
        ]),
    );
    const out: LessonFacts[] = [];
    for (let round = 0; out.length < kid.lessons; round++) {
        let added = false;
        for (const subject of kid.subjects) {
            const lesson = bySubject.get(subject)?.[round];
            if (!lesson) continue;
            out.push(lesson);
            added = true;
            if (out.length === kid.lessons) return out;
        }
        if (!added) break;
    }
    return out;
}

function refFor(
    lesson: LessonFacts,
    item: ItemFacts,
    section: string,
    n: number,
    pick: number,
): QuestionRef {
    const chosen = chooseVariant(item, pick);
    return {
        lesson: lesson.id,
        lessonHash: lesson.hash,
        section,
        n,
        item: item.id,
        itemHash: item.hash,
        variant: chosen.key,
        ask: chosen.ask,
        skills: item.skills,
    };
}

interface Judged {
    given: Given;
    right: boolean | null;
    tries: number;
    rule: string | null;
}

/**
 * Invented, except that the right answer is the item's own expression when it can be read, and a
 * matched rule is the item's own feedback. An answer that cannot be read stays unmarked.
 */
function judge(kid: KidSpec, item: ItemFacts, ref: QuestionRef, pick: number): Judged {
    const values = chooseVariant(item, pick).values;
    const answer = item.answerExpr === null ? null : evalArithmetic(item.answerExpr, values);
    if (answer === null) return { given: { k: "unmarked" }, right: null, tries: 1, rule: null };
    const right = roll(kid.key, ref.item, ref.variant, ref.n) < kid.rightInTen * 10;
    const off = (roll("off", ref.item, ref.n) % 2) + 1;
    return {
        given: { k: "number", text: String(right ? answer : answer - off) },
        right,
        tries: right ? 1 : 2,
        rule: right ? null : item.mistake,
    };
}

const screenTiming = (ref: QuestionRef): Timing => ({
    k: "screen",
    toFirstInput: 2_000 + roll("think", ref.item, ref.n) * 120,
    toAnswer: 900 + roll("type", ref.item, ref.n) * 40,
    leftPage: false,
});

const everyAdult = [...PARENTS, ...TUTORS];

interface Ids {
    family: string;
    user: Record<string, string>;
    kid: Record<string, string>;
    /** Every writer's device id: a key's id, or a fixed id for a writer with no key. */
    device: Record<string, string>;
}

function ids(): Ids {
    const device: Record<string, string> = Object.fromEntries(
        KEYS.map((k) => [k.key, idFor("key", k.key)]),
    );
    for (const w of Object.values(KEYLESS_WRITERS)) device[w] = idFor("key", w);
    return {
        family: idFor("family", FAMILY.key),
        user: Object.fromEntries(everyAdult.map((a) => [a.key, idFor("user", a.key)])),
        kid: Object.fromEntries(KIDS.map((k) => [k.key, idFor("kid", k.key)])),
        device,
    };
}

function defined<T>(value: T | undefined, what: string): T {
    if (value === undefined) throw new Error(`seed: ${what} is missing from the household`);
    return value;
}

const viewKeyOf = (kid: string): string =>
    defined(
        KEYS.find((k) => k.kind === "kid-session" && k.kid === kid),
        `a children's view key for ${kid}`,
    ).key;
const browserOf = (adult: string): string =>
    adult === "jo"
        ? KEYLESS_WRITERS.jo
        : defined(
              KEYS.find((k) => k.adult === adult && k.kind !== "kid-session"),
              `a browser for ${adult}`,
          ).key;

interface Written {
    writer: string;
    kid: string | null;
    actor: string | null;
    at: string;
    kind: EventKind;
    data: AnyEventData;
}

/** Keeps a written event's kind and data in step at the call site; `check` makes it an envelope later. */
const ev = <K extends EventKind>(w: {
    writer: string;
    kid: string | null;
    actor: string | null;
    at: string;
    kind: K;
    data: EventData[K];
}): Written => w;

/** Who marks a sheet: a tutor inside her window and before her removal, otherwise the kid's parent. */
function markerFor(kid: KidSpec, onDay: string): string {
    const tutor = TUTORS.find(
        (t) =>
            t.kid === kid.key &&
            onDay >= t.from_day &&
            onDay <= t.to_day &&
            (!t.ended_at || onDay < t.ended_at.slice(0, 10)),
    );
    return tutor ? tutor.key : kid.parent;
}

function buildLog(corpus: Corpus, id: Ids, pack: string, authoredHash: string): Written[] {
    const out: Written[] = [];
    for (const kid of KIDS) {
        const kid_id = defined(id.kid[kid.key], kid.key);
        const view = viewKeyOf(kid.key);
        const lessons = lessonsFor(corpus, kid);
        const days = schoolDays(START_DAY, lessons.length);
        const paper = lessons.map((_, i) => i).filter((i) => (i + 1) % PAPER_EVERY === 0);
        const lastPaper = paper.at(-1);

        lessons.forEach((lesson, i) => {
            const day = defined(days[i], `school day ${i}`);
            const onPaper = paper.includes(i);
            const sitting = idFor("sitting", kid.key, lesson.id);
            const sheet = idFor("sheet", kid.key, lesson.id);
            const asked = lesson.questions.map((q) => {
                const item = defined(corpus.items.get(q.item), q.item);
                return {
                    item,
                    ref: refFor(lesson, item, q.section, q.n, roll(kid.key, lesson.id, q.n)),
                };
            });
            const parent = defined(id.user[kid.parent], kid.parent);

            if (onPaper) {
                out.push(
                    ev({
                        writer: browserOf(kid.parent),
                        kid: kid_id,
                        actor: parent,
                        at: at(shift(day, -PRINTED_DAYS_BEFORE), "20:15"),
                        kind: "sheet-printed",
                        data: {
                            sheet,
                            lesson: lesson.id,
                            lessonHash: lesson.hash,
                            pack,
                            paper: "A4",
                            questions: asked.map((a) => a.ref),
                            grownUps: true,
                        },
                    }),
                );
            }
            // A paper sitting is recorded by the parent who sat with it, from their own browser; a screen
            // sitting by the kid's key on the tablet, with no grown-up as the actor.
            const writer = onPaper ? browserOf(kid.parent) : view;
            const actor = onPaper ? parent : null;
            out.push(
                ev({
                    writer,
                    kid: kid_id,
                    actor,
                    at: at(day, "09:12"),
                    kind: "sitting-began",
                    data: {
                        sitting,
                        lesson: lesson.id,
                        lessonHash: lesson.hash,
                        pack,
                        mode: onPaper ? "paper" : "screen",
                    },
                }),
            );

            if (!onPaper) {
                asked.forEach(({ item, ref }, q) => {
                    const verdict = judge(kid, item, ref, roll(kid.key, lesson.id, ref.n));
                    const minute = 13 + q * 3;
                    const opened =
                        verdict.right === false && roll("hint", kid.key, ref.item, ref.n) < 50;
                    if (opened) {
                        out.push(
                            ev({
                                writer: view,
                                kid: kid_id,
                                actor: null,
                                at: at(day, `09:${String(minute).padStart(2, "0")}`),
                                kind: "hint-opened",
                                data: { sitting, q: ref, rung: 1 },
                            }),
                        );
                    }
                    out.push(
                        ev({
                            writer: view,
                            kid: kid_id,
                            actor: null,
                            at: at(day, `09:${String(minute + 1).padStart(2, "0")}`),
                            kind: "answered",
                            data: {
                                sitting,
                                q: ref,
                                given: verdict.given,
                                timing: screenTiming(ref),
                                right: verdict.right,
                                tries: verdict.tries,
                                rule: verdict.rule,
                                hints: opened ? 1 : 0,
                            },
                        }),
                    );
                });
            }
            out.push(
                ev({
                    writer,
                    kid: kid_id,
                    actor,
                    at: at(day, "09:38"),
                    kind: "sitting-ended",
                    data: { sitting, finished: true, minutes: 26, withGrownUp: onPaper },
                }),
            );

            if (onPaper && i !== lastPaper) {
                const markedOn = shift(day, MARKED_DAYS_AFTER);
                const marker = markerFor(kid, markedOn);
                asked.forEach(({ item, ref }, q) => {
                    const verdict = judge(kid, item, ref, roll(kid.key, lesson.id, ref.n));
                    out.push(
                        ev({
                            writer: browserOf(marker),
                            kid: kid_id,
                            actor: defined(id.user[marker], marker),
                            at: at(markedOn, `17:${String(20 + q).padStart(2, "0")}`),
                            kind: "marked",
                            data: {
                                sheet,
                                q: ref,
                                given: verdict.given,
                                right: verdict.right ?? true,
                                rule: verdict.rule,
                            },
                        }),
                    );
                });
            }
        });
    }

    // The grown-ups' own events. Sam changes the plan, the second parent using equal rights; Naib
    // records a day out; Sam writes a question and the verifier, as the system, answers it.
    const sam = defined(id.user.sam, "sam");
    const naib = defined(id.user.naib, "naib");
    const maya = defined(id.kid.maya, "maya");
    out.push(
        ev({
            writer: browserOf("sam"),
            kid: maya,
            actor: sam,
            at: at(shift(START_DAY, 11), "21:04"),
            kind: "plan-changed",
            data: { op: { op: "shift", from: shift(START_DAY, 14), weeks: 1 } },
        }),
        ev({
            writer: browserOf("sam"),
            kid: maya,
            actor: sam,
            at: at(shift(START_DAY, 11), "21:06"),
            kind: "plan-changed",
            data: {
                op: {
                    op: "set-day",
                    onDay: shift(START_DAY, 16),
                    kind: "off",
                    lesson: null,
                    note: "Grandparents visiting",
                },
            },
        }),
        ev({
            writer: browserOf("sam"),
            kid: null,
            actor: sam,
            at: at(shift(START_DAY, 17), "18:30"),
            kind: "plan-changed",
            data: { op: { op: "track", track: "music", on: false, perWeek: 0 } },
        }),
        ev({
            writer: browserOf("naib"),
            kid: maya,
            actor: naib,
            at: at(shift(START_DAY, 16), "17:45"),
            kind: "day-added",
            data: {
                onDay: shift(START_DAY, 16),
                subject: "science",
                minutes: 120,
                note: "The science museum, the whole afternoon in the water room.",
            },
        }),
        ev({
            writer: browserOf(AUTHORED.by),
            kid: null,
            actor: defined(id.user[AUTHORED.by], AUTHORED.by),
            at: at(shift(START_DAY, 20), "22:10"),
            kind: "content-authored",
            data: { id: AUTHORED.name, kind: "item", hash: authoredHash, model: null },
        }),
        ev({
            writer: KEYLESS_WRITERS.verifier,
            kid: null,
            actor: null,
            at: at(shift(START_DAY, 20), "22:11"),
            kind: "content-verified",
            data: {
                hash: authoredHash,
                errors: AUTHORED.verdict.errors,
                played: AUTHORED.verdict.played,
                verifier: AUTHORED.verdict.verifier,
            },
        }),
    );
    return out;
}

/** Puts the written events into envelopes, numbering each writer's stream in its own order. */
function envelopes(written: Written[], id: Ids): Envelope[] {
    const byWriter = new Map<string, Written[]>();
    for (const w of written) byWriter.set(w.writer, [...(byWriter.get(w.writer) ?? []), w]);
    const out: Envelope[] = [];
    for (const [writer, list] of byWriter) {
        const device = id.device[writer];
        if (!device) throw new Error(`the seed has no device for ${writer}`);
        list.sort((a, b) => a.at.localeCompare(b.at));
        list.forEach((w, seq) => {
            const checked = check({
                id: idFor("event", writer, String(seq)),
                family_id: id.family,
                kid_id: w.kid,
                kind: w.kind,
                data: w.data,
                actor: w.actor,
                device,
                seq,
                at: w.at,
            });
            if (!checked.ok) throw new Error(`the seed wrote a bad ${w.kind}: ${checked.problem}`);
            out.push(checked.envelope);
        });
    }
    return out;
}

/** The catalogue revisions the seed's pack covers, and the pack's own manifest body. */
function catalogue(corpus: Corpus): { bodies: string[]; pack: string } {
    const bodies = new Map<string, string>();
    for (const lesson of cleanLessons(corpus)) {
        bodies.set(lesson.hash, lesson.body);
        for (const q of lesson.questions) {
            const item = corpus.items.get(q.item);
            if (item) bodies.set(item.hash, item.body);
        }
    }
    const revisions = [...bodies.keys()].sort();
    const manifest = JSON.stringify({ name: "catalogue", vocabulary: 1, revisions });
    return { bodies: [...bodies.values(), manifest], pack: sha256(manifest) };
}

async function writeFamily(tx: FamilyTx, id: Ids): Promise<void> {
    for (const kid of KIDS) {
        await tx
            .insert(kids)
            .values({
                id: defined(id.kid[kid.key], kid.key),
                family_id: id.family,
                name: kid.name,
                grade: kid.grade,
            })
            .onConflictDoUpdate({ target: kids.id, set: { name: kid.name, grade: kid.grade } });
    }
    const rows = [
        ...PARENTS.slice(1).map((p) => ({
            id: idFor("member", p.key),
            user_id: defined(id.user[p.key], p.key),
            family_id: id.family,
            kid_id: null,
            from_day: null,
            to_day: null,
            ended_at: null,
        })),
        ...TUTORS.map((t) => ({
            id: idFor("member", t.key),
            user_id: defined(id.user[t.key], t.key),
            family_id: id.family,
            kid_id: defined(id.kid[t.kid], t.kid),
            from_day: t.from_day,
            to_day: t.to_day,
            ended_at: t.ended_at ?? null,
        })),
    ];
    for (const row of rows) {
        await tx
            .insert(members)
            .values(row)
            .onConflictDoUpdate({
                target: members.id,
                set: { from_day: row.from_day, to_day: row.to_day, ended_at: row.ended_at },
            });
    }
    // Not usable secrets: the hash is of a string anyone reading this file could compute, which is
    // fine for a local fixture and is why the spike mints its own keys rather than borrowing these.
    for (const k of KEYS) {
        const device = id.device[k.key];
        if (!device) throw new Error(`the seed has no device for ${k.key}`);
        // A children's view's keys share one view id, as the family's page lists them.
        const detail = k.kind === "kid-session" ? { view: idFor("view", k.name) } : {};
        const row = {
            id: device,
            family_id: id.family,
            kind: k.kind,
            hash: sha256(`seed:${k.key}`),
            name: k.name,
            user_id: k.adult ? (id.user[k.adult] ?? null) : null,
            kid_id: k.kid ? (id.kid[k.kid] ?? null) : null,
            detail,
        };
        await tx
            .insert(keys)
            .values(row)
            .onConflictDoUpdate({ target: keys.id, set: { name: row.name } });
    }
}

/** The parent's copy of a catalogue item, with one range widened. */
function authoredBody(corpus: Corpus): string {
    const source = corpus.items.get(AUTHORED.from);
    if (!source) throw new Error(`the seed expects the catalogue to hold "${AUTHORED.from}"`);
    return source.body
        .replace(`item ${AUTHORED.from} `, `item ${AUTHORED.name} `)
        .replace(AUTHORED.change.find, AUTHORED.change.replace);
}

export interface Seeded {
    family: string;
    written: number;
    skipped: number;
    catalogueAdded: number;
    catalogue: number;
    sittings: number;
    answered: { fromTheItem: number; unmarked: number };
    marks: Record<string, number>;
}

export async function seed(owner: Store): Promise<Seeded> {
    const corpus = readCorpus(CONTENT);
    const id = ids();
    const cat = catalogue(corpus);
    const catalogueAdded = await saveCatalogue(owner.db, cat.bodies);

    // Each grown-up writes their own user row: the only user row the policy lets them write.
    for (const adult of everyAdult) {
        const user = defined(id.user[adult.key], adult.key);
        await withFamily({ family: id.family, user }, (tx) =>
            tx
                .insert(users)
                .values({ id: user, email: adult.email, name: adult.name })
                .onConflictDoUpdate({
                    target: users.id,
                    set: { email: adult.email, name: adult.name },
                })
                .then(() => undefined),
        );
    }

    // The first parent creates the family, and becomes its first parent, in one call.
    const [firstParent] = PARENTS;
    const first = defined(id.user[defined(firstParent, "a first parent").key], "the first parent");
    await withFamily({ family: id.family, user: first }, async (tx) => {
        const [exists] = await tx
            .select({ id: families.id })
            .from(families)
            .where(eq(families.id, id.family));
        if (!exists)
            await createFamily(tx, {
                id: id.family,
                name: FAMILY.name,
                time_zone: FAMILY.time_zone,
            });
    });

    const authored = authoredBody(corpus);
    const authoredHash = sha256(authored);
    const written = buildLog(corpus, id, cat.pack, authoredHash);
    const envs = envelopes(written, id);
    const result = await withFamily({ family: id.family, user: first }, async (tx) => {
        await writeFamily(tx, id);
        await saveContent(tx, id.family, authored);
        return append(tx, envs);
    });

    const marks: Record<string, number> = {};
    let fromTheItem = 0;
    let unmarked = 0;
    for (const e of envs) {
        if (e.kind === "answered") {
            if (e.data.given.k === "unmarked") unmarked++;
            else fromTheItem++;
        }
        if (e.kind === "marked" && e.actor) {
            const who = everyAdult.find((a) => id.user[a.key] === e.actor);
            if (who) marks[who.name] = (marks[who.name] ?? 0) + 1;
        }
    }
    return {
        family: id.family,
        written: result.written,
        skipped: result.skipped,
        catalogueAdded,
        catalogue: cat.bodies.length,
        sittings: written.filter((w) => w.kind === "sitting-began").length,
        answered: { fromTheItem, unmarked },
        marks,
    };
}

if (import.meta.filename === process.argv[1]) {
    const say = (line: string): void => {
        process.stdout.write(`${line}\n`);
    };
    const owner = open(ownerUrl());
    try {
        const out = await seed(owner);
        const marks = Object.entries(out.marks)
            .map(([who, n]) => `${who} (${n})`)
            .join(", ");
        say(
            `family ${out.family} (${FAMILY.name}): two parents, a tutor, a removed tutor, two kids in one children's view, ${out.sittings} sittings`,
        );
        say(
            `${out.catalogue} catalogue rows (revisions and the pack), ${out.catalogueAdded} new, written by the owner`,
        );
        say(
            `${out.written} events written, ${out.skipped} already there, all through withFamily as the app role`,
        );
        say(
            `${out.answered.fromTheItem} answers computed from the item's own expression, ${out.answered.unmarked} left unmarked`,
        );
        say(`marks entered by ${marks}`);
        say(
            "the family, the days, the timings and the marks are invented: see server/db/seed/household.ts",
        );
    } finally {
        await owner.close();
        await closeApp();
    }
}
