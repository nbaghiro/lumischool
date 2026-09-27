import assert from "node:assert/strict";
import { test } from "node:test";
import { segmentsOf } from "../map-tiles";

/** The segments as `[ax, ay, bx, by, along]` each. */
const split = (flat: number[]): number[][] =>
    Array.from({ length: flat.length / 5 }, (_, i) => flat.slice(i * 5, i * 5 + 5));

test("a stroke's subpaths are straight segments, each starting its dash pattern again", () => {
    const segments = split(segmentsOf("M0 0l10 0 0 10M100 100L110 100"));
    assert.deepEqual(segments, [
        [0, 0, 10, 0, 0],
        [10, 0, 10, 10, 10],
        [100, 100, 110, 100, 0],
    ]);
});

test("a relative cubic is cut into a piece for every 12 units of its control polygon, ending where the curve ends", () => {
    const segments = split(segmentsOf("M-29297.1 822.2c-44.6-58.5-88.2-114.4-111-146.6"));
    const last = segments.at(-1);
    assert.ok(segments.length > 1);
    assert.ok(last);
    assert.ok(Math.abs((last[2] ?? 0) - (-29297.1 - 111)) < 1e-6);
    assert.ok(Math.abs((last[3] ?? 0) - (822.2 - 146.6)) < 1e-6);
    const polygon = Math.hypot(44.6, 58.5) + Math.hypot(43.6, 55.9) + Math.hypot(22.8, 32.2);
    assert.equal(segments.length, Math.ceil(polygon / 12));
    // how far along each piece starts is the length of the pieces before it
    let along = 0;
    for (const [ax = 0, ay = 0, bx = 0, by = 0, at = 0] of segments) {
        assert.ok(Math.abs(at - along) < 1e-9);
        along += Math.hypot(bx - ax, by - ay);
    }
});

test("an absolute cubic and a closed path are read as SVG reads them", () => {
    const segments = split(segmentsOf("M0 0C0 0 10 0 10 0Z"));
    assert.deepEqual(segments.at(-1)?.slice(0, 4), [10, 0, 0, 0]);
});
