import { test } from "node:test";
import assert from "node:assert/strict";
import { launchRolling, stepRolling, type RollingBall, type RollingWorld } from "../rolling";
const world = (changes: Partial<RollingWorld> = {}): RollingWorld => ({
    bounds: { x: 0, y: 0, w: 30, h: 20 },
    walls: [],
    surfaces: [],
    deceleration: 2,
    restitution: 0.7,
    restSpeed: 0,
    ...changes,
});
const ball = (changes: Partial<RollingBall> = {}): RollingBall => ({
    x: 2,
    y: 10,
    vx: 0,
    vy: 0,
    r: 0.25,
    sunk: false,
    ...changes,
});
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test("constant rolling friction reaches its exact stopping distance without reversing", () => {
    const b = ball({ vx: 4 }),
        w = world();
    let stops = 0;
    for (let i = 0; i < 180; i++) stops += Number(stepRolling(b, w, 1 / 60).stopped);
    near(b.x, 6);
    near(b.y, 10);
    assert.equal(b.vx, 0);
    assert.equal(stops, 1);
});
test("sand slows a ball more than grass, and overlapping sand takes the stronger friction", () => {
    const plain = ball({ vx: 8 }),
        sand = ball({ vx: 8 }),
        overlap = ball({ vx: 8 });
    const area = { x: 3, y: 0, w: 10, h: 20 };
    for (let i = 0; i < 180; i++) {
        stepRolling(plain, world(), 1 / 60);
        stepRolling(sand, world({ surfaces: [{ area, deceleration: 8 }] }), 1 / 60);
        stepRolling(
            overlap,
            world({
                surfaces: [
                    { area, deceleration: 8 },
                    { area, deceleration: 3 },
                ],
            }),
            1 / 60,
        );
    }
    assert.ok(sand.x < plain.x - 5);
    assert.deepEqual(sand, overlap);
});
test("a maximum-speed ball cannot tunnel through a thin wall", () => {
    const b = ball({ vx: 120 });
    const w = world({ deceleration: 0, walls: [{ x: 8, y: 0, w: 0.001, h: 20 }], restitution: 1 });
    let hits = 0;
    for (let i = 0; i < 12; i++) {
        hits += stepRolling(b, w, 1 / 60).hits;
        assert.ok(b.x <= 8 - b.r + 1e-8);
    }
    assert.ok(hits >= 1);
    assert.ok(Number.isFinite(b.x));
});
test("outside corners reflect both axes and remain stably at rest", () => {
    const b = ball({ x: 0.5, y: 0.5, vx: -10, vy: -10 }),
        w = world({ restitution: 0 });
    const out = stepRolling(b, w, 0.1);
    assert.equal(out.hits, 2);
    assert.equal(out.stopped, true);
    near(b.x, b.r);
    near(b.y, b.r);
    const snapshot = { ...b };
    for (let i = 0; i < 300; i++) assert.equal(stepRolling(b, w, 1 / 60).hits, 0);
    assert.deepEqual(b, snapshot);
});
test("rounded solid corners reflect a diagonal ball away instead of lodging inside", () => {
    const b = ball({ x: 4, y: 4, vx: 8, vy: 8 }),
        w = world({ deceleration: 0, walls: [{ x: 5, y: 5, w: 2, h: 2 }], restitution: 1 });
    let hits = 0;
    for (let i = 0; i < 10; i++) hits += stepRolling(b, w, 1 / 60).hits;
    assert.ok(hits >= 1);
    assert.ok(b.vx < 0 && b.vy < 0);
    assert.ok(b.x < 5 && b.y < 5);
});
test("cup capture sweeps a slow path, but a fast pass rolls over and does not capture", () => {
    const w = world({ deceleration: 0, cup: { x: 3, y: 10, r: 0.002, maxSpeed: 5 } });
    const slow = ball({ vx: 4 }),
        fast = ball({ vx: 20 });
    for (let i = 0; i < 20; i++) {
        stepRolling(slow, w, 1 / 60);
        stepRolling(fast, w, 1 / 60);
    }
    assert.ok(slow.sunk);
    near(slow.x, 3);
    assert.equal(fast.sunk, false);
    assert.ok(fast.x > 3);
    launchRolling(slow, 20, 0);
    assert.equal(slow.vx, 0);
});
test("a ball resting in the cup sinks once, while rest elsewhere remains unchanged", () => {
    const w = world({ cup: { x: 2, y: 10, r: 0.3, maxSpeed: 2 } }),
        b = ball();
    assert.equal(stepRolling(b, w, 1 / 60).captured, true);
    assert.equal(stepRolling(b, w, 1 / 60).captured, false);
    const other = ball({ x: 4 });
    const snapshot = { ...other };
    assert.equal(stepRolling(other, w, 1 / 60).stopped, false);
    assert.deepEqual(other, snapshot);
});
test("identical launches and fixed steps give identical traces, with bounded launch magnitude", () => {
    const run = () => {
        const b = ball(),
            w = world({ walls: [{ x: 12, y: 4, w: 1, h: 12 }] });
        launchRolling(b, 400, 300, 20);
        near(Math.hypot(b.vx, b.vy), 20);
        return Array.from({ length: 600 }, () => ({
            out: stepRolling(b, w, 1 / 60),
            ball: { ...b },
        }));
    };
    assert.deepEqual(run(), run());
    assert.throws(() => stepRolling(ball(), world(), 1));
    assert.throws(() => launchRolling(ball(), NaN, 0));
});
