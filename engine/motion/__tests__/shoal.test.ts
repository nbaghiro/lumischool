import { test } from "node:test";
import assert from "node:assert/strict";
import {
    meander,
    shoalWant,
    spreadOf,
    swim,
    wallsOf,
    type ShoalFeel,
    type Swimmer,
} from "../shoal";

const FEEL: ShoalFeel = {
    reach: 7,
    apart: 0.9,
    cruise: 1.5,
    most: 4,
    turn: 6,
    margin: 1.2,
    weights: { apart: 1.6, together: 0.7, along: 0.6, wall: 1.4, wander: 0.6 },
};
const BOX = { x0: 0, y0: 0, x1: 20, y1: 10 };
const DT = 1 / 60;

function tank(n: number, kinds: number): Swimmer[] {
    return Array.from({ length: n }, (_, i) => ({
        x: 2 + ((i * 7) % 16),
        y: 2 + ((i * 3) % 6),
        vx: i % 2 ? 1 : -1,
        vy: 0,
        kind: i % kinds,
    }));
}

function run(fish: Swimmer[], steps: number): void {
    for (let s = 0; s < steps; s++) {
        const wants = fish.map((_, i) => shoalWant(fish, i, BOX, FEEL, s * DT));
        fish.forEach((f, i) => swim(f, wants[i] ?? { x: 0, y: 0 }, BOX, FEEL, DT));
    }
}

test("a scattered kind draws together into a shoal and stays inside the glass", () => {
    const fish = tank(8, 1);
    const before = spreadOf(fish, 0);
    run(fish, 600);
    assert.ok(spreadOf(fish, 0) < before * 0.6, `${spreadOf(fish, 0)} from ${before}`);
    for (const f of fish) {
        assert.ok(f.x >= BOX.x0 && f.x <= BOX.x1 && f.y >= BOX.y0 && f.y <= BOX.y1);
        assert.ok(Math.hypot(f.vx, f.vy) <= FEEL.most + 1e-9);
    }
});

test("no two fish sit on top of each other once the shoal has settled", () => {
    const fish = tank(10, 2);
    run(fish, 900);
    for (const [i, a] of fish.entries())
        for (const b of fish.slice(i + 1))
            assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 0.25, "two fish in one place");
});

test("the same start swims the same way every time", () => {
    const a = tank(12, 3),
        b = tank(12, 3);
    run(a, 300);
    run(b, 300);
    assert.deepEqual(a, b);
});

test("the glass pushes back only inside its margin, harder the nearer", () => {
    assert.deepEqual(wallsOf({ x: 10, y: 5 }, BOX, 1.2, 4), { x: 0, y: 0 });
    const near = wallsOf({ x: 0.2, y: 5 }, BOX, 1.2, 4).x,
        nearer = wallsOf({ x: 0.05, y: 5 }, BOX, 1.2, 4).x;
    assert.ok(near > 0 && nearer > near);
    assert.ok(wallsOf({ x: 10, y: 9.9 }, BOX, 1.2, 4).y < 0);
});

test("a meander is a slow drift that differs from fish to fish", () => {
    const a = meander(0, 3, 1),
        b = meander(1, 3, 1),
        later = meander(0, 3 + DT, 1);
    assert.notDeepEqual(a, b);
    assert.ok(Math.hypot(a.x - later.x, a.y - later.y) < 0.05);
});
