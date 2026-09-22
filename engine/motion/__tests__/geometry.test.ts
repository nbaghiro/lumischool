import assert from "node:assert/strict";
import { test } from "node:test";
import { alongPath, atLeast, distanceTo, inside, projectOnPath } from "../geometry";

test("inside and distance agree with themselves", () => {
    const box = { x: 0, y: 0, w: 4, h: 2 },
        disc = { cx: 6, cy: 1, r: 1 };
    assert.ok(inside(box, { x: 4, y: 2 }) && !inside(box, { x: 4.1, y: 2 }));
    assert.equal(distanceTo(box, { x: 7, y: 6 }), 5);
    assert.equal(distanceTo(disc, { x: 6, y: 1 }), 0);
    assert.deepEqual(atLeast({ cx: 1, cy: 1, r: 0.5 }, 2.2), { cx: 1, cy: 1, r: 1.1 });
});

test("a point projects onto the nearest place on a path, and a distance along it comes back as a point", () => {
    const rail = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
    ];
    const p = projectOnPath({ x: 4, y: 3 }, rail);
    assert.deepEqual(p.point, { x: 4, y: 0 });
    assert.equal(p.s, 4);
    const corner = projectOnPath({ x: 12, y: 3 }, rail);
    assert.deepEqual(corner.point, { x: 10, y: 3 });
    assert.equal(corner.segment, 1);
    assert.deepEqual(alongPath(rail, 12), { x: 10, y: 2 });
    assert.deepEqual(alongPath(rail, 99), { x: 10, y: 5 });
});
