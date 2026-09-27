import { test } from "node:test";
import assert from "node:assert/strict";
import { bodies } from "../bodies";
import type { Pt } from "../geometry";
import {
    calm,
    count,
    drain,
    dropAt,
    liquid,
    places,
    pour,
    solidsOf,
    stepLiquid,
    WATER,
    type Liquid,
} from "../liquid";

const CUP: Pt[][] = [
    [
        { x: 0, y: 0 },
        { x: 0, y: 6 },
    ],
    [
        { x: 0, y: 6 },
        { x: 4, y: 6 },
    ],
    [
        { x: 4, y: 6 },
        { x: 4, y: 0 },
    ],
];

const isLiquid = (v: unknown): v is Liquid =>
    typeof v === "object" &&
    v !== null &&
    "drops" in v &&
    Array.isArray(v.drops) &&
    "tags" in v &&
    Array.isArray(v.tags) &&
    "most" in v &&
    typeof v.most === "number";

function fill(steps: number): Liquid {
    const l = liquid(300);
    for (let s = 0; s < steps; s++) {
        if (s < 120 && s % 2 === 0)
            pour(l, { x: 2 + (((s / 2) % 3) - 1) * 0.2, y: -3 }, { x: 0, y: 2 });
        stepLiquid(l, 1 / 60, WATER, { walls: CUP });
    }
    return l;
}

test("water poured into a cup stays in it, lies low, and comes to rest", () => {
    const l = fill(480);
    assert.equal(count(l), 60);
    for (let i = 0; i < count(l); i++) {
        const d = dropAt(l, i);
        assert.ok(d);
        assert.ok(d.x > 0 && d.x < 4 && d.y < 6, `drop ${i} at ${d.x}, ${d.y}`);
        assert.ok(d.y > 3, `drop ${i} lies in the bottom half, at ${d.y}`);
    }
    assert.ok(calm(l, 0.6));
});

test("the same pours give the same water, and water stored as JSON goes on the same way", () => {
    assert.deepEqual(fill(200), fill(200));
    const a = fill(90),
        b: unknown = JSON.parse(JSON.stringify(a));
    assert.ok(isLiquid(b));
    for (let s = 0; s < 60; s++) {
        stepLiquid(a, 1 / 60, WATER, { walls: CUP });
        stepLiquid(b, 1 / 60, WATER, { walls: CUP });
    }
    assert.deepEqual(places(b), places(a));
});

test("water poured on one end of a plank on a hinge tips that end down", () => {
    const w = bodies({ gravity: { x: 0, y: WATER.gravity } });
    const plank = w.box({ x: 5, y: 5, w: 6, h: 0.3, density: 0.3 });
    w.hinge(null, plank, { x: 5, y: 5 }, { lower: -0.6, upper: 0.6 });
    const l = liquid(100);
    for (let s = 0; s < 40; s++) {
        pour(l, { x: 3, y: 3 }, { x: 0, y: 6 });
        stepLiquid(l, 1 / 60, WATER, { solids: solidsOf(w) });
        w.step(1 / 60);
    }
    assert.ok(w.where(plank).angle < -0.3, `the left end went down: ${w.where(plank).angle}`);
});

test("a liquid refuses drops past its most, and drains the ones asked for in order", () => {
    const l = liquid(3);
    for (let i = 0; i < 5; i++) pour(l, { x: i, y: 0 }, { x: 0, y: 0 }, i);
    assert.equal(count(l), 3);
    const gone = drain(l, (d) => d.tag === 1);
    assert.deepEqual(
        gone.map((d) => d.x),
        [1],
    );
    assert.deepEqual(l.tags, [0, 2]);
    assert.deepEqual(places(l), [0, 0, 2, 0]);
});

test("a fast drop does not pass through a thin wall", () => {
    const l = liquid(1);
    pour(l, { x: 1, y: 1 }, { x: 38, y: 0 });
    const wall = [
        [
            { x: 1.5, y: -5 },
            { x: 1.5, y: 5 },
        ],
    ];
    for (let s = 0; s < 10; s++) stepLiquid(l, 1 / 60, WATER, { walls: wall });
    assert.ok((dropAt(l, 0)?.x ?? 9) < 1.5);
});
