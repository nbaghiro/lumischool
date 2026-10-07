import { test } from "node:test";
import assert from "node:assert/strict";
import { stepSkittles, type SkittleBody, type SkittleLane } from "../skittles";
const lane: SkittleLane = {
    left: 0,
    right: 12,
    top: 0,
    bottom: 30,
    grip: 0,
    hook: 0,
    bumpers: false,
};
const body = (id: number, x: number, y: number): SkittleBody => ({
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 0.5,
    mass: id === 0 ? 5 : 1,
    spin: 0,
    angle: 0,
    fallen: false,
    out: false,
});
test("a heavy rolling ball transfers momentum into a chain of pins", () => {
    const ball = body(0, 6, 12),
        first = body(1, 6, 10),
        second = body(2, 6, 8.8);
    ball.vy = -12;
    for (let k = 0; k < 30; k++) stepSkittles([ball, first, second], lane, 1 / 60);
    assert.ok(first.fallen);
    assert.ok(second.fallen);
    assert.ok(ball.vy < 0);
    assert.ok(second.vy < 0);
});
test("a glancing hit scatters a pin sideways and gutters stop balls", () => {
    const ball = body(0, 6, 12),
        pin = body(1, 6.7, 10);
    ball.vy = -12;
    for (let k = 0; k < 20; k++) stepSkittles([ball, pin], lane, 1 / 60);
    assert.ok(pin.fallen);
    assert.ok(pin.vx > 0);
    assert.ok(ball.vx < 0);
    const gutter = body(0, 0.55, 12);
    gutter.vx = -5;
    stepSkittles([gutter], lane, 1 / 60);
    assert.ok(gutter.out);
    const bumper = body(0, 0.55, 12);
    bumper.vx = -5;
    stepSkittles([bumper], { ...lane, bumpers: true }, 1 / 60);
    assert.ok(!bumper.out);
    assert.ok(bumper.vx > 0);
});
