import { test } from "node:test";
import assert from "node:assert/strict";
import { twoFingers } from "../touches";

test("two fingers spreading apart read as a zoom, and turning alone mean nothing", () => {
    const f = twoFingers();
    f.down(1, 0, 0);
    f.down(2, 100, 0);
    assert.deepEqual(f.move(3, 50, 50), []);
    assert.deepEqual(f.move(2, 100 * Math.cos(0.2), 100 * Math.sin(0.2)), []);
    const [zoom] = f.move(2, 200 * Math.cos(0.2), 200 * Math.sin(0.2));
    assert.deepEqual(zoom, { kind: "zoom", by: 2 });
});

test("a slow pinch adds up rather than being lost under the threshold", () => {
    const f = twoFingers();
    f.down(1, 0, 0);
    f.down(2, 100, 0);
    let grown = 1;
    for (let k = 1; k <= 100; k++)
        for (const i of f.move(2, 100 + k * 0.1, 0)) if (i.kind === "zoom") grown *= i.by;
    assert.ok(Math.abs(grown - 1.1) < 0.005, String(grown));
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

test("with pans, the pair moving together reads as a pan by how far its middle moved", () => {
    const f = twoFingers({ pans: true });
    f.down(1, 0, 0);
    f.down(2, 100, 0);
    const out = [...f.move(1, 20, 0), ...f.move(2, 120, 0)];
    const panned = out.reduce((x, i) => (i.kind === "pan" ? x + i.x : x), 0);
    const grown = out.reduce((k, i) => (i.kind === "zoom" ? k * i.by : k), 1);
    assert.equal(panned, -20, "the middle moved 20 to the right, so the view moves back by 20");
    assert.ok(Math.abs(grown - 1) < 1e-9, "the gap ended where it began");
    assert.deepEqual(twoFingers().move(1, 5, 5), []);
});
