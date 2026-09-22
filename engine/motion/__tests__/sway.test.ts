import assert from "node:assert/strict";
import { test } from "node:test";
import { HANGING, sway, type Sway, type Swing } from "../sway";

const k: Swing = { length: 3, g: 40, damping: 4, most: 0.5 };
const run = (from: Sway, accel: (i: number) => number, steps: number): Sway[] => {
    const out: Sway[] = [];
    let s = from;
    for (let i = 0; i < steps; i++) out.push((s = sway(s, accel(i), 1 / 60, k)));
    return out;
};

test("left alone it hangs straight", () => {
    assert.deepEqual(run(HANGING, () => 0, 120).at(-1), HANGING);
});

test("a hand setting off to the right tips the bottom back to the left, and it settles once the hand is steady", () => {
    const path = run(HANGING, (i) => (i < 12 ? 60 : 0), 400);
    assert.ok((path[11]?.angle ?? 0) > 0.05, "it leans back as the hand sets off");
    assert.ok(Math.abs(path.at(-1)?.angle ?? 1) < 1e-3, "and hangs straight again");
});

test("a fling never turns it further than it may lean, and the same hand sways it the same way", () => {
    const fling = run(HANGING, (i) => (i % 20 < 10 ? 900 : -900), 240);
    for (const s of fling) assert.ok(Math.abs(s.angle) <= k.most + 1e-12);
    assert.deepEqual(
        run(HANGING, (i) => Math.sin(i / 7) * 80, 200),
        run(HANGING, (i) => Math.sin(i / 7) * 80, 200),
    );
});
