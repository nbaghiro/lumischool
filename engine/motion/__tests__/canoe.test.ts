import assert from "node:assert/strict";
import { test } from "node:test";
import { bounce, canoeStep, rhythm, stroke, type Canoe, type Hull } from "../canoe";

const HULL: Hull = { glide: 0.4, grip: 4, spinDrag: 2.5, push: 2, turn: 1.2, back: 2, beat: 0.6 };
const still = (): Canoe => ({ x: 0, y: 0, angle: 0, vx: 0, vy: 0, spin: 0 });
const run = (c: Canoe, current = { x: 0, y: 0 }, seconds = 1, backing = 0) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) canoeStep(c, current, HULL, 1 / 60, backing);
};

test("a stroke pushes the canoe along its hull and turns the bow away from its side", () => {
    const right = still();
    stroke(right, 1, 1, HULL);
    assert.equal(right.vx, 2);
    assert.ok(right.spin < 0, "a stroke on the right turns the bow left");
    const left = still();
    stroke(left, -1, 0.5, HULL);
    assert.equal(left.vx, 1);
    assert.ok(left.spin > 0);
    const back = still();
    stroke(back, 1, 1, HULL, true);
    assert.equal(back.vx, -2);
});

test("it glides on and slows slowly along its length, but hardly slides sideways", () => {
    const c = still();
    c.vx = 2;
    run(c, undefined, 1);
    assert.ok(c.vx > 1.2 && c.vx < 1.5, `after a second it still glides at ${c.vx}`);
    const s = still();
    s.vy = 2;
    run(s, undefined, 1);
    assert.ok(Math.abs(s.vy) < 0.05, "a sideways drift dies quickly");
});

test("the current carries a canoe that is not paddled, and holding the paddle back slows it harder", () => {
    const drift = still();
    run(drift, { x: 1, y: 0 }, 6);
    assert.ok(drift.x > 3.5 && drift.vx > 0.9, `carried to ${drift.x} at ${drift.vx}`);
    const free = still(),
        held = still();
    free.vx = held.vx = 2;
    run(free, undefined, 1);
    run(held, undefined, 1, 1);
    assert.ok(held.vx < free.vx * 0.3);
});

test("a stroke soon after the last has less push, and a full beat later all of it", () => {
    assert.equal(rhythm(0, 0.6), 0.25);
    assert.equal(rhythm(0.3, 0.6), 0.5);
    assert.equal(rhythm(2, 0.6), 1);
});

test("a canoe meeting a rock is put outside it and bounces off", () => {
    const c = still();
    c.vx = 3;
    const hit = bounce(c, { x: -1, y: 0 }, 0.2, 0.5, 0.5);
    assert.equal(hit, 3);
    assert.equal(c.vx, -1.5);
    assert.ok(Math.abs(c.x + 0.2) < 1e-9);
    assert.equal(bounce(c, { x: -1, y: 0 }, 0, 0.5), 0, "moving away is no hit");
});
