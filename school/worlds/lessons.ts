// What the worlds read of the curriculum: a lesson's facts as the pack's index holds them, and what a
// lesson holds in the words a world's reaches are written in (`art:clock`, `skill:money`,
// `subject:physics`). Nothing here reads the notation.
import type { LessonFacts as PackFacts } from "../../engine/pack";
import { yearOf, type Year } from "../year";

/** A lesson as the worlds need it: what the pack's index says of it. */
export type LessonFacts = Pick<PackFacts, "id" | "title" | "grade" | "subject" | "art" | "skills">;

/** The curriculum as the worlds read it. */
export interface Corpus {
    /** Every grade that has lessons, lowest first. */
    grades: readonly number[];
    /** A lesson's facts, or undefined for an id the curriculum does not have. */
    lesson(id: string): LessonFacts | undefined;
    /** One grade's year of lessons, for a child. */
    year(grade: number, child: string): Year;
}

/** The curriculum as a pack's index holds it. `started` is the day the years begin on. */
export function corpusFrom(lessons: readonly PackFacts[], started: string): Corpus {
    const byId = new Map(lessons.map((l) => [l.id, l]));
    const years = new Map<string, Year>();
    return {
        grades: [...new Set(lessons.map((l) => l.grade))].sort((a, b) => a - b),
        lesson: (id) => byId.get(id),
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
