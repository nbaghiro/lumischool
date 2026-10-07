import { test } from "node:test";
import assert from "node:assert/strict";
import {
    crosses,
    puffOn,
    sagOf,
    stepBob,
    swipeCuts,
    type Air,
    type Bob,
    type Bubble,
    type Tether,
} from "../tether";

const AIR: Air = { g: 30, drag: 0.1, lift: 0.4, float: 1.5 };
const DT = 1 / 60;

test("a taut rope holds the weight at its length, and a slack one lets it fall to it", () => {
    const rope: Tether = { ax: 0, ay: 0, len: 5, cut: false };
    const b: Bob = { x: 0, y: 2, vx: 0, vy: 0 };
    for (let i = 0; i < 240; i++) stepBob(b, [rope], null, AIR, DT);
    assert.ok(Math.abs(Math.hypot(b.x, b.y) - 5) < 1e-9, `at ${Math.hypot(b.x, b.y)}`);
    assert.ok(b.y > 4.99);
    assert.equal(sagOf(rope, b), 0);
    assert.ok(sagOf(rope, { x: 0, y: 3 }) > 1.9);
});

test("a weight let go to one side swings through the bottom and up the other", () => {
    const rope: Tether = { ax: 0, ay: 0, len: 5, cut: false };
    const b: Bob = { x: -5, y: 0, vx: 0, vy: 0 };
    let right = -Infinity;
    for (let i = 0; i < 120; i++) {
        stepBob(b, [rope], null, AIR, DT);
        right = Math.max(right, b.x);
    }
    assert.ok(right > 3, `it swung only to ${right}`);
});

test("two ropes hold the weight between their pegs, and cutting one lets it swing on the other", () => {
    const ropes: Tether[] = [
        { ax: -4, ay: 0, len: 5, cut: false },
        { ax: 4, ay: 0, len: 5, cut: false },
    ];
    const b: Bob = { x: 0, y: 1, vx: 0, vy: 0 };
    for (let i = 0; i < 600; i++) stepBob(b, ropes, null, AIR, DT);
    assert.ok(Math.abs(b.x) < 0.05 && Math.abs(b.y - 3) < 0.05, `at ${b.x}, ${b.y}`);
    const [left] = ropes;
    assert.ok(left);
    left.cut = true;
    let most = 0;
    for (let i = 0; i < 60; i++) {
        stepBob(b, ropes, null, AIR, DT);
        most = Math.max(most, b.x);
    }
    assert.ok(most > 3.5, `it swung only to ${most}`);
});

test("a swipe cuts a rope it crosses and leaves one it misses or one already cut", () => {
    const t: Tether = { ax: 0, ay: 0, len: 5, cut: false },
        bob = { x: 0, y: 5 };
    assert.equal(swipeCuts({ x: -1, y: 2 }, { x: 1, y: 2 }, t, bob), true);
    assert.equal(swipeCuts({ x: 1, y: 2 }, { x: 3, y: 2 }, t, bob), false);
    assert.equal(swipeCuts({ x: -1, y: 6 }, { x: 1, y: 6 }, t, bob), false);
    assert.equal(swipeCuts({ x: -1, y: 2 }, { x: 1, y: 2 }, { ...t, cut: true }, bob), false);
    assert.equal(crosses({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 2, y: 0 }), true);
    assert.equal(crosses({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }), false);
});

test("a puff pushes along its way, harder when blown harder and nearer, and nothing outside its cone or reach", () => {
    const p = { x: 0, y: 0, dir: 0, reach: 8, spread: 0.5 };
    const soft = puffOn(p, { x: 4, y: 0 }, 0, 10),
        hard = puffOn(p, { x: 4, y: 0 }, 1, 10),
        far = puffOn(p, { x: 7, y: 0 }, 1, 10);
    assert.ok(hard.x > soft.x && soft.x > 0);
    assert.ok(hard.x > far.x && far.x > 0);
    assert.ok(Math.abs(hard.y) < 1e-9);
    assert.deepEqual(puffOn(p, { x: 9, y: 0 }, 1, 10), { x: 0, y: 0 });
    assert.deepEqual(puffOn(p, { x: 1, y: 3 }, 1, 10), { x: 0, y: 0 });
    assert.deepEqual(puffOn(p, { x: -3, y: 0 }, 1, 10), { x: 0, y: 0 });
});

test("a bubble holding the weight floats it up at a steady pace and goes with it, and a popped one lets it fall", () => {
    const b: Bob = { x: 0, y: 10, vx: 0, vy: 0 },
        bubble: Bubble = { x: 0, y: 10, r: 1.4, held: true, popped: false };
    for (let i = 0; i < 60; i++) stepBob(b, [], bubble, AIR, DT);
    assert.ok(b.y < 10, `at ${b.y}`);
    // it rises at a steady pace, the lift over the bubble's drag, rather than ever faster
    for (let i = 0; i < 240; i++) stepBob(b, [], bubble, AIR, DT);
    assert.ok(Math.abs(b.vy + (AIR.lift * AIR.g) / AIR.float) < 0.5, `rising at ${-b.vy}`);
    assert.deepEqual([bubble.x, bubble.y], [b.x, b.y]);
    bubble.popped = true;
    const was = b.y;
    for (let i = 0; i < 90; i++) stepBob(b, [], bubble, AIR, DT);
    assert.ok(b.y > was);
});
