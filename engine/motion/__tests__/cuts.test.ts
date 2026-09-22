import assert from "node:assert/strict";
import { test } from "node:test";
import { fair, fairCuts, offBy, piecesOf, sizeOf } from "../cuts";

test("cuts split a length into pieces that always add up to the whole", () => {
    assert.deepEqual(piecesOf(12, []), [{ from: 0, to: 12 }]);
    assert.deepEqual(piecesOf(12, [8, 4]), [
        { from: 0, to: 4 },
        { from: 4, to: 8 },
        { from: 8, to: 12 },
    ]);
    for (const cuts of [[1.3], [11.9, 0.2, 6], [3, 3, 9], [-2, 5, 14]]) {
        const total = piecesOf(12, cuts).reduce((s, p) => s + sizeOf(p), 0);
        assert.ok(Math.abs(total - 12) < 1e-9, cuts.join(", "));
    }
});

test("a cut off the length or on another cut cuts nothing", () => {
    assert.equal(piecesOf(12, [0, 12, -1, 13]).length, 1);
    assert.equal(piecesOf(12, [6, 6]).length, 2);
});

test("a share is fair when every piece is within the distance of the share, and fair cuts are fair", () => {
    for (const n of [2, 3, 4, 6, 8]) assert.ok(fair(piecesOf(24, fairCuts(24, n)), 24 / n, 0));
    assert.deepEqual(offBy(piecesOf(12, [5]), 6), [-1, 1]);
    assert.ok(fair(piecesOf(12, [6.4]), 6, 0.5));
    assert.ok(!fair(piecesOf(12, [6.6]), 6, 0.5));
});
