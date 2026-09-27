import assert from "node:assert/strict";
import { test } from "node:test";
import { moverAt, pathLength, type Path } from "../mover";

const line: Path = {
    points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
    ],
    speed: 2,
    mode: "bounce",
};

test("a mover goes along its path at its speed and comes back on a bounce", () => {
    assert.equal(pathLength(line), 10);
    assert.deepEqual(moverAt(line, 2).at, { x: 4, y: 0 });
    assert.deepEqual(moverAt(line, 2).v, { x: 2, y: 0 });
    assert.deepEqual(moverAt(line, 7).at, { x: 6, y: 0 });
    assert.deepEqual(moverAt(line, 7).v, { x: -2, y: 0 });
    assert.deepEqual(moverAt(line, 10).at, { x: 0, y: 0 });
});

test("a loop comes round to its start, and a phase spaces two movers on one path", () => {
    const square: Path = {
        points: [
            { x: 0, y: 0 },
            { x: 4, y: 0 },
            { x: 4, y: 4 },
            { x: 0, y: 4 },
        ],
        speed: 1,
        mode: "loop",
    };
    assert.equal(pathLength(square), 16);
    assert.deepEqual(moverAt(square, 6).at, { x: 4, y: 2 });
    assert.deepEqual(moverAt(square, 16).at, { x: 0, y: 0 });
    assert.deepEqual(moverAt({ ...square, phase: 4 }, 0).at, { x: 4, y: 0 });
});

test("a mover that goes nowhere stays at its first point", () => {
    assert.deepEqual(moverAt({ ...line, speed: 0 }, 5).at, { x: 0, y: 0 });
    assert.deepEqual(moverAt({ points: [{ x: 3, y: 1 }], speed: 1, mode: "loop" }, 5).at, {
        x: 3,
        y: 1,
    });
});
