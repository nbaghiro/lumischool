// The guide: the step to do is the first not done, the pointer waits for idleness except on a first
// level, the bounce stops at rest, and words wrap to a bubble without splitting a word.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bounce, bubbleWidth, currentOf, pointing, wrap } from "../guide";

test("the step to do is the first one not done, and none once all are", () => {
    assert.equal(currentOf([{ done: true }, { done: false }, { done: false }]), 1);
    assert.equal(currentOf([{ done: false }, { done: true }]), 0);
    assert.equal(currentOf([{ done: true }, { done: true }]), -1);
});

test("the pointer shows at once on a first level and otherwise only after standing idle", () => {
    assert.equal(pointing({ always: true, idle: 0, after: 480 }), true);
    assert.equal(pointing({ always: false, idle: 100, after: 480 }), false);
    assert.equal(pointing({ always: false, idle: 480, after: 480 }), true);
});

test("the bounce is still at rest and never goes below its foot", () => {
    assert.equal(bounce(37, true), 0);
    for (let t = 0; t < 200; t++) {
        const b = bounce(t, false);
        assert.ok(b >= 0 && b <= 0.5);
    }
});

test("words wrap to a bubble without splitting a word, and a bubble is as wide as its longest line", () => {
    const lines = wrap("Let's get the carrot seeds from the bench first.", 24);
    assert.deepEqual(lines, ["Let's get the carrot", "seeds from the bench", "first."]);
    assert.ok(lines.every((l) => l.length <= 24));
    assert.equal(wrap("one two three four five", 3, 2).length, 2);
    assert.ok(bubbleWidth(lines) >= 4 && bubbleWidth(lines) <= 16);
    assert.ok(bubbleWidth(["a much longer line of words"]) > bubbleWidth(["short"]));
});
