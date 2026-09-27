// The shunting yard: pushes couple, knock or stop short by how hard they are, a siding is filled
// from its buffer stop and emptied from its points end, every layout is made up by the keys and by a
// finger, and a recorded way plays back to the same yard.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { eventsOf } from "../../../engine/motion/goals";
import { recordStep, replay as playTape, tape } from "../../../engine/motion/tape";
import { ACTIVITIES } from "../activities";
import { gameById } from "../catalogue";
import {
    CREST,
    ORIGIN,
    POINTS,
    YARD_LEVELS,
    YARD_WORLD,
    looseOf,
    made,
    moving,
    push,
    sendBack,
    startYard,
    stepYard,
    yardFrame,
    yardGame,
    type YardState,
} from "../yard";
import {
    isYardConfiguration,
    openYardConfiguration,
    plan,
    replay,
    yardConfigurations,
    yardWay,
} from "../yard-challenges";
import type { Happening } from "../../../engine/motion/scene";

const settle = (s: YardState): Happening[] => {
    const out: Happening[] = [];
    for (let i = 0; i < 60 * 20 && moving(s); i++) out.push(...stepYard(s, emptyPad()));
    return out;
};

/** The softest push that couples the next wagon into siding `k`, found by trying each on a copy. */
function couple(s: YardState, k: number): void {
    s.points = k;
    for (let p = 1; p <= 7; p += 0.25) {
        const t = structuredClone(s),
            n = made(t, k).length;
        push(t, p);
        settle(t);
        if (made(t, k).length > n) {
            push(s, p);
            settle(s);
            return;
        }
    }
    throw new Error("nothing couples");
}

/** A push of `power` into siding `k` on a fresh first level, and what came of it. */
function pushed(power: number, k = 0) {
    const s = startYard(0);
    s.points = k;
    push(s, power);
    const hs = settle(s);
    return { s, hs };
}

test("a gentle push couples, a hard one knocks and rolls back, and a soft one stops short", () => {
    const soft = pushed(1);
    assert.deepEqual(made(soft.s, 0), []);
    assert.ok(looseOf(soft.s), "a soft push leaves the wagon loose");
    const gentle = pushed(3.8);
    assert.deepEqual(made(gentle.s, 0), ["2"]);
    assert.ok(eventsOf(gentle.hs).some((e) => e.kind === "couple" && e.value === "2"));
    const hard = pushed(7);
    assert.deepEqual(made(hard.s, 0), []);
    assert.ok(hard.hs.some((h) => "shake" in h));
    assert.match(hard.s.note, /Too fast/);
    // a loose wagon is pushed again from where it stopped, which is the nudge
    push(soft.s, 2.5);
    settle(soft.s);
    assert.ok(made(soft.s, 0).length === 1 || looseOf(soft.s), "the nudge moved it on");
});

test("the points send a wagon to their siding, and are locked while a wagon rolls", () => {
    const s = startYard(0);
    stepYard(s, { ...emptyPad(), pressed: ["up"] });
    assert.equal(s.points, 1);
    push(s, 3.8);
    stepYard(s, emptyPad());
    stepYard(s, { ...emptyPad(), pressed: ["down"] });
    assert.equal(s.points, 1, "the points hold while the wagon runs");
    assert.match(s.note, /Wait for the wagon/);
    settle(s);
    assert.deepEqual(made(s, 1), ["2"]);
    assert.deepEqual(made(s, 0), []);
});

test("a siding is filled from its buffer stop, refuses when full, and sends its last wagon back", () => {
    const s = startYard(2);
    s.points = 1;
    for (const w of ["3", "1"]) {
        couple(s, 1);
        assert.equal(made(s, 1).at(-1), w);
    }
    const out: Happening[] = [];
    push(s, 4, out);
    assert.match(s.note, /is full/);
    assert.ok(out.some((h) => "cue" in h && h.cue === "nope"));
    assert.equal(sendBack(s, 1), true);
    assert.deepEqual(made(s, 1), ["3"]);
    assert.deepEqual(
        s.queue.map((w) => w.label),
        ["2", "1"],
        "the last one in goes to the end of the line",
    );
});

test("every layout of every level is made up by the keys and by a finger, and the way plays back", () => {
    for (let phase = 0; phase < YARD_LEVELS.length; phase++) {
        const pool = yardConfigurations(phase);
        assert.ok(pool.length >= 2, `level ${phase} has variations`);
        for (const c of pool) {
            assert.ok(isYardConfiguration(c, phase));
            assert.ok(plan(openYardConfiguration(c)), `${phase} ${c.queue.join()} has a plan`);
            for (const by of ["keys", "touch"] as const) {
                const way = yardWay(openYardConfiguration(c), { by });
                assert.ok(way, `${phase} ${c.queue.join()} by ${by}`);
                assert.equal(replay(openYardConfiguration(c), way), true);
            }
        }
    }
});

test("a recorded try replays through the tape to the same yard, and a made-up siding is a checkpoint", () => {
    const c = yardConfigurations(1)[0];
    assert.ok(c);
    const way = yardWay(openYardConfiguration(c));
    assert.ok(way);
    const t = tape();
    const s = openYardConfiguration(c);
    const heard: Happening[] = [];
    for (const p of way) {
        recordStep(t, p);
        heard.push(...stepYard(s, { ...p, pressed: [...p.pressed], holding: [...p.holding] }));
    }
    const again = playTape(
        { start: () => openYardConfiguration(c), step: (x, p: Pad) => stepYard(x, p) },
        t,
    );
    assert.equal(again.won, true);
    assert.deepEqual(JSON.parse(JSON.stringify(again)), JSON.parse(JSON.stringify(s)));
    const events = eventsOf(heard);
    assert.equal(events.filter((e) => e.kind === "checkpoint").length, 2);
    assert.equal(events.at(-1)?.kind, "made-up");
});

test("pressing at random rarely makes up an order level", () => {
    let wins = 0;
    for (let seed = 1; seed <= 12; seed++) {
        const s = startYard(3);
        let r = seed;
        const rand = () => (r = (r * 1103515245 + 12345) >>> 0) / 2 ** 32;
        const keys = ["up", "down", "left", "right"] as const;
        for (let i = 0; i < 3000 && !s.won; i++) {
            const pad = emptyPad();
            const x = rand();
            if (x < 0.02) pad.tapped = true;
            else if (x < 0.03) pad.brake = true;
            else if (x < 0.08) pad.pressed = [keys[Math.floor(rand() * 4)] ?? "up"];
            stepYard(s, pad);
        }
        if (s.won) wins++;
    }
    assert.ok(wins <= 2, `${wins} random wins`);
});

test("the three shunting levels are the shunt activity's versions", () => {
    const listed = ACTIVITIES.find((a) => a.id === "shunt.into-order");
    assert.ok(listed);
    assert.deepEqual(yardGame.plays, { activity: "shunt.into-order", levels: [2, 3, 4] });
    listed.versions.forEach((values, i) => {
        const L = YARD_LEVELS[yardGame.plays?.levels[i] ?? -1];
        assert.ok(L);
        // a version's values open with its train, as in "3 1 2, and room for two"
        assert.deepEqual(L.queue, (values.split(",")[0] ?? "").split(" "));
        assert.equal(L.order.length, L.queue.length);
    });
    assert.equal(gameById("shunt"), yardGame);
});

test("the yard is drawn from the shelf, fills its world, and a rest frame stands still", () => {
    for (let phase = 0; phase < YARD_LEVELS.length; phase++) {
        const s = startYard(phase);
        const f = yardFrame(s);
        for (const p of f.sprites) {
            assert.ok(SHELF_IDS.has(p.art), `${p.art} is not on the shelf`);
            assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), p.key);
        }
        assert.deepEqual(f.world, YARD_WORLD);
        // ground reaches every edge under the sidings, so a grown view never shows the world's end
        const meadow = f.sprites.filter((p) => p.art === "meadow");
        const right = Math.max(...meadow.map((p) => p.x + (p.size ?? 0) / 2));
        assert.ok(Math.min(...meadow.map((p) => p.x - (p.size ?? 0) / 2)) <= 0);
        assert.ok(right >= YARD_WORLD.w);
        const rails = f.sprites.filter((p) => p.key.startsWith("yard"));
        assert.ok(Math.max(...rails.map((p) => p.x + (p.size ?? 0) / 2)) >= YARD_WORLD.w);
        assert.ok(f.view.w <= 64, "a phone at six pixels a square holds the view");
    }
    const s = startYard(0);
    push(s, 4);
    for (let i = 0; i < 10; i++) stepYard(s, emptyPad());
    const rest = yardFrame(s, true);
    assert.equal(rest.time, 0);
    assert.equal(
        rest.marks.some((m) => m.kind === "dots"),
        false,
    );
    const q = rest.sprites.find((p) => p.key === s.queue[0]?.id);
    assert.equal(q?.x !== undefined && Math.abs(q.x - (CREST + ORIGIN.x)) < 1.5, true);
});

test("a finger on the front wagon pulls it back and pushes it, and a tap on a board sets the points", () => {
    const s = startYard(0);
    const board = yardFrame(s).sprites.find((p) => p.key === "board1");
    assert.ok(board);
    const at = { x: board.x, y: board.y - 3 };
    stepYard(s, { ...emptyPad(), touch: at });
    stepYard(s, { ...emptyPad(), lifted: at });
    assert.equal(s.points, 1);
    const w = yardFrame(s).sprites.find((p) => p.key === s.queue[0]?.id);
    assert.ok(w);
    stepYard(s, { ...emptyPad(), touch: { x: w.x, y: w.y } });
    stepYard(s, { ...emptyPad(), touch: { x: w.x + 2.6, y: w.y } });
    stepYard(s, { ...emptyPad(), lifted: { x: w.x + 2.6, y: w.y } });
    assert.equal(s.pushes, 1);
    assert.ok(moving(s));
    settle(s);
    assert.ok((looseOf(s)?.v.x ?? 0) < POINTS || made(s, 1).length === 1);
});

test("the yard has its own sounds and a rumble while a wagon rolls", () => {
    for (const cue of ["place", "bump", "lift", "back", "win"] as const)
        assert.ok(yardGame.sounds?.[cue]?.length, cue);
    const s = startYard(0);
    push(s, 4);
    for (let i = 0; i < 60; i++) stepYard(s, emptyPad());
    assert.ok((yardGame.hum?.(s) ?? []).length >= 2);
    for (const L of YARD_LEVELS) assert.ok(!/[—!]/.test(`${L.goal} ${yardGame.hint}`), L.title);
});
