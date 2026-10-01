// The plan a grown-up can change, and a child's record as their view reads it. What a family and its
// dates are called is names.ts, which the child's app reads without any of this.

import {
    settingIn,
    type Companion,
    type Envelope,
    type PlanOp,
    type SessionOp,
} from "../../engine/answer";
import {
    addDays,
    dayIn,
    dayOf,
    finishing,
    fold,
    isSchoolDay,
    mondayOf,
    WEEKDAYS,
    weekdayOf,
    type Progress,
    type Sitting,
} from "../record";
import { defaultTracks, TRACK_TURN, TRACK_TURN_AT } from "../tracks";
import { forChild, progressIn, variantsIn, yearOf, type Variants, type YearLesson } from "../year";
import { chosenWorlds, type ChosenWorlds } from "./chosen";

/** A day that is the same lesson again with new numbers, or a practice sheet, is a day the records count. */
export type DayKind = "lesson" | "again" | "practice" | "off";

export const KIND_LABEL: Record<DayKind, string> = {
    lesson: "New lesson",
    again: "Same lesson, new numbers",
    practice: "Practice sheet",
    off: "No school",
};

export interface PlannedDay {
    session?: string;
    projection?: string;
    completed?: boolean;
    source?: string | null;
    plannedMinutes?: number;
    order?: number;
    on: string;
    kind: DayKind;
    /** The lesson, for every kind but "off". A practice day names the lesson it practises. */
    lesson?: string;
    /** Why the day is what it is, in the parent's own words or in ours. */
    note?: string;
    /** A book lesson's day: the sitting of the book it reads, from 1. */
    part?: number;
}

export interface Plan {
    child: string;
    days: PlannedDay[];
}

export type CellState = "done" | "late" | "part" | "missed" | "planned" | "off";

export const CELL_LABEL: Record<CellState, string> = {
    done: "Done",
    late: "Done later",
    part: "Started, not finished",
    missed: "Not done",
    planned: "Planned",
    off: "No school",
};

export interface Cell extends PlannedDay {
    weekday: string;
    state: CellState;
    minutes: number;
    /** For a day done late, the day it actually happened. */
    doneOn?: string;
}

export interface WeekRow {
    n: number;
    from: string;
    cells: Cell[];
    minutes: number;
    done: number;
    planned: number;
}

/**
 * What happened against what was planned. Each day claims its own sittings first, and only then is
 * a sitting on a later day spent on an earlier day that had none, so the day with nothing on it is
 * the one that reads as not done, and one sitting never answers for two planned days.
 */
export function cellsFor(
    days: readonly PlannedDay[],
    sittings: readonly Sitting[],
    today: string,
): Cell[] {
    const ordered = [...days].sort((a, b) => dayOf(a.on) - dayOf(b.on));
    const spent = new Set<Sitting>();
    const out = new Map<PlannedDay, Cell>();
    const base = (d: PlannedDay): Omit<Cell, "state"> => ({
        ...d,
        weekday: weekdayOf(d.on),
        minutes: 0,
    });
    for (const d of ordered) {
        if (d.kind === "off") {
            out.set(d, { ...base(d), state: "off" });
            continue;
        }
        let here = sittings.filter((s) => s.lesson === d.lesson && s.on === d.on && !spent.has(s));
        if (days.filter((x) => x.on === d.on && x.lesson === d.lesson).length > 1)
            here = here.slice(0, 1);
        if (!here.length) continue;
        for (const s of here) spent.add(s);
        out.set(d, {
            ...base(d),
            state: here.every((s) => s.finished) ? "done" : "part",
            minutes: here.reduce((n, s) => n + s.minutes, 0),
        });
    }
    for (const d of ordered) {
        if (out.has(d)) continue;
        if (dayOf(d.on) >= dayOf(today)) {
            out.set(d, { ...base(d), state: "planned" });
            continue;
        }
        const later = sittings
            .filter(
                (s) =>
                    s.lesson === d.lesson &&
                    !spent.has(s) &&
                    dayOf(s.on) > dayOf(d.on) &&
                    dayOf(s.on) <= dayOf(today),
            )
            .sort((a, b) => dayOf(a.on) - dayOf(b.on))[0];
        if (later) {
            spent.add(later);
            out.set(d, { ...base(d), state: "late", minutes: later.minutes, doneOn: later.on });
            continue;
        }
        out.set(d, { ...base(d), state: "missed" });
    }
    return ordered.flatMap((d) => {
        const c = out.get(d);
        return c ? [c] : [];
    });
}

/** Send session completion to lightweight child consumers without making them fold sittings. */
function plannedCells(days: PlannedDay[], sittings: Sitting[], today: string): PlannedDay[] {
    const cells = cellsFor(days, sittings, today);
    return days.map((day, i) =>
        day.session
            ? { ...day, completed: cells[i]?.state === "done" || cells[i]?.state === "late" }
            : day,
    );
}

/** The plan as weeks of five columns. */
export function weeks(plan: Plan, sittings: readonly Sitting[], today: string): WeekRow[] {
    const cells = cellsFor(
        plan.days,
        sittings.filter((s) => s.child === plan.child),
        today,
    );
    const byWeek = new Map<string, Cell[]>();
    for (const c of cells) {
        const k = mondayOf(c.on);
        byWeek.set(k, [...(byWeek.get(k) ?? []), c]);
    }
    return [...byWeek]
        .sort((a, b) => dayOf(a[0]) - dayOf(b[0]))
        .map(([from, week], i) => ({
            n: i + 1,
            from,
            cells: week,
            minutes: week.reduce((n, c) => n + c.minutes, 0),
            done: week.filter((c) => c.state === "done" || c.state === "late").length,
            planned: week.filter((c) => c.kind !== "off").length,
        }));
}

/** How far behind the plan the family is, which is a count of days and never a judgement. */
export function behind(
    plan: Plan,
    sittings: readonly Sitting[],
    today: string,
): { days: number; lessons: string[] } {
    const cells = weeks(plan, sittings, today)
        .flatMap((w) => w.cells)
        .filter((c) => c.state === "missed");
    return {
        days: cells.length,
        lessons: [...new Set(cells.flatMap((c) => (c.lesson ? [c.lesson] : [])))],
    };
}

/** Moves every day from a date on later by whole weeks, keeping its weekday. */
export function shiftFrom(plan: Plan, from: string, weeksBy: number): Plan {
    return {
        ...plan,
        days: plan.days.map((d) =>
            dayOf(d.on) >= dayOf(from) ? { ...d, on: addDays(d.on, weeksBy * 7) } : d,
        ),
    };
}

// TODO: a parked lesson comes back on Monday to Friday; a child's own school days are not read here yet.
const nextFree = (days: readonly PlannedDay[], from: string): string => {
    let on = from;
    const taken = new Set(days.map((d) => d.on));
    while (taken.has(on) || !isSchoolDay(on)) on = addDays(on, 1);
    return on;
};

/**
 * Parks one lesson: its days from a date on come out and go back after a gap, on free school days,
 * moving nothing else. It leaves no mark anywhere a child sees.
 */
export function park(plan: Plan, lesson: string, from: string, gapWeeks: number): Plan {
    const moved = plan.days.filter((d) => d.lesson === lesson && dayOf(d.on) >= dayOf(from));
    const first = moved[0];
    if (!first) return plan;
    const kept = plan.days.filter((d) => !moved.includes(d));
    const landing = nextFree(kept, addDays(first.on, gapWeeks * 7));
    const back = moved.map((d, i) => ({
        ...d,
        on: nextFree(kept, addDays(landing, i)),
        note: "Parked, and picked up again",
    }));
    return { ...plan, days: [...kept, ...back].sort((a, b) => dayOf(a.on) - dayOf(b.on)) };
}

/** A sentence for each lesson a plan puts before a lesson that opens it, for the parent to read. */
export function outOfOrder(
    plan: Plan,
    prerequisitesOf: (lesson: string) => string[],
    titleOf: (id: string) => string,
): string[] {
    const firstDay = new Map<string, number>();
    for (const d of plan.days) {
        if (d.kind !== "lesson" || !d.lesson) continue;
        const at = dayOf(d.on);
        const had = firstDay.get(d.lesson);
        if (had === undefined || at < had) firstDay.set(d.lesson, at);
    }
    const out: string[] = [];
    for (const [lesson, at] of firstDay) {
        for (const need of prerequisitesOf(lesson)) {
            const needAt = firstDay.get(need);
            if (needAt !== undefined && needAt > at)
                out.push(`${titleOf(lesson)} is planned before ${titleOf(need)}, which opens it.`);
        }
    }
    return out;
}

/** The next thing to do: today, then anything missed, then what is planned. */
export function nextDay(plan: Plan, sittings: readonly Sitting[], today: string): Cell | null {
    const cells = weeks(plan, sittings, today).flatMap((w) => w.cells);
    return (
        cells.find((c) => c.on === today && c.kind !== "off") ??
        cells.find((c) => c.state === "missed") ??
        cells.find((c) => c.state === "planned") ??
        null
    );
}

type PlanChanged = Extract<Envelope, { kind: "plan-changed" }>;

const isPlanChange = (e: Envelope): e is PlanChanged => e.kind === "plan-changed";

const byTime = (a: Envelope, b: Envelope): number => a.at.localeCompare(b.at);

/**
 * The log as a fold reads it: every event but the undos and the changes they take back. An undo
 * names an earlier event and stays in the log, so taking a change back is a change too; an undo of
 * an undo puts the first change back in force.
 */
export function alive<E extends Pick<Envelope, "id" | "at">>(events: readonly E[]): E[] {
    const undoOf = new Map<string, string[]>();
    const isUndo = new Set<string>();
    for (const e of events) {
        const op = undoTarget(e);
        if (op === null) continue;
        isUndo.add(e.id);
        undoOf.set(op, [...(undoOf.get(op) ?? []), e.id]);
    }
    const memo = new Map<string, boolean>();
    const undone = (id: string, seen: ReadonlySet<string> = new Set()): boolean => {
        const had = memo.get(id);
        if (had !== undefined) return had;
        if (seen.has(id)) return false;
        const by = undoOf.get(id) ?? [];
        const out = by.some((u) => !undone(u, new Set([...seen, id])));
        memo.set(id, out);
        return out;
    };
    return [...events]
        .filter((e) => !isUndo.has(e.id) && !undone(e.id))
        .sort((a, b) => a.at.localeCompare(b.at));
}

/** The event an undo names, or null for any other event. */
function undoTarget(e: object): string | null {
    if (!("kind" in e) || e.kind !== "plan-changed" || !("data" in e)) return null;
    const data = e.data;
    if (typeof data !== "object" || data === null || !("op" in data)) return null;
    const op = data.op;
    return typeof op === "object" && op !== null && "op" in op && op.op === "undo" && "of" in op
        ? String(op.of)
        : null;
}

/** Plan changes still in force. */
const livePlanChanges = (events: readonly Envelope[]): PlanChanged[] =>
    alive(events.filter(isPlanChange));

export interface TrackOn {
    on: boolean;
    perWeek: number;
    since: string;
    /** The family set this themselves, rather than taking the grade's default. */
    own: boolean;
}

/** One entry of a kid's plan: a track at a pace, from a day on. */
export interface TrackChange {
    track: string;
    on: boolean;
    perWeek: number;
    day: string;
    /** A change the family wrote, rather than the grade's default. */
    own: boolean;
}

/** A kid's `track` ops in the order they were written, each with the day it was written on. */
function trackChanges(events: readonly Envelope[], kid: string, timeZone: string): TrackChange[] {
    return livePlanChanges(events).flatMap((e) => {
        const op = e.data.op;
        return e.kid_id === kid && op.op === "track"
            ? [
                  {
                      track: op.track,
                      on: op.on,
                      perWeek: op.perWeek,
                      day: dayIn(e.at, timeZone),
                      own: true,
                  },
              ]
            : [];
    });
}

type MovedUp = Extract<Envelope, { kind: "moved-up" }>;

/** One of a kid's school years: the grade they were in and the day it began. */
export interface SchoolYear {
    grade: number;
    from: string;
}

/**
 * A kid's school years, oldest first: the first from `first`, the day their record begins, and one
 * more from each `moved-up` event's day, where a later move on the same day replaces the earlier. The
 * last year's grade is the one on the kid's row, which the move-up route writes with the event.
 */
export function schoolYears(
    events: readonly Envelope[],
    kid: { id: string; grade: number },
    first: string,
): SchoolYear[] {
    const moves = events
        .filter((e): e is MovedUp => e.kind === "moved-up" && e.kid_id === kid.id)
        .sort(byTime);
    const years: SchoolYear[] = [{ grade: moves[0]?.data.from ?? kid.grade, from: first }];
    for (const m of moves) {
        const last = years[years.length - 1];
        if (!last || m.data.onDay > last.from) {
            years.push({ grade: m.data.grade, from: m.data.onDay });
            continue;
        }
        last.grade = m.data.grade;
        // a move taken back on its own day leaves the year before as it was
        if (years.length > 1 && years[years.length - 2]?.grade === last.grade) years.pop();
    }
    const current = years[years.length - 1];
    if (current) current.grade = kid.grade;
    return years;
}

/**
 * Whether a kid may move from their grade to another: the grade next to theirs, up, or back for a
 * move made too early, and a grade that is offered.
 */
export const mayMoveTo = (from: number, to: number, offered: readonly number[]): boolean =>
    Math.abs(to - from) === 1 && offered.includes(to);

/** The lesson that closes a grade's year, its maths review, whose finishing is when a move up is offered. */
export const yearReviewOf = (lessons: readonly YearLesson[], grade: number): string | null =>
    lessons
        .filter((l) => l.grade === grade && l.subject === "maths" && l.format === "review")
        .sort((a, b) => (b.unit ?? 0) - (a.unit ?? 0))[0]?.id ?? null;

/** A year's default as changes on the day it begins, turning off what the year before had and it has not. */
function defaultsOf(year: SchoolYear, before: SchoolYear | undefined): TrackChange[] {
    const now = defaultTracks(year.grade);
    const on = Object.entries(now).flatMap(([track, perWeek]) =>
        perWeek === undefined ? [] : [{ track, on: true, perWeek, day: year.from, own: false }],
    );
    const off = Object.keys(before ? defaultTracks(before.grade) : {})
        .filter((track) => !(track in now))
        .map((track) => ({ track, on: false, perWeek: 0, day: year.from, own: false }));
    return [...on, ...off];
}

/**
 * A kid's plan in the order it was made: their first grade's default, as a change on the day their
 * record begins, then their own `track` ops and each later year's default on the day it began, in
 * the order of their days. A family that has changed nothing follows `DEFAULT_TRACKS`, and a parent
 * turning a subject off or changing its pace writes an ordinary `track` op that wins over the default
 * for that track until the next year's default. Nothing here is stored.
 */
function planChanges(
    events: readonly Envelope[],
    kid: { id: string; grade: number },
    timeZone: string,
    first: string,
): TrackChange[] {
    const years = schoolYears(events, kid, first);
    const [start, ...later] = years.map((y, i) => defaultsOf(y, years[i - 1]));
    // a stable sort, so a year's default comes before a change the family made on its first day
    const rest = [...later.flat(), ...trackChanges(events, kid.id, timeZone)].sort((a, b) =>
        a.day.localeCompare(b.day),
    );
    return [...(start ?? []), ...rest];
}

/** A kid's tracks, the latest entry of their plan for a track winning, or the latest before a day. */
export function planOf(
    events: readonly Envelope[],
    kid: { id: string; grade: number },
    timeZone: string,
    first: string,
    before?: string,
): Map<string, TrackOn> {
    const out = new Map<string, TrackOn>();
    for (const c of planChanges(events, kid, timeZone, first))
        if (before === undefined || c.day < before)
            out.set(c.track, { on: c.on, perWeek: c.perWeek, since: c.day, own: c.own });
    return out;
}

/**
 * The first school day on or after the kid's earliest `track` op that turned a track on. A school day
 * here is Monday to Friday, whatever the child's own school days are, since those are read from the
 * same day on.
 */
export function startOf(events: readonly Envelope[], kid: string, timeZone: string): string | null {
    const first = livePlanChanges(events)
        .filter((e) => e.kid_id === kid && e.data.op.op === "track" && e.data.op.on)
        .sort(byTime)[0];
    if (!first) return null;
    let on = dayIn(first.at, timeZone);
    while (!isSchoolDay(on)) on = addDays(on, 1);
    return on;
}

/** The ops that move a kid's days, in the order they were written, with the day each was written. */
export function movesOf(
    events: readonly Envelope[],
    kid: string,
    timeZone: string,
): { on: string; op: PlanOp }[] {
    return livePlanChanges(events)
        .filter(
            (e) =>
                (e.kid_id === kid || e.kid_id === null) &&
                e.data.op.op !== "track" &&
                e.data.op.op !== "terms",
        )
        .map((e) => ({ on: dayIn(e.at, timeZone), op: e.data.op }));
}

/** The weekdays a track is worked on, by how many days a week (.docs/api.md). Monday is 1. */
const WEEKDAYS_FOR: Record<number, number[]> = {
    1: [3],
    2: [2, 4],
    3: [1, 3, 5],
    4: [1, 2, 3, 4],
    5: [1, 2, 3, 4, 5],
};

const KIND_NOTE: Partial<Record<DayKind, string>> = {
    again: "Same lesson, new numbers",
    practice: "Practice sheet from the same items",
};

const weekdayNumber = (day: string): number => WEEKDAYS.indexOf(weekdayOf(day)) || 7;

/** Which of a child's school days a pace takes, as places in that list, before a track's turn. */
function placesFor(days: readonly number[], perWeek: number): number[] {
    if (days.length === 5 && days.every((day, i) => day === i + 1))
        return (WEEKDAYS_FOR[Math.max(0, Math.min(5, Math.round(perWeek)))] ?? []).map(
            (d) => d - 1,
        );
    const count = Math.max(0, Math.min(days.length, Math.round(perWeek)));
    if (count === 0) return [];
    if (count === 1) return [Math.floor(days.length / 2)];
    return Array.from({ length: count }, (_, i) =>
        Math.round((i * (days.length - 1)) / (count - 1)),
    );
}

/**
 * The weekdays a track is worked on: `perWeek` of a child's school days, spread through the week and
 * then turned along it by the track's own offset, so two tracks at the same pace do not land on the
 * same days. Without the turn every track at one day a week falls on the same Wednesday, which a
 * default that has several of them would give a child as one long day and four empty ones. At offset
 * zero over Monday to Friday this is the table above, which .docs/api.md gives.
 */
export function pickWeekdays(days: readonly number[], perWeek: number, offset = 0): number[] {
    const places = placesFor(days, perWeek);
    if (!places.length) return [];
    const turn = ((offset % days.length) + days.length) % days.length;
    return places.map((i) => days[(i + turn) % days.length] ?? 0).sort((a, b) => a - b);
}

const TURNS: Readonly<Record<string, number>> = TRACK_TURN;
const TURNS_AT: Readonly<Record<string, Readonly<Record<number, number>> | undefined>> =
    TRACK_TURN_AT;

/**
 * How far along the week a track leans, at a grade where it leans its own way. A subject that is not
 * a track takes no turn.
 */
export const turnOf = (track: string, grade?: number): number =>
    (grade === undefined ? undefined : TURNS_AT[track]?.[grade]) ?? TURNS[track] ?? 0;

export interface PlanInput {
    track: string;
    /** The grade of the year being planned, for a track that turns its own way there (`TRACK_TURN_AT`). */
    grade?: number;
    /** The track's lessons for this kid, in the track's order. */
    lessons: string[];
    perWeek: number;
    start: string;
    today: string;
    /** The last day worth planning, a week or two past today. */
    until: string;
    moves: { on: string; op: PlanOp }[];
    /** This kid's sittings in this track. */
    sittings: Sitting[];
    /** A book lesson's sittings, by lesson: it takes a day for each, whatever the pace. */
    parts?: ReadonlyMap<string, number>;
}

/** The note on a book lesson's day, which says which of its sittings the day reads. */
export const sittingNote = (n: number, of: number): string => `Sitting ${n} of ${of}`;

/**
 * One track's planned days for one kid. Each planned weekday works the track's current lesson, which
 * moves on when the family moves on, and a shift moves every day from its date on by whole weeks. A
 * day behind today holds what was worked on it, or the lesson that was current if nothing was; a day
 * ahead is the first lesson not done and not parked that day, for as many days as the pace this kid
 * has kept so far, and then the next, so a parked lesson comes back after its gap.
 */
export function trackDays(p: PlanInput): PlannedDay[] {
    const schoolDaysOn = (day: string): number[] => {
        const changed = p.moves
            .filter((move) => move.on <= day && move.op.op === "school-days")
            .at(-1);
        return changed?.op.op === "school-days" ? changed.op.weekdays : [1, 2, 3, 4, 5];
    };
    // a day recorded off after it has gone is off too, so it stops reading as not done
    const offOn = (day: string): boolean =>
        p.moves.some(({ op }) => op.op === "days-off" && op.from <= day && day <= op.to);
    let dates: string[] = [];
    for (let d = p.start; dayOf(d) <= dayOf(p.until); d = addDays(d, 1)) {
        const rule = p.moves
            .flatMap(({ op }) =>
                op.op === "routine" && op.track === p.track && op.from <= d ? [op] : [],
            )
            .at(-1);
        const weekdays = rule
            ? rule.weekdays
            : pickWeekdays(schoolDaysOn(d), p.perWeek, turnOf(p.track, p.grade));
        if (weekdays.includes(weekdayNumber(d)) && !offOn(d))
            for (let n = 0; n < (rule?.sessions ?? 1); n++) dates.push(d);
    }
    for (const m of p.moves) {
        if (m.op.op !== "shift") continue;
        const { from, weeks: by } = m.op;
        dates = dates.map((d) => (d >= from ? addDays(d, by * 7) : d));
    }
    dates = dates.filter((d) => dayOf(d) <= dayOf(p.until) + 7 && !offOn(d)).sort();

    const parked = p.moves.flatMap((m) =>
        m.op.op === "park"
            ? [{ lesson: m.op.lesson, from: m.op.from, to: addDays(m.op.from, m.op.gapWeeks * 7) }]
            : [],
    );
    const isParked = (lesson: string, d: string) =>
        parked.some((x) => x.lesson === lesson && d >= x.from && d < x.to);
    const partsOf = (lesson: string): number => p.parts?.get(lesson) ?? 1;
    /** The lessons finished before a day, a book once every one of its sittings is. */
    const doneBy = (d: string, before: boolean): Set<string> =>
        new Set(
            p.lessons.filter((l) =>
                finishing(
                    p.sittings.filter((s) => s.lesson === l && (before ? s.on < d : s.on <= d)),
                    partsOf(l),
                ),
            ),
        );
    const currentOn = (d: string): string | null => {
        const done = doneBy(d, true);
        return p.lessons.find((l) => !done.has(l) && !isParked(l, d)) ?? null;
    };

    const days: PlannedDay[] = [];
    const used = new Set<Sitting>();
    for (const d of dates.filter((x) => x <= p.today)) {
        const sat = p.sittings.find((s) => s.on === d && !used.has(s));
        if (sat) used.add(sat);
        const lesson = sat?.lesson ?? currentOn(d);
        if (lesson) days.push({ on: d, kind: "lesson", lesson });
    }

    // The pace: the middle of how many planned days each finished lesson took this kid. A book's days
    // are its sittings, so it says nothing about the pace.
    const spans = new Map<string, number>();
    for (const d of days) spans.set(d.lesson ?? "", (spans.get(d.lesson ?? "") ?? 0) + 1);
    const finished = new Set(p.sittings.filter((s) => s.finished).map((s) => s.lesson));
    const took = [...spans]
        .filter(([l]) => finished.has(l) && partsOf(l) === 1)
        .map(([, n]) => n)
        .sort((a, b) => a - b);
    const pace = Math.max(1, Math.min(5, took[Math.floor(took.length / 2)] ?? 3));

    const nowDone = doneBy(p.today, false);
    const remaining = p.lessons.filter((l) => !nowDone.has(l));
    // a book takes a day for each of its sittings, and any other lesson the pace this kid keeps
    const daysFor = (l: string): number => (partsOf(l) > 1 ? partsOf(l) : pace);
    const left = new Map(remaining.map((l) => [l, daysFor(l)]));
    const first = remaining[0];
    if (first !== undefined) left.set(first, Math.max(1, daysFor(first) - (spans.get(first) ?? 0)));
    for (const d of dates.filter((x) => x > p.today)) {
        if (!remaining.length) break;
        // a parked lesson waits its gap out and is picked up after it, with its full pace
        const lesson = remaining.find((l) => !isParked(l, d));
        if (lesson === undefined) continue;
        days.push({ on: d, kind: "lesson", lesson });
        const n = (left.get(lesson) ?? 1) - 1;
        left.set(lesson, n);
        if (n <= 0) remaining.splice(remaining.indexOf(lesson), 1);
    }

    for (const m of p.moves) {
        if (m.op.op !== "set-day") continue;
        const { onDay, kind, lesson, note } = m.op;
        const at = days.findIndex((d) => d.on === onDay);
        if (kind === "off") {
            if (at >= 0) days.splice(at, 1);
            continue;
        }
        if (!lesson || !p.lessons.includes(lesson)) continue;
        const day: PlannedDay = { on: onDay, kind, lesson, ...(note ? { note } : {}) };
        if (at >= 0) days[at] = day;
        else days.push(day);
    }

    for (const m of p.moves) {
        const op = m.op;
        if (op.op !== "move" || op.track !== p.track) continue;
        const from = days.find((d) => d.on === op.from);
        if (!from) continue;
        const there = days.find((d) => d.on === op.to);
        if (there) there.on = op.from;
        from.on = op.to;
    }

    days.sort((a, b) => dayOf(a.on) - dayOf(b.on));
    const seen = new Map<string, number>();
    const projected = days.map((d): PlannedDay => {
        if (d.note) return d;
        const n = (seen.get(d.lesson ?? "") ?? 0) + 1;
        seen.set(d.lesson ?? "", n);
        const parts = partsOf(d.lesson ?? "");
        if (parts > 1 && n <= parts)
            return { ...d, kind: "lesson", note: sittingNote(n, parts), part: n };
        const after = parts > 1 ? n - parts + 1 : n;
        const kind: DayKind = after === 1 ? "lesson" : after === 2 ? "again" : "practice";
        const note = KIND_NOTE[kind];
        return { ...d, kind, ...(note ? { note } : {}) };
    });
    return placedDays(projected, p);
}

/** A projection slot has a stable identity independent of whichever lesson pacing puts there. */
export const sessionKey = (track: string, day: PlannedDay, slot = 0): string =>
    day.session ?? day.projection ?? `${track}:${day.on}:${slot}`;

export function sessionChanges(moves: PlanInput["moves"]): SessionOp[] {
    const current = new Map<string, SessionOp>();
    for (const { op } of moves) if (op.op === "session") current.set(op.id, op);
    return [...current.values()];
}

/** Manual placements survive recurrence changes. Moving appends; it never swaps a neighbour. */
function placedDays(projected: PlannedDay[], p: PlanInput): PlannedDay[] {
    const slots = new Map<string, number>();
    const tagged = p.moves.some(
        (m) => (m.op.op === "session" || m.op.op === "routine") && m.op.track === p.track,
    );
    const days = new Map(
        projected.map((d) => {
            const slot = slots.get(d.on) ?? 0;
            slots.set(d.on, slot + 1);
            const key = sessionKey(p.track, d, slot);
            return [key, tagged ? { ...d, projection: key } : d] as const;
        }),
    );
    const completed = (d: PlannedDay): boolean => {
        if (!p.sittings.some((s) => s.on === d.on && s.lesson === d.lesson)) return false;
        const cell = cellsFor([...days.values()], p.sittings, p.today).find((c) =>
            d.session
                ? c.session === d.session
                : d.projection
                  ? c.projection === d.projection
                  : c.on === d.on && c.lesson === d.lesson,
        );
        return cell?.state === "done" || cell?.state === "late" || cell?.state === "part";
    };
    for (const { op } of p.moves) {
        if (op.op !== "session" || op.track !== p.track) continue;
        const previous = days.get(op.id) ?? (op.source ? days.get(op.source) : undefined);
        if (previous && completed(previous)) continue;
        if (op.source) days.delete(op.source);
        days.delete(op.id);
        if (!op.removed && op.onDay)
            days.set(op.id, {
                session: op.id,
                source: op.source,
                on: op.onDay,
                lesson: op.lesson,
                kind: op.kind,
                note: op.note,
                plannedMinutes: op.minutes,
                order: op.order,
            });
    }
    // A change to today's routine cannot erase work already begun today.
    if (tagged)
        for (const sitting of p.sittings) {
            if (
                ![...days.values()].some((d) => d.on === sitting.on && d.lesson === sitting.lesson)
            ) {
                const id = `record:${p.track}:${sitting.on}:${sitting.lesson}`;
                days.set(id, {
                    on: sitting.on,
                    lesson: sitting.lesson,
                    kind: "lesson",
                    projection: id,
                });
            }
        }
    return [...days.values()]
        .filter((d) => d.on <= p.until || completed(d))
        .sort((a, b) => a.on.localeCompare(b.on) || (a.order ?? 0) - (b.order ?? 0));
}

/** Includes manual-only subjects and paused tracks without turning their curriculum back on. */
function scheduledTracks(
    plan: Map<string, TrackOn>,
    moves: PlanInput["moves"],
): Map<string, TrackOn> {
    const out = new Map(plan);
    for (const { op, on } of moves)
        if (op.op === "session" || op.op === "routine") {
            if (!out.has(op.track))
                out.set(op.track, { on: false, perWeek: 0, since: on, own: true });
        }
    return out;
}

/**
 * A track's lessons for a kid of a grade, in unit and then file order. A track with nothing written
 * at the kid's grade reads the nearest grade below it that has some, never a grade above, and is
 * empty when there is none.
 */
export function laneOf(lessons: readonly YearLesson[], track: string, grade: number): string[] {
    const own = lessons.filter((l) => l.subject === track && l.grade <= grade);
    const nearest = Math.max(...own.map((l) => l.grade));
    return own
        .filter((l) => l.grade === nearest)
        .sort((a, b) => (a.unit ?? 1) - (b.unit ?? 1) || a.source.localeCompare(b.source))
        .map((l) => l.id);
}

/** One track of a kid's plan, laid out over every school year they have had. */
export interface Lane {
    track: string;
    /** The track as the plan has it now. */
    on: TrackOn;
    /** The track's lessons at the kid's grade now. */
    lessons: string[];
    days: PlannedDay[];
    /** The kid's sittings in any lesson a year of this track planned or a grown-up placed. */
    sittings: Sitting[];
}

/**
 * A kid's tracks, each laid out year by year: a year plans its own grade's lessons at the pace its
 * plan had, from the day it began to the day before the next began, so a day planned before a move
 * keeps the old grade's lesson and is never read against the new grade's.
 */
export function lanesOf(o: {
    events: readonly Envelope[];
    kid: { id: string; grade: number };
    lessons: readonly YearLesson[];
    /** This kid's sittings. */
    sittings: readonly Sitting[];
    timeZone: string;
    /** The day the kid's record begins. */
    first: string;
    today: string;
    until: string;
}): Lane[] {
    const years = schoolYears(o.events, o.kid, o.first);
    const moves = movesOf(o.events, o.kid.id, o.timeZone);
    const placed = sessionChanges(moves);
    const plans = years.map((_, i) =>
        planOf(o.events, o.kid, o.timeZone, o.first, years[i + 1]?.from),
    );
    const now = planOf(o.events, o.kid, o.timeZone, o.first);
    const shown = forChild(o.lessons, variantsIn(o.events, o.kid.id));
    const parts = new Map(
        o.lessons.flatMap((l) => (l.parts === undefined ? [] : [[l.id, l.parts] as const])),
    );
    return [...scheduledTracks(now, moves)].map(([track, on]) => {
        const own = placed.filter((s) => s.track === track).map((s) => s.lesson);
        const lanes = years.map((y) => laneOf(shown, track, y.grade));
        const inLane = new Set([...lanes.flat(), ...own]);
        const sittings = o.sittings.filter((s) => inLane.has(s.lesson));
        const days = years.flatMap((y, i) => {
            const next = years[i + 1]?.from;
            const lane = lanes[i] ?? [];
            const inYear = new Set([...lane, ...own]);
            const pace = plans[i]?.get(track);
            return trackDays({
                track,
                grade: y.grade,
                lessons: lane,
                perWeek: pace?.on ? pace.perWeek : 0,
                start: y.from,
                today: o.today,
                until: next !== undefined && next <= o.until ? addDays(next, -1) : o.until,
                moves,
                sittings: sittings.filter((s) => inYear.has(s.lesson)),
                parts,
            }).filter((d) => (i === 0 || d.on >= y.from) && (next === undefined || d.on < next));
        });
        return { track, on, lessons: lanes[lanes.length - 1] ?? [], days, sittings };
    });
}

/** A screen sitting begun and not ended, which the view opens at its first unanswered question. */
export interface Unfinished {
    sitting: string;
    lesson: string;
    lessonHash: string;
    began: string;
    /** The numbers of the questions answered in it, each once however many tries it took. */
    answered: number[];
}

/** A child's record as their view reads it, worked out from their log and never stored. */
export interface ChildRecord {
    today: string;
    /** The first day of the kid's current school year, or null before a track was turned on. */
    start: string | null;
    /** The plan in the order it was made, the grade's default first, as the worlds read the plan. */
    tracks: TrackChange[];
    /** Each grade's progress, lowest first: every grade up to the kid's, and any with a finished lesson. */
    years: { grade: number; progress: Progress }[];
    /** The planned days of each track that is on, three weeks past today. */
    plan: { track: string; days: PlannedDay[] }[];
    unfinished: Unfinished[];
    /** The worlds the family chose, each term's as it stood when its first work happened. */
    worlds: ChosenWorlds;
    /** The settings that decide which variants of a lesson the child is shown (`forChild` in year.ts). */
    variants: Variants;
    /** What the child's screens keep between devices: each game's practice level, and the easel. */
    kept: Kept;
}

export interface Kept {
    /** Each game's practice level, by the game's id. */
    practice: Record<string, number>;
    /** The easel's tools and colours, which `readState` in engine/ui/painting-easel.ts reads; null for none. */
    painting: unknown;
    /** The companion's face the child last chose; null until they choose one. */
    companion: Companion | null;
}

/** A child's kept settings from their log, the latest of each winning. */
export function keptIn(events: readonly Envelope[], kid: string): Kept {
    const games = new Set(
        events.flatMap((e) =>
            e.kind === "setting-changed" && e.kid_id === kid && e.data.key === "practice"
                ? [e.data.of ?? ""]
                : [],
        ),
    );
    const practice: Record<string, number> = {};
    for (const game of games) {
        const level = settingIn(events, "practice", kid, game);
        if (typeof level === "number") practice[game] = level;
    }
    return {
        practice,
        painting: settingIn(events, "painting", kid) ?? null,
        companion: settingIn(events, "companion", kid) ?? null,
    };
}

/** How far past today the plan is laid out for a child's view. */
const PLANNED_AHEAD = 21;

export function childRecord(
    events: readonly Envelope[],
    kid: { id: string; grade: number },
    all: readonly YearLesson[],
    timeZone: string,
    today: string,
): ChildRecord {
    const subjectOf = new Map(all.map((l) => [l.id, l.subject]));
    const variants = variantsIn(events, kid.id);
    const lessons = forChild(all, variants);
    const f = fold(events, timeZone, (id) => subjectOf.get(id) ?? "maths");
    const mine = f.sittings.filter((s) => s.child === kid.id);
    const start = startOf(events, kid.id, timeZone);
    const first = start ?? mine.map((s) => s.on).sort()[0] ?? today;
    const schooled = schoolYears(events, kid, first);
    const current = schooled[schooled.length - 1]?.from ?? first;
    // a grade's weeks count from the year the kid was last in it, and any other from the year they are in
    const began = (grade: number): string =>
        schooled.filter((y) => y.grade === grade).at(-1)?.from ?? current;

    const finished = new Set(mine.filter((s) => s.finished).map((s) => s.lesson));
    const grades = new Set(
        lessons.flatMap((l) => (l.grade <= kid.grade || finished.has(l.id) ? [l.grade] : [])),
    );
    const years = [...grades]
        .sort((a, b) => a - b)
        .map((grade) => ({
            grade,
            progress: progressIn(
                yearOf(lessons, grade, "", began(grade)),
                kid.id,
                f.attempts,
                mine,
                began(grade),
                today,
            ),
        }));

    const plan = lanesOf({
        events,
        kid,
        lessons,
        sittings: mine,
        timeZone,
        first,
        today,
        until: addDays(today, PLANNED_AHEAD),
    }).map((lane) => ({
        track: lane.track,
        days: plannedCells(lane.days, lane.sittings, today),
    }));

    const ended = new Set(
        events.flatMap((e) => (e.kind === "sitting-ended" ? [e.data.sitting] : [])),
    );
    const unfinished = events
        .filter((e) => e.kid_id === kid.id)
        .flatMap((e) =>
            e.kind === "sitting-began" && e.data.mode === "screen" && !ended.has(e.data.sitting)
                ? [
                      {
                          sitting: e.data.sitting,
                          lesson: e.data.lesson,
                          lessonHash: e.data.lessonHash,
                          began: e.at,
                          answered: [
                              ...new Set(
                                  events.flatMap((a) =>
                                      a.kind === "answered" && a.data.sitting === e.data.sitting
                                          ? [a.data.q.n]
                                          : [],
                                  ),
                              ),
                          ],
                      },
                  ]
                : [],
        )
        .sort((a, b) => a.began.localeCompare(b.began));

    return {
        today,
        start: start === null && schooled.length === 1 ? null : current,
        tracks: planChanges(events, kid, timeZone, first),
        years,
        plan,
        unfinished,
        worlds: chosenWorlds(events, kid.id, lessons, timeZone),
        variants,
        kept: keptIn(events, kid.id),
    };
}
