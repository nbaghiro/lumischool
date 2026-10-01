// A child's map opens by grade (`reaches` in journeys.ts, applied by `mapViewOf`): the worlds of their
// year and every year before it, and the places a track brings them to that have lessons at their
// grade, each with a journey there; the worlds of later years stay drawn and closed.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonFacts } from "../../../engine/pack";
import type { Progress } from "../../record";
import { apply } from "../choice";
import { corpusFrom, topicsIn } from "../lessons";
import type { YearRecord } from "../rewards";
import type { Applied } from "../types";
import { CHILD_MAP, emptyProgress, mapViewOf } from "../view";
import { elsewhere, siteOf, worldById, WORLDS, yearOf } from "../worlds";

const STARTED = "2026-08-31";
const GRADES = [1, 2, 3, 4, 5, 6];
// every world offers some of these drawings, so every lesson fits every world's journey
const DRAWN = [...new Set(WORLDS.flatMap((w) => [...w.offers.landmarks, ...w.offers.creatures]))];

function factOf(id: string, grade: number, unit: number, subject: string): LessonFacts {
    return {
        id,
        source: `lessons/${id}.lumi`,
        title: id,
        goal: null,
        grade,
        unit,
        subject,
        format: "teach",
        art: DRAWN,
        file: `lessons/${id}-0000000000.json`,
        levels: ["medium"],
        first: null,
        skills: [],
    };
}

const LESSONS = GRADES.flatMap((g) => [
    ...Array.from({ length: 9 }, (_, i) => factOf(`g${g}-l${i + 1}`, g, i + 1, "maths")),
    ...Array.from({ length: 3 }, (_, i) => factOf(`art-${g}-${i + 1}`, g, i + 1, "art")),
]);
const CORPUS = corpusFrom(LESSONS, STARTED, { language: null, nation: null });
const worldOf = (id: string): Applied => apply(worldById(id), undefined, true).world;

/** A child of `grade` with nothing done, or with the first year's first lesson done. */
function mapOf(grade: number, began = false) {
    const records = GRADES.map((g): YearRecord => {
        const progress: Progress = emptyProgress();
        if (g === grade) progress.current = `g${g}-l1`;
        if (began && g === 1)
            progress.done["g1-l1"] = { stars: 3, on: STARTED, minutes: 5, right: 1 };
        return { grade: g, year: CORPUS.year(g, "Rosie"), progress, worlds: yearOf(g) };
    });
    return mapViewOf({
        records,
        sides: elsewhere(
            records.flatMap((r) => r.worlds.map((world) => ({ world }))),
            records.map((r) => r.year),
        ),
        corpus: CORPUS,
        worldOf,
        topics: topicsIn(CORPUS),
        size: () => ({ w: 400, h: 400 }),
        grown: false,
        child: { name: "Rosie", since: STARTED },
        grade,
        limits: CHILD_MAP,
    });
}

const placeOf = (map: ReturnType<typeof mapOf>, world: string) =>
    map.places.find((p) => p.shown?.world === world);

test("a grade 4 child with nothing done may go into the worlds of years 1 to 4, and not those of 5 and 6", () => {
    const map = mapOf(4);
    for (const g of GRADES)
        for (const world of yearOf(g)) {
            const open = placeOf(map, world)?.open;
            assert.equal(open, g <= 4, `${world}, year ${g}`);
        }
});

test("a place a track brings a child to opens where it has lessons at their grade, and the ferry waits for a language", () => {
    const map = mapOf(4);
    assert.equal(siteOf("painters-hut")?.kind, "track");
    assert.equal(placeOf(map, "painters-hut")?.open, true);
    const ferry = placeOf(map, "ferry-town");
    assert.ok(!ferry?.open, "no language chosen, no way into the ferry town");
});

test("a way to a world the grade does not reach is hidden, and the ways between reached worlds are not", () => {
    const map = mapOf(4);
    const at = (i: number) => map.places.find((p) => p.i === i);
    const runWays = map.ways.filter(
        (w) => w.from < map.layout.nodes.length && w.to < map.layout.nodes.length,
    );
    for (const way of runWays) {
        const ends = [at(way.from), at(way.to)];
        if (ends.some((p) => !p?.open))
            assert.equal(way.state, "hidden", `${way.from} to ${way.to}`);
    }
    assert.ok(
        runWays.some((w) => w.state !== "hidden" && at(w.from)?.open && at(w.to)?.open),
        "some way between reached worlds shows",
    );
});

test("an earlier world the child has begun keeps its colour; one they have not stays dimmed", () => {
    const begun = placeOf(mapOf(4, true), "meadow");
    assert.equal(begun?.open, true);
    assert.notEqual(begun?.state, "ahead");
    const untouched = placeOf(mapOf(4), "harbour");
    assert.equal(untouched?.open, true);
    assert.equal(untouched?.state, "ahead");
});
