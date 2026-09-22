import assert from "node:assert/strict";
import { test } from "node:test";
import { seeded } from "../spawn";

test("the same seed gives the same numbers, all between nought and one", () => {
    const a = seeded(7),
        b = seeded(7),
        c = seeded(8);
    const xs = Array.from({ length: 200 }, () => a());
    assert.deepEqual(
        xs,
        Array.from({ length: 200 }, () => b()),
    );
    assert.notEqual(xs[0], c());
    assert.ok(xs.every((x) => x >= 0 && x < 1));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    assert.ok(Math.abs(mean - 0.5) < 0.08, `${mean}`);
});
