import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad } from "../../../engine/motion/pad";
import { start as road, step as drive } from "../road";
import { start as cake, step as cut, cakeX, cakeGame } from "../cake";
import { start as snake, step as steer } from "../snake";

test("road brake stops before reversing and release stops reversing", () => {
    const s = road(0);
    s.x = 15;
    s.v = 4;
    // the brake eases near rest, so from 4 squares a second it takes about 22 steps to stop
    for (let i = 0; i < 30; i++) drive(s, { ...emptyPad(), brake: true });
    assert.equal(s.v, 0);
    const stopped = s.x;
    for (let i = 0; i < 90; i++) drive(s, { ...emptyPad(), brake: true });
    assert.ok(s.v < 0 && s.x < stopped);
    for (let i = 0; i < 60; i++) drive(s, emptyPad());
    assert.equal(s.v, 0);
    drive(s, { ...emptyPad(), go: true });
    assert.ok(s.v > 0);
});

test("a downward knife gesture cuts once and a cancelled gesture never cuts", () => {
    const s = cake(1),
        x = cakeX(s, 3);
    cut(s, { ...emptyPad(), touch: { x, y: 10 } });
    cut(s, { ...emptyPad(), touch: { x, y: 12 } });
    assert.equal(s.cuts.length, 1);
    cut(s, { ...emptyPad(), touch: { x: cakeX(s, 5), y: 14 } });
    cut(s, { ...emptyPad(), lifted: { x: cakeX(s, 5), y: 14 } });
    assert.equal(s.cuts.length, 1);
    const cancelled = cake(1);
    cut(cancelled, { ...emptyPad(), touch: { x, y: 10 } });
    cakeGame.cancelInput?.(cancelled);
    cut(cancelled, { ...emptyPad(), lifted: { x, y: 12 } });
    assert.equal(cancelled.cuts.length, 0);
});

test("a tap on a seed sends the firefly to it, and without one it hovers where it is", () => {
    const s = snake(0),
        want = s.seeds.find((x) => x.n === 2);
    assert.ok(want);
    const home = s.L.spots[want.spot];
    assert.ok(home);
    steer(s, { ...emptyPad(), lifted: { ...home } });
    for (let i = 0; i < 60 * 10 && s.next === 0; i++) steer(s, emptyPad());
    assert.equal(s.next, 1, "it flew there and caught it");
    for (let i = 0; i < 60; i++) steer(s, emptyPad());
    assert.ok(Math.hypot(s.v.x, s.v.y) < 0.1, "with nowhere to go it hovers");
});
