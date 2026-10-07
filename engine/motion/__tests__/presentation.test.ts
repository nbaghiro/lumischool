import assert from "node:assert/strict";
import { test } from "node:test";
import { projectPoint, unprojectPoint, projectMark } from "../presentation";

test("wide and rotated fields preserve logical pointer positions and drag vectors", () => {
    for (const m of [
        { a: 2.4, b: 0, c: 0, d: 1, e: 0, f: 0 },
        { a: 0, b: 1, c: -1, d: 0, e: 32, f: 0 },
    ]) {
        for (const p of [
            { x: 3, y: 6 },
            { x: 9.8, y: 29 },
            { x: -4, y: 0 },
        ]) {
            const back = unprojectPoint(projectPoint(p, m), m);
            assert.ok(Math.abs(back.x - p.x) < 1e-10);
            assert.ok(Math.abs(back.y - p.y) < 1e-10);
        }
    }
});

test("quarter-turn presentation preserves a gate's bounds", () => {
    assert.deepEqual(
        projectMark(
            { kind: "box", x: 2, y: 5, w: 3, h: 4 },
            { a: 0, b: 1, c: -1, d: 0, e: 32, f: 0 },
        ),
        { kind: "box", x: 23, y: 2, w: 4, h: 3 },
    );
});
