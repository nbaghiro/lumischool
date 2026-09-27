import { worldViewOf } from "../reading";
import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonFacts } from "../../../engine/pack";
import type { Progress } from "../../record";
import { apply, defaultChoice } from "../choice";
import { corpusFrom, topicsIn } from "../lessons";
import type { Applied } from "../types";
import { childWorld, journalOf } from "../view";
import { worldById } from "../worlds";

const STARTED = "2026-08-31";

/** Nine maths lessons a grade, one to a unit, so each term is three days. */
const lessonsOf = (grade: number): LessonFacts[] =>
    Array.from({ length: 9 }, (_, i) => ({
        id: `g${grade}-l${i + 1}`,
        source: `lessons/g${grade}-l${i + 1}.lumi`,
        title: `Lesson ${i + 1} of year ${grade}`,
        goal: null,
        grade,
        unit: i + 1,
        subject: "maths",
        format: "teach",
        art: i % 2 ? ["tree"] : ["coins"],
        file: `lessons/g${grade}-l${i + 1}-0000000000.json`,
        levels: { medium: { hash: "0000000000" } },
        first: null,
        skills: i % 2 ? ["addition.making-ten"] : ["counting.in-twos"],
    }));

const CORPUS = corpusFrom([...lessonsOf(1), ...lessonsOf(2)], STARTED);
const TOPICS = topicsIn(CORPUS);
const CHOICE = defaultChoice("Rosie");
const worldOf = (id: string): Applied => apply(worldById(id), undefined, false).world;
const size = () => ({ w: 320, h: 240 });
const YEAR = CORPUS.year(1, "Rosie");

/** The first `n` lessons of the first year finished a day apart from 1 September, a Tuesday. */
function progressOf(n: number): Progress {
    const done: Progress["done"] = {};
    YEAR.lessons.slice(0, n).forEach((l, i) => {
        done[l.id] = { stars: 3, on: `2026-09-0${i + 1}`, minutes: 10, right: 1 };
    });
    return { done, current: YEAR.lessons[n]?.id ?? "", week: 1, unlocked: [] };
}

/** Rosie's own year with `n` lessons done, by default on a Monday, so the Friday before is before the weekend. */
const journalAt = (n: number, today = "2026-09-07") =>
    journalOf({
        corpus: CORPUS,
        place: { kind: "year" },
        grade: 1,
        when: null,
        choice: CHOICE,
        live: {
            grade: 1,
            year: YEAR,
            progress: progressOf(n),
            today,
            before: [],
            tracks: [],
        },
        sample: () => progressOf(0),
    });

test("an explicit child term visit projects the roll without changing annual history or rewards", () => {
    const journal = journalAt(4);
    const before = JSON.stringify(journal);
    const view = worldViewOf({
        journal,
        choice: CHOICE,
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        height: () => 1200,
        size,
        narrow: false,
        grown: false,
        arriveAt: 1,
        visitOnly: true,
        limits: childWorld("kid-1"),
    });
    assert.deepEqual(
        view.layout.rows.map((row) => row.day),
        journal.days.filter((day) => day.term === 1),
    );
    assert.deepEqual(
        view.layout.stretches.map((stretch) => stretch.world),
        ["meadow"],
    );
    assert.equal(view.next, null);
    assert.equal(JSON.stringify(journal), before);
    assert.ok(view.standings.some((standing) => standing.on === "2026-09-03"));
});
