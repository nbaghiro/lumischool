import assert from "node:assert/strict";
import { test } from "node:test";
import { Recogniser, velocity, type Sample } from "../gesture";

const samples = (path: [number, number, number][], id = 1): Sample[] =>
    path.map(([x, y, t], i) => ({
        id,
        kind: i === 0 ? "down" : i === path.length - 1 ? "up" : "move",
        x,
        y,
        t,
    }));

test("a press that stays within the slop is a tap, and past it is a drag with an end", () => {
    const r = new Recogniser({ slop: 0.4 });
    const tap = samples([
        [1, 1, 0],
        [1.1, 1, 20],
        [1.1, 1.05, 60],
    ]).flatMap((s) => r.feed(s));
    assert.deepEqual(
        tap.map((g) => g.kind),
        ["tap"],
    );
    const drag = samples([
        [1, 1, 0],
        [1.2, 1, 100],
        [2, 1, 200],
        [3, 1, 300],
        [3, 1, 420],
    ]).flatMap((s) => r.feed(s));
    assert.deepEqual(
        drag.map((g) => g.kind),
        ["drag-start", "drag", "drag", "drag-end"],
    );
    const end = drag.at(-1);
    assert.ok(
        end?.kind === "drag-end" && !end.flick && end.vx < 5,
        "a finger that stopped before letting go is a drop",
    );
});

test("a fast release is a flick with the velocity of its last hundred milliseconds", () => {
    const r = new Recogniser({ slop: 0.4, flickSpeed: 14, window: 100 });
    const gs = samples([
        [0, 0, 0],
        [1, 0, 16],
        [2, 0, 33],
        [3, 0, 50],
        [4, 0, 66],
    ]).flatMap((s) => r.feed(s));
    const end = gs.at(-1);
    assert.ok(end?.kind === "drag-end" && end.flick, JSON.stringify(end));
    assert.ok(end.vx > 50 && Math.abs(end.vy) < 1e-9);
    assert.deepEqual(
        velocity(
            [
                { x: 0, y: 0, t: 0 },
                { x: 0, y: 0, t: 0 },
            ],
            100,
        ),
        { vx: 0, vy: 0 },
    );
});

test("a hold is found by polling, a second pointer is ignored, and a cancel cancels", () => {
    const r = new Recogniser({ holdMs: 500 });
    assert.deepEqual(r.feed({ id: 1, kind: "down", x: 0, y: 0, t: 0 }), []);
    assert.deepEqual(r.feed({ id: 2, kind: "down", x: 5, y: 5, t: 10 }), []);
    assert.deepEqual(r.poll(300), []);
    assert.deepEqual(
        r.poll(600).map((g) => g.kind),
        ["hold"],
    );
    assert.deepEqual(r.poll(900), [], "a hold fires once");
    assert.deepEqual(
        r.feed({ id: 2, kind: "move", x: 9, y: 9, t: 700 }),
        [],
        "the second pointer does nothing",
    );
    assert.deepEqual(
        r.feed({ id: 1, kind: "up", x: 0, y: 0, t: 1000 }),
        [],
        "a held press that is let go is not a tap",
    );
    r.feed({ id: 1, kind: "down", x: 0, y: 0, t: 2000 });
    assert.deepEqual(
        r.feed({ id: 1, kind: "cancel", x: 0, y: 0, t: 2100 }).map((g) => g.kind),
        ["cancel"],
    );
    assert.equal(r.active, false);
});
