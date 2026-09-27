import { test } from "node:test";
import assert from "node:assert/strict";
import { done, eventsOf, feed, progress, track } from "../goals";

test("an event seen so many times meets its goal, and one of another kind or value does not count", () => {
    const t = track({ on: "catch", value: "trout", times: 2 });
    assert.equal(feed(t, { kind: "catch", value: "perch" }), false);
    assert.equal(feed(t, { kind: "bite" }), false);
    assert.equal(feed(t, { kind: "catch", value: "trout" }), true);
    assert.deepEqual(progress(t), { done: false, completed: 1, total: 2 });
    feed(t, { kind: "catch", value: "trout" });
    assert.ok(done(t));
    assert.equal(feed(t, { kind: "catch", value: "trout" }), false);
});

test("goals in order take one part an event, and an event out of turn does nothing", () => {
    const t = track({
        inOrder: [{ on: "gate", value: 2 }, { on: "gate", value: 4 }, { on: "dock" }],
    });
    assert.equal(feed(t, { kind: "gate", value: 4 }), false);
    assert.equal(feed(t, { kind: "dock" }), false);
    feed(t, { kind: "gate", value: 2 });
    feed(t, { kind: "gate", value: 4 });
    assert.deepEqual(progress(t), { done: false, completed: 2, total: 3 });
    feed(t, { kind: "dock" });
    assert.ok(done(t));
});

test("all needs every part and any needs one, and progress counts the nearest part of an any", () => {
    const all = track({ all: [{ on: "a" }, { on: "b", times: 2 }] });
    feed(all, { kind: "b" });
    feed(all, { kind: "a" });
    assert.ok(!done(all));
    assert.deepEqual(progress(all), { done: false, completed: 2, total: 3 });
    feed(all, { kind: "b" });
    assert.ok(done(all));
    const any = track({
        any: [
            { on: "a", times: 3 },
            { on: "b", times: 2 },
        ],
    });
    feed(any, { kind: "b" });
    assert.deepEqual(progress(any), { done: false, completed: 1, total: 2 });
    feed(any, { kind: "b" });
    assert.ok(done(any));
});

test("a track is plain data that survives being copied, and events are read out of a step's happenings", () => {
    const t = track({ inOrder: [{ on: "seed", times: 2 }, { all: [{ on: "home" }] }] });
    feed(t, { kind: "seed" });
    const copy = structuredClone(t);
    assert.deepEqual(JSON.parse(JSON.stringify(t)), copy);
    feed(copy, { kind: "seed" });
    feed(copy, { kind: "home" });
    assert.ok(done(copy) && !done(t));
    assert.deepEqual(
        eventsOf([
            { cue: "ring" },
            { event: { kind: "gate", value: 3 } },
            { shake: 0.2 },
            { event: { kind: "checkpoint" } },
        ]),
        [{ kind: "gate", value: 3 }, { kind: "checkpoint" }],
    );
});
