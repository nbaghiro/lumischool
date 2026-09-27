// Down the river: every level and layout is paddled to a win with the keys and with drags, a stroke is
// stronger the longer it is drawn and weaker when rushed, a gate out of the count only carries the
// canoe back, rocks bump and never end a run, and random paddling almost never wins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { backWater, paddle, pilot, recordInto } from "./river-pilot";
import { eventsOf, progress } from "../../../engine/motion/goals";
import { cut, player, replay, tape } from "../../../engine/motion/tape";
import {
    RIVER_LEVELS,
    ROW,
    bowOf,
    gateX,
    lineX,
    middle,
    rowGame,
    start,
    startRiver,
    step,
    strokeOfDrag,
    type RiverState,
} from "../row";
import { actionChallenge } from "../action-challenges";
import { levelOf } from "../catalogue";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { faults } from "../../../engine/motion/tune";

const run = (s: RiverState, n: number, pad: Pad = emptyPad()) => {
    for (let i = 0; i < n && !s.won; i++) {
        step(s, pad);
        spent(pad);
    }
};

/** Every level at every layout its variations open. */
const layouts = (): { title: string; start: () => RiverState }[] =>
    RIVER_LEVELS.flatMap((L, phase) =>
        [0, 1, 2].map((seed) => ({
            title: `${L.title}, layout ${seed}`,
            start: () => {
                const c = actionChallenge(seed, "row", phase);
                return c.kind === "row" ? startRiver(c.level, phase) : start(phase);
            },
        })),
    );

test("every level and layout is paddled to a win with the keys alone and with drags alone", () => {
    for (const { title, start: open } of layouts())
        for (const input of ["keys", "pointer"] as const) {
            const s = open();
            assert.ok(pilot(s, input), `${title}, ${input}: ${rowGame.say(s)} ${s.said}`);
            assert.equal(s.next, s.L.count.length);
            assert.ok(Math.abs(bowOf(s).x - lineX(s.L, s.L.dock)) <= 1);
            assert.equal(rowGame.note(s), s.L.done);
        }
});

test("a stroke turns the bow away from its side, and a longer drag or a longer hold pushes harder", () => {
    const right = start(0);
    paddle(right, "pointer", 1, 1);
    assert.ok(right.boat.spin < 0, "a stroke on the right turns the bow left");
    const left = start(0);
    paddle(left, "keys", -1, 1);
    assert.ok(
        left.boat.spin > 0,
        "the right arrow is a stroke on the left, which turns the bow right",
    );
    const speed = (s: RiverState) => Math.hypot(s.boat.vx, s.boat.vy);
    const soft = start(0),
        hard = start(0);
    paddle(soft, "pointer", 1, 0.3);
    paddle(hard, "pointer", 1, 1);
    assert.ok(speed(hard) > speed(soft) + 0.5);
    const tap = start(0),
        held = start(0);
    paddle(tap, "keys", 1, 0.35, true);
    paddle(held, "keys", 1, 1, true);
    assert.ok(speed(held) > speed(tap) + 0.5, "a key held longer is a stronger stroke");
});

test("a stroke made straight after the last pushes less than one made in rhythm", () => {
    const rushed = start(0),
        steady = start(0);
    paddle(rushed, "pointer", 1, 1);
    paddle(steady, "pointer", 1, 1);
    const before = Math.hypot(rushed.boat.vx, rushed.boat.vy);
    paddle(rushed, "pointer", -1, 1);
    run(steady, Math.round(ROW.beat.value * 60));
    const was = Math.hypot(steady.boat.vx, steady.boat.vy);
    paddle(steady, "pointer", -1, 1);
    const gainRushed = Math.hypot(rushed.boat.vx, rushed.boat.vy) - before;
    const gainSteady = Math.hypot(steady.boat.vx, steady.boat.vy) - was;
    assert.ok(gainSteady > gainRushed * 1.8, `${gainSteady} against ${gainRushed}`);
});

test("a drag drawn back beside the canoe paddles on that side, and one drawn forward backs water", () => {
    const s = start(0),
        c = s.boat;
    const k = strokeOfDrag(s, { x: c.x, y: c.y + 1.4 }, { x: c.x - 2, y: c.y + 1.4 });
    assert.deepEqual(k, { side: 1, power: 0.5, back: false });
    const b = strokeOfDrag(s, { x: c.x, y: c.y - 1.4 }, { x: c.x + 4, y: c.y - 1.4 });
    assert.deepEqual(b, { side: -1, power: 1, back: true });
});

test("a gate out of the count only carries the canoe back above it to try again", () => {
    const s = start(0),
        L = s.L,
        x = gateX(L, 0),
        wrong = -(L.sides[0] ?? 1);
    s.boat.x = x - 0.05;
    s.boat.y = middle(L, x) + wrong * 2;
    s.boat.vx = 1;
    run(s, 10);
    assert.equal(s.next, 0);
    assert.match(s.said, /That gate was 3\. The count starts with 1\./);
    run(s, 90);
    assert.equal(s.carried, 0);
    assert.ok(Math.abs(s.boat.x - (x - 10)) < 0.5, `back above the gate at ${s.boat.x}`);
    assert.ok(!s.won);
});

test("rocks and banks bump the canoe about and never end the run", () => {
    const s = start(1),
        rock = s.L.rocks[0];
    assert.ok(rock);
    s.boat.x = rock.at - 3;
    s.boat.y = middle(s.L, rock.at) + rock.off * 5.5;
    for (let i = 0; i < 4; i++) paddle(s, "pointer", i % 2 ? 1 : -1, 1);
    run(s, 120);
    assert.ok(s.bumps > 0, "it hit the rock");
    run(s, 60 * 20);
    assert.ok(s.boat.y > middle(s.L, s.boat.x) - 6 && s.boat.y < middle(s.L, s.boat.x) + 6);
    assert.ok(!s.won);
});

test("resting beside the wrong number says how near, and it counts only once the canoe is still", () => {
    const s = start(0),
        L = s.L;
    s.next = L.count.length;
    const x = lineX(L, L.dock + 2) - 1.8;
    s.boat = { x, y: middle(L, x) - 8 + 1.2, angle: 0, vx: 0, vy: 0, spin: 0 };
    run(s, 60);
    assert.ok(!s.won);
    assert.match(s.said, /beside about 7\. 5 is a little back/);
    backWater(s, "keys", 60 * 3);
    run(s, 60 * 6);
    assert.ok(!s.won || Math.abs(bowOf(s).x - lineX(L, L.dock)) <= 1);
});

test("random paddling finds the count and the number at most one time in five", () => {
    RIVER_LEVELS.forEach((L, level) => {
        const rnd = seeded(41 + level);
        let wins = 0;
        const trials = 10;
        for (let t = 0; t < trials; t++) {
            const s = start(level);
            for (let n = 0; n < 150 && !s.won; n++) {
                const r = rnd();
                if (r < 0.15) backWater(s, rnd() < 0.5 ? "keys" : "pointer", 20);
                else
                    paddle(
                        s,
                        rnd() < 0.5 ? "keys" : "pointer",
                        rnd() < 0.5 ? 1 : -1,
                        rnd(),
                        rnd() < 0.3,
                    );
                run(s, Math.round(rnd() * 40));
            }
            if (s.won) wins++;
        }
        assert.ok(wins / trials <= 0.2, `${L.title}: ${wins} of ${trials}`);
    });
});

test("the same hands paddle the same river", () => {
    const once = () => {
        const s = start(3);
        pilot(s, "pointer");
        return JSON.stringify(s);
    };
    assert.equal(once(), once());
});

test("a try replays from its tape to the same river, and returns to the last gate it took", () => {
    const s = start(1),
        t = tape();
    recordInto(s, t);
    assert.ok(pilot(s, "keys"));
    const deck = { start: () => start(1), step };
    assert.equal(JSON.stringify(replay(deck, t)), JSON.stringify(s));
    // the last checkpoint is the step on which the last gate of the count was taken
    const fresh = start(1),
        next = player(t);
    let steps = 0,
        mark = 0,
        gates = 0;
    for (let n = next(); n?.pad; n = next()) {
        steps++;
        for (const e of eventsOf(step(fresh, n.pad))) {
            if (e.kind === "checkpoint") mark = steps;
            if (e.kind === "gate") gates++;
        }
    }
    assert.equal(gates, s.L.count.length);
    const back = replay(deck, cut(t, mark));
    assert.equal(back.next, s.L.count.length);
    assert.ok(!back.won);
    assert.deepEqual(progress(back.goal), {
        done: false,
        completed: s.L.count.length,
        total: s.L.count.length + 1,
    });
    assert.deepEqual(progress(s.goal), {
        done: true,
        completed: s.L.count.length + 1,
        total: s.L.count.length + 1,
    });
});

test("under reduced motion a press and its settling end where the same steps would", () => {
    const normal = start(2),
        reduced = start(2);
    const press = rowGame.still.press(reduced);
    for (const s of [normal, reduced]) {
        const pad = emptyPad();
        pad.pressed = ["up"];
        pad.holding = ["up"];
        run(s, 1, pad);
        pad.holding = ["up"];
        run(s, press - 1, pad);
    }
    const quiet = emptyPad();
    let n = 0;
    for (; n < 1200 && rowGame.still.settling?.(reduced); n++) run(reduced, 1, quiet);
    run(normal, n, emptyPad());
    assert.ok(n < 1200, "settling ends");
    assert.deepEqual(reduced, normal);
});

test("every drawing it names is on the shelf, its tuning is sound, and a link to stopping on the line opens it", () => {
    const seen = new Set<string>([rowGame.cover.art]);
    RIVER_LEVELS.forEach((_, level) => {
        const s = start(level);
        for (const sp of rowGame.frame(s).sprites) seen.add(sp.art);
        paddle(s, "pointer", 1, 1);
        for (const sp of rowGame.frame(s, true).sprites) seen.add(sp.art);
    });
    for (const art of seen) assert.ok(SHELF_IDS.has(art), `${art} is not on the shelf`);
    assert.deepEqual(faults(ROW), []);
    assert.equal(levelOf("race.stop-on-the-line", 0)?.game.id, "straight");
    for (const L of RIVER_LEVELS) {
        assert.ok(!/[—!]/.test(`${L.goal} ${L.prompt} ${L.done} ${rowGame.hint}`), L.title);
        assert.equal(L.count.length, L.decoys.length);
        assert.equal(L.count.length, L.sides.length);
        L.count.forEach((n, k) => assert.notEqual(n, L.decoys[k]));
    }
});

test("the current shows in streaks that run longer through the rapids, and a stroke leaves a ring", () => {
    const L = RIVER_LEVELS.find((x) => x.narrows.length > 0);
    assert.ok(L);
    const s = startRiver(L, RIVER_LEVELS.indexOf(L));
    const narrow = L.narrows[0];
    assert.ok(narrow);
    const longest = (x: number) => {
        s.cam = { x, y: middle(L, x), zoom: 1 };
        return Math.max(
            ...rowGame
                .frame(s)
                .marks.flatMap((m) =>
                    m.kind === "line" && m.style === "thin" && Math.abs(m.a.x - x) < 2
                        ? [Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y)]
                        : [],
                ),
        );
    };
    assert.ok(longest(narrow.at) > longest(4) + 0.1, "the rapids run faster");
    paddle(s, "keys", 1, 1, true);
    assert.ok(
        rowGame.frame(s).marks.some((m) => m.kind === "ring"),
        "the paddle's splash rings the water",
    );
});
