import assert from "node:assert/strict";
import { test } from "node:test";
import { ballPasses, gapAt, lidEase } from "../expansion";
import { canReading } from "../heatflow";
import { branchGlow, cellsGive } from "../parallel";
import { inStep, springStretch } from "../spring";

test("a steel joint's gap closes by 0.012 mm a metre for each degree, to shut at 55 °C", () => {
    assert.equal(gapAt(50, 20), 21);
    assert.equal(gapAt(50, -10), 39);
    assert.equal(gapAt(25, 35), 6);
    assert.equal(gapAt(75, 0), 49.5);
    assert.equal(gapAt(100, 55), 0);
    assert.equal(gapAt(50, 19), 21.6);
});

test("a hot brass ball sticks in a cold ring and drops through when the ring is heated too", () => {
    assert.equal(ballPasses(20, 20), true);
    assert.equal(ballPasses(120, 20), true);
    assert.equal(ballPasses(130, 20), false);
    assert.equal(ballPasses(300, 20), false);
    assert.equal(ballPasses(300, 300), true);
});

test("hot water over a steel lid alone loosens it, and over the glass alone tightens it", () => {
    assert.ok(Math.abs(lidEase(60, 20) - 0.0336) < 1e-12);
    assert.equal(lidEase(20, 20), 0);
    assert.ok(lidEase(20, 60) < 0);
    assert.ok(lidEase(60, 60) > 0);
});

test("a spring stretches in step with its load up to its limit, and more past it", () => {
    assert.equal(springStretch(3, 2, 8), 6);
    assert.equal(springStretch(0, 1, 6), 0);
    assert.equal(springStretch(6, 0.5, 8), 3);
    assert.equal(springStretch(7, 1.5, 4), 12.75);
    for (let w = 1; w <= 4; w++)
        assert.equal(springStretch(2 * w, 1.5, 8), 2 * springStretch(w, 1.5, 8));
    assert.equal(inStep(4, 4), true);
    assert.equal(inStep(7, 4), false);
});

test("each closed branch is as bright as one bulb alone on the cells, whatever the others do", () => {
    assert.deepEqual(branchGlow(1, 3, [1, 0, 1]), [1, 0, 1]);
    assert.deepEqual(branchGlow(2, 2, [1, 1]), [2, 2]);
    assert.deepEqual(branchGlow(2, 3, [1, 1, 0]).slice(0, 2), branchGlow(2, 2, [1, 1]));
    assert.equal(cellsGive(2, 3, [1, 1, 1]), 6);
    assert.equal(cellsGive(1, 2, [0, 1]), 1);
});

test("a can in the sun warms by its outside, black most and shiny silver least", () => {
    assert.equal(canReading("black", 30), 38);
    assert.equal(canReading("white", 30), 26);
    assert.equal(canReading("silver", 30), 23);
    assert.equal(canReading("black", 20), 32);
    assert.equal(canReading("white", 25), 24);
    assert.equal(canReading("silver", 0), 20);
});
