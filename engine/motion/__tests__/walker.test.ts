import assert from "node:assert/strict";
import { test } from "node:test";
import { bob, stepWalker, walker, type Gait, type Ground } from "../walker";

const GAIT: Gait = { speed: 2, reach: 1, step: 0.4, gravity: 30, pace: 0.8 };
const DT = 1 / 60;

/** Ground at height 10 from 0 to `to`, and again from `from` on. */
const banks =
    (to: number, from: number): Ground =>
    (x) =>
        x <= to || x >= from ? 10 : null;

function run(w: ReturnType<typeof walker>, ground: Ground, steps: number) {
    const seen: string[] = [];
    for (let i = 0; i < steps; i++) {
        const r = stepWalker(w, ground, GAIT, DT);
        if (seen[seen.length - 1] !== r) seen.push(r);
    }
    return seen;
}

test("a walker stays still until it is told to walk, and then walks along the ground", () => {
    const w = walker(1, 10);
    run(w, banks(100, 200), 60);
    assert.equal(w.x, 1);
    w.state = "walk";
    run(w, banks(100, 200), 60);
    assert.ok(Math.abs(w.x - 3) < 1e-6, `after a second it is at ${w.x}`);
    assert.equal(w.y, 10);
    assert.ok(w.stride > 2, "its stride has moved on");
});

test("it stops at the edge of a gap wider than a stride, and strides over a narrower one", () => {
    const wide = walker(1, 10);
    wide.state = "walk";
    const seen = run(wide, banks(5, 8), 300);
    assert.ok(seen.includes("edge"));
    assert.equal(wide.state, "stand");
    assert.ok(wide.x <= 5 && wide.x > 4.9, `stopped at ${wide.x}`);
    const narrow = walker(1, 10);
    narrow.state = "walk";
    const crossed = run(narrow, banks(5, 5.8), 300);
    assert.ok(!crossed.includes("edge") && !crossed.includes("fell"), crossed.join(" "));
    assert.ok(narrow.x > 8);
});

test("it will not step up or down more than a step", () => {
    const w = walker(1, 10);
    w.state = "walk";
    run(w, (x) => (x < 3 ? 10 : 9), 200);
    assert.equal(w.state, "stand");
    assert.ok(w.x < 3);
});

test("when the ground goes from under it, it falls and lands on what is below", () => {
    const w = walker(4, 10);
    let there = true;
    const ground: Ground = (x) => (there || x < 2 ? 10 : x < 20 ? 14 : null);
    assert.equal(stepWalker(w, ground, GAIT, DT), "stand");
    there = false;
    const seen = run(w, ground, 120);
    assert.deepEqual(seen.slice(0, 3), ["fell", "falling", "landed"]);
    assert.equal(w.y, 14);
    assert.equal(w.state, "stand");
});

test("the body bobs only while walking, never below the feet", () => {
    const w = walker(0, 10);
    assert.equal(bob(w, 0.3), 0);
    w.state = "walk";
    for (let i = 0; i < 100; i++) {
        stepWalker(w, () => 10, GAIT, DT);
        const b = bob(w, 0.3);
        assert.ok(b <= 0 && b >= -0.3);
    }
});
