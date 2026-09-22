import assert from "node:assert/strict";
import { test } from "node:test";
import { arc, degreesOf, flightAt, landing, lob, throwOf, withinReach } from "../flight";

const near = (a: number, b: number, eps = 1e-9) =>
    assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);

test("a thing in flight falls by half g t squared and keeps its sideways speed", () => {
    const p = flightAt({ x: 1, y: 2 }, { x: 3, y: -4 }, 10, 2);
    near(p.x, 7);
    near(p.y, 2 - 8 + 20);
});

test("it comes down through the floor at the time the arc says, going as fast as it says", () => {
    const from = { x: 0, y: 0 },
        v = { x: 5, y: -10 };
    const hit = landing(from, v, 10, 15);
    assert.ok(hit);
    near(hit.t, 3);
    near(hit.at.y, 15);
    near(hit.at.x, 15);
    near(hit.v.y, 20);
    assert.equal(
        landing(from, { x: 0, y: -1 }, 0, 5),
        null,
        "with no gravity, going up never lands",
    );
    assert.equal(landing({ x: 0, y: 0 }, { x: 0, y: -30 }, -1, 5), null);
});

test("the dots stop where they would meet something, and are evenly spaced in time", () => {
    const dots = arc({ x: 0, y: 0 }, { x: 4, y: 0 }, 10, {
        seconds: 2,
        every: 0.1,
        until: (p) => p.y > 5,
    });
    assert.ok(dots.every((p) => p.y <= 5));
    const down = landing({ x: 0, y: 0 }, { x: 4, y: 0 }, 10, 5);
    assert.ok(down);
    assert.equal(
        dots.length,
        Math.floor(down.t / 0.1 + 1e-9),
        "one dot a tenth of a second until it lands",
    );
    near(dots[1]?.x ?? 0, 0.8, 1e-6);
    assert.equal(arc({ x: 0, y: 0 }, { x: 1, y: 0 }, 0, { seconds: 1, every: 0.25 }).length, 4);
});

test("a pull throws straight back through where it was pulled from, and no harder than the band", () => {
    const t = { most: 4, speed: 20 };
    const v = throwOf({ x: -8, y: 0 }, t);
    near(v.x, 20);
    near(v.y, 0);
    const half = throwOf({ x: 0, y: 2 }, t);
    near(half.y, -10);
    assert.deepEqual(throwOf({ x: 0, y: 0 }, t), { x: 0, y: 0 });
    const r = withinReach({ x: 6, y: 8 }, 5);
    near(Math.hypot(r.x, r.y), 5);
    assert.equal(degreesOf({ x: -1, y: 1 }), 45);
    assert.equal(degreesOf({ x: -1, y: 0 }), 0);
});

test("a lob comes down on the point it was thrown at, and its top is as high as it was asked", () => {
    const g = 30,
        a = { x: 2, y: 9 },
        b = { x: 14, y: 6 };
    const { v, t } = lob(a, b, g, 3);
    const end = flightAt(a, v, g, t);
    near(end.x, b.x);
    near(end.y, b.y);
    const topT = -v.y / g;
    near(flightAt(a, v, g, topT).y, Math.min(a.y, b.y) - 3);
    assert.deepEqual(lob(a, a, g, 0), { v: { x: 0, y: 0 }, t: 0 });
});

test("dots with no time between them, or with no end, are refused rather than drawn for ever", () => {
    const from = { x: 0, y: 0 },
        v = { x: 1, y: 1 };
    for (const every of [0, -0.1, Number.NaN])
        assert.throws(() => arc(from, v, 10, { seconds: 1, every }), RangeError);
    assert.throws(() => arc(from, v, 10, { seconds: Number.POSITIVE_INFINITY }), RangeError);
});
