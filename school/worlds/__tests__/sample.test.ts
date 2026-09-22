// The sample child: their made-up record, where they stand, the stops, cards and tiles the site
// draws, the words, and the reader of the site's data. On the same small made-up corpus as
// written.test.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonFacts } from "../../../engine/pack";
import { apply, defaultChoice } from "../choice";
import { corpusFrom } from "../lessons";
import {
    pastProgress,
    readSiteData,
    result,
    rollJournal,
    sampleChild,
    sampleProgress,
    sampleRecord,
    stopViews,
    visitJournal,
    wordsOf,
} from "../sample";
import type { Applied } from "../types";
import { worldById, yearOf } from "../worlds";
import { onPath } from "../../year";

const STARTED = "2026-08-31";

function factOf(id: string, grade: number, unit: number, subject: string): LessonFacts {
    return {
        id,
        source: `lessons/g${grade}-${unit}-${id}.lumi`,
        title: subject === "maths" ? `Lesson ${unit} of year ${grade}` : `${subject} ${unit}`,
        goal: null,
        grade,
        unit,
        subject,
        format: unit === 9 ? "puzzles" : "teach",
        art: unit % 2 ? ["coins"] : ["tree"],
        file: `lessons/${id}-0000000000.json`,
        levels: { medium: { hash: "0000000000" } },
        first: null,
        skills: unit % 2 ? ["counting.in-twos"] : ["addition.making-ten"],
    };
}

/** Nine units a grade, one maths lesson each and a reading lesson beside the odd ones. */
const lessonsOf = (grade: number): LessonFacts[] =>
    Array.from({ length: 9 }, (_, i) => i + 1).flatMap((unit) => [
        factOf(`g${grade}-l${unit}`, grade, unit, "maths"),
        ...(unit % 2 ? [factOf(`g${grade}-r${unit}`, grade, unit, "reading")] : []),
    ]);

const CORPUS = corpusFrom([...lessonsOf(1), ...lessonsOf(2)], STARTED);
const worldOf = (id: string): Applied => apply(worldById(id), undefined, true).world;
const size = () => ({ w: 400, h: 400 });
const CHOICE = defaultChoice("");
const YEAR = CORPUS.year(1, "");

test("a result is made up the same way every time, and a share of the path is what is done", () => {
    assert.deepEqual(result("g1-l1", "2026-09-01"), result("g1-l1", "2026-09-01"));
    const none = sampleProgress(YEAR, 0);
    assert.deepEqual(Object.keys(none.done), []);
    assert.equal(none.current, onPath(YEAR)[0]?.id);
    const half = sampleProgress(YEAR, 0.5);
    assert.equal(Object.keys(half.done).length, Math.round(onPath(YEAR).length * 0.5));
    assert.ok(!half.done[half.current], "the lesson the child is on is not done");
    const past = pastProgress(YEAR);
    assert.equal(Object.keys(past.done).length, YEAR.lessons.length);
    assert.equal(past.current, "");
});

test("the sample record: a year ahead untouched, a year behind finished a year earlier, and a reading lesson done with its maths lesson", () => {
    const ahead = sampleRecord(CORPUS.year(2, ""), {
        grade: 1,
        when: { kind: "share", share: 0.5 },
    });
    assert.deepEqual(Object.keys(ahead.done), []);
    const behind = sampleRecord(YEAR, { grade: 2, when: { kind: "share", share: 0.5 } });
    assert.equal(Object.keys(behind.done).length, YEAR.lessons.length);
    const own = pastProgress(YEAR).done["g1-l1"]?.on ?? "";
    assert.ok((behind.done["g1-l1"]?.on ?? "") < own, "a year behind was done a year earlier");
    const term = sampleRecord(YEAR, { grade: 1, when: { kind: "term", term: 1 } });
    assert.ok(term.done["g1-l3"] && !term.done["g1-l4"], "the first term's lessons are done");
    const host = YEAR.lessons.find((l) => l.id === "g1-r1")?.branch ?? "";
    assert.ok(term.done[host], "the maths lesson the reading lesson hangs off is done");
    assert.equal(term.done["g1-r1"]?.on, term.done[host]?.on);
});

test("the sample child stands partway into the first year, with stops for each term and the whole run, cards for the first year and tiles for every subject", () => {
    const c = sampleChild(CORPUS, worldOf);
    assert.equal(c.first.grade, 1);
    assert.ok(c.share >= 0.3 && c.share < 0.95, `share ${c.share}`);
    assert.ok(c.today, "there is a today");
    assert.equal(c.now.places.length, yearOf(1).length + yearOf(2).length);
    assert.equal(c.stops.length, yearOf(1).length + 1);
    assert.equal(c.stops.at(-1)?.node, "all");
    assert.deepEqual(
        c.stops.slice(0, -1).map((s) => s.node),
        yearOf(1).map((_, i) => i),
    );
    assert.deepEqual(
        c.cards.map((x) => x.words.title),
        yearOf(1).map((id) => worldOf(id).name),
    );
    assert.deepEqual(
        c.strands.map(([s]) => s),
        ["maths", "reading"],
    );
    assert.equal(c.tiles.tiles.length + c.tiles.few.length, 2);
    assert.equal(new Set(c.chosen).size, c.chosen.length);
    assert.ok(c.chosen.includes("g1-l1"), "the first maths lesson is read first");
    assert.ok(c.chosen.includes("g1-l9"), "a puzzle sheet is among the lessons read first");
    const days = c.rollDays();
    assert.ok(days.length >= 1 && days.length <= 2);
    assert.ok(days.every((d) => d.term === 1));
    assert.equal(days.at(-1)?.state, "today");
});

test("the words read off the child, and the site's data reads back through its checker", () => {
    const c = sampleChild(CORPUS, worldOf);
    const words = wordsOf(c, {
        questions: 40,
        versions: { total: 3, sampled: false, drawn: 3 },
        tagOf: (id) => `Tag ${id}`,
    });
    assert.equal(
        words.facts[0]?.n,
        String(YEAR.lessons.length + CORPUS.year(2, "").lessons.length),
    );
    assert.equal(words.facts[1]?.n, "40");
    assert.equal(words.eyebrow, "Ages 5 to 10 · two subjects");
    assert.equal(words.day.versions, 3);
    assert.match(words.day.versionsCaption, /One question, 3 ways/);
    assert.equal(words.steps.length, c.stops.length);
    assert.equal(words.cards.length, c.cards.length);
    assert.deepEqual(
        words.lessons.map((l) => l.tag),
        c.chosen.map((id) => `Tag ${id}`),
    );
    const data = { journey: c.now, words, versions: [], pack: "/assets/site-pack-0" };
    const read = readSiteData(JSON.parse(JSON.stringify(data)));
    assert.ok(read.ok);
    assert.deepEqual(read.data.journey, c.now);
    const broken = readSiteData({ ...data, journey: { ...c.now, here: "1" } });
    assert.ok(!broken.ok && /where the child is/.test(broken.problem));
    const noPack = readSiteData({ journey: c.now, words, versions: [] });
    assert.ok(!noPack.ok);
});

test("the views the site's pictures share: a map at each stop, the roll of yesterday and today, and a visit to a world with the sample's record", () => {
    const c = sampleChild(CORPUS, worldOf);
    const stops = stopViews(c, { worldOf, size, still: true });
    assert.equal(stops.length, c.stops.length);
    assert.equal(stops.at(-1)?.view.limits.travel, "everywhere");
    assert.equal(stops[0]?.view.limits.travel, "reached");
    const roll = rollJournal(c, CHOICE);
    assert.equal(roll.terms, 1);
    assert.deepEqual(roll.worlds(CHOICE), [c.todayWorld.id]);
    assert.equal(roll.days.length, c.rollDays().length);
    assert.equal(roll.today?.state, "today");
    const visit = visitJournal(c, worldById(yearOf(1)[0] ?? "meadow"), CHOICE);
    assert.equal(visit.visit?.id, yearOf(1)[0]);
    assert.equal(visit.grade, 1);
    assert.ok(Object.keys(visit.progress.done).length > 0, "the visit carries the sample's record");
});
