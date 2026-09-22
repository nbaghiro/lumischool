// The slingshot, on planck behind bodies.ts: what a pull is worth, that a shot is the same shot
// when it is fired again body for body, and that each level can be won with a good shot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, spent } from "../../../engine/motion/pad";
import { degreesOf } from "../../../engine/motion/flight";
import {
    launch,
    reach,
    SLING,
    slingGame,
    start as startSling,
    step as stepSling,
    type SlingState,
} from "../sling";

function shoot(level: number, pulls: { x: number; y: number }[]): SlingState {
    const s = startSling(level),
        pad = emptyPad();
    for (const pull of pulls) {
        for (let n = 0; s.phase !== "aim" && n < 60 * 20; n++) {
            stepSling(s, pad);
            spent(pad);
        }
        pad.released = pull;
        stepSling(s, pad);
        spent(pad);
        for (let n = 0; s.phase !== "aim" && n < 60 * 20; n++) {
            stepSling(s, pad);
            spent(pad);
        }
    }
    return s;
}
const at = (deg: number, pull: number) => ({
    x: -Math.cos((deg * Math.PI) / 180) * pull,
    y: Math.sin((deg * Math.PI) / 180) * pull,
});
const bodiesOf = (s: SlingState) =>
    s.things.map((t) => {
        const p = s.world.where(t.body);
        return [p.x, p.y, p.angle];
    });

test("a pull is a speed and an angle: the full pull is the sling's top speed, straight back through the pouch", () => {
    const v = launch(at(30, 99));
    assert.ok(Math.abs(Math.hypot(v.x, v.y) - SLING.speed.value) < 1e-9);
    assert.equal(Math.round((Math.atan2(-v.y, v.x) * 180) / Math.PI), 30);
    assert.equal(degreesOf(at(35, 3)), 35);
    assert.ok(Math.hypot(reach(at(10, 9)).x, reach(at(10, 9)).y) <= SLING.maxPull.value + 1e-9);
});

test("nothing falls before the first shot, at either level", () => {
    for (const level of [0, 1]) {
        const s = startSling(level),
            pad = emptyPad();
        for (let i = 0; i < 600; i++) stepSling(s, pad);
        assert.equal(s.starsDown, 0);
        for (const t of s.things) {
            const p = s.world.where(t.body);
            assert.ok(
                Math.hypot(p.x - t.piece.x, p.y - t.piece.y) < 0.2,
                `${t.key} moved on its own`,
            );
        }
    }
});

test("a shot is the same shot when it is fired again, body for body", () => {
    const a = shoot(0, [at(30, 3.5)]),
        b = shoot(0, [at(30, 3.5)]);
    assert.deepEqual(bodiesOf(a), bodiesOf(b));
    assert.equal(a.steps, b.steps);
});

test("the first level can be won with one good shot, and the second takes a high one", () => {
    const one = shoot(0, [at(30, 3.5)]);
    assert.ok(one.won, `${one.starsDown} stars down`);
    const flat = shoot(1, [at(10, 4.5)]);
    assert.equal(flat.starsDown, 0, "a flat shot at the second level stops at the wall");
    const high = shoot(1, [at(50, 4.5)]);
    assert.ok(high.starsDown >= 1, "a high shot drops on the stars");
});

test("a pull too short to mean anything fires nothing, and the ball stays in the sling", () => {
    const s = shoot(0, [{ x: -0.3, y: 0.1 }]);
    assert.equal(s.shots, 0);
    assert.equal(s.phase, "aim");
});

test("under reduced motion a shot is worked out to rest and drawn once, at rest", () => {
    const s = startSling(0),
        pad = emptyPad();
    pad.released = at(30, 3.5);
    stepSling(s, pad);
    spent(pad);
    assert.ok(slingGame.still.settling?.(s));
    let n = 0;
    while (slingGame.still.settling?.(s) && n++ < 60 * 20) stepSling(s, pad);
    assert.ok(!slingGame.still.settling?.(s));
    const f = slingGame.frame(s, true);
    assert.equal(f.camera.zoom, 1);
    assert.ok(
        f.marks.some((m) => m.kind === "dots" && m.pts.length > 5),
        "the path is left in dots",
    );
});
