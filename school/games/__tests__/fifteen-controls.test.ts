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
    for (let i = 0; i < 16; i++) drive(s, { ...emptyPad(), brake: true });
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

test("a held finger turns the firefly towards it as a curve, and it keeps flying when let go", () => {
    const s = snake(0),
        from = { ...s.at };
    for (let i = 0; i < 20; i++) steer(s, { ...emptyPad(), touch: { x: from.x, y: from.y + 10 } });
    assert.ok(s.v.y > 1, "it has turned down towards the finger");
    assert.ok(s.v.x > 0, "and not in one jump: it is still moving along");
    const heading = s.heading;
    for (let i = 0; i < 20; i++) steer(s, emptyPad());
    assert.ok(Math.hypot(s.v.x, s.v.y) > 1, "let go, it glides on");
    assert.ok(Math.abs(s.heading - heading) < 0.2);
});
