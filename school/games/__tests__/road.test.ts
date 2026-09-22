// The road: stopping on the number wins, stopping short says how far is left, and a box slows the
// car and costs nothing else.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, spent } from "../../../engine/motion/pad";
import {
    placeOf,
    roadGame,
    ROAD_LEVELS,
    start as startRace,
    step as stepRace,
    type RoadState,
} from "../road";

function drive(level: number, stopAt: number): RoadState {
    const s = startRace(level),
        pad = emptyPad(),
        goal = placeOf(s.L, stopAt);
    for (let n = 0; n < 60 * 60 && (s.stops === 0 || s.v > 0); n++) {
        const nose = s.x + 0.85;
        pad.go = nose + (s.v * s.v) / 32 < goal - 0.1;
        pad.brake = !pad.go;
        const ahead = s.boxes.find(
            (b) => !b.hit && b.x > s.x && b.x - s.x < 7 && Math.abs(b.y - s.y) < 1,
        );
        if (ahead) pad.pressed.push(s.lane === 2 ? "up" : "down");
        stepRace(s, pad);
        spent(pad);
    }
    return s;
}

test("stopping on the number wins, and the stop is read off the road's own line", () => {
    for (const [level, L] of ROAD_LEVELS.entries()) {
        const s = drive(level, L.target);
        assert.ok(s.won, `level ${level + 1}: stopped at ${s.stop}`);
        assert.ok(s.stop !== null && Math.abs(s.stop - L.target) <= L.within);
        assert.match(roadGame.say(s), new RegExp(`Stopped on ${L.target}\\.`));
    }
});

test("stopping short says how far is left and does not end the game", () => {
    const s = drive(1, 55);
    assert.ok(!s.won);
    assert.match(s.said, /^Stopped on 5\d\. 70 is 1\d further on\.$/);
});

test("a box slows the car and costs nothing else", () => {
    const s = startRace(0),
        pad = emptyPad();
    pad.go = true;
    let before = 0,
        after = 0;
    const box = s.boxes[0];
    assert.ok(box, "the level lays a box on the road");
    for (let n = 0; n < 60 * 10 && !box.hit; n++) {
        before = s.v;
        stepRace(s, pad);
        spent(pad);
        after = s.v;
    }
    assert.ok(box.hit, "the car met the first box");
    assert.ok(after < before * 0.6, `${before} then ${after}`);
    assert.equal(s.bumps, 1);
    assert.ok(!s.won && s.stops === 0);
});
