// The pinball table's physics: a ball at the top speed never passes through a wall, a swung flipper
// sends a ball back up, a bumper kicks a ball away faster than it came, a saucer holds and kicks out,
// a ramp carries the ball along its path, a lane is counted once on entering, and the same hands give
// the same table.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SUB, TOP, liveOf, stepTable, type Ball, type Hit, type Table } from "../pinball";

const empty = (): Table => ({
    walls: [],
    posts: [],
    flippers: [],
    targets: [],
    sensors: [],
    spinners: [],
    saucers: [],
    ramps: [],
    gravity: 0,
    drain: 100,
    r: 0.55,
});

const ball = (x: number, y: number, vx: number, vy: number): Ball => ({
    x,
    y,
    vx,
    vy,
    mode: "free",
    t: 0,
    on: null,
});

function run(b: Ball, t: Table, seconds: number, held = { left: false, right: false }): Hit[] {
    const live = liveOf(t),
        hits: Hit[] = [];
    for (let i = 0; i < seconds * SUB; i++) hits.push(...stepTable(b, t, live, held, 1 / SUB));
    return hits;
}

test("a ball at the top speed never passes through a wall, from any angle", () => {
    const t = { ...empty(), walls: [{ a: { x: -50, y: 0 }, b: { x: 50, y: 0 } }] };
    for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI - Math.PI,
            b = ball(0, -3, Math.cos(a) * TOP, -Math.abs(Math.sin(a)) * TOP - 0.1);
        b.vy = Math.abs(b.vy);
        run(b, t, 1);
        assert.ok(b.y <= -t.r + 1e-6, `crossed at angle ${a.toFixed(2)}: y ${b.y}`);
    }
});

test("a swung flipper sends a ball resting on it back up the table", () => {
    const t = {
        ...empty(),
        gravity: 13,
        flippers: [{ side: "left" as const, x: 0, y: 0, len: 3.25, r: 0.42, rest: 0.5, up: -0.42 }],
    };
    const b = ball(2.2, -0.2, 0, 0);
    run(b, t, 0.4);
    const before = b.y;
    run(b, t, 0.3, { left: true, right: false });
    assert.ok(b.vy < -8, `going up at ${b.vy}`);
    assert.ok(b.y < before - 1);
});

test("a bumper kicks a slow ball away faster than it came, and a post does not", () => {
    const bumper = { ...empty(), posts: [{ id: "b", x: 0, y: 0, r: 1, kick: 9 }] },
        post = { ...empty(), posts: [{ id: "p", x: 0, y: 0, r: 1 }] };
    const a = ball(-3, 0, 2, 0),
        b = ball(-3, 0, 2, 0);
    const hits = run(a, bumper, 2);
    run(b, post, 2);
    assert.ok(hits.some((h) => h.kind === "post" && h.kick));
    assert.ok(Math.hypot(a.vx, a.vy) > 8);
    assert.ok(Math.hypot(b.vx, b.vy) <= 2);
});

test("a saucer holds the ball, then kicks it out; a ramp carries it along its path", () => {
    const t = {
        ...empty(),
        saucers: [{ id: "hive", x: 0, y: 0, r: 0.75, hold: 0.5, out: { x: -9, y: -11 } }],
    };
    const b = ball(-2, 0, 4, 0);
    const hits = run(b, t, 0.6);
    assert.ok(hits.some((h) => h.kind === "saucer"));
    assert.equal(b.mode, "saucer");
    run(b, t, 0.5);
    assert.equal(b.mode, "free");
    assert.ok(b.vx < 0 && b.vy < 0);
    const r = {
        ...empty(),
        ramps: [
            {
                id: "can",
                entry: { x: -1, y: -1, w: 2, h: 2 },
                path: [
                    { x: 0, y: 0 },
                    { x: 0, y: -10 },
                ],
                time: 1,
                out: { x: 3, y: 0 },
            },
        ],
    };
    const c = ball(0, 0.5, 0, -8);
    const rode = run(c, r, 1.2);
    assert.ok(rode.some((h) => h.kind === "ramp"));
    assert.ok(c.y < -9);
});

test("a lane is counted once as the ball enters it, and a drained ball is gone", () => {
    const t = { ...empty(), sensors: [{ id: "lane", x: -1, y: -1, w: 2, h: 2 }], drain: 5 };
    const b = ball(0, -3, 0, 4);
    const hits = run(b, t, 3);
    assert.equal(hits.filter((h) => h.kind === "sensor").length, 1);
    assert.equal(b.mode, "gone");
    assert.ok(hits.some((h) => h.kind === "drain"));
});

test("the same hands on the same table give the same table", () => {
    const t = {
        ...empty(),
        gravity: 13,
        walls: [
            { a: { x: -6, y: -10 }, b: { x: -6, y: 10 } },
            { a: { x: 6, y: -10 }, b: { x: 6, y: 10 } },
        ],
        posts: [{ id: "b", x: 0, y: 0, r: 1, kick: 9, move: { dx: 2, period: 3 } }],
    };
    const go = () => {
        const b = ball(-1, -8, 3, 0);
        run(b, t, 2);
        return b;
    };
    assert.deepEqual(go(), go());
});
