import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LessonFacts } from "../../../engine/pack";
import {
    besideIn,
    EVERYTHING,
    filtersFrom,
    found,
    foundLine,
    lessonPath,
    levelFrom,
    levelsOf,
    searchOf,
    shelvesOf,
    subjectsOf,
} from "../catalogue";

const lesson = (
    id: string,
    o: { grade: number; unit: number; subject: string; title?: string; goal?: string },
    levels: LessonFacts["levels"] = {
        easy: { hash: "e" },
        medium: { hash: "m" },
        hard: { hash: "h" },
    },
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
    levels,
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
    lesson(
        "a3-print",
        { grade: 3, unit: 1, subject: "art", title: "A print" },
        { medium: { hash: "m" } },
    ),
    lesson("w1-sentence", { grade: 1, unit: 3, subject: "writing", title: "A sentence" }),
];

describe("the grown-ups' Explore", () => {
    it("names the subjects in the tracks' order, with a subject that is not a track after them", () => {
        assert.deepEqual(subjectsOf(LESSONS), ["maths", "writing", "art"]);
    });

    it("reads the filters from an address, keeping only a grade and a subject it has, and writes them back", () => {
        const subjects = subjectsOf(LESSONS);
        const f = filtersFrom("?grade=1&subject=maths&q=%20ten%20", subjects);
        assert.deepEqual(f, { grade: 1, subject: "maths", words: "ten" });
        assert.equal(searchOf(f), "?grade=1&subject=maths&q=ten");
        assert.deepEqual(filtersFrom("?grade=7&subject=cooking", subjects), EVERYTHING);
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

    it("sets the lessons out by grade and then by subject, leaving out what holds none", () => {
        const shelves = shelvesOf(found(LESSONS, EVERYTHING), subjectsOf(LESSONS));
        assert.deepEqual(
            shelves.map((s) => [
                s.grade,
                s.subjects.map((x) => [x.subject, x.lessons.map((l) => l.id)]),
            ]),
            [
                [
                    1,
                    [
                        ["maths", ["m1-count", "m1-ten"]],
                        ["writing", ["w1-letters", "w1-sentence"]],
                    ],
                ],
                [2, [["maths", ["m2-bonds"]]]],
                [3, [["art", ["a3-print"]]]],
            ],
        );
    });

    it("says how many lessons it found, and what to do when none", () => {
        assert.equal(foundLine(314, 314), "All 314 lessons");
        assert.equal(foundLine(1, 314), "1 lesson matches");
        assert.equal(foundLine(12, 314), "12 lessons match");
        assert.match(foundLine(0, 314), /^No lesson matches\./);
    });

    it("finds the lessons either side of one in its subject, across the grades", () => {
        const around = (id: string): (string | null)[] => {
            const b = besideIn(LESSONS, id);
            return [b.before?.id ?? null, b.after?.id ?? null];
        };
        assert.deepEqual(around("m1-ten"), ["m1-count", "m2-bonds"]);
        assert.deepEqual(around("m1-count"), [null, "m1-ten"]);
        assert.deepEqual(around("a3-print"), [null, null]);
        assert.deepEqual(around("nothing"), [null, null]);
    });

    it("reads a lesson at a level it declares, and as written otherwise", () => {
        const [three, one] = [LESSONS[0], LESSONS[4]];
        assert.ok(three && one);
        assert.deepEqual(levelsOf(three), ["easy", "medium", "hard"]);
        assert.deepEqual(levelsOf(one), ["medium"]);
        assert.equal(levelFrom("?level=hard", levelsOf(three)), "hard");
        assert.equal(levelFrom("?level=hard", levelsOf(one)), "medium");
        assert.equal(levelFrom("?level=extreme", levelsOf(three)), "medium");
        assert.equal(lessonPath("m1-ten"), "/explore/m1-ten");
        assert.equal(lessonPath("m1-ten", "easy"), "/explore/m1-ten?level=easy");
    });
});
