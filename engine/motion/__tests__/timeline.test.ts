import assert from "node:assert/strict";
import { test } from "node:test";
import { collapse, cuesBetween, done, easeBack, timeline, valueAt } from "../timeline";

test("a timeline is a function of time, its cues fire once, and collapsed it is all at nought", () => {
    const tl = timeline(
        [{ name: "star", from: 0, to: 1, at: 0.5, dur: 0.4, ease: easeBack }],
        [
            { at: 0, cue: "level" },
            { at: 0.6, cue: "win" },
        ],
    );
    assert.equal(valueAt(tl, "star", 0.2), 0);
    assert.equal(valueAt(tl, "star", 2), 1);
    assert.ok(valueAt(tl, "star", 0.7) > 0.5);
    assert.deepEqual(cuesBetween(tl, -1, 0), ["level"]);
    assert.deepEqual(cuesBetween(tl, 0, 0.55), []);
    assert.deepEqual(cuesBetween(tl, 0.55, 1), ["win"]);
    assert.ok(!done(tl, 0.85) && done(tl, 0.91));
    const flat = collapse(tl);
    assert.equal(valueAt(flat, "star", 0), 1);
    assert.deepEqual(cuesBetween(flat, -1, 0), ["level", "win"]);
    assert.equal(flat.length, 0);
});
