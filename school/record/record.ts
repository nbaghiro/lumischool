import type { Envelope, Given, QuestionRef } from "../../engine/answer";

const MS = 864e5;

/** Whole days since 1 January 1970, for a day written `2026-09-14`. */
export const dayOf = (iso: string): number => Date.parse(`${iso}T00:00:00Z`) / MS;
export const isoOf = (n: number): string => new Date(n * MS).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => isoOf(dayOf(iso) + n);

export const WEEKDAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
] as const;

const weekdayIndex = (iso: string): number => (((dayOf(iso) + 4) % 7) + 7) % 7;

export const weekdayOf = (iso: string): (typeof WEEKDAYS)[number] =>
    WEEKDAYS[weekdayIndex(iso)] ?? "Sunday";

/** Monday to Friday. A family may teach on a Saturday, and the week still has five columns. */
export const isSchoolDay = (iso: string): boolean => {
    const d = weekdayIndex(iso);
    return d >= 1 && d <= 5;
};

/** The Monday of the week a day falls in, a Sunday belonging to the week that has just ended. */
export const mondayOf = (iso: string): string => {
    const d = weekdayIndex(iso);
    return addDays(iso, d === 0 ? -6 : 1 - d);
};

/** The day an instant falls on in the family's time zone, which is the only day a record knows. */
export function dayIn(at: string, timeZone: string): string {
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(new Date(at));
        const part = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
        return `${part("year")}-${part("month")}-${part("day")}`;
    } catch {
        return at.slice(0, 10);
    }
}

/** How an answer reached us. Paper work is marked afterwards, so it carries no timings. */
export type Mode = "screen" | "paper";

/** One attempt at one question, the grain every reading of a child's work is made from. */
export interface Attempt {
    child: string;
    lesson: string;
    /** The section of the lesson it sat in: "do", "exercises", "try", "puzzle". */
    section: string;
    /** Its number on the page, which is what the grown-ups sheet calls it. */
    n: number;
    item: string;
    version: number;
    variant: { ask: string };
    skills: string[];
    /** What the child answered, as a grown-up reads it beside the question. */
    given: string;
    right: boolean;
    /** 1 when it was right first time. */
    tries: number;
    /** The sentence the author wrote for the mistake this answer makes, which the verifier proved no right answer matches. */
    rule?: string;
    hints: number;
    mode: Mode;
    /** Screen work only: milliseconds from the question appearing to the first input. */
    toFirstInput?: number;
    /** Screen work only: milliseconds from the first input to the answer being given. */
    toAnswer?: number;
    /** Screen work only: the page lost focus while this question was open. */
    leftPage?: boolean;
    markedBy: "auto" | "grown-up";
    on: string;
}

/** One sitting of one lesson, on screen or on paper. */
export interface Sitting {
    child: string;
    lesson: string;
    on: string;
    minutes: number;
    mode: Mode;
    finished: boolean;
    /** A grown-up sat with the child. The parent says so; it is never inferred. */
    withGrownUp: boolean;
    subject: string;
}

/** A day of teaching a grown-up added by hand, such as a museum trip the product never saw. */
export interface AddedDay {
    on: string;
    subject: string;
    minutes: number;
    note: string;
}

/** A sheet as it was printed: its questions are the ones a grown-up marks when it comes back. */
export interface Printed {
    sheet: string;
    kid: string;
    lesson: string;
    on: string;
    at: string;
    questions: QuestionRef[];
}

export interface Folded {
    attempts: Attempt[];
    sittings: Sitting[];
    printed: Printed[];
    added: AddedDay[];
}

type Of<K extends Envelope["kind"]> = Extract<Envelope, { kind: K }>;

const is =
    <K extends Envelope["kind"]>(k: K) =>
    (e: Envelope): e is Of<K> =>
        e.kind === k;

function givenText(g: Given): string {
    switch (g.k) {
        case "number":
        case "word":
            return g.text;
        case "pick":
            return g.option;
        case "drawing":
            return "a drawing";
        case "painting":
            return "a painting";
        case "performance":
            return "played";
        case "program":
            return g.lines.map((l) => l.text).join("; ");
        case "arranged":
            return "arranged on the picture";
        case "unmarked":
            return "";
    }
}

/**
 * Sittings, attempts, printed sheets and the days a grown-up added, from any slice of the log.
 *
 * A screen answer is the last `answered` of its question in a sitting. A paper mark belongs to the
 * paper sitting the sheet was worked in, the first one of its lesson after the sheet was printed, and
 * the latest mark of a question wins, so marking again corrects rather than doubles.
 */
export function fold(
    events: readonly Envelope[],
    timeZone: string,
    subjectOf: (lesson: string) => string,
): Folded {
    const ordered = [...events].sort(
        (a, b) => a.at.localeCompare(b.at) || a.device.localeCompare(b.device) || a.seq - b.seq,
    );
    const ended = new Map<string, Of<"sitting-ended">>();
    for (const e of ordered.filter(is("sitting-ended"))) ended.set(e.data.sitting, e);

    const began: { at: string; sitting: Sitting }[] = [];
    for (const b of ordered.filter(is("sitting-began"))) {
        if (!b.kid_id) continue;
        const end = ended.get(b.data.sitting);
        began.push({
            at: b.at,
            sitting: {
                child: b.kid_id,
                lesson: b.data.lesson,
                on: dayIn(b.at, timeZone),
                minutes: end ? Math.round(end.data.minutes) : 0,
                mode: b.data.mode,
                finished: end?.data.finished ?? false,
                withGrownUp: end?.data.withGrownUp ?? false,
                subject: subjectOf(b.data.lesson),
            },
        });
    }

    const printed: Printed[] = ordered.filter(is("sheet-printed")).flatMap((e) =>
        e.kid_id
            ? [
                  {
                      sheet: e.data.sheet,
                      kid: e.kid_id,
                      lesson: e.data.lesson,
                      on: dayIn(e.at, timeZone),
                      at: e.at,
                      questions: e.data.questions,
                  },
              ]
            : [],
    );

    const attempts: Attempt[] = [];
    const answered = new Map<string, Of<"answered">>();
    for (const e of ordered.filter(is("answered")))
        answered.set(`${e.kid_id}|${e.data.sitting}|${e.data.q.n}`, e);
    for (const e of answered.values()) {
        if (!e.kid_id || e.data.right === null) continue;
        const t = e.data.timing;
        attempts.push({
            child: e.kid_id,
            lesson: e.data.q.lesson,
            section: e.data.q.section,
            n: e.data.q.n,
            item: e.data.q.item,
            version: 1,
            variant: { ask: e.data.q.ask },
            skills: e.data.q.skills,
            given: givenText(e.data.given),
            right: e.data.right,
            tries: e.data.tries,
            rule: e.data.rule ?? undefined,
            hints: e.data.hints,
            mode: t.k,
            markedBy: "auto",
            on: dayIn(e.at, timeZone),
            ...(t.k === "screen"
                ? {
                      toFirstInput: t.toFirstInput,
                      toAnswer: t.toAnswer,
                      leftPage: t.leftPage || undefined,
                  }
                : {}),
        });
    }

    const marks = new Map<string, Of<"marked">>();
    for (const e of ordered.filter(is("marked")))
        marks.set(`${e.kid_id}|${e.data.sheet}|${e.data.q.n}`, e);
    for (const e of marks.values()) {
        if (!e.kid_id) continue;
        const kid = e.kid_id;
        const sheet = printed.find((p) => p.sheet === e.data.sheet);
        const lesson = sheet?.lesson ?? e.data.q.lesson;
        const worked = began.find(
            (b) =>
                b.sitting.child === kid &&
                b.sitting.mode === "paper" &&
                b.sitting.lesson === lesson &&
                (!sheet || b.at >= sheet.at),
        );
        attempts.push({
            child: kid,
            lesson: e.data.q.lesson,
            section: e.data.q.section,
            n: e.data.q.n,
            item: e.data.q.item,
            version: 1,
            variant: { ask: e.data.q.ask },
            skills: e.data.q.skills,
            given: givenText(e.data.given),
            right: e.data.right,
            tries: 1,
            rule: e.data.rule ?? undefined,
            hints: 0,
            mode: "paper",
            markedBy: "grown-up",
            on: worked?.sitting.on ?? dayIn(e.at, timeZone),
        });
    }

    const added: AddedDay[] = ordered.filter(is("day-added")).map((e) => ({
        on: e.data.onDay,
        subject: e.data.subject,
        minutes: e.data.minutes,
        note: e.data.note,
    }));
    return { attempts, sittings: began.map((b) => b.sitting), printed, added };
}

/** The printed sheet a paper sitting was worked from: the latest of its lesson printed on or before that day. */
export function sheetFor(
    printed: readonly Printed[],
    kid: string,
    lesson: string,
    on: string,
): Printed | null {
    return (
        printed
            .filter((p) => p.kid === kid && p.lesson === lesson && p.on <= on)
            .sort((a, b) => a.at.localeCompare(b.at))
            .at(-1) ?? null
    );
}

/** What a finished lesson left behind. `right` is the share right first time over what was answered or marked. */
export interface Result {
    stars: 1 | 2 | 3;
    on: string;
    minutes: number;
    right: number;
}

export interface Progress {
    done: Record<string, Result>;
    /** The lesson on the path the child is on now. */
    current: string;
    /** The week of the year the family is in. */
    week: number;
    /** Lessons a grown-up opened before their prerequisites were finished. */
    unlocked: string[];
}

export type Mastery = "secure" | "growing" | "revisit";

export const mastery = (r: Result): Mastery =>
    r.right >= 0.85 ? "secure" : r.right >= 0.65 ? "growing" : "revisit";

export const MASTERY_LABEL: Record<Mastery, string> = {
    secure: "Secure",
    growing: "Getting there",
    revisit: "Worth another look",
};

/**
 * A kid's progress through a year's lessons, from their sittings: a lesson is done once a sitting of
 * it has finished, and the one they are on is the first lesson on the path that is not. A sheet nobody
 * has marked yet counts as done without a share, so nothing is invented.
 */
export function progressOf(
    lessons: readonly string[],
    path: readonly string[],
    kid: string,
    attempts: readonly Attempt[],
    sittings: readonly Sitting[],
    start: string,
    today: string,
): Progress {
    const done: Record<string, Result> = {};
    for (const id of lessons) {
        const sits = sittings.filter((s) => s.child === kid && s.lesson === id && s.on <= today);
        const finished = sits
            .filter((s) => s.finished)
            .sort((a, b) => dayOf(a.on) - dayOf(b.on))[0];
        if (!finished) continue;
        const mine = attempts.filter((a) => a.child === kid && a.lesson === id);
        const right = mine.length
            ? mine.filter((a) => a.right && a.tries === 1).length / mine.length
            : null;
        done[id] = {
            stars: right === null ? 1 : right >= 0.9 ? 3 : right >= 0.74 ? 2 : 1,
            on: finished.on,
            minutes: sits.reduce((n, s) => n + s.minutes, 0),
            right: right ?? 0,
        };
    }
    return {
        done,
        current: path.find((id) => !done[id]) ?? "",
        week: Math.max(1, Math.floor((dayOf(today) - dayOf(start)) / 7) + 1),
        unlocked: [],
    };
}
