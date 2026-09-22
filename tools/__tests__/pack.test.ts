// The packs of the whole curriculum, compiled once through the notation engine: the
// family's holds every lesson, each file reads back as the lesson its index names and is named by its
// own hash, every practice block carries two more draws, what a child's device fetches stays within
// its budget, and a filtered pack holds only what its filter keeps.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { before, test } from "node:test";
import { gzipSync } from "node:zlib";
import { readIndex, readLesson, readScene, type PackLesson } from "../../engine/pack";
import { compileLessons, packOf, type BuiltPack } from "../pack";

const ROOT = join(import.meta.dirname, "..", "..");
const LESSONS = join(ROOT, "content/curriculum/lessons");

/** Gzipped, in bytes: a lesson's file, and the index of every lesson. */
const BUDGET = { lesson: 50_000, index: 60_000, scene: 4_000 };

let compiled: PackLesson[] = [];
let built: BuiltPack | null = null;
const lessons = new Map<string, PackLesson>();

before(() => {
    compiled = compileLessons();
    built = packOf(compiled);
    for (const [file, text] of built.lessons) {
        const read = readLesson(JSON.parse(text));
        if (read.ok) lessons.set(file, read.lesson);
    }
});

const sha256 = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");
const zipped = (text: string): number => gzipSync(text).length;
const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

test("every lesson of the curriculum is in the family's pack, and its file reads back as that lesson", () => {
    assert.ok(built);
    const ids = readdirSync(LESSONS)
        .filter((f) => f.endsWith(".lumi"))
        .flatMap(
            (f) => /^\s*lesson\s+(\S+)/m.exec(readFileSync(join(LESSONS, f), "utf8"))?.[1] ?? [],
        )
        .sort(byId);
    assert.deepEqual(
        built.index.lessons.map((l) => l.id),
        ids,
    );
    assert.equal(lessons.size, built.lessons.size, "a lesson's file did not read back");
    for (const facts of built.index.lessons) assert.equal(lessons.get(facts.file)?.id, facts.id);
    assert.ok(readIndex(JSON.parse(built.indexText)).ok);
});

test("each file is named by its own hash, and the pack by the hash of its index", () => {
    assert.ok(built);
    for (const [file, text] of [...built.lessons, ...built.scenes])
        assert.ok(file.endsWith(`-${sha256(text).slice(0, 10)}.json`), file);
    assert.equal(built.digest, sha256(built.indexText));
});

test("every lesson's first drawing is its own small file the index names, which reads back as a scene of that lesson", () => {
    assert.ok(built);
    let drawn = 0;
    for (const facts of built.index.lessons) {
        if (facts.first === null) continue;
        drawn++;
        const text = built.scenes.get(facts.first);
        assert.ok(text, `${facts.id} names ${facts.first}, which the pack does not hold`);
        const read = readScene(JSON.parse(text));
        assert.ok(read.ok && read.first.lesson === facts.id, facts.id);
        assert.ok(zipped(text) <= BUDGET.scene, `${facts.first} is ${zipped(text)} bytes gzipped`);
    }
    assert.ok(drawn > built.index.lessons.length * 0.9, `only ${drawn} lessons have a drawing`);
    assert.equal(built.scenes.size, drawn);
});

test("every practice block carries two more draws, each as many questions as the block", () => {
    let practice = 0;
    for (const lesson of lessons.values()) {
        for (const block of lesson.levels.medium.sections.flatMap((s) => s.blocks)) {
            if (block.k !== "ask") continue;
            if (block.how !== "practice") {
                assert.deepEqual(block.again, [], lesson.id);
                continue;
            }
            practice++;
            assert.equal(block.again.length, 2, lesson.id);
            for (const draw of block.again)
                assert.equal(draw.length, block.questions.length, lesson.id);
        }
    }
    assert.ok(practice > 100, `only ${practice} practice blocks`);
});

test("a lesson's file and the index stay within their budget", () => {
    assert.ok(built);
    const sizes = [...built.lessons].map(([file, text]) => ({ file, bytes: zipped(text) }));
    const over = sizes.filter((s) => s.bytes > BUDGET.lesson);
    assert.deepEqual(over, [], `over ${BUDGET.lesson} bytes gzipped`);
    const index = zipped(built.indexText);
    assert.ok(index <= BUDGET.index, `the index is ${index} bytes gzipped`);
});

test("a pack written through a filter holds only what the filter keeps, as it keeps it", () => {
    assert.ok(built);
    const firstSection = (lesson: PackLesson): PackLesson | null => {
        if (lesson.grade !== 1) return null;
        const { medium } = lesson.levels;
        return {
            ...lesson,
            levels: { medium: { ...medium, sections: medium.sections.slice(0, 1) } },
        };
    };
    const visitor = packOf(compiled, firstSection);
    const wanted = compiled
        .filter((l) => l.grade === 1)
        .map((l) => l.id)
        .sort(byId);
    assert.ok(wanted.length > 0);
    assert.deepEqual(
        visitor.index.lessons.map((l) => l.id),
        wanted,
    );
    for (const facts of visitor.index.lessons) {
        const kept = visitor.lessons.get(facts.file);
        assert.ok(kept, facts.id);
        const read = readLesson(JSON.parse(kept));
        assert.ok(read.ok && read.lesson.levels.medium.sections.length <= 1, facts.id);
    }
    assert.notEqual(visitor.digest, built.digest);
});

test("a lesson that declares levels carries each of them, hashed apart, and its facts say which", () => {
    assert.ok(built);
    const levelled = [...lessons.values()].filter((l) => l.levels.easy || l.levels.hard);
    assert.ok(levelled.length >= 6, `${levelled.length} lessons carry a level besides medium`);
    for (const lesson of levelled) {
        const hashes = [lesson.levels.easy, lesson.levels.medium, lesson.levels.hard].flatMap(
            (l) => (l ? [l.hash] : []),
        );
        assert.equal(new Set(hashes).size, hashes.length, `${lesson.id}'s levels share a hash`);
    }
    for (const facts of built.index.lessons) {
        const lesson = lessons.get(facts.file);
        assert.deepEqual(
            Object.keys(facts.levels).sort(),
            Object.keys(lesson?.levels ?? {}).sort(),
        );
    }
});
