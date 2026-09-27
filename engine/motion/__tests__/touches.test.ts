import { test } from "node:test";
import assert from "node:assert/strict";
import { stepsOf, twoFingers } from "../touches";

test("two fingers turning read as a clockwise turn, and spreading apart as a zoom", () => {
    const f = twoFingers();
    f.down(1, 0, 0);
    f.down(2, 100, 0);
    assert.deepEqual(f.move(3, 50, 50), []);
    const [turn] = f.move(2, 100 * Math.cos(0.2), 100 * Math.sin(0.2));
    assert.equal(turn?.kind, "turn");
    assert.ok(turn && Math.abs(turn.by - 0.2) < 1e-9);
    const [zoom] = f.move(2, 200 * Math.cos(0.2), 200 * Math.sin(0.2));
    assert.deepEqual(zoom, { kind: "zoom", by: 2 });
});

test("a slow twist adds up rather than being lost under the threshold", () => {
    const f = twoFingers();
    f.down(1, 0, 0);
    f.down(2, 100, 0);
    let turned = 0;
    for (let k = 1; k <= 100; k++)
        for (const i of f.move(2, 100 * Math.cos(k * 0.001), 100 * Math.sin(k * 0.001)))
            if (i.kind === "turn") turned += i.by;
    assert.ok(Math.abs(turned - 0.1) < 0.005, String(turned));
});

test("one finger means nothing, a third is ignored, and lifting one ends the pair", () => {
    const f = twoFingers();
    f.down(1, 0, 0);
    assert.deepEqual(f.move(1, 30, 30), []);
    f.down(2, 100, 0);
    f.down(3, 50, 50);
    assert.equal(f.count, 2);
    f.up(2);
    assert.deepEqual(f.move(1, 0, 90), []);
});

test("turns add up into whole steps and keep the rest", () => {
    const step = Math.PI / 12;
    assert.deepEqual(stepsOf(0, step * 0.5, step), { steps: 0, left: step * 0.5 });
    const r = stepsOf(step * 0.5, step * 0.75, step);
    assert.equal(r.steps, 1);
    assert.ok(Math.abs(r.left - step * 0.25) < 1e-12);
    assert.equal(stepsOf(0, -step * 2.5, step).steps, -2);
});
