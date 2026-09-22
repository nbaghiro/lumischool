// Where a released piece lands, and the identity the view keeps over a model that counts. Nothing
// here touches the page: a release is a point and a velocity judged against targets.
import { test } from "node:test";
import assert from "node:assert/strict";
import { land, nearestTarget, settle, type Target } from "../pieces";

const pans: Target<string>[] = [
    { id: "left", shape: { cx: 2, cy: 2, r: 1 }, carries: "left" },
    { id: "right", shape: { cx: 8, cy: 2, r: 1 }, carries: "right" },
];

test("a release lands on the target it is over, near the one within reach, and nowhere otherwise", () => {
    const o = { reach: 0.5, flickSeconds: 0.3, minSpeed: 10 };
    assert.equal(land({ x: 8.2, y: 2, vx: 0, vy: 0 }, pans, o).how, "on");
    const near = land({ x: 8, y: 3.4, vx: 0, vy: 0 }, pans, o);
    assert.equal(near.how, "near");
    assert.equal(near.target?.carries, "right");
    assert.equal(land({ x: 5, y: 2, vx: 0, vy: 0 }, pans, o).how, "miss");
});

test("a flick lands where it was aimed, and a slow throw does not", () => {
    const o = { reach: 0.5, flickSeconds: 0.3, minSpeed: 10 };
    const flick = land({ x: 5, y: 2, vx: 12, vy: 0 }, pans, o);
    assert.equal(flick.how, "flick");
    assert.equal(flick.target?.carries, "right");
    assert.equal(land({ x: 5, y: 2, vx: 4, vy: 0 }, pans, o).how, "miss");
    assert.equal(land({ x: 5, y: 2, vx: 0, vy: 40 }, pans, o).how, "miss", "aimed at nothing");
});

test("a point inside two targets goes to the one whose centre is nearer", () => {
    const two: Target<string>[] = [
        { id: "a", shape: { cx: 0, cy: 0, r: 1.1 }, carries: "a" },
        { id: "b", shape: { cx: 1, cy: 0, r: 1.1 }, carries: "b" },
    ];
    assert.equal(nearestTarget({ x: 0.8, y: 0 }, two)?.target.id, "b");
    assert.equal(nearestTarget({ x: 0.2, y: 0 }, two)?.target.id, "a");
    assert.equal(land({ x: 0.8, y: 0.1, vx: 0, vy: 0 }, two).target?.id, "b");
});

test("settle moves as few pieces as it must, the hand's first, and keeps arrival order", () => {
    type P = { id: string; kind: "ball" | "star"; where: "tray" | "pan" };
    const start: P[] = [
        { id: "b1", kind: "ball", where: "tray" },
        { id: "b2", kind: "ball", where: "tray" },
        { id: "s1", kind: "star", where: "tray" },
    ];
    const o = (balls: number, stars: number, prefer?: string) => ({
        places: ["pan"] as P["where"][],
        home: "tray" as const,
        kinds: ["ball", "star"] as P["kind"][],
        prefer,
        want: (_w: P["where"], k: P["kind"]) => (k === "ball" ? balls : stars),
    });
    let p = settle(start, o(1, 0, "b1"));
    assert.deepEqual(
        p.filter((x) => x.where === "pan").map((x) => x.id),
        ["b1"],
        "the ball the hand moved",
    );
    p = settle(p, o(2, 1));
    assert.deepEqual(
        p.filter((x) => x.where === "pan").map((x) => x.id),
        ["b1", "b2", "s1"],
    );
    p = settle(p, o(1, 1));
    assert.deepEqual(
        p.filter((x) => x.where === "pan").map((x) => x.id),
        ["b1", "s1"],
        "a take-back takes the last ball to arrive",
    );
    assert.equal(p.length, 3);
});
