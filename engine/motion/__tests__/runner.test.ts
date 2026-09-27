import assert from "node:assert/strict";
import { test } from "node:test";
import {
    grounded,
    runner,
    seek,
    stepRunner,
    type Course,
    type Intent,
    type Moves,
    type Ran,
    type Runner,
    type Surface,
} from "../walker";

const M: Moves = {
    speed: 5,
    accel: 60,
    airAccel: 30,
    gravity: 60,
    jump: 3,
    cut: 3,
    coyote: 0.1,
    buffer: 0.12,
    step: 0.3,
    fall: 25,
    climb: 3,
    pace: 0.8,
    height: 2,
};
const DT = 1 / 60;

/** Flat pieces of floor, each from `a` to `b` at height `y`. */
interface Piece extends Surface {
    a: number;
    b: number;
}

const floorOf =
    (pieces: Piece[]): Course["floor"] =>
    (x, from, to) => {
        let best: Surface | null = null;
        for (const p of pieces)
            if (x >= p.a && x <= p.b && p.y >= from && p.y <= to && (!best || p.y < best.y))
                best = p;
        return best;
    };

const idle: Intent = { run: 0, jump: false, jumped: false };

function run(r: Runner, c: Course, intents: (k: number) => Intent, steps: number): Ran[] {
    const seen: Ran[] = [];
    for (let k = 0; k < steps; k++) seen.push(...stepRunner(r, intents(k), c, M, DT));
    return seen;
}

test("a runner speeds up to its running speed, and a wall stops it", () => {
    const c: Course = {
        floor: floorOf([{ a: 0, b: 50, y: 10 }]),
        solid: (x, y) => x >= 8 && y < 10,
    };
    const r = runner(1, 10);
    run(r, c, () => ({ run: 1, jump: false, jumped: false }), 12);
    assert.equal(r.state, "run");
    assert.equal(r.vx, 5);
    const seen = run(r, c, () => ({ run: 1, jump: false, jumped: false }), 120);
    assert.ok(seen.includes("bumped"));
    assert.ok(r.x < 8 && r.x > 7.5, `stopped at ${r.x}`);
});

test("a held jump rises its full height and a tapped one is a small hop", () => {
    const c: Course = { floor: floorOf([{ a: 0, b: 50, y: 10 }]) };
    const top = (hold: number): number => {
        const r = runner(1, 10);
        let high = 10;
        for (let k = 0; k < 120; k++) {
            stepRunner(r, { run: 0, jump: k < hold, jumped: k === 0 }, c, M, DT);
            high = Math.min(high, r.y);
        }
        assert.equal(r.y, 10, "it came down again");
        return 10 - high;
    };
    assert.ok(Math.abs(top(60) - M.jump) < 0.1, `held: ${top(60)}`);
    assert.ok(top(2) < M.jump / 2, `tapped: ${top(2)}`);
});

test("a press just before landing is kept, and a jump just after running off an edge still works", () => {
    const c: Course = { floor: floorOf([{ a: 0, b: 50, y: 10 }]) };
    const r = runner(1, 7);
    r.state = "fall";
    const seen = run(r, c, (k) => ({ run: 0, jump: true, jumped: k === 20 }), 60);
    assert.deepEqual(
        seen.filter((e) => e === "landed" || e === "jumped"),
        ["landed", "jumped", "landed"],
        "the early press became a jump on landing",
    );

    const edge: Course = {
        floor: floorOf([
            { a: 0, b: 5, y: 10 },
            { a: 7, b: 20, y: 10 },
        ]),
    };
    const r2 = runner(4, 10);
    let left = -1;
    const trail: Ran[] = [];
    for (let k = 0; k < 90; k++) {
        const e = stepRunner(
            r2,
            { run: 1, jump: true, jumped: left >= 0 && k === left + 3 },
            edge,
            M,
            DT,
        );
        if (e.includes("left")) left = k;
        trail.push(...e);
    }
    assert.ok(trail.includes("left"));
    assert.ok(trail.includes("jumped"), "a jump three steps after the edge still went");
    assert.ok(r2.x > 7 && r2.y === 10, `it crossed the gap to ${r2.x}`);
});

test("a one-way floor is jumped up through and stood on, and dropped through on asking", () => {
    const c: Course = {
        floor: floorOf([
            { a: 0, b: 50, y: 10 },
            { a: 0, b: 50, y: 8, oneWay: true },
        ]),
    };
    const r = runner(1, 10);
    run(r, c, (k) => ({ run: 0, jump: true, jumped: k === 0 }), 90);
    assert.equal(r.y, 8, "it landed on the shelf");
    const seen = run(r, c, (k) => ({ run: 0, jump: false, jumped: false, drop: k === 0 }), 60);
    assert.ok(seen.includes("dropped"));
    assert.equal(r.y, 10, "and dropped back to the floor");
});

test("a moving floor carries what stands on it", () => {
    let t = 0;
    const c: Course = {
        floor: (x, from, to) => {
            const a = 2 + t * 2;
            const y = 10;
            return x >= a && x <= a + 4 && y >= from && y <= to ? { y, vx: 2 } : null;
        },
    };
    const r = runner(3, 10);
    for (let k = 0; k < 60; k++) {
        t += DT;
        stepRunner(r, idle, c, M, DT);
    }
    assert.ok(Math.abs(r.x - 5) < 0.05, `it rode to ${r.x}`);
    assert.ok(grounded(r));
});

test("a ladder is climbed to the floor at its top", () => {
    const c: Course = {
        floor: floorOf([
            { a: 0, b: 50, y: 10 },
            { a: 0, b: 50, y: 5, oneWay: true },
        ]),
        ladder: (x, y) => x > 2.5 && x < 3.5 && y > 5 - 0.2 && y <= 10,
    };
    const r = runner(3, 10);
    const seen = run(r, c, () => ({ run: 0, jump: false, jumped: false, climb: -1 }), 180);
    assert.ok(seen.includes("grabbed"));
    assert.equal(r.state, "stand");
    assert.equal(r.y, 5);
});

test("seek jumps up onto a ledge on the way to a place", () => {
    const c: Course = {
        floor: floorOf([
            { a: 0, b: 50, y: 10 },
            { a: 8, b: 12, y: 8, oneWay: true },
        ]),
    };
    const r = runner(1, 10);
    for (let k = 0; k < 240; k++) stepRunner(r, seek(r, 10, c, M), c, M, DT);
    assert.ok(Math.abs(r.x - 10) <= 0.2, `it reached ${r.x}`);
    assert.equal(r.y, 8);
});

// A recorded run over a course with a gap, a one-way shelf, a drop and a wall: the same presses always end in the same place.
test("replay: a recorded run over the course ends where it ended when it was recorded", () => {
    const course = (): Course => ({
        floor: floorOf([
            { a: 0, b: 6, y: 10 },
            { a: 8, b: 14, y: 10 },
            { a: 10, b: 13, y: 7.8, oneWay: true },
            { a: 16, b: 30, y: 9 },
            { a: 22, b: 23, y: 7 },
        ]),
        solid: (x, y) => x >= 22 && x <= 23 && y < 9 && y > 7,
    });
    const JUMPS = [54, 102, 151, 240],
        DROP = 131;
    const presses = (k: number): Intent => ({
        run: k < 290 ? 1 : 0,
        jump: JUMPS.some((j) => k >= j && k < j + 30),
        jumped: JUMPS.includes(k),
        drop: k === DROP,
    });
    const once = (): { r: Runner; seen: Ran[] } => {
        const r = runner(1, 10);
        const seen = run(r, course(), presses, 330);
        return { r, seen };
    };
    const a = once(),
        b = once();
    assert.deepEqual(a, b);
    assert.equal(a.seen.filter((e) => e === "jumped").length, 4);
    assert.ok(a.seen.includes("dropped"));
    assert.ok(Math.abs(a.r.x - 25.1667) < 1e-3 && a.r.y === 9, `it ends at ${a.r.x}, ${a.r.y}`);
});
