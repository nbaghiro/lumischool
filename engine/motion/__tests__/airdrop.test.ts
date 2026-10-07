import assert from "node:assert/strict";
import { test } from "node:test";
import { crossingAt, stepParcel } from "../airdrop";

test("wind and gravity preserve a ballistic trajectory across step sizes", () => {
    const a = { x: 1, y: 2, vx: 5, vy: -2 },
        b = { ...a };
    stepParcel(a, 3, 12, 2);
    for (let i = 0; i < 480; i++) stepParcel(b, 3, 12, 1 / 240);
    assert.ok(Math.abs(a.x - 17) < 1e-9);
    assert.ok(Math.abs(a.y - 22) < 1e-9);
    assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9);
});

test("a fast parcel crosses an opening only while descending", () => {
    assert.equal(crossingAt({ x: 0, y: 0 }, { x: 10, y: 20 }, 10), 5);
    assert.equal(crossingAt({ x: 0, y: 20 }, { x: 10, y: 0 }, 10), null);
    assert.equal(crossingAt({ x: 0, y: 11 }, { x: 10, y: 20 }, 10), null);
});
