// Builds the demo from the same curriculum and game rules the product uses.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
    check,
    type AnyEventData,
    type Envelope,
    type EventData,
    type EventKind,
    type Given,
    type LoggedMove,
    type Outcome,
    type QuestionRef,
} from "../../../engine/answer";
import { closeApp, open, ownerUrl, withFamily, type FamilyTx, type Store } from "../client";
import { saveCatalogue, saveContent } from "../content";
import {
    addKid,
    append,
    CONSENT_NOTICE,
    createFamily,
    deleteFamily,
    familyRow,
    record,
    saveLogin,
    type Written,
} from "../events";
import { issue, LOCAL_PEPPER, loginByAddress, pinHash, setPin, sha256 } from "../keys";
import { members } from "../schema";
import { readCorpus, type LessonFacts } from "./corpus";
import {
    AUTHORED,
    DEMO,
    HOLIDAY_WEEK,
    KIDS,
    MISSED,
    MORE_READING,
    MUSEUM,
    TUTORS,
    UNFINISHED,
    WEEKS,
    type DemoKid,
    type DemoTrack,
    type Learner,
} from "./demo-household";
import { idFor } from "./seed";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const CONTENT = fileURLToPath(new URL("../../../content/curriculum", import.meta.url));
const ZONE = DEMO.family.time_zone;

interface Asked {
    section: string;
    n: number;
    item: string;
    itemHash: string;
    variant: string;
    ask: string;
    skills: string[];
    kind: "number" | "pick" | "word" | "unmarked";
    right: string | null;
    mistakes: { wrote: string; rule: string }[];
    slip: string | null;
    hints: string[];
}

interface Play {
    moves: LoggedMove[];
    outcome: Outcome;
    capped: boolean;
    from: number | null;
}

interface Work {
    /**
     * By lesson id: `hash` is the file's bytes, which the corpus read takes too, and `levelHash` is the
     * hash of the level these draws are of, which is what a sitting records (`QuestionRef.lessonHash`,
     * engine/pack.ts) and what the app compares a lesson against before it shows old answers.
     */
    lessons: Map<string, { hash: string; levelHash: string; draws: Asked[][] }>;
    items: Map<string, { hash: string; errors: number; draws: Asked[][] }>;
    activities: {
        id: string;
        kind: string;
        grades: number[];
        activityHash: string;
        versions: { values: string; plays: Play[] }[];
    }[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

function fail(what: string): never {
    throw new Error(`demo-work.ts answered with a bad ${what}`);
}

const text = (v: unknown, what: string): string => (typeof v === "string" ? v : fail(what));
const count = (v: unknown, what: string): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fail(what);
const texts = (v: unknown, what: string): string[] =>
    Array.isArray(v) ? v.map((x) => text(x, what)) : fail(what);
const list = (v: unknown, what: string): unknown[] => (Array.isArray(v) ? v : fail(what));
const entries = (v: unknown, what: string): [string, unknown][] =>
    isRecord(v) ? Object.entries(v) : fail(what);

const KINDS = ["number", "pick", "word", "unmarked"] as const;
const OUTCOMES = ["playing", "won", "gave up", "out of moves"] as const;

function askedOf(v: unknown): Asked {
    if (!isRecord(v)) fail("question");
    const kind = KINDS.find((k) => k === v.kind) ?? fail("answer kind");
    return {
        section: text(v.section, "section"),
        n: count(v.n, "number"),
        item: text(v.item, "item"),
        itemHash: text(v.itemHash, "item hash"),
        variant: text(v.variant, "variant"),
        ask: text(v.ask, "ask"),
        skills: texts(v.skills, "skills"),
        kind,
        right: v.right === null ? null : text(v.right, "right answer"),
        mistakes: list(v.mistakes, "mistakes").map((m) =>
            isRecord(m)
                ? { wrote: text(m.wrote, "mistake"), rule: text(m.rule, "rule") }
                : fail("mistake"),
        ),
        slip: v.slip === null ? null : text(v.slip, "slip"),
        hints: texts(v.hints, "hints"),
    };
}

function moveOf(v: unknown): LoggedMove {
    if (!isRecord(v) || typeof v.undo !== "boolean") fail("move");
    return {
        say: text(v.say, "move"),
        key: text(v.key, "move key"),
        at: count(v.at, "move time"),
        gap: count(v.gap, "move gap"),
        dist: v.dist === null ? null : count(v.dist, "distance"),
        undo: v.undo,
    };
}

function workOf(raw: unknown): Work {
    if (!isRecord(raw)) fail("answer");
    const draws = (v: unknown): Asked[][] =>
        list(v, "draws").map((d) => list(d, "draw").map(askedOf));
    return {
        lessons: new Map(
            entries(raw.lessons, "lessons").map(([id, l]) => [
                id,
                isRecord(l)
                    ? {
                          hash: text(l.hash, "hash"),
                          levelHash: text(l.levelHash, "level hash"),
                          draws: draws(l.draws),
                      }
                    : fail("lesson"),
            ]),
        ),
        items: new Map(
            entries(raw.items, "items").map(([id, i]) => [
                id,
                isRecord(i)
                    ? {
                          hash: text(i.hash, "hash"),
                          errors: count(i.errors, "errors"),
                          draws: draws(i.draws),
                      }
                    : fail("item"),
            ]),
        ),
        activities: list(raw.activities, "activities").map((a) => {
            if (!isRecord(a)) fail("activity");
            return {
                id: text(a.id, "activity"),
                kind: text(a.kind, "activity kind"),
                grades: list(a.grades, "grades").map((g) => count(g, "grade")),
                activityHash: text(a.activityHash, "activity hash"),
                versions: list(a.versions, "versions").map((ver) => {
                    if (!isRecord(ver)) fail("version");
                    return {
                        values: text(ver.values, "values"),
                        plays: list(ver.plays, "plays").map((p) => {
                            if (!isRecord(p) || typeof p.capped !== "boolean") fail("play");
                            return {
                                moves: list(p.moves, "moves").map(moveOf),
                                outcome: OUTCOMES.find((o) => o === p.outcome) ?? fail("outcome"),
                                capped: p.capped,
                                from: p.from === null ? null : count(p.from, "from"),
                            };
                        }),
                    };
                }),
            };
        }),
    };
}

/** A number in [0, 1), derived rather than random, so the demo is the same every time. */
function roll(...parts: (string | number)[]): number {
    const h = createHash("sha256")
        .update(["harlow", ...parts].join(":"))
        .digest("hex");
    return parseInt(h.slice(0, 12), 16) / 2 ** 48;
}

const between = (lo: number, hi: number, ...parts: (string | number)[]): number =>
    lo + (hi - lo) * roll(...parts);

const DAY_MS = 86_400_000;
const shiftDay = (day: string, n: number): string =>
    new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
/** 0 is Monday. */
const weekdayOf = (day: string): number => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

function dayIn(zone: string, at: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(at);
}

function offsetMinutes(utc: number): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: ZONE,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(new Date(utc));
    const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour"),
        get("minute"),
        get("second"),
    );
    return Math.round((asUtc - utc) / 60_000);
}

/** A moment on a day in the family's time zone, `seconds` after midnight there, as the log writes it. */
function at(day: string, seconds: number): string {
    const guess = Date.parse(`${day}T00:00:00Z`) + Math.round(seconds * 1000);
    let utc = guess - offsetMinutes(guess) * 60_000;
    utc = guess - offsetMinutes(utc) * 60_000;
    return new Date(utc).toISOString();
}

const clock = (hour: number, minute = 0): number => hour * 3600 + minute * 60;

/** Which weekdays a track is worked on for each count a week, as .docs/api.md gives them. */
const WEEKDAYS: Record<number, number[]> = {
    5: [0, 1, 2, 3, 4],
    4: [0, 1, 3, 4],
    3: [0, 2, 4],
    2: [1, 3],
    1: [2],
};

/**
 * How far along the week each track leans, which must stay in step with `TRACK_TURN` in
 * school/tracks.ts: the app folds this family's plan with it, and work written on another weekday
 * would read as done late. It is copied rather than imported because server/db reaches only the
 * engine's answer (boundaries.ts).
 */
const TURN: Record<string, number> = { maths: 0, coding: 1, physics: 4, reading: 1, writing: 3 };

/** The weekdays one track is worked on, turned as `pickWeekdays` in school/family/family.ts turns it. */
const weekdaysFor = (track: string, perWeek: number): number[] =>
    (WEEKDAYS[perWeek] ?? []).map((d) => (d + (TURN[track] ?? 0)) % 5).sort((a, b) => a - b);

interface Calendar {
    today: string;
    /** The last school day with work: the last weekday before today. */
    last: string;
    /** The Monday of week 0. */
    start: string;
    day: (week: number, weekday: number) => string;
}

function calendar(now: Date): Calendar {
    const today = dayIn(ZONE, now);
    let last = shiftDay(today, -1);
    while (weekdayOf(last) > 4) last = shiftDay(last, -1);
    const start = shiftDay(last, -weekdayOf(last) - 7 * (WEEKS - 1));
    return { today, last, start, day: (week, weekday) => shiftDay(start, week * 7 + weekday) };
}

type Writer = string;

interface Out {
    writer: Writer;
    kid: string | null;
    actor: string | null;
    at: string;
    kind: EventKind;
    data: AnyEventData;
}

const ev = <K extends EventKind>(w: {
    writer: Writer;
    kid: string | null;
    actor: string | null;
    at: string;
    kind: K;
    data: EventData[K];
}): Out => w;

const ADULTS = [...DEMO.parents, ...TUTORS];

const userKey = (key: string): string => idFor("demo", DEMO.family.id, "user", key);
const kidId = (key: string): string => idFor("demo", DEMO.family.id, "kid", key);
/** A children's view lasts ninety days at most, so Anna opened a new one every `kidView.weeks` weeks. */
const viewOf = (week: number): number => Math.floor(week / DEMO.kidView.weeks);
const viewId = (n: number): string => idFor("demo", DEMO.family.id, "kid-view", String(n));
const kidKey = (kid: string, view: number): string =>
    idFor("demo", DEMO.family.id, "kid-key", kid, String(view));

/**
 * The grown-ups' browsers over the half-year. A session lasts ninety days at most, so each parent
 * signed in again partway through; the first sessions have ended and their keys are gone, and the
 * work written under them keeps their ids, which is why `events.device` has no foreign key.
 */
interface Session {
    adult: string;
    device: string;
    name: string;
    from: string;
    to: string | null;
    live: boolean;
}

interface Timeline {
    cal: Calendar;
    founded: string;
    benJoined: string;
    paired: string;
    planned: string;
    marcusJoined: string;
    marcusRemoved: string;
    annaAgain: string;
    graceJoined: string;
    benAgain: string;
    sessions: Session[];
}

function timeline(cal: Calendar): Timeline {
    const before = (days: number) => shiftDay(cal.start, -days);
    const founded = at(before(9), clock(19, 30));
    const benJoined = at(before(8), clock(10, 20));
    const marcusJoined = at(before(6), clock(20, 15));
    const marcusRemoved = at(cal.day(6, 2), clock(20, 40));
    const annaAgain = at(cal.day(8, 0), clock(7, 55));
    const graceJoined = at(cal.day(8, 0), clock(19, 30));
    const benAgain = at(cal.day(12, 0), clock(7, 40));
    const session = (adult: string, n: number, name: string, from: string, to: string | null) => ({
        adult,
        device: idFor("demo", DEMO.family.id, "session", adult, String(n)),
        name,
        from,
        to,
        live: to === null,
    });
    return {
        cal,
        founded,
        benJoined,
        paired: at(before(9), clock(20, 20)),
        planned: at(before(2), clock(16, 0)),
        marcusJoined,
        marcusRemoved,
        annaAgain,
        graceJoined,
        benAgain,
        sessions: [
            session("anna", 1, "Chrome on a Mac", founded, annaAgain),
            session("anna", 2, "Chrome on a Mac", annaAgain, null),
            session("ben", 1, "Safari on an iPhone", benJoined, benAgain),
            session("ben", 2, "Safari on an iPhone", benAgain, null),
            session("marcus", 1, "Chrome on Windows", marcusJoined, marcusRemoved),
            session("grace", 1, "Firefox on a Mac", graceJoined, null),
        ],
    };
}

function browserOf(t: Timeline, adult: string, when: string): Session {
    const s = t.sessions.find(
        (x) => x.adult === adult && x.from <= when && (x.to === null || when < x.to),
    );
    if (!s) throw new Error(`demo: ${adult} had no session at ${when}`);
    return s;
}

/** One planned day of one track for one child, and what it works on. */
interface Slot {
    kid: DemoKid;
    track: DemoTrack;
    week: number;
    weekday: number;
    day: string;
    /** Which of the kid's sittings that day this is, from the morning on. */
    turn: number;
    lesson: LessonFacts;
    lessonIndex: number;
    /** The lesson's nth sitting, from 0, and how many it gets. */
    nth: number;
    of: number;
}

function lessonsOf(corpus: LessonFacts[], kid: DemoKid, track: DemoTrack): LessonFacts[] {
    return corpus
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => l.grade === kid.grade && l.subject === track.track)
        .sort((a, b) => a.l.unit - b.l.unit || a.i - b.i)
        .map(({ l }) => l);
}

const perWeekOf = (kid: DemoKid, track: DemoTrack, week: number): number =>
    kid.key === MORE_READING.kid && track.track === "reading" && week >= MORE_READING.week
        ? MORE_READING.perWeek
        : track.perWeek;

function slots(cal: Calendar, corpus: LessonFacts[]): Slot[] {
    const out: Slot[] = [];
    const place = new Map<string, { lesson: number; nth: number }>();
    for (let week = 0; week < WEEKS; week++) {
        if (week === HOLIDAY_WEEK) continue;
        for (let weekday = 0; weekday < 5; weekday++) {
            const day = cal.day(week, weekday);
            if (day > cal.last) continue;
            if (week === MUSEUM.week && weekday === MUSEUM.weekday) continue;
            for (const kid of KIDS) {
                if (MISSED[kid.key]?.some((m) => m.week === week && m.weekday === weekday))
                    continue;
                let turn = 0;
                for (const track of kid.tracks) {
                    if (!weekdaysFor(track.track, perWeekOf(kid, track, week)).includes(weekday))
                        continue;
                    const lessons = lessonsOf(corpus, kid, track);
                    const key = `${kid.key}:${track.track}`;
                    const here = place.get(key) ?? { lesson: 0, nth: 0 };
                    const of = track.days[here.lesson];
                    const lesson = lessons[here.lesson];
                    if (of === undefined || !lesson) continue;
                    out.push({
                        kid,
                        track,
                        week,
                        weekday,
                        day,
                        turn: turn++,
                        lesson,
                        lessonIndex: here.lesson,
                        nth: here.nth,
                        of,
                    });
                    place.set(
                        key,
                        here.nth + 1 >= of
                            ? { lesson: here.lesson + 1, nth: 0 }
                            : { lesson: here.lesson, nth: here.nth + 1 },
                    );
                }
            }
        }
    }
    return out;
}

function givenOf(q: Asked, answer: string | null): Given {
    if (answer === null || q.kind === "unmarked") return { k: "unmarked" };
    if (q.kind === "number") return { k: "number", text: answer };
    if (q.kind === "pick") return { k: "pick", option: answer };
    return { k: "word", text: answer };
}

/** `hash` is the level the child was drawn, which is what a sitting records (engine/pack.ts, PackLevel). */
const refOf = (
    lesson: LessonFacts,
    hash: string,
    q: Asked,
    section = q.section,
    n = q.n,
): QuestionRef => ({
    lesson: lesson.id,
    lessonHash: hash,
    section,
    n,
    item: q.item,
    itemHash: q.itemHash,
    variant: q.variant,
    ask: q.ask,
    skills: q.skills,
});

/** A wrong answer: one of the item's named mistakes as often as the child makes them, else a slip. */
function wrongOf(
    q: Asked,
    learner: Learner,
    ...parts: (string | number)[]
): { wrote: string; rule: string | null } | null {
    const named = q.mistakes[Math.floor(roll("which", ...parts) * q.mistakes.length)];
    if (named && (roll("named", ...parts) < learner.named || q.slip === null)) return named;
    return q.slip === null ? null : { wrote: q.slip, rule: null };
}

/** A wrong answer on paper, as the parent marks it, or right when the item leaves no wrong to give. */
function wrongJudged(
    q: Asked,
    learner: Learner,
    qid: (string | number)[],
): { given: Given; right: boolean; rule: string | null } {
    const wrong = wrongOf(q, learner, ...qid);
    return wrong
        ? { given: givenOf(q, wrong.wrote), right: false, rule: wrong.rule }
        : { given: givenOf(q, q.right), right: true, rule: null };
}

/** The chance of right first time, rising from a lesson's first sitting to its last. */
const chanceOf = (learner: Learner, slot: Slot): number =>
    learner.first[0] +
    (learner.first[1] - learner.first[0]) * (slot.nth / Math.max(1, slot.of - 1));

interface Built {
    out: Out[];
    authoredOn: string | null;
    counts: Record<
        string,
        {
            sittings: number;
            paper: number;
            answered: number;
            hints: number;
            marks: number;
            rounds: number;
            unmarked: number;
            on: string;
        }
    >;
}

function build(t: Timeline, corpus: LessonFacts[], work: Work, pack: string): Built {
    const out: Out[] = [];
    const counts: Built["counts"] = {};
    const parentUser = (key: string) => userKey(key);
    const authored = work.items.get("harlow.museum-change");
    const authoredWritten = at(t.cal.day(AUTHORED.week, 1), clock(21, 14));
    let authoredOn: string | null = null;
    const plays = new Map<string, number>();

    for (const slot of slots(t.cal, corpus)) {
        const { kid, track, lesson } = slot;
        const kidRow = kidId(kid.key);
        const c = (counts[kid.key] ??= {
            sittings: 0,
            paper: 0,
            answered: 0,
            hints: 0,
            marks: 0,
            rounds: 0,
            unmarked: 0,
            on: "",
        });
        if (track.track === "maths")
            c.on = `${lesson.id} (unit ${lesson.unit}), sitting ${slot.nth + 1} of ${slot.of}`;
        const lessonWork = work.lessons.get(lesson.id);
        if (!lessonWork) throw new Error(`demo: no questions for ${lesson.id}`);
        if (lessonWork.hash !== lesson.hash)
            throw new Error(`demo: ${lesson.id} changed between the corpus read and the engine's`);
        const draw = lessonWork.draws[slot.nth % lessonWork.draws.length] ?? [];
        const id = [kid.key, track.track, lesson.id, slot.nth];
        const sitting = idFor("demo", DEMO.family.id, "sitting", ...id.map(String));
        const learner = track.learner;
        const teaching = kid.settings.teaching;
        const asYouGo = isRecord(teaching) && teaching.marks === "as-you-go";
        // One iPad: the children take turns, youngest first, in the morning and again after lunch.
        const start =
            slot.turn === 0
                ? clock(8, kid.morning) + between(-8, 12, "late", ...id) * 60
                : clock(13, 10) +
                  (KIDS.indexOf(kid) * 40 + (slot.turn - 1) * 35) * 60 +
                  between(0, 10, "pm", ...id) * 60;
        // A new lesson is seen on the screen first; after that the family's own habit decides.
        const paper = slot.nth > 0 && roll("paper", ...id) < track.paper;
        const unfinished =
            kid.key === UNFINISHED.kid &&
            slot.week === UNFINISHED.week &&
            slot.weekday === UNFINISHED.weekday &&
            slot.turn === 0;
        c.sittings++;

        if (!paper) {
            const device = kidKey(kid.key, viewOf(slot.week));
            let cursor = start;
            out.push(
                ev({
                    writer: device,
                    kid: kidRow,
                    actor: null,
                    at: at(slot.day, cursor),
                    kind: "sitting-began",
                    data: {
                        sitting,
                        lesson: lesson.id,
                        lessonHash: lessonWork.levelHash,
                        pack,
                        mode: "screen",
                    },
                }),
            );
            // The look and the explanation before the first question, longer on a new lesson.
            cursor +=
                slot.nth === 0 ? between(150, 330, "look", ...id) : between(40, 110, "look", ...id);
            const asked = unfinished ? draw.slice(0, 2) : draw;
            asked.forEach((q, i) => {
                const qid = [...id, q.n];
                const ref = refOf(lesson, lessonWork.levelHash, q);
                const think = between(learner.think[0], learner.think[1], "think", ...qid);
                const slow = kid.grade === 1 ? 1.4 : 1;
                const typing =
                    between(1.2, 4.5, "type", ...qid) *
                    slow *
                    (q.kind === "word" && q.right?.includes("=") ? 2.2 : 1);
                const firstRight =
                    q.right === null || roll("right", ...qid) < chanceOf(learner, slot);
                const wrong = firstRight ? null : wrongOf(q, learner, ...qid);
                let hints = 0;
                let tries = 1;
                let final: string | null = q.right;
                let right: boolean | null = q.right === null ? null : true;
                let rule: string | null = null;
                if (wrong) {
                    rule = wrong.rule;
                    const wantsHint = q.hints.length > 0 && roll("hint", ...qid) < learner.hint;
                    if (wantsHint)
                        hints = q.hints.length > 1 && roll("rung", ...qid) < 0.35 ? 2 : 1;
                    if (asYouGo) {
                        const retry = learner.retry + (hints ? 0.08 : 0);
                        tries = 2;
                        if (roll("retry", ...qid) >= retry) {
                            tries = 3;
                            if (roll("third", ...qid) >= 0.5) {
                                final = wrong.wrote;
                                right = false;
                            }
                        }
                    } else {
                        final = wrong.wrote;
                        right = false;
                    }
                }
                const toFirstInput = Math.round(think * 1000 * (wrong ? 1.3 : 1));
                const toAnswer = Math.round(typing * 1000);
                for (let rung = 1; rung <= hints; rung++) {
                    cursor += between(6, 20, "rungat", ...qid, rung);
                    out.push(
                        ev({
                            writer: device,
                            kid: kidRow,
                            actor: null,
                            at: at(slot.day, cursor + toFirstInput / 1000),
                            kind: "hint-opened",
                            data: { sitting, q: ref, rung },
                        }),
                    );
                }
                cursor +=
                    (toFirstInput + toAnswer) / 1000 +
                    (tries - 1) * between(8, 25, "again", ...qid);
                out.push(
                    ev({
                        writer: device,
                        kid: kidRow,
                        actor: null,
                        at: at(slot.day, cursor),
                        kind: "answered",
                        data: {
                            sitting,
                            q: ref,
                            given: givenOf(q, final),
                            timing: {
                                k: "screen",
                                toFirstInput,
                                toAnswer,
                                leftPage: roll("left", ...qid) < (kid.grade === 1 ? 0.04 : 0.02),
                            },
                            right,
                            tries,
                            rule,
                            hints,
                        },
                    }),
                );
                c.answered++;
                c.hints += hints;
                cursor += between(12, 40, "after", ...qid) + (i === asked.length - 1 ? 20 : 0);
            });
            const minutes = Math.max(3, Math.round((cursor - start) / 60));
            out.push(
                ev({
                    writer: device,
                    kid: kidRow,
                    actor: null,
                    at: at(slot.day, cursor),
                    kind: "sitting-ended",
                    data: {
                        sitting,
                        finished: !unfinished,
                        minutes,
                        withGrownUp: kid.grade === 1 && slot.nth === 0,
                    },
                }),
            );
            // A game after some screen sittings, chosen from the activities made for this grade.
            if (!unfinished && roll("game", ...id) < kid.games) {
                const games = work.activities.filter(
                    (a) => (a.grades[0] ?? 0) <= kid.grade && kid.grade <= (a.grades[1] ?? 0),
                );
                const game = games[Math.floor(roll("which-game", ...id) * games.length)];
                const version =
                    game?.versions[Math.floor(roll("version", ...id) * game.versions.length)];
                if (game && version) {
                    const k = `${kid.key}:${game.id}:${version.values}`;
                    const n = plays.get(k) ?? 0;
                    plays.set(k, n + 1);
                    const play = version.plays[n % Math.max(1, version.plays.length)];
                    if (play) {
                        out.push(
                            ev({
                                writer: device,
                                kid: kidRow,
                                actor: null,
                                at: at(
                                    slot.day,
                                    cursor +
                                        between(60, 180, "gamestart", ...id) +
                                        (play.moves.at(-1)?.at ?? 0),
                                ),
                                kind: "round-played",
                                data: {
                                    round: {
                                        round: idFor(
                                            "demo",
                                            DEMO.family.id,
                                            "round",
                                            ...id.map(String),
                                        ),
                                        activity: game.id,
                                        kind: game.kind,
                                        activityHash: game.activityHash,
                                        values: version.values,
                                        from: play.from,
                                    },
                                    moves: play.moves,
                                    outcome: play.outcome,
                                    capped: play.capped,
                                },
                            }),
                        );
                        c.rounds++;
                    }
                }
            }
            continue;
        }

        // On paper: printed the evening before, worked at the table with the parent's phone recording
        // the sitting, and marked by whichever grown-up gets to it.
        c.paper++;
        const printer = kid.prints;
        const printedAt = at(
            shiftDay(slot.day, -1),
            clock(20, 10) + between(0, 90, "print", ...id) * 60,
        );
        const sheet = idFor("demo", DEMO.family.id, "sheet", ...id.map(String));
        const questions = draw.map((q) => refOf(lesson, lessonWork.levelHash, q));
        let extra: { ref: QuestionRef; q: Asked } | null = null;
        if (
            authored &&
            !authoredOn &&
            kid.key === AUTHORED.kid &&
            track.track === "maths" &&
            printedAt > authoredWritten
        ) {
            const aq = authored.draws[0]?.[0];
            if (aq) {
                extra = {
                    ref: refOf(lesson, lessonWork.levelHash, aq, "extra", questions.length + 1),
                    q: aq,
                };
                questions.push(extra.ref);
                authoredOn = sheet;
            }
        }
        const printedBy = browserOf(t, printer, printedAt);
        out.push(
            ev({
                writer: printedBy.device,
                kid: kidRow,
                actor: parentUser(printer),
                at: printedAt,
                kind: "sheet-printed",
                data: {
                    sheet,
                    lesson: lesson.id,
                    lessonHash: lessonWork.levelHash,
                    pack,
                    paper: "Letter",
                    questions,
                    grownUps: true,
                },
            }),
        );
        const sat = at(slot.day, start);
        const recorder = browserOf(t, printer, sat);
        const minutes = Math.round(between(14, 32, "papermin", ...id) + draw.length * 2);
        out.push(
            ev({
                writer: recorder.device,
                kid: kidRow,
                actor: parentUser(printer),
                at: sat,
                kind: "sitting-began",
                data: {
                    sitting,
                    lesson: lesson.id,
                    lessonHash: lessonWork.levelHash,
                    pack,
                    mode: "paper",
                },
            }),
            ev({
                writer: recorder.device,
                kid: kidRow,
                actor: parentUser(printer),
                at: at(slot.day, start + minutes * 60),
                kind: "sitting-ended",
                data: { sitting, finished: true, minutes, withGrownUp: kid.grade < 4 },
            }),
        );

        // Marked one to five days later, by a tutor inside her window and before any removal, or a
        // parent. A sheet whose marking day has not come yet, and the odd forgotten one, stays unmarked.
        const markDay = shiftDay(slot.day, 1 + Math.floor(roll("markday", ...id) * 5));
        const markAt = at(markDay, clock(19, 20) + between(0, 110, "markat", ...id) * 60);
        const tutor = TUTORS.find((tu) => {
            if (tu.kid !== kid.key) return false;
            const joined = tu.key === "marcus" ? t.marcusJoined : t.graceJoined;
            const removed = tu.key === "marcus" ? t.marcusRemoved : null;
            const subject = tu.key === "marcus" ? "maths" : "reading";
            return (
                subject === track.track &&
                markAt > joined &&
                (removed === null || markAt < removed) &&
                markDay >= t.cal.day(tu.fromWeek, 0) &&
                markDay <= t.cal.day(tu.toWeek, 4)
            );
        });
        const marker =
            tutor?.key ??
            kid.marks[Math.floor(roll("marker", ...id) * kid.marks.length)] ??
            printer;
        if (markDay >= t.cal.today || roll("forgot", ...id) < 0.04) {
            c.unmarked++;
            continue;
        }
        const markedBy = browserOf(t, marker, markAt);
        const marked = extra
            ? [...draw.map((q) => ({ q, ref: refOf(lesson, lessonWork.levelHash, q) })), extra]
            : draw.map((q) => ({ q, ref: refOf(lesson, lessonWork.levelHash, q) }));
        marked.forEach(({ q, ref }, i) => {
            const qid = [...id, "paper", ref.n];
            // Work with no answer to check, such as handwriting, is judged by the grown-up.
            const judged =
                q.right === null
                    ? { given: givenOf(q, null), right: roll("neat", ...qid) < 0.85, rule: null }
                    : roll("right", ...qid) < chanceOf(learner, slot)
                      ? { given: givenOf(q, q.right), right: true, rule: null }
                      : wrongJudged(q, learner, qid);
            out.push(
                ev({
                    writer: markedBy.device,
                    kid: kidRow,
                    actor: userKey(marker),
                    at: new Date(Date.parse(markAt) + i * 37_000).toISOString(),
                    kind: "marked",
                    data: { sheet, q: ref, ...judged },
                }),
            );
            c.marks++;
        });
    }
    return { out, authoredOn, counts };
}

/** The grown-ups' own events: plans, the worlds, the museum, and the question Ben wrote. */
function grownUps(t: Timeline, authoredHashes: { draft: string; body: string }): Out[] {
    const out: Out[] = [];
    const by = (adult: string, when: string) => browserOf(t, adult, when).device;
    // Anna set each child up in one sitting: the subjects they do, and then the ones their grade
    // would otherwise start with turned off, since a plan nobody changes carries its grade's default.
    let nth = 0;
    for (const kid of KIDS) {
        const set: { track: string; on: boolean; perWeek: number }[] = [
            ...kid.tracks.map((track) => ({
                track: track.track,
                on: true,
                perWeek: track.perWeek,
            })),
            ...kid.off.map((track) => ({ track, on: false, perWeek: 0 })),
        ];
        for (const op of set) {
            const when = new Date(Date.parse(t.planned) + nth++ * 41_000).toISOString();
            out.push(
                ev({
                    writer: by("anna", when),
                    kid: kidId(kid.key),
                    actor: userKey("anna"),
                    at: when,
                    kind: "plan-changed",
                    data: { op: { op: "track", ...op } },
                }),
            );
        }
        // the worlds were chosen with the plan, before any work, so they stand for every term
        const chose = new Date(Date.parse(t.planned) + (nth - 1) * 41_000 + 20_000).toISOString();
        out.push(
            ev({
                writer: by("anna", chose),
                kid: kidId(kid.key),
                actor: userKey("anna"),
                at: chose,
                kind: "world-chosen",
                data: kid.worlds,
            }),
        );
    }
    const more = at(t.cal.day(MORE_READING.week, 0), clock(8, 12));
    out.push(
        ev({
            writer: by("anna", more),
            kid: kidId(MORE_READING.kid),
            actor: userKey("anna"),
            at: more,
            kind: "plan-changed",
            data: {
                op: { op: "track", track: "reading", on: true, perWeek: MORE_READING.perWeek },
            },
        }),
    );
    const museumDay = t.cal.day(MUSEUM.week, MUSEUM.weekday);
    const holiday = t.cal.day(HOLIDAY_WEEK, 0);
    KIDS.forEach((kid, i) => {
        const off = at(t.cal.day(MUSEUM.week, 1), clock(21, 2) + i * 40);
        const shift = at(t.cal.day(HOLIDAY_WEEK - 1, 4), clock(20, 31) + i * 35);
        const added = at(museumDay, clock(19, 5) + i * 70);
        out.push(
            ev({
                writer: by("ben", off),
                kid: kidId(kid.key),
                actor: userKey("ben"),
                at: off,
                kind: "plan-changed",
                data: {
                    op: {
                        op: "set-day",
                        onDay: museumDay,
                        kind: "off",
                        lesson: null,
                        note: "Museum day",
                    },
                },
            }),
            ev({
                writer: by("ben", shift),
                kid: kidId(kid.key),
                actor: userKey("ben"),
                at: shift,
                kind: "plan-changed",
                data: { op: { op: "shift", from: holiday, weeks: 1 } },
            }),
            ev({
                writer: by("anna", added),
                kid: kidId(kid.key),
                actor: userKey("anna"),
                at: added,
                kind: "day-added",
                data: {
                    onDay: museumDay,
                    subject: MUSEUM.subject,
                    minutes: MUSEUM.minutes,
                    note: MUSEUM.note,
                },
            }),
        );
    });
    const draftAt = at(t.cal.day(AUTHORED.week, 1), clock(21, 5));
    const bodyAt = at(t.cal.day(AUTHORED.week, 1), clock(21, 14));
    for (const [when, hash] of [
        [draftAt, authoredHashes.draft],
        [bodyAt, authoredHashes.body],
    ] as const) {
        out.push(
            ev({
                writer: by(AUTHORED.by, when),
                kid: null,
                actor: userKey(AUTHORED.by),
                at: when,
                kind: "content-authored",
                data: { id: "harlow.museum-change", kind: "item", hash, model: null },
            }),
        );
    }
    return out;
}

/** The server's own record of access: who started, joined, left, signed in, set the PIN and opened a children's view. */
function access(t: Timeline, verdicts: { hash: string; errors: number; at: string }[]): Written[] {
    const signedIn = (s: Session): Written => ({
        kid_id: null,
        kind: "signed-in",
        data: { method: "email-code", session: s.device, shared: false },
        actor: userKey(s.adult),
        at: s.from,
    });
    const out: Written[] = [];
    const anna = userKey("anna");
    out.push({
        kid_id: null,
        kind: "member-added",
        data: {
            user: anna,
            name: "Anna Harlow",
            kid: null,
            fromDay: null,
            toDay: null,
            invitedBy: null,
        },
        actor: anna,
        at: t.founded,
    });
    KIDS.forEach((kid, i) =>
        out.push({
            kid_id: null,
            kind: "consent-given",
            data: { kid: kidId(kid.key), notice: CONSENT_NOTICE, method: "email-plus" },
            actor: anna,
            at: new Date(Date.parse(t.founded) + (8 + i * 2) * 60_000).toISOString(),
        }),
    );
    out.push(
        {
            kid_id: null,
            kind: "pin-set",
            data: {},
            actor: anna,
            at: new Date(Date.parse(t.paired) - 60_000).toISOString(),
        },
        ...Array.from({ length: viewOf(WEEKS - 1) + 1 }, (_, n): Written => ({
            kid_id: null,
            kind: "kid-session-opened",
            data: {
                view: viewId(n),
                keys: KIDS.map((k) => ({ kid: kidId(k.key), key: kidKey(k.key, n) })),
            },
            actor: anna,
            at: n === 0 ? t.paired : at(t.cal.day(n * DEMO.kidView.weeks, 0), clock(7, 40)),
        })),
        {
            kid_id: null,
            kind: "member-added",
            data: {
                user: userKey("ben"),
                name: "Ben Harlow",
                kid: null,
                fromDay: null,
                toDay: null,
                invitedBy: anna,
            },
            actor: userKey("ben"),
            at: t.benJoined,
        },
    );
    for (const tu of TUTORS) {
        const joined = tu.key === "marcus" ? t.marcusJoined : t.graceJoined;
        out.push({
            kid_id: null,
            kind: "member-added",
            data: {
                user: userKey(tu.key),
                name: tu.name,
                kid: kidId(tu.kid),
                fromDay: t.cal.day(tu.fromWeek, 0),
                toDay: t.cal.day(tu.toWeek, 4),
                invitedBy: userKey(tu.invitedBy),
            },
            actor: userKey(tu.key),
            at: joined,
        });
    }
    out.push({
        kid_id: null,
        kind: "member-removed",
        data: { user: userKey("marcus"), kid: kidId("ivy"), left: false },
        actor: anna,
        at: t.marcusRemoved,
    });
    for (const s of t.sessions) out.push(signedIn(s));
    for (const v of verdicts)
        out.push({
            kid_id: null,
            kind: "content-verified",
            data: {
                hash: v.hash,
                errors: v.errors,
                played: null,
                verifier: "engine/notation/verify.ts",
            },
            actor: null,
            at: v.at,
        });
    return out.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
}

/** Every revision the catalogue holds (lessons, items and components), and the pack's manifest. */
function catalogue(): { bodies: string[]; pack: string } {
    const bodies: string[] = [];
    for (const dir of ["items", "lessons", "components"]) {
        for (const f of readdirSync(`${CONTENT}/${dir}`).sort()) {
            if (f.endsWith(".lumi")) bodies.push(readFileSync(`${CONTENT}/${dir}/${f}`, "utf8"));
        }
    }
    const revisions = [...new Set(bodies.map(sha256))].sort();
    const manifest = JSON.stringify({ name: "catalogue", vocabulary: 1, revisions });
    return { bodies: [...bodies, manifest], pack: sha256(manifest) };
}

function runEngine(lessons: string[], draws: number, extra: Record<string, string>): Work {
    const stdout = execFileSync(
        process.execPath,
        [
            "--disable-warning=ExperimentalWarning",
            // The worker uses the same extensionless imports as the server.
            `--import=${new URL("../../../tools/scripts/resolve.ts", import.meta.url).href}`,
            "tools/scripts/demo-work.ts",
            JSON.stringify({ lessons, draws, plays: 8, extra }),
        ],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
    );
    const raw: unknown = JSON.parse(stdout);
    return workOf(raw);
}

export interface Seeded {
    family: string;
    already: boolean;
    written: number;
    counts: Built["counts"];
    unmarkedSheets: number;
    authoredOn: string | null;
    first: string;
    last: string;
}

/** Numbers each writer's events in its own order and gives each a stable id, through the edge check. */
function number(outs: Out[]): Envelope[] {
    const byWriter = new Map<string, Out[]>();
    for (const o of outs) byWriter.set(o.writer, [...(byWriter.get(o.writer) ?? []), o]);
    const envelopes: Envelope[] = [];
    for (const [writer, list] of byWriter) {
        list.sort((a, b) => a.at.localeCompare(b.at));
        list.forEach((o, seq) => {
            const checked = check({
                id: idFor("demo", DEMO.family.id, "event", writer, String(seq)),
                family_id: DEMO.family.id,
                kid_id: o.kid,
                kind: o.kind,
                data: o.data,
                actor: o.actor,
                device: writer,
                seq,
                at: o.at,
            });
            if (!checked.ok) throw new Error(`demo wrote a bad ${o.kind}: ${checked.problem}`);
            envelopes.push(checked.envelope);
        });
    }
    return envelopes;
}

async function familyExists(anna: string): Promise<boolean> {
    return withFamily(
        { family: DEMO.family.id, user: anna },
        async (tx) => (await familyRow(tx, DEMO.family.id)) !== null,
    );
}

/** Each grown-up writes their own login, the only user row a person may write; a demo parent who signed up already keeps theirs. */
async function logins(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const adult of ADULTS) {
        const user = (await loginByAddress(adult.email)) ?? userKey(adult.key);
        await withFamily({ family: null, user }, (tx) =>
            saveLogin(tx, { id: user, email: adult.email, name: adult.name }),
        );
        out[adult.key] = user;
    }
    return out;
}

async function writeRows(tx: FamilyTx, t: Timeline, users: Record<string, string>): Promise<void> {
    await createFamily(tx, {
        id: DEMO.family.id,
        name: DEMO.family.name,
        time_zone: DEMO.family.time_zone,
    });
    for (const kid of KIDS)
        await addKid(tx, DEMO.family.id, {
            id: kidId(kid.key),
            name: kid.name,
            grade: kid.grade,
            settings: kid.settings,
        });
    const ben = users.ben;
    if (!ben) throw new Error("demo: Ben has no login");
    await tx.insert(members).values({ user_id: ben, family_id: DEMO.family.id });
    for (const tu of TUTORS) {
        const user = users[tu.key];
        if (!user) throw new Error(`demo: ${tu.name} has no login`);
        await tx.insert(members).values({
            user_id: user,
            family_id: DEMO.family.id,
            kid_id: kidId(tu.kid),
            from_day: t.cal.day(tu.fromWeek, 0),
            to_day: t.cal.day(tu.toWeek, 4),
            ended_at: tu.key === "marcus" ? t.marcusRemoved : null,
        });
    }
}

export async function demo(
    owner: Store,
    opts: { now?: Date; fresh?: boolean } = {},
): Promise<Seeded> {
    const t = timeline(calendar(opts.now ?? new Date()));
    const users = await logins();
    const anna = users.anna;
    if (!anna) throw new Error("demo: Anna has no login");
    const exists = await familyExists(anna);
    if (exists && !opts.fresh)
        return {
            family: DEMO.family.id,
            already: true,
            written: 0,
            counts: {},
            unmarkedSheets: 0,
            authoredOn: null,
            first: "",
            last: "",
        };

    const cat = catalogue();
    await saveCatalogue(owner.db, cat.bodies);
    const corpus = readCorpus(CONTENT).lessons;
    const wanted = new Set<string>();
    let draws = 1;
    for (const kid of KIDS)
        for (const track of kid.tracks) {
            lessonsOf(corpus, kid, track)
                .slice(0, track.days.length)
                .forEach((l) => wanted.add(l.id));
            draws = Math.max(draws, ...track.days);
        }
    const draft = AUTHORED.body.replace(AUTHORED.draft.find, AUTHORED.draft.replace);
    const work = runEngine([...wanted], draws, {
        "items/harlow.museum-change.lumi": AUTHORED.body,
    });
    const draftWork = runEngine([], 1, { "items/harlow.museum-change.lumi": draft });
    const fixed = work.items.get("harlow.museum-change");
    const first = draftWork.items.get("harlow.museum-change");
    if (!fixed || !first) throw new Error("demo: the engine did not read the parent's question");
    if (fixed.hash !== sha256(AUTHORED.body) || first.hash !== sha256(draft))
        throw new Error("demo: the engine hashed the parent's question differently");

    const built = build(t, corpus, work, cat.pack);
    const verdicts = [
        {
            hash: first.hash,
            errors: first.errors,
            at: at(t.cal.day(AUTHORED.week, 1), clock(21, 6)),
        },
        {
            hash: fixed.hash,
            errors: fixed.errors,
            at: at(t.cal.day(AUTHORED.week, 1), clock(21, 15)),
        },
    ];
    const envelopes = number([
        ...built.out,
        ...grownUps(t, { draft: first.hash, body: fixed.hash }),
    ]);
    const lastSeen = (writer: string): string | undefined =>
        envelopes
            .filter((e) => e.device === writer)
            .map((e) => e.at)
            .sort()
            .at(-1);

    // The old family goes in the same transaction that writes the new one, after everything has been
    // built, so a run that fails part way leaves the family it found.
    const written = await withFamily({ family: DEMO.family.id, user: anna }, async (tx) => {
        if (exists) await deleteFamily(tx, DEMO.family.id);
        await writeRows(tx, t, users);
        // The children's views have all run out, and nobody holds their secrets, so none is written.
        await setPin(tx, DEMO.family.id, {
            user: anna,
            hash: pinHash(process.env.AUTH_PEPPER || LOCAL_PEPPER, DEMO.family.id, DEMO.pin),
        });
        for (const s of t.sessions.filter((x) => x.live)) {
            const user = users[s.adult];
            if (!user) throw new Error(`demo: ${s.adult} has no login`);
            const seen = lastSeen(s.device);
            await issue(tx, DEMO.family.id, {
                kind: "session",
                id: s.device,
                user_id: user,
                name: s.name,
                created_at: s.from,
                ...(seen ? { seen_at: seen } : {}),
            });
        }
        await saveContent(tx, DEMO.family.id, draft);
        await saveContent(tx, DEMO.family.id, AUTHORED.body);
        await record(tx, DEMO.family.id, access(t, verdicts));
        let total = 0;
        for (let i = 0; i < envelopes.length; i += 1000)
            total += (await append(tx, envelopes.slice(i, i + 1000))).written;
        return total;
    });

    return {
        family: DEMO.family.id,
        already: false,
        written,
        counts: built.counts,
        unmarkedSheets: Object.values(built.counts).reduce((n, c) => n + c.unmarked, 0),
        authoredOn: built.authoredOn,
        first: t.cal.start,
        last: t.cal.last,
    };
}

if (import.meta.filename === process.argv[1]) {
    const say = (line: string): void => {
        process.stdout.write(`${line}\n`);
    };
    const owner = open(ownerUrl());
    try {
        const out = await demo(owner, { fresh: process.argv.includes("--fresh") });
        if (out.already) {
            say(
                `the ${DEMO.family.name} family is already there (${out.family}); nothing written. Run with --fresh to write it again with current dates.`,
            );
        } else {
            say(
                `family ${out.family} (${DEMO.family.name}, ${DEMO.family.time_zone}), school days from ${out.first} to ${out.last}`,
            );
            for (const kid of KIDS) {
                const c = out.counts[kid.key];
                if (!c) continue;
                say(
                    `  ${kid.name}, grade ${kid.grade}: ${c.sittings} sittings (${c.paper} on paper), ${c.answered} answers on screen, ${c.hints} hints, ${c.marks} marks, ${c.unmarked} sheets not marked yet, ${c.rounds} games; now on ${c.on}`,
                );
            }
            say(
                `${out.written} events written through withFamily as the app role, each through the edge check`,
            );
            say(
                `sign in as ${DEMO.parents.map((p) => p.email).join(" or ")} with the code from http://localhost:8500/outbox, and the family's PIN is ${DEMO.pin}`,
            );
            say("the family and its weeks are invented: see server/db/seed/demo-household.ts");
        }
    } finally {
        await owner.close();
        await closeApp();
    }
}
