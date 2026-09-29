import assert from "node:assert/strict";
import { test } from "node:test";
import { bandShares } from "../percentbar";

test("each band's parts are shares of that band's own total, to one decimal place", () => {
    assert.deepEqual(bandShares([12, 20, 8, 15, 15, 20, 9, 12, 9], 3), [
        [30, 50, 20],
        [30, 30, 40],
        [30, 40, 30],
    ]);
    assert.deepEqual(bandShares([30, 45, 15, 10, 64, 64, 48, 24], 4), [
        [30, 45, 15, 10],
        [32, 32, 24, 12],
    ]);
    assert.deepEqual(bandShares([3, 5, 1, 2], 2), [
        [37.5, 62.5],
        [33.3, 66.7],
    ]);
    assert.deepEqual(bandShares([0, 0], 2), [[0, 0]]);
});
