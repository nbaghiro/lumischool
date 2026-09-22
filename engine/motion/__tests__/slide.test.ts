import assert from "node:assert/strict";
import { test } from "node:test";
import { slideAt, slideDistance, speedFor } from "../slide";

test("a thing slides speed over damping before it stops, and the speed for a distance undoes it", () => {
    assert.equal(slideDistance(12, 3), 4);
    assert.equal(speedFor(slideDistance(7, 2.5), 2.5), 7);
    assert.equal(slideDistance(5, 0), Infinity);
});

test("a world stepped at a fixed step with damping slides exactly as far as the sum says", () => {
    const dt = 1 / 60,
        damping = 2.2;
    let v = 9,
        x = 0;
    for (let i = 0; i < 60 * 40; i++) {
        v *= 1 / (1 + dt * damping);
        x += v * dt;
    }
    assert.ok(Math.abs(x - slideDistance(9, damping)) < 1e-6);
});

test("along the way it slows and nears where it stops, never passing it", () => {
    const stop = slideDistance(10, 2);
    let last = 0;
    for (let t = 0; t < 6; t += 0.05) {
        const { at, v } = slideAt({ x: 0, y: 0 }, { x: 10, y: 0 }, 2, t);
        assert.ok(at.x >= last - 1e-12 && at.x <= stop + 1e-9 && v.x >= 0);
        last = at.x;
    }
    assert.ok(stop - last < 1e-3);
});
