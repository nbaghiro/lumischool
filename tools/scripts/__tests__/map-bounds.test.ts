import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonFacts } from "../../../engine/pack";
import type { Progress } from "../../../school/record";
import { MAP_TILES } from "../../../engine/ui/map-tile-manifest";
import { apply } from "../../../school/worlds/choice";
import { corpusFrom, topicsIn } from "../../../school/worlds/lessons";
import type { YearRecord } from "../../../school/worlds/rewards";
import {
    CHILD_MAP,
    countryViewOf,
    emptyProgress,
    GROWN_MAP,
    mapViewOf,
} from "../../../school/worlds/view";
import { worldById, yearOf } from "../../../school/worlds/worlds";

const STARTED = "2026-08-31";
const GRADES = [1, 2, 3, 4, 5, 6];

/** Nine maths lessons a grade, one to a unit, so every grade has its three terms. */
const lessons = GRADES.flatMap((grade) =>
    Array.from({ length: 9 }, (_, i): LessonFacts => ({
        id: `g${grade}-l${i + 1}`,
        source: `lessons/g${grade}-${i + 1}.lumi`,
        title: `Lesson ${i + 1}`,
        goal: null,
        grade,
        unit: i + 1,
        subject: "maths",
        format: "teach",
        art: [],
        file: `lessons/g${grade}-l${i + 1}-0000000000.json`,
        levels: ["medium"],
        first: null,
        skills: [],
    })),
);
const corpus = corpusFrom(lessons, STARTED);
const worldOf = (id: string) => apply(worldById(id), undefined, true).world;
const size = () => ({ w: 400, h: 400 });

/** Every year's record for a child at the start of `grade`: the years before it finished, none after. */
const records = (grade: number): YearRecord[] =>
    GRADES.filter((g) => g <= grade).map((g) => {
        const year = corpus.year(g, "Rosie");
        const done: Progress["done"] = {};
        if (g < grade)
            for (const l of year.lessons)
                done[l.id] = { stars: 3, on: STARTED, minutes: 10, right: 1 };
        return {
            grade: g,
            year,
            progress: {
                ...emptyProgress(),
                done,
                current: g === grade ? (year.lessons[0]?.id ?? "") : "",
            },
            worlds: yearOf(g),
            tracks: [],
        };
    });

const view = (grade: number, grown: boolean) =>
    mapViewOf({
        records: records(grade),
        sides: [],
        corpus,
        worldOf,
        topics: topicsIn(corpus),
        size,
        grown,
        child: grown ? null : { name: "Rosie", since: STARTED },
        limits: grown ? GROWN_MAP : CHILD_MAP,
        still: true,
    });

test("every map is drawn on the bounds its tiles were baked to, whatever the grade and whoever looks", () => {
    const tiles = { ...MAP_TILES.bounds };
    assert.deepEqual(countryViewOf({ size, still: true }).country.bounds, tiles, "the backdrop");
    for (const grade of GRADES) {
        assert.deepEqual(view(grade, false).country.bounds, tiles, `a child in grade ${grade}`);
        assert.deepEqual(view(grade, true).country.bounds, tiles, `a grown-up, grade ${grade}`);
    }
});
