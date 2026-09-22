// What the grown-ups' Explore works out: every lesson in the family's pack found by grade, subject and
// the words of its title or goal, set out by grade and then by subject, and one lesson's place in its
// subject and the level it is read at. What a page shows is its path and query, so an address can be
// shared and the back button works.

import { LEVELS, type LessonFacts, type Level } from "../../engine/pack";
import { subjectFacts, TRACK_IDS } from "../../school/tracks";

export const GRADES = [1, 2, 3, 4] as const;

/** What the catalogue is narrowed to. Null is every grade, or every subject. */
export interface Filters {
    grade: number | null;
    subject: string | null;
    words: string;
}

export const EVERYTHING: Filters = { grade: null, subject: null, words: "" };

/** The subjects the lessons name, the tracks first in their order and the rest after them by title. */
export function subjectsOf(lessons: readonly Pick<LessonFacts, "subject">[]): string[] {
    const named = new Set(lessons.map((l) => l.subject));
    const tracks: string[] = TRACK_IDS.filter((t) => named.has(t));
    const loose = [...named]
        .filter((s) => !tracks.includes(s))
        .sort((a, b) => subjectFacts(a).title.localeCompare(subjectFacts(b).title));
    return [...tracks, ...loose];
}

/** The filters an address holds, keeping only a grade and a subject the catalogue has. */
export function filtersFrom(search: string, subjects: readonly string[]): Filters {
    const q = new URLSearchParams(search);
    const grade = Number(q.get("grade"));
    const subject = q.get("subject");
    return {
        grade: GRADES.some((g) => g === grade) ? grade : null,
        subject: subject !== null && subjects.includes(subject) ? subject : null,
        words: q.get("q")?.trim() ?? "",
    };
}

/** The query that holds the filters, empty for every lesson. */
export function searchOf(f: Filters): string {
    const q = new URLSearchParams();
    if (f.grade !== null) q.set("grade", String(f.grade));
    if (f.subject !== null) q.set("subject", f.subject);
    if (f.words.trim()) q.set("q", f.words.trim());
    const s = q.toString();
    return s ? `?${s}` : "";
}

const plain = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();

/** The lessons the filters let through, in the order a subject is taken: grade, unit, then file. */
export function found<
    L extends Pick<LessonFacts, "grade" | "unit" | "subject" | "title" | "goal" | "source">,
>(lessons: readonly L[], f: Filters): L[] {
    const words = plain(f.words).split(" ").filter(Boolean);
    return lessons
        .filter(
            (l) =>
                (f.grade === null || l.grade === f.grade) &&
                (f.subject === null || l.subject === f.subject) &&
                words.every((w) => plain(`${l.title} ${l.goal ?? ""}`).includes(w)),
        )
        .sort(inOrder);
}

const inOrder = (
    a: Pick<LessonFacts, "grade" | "unit" | "source">,
    b: Pick<LessonFacts, "grade" | "unit" | "source">,
): number => a.grade - b.grade || (a.unit ?? 0) - (b.unit ?? 0) || a.source.localeCompare(b.source);

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

/** What the catalogue says about what it found. */
export function foundLine(n: number, of: number): string {
    if (n === of) return `All ${of} lessons`;
    if (n === 0) return "No lesson matches. Try fewer words, or every grade and subject.";
    return n === 1 ? "1 lesson matches" : `${n} lessons match`;
}

/** The lessons either side of one in its subject, across the grades. */
export function besideIn<
    L extends Pick<LessonFacts, "id" | "grade" | "unit" | "subject" | "source">,
>(lessons: readonly L[], id: string): { before: L | null; after: L | null } {
    const at = lessons.find((l) => l.id === id);
    if (!at) return { before: null, after: null };
    const track = lessons.filter((l) => l.subject === at.subject).sort(inOrder);
    const i = track.indexOf(at);
    return { before: track[i - 1] ?? null, after: track[i + 1] ?? null };
}

/** What a grown-up reads a level as. A child's sheet never says which level it is. */
export const LEVEL_WORDS: Record<Level, string> = {
    easy: "Easier",
    medium: "As written",
    hard: "Harder",
};

/** The levels a lesson declares, easiest first. Every lesson has medium, which is the lesson as written. */
export const levelsOf = (l: Pick<LessonFacts, "levels">): Level[] =>
    LEVELS.filter((level) => l.levels[level] !== undefined);

/** The level an address asks for, or as written when it names none or one the lesson does not declare. */
export function levelFrom(search: string, declared: readonly Level[]): Level {
    const asked = new URLSearchParams(search).get("level");
    return declared.find((l) => l === asked) ?? "medium";
}

/** Where a lesson is read, at a level; as written needs no query. */
export const lessonPath = (id: string, level: Level = "medium"): string =>
    `/explore/${encodeURIComponent(id)}${level === "medium" ? "" : `?level=${level}`}`;
