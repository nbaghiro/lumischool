import { test } from "node:test";
import assert from "node:assert/strict";
import { down, emptyPad, spent, up, type Pad } from "../pad";
import type { Happening } from "../scene";
import { cut, player, readTape, recordOther, recordStep, replay, tape, type Deck } from "../tape";

interface Walk {
    x: number;
    steps: number;
    log: string[];
}

/** A small game: right walks on while held, a command jumps, back takes a jump away. */
const walk: Deck<Walk> = {
    start: () => ({ x: 0, steps: 0, log: [] }),
    step(s, pad) {
        s.steps++;
        if (pad.holding.includes("right")) s.x++;
        for (const d of pad.pressed) s.log.push(d);
        const out: Happening[] = [];
        if (s.x > 0 && s.x % 5 === 0) out.push({ event: { kind: "checkpoint" } });
        return out;
    },
    command: (s, id) => void s.log.push(id),
    back: (s) => s.log.pop() !== undefined,
};

function play(t: ReturnType<typeof tape>): Walk {
    const s = walk.start(),
        pad: Pad = emptyPad();
    const go = (n: number) => {
        for (let i = 0; i < n; i++) {
            recordStep(t, pad);
            walk.step(s, pad);
            spent(pad);
        }
    };
    down(pad, "right");
    go(7);
    up(pad, "right");
    go(30);
    recordOther(t, { command: "jump" });
    walk.command?.(s, "jump");
    go(2);
    recordOther(t, { back: true });
    walk.back?.(s);
    down(pad, "right");
    go(4);
    return s;
}

test("a tape played into a fresh start gives the same state, and a run of the same hands is kept once", () => {
    const t = tape();
    const s = play(t);
    assert.equal(t.steps, 43);
    assert.ok(t.entries.length < 10, `${t.entries.length} entries`);
    assert.deepEqual(replay(walk, t), s);
    assert.deepEqual(JSON.parse(JSON.stringify(t)), t);
});

test("cutting a tape at a step replays to that step, without what the page did after it", () => {
    const t = tape();
    play(t);
    const at5 = replay(walk, cut(t, 5));
    assert.equal(at5.steps, 5);
    assert.equal(at5.x, 5);
    const beforeBack = replay(walk, cut(t, 39));
    assert.deepEqual(beforeBack.log, ["right", "jump"]);
});

test("the player gives one step's pad at a time, with the commands before it, and ends", () => {
    const t = tape();
    const s = play(t);
    const next = player(t),
        again = walk.start();
    let n = next(),
        steps = 0;
    for (; n?.pad; n = next()) {
        for (const e of n.before)
            if ("command" in e) walk.command?.(again, e.command);
            else if ("back" in e) walk.back?.(again);
        walk.step(again, n.pad);
        steps++;
    }
    assert.equal(steps, t.steps);
    assert.deepEqual(again, s);
    assert.equal(next(), null);
});

test("a tape written out as JSON reads back as the same tape and plays the same try", () => {
    const t = tape();
    play(t);
    const back = readTape(JSON.parse(JSON.stringify(t)));
    assert.notEqual(typeof back, "string");
    if (typeof back === "string") return;
    assert.deepEqual(back, t);
    assert.deepEqual(replay(walk, back), replay(walk, t));
});

test("a tape that is not one says what is wrong with it rather than playing", () => {
    const pad = emptyPad();
    const cases: [unknown, RegExp][] = [
        [null, /list of entries/],
        [{ entries: "no" }, /list of entries/],
        [{ entries: [{ pad, n: 0 }] }, /how many steps/],
        [{ entries: [{ pad: { ...pad, held: "sideways" }, n: 1 }] }, /held/],
        [{ entries: [{ pad: { ...pad, pull: { x: "1", y: 2 } }, n: 1 }] }, /pull/],
        [{ entries: [{ pad: { ...pad, intents: [{ kind: "spin", by: 1 }] }, n: 1 }] }, /intents/],
        [{ entries: [{ jump: true }] }, /not a step/],
        [{ entries: [{ pad, n: 2 }], steps: 3 }, /says 3 steps and holds 2/],
    ];
    for (const [v, why] of cases) {
        const read = readTape(v);
        if (typeof read !== "string") assert.fail(`${JSON.stringify(v)} read as a tape`);
        assert.match(read, why);
    }
});
