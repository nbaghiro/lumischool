import assert from "node:assert/strict";
import { test } from "node:test";
import { returning, spans } from "../listenmap";
import { tuneGrid } from "../tunegrid";

const lengths = (s: [number, number][]): number[] => s.map(([a, b]) => b - a);

test("a listening map's sections are as long as their bars, and the same length when no bars are given", () => {
    const [a, b, c] = lengths(spans([0, 1, 0], [8, 8, 16]));
    assert.equal(a, b);
    assert.ok(Math.abs((c ?? 0) - 2 * (a ?? 0)) < 1e-9);
    const even = lengths(spans([0, 1, 0], []));
    assert.ok(Math.max(...even) - Math.min(...even) < 1e-9);
    const whole = spans([0, 1, 0, 2, 0], [8, 8, 8, 12, 8]);
    assert.ok(Math.abs((whole.at(-1)?.[1] ?? 0) - 32) < 1e-9);
});

test("the letters that come back are the ones heard more than once", () => {
    assert.deepEqual(returning([0, 1, 0]), ["A"]);
    assert.deepEqual(returning([0, 1, 0, 2, 0]), ["A"]);
    assert.deepEqual(returning([0, 1, 2]), []);
});

test("the tune grid marks no scale unless asked, so every earlier use draws as it did", () => {
    assert.deepEqual(tuneGrid.params.mark, []);
});
