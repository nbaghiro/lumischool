// What the worlds read of the curriculum: a lesson's facts as the pack's index holds them, and what a
// lesson holds in the words a world's reaches are written in (`art:clock`, `skill:money`,
// `subject:physics`). Nothing here reads the notation.
import { LANGUAGES } from "../../engine/answer";
import type { LessonFacts as PackFacts } from "../../engine/pack";
import { forChild, shownTo, yearOf, type Variants, type Year } from "../year";
import { offeredGrades } from "./worlds";

/** A lesson as the worlds need it: what the pack's index says of it. */
export type LessonFacts = Pick<
    PackFacts,
    "id" | "title" | "grade" | "subject" | "art" | "skills" | "language" | "nation"
>;

/** The curriculum as the worlds read it. */
export interface Corpus {
    /**
     * Every offered grade, lowest first: a grade whose lessons are landing before its worlds join the
     * run has no year of its own to walk, and would borrow the year below's worlds.
     */
    grades: readonly number[];
    /** A lesson's facts, or undefined for an id the curriculum does not have. */
    lesson(id: string): LessonFacts | undefined;
    /** One grade's year of lessons, for a child. */
    year(grade: number, child: string): Year;
    /** Whether a lesson is shown under the settings that choose between variants (`choosing`). */
    shown(lesson: LessonFacts): boolean;
}

/**
 * The settings a view with no child reads variants by: the family's, else no national unit and the
 * first language the pack teaches, so a grown-up's preview shows one of each and not all of them.
 */
export function previewOf(
    all: readonly Pick<PackFacts, "language">[],
    set: Partial<Variants> = {},
): Variants {
    const taught = new Set(all.map((l) => l.language));
    return {
        language: set.language ?? LANGUAGES.find((l) => taught.has(l)) ?? null,
        nation: set.nation ?? null,
    };
}

/**
 * The curriculum as a pack's index holds it. `started` is the day the years begin on, and a child's
 * `variants` leave out the lessons they are not shown; without them every variant is in, and
 * `shown` reads them by `preview`.
 */
export function corpusFrom(
    all: readonly PackFacts[],
    started: string,
    variants?: Variants,
    preview: Variants = previewOf(all),
): Corpus {
    const byId = new Map(all.map((l) => [l.id, l]));
    const lessons = variants ? forChild(all, variants) : all;
    const choosing = variants ?? preview;
    const shown = (l: LessonFacts): boolean => shownTo(l, choosing);
    const years = new Map<string, Year>();
    return {
        grades: offeredGrades(all),
        lesson: (id) => byId.get(id),
        shown,
        year(grade, child) {
            const key = `${grade}|${child}`;
            const had = years.get(key);
            if (had) return had;
            const y = yearOf(lessons, grade, child, started);
            years.set(key, y);
            return y;
        },
    };
}

/** What a lesson holds, as a world's reaches are written: its track, its drawings and its skills. */
export function topicsOf(f: LessonFacts): string[] {
    return [
        ...new Set([
            `subject:${f.subject}`,
            ...f.art.map((a) => `art:${a}`),
            ...f.skills.map((k) => `skill:${k}`),
        ]),
    ];
}

/** `topicsOf` by a lesson's id, worked out once a lesson. */
export function topicsIn(c: Corpus): (id: string) => string[] {
    const cache = new Map<string, string[]>();
    return (id) => {
        const had = cache.get(id);
        if (had) return had;
        const f = c.lesson(id),
            got = f ? topicsOf(f) : [];
        cache.set(id, got);
        return got;
    };
}
