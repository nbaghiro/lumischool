import assert from "node:assert/strict";
import { test } from "node:test";
import { heightAt, rooms, rows, type Solid } from "../room";

/** Axis-aligned boxes as [left, top, right, bottom], and the ground's top at 10. */
const boxes =
    (list: [number, number, number, number][]): Solid =>
    (x, y) =>
        y >= 10 || list.some(([l, t, r, b]) => x >= l && x <= r && y >= t && y <= b);
const flat = () => 10;

test("a roof on two walls makes a room as wide as the gap between them and as tall as the walls", () => {
    const house = boxes([
        [2, 8, 3, 10],
        [5, 8, 6, 10],
        [2, 7.5, 6, 8],
    ]);
    const found = rooms(house, 0, 10, flat, 0, 1.5);
    assert.equal(found.length, 1);
    const r = found[0];
    assert.ok(r && Math.abs(r.width - 2) < 0.15, JSON.stringify(r));
    assert.ok(r && Math.abs(r.clear - 2) < 0.1);
    assert.ok(r && Math.abs(r.floor - 10) < 0.1);
    assert.deepEqual(rooms(house, 0, 10, flat, 0, 2.5), [], "none as tall as two and a half");
    assert.deepEqual(rooms(boxes([[2, 8, 3, 10]]), 0, 10, flat, 0, 1), [], "no roof, no room");
});

test("a room on stilts is found on its own floor, above the ground", () => {
    const stilts = boxes([
        [2, 6, 3, 10],
        [6, 6, 7, 10],
        [2, 5.5, 7, 6],
        [2, 3.5, 7, 4],
    ]);
    const found = rooms(stilts, 0, 10, flat, 0, 1.2);
    const upstairs = found.find((r) => Math.abs(r.floor - 5.5) < 0.1);
    assert.ok(upstairs && Math.abs(upstairs.width - 5) < 0.15, JSON.stringify(found));
    assert.ok(upstairs && Math.abs(upstairs.clear - 1.5) < 0.1);
});

test("a tower's height is from the ground to its top, and a row's length joins blocks set side by side", () => {
    const tower = boxes([[4, 4, 5, 10]]);
    assert.ok(Math.abs(heightAt(tower, 4.5, 10, 0) - 6) < 0.06);
    assert.equal(heightAt(tower, 8, 9.9, 0), 0);
    const wall = boxes([
        [1, 9, 3, 10],
        [3.05, 9, 4, 10],
        [6, 9, 6.5, 10],
    ]);
    const found = rows(wall, 0, 10, () => 10);
    assert.equal(found.length, 2);
    assert.ok(Math.abs((found[0]?.length ?? 0) - 3) < 0.1, JSON.stringify(found));
    assert.ok(Math.abs((found[1]?.length ?? 0) - 0.5) < 0.1);
});
