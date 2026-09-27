// Measure it out by hand: every level is won by tipping jugs with a pointer and with the keys, along
// the fewest whole pours the puzzle has; a pour stops at the other jug's brim without a drop spilt
// and a second tip over a full jug spills; random tipping rarely makes the amount; and every level is
// still the puzzle the prover holds to be winnable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import {
    CARRY,
    POUR,
    POUR_LEVELS,
    fillAt,
    keyPlaces,
    landed,
    middleOf,
    pourGame,
    startPour,
    tapAt,
    toleranceOf,
    type PourState,
} from "../pour-hands";
import { pour, type PourMove, type PourVersion } from "../pour";
import { pourRound } from "../pour-challenges";
import { prove } from "../prove";
import { emptyPad, spent, type Dir, type Pad } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { faults } from "../../../engine/motion/tune";

function tick(s: PourState, pad: Pad, n = 1): void {
    for (let i = 0; i < n; i++) {
        pourGame.step(s, pad);
        spent(pad);
    }
}

function settle(s: PourState): void {
    const pad = emptyPad();
    for (let i = 0; i < 600 && pourGame.still.settling?.(s); i++) tick(s, pad);
    tick(s, pad, 40);
}

/** The fewest whole pours from empty jugs to the target, by the puzzle's own moves. */
function route(v: PourVersion): PourMove[] {
    const start = pour.start(v),
        seen = new Map<string, PourMove[]>([[pour.key(start), []]]),
        todo = [start];
    for (let k = 0; k < todo.length; k++) {
        const s = todo[k] ?? start,
            path = seen.get(pour.key(s)) ?? [];
        if (pour.won(s, v)) return path;
        for (const m of pour.moves(s, v)) {
            const next = pour.apply(s, m, v);
            if (!seen.has(pour.key(next))) {
                seen.set(pour.key(next), [...path, m]);
                todo.push(next);
            }
        }
    }
    throw new Error("no route");
}

const HOLD = 60 * 20;

/** Where the hand goes to put the carried jug's handle at `x`, `y`: the hand holds it where it took hold. */
const hand = (s: PourState, x: number, y: number) => ({ x: x - s.grip.x, y: y - s.grip.y });
const tipY = (tilt: number) => CARRY + tilt / POUR.tilt.value;

/** A whole pour made by a hand on the jugs. */
function byHand(s: PourState, m: PourMove): void {
    const pad = emptyPad();
    const grab = (i: number) => {
        const at = middleOf(s, i);
        assert.ok(at);
        pad.touch = at;
        tick(s, pad);
        assert.equal(s.held, i);
    };
    const until = (done: () => boolean) => {
        for (let t = 0; t < HOLD && !done(); t++) {
            pad.touch = pad.touch ? { ...pad.touch } : null;
            tick(s, pad);
        }
    };
    const letGo = (at: { x: number; y: number }) => {
        pad.touch = null;
        pad.lifted = at;
        tick(s, pad);
        settle(s);
    };
    if ("fill" in m) {
        const i = m.fill;
        grab(i);
        pad.touch = hand(s, fillAt(s), CARRY);
        tick(s, pad);
        letGo(hand(s, fillAt(s), CARRY));
        pad.touch = tapAt(s);
        tick(s, pad);
        until(() => (s.jugs[i]?.level ?? 0) >= (s.jugs[i]?.max ?? 0));
        letGo(tapAt(s));
        grab(i);
        const home = keyPlaces(s, i).at(-1)?.x ?? 40;
        pad.touch = hand(s, home, CARRY);
        tick(s, pad);
        letGo(hand(s, home, CARRY));
        return;
    }
    const i = "empty" in m ? m.empty : m.from;
    const place = "empty" in m ? "flowers" : `jug:${m.to}`;
    const x = keyPlaces(s, i).find((p) => p.id === place)?.x ?? 0;
    grab(i);
    pad.touch = hand(s, x, CARRY);
    tick(s, pad);
    pad.touch = hand(s, x, tipY(1.8));
    const giver = s.jugs[i];
    until(() => (giver?.level ?? 0) <= 0 || giver?.stopped === true);
    pad.touch = hand(s, x, CARRY);
    tick(s, pad);
    letGo(hand(s, x + 15, CARRY));
}

/** A whole pour made with the keys alone. */
function byKeys(s: PourState, m: PourMove): void {
    const pad = emptyPad();
    const press = (d: Dir, n = 1) => {
        for (let k = 0; k < n; k++) {
            pad.pressed.push(d);
            tick(s, pad);
        }
    };
    const pick = (i: number) => {
        if (s.cursor < 0) press("right");
        press("right", (i - s.cursor + s.jugs.length) % s.jugs.length);
        press("up");
        assert.equal(s.held, i);
    };
    const to = (id: string) => {
        for (let k = 0; k < 8 && keyPlaces(s, s.held)[s.keyAt]?.id !== id; k++) press("right");
        assert.equal(keyPlaces(s, s.held)[s.keyAt]?.id, id);
    };
    const tip = (done: () => boolean) => {
        pad.holding = ["down"];
        for (let t = 0; t < HOLD && !done(); t++) tick(s, pad);
        pad.holding = [];
        tick(s, pad, 120);
    };
    if ("fill" in m) {
        const i = m.fill;
        pick(i);
        to("tap");
        press("up");
        pad.go = true;
        for (let t = 0; t < HOLD && (s.jugs[i]?.level ?? 0) < (s.jugs[i]?.max ?? 0); t++)
            tick(s, pad);
        pad.go = false;
        tick(s, pad);
        pick(i);
        to("flowers");
        press("up");
        settle(s);
        return;
    }
    const i = "empty" in m ? m.empty : m.from,
        giver = s.jugs[i];
    pick(i);
    to("empty" in m ? "flowers" : `jug:${m.to}`);
    tip(() => (giver?.level ?? 0) <= 0 || giver?.stopped === true);
    press("up");
    settle(s);
}

test("every level is still the puzzle, which the prover holds to be winnable with whole pours", () => {
    for (const L of POUR_LEVELS) {
        const p = prove(pourRound(L.v));
        assert.ok(p.ok, `${L.title}: ${p.problems.join("; ")}`);
    }
});

test("every level is won by tipping the jugs by hand, and with the keys alone", () => {
    POUR_LEVELS.forEach((L, level) => {
        for (const [how, play] of [
            ["hand", byHand],
            ["keys", byKeys],
        ] as const) {
            const s = pourGame.start(level);
            for (const m of route(L.v)) play(s, m);
            settle(s);
            assert.ok(pourGame.won(s), `${L.title} by ${how}: ${pourGame.say(s)}`);
            assert.equal(s.spilt, 0, `${L.title} by ${how}: nothing spilt`);
        }
    });
});

test("a pour stops by itself at the other jug's brim, and a second tip over a full jug spills", () => {
    const s = startPour({ ...(POUR_LEVELS[0] ?? POUR_LEVELS[0]) }, 0);
    byHand(s, { fill: 0 });
    byHand(s, { from: 0, to: 1 });
    assert.deepEqual(
        s.jugs.map((j) => Math.round(j.level * 1e6) / 1e6),
        [200, 300],
    );
    assert.ok(pourGame.won(s), "and 200 ml is exactly what was asked for");
    const again = startPour({ ...(POUR_LEVELS[2] ?? POUR_LEVELS[0]) }, 2);
    byHand(again, { fill: 0 });
    byHand(again, { from: 0, to: 1 });
    const pad = emptyPad(),
        x = keyPlaces(again, 0).find((p) => p.id === "jug:1")?.x ?? 0;
    pad.touch = middleOf(again, 0);
    tick(again, pad);
    pad.touch = hand(again, x, CARRY);
    tick(again, pad);
    pad.touch = hand(again, x, tipY(1.6));
    tick(again, pad, 60);
    assert.ok(again.spilt > 0, "the three is full, so it spills");
    assert.equal(again.jugs[1]?.level, 3);
});

test("random tipping and filling makes the amount at most one time in five", () => {
    POUR_LEVELS.forEach((L, level) => {
        const rnd = seeded(41 + level);
        let wins = 0;
        const trials = 40;
        for (let t = 0; t < trials; t++) {
            const s = pourGame.start(level);
            for (let a = 0; a < 10 && !s.won; a++) {
                const pad = emptyPad(),
                    i = Math.floor(rnd() * s.jugs.length),
                    at = middleOf(s, i);
                if (!at) continue;
                pad.touch = at;
                tick(s, pad);
                if (rnd() < 0.35) {
                    pad.touch = hand(s, fillAt(s), CARRY);
                    tick(s, pad);
                    pad.touch = null;
                    pad.lifted = hand(s, fillAt(s), CARRY);
                    tick(s, pad);
                    pad.touch = tapAt(s);
                    tick(s, pad, Math.floor(rnd() * 150));
                    pad.touch = null;
                    pad.lifted = tapAt(s);
                    tick(s, pad);
                } else {
                    const places = keyPlaces(s, i),
                        p = places[Math.floor(rnd() * places.length)];
                    pad.touch = hand(s, p?.x ?? 0, tipY(0.3 + rnd() * 1.6));
                    tick(s, pad, Math.floor(rnd() * 120));
                    pad.touch = null;
                    pad.lifted = hand(s, (p?.x ?? 0) + 15, CARRY);
                    tick(s, pad);
                }
                settle(s);
            }
            if (s.won) wins++;
        }
        assert.ok(wins / trials <= 0.2, `${L.title}: ${wins} of ${trials}`);
    });
});

test("the same hands give the same jugs, and under reduced motion a press ends where the steps would", () => {
    const run = () => {
        const s = pourGame.start(3);
        for (const m of route(s.L.v).slice(0, 3)) byHand(s, m);
        return JSON.stringify(s);
    };
    assert.equal(run(), run());
    const normal = pourGame.start(0),
        reduced = pourGame.start(0);
    const pad = emptyPad();
    for (const s of [normal, reduced]) {
        pad.pressed = ["right"];
        tick(s, pad);
        pad.pressed = ["up"];
        tick(s, pad);
    }
    pad.holding = ["down"];
    tick(normal, pad, pourGame.still.press(normal));
    for (let i = 0; i < pourGame.still.press(reduced); i++) tick(reduced, pad);
    pad.holding = [];
    for (let i = 0; i < 600 && pourGame.still.settling?.(reduced); i++) tick(reduced, pad);
    for (let i = 0; i < 600 && pourGame.still.settling?.(normal); i++) tick(normal, pad);
    assert.deepEqual(
        reduced.jugs.map((j) => j.level),
        normal.jugs.map((j) => j.level),
    );
});

test("every drawing it names is on the shelf, its tuning is sound, and its words have no dashes", () => {
    const seen = new Set<string>([pourGame.cover.art]);
    POUR_LEVELS.forEach((L, level) => {
        const s = pourGame.start(level);
        for (const sp of pourGame.frame(s).sprites) seen.add(sp.art);
        assert.ok(!/[—!]/.test(`${L.goal} ${L.prompt}`));
        assert.ok(toleranceOf(L) < Math.min(...L.v.jugs.map((j) => j.step)) / 2);
    });
    for (const art of seen) assert.ok(SHELF_IDS.has(art), `${art} is not on the shelf`);
    assert.deepEqual(faults(POUR), []);
    assert.ok(!/[—!]/.test(pourGame.hint));
});

test("the water falls as drops, and a jug reads what has landed in it until the stream has arrived", () => {
    const s = pourGame.start(0);
    byHand(s, { fill: 0 });
    const pad = emptyPad(),
        x = keyPlaces(s, 0).find((p) => p.id === "jug:1")?.x ?? 0;
    pad.touch = middleOf(s, 0);
    tick(s, pad);
    pad.touch = hand(s, x, CARRY);
    tick(s, pad);
    pad.touch = hand(s, x, tipY(1.8));
    const readings: number[] = [];
    let drops = 0;
    for (let t = 0; t < 90; t++) {
        tick(s, pad);
        readings.push(landed(s, 1));
        drops = Math.max(drops, s.drops.tags.length);
    }
    assert.ok(drops > 10, `a stream of drops is falling: ${drops}`);
    assert.ok((s.jugs[1]?.level ?? 0) > landed(s, 1), "the jug counts water still in the air");
    assert.ok(
        readings.every((r, i) => i === 0 || r >= (readings[i - 1] ?? 0) - 1e-9),
        "the reading only rises",
    );
    pad.touch = hand(s, x, CARRY);
    tick(s, pad);
    pad.touch = null;
    pad.lifted = hand(s, x + 15, CARRY);
    tick(s, pad);
    settle(s);
    assert.equal(s.drops.tags.length, 0);
    s.jugs.forEach((j, i) => assert.ok(Math.abs(landed(s, i) - j.level) < 1e-9));
});

test("a jug's water sloshes when it is carried and stands level again at rest", () => {
    const s = pourGame.start(0);
    byHand(s, { fill: 0 });
    const pad = emptyPad(),
        home = middleOf(s, 0);
    assert.ok(home);
    pad.touch = home;
    tick(s, pad);
    for (let t = 0; t < 12; t++) {
        pad.touch = { x: home.x + t * 0.8, y: home.y - 3 };
        tick(s, pad);
    }
    const jolted = Math.abs(s.jugs[0]?.slosh.a ?? 0);
    assert.ok(jolted > 0.02, `the surface tipped: ${jolted}`);
    pad.touch = null;
    pad.lifted = { x: home.x, y: home.y - 3 };
    tick(s, pad);
    tick(s, emptyPad(), 240);
    assert.ok(Math.abs(s.jugs[0]?.slosh.a ?? 1) < 0.005);
    const water = pourGame.frame(s, true).liquid?.find((p) => p.z === 19.5);
    assert.ok(water && water.drops.length > 100, "the water is drawn in the jug");
});
