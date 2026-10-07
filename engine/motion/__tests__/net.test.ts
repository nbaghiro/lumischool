import { test } from "node:test";
import assert from "node:assert/strict";
import { alarm, catches, dartFrom, splash, sweepSpeed, type NetFeel } from "../net";

const FEEL: NetFeel = { r: 1, calm: 3, splashy: 9, notice: 3, dart: 6, follow: 0.25 };
const AT = { x: 5, y: 5 };

test("a slow sweep alarms nobody, a fast one alarms fish near it by degrees", () => {
    assert.equal(splash(2, FEEL), 0);
    assert.equal(alarm({ x: 5.5, y: 5 }, AT, 2.5, FEEL), 0);
    const some = alarm({ x: 5.5, y: 5 }, AT, 6, FEEL),
        all = alarm({ x: 5.5, y: 5 }, AT, 12, FEEL);
    assert.ok(some > 0 && some < 1);
    assert.equal(all, 1);
    assert.ok(alarm({ x: 8, y: 5 }, AT, 12, FEEL) < all);
    assert.equal(alarm({ x: 10, y: 5 }, AT, 12, FEEL), 0);
});

test("a shy fish notices a slower net than an ordinary one", () => {
    assert.equal(splash(3.5, FEEL, 1), splash(3.5, FEEL, 1));
    assert.ok(splash(3.5, FEEL, 1.5) > splash(3.5, FEEL, 1));
});

test("a calm net catches a fish in its mouth, and a splashy one catches nothing", () => {
    assert.ok(catches({ x: 5.8, y: 5 }, AT, 1, FEEL));
    assert.ok(!catches({ x: 6.2, y: 5 }, AT, 1, FEEL));
    assert.ok(!catches({ x: 5.8, y: 5 }, AT, 9, FEEL));
    // half alarmed, only a fish well inside the mouth is caught
    assert.ok(catches({ x: 5.3, y: 5 }, AT, 6, FEEL));
    assert.ok(!catches({ x: 5.8, y: 5 }, AT, 6, FEEL));
});

test("an alarmed fish darts straight away from the net", () => {
    const v = dartFrom({ x: 6, y: 5 }, AT, 12, FEEL);
    assert.ok(v.x > 0 && Math.abs(v.y) < 1e-9);
    assert.deepEqual(dartFrom({ x: 6, y: 5 }, AT, 1, FEEL), { x: 0, y: 0 });
});

test("the net's speed is smoothed, so a single jerk is less splashy than a steady rush", () => {
    let v = 0;
    v = sweepSpeed(v, { x: 0, y: 0 }, { x: 0.2, y: 0 }, 1 / 60, FEEL);
    assert.ok(v < 12 && v > 0);
    for (let i = 0; i < 30; i++) v = sweepSpeed(v, { x: 0, y: 0 }, { x: 0.2, y: 0 }, 1 / 60, FEEL);
    assert.ok(Math.abs(v - 12) < 0.01);
});
