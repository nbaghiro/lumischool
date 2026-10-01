// What narrows the catalogue of lessons (a grade, a subject, and the words of a title or goal), and a
// page of one shelf of it, so a filter means the same thing wherever a page is cut: in Explore over the
// index it has loaded, or in a server route over the pack (.docs/pagination.md).

import type { LessonFacts } from "../engine/pack";
import {
    compareKeys,
    pageOfList,
    queryHash,
    readCursor,
    type CursorProblem,
    type Key,
    type Page,
} from "../engine/page";

/** What the catalogue is narrowed to. Null is every grade, every subject, or every variant. */
export interface Filters {
    grade: number | null;
    subject: string | null;
    /** A variant's tag, a language or a nation (`variantOf`). */
    variant: string | null;
    words: string;
}

export const EVERYTHING: Filters = { grade: null, subject: null, variant: null, words: "" };

/** A lesson's variant tag, its language or its nation, or null for a lesson every child is shown. */
export const variantOf = (l: Pick<LessonFacts, "language" | "nation">): string | null =>
    l.language ?? l.nation ?? null;

/** The filters an address holds, keeping only a grade and a subject the catalogue has. */
export function filtersFrom(
    search: string,
    subjects: readonly string[],
    grades: readonly number[],
    variants: readonly string[] = [],
): Filters {
    const q = new URLSearchParams(search);
    const grade = q.get("grade") === null ? NaN : Number(q.get("grade"));
    const subject = q.get("subject");
    const variant = q.get("variant");
    return {
        grade: grades.includes(grade) ? grade : null,
        subject: subject !== null && subjects.includes(subject) ? subject : null,
        variant: variant !== null && variants.includes(variant) ? variant : null,
        words: q.get("q")?.trim() ?? "",
    };
}

/** The query that holds the filters, empty for every lesson. */
export function searchOf(f: Filters): string {
    const q = new URLSearchParams();
    if (f.grade !== null) q.set("grade", String(f.grade));
    if (f.subject !== null) q.set("subject", f.subject);
    if (f.variant !== null) q.set("variant", f.variant);
    if (f.words.trim()) q.set("q", f.words.trim());
    const s = q.toString();
    return s ? `?${s}` : "";
}

const plain = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();

type Findable = Pick<
    LessonFacts,
    "grade" | "unit" | "subject" | "language" | "nation" | "title" | "goal" | "source"
>;

/** The order a subject is taken in: grade, unit, then file, which is also a page's cursor key. */
const orderOf = (l: Pick<LessonFacts, "grade" | "unit" | "source">): Key => [
    l.grade,
    l.unit ?? 0,
    l.source,
];

/** The lessons the filters let through, every word somewhere in the title or goal, in `orderOf`. */
export function found<L extends Findable>(lessons: readonly L[], f: Filters): L[] {
    const words = plain(f.words).split(" ").filter(Boolean);
    return lessons
        .filter(
            (l) =>
                (f.grade === null || l.grade === f.grade) &&
                (f.subject === null || l.subject === f.subject) &&
                (f.variant === null || variantOf(l) === f.variant) &&
                words.every((w) => plain(`${l.title} ${l.goal ?? ""}`).includes(w)),
        )
        .sort((a, b) => compareKeys(orderOf(a), orderOf(b)));
}

/** One shelf of the catalogue: one grade's lessons in one subject. */
export interface Shelf {
    grade: number;
    subject: string;
}

/** What a cursor from a shelf's page is bound to: the shelf, and the filters as `found` reads them. */
const shelfQuery = (shelf: Shelf, f: Filters): string =>
    queryHash({
        list: "catalogue",
        grade: shelf.grade,
        subject: shelf.subject,
        filters: {
            grade: f.grade,
            subject: f.subject,
            variant: f.variant,
            words: plain(f.words),
        },
    });

/**
 * A page of one shelf's lessons under the filters, which are applied to the whole shelf before the page
 * is cut, starting after `after`, a cursor from an earlier page of the same shelf and filters.
 */
export function shelfPage<L extends Findable>(
    lessons: readonly L[],
    shelf: Shelf,
    f: Filters,
    after: string | null,
    limit: number,
): Page<L> | { problem: CursorProblem } {
    const query = shelfQuery(shelf, f);
    let from: Key | null = null;
    if (after !== null) {
        const read = readCursor(after, query, ["number", "number", "string"]);
        if ("problem" in read) return read;
        from = read.key;
    }
    const here = lessons.filter((l) => l.grade === shelf.grade && l.subject === shelf.subject);
    return pageOfList(found(here, f), orderOf, { after: from, limit, query });
}
