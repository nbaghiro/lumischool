import assert from "node:assert/strict";
import { test } from "node:test";
import type { Water } from "../scene";
import { RIPPLE, rippleAt, ripplesOf, surfaceAt, WAVES } from "../surface";

const POND: Water = { x: 0, w: 40, level: 10, bottom: 14 };

test("still water with no waves and no ripples lies flat at its level", () => {
    for (const x of [0, 3.3, 17, 39])
        for (const t of [0, 1.7, 30]) assert.equal(surfaceAt({ ...POND, waves: 0 }, x, t), 10);
});

test("waves stay within their height of the level", () => {
    for (let x = 0; x < 40; x += 0.37)
        for (let t = 0; t < 10; t += 0.61) {
            assert.ok(Math.abs(surfaceAt(POND, x, t) - 10) <= WAVES + 1e-9);
            assert.ok(Math.abs(surfaceAt({ ...POND, waves: 0.5 }, x, t) - 10) <= 0.5 + 1e-9);
        }
});

test("a river's surface is carried along by its flow", () => {
    const river = { ...POND, flow: 2 };
    const still = { ...POND, flow: 0 };
    // what the still water shows at x, the river shows two squares a second further on
    for (const x of [1, 5.5, 12])
        assert.ok(Math.abs(surfaceAt(river, x + 2 * 3, 3) - surfaceAt(still, x, 3)) < 1e-9);
});

test("a ripple is nothing ahead of its ring and a swell behind it, gone when it has run its life", () => {
    const r = { x: 20, age: 1, size: 1 };
    const front = RIPPLE.speed * r.age;
    assert.equal(rippleAt(r, 20 + front + 0.5), 0);
    assert.equal(rippleAt(r, 20 - front - 0.5), 0);
    assert.ok(Math.abs(rippleAt(r, 20 + front - 0.3)) > 0.01);
    assert.equal(rippleAt({ ...r, age: RIPPLE.life }, 20), 0);
    assert.equal(rippleAt({ ...r, age: 1.2 }, 20 + 1), rippleAt({ ...r, age: 1.2 }, 20 - 1));
});

test("the view shows a water's newest ripples still running, at most as many as it draws", () => {
    const ripples = Array.from({ length: 12 }, (_, i) => ({ x: i, age: i * 0.15 }));
    const shown = ripplesOf({
        ...POND,
        ripples: [...ripples, { x: 0, age: 5 }, { x: 0, age: -1 }],
    });
    assert.equal(shown.length, RIPPLE.most);
    assert.deepEqual(
        shown.map((r) => r.x),
        [0, 1, 2, 3, 4, 5, 6, 7],
    );
    assert.ok(shown.every((r) => r.size === 1));
});

test("a ripple lifts the surface where it runs", () => {
    const calm = { ...POND, waves: 0 };
    const splashed = { ...calm, ripples: [{ x: 20, age: 0.5 }] };
    assert.equal(surfaceAt(splashed, 5, 0), 10);
    assert.notEqual(surfaceAt(splashed, 20.5, 0), 10);
});
