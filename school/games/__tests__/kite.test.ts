// Kite flying: every level and variation is flown to its win by the keys and by a finger in the sky,
// and the pads replay to the same flight; random hands rarely win; the dots ahead of the kite are the
// flight it then flies; a balloon past an exact total bounces away and says why; a held height is
// counted and lost when the kite drops; a crash costs a flight where flights are counted and the last
// one ends the round; and the frame draws only the shelf.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, type Dir, type Pad } from "../../../engine/motion/pad";
import { endOf } from "../game";
import { SHELF_IDS } from "./shelf";
import {
    GROUND,
    KITE_LEVELS,
    RATE,
    aheadOf,
    heightOf,
    kiteFrame,
    kiteGame,
    puffAt,
    startKite,
    stepKiteGame,
    type KiteState,
} from "../kite";
import { KITE_VARIANTS, kiteWay, openKiteConfiguration } from "../kite-challenges";

const kept = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

function replay(phase: number, variant: number, pads: readonly Pad[]): KiteState {
    const s = openKiteConfiguration({ phase, variant });
    for (const p of pads) stepKiteGame(s, kept(p));
    return s;
}

const level = (i: number) => {
    const L = KITE_LEVELS[i];
    if (!L) throw new Error(`no level ${i}`);
    return L;
};

const held = (...d: Dir[]): Pad => ({ ...emptyPad(), holding: d, held: d.at(-1) ?? null });

test("every level and variation is flown to its win by the keys and by a finger, and the pads replay to the same flight", () => {
    for (const [phase, L] of KITE_LEVELS.entries()) {
        if (L.ask.kind === "free") continue;
        for (let v = 0; v < KITE_VARIANTS; v++)
            for (const hands of ["keys", "touch"] as const) {
                const pads = kiteWay({ phase, variant: v }, hands);
                assert.ok(pads, `${L.title}, variation ${v}, by ${hands}: not won`);
                const a = replay(phase, v, pads),
                    b = replay(phase, v, pads);
                assert.ok(a.won, `${L.title}, variation ${v}: the replay did not win`);
                assert.equal(
                    JSON.stringify(a),
                    JSON.stringify(b),
                    `${L.title}: not the same twice`,
                );
            }
    }
});

test("random hands rarely win in a minute and a half, past the first level", () => {
    for (const [phase, L] of KITE_LEVELS.entries()) {
        if (L.ask.kind === "free") continue;
        let wins = 0;
        for (let k = 0; k < 20; k++) {
            let seed = 9173 + k * 7919 + phase * 104729;
            const rand = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
            const s = openKiteConfiguration({ phase, variant: k % KITE_VARIANTS });
            let pad = emptyPad();
            for (let n = 0; n < RATE * 90 && !s.won && !s.out; n++) {
                if (n % 12 === 0) {
                    const d: Dir[] = [];
                    const turn = rand(),
                        reel = rand();
                    if (turn < 0.3) d.push("left");
                    else if (turn < 0.6) d.push("right");
                    if (reel < 0.3) d.push("up");
                    else if (reel < 0.6) d.push("down");
                    pad = held(...d);
                    pad.tapped = rand() < 0.1;
                }
                stepKiteGame(s, kept(pad));
                pad.tapped = false;
            }
            if (s.won) wins++;
        }
        assert.ok(
            wins <= (phase === 0 ? 6 : 4),
            `${L.title}: random hands won ${wins} times in 20`,
        );
    }
});

test("the dots ahead of the kite are the flight it then flies with the same hands", () => {
    const s = startKite(KITE_LEVELS[0], 0, 1);
    for (let i = 0; i < RATE * 3; i++) stepKiteGame(s, emptyPad());
    const pad = held("right");
    stepKiteGame(s, kept(pad));
    const dots = aheadOf(s, 0.5);
    const flown: { x: number; y: number }[] = [];
    for (let i = 1; i <= RATE * 0.5; i++) {
        stepKiteGame(s, kept(pad));
        if (i % 5 === 0) flown.push({ x: s.kite.x, y: s.kite.y });
    }
    assert.equal(dots.length, flown.length);
    dots.forEach((d, i) => {
        const f = flown[i];
        assert.ok(f && Math.hypot(d.x - f.x, d.y - f.y) < 1e-9, `dot ${i} is off the flight`);
    });
});

test("a balloon that would go past an exact total bounces away whole and says why", () => {
    const s = startKite(level(1), 1, 1);
    s.counted = [6, 3];
    s.touched = true;
    const i = s.puffs.findIndex((p) => p.n === 4);
    const p = s.puffs[i];
    assert.ok(p);
    const at = puffAt(p, s.steps / RATE, i);
    s.kite.x = at.x;
    s.kite.y = at.y;
    s.kite.line = Math.hypot(at.x - 10.3, at.y - (GROUND - 2.6)) + 1;
    stepKiteGame(s, emptyPad());
    assert.equal(p.gone, 0, "it is still there");
    assert.deepEqual(s.counted, [6, 3]);
    assert.match(kiteGame.note(s), /9 \+ 4 would be 13, past 10/);
});

test("a height held for three seconds wins, and dropping under it starts the count again", () => {
    const s = startKite(level(4), 4, 1);
    const ask = s.L.ask;
    assert.ok(ask.kind === "height");
    const hold = (y: number, steps: number) => {
        for (let i = 0; i < steps && !s.won; i++) {
            s.kite.y = y;
            s.kite.x = 30;
            s.kite.line = 60;
            stepKiteGame(s, emptyPad());
        }
    };
    hold(GROUND - ask.m - 2, RATE * 2);
    assert.ok(!s.won && s.above > RATE);
    hold(GROUND - ask.m + 4, 2);
    assert.equal(s.above, 0);
    hold(GROUND - ask.m - 2, RATE * 3 + 2);
    assert.ok(s.won, kiteGame.note(s));
    assert.match(s.note, /held for 3 seconds/);
});

test("a crash costs a flight where flights are counted, and the last one ends the round not won until it starts again", () => {
    const phase = KITE_LEVELS.findIndex((L) => L.flights !== undefined);
    const L = KITE_LEVELS[phase];
    assert.ok(L?.flights);
    const s = startKite(L, phase, 1);
    for (let f = 0; f < L.flights; f++) {
        assert.equal(endOf(kiteGame, s), null);
        s.kite.y = GROUND - 0.5;
        stepKiteGame(s, emptyPad());
        for (let i = 0; i < RATE * 2 && s.down > 0; i++) stepKiteGame(s, emptyPad());
    }
    const end = endOf(kiteGame, s);
    assert.equal(end?.won, false);
    assert.ok(end && end.words.length > 10 && !end.words.includes("—"));
    for (let i = 0; i < RATE * 3; i++) stepKiteGame(s, held("down"));
    assert.deepEqual(endOf(kiteGame, s), end);
    assert.equal(kiteGame.still.settling?.(s), false);
});

test("a crash on a level without counted flights is a moment on the grass, and the kite goes up again", () => {
    const s = startKite(KITE_LEVELS[0], 0, 1);
    s.kite.y = GROUND - 0.5;
    stepKiteGame(s, emptyPad());
    assert.ok(s.down > 0 && !s.out);
    for (let i = 0; i < RATE * 2 && s.down > 0; i++) stepKiteGame(s, emptyPad());
    assert.equal(s.down, 0);
    assert.ok(heightOf(s.kite) > 6, "it is back up on its line");
    assert.equal(endOf(kiteGame, s), null);
});

test("a state is plain data, and the frame draws only the shelf from the start, in flight, and at the win", () => {
    for (const [phase, L] of KITE_LEVELS.entries()) {
        const s = startKite(L, phase, 1);
        assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
        const frames = [kiteFrame(s), kiteFrame(s, true)];
        const pads = L.ask.kind === "free" ? [] : (kiteWay({ phase, variant: 0 }, "keys") ?? []);
        const t = startKite(L, phase, 1);
        pads.forEach((p, i) => {
            stepKiteGame(t, kept(p));
            if (i % 120 === 0) frames.push(kiteFrame(t));
        });
        frames.push(kiteFrame(t), kiteFrame(t, true));
        for (const f of frames)
            for (const sp of f.sprites)
                assert.ok(SHELF_IDS.has(sp.art), `${L.title}: ${sp.key} asks for ${sp.art}`);
    }
});

test("free sky keeps the best height through a checkpoint and never ends", () => {
    const phase = KITE_LEVELS.length - 1;
    const s = kiteGame.start(phase, 1);
    for (let i = 0; i < RATE * 8; i++) kiteGame.step(s, held("down"));
    const saved = kiteGame.checkpoint?.(s);
    const t = kiteGame.start(phase, 1);
    assert.ok(kiteGame.restore?.(t, saved));
    assert.ok(t.best >= Math.round(s.top) && t.best > 10, `${t.best}`);
    assert.equal(kiteGame.restore?.(t, { best: "high" }), false);
    assert.equal(endOf(kiteGame, s), null);
});
