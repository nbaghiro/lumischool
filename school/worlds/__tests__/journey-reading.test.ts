import assert from "node:assert/strict";
import { test } from "node:test";
import { journeyViewOf } from "../reading";
import { apply } from "../choice";
import { worldById } from "../worlds";
import type { Corpus } from "../lessons";
import type { Journey } from "../journeys";
import { childWorld, emptyProgress, GROWN_WORLD } from "../view";

const ids = ["nature-living-or-not", "g1-counting-to-twenty", "later"];
const journey: Journey = {
    id: "meadow:g1:v1",
    version: 1,
    world: "meadow",
    grade: 1,
    title: "Notice and count",
    purpose: "Look closely.",
    lessonIds: ids,
    status: "curated",
    missingIds: [],
};
const corpus: Corpus = {
    grades: [1],
    lesson: (id) => ({ id, grade: 1, title: id, subject: "nature", art: [], skills: [] }),
    year: () => {
        throw new Error("A visit must not replace the learning year");
    },
};
const options = {
    journey,
    corpus,
    worldOf: (id: string) => apply(worldById(id), undefined, true).world,
    topics: () => [],
    height: () => 900,
    size: () => ({ w: 400, h: 400 }),
    narrow: false,
    grown: true,
    limits: GROWN_WORLD,
};

test("journey projection preserves canonical IDs and cannot award annual moments", () => {
    const progress = emptyProgress();
    progress.done[ids[0] ?? ""] = { stars: 1, on: "2026-09-01", minutes: 5, right: 1 };
    const before = structuredClone(progress);
    const view = journeyViewOf({
        ...options,
        progress,
        today: [ids[1] ?? ""],
        limits: childWorld("kid"),
    });
    assert.deepEqual(
        view.days.flatMap((day) => day.sheets.map((s) => s.lesson)),
        ids,
    );
    assert.deepEqual(
        view.days.map((day) => day.sheets[0]?.state),
        ["done", "today", "closed"],
    );
    assert.deepEqual(
        view.days.map((day) => day.sheets[0]?.on),
        ["2026-09-01", null, null],
    );
    assert.equal(view.stretches[0]?.caption, "Grade 1 journey");
    assert.equal(view.trail, null);
    assert.equal(view.next, null);
    assert.ok(
        view.layout.scenery.every((piece) => piece.kind !== "moment" && piece.kind !== "secret"),
    );
    assert.deepEqual(progress, before);
    const moved = journeyViewOf({ ...options, height: (id) => (id === ids[0] ? 3000 : 900) });
    assert.deepEqual(
        moved.layout.rows.map((r) => r.day.id),
        view.layout.rows.map((r) => r.day.id),
    );
    assert.equal(new Set(view.layout.rows.map((r) => r.day.id)).size, ids.length);
});

test("a curriculum gap has a real empty state and does not borrow unrelated lessons", () => {
    const view = journeyViewOf({
        ...options,
        journey: { ...journey, lessonIds: [], status: "gap" },
    });
    assert.equal(view.days.length, 0);
    assert.equal(view.layout.rows.length, 0);
    assert.equal(view.stretches[0]?.card?.says, journey.purpose);
});
