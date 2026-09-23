// The family's calendar as a fold over the log, and the changes a grown-up makes on it as the events
// they append. One child's plan is family.ts's; this is the family's year: the terms, the days off,
// the days a grown-up added, the sheets printed, and every child's planned days with what happened on
// each. Nothing here is stored, and nothing here draws (.docs/parents.md, "Shift the plan").

import type { Draft, Envelope, PlanOp, Weekday } from "../../engine/answer";
import {
    addDays,
    dayIn,
    dayOf,
    weekdayOf,
    WEEKDAYS,
    type AddedDay,
    type Sitting,
} from "../record/record";
import type { YearLesson } from "../year";
import {
    alive,
    cellsFor,
    laneOf,
    movesOf,
    planOf,
    startOf,
    trackDays,
    scheduledTracks,
    sessionChanges,
    type Cell,
    type PlannedDay,
} from "./family";

export interface Term {
    n: number;
    from: string;
    to: string;
}

/** Days with no school, as one span, with who it is for, why, and the day it was written. */
export interface OffSpan {
    id: string;
    from: string;
    to: string;
    note: string;
    /** The child it is for, or null for the whole family. */
    kid: string | null;
    on: string;
}

/** A change a grown-up made, as the calendar shows it and puts it back. */
export interface Change {
    id: string;
    kid: string | null;
    op: PlanOp;
    /** The day it was written on, in the family's time zone. */
    on: string;
    /** The instant it was written at, which is what groups the events of one change. */
    at: string;
    actor: string | null;
}

/** One planned lesson on one day, as the week strip reads it, with the track it is in. */
export interface CalCell extends Cell {
    track: string;
}

export interface KidCalendar {
    id: string;
    /** The first day of this child's school year. */
    start: string;
    schoolDays: Weekday[];
    tracks: { track: string; perWeek: number; since: string; own: boolean }[];
    /** Each track's planned days, by track. */
    lanes: Map<string, PlannedDay[]>;
    /** Every planned day's cell, by day. */
    cells: Map<string, CalCell[]>;
}

export interface Calendar {
    today: string;
    terms: Term[];
    off: OffSpan[];
    added: (AddedDay & { kid: string; id: string; at: string })[];
    printed: { kid: string; on: string; lesson: string; grownUps: boolean }[];
    kids: Map<string, KidCalendar>;
    /** Every plan change still in force, oldest first. */
    changes: Change[];
}

/** Monday is 1 and Sunday 7, as ISO 8601 numbers them, in `WEEKDAYS`'s order from Sunday. */
const NUMBERS: readonly Weekday[] = [7, 1, 2, 3, 4, 5, 6];

export const weekdayNumber = (iso: string): Weekday =>
    NUMBERS[WEEKDAYS.indexOf(weekdayOf(iso))] ?? 1;

export const SCHOOL_WEEK: Weekday[] = [1, 2, 3, 4, 5];

/**
 * The family's school year as three dated terms from the day its record begins, which stands until
 * a family sets its own: ten weeks, a fortnight off, thirteen weeks, a fortnight off, and the rest.
 * TODO: the sentence above and the dates below disagree while the default curriculum was being
 * sized against the year. The dates give 11, 13 and 15 weeks of Monday to Friday, 39 in all, with
 * one school week off between terms rather than a fortnight. Either the words or the numbers are
 * wrong and nobody has decided which, so both are left as they are; the default's paces in
 * school/tracks.ts are sized against the 39 weeks the code actually lays out. */
export function defaultTerms(start: string): Term[] {
    const monday = addDays(start, -((weekdayNumber(start) + 6) % 7));
    return [
        { n: 1, from: monday, to: addDays(monday, 10 * 7 + 4) },
        { n: 2, from: addDays(monday, 12 * 7), to: addDays(monday, 24 * 7 + 4) },
        { n: 3, from: addDays(monday, 26 * 7), to: addDays(monday, 40 * 7 + 4) },
    ];
}

export interface FoldIn {
    events: readonly Envelope[];
    sittings: readonly Sitting[];
    kids: readonly { id: string; grade: number }[];
    lessons: readonly YearLesson[];
    timeZone: string;
    today: string;
    /** The last day worth laying out, a year or so past today. */
    until: string;
}

/**
 * The family's calendar, folded from the log: the terms a family set or the three it starts with, the
 * days off as spans, the days added and the sheets printed, and each child's lanes and cells laid out
 * with family.ts, so a day the calendar shows is the day the child's view has.
 */
export function foldCalendar(input: FoldIn): Calendar {
    const live = alive(input.events);
    const day = (e: Envelope): string => dayIn(e.at, input.timeZone);
    const changes: Change[] = live.flatMap((e) =>
        e.kind === "plan-changed"
            ? [{ id: e.id, kid: e.kid_id, op: e.data.op, on: day(e), at: e.at, actor: e.actor }]
            : [],
    );
    const off: OffSpan[] = [];
    let terms: Term[] | null = null;
    for (const c of changes) {
        if (c.op.op === "days-off")
            off.push({
                id: c.id,
                from: c.op.from,
                to: c.op.to,
                note: c.op.note,
                kid: c.kid,
                on: c.on,
            });
        if (c.op.op === "terms")
            terms = [...c.op.terms].map((t) => ({ ...t })).sort((a, b) => a.n - b.n);
    }
    off.sort((a, b) => a.from.localeCompare(b.from));
    const added = live.flatMap((e) =>
        e.kind === "day-added" && e.kid_id
            ? [
                  {
                      id: e.id,
                      at: e.at,
                      kid: e.kid_id,
                      on: e.data.onDay,
                      subject: e.data.subject,
                      minutes: e.data.minutes,
                      note: e.data.note,
                  },
              ]
            : [],
    );
    const printed = live.flatMap((e) =>
        e.kind === "sheet-printed" && e.kid_id
            ? [{ kid: e.kid_id, on: day(e), lesson: e.data.lesson, grownUps: e.data.grownUps }]
            : [],
    );

    const kids = new Map<string, KidCalendar>();
    let earliest = input.today;
    for (const kid of input.kids) {
        const moves = movesOf(input.events, kid.id, input.timeZone);
        const mine = input.sittings.filter((s) => s.child === kid.id);
        const start =
            startOf(input.events, kid.id, input.timeZone) ??
            mine.map((s) => s.on).sort()[0] ??
            input.today;
        if (start < earliest) earliest = start;
        const schoolDays = [...moves]
            .filter((m) => m.op.op === "school-days")
            .map((m) => (m.op.op === "school-days" ? m.op.weekdays : SCHOOL_WEEK))
            .at(-1);
        const lanes = new Map<string, PlannedDay[]>();
        const tracks: KidCalendar["tracks"] = [];
        const cells = new Map<string, CalCell[]>();
        for (const [track, on] of scheduledTracks(
            planOf(input.events, kid, input.timeZone, start),
            moves,
        )) {
            const lane = laneOf(input.lessons, track, kid.grade);
            // a subject with nothing written for this child has nothing to plan, default or not
            if (!lane.length && !sessionChanges(moves).some((s) => s.track === track)) continue;
            const inLane = new Set([
                ...lane,
                ...sessionChanges(moves)
                    .filter((s) => s.track === track)
                    .map((s) => s.lesson),
            ]);
            const days = trackDays({
                track,
                lessons: lane,
                perWeek: on.on ? on.perWeek : 0,
                start,
                today: input.today,
                until: input.until,
                moves,
                sittings: mine.filter((s) => inLane.has(s.lesson)),
            });
            lanes.set(track, days);
            tracks.push({ track, perWeek: on.perWeek, since: on.since, own: on.own });
            for (const c of cellsFor(
                days,
                mine.filter((s) => inLane.has(s.lesson)),
                input.today,
            ))
                cells.set(c.on, [...(cells.get(c.on) ?? []), { ...c, track }]);
        }
        kids.set(kid.id, {
            id: kid.id,
            start,
            schoolDays: schoolDays ?? SCHOOL_WEEK,
            tracks,
            lanes,
            cells,
        });
    }
    return {
        today: input.today,
        terms: terms ?? defaultTerms(earliest),
        off,
        added,
        printed,
        kids,
        changes,
    };
}

/** The family's or a child's day off covering a day, if any. */
export const offOn = (off: readonly OffSpan[], kid: string | null, on: string): OffSpan | null =>
    off.find((s) => (s.kid === null || s.kid === kid) && on >= s.from && on <= s.to) ?? null;

export type DayState = "school" | "weekend" | "off";

/** What a day is for a child: a day they work, a day they do not, or a day off with its span. */
export function dayState(
    cal: Calendar,
    kid: KidCalendar,
    on: string,
): { state: DayState; off: OffSpan | null } {
    const span = offOn(cal.off, kid.id, on);
    if (span) return { state: "off", off: span };
    return { state: kid.schoolDays.includes(weekdayNumber(on)) ? "school" : "weekend", off: null };
}

export const termOn = (cal: Calendar, on: string): Term | null =>
    cal.terms.find((t) => on >= t.from && on <= t.to) ?? null;

/** A child's school days between two days inclusive, counting no weekend and no day off. */
export function schoolDaysBetween(
    cal: Calendar,
    kid: KidCalendar,
    from: string,
    to: string,
): number {
    let n = 0;
    for (let d = from; dayOf(d) <= dayOf(to); d = addDays(d, 1))
        if (dayState(cal, kid, d).state === "school") n++;
    return n;
}

/** What finishing a term's lessons by its end would take for one track. It is a count and a date, never a verdict. */
export interface CatchUp {
    track: string;
    /** Lessons of the term not finished yet. */
    left: number;
    /** The day the plan reaches the term's last lesson, or null when it does not reach it. */
    reaches: string | null;
    /** How many of the track's planned days for the term fall past its end. */
    over: number;
    /** The days a week that would fit the rest in by the term's end, or null when the pace already fits. */
    perWeek: number | null;
}

export function catchUp(
    cal: Calendar,
    kid: KidCalendar,
    term: Term,
    track: string,
    termLessons: readonly string[],
    perWeekNow: number,
): CatchUp {
    const lane = kid.lanes.get(track) ?? [];
    const last = termLessons[termLessons.length - 1];
    const planned = lane.filter(
        (d) => d.lesson !== undefined && termLessons.includes(d.lesson) && d.on > cal.today,
    );
    const reaches =
        last === undefined ? null : (lane.filter((d) => d.lesson === last).at(-1)?.on ?? null);
    const over = planned.filter((d) => d.on > term.to).length;
    const weeksLeft = Math.max(1, Math.ceil((dayOf(term.to) - dayOf(cal.today)) / 7));
    const need = Math.ceil(planned.length / weeksLeft);
    const perWeek = over ? Math.min(kid.schoolDays.length, Math.max(need, perWeekNow + 1)) : null;
    return { track, left: new Set(planned.map((d) => d.lesson)).size, reaches, over, perWeek };
}

/** The Monday to Sunday weeks a month's grid shows. */
export function monthGrid(month: string): string[] {
    const first = `${month}-01`;
    const start = addDays(first, -((weekdayNumber(first) + 6) % 7));
    const last = new Date(
        Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
    ).getUTCDate();
    const end = `${month}-${String(last).padStart(2, "0")}`;
    const out: string[] = [];
    for (let d = start; dayOf(d) <= dayOf(end) || out.length % 7 !== 0; d = addDays(d, 1))
        out.push(d);
    return out;
}

/** The five school days of a week, or seven when a child works at the weekend. */
export const weekDays = (monday: string, weekend: boolean): string[] =>
    Array.from({ length: weekend ? 7 : 5 }, (_, i) => addDays(monday, i));

/** What a change needs to be written: a new id and the instant it was made at. */
export interface Writing {
    newId: () => string;
    at: string;
}

const change = (w: Writing, kid: string | null, op: PlanOp): Draft => ({
    id: w.newId(),
    kid_id: kid,
    kind: "plan-changed",
    at: w.at,
    data: { op },
});

/** A refusal a grown-up reads, or the drafts a change appends. */
export type Made = { refused: string } | { drafts: Draft[] };

export const moveDay = (
    w: Writing,
    kid: string,
    track: string,
    from: string,
    to: string,
): Draft[] => [change(w, kid, { op: "move", track, from, to })];

export const parkLesson = (
    w: Writing,
    kid: string,
    lesson: string,
    from: string,
    gapWeeks: number,
): Draft[] => [change(w, kid, { op: "park", lesson, from, gapWeeks })];

export const doAgain = (
    w: Writing,
    kid: string,
    lesson: string,
    onDay: string,
    kind: "again" | "practice",
): Draft[] => [
    change(w, kid, {
        op: "set-day",
        onDay,
        kind,
        lesson,
        note: kind === "again" ? "Same lesson, new numbers" : "Practice sheet, asked for",
    }),
];

export const daysOff = (
    w: Writing,
    kid: string | null,
    from: string,
    to: string,
    note: string,
): Draft[] => {
    const [a, b] = from <= to ? [from, to] : [to, from];
    return [
        change(w, kid, {
            op: "days-off",
            from: a,
            to: b,
            note: note.trim() || (a === b ? "A day off" : "Days off"),
        }),
    ];
};

/**
 * A family day: no lessons for anyone, and, when the family says it counts, a day of teaching in each
 * child's records. It is a `days-off` for the family and a `day-added` per child rather than an op of
 * its own, since `day-added` is what the records already read.
 */
export function familyDay(
    w: Writing,
    kids: readonly string[],
    on: string,
    note: string,
    teaching: { subject: string; minutes: number } | null,
): Draft[] {
    const text = note.trim() || "A family day";
    const out = daysOff(w, null, on, on, text);
    if (teaching)
        for (const kid of kids)
            out.push({
                id: w.newId(),
                kid_id: kid,
                kind: "day-added",
                at: w.at,
                data: {
                    onDay: on,
                    subject: teaching.subject,
                    minutes: teaching.minutes,
                    note: text,
                },
            });
    return out;
}

export const shiftPlan = (
    w: Writing,
    kids: readonly string[],
    from: string,
    weeks: number,
): Draft[] => kids.map((kid) => change(w, kid, { op: "shift", from, weeks }));

export const setSchoolDays = (w: Writing, kid: string, weekdays: Weekday[]): Made =>
    weekdays.length
        ? {
              drafts: [
                  change(w, kid, {
                      op: "school-days",
                      weekdays: [...weekdays].sort((a, b) => a - b),
                  }),
              ],
          }
        : { refused: "A child needs at least one school day." };

export function setTerms(w: Writing, terms: Term[]): Made {
    for (const t of terms)
        if (t.from > t.to) return { refused: `Term ${t.n} ends before it starts.` };
    for (let i = 1; i < terms.length; i++) {
        const before = terms[i - 1];
        const now = terms[i];
        if (before && now && now.from <= before.to)
            return { refused: `Term ${now.n} starts before term ${before.n} ends.` };
    }
    return { drafts: [change(w, null, { op: "terms", terms })] };
}

/** A change put back: one undo per event it was written as, so a family day goes back whole. */
export const putBack = (
    w: Writing,
    events: readonly { id: string; kid: string | null }[],
): Draft[] => events.map((e) => change(w, e.kid, { op: "undo", of: e.id }));

/** What a change did, in the words a grown-up reads under the calendar. */
export function saidOf(
    c: Change,
    names: {
        kid: (id: string | null) => string;
        lesson: (id: string) => string;
        track: (id: string) => string;
        day: (iso: string) => string;
    },
): string {
    const who = names.kid(c.kid);
    switch (c.op.op) {
        case "session":
            return `${who}: ${names.lesson(c.op.lesson)} ${c.op.removed ? "removed from the plan" : c.op.onDay ? `planned for ${names.day(c.op.onDay)}` : "set aside for later"}.`;
        case "routine":
            return `${who}: ${names.track(c.op.track)}, ${c.op.weekdays.length * c.op.sessions} sessions a week from ${names.day(c.op.from)}.`;
        case "days-off":
            return c.op.from === c.op.to
                ? `A day off for ${who} on ${names.day(c.op.from)}: ${c.op.note}.`
                : `Days off for ${who}, ${names.day(c.op.from)} to ${names.day(c.op.to)}: ${c.op.note}.`;
        case "school-days":
            return `${who} works on ${c.op.weekdays.map((d) => WEEKDAYS[d % 7]).join(", ")}.`;
        case "terms":
            return `The terms: ${c.op.terms
                .map((t) => `term ${t.n} from ${names.day(t.from)} to ${names.day(t.to)}`)
                .join(", ")}.`;
        case "move":
            return `${who}: ${names.track(c.op.track)} moved from ${names.day(c.op.from)} to ${names.day(c.op.to)}.`;
        case "shift":
            return `${who}: everything from ${names.day(c.op.from)} moved on ${c.op.weeks} ${c.op.weeks === 1 ? "week" : "weeks"}.`;
        case "park":
            return `${who}: ${names.lesson(c.op.lesson)} parked from ${names.day(c.op.from)} for ${c.op.gapWeeks} ${c.op.gapWeeks === 1 ? "week" : "weeks"}.`;
        case "set-day":
            return c.op.kind === "off"
                ? `${who}: no lesson on ${names.day(c.op.onDay)}.`
                : `${who}: ${names.lesson(c.op.lesson ?? "")} on ${names.day(c.op.onDay)}, ${c.op.kind === "again" ? "again with new numbers" : "as a practice sheet"}.`;
        case "track":
            return `${who}: ${names.track(c.op.track)} ${c.op.on ? `${c.op.perWeek} ${c.op.perWeek === 1 ? "day" : "days"} a week` : "off"}.`;
        case "undo":
            return "A change put back.";
    }
}
