// Firefly trail: every level and layout is flown to the end by a finger and by the keys, seeds join
// only in the order of the count, a knock drops beads that are picked up again, the backwards count
// shortens the trail, random flying almost never finishes, and a replay is the same flight.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { aimOf, pilot } from "./firefly-pilot";
import {
    FIREFLY,
    FIREFLY_LEVELS,
    beadsAt,
    countOf,
    seedAt,
    snakeGame,
    start,
    step,
    wantedSeed,
    type FireflyState,
} from "../snake";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { faults } from "../../../engine/motion/tune";

function fly(s: FireflyState, pad: Pad, n: number): void {
    for (let i = 0; i < n; i++) {
        step(s, pad);
        spent(pad);
    }
}

test("every level, in every layout, is flown to the end by a held finger and by the keys", () => {
    FIREFLY_LEVELS.forEach((L, level) => {
        for (const seed of [1, 2, 4])
            for (const input of ["pointer", "keys"] as const) {
                const s = start(level, seed);
                pilot(s, input);
                assert.ok(
                    s.won,
                    `${L.title}, layout ${seed}, ${input}: ${s.next} of ${L.seeds} caught, ${s.beads} beads, ${s.loose.length} fallen`,
                );
                assert.equal(s.beads, L.back ? 0 : L.seeds * L.by);
                assert.deepEqual(snakeGame.objectives?.(s), { completed: L.seeds, total: L.seeds });
            }
    });
});

test("a seed joins only when it is next in the count, and the trail grows by the step", () => {
    const s = start(1);
    const wrong = s.seeds.find((x) => !countOf(s.L).includes(x.n));
    assert.ok(wrong);
    s.at = seedAt(s, wrong);
    step(s, emptyPad());
    assert.equal(s.next, 0);
    assert.equal(s.beads, 0);
    assert.ok(Math.hypot(wrong.v.x, wrong.v.y) > 1, "a wrong seed is nudged away");
    assert.match(s.said, new RegExp(`That is ${wrong.n}\\. The next is 5\\.`));
    const want = wantedSeed(s);
    assert.ok(want);
    s.at = seedAt(s, want);
    step(s, emptyPad());
    assert.equal(s.next, 1);
    assert.equal(s.beads, 5);
    fly(s, emptyPad(), 60);
    assert.equal(beadsAt(s).length, 5);
});

test("a nettle knocks the last beads off, and flying through them picks them up again", () => {
    const s = start(1);
    for (let k = 0; k < 2; k++) {
        const want = wantedSeed(s);
        assert.ok(want);
        s.at = seedAt(s, want);
        step(s, emptyPad());
    }
    assert.equal(s.beads, 10);
    const nettle = s.L.nettles[0];
    assert.ok(nettle);
    s.at = { x: nettle.x, y: 26 };
    step(s, emptyPad());
    assert.equal(s.beads, 5);
    assert.equal(s.loose.length, 5);
    assert.match(s.said, /nettles/);
    fly(s, emptyPad(), 120);
    for (let t = 0; t < 60 * 30 && s.loose.length; t++) {
        const pad = emptyPad();
        pad.touch = aimOf(s);
        step(s, pad);
    }
    assert.equal(s.loose.length, 0);
    assert.equal(s.beads, 10);
});

test("counting back starts with a long trail and each seed takes its step off", () => {
    const level = FIREFLY_LEVELS.findIndex((L) => L.back);
    const s = start(level);
    assert.equal(s.beads, 40);
    const want = wantedSeed(s);
    assert.equal(want?.n, 36);
    if (want) s.at = seedAt(s, want);
    step(s, emptyPad());
    assert.equal(s.beads, 36);
});

test("random flying for a minute finishes a level at most one time in five", () => {
    FIREFLY_LEVELS.forEach((L, level) => {
        const rnd = seeded(51 + level);
        let won = 0;
        const trials = 10;
        for (let t = 0; t < trials; t++) {
            const s = start(level, 1 + t),
                pad = emptyPad();
            for (let k = 0; k < 60 * 60 && !s.won; k++) {
                if (k % 30 === 0) pad.touch = { x: rnd() * L.across, y: 2 + rnd() * 24 };
                step(s, pad);
                spent(pad);
            }
            if (s.won) won++;
        }
        assert.ok(won / trials <= 0.2, `${L.title}: ${won} of ${trials}`);
    });
});

test("the same hands give the same flight, and under reduced motion a press is its own steps", () => {
    const run = () => {
        const s = start(3, 2);
        pilot(s, "pointer", 60 * 20);
        return JSON.stringify(s);
    };
    assert.equal(run(), run());
    const normal = start(0),
        reduced = start(0),
        pad = emptyPad();
    pad.holding = ["right"];
    fly(normal, pad, snakeGame.still.press(normal) * 3);
    for (let p = 0; p < 3; p++) fly(reduced, pad, snakeGame.still.press(reduced));
    assert.deepEqual(reduced, normal);
});

test("every drawing it names is on the shelf, and its tuning is sound", () => {
    const seen = new Set<string>([snakeGame.cover.art]);
    FIREFLY_LEVELS.forEach((_, level) => {
        const s = start(level);
        for (const sp of snakeGame.frame(s).sprites) seen.add(sp.art);
        pilot(s, "pointer", 60 * 15);
        for (const sp of snakeGame.frame(s, true).sprites) seen.add(sp.art);
    });
    for (const art of seen) assert.ok(SHELF_IDS.has(art), `${art} is not on the shelf`);
    assert.deepEqual(faults(FIREFLY), []);
    for (const L of FIREFLY_LEVELS)
        assert.ok(!/[—!]/.test(`${L.goal} ${L.prompt} ${snakeGame.hint}`));
});

test("the garden is drawn in daylight colours, the pond is water the frogs ripple, and a rest frame stands still", () => {
    const pond = FIREFLY_LEVELS.findIndex((L) => L.pond);
    const s = start(pond, 1);
    for (let i = 0; i < 180; i++) step(s, emptyPad());
    const f = snakeGame.frame(s);
    assert.ok(!("night" in f));
    assert.equal(f.water?.length, 1);
    assert.ok((f.water?.[0]?.ripples?.length ?? 0) > 0);
    assert.equal(f.time, s.steps / snakeGame.rate);
    assert.ok(f.lights?.some((l) => l.flicker));
    assert.ok(f.sprites.some((p) => p.key.startsWith("seed:") && (p.glow ?? 0) > 0));
    const rest = snakeGame.frame(s, true);
    assert.equal(rest.time, 0);
    assert.deepEqual(rest.water?.[0]?.ripples, []);
    assert.ok(rest.lights?.every((l) => !l.flicker));
    assert.deepEqual(snakeGame.frame(start(0, 1)).water, []);
});
