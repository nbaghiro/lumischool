// Domino machine: every level and variation is built and rung through the child's own controls, by
// the finger and by the keys, a recorded build replays to the same win, random machines rarely ring
// the bell, and a kept machine comes back from JSON as it was.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import {
    FREE,
    MACHINE,
    MACHINE_LEVELS,
    MOST,
    VARIANTS,
    machineCommand,
    machineGame,
    onBench,
    placeAt,
    put,
    startMachine,
} from "../machine";
import {
    buildByKeys,
    buildByTouch,
    dominoCertified,
    dominoChallenge,
    dominoWay,
    isDominoConfiguration,
    runIt,
} from "../machine-challenges";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { faults } from "../../../engine/motion/tune";

test("every level and every variation rings the bell, built by the finger and by the keys", () => {
    for (const [phase, variants] of VARIANTS.entries())
        for (const [variant, L] of variants.entries()) {
            const where = `${L.title}, variation ${variant}`;
            const plan = dominoWay(L, phase);
            assert.ok(plan, `${where}: no plan rings it by the finger`);
            const s = startMachine(L, phase);
            assert.ok(buildByKeys(s, plan), `${where}: the keys could not build it`);
            assert.ok(runIt(s), `${where}: the keys' machine did not ring`);
            assert.ok(dominoCertified({ phase, variant }), `${where}: not certified`);
        }
});

test("the drawer alone never rings the bell: every level asks for a part to be put down", () => {
    for (const [level, L] of MACHINE_LEVELS.entries()) {
        if (level === FREE) continue;
        assert.equal(runIt(startMachine(L, level)), false, L.title);
    }
});

test("a recorded build by the finger replays into a fresh game to the same machine and the same win", () => {
    for (const level of [1, 4, 8]) {
        const L = MACHINE_LEVELS[level];
        assert.ok(L);
        const tape: Pad[] = [];
        const a = startMachine(L, level);
        assert.ok(buildByTouch(a, L.plan, tape));
        assert.ok(runIt(a, tape), L.title);
        const b = startMachine(L, level);
        for (const pad of tape) {
            machineGame.step(b, structuredClone(pad));
        }
        assert.equal(b.phase, "won", L.title);
        assert.deepEqual(b.bench, a.bench);
        assert.equal(b.run?.steps, a.run?.steps);
    }
});

test("random machines rarely ring the bell", () => {
    for (const [level, L] of MACHINE_LEVELS.entries()) {
        if (level === FREE) continue;
        const rnd = seeded(71 + level);
        let rang = 0;
        const tries = 16;
        for (let k = 0; k < tries; k++) {
            const s = startMachine(L, level);
            for (const t of s.tray) {
                const ramp = t.kind === "ramp" || t.kind === "long";
                const part = {
                    id: t.id,
                    kind: t.kind,
                    x: 0,
                    y: 0,
                    angle: ramp ? (rnd() - 0.5) * 2 : 0,
                    n: t.counts ? 1 + Math.floor(rnd() * MOST) : (t.n ?? 1),
                };
                put(s, placeAt(s, part, { x: 2 + rnd() * 44, y: 4 + rnd() * 20 }));
            }
            if (runIt(s)) rang++;
        }
        assert.ok(rang <= tries / 4, `${L.title}: ${rang} of ${tries} random machines rang`);
    }
});

test("a kept machine goes through JSON and comes back to the same bench, and still rings", () => {
    const L = MACHINE_LEVELS[6];
    assert.ok(L);
    const a = startMachine(L, 6);
    assert.ok(buildByTouch(a, L.plan));
    const kept: unknown = JSON.parse(JSON.stringify(machineGame.checkpoint?.(a)));
    const b = startMachine(L, 6);
    assert.equal(machineGame.restore?.(b, kept), true);
    assert.deepEqual(b.bench, a.bench);
    assert.ok(runIt(b));
    const c = startMachine(L, 6);
    assert.equal(machineGame.restore?.(c, { bench: [{ id: "nothing", x: 1, y: 1 }] }), false);
    assert.equal(machineGame.restore?.(c, "a machine"), false);
    assert.deepEqual(c.bench, []);
    const state: unknown = JSON.parse(JSON.stringify(a));
    assert.deepEqual(state, structuredClone(a), "the whole build state is plain data");
});

test("free play saves its machine, and starts with an empty bench and a full drawer", () => {
    assert.deepEqual(machineGame.saves, { level: FREE });
    const s = machineGame.start(FREE);
    assert.deepEqual(s.bench, []);
    assert.ok(s.tray.length >= 6);
});

test("undo takes back the last move, and a part put back goes to the drawer", () => {
    const L = MACHINE_LEVELS[1];
    assert.ok(L);
    const s = startMachine(L, 1);
    assert.ok(buildByTouch(s, L.plan));
    const id = s.tray[0]?.id ?? "";
    const n = onBench(s, id)?.n;
    machineCommand(s, "fewer");
    assert.equal(onBench(s, id)?.n, (n ?? 0) - 1);
    machineGame.back?.(s);
    assert.equal(onBench(s, id)?.n, n);
    machineCommand(s, "stow");
    assert.equal(onBench(s, id), undefined);
    machineGame.back?.(s);
    assert.ok(onBench(s, id));
});

test("the challenge kit names a variation by phase and variant and refuses anything else", () => {
    for (let phase = 0; phase < MACHINE_LEVELS.length; phase++) {
        const c = dominoChallenge(12345, phase);
        assert.ok(isDominoConfiguration(c, phase));
        assert.ok(!isDominoConfiguration({ ...c, phase: phase + 1 }, phase));
        assert.ok(!isDominoConfiguration({ ...c, extra: 1 }, phase));
    }
    assert.ok(!isDominoConfiguration({ phase: 1, variant: 99 }, 1));
});

test("the machine draws only from the art shelf, its knobs say why, and its words have no long dashes", () => {
    const seen = new Set<string>();
    for (const [level, L] of MACHINE_LEVELS.entries()) {
        const s = startMachine(L, level);
        if (L.plan.length) buildByTouch(s, L.plan);
        const pad = emptyPad();
        pad.touch = { x: 6, y: 27.6 };
        machineGame.step(s, pad);
        spent(pad);
        for (const sp of machineGame.frame(s).sprites) seen.add(sp.art);
        runIt(s);
        for (const sp of machineGame.frame(s).sprites) seen.add(sp.art);
        for (const text of [L.title, L.goal, L.prompt, s.text])
            assert.ok(!text.includes("\u2014"), `${L.title}: ${text}`);
    }
    for (const art of seen) assert.ok(SHELF_IDS.has(art), `${art} is not on the shelf`);
    assert.ok(seen.has("machinepart") && seen.has("charlie"));
    assert.ok(!(machineGame.hint ?? "").includes("\u2014"));
    assert.deepEqual(faults(MACHINE), []);
});
