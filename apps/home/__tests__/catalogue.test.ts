import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LessonFacts } from "../../../engine/pack";
import { EVERYTHING, found } from "../../../school/catalogue";
import {
    foundLine,
    lessonPath,
    levelFrom,
    searchedLine,
    shelfCount,
    shelvesOf,
    subjectsOf,
} from "../catalogue";

const lesson = (
    id: string,
    o: { grade: number; unit: number; subject: string; title?: string; goal?: string },
    levels: LessonFacts["levels"] = ["easy", "medium", "hard"],
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
    lesson("a3-print", { grade: 3, unit: 1, subject: "art", title: "A print" }, ["medium"]),
    lesson("w1-sentence", { grade: 1, unit: 3, subject: "writing", title: "A sentence" }),
];

describe("the grown-ups' Explore", () => {
    it("names the subjects in the tracks' order, with a subject that is not a track after them", () => {
        assert.deepEqual(subjectsOf(LESSONS), ["maths", "writing", "art"]);
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

    it("says how many lessons it found, how many a shelf holds, and what was looked for when none", () => {
        assert.equal(foundLine(314, 314), "All 314 lessons");
        assert.equal(foundLine(1, 314), "1 lesson found");
        assert.equal(foundLine(112, 314), "112 lessons found");
        assert.equal(foundLine(0, 314), "No lesson found");
        assert.equal(shelfCount(7, 31, true), "7 of 31 match");
        assert.equal(shelfCount(31, 31, false), "31 lessons");
        assert.equal(shelfCount(1, 1, false), "1 lesson");
        assert.equal(
            searchedLine({ grade: 2, subject: "writing", variant: null, words: " magnets " }),
            "No lesson matches \u201cmagnets\u201d in Grade 2 \u00b7 Writing.",
        );
        assert.equal(
            searchedLine({ grade: 3, subject: "history", variant: "japan", words: "" }),
            "No lesson in Grade 3 \u00b7 History \u00b7 Japan.",
        );
        assert.equal(
            searchedLine({ ...EVERYTHING, words: "volcano" }),
            "No lesson matches \u201cvolcano\u201d.",
        );
    });

    it("reads a lesson at a level it declares, and as written otherwise", () => {
        const [three, one] = [LESSONS[0], LESSONS[4]];
        assert.ok(three && one);
        assert.deepEqual(three.levels, ["easy", "medium", "hard"]);
        assert.deepEqual(one.levels, ["medium"]);
        assert.equal(levelFrom("?level=hard", three.levels), "hard");
        assert.equal(levelFrom("?level=hard", one.levels), "medium");
        assert.equal(levelFrom("?level=extreme", three.levels), "medium");
        assert.equal(lessonPath("m1-ten"), "/explore/m1-ten");
        assert.equal(lessonPath("m1-ten", "easy"), "/explore/m1-ten?level=easy");
    });
});
