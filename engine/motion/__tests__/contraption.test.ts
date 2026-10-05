// The chain-reaction kit: a run is the same every time, dominoes fall one after another, the bell
// rings only when the chain reaches it, parts keep to their room, and a long chain stays quick because
// what the wave has not reached is asleep.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    fits,
    kick,
    machine,
    settle,
    settled,
    stepMachine,
    surfaceBelow,
    trial,
    type Part,
    type Scene,
} from "../contraption";

const row = (id: string, x: number, n: number, y = 24, locked = false): Part => ({
    id,
    kind: "row",
    x,
    y,
    angle: 0,
    n,
    ...(locked ? { locked } : {}),
});

/** A floor with Charlie's domino at 6 and a bell where a row of `k` after it just reaches. */
const scene = (k: number): Scene => ({
    w: 48,
    h: 30,
    floor: 24,
    shelves: [{ x: 30, y: 16, w: 6, h: 1 }],
    bell: { x: 6 + k * 2 + 2.6, y: 22.9 },
    gap: 2,
    push: "start",
});

test("a run is the same every time: the same layout falls the same way, step for step", () => {
    const parts = [row("start", 6, 1, 24, true), row("row", 8, 7)];
    const a = machine(scene(7), parts),
        b = machine(scene(7), parts);
    kick(a);
    kick(b);
    for (let i = 0; i < 400; i++) {
        stepMachine(a);
        stepMachine(b);
    }
    const where = (m: typeof a) =>
        (m.of.get("row") ?? []).map((d) => {
            const at = m.world.where(d);
            return [at.x, at.y, at.angle];
        });
    assert.deepEqual(where(a), where(b));
    assert.deepEqual(trial(scene(7), parts), trial(scene(7), parts));
});

test("dominoes fall one after another along the row, each told once, and the bell rings at the end", () => {
    const m = machine(scene(7), [row("start", 6, 1, 24, true), row("row", 8, 7)]);
    kick(m);
    const order: number[] = [];
    let rang = -1;
    for (let i = 0; i < 900 && !settled(m); i++)
        for (const e of stepMachine(m)) {
            if (e.kind === "topple") order.push(e.n);
            if (e.kind === "ring") rang = i;
        }
    assert.deepEqual(order, [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.ok(rang > 0, "the bell rang");
});

test("the bell rings only when the row reaches it: one domino short and it stays quiet", () => {
    const base = [row("start", 6, 1, 24, true)];
    assert.equal(trial(scene(7), [...base, row("row", 8, 7)]).rung, true);
    assert.equal(trial(scene(7), [...base, row("row", 8, 6)]).rung, false);
    assert.equal(trial(scene(7), base).rung, false);
});

test("parts keep to their room: not through a shelf, the bell or another part, and standing parts land on what is under them", () => {
    const s = scene(7);
    const r = row("row", 8, 7);
    assert.ok(fits(s, [], r));
    // one more domino would stand where the bell is
    assert.ok(!fits(s, [], row("row", 8, 8)));
    assert.ok(!fits(s, [r], row("other", 9, 2)));
    const ramp: Part = { id: "ramp", kind: "ramp", x: 33, y: 16.2, angle: 0, n: 1 };
    assert.ok(!fits(s, [], ramp), "a ramp through the shelf");
    assert.equal(surfaceBelow(s, 32, 10), 16);
    assert.equal(surfaceBelow(s, 20, 10), 24);
    assert.equal(settle(s, row("r", 1, 2), { x: 32, y: 12 }).y, 16);
    assert.equal(settle(s, ramp, { x: 20, y: 12 }).y, 12, "a ramp stays where it is put");
});

test("a long chain stays quick: dominoes the wave has not reached sleep, and all of them sleep once it ends", () => {
    const s: Scene = { ...scene(40), w: 100, bell: { x: 6 + 40 * 2 + 2.6, y: 22.9 } };
    const parts = [row("start", 6, 1, 24, true), row("row", 8, 40)];
    const t0 = performance.now();
    const m = machine(s, parts);
    kick(m);
    let midway = 0;
    while (!settled(m)) {
        stepMachine(m);
        if (m.steps === 300) midway = m.world.census().awake;
    }
    const ms = performance.now() - t0;
    assert.ok(m.rung, "the long chain rang the bell");
    assert.ok(ms < 4000, `${ms.toFixed(0)} ms for forty dominoes`);
    assert.ok(midway > 0 && midway < 30, `${midway} of 41 awake halfway along`);
    for (let i = 0; i < 60; i++) stepMachine(m);
    assert.equal(m.world.census().awake, 0);
});

test("a bucket lifts its counterweight only once it holds more marbles than the weight is heavy", () => {
    const s: Scene = {
        w: 48,
        h: 30,
        floor: 24,
        shelves: [{ x: 27, y: 20.7, w: 2, h: 1 }],
        bell: { x: 28, y: 13.5 },
        gap: 2,
        push: null,
        hoist: { bucket: { x: 20, y: 14 }, weight: { x: 28, y: 20 }, heavy: 6 },
    };
    const bag = (n: number): Part => ({ id: "bag", kind: "bag", x: 20, y: 10, angle: 0, n });
    assert.equal(trial(s, [bag(6)]).rung, false);
    assert.equal(trial(s, [bag(7)]).rung, true);
});

test("a fan's breeze sails a boat only from within its reach", () => {
    const s: Scene = {
        w: 48,
        h: 30,
        floor: 24,
        shelves: [],
        bell: { x: 38, y: 23 },
        gap: 2,
        push: null,
        pond: { from: 14, to: 40 },
    };
    const boat: Part = { id: "boat", kind: "boat", x: 18, y: 24, angle: 0, n: 1, locked: true };
    const fan = (x: number): Part => ({ id: "fan", kind: "fan", x, y: 24, angle: 0, n: 1 });
    assert.equal(trial(s, [boat, fan(12.5)]).rung, true);
    assert.equal(trial(s, [boat, fan(5)]).rung, false);
    assert.ok(!fits(s, [boat], fan(16)), "a fan cannot stand in the pond");
});
