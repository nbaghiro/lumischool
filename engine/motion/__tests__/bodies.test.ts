import assert from "node:assert/strict";
import { test } from "node:test";
import { bodies } from "../bodies";

test("a world of bodies stepped twice from the same start ends in the same place, body for body", () => {
    const run = () => {
        const w = bodies({ gravity: { x: 0, y: 30 } });
        w.ground({ y: 10, from: -10, to: 30 });
        const tower = [0, 1, 2, 3].map((i) => w.box({ x: 12, y: 9.5 - i, w: 2, h: 0.96 }));
        const ball = w.ball({ x: 2, y: 5, r: 0.6, density: 5, fast: true });
        w.launch(ball, { x: 30, y: 0 });
        let hardest = 0;
        for (let i = 0; i < 240; i++) hardest = Math.max(hardest, w.step(1 / 60));
        return { at: [...tower, ball].map((b) => w.where(b)), hardest };
    };
    const a = run(),
        b = run();
    assert.deepEqual(a.at, b.at);
    assert.ok(a.hardest > 0, "the ball hit the tower");
    assert.ok(
        a.at
            .slice(0, 4)
            .some((p, i) => Math.abs(p.x - 12) > 0.3 || Math.abs(p.y - (9.5 - i)) > 0.3),
        "and knocked it about",
    );
});

test("a wall turned to any angle is as solid as a straight one, in a world with no gravity", () => {
    const w = bodies({ gravity: { x: 0, y: 0 } });
    // a slanted wall from (0, 0) to (6, 6), as a pen's side is
    w.box({ x: 3, y: 3, w: Math.hypot(6, 6), h: 0.3, angle: Math.PI / 4, fixed: true });
    const ball = w.ball({ x: 1, y: 4, r: 0.7, upright: true });
    for (let i = 0; i < 240; i++) {
        w.launch(ball, { x: 4, y: -4 });
        w.step(1 / 60);
    }
    const at = w.where(ball);
    assert.ok(
        at.y - at.x > 0.5,
        `pushed into the wall for four seconds and it stayed below it at ${at.x.toFixed(2)}, ${at.y.toFixed(2)}`,
    );
    assert.equal(at.angle, 0, "an upright body never turns");
});

test("a body put somewhere is there and still, and a sensor notices what comes into it", () => {
    const w = bodies({ gravity: { x: 0, y: 0 } });
    const pen = w.box({ x: 10, y: 0, w: 4, h: 4, sensor: true });
    const ball = w.ball({ x: 0, y: 0, r: 0.5 });
    w.launch(ball, { x: 5, y: 0 });
    w.moveTo(ball, { x: 3, y: 0 });
    assert.deepEqual([w.where(ball).x, w.velocity(ball).x], [3, 0]);
    w.launch(ball, { x: 6, y: 0 });
    for (let i = 0; i < 90 && !w.touching(pen).length; i++) w.step(1 / 60);
    assert.deepEqual(w.touching(pen), [ball]);
    assert.ok(Math.abs(w.velocity(ball).x - 6) < 1e-6, "a sensor lets it through");
});

test("a hit is reported with how fast the two were closing, and a sprung hinge comes back to level", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    const floor = w.ground({ y: 10, from: -10, to: 10 });
    w.ball({ x: 0, y: 5, r: 0.5 });
    let hit = null as { speed: number } | null;
    for (let i = 0; i < 120 && !hit; i++) {
        w.step(1 / 60);
        hit = w.hits().find((h) => h.a === floor || h.b === floor) ?? null;
    }
    assert.ok(hit && hit.speed > 10 && hit.speed < 20, `closing at ${hit?.speed}`);
    const plank = w.box({
        x: 20,
        y: 0,
        w: 6,
        h: 0.4,
        angle: 0.3,
        hinge: { at: { x: 20, y: 0 }, lower: -0.5, upper: 0.5, spring: { k: 400, damping: 60 } },
    });
    for (let i = 0; i < 600; i++) w.step(1 / 60);
    assert.ok(Math.abs(w.where(plank).angle) < 0.02, `it settles at ${w.where(plank).angle}`);
});

test("a body taken out of the world is gone, and asking about it says so", () => {
    const w = bodies({ gravity: { x: 0, y: 0 } });
    const pen = w.box({ x: 0, y: 0, w: 4, h: 4, sensor: true });
    const ball = w.ball({ x: 0, y: 0, r: 0.5 });
    for (let i = 0; i < 4; i++) w.step(1 / 60);
    assert.deepEqual(w.touching(pen), [ball]);
    w.remove(ball);
    assert.deepEqual(w.touching(pen), []);
    assert.throws(() => w.where(ball), /not in this world/);
});

test("a push moves a body through its centre, and a push at one end turns it", () => {
    const w = bodies({ gravity: { x: 0, y: 0 } });
    const raft = w.box({ x: 0, y: 0, w: 6, h: 0.5 });
    for (let i = 0; i < 30; i++) {
        w.push(raft, { x: 0, y: -20 });
        w.step(1 / 60);
    }
    assert.ok(w.where(raft).y < -0.2, "it rose");
    assert.ok(Math.abs(w.where(raft).angle) < 1e-6, "and stayed level");
    for (let i = 0; i < 30; i++) {
        w.pushAt(raft, { x: 0, y: -20 }, { x: 3, y: 0 });
        w.step(1 / 60);
    }
    assert.ok(Math.abs(w.where(raft).angle) > 0.01, "a push at one end tips it");
});

test("gravity can be turned while the world runs, and a body at rest is not moving", () => {
    const w = bodies({ gravity: { x: 0, y: 0 } });
    const ball = w.ball({ x: 0, y: 0, r: 0.5, damping: { move: 6 } });
    for (let i = 0; i < 30; i++) w.step(1 / 60);
    assert.equal(w.moving(ball), false);
    w.gravity({ x: 40, y: 0 });
    for (let i = 0; i < 30; i++) w.step(1 / 60);
    assert.ok(w.velocity(ball).x > 1, "it is pulled the way gravity now goes");
    assert.equal(w.moving(ball), true);
});
