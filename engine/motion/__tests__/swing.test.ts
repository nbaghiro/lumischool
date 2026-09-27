import { test } from "node:test";
import assert from "node:assert/strict";
import {
    amplitudeOf,
    catchRope,
    energyOf,
    handsOf,
    letGo,
    stepFlight,
    stepSwing,
    type Swing,
} from "../swing";

const G = 50,
    DT = 1 / 60;
const PUSH = { pump: 10, most: 1.3, damping: 0 };

test("a swing let go from one side reaches the same height on the other, and keeps its energy", () => {
    const s: Swing = { ax: 0, ay: 0, r: 9, theta: -0.5, omega: 0 };
    const e0 = energyOf(s, G);
    let most = -Infinity;
    for (let i = 0; i < 200; i++) {
        stepSwing(s, G, DT, PUSH, false);
        most = Math.max(most, s.theta);
    }
    assert.ok(Math.abs(most - 0.5) < 0.03, `reached ${most}`);
    assert.ok(Math.abs(energyOf(s, G) - e0) / e0 < 0.05);
    assert.ok(Math.abs(amplitudeOf(s, G) - 0.5) < 0.03);
});

test("pumping raises the swing by degrees, and stops adding at the most it may reach", () => {
    const s: Swing = { ax: 0, ay: 0, r: 9, theta: -0.4, omega: 0 };
    const reach: number[] = [];
    for (let i = 0; i < 600; i++) {
        stepSwing(s, G, DT, PUSH, true);
        if (i % 60 === 59) reach.push(amplitudeOf(s, G));
    }
    for (let i = 1; i < 3; i++) assert.ok((reach[i] ?? 0) > (reach[i - 1] ?? 0));
    assert.ok((reach[reach.length - 1] ?? 0) < PUSH.most + 0.12);
    // from rest at the bottom a pump starts it forward
    const still: Swing = { ax: 0, ay: 0, r: 9, theta: 0, omega: 0 };
    stepSwing(still, G, DT, PUSH, true);
    assert.ok(still.omega > 0);
});

test("letting go flies from the hands along the swing, and falls under gravity and wind", () => {
    const s: Swing = { ax: 0, ay: 0, r: 8, theta: 0, omega: 2 };
    const f = letGo(s);
    assert.deepEqual({ x: f.x, y: f.y }, handsOf(s));
    assert.equal(f.vx, 16);
    assert.ok(Math.abs(f.vy) < 1e-12);
    const calm = { ...f },
        windy = { ...f };
    for (let i = 0; i < 30; i++) {
        stepFlight(calm, G, 0, DT);
        stepFlight(windy, G, -6, DT);
    }
    assert.ok(calm.y > f.y + 5);
    assert.ok(windy.x < calm.x - 0.5);
});

test("a rope is caught only within reach, where the hands meet it, keeping the speed that goes round", () => {
    const rope = { ax: 10, ay: 0, long: 11, theta: 0 };
    assert.equal(catchRope({ x: 8, y: 8 }, { x: 10, y: 0 }, rope, 0.9, 1.5), null);
    assert.equal(catchRope({ x: 10.2, y: 12 }, { x: 10, y: 0 }, rope, 0.9, 1.5), null);
    const got = catchRope({ x: 10.3, y: 8 }, { x: 10, y: 2 }, rope, 0.9, 1.5);
    assert.ok(got);
    assert.ok(Math.abs(got.r - Math.hypot(0.3, 8)) < 1e-9);
    assert.ok(got.omega > 1);
    const back = handsOf(got);
    assert.ok(Math.abs(back.x - 10.3) < 1e-9 && Math.abs(back.y - 8) < 1e-9);
});
