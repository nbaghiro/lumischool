import assert from "node:assert/strict";
import { test } from "node:test";
import {
    bearing,
    middleOf,
    nameOf,
    offset,
    offsetWords,
    pointOf,
    squareAt,
    squareNamed,
    stepsApart,
    walkFrom,
    type Grid,
} from "../compass";

const GRID: Grid = { x: 12, y: 9, cell: 3, cols: 12, rows: 9 };

test("a square is named by its column's letter along the top and its row's number down the side", () => {
    assert.deepEqual(squareAt(GRID, { x: 13, y: 10 }), { c: 0, r: 0 });
    assert.equal(nameOf({ c: 0, r: 0 }), "A1");
    assert.equal(nameOf({ c: 2, r: 3 }), "C4");
    assert.deepEqual(squareNamed(GRID, "c4"), { c: 2, r: 3 });
    assert.equal(squareNamed(GRID, "M1"), null, "the grid has twelve columns");
    assert.equal(squareNamed(GRID, "A10"), null, "and nine rows");
    assert.equal(squareAt(GRID, { x: 11.9, y: 10 }), null);
    assert.deepEqual(squareAt(GRID, middleOf(GRID, { c: 7, r: 5 })), { c: 7, r: 5 });
});

test("legs walked from a square end where a child counting squares would, north being up", () => {
    const palm = { c: 3, r: 5 };
    const end = walkFrom(palm, [
        { point: "north", n: 3 },
        { point: "east", n: 4 },
    ]);
    assert.deepEqual(end, { c: 7, r: 2 });
    assert.deepEqual(offset(palm, end), { north: 3, east: 4 });
    assert.equal(offsetWords(offset(palm, end)), "3 north and 4 east");
    assert.equal(offsetWords(offset(end, palm)), "3 south and 4 west");
    assert.equal(offsetWords({ north: 0, east: -2 }), "2 west");
    assert.equal(offsetWords({ north: 0, east: 0 }), "here");
});

test("a square on one of the eight lines out from another has a bearing, and one between them has none", () => {
    const light = { c: 11, r: 2 };
    assert.deepEqual(bearing(light, { c: 7, r: 6 }), { point: "south-west", n: 4 });
    assert.deepEqual(bearing(light, { c: 11, r: 0 }), { point: "north", n: 2 });
    assert.equal(bearing(light, { c: 8, r: 4 }), null);
    assert.equal(bearing(light, light), null);
    assert.equal(stepsApart(light, { c: 7, r: 6 }), 4);
    assert.equal(stepsApart(light, { c: 8, r: 4 }), 3);
});

test("the way a figure faces is read as the nearest point of the compass", () => {
    assert.equal(pointOf({ x: 0, y: -1 }), "north");
    assert.equal(pointOf({ x: 1, y: 1 }), "south-east");
    assert.equal(pointOf({ x: -1, y: 0.2 }), "west");
    assert.equal(pointOf({ x: -0.7, y: -0.7 }), "north-west");
});
