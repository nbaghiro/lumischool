// What the grown-ups' Explore works out beyond the filters (school/catalogue.ts): the subjects set out
// by grade, what the count says, and one lesson's place and the level it is read at. What a page shows
// is its path and query, so an address can be shared and the back button works.

import { gradeName, type LessonFacts, type Level } from "../../engine/pack";
import type { Filters } from "../../school/catalogue";
import { variantName } from "../../school/family/names";
import { subjectFacts, TRACK_IDS } from "../../school/tracks";

/** The subjects the lessons name, the tracks first in their order and the rest after them by title. */
export function subjectsOf(lessons: readonly Pick<LessonFacts, "subject">[]): string[] {
    const named = new Set(lessons.map((l) => l.subject));
    const tracks: string[] = TRACK_IDS.filter((t) => named.has(t));
    const loose = [...named]
        .filter((s) => !tracks.includes(s))
        .sort((a, b) => subjectFacts(a).title.localeCompare(subjectFacts(b).title));
    return [...tracks, ...loose];
}

/** One grade of the catalogue, its lessons in subjects in the subjects' order. */
interface Shelf<L> {
    grade: number;
    subjects: { subject: string; lessons: L[] }[];
}

/** The lessons set out by grade, and inside each grade by subject, leaving out what holds none. */
export function shelvesOf<L extends Pick<LessonFacts, "grade" | "subject">>(
    lessons: readonly L[],
    subjects: readonly string[],
): Shelf<L>[] {
    return [...new Set(lessons.map((l) => l.grade))]
        .sort((a, b) => a - b)
        .map((grade) => ({
            grade,
            subjects: subjects
                .map((subject) => ({
                    subject,
                    lessons: lessons.filter((l) => l.grade === grade && l.subject === subject),
                }))
                .filter((s) => s.lessons.length),
        }));
}

/** What the catalogue says about what it found, which a screen reader hears as it changes. */
export function foundLine(n: number, of: number): string {
    if (n === of) return `All ${of} lessons`;
    if (n === 0) return "No lesson found";
    return n === 1 ? "1 lesson found" : `${n} lessons found`;
}

/** What a shelf's heading says it holds: its lessons, or while words are searched, how many match. */
export function shelfCount(matches: number, of: number, searching: boolean): string {
    if (searching) return `${matches} of ${of} match`;
    return of === 1 ? "1 lesson" : `${of} lessons`;
}

/** What an empty catalogue says was looked for, so the grown-up can see what to widen. */
export function searchedLine(f: Filters): string {
    const words = f.words.trim() ? ` matches “${f.words.trim()}”` : "";
    const where = [
        f.grade === null ? "" : gradeName(f.grade),
        f.subject === null ? "" : subjectFacts(f.subject).title,
        f.variant === null ? "" : variantName(f.variant),
    ].filter(Boolean);
    return `No lesson${words}${where.length ? ` in ${where.join(" · ")}` : ""}.`;
}

/** What a grown-up reads a level as. A child's sheet never says which level it is. */
export const LEVEL_WORDS: Record<Level, string> = {
    easy: "Easier",
    medium: "As written",
    hard: "Harder",
};

/** The level an address asks for, or as written when it names none or one the lesson does not declare. */
export function levelFrom(search: string, declared: readonly Level[]): Level {
    const asked = new URLSearchParams(search).get("level");
    return declared.find((l) => l === asked) ?? "medium";
}

/** Where a lesson is read, at a level; as written needs no query. */
export const lessonPath = (id: string, level: Level = "medium"): string =>
    `/explore/${encodeURIComponent(id)}${level === "medium" ? "" : `?level=${level}`}`;
