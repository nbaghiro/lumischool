// A peg board's physics: a marble at the top speed never passes through a round peg, a long one or a
// wall; it rolls along a slanted peg, turning as it goes; a spinning marble kicks sideways off a peg
// it lands on square; a marble dropped into the bucket's mouth is caught and one onto its rim bounces;
// moving and turning pegs stand where their clock puts them; and the same board gives the same fall.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SUB } from "../pinball";
import {
    TOP,
    bucketAt,
    endsOf,
    liveOf,
    pegAt,
    stepBoard,
    type Board,
    type Hit,
    type Marble,
    type Peg,
} from "../pegs";

const board = (pegs: Peg[], gravity = 0): Board => ({
    pegs,
    walls: [],
    bucket: null,
    gravity,
    drain: 100,
    r: 0.5,
});

const marble = (x: number, y: number, vx: number, vy: number, w = 0): Marble => ({
    x,
    y,
    vx,
    vy,
    w,
    a: 0,
    mode: "free",
});

function run(m: Marble, b: Board, seconds: number): Hit[] {
    const live = liveOf(),
        hits: Hit[] = [];
    for (let i = 0; i < seconds * SUB; i++) hits.push(...stepBoard(m, b, live, 1 / SUB));
    return hits;
}

test("a marble at the top speed never passes through a round peg, a long one or a wall, from any angle", () => {
    const round: Peg = { id: "r", x: 0, y: 0, r: 0.72 },
        long = (a: number): Peg => ({
            id: "l",
            x: 0,
            y: 0,
            r: 0.35,
            long: { len: 4, angle: a + Math.PI / 2 },
        });
    for (let k = 0; k < 48; k++) {
        const a = (k / 48) * Math.PI * 2,
            dx = Math.cos(a),
            dy = Math.sin(a);
        // each met head on, so a marble on the far side could only have gone through
        for (const p of [round, long(a)]) {
            const b = board([p]),
                m = marble(-dx * 4, -dy * 4, dx * TOP, dy * TOP),
                live = liveOf();
            for (let i = 0; i < SUB / 2; i++) {
                stepBoard(m, b, live, 1 / SUB);
                const q = p.long
                    ? (() => {
                          const [e0, e1] = endsOf(p, live.t),
                              ex = e1.x - e0.x,
                              ey = e1.y - e0.y,
                              t = Math.max(
                                  0,
                                  Math.min(
                                      1,
                                      ((m.x - e0.x) * ex + (m.y - e0.y) * ey) / (ex * ex + ey * ey),
                                  ),
                              );
                          return { x: e0.x + ex * t, y: e0.y + ey * t };
                      })()
                    : { x: p.x, y: p.y };
                assert.ok(
                    Math.hypot(m.x - q.x, m.y - q.y) >= p.r + b.r - 1e-6,
                    `inside the ${p.id} peg from angle ${k}`,
                );
            }
            // it came back out the way it went in, never through to the far side
            assert.ok(m.x * dx + m.y * dy < 0, `through the ${p.id} peg from angle ${k}`);
        }
        const wall: Board = { ...board([]), walls: [{ a: { x: 0, y: -50 }, b: { x: 0, y: 50 } }] },
            m = marble(-3, 0, TOP, dy * 5);
        run(m, wall, 0.5);
        assert.ok(m.x < 0, `through the wall at angle ${k}`);
    }
});

test("a marble rolls down a slanted long peg, turning as it rolls", () => {
    const shelf: Peg = { id: "s", x: 0, y: 0, r: 0.35, long: { len: 12, angle: 0.25 } },
        b = board([shelf], 18),
        m = marble(-4, -1.9, 0, 0);
    run(m, b, 0.8);
    assert.ok(m.vx > 1, "it rolls down the slope");
    // rolling, not sliding: the turn carries the speed along the shelf
    const along = m.vx * Math.cos(0.25) + m.vy * Math.sin(0.25);
    assert.ok(
        Math.abs(m.w * b.r - along) < 0.25 * Math.abs(along),
        `slips: ${m.w * b.r} against ${along}`,
    );
});

test("a spinning marble kicks sideways off a peg it lands on square", () => {
    const peg: Peg = { id: "p", x: 0, y: 0, r: 0.72 },
        still = marble(0, -3, 0, 0),
        spun = marble(0, -3, 0, 0, 30);
    run(still, board([peg], 18), 0.8);
    run(spun, board([peg], 18), 0.8);
    assert.ok(Math.abs(spun.x) > Math.abs(still.x) + 0.3, `${spun.x} against ${still.x}`);
});

test("a marble dropped into the bucket's mouth is caught, and one onto its rim bounces off", () => {
    const b: Board = {
        ...board([], 18),
        bucket: { x: 0, y: 10, half: 1.9, rim: 0.3, dx: 0, period: 5 },
    };
    const into = marble(0, 5, 0, 0);
    const hits = run(into, b, 2);
    assert.equal(into.mode, "caught");
    assert.ok(hits.some((h) => h.kind === "caught"));
    const rim = marble(1.75, 5, 0, 0);
    const off = run(rim, b, 0.8);
    assert.ok(off.some((h) => h.kind === "rim"));
    assert.equal(rim.mode, "free");
});

test("moving pegs, a turning bar and the bucket stand where their clock puts them", () => {
    const slide: Peg = { id: "m", x: 5, y: 5, r: 0.72, move: { dx: 2, dy: 0, period: 4 } },
        bar: Peg = { id: "b", x: 0, y: 0, r: 0.35, long: { len: 4, angle: 0 }, spin: Math.PI };
    assert.deepEqual(pegAt(slide, 0), { x: 5, y: 5 });
    assert.ok(Math.abs(pegAt(slide, 1).x - 7) < 1e-9);
    const [a, b] = endsOf(bar, 0.5);
    assert.ok(
        Math.abs(a.x) < 1e-9 && Math.abs(Math.abs(a.y) - 2) < 1e-9 && Math.abs(b.y + a.y) < 1e-9,
    );
    assert.ok(
        Math.abs(bucketAt({ x: 10, y: 0, half: 1, rim: 0.3, dx: 7, period: 4 }, 1) - 17) < 1e-9,
    );
});

test("the same board and the same throw give the same fall", () => {
    const pegs: Peg[] = Array.from({ length: 20 }, (_, i) => ({
        id: `p${i}`,
        x: (i % 5) * 3 + (Math.floor(i / 5) % 2) * 1.5,
        y: 4 + Math.floor(i / 5) * 3,
        r: 0.72,
    }));
    const one = marble(6.2, 0, 3, 0),
        two = marble(6.2, 0, 3, 0);
    const h1 = run(one, board(pegs, 18), 3),
        h2 = run(two, board(pegs, 18), 3);
    assert.deepEqual(one, two);
    assert.deepEqual(h1, h2);
    assert.ok(h1.some((h) => h.kind === "peg"));
});
