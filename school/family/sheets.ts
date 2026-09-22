// What came back, read by the sheet, and marking it. A sheet is one sitting of one lesson with what
// was answered or marked on it, which is the thing a family pins up and a grown-up marks; nothing here
// is new evidence, only the log's sittings and attempts grouped the way a family handles paper. A
// grown-up's page reads it beside the child's record (`childWeek`), folded on the server, since a
// child's log runs to megabytes (.docs/api.md).

import type { Draft, Envelope, QuestionRef } from "../../engine/answer";
import type { PackLesson, PackLevel, PackQuestion, PackRule } from "../../engine/pack";
import {
    addDays,
    dayOf,
    fold,
    mondayOf,
    sheetFor,
    type Attempt,
    type Mode,
    type Printed,
    type Sitting,
} from "../record/record";
import type { YearLesson } from "../year";

/** One sheet that came back, which is one sitting and whatever was answered or marked on it. */
export interface SheetBack {
    child: string;
    lesson: string;
    /** The track, which is the lesson's subject. */
    subject: string;
    on: string;
    mode: Mode;
    minutes: number;
    finished: boolean;
    withGrownUp: boolean;
    /** Answers recorded for this sitting. Zero for a paper sheet nobody has marked yet. */
    asked: number;
    /** How many of them were right first time. */
    right: number;
    /**
     * The mistakes that came up on this sheet, as the line the author wrote for each, most frequent
     * first. The verifier has proved a rule cannot fire on a right answer, so a line here names a
     * mistake rather than guessing at one.
     */
    mistakes: { rule: string; times: number }[];
    /** Screen work is marked as the child goes; paper work once a grown-up has marked it. */
    marked: boolean;
    /** The printed sheet a paper sitting was worked from, or null for screen work or a sheet printed elsewhere. */
    sheet: string | null;
    /** For a paper sheet still to mark, its questions as they were printed; empty otherwise. */
    questions: QuestionRef[];
}

/**
 * Every sheet a child has done, oldest first, optionally between two days inclusive. A sitting's
 * answers are the attempts on the same lesson on the same day, which is how `fold` dates a paper mark.
 */
export function sheetsBack(
    child: string,
    sittings: readonly Sitting[],
    attempts: readonly Attempt[],
    from?: string,
    to?: string,
    printed: readonly Printed[] = [],
): SheetBack[] {
    const inside = (on: string): boolean =>
        (!from || dayOf(on) >= dayOf(from)) && (!to || dayOf(on) <= dayOf(to));
    return sittings
        .filter((s) => s.child === child && inside(s.on))
        .sort((a, b) => dayOf(a.on) - dayOf(b.on) || a.subject.localeCompare(b.subject))
        .map((s) => {
            const mine = attempts.filter(
                (a) => a.child === child && a.lesson === s.lesson && a.on === s.on,
            );
            const byRule = new Map<string, number>();
            for (const a of mine) if (a.rule) byRule.set(a.rule, (byRule.get(a.rule) ?? 0) + 1);
            const marked = mine.length > 0;
            const paper = s.mode === "paper" ? sheetFor(printed, child, s.lesson, s.on) : null;
            return {
                child,
                lesson: s.lesson,
                subject: s.subject,
                on: s.on,
                mode: s.mode,
                minutes: s.minutes,
                finished: s.finished,
                withGrownUp: s.withGrownUp,
                asked: mine.length,
                right: mine.filter((a) => a.right && a.tries === 1).length,
                mistakes: [...byRule]
                    .map(([rule, times]) => ({ rule, times }))
                    .sort((a, b) => b.times - a.times),
                marked,
                sheet: paper?.sheet ?? null,
                questions: paper && !marked ? paper.questions : [],
            };
        });
}

/**
 * Whether a sheet came back right: finished, marked, and every answer on it right first time. It is
 * the one rule behind a star on the grown-ups' side, a fact about one sheet: a star is never added
 * up, never shown as a count, and never stands between a child and the next lesson.
 */
export const cameBackRight = (s: SheetBack): boolean =>
    s.finished && s.marked && s.asked > 0 && s.right === s.asked;

/**
 * Paper sheets that came back and have not been marked, oldest first, since the oldest is the
 * evidence about to stop being useful.
 */
export const waitingToMark = (
    child: string,
    sittings: readonly Sitting[],
    attempts: readonly Attempt[],
    printed: readonly Printed[] = [],
): SheetBack[] =>
    sheetsBack(child, sittings, attempts, undefined, undefined, printed).filter(
        (s) => s.mode === "paper" && !s.marked,
    );

/** The five school days of the week a day falls in, Monday first. */
export const schoolWeek = (on: string): string[] => {
    const monday = mondayOf(on);
    return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
};

/** The Monday a number of weeks before or after the week a day falls in. */
export const weekShift = (on: string, weeks: number): string => addDays(mondayOf(on), weeks * 7);

/** A sheet's answers as a family says them: "7 of 8 right first time", or what is missing. */
export function sheetSays(s: SheetBack): string {
    if (!s.marked)
        return s.mode === "paper" ? "Came back on paper, not marked yet" : "Nothing recorded";
    const all = `${s.right} of ${s.asked} right first time`;
    return s.finished ? all : `${all}, stopped part way`;
}

/** What became of one planned lesson on one day, or a lesson done on a day it was not planned for. */
export type DayItemState = "done" | "part" | "missed" | "planned" | "extra";

export interface DayItem {
    lesson: string;
    state: DayItemState;
    sheet?: SheetBack;
}

/**
 * A day's plan set against what came back that day. A planned lesson with a sheet from that day is
 * done, or part done if the sitting stopped; one with no sheet is planned today or later, and missed
 * once the day has gone, which is a fact about a day and never a verdict on a child. A sheet from
 * that day that was not planned for it is kept, as extra, since a lesson moved to Wednesday was still
 * done on Wednesday. Each sheet is used once.
 */
export function dayItems(
    planned: readonly string[],
    back: readonly SheetBack[],
    on: string,
    today: string,
): DayItem[] {
    const out: DayItem[] = [];
    const used = new Set<SheetBack>();
    for (const lesson of planned) {
        const s = back.find((b) => b.lesson === lesson && b.on === on && !used.has(b));
        if (s) {
            used.add(s);
            out.push({ lesson, state: s.finished ? "done" : "part", sheet: s });
        } else out.push({ lesson, state: dayOf(on) < dayOf(today) ? "missed" : "planned" });
    }
    for (const s of back)
        if (s.on === on && !used.has(s)) out.push({ lesson: s.lesson, state: "extra", sheet: s });
    return out;
}

/** The one thing worth a grown-up's look: a mistake its author named that came up more than once. */
export interface Look {
    rule: string;
    /** The lesson it came up in most. */
    lesson: string;
    times: number;
    days: number;
}

/** How far back the one thing to look at is read, in days. */
const LOOK_BACK = 28;

/**
 * The author's line for the mistake that came up most often in a child's last four weeks, in the
 * lesson it came up in most, or null when no named mistake came up more than once. The latest wins a
 * tie, since it is the one still happening.
 */
export function lookOf(attempts: readonly Attempt[], child: string, today: string): Look | null {
    const since = dayOf(today) - LOOK_BACK;
    const by = new Map<string, { lessons: Map<string, number>; days: Set<string>; last: string }>();
    for (const a of attempts) {
        if (a.child !== child || !a.rule || dayOf(a.on) <= since || dayOf(a.on) > dayOf(today))
            continue;
        const had = by.get(a.rule) ?? { lessons: new Map(), days: new Set(), last: a.on };
        had.lessons.set(a.lesson, (had.lessons.get(a.lesson) ?? 0) + 1);
        had.days.add(a.on);
        if (a.on > had.last) had.last = a.on;
        by.set(a.rule, had);
    }
    const ranked = [...by]
        .map(([rule, h]) => ({
            rule,
            times: [...h.lessons.values()].reduce((n, x) => n + x, 0),
            days: h.days.size,
            last: h.last,
            lesson: [...h.lessons].sort((x, y) => y[1] - x[1])[0]?.[0] ?? "",
        }))
        .filter((r) => r.times > 1)
        .sort((x, y) => y.times - x.times || y.last.localeCompare(x.last));
    const best = ranked[0];
    return best
        ? { rule: best.rule, lesson: best.lesson, times: best.times, days: best.days }
        : null;
}

/** What a grown-up's page reads of one child beside their record. */
export interface ChildWeek {
    /** The Monday of last week, from which `back` holds every sheet. */
    from: string;
    /** Every sheet from `from` to today, and every paper sheet still waiting to be marked, oldest first. */
    back: SheetBack[];
    look: Look | null;
}

/** One child's sheets and their one thing to look at, folded from their log. */
export function childWeek(
    events: readonly Envelope[],
    kid: string,
    lessons: readonly YearLesson[],
    timeZone: string,
    today: string,
): ChildWeek {
    const subjectOf = new Map(lessons.map((l) => [l.id, l.subject]));
    const f = fold(events, timeZone, (id) => subjectOf.get(id) ?? "maths");
    const from = weekShift(today, -1);
    const all = sheetsBack(kid, f.sittings, f.attempts, undefined, today, f.printed);
    return {
        from,
        back: all.filter((s) => dayOf(s.on) >= dayOf(from) || (s.mode === "paper" && !s.marked)),
        look: lookOf(f.attempts, kid, today),
    };
}

/** One question on a sheet to mark: as it was printed, its answer, and the author's lines for its mistakes. */
export interface ToMark {
    ref: QuestionRef;
    /** The answer as the grown-ups' sheet writes it; empty where the grown-up is the marker. */
    answer: string;
    /** The lines the author wrote for this question's mistakes, each a one-tap diagnosis. */
    rules: string[];
}

const levelOf = (lesson: PackLesson, hash: string): PackLevel =>
    [lesson.levels.easy, lesson.levels.medium, lesson.levels.hard].find((l) => l?.hash === hash) ??
    lesson.levels.medium;

const linesOf = (rules: readonly PackRule[]): string[] =>
    rules.flatMap((r) => [
        ...r.say.map((s) => s.replace(/\s*\n\s*/g, " ").trim()),
        ...linesOf(r.children),
    ]);

function questionFor(lesson: PackLesson, ref: QuestionRef): PackQuestion | null {
    for (const section of levelOf(lesson, ref.lessonHash).sections)
        for (const block of section.blocks) {
            if (block.k !== "ask" || block.item.id !== ref.item) continue;
            const all = [...block.questions, ...block.again.flat()];
            const q =
                all.find((x) => x.variant === ref.variant && x.n === ref.n) ??
                all.find((x) => x.variant === ref.variant);
            if (q) return q;
        }
    return null;
}

/**
 * The marking column for a sheet: each question as it was printed, with its answer and its mistakes'
 * lines read from the lesson at the level it was printed at. A question the lesson no longer holds is
 * still marked, right or wrong, with no answer to show.
 */
export function toMark(lesson: PackLesson, questions: readonly QuestionRef[]): ToMark[] {
    return questions
        .filter((ref) => ref.n > 0)
        .map((ref) => {
            const q = questionFor(lesson, ref);
            return {
                ref,
                answer: q
                    ? Object.entries(q.answers)
                          .map(([k, v]) => q.labels?.[k] ?? v)
                          .join(", ")
                    : "",
                rules: q ? [...new Set(linesOf(q.feedback))].filter(Boolean) : [],
            };
        });
}

/**
 * The marks a grown-up gives a sheet: every question right but those tapped wrong, each wrong one
 * with the author's line the grown-up chose, or none. The grown-up marks rather than copies out what
 * the child wrote, so what was given is recorded as marked by a grown-up. Marking a sheet again
 * corrects it, since the latest mark of a question wins.
 */
export function marksOf(o: {
    kid: string;
    sheet: string;
    items: readonly ToMark[];
    wrong: ReadonlyMap<number, string | null>;
    at: string;
    newId: () => string;
}): Draft[] {
    return o.items.map((item) => ({
        id: o.newId(),
        kid_id: o.kid,
        kind: "marked",
        at: o.at,
        data: {
            sheet: o.sheet,
            q: item.ref,
            given: { k: "unmarked" },
            right: !o.wrong.has(item.ref.n),
            rule: o.wrong.get(item.ref.n) ?? null,
        },
    }));
}
