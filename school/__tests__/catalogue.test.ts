import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LessonFacts } from "../../engine/pack";
import type { Page } from "../../engine/page";
import {
    EVERYTHING,
    filtersFrom,
    found,
    searchOf,
    shelfPage,
    type Filters,
    type Shelf,
} from "../catalogue";

const lesson = (
    id: string,
    o: { grade: number; unit: number; subject: string; title?: string; goal?: string },
): LessonFacts => ({
    id,
    source: `lessons/${id}.lumi`,
    title: o.title ?? id,
    goal: o.goal ?? null,
    grade: o.grade,
    unit: o.unit,
    subject: o.subject,
    format: "teach",
    art: [],
    file: `lessons/${id}.json`,
    levels: ["medium"],
    first: null,
    skills: [],
});

const LESSONS = [
    lesson("w1-letters", { grade: 1, unit: 1, subject: "writing", title: "Letters on the line" }),
    lesson("m2-bonds", { grade: 2, unit: 1, subject: "maths", title: "Bonds to twenty" }),
    lesson("m1-ten", {
        grade: 1,
        unit: 2,
        subject: "maths",
        title: "Making ten",
        goal: "Two numbers that make ten.",
    }),
    lesson("m1-count", { grade: 1, unit: 1, subject: "maths", title: "Counting on" }),
    lesson("a3-print", { grade: 3, unit: 1, subject: "art", title: "A print" }),
    lesson("w1-sentence", { grade: 1, unit: 3, subject: "writing", title: "A sentence" }),
];

/** A shelf of 17 lessons, three in each unit but the last, so a page's key has ties in the unit. */
const SHELF: Shelf = { grade: 4, subject: "physics" };
const MANY = Array.from({ length: 17 }, (_, i) =>
    lesson(`p4-${String.fromCharCode(113 - i)}`, {
        grade: 4,
        unit: Math.floor(i / 3) + 1,
        subject: "physics",
        title: i % 2 ? `Magnets and a coil ${i}` : `Light through water ${i}`,
    }),
);

/** Every page of a shelf, each cursor fed back as a page would. */
function everyPage(
    lessons: readonly LessonFacts[],
    f: Filters,
    limit: number,
): Page<LessonFacts>[] {
    const pages: Page<LessonFacts>[] = [];
    let after: string | null = null;
    for (;;) {
        const page: Page<LessonFacts> | { problem: string } = shelfPage(
            lessons,
            SHELF,
            f,
            after,
            limit,
        );
        assert.ok(!("problem" in page));
        pages.push(page);
        if (page.next === null) return pages;
        after = page.next;
    }
}

describe("the catalogue's filters", () => {
    it("reads the filters from an address, keeping only a grade and a subject it has, and writes them back", () => {
        const subjects = ["maths", "writing", "art"];
        const grades = [1, 2, 3];
        const f = filtersFrom("?grade=1&subject=maths&q=%20ten%20", subjects, grades);
        assert.deepEqual(f, { grade: 1, subject: "maths", words: "ten" });
        assert.equal(searchOf(f), "?grade=1&subject=maths&q=ten");
        assert.deepEqual(filtersFrom("?grade=7&subject=cooking", subjects, grades), EVERYTHING);
        assert.equal(filtersFrom("?grade=4", subjects, grades).grade, null, "a grade not offered");
        assert.equal(searchOf(EVERYTHING), "");
    });

    it("finds lessons by grade, subject and every word of the title or goal, in the order a subject is taken", () => {
        assert.deepEqual(
            found(LESSONS, EVERYTHING).map((l) => l.id),
            ["m1-count", "w1-letters", "m1-ten", "w1-sentence", "m2-bonds", "a3-print"],
        );
        assert.deepEqual(
            found(LESSONS, { grade: 1, subject: "maths", words: "" }).map((l) => l.id),
            ["m1-count", "m1-ten"],
        );
        assert.deepEqual(
            found(LESSONS, { ...EVERYTHING, words: "TWO   numbers" }).map((l) => l.id),
            ["m1-ten"],
        );
        assert.deepEqual(found(LESSONS, { ...EVERYTHING, words: "ten bonds" }), []);
    });

    it("looks in every grade, whatever a page has open or loaded", () => {
        assert.deepEqual(
            found(LESSONS, { ...EVERYTHING, words: "print" }).map((l) => l.id),
            ["a3-print"],
        );
    });
});

describe("a page of one shelf", () => {
    it("covers the shelf once, in the order a subject is taken, and counts it", () => {
        const pages = everyPage(MANY, EVERYTHING, 5);
        assert.deepEqual(
            pages.map((p) => p.items.length),
            [5, 5, 5, 2],
        );
        assert.deepEqual(
            pages.flatMap((p) => p.items.map((l) => l.id)),
            found(MANY, EVERYTHING).map((l) => l.id),
        );
        assert.ok(pages.every((p) => p.total === 17));
    });

    it("searches the whole shelf before it cuts a page, so every match comes once and in order", () => {
        const f = { ...EVERYTHING, words: "magnets" };
        const matches = found(MANY, f);
        assert.equal(matches.length, 8);
        const pages = everyPage(MANY, f, 3);
        assert.deepEqual(
            pages.flatMap((p) => p.items),
            matches,
        );
        assert.ok(pages.every((p) => p.total === 8));
    });

    it("refuses a cursor made for other words, filters or another shelf", () => {
        const first = shelfPage(MANY, SHELF, { ...EVERYTHING, words: "magnets" }, null, 3);
        assert.ok(!("problem" in first) && first.next !== null);
        assert.deepEqual(shelfPage(MANY, SHELF, { ...EVERYTHING, words: "light" }, first.next, 3), {
            problem: "other-query",
        });
        assert.deepEqual(
            shelfPage(MANY, SHELF, { ...EVERYTHING, words: "magnets", grade: 4 }, first.next, 3),
            { problem: "other-query" },
        );
        assert.deepEqual(
            shelfPage(MANY, { grade: 4, subject: "chemistry" }, EVERYTHING, first.next, 3),
            { problem: "other-query" },
        );
        assert.deepEqual(shelfPage(MANY, SHELF, EVERYTHING, "garbage", 3), {
            problem: "unreadable",
        });
        // the same words written differently are the same search
        assert.ok(
            !(
                "problem" in
                shelfPage(MANY, SHELF, { ...EVERYTHING, words: " MAGNETS " }, first.next, 3)
            ),
        );
    });

    it("is empty for a search nothing matches, and for a shelf the filters leave out", () => {
        assert.deepEqual(shelfPage(MANY, SHELF, { ...EVERYTHING, words: "volcano" }, null, 5), {
            items: [],
            next: null,
            total: 0,
        });
        const other = shelfPage(MANY, SHELF, { ...EVERYTHING, grade: 5 }, null, 5);
        assert.ok(!("problem" in other));
        assert.equal(other.total, 0);
    });
});
