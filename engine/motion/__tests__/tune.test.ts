import assert from "node:assert/strict";
import { test } from "node:test";
import { faults, knob, resetKnobs, turn, turned } from "../tune";

const table = () => ({
    gravity: knob(30, 10, 60, 5, "squares a second, each second", "a fall the eye can follow"),
    bounce: knob(0.3, 0, 0.9, 0.05, "of the speed kept", "a hit that settles in a beat"),
});

test("a knob turns inside its range and on its step, and says what it was set to", () => {
    const t = table();
    assert.equal(turn(t.gravity, 99), 60);
    assert.equal(turn(t.gravity, 12), 10);
    assert.equal(turn(t.gravity, 27), 25);
    assert.equal(turn(t.bounce, 0.33), 0.35);
    assert.deepEqual(turned(t), ["gravity", "bounce"]);
    resetKnobs(t);
    assert.deepEqual(turned(t), []);
    assert.equal(t.gravity.value, 30);
});

test("a range that does not end on a step stops at its last step inside it", () => {
    const k = knob(0.4, 0, 1, 0.4, "of a turn", "a range that ends between two steps");
    assert.equal(turn(k, 1), 0.8, "1 is nearest 1.2, which is past the end");
    assert.equal(turn(k, 9), 0.8);
    assert.equal(turn(k, -3), 0);
    assert.equal(turn(k, 0.5), 0.4);
});

test("a table is faulted for a start outside its range, off its step, or with no reason", () => {
    assert.deepEqual(faults(table()), []);
    const bad = {
        far: knob(80, 10, 60, 5, "squares", "too far to be a start"),
        odd: knob(12, 10, 60, 5, "squares", "not on a step of five"),
        mute: knob(20, 10, 60, 5, "squares", "why"),
        bare: knob(20, 10, 60, 5, " ", "has no unit to read it in"),
    };
    const found = faults(bad);
    assert.equal(found.length, 4, found.join("; "));
});
