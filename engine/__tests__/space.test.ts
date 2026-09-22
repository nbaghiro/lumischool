import assert from "node:assert/strict";
import { test } from "node:test";
import {
    clampCamera,
    fitRect,
    flight,
    gridLines,
    intersects,
    keepIn,
    panBy,
    paperLayers,
    pinch,
    pointerTo,
    readWheel,
    stopNear,
    cameraBetween,
    cameraOn,
    toScreen,
    toWorld,
    visibleRect,
    wheelFactor,
    zoomAt,
    type Camera,
    type Pt,
    type Size,
    type Stop,
} from "../space";

const vp: Size = { w: 1200, h: 800 };
const cam: Camera = { x: 400, y: 250, z: 0.5 };
const near = (a: number, b: number, eps = 1e-6, what = "") =>
    assert.ok(Math.abs(a - b) < eps, `${what} ${a} ≈ ${b}`);

test("world and screen are inverses, and the camera's point sits in the middle of the viewport", () => {
    const s = toScreen(cam, vp, { x: cam.x, y: cam.y });
    assert.deepEqual(s, { x: 600, y: 400 });
    const p = { x: 913, y: -204 };
    const back = toWorld(cam, vp, toScreen(cam, vp, p));
    near(back.x, p.x, 1e-9, "x");
    near(back.y, p.y, 1e-9, "y");
    const r = visibleRect(cam, vp);
    assert.deepEqual(r, { x: 400 - 1200, y: 250 - 800, w: 2400, h: 1600 });
});

test("a camera can be aimed to put a box of the world on a box of the screen, which is how one view picks up another's motion", () => {
    const box = { x: 7200, y: 4500, w: 1000, h: 800 };
    for (const on of [
        { x: 0, y: 0, w: 300, h: 240 },
        { x: 640, y: 380, w: 120, h: 96 },
        { x: -40, y: 610, w: 1800, h: 1440 },
    ]) {
        const c = cameraOn(box, on, vp);
        const a = toScreen(c, vp, { x: box.x, y: box.y }),
            b = toScreen(c, vp, { x: box.x + box.w, y: box.y + box.h });
        near(a.x, on.x, 1e-9, "left");
        near(a.y, on.y, 1e-9, "top");
        near(b.x - a.x, on.w, 1e-9, "width");
        // the box keeps its own shape, so a screen box of another shape is matched on width
        near((b.y - a.y) / (b.x - a.x), box.h / box.w, 1e-9, "shape");
    }
});

test("a camera on its way from one to another steps its zoom in doublings, so going in reads at one speed", () => {
    const a: Camera = { x: 0, y: 0, z: 0.04 };
    const b: Camera = { x: 800, y: -400, z: 0.64 };
    assert.deepEqual(cameraBetween(a, b, 0), a);
    const end = cameraBetween(a, b, 1);
    near(end.x, b.x, 1e-9, "x");
    near(end.z, b.z, 1e-9, "z");
    const half = cameraBetween(a, b, 0.5);
    near(half.x, 400, 1e-9, "halfway across");
    near(half.z, Math.sqrt(a.z * b.z), 1e-9, "halfway in doublings");
    // and every step is the same factor, which is what makes the speed even
    const steps = [0.25, 0.5, 0.75, 1].map((t) => cameraBetween(a, b, t).z);
    const factors = steps.map((z, i) => z / (i ? (steps[i - 1] ?? z) : a.z));
    for (const f of factors) near(f, factors[0] ?? 1, 1e-9, "one factor a step");
});

test("a drag moves the paper with the pointer, at any zoom", () => {
    for (const z of [0.1, 0.5, 3]) {
        const c = { ...cam, z };
        const p = { x: 100, y: 100 };
        const before = toWorld(c, vp, p);
        const after = toWorld(panBy(c, 60, -20), vp, { x: p.x + 60, y: p.y - 20 });
        near(before.x, after.x, 1e-9);
        near(before.y, after.y, 1e-9);
    }
});

test("zooming about a point keeps the world under that point still", () => {
    const s = { x: 950, y: 120 };
    const was = toWorld(cam, vp, s);
    const now = toWorld(zoomAt(cam, vp, 2.4, s), vp, s);
    near(now.x, was.x, 1e-9, "x");
    near(now.y, was.y, 1e-9, "y");
});

test("a pinch zooms by how much the fingers spread and carries the midpoint with them", () => {
    const from: [Pt, Pt] = [
        { x: 500, y: 400 },
        { x: 700, y: 400 },
    ];
    const to: [Pt, Pt] = [
        { x: 400, y: 400 },
        { x: 800, y: 400 },
    ];
    const c = pinch(cam, vp, from, to, { min: 0.05, max: 4 });
    near(c.z, cam.z * 2, 1e-9, "zoom doubles with the spread");
    const held = toWorld(cam, vp, { x: 600, y: 400 });
    const now = toWorld(c, vp, { x: 600, y: 400 });
    near(now.x, held.x, 1e-9);
    near(now.y, held.y, 1e-9);
    assert.equal(
        pinch(cam, vp, from, to, { min: 0.05, max: 0.6 }).z,
        0.6,
        "the zoom limit still holds",
    );
});

test("fit centres a rect and leaves the padding asked for", () => {
    const c = fitRect({ x: 0, y: 0, w: 2000, h: 1000 }, vp, 40);
    assert.deepEqual({ x: c.x, y: c.y }, { x: 1000, y: 500 });
    near(c.z, (1200 - 80) / 2000, 1e-9, "the wider side decides");
    const r = visibleRect(c, vp);
    assert.ok(r.w > 2000 && r.h > 1000, "everything is on screen");
});

test("clamping holds the zoom in range and keeps some content on screen", () => {
    const bounds = { x: 0, y: 0, w: 4000, h: 2000 };
    const limits = { min: 0.2, max: 3 };
    assert.equal(clampCamera({ x: 0, y: 0, z: 9 }, bounds, vp, limits).z, 3);
    assert.equal(clampCamera({ x: 0, y: 0, z: 0.01 }, bounds, vp, limits).z, 0.2);
    for (const away of [
        { x: 99999, y: 0 },
        { x: -99999, y: 88888 },
    ]) {
        const c = clampCamera({ ...away, z: 1 }, bounds, vp, limits, 80);
        const seen = visibleRect(c, vp);
        assert.ok(intersects(seen, bounds), "the content is still in view");
        const over = Math.min(seen.x + seen.w, bounds.x + bounds.w) - Math.max(seen.x, bounds.x);
        assert.ok(over >= 80 - 1e-9, `at least 80 px of content: ${over}`);
    }
});

test("a camera kept in a place covers the screen with it, and holds to its middle where it is smaller", () => {
    const place = { x: -400, y: 0, w: 800, h: 1200 };
    const small = { w: 600, h: 500 };
    const kept = keepIn(place, small, { x: 3000, y: -3000, z: 1 });
    assert.deepEqual(kept, { x: 140, y: 210, z: 1 }, "40 px of slack past the place's corner");
    assert.deepEqual(keepIn(place, small, { x: 20, y: 600, z: 1 }), { x: 20, y: 600, z: 1 });
    const far = keepIn(place, small, { x: 900, y: 900, z: 0.2 });
    assert.deepEqual(
        far,
        { x: 0, y: 600, z: 0.2 },
        "a place smaller than the screen sits in its middle",
    );
});

test("a point off the screen is pointed at from inside its edge, and one on it is not", () => {
    const small = { w: 600, h: 500 };
    const c = { x: 0, y: 500, z: 1 };
    assert.equal(pointerTo(c, small, { x: 10, y: 480 }), null);
    for (const target of [
        { x: 380, y: 1080 },
        { x: -2000, y: 400 },
        { x: 0, y: -9000 },
    ]) {
        const p = pointerTo(c, small, target);
        assert.ok(p, "off screen");
        assert.ok(p.x >= 44 - 1e-9 && p.x <= small.w - 44 + 1e-9, `x ${p.x}`);
        assert.ok(p.y >= 44 - 1e-9 && p.y <= small.h - 44 + 1e-9, `y ${p.y}`);
        const s = toScreen(c, small, target);
        near(Math.atan2(s.y - 250, s.x - 300), p.angle, 1e-9, "the angle points at it");
    }
});

test("the stop nearest a point is found within reach, and a day not drawn yet is never it", () => {
    const stop = (key: string, x: number, state: Stop["state"]): Stop => ({
        key,
        state,
        lessons: [],
        date: null,
        at: { x, y: 0 },
        s: x,
        paper: { x, y: -400, w: 400, h: 300 },
    });
    const stops = [stop("a", 0, "done"), stop("b", 1000, "today"), stop("c", 2000, "ahead")];
    assert.equal(stopNear(stops, { x: 900, y: 50 }, 500)?.key, "b");
    assert.equal(stopNear(stops, { x: 1990, y: 0 }, 500), null, "the day ahead is passed over");
    assert.equal(stopNear(stops, { x: 500, y: 3000 }, 500), null, "nothing within reach");
});

test("a flight lands on its camera, and a long trip zooms out on the way", () => {
    const a: Camera = { x: 0, y: 0, z: 2 };
    const b: Camera = { x: 30000, y: 1200, z: 2 };
    const f = flight(a, b, vp);
    assert.deepEqual(f.at(0), a);
    assert.deepEqual(f.at(1), b);
    assert.ok(f.at(0.5).z < a.z / 4, "the middle of a long trip is well zoomed out");
    assert.ok(f.ms >= 260 && f.ms <= 1150, "the duration stays within the limits");
    const close = flight(a, { x: 100, y: 0, z: 2.2 }, vp);
    assert.ok(close.at(0.5).z > 1.5, "a short hop does not swing out");
    const still = flight(a, a, vp);
    assert.equal(still.ms, 0);
});

test("wheel: pinches and mouse notches zoom, trackpad scrolling pans", () => {
    const base = {
        deltaX: 0,
        deltaY: 0,
        deltaMode: 0,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
    };
    assert.equal(
        readWheel({ ...base, deltaY: 4, ctrlKey: true }, -1e9, 0).zoom,
        true,
        "a trackpad pinch",
    );
    assert.equal(readWheel({ ...base, deltaY: 100 }, -1e9, 0).zoom, true, "a mouse notch");
    assert.equal(
        readWheel({ ...base, deltaY: -3, deltaMode: 1 }, -1e9, 0).zoom,
        true,
        "a wheel that counts in lines",
    );
    assert.equal(
        readWheel({ ...base, deltaY: 12.5, deltaX: -3 }, -1e9, 0).zoom,
        false,
        "two fingers on a trackpad",
    );
    const seen = readWheel({ ...base, deltaY: 8.25 }, -1e9, 1000);
    assert.equal(seen.trackpadAt, 1000);
    assert.equal(
        readWheel({ ...base, deltaY: 120 }, seen.trackpadAt, 1200).zoom,
        false,
        "the tail of a flick keeps panning",
    );
    assert.equal(
        readWheel({ ...base, deltaY: 120 }, seen.trackpadAt, 3000).zoom,
        true,
        "later, a notch zooms again",
    );
    assert.ok(
        wheelFactor({ deltaY: -100, deltaMode: 0 }) > 1 &&
            wheelFactor({ deltaY: 100, deltaMode: 0 }) < 1,
    );
    assert.ok(
        wheelFactor({ deltaY: 400, deltaMode: 0 }) === wheelFactor({ deltaY: 40, deltaMode: 0 }),
        "one notch is one step",
    );
});

test("grid lines land on whole device pixels and repeat at the step", () => {
    const lines = gridLines(-13.4, 26.5, 200);
    assert.ok(lines.every(Number.isInteger));
    assert.ok(
        lines.every((v, i) => {
            const before = lines[i - 1];
            return before === undefined || Math.abs(v - before - 26.5) <= 1;
        }),
    );
    const first = lines[0];
    assert.ok(first !== undefined && first >= 0 && first < 26.5);
    assert.deepEqual(
        gridLines(0, 0.4, 100),
        [],
        "no lines when the squares are smaller than a pixel",
    );
});

test("the paper shows 5 mm squares close in and every fifth line far out", () => {
    assert.deepEqual(
        paperLayers(1).map((l) => l.alpha),
        [1, 0],
    );
    const [fine, coarse] = paperLayers(0.1).map((l) => l.alpha);
    assert.equal(fine, 0, "the fine squares would be two pixels apart, so they are dropped");
    assert.ok(coarse !== undefined && coarse > 0.9, "every fifth line carries the paper");
    assert.deepEqual(
        paperLayers(1).map((l) => l.step),
        [20, 100],
    );
});
