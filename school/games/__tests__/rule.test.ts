// The number machine: every level and every layout is filled by tapping and by the keys, a turn is
// quick, a wrong ball costs nothing but is written in the table, a lost ball is not in the tray,
// random tapping rarely fills a level quickly, and a recorded set of taps lands where it did.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import {
    MACHINE_LEVELS,
    MACHINE_TUNING,
    inTray,
    label,
    ruleGame,
    run,
    slotAt,
    startMachine,
    through,
    type MachineLevel,
    type MachineState,
} from "../rule";
import {
    isMachineConfiguration,
    machineChallenge,
    machineLayouts,
    machineSolve,
} from "../rule-challenges";
import { challengeFor, openChallenge } from "../challenges";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";

const LIMIT = 60 * 30;

function tick(s: MachineState, pad: Pad, n = 1): void {
    for (let i = 0; i < n; i++) {
        ruleGame.step(s, pad);
        spent(pad);
    }
}

/** Steps until the ball has gone through and the machine waits for the next one. */
function settle(s: MachineState): number {
    const pad = emptyPad();
    let n = 0;
    for (; n < LIMIT && ruleGame.still.settling?.(s); n++) tick(s, pad);
    assert.ok(!ruleGame.still.settling?.(s), "the ball came to rest");
    return n;
}

/** Taps the ball at tray place `j`, as a finger does: down on it and up again. */
function tap(s: MachineState, j: number): void {
    const at = slotAt(j),
        pad = emptyPad();
    pad.touch = at;
    tick(s, pad);
    pad.touch = null;
    pad.lifted = at;
    tick(s, pad);
    settle(s);
}

/** Chooses tray place `j` with left and right, and drops it with space. */
function key(s: MachineState, j: number): void {
    const pad = emptyPad();
    for (let i = 0; i < 20 && s.pick !== j; i++) {
        pad.pressed = [j > s.pick ? "right" : "left"];
        tick(s, pad);
    }
    assert.equal(s.pick, j);
    pad.tapped = true;
    tick(s, pad);
    settle(s);
}

function at(i: number): MachineLevel {
    const L = MACHINE_LEVELS[i];
    assert.ok(L, `no level ${i}`);
    return L;
}

const every = (): { title: string; level: MachineLevel; phase: number }[] =>
    MACHINE_LEVELS.flatMap((L, phase) =>
        Array.from({ length: machineLayouts(phase) }, (_, v) => ({
            title: `${L.title}, layout ${v}`,
            level: machineChallenge(v, phase).level,
            phase,
        })),
    );

test("a rule reads and runs the way it is written", () => {
    assert.equal(label({ op: "muladd", a: 2, b: 1 }), "× 2 + 1");
    assert.equal(label({ op: "muladd", a: 3, b: -1 }), "× 3 - 1");
    assert.equal(label({ op: "add", a: -2 }), "- 2");
    assert.equal(run({ op: "muladd", a: 3, b: -1 }, 4), 11);
    assert.equal(run({ op: "mul", a: 10 }, 3), 30);
    assert.equal(through(at(4), 4), 10, "two machines, one after the other");
});

test("the first layout of every level is the authored level", () => {
    MACHINE_LEVELS.forEach((L, phase) =>
        assert.deepEqual(machineChallenge(0, phase).level, { ...L }, L.title),
    );
});

test("every level and layout is filled order by order by tapping the ball its answer needs", () => {
    for (const { title, level, phase } of every()) {
        const places = machineSolve(level);
        assert.ok(places, `${title}: an order no ball in the tray makes`);
        const s = startMachine(level, phase);
        for (const j of places) tap(s, j);
        assert.ok(ruleGame.won(s), `${title}: ${ruleGame.say(s)}`);
        assert.equal(s.rejects, 0, title);
        assert.deepEqual(ruleGame.objectives?.(s), { completed: 3, total: 3 });
        assert.ok(
            ruleGame.frame(s).sprites.some((sp) => sp.art === "rulemachine" && sp.params?.lit),
            `${title}: the machine lights up`,
        );
    }
});

test("every level is filled with the keys alone, and the keys skip a lost ball", () => {
    MACHINE_LEVELS.forEach((L, level) => {
        const s = ruleGame.start(level),
            places = machineSolve(L);
        assert.ok(places);
        for (const j of places) key(s, j);
        assert.ok(ruleGame.won(s), `${L.title}: ${ruleGame.say(s)}`);
    });
    const lost = at(3),
        s = ruleGame.start(3);
    assert.ok(!inTray(lost, 0), "the 1 is lost");
    assert.equal(lost.numbers[s.pick], 2, "the choice starts on the first ball there is");
    tick(s, { ...emptyPad(), pressed: ["left"] });
    assert.equal(lost.numbers[s.pick], 2, "and left does not reach the lost one");
});

test("a turn is quick: a ball dropped is judged in under three seconds", () => {
    const s = startMachine(at(0), 0);
    const pad = emptyPad();
    pad.touch = slotAt(3);
    tick(s, pad);
    pad.touch = null;
    pad.lifted = slotAt(3);
    tick(s, pad);
    const steps = settle(s);
    assert.ok(steps < 60 * 3, `a turn took ${steps} steps`);
    assert.ok(MACHINE_TUNING.hop + MACHINE_TUNING.work < 1.2);
});

test("a ball dragged away from the tray drops in from where it was let go", () => {
    const s = startMachine(at(0), 0),
        pad = emptyPad();
    pad.touch = slotAt(2);
    tick(s, pad);
    pad.touch = { x: 12, y: 6 };
    tick(s, pad);
    assert.ok(
        ruleGame.frame(s).sprites.some((sp) => sp.key === "tray:2" && Math.abs(sp.x - 12) < 1e-9),
        "the ball follows the finger",
    );
    pad.touch = null;
    pad.lifted = { x: 12, y: 6 };
    tick(s, pad);
    assert.deepEqual(s.from, { x: 12, y: 6 });
    settle(s);
    assert.deepEqual(s.seen, [[3, 6]]);
});

test("a wrong ball is written in the table and bounces off, and the next ball is ready at once", () => {
    const s = startMachine(at(0), 0);
    tap(s, 0);
    assert.deepEqual(s.seen, [[1, 4]]);
    assert.equal(s.done, 0);
    assert.equal(s.rejects, 1);
    assert.equal(s.phase, "pick");
    assert.match(ruleGame.say(s), /1 made 4/);
});

test("a tap away from every ball drops nothing", () => {
    const s = startMachine(at(0), 0),
        pad = emptyPad();
    pad.touch = { x: 30, y: 20 };
    tick(s, pad);
    pad.touch = null;
    pad.lifted = { x: 30, y: 20 };
    tick(s, pad);
    assert.equal(s.phase, "pick");
    assert.equal(s.drops, 0);
});

test("tapping at random rarely fills a level in six drops", () => {
    let rng = 12345;
    const random = () => {
        rng = (rng * 1103515245 + 12345) % 2147483648;
        return rng / 2147483648;
    };
    for (const [phase, L] of MACHINE_LEVELS.entries()) {
        let wins = 0;
        for (let trial = 0; trial < 40; trial++) {
            const s = startMachine(L, phase),
                open = L.numbers.flatMap((_, j) => (inTray(L, j) ? [j] : []));
            for (let d = 0; d < 6 && !ruleGame.won(s); d++)
                tap(s, open[Math.floor(random() * open.length)] ?? 0);
            if (ruleGame.won(s)) wins++;
        }
        // at most one time in five, the bar the other games are held to
        assert.ok(wins <= 8, `${L.title}: random taps won ${wins} of 40`);
    }
});

test("a recorded set of taps lands where it did", () => {
    const s = startMachine(at(1), 1);
    for (const j of [0, 3, 7, 6, 2]) tap(s, j);
    assert.deepEqual(s.seen, [
        [1, 2],
        [4, 8],
        [8, 16],
        [7, 14],
        [3, 6],
    ]);
    assert.ok(ruleGame.won(s));
    assert.equal(s.rejects, 2);
});

test("under reduced motion a press and its settling end where the steps would", () => {
    const a = startMachine(at(0), 0),
        b = startMachine(at(0), 0);
    key(a, 3);
    key(b, 3);
    assert.deepEqual(b.seen, a.seen);
    const pad = emptyPad();
    pad.pressed = ["right"];
    tick(b, pad, ruleGame.still.press(b));
    pad.tapped = true;
    tick(b, pad, ruleGame.still.press(b));
    assert.ok(ruleGame.still.settling?.(b), "the drop keeps the machine stepping");
    for (let i = 0; i < LIMIT && ruleGame.still.settling?.(b); i++) tick(b, emptyPad());
    assert.equal(b.seen.length, 2);
});

test("a stored layout opens as it was made, and an edited one does not", () => {
    for (let phase = 0; phase < MACHINE_LEVELS.length; phase++)
        for (let v = 0; v < machineLayouts(phase); v++) {
            const c = machineChallenge(v, phase);
            assert.ok(isMachineConfiguration(JSON.parse(JSON.stringify(c)), phase));
            assert.ok(
                !isMachineConfiguration({ ...c, level: { ...c.level, orders: [1, 2, 3] } }, phase),
            );
        }
    const challenge = challengeFor(ruleGame, 2, 5, true);
    assert.equal(challenge.source, "generated");
    const game = openChallenge(ruleGame, challenge);
    assert.ok(game.group === "action");
    assert.ok(JSON.stringify(challengeFor(ruleGame, 0, 1).configuration).length > 0);
});

test("the state is plain data, every drawing it names is on the shelf, and its words are plain", () => {
    for (const [level, L] of MACHINE_LEVELS.entries()) {
        const s = ruleGame.start(level);
        assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
        for (const sp of ruleGame.frame(s).sprites) assert.ok(SHELF_IDS.has(sp.art), sp.art);
        for (const j of L.missing ?? [])
            assert.ok(
                !ruleGame.frame(s).sprites.some((sp) => sp.key === `tray:${L.numbers.indexOf(j)}`),
                `${L.title}: the lost ${j} is not drawn`,
            );
        assert.ok(!/[—!]/.test(`${L.goal} ${L.title} ${ruleGame.hint} ${ruleGame.say(s)}`));
    }
});
