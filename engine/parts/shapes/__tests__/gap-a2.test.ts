import assert from "node:assert/strict";
import { test } from "node:test";
import { imageOf } from "../moveshape";

const turn = (by: number, cx: number, cy: number) => ({
    move: "rotate",
    mirror: "y",
    turn: by,
    dx: 0,
    dy: 0,
    cx,
    cy,
});

test("a turn about the origin is as it was", () => {
    assert.deepEqual(imageOf(turn(90, 0, 0), [1, 3]), [3, -1]);
    assert.deepEqual(imageOf(turn(180, 0, 0), [1, 3]), [-1, -3]);
    assert.deepEqual(imageOf(turn(270, 0, 0), [1, 3]), [-3, 1]);
});

test("a clockwise turn about another point moves each corner round that point", () => {
    // (4, 1) is 4 right of (0, 1): a half turn puts it 4 left, at (-4, 1)
    assert.deepEqual(imageOf(turn(180, 0, 1), [4, 1]), [-4, 1]);
    assert.deepEqual(imageOf(turn(180, 0, 1), [3, 3]), [-3, -1]);
    // (2, 3) is 3 right and 3 up of (-1, 0): a quarter turn clockwise takes it 3 right and 3 down
    assert.deepEqual(imageOf(turn(90, -1, 0), [2, 3]), [2, -3]);
    assert.deepEqual(imageOf(turn(270, -1, 0), [2, 3]), [-4, 3]);
    assert.deepEqual(imageOf(turn(90, 2, 2), [2, 2]), [2, 2]);
});

test("a translation and a reflection ignore the centre", () => {
    assert.deepEqual(
        imageOf({ ...turn(90, 3, 3), move: "translate", dx: -4, dy: 2 }, [1, 1]),
        [-3, 3],
    );
    assert.deepEqual(imageOf({ ...turn(90, 3, 3), move: "reflect", mirror: "x" }, [1, 2]), [1, -2]);
});
