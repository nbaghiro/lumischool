import assert from "node:assert/strict";
import { test } from "node:test";
import { aimAt, aimOfPull, launchOf, nearness, stepAim, strength, type AimSpec } from "../aim";
import { emptyPad } from "../pad";

const SPEC: AimSpec = {
    min: 1,
    max: 10,
    per: 2,
    dead: 0.2,
    lo: -Math.PI,
    hi: Math.PI,
    turn: 1.5,
    ramp: 4,
    turns: "across",
};

test("a pull aims the other way from itself, as strong as it is long, within the limits", () => {
    const a = aimOfPull({ x: -2, y: 0 }, SPEC);
    assert.ok(Math.abs(a.angle) < 1e-9);
    assert.equal(a.power, 4);
    assert.equal(aimOfPull({ x: -50, y: 0 }, SPEC).power, 10);
    const up = aimOfPull({ x: 0, y: 3 }, { ...SPEC, lo: -Math.PI / 2, hi: 0 });
    assert.ok(Math.abs(up.angle + Math.PI / 2) < 1e-9, "pulling down throws up");
    assert.equal(aimOfPull({ x: 0, y: -3 }, { ...SPEC, lo: -Math.PI / 2, hi: 0 }).angle, 0);
});

test("letting go of a pull launches, and a touch inside the dead zone does not", () => {
    const a = aimAt(0, 3),
        pad = emptyPad();
    pad.pull = { x: -1, y: 0 };
    assert.equal(stepAim(a, pad, SPEC, 1 / 60), null);
    assert.ok(a.pulling);
    pad.pull = null;
    pad.released = { x: -1, y: 0 };
    const v = stepAim(a, pad, SPEC, 1 / 60);
    assert.ok(v && Math.abs(v.x - 2) < 1e-9 && Math.abs(v.y) < 1e-9, JSON.stringify(v));
    assert.equal(a.pulling, false);
    pad.released = { x: -0.05, y: 0 };
    assert.equal(stepAim(a, pad, SPEC, 1 / 60), null);
});

test("held arrows turn the aim and change the power, and the big button launches it", () => {
    const a = aimAt(0, 5),
        pad = emptyPad();
    pad.holding = ["right", "up"];
    for (let i = 0; i < 60; i++) stepAim(a, pad, SPEC, 1 / 60);
    assert.ok(Math.abs(a.angle - 1.5) < 1e-6);
    assert.ok(Math.abs(a.power - 9) < 1e-6);
    pad.holding = [];
    pad.tapped = true;
    const v = stepAim(a, pad, SPEC, 1 / 60);
    assert.ok(v);
    assert.ok(Math.abs(Math.hypot(v.x, v.y) - 9) < 1e-6);
    assert.deepEqual(launchOf(aimAt(Math.PI / 2, 2)).y, 2);
    assert.equal(strength(aimAt(0, 1), SPEC), 0);
    const side = aimAt(-0.5, 5);
    pad.tapped = false;
    pad.holding = ["up"];
    stepAim(side, pad, { ...SPEC, turns: "up" }, 1);
    assert.ok(Math.abs(side.angle + 2) < 1e-9, "seen from the side, up lifts the aim");
});

test("how near a launch came is said in words, short or long by a little or a lot", () => {
    assert.equal(nearness(0.1, 0.5), "on it");
    assert.equal(nearness(-1, 0.5), "close");
    assert.equal(nearness(-2, 0.5), "a little short");
    assert.equal(nearness(4, 0.5), "long");
});
