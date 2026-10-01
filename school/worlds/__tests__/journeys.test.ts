import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonFacts } from "../../../engine/pack";
import { MOST, reaches } from "../journey-lessons";
import { journeyFor, journeyGrades, journeyProblems } from "../journeys";
import { corpusFrom } from "../lessons";

const STARTED = "2026-08-31";

function factOf(
    id: string,
    grade: number,
    unit: number,
    subject: string,
    more: Partial<LessonFacts> = {},
): LessonFacts {
    return {
        id,
        source: `lessons/${id}.lumi`,
        title: id,
        goal: null,
        grade,
        unit,
        subject,
        format: "teach",
        art: [],
        file: `lessons/${id}-0000000000.json`,
        levels: ["medium"],
        first: null,
        skills: [],
        ...more,
    };
}

/** A grade's lessons, each reaching the meadow and the garden through its skills. */
const yearOf = (grade: number, n = 9): LessonFacts[] =>
    Array.from({ length: n }, (_, i) =>
        factOf(`g${grade}-l${i + 1}`, grade, i + 1, "maths", {
            skills: ["addition.making-ten", "music"],
        }),
    );

const LESSONS: LessonFacts[] = [
    ...[0, 1, 2, 3, 4, 5, 6].flatMap((g) => yearOf(g)),
    factOf("history-toys", 1, 1, "history"),
    factOf("history-homes", 1, 2, "history"),
    factOf("history-g1-britain-our-country", 1, 9, "history", { nation: "britain" }),
    factOf("history-g1-japan-our-country", 1, 9, "history", { nation: "japan" }),
    factOf("language-hello.es", 1, 1, "language", { language: "es" }),
    factOf("language-my-name.es", 1, 2, "language", { language: "es" }),
];

test("a journey is filled from what its world reaches, up to the most, in the year's order", () => {
    const corpus = corpusFrom(LESSONS, STARTED);
    const meadow = journeyFor("meadow", 2, corpus);
    assert.equal(meadow?.id, "meadow:g2:v2");
    assert.deepEqual(
        meadow?.lessonIds,
        yearOf(2)
            .slice(0, MOST)
            .map((l) => l.id),
    );
    assert.ok(meadow?.lessonIds.every((id) => corpus.lesson(id)?.grade === 2));
});

test("each world offers its own grades: the garden kindergarten only, the far worlds from grade 3, the lamp rocks to grade 2", () => {
    const corpus = corpusFrom(LESSONS, STARTED);
    assert.deepEqual(journeyGrades("meadow", corpus), [1, 2, 3, 4, 5, 6]);
    assert.equal(journeyFor("meadow", 0, corpus), undefined);
    assert.deepEqual(journeyGrades("home-garden", corpus).slice(0, 1), [0]);
    assert.ok(journeyGrades("home-garden", corpus).every((g) => g === 0));
    assert.ok(journeyGrades("moon", corpus).every((g) => g >= 3));
    assert.ok(journeyGrades("lamp-rocks", corpus).every((g) => g <= 2));
    assert.equal(journeyFor("unknown", 1, corpus), undefined);
});

test("the history place takes its grade from the track, with the family's national unit first", () => {
    const none = corpusFrom(LESSONS, STARTED, { language: null, nation: null });
    assert.deepEqual(journeyFor("old-tower", 1, none)?.lessonIds, [
        "history-toys",
        "history-homes",
    ]);
    const japan = corpusFrom(LESSONS, STARTED, { language: null, nation: "japan" });
    assert.deepEqual(journeyFor("old-tower", 1, japan)?.lessonIds, [
        "history-g1-japan-our-country",
        "history-toys",
        "history-homes",
    ]);
    const preview = corpusFrom(LESSONS, STARTED, undefined, { language: "es", nation: "britain" });
    assert.equal(
        journeyFor("old-tower", 1, preview)?.lessonIds[0],
        "history-g1-britain-our-country",
    );
    assert.ok(
        !journeyFor("old-tower", 1, preview)?.lessonIds.includes("history-g1-japan-our-country"),
    );
});

test("the language place waits for a language, and a preview reads the first one the pack teaches", () => {
    const none = corpusFrom(LESSONS, STARTED, { language: null, nation: null });
    assert.equal(journeyFor("ferry-town", 1, none), undefined);
    assert.deepEqual(journeyGrades("ferry-town", none), []);
    const spanish = corpusFrom(LESSONS, STARTED, { language: "es", nation: null });
    assert.deepEqual(journeyFor("ferry-town", 1, spanish)?.lessonIds, [
        "language-hello.es",
        "language-my-name.es",
    ]);
    assert.deepEqual(
        journeyFor("ferry-town", 1, corpusFrom(LESSONS, STARTED))?.lessonIds,
        journeyFor("ferry-town", 1, spanish)?.lessonIds,
    );
});

test("the audit reports a grade a world offers with too few lessons", () => {
    const thin = corpusFrom(
        [
            ...[0, 1, 2, 3, 4, 5, 6].flatMap((g) => yearOf(g, 1)),
            factOf("history-toys", 1, 1, "history"),
        ],
        STARTED,
    );
    const problems = journeyProblems(thin);
    assert.ok(
        problems.some((p) => p.startsWith("meadow grade 1: 1 lessons")),
        problems.join("\n"),
    );
    assert.ok(problems.some((p) => p.startsWith("old-tower grade 1: 1 lessons")));
});

test("a child reaches the worlds of their year and before, and the places with lessons at their grade", () => {
    const corpus = corpusFrom(LESSONS, STARTED, { language: null, nation: null });
    assert.ok(reaches("meadow", 1, 3, corpus), "an earlier year's world");
    assert.ok(reaches("night-sky", 3, 3, corpus), "their own year's world");
    assert.ok(!reaches("mountains", 4, 3, corpus), "a later year's world");
    assert.ok(!reaches("meadow", 1, 0, corpus), "kindergarten stays in the garden");
    assert.ok(reaches("old-tower", null, 1, corpus), "history at their grade");
    assert.ok(!reaches("ferry-town", null, 1, corpus), "no language chosen, no ferry");
    assert.ok(
        reaches("winter-fair", null, 2, corpus),
        "a world a family may choose for their year",
    );
});

test("a lesson whose picture draws one of a world's landmarks fits it, and one that neither reaches nor draws does not", () => {
    const corpus = corpusFrom(
        [
            ...yearOf(1, 1),
            factOf("wheelbarrow-drawn", 1, 2, "art", { art: ["wheelbarrow"] }),
            factOf("nothing-here", 1, 3, "art", { art: ["no-such-drawing"] }),
        ],
        STARTED,
    );
    assert.deepEqual(journeyFor("meadow", 1, corpus)?.lessonIds, ["g1-l1", "wheelbarrow-drawn"]);
});
