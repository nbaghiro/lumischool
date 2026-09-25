import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { journeyDefinitions, journeyFor, journeyProblems, JOURNEY_VERSION } from "../journeys";
import type { Corpus, LessonFacts } from "../lessons";
import { WORLDS } from "../worlds";

// Check editorial ids against the source curriculum, not a second hand-maintained id fixture or
// a local generated pack. The normal pack suite separately parses and compiles every full lesson.
const directory = join(import.meta.dirname, "../../../content/curriculum/lessons");
const facts = new Map<string, LessonFacts>();
for (const file of readdirSync(directory).filter((name) => name.endsWith(".lumi"))) {
    const source = readFileSync(join(directory, file), "utf8");
    const header = /^\s*lesson\s+(\S+)\s+([^\n{]+)/m.exec(source);
    const id = header?.[1];
    const grade = Number(/\bgrade=(\d+)/.exec(header?.[2] ?? "")?.[1]);
    assert.ok(id && Number.isInteger(grade), `${file}: missing canonical lesson header`);
    facts.set(id, { id, grade, title: id, subject: "", art: [], skills: [] });
}
const corpus: Corpus = {
    grades: [1, 2, 3, 4],
    lesson: (id) => facts.get(id),
    year() {
        throw new Error("A journey lookup must not synthesize or read a learning year");
    },
};

test("version 1 covers every known world and supported grade with valid canonical membership", () => {
    assert.equal(JOURNEY_VERSION, 1);
    assert.equal(journeyDefinitions.length, WORLDS.length * 4);
    assert.deepEqual(journeyProblems(corpus), []);
    assert.equal(new Set(journeyDefinitions.map((j) => j.id)).size, journeyDefinitions.length);
    for (const world of WORLDS) {
        for (const grade of corpus.grades) {
            const journey = journeyFor(world.id, grade, corpus);
            assert.ok(journey, `${world.id} grade ${grade}`);
            assert.equal(journey.id, `${world.id}:g${grade}:v1`);
            assert.equal(journey.world, world.id);
            assert.equal(journey.grade, grade);
            assert.ok(journey.title && journey.purpose);
            assert.deepEqual(journey.missingIds, []);
            assert.equal(new Set(journey.lessonIds).size, journey.lessonIds.length);
        }
    }
});

test("history and language remain explicit gaps; fossil foundations are honestly thin", () => {
    for (const grade of corpus.grades) {
        for (const world of ["old-tower", "ferry-town"]) {
            const journey = journeyFor(world, grade, corpus);
            assert.equal(journey?.status, "gap");
            assert.deepEqual(journey?.lessonIds, []);
        }
    }
    assert.equal(journeyFor("fossil-cliffs", 3, corpus)?.status, "thin");
    assert.equal(journeyFor("fossil-cliffs", 4, corpus)?.status, "thin");
    assert.equal(journeyFor("fossil-cliffs", 2, corpus)?.status, "curated");
    assert.equal(journeyFor("meadow", 0, corpus), undefined);
    assert.equal(journeyFor("meadow", 5, corpus), undefined);
    assert.equal(journeyFor("unknown", 1, corpus), undefined);
});

test("published order and canonical ids stay stable without expanding from pack subjects", () => {
    // Membership is the versioned contract, not the wording. Review a version migration rather
    // than silently changing the meaning of a saved v1 journey when editing this fingerprint.
    const membership = journeyDefinitions.map(({ id, lessonIds }) => [id, lessonIds]);
    assert.equal(
        createHash("sha256").update(JSON.stringify(membership)).digest("hex"),
        "c6aea7b7664bd5aea22aad9772de29a2b40aafdc5d45d4e2ccf61f8e392daa6c",
    );
    assert.deepEqual(journeyFor("home-garden", 1, corpus)?.lessonIds, [
        "nature-from-seed-to-flower",
        "nature-the-tree-through-the-year",
    ]);
    assert.deepEqual(journeyFor("railway", 3, corpus)?.lessonIds, [
        "reading-timetables",
        "g3-minutes-and-timetables",
        "physics-speed-from-distance-and-time",
    ]);
    const extra: LessonFacts = {
        id: "future-nature-lesson",
        title: "Another plant lesson",
        grade: 1,
        subject: "nature",
        art: ["tree"],
        skills: [],
    };
    const expanded: Corpus = {
        ...corpus,
        lesson: (id) => (id === extra.id ? extra : corpus.lesson(id)),
    };
    assert.deepEqual(journeyFor("home-garden", 1, expanded), journeyFor("home-garden", 1, corpus));
});

test("a smaller or changed pack reports missing members and never substitutes the wrong grade", () => {
    const first = "nature-from-seed-to-flower";
    const second = "nature-the-tree-through-the-year";
    const smaller: Corpus = {
        ...corpus,
        lesson: (id) => (id === second ? undefined : corpus.lesson(id)),
    };
    const thin = journeyFor("home-garden", 1, smaller);
    assert.equal(thin?.status, "thin");
    assert.deepEqual(thin?.lessonIds, [first]);
    assert.deepEqual(thin?.missingIds, [second]);
    assert.equal(thin?.id, journeyFor("home-garden", 1, corpus)?.id);
    const changed: Corpus = {
        ...smaller,
        lesson(id) {
            const lesson = smaller.lesson(id);
            return lesson && id === first ? { ...lesson, grade: 2 } : lesson;
        },
    };
    const gap = journeyFor("home-garden", 1, changed);
    assert.equal(gap?.status, "gap");
    assert.deepEqual(gap?.lessonIds, []);
    assert.deepEqual(gap?.missingIds, [first, second]);
    assert.ok(journeyProblems(changed).some((p) => p.includes(`wrong grade for ${first}`)));
    assert.ok(journeyProblems(changed).some((p) => p.includes(`missing lesson ${second}`)));
    assert.equal(journeyFor("home-garden", 1, corpus)?.status, "curated");
});

test("optional themed visits remain short selections rather than whole-library clones", () => {
    for (const journey of journeyDefinitions) {
        assert.ok(journey.lessonIds.length <= 3, `${journey.id}: review a larger editorial scope`);
        if (journey.status === "curated") assert.ok(journey.lessonIds.length >= 2);
        if (journey.status === "thin") assert.equal(journey.lessonIds.length, 1);
        if (journey.status === "gap") assert.equal(journey.lessonIds.length, 0);
    }
});
