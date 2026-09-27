import assert from "node:assert/strict";
import { test } from "node:test";
import { bodies, isBodies } from "../bodies";

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

test("a ray down finds the top of what is below, and a carried body carries what rests on it", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    const log = w.box({ x: 5, y: 10, w: 6, h: 1, carried: true });
    const crate = w.box({ x: 5, y: 8.9, w: 1, h: 1 });
    for (let i = 0; i < 30; i++) w.step(1 / 60);
    const hit = w.rayDown(5, 0, 20);
    assert.ok(hit && hit.body === crate && Math.abs(hit.y - 8.5) < 0.05, JSON.stringify(hit));
    assert.equal(w.rayDown(20, 0, 20), null);
    for (let i = 0; i < 120; i++) {
        w.launch(log, { x: 1, y: 0 });
        w.step(1 / 60);
    }
    assert.ok(Math.abs(w.where(log).x - 7) < 0.05, "the game moved the log two squares");
    assert.ok(w.where(crate).x > 6.5, `and the crate rode along, to ${w.where(crate).x}`);
});

test("a rope holds a weight at its length and a weld makes two bodies one", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    const hook = w.box({ x: 0, y: 0, w: 0.5, h: 0.5, fixed: true });
    const load = w.box({ x: 0, y: 2, w: 1, h: 1 });
    w.rope(hook, load, { at: { x: 0, y: 0 }, to: { x: 0, y: 2 }, length: 3 });
    for (let i = 0; i < 120; i++) w.step(1 / 60);
    assert.ok(Math.abs(w.where(load).y - 3) < 0.1, `hangs at ${w.where(load).y}`);
    const a = w.box({ x: 10, y: 5, w: 2, h: 0.5 }),
        b = w.box({ x: 11.5, y: 5, w: 1, h: 0.5 });
    w.ground({ y: 20, from: -20, to: 40 });
    w.weld(a, b, { x: 11, y: 5 });
    for (let i = 0; i < 90; i++) w.step(1 / 60);
    const pa = w.where(a),
        pb = w.where(b);
    assert.ok(Math.abs(Math.hypot(pb.x - pa.x, pb.y - pa.y) - 1.5) < 0.05, "they fell as one");
});

test("a wedge and an arch stand on the ground, and a block rests on the arch over its opening", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    w.ground({ y: 10, from: -20, to: 20 });
    const roof = w.poly({
        x: -6,
        y: 9,
        points: [
            { x: -2, y: 1 },
            { x: 2, y: 1 },
            { x: 0, y: -1 },
        ],
    });
    // an arch three wide and two tall with a square opening, as three pieces of one body
    const arch = w.compound({
        x: 4,
        y: 9,
        parts: [
            { box: { x: -1, y: 0.5, w: 1, h: 1 } },
            { box: { x: 1, y: 0.5, w: 1, h: 1 } },
            { box: { x: 0, y: -0.5, w: 3, h: 1 } },
        ],
    });
    const top = w.box({ x: 4, y: 6, w: 1, h: 1 });
    for (let i = 0; i < 240; i++) w.step(1 / 60);
    assert.ok(Math.abs(w.where(roof).y - 9) < 0.05, `the wedge sits at ${w.where(roof).y}`);
    assert.ok(Math.abs(w.where(top).y - 7.5) < 0.05, `the block rests at ${w.where(top).y}`);
    assert.equal(w.outline(arch).length, 3, "an arch is outlined piece by piece");
    assert.equal(w.rayDown(4, 0, 20)?.body, top);
    assert.equal(
        w.rayDown(4, 8.2, 20)?.y,
        10,
        "and under the arch there is room down to the ground",
    );
});

test("a hinge swings a door within its limits, and a motor drives it", () => {
    const w = bodies({ gravity: { x: 0, y: 0 } });
    const door = w.box({ x: 1, y: 0, w: 2, h: 0.2 });
    const j = w.hinge(
        null,
        door,
        { x: 0, y: 0 },
        { lower: 0, upper: Math.PI / 2, motor: { speed: 2, most: 50 } },
    );
    for (let i = 0; i < 120; i++) w.step(1 / 60);
    assert.ok(Math.abs(w.travel(j) - Math.PI / 2) < 0.05, `it opened to ${w.travel(j)}`);
    w.drive(j, -2);
    for (let i = 0; i < 120; i++) w.step(1 / 60);
    assert.ok(Math.abs(w.travel(j)) < 0.05, `and shut to ${w.travel(j)}`);
});

test("a slider moves only along its groove, and a pulley lifts one side as the other falls", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    const lift = w.box({ x: 0, y: 0, w: 1, h: 1 });
    const s = w.slider(null, lift, {
        at: { x: 0, y: 0 },
        axis: { x: 0, y: 1 },
        lower: 0,
        upper: 3,
    });
    w.launch(lift, { x: 5, y: 0 });
    for (let i = 0; i < 120; i++) w.step(1 / 60);
    assert.ok(Math.abs(w.where(lift).x) < 1e-6, "it did not move sideways");
    assert.ok(
        Math.abs(w.travel(s) - 3) < 0.02,
        `it fell to the end of its groove at ${w.travel(s)}`,
    );
    const heavy = w.box({ x: 10, y: 5, w: 1, h: 1, density: 3 }),
        light = w.box({ x: 14, y: 5, w: 1, h: 1, density: 1 });
    w.pulley(heavy, light, {
        over: { x: 10, y: 0 },
        overB: { x: 14, y: 0 },
        at: { x: 10, y: 4.5 },
        to: { x: 14, y: 4.5 },
    });
    for (let i = 0; i < 30; i++) w.step(1 / 60);
    const down = w.where(heavy).y - 5,
        up = 5 - w.where(light).y;
    assert.ok(down > 0.3 && Math.abs(down - up) < 0.02, `down ${down}, up ${up}`);
});

test("a joint that is pulled too hard breaks and says so, once", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    const shelf = w.box({ x: 0, y: 0, w: 1, h: 1, fixed: true });
    const load = w.box({ x: 0, y: 2, w: 1, h: 1, density: 1 });
    const rope = w.rope(shelf, load, {
        at: { x: 0, y: 0 },
        to: { x: 0, y: 2 },
        length: 2,
        breaks: 45,
    });
    let broke: unknown[] = [];
    for (let i = 0; i < 60 && !broke.length; i++) {
        w.step(1 / 60);
        broke = w.broken();
    }
    assert.deepEqual(broke, [], "a one square load weighs 30 and the rope holds it");
    const heavy = w.box({ x: 0, y: 3, w: 1, h: 1, density: 4 });
    w.weld(load, heavy, { x: 0, y: 2.5 });
    for (let i = 0; i < 60 && !broke.length; i++) {
        w.step(1 / 60);
        broke = w.broken();
    }
    assert.deepEqual(broke, [rope]);
    w.step(1 / 60);
    assert.deepEqual(w.broken(), []);
});

test("a spring pulls back to its length, and a chain hangs between two posts", () => {
    const w = bodies({ gravity: { x: 0, y: 0 } });
    const bob = w.ball({ x: 5, y: 0, r: 0.3 });
    w.spring(null, bob, { at: { x: 0, y: 0 }, to: { x: 5, y: 0 }, length: 2, hz: 2, damping: 1 });
    for (let i = 0; i < 180; i++) w.step(1 / 60);
    assert.ok(Math.abs(w.where(bob).x - 2) < 0.05, `it settled at ${w.where(bob).x}`);
    const g = bodies({ gravity: { x: 0, y: 30 } });
    const links = g.chain({
        from: { x: 0, y: 0 },
        to: { x: 8, y: 0 },
        links: 8,
        length: 10,
        b: null,
    });
    for (let i = 0; i < 240; i++) g.step(1 / 60);
    const middle = links[4];
    assert.ok(middle && g.where(middle).y > 0.5, "it sags in the middle");
    const ends = links[7];
    assert.ok(ends && Math.abs(g.where(ends).x - 7.5) < 0.6, "and is held at both posts");
});

test("groups pass through what they ignore, and a body at rest goes to sleep", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    w.box({ x: 0, y: 5, w: 10, h: 1, fixed: true, group: "grate" });
    const water = w.ball({ x: 0, y: 0, r: 0.3, ignores: ["grate"] });
    const marble = w.ball({ x: 2, y: 0, r: 0.3 });
    for (let i = 0; i < 180; i++) w.step(1 / 60);
    assert.ok(w.where(water).y > 6, "the drop fell through the grate");
    assert.ok(Math.abs(w.where(marble).y - 4.2) < 0.05, "the marble rests on it");
    assert.equal(w.asleep(marble), true);
    assert.deepEqual(w.census(), { moving: 2, awake: 1 });
});

test("water floats a light raft with part of it under, sinks a heavy stone, and lists a raft loaded at one end", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    w.water({ y: 10, from: -20, to: 20, density: 2, drag: 4 });
    const raft = w.box({ x: 0, y: 8, w: 4, h: 1, density: 1 });
    const stone = w.box({ x: 10, y: 8, w: 1, h: 1, density: 5 });
    for (let i = 0; i < 300; i++) w.step(1 / 60);
    assert.ok(Math.abs(w.wet(raft) - 0.5) < 0.05, `half the raft is under: ${w.wet(raft)}`);
    assert.ok(w.where(stone).y > 12, "the stone sank");
    const load = w.box({ x: 1.5, y: w.where(raft).y - 1, w: 1, h: 1, density: 1.5 });
    for (let i = 0; i < 300; i++) w.step(1 / 60);
    assert.ok(w.where(raft).angle > 0.03, `it lists towards the load: ${w.where(raft).angle}`);
    assert.ok(w.where(load).y < 11, "and still floats");
});

test("water with a surface that moves lifts a raft where the surface is higher", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    w.water({ y: 10, from: -20, to: 20, density: 2, drag: 4, at: (x) => 10 - x * 0.05 });
    const raft = w.box({ x: 0, y: 9.5, w: 4, h: 1, density: 1 });
    for (let i = 0; i < 300; i++) w.step(1 / 60);
    assert.ok(w.where(raft).angle < -0.02, `it tips with the surface: ${w.where(raft).angle}`);
});

test("a survey gives every body's outline and state and every joint's ends, for the inspector", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    w.ground({ y: 10, from: -10, to: 10 });
    const box = w.box({ x: 0, y: 9.5, w: 1, h: 1 });
    const ball = w.ball({ x: 4, y: 5, r: 0.5 });
    w.hinge(null, ball, { x: 4, y: 4 });
    const first = w.survey();
    assert.equal(first.bodies.length, 3);
    assert.deepEqual(first.bodies.map((b) => b.state).sort(), ["awake", "awake", "fixed"]);
    assert.equal(first.joints.length, 1);
    assert.equal(first.joints[0]?.kind, "hinge");
    assert.ok(Math.abs((first.joints[0]?.a.x ?? 0) - 4) < 1e-6);
    for (let i = 0; i < 600; i++) w.step(1 / 60);
    assert.ok(w.asleep(box), "the box on the ground has gone to sleep");
    assert.ok(w.survey().bodies.some((b) => b.state === "asleep"));
    assert.ok(isBodies(w));
    assert.ok(!isBodies({ survey: () => first }));
});

test("a breakable wall stands as one, and a hard hit breaks its joins", () => {
    const build = () => {
        const w = bodies({ gravity: { x: 0, y: 30 } });
        w.ground({ y: 10, from: -20, to: 20 });
        const blocks = w.breakable({
            x: 0,
            y: 7.5,
            cols: 2,
            rows: 5,
            size: 1,
            breaks: 1000,
            density: 3,
        });
        return { w, blocks };
    };
    const still = build();
    assert.equal(still.blocks.length, 10);
    let broke = 0;
    for (let i = 0; i < 300; i++) {
        still.w.step(1 / 60);
        broke += still.w.broken().length;
    }
    assert.equal(broke, 0);
    const hit = build();
    const ball = hit.w.ball({ x: -6, y: 7, r: 0.6, density: 5, fast: true });
    hit.w.launch(ball, { x: 40, y: 0 });
    broke = 0;
    for (let i = 0; i < 120; i++) {
        hit.w.step(1 / 60);
        broke += hit.w.broken().length;
    }
    assert.ok(broke >= 3, `joins broke: ${broke}`);
});

test("every body's outline is there for drops to run over, the ground as a line, and a spinning body's surface moves", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    w.ground({ y: 10, from: 0, to: 20 });
    const wheel = w.box({ x: 5, y: 5, w: 4, h: 0.4 });
    w.hinge(null, wheel, { x: 5, y: 5 });
    w.launch(wheel, { x: 0, y: 0 }, 2);
    const solids = w.solids();
    assert.equal(solids.length, 2);
    assert.ok(solids.some((s) => !s.moving && s.outline[0]?.length === 2));
    assert.ok(solids.some((s) => s.moving && s.outline[0]?.length === 4));
    const v = w.velocityAt(wheel, { x: 7, y: 5 });
    assert.ok(
        Math.abs(v.y - 4) < 1e-6,
        `the end of a bar turning at two a second moves at four: ${v.y}`,
    );
});
