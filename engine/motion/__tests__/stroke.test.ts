import assert from "node:assert/strict";
import { test } from "node:test";
import { drive, glide, glideDistance, meet, timing, type Rhythm } from "../stroke";

const r: Rhythm = { push: 1.2, top: 4.5, window: [0.35, 1.6], rushed: 0.4 };
const near = (a: number, b: number, by = 1e-9) =>
    assert.ok(Math.abs(a - b) < by, `${a} against ${b}`);

test("a catch is rushed before the window, in time inside it, late after it, and a first stroke is in time", () => {
    assert.equal(timing(null, r), "in time");
    assert.equal(timing(0.1, r), "rushed");
    assert.equal(timing(0.35, r), "in time");
    assert.equal(timing(1.6, r), "in time");
    assert.equal(timing(2.4, r), "late");
});

test("a drive eases the boat towards its top speed by its length, a rushed one by less, and none passes the top", () => {
    near(drive(0, 1, "in time", r), 4.5 * (1 - Math.exp(-1.2 / 4.5)));
    near(drive(2, 0.5, "in time", r), 4.5 - 2.5 * Math.exp(-0.6 / 4.5));
    near(drive(0, 1, "rushed", r), 4.5 * (1 - Math.exp(-0.48 / 4.5)));
    assert.ok(drive(0, 1, "in time", r) > drive(0, 0.5, "in time", r));
    assert.equal(drive(0, 1, "late", r), drive(0, 1, "in time", r));
    let v = 0;
    for (let i = 0; i < 50; i++) v = drive(v, 1, "in time", r);
    assert.ok(v <= r.top && v > r.top * 0.95);
});

test("a drive split into pieces gives the speed of the same drive at once, from ahead or astern", () => {
    for (const from of [1, -0.5]) {
        let pieces = from;
        for (let i = 0; i < 20; i++) pieces = drive(pieces, 1 / 20, "in time", r);
        near(pieces, drive(from, 1, "in time", r), 1e-9);
    }
    near(drive(-1, 1, "in time", r), 4.5 * (1 - Math.exp(-0.2 / 4.5)));
});

test("backing water slows the boat and moves it backwards only gently", () => {
    assert.ok(drive(3, -0.5, "in time", r) < 3);
    near(drive(0, -1, "in time", r), -0.3 * r.push);
    assert.equal(drive(-1, -1, "in time", r), -1);
});

test("a glide in still water goes as far as the glide distance, and a current pushes back", () => {
    let v = 3,
        x = 0;
    for (let i = 0; i < 60 * 60; i++) {
        const g = glide(v, 1 / 60, 0.35, 0);
        v = g.v;
        x += g.moved;
    }
    near(x, glideDistance(3, 0.35), 1e-6);
    const still = glide(0, 1, 0.35, 0.3);
    assert.ok(still.moved < 0);
    near(still.moved, -0.3);
});

test("a gentle bow comes to rest touching, and a fast one bumps and comes away backwards", () => {
    assert.deepEqual(meet(0.8, 1, 0.35), { v: 0, bumped: false });
    const hard = meet(3, 1, 0.35);
    assert.ok(hard.bumped && hard.v < 0);
    near(hard.v, -1.05);
});
