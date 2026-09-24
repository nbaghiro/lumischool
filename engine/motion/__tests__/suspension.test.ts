import { test } from "node:test";
import assert from "node:assert/strict";
import { suspend } from "../suspension";

test("a carried load has bounded lag and settles without drift", () => {
    let load = { x: 0, y: 0, vx: 0, vy: 0 };
    const target = { x: 12, y: 7 };
    load = suspend(load, target, 1 / 60);
    assert.ok(load.x < target.x && load.x >= target.x - 0.8);
    for (let i = 0; i < 180; i++) load = suspend(load, target, 1 / 60);
    assert.ok(Math.abs(load.x - target.x) < 0.001);
    assert.ok(Math.abs(load.y - target.y) < 0.001);
    assert.throws(() => suspend(load, target, Infinity), RangeError);
});
