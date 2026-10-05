import assert from "node:assert/strict";
import { test } from "node:test";
import { course, ledgeAt, springSpeed, standingOn, type Place } from "../platforms";
import { runner, stepRunner, type Intent, type Moves } from "../walker";

const MOVES: Moves = {
    speed: 6,
    accel: 40,
    airAccel: 25,
    gravity: 45,
    jump: 3.5,
    cut: 2.5,
    coyote: 0.1,
    buffer: 0.12,
    step: 0.35,
    fall: 22,
    climb: 4,
    pace: 1,
    height: 2.2,
};
const DT = 1 / 60;
const still: Intent = { run: 0, jump: false, jumped: false };

const PLACE: Place = {
    ledges: [
        { x0: 4, x1: 8, y: 7, oneWay: true },
        { x0: 12, x1: 14, y: 10, move: { dx: 3, dy: 0, period: 4 } },
        { x0: 20, x1: 22, y: 10, spring: 6 },
    ],
    blocks: [
        { x0: 0, x1: 30, y0: 10, y1: 14 },
        { x0: 26, x1: 27, y0: 4, y1: 10 },
    ],
    ladders: [{ x: 2, y0: 4, y1: 10 }],
};

test("a block's top is a floor, a ledge over it is stood on first, and a one-way ledge is marked so", () => {
    const c = course(PLACE, 0);
    assert.equal(c.floor(1, 9, 11)?.y, 10);
    assert.deepEqual(c.floor(6, 6, 11), { y: 7, oneWay: true });
    assert.equal(c.floor(6, 7.5, 11)?.y, 10, "below the ledge the ground is the floor");
    assert.ok(c.solid?.(26.5, 6), "a wall is solid");
    assert.ok(!c.solid?.(25, 6));
    assert.ok(c.ladder?.(2.2, 6));
    assert.ok(!c.ladder?.(3, 6));
});

test("a moving ledge is where its swing puts it, and carries its speed in its surface", () => {
    const at = ledgeAt(PLACE.ledges[1] ?? { x0: 0, x1: 0, y: 0 }, 1);
    assert.ok(Math.abs(at.x0 - 15) < 1e-9, "a quarter of a period takes it its whole swing");
    assert.ok(Math.abs(at.vx) < 1e-9, "and it is still at the end of its swing");
    const start = ledgeAt(PLACE.ledges[1] ?? { x0: 0, x1: 0, y: 0 }, 0);
    assert.ok(start.vx > 4, "it sets off at its fastest");
    assert.equal(course(PLACE, 0).floor(13, 9, 11)?.vx, start.vx);
});

test("a runner stands on the ground, jumps up through a one-way ledge, lands on it and drops back through", () => {
    const r = runner(5, 10);
    stepRunner(r, still, course(PLACE, 0), MOVES, DT);
    assert.equal(r.y, 10);
    stepRunner(r, { run: 0, jump: true, jumped: true }, course(PLACE, 0), MOVES, DT);
    for (let i = 0; i < 90; i++)
        stepRunner(r, { run: 0, jump: true, jumped: false }, course(PLACE, 0), MOVES, DT);
    assert.equal(r.y, 7, "it came down on the ledge it jumped up through");
    assert.equal(standingOn(PLACE, r.x, r.y, 0), 0);
    stepRunner(r, { ...still, drop: true }, course(PLACE, 0), MOVES, DT);
    for (let i = 0; i < 90; i++) stepRunner(r, still, course(PLACE, 0), MOVES, DT);
    assert.equal(r.y, 10, "and dropped back through it to the ground");
});

test("a wall stops a run, and a spring's speed rises its height under gravity", () => {
    const r = runner(24, 10);
    for (let i = 0; i < 120; i++)
        stepRunner(r, { run: 1, jump: false, jumped: false }, course(PLACE, 0), MOVES, DT);
    assert.ok(r.x < 26, `stopped at ${r.x}`);
    const v = springSpeed(6, 45);
    assert.ok(Math.abs((v * v) / (2 * 45) - 6) < 1e-9);
    assert.equal(standingOn(PLACE, 21, 10, 0), 2);
});

test("a shut door is solid until it is left out of the course", () => {
    const door = { x0: 16, x1: 17, y0: 6, y1: 10 };
    assert.ok(course(PLACE, 0, [door]).solid?.(16.5, 8));
    assert.ok(!course(PLACE, 0).solid?.(16.5, 8));
});
