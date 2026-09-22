import assert from "node:assert/strict";
import { test } from "node:test";
import { cupReading, iceMelted, iceReading } from "../wrapped";

const WRAPS = ["none", "paper", "foil", "cloth", "wool"] as const;
const readings = (room: number, minutes: number) =>
    WRAPS.map((w) => [iceReading(w, room, minutes), iceMelted(w, room, minutes)]);

test("iced cups read 0 until the ice has gone, then warm towards the room by their wrap", () => {
    assert.deepEqual(readings(20, 20), [
        [20, 1],
        [15, 1],
        [10, 1],
        [5, 1],
        [0, 0.5],
    ]);
    assert.deepEqual(readings(10, 20), [
        [10, 1],
        [5, 1],
        [0, 1],
        [0, 0.75],
        [0, 0.25],
    ]);
    assert.deepEqual(readings(25, 20), [
        [25, 1],
        [20, 1],
        [15, 1],
        [10, 1],
        [0, 0.625],
    ]);
    assert.deepEqual(readings(20, 5), [
        [0, 1],
        [0, 0.625],
        [0, 0.5],
        [0, 0.375],
        [0, 0.125],
    ]);
});

test("a hot cup cools by its wrap and no further than the room", () => {
    assert.deepEqual(
        ["none", "paper", "bubble", "foil", "cloth", "wool"].map((w) => cupReading(w, 80, 20)),
        [40, 50, 60, 60, 70, 70],
    );
    assert.equal(cupReading("none", 80, 60), 20);
    assert.equal(cupReading("none", 80, 60, 25), 25);
});
