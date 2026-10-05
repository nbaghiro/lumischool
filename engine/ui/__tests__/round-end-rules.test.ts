import { test } from "node:test";
import assert from "node:assert/strict";
import { actionsOf, titleOf } from "../round-end-rules";

test("a won round leads with the next level, and a round not won leads with another go", () => {
    const all = { variations: true, next: true, watch: true };
    assert.deepEqual(actionsOf({ ...all, won: true }), ["next", "another", "again", "watch"]);
    assert.deepEqual(actionsOf({ ...all, won: false }), ["again", "another", "next"]);
    assert.deepEqual(actionsOf({ won: true, variations: false, next: false, watch: false }), [
        "again",
    ]);
});

test("a round not won is never called lost", () => {
    assert.equal(titleOf(true), "Well played!");
    assert.doesNotMatch(titleOf(false), /lost|lose/i);
});
