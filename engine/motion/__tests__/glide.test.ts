import assert from "node:assert/strict";
import { test } from "node:test";
import { glide, noseOf, within, type Flyer, type Wing } from "../glide";

const wing: Wing = { cruise: 5, lift: 20, fall: 8, rise: 4, sink: 3, trade: 0.3, settle: 2 };
const fly = (f: Flyer, held: (i: number) => boolean, steps: number, dt = 1 / 60): Flyer => {
    let g = f;
    for (let i = 0; i < steps; i++) g = glide(g, held(i), dt, wing);
    return g;
};
const start: Flyer = { x: 0, y: 10, vx: 5, vy: 0 };

test("held, it climbs no faster than it can; let go, it sinks no faster than it glides", () => {
    const up = fly(start, () => true, 120);
    assert.ok(up.y < start.y && Math.abs(up.vy + wing.rise) < 1e-9, `${up.vy}`);
    const down = fly(start, () => false, 120);
    assert.ok(down.y > start.y && Math.abs(down.vy - wing.sink) < 1e-9);
});

test("a climb spends forward speed and a dive gives it back", () => {
    const up = fly(start, () => true, 240),
        down = fly(start, () => false, 240);
    assert.ok(up.vx < wing.cruise && down.vx > wing.cruise, `${up.vx} and ${down.vx}`);
    assert.ok(noseOf(up) < 0 && noseOf(down) > 0, "the nose points the way it goes");
});

test("the same presses fly the same path", () => {
    const pattern = (i: number): boolean => i % 50 < 20;
    assert.deepEqual(fly(start, pattern, 600), fly(start, pattern, 600));
});

test("a touch on the floor or the ceiling turns it back, and anywhere between leaves it be", () => {
    const low = within({ x: 0, y: 20.5, vx: 5, vy: 3 }, 1, 20, 0.5);
    assert.equal(low.touched, "floor");
    assert.ok(low.f.y === 20 && low.f.vy === -1.5 && low.speed === 3);
    const high = within({ x: 0, y: 0.5, vx: 5, vy: -2 }, 1, 20, 0.5);
    assert.equal(high.touched, "top");
    assert.equal(within(start, 1, 20, 0.5).touched, null);
});
