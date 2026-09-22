// The morning's order, for one adult teaching two or three children at one table. The product knows
// what each child does today; what it does not say is in what order, so that the adult is never
// needed in two places at once, and that is the parent's own problem (.docs/parents.md, "The morning
// order"). A lesson's sections say who it needs: a `look` is taught, a `story` at grade 1 or 2 is
// read aloud, and practice is the child's own, so the morning is a small scheduling problem with one
// adult as the resource. The minutes are a table of guesses, never a measurement, and every page that
// shows them says so.

import { sectionLabel, type Level, type PackLesson } from "../../engine/pack";
import type { Sitting } from "../record/record";

export type Attention = "with-you" | "read-aloud" | "alone";

export const ATTENTION_LABEL: Record<Attention, string> = {
    "with-you": "You teach this",
    "read-aloud": "You read it aloud",
    alone: "On their own",
};

export interface SectionShape {
    type: string;
    /** What the section is called on the sheet. */
    label: string;
    /** How many questions it holds, which is what its length mostly depends on. */
    questions: number;
}

/** A lesson as the morning reads it: what a compiled lesson's sections hold, and nothing else. */
export interface LessonShape {
    id: string;
    title: string;
    grade: number;
    subject: string;
    sections: SectionShape[];
    /**
     * What this child's own sittings say a lesson like this takes, or null while there are too few to
     * say. The sections keep the shares the table gives them and the whole is stretched to fit it.
     */
    took?: number | null;
}

/** A lesson at a level as the morning reads it. */
export function shapeOf(lesson: PackLesson, level: Level = "medium"): LessonShape {
    let puzzles = 0;
    const sections: SectionShape[] = [];
    for (const s of (lesson.levels[level] ?? lesson.levels.medium).sections) {
        if (s.type === "puzzle") puzzles += 1;
        sections.push({
            type: s.type,
            label: sectionLabel(s.type, puzzles, s.stars),
            questions: s.blocks.reduce(
                (n, b) => n + (b.k === "ask" ? b.questions.filter((q) => q.n > 0).length : 0),
                0,
            ),
        });
    }
    return {
        id: lesson.id,
        title: lesson.title,
        grade: lesson.grade,
        subject: lesson.subject,
        sections,
    };
}

/**
 * Which sections need the adult. The reading load is a curriculum constraint rather than a guess: at
 * grade 1 an adult reads the story problems, so a story section there is time the parent is not free.
 */
export function attentionOf(section: string, grade: number): Attention {
    if (section === "look" || section === "example") return "with-you";
    if (section === "story") return grade <= 2 ? "read-aloud" : "alone";
    if (section === "remember") return "alone";
    return grade <= 1 && section === "try" ? "read-aloud" : "alone";
}

/**
 * Minutes per section. These are estimates and they are wrong: a page shows a range and says it is
 * a guess until there is a term of real timings to replace it with. TODO: `perQuestion` falls at
 * grade 3 while the corpus asks about ten questions at every grade, so these numbers make a grade 4
 * lesson shorter than a grade 1 one (a median of 24 minutes against 42, measured over the whole
 * pack). That is this constant talking rather than the lessons, and it is why the default
 * curriculum carries more subjects at grades 3 and 4. Nobody has decided whether the constant or
 * the shape of the lessons is wrong, so it is left alone. */
export const MINUTES = {
    taught: 6,
    perQuestion: (grade: number): number => (grade <= 2 ? 2.5 : 1.5),
    readAloud: 4,
    remember: 1,
    floor: 2,
};

export const minutesOf = (s: SectionShape, grade: number): number => {
    const a = attentionOf(s.type, grade);
    const base =
        a === "with-you"
            ? MINUTES.taught
            : a === "read-aloud"
              ? MINUTES.readAloud
              : s.type === "remember"
                ? MINUTES.remember
                : 0;
    return Math.max(MINUTES.floor, Math.round(base + s.questions * MINUTES.perQuestion(grade)));
};

export const lessonMinutes = (l: LessonShape): number =>
    l.sections.reduce((n, s) => n + minutesOf(s, l.grade), 0);

/** A lesson's length as a range, since one number pretends to a precision we do not have. */
export const lengthRange = (l: LessonShape): [number, number] => {
    const m = lessonMinutes(l);
    return [Math.round(m * 0.75), Math.round(m * 1.4)];
};

/** A sitting read back from the family's own log, which is what the table of guesses gives way to. */
export type Took = Pick<Sitting, "child" | "subject" | "minutes" | "finished">;

/**
 * A sitting shorter or longer than this is not one lesson's work: a tap that opened a lesson and
 * closed it, or a view left open over lunch. Neither says anything about how long the work takes.
 */
export const SITTING = { least: 3, most: 120 } as const;

/**
 * How many of a child's own sittings are needed before their times are used instead of the table:
 * enough that one long morning cannot carry the median, and few enough that a family sees their own
 * numbers in the first fortnight rather than the first term.
 */
export const ENOUGH = { subject: 5, child: 8, days: 5 } as const;

/** How long a lesson takes for this child, as their own sittings have it. */
export interface Pace {
    /** The minutes their sittings say, or null while there are too few of them to say anything. */
    minutes: number | null;
    /** How many of their sittings it rests on. */
    sittings: number;
    /** Whether those sittings are this subject's own, rather than their lessons at large. */
    subject: boolean;
}

const median = (ns: readonly number[]): number => {
    const sorted = [...ns].sort((a, b) => a - b);
    const half = Math.floor(sorted.length / 2);
    const one = sorted[half] ?? 0;
    return sorted.length % 2 ? one : Math.round(((sorted[half - 1] ?? one) + one) / 2);
};

/**
 * What a child's own finished sittings say a lesson of this subject takes. Their sittings in the
 * subject are used once there are enough of them, since a reading lesson and a maths lesson are not
 * the same length; failing that, all their lessons; failing that, nothing, and the table is used.
 */
export function paceFor(took: readonly Took[], child: string, subject: string): Pace {
    const mine = took.filter(
        (t) =>
            t.child === child &&
            t.finished &&
            t.minutes >= SITTING.least &&
            t.minutes <= SITTING.most,
    );
    const here = mine.filter((t) => t.subject === subject);
    if (here.length >= ENOUGH.subject)
        return {
            minutes: median(here.map((t) => t.minutes)),
            sittings: here.length,
            subject: true,
        };
    if (mine.length >= ENOUGH.child)
        return {
            minutes: median(mine.map((t) => t.minutes)),
            sittings: mine.length,
            subject: false,
        };
    return { minutes: null, sittings: mine.length, subject: false };
}

/** Minutes past midnight, rounded to five, for a clock time a page shows or a person sets. */
export const minutesOfClock = (clock: string): number => {
    const [h, m] = clock.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
};

export const clockOfMinutes = (minutes: number): string =>
    `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;

/**
 * When the family's mornings have actually begun, to the nearest five minutes, from the minute of the
 * day each school day's first sitting started. It is the median rather than the earliest, so one
 * early start does not move it, and null until there are enough days to have a habit at all.
 */
export function startedAt(firsts: readonly number[]): string | null {
    if (firsts.length < ENOUGH.days) return null;
    return clockOfMinutes(Math.round(median(firsts) / 5) * 5);
}

export interface Block {
    child: string;
    childName: string;
    lesson: string;
    title: string;
    section: string;
    label: string;
    attention: Attention;
    minutes: number;
    /** Minutes from the start of the morning. */
    from: number;
    to: number;
}

export interface Morning {
    /** The clock time the morning starts at, as "9:00". */
    start: string;
    blocks: Block[];
    minutes: number;
    /** Minutes the adult is committed to one child. */
    withYou: number;
    /**
     * How many times two children both needed the adult at one moment and one had to wait. The order
     * here has already resolved them; this is the count of what it resolved.
     */
    resolved: number;
    /** How many of the morning's lessons were laid out on the family's own times, and how many on the table. */
    timed: number;
    guessed: number;
}

export interface Learner {
    child: string;
    name: string;
    /** The child's lessons today, in the family's own order. */
    lessons: LessonShape[];
}

export const clockAt = (start: string, minutes: number): string => {
    const [h, m] = start.split(":").map(Number);
    const t = (h ?? 0) * 60 + (m ?? 0) + minutes;
    return `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;
};

/**
 * List scheduling with one adult. Each child's sections stay in order; a section that needs the adult
 * waits until the adult is free, and one that does not starts as soon as the child is. Whoever is
 * free earliest goes next, and a tie goes to the younger child, who waits worst.
 */
export function morning(start: string, learners: readonly Learner[]): Morning {
    let timed = 0;
    let guessed = 0;
    const queues = learners.map((l) => ({
        l,
        at: 0,
        grade: l.lessons[0]?.grade ?? 1,
        todo: l.lessons.flatMap((lesson) => {
            const table = lessonMinutes(lesson);
            const own = lesson.took ?? null;
            // the family's own time for the lesson, shared out in the proportions the table gives
            const scale = own !== null && table > 0 ? own / table : 1;
            if (own !== null && table > 0) timed++;
            else guessed++;
            return lesson.sections.map((s) => ({
                lesson,
                s,
                attention: attentionOf(s.type, lesson.grade),
                minutes: Math.max(1, Math.round(minutesOf(s, lesson.grade) * scale)),
            }));
        }),
    }));
    const blocks: Block[] = [];
    let adultFree = 0;
    let resolved = 0;
    for (;;) {
        const ready = queues.filter((q) => q.todo.length);
        if (!ready.length) break;
        ready.sort((a, b) => a.at - b.at || a.grade - b.grade);
        const q = ready[0];
        const next = q?.todo.shift();
        if (!q || !next) break;
        const needsAdult = next.attention !== "alone";
        let from = q.at;
        if (needsAdult && adultFree > from) {
            resolved++;
            from = adultFree;
        }
        const to = from + next.minutes;
        if (needsAdult) adultFree = to;
        q.at = to;
        blocks.push({
            child: q.l.child,
            childName: q.l.name,
            lesson: next.lesson.id,
            title: next.lesson.title,
            section: next.s.type,
            label: next.s.label,
            attention: next.attention,
            minutes: next.minutes,
            from,
            to,
        });
    }
    blocks.sort((a, b) => a.from - b.from || a.childName.localeCompare(b.childName));
    return {
        start,
        blocks,
        minutes: blocks.reduce((n, b) => Math.max(n, b.to), 0),
        withYou: blocks.filter((b) => b.attention !== "alone").reduce((n, b) => n + b.minutes, 0),
        resolved,
        timed,
        guessed,
    };
}
