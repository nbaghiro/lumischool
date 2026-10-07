import assert from "node:assert/strict";
import { test } from "node:test";
import {
    changesOf,
    elevation,
    stepKite,
    stepTail,
    tailRoot,
    windAt,
    type Air,
    type Field,
    type Hands,
    type Kite,
    type Rig,
} from "../kite";

const rig: Rig = {
    lift: 2.2,
    turn: 2.6,
    right: 2.2,
    keel: 0,
    stall: 5,
    sink: 6,
    heavy: 5,
    dive: 5,
    pull: 4,
    reelIn: 4,
    reelOut: 4,
    least: 5,
    most: 30,
};
const field: Field = { hands: { x: 10, y: 55 }, ground: 58 };
const steady: Air = { now: 5, usual: 5 };
const none: Hands = { steer: 0, toward: null, reel: 0 };
const dt = 1 / 240;
const start = (): Kite => ({ x: 24, y: 41, vx: 0, vy: 0, a: 0, u: 8, line: 20 });
const fly = (
    k: Kite,
    seconds: number,
    hands: (t: number) => Hands,
    air = (_t: number) => steady,
) => {
    for (let i = 0; i < seconds / dt; i++) stepKite(k, field, air(i * dt), hands(i * dt), rig, dt);
    return k;
};
const deg = (k: Kite) => (elevation(k, field.hands) * 180) / Math.PI;
const height = (k: Kite) => field.ground - k.y;

test("left alone in a steady wind, it rests high downwind of the hands on a taut line", () => {
    const k = fly(start(), 8, () => none);
    assert.ok(deg(k) > 50 && deg(k) < 66, `${deg(k)} degrees`);
    assert.ok(Math.abs(Math.hypot(k.x - 10, k.y - 55) - k.line) < 0.05, "the line is taut");
    assert.ok(Math.abs(k.a) < 0.01, "the nose has come upright");
});

test("a held steer turns the nose all the way round and loops, and let go it comes upright again", () => {
    const k = start();
    k.line = 26;
    let turned = 0,
        last = k.a;
    for (let i = 0; i < 3 / dt; i++) {
        stepKite(k, field, steady, { steer: 1, toward: null, reel: 0 }, rig, dt);
        turned += Math.atan2(Math.sin(k.a - last), Math.cos(k.a - last));
        last = k.a;
    }
    assert.ok(turned > Math.PI * 2, `turned ${turned} radians in three seconds`);
    fly(k, 3, () => none);
    assert.ok(Math.abs(k.a) < 0.05, `${k.a}`);
});

test("with a keel, a held steer only leans the nose, so the kite never turns over", () => {
    const k = start();
    for (let i = 0; i < 4 / dt; i++)
        stepKite(k, field, steady, { steer: 1, toward: null, reel: 0 }, { ...rig, keel: 2.2 }, dt);
    assert.ok(k.a > 0.8 && k.a < 1.4, `${k.a}`);
});

test("the line never runs past its length, and pulling and letting out stop at the reel's ends", () => {
    const k = start();
    fly(k, 10, () => ({ ...none, reel: -1 }));
    assert.equal(k.line, rig.most);
    assert.ok(Math.hypot(k.x - 10, k.y - 55) <= k.line + 1e-9);
    fly(k, 10, () => ({ ...none, reel: 1 }));
    assert.equal(k.line, rig.least);
    assert.ok(Math.hypot(k.x - 10, k.y - 55) <= k.line + 1e-9);
});

test("a lull lets a kite left alone sink, and pulling the line in keeps it flying", () => {
    const lull = (t: number): Air => ({ now: t > 1 && t < 4 ? 1.6 : 5, usual: 5 });
    const settled = () => fly(start(), 6, () => none);
    const alone = fly(settled(), 4, () => none, lull);
    const pulled = fly(settled(), 4, (t) => ({ ...none, reel: t > 1 && t < 4 ? 1 : 0 }), lull);
    const before = height(settled());
    assert.ok(height(alone) < before - 3, `left alone it fell from ${before} to ${height(alone)}`);
    assert.ok(
        deg(pulled) > deg(alone) + 10,
        `pulled to ${deg(pulled)} degrees, alone ${deg(alone)}`,
    );
    assert.ok(pulled.u > alone.u, "pulling gave it airspeed");
});

test("a gust lifts it higher up the sky than the usual wind holds it", () => {
    const usual = fly(start(), 8, () => none);
    const gusted = fly(
        start(),
        8,
        () => none,
        (t) => ({ now: t > 5 ? 8.5 : 5, usual: 5 }),
    );
    assert.ok(deg(gusted) > deg(usual) + 3, `${deg(gusted)} against ${deg(usual)}`);
});

test("the same hands in the same wind fly the same path", () => {
    const hands = (t: number): Hands => ({
        steer: Math.sin(t * 1.3) > 0.3 ? 1 : Math.sin(t * 1.3) < -0.3 ? -1 : 0,
        toward: null,
        reel: t % 4 < 1 ? 1 : 0,
    });
    const changes = changesOf(7, { every: 6, gust: 0.5, lull: 0.6, seconds: 30 });
    const air = (t: number): Air => ({ now: windAt(5, changes, 20, t), usual: 5 });
    assert.deepEqual(fly(start(), 12, hands, air), fly(start(), 12, hands, air));
});

test("a day's wind is the same for the same seed, still for its first seconds, and the usual wind with no changes", () => {
    const o = { every: 8, gust: 0.5, lull: 0.6, seconds: 120 };
    assert.deepEqual(changesOf(3, o), changesOf(3, o));
    assert.notDeepEqual(changesOf(3, o), changesOf(4, o));
    const changes = changesOf(3, o);
    assert.ok(changes.length > 8 && (changes[0]?.at ?? 0) >= 5);
    assert.ok(changes.some((c) => c.amp < 0) && changes.some((c) => c.amp > 0));
    assert.equal(windAt(5, changes, 0, 2), 5);
    assert.equal(windAt(5, [], 30, 50), 5);
});

test("a finger in the sky turns the nose towards it", () => {
    const k = fly(start(), 6, () => none);
    const toward = { x: k.x - 8, y: k.y };
    fly(k, 0.6, () => ({ ...none, toward }));
    assert.ok(k.a < -0.8, `the nose turned left to ${k.a}`);
});

test("the tail hangs downwind from the kite, each bow its length from the last", () => {
    const k = fly(start(), 6, () => none),
        tail = Array.from({ length: 6 }, () => ({ x: k.x, y: k.y }));
    for (let i = 0; i < 4 / dt; i++) stepTail(tail, tailRoot(k), 5, dt);
    let prev = tailRoot(k);
    for (const p of tail) {
        assert.ok(Math.hypot(p.x - prev.x, p.y - prev.y) <= 0.7 + 1e-9);
        prev = p;
    }
    const end = tail.at(-1);
    assert.ok(end && end.x > k.x + 1 && end.y > k.y, "it streams down and away with the wind");
});
