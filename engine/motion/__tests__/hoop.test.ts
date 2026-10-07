// A ball at a basket: the same throw always flies the same, a clean throw drops through without
// touching the rim, one short on the front of the rim bounces out, one off the board drops in, a fast
// ball never passes through the rim or the board, the net counts a ball once and never one that came
// up from under it, a second hoop scores on its own, backspin checks a bounce, and the net sways and
// settles.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lob } from "../flight";
import type { Pt } from "../geometry";
import {
    freshSensor,
    netAt,
    netPoint,
    stepBall,
    stepNet,
    type Ball,
    type Court,
    type HoopEvent,
} from "../hoop";

const RIM = { x: 38, y: 12.5, half: 1.05, tube: 0.08 };
const BOARD_X = RIM.x + RIM.half + RIM.tube + 0.3;

const court = (more: Partial<Court> = {}): Court => ({
    r: 0.5,
    gravity: 30,
    drag: 0,
    wind: 0,
    floor: 22,
    wall: 44,
    rim: RIM,
    blocks: [
        { kind: "board", x: BOARD_X, y: RIM.y - 4.5, w: 0.3, h: 5.25, bounce: 0.55, grip: 0.3 },
    ],
    rimBounce: 0.55,
    rimGrip: 0.35,
    floorBounce: 0.75,
    floorGrip: 0.4,
    ...more,
});

const HAND: Pt = { x: 31, y: 17.4 };

/** A throw from the hand that passes through `to` at the top of an arc `rise` squares above it. */
const throwAt = (to: Pt, rise: number, spin = 0): Ball => {
    const v = lob(HAND, to, 30, rise).v;
    return { ...HAND, vx: v.x, vy: v.y, spin, turn: 0 };
};

/** Flies a ball for up to `seconds`, until it scores or meets the floor. */
function fly(b: Ball, c = court(), seconds = 4) {
    const s = freshSensor(),
        events: HoopEvent[] = [];
    for (let i = 0; i < 60 * seconds; i++) {
        events.push(...stepBall(b, c, s, 1 / 60));
        if (events.some((e) => e.kind === "floor")) break;
    }
    return { scored: s.scored, events, first: events[0] };
}

test("the same throw flies the same every time", () => {
    const a = throwAt(RIM, 3, -12),
        b = throwAt(RIM, 3, -12);
    const ra = fly(a),
        rb = fly(b);
    assert.equal(JSON.stringify(a), JSON.stringify(b));
    assert.deepEqual(ra.events, rb.events);
});

test("a clean throw drops through the middle without touching the rim or the board", () => {
    const r = fly(throwAt({ x: RIM.x, y: RIM.y }, 3));
    assert.ok(r.scored);
    assert.equal(r.first?.kind, "score");
});

test("a flat throw onto the front of the rim bounces out", () => {
    const r = fly(throwAt({ x: RIM.x - RIM.half - 0.25, y: RIM.y - 0.35 }, 0.6));
    assert.equal(r.first?.kind, "rim");
    assert.ok((r.first?.x ?? 0) < RIM.x, "it met the far edge first");
    assert.ok(!r.scored, "a ball off the front of the rim went in");
});

test("a throw off the board drops into the basket", () => {
    const r = fly(throwAt({ x: BOARD_X - 0.5, y: RIM.y - 1.6 }, 1.2, -10));
    assert.equal(r.first?.kind, "board");
    assert.ok(r.scored, "the bank shot did not go in");
});

test("a fast ball never passes through the rim's edge or the board", () => {
    for (const speed of [30, 60, 90]) {
        const b: Ball = { x: 30, y: RIM.y, vx: speed, vy: 0, spin: 0, turn: 0 };
        const r = fly(b, court({ gravity: 0 }), 1);
        assert.equal(r.first?.kind, "rim", `at ${speed} it missed the rim`);
        assert.ok(b.x < RIM.x, `at ${speed} it passed through the rim`);
        const high: Ball = { x: 30, y: RIM.y - 3, vx: speed, vy: 0, spin: 0, turn: 0 };
        fly(high, court({ gravity: 0 }), 1);
        assert.ok(high.x < BOARD_X, `at ${speed} it passed through the board`);
    }
});

test("the net counts a ball once, and never a ball that came up from under the rim", () => {
    const c = court({ wall: null }),
        s = freshSensor();
    const drop: Ball = { x: RIM.x, y: RIM.y - 3, vx: 0, vy: 0, spin: 0, turn: 0 };
    let scores = 0;
    for (let i = 0; i < 60 * 3; i++) {
        scores += stepBall(drop, c, s, 1 / 60).filter((e) => e.kind === "score").length;
        // carried back above the rim after it falls through, so it drops through again
        if (drop.y > RIM.y + 3) Object.assign(drop, { y: RIM.y - 3, vy: 0 });
    }
    assert.equal(scores, 1);
    const up: Ball = { x: RIM.x, y: RIM.y + 2, vx: 0, vy: -14, spin: 0, turn: 0 },
        u = freshSensor();
    let upScores = 0;
    for (let i = 0; i < 60 * 3; i++)
        upScores += stepBall(up, c, u, 1 / 60).filter((e) => e.kind === "score").length;
    assert.equal(upScores, 0, "a ball up through the bottom and back down scored");
});

test("backspin checks a ball's run after it bounces", () => {
    const after = (spin: number) => {
        const b: Ball = { x: 0, y: 15, vx: 8, vy: 0, spin, turn: 0 };
        const c = court({ wall: null, blocks: [], rim: { ...RIM, x: -50 } });
        let bounced = false;
        for (let i = 0; i < 60 * 3; i++) {
            if (stepBall(b, c, freshSensor(), 1 / 60).some((e) => e.kind === "floor")) {
                if (bounced) break;
                bounced = true;
            }
        }
        return b.x;
    };
    assert.ok(after(-16) < after(0) - 0.5, "backspin did not check the bounce");
    assert.ok(after(16) > after(0) + 0.5, "topspin did not run on");
});

test("the net gives as a ball goes through and settles back to hang still", () => {
    const n = netAt(RIM),
        rest = netPoint(n, 0, 3);
    const ball = { x: RIM.x - 0.1, y: RIM.y };
    let moved = 0;
    for (let i = 0; i < 20; i++) {
        ball.y += 0.2;
        stepNet(n, RIM, ball, 0.6, 0, 1 / 60);
        const p = netPoint(n, 0, 3);
        moved = Math.max(moved, Math.hypot(p.x - rest.x, p.y - rest.y));
    }
    assert.ok(moved > 0.1, "the ball did not move the net");
    for (let i = 0; i < 60 * 4; i++) stepNet(n, RIM, null, 0.5, 0, 1 / 60);
    const p = netPoint(n, 0, 3);
    assert.ok(Math.hypot(p.x - rest.x, p.y - rest.y) < 0.05, "the net did not settle");
    assert.deepEqual(netPoint(n, 0, 0), { x: RIM.x - RIM.half, y: RIM.y });
});

test("a second hoop scores on its own, and says which hoop the ball went through", () => {
    const low = { ...RIM, x: 30, y: 16 };
    const c = court({ wall: null, rims: [low] }),
        s = freshSensor();
    const drop: Ball = { x: low.x, y: low.y - 3, vx: 0, vy: 0, spin: 0, turn: 0 };
    const scores: HoopEvent[] = [];
    for (let i = 0; i < 60 * 2; i++)
        scores.push(...stepBall(drop, c, s, 1 / 60).filter((e) => e.kind === "score"));
    assert.equal(scores.length, 1);
    assert.equal(s.hoop, 1);
    assert.deepEqual(scores[0], { kind: "score", x: scores[0]?.x, y: low.y, hoop: 1 });
});
