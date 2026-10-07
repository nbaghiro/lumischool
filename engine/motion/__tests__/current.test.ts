import assert from "node:assert/strict";
import { test } from "node:test";
import { currentAt, driftStep, type Current } from "../current";
const river: Current = {
    speed: 3.5,
    bend: 0.3,
    phase: 0,
    top: 4,
    bottom: 18,
    rocks: [{ x: 10, y: 11, r: 1 }],
};
test("a floating body gains current speed, reflects off rocks and stays inside the banks", () => {
    const a = { x: 3, y: 5, vx: 0, vy: -20 };
    for (let i = 0; i < 600; i++) {
        driftStep(a, river, i / 60, 1 / 60);
        assert.ok(a.y >= 4 && a.y <= 18);
    }
    assert.ok(a.x > 20);
    const b = { x: 8.7, y: 11, vx: 6, vy: 0 };
    assert.equal(driftStep(b, river, 0, 1 / 60), true);
    assert.ok(b.vx < 0);
    assert.ok(Math.hypot(b.x - 10, b.y - 11) >= 1.44);
});
test("rock wakes slow the stream, and identical releases replay exactly", () => {
    const clear = { ...river, rocks: [] };
    assert.ok(currentAt(river, { x: 12, y: 11 }, 0).x < currentAt(clear, { x: 12, y: 11 }, 0).x);
    const a = { x: 3, y: 7, vx: 7, vy: 1 },
        b = { ...a };
    for (let i = 0; i < 500; i++) {
        driftStep(a, river, i / 60, 1 / 60);
        driftStep(b, river, i / 60, 1 / 60);
    }
    assert.deepEqual(a, b);
});
