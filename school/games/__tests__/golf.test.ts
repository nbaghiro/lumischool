import { test } from "node:test";
import assert from "node:assert/strict";
import { golfCourse, startGolf, golfGame, type GolfState } from "../golf";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";

function settle(s: GolfState, pad = emptyPad()): void {
    for (let i = 0; i < 1800 && s.moving; i++) {
        golfGame.step(s, pad);
        spent(pad);
    }
    assert.equal(s.moving, false, "every launched ball returns to rest");
}
function release(s: GolfState, angle: number, power: number): void {
    const pad = emptyPad();
    pad.released = { x: -Math.cos(angle) * power, y: -Math.sin(angle) * power };
    golfGame.step(s, pad);
    spent(pad);
    settle(s, pad);
}
function toward(s: GolfState, point: { x: number; y: number }): void {
    const dx = point.x - s.ball.x,
        dy = point.y - s.ball.y;
    release(s, Math.atan2(dy, dx), Math.sqrt(Math.hypot(dx, dy)));
}

test("all nine garden courses have complete pointer-input win witnesses", () => {
    for (let phase = 0; phase < 3; phase++)
        for (let variant = 0; variant < 3; variant++) {
            const s = startGolf(golfCourse(phase, variant));
            const waypoints =
                phase === 1
                    ? [
                          { x: 14, y: 6 },
                          { x: 20, y: 6 },
                          { x: 20, y: 15 },
                          { x: 27, y: 15 },
                          s.course.cup,
                      ]
                    : [s.course.cup];
            for (const point of waypoints)
                for (let retry = 0; retry < 4 && !s.ball.sunk; retry++) {
                    if (Math.hypot(point.x - s.ball.x, point.y - s.ball.y) < 0.1) break;
                    toward(s, point);
                }
            assert.ok(golfGame.won(s), `${phase}/${variant} remains at ${s.ball.x}, ${s.ball.y}`);
            assert.equal(s.shots, phase === 0 ? 1 : phase === 1 ? 5 : 3);
        }
});
test("a real bank shot rebounds off the boundary and finishes gently in the cup", () => {
    const s = startGolf(golfCourse(0, 0)),
        pad = emptyPad();
    pad.released = { x: -Math.cos(0.93) * 5.2, y: -Math.sin(0.93) * 5.2 };
    golfGame.step(s, pad);
    spent(pad);
    let bounced = false;
    for (let i = 0; i < 1800 && s.moving; i++) {
        bounced ||= s.ball.vy < 0;
        golfGame.step(s, pad);
    }
    assert.ok(bounced);
    assert.ok(s.ball.sunk);
    assert.equal(s.shots, 1);
});
test("a keyboard putt wins the first course and held turn controls cover all directions", () => {
    const s = startGolf(golfCourse(0)),
        pad = emptyPad();
    pad.tapped = true;
    golfGame.step(s, pad);
    spent(pad);
    settle(s, pad);
    assert.ok(s.ball.sunk);
    const turning = startGolf(golfCourse(0)),
        keys = emptyPad();
    keys.holding = ["right"];
    for (let i = 0; i < 252; i++) golfGame.step(turning, keys);
    assert.ok(turning.angle > 2 * Math.PI);
    assert.equal(turning.shots, 0);
    keys.holding = ["left"];
    for (let i = 0; i < 504; i++) golfGame.step(turning, keys);
    assert.ok(turning.angle < -2 * Math.PI);
    assert.equal(turning.shots, 0);
});
test("pointer pulls launch in all four directions with the familiar pull-back mapping", () => {
    for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ]) {
        assert.ok(dx !== undefined && dy !== undefined);
        const s = startGolf(golfCourse(0)),
            pad = emptyPad();
        pad.released = { x: -dx, y: -dy };
        golfGame.step(s, pad);
        assert.ok(s.ball.vx * dx + s.ball.vy * dy > 0);
        assert.equal(s.shots, 1);
    }
});
test("a rolling ball ignores further releases; stopping makes the next putt immediately available", () => {
    const s = startGolf(golfCourse(2)),
        pad = emptyPad();
    pad.released = { x: -4, y: 0 };
    golfGame.step(s, pad);
    spent(pad);
    for (let i = 0; i < 20; i++) {
        pad.tapped = true;
        pad.released = { x: 0, y: -8 };
        golfGame.step(s, pad);
        spent(pad);
    }
    assert.equal(s.shots, 1);
    settle(s);
    assert.ok(!s.ball.sunk);
    assert.match(s.message, /next putt/i);
    assert.ok(golfGame.pullFrom?.(s));
    toward(s, s.course.cup);
    assert.equal(s.shots, 2);
});
test("reduced-motion settlement reaches the same rest position as normal fixed steps", () => {
    const normal = startGolf(golfCourse(2, 2)),
        reduced = startGolf(golfCourse(2, 2));
    const launch = (): Pad => ({ ...emptyPad(), released: { x: -4, y: 1 } });
    const a = launch(),
        b = launch();
    golfGame.step(normal, a);
    spent(a);
    for (let i = 0; i < golfGame.still.press(reduced); i++) {
        golfGame.step(reduced, b);
        spent(b);
    }
    settle(normal, a);
    for (let i = 0; i < 1800 && golfGame.still.settling?.(reduced); i++) golfGame.step(reduced, b);
    assert.deepEqual(reduced, normal);
});
