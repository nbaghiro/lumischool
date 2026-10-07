// Bolt's sky flight: every level and variation is flown to its win by the keys and by a finger in the
// sky, and the pads replay to the same flight; random hands rarely win; the dots ahead of Bolt are the
// flight it then flies; a finger held high never sputters the jets and held keys do; a star past an
// exact total pushes Bolt away and says why; a height held wins and leaving it starts the count again;
// a fall below a ledge puts Bolt back on it and a flight down does not; a bump knocks Bolt down and
// never ends a try; the clock ends a timed try not won; and the frame draws only the shelf.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, type Dir, type Pad } from "../../../engine/motion/pad";
import { endOf } from "../game";
import { SHELF_IDS } from "./shelf";
import {
    BODY,
    FLY_LEVELS,
    RATE,
    W,
    aheadOf,
    boltflyGame,
    flyFrame,
    hazardAt,
    metresAt,
    shineAt,
    startFly,
    stepFly,
    yAt,
    type FlyState,
} from "../boltfly";
import { FLY_VARIANTS, flyWay, openFlyConfiguration } from "../boltfly-challenges";

const kept = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

const held = (...d: Dir[]): Pad => ({ ...emptyPad(), holding: d, held: d.at(-1) ?? null });

const level = (i: number) => {
    const L = FLY_LEVELS[i];
    if (!L) throw new Error(`no level ${i}`);
    return L;
};

function replay(phase: number, variant: number, pads: readonly Pad[]): FlyState {
    const s = openFlyConfiguration({ phase, variant });
    for (const p of pads) stepFly(s, kept(p));
    return s;
}

test("every level and variation is flown to its win by the keys and by a finger, and the pads replay to the same flight", () => {
    for (const [phase, L] of FLY_LEVELS.entries()) {
        if (L.ask.kind === "free") continue;
        for (let v = 0; v < FLY_VARIANTS; v++)
            for (const hands of ["keys", "touch"] as const) {
                const pads = flyWay({ phase, variant: v }, hands);
                assert.ok(pads, `${L.title}, variation ${v}, by ${hands}: not won`);
                if (L.time !== undefined)
                    assert.ok(pads.length < L.time * RATE, `${L.title}: won only at the buzzer`);
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

test("random keys and a finger wandering the sky rarely win in a minute and a half", () => {
    for (const [phase, L] of FLY_LEVELS.entries()) {
        if (L.ask.kind === "free") continue;
        let wins = 0;
        for (let k = 0; k < 16; k++)
            for (const mode of ["keys", "finger"] as const) {
                let seed = 9173 + k * 7919 + phase * 104729 + (mode === "finger" ? 31337 : 0);
                const rand = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
                const s = openFlyConfiguration({ phase, variant: k % FLY_VARIANTS });
                let pad = emptyPad();
                for (let n = 0; n < RATE * 90 && !s.won && !s.out; n++) {
                    if (n % 12 === 0) {
                        if (mode === "keys") {
                            const d: Dir[] = [];
                            const a = rand(),
                                b = rand();
                            if (a < 0.3) d.push("left");
                            else if (a < 0.6) d.push("right");
                            if (b < 0.4) d.push("up");
                            else if (b < 0.55) d.push("down");
                            pad = held(...d);
                        } else {
                            pad = emptyPad();
                            if (rand() < 0.8)
                                pad.touch = {
                                    x: 1 + rand() * (W - 2),
                                    y: s.f.y - 12 + rand() * 20,
                                };
                        }
                    }
                    stepFly(s, kept(pad));
                }
                if (s.won) wins++;
            }
        assert.ok(
            wins <= (phase === 0 ? 8 : 3),
            `${L.title}: random hands won ${wins} times in 32`,
        );
    }
});

test("the dots ahead of Bolt are the flight it then flies with the same hands", () => {
    const s = startFly(level(0), 0);
    const pad = held("up", "right");
    for (let i = 0; i < RATE * 0.5; i++) stepFly(s, kept(pad));
    const dots = aheadOf(s, 0.5);
    const flown: { x: number; y: number }[] = [];
    for (let i = 1; i <= RATE * 0.5; i++) {
        stepFly(s, kept(pad));
        if (i % 5 === 0) flown.push({ x: s.f.x, y: s.f.y - BODY });
    }
    assert.equal(dots.length, flown.length);
    dots.forEach((d, i) => {
        const f = flown[i];
        assert.ok(f && Math.hypot(d.x - f.x, d.y - f.y) < 1e-9, `dot ${i} is off the flight`);
    });
});

test("held keys sputter the jets on a long climb and the line says to pulse them, while a finger held high never does", () => {
    const L = { ...level(2), currents: [] };
    const keys = startFly(L, 2);
    let sputtered = false;
    for (let i = 0; i < RATE * 8 && !sputtered; i++) {
        stepFly(keys, held("up"));
        sputtered = keys.f.sputter > 0;
    }
    assert.ok(sputtered, "the held keys never sputtered");
    assert.match(boltflyGame.note(keys), /Pulse them/);
    const finger = startFly(L, 2);
    for (let i = 0; i < RATE * 20; i++) {
        stepFly(finger, { ...emptyPad(), touch: { x: 20, y: finger.f.y - 15 } });
        assert.equal(finger.f.sputter, 0, `the finger sputtered at ${i / RATE} s`);
    }
    assert.ok(metresAt(L, finger.f.y) > 250, `the finger climbed to ${metresAt(L, finger.f.y)} m`);
});

test("a star that would go past an exact total pushes Bolt away whole and says why", () => {
    const s = startFly(level(1), 1);
    s.counted = [6, 3];
    s.touched = true;
    const i = s.stars.findIndex((p) => p.n === 4);
    const p = s.stars[i];
    assert.ok(p);
    const at = shineAt(p, s.steps / RATE, i);
    s.f.x = at.x;
    s.f.y = at.y + BODY;
    s.landed = false;
    stepFly(s, emptyPad());
    assert.equal(p.gone, 0, "it is still there");
    assert.deepEqual(s.counted, [6, 3]);
    assert.match(boltflyGame.note(s), /9 \+ 4 would be 13, past 10/);
});

test("a height held for two seconds wins, and leaving the band starts the count again", () => {
    const L = { ...level(2), currents: [] };
    const s = startFly(L, 2);
    const ask = L.ask;
    assert.ok(ask.kind === "hold");
    const hold = (m: number, steps: number) => {
        for (let i = 0; i < steps && !s.won; i++) {
            s.f.y = yAt(L, m);
            s.f.x = 20;
            s.f.vy = 0;
            stepFly(s, emptyPad());
        }
    };
    hold(ask.m + 4, RATE);
    assert.ok(!s.won && s.above > RATE / 2);
    hold(ask.m + 20, 2);
    assert.equal(s.above, 0);
    hold(ask.m - 6, RATE * ask.hold + 2);
    assert.ok(s.won, boltflyGame.note(s));
    assert.match(s.note, /held for 2 seconds/);
});

test("a fall well below the last ledge puts Bolt back on it, and a flight down on the jets does not", () => {
    const L = level(1);
    const s = startFly(L, 1);
    const ledge = L.ledges[0];
    assert.ok(ledge);
    s.checkpoint = 0;
    s.f.x = 30;
    s.f.y = yAt(L, ledge.m) + 7;
    s.f.vy = 9;
    s.landed = false;
    stepFly(s, emptyPad());
    assert.ok(Math.abs(s.f.y - yAt(L, ledge.m)) < 1e-9 && s.f.x === (ledge.x0 + ledge.x1) / 2);
    assert.match(s.note, /Back on the cloud/);
    const t = startFly(L, 1);
    t.checkpoint = 0;
    t.f.x = 30;
    t.f.y = yAt(L, ledge.m) - 2;
    t.landed = false;
    for (let i = 0; i < RATE * 6; i++)
        stepFly(t, { ...emptyPad(), touch: { x: 30, y: yAt(L, ledge.m) + 25 } });
    assert.ok(t.f.y > yAt(L, ledge.m) + 20, `a flight down was put back at ${t.f.y}`);
});

test("a bump knocks Bolt down and stops the jets a moment, and never ends a try", () => {
    const phase = FLY_LEVELS.findIndex((L) =>
        (L.hazards ?? []).some((h) => h.kind === "satellite"),
    );
    const L = level(phase);
    const s = startFly(L, phase);
    const h = (L.hazards ?? []).find((x) => x.kind === "satellite");
    assert.ok(h);
    const at = hazardAt(L, h, 0);
    s.f.x = at.x;
    s.f.y = at.y + BODY + 1.2;
    s.f.vy = -3;
    s.landed = false;
    stepFly(s, held("up"));
    assert.ok(s.stun > 0 && s.f.vy > 0, `stun ${s.stun}, falling at ${s.f.vy}`);
    assert.match(s.note, /satellite/);
    assert.equal(endOf(boltflyGame, s), null);
});

test("the clock ends a timed try not won, says so plainly, and nothing moves after", () => {
    const phase = FLY_LEVELS.findIndex((L) => L.time !== undefined);
    const L = level(phase);
    const s = startFly(L, phase);
    s.touched = true;
    for (let i = 0; i < (L.time ?? 0) * RATE + 2; i++) stepFly(s, emptyPad());
    const end = endOf(boltflyGame, s);
    assert.equal(end?.won, false);
    assert.ok(end && end.words.length > 10 && !end.words.includes("—"), end?.words);
    const where = { ...s.f };
    for (let i = 0; i < RATE; i++) stepFly(s, held("up"));
    assert.deepEqual(s.f, where);
    assert.equal(boltflyGame.still.settling?.(s), false);
});

test("a state is plain data, and the frame draws only the shelf from the start, in flight, and at the win", () => {
    for (const [phase, L] of FLY_LEVELS.entries()) {
        const s = startFly(L, phase);
        assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
        const frames = [flyFrame(s), flyFrame(s, true)];
        const pads = L.ask.kind === "free" ? [] : (flyWay({ phase, variant: 0 }, "keys") ?? []);
        const t = startFly(L, phase);
        pads.forEach((p, i) => {
            stepFly(t, kept(p));
            if (i % 120 === 0) frames.push(flyFrame(t));
        });
        frames.push(flyFrame(t), flyFrame(t, true));
        for (const f of frames)
            for (const sp of f.sprites)
                assert.ok(SHELF_IDS.has(sp.art), `${L.title}: ${sp.key} asks for ${sp.art}`);
    }
});

test("free sky keeps the best height through a checkpoint and never ends", () => {
    const phase = FLY_LEVELS.length - 1;
    const s = boltflyGame.start(phase, 1);
    for (let i = 0; i < RATE * 10; i++)
        boltflyGame.step(s, { ...emptyPad(), touch: { x: 20, y: s.f.y - 15 } });
    const saved = boltflyGame.checkpoint?.(s);
    const t = boltflyGame.start(phase, 1);
    assert.ok(boltflyGame.restore?.(t, saved));
    assert.ok(t.best >= Math.round(s.top) && t.best > 100, `${t.best}`);
    assert.equal(boltflyGame.restore?.(t, { best: "high" }), false);
    assert.equal(endOf(boltflyGame, s), null);
});
