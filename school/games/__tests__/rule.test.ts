// The number machine: every level and every layout is played through by pulling and by the keys,
// the dotted path says where the ball will drop, a wrong ball costs nothing but is written in the
// table, a stone and a hump do what they look like, and a recorded set of pulls still lands where it
// did.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import {
    FEED,
    MACHINE_LEVELS,
    label,
    predict,
    ruleGame,
    run,
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
    powerFor,
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
function settle(s: MachineState): void {
    const pad = emptyPad();
    for (let i = 0; i < LIMIT && ruleGame.still.settling?.(s); i++) tick(s, pad);
    assert.ok(!ruleGame.still.settling?.(s), "the ball came to rest");
}

/** Pulls the ball back by as much as `power` needs and lets go, as a finger does. */
function pull(s: MachineState, power: number): void {
    const pad = emptyPad(),
        back = { x: -power / FEED.per, y: 0 };
    pad.pull = back;
    tick(s, pad);
    pad.pull = null;
    pad.released = back;
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
    const two = at(4);
    assert.equal(through(two, 4), 10, "two machines, one after the other");
});

test("the first layout of every level is the authored level", () => {
    MACHINE_LEVELS.forEach((L, phase) =>
        assert.deepEqual(machineChallenge(0, phase).level, { ...L }, L.title),
    );
});

test("every level and layout is filled order by order with the pull its answer needs", () => {
    for (const { title, level, phase } of every()) {
        const powers = machineSolve(level);
        assert.ok(powers, `${title}: an order no open pocket makes`);
        const s = startMachine(level, phase);
        for (const p of powers) pull(s, p);
        assert.ok(ruleGame.won(s), `${title}: ${ruleGame.say(s)}`);
        assert.equal(s.rejects, 0, title);
        assert.deepEqual(ruleGame.objectives?.(s), { completed: 3, total: 3 });
        assert.ok(
            ruleGame.frame(s).sprites.some((sp) => sp.art === "rulemachine" && sp.params?.lit),
            `${title}: the machine lights up`,
        );
    }
});

test("every level is filled with the keys alone", () => {
    MACHINE_LEVELS.forEach((L, level) => {
        const s = ruleGame.start(level),
            pad = emptyPad();
        for (const want of L.orders) {
            const n = L.numbers.find((x) => through(L, x) === want);
            assert.ok(n !== undefined);
            const target = powerFor(L, n);
            assert.ok(target !== null, `${L.title}: no pull drops into ${n}`);
            const dir = target > s.aim.power ? "right" : "left";
            pad.holding = [dir];
            for (let i = 0; i < 60 * 10 && Math.abs(s.aim.power - target) > 0.05; i++) tick(s, pad);
            pad.holding = [];
            pad.tapped = true;
            tick(s, pad);
            settle(s);
        }
        assert.ok(ruleGame.won(s), `${L.title}: ${ruleGame.say(s)}`);
    });
});

test("the dotted path says where the ball will drop, for every pull", () => {
    for (const L of MACHINE_LEVELS) {
        for (let p = FEED.min; p <= FEED.max; p += 0.37) {
            const s = startMachine(L, 0),
                said = predict(L, p).pocket;
            pull(s, p);
            if (said === null) assert.equal(s.seen.length, 0, `${L.title} at ${p}`);
            else assert.equal(s.seen.at(-1)?.[0], said, `${L.title} at ${p}`);
        }
    }
});

test("a wrong ball is written in the table and bounces back, and the order waits", () => {
    const L = at(0);
    const power = powerFor(L, 1);
    assert.ok(power !== null);
    const s = startMachine(L, 0);
    pull(s, power);
    assert.deepEqual(s.seen, [[1, 4]]);
    assert.equal(s.done, 0);
    assert.equal(s.rejects, 1);
    assert.equal(s.phase, "aim", "and the next ball is ready at once");
    assert.match(ruleGame.say(s), /1 made 4/);
});

test("a stone keeps a ball out of its pocket, and a slow ball rolls back off a hump", () => {
    const stoned = at(3);
    for (let p = FEED.min; p < 4; p += 0.05)
        assert.notEqual(predict(stoned, p).pocket, 1, `nothing drops into the 1 at ${p}`);
    const humped = at(2);
    const four = powerFor(humped, 4),
        five = powerFor(humped, 5);
    assert.ok(
        four !== null && five !== null && five > four + 1,
        "the pocket past the hump needs a harder roll",
    );
    // a pull just short of cresting rolls back into the pocket before the hump
    assert.equal(predict(humped, five - 0.8).pocket, 4);
});

test("a recorded set of pulls lands where it did", () => {
    const L = at(1);
    const s = startMachine(L, 1);
    for (const p of [3.1, 6.36, 9.4, 8.29, 5.57]) pull(s, p);
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
    const L = at(0);
    const a = startMachine(L, 0),
        b = startMachine(L, 0);
    pull(a, 6.36);
    const pad = emptyPad();
    pad.released = { x: -6.36 / FEED.per, y: 0 };
    tick(b, pad, ruleGame.still.press(b));
    for (let i = 0; i < LIMIT && ruleGame.still.settling?.(b); i++) tick(b, emptyPad());
    assert.deepEqual(b.seen, a.seen);
    assert.equal(b.done, a.done);
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

test("every drawing it names is on the shelf, and its words are plain", () => {
    for (const [level, L] of MACHINE_LEVELS.entries()) {
        const s = ruleGame.start(level);
        for (const sp of ruleGame.frame(s).sprites) assert.ok(SHELF_IDS.has(sp.art), sp.art);
        assert.ok(!/[—!]/.test(`${L.goal} ${L.title} ${ruleGame.hint} ${ruleGame.say(s)}`));
    }
});
