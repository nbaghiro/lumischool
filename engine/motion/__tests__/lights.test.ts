import assert from "node:assert/strict";
import { test } from "node:test";
import { flickerAt, lightsOf, MOST_LIGHTS } from "../lights";
import type { Frame, Sprite } from "../scene";

const frame = (sprites: Sprite[], rest: Partial<Frame> = {}): Frame => ({
    sprites,
    marks: [],
    camera: { x: 20, y: 10 },
    view: { w: 40, h: 20 },
    world: { w: 200, h: 20 },
    ...rest,
});

test("a frame's lights are its own and one round each glowing sprite in the world", () => {
    const lit = lightsOf(
        frame(
            [
                { key: "bead", art: "glowbead", x: 10, y: 5, glow: 1.5 },
                { key: "plain", art: "glowbead", x: 12, y: 5 },
                { key: "far", art: "glowbead", x: 12, y: 5, glow: 2, depth: 0.5 },
                { key: "readout", art: "glowbead", x: 1, y: 1, glow: 2, fixed: true },
            ],
            { lights: [{ x: 30, y: 8, r: 4, hue: "tang", strength: 0.5 }] },
        ),
        0,
        true,
    );
    assert.deepEqual(lit, [
        { x: 30, y: 8, r: 4, strength: 0.5, hue: "tang" },
        { x: 10, y: 5, r: 1.5, strength: 1, hue: "glow" },
    ]);
});

test("a light out of the view and its reach is left out", () => {
    const lit = lightsOf(
        frame([], {
            lights: [
                { x: 45, y: 10, r: 6 },
                { x: 47, y: 10, r: 6 },
            ],
        }),
        0,
        true,
    );
    assert.deepEqual(
        lit.map((l) => l.x),
        [45],
    );
});

test("past the most the view draws, the strongest nearest the middle are kept", () => {
    const lights = Array.from({ length: MOST_LIGHTS + 20 }, (_, i) => ({
        x: i < 20 ? 1 + i * 0.1 : 15 + (i % 10),
        y: 10,
        r: 1,
        strength: i < 20 ? 0.1 : 1,
    }));
    const lit = lightsOf(frame([], { lights }), 0, true);
    assert.equal(lit.length, MOST_LIGHTS);
    assert.ok(lit.every((l) => l.strength === 1));
});

test("a flicker wavers between three quarters and the whole, and stands still under reduced motion", () => {
    for (let t = 0; t < 20; t += 0.13) {
        const k = flickerAt(3, 4, t);
        assert.ok(k >= 0.75 && k <= 1);
    }
    const f = frame([], { lights: [{ x: 20, y: 10, r: 3, flicker: true }] });
    assert.equal(lightsOf(f, 1.234, true)[0]?.strength, 1);
    assert.notEqual(lightsOf(f, 1.234, false)[0]?.strength, 1);
});
