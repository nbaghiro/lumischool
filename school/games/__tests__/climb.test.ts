// Charlie's climb: every level and variant is climbed home by the keys and by a finger on the field,
// and the pads replay to the same climb; random hands rarely get home; doors open for their numbers
// and say how far off a count is; a coin box takes coins back; a fall puts her back at the flag
// with her coins; a mushroom springs her higher than a jump; and the frame draws only the shelf.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { grounded } from "../../../engine/motion/walker";
import { SHELF_IDS } from "./shelf";
import {
    CLIMB_LEVELS,
    climbFrame,
    climbGame,
    movesOf,
    nextWho,
    passes,
    ruleText,
    startClimb,
    stepClimb,
    type ClimbState,
} from "../climb";
import { climbThrough } from "../climb-challenges";

const kept = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

function replay(phase: number, variant: number, pads: readonly Pad[]): ClimbState {
    const s = startClimb(phase, variant);
    for (const p of pads) stepClimb(s, kept(p));
    return s;
}

test("every level and variant is climbed home by the keys and by a finger, and the pads replay to the same climb", () => {
    for (const [phase, L] of CLIMB_LEVELS.entries())
        for (let v = 0; v < L.variants.length; v++)
            for (const hands of ["keys", "touch"] as const) {
                const pads = climbThrough(phase, v, hands);
                assert.ok(pads, `${L.title}, variant ${v}, by ${hands}: not climbed`);
                const a = replay(phase, v, pads),
                    b = replay(phase, v, pads);
                assert.ok(a.won, `${L.title}, variant ${v}: the replay did not get home`);
                assert.equal(
                    JSON.stringify(a),
                    JSON.stringify(b),
                    `${L.title}: not the same twice`,
                );
            }
});

test("random hands rarely get home in a minute and a half", () => {
    for (const [phase, L] of CLIMB_LEVELS.entries()) {
        let wins = 0;
        for (let k = 0; k < 10; k++) {
            let seed = 9173 + k * 7919 + phase * 104729;
            const rand = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
            const s = startClimb(phase, k % L.variants.length);
            let pad = emptyPad();
            for (let n = 0; n < 60 * 90 && !s.won; n++) {
                if (n % 12 === 0) {
                    pad = emptyPad();
                    const d = rand();
                    if (d < 0.4) pad.holding = ["right"];
                    else if (d < 0.6) pad.holding = ["left"];
                    if (rand() < 0.4) {
                        pad.go = true;
                        pad.tapped = true;
                    }
                    if (rand() < 0.1) pad.pressed = ["down"];
                }
                stepClimb(s, kept(pad));
                pad.tapped = false;
                pad.pressed = [];
            }
            if (s.won) wins++;
        }
        assert.ok(wins <= 2, `${L.title}: random hands got home ${wins} times in 10`);
    }
});

test("a door opens for its number, and a shut one says how many more or how many too many", () => {
    assert.ok(passes({ kind: "exact", n: 12 }, 12));
    assert.ok(!passes({ kind: "exact", n: 12 }, 13));
    assert.ok(passes({ kind: "atLeast", n: 10 }, 11));
    assert.ok(passes({ kind: "sum", a: 7, b: 5 }, 12));
    assert.ok(passes({ kind: "odd" }, 35) && !passes({ kind: "odd" }, 30));
    assert.ok(passes({ kind: "more", than: 20 }, 22) && passes({ kind: "atMost", n: 20 }, 20));
    assert.equal(ruleText({ kind: "sum", a: 7, b: 5 }), "7 + 5");
    const s = startClimb(1);
    const d = s.L.doors[0];
    if (!d) throw new Error("no door");
    s.coins = 8;
    s.r.x = d.x - 1;
    s.r.y = d.y;
    stepClimb(s, emptyPad());
    assert.match(s.said, /4 more/);
    assert.equal(s.opening[0], false, "a door stays shut for a count that is short");
    s.told = -1;
    s.coins = 14;
    stepClimb(s, emptyPad());
    assert.match(s.said, /2 too many/);
    s.told = -1;
    s.coins = 12;
    stepClimb(s, emptyPad());
    assert.equal(s.opening[0], true);
    assert.match(s.said, /opens for 12/);
});

test("a hop onto a coin box's button takes one coin back", () => {
    const s = startClimb(4);
    const slot = s.L.slots[0];
    if (!slot) throw new Error("no coin box");
    s.coins = 13;
    s.r.x = slot.x;
    s.r.y = slot.y - 2;
    s.r.state = "fall";
    for (let i = 0; i < 60 && !grounded(s.r); i++) stepClimb(s, emptyPad());
    assert.equal(s.coins, 12);
});

test("a fall into the water puts her back at the last flag with every coin she had", () => {
    const s = startClimb(0);
    for (const p of climbThrough(0, 0, "keys") ?? []) {
        if (s.flag >= 0) break;
        stepClimb(s, kept(p));
    }
    assert.ok(s.flag >= 0, "she reached the flag");
    const coins = s.coins;
    s.r.x = 23.5;
    s.r.y = 21;
    s.r.state = "fall";
    for (let i = 0; i < 60 * 3 && s.splash <= 0; i++) stepClimb(s, emptyPad());
    assert.ok(s.splash > 0, "she splashed");
    for (let i = 0; i < 60 && s.splash > 0; i++) stepClimb(s, emptyPad());
    assert.equal(s.coins, coins);
    assert.ok(Math.abs(s.r.x - (s.L.flags[0]?.x ?? 0)) < 0.5, `back at ${s.r.x}`);
});

test("a mushroom springs her far higher than a jump, held or not", () => {
    const s = startClimb(2);
    const m = s.L.ledges.findIndex((l) => l.spring);
    const cap = s.L.ledges[m];
    if (!cap) throw new Error("no mushroom");
    s.r.x = (cap.x0 + cap.x1) / 2;
    s.r.y = cap.y - 2;
    s.r.state = "fall";
    let top = s.r.y;
    for (let i = 0; i < 90; i++) {
        stepClimb(s, emptyPad());
        top = Math.min(top, s.r.y);
    }
    assert.ok(cap.y - top > movesOf("charlie").jump + 2, `rose ${cap.y - top}`);
});

test("a pup jumps higher and a grown-up runs faster, and changing who climbs keeps the climb", () => {
    assert.ok(movesOf("pup").jump > movesOf("charlie").jump);
    assert.ok(movesOf("grownup").speed > movesOf("charlie").speed);
    const s = startClimb(0);
    s.coins = 4;
    nextWho(s);
    assert.equal(s.who, "pup");
    assert.equal(s.coins, 4);
    climbGame.command?.(s, "who");
    assert.equal(s.who, "grownup");
});

test("the frame draws only shelf drawings, water past both ends, and the coins in the view's corner", () => {
    for (const [phase] of CLIMB_LEVELS.entries()) {
        const s = startClimb(phase);
        for (let i = 0; i < 30; i++) stepClimb(s, emptyPad());
        const f = climbFrame(s);
        for (const sp of f.sprites)
            assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
        const first = f.water?.[0],
            last = f.water?.at(-1);
        assert.ok(first && first.x < 0, "the water runs past the start");
        assert.ok(last && last.x + last.w > s.L.w, "the water runs past the end");
        assert.ok(f.sprites.some((sp) => sp.fixed && sp.art === "climbcoin"));
        assert.ok(f.marks.some((m) => m.kind === "word" && m.fixed));
    }
});

test("the state is plain data, and reduced motion settles once she lands", () => {
    const s = startClimb(0);
    for (let i = 0; i < 20; i++) stepClimb(s, emptyPad());
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
    const pad = emptyPad();
    pad.go = true;
    pad.tapped = true;
    stepClimb(s, pad);
    assert.ok(climbGame.still.settling?.(s));
    for (let i = 0; i < 120 && climbGame.still.settling?.(s); i++) stepClimb(s, emptyPad());
    assert.equal(climbGame.still.settling?.(s), false);
});

test("the words a child reads have no dashes", () => {
    for (const L of CLIMB_LEVELS) assert.ok(!/[—!]/.test(`${L.goal} ${climbGame.hint}`), L.title);
});
