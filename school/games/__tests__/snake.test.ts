// Firefly trail: every level and layout is played to the end by taps and by the keys, seeds join only
// in the order of the count, a knock drops beads the firefly goes back for, the backwards count
// shortens the trail, random tapping almost never finishes, the way goes round the hedges, and a
// replay is the same flight.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { pilot } from "./firefly-pilot";
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

test("every level, in every layout, is played to the end by taps and by the keys", () => {
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
    let nopes = 0;
    for (let i = 0; i < 120; i++)
        nopes += step(s, emptyPad()).filter((h) => "cue" in h && h.cue === "nope").length;
    assert.equal(nopes, 0, "it says not yet once, not again while the firefly stays by it");
    assert.match(s.said, new RegExp(`Not yet\\. That is ${wrong.n}\\. The next is 5\\.`));
    const want = wantedSeed(s);
    assert.ok(want);
    s.at = seedAt(s, want);
    step(s, emptyPad());
    assert.equal(s.next, 1);
    assert.equal(s.beads, 5);
    fly(s, emptyPad(), 60);
    assert.equal(beadsAt(s).length, 5);
});

test("a nettle knocks the last beads off, and the firefly goes back for them on its own", () => {
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
    for (let t = 0; t < 60 * 30 && s.loose.length; t++) step(s, emptyPad());
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

test("tapping seeds at random, with the taps a child who knows the count needs and two more, finishes a level at most one time in five", () => {
    FIREFLY_LEVELS.forEach((L, level) => {
        const rnd = seeded(51 + level);
        let won = 0;
        const trials = 20;
        for (let t = 0; t < trials; t++) {
            const s = start(level, 1 + (t % 3));
            let taps = L.seeds + 2;
            for (let k = 0; k < 60 * 120 && !s.won && (taps > 0 || s.goal || s.loose.length); k++) {
                const pad = emptyPad();
                if (!s.goal && !s.loose.length && taps > 0 && k % 20 === 0) {
                    const left = s.seeds.filter((x) => !x.got),
                        pick = left[Math.floor(rnd() * left.length)];
                    pad.lifted = pick ? seedAt(s, pick) : null;
                    taps--;
                }
                step(s, pad);
            }
            if (s.won) won++;
        }
        assert.ok(won / trials <= 0.2, `${L.title}: ${won} of ${trials}`);
    });
});

test("the same pads give the same flight, and under reduced motion one press is a whole flight", () => {
    const pads: Pad[] = [],
        played = start(3, 2);
    pilot(played, "pointer", 60 * 20, pads);
    const again = start(3, 2);
    for (const pad of pads) step(again, { ...pad, pressed: [...pad.pressed] });
    assert.equal(JSON.stringify(again), JSON.stringify(played));
    const s = start(0),
        want = wantedSeed(s);
    assert.ok(want);
    const pad = emptyPad();
    pad.lifted = seedAt(s, want);
    fly(s, pad, snakeGame.still.press(s));
    for (let i = 0; i < 60 * 20 && snakeGame.still.settling?.(s); i++) step(s, emptyPad());
    assert.equal(snakeGame.still.settling?.(s), false);
    assert.equal(s.next, 1);
});

test("a tap behind a hedge flies round it, and a held finger is followed closely", () => {
    const level = FIREFLY_LEVELS.findIndex((L) => L.hedges.length);
    const s = start(level),
        hedge = s.L.hedges[0];
    assert.ok(hedge);
    s.at = { x: hedge.x - 3, y: hedge.y + hedge.h / 2 };
    const pad = emptyPad();
    pad.lifted = { x: hedge.x + hedge.w + 3, y: hedge.y + hedge.h / 2 };
    let bumped = false;
    for (let i = 0; i < 60 * 20 && s.goal; i++)
        if (step(s, i ? emptyPad() : pad).some((h) => "cue" in h && h.cue === "bump"))
            bumped = true;
    assert.equal(s.goal, null);
    assert.ok(!bumped, "it went round the hedge, not into it");
    const held = start(0),
        finger = { x: held.at.x + 8, y: held.at.y + 4 };
    for (let i = 0; i < 90; i++) step(held, { ...emptyPad(), touch: finger });
    assert.ok(Math.hypot(held.at.x - finger.x, held.at.y - finger.y) < 0.5);
    for (let i = 0; i < 60; i++) step(held, emptyPad());
    assert.ok(Math.hypot(held.v.x, held.v.y) < 0.1, "let go, it hovers where it is");
});

test("the keys fly it as before: left and right turn it, holding the big button hurries it, and a tap takes over", () => {
    const s = start(0),
        from = { ...s.at };
    for (let i = 0; i < 60; i++) step(s, { ...emptyPad(), brake: i === 0 });
    assert.ok(s.keyed, "a key takes it off the hover");
    assert.ok(s.at.x > from.x + 1, "flying by the keys, it keeps flying along its heading");
    const heading = s.heading;
    for (let i = 0; i < 30; i++) step(s, { ...emptyPad(), holding: ["left"] });
    assert.ok(s.heading < heading - 1, "a held left arrow turns it");
    const cruising = Math.hypot(s.v.x, s.v.y);
    for (let i = 0; i < 40; i++) step(s, { ...emptyPad(), go: true });
    assert.ok(Math.hypot(s.v.x, s.v.y) > cruising * 1.3, "holding the big button hurries it");
    const want = wantedSeed(s);
    assert.ok(want);
    step(s, { ...emptyPad(), lifted: seedAt(s, want) });
    assert.equal(s.keyed, false, "a tap on a seed takes over from the keys");
    assert.deepEqual(s.goal, { seed: want.spot });
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
