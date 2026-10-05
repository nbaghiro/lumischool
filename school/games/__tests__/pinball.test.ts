// Pinball garden: every variation of every target level is won through the keys by the solver, the
// same keys replay to the same table, and the same win comes from a finger on the field; a single
// ball of random flipping rarely hits a target; a hit past an exact target does not count and the
// third starts the total again; a flip a moment early or quick still bats the ball; an even flower closes the odd ones; a ladybird out of turn bounces
// the ball away; free play keeps its best score; and the frame draws only shelf drawings over a
// garden wider than the view.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, type Dir, type Pad } from "../../../engine/motion/pad";
import { faults } from "../../../engine/motion/tune";
import {
    PIN_LEVELS,
    TABLE_AT,
    award,
    ladyHit,
    pinballGame as g,
    startPin,
    tipOf,
    type PinState,
} from "../pinball";
import { PIN_VARIANTS, openPinConfiguration, pinWay } from "../pinball-challenges";
import { PINBALL } from "../../../engine/parts/sport/pinballtable";

const copy = (p: Pad): Pad => ({ ...p, holding: [...p.holding], pressed: [...p.pressed] });
const play = (s: PinState, pads: readonly Pad[]) => {
    for (const p of pads) g.step(s, copy(p));
};
/** Every level with a target to reach, which is every level but free play. */
const TARGETS = PIN_LEVELS.map((_, i) => i).filter((i) => PIN_LEVELS[i]?.ask.kind !== "free");

/** A world point from table squares. */
const world = (x: number, y: number) => ({ x: x + TABLE_AT.x, y: y + TABLE_AT.y });

/**
 * The same play by a finger: the plunger drawn down in the lane as far as the key had pulled it, and a
 * flipper held by a finger on its side of the table, step for step with the keys.
 */
function byTouch(start: PinState, keys: readonly Pad[]): Pad[] {
    const shadow = structuredClone(start),
        out: Pad[] = [];
    const grab = 28;
    for (const k of keys) {
        g.step(shadow, copy(k));
        const p = emptyPad();
        if (k.holding.includes("down")) p.touch = world(PINBALL.rest.x, grab + 4 * shadow.pull);
        else if (k.holding.includes("left")) p.touch = world(5, 32);
        else if (k.holding.includes("right")) p.touch = world(15.3, 32);
        out.push(p);
    }
    return out;
}

test("every variation of every target level is won through the keys, and the keys replay to the same table", () => {
    for (const phase of TARGETS)
        for (let variant = 0; variant < PIN_VARIANTS; variant++) {
            const c = { phase, variant },
                way = pinWay(c);
            assert.ok(way, `level ${phase} variation ${variant} has no way through`);
            const a = openPinConfiguration(c),
                b = openPinConfiguration(c);
            play(a, way);
            play(b, way);
            assert.ok(a.won, `level ${phase} variation ${variant} is not won by its own keys`);
            assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
            const keysOnly = way.every(
                (p) => !p.touch && !p.pull && p.holding.every((d) => d !== "up"),
            );
            assert.ok(keysOnly);
        }
});

test("the same play by a finger on the field wins as the keys do", () => {
    for (const phase of TARGETS)
        for (let variant = 0; variant < PIN_VARIANTS; variant++) {
            const c = { phase, variant },
                way = pinWay(c);
            if (!way) continue;
            const s = openPinConfiguration(c),
                hands = byTouch(s, way);
            assert.ok(hands.every((p) => p.holding.length === 0));
            play(s, hands);
            assert.ok(s.won, `level ${phase} variation ${variant} is not won by a finger`);
        }
});

/** A small seeded random, so the random player is the same every run. */
function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

test("one ball of random flipping hits a target at most 4 times in 20 on any level that asks for more than counting", () => {
    for (const phase of TARGETS) {
        if (PIN_LEVELS[phase]?.ask.kind === "hits") continue;
        let wins = 0;
        for (let k = 0; k < 20; k++) {
            const r = rng(k * 97 + phase),
                s = g.start(phase);
            let hold: Dir[] = [],
                left = 0,
                pull = 0;
            for (let i = 0; i < 60 * 30 && !s.won && s.balls < 1; i++) {
                const p = emptyPad();
                if (s.resting) {
                    if (pull === 0) pull = 20 + Math.floor(r() * 28);
                    if (pull > 1) {
                        p.holding = ["down"];
                        pull--;
                    } else pull = 0;
                } else {
                    if (left <= 0 && r() < 0.06) {
                        hold = [r() < 0.5 ? "left" : "right"];
                        left = 8;
                    }
                    if (left > 0) {
                        p.holding = hold;
                        left--;
                    }
                }
                g.step(s, p);
            }
            if (s.won) wins++;
        }
        assert.ok(wins <= 4, `level ${phase} is won by ${wins} of 20 random balls`);
    }
});

test("a hit past an exact target does not count, and the third starts the total again", () => {
    const L = PIN_LEVELS[1] ?? PIN_LEVELS[0];
    const s = startPin({ ...L, flowers: [1, 5, 2] }, 1);
    award(s, "f1", []);
    award(s, "f1", []);
    assert.equal(s.sum, 10);
    assert.ok(s.won, "five and five make ten");
    const t = startPin({ ...L, flowers: [1, 5, 2] }, 1);
    award(t, "f1", []);
    award(t, "f2", []);
    award(t, "f1", []);
    assert.equal(t.sum, 7, "7 + 5 is past 10, so it does not count");
    assert.equal(t.over, 1);
    assert.match(t.note, /does not count/);
    award(t, "f1", []);
    award(t, "f1", []);
    assert.equal(t.sum, 0, "the third time past starts the total again");
    assert.equal(t.over, 0);
    award(t, "f1", []);
    award(t, "f1", []);
    assert.ok(t.won);
});

test("a flip pressed a moment early waits for the ball, and a quick tap stays up long enough to bat it", () => {
    const s = g.start(0);
    s.resting = false;
    Object.assign(s.ball, { mode: "free", x: 6.5, y: 22, vx: 0.5, vy: 2 });
    let tapped = false,
        top = Infinity;
    for (let i = 0; i < 240 && s.ball.mode === "free"; i++) {
        const tap: boolean = !tapped && s.ball.y > 27.5;
        tapped ||= tap;
        g.step(s, tap ? { ...emptyPad(), holding: ["left"] } : emptyPad());
        if (tapped) top = Math.min(top, s.ball.y);
    }
    assert.ok(top < 12, `a tap as the ball came down sent it only to ${top.toFixed(1)}`);
    const t = g.start(0),
        rest = tipOf(t, "left");
    g.step(t, { ...emptyPad(), holding: ["left"] });
    for (let i = 0; i < 5; i++) g.step(t, emptyPad());
    const still = tipOf(t, "left");
    assert.ok(rest && still && still.y < rest.y - 1, "a one-step tap is held up");
});

test("an even flower closes the odd ones, and a ladybird out of turn bounces away", () => {
    const s = startPin(PIN_LEVELS[2] ?? PIN_LEVELS[0], 2);
    award(s, "f0", []);
    award(s, "f2", []);
    assert.deepEqual(s.lit, ["f0", "f2"]);
    award(s, "f1", []);
    assert.deepEqual(s.lit, [], "2 is even, so the odd flowers close");
    for (const id of ["f0", "f2", "f4"]) award(s, id, []);
    assert.ok(s.won);
    const o = startPin(PIN_LEVELS[3] ?? PIN_LEVELS[0], 3);
    ladyHit(o, 1, []);
    assert.equal(o.next, 0, "4 is out of turn");
    assert.deepEqual(o.live.down, []);
    for (const i of [0, 1, 2, 3]) ladyHit(o, i, []);
    assert.ok(o.won);
    const words = PIN_LEVELS.map((L) => `${L.title} ${L.goal} ${L.prompt}`).join(" ");
    assert.doesNotMatch(words, /[—!]/);
});

test("free play keeps its best score through the page's saving, and nothing else", () => {
    const s = g.start(PIN_LEVELS.length - 1);
    s.score = 42;
    const saved = g.checkpoint?.(s);
    const t = g.start(PIN_LEVELS.length - 1);
    assert.equal(g.restore?.(t, JSON.parse(JSON.stringify(saved))), true);
    assert.equal(t.best, 42);
    assert.equal(g.restore?.(t, { best: "lots" }), false);
    assert.equal(g.saves?.level, PIN_LEVELS.length - 1);
});

test("the state stays plain data, the frame draws only shelf drawings over a garden wider than the view, and the flippers swing", () => {
    for (let phase = 0; phase < PIN_LEVELS.length; phase++) {
        const s = g.start(phase);
        assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
        const f = g.frame(s, true);
        for (const sp of f.sprites)
            assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
        assert.ok(f.world.w > f.view.w + 30);
        assert.ok(!f.marks.some((m) => m.kind === "dots"));
    }
    const s = g.start(0),
        rest = tipOf(s, "left");
    for (let i = 0; i < 10; i++) g.step(s, { ...emptyPad(), holding: ["left"] });
    const up = tipOf(s, "left");
    assert.ok(rest && up && up.y < rest.y - 1);
    assert.deepEqual(faults(g.tuning ?? {}), []);
});

test("a pull and a let go launch the ball up the lane, and under reduced motion it settles once drained", () => {
    const s = g.start(1);
    for (let i = 0; i < 40; i++) g.step(s, { ...emptyPad(), holding: ["down"] });
    assert.ok(s.pull > 0.7);
    const f = g.frame(s);
    assert.ok(
        f.marks.some((m) => m.kind === "dots"),
        "the launch is previewed",
    );
    g.step(s, emptyPad());
    assert.equal(s.resting, false);
    assert.ok(s.ball.vy < -20);
    assert.ok(g.still.settling?.(s));
    const t = g.start(1);
    assert.equal(g.still.settling?.(t), false);
});

test("on the flowerbed each flower counts once, so bouncing off one flower three times is still one", () => {
    const s = startPin(PIN_LEVELS[0], 0);
    for (let i = 0; i < 3; i++) award(s, "f0", []);
    assert.equal(s.hits, 1);
    assert.equal(s.won, false);
    award(s, "f1", []);
    award(s, "f2", []);
    assert.equal(s.hits, 3);
    assert.equal(s.won, true);
});
