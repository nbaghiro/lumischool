import assert from "node:assert/strict";
import { test } from "node:test";
import { starchIn } from "../leaftest";
import { FIELD_UM, SPECIMENS, cellSize, cellsAcross, magnificationOf } from "../microview";
import { sprouted } from "../seedtest";

test("a field of view is 18 mm over the objective, and a cell is the field over the cells across it", () => {
    assert.deepEqual(FIELD_UM, { 40: 4500, 100: 1800, 400: 450, 1000: 180 });
    assert.equal(cellsAcross(0, 400), 2);
    assert.equal(cellsAcross(0, 100), 8);
    assert.equal(cellsAcross(1, 400), 9);
    assert.equal(cellsAcross(2, 400), 5);
    assert.equal(cellsAcross(2, 1000), 2);
    assert.equal(cellsAcross(3, 1000), 30);
    assert.equal(cellsAcross(4, 100), 8);
    assert.equal(cellSize(400, 9), 50);
    assert.equal(cellSize(100, 8), 225);
    for (const [kind, s] of SPECIMENS.entries())
        for (const mag of s.mags) {
            const across = cellsAcross(kind, mag);
            assert.ok(Number.isInteger(across), `${s.name} at ${mag} is ${across} across`);
            assert.equal(cellSize(mag, across), s.long);
        }
    assert.equal(magnificationOf(1, 100), 400);
    assert.equal(magnificationOf(0, 1000), 400);
});

test("a seed sprouts with water, air and warmth, light or not, at the packet's share", () => {
    assert.equal(sprouted(10, 100, 1, 1, 1), 10);
    assert.equal(sprouted(10, 80, 1, 1, 1), 8);
    assert.equal(sprouted(10, 100, 0, 1, 1), 0);
    assert.equal(sprouted(10, 100, 1, 0, 1), 0);
    assert.equal(sprouted(10, 100, 1, 1, 0), 0);
    assert.equal(sprouted(5, 60, 1, 1, 1), 3);
});

test("iodine turns a leaf blue-black only where it is green, uncovered and lit", () => {
    assert.equal(starchIn(true, false, 1), true);
    assert.equal(starchIn(true, true, 1), false);
    assert.equal(starchIn(false, false, 1), false);
    assert.equal(starchIn(true, false, 0), false);
});
