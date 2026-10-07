// Bolt's rescue: every planet and variant is rescued by the keys and by a finger with the buttons,
// and the inputs replay to the same rescue; random hands rarely fly anyone home; the dotted arc is the
// jump's own path; a spin breaks crates and walls, rolls boulders and wakes sleeping crew; the jets
// blast a cracked tile; gates open for their number; the gloves pull the plank as far as Bolt walks
// back; the magnet slides its block; the rocket fires once a jump; dunes swallow a robot that stands
// still; batteries run out into a kind ending; the free planet keeps its count; and the frame draws
// only the shelf.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { grounded } from "../../../engine/motion/walker";
import { SHELF_IDS } from "./shelf";
import {
    BOLT_LEVELS,
    BOLT,
    RATE,
    arcOf,
    boltFrame,
    boltGame,
    movesOn,
    rescued,
    rowWords,
    startBolt,
    stepBolt,
    type BoltState,
} from "../bolt";
import { play, rescueThrough, type Input } from "../bolt-challenges";

const kept = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

function replay(phase: number, variant: number, inputs: readonly Input[]): BoltState {
    const s = startBolt(phase, variant);
    for (const i of inputs) play(s, i);
    return s;
}

const run = (s: BoltState, steps: number, pad: () => Pad = emptyPad): void => {
    for (let n = 0; n < steps; n++) stepBolt(s, kept(pad()));
};

const right = (): Pad => {
    const p = emptyPad();
    p.holding = ["right"];
    p.held = "right";
    return p;
};

test("every planet and variant is rescued by the keys and by a finger, and the inputs replay to the same rescue", () => {
    for (const [phase, L] of BOLT_LEVELS.entries())
        for (let v = 0; v < L.variants.length; v++)
            for (const hands of ["keys", "touch"] as const) {
                const inputs = rescueThrough(phase, v, hands);
                assert.ok(
                    inputs,
                    `${L.title}, variant ${v}, by ${hands}: the crew were not flown home`,
                );
                const a = replay(phase, v, inputs),
                    b = replay(phase, v, inputs);
                assert.equal(a.end, "won", `${L.title}, variant ${v}: the replay did not win`);
                assert.equal(
                    JSON.stringify(a),
                    JSON.stringify(b),
                    `${L.title}: not the same twice`,
                );
            }
});

/** Hands that press at random: a direction, a jump held or tapped, a spin and the gadget now and then. */
function randomRound(phase: number, k: number): boolean {
    let seed = 7919 + k * 104729 + phase * 1299709;
    const rand = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
    const L = BOLT_LEVELS[phase] ?? BOLT_LEVELS[0];
    const s = startBolt(phase, k % L.variants.length);
    let pad = emptyPad();
    for (let n = 0; n < RATE * 90 && !s.end; n++) {
        if (n % 12 === 0) {
            pad = emptyPad();
            const d = rand();
            if (d < 0.5) pad.holding = ["right"];
            else if (d < 0.7) pad.holding = ["left"];
            pad.held = pad.holding[0] ?? null;
            if (rand() < 0.4) {
                pad.go = true;
                pad.tapped = true;
            }
            if (rand() < 0.1) pad.pressed = ["down"];
            if (rand() < 0.08) boltGame.command?.(s, "gadget");
        }
        stepBolt(s, kept(pad));
        pad.tapped = false;
        pad.pressed = [];
    }
    return s.end === "won";
}

const RANDOM_ROUNDS = 12;

test("random hands rarely fly the crew home in a minute and a half", () => {
    for (const [phase, L] of BOLT_LEVELS.entries()) {
        let wins = 0;
        for (let k = 0; k < RANDOM_ROUNDS; k++) if (randomRound(phase, k)) wins++;
        // the moon is the first planet and meant to be forgiving
        const most = phase === 0 ? 4 : 2;
        assert.ok(wins <= most, `${L.title}: random hands won ${wins} of ${RANDOM_ROUNDS}`);
    }
});

test("the dotted arc is the path a held jump from here takes", () => {
    for (const phase of [0, 1]) {
        const s = startBolt(phase);
        run(s, 40, right);
        const arc = arcOf(s);
        assert.ok(arc.length > 5);
        // jump for real, with the jets held off by letting the jump go as it tops out
        const copy = structuredClone(s);
        const path: { x: number; y: number }[] = [];
        const dir = copy.r.vx > 0.5 ? 1 : 0;
        for (let n = 0; n < 120 && path.length < arc.length; n++) {
            const p = emptyPad();
            if (dir) {
                p.holding = ["right"];
                p.held = "right";
            }
            p.go = copy.r.vy < -0.5 || n === 0;
            p.tapped = n === 0;
            stepBolt(copy, kept(p));
            if (n > 0 && n % 4 === 0) path.push({ x: copy.r.x, y: copy.r.y - 0.9 });
        }
        arc.slice(0, path.length).forEach((a, i) => {
            const b = path[i];
            assert.ok(b && Math.hypot(a.x - b.x, a.y - b.y) < 0.15, `dot ${i} is off the jump`);
        });
    }
});

test("a spin breaks a crate and frees the crew inside, knocks a wall down, rolls a boulder and wakes a sleeper", () => {
    const s = startBolt(0);
    const crate = s.L.things[0];
    if (!crate) throw new Error("no crate");
    s.r.x = crate.x - 1.6;
    boltGame.command?.(s, "spin");
    run(s, 3);
    assert.equal(s.held[0]?.gone, true, "the crate broke");
    assert.equal(s.mates[1]?.state, "waiting", "the crew member inside is free");
    assert.ok(s.pieces.length > 0, "the crate flies apart");

    const lava = startBolt(3);
    const wall = lava.L.things[0];
    if (!wall) throw new Error("no wall");
    lava.r.x = wall.x - 1.2;
    lava.r.y = wall.y;
    const solid = () => lava.L.things.length > 0 && !lava.held[0]?.gone;
    assert.ok(solid());
    const keys = emptyPad();
    keys.pressed = ["down"];
    stepBolt(lava, kept(keys));
    run(lava, 3);
    assert.ok(!solid(), "the down arrow spins the wall down too");

    const cave = startBolt(7);
    const rock = cave.L.things.findIndex((t) => t.kind === "rock");
    const at = cave.held[rock];
    if (!at) throw new Error("no rock");
    cave.r.x = at.x - 1.6;
    const from = at.x;
    boltGame.command?.(cave, "spin");
    run(cave, RATE * 2);
    assert.ok((cave.held[rock]?.x ?? 0) > from + 2, "the boulder rolled away");

    const ice = startBolt(1);
    assert.equal(ice.mates[0]?.state, "asleep");
    ice.r.x = (ice.L.crew[0]?.x ?? 0) - 1.4;
    boltGame.command?.(ice, "spin");
    run(ice, 2);
    assert.equal(ice.mates[0]?.state, "waiting", "the sleeper woke");
});

test("the jets' blast breaks a cracked tile, and the crew below are found", () => {
    const s = startBolt(4);
    const tile = s.L.things.findIndex((t) => t.kind === "tile");
    const t = s.L.things[tile];
    if (!t) throw new Error("no tile");
    s.r.x = t.x;
    s.r.y = t.y - 2;
    s.r.state = "fall";
    s.r.vy = 1;
    const hold = (): Pad => {
        const p = emptyPad();
        p.go = true;
        return p;
    };
    run(s, 30, hold);
    assert.equal(s.held[tile]?.gone, true, "the tile gave way");
    run(s, RATE);
    assert.ok(
        s.mates.some((m) => m.state === "following"),
        "the crew member below was found",
    );
});

test("a gate stays shut until enough crew are rescued, and says how many more", () => {
    const s = startBolt(1);
    const gate = s.L.gates[0];
    if (!gate) throw new Error("no gate");
    s.r.x = gate.x - 1.2;
    run(s, 2);
    assert.match(s.said, /rescue 3 more/);
    run(s, RATE, right);
    assert.ok(s.r.x < gate.x, "the shut gate holds Bolt back");
    s.mates.forEach((m, k) => {
        if (k < 3) m.state = "following";
    });
    s.told = "";
    run(s, RATE, right);
    assert.ok(s.r.x > gate.x + 1, "the open gate lets Bolt through");
});

test("the spring gloves pull the plank out as far as Bolt walks back, and it stays where it was let go", () => {
    const s = startBolt(2);
    const b = s.L.bridge;
    if (!b) throw new Error("no bridge");
    s.r.x = b.x - 14;
    boltGame.command?.(s, "gloves");
    run(s, 1);
    assert.ok(s.grab, "the gloves have the handle");
    const left = (): Pad => {
        const p = emptyPad();
        p.holding = ["left"];
        p.held = "left";
        return p;
    };
    const from = s.r.x;
    run(s, 30, left);
    const walked = from - s.r.x;
    assert.ok(
        Math.abs(s.plank - walked * BOLT.leverage.value) < 0.5,
        `walked ${walked}, plank ${s.plank}`,
    );
    boltGame.command?.(s, "gadget");
    run(s, 1);
    const out = s.plank;
    assert.equal(s.grab, null);
    run(s, 30, right);
    assert.equal(s.plank, out, "a plank let go stays out");
});

test("the magnet slides a metal block along its rail to Bolt, and stops beside it", () => {
    const s = startBolt(6);
    const k = s.L.things.findIndex((t) => t.kind === "metal");
    const h = s.held[k];
    if (!h) throw new Error("no metal block");
    s.r.x = 8;
    boltGame.command?.(s, "magnet");
    run(s, RATE * 2);
    assert.ok(Math.abs(h.x - (8 + 1.9)) < 0.1, `the block is at ${h.x}`);
    boltGame.command?.(s, "magnet");
    run(s, 2);
    s.r.x = 4;
    run(s, RATE);
    assert.ok(Math.abs(h.x - 9.9) < 0.1, "with the magnet off the block stays");
});

test("the rocket pack fires once each jump, and a landing fills it again", () => {
    const s = startBolt(5);
    const jump = emptyPad();
    jump.go = true;
    jump.tapped = true;
    stepBolt(s, kept(jump));
    run(s, 10);
    boltGame.command?.(s, "rocket");
    run(s, 2);
    assert.ok(s.boost > 0 && s.r.vx > 9, "the burst throws Bolt along");
    run(s, 20);
    boltGame.command?.(s, "rocket");
    run(s, 1);
    assert.match(s.said, /once each jump/);
    run(s, RATE * 3);
    assert.ok(grounded(s.r) && !s.boosted, "landed, the pack is ready");
});

test("a dune swallows a robot that stands still, and a battery is spent; out of batteries ends kindly", () => {
    const s = startBolt(4);
    const dune = s.L.ledges.findIndex((l) => l.sinks);
    const l = s.L.ledges[dune];
    if (!l) throw new Error("no dune");
    s.r.x = (l.x0 + l.x1) / 2;
    s.r.y = l.y;
    run(s, RATE * 3);
    assert.equal(s.batteries, 2, "the swallow cost a battery");
    s.batteries = 1;
    s.r.x = 20;
    s.r.y = 30;
    s.r.state = "fall";
    run(s, RATE);
    assert.equal(s.end, "out");
    const end = boltGame.ended?.(s);
    assert.ok(end && !end.won);
    assert.match(end.words, /Another go\?/);
    assert.doesNotMatch(end.words, /lost|lose/i);
});

test("the crew climb aboard by their numbers, and the ship leaves with the seats in rows", () => {
    assert.equal(rowWords(12, 4), "3 rows of 4");
    assert.equal(rowWords(10, 4), "2 rows of 4 and 2 more");
    assert.equal(rowWords(3, 4), "3 in a row");
    const inputs = rescueThrough(4, 0, "keys");
    if (!inputs) throw new Error("not rescued");
    const s = replay(4, 0, inputs);
    assert.equal(s.end, "won");
    assert.equal(rescued(s), s.need);
    assert.match(s.said, /2 rows of 5/);
    const end = boltGame.ended?.(s);
    assert.ok(end?.won);
});

test("a planet's pull is read in the jump: 6 squares on the moon, 4 on Earth, 2 in the junkyard", () => {
    const heights = BOLT_LEVELS.map((L) => Math.round(movesOn(L).jump * 10) / 10);
    assert.equal(heights[0], 6);
    assert.equal(heights[1], 4);
    assert.equal(heights[6], 2);
    assert.match(BOLT_LEVELS[0].jumpWords, /6 squares/);
});

test("the free planet keeps the crew flown home on every visit", () => {
    const free = BOLT_LEVELS.length - 1;
    assert.ok(BOLT_LEVELS[free]?.free);
    const s = startBolt(free);
    assert.equal(boltGame.restore?.(s, { flown: 7 }), true);
    assert.equal(s.kept, 7);
    assert.equal(boltGame.restore?.(s, { flown: "lots" }), false);
    const inputs = rescueThrough(free, 0, "keys");
    if (!inputs) throw new Error("not rescued");
    const done = replay(free, 0, inputs);
    done.kept = 7;
    assert.deepEqual(boltGame.checkpoint?.(done), { flown: 17 });
});

test("the frame draws only the shelf, keeps its readouts in the corner, and the state is plain data", () => {
    for (const [phase] of BOLT_LEVELS.entries()) {
        const s = startBolt(phase);
        run(s, 30, right);
        const f = boltFrame(s);
        for (const sp of f.sprites)
            assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
        assert.ok(f.sprites.some((sp) => sp.fixed && sp.art === "crewbot"));
        assert.ok(f.marks.some((m) => m.kind === "word" && m.fixed));
        // a state holds only plain data: it reads back from JSON as it was written, and plays on alike
        const text = JSON.stringify(s);
        const back: unknown = JSON.parse(text);
        assert.equal(JSON.stringify(back), text);
        const a = structuredClone(s),
            b = structuredClone(s);
        run(a, 60, right);
        run(b, 60, right);
        assert.equal(JSON.stringify(b), JSON.stringify(a), "the same state plays on the same");
    }
});
