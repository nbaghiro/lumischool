import assert from "node:assert/strict";
import { test } from "node:test";
import type { Attempt, Progress, Sitting } from "../record/record";
import {
    blockers,
    nextOf,
    onPath,
    pathOrder,
    prerequisites,
    progressIn,
    states,
    termSummary,
    unitSummary,
    unlocks,
    yearOf,
    yearsOf,
    type YearLesson,
} from "../year";

const lesson = (
    id: string,
    grade: number,
    unit: number,
    subject: string,
    source: string,
    format = "teach",
): YearLesson => ({
    id,
    source,
    title: id,
    goal: `The goal of ${id}.`,
    grade,
    unit,
    subject,
    format,
});

const LESSONS: YearLesson[] = [
    lesson("g1-count", 1, 1, "maths", "lessons/g1-02-count.lumi"),
    lesson("g1-bonds", 1, 1, "maths", "lessons/g1-01-bonds.lumi"),
    lesson("g1-add", 1, 2, "maths", "lessons/g1-03-add.lumi"),
    lesson("g1-take", 1, 2, "maths", "lessons/g1-04-take.lumi"),
    lesson("g1-tens", 1, 3, "maths", "lessons/g1-05-tens.lumi"),
    lesson("g1-review", 1, 3, "maths", "lessons/g1-06-review.lumi", "review"),
    lesson("g1-odd", 1, 3, "maths", "lessons/g1-07-odd.lumi", "lecture"),
    lesson("read-sounds", 1, 1, "reading", "lessons/read-01-sounds.lumi"),
    lesson("read-words", 1, 2, "reading", "lessons/read-02-words.lumi"),
    lesson("g2-hundred", 2, 1, "maths", "lessons/g2-01-hundred.lumi"),
];

const year = yearOf(LESSONS, 1, "Rosie", "2026-08-31");

test("a year is read off its lessons: maths is the path in unit and file order, and a unit is named by its first lesson", () => {
    assert.deepEqual(
        onPath(year).map((l) => l.id),
        ["g1-bonds", "g1-count", "g1-add", "g1-take", "g1-tens", "g1-review", "g1-odd"],
    );
    assert.deepEqual(
        year.units.map((u) => [u.n, u.title]),
        [
            [1, "g1-bonds"],
            [2, "g1-add"],
            [3, "g1-tens"],
        ],
    );
    assert.equal(year.units[0]?.about, "g1-bonds and g1-count.");
    assert.equal(
        year.lessons.find((l) => l.id === "g1-odd")?.format,
        "teach",
        "a word that is not a format reads as teach",
    );
    assert.deepEqual([year.child, year.started, year.title], ["Rosie", "2026-08-31", "Grade 1"]);
});

test("another strand hangs off the maths lesson as far along the path as it is along its own, and never blocks the path", () => {
    const sounds = year.lessons.find((l) => l.id === "read-sounds");
    const words = year.lessons.find((l) => l.id === "read-words");
    assert.deepEqual(
        [sounds?.branch, sounds?.aside, sounds?.unit, sounds?.week],
        ["g1-add", "reading", 2, 4],
    );
    assert.deepEqual([words?.branch, words?.unit, words?.week], ["g1-odd", 3, 8]);
    assert.deepEqual(prerequisites(year, "read-sounds"), ["g1-add"]);
    assert.deepEqual(prerequisites(year, "g1-take"), ["g1-add"], "the path waits only on the path");
    assert.deepEqual(prerequisites(year, "g1-bonds"), []);
    const order = pathOrder(year).map((l) => l.id);
    assert.equal(
        order.indexOf("read-sounds"),
        order.indexOf("g1-add") + 1,
        "a side path comes right after its lesson",
    );
});

const done = (right: number, minutes = 12): Progress["done"][string] => ({
    stars: 2,
    on: "2026-09-01",
    minutes,
    right,
});

const progress: Progress = {
    done: { "g1-bonds": done(0.9), "g1-count": done(0.7, 20) },
    current: "g1-add",
    week: 2,
    unlocked: [],
};

test("each lesson's state follows what is done, where the child is and what a grown-up opened", () => {
    const st = states(year, progress);
    assert.deepEqual(
        ["g1-bonds", "g1-add", "g1-take", "read-sounds"].map((id) => st.get(id)),
        ["done", "current", "locked", "locked"],
    );
    assert.deepEqual(blockers(year, progress, "g1-take"), ["g1-add"]);
    assert.ok(
        unlocks(year, "g1-add").includes("g1-take") &&
            unlocks(year, "g1-add").includes("read-sounds"),
    );
    assert.equal(
        states(year, { ...progress, unlocked: ["read-sounds"] }).get("read-sounds"),
        "open",
    );
    assert.equal(
        nextOf(year, progress)?.id,
        "g1-take",
        "what comes next is on the path, never a side path",
    );
});

test("a unit's and a term's summaries count what is done and how well it went", () => {
    assert.deepEqual(unitSummary(year, progress, 1), {
        total: 2,
        done: 2,
        secure: 1,
        growing: 1,
        revisit: 0,
        minutes: 32,
        here: false,
    });
    assert.equal(unitSummary(year, progress, 2).here, true);
    assert.deepEqual(termSummary(year, progress, 1, [1, 2, 3]), {
        n: 1,
        units: [1, 2, 3],
        total: 7,
        done: 2,
        asides: 2,
        here: true,
    });
});

test("a kid's progress through a year comes from their finished sittings and first-time answers", () => {
    const KID = "kid-1";
    const sittings: Sitting[] = [
        {
            child: KID,
            lesson: "g1-bonds",
            on: "2026-09-01",
            minutes: 12,
            mode: "screen",
            finished: true,
            withGrownUp: false,
            subject: "maths",
        },
        {
            child: KID,
            lesson: "g1-count",
            on: "2026-09-03",
            minutes: 8,
            mode: "paper",
            finished: false,
            withGrownUp: true,
            subject: "maths",
        },
        {
            child: "another",
            lesson: "g1-count",
            on: "2026-09-03",
            minutes: 8,
            mode: "paper",
            finished: true,
            withGrownUp: true,
            subject: "maths",
        },
        {
            child: KID,
            lesson: "g1-add",
            on: "2026-09-20",
            minutes: 9,
            mode: "screen",
            finished: true,
            withGrownUp: false,
            subject: "maths",
        },
    ];
    const attempts: Attempt[] = [true, true, false].map((right, i) => ({
        child: KID,
        lesson: "g1-bonds",
        section: "do",
        n: i + 1,
        item: "x",
        version: 1,
        variant: { ask: "" },
        skills: [],
        given: "",
        right,
        tries: 1,
        hints: 0,
        mode: "screen",
        markedBy: "auto",
        on: "2026-09-01",
    }));
    const p = progressIn(year, KID, attempts, sittings, "2026-08-31", "2026-09-14");
    assert.deepEqual(
        Object.keys(p.done),
        ["g1-bonds"],
        "another kid's sitting and one after today do not count",
    );
    assert.deepEqual([p.done["g1-bonds"]?.on, p.done["g1-bonds"]?.stars], ["2026-09-01", 1]);
    assert.deepEqual([p.current, p.week], ["g1-count", 3]);
});

test("every grade the lessons cover is a year of its own", () => {
    const years = yearsOf(LESSONS, "Rosie", "2026-08-31");
    assert.deepEqual(
        years.map((y) => [y.grade, y.lessons.length]),
        [
            [1, 9],
            [2, 1],
        ],
    );
});
