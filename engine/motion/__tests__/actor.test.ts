import assert from "node:assert/strict";
import { test } from "node:test";
import { FADE, actor, actorSprites, land, poseOf, stepActor, type Cycle } from "../actor";
import type { Sprite } from "../scene";

type Act = "stand" | "walk" | "air" | "cheer";
const ACTS: Record<Act, Cycle> = {
    stand: { poses: ["stand"] },
    walk: { poses: ["walk", "stand"], per: 1 },
    air: { poses: ["jump"] },
    cheer: { poses: ["cheer", "wave"], every: 0.5 },
};
const DT = 1 / 60;
const dress = (pose: string, facing: 1 | -1): Sprite => ({
    key: "me",
    art: "charlie",
    params: { pose, facing },
    x: 0,
    y: 0,
    z: 5,
});

test("a walk cycles its poses by the stride, and a cheer by the clock", () => {
    const a = actor<Act>("walk", "stand");
    assert.equal(poseOf(a, ACTS, 0.5), "walk");
    assert.equal(poseOf(a, ACTS, 1.5), "stand");
    assert.equal(poseOf(a, ACTS, 2.2), "walk");
    stepActor(a, "cheer", ACTS, DT);
    for (let k = 0; k < 40; k++) stepActor(a, "cheer", ACTS, DT);
    assert.equal(poseOf(a, ACTS), "wave", "half a second in, the cheer has moved on");
});

test("a change of act fades the old pose out under the new one, and at rest there is no fade", () => {
    const a = actor<Act>("stand", "stand", -1);
    stepActor(a, "air", ACTS, DT);
    const both = actorSprites(a, ACTS, dress);
    assert.equal(both.length, 2);
    assert.equal(both[0]?.key, "me:was");
    assert.equal(both[0]?.params?.pose, "stand");
    assert.equal(both[0]?.alpha, 1);
    assert.equal(both[1]?.params?.pose, "jump");
    assert.equal(both[1]?.params?.facing, -1);
    assert.equal(actorSprites(a, ACTS, dress, 0, true).length, 1);
    for (let t = 0; t <= FADE + DT; t += DT) stepActor(a, "air", ACTS, DT);
    assert.equal(actorSprites(a, ACTS, dress).length, 1, "the fade is over");
});

test("a hard landing squashes more than a soft one, and it springs back to nothing", () => {
    const hard = actor<Act>("stand", "stand"),
        soft = actor<Act>("stand", "stand");
    land(hard, 12);
    land(soft, 3);
    assert.ok(hard.squash > soft.squash && soft.squash > 0);
    assert.ok(hard.squash <= 0.3);
    assert.equal(actorSprites(hard, ACTS, dress)[0]?.squash, hard.squash);
    for (let k = 0; k < 90; k++) stepActor(hard, "stand", ACTS, DT);
    assert.equal(hard.squash, 0);
    assert.equal(
        actorSprites(hard, ACTS, dress, 0, true)[0]?.squash,
        undefined,
        "at rest nothing is squashed",
    );
});

test("an actor survives being written down and read back", () => {
    const a = actor<Act>("walk", "stand");
    land(a, 6);
    stepActor(a, "air", ACTS, DT, 1.2, -1);
    const back: unknown = JSON.parse(JSON.stringify(a));
    assert.deepEqual(back, a);
});
