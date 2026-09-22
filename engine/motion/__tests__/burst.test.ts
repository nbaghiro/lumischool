import assert from "node:assert/strict";
import { test } from "node:test";
import { ageOf, burst, bursts, stepBursts, type Style } from "../burst";

const dust: Style = {
    life: 0.5,
    speed: 3,
    spread: Math.PI,
    fall: 2,
    drag: 3,
    spin: 2,
    size: 0.8,
    grow: 0.6,
};

test("a burst throws its motes and they are gone by the end of their lives", () => {
    const b = bursts(40, 9);
    burst(b, "dust", { x: 5, y: 5 }, 6, dust);
    assert.equal(b.motes.length, 6);
    assert.ok(b.motes.every((m) => m.x === 5 && m.y === 5 && m.kind === "dust"));
    for (let i = 0; i < 20; i++) stepBursts(b, 1 / 60);
    assert.ok(b.motes.every((m) => ageOf(m) > 0 && ageOf(m) < 1));
    assert.ok(
        b.motes.some((m) => Math.hypot(m.x - 5, m.y - 5) > 0.2),
        "they fly apart",
    );
    for (let i = 0; i < 60; i++) stepBursts(b, 1 / 60);
    assert.equal(b.motes.length, 0);
});

test("the pool never holds more than its most, and the oldest go first", () => {
    const b = bursts(10, 1);
    burst(b, "old", { x: 0, y: 0 }, 8, dust);
    burst(b, "new", { x: 0, y: 0 }, 8, dust);
    assert.equal(b.motes.length, 10);
    assert.equal(b.motes.filter((m) => m.kind === "new").length, 8);
});

test("the same seed throws the same motes", () => {
    const a = bursts(40, 4),
        c = bursts(40, 4);
    for (const b of [a, c]) {
        burst(b, "spark", { x: 1, y: 2 }, 5, { ...dust, fall: 0 }, 0);
        for (let i = 0; i < 10; i++) stepBursts(b, 1 / 60);
    }
    assert.deepEqual(a.motes, c.motes);
});
