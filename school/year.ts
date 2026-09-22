import type { LessonFacts } from "../engine/pack";
import { mastery, progressOf, type Attempt, type Progress, type Sitting } from "./record/record";

export type Format = "teach" | "puzzles" | "worked" | "review";
export type Marker = "sky" | "mint" | "berry" | "tang" | "glow";

/** `short` is the name written on the map, where there is room for a few words only. */
export interface Unit {
    n: number;
    title: string;
    short: string;
    marker: Marker;
    about: string;
}

export interface LessonDef {
    id: string;
    unit: number;
    title: string;
    format: Format;
    /** The week of the year this lesson is planned for. */
    week: number;
    goal: string;
    /** It has a notation file, so its pages can be shown. */
    real?: boolean;
    /** Its strand. Maths is the path; the others are asides hanging off it. */
    subject?: string;
    /** A side path: the lesson it branches off. A side path never blocks the main path. */
    branch?: string;
    /** What it is called on the map when it is off the main path. */
    aside?: string;
    /** Prerequisites besides the lesson before it on the path. */
    needs?: string[];
}

export interface Year {
    child: string;
    grade: number;
    title: string;
    started: string;
    units: Unit[];
    lessons: LessonDef[];
}

export type State = "done" | "current" | "open" | "locked";

/** What a year is read from: a lesson's facts, as the pack's index holds them. */
export type YearLesson = Pick<
    LessonFacts,
    "id" | "source" | "title" | "goal" | "grade" | "unit" | "subject" | "format"
>;

const MARKERS: readonly Marker[] = ["sky", "mint", "berry", "tang", "glow"];
const FORMATS: Record<Format, true> = { teach: true, puzzles: true, worked: true, review: true };
const isFormat = (f: string): f is Format => Object.hasOwn(FORMATS, f);

/** A lesson's place in its strand, which is what the map walks along; `of` is the strand's length. */
interface Placed {
    lesson: YearLesson;
    subject: string;
    step: number;
    strand: number;
    of: number;
}

const unitNumber = (l: YearLesson): number => l.unit ?? 1;

/** A grade's lessons in the order a child meets them, strand by strand, maths first. */
function placed(lessons: readonly YearLesson[], grade: number): Placed[] {
    const mine = lessons.filter((l) => l.grade === grade);
    const subjects = [...new Set(mine.map((l) => l.subject))].sort((a, b) =>
        a === b ? 0 : a === "maths" ? -1 : b === "maths" ? 1 : a.localeCompare(b),
    );
    const out: Placed[] = [];
    subjects.forEach((subject, strand) => {
        // The file's name carries the order a child meets a unit's lessons in (g1-01, g1-02), which the id does not.
        const own = mine
            .filter((l) => l.subject === subject)
            .sort((a, b) => unitNumber(a) - unitNumber(b) || a.source.localeCompare(b.source));
        own.forEach((lesson, i) =>
            out.push({ lesson, subject, step: i + 1, strand, of: own.length }),
        );
    });
    return out;
}

/**
 * The maths lesson a strand lesson hangs off: as far through the year as the lesson is through its own
 * strand, so a strand spreads along the whole path, offset by a lesson or two per strand so strands
 * do not all leave from the same lessons.
 */
const hostOf = (maths: readonly Placed[], p: Placed): Placed | undefined =>
    maths[
        Math.min(
            maths.length - 1,
            Math.floor(((p.step - 0.5) * maths.length) / p.of) + (p.strand % 3),
        )
    ];

/**
 * One grade as a year. Maths is the path, since it is the strand that is complete; every other strand
 * hangs off the maths lesson it sits alongside, so the path stays one line.
 */
export function yearOf(
    lessons: readonly YearLesson[],
    grade: number,
    child: string,
    started: string,
): Year {
    const all = placed(lessons, grade);
    const maths = all.filter((p) => p.subject === "maths");
    const units: Unit[] = [...new Set(maths.map((p) => unitNumber(p.lesson)))]
        .sort((a, b) => a - b)
        .map((n) => {
            const inUnit = maths.filter((p) => unitNumber(p.lesson) === n);
            // A unit is a topic, and its first lesson names it.
            const names = inUnit.map((p) => p.lesson.title);
            const first = names[0] ?? `Unit ${n}`;
            const last = names.at(-1) ?? "";
            return {
                n,
                title: first,
                short: first,
                marker: MARKERS[(n - 1) % MARKERS.length] ?? "sky",
                about:
                    names.length > 1
                        ? `${names.slice(0, -1).join(", ")} and ${last}.`
                        : (inUnit[0]?.lesson.goal ?? ""),
            };
        });
    const defs = all.map((p): LessonDef => {
        const l = p.lesson;
        const host = p.subject === "maths" ? undefined : hostOf(maths, p);
        return {
            id: l.id,
            unit: host ? unitNumber(host.lesson) : unitNumber(l),
            title: l.title,
            format: isFormat(l.format) ? l.format : "teach",
            week: p.subject === "maths" ? p.step * 2 : p.step * 4,
            goal: l.goal ?? "",
            real: true,
            subject: p.subject,
            ...(host ? { branch: host.lesson.id, aside: p.subject } : {}),
        };
    });
    return { child, grade, title: `Grade ${grade}`, started, units, lessons: defs };
}

/** Every grade the lessons cover, lowest first. */
export function yearsOf(lessons: readonly YearLesson[], child: string, started: string): Year[] {
    return [...new Set(lessons.map((l) => l.grade))]
        .sort((a, b) => a - b)
        .map((g) => yearOf(lessons, g, child, started));
}

export const onPath = (y: Year): LessonDef[] => y.lessons.filter((l) => !l.branch);

export const lessonById = (y: Year, id: string): LessonDef | undefined =>
    y.lessons.find((l) => l.id === id);

export const unitOf = (y: Year, n: number): Unit | undefined => y.units.find((u) => u.n === n);

/** Lessons in the order a child meets them: the path, with each side path right after the lesson it leaves from. */
export function pathOrder(y: Year): LessonDef[] {
    return onPath(y).flatMap((l) => [l, ...y.lessons.filter((s) => s.branch === l.id)]);
}

/** What has to be finished before a lesson opens: the one before it on the path, plus anything it names. */
export function prerequisites(y: Year, id: string): string[] {
    const l = lessonById(y, id);
    if (!l) return [];
    if (l.branch) return [l.branch, ...(l.needs ?? [])];
    const main = onPath(y);
    const before = main[main.findIndex((m) => m.id === id) - 1];
    return [...(before ? [before.id] : []), ...(l.needs ?? [])];
}

export function stateOf(y: Year, p: Progress, id: string): State {
    if (p.done[id]) return "done";
    if (p.current === id) return "current";
    if (p.unlocked.includes(id)) return "open";
    return prerequisites(y, id).every((q) => p.done[q]) ? "open" : "locked";
}

export function states(y: Year, p: Progress): Map<string, State> {
    return new Map(y.lessons.map((l) => [l.id, stateOf(y, p, l.id)]));
}

/** The prerequisites not finished yet: what a locked lesson is waiting for. */
export const blockers = (y: Year, p: Progress, id: string): string[] =>
    prerequisites(y, id).filter((q) => !p.done[q]);

/** The lessons waiting on this one. */
export const unlocks = (y: Year, id: string): string[] =>
    y.lessons.filter((l) => prerequisites(y, l.id).includes(id)).map((l) => l.id);

export const STATE_LABEL: Record<State, string> = {
    done: "Finished",
    current: "Up next",
    open: "Ready to start",
    locked: "Locked",
};

/** The lesson after the one the child is on, since where the child is and what is next are what a child looks for. */
export function nextOf(y: Year, p: Progress): LessonDef | undefined {
    const order = pathOrder(y);
    const i = order.findIndex((l) => l.id === p.current);
    return i < 0 ? order.find((l) => !p.done[l.id]) : order.slice(i + 1).find((l) => !l.branch);
}

/** A unit's lessons from strands that are not the path. */
export const asidesIn = (y: Year, n: number): LessonDef[] =>
    y.lessons.filter((l) => l.unit === n && l.branch);

export interface UnitSummary {
    total: number;
    done: number;
    secure: number;
    growing: number;
    revisit: number;
    minutes: number;
    here: boolean;
}

export function unitSummary(y: Year, p: Progress, n: number): UnitSummary {
    const lessons = y.lessons.filter((l) => l.unit === n);
    const s: UnitSummary = {
        total: lessons.filter((l) => !l.branch).length,
        done: 0,
        secure: 0,
        growing: 0,
        revisit: 0,
        minutes: 0,
        here: false,
    };
    for (const l of lessons) {
        const r = p.done[l.id];
        if (p.current === l.id) s.here = true;
        if (!r) continue;
        if (!l.branch) s.done++;
        s.minutes += r.minutes;
        s[mastery(r)]++;
    }
    return s;
}

export interface TermSummary {
    n: number;
    units: number[];
    total: number;
    done: number;
    asides: number;
    here: boolean;
}

/** A third of the year, which a year's map names instead of its nine units. */
export function termSummary(y: Year, p: Progress, n: number, units: number[]): TermSummary {
    const s: TermSummary = { n, units, total: 0, done: 0, asides: 0, here: false };
    for (const u of units) {
        const r = unitSummary(y, p, u);
        s.total += r.total;
        s.done += r.done;
        s.asides += asidesIn(y, u).length;
        if (r.here) s.here = true;
    }
    return s;
}

/** A kid's progress through a year, from their sittings and the answers in them. */
export const progressIn = (
    y: Year,
    kid: string,
    attempts: readonly Attempt[],
    sittings: readonly Sitting[],
    start: string,
    today: string,
): Progress =>
    progressOf(
        y.lessons.map((l) => l.id),
        onPath(y).map((l) => l.id),
        kid,
        attempts,
        sittings,
        start,
        today,
    );
