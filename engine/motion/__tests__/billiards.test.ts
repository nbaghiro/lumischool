// The table's physics: a straight knock passes all the speed on, a cushion turns a ball back with
// less speed, the cloth brings it to rest, a pocket takes only what it is marked for, the turning bar
// sweeps a ball aside, and the same shot played twice ends in the same place.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SUB, rolling, stepTable, type Ball, type Feel, type Table } from "../billiards";

const FEEL: Feel = {
    r: 0.7,
    mouth: 1.25,
    roll: 1.6,
    rest: 0.06,
    ball: 1,
    cushion: 0.8,
    bumper: 0.9,
};

const box = (over: Partial<Table> = {}): Table => ({
    outline: [
        { x: 0, y: 0 },
        { x: 24, y: 0 },
        { x: 24, y: 12 },
        { x: 0, y: 12 },
    ],
    pockets: [],
    bumpers: [],
    patches: [],
    spinners: [],
    ...over,
});

const ball = (n: number, x: number, y: number, vx = 0, vy = 0): Ball => ({
    n,
    x,
    y,
    vx,
    vy,
    potted: false,
});

function run(balls: Ball[], t: Table, feel = FEEL, seconds = 20) {
    const knocks = [];
    for (let i = 0; i < SUB * seconds && rolling(balls); i++)
        knocks.push(...stepTable(balls, t, feel, i / SUB, 1 / SUB));
    return knocks;
}

test("a straight knock between equal balls passes all the speed on", () => {
    const a = ball(0, 4, 6, 8, 0),
        b = ball(3, 8, 6);
    const hit = stepUntil([a, b], box(), () => b.vx > 0);
    assert.ok(hit);
    assert.ok(Math.abs(a.vx) < 0.05, `the white ball stops, at ${a.vx}`);
    assert.ok(b.vx > 7, `the struck ball goes on at ${b.vx}`);
});

function stepUntil(balls: Ball[], t: Table, done: () => boolean): boolean {
    for (let i = 0; i < SUB * 5; i++) {
        stepTable(balls, t, FEEL, i / SUB, 1 / SUB);
        if (done()) return true;
    }
    return false;
}

test("a cushion turns a ball back more slowly, and the cloth brings it to rest inside the table", () => {
    const b = ball(1, 20, 6, 10, 0);
    const knocks = run([b], box());
    assert.ok(knocks.some((k) => k.kind === "cushion"));
    assert.ok(!rolling([b]));
    assert.ok(b.x >= FEEL.r && b.x <= 24 - FEEL.r && b.y >= FEEL.r && b.y <= 12 - FEEL.r);
});

test("an even pocket takes an even ball and turns an odd one back out", () => {
    const pockets = [{ x: 12, y: 0, only: "even" as const }];
    const even = ball(4, 12, 4, 0, -8),
        odd = ball(3, 12, 4, 0, -8);
    run([even], box({ pockets }));
    run([odd], box({ pockets }));
    assert.equal(even.potted, true);
    assert.equal(odd.potted, false);
    assert.ok(odd.y > 0, "the odd ball is back on the cloth");
});

test("a turning bar sweeps aside a ball resting in its way", () => {
    const b = ball(2, 14, 6);
    const t = box({ spinners: [{ x: 12, y: 6, half: 3, speed: 2, from: Math.PI / 2 }] });
    for (let i = 0; i < SUB * 2; i++) stepTable([b], t, FEEL, i / SUB, 1 / SUB);
    assert.ok(Math.hypot(b.x - 14, b.y - 6) > 0.3, "the ball has been moved");
});

test("soft cloth stops a ball sooner, and a slope steeper than the cloth keeps it rolling downhill", () => {
    const plain = ball(1, 4, 6, 6, 0),
        soft = ball(1, 4, 6, 6, 0);
    run([plain], box());
    run([soft], box({ patches: [{ x: 0, y: 0, w: 24, h: 12, drag: 3 }] }));
    assert.ok(soft.x < plain.x);
    const down = ball(1, 12, 2),
        slope = box({ patches: [{ x: 0, y: 0, w: 24, h: 12, lean: { x: 0, y: 2 } }] });
    for (let i = 0; i < SUB * 4; i++) stepTable([down], slope, FEEL, i / SUB, 1 / SUB);
    assert.ok(down.y > 4, `the ball rolled down to ${down.y}`);
    const held = ball(1, 12, 2),
        gentle = box({ patches: [{ x: 0, y: 0, w: 24, h: 12, lean: { x: 0, y: 1 } }] });
    for (let i = 0; i < SUB * 4; i++) stepTable([held], gentle, FEEL, i / SUB, 1 / SUB);
    assert.equal(held.y, 2, "a slope gentler than the cloth leaves a ball at rest");
});

test("the same shot played twice ends in the same place", () => {
    const shot = () => [ball(0, 4, 6, 14, 3), ball(3, 12, 5), ball(7, 12, 7.5), ball(5, 16, 6)];
    const a = shot(),
        b = shot();
    run(a, box({ bumpers: [{ x: 18, y: 3, r: 1 }] }));
    run(b, box({ bumpers: [{ x: 18, y: 3, r: 1 }] }));
    assert.deepEqual(a, b);
});
