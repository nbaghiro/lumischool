// Charlie's bridge: every level and every layout is crossed by hand and by the keys, a plank too
// short falls in and one that sticks out tips under Charlie's weight, a fall costs nothing, and
// random planks let go over the stones rarely make a bridge.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import {
    BRIDGE,
    BRIDGE_LEVELS,
    DECK,
    LIFT,
    bridgeGame,
    lengthOf,
    loadOf,
    pickable,
    plankAt,
    sq,
    type BridgeState,
} from "../bridge";
import { bridgeChallenge, bridgeLayouts, openBridgeConfiguration } from "../bridge-challenges";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { faults } from "../../../engine/motion/tune";

const LIMIT = 60 * 60;

function tick(s: BridgeState, pad: Pad, n = 1): void {
    for (let i = 0; i < n; i++) {
        bridgeGame.step(s, pad);
        spent(pad);
    }
}

/** Steps until nothing moves: planks settled or home, and Charlie stopped, across or out of the water. */
function settle(s: BridgeState): void {
    const pad = emptyPad();
    for (let i = 0; i < LIMIT && bridgeGame.still.settling?.(s); i++) tick(s, pad);
}

/** Lays plank `i` with its near end over `u` units, by hand, and lets it settle. */
function lay(s: BridgeState, i: number, u: number, off = 0): void {
    const at = plankAt(s, i),
        n = lengthOf(s, i);
    assert.ok(at);
    const pad = emptyPad();
    pad.touch = { x: at.x, y: at.y };
    tick(s, pad);
    assert.equal(s.held, i, `took hold of plank ${i}`);
    pad.touch = null;
    pad.lifted = { x: sq(s, u) + n / 2 + off, y: DECK - 1 };
    tick(s, pad);
    settle(s);
}

function go(s: BridgeState): void {
    const pad = emptyPad();
    pad.go = true;
    pad.tapped = true;
    tick(s, pad);
    settle(s);
}

/**
 * The planks that measure each gap exactly, as [plank, near end], from the near bank to the far one.
 * The rope's gap takes the fewest planks that add up to it, hung one after another from the near post.
 */
function answer(s: BridgeState): [number, number][] {
    if (s.L.lift && s.lift) {
        // the fewest sacks that outweigh Charlie by four kilograms at most, let go over the basket
        const b = s.physics.where(s.lift.basket),
            u = (b.x - lengthOf(s, 0) / 2 - s.x0) / s.L.per;
        let best: number[] | null = null;
        for (let mask = 1; mask < 1 << s.L.planks.length; mask++) {
            const pick = s.L.planks.flatMap((_, j) => (mask & (1 << j) ? [j] : []));
            const kg = pick.reduce((a, j) => a + (s.L.planks[j] ?? 0), 0);
            if (kg > LIFT.kg && kg <= LIFT.kg + 4 && (!best || pick.length < best.length))
                best = pick;
        }
        assert.ok(best, `${s.L.title}: no sacks weigh a little more than Charlie`);
        return best.map((j) => [j, u]);
    }
    const ends = [0, ...s.L.stones, s.L.far];
    const out: [number, number][] = [],
        used = new Set<number>(),
        rope: [number, number][] = [];
    for (let k = 0; k + 1 < ends.length; k++) {
        const from = ends[k] ?? 0,
            gap = (ends[k + 1] ?? 0) - from;
        if (s.L.rope && Math.abs(from - s.L.rope.from) < 1e-9) continue;
        const i = s.L.planks.findIndex((n, j) => Math.abs(n - gap) < 1e-9 && !used.has(j));
        assert.ok(i >= 0, `${s.L.title}: no plank of ${gap} for the gap from ${from}`);
        used.add(i);
        out.push([i, from]);
    }
    const r = s.L.rope;
    if (r) {
        const free = s.L.planks.flatMap((n, j) => (used.has(j) ? [] : [{ n, j }]));
        const gap = r.to - r.from;
        let best: { n: number; j: number }[] | null = null;
        for (let mask = 1; mask < 1 << free.length; mask++) {
            const pick = free.filter((_, b) => mask & (1 << b));
            const sum = pick.reduce((a, p) => a + p.n, 0);
            if (Math.abs(sum - gap) < 1e-9 && (!best || pick.length < best.length)) best = pick;
        }
        assert.ok(best, `${s.L.title}: no planks add up to the rope's ${gap}`);
        let at = r.from;
        for (const p of best) {
            rope.push([p.j, at]);
            at += p.n;
        }
    }
    return [...out, ...rope];
}

/** Every level with every layout it can be played at. */
const every = (): { title: string; start: () => BridgeState }[] =>
    BRIDGE_LEVELS.flatMap((L, phase) => [
        { title: L.title, start: () => bridgeGame.start(phase) },
        ...Array.from({ length: bridgeLayouts(phase) }, (_, v) => ({
            title: `${L.title}, layout ${v}`,
            start: () => openBridgeConfiguration(bridgeChallenge(v, phase)),
        })),
    ]);

test("every level and layout is crossed with the planks each gap measures, laid by hand", () => {
    for (const { title, start } of every()) {
        const s = start();
        for (const [i, u] of answer(s)) lay(s, i, u);
        go(s);
        assert.ok(bridgeGame.won(s), `${title}: ${bridgeGame.say(s)}`);
        assert.equal(s.falls, 0, title);
        const o = bridgeGame.objectives?.(s);
        assert.deepEqual(o, { completed: s.L.stones.length + 1, total: s.L.stones.length + 1 });
    }
});

test("every level is crossed with the keys alone", () => {
    BRIDGE_LEVELS.forEach((L, level) => {
        const s = bridgeGame.start(level),
            pad = emptyPad();
        const press = (d: "left" | "right" | "up" | "down", times = 1) => {
            for (let k = 0; k < Math.abs(times); k++) {
                pad.pressed.push(d);
                tick(s, pad);
            }
        };
        press("right");
        for (const [i, u] of answer(s)) {
            assert.equal(s.cursor?.mode, "pick");
            const at = s.cursor?.mode === "pick" ? s.cursor.i : 0,
                want = pickable(s).indexOf(i);
            press(want >= at ? "right" : "left", want - at);
            press("up");
            assert.equal(s.held, i, `${L.title}: picked plank ${i}`);
            const step = L.tick < 1 ? L.tick : L.tick / 2;
            press(u >= 0 ? "right" : "left", Math.round(u / step));
            press("up");
            settle(s);
        }
        go(s);
        assert.ok(bridgeGame.won(s), `${L.title}: ${bridgeGame.say(s)}`);
    });
});

test("a plank too short for its gap falls in and floats back to the grass", () => {
    const s = bridgeGame.start(0);
    lay(s, 0, 0);
    const p = s.planks[0];
    assert.ok(p && p.parts === null, "the 2 plank is back on the grass");
    assert.match(bridgeGame.say(s), /No plank is laid yet/);
});

test("a plank that sticks out holds until Charlie walks out on it, and a fall loses nothing", () => {
    const s = bridgeGame.start(0);
    lay(s, 3, 0);
    assert.ok(s.planks[3]?.parts, "the 6 rests on the bank and the stone");
    go(s);
    assert.equal(s.falls, 1);
    assert.equal(s.phase, "stand");
    assert.ok(s.charlie.x < s.x0, "Charlie climbed out on the near bank");
    for (const [i, u] of answer(s)) lay(s, i, u);
    go(s);
    assert.ok(bridgeGame.won(s), bridgeGame.say(s));
});

test("Charlie stops at a gap she cannot step over, and goes on when it is bridged", () => {
    const s = bridgeGame.start(1);
    lay(s, 1, 0);
    go(s);
    assert.equal(s.phase, "stand");
    assert.match(s.said, /stops/);
    assert.ok(Math.abs(s.charlie.x - sq(s, 3)) < 1.5, `she waits by the stone, at ${s.charlie.x}`);
    lay(s, 2, 3);
    lay(s, 3, 7);
    go(s);
    assert.ok(bridgeGame.won(s), bridgeGame.say(s));
});

test("taking back returns the last plank laid to the grass", () => {
    const s = bridgeGame.start(0);
    lay(s, 2, 0);
    assert.ok(s.planks[2]?.parts);
    assert.ok(bridgeGame.back?.(s));
    assert.equal(s.planks[2]?.parts, null);
    assert.equal(bridgeGame.back?.(s), false);
});

test("random planks let go near the stones make a bridge at most one time in five", () => {
    BRIDGE_LEVELS.forEach((L, level) => {
        const rnd = seeded(97 + level);
        let wins = 0;
        const trials = 40;
        for (let t = 0; t < trials; t++) {
            const s = bridgeGame.start(level);
            const free = [...L.planks.keys()];
            for (const u of [0, ...L.stones]) {
                const i = free.splice(Math.floor(rnd() * free.length), 1)[0];
                if (i !== undefined) lay(s, i, u, (rnd() - 0.5) * L.per);
            }
            go(s);
            if (bridgeGame.won(s)) wins++;
        }
        assert.ok(wins / trials <= 0.2, `${L.title}: ${wins} of ${trials}`);
    });
});

test("the same hands give the same crossing", () => {
    const run = () => {
        const s = bridgeGame.start(0);
        lay(s, 3, 0);
        go(s);
        for (const [i, u] of answer(s)) lay(s, i, u);
        go(s);
        return {
            said: bridgeGame.say(s),
            charlie: s.charlie.x,
            planks: s.planks.map((_, i) => plankAt(s, i)),
            steps: s.steps,
        };
    };
    assert.deepEqual(run(), run());
});

test("under reduced motion a press and its settling end where the steps would", () => {
    const normal = bridgeGame.start(0),
        reduced = bridgeGame.start(0);
    for (const s of [normal, reduced]) for (const [i, u] of answer(s)) lay(s, i, u);
    go(normal);
    const pad = emptyPad();
    pad.go = true;
    pad.tapped = true;
    for (let i = 0; i < bridgeGame.still.press(reduced); i++) tick(reduced, pad);
    pad.go = false;
    for (let i = 0; i < LIMIT && bridgeGame.still.settling?.(reduced); i++) tick(reduced, pad);
    assert.ok(bridgeGame.won(reduced));
    assert.equal(reduced.charlie.x, normal.charlie.x);
});

test("every drawing it names is on the shelf, and its tuning is sound", () => {
    const seen = new Set<string>([bridgeGame.cover.art]);
    BRIDGE_LEVELS.forEach((_, level) => {
        const s = bridgeGame.start(level);
        const look = () => {
            for (const sp of bridgeGame.frame(s).sprites) seen.add(sp.art);
            for (const sp of bridgeGame.frame(s, true).sprites) seen.add(sp.art);
        };
        look();
        for (const [i, u] of answer(s)) lay(s, i, u);
        look();
    });
    for (const art of seen) assert.ok(SHELF_IDS.has(art), `${art} is not on the shelf`);
    assert.deepEqual(faults(BRIDGE), []);
    for (const L of BRIDGE_LEVELS)
        assert.ok(!/[—!]/.test(`${L.goal} ${L.prompt} ${bridgeGame.hint}`));
});

test("planks that add up to the gap hang as a rope bridge Charlie crosses, and a rope too long sags into the water", () => {
    const level = BRIDGE_LEVELS.findIndex((L) => L.rope);
    const s = bridgeGame.start(level);
    for (const [i, u] of answer(s)) lay(s, i, u);
    assert.match(bridgeGame.say(s), /together 8, tied to the far post/);
    go(s);
    assert.ok(bridgeGame.won(s), bridgeGame.say(s));
    assert.equal(s.falls, 0);

    const long = bridgeGame.start(level);
    const sides = answer(long).slice(0, 2);
    for (const [i, u] of sides) lay(long, i, u);
    // 6 and 3 make 9 on a gap of 8
    lay(long, 4, 4);
    lay(long, 2, 10);
    assert.match(bridgeGame.say(long), /together 9, tied to the far post/);
    go(long);
    assert.equal(long.won, false);
    assert.equal(long.falls, 1, "Charlie slipped into the water");
    assert.ok(long.charlie.x < long.x0, "and swam back to the near bank");
    assert.ok(bridgeGame.back?.(long), "the last plank comes off the rope");
    assert.match(bridgeGame.say(long), /holds 6, together 6, short of the far post/);
});

test("Charlie's drawing follows what she does: a fade into the walk, a stride, and a cheer across", () => {
    const s = bridgeGame.start(0);
    for (const [i, u] of answer(s)) lay(s, i, u);
    const pad = emptyPad();
    pad.go = true;
    pad.tapped = true;
    tick(s, pad);
    const poses = new Set<string>();
    let faded = false;
    for (let i = 0; i < LIMIT && bridgeGame.still.settling?.(s); i++) {
        tick(s, emptyPad());
        for (const sp of bridgeGame.frame(s).sprites) {
            if (sp.key === "charlie:was") faded = true;
            if (sp.key === "charlie") poses.add(String(sp.params?.pose));
        }
    }
    assert.ok(bridgeGame.won(s));
    assert.ok(faded, "the wave faded into the walk");
    for (const pose of ["stand", "walk", "cheer"])
        assert.ok(poses.has(pose), `she was drawn ${pose}`);
    const rest = bridgeGame.frame(s, true).sprites.filter((sp) => sp.key.startsWith("charlie"));
    assert.equal(rest.length, 1, "at rest she is one drawing");
});

test("the lift carries Charlie up only when the basket outweighs her, and bangs when it is far heavier", () => {
    const level = BRIDGE_LEVELS.findIndex((L) => L.lift);
    const load = (s: BridgeState, kgs: number[]) => {
        const b = s.lift ? s.physics.where(s.lift.basket) : null;
        assert.ok(b);
        for (const kg of kgs) {
            const i = s.L.planks.findIndex((n, j) => n === kg && !s.load.includes(j));
            lay(s, i, (b.x - lengthOf(s, i) / 2 - s.x0) / s.L.per);
        }
    };
    const light = bridgeGame.start(level);
    load(light, [8, 9]);
    go(light);
    assert.equal(loadOf(light), 17);
    assert.match(light.said, /stays down/);
    assert.ok(!bridgeGame.won(light));
    // a sack added while she waits on the lift sends it up
    load(light, [5]);
    settle(light);
    assert.ok(bridgeGame.won(light), bridgeGame.say(light));

    const even = bridgeGame.start(level);
    load(even, [8, 9, 3]);
    go(even);
    assert.match(even.said, /hangs still/);

    const heavy = bridgeGame.start(level);
    load(heavy, [9, 8, 5, 3]);
    go(heavy);
    assert.equal(loadOf(heavy), 25);
    assert.equal(heavy.falls, 1);
    assert.match(heavy.said, /bangs/);
    assert.ok(heavy.charlie.x < heavy.x0, "she is back on the near bank");
    assert.ok(bridgeGame.back?.(heavy), "the last sack comes out");
    go(heavy);
    assert.ok(bridgeGame.won(heavy), bridgeGame.say(heavy));
});

test("a recorded loading of the lift lands where it did", () => {
    const level = BRIDGE_LEVELS.findIndex((L) => L.lift);
    const s = bridgeGame.start(level);
    for (const [i, u] of [
        [4, -3.46],
        [1, -3.46],
        [6, -3.46],
    ] as const)
        lay(s, i, u);
    assert.equal(loadOf(s), 24);
    go(s);
    assert.ok(bridgeGame.won(s), bridgeGame.say(s));
    assert.equal(s.falls, 0);
});
