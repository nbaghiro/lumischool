import assert from "node:assert/strict";
import { test } from "node:test";
import { surfaceSizes } from "../space";

test("paper surfaces bound individual and aggregate backing pixels at high DPR", () => {
    const wanted = [
        { w: 390 * 3, h: 844 * 3 },
        { w: 2048 * 2, h: 1536 * 2 },
        { w: 1440, h: 900 },
        { w: 800, h: 600 },
        { w: 800, h: 600 },
    ];
    const actual = surfaceSizes(wanted, 4_000_000, 2_000_000);
    assert.ok(actual.reduce((n, s) => n + s.w * s.h, 0) <= 4_000_000);
    for (const [i, s] of actual.entries()) {
        const original = wanted[i];
        assert.ok(original);
        assert.ok(s.w * s.h <= 2_000_000);
        assert.ok(s.w <= original.w && s.h <= original.h);
        assert.ok(Math.abs(s.w / s.h - original.w / original.h) < 0.01);
    }
});

test("small surfaces keep their requested size and zero-sized surfaces consume nothing", () => {
    assert.deepEqual(
        surfaceSizes(
            [
                { w: 100, h: 200 },
                { w: 0, h: 200 },
            ],
            40_000,
            30_000,
        ),
        [
            { w: 100, h: 200 },
            { w: 0, h: 0 },
        ],
    );
    assert.deepEqual(surfaceSizes([{ w: 100, h: 200 }], 0, 30_000), [{ w: 0, h: 0 }]);
    assert.deepEqual(surfaceSizes([], 10, 10), []);
    assert.throws(() => surfaceSizes([{ w: NaN, h: 200 }], 10, 10), RangeError);
});
