import assert from "node:assert/strict";
import { test } from "node:test";
import { tumble, type TumbleThrow } from "../tumble";

const THROW: TumbleThrow = {
    tray: { x: 0, y: 0, w: 12, h: 7 },
    from: [
        { x: 10, y: 5 },
        { x: 8.5, y: 5.5 },
    ],
    to: [
        { x: 3, y: 2 },
        { x: 7, y: 4.5 },
    ],
    turnTo: [0.3, -2],
    v: { x: -14, y: -4 },
    seed: 7,
    size: 1.8,
};

test("a throw ends exactly where and how the game said, whatever the hand did", () => {
    for (const v of [
        { x: -14, y: -4 },
        { x: 3, y: -12 },
        { x: -2, y: 1 },
    ]) {
        const { frames } = tumble({ ...THROW, v });
        const last = frames[frames.length - 1];
        assert.ok(last);
        assert.deepEqual(last.at, THROW.to);
        assert.deepEqual(last.angle, THROW.turnTo);
        assert.deepEqual(frames[0]?.at, THROW.from, "and it starts where the dice lay");
    }
});

test("a throw stays inside the tray, knocks off its walls when thrown hard, and differs with the hand", () => {
    const hard = tumble({ ...THROW, v: { x: -22, y: -9 } });
    for (const f of hard.frames)
        for (const p of f.at) assert.ok(p.x >= 0.9 && p.x <= 11.1 && p.y >= 0.9 && p.y <= 6.1);
    assert.ok(hard.hits.length > 0, "a hard throw hits a wall");
    const soft = tumble({ ...THROW, v: { x: -3, y: -1 } });
    assert.notDeepEqual(soft.frames[20]?.at, hard.frames[20]?.at);
    assert.ok(soft.frames.length < hard.frames.length, "a soft throw comes to rest sooner");
});

test("the same throw tumbles the same way", () => {
    assert.deepEqual(tumble(THROW), tumble(THROW));
    assert.notDeepEqual(tumble(THROW).frames[15], tumble({ ...THROW, seed: 8 }).frames[15]);
});
