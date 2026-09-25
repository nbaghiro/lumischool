import { worldViewOf } from "../reading";
// The school as written, with nobody's record: the map of every world for a grown-up's own map, a
// world read as written, and where a lesson stands. On the same small made-up corpus as worlds.test.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonFacts } from "../../../engine/pack";
import { apply, defaultChoice } from "../choice";
import { corpusFrom, topicsIn } from "../lessons";
import type { Applied } from "../types";
import { GROWN_MAP, GROWN_WORLD } from "../view";
import { elsewhere, schoolRun, WORLDS, worldById, yearOf } from "../worlds";
import {
    journeyMap,
    daysWritten,
    journalWritten,
    schoolViewOf,
    whereIs,
    writtenView,
} from "../written";

const STARTED = "2026-08-31";

/** A lesson's facts as the pack's index gives them, with two drawings and two skills in turn. */
function factOf(
    id: string,
    file: string,
    grade: number,
    unit: number,
    subject: string,
): LessonFacts {
    return {
        id,
        source: `lessons/${file}-${id}.lumi`,
        title: subject === "maths" ? `Lesson ${unit} of year ${grade}` : `${subject} ${unit}`,
        goal: null,
        grade,
        unit,
        subject,
        format: "teach",
        art: unit % 2 ? ["coins"] : ["tree"],
        file: `lessons/${id}-0000000000.json`,
        levels: { medium: { hash: "0000000000" } },
        first: null,
        skills: unit % 2 ? ["counting.in-twos"] : ["addition.making-ten"],
    };
}

const two = (n: number): string => String(n).padStart(2, "0");

/** Nine units a grade, one lesson each, so a year has three terms of three days. */
const lessonsOf = (grade: number): LessonFacts[] =>
    Array.from({ length: 9 }, (_, i) =>
        factOf(`g${grade}-l${i + 1}`, `g${grade}-${two(i + 1)}`, grade, i + 1, "maths"),
    );

const CORPUS = corpusFrom([...lessonsOf(1), ...lessonsOf(2)], STARTED);
const TOPICS = topicsIn(CORPUS);
const CHOICE = defaultChoice("Rosie");
const worldOf = (id: string): Applied => apply(worldById(id), undefined, false).world;
const size = () => ({ w: 400, h: 400 });

test("the school as written, for a grown-up's own map: every world of every year and every place off the run, all open, the country in colour with nobody on it, and each note saying what the place holds", () => {
    const school = schoolViewOf({ corpus: CORPUS, size, still: true });
    const run = schoolRun();
    const years = [1, 2, 3, 4].map((g) => CORPUS.year(g, ""));
    assert.equal(school.places.length, run.length + elsewhere(run, years).length);
    assert.deepEqual(
        school.places.slice(0, run.length).map((p) => p.shown?.world),
        run.map((p) => p.world),
    );
    assert.deepEqual(
        new Set(school.places.slice(run.length).map((p) => `${p.shown?.world}|${p.shown?.when}`)),
        new Set(
            elsewhere(run, years).map(
                (s) =>
                    `${s.world}|${school.places.find((p) => p.shown?.world === s.world && p.i >= run.length)?.shown?.when}`,
            ),
        ),
        "the same places off the run as the scratchpad's map lists, each on its year's land",
    );
    assert.ok(
        school.places.every((p) => p.shown && p.open),
        "every place is drawn and open",
    );
    assert.equal(school.here, null, "nobody stands on it");
    assert.equal(school.title, null);
    assert.equal(school.grown, true);
    assert.equal(school.limits, GROWN_MAP);
    assert.equal(school.reach.known, null);
    assert.equal(school.reach.frontier, null);
    assert.deepEqual(
        school.reach.whole,
        school.country.lands,
        "every land is coloured to its coasts",
    );
    assert.deepEqual(
        school.reach.isles,
        school.country.isles.map((x) => x.node),
    );
    assert.ok(
        school.ways.every((w) => w.state === "open" || w.state === "hidden"),
        "every way is inked and none walked",
    );
    const meadow = school.places[0]?.shown;
    assert.ok(meadow);
    assert.equal(meadow.label, "The meadow. Year 1, term 1.");
    assert.deepEqual(meadow.notes[0], "3 lessons");
    assert.equal(meadow.stamp, null);
    assert.equal(meadow.moment, null);
    const empty = school.places.find((p) => p.shown?.world === run[6]?.world)?.shown;
    assert.equal(
        empty?.notes[0],
        "No lessons are written for it yet",
        "a year the corpus has no lessons for says so",
    );
    assert.ok(
        school.places.every((p) => !p.shown || p.shown.notes.length === 2),
        "a note says what the place holds and what the world is about",
    );
});

test("where a lesson stands: the world of the term it falls in, and nothing for a lesson the curriculum does not have", () => {
    assert.deepEqual(whereIs(CORPUS, "g1-l4"), { world: yearOf(1)[1], grade: 1, term: 2 });
    assert.deepEqual(whereIs(CORPUS, "g2-l9"), { world: yearOf(2)[2], grade: 2, term: 3 });
    assert.equal(whereIs(CORPUS, "no-such-lesson"), null);
});

test("a world read as written: every day of the year on the roll with nothing done and no today, its sheets closed and numbered, no trail yet, and nothing lit", () => {
    const year = CORPUS.year(1, "Rosie");
    const written = daysWritten(year);
    assert.equal(written.length, 9);
    assert.ok(written.every((d) => d.state === "done" && d.lessons.length === 1));
    assert.deepEqual(
        written.map((d) => d.n),
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
    );
    assert.deepEqual(new Set(written.map((d) => d.term)), new Set([1, 2, 3]));
    const j = journalWritten({
        corpus: CORPUS,
        place: { kind: "world", world: worldById("railway") },
        grade: null,
        when: null,
        choice: CHOICE,
    });
    assert.equal(j.days.length, 9, "every day of the year, with no record read");
    assert.equal(j.next, null);
    assert.equal(j.today, undefined);
    assert.deepEqual(Object.keys(j.progress.done), []);
    const built = worldViewOf({
        journal: j,
        choice: CHOICE,
        corpus: CORPUS,
        worldOf,
        topics: TOPICS,
        height: () => 1200,
        size,
        narrow: false,
        grown: true,
        limits: GROWN_WORLD,
    });
    // the roll lays the days out as done, and the written view takes back what done would mean
    assert.ok(built.days.every((d) => d.sheets.every((s) => s.state === "done")));
    const v = writtenView(built);
    assert.equal(v.open, "railway");
    assert.deepEqual(v.arrival, { term: 3, says: worldById("railway").arrive });
    assert.equal(v.days.length, 9);
    assert.ok(v.days.every((d) => d.sheets.every((s) => s.state === "closed" && s.on === null)));
    assert.deepEqual(
        v.days.map((d) => d.label),
        v.days.map((_, i) => `Day ${i + 1}`),
    );
    assert.equal(v.trail, null, "the trail draws a record's days, not the plan's");
    assert.ok(v.standings.every((s) => !s.lit && !s.inked && !s.on && !s.says));
    assert.ok(
        v.layout.scenery.every((s, i) => s.kind !== "secret" || v.standings[i]?.hide === true),
        "no secret shows beside a day nobody has done",
    );
    assert.equal(v.layout, built.layout, "the geometry is the roll's own");
    assert.equal(v.limits, GROWN_WORLD);
});

test("the shared atlas has one site per world, generous spacing, and all grades of a subject", () => {
    const corpus = corpusFrom(
        [
            ...lessonsOf(1),
            ...lessonsOf(2),
            factOf("art-one", "art-one", 1, 1, "art"),
            factOf("art-two", "art-two", 2, 1, "art"),
        ],
        STARTED,
    );
    const view = schoolViewOf({ corpus, size, still: true });
    assert.equal(view.places.length, WORLDS.length);
    assert.equal(new Set(view.places.map((p) => p.shown?.world)).size, WORLDS.length);
    const hut = view.places.find((p) => p.shown?.world === "painters-hut");
    assert.ok(hut?.shown?.notes.includes("2 lessons"));
    for (const [i, a] of view.places.entries()) {
        for (const b of view.places.slice(i + 1)) {
            assert.ok(
                Math.hypot(a.stand.x - b.stand.x, a.stand.y - b.stand.y) >= 2400,
                `${a.shown?.name} crowds ${b.shown?.name}`,
            );
        }
    }
});

test("an explicit visit projects only its term without rewriting annual days or progress", () => {
    for (const id of ["railway", "winter-fair", "valley-farm", "canal-town"]) {
        const journal = journalWritten({
            corpus: CORPUS,
            place: { kind: "world", world: worldById(id) },
            grade: null,
            when: null,
            choice: CHOICE,
        });
        const original = JSON.stringify(journal.days);
        const view = worldViewOf({
            journal,
            visitOnly: true,
            choice: CHOICE,
            corpus: CORPUS,
            worldOf,
            topics: TOPICS,
            height: () => 1200,
            size,
            narrow: false,
            grown: true,
            limits: GROWN_WORLD,
        });
        assert.deepEqual(
            view.layout.rows.map((r) => r.day),
            journal.days.filter((d) => d.term === journal.arrive),
        );
        assert.deepEqual(new Set(view.layout.stretches.map((s) => s.world)), new Set([id]));
        assert.equal(JSON.stringify(journal.days), original);
        assert.equal(view.arrival?.term, journal.arrive);
    }
});

test("alternative term notes name their actual eligible lessons", () => {
    const map = schoolViewOf({ corpus: CORPUS, size, still: true });
    assert.equal(
        map.places.find((p) => p.shown?.world === "valley-farm")?.shown?.notes[0],
        "Year 1, term 1: 3 lessons · Year 2, term 3: 3 lessons",
    );
    assert.equal(
        map.places.find((p) => p.shown?.world === "winter-fair")?.shown?.notes[0],
        "Year 1, term 2: 3 lessons · Year 2, term 2: 3 lessons",
    );
});

test("journey atlas labels report available membership without changing routes or permissions", () => {
    const corpus = corpusFrom(
        [
            factOf("nature-living-or-not", "nature", 1, 1, "nature"),
            factOf("g1-counting-to-twenty", "maths", 1, 1, "maths"),
        ],
        STARTED,
    );
    const original = schoolViewOf({ corpus, size, still: true });
    const snapshot = structuredClone(original.places);
    const view = journeyMap(original, corpus);
    assert.equal(view.layout, original.layout);
    assert.equal(view.limits, original.limits);
    assert.equal(view.reach, original.reach);
    assert.deepEqual(original.places, snapshot);
    const meadow = view.places.find((p) => p.shown?.world === "meadow");
    assert.equal(meadow?.shown?.when, "Grade journeys · 1");
    assert.equal(meadow?.shown?.notes[0], "Grade 1: 2 lessons");
    assert.equal(
        view.places.find((p) => p.shown?.world === "old-tower")?.shown?.when,
        "Lessons still to come",
    );
});
