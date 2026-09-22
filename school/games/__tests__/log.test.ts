// What one attempt records, and the line a parent reads from it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIVITIES } from "../activities";
import type { Position } from "../games";
import { begin, far, line, MOVE_CAP, record, summarise } from "../log";
import { distance, explore, nudge } from "../prove";

test("the log records the gap before each move and rebuilds the position keys", () => {
    const activity = ACTIVITIES[1];
    assert.ok(activity);
    const r = activity.round(0);
    const ex = explore(r);
    const a = begin(r, distance(ex, r.start), 1000);
    let pos: Position = r.start;
    for (const step of [2500, 3000, 3400]) {
        const move = pos.moves[nudge(ex, pos) ?? 0];
        assert.ok(move);
        pos = move.next();
        record(a, { say: move.say, key: pos.key, dist: far(distance(ex, pos)), undo: false }, step);
    }
    a.outcome = pos.won ? "won" : "gave up";
    assert.equal(a.moves.length, 3);
    assert.equal(a.moves[0]?.gap, 1.5);
    assert.equal(a.moves[1]?.gap, 0.5);
    assert.equal(a.outcome, "won");
    const e = summarise(a);
    assert.equal(e.direction, "closer");
    assert.equal(e.ended, 0);
    assert.match(line(e), /^Won in 3 moves/);
});

test("giving up is recorded as how far from the end it was", () => {
    const activity = ACTIVITIES[0];
    assert.ok(activity);
    const r = activity.round(0);
    const ex = explore(r);
    const a = begin(r, distance(ex, r.start), 0);
    const move = r.start.moves[0];
    assert.ok(move);
    const to = move.next();
    record(a, { say: move.say, key: to.key, dist: far(distance(ex, to)), undo: false }, 9000);
    a.outcome = "gave up";
    const e = summarise(a);
    assert.equal(e.firstMove, 9);
    assert.match(line(e), /Stopped \d+ moves? from the end/);
});

test("a distance with no win left is kept as null, because Infinity does not survive JSON", () => {
    const activity = ACTIVITIES[0];
    assert.ok(activity);
    const a = begin(activity.round(0), Infinity, 0);
    assert.equal(a.from, null);
    record(a, { say: "x", key: "k", dist: far(Infinity), undo: false }, 1000);
    assert.equal(a.moves[0]?.dist, null);
    assert.equal(JSON.stringify(a.moves[0]?.dist), "null", "and it survives being written out");
    // The reading turns it back into a distance, so a parent is told there was no win left rather
    // than being told the child ended on nought.
    const e = summarise(a);
    assert.equal(e.closest, Infinity);
    assert.match(line({ ...e, outcome: "gave up" }), /with no win left on the board/);
});

test("the log stops at its cap rather than growing without bound", () => {
    const activity = ACTIVITIES[0];
    assert.ok(activity);
    const a = begin(activity.round(0), 3, 0);
    for (let i = 0; i < MOVE_CAP + 10; i++) {
        record(a, { say: "x", key: "k", dist: 1, undo: false }, i * 100);
    }
    assert.equal(a.moves.length, MOVE_CAP);
    assert.equal(a.capped, true);
});
