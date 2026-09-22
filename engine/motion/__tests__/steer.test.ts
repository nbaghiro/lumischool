import assert from "node:assert/strict";
import { test } from "node:test";
import { seeded } from "../spawn";
import { arrive, blend, clampLength, cohere, flee, separate, towards, wander } from "../steer";

const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) < eps;

test("arriving goes straight at the point at full speed, and slows inside its easing", () => {
    const far = arrive({ x: 0, y: 0 }, { x: 10, y: 0 }, 4, 2);
    assert.ok(near(far.x, 4) && near(far.y, 0));
    const close = arrive({ x: 0, y: 0 }, { x: 1, y: 0 }, 4, 2);
    assert.ok(near(close.x, 2));
    assert.deepEqual(arrive({ x: 3, y: 3 }, { x: 3, y: 3 }, 4), { x: 0, y: 0 });
});

test("fleeing is nothing out of reach, and grows as the threat comes closer", () => {
    assert.deepEqual(flee({ x: 0, y: 0 }, { x: 6, y: 0 }, 5, 3), { x: 0, y: 0 });
    const a = flee({ x: 0, y: 0 }, { x: 4, y: 0 }, 5, 3);
    const b = flee({ x: 0, y: 0 }, { x: 1, y: 0 }, 5, 3);
    assert.ok(a.x < 0 && b.x < a.x, `${a.x} then ${b.x}`);
    assert.ok(Math.hypot(b.x, b.y) <= 3 + 1e-9);
});

test("a crowd pushes apart and draws together, each within its reach", () => {
    const others = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 8 },
    ];
    const apart = separate({ x: 0.2, y: 0 }, others, 2, 5);
    assert.ok(apart.x < 0, "nearer the right neighbour, so pushed left");
    assert.ok(Math.hypot(apart.x, apart.y) <= 5 + 1e-9);
    const together = cohere({ x: 0, y: 6 }, others, 6, 2);
    assert.ok(together.y > 0, "towards the one below, the only one in reach");
    assert.deepEqual(cohere({ x: 50, y: 50 }, others, 6, 2), { x: 0, y: 0 });
});

test("turning towards a wanted velocity changes it by at most the most it can", () => {
    const v = towards({ x: 0, y: 0 }, { x: 10, y: 0 }, 1);
    assert.ok(near(v.x, 1) && near(v.y, 0));
    assert.deepEqual(towards({ x: 1, y: 1 }, { x: 1.2, y: 1 }, 1), { x: 1.2, y: 1 });
    const short = clampLength({ x: 3, y: 4 }, 2);
    assert.ok(near(Math.hypot(short.x, short.y), 2));
    assert.deepEqual(
        blend([
            [{ x: 1, y: 0 }, 2],
            [{ x: 0, y: 1 }, 0.5],
        ]),
        { x: 2, y: 0.5 },
    );
});

test("a wandering heading drifts by no more than its turn, and the same seed wanders the same way", () => {
    const a = seeded(3),
        b = seeded(3);
    let h = 0,
        k = 0;
    for (let i = 0; i < 100; i++) {
        const next = wander(h, 0.2, a);
        assert.ok(Math.abs(next - h) <= 0.2 + 1e-12);
        h = next;
        k = wander(k, 0.2, b);
    }
    assert.equal(h, k);
});
