import assert from "node:assert/strict";
import { test } from "node:test";
import { areaOf, below, ring, submerged } from "../float";

const square = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
];

test("a square half under the water has half its area under, pushed up from the middle of that half", () => {
    const under = submerged(square, 1);
    assert.equal(under.area, 2);
    assert.deepEqual(under.centre, { x: 1, y: 1.5 });
    assert.equal(submerged(square, 3).area, 0, "above the water, nothing is under");
    assert.equal(submerged(square, -1).area, 4, "and all of it when it is sunk");
});

test("a polygon's area and middle do not depend on which way its corners go", () => {
    const back = [...square].reverse();
    assert.deepEqual(areaOf(back), areaOf(square));
    assert.equal(below(square, 5).length, 0);
});

test("a ball's ring of corners has close to its area", () => {
    const a = areaOf(ring({ x: 0, y: 0 }, 1, 64)).area;
    assert.ok(Math.abs(a - Math.PI) < 0.01, `area ${a}`);
});

test("under a sloping surface, the deeper end of a raft has more of it under water", () => {
    const raft = [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 1 },
        { x: 0, y: 1 },
    ];
    const under = submerged(raft, [
        { x: 0, y: 0.8 },
        { x: 4, y: 0.2 },
    ]);
    assert.ok(Math.abs(under.area - 2) < 1e-9, `area ${under.area}`);
    assert.ok(under.centre.x > 2, "the water is higher at the far end, so it pushes there more");
});
