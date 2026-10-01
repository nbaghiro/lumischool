// The road: every round of every level is delivered through the Pad and replays to the same road; a
// stop in the wrong place leaves a chalk mark and says how far; the finish waits for the list; a hard
// stop slides a parcel off the rack and it can be picked up again; a box slows the car and costs
// nothing else; random driving rarely finishes a round; and a lifted hand stops the car in the run-out
// rather than against the end of the road.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, spent, type Dir, type Pad } from "../../../engine/motion/pad";
import { actionChallenge } from "../action-challenges";
import {
    finishOf,
    noseOf,
    placeOf,
    roadGame,
    ROAD_LEVELS,
    start,
    startRoadLevel,
    step,
    worldWidth,
    type RoadState,
} from "../road";
import { driveRound, hands } from "./road-driver";

function roundOf(phase: number, seed: number): RoadState {
    const config = actionChallenge(seed, "road", phase);
    if (config.kind !== "road") throw new Error("Not a road round");
    return startRoadLevel(config.level, phase);
}

/** Drives until the nose is near `x` and the car has rested there long enough to be read. */
function restAt(s: RoadState, x: number): void {
    const goal = { ...s.L, stops: [{ at: (x - placeOf(s.L, 0)) / s.L.per }] };
    const guide: RoadState = { ...s, L: goal, delivered: [false] };
    for (let n = 0; n < 60 * 30; n++) {
        guide.x = s.x;
        guide.v = s.v;
        guide.lane = s.lane;
        const pad = hands(guide);
        step(s, pad);
        spent(pad);
        if (Math.abs(noseOf(s) - x) < 0.4 && s.v === 0 && s.still >= 12) return;
    }
}

test("every round of every level is delivered through the Pad, and its pads replay to the same road", () => {
    for (let phase = 0; phase < ROAD_LEVELS.length; phase++)
        for (let seed = 0; seed < 3; seed++) {
            const s = roundOf(phase, seed);
            const pads = driveRound(s);
            assert.ok(s.won, `level ${phase + 1}, round ${seed}: ${s.said}`);
            assert.ok(s.delivered.every(Boolean));
            assert.deepEqual(roadGame.objectives?.(s), {
                done: true,
                completed: s.L.stops.length + 1,
                total: s.L.stops.length + 1,
            });
            const again = roundOf(phase, seed);
            for (const pad of pads) {
                step(again, { ...pad, pressed: [...pad.pressed] });
            }
            assert.equal(JSON.stringify(again), JSON.stringify(s), `level ${phase + 1} replays`);
        }
});

test("a stop in the wrong place leaves a chalk mark with its number and says how far the stop is", () => {
    const s = start(1);
    restAt(s, placeOf(s.L, 3));
    assert.ok(!s.delivered[0]);
    assert.equal(s.chalks.at(-1)?.text, "3");
    assert.match(s.said, /^Stopped on 3\. 6 is 3 further on\.$/);
});

test("on a list, a stop at a later door says which comes first, and delivers nothing", () => {
    const s = start(1);
    restAt(s, placeOf(s.L, 13));
    assert.ok(s.delivered.every((d) => !d));
    assert.match(s.said, /^This is 13\. 6 comes first on the list\.$/);
});

test("the finish waits for the list: driving through it with stops left does not finish the round", () => {
    const s = start(0),
        pad = emptyPad();
    pad.go = true;
    for (let n = 0; n < 60 * 10 && noseOf(s) < finishOf(s.L) + 1; n++) step(s, pad);
    assert.ok(!s.won);
    assert.match(s.said, /still on the list\. The finish waits for them\./);
});

test("a hard stop at speed slides a parcel off the rack, and the car picks it up again", () => {
    const s = start(3),
        pad = emptyPad();
    pad.go = true;
    for (let n = 0; n < 60 * 3 && s.v < 11; n++) step(s, pad);
    pad.go = false;
    pad.brake = true;
    step(s, pad);
    assert.equal(s.rack, s.L.stops.length - 1);
    assert.equal(s.dropped.length, 1);
    assert.match(s.said, /A parcel slid off the rack/);
    const parcel = s.dropped[0];
    if (!parcel) throw new Error("No parcel in the road");
    for (let n = 0; n < 60 * 3 && s.v > 0; n++) step(s, pad);
    assert.ok(noseOf(s) < parcel.x, "the parcel lands past where the car stops");
    pad.brake = false;
    for (let n = 0; n < 60 * 5 && s.dropped.length; n++) {
        pad.go = s.v < 2;
        step(s, pad);
    }
    assert.equal(s.dropped.length, 0);
    assert.equal(s.rack, s.L.stops.length);
});

test("a box slows the car and costs nothing else", () => {
    const s = start(1),
        pad = emptyPad();
    pad.go = true;
    let before = 0,
        after = 0;
    const box = s.boxes[0];
    assert.ok(box, "the level lays a box on the road");
    for (let n = 0; n < 60 * 10 && !box.hit; n++) {
        before = s.v;
        step(s, pad);
        spent(pad);
        after = s.v;
    }
    assert.ok(box.hit, "the car met the first box");
    assert.ok(after < before * 0.6, `${before} then ${after}`);
    assert.equal(s.bumps, 1);
    assert.ok(!s.won);
});

test("a lifted hand stops the car, which waits for go, and past the line it rests in the run-out", () => {
    const s = start(0),
        pad = emptyPad();
    pad.go = true;
    for (let n = 0; n < 60 && s.v < 5; n++) step(s, pad);
    pad.go = false;
    for (let n = 0; n < 120 && s.v > 0; n++) step(s, pad);
    const at = s.x;
    for (let n = 0; n < 120; n++) step(s, pad);
    assert.equal(s.x, at);
    s.x = placeOf(s.L, s.L.to);
    s.v = s.L.top;
    for (let n = 0; n < 60 * 10; n++) step(s, pad);
    assert.equal(s.v, 0);
    assert.ok(s.x < worldWidth(s.L) - 2, "the car rests in the run-out, short of the road's end");
});

test("random driving rarely finishes a round", () => {
    let seed = 7;
    const rand = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };
    for (let phase = 0; phase < ROAD_LEVELS.length; phase++) {
        let wins = 0;
        for (let tries = 0; tries < 20; tries++) {
            const s = start(phase);
            let pad: Pad = emptyPad();
            for (let n = 0; n < 60 * 60 && !s.won; n++) {
                if (n % 30 === 0) {
                    pad = emptyPad();
                    const r = rand();
                    pad.go = r < 0.5;
                    pad.brake = r > 0.85;
                    const turn: Dir | null = rand() < 0.2 ? (rand() < 0.5 ? "up" : "down") : null;
                    if (turn) pad.pressed.push(turn);
                }
                step(s, pad);
                spent(pad);
            }
            if (s.won) wins++;
        }
        assert.ok(wins <= 4, `level ${phase + 1} is finished by ${wins} of 20 random drives`);
    }
});

test("the harder levels draw a bay only once it is delivered, and the list card ticks what is done", () => {
    const hard = ROAD_LEVELS.findIndex((L) => L.labels === "ends");
    const s = start(hard);
    const bays = (st: RoadState) => roadGame.frame(st, true).marks.filter((m) => m.kind === "box");
    assert.equal(bays(s).length, 0);
    driveRound(s);
    assert.equal(bays(s).length, s.L.stops.length);
    const card = roadGame.frame(s, true).sprites.find((p) => p.key === "list");
    assert.deepEqual(
        card?.params?.done,
        s.L.stops.map(() => 1),
    );
    const easy = start(0);
    assert.equal(bays(easy).length, easy.L.stops.length);
    assert.ok(!roadGame.frame(easy, true).marks.some((m) => m.kind === "ring"));
});

test("under reduced motion a press drives, then the car settles to rest and its stop is read", () => {
    const s = start(0),
        pad = emptyPad();
    pad.go = true;
    for (let n = 0; n < roadGame.still.press(s); n++) step(s, pad);
    pad.go = false;
    assert.ok(roadGame.still.settling?.(s));
    for (let n = 0; n < 60 * 10 && roadGame.still.settling?.(s); n++) step(s, pad);
    assert.equal(s.v, 0);
    assert.equal(s.stops, 1);
    assert.equal(roadGame.still.settling?.(s), false);
});
