// Scenes composed from the shelf: that the games' geometry is the drawings' own, and that a course
// that goes round shows no seam.
import { test } from "node:test";
import assert from "node:assert/strict";
import { COURSE } from "../plane";
import { row, type Row } from "../scenery";

test("the new games' geometry is the drawings' own: the pens, the pole's scale and the scale's pan", async () => {
    const { POLE } = await import("../../../engine/parts/measuring/scalepole");
    assert.deepEqual([COURSE.head, COURSE.foot, COURSE.poleX], [POLE.top, POLE.foot, POLE.x]);
});

test("a scene that goes round shows no seam: what is in view a lap on is the same drawings in the same places", () => {
    const eye = (x: number) => ({ cam: { x, y: 11, zoom: 1 }, view: { w: 36, h: 22 }, lap: 132 });
    const r: Row = {
        key: "far",
        depth: 0.4,
        base: 18,
        every: 7,
        stray: 2,
        z: 1,
        things: [
            { art: "firs", size: 4, often: 1 },
            { art: "tree", size: 3, often: 1 },
        ],
    };
    const on = (x: number) =>
        row(r, eye(x), 3)
            .map((s) => `${s.art}@${(s.x - x * 0.4).toFixed(4)}`)
            .sort();
    assert.deepEqual(on(150), on(150 - 132));
});
