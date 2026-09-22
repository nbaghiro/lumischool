// The hands controller, against a stage of the test's own: a press picks a handle up, a drag moves
// it, and a release either plays the moves a landing carries or sends the part home. Nothing here
// touches the page; the stage is the Surface interface and no more.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    Hands,
    pathLength,
    rollAlong,
    stopFor,
    targetMarks,
    type Handle,
    type Surface,
} from "../hands";
import type { Mark } from "../../../engine/motion/scene";

test("a stop is found within its reach, and a flick rolls on along the rail", () => {
    const stops = [{ s: 10, reach: 3, choice: { moves: [0] } }];
    assert.equal(stopFor(6, stops), null);
    assert.equal(stopFor(7.5, stops)?.s, 10);
    assert.equal(stopFor(12, stops)?.s, 10);
    const rail = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
    ];
    assert.equal(pathLength(rail), 15);
    assert.ok(
        Math.abs(rollAlong(rail, 4, { x: 10, y: 0 }, 0.3) - 7) < 1e-9,
        "a push along the rail carries on",
    );
    assert.ok(
        Math.abs(rollAlong(rail, 4, { x: 0, y: 10 }, 0.3) - 4) < 1e-9,
        "a push across the rail does not",
    );
    assert.ok(
        Math.abs(rollAlong(rail, 4, { x: -30, y: 0 }, 0.3)) < 1e-9,
        "and it cannot roll off the start",
    );
});

/** A stage of the test's own: parts are boxes, and every call is remembered. */
function fakeStage(parts: Record<string, { x: number; y: number; w: number; h: number }>) {
    const calls: string[] = [];
    const layers: Record<string, Mark[]> = {};
    const surface: Surface = {
        show() {},
        anchor: () => null,
        follow() {},
        nudge() {},
        tag() {},
        remove() {},
        at: (k) => (parts[k] ? { x: parts[k].x, y: parts[k].y } : null),
        rect: (k) => parts[k] ?? null,
        z: () => 10,
        place: (k, p) => {
            if (parts[k]) Object.assign(parts[k], p);
            calls.push(`place ${k}`);
        },
        glide: (k, to) => {
            calls.push(`glide ${k} ${to.x},${to.y}`);
        },
        lift: (k, on) => {
            calls.push(`lift ${k} ${on}`);
        },
        marks: (layer, m) => {
            layers[layer] = m;
        },
        turned: () => 0,
        room: 800,
    };
    return { surface, calls, layers };
}

test("a free drag plays the move its target carries, and a miss goes home and plays nothing", () => {
    const { surface, calls, layers } = fakeStage({ ball: { x: 0, y: 0, w: 2, h: 2 } });
    const handle: Handle = {
        key: "ball",
        mode: "free",
        home: { x: 0, y: 0 },
        targets: [
            { id: "pan", shape: { cx: 10, cy: 1, r: 1.5 }, carries: { moves: [3] } },
            {
                id: "full",
                shape: { cx: 20, cy: 1, r: 1.5 },
                carries: { moves: [], refuse: "The pan is full." },
            },
        ],
    };
    const played: number[][] = [],
        said: string[] = [],
        missed: number[] = [];
    const hands = new Hands<{ won: boolean }>(surface, {
        here: () => ({ won: false }),
        session: () => ({ parts: () => ({ parts: [] }), handles: () => [handle] }),
        play: (m) => {
            played.push(m);
        },
        miss: () => {
            missed.push(1);
        },
        hear() {},
        say: (t) => {
            said.push(t);
        },
        reach: () => ({ reach: 0.5, flickSeconds: 0.3, minSpeed: 14 }),
    });
    const key = hands.hit({ x: 1, y: 1 });
    assert.equal(key, "0");
    hands.gesture({ kind: "drag-start", x: 1.5, y: 1, t: 0, fromX: 1, fromY: 1 }, key);
    assert.ok(calls.includes("lift ball true"));
    assert.deepEqual(
        (layers.targets ?? []).map((m) => m.kind),
        ["ring"],
        "only the target that plays something is ringed",
    );
    hands.gesture({ kind: "drag", x: 10, y: 1, t: 50, dx: 8.5, dy: 0 }, key);
    assert.ok(
        (layers.targets ?? []).some((m) => m.kind === "ring" && m.on),
        "the ring under the hand is filled",
    );
    hands.gesture({ kind: "drag-end", x: 10, y: 1, t: 100, vx: 0, vy: 0, flick: false }, key);
    assert.deepEqual(played, [[3]]);
    assert.deepEqual(layers.targets, [], "the rings go when the hand lets go");
    hands.hit({ x: 1, y: 1 });
    hands.gesture({ kind: "drag-start", x: 1.5, y: 1, t: 200, fromX: 1, fromY: 1 }, "0");
    hands.gesture({ kind: "drag-end", x: 20, y: 1, t: 300, vx: 0, vy: 0, flick: false }, "0");
    assert.deepEqual(played, [[3]], "a refused target plays nothing");
    assert.deepEqual(said.filter(Boolean), ["The pan is full."]);
    assert.equal(missed.length, 1);
    assert.ok(calls.includes("glide ball 0,0"), "and the ball goes home");
});

test("a part smaller than a finger is grown to the floor for a press", () => {
    const { surface } = fakeStage({ bead: { x: 5, y: 5, w: 1, h: 1 } });
    const handle: Handle = { key: "bead", mode: "free", home: { x: 5, y: 5 }, targets: [] };
    const hooks = (floor?: number) => ({
        here: () => ({ won: false }),
        session: () => ({ parts: () => ({ parts: [] }), handles: () => [handle] }),
        play() {},
        miss() {},
        hear() {},
        say() {},
        reach: () => ({ reach: 0.5, flickSeconds: 0.3, minSpeed: 14 }),
        ...(floor ? { floor: () => floor } : {}),
    });
    assert.equal(
        new Hands(surface, hooks()).hit({ x: 6.4, y: 5.5 }),
        null,
        "a press just off a one-square bead misses it",
    );
    assert.equal(
        new Hands(surface, hooks(2.2)).hit({ x: 6.4, y: 5.5 }),
        "0",
        "and takes it once the bead is grown to a finger",
    );
});

test("targets are drawn as rings and boxes, and a target that plays nothing is not drawn", () => {
    const marks = targetMarks(
        {
            key: "",
            mode: "free",
            home: { x: 0, y: 0 },
            targets: [
                { id: "a", shape: { cx: 1, cy: 1, r: 1 }, carries: { moves: [0] } },
                { id: "b", shape: { x: 3, y: 0, w: 2, h: 2 }, carries: { moves: [1] } },
                {
                    id: "c",
                    shape: { x: 6, y: 0, w: 2, h: 2 },
                    carries: { moves: [], refuse: "no" },
                },
            ],
        },
        null,
    );
    assert.deepEqual(
        marks.map((m) => m.kind),
        ["ring", "box"],
    );
});
