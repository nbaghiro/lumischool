import assert from "node:assert/strict";
import { test } from "node:test";
import { easing, fitZoom, follow, keepInside, lead, seen } from "../camera";

const view = { w: 20, h: 10 };
const world = { w: 60, h: 30 };

test("the whole world fits at the zoom that shows it, and never closer than one", () => {
    assert.equal(fitZoom(view, world), 1 / 3);
    assert.equal(fitZoom(view, { w: 10, h: 5 }), 1);
});

test("the view stays inside the world, and a world narrower than the view is centred", () => {
    assert.deepEqual(keepInside({ x: 0, y: 0 }, view, world), { x: 10, y: 5 });
    assert.deepEqual(keepInside({ x: 99, y: 99 }, view, world), { x: 50, y: 25 });
    assert.deepEqual(keepInside({ x: 30, y: 12 }, view, world), { x: 30, y: 12 });
    assert.deepEqual(keepInside({ x: 3, y: 3 }, view, { w: 12, h: 6 }), { x: 6, y: 3 });
    assert.deepEqual(keepInside({ x: 0, y: 0 }, view, world, 1 / 3), { x: 30, y: 15 });
});

test("it looks ahead of a moving thing, but only so far", () => {
    assert.deepEqual(lead({ x: 0, y: 0 }, { x: 10, y: 0 }, 0.5, 8), { x: 5, y: 0 });
    const far = lead({ x: 0, y: 0 }, { x: 0, y: 100 }, 0.5, 8);
    assert.ok(Math.abs(far.y - 8) < 1e-9);
});

test("following eases the same way at any step length and arrives", () => {
    const o = { rate: 5, view, world };
    let a = { x: 10, y: 5, zoom: 1 },
        b = { ...a };
    const want = { x: 40, y: 20, zoom: 1 };
    for (let i = 0; i < 120; i++) a = follow(a, want, { ...o, dt: 1 / 120 });
    for (let i = 0; i < 60; i++) b = follow(b, want, { ...o, dt: 1 / 60 });
    assert.ok(Math.abs(a.x - b.x) < 1e-9, `${a.x} and ${b.x}`);
    for (let i = 0; i < 600; i++) a = follow(a, want, { ...o, dt: 1 / 60 });
    assert.ok(Math.abs(a.x - 40) < 1e-6 && Math.abs(a.y - 20) < 1e-6);
    assert.ok(easing(5, 0) === 0 && easing(5, 100) > 0.999);
});

test("a camera zooming out is never left showing past the edge of the world", () => {
    let c = { x: 50, y: 25, zoom: 1 };
    for (let i = 0; i < 90; i++) {
        c = follow(
            c,
            { x: 50, y: 25, zoom: 1 / 3 },
            { rate: 5, zoomRate: 3, dt: 1 / 60, view, world },
        );
        const hw = view.w / c.zoom / 2;
        assert.ok(
            c.x - hw >= -1e-9 && c.x + hw <= world.w + 1e-9,
            `step ${i}: ${c.x} at zoom ${c.zoom}`,
        );
    }
});

test("a far layer shows the part of itself the camera is over, across by its depth and up and down as the world", () => {
    const cam = { x: 40, y: 10, zoom: 1 };
    assert.deepEqual(seen(cam, view), { x0: 30, x1: 50, y0: 5, y1: 15 });
    assert.deepEqual(seen(cam, view, 0.5), { x0: 10, x1: 30, y0: 5, y1: 15 });
    assert.deepEqual(seen({ ...cam, zoom: 0.5 }, view, 0), { x0: -20, x1: 20, y0: 0, y1: 20 });
});
