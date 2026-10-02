import { test } from "node:test";
import assert from "node:assert/strict";
import { eventsOf, progress } from "../../../engine/motion/goals";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { replay, tape } from "../../../engine/motion/tape";
import {
    approachTo,
    BEAT,
    carries,
    clearCourse,
    clearFrame,
    clearGame,
    CLEAR_LEVELS,
    GATHER,
    gatherFor,
    GROUND,
    LEAST,
    leapOf,
    RATE,
    startClear,
    stepClear,
    takeoffBand,
    zoneOf,
    type ClearState,
} from "../clear";
import {
    clearChallenge,
    isClearConfiguration,
    rideable,
    ridePlan,
    skilful,
    steady,
    type Fall,
} from "../clear-challenges";
import { keysFor, ride } from "./clear-rider";
import { SHELF_IDS } from "./shelf";

const LAYOUTS = CLEAR_LEVELS.flatMap((_, phase) =>
    [0, 1, 2].map((variant) => ({ phase, variant })),
);

const steps = (s: ClearState, n: number, pad: () => Pad = emptyPad) => {
    for (let i = 0; i < n; i++) clearGame.step(s, pad());
};

/** A finger or the Jump button on the screen, held. */
const screen = (): Pad => ({ ...emptyPad(), go: true });
/** The space bar, held. */
const space = (): Pad => ({ ...emptyPad(), go: true, keys: true });

function planFor(phase: number, variant: number): readonly Fall[] {
    const plan = ridePlan(clearCourse(phase, variant));
    assert.ok(plan, `level ${phase} layout ${variant} has a clear ride with the keys`);
    return plan;
}

const clean = (s: ClearState) => {
    assert.equal(s.faults, 0);
    assert.equal(s.stops, 0, "it is never refused");
    assert.deepEqual(progress(s.goal), {
        done: true,
        completed: s.course.fences.length,
        total: s.course.fences.length,
    });
};

test("every layout of every level is ridden clean by one tap on the screen a fence", () => {
    for (const { phase, variant } of LAYOUTS) {
        const s = startClear(clearCourse(phase, variant), phase);
        assert.ok(ride(s), `level ${phase} layout ${variant}`);
        clean(s);
        assert.ok(rideable(s.course));
    }
});

test("every layout of every level is ridden clean with the keys, choosing strides and holding space, as before", () => {
    for (const { phase, variant } of LAYOUTS) {
        const s = startClear(clearCourse(phase, variant), phase);
        assert.ok(ride(s, keysFor(s)), `level ${phase} layout ${variant}`);
        clean(s);
        assert.equal(s.screen, false, "the keys never hand the stride to the pony");
    }
});

test("a round with the keys replays from its tape, and a checkpoint follows every clean fence", () => {
    const phase = 3,
        variant = 1,
        s = startClear(clearCourse(phase, variant), phase),
        t = tape();
    assert.ok(ride(s, keysFor(s), t));
    const again = replay(
        { start: () => startClear(clearCourse(phase, variant), phase), step: stepClear },
        t,
    );
    assert.equal(again.steps, s.steps);
    assert.equal(again.pony.x, s.pony.x);
    assert.equal(clearGame.won(again), true);
    const fresh = startClear(clearCourse(phase, variant), phase),
        plan = planFor(phase, variant);
    const seen: string[] = [];
    for (let i = 0; i < t.steps && !fresh.done; i++)
        for (const e of eventsOf(clearGame.step(fresh, skilful(fresh, plan))))
            seen.push(`${e.kind}${e.value ?? ""}`);
    assert.deepEqual(
        seen,
        fresh.course.fences.flatMap((_, i) => [`clear${i}`, "checkpoint"]),
    );
});

test("after a tap on the screen the pony sees its own stride: a print lands in the band, two to four prints away", () => {
    for (const { phase, variant } of LAYOUTS) {
        const c = clearCourse(phase, variant),
            f = c.fences[0];
        assert.ok(f);
        const a = approachTo(c, f, c.start);
        assert.ok(a, `level ${phase} layout ${variant} has an approach`);
        assert.ok(gatherFor(f, a.at, a.stride) !== null);
        assert.ok(a.n >= 2 && a.n <= 4);
    }
    const s = startClear(clearCourse(1, 0), 1);
    steps(s, 1, screen);
    steps(s, 1);
    assert.equal(s.screen, false, "the tap that starts the round only starts the pony");
    steps(s, 8);
    steps(s, 1, screen);
    steps(s, 1);
    assert.equal(s.screen, true);
});

/** A tap on the screen: down for a step, then up. */
const tap = (s: ClearState) => {
    clearGame.step(s, screen());
    clearGame.step(s, emptyPad());
};

test("a tap on the screen is kept from a stride before the zone: the pony leaps from the ringed print", () => {
    for (const early of [1, 2]) {
        const s = startClear(clearCourse(1, 0), 1);
        steps(s, 10);
        tap(s);
        const a = s.approach;
        assert.ok(a && a.n >= 2);
        while (s.fall + early * s.want < a.at - 1e-6) clearGame.step(s, emptyPad());
        tap(s);
        assert.deepEqual(s.asked, { keys: false }, "the tap is kept");
        for (let i = 0; i < 60 * 5 && !s.flight; i++) clearGame.step(s, emptyPad());
        assert.ok(s.flight);
        assert.ok(Math.abs(s.flight.from - a.at) < 1e-6, "it waited for the ringed print");
        for (let i = 0; i < 60 * 5 && s.fence === 0; i++) clearGame.step(s, emptyPad());
        assert.equal(s.faults, 0);
    }
});

test("a tap well before the zone asks nothing, the zone lights as the pony comes in, and a kept tap shows a tick", () => {
    const s = startClear(clearCourse(1, 0), 1);
    steps(s, 10);
    tap(s);
    const z = zoneOf(s),
        a = s.approach;
    assert.ok(z && a);
    s.asked = null;
    // back at the start of a stride well short of the zone, a tap is not kept
    if (s.pony.x < z.from - a.stride) {
        tap(s);
        assert.equal(s.asked, null);
    }
    while (s.pony.x < z.from + 0.1) clearGame.step(s, emptyPad());
    const lit = clearFrame(s).marks.find((m) => m.kind === "box");
    assert.ok(lit && lit.kind === "box" && lit.on, "the zone lights up");
    tap(s);
    assert.deepEqual(s.asked, { keys: false });
    const lines = clearFrame(s).marks.filter((m) => m.kind === "line");
    assert.equal(lines.length, 2, "a tick over the pony");
});

test("a tap past the ringed print leaps at once: on the first levels it still clears, later it may knock", () => {
    for (const phase of [0, 1]) {
        const s = startClear(clearCourse(phase, 0), phase);
        steps(s, 10);
        tap(s);
        assert.equal(s.flight === null, true);
        const a = s.approach;
        assert.ok(a);
        // the first tap hands the pony its stride; ride to just past the ringed print with no tap kept
        s.asked = null;
        while (s.fall < a.at - 1e-6) clearGame.step(s, emptyPad());
        steps(s, 3);
        tap(s);
        assert.ok(s.flight, `level ${phase}: it leaps at once`);
        assert.ok(s.flight.from > a.at, "from where it is, past the ringed print");
        for (let i = 0; i < 60 * 5 && !s.judging.length && s.fence === 0; i++)
            clearGame.step(s, emptyPad());
        steps(s, 60);
        assert.equal(s.faults, 0, `level ${phase}: a late tap still clears`);
        assert.equal(s.stops, 0);
    }
    const s = startClear(clearCourse(3, 0), 3);
    steps(s, 10);
    tap(s);
    const a = s.approach;
    assert.ok(a);
    s.asked = null;
    while (s.fall < a.at - 1e-6) clearGame.step(s, emptyPad());
    tap(s);
    assert.ok(s.flight, "later levels leap too, and a short leap costs a knock");
    assert.ok(!s.flight.soft);
});

test("a pony not asked to leap stops at the fence, circles and comes again, at no cost", () => {
    const s = startClear(clearCourse(1, 0), 1);
    let stopped = false,
        back = false;
    for (let i = 0; i < 60 * 8; i++) {
        clearGame.step(s, emptyPad());
        stopped ||= s.turn?.stage === "stop";
        back ||= s.turn?.stage === "back" && s.pony.facing === -1;
    }
    assert.ok(stopped && back);
    assert.ok(s.stops >= 1);
    assert.equal(s.faults, 0, "a stop is not a knock");
    assert.equal(s.fence, 0, "the fence is still ahead");
});

test("the keys as before: holding space gathers by degrees, letting go asks, a tap of it is a small hop, and a hand let go in the air asks nothing", () => {
    const s = startClear(clearCourse(0, 0), 0);
    steps(s, Math.round((GATHER * RATE) / 2), space);
    assert.ok(Math.abs(s.power - 0.5) < 0.02);
    clearGame.step(s, emptyPad());
    assert.ok(s.asked?.keys && Math.abs(s.asked.power - 0.5) < 0.02);
    const t = startClear(clearCourse(0, 0), 0);
    clearGame.step(t, space());
    clearGame.step(t, emptyPad());
    assert.deepEqual(t.asked, { keys: true, power: LEAST });
    // the ask waits for the next hoof fall, and the leap goes from it whatever it carries
    const next = t.fall + t.stride;
    for (let i = 0; i < 60 && !t.flight; i++) clearGame.step(t, emptyPad());
    assert.ok(t.flight);
    assert.equal(t.flight.from, next);
    steps(t, 5, space);
    clearGame.step(t, emptyPad());
    assert.equal(t.asked, null, "a gather let go in the air is lost");
});

test("the stride keys choose the next stride, which starts at the next hoof fall", () => {
    const s = startClear(clearCourse(1, 0), 1);
    const press = (d: "left" | "right") => clearGame.step(s, { ...emptyPad(), pressed: [d] });
    press("right");
    assert.equal(s.want, 4);
    assert.equal(s.stride, 3, "the stride in hand runs on to its hoof fall");
    press("right");
    assert.equal(s.want, 4, "there is no stride past the longest");
    const fall = s.fall;
    while (s.fall === fall) clearGame.step(s, emptyPad());
    assert.equal(s.stride, 4);
    press("left");
    press("left");
    press("left");
    assert.equal(s.want, 2);
    assert.match(clearGame.say(s), /^Stride 2\./);
});

test("with the keys, a leap with too little gather knocks a pole out of its cups, and the fence comes round again", () => {
    const plan = planFor(1, 0).map((f, i, all) =>
        f.hold !== undefined && all.findIndex((g) => g.hold !== undefined) === i
            ? { ...f, hold: 9 }
            : f,
    );
    const s = startClear(clearCourse(1, 0), 1);
    let fell = false,
        round = false;
    for (let i = 0; i < 60 * 30 && !round; i++) {
        clearGame.step(s, skilful(s, plan));
        fell ||= s.rails.some((r) => r.down && s.world.where(r.body).y > r.rest.y + 0.3);
        round = fell && s.turn !== null;
    }
    assert.ok(fell, "a pole fell out of its cups");
    assert.ok(round, "the pony goes round to jump it again");
    assert.ok(s.faults >= 1, "the knock is counted");
});

test("with the keys, a leap short of the water puts a hoof in it", () => {
    const plan = planFor(3, 0);
    const water = plan.filter((f) => f.hold !== undefined)[1];
    assert.ok(water);
    const short = plan.map((f) => (f === water ? { ...f, hold: 18 } : f));
    const s = startClear(clearCourse(3, 0), 3);
    let splashed = false;
    for (let i = 0; i < 60 * 30 && !splashed; i++)
        splashed = clearGame
            .step(s, skilful(s, short))
            .some((h) => "cue" in h && h.cue === "splash");
    assert.ok(splashed);
    assert.ok(s.faults >= 1);
});

test("random tapping rarely jumps a whole round in the time a steady rider takes", () => {
    for (let phase = 0; phase < CLEAR_LEVELS.length; phase++) {
        const c = clearCourse(phase, 0),
            ref = startClear(c, phase);
        let t = 0;
        for (; t < 60 * 120 && !ref.done; t++) clearGame.step(ref, steady(ref));
        let wins = 0;
        for (let seed = 1; seed <= 20; seed++) {
            const rnd = seeded(seed * 7 + phase),
                s = startClear(c, phase);
            let down = false;
            for (let i = 0; i < t * 1.25 && !s.done; i++) {
                if (down) down = rnd() < 0.9;
                else if (rnd() < 1.5 / RATE) down = true;
                clearGame.step(s, { ...emptyPad(), go: down, keys: rnd() < 0.5 });
            }
            if (clearGame.won(s)) wins++;
        }
        assert.ok(wins <= 4, `level ${phase} is jumped by ${wins} of 20 random tappers`);
    }
});

test("the band is where some gather carries the fence, and water needs a long stride", () => {
    const upright = { kind: "upright" as const, at: 30, height: 2, spread: 0 };
    for (const stride of [3, 4]) {
        const band = takeoffBand(upright, stride);
        assert.ok(band);
        for (let x = band.from; x <= band.to + 1e-9; x += 0.25) {
            const power = gatherFor(upright, x, stride);
            assert.ok(power !== null && carries(upright, leapOf(x, stride, power)));
        }
        assert.equal(gatherFor(upright, band.from - 0.6, stride), null);
    }
    assert.ok(leapOf(0, 4, 1).vy < leapOf(0, 3, 1).vy);
    const water = { kind: "water" as const, at: 30, height: 0, spread: 5 };
    assert.equal(takeoffBand(water, 3), null);
    assert.ok(takeoffBand(water, 4));
});

test("the frame names only shelf drawings, rings at most the take-off print, draws the helps its level has, and stands still at rest", () => {
    for (let phase = 0; phase < CLEAR_LEVELS.length; phase++) {
        const s = startClear(clearCourse(phase, 0), phase);
        steps(s, 20);
        const f = clearFrame(s);
        for (const sp of f.sprites)
            assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
        const words = f.marks.flatMap((m) => (m.kind === "word" ? [m.text] : []));
        const helps = CLEAR_LEVELS[phase]?.helps;
        assert.ok(helps);
        assert.equal(words.includes("take off"), helps.band);
        assert.ok(f.marks.filter((m) => m.kind === "ring" && m.solid).length <= 1);
        assert.equal(JSON.stringify(clearFrame(s, true)), JSON.stringify(clearFrame(s, true)));
        for (const L of CLEAR_LEVELS) assert.doesNotMatch(`${L.title} ${L.goal}`, /[—!]/);
    }
    assert.ok(startClear(clearCourse(0, 0)).pony.y === GROUND);
    assert.doesNotMatch(clearGame.hint, /—/);
});

test("reduced motion rides a stride a press, and a press on the screen is a tap", () => {
    const s = startClear(clearCourse(0, 0), 0);
    assert.equal(clearGame.still.press(s), Math.round(BEAT * RATE));
    s.flight = { ...leapOf(s.fall, 3, 0.5), k: 0, fence: 0 };
    assert.equal(clearGame.still.settling?.(s), true);
    const t = startClear(clearCourse(0, 0), 0);
    for (let press = 0; press < 60 && !t.done; press++) {
        steps(t, 1, screen);
        steps(t, clearGame.still.press(t) - 1);
        for (let i = 0; i < 60 * 5 && clearGame.still.settling?.(t); i++) steps(t, 1);
    }
    assert.ok(t.done, "pressing on, a stride a press, rides the round");
});

test("a stored course is read back only when it is the course its seed lays out", () => {
    for (const { phase, variant } of LAYOUTS) {
        const c = clearChallenge(variant, phase);
        assert.ok(isClearConfiguration(JSON.parse(JSON.stringify(c)), phase));
    }
    const c = clearChallenge(1, 2);
    assert.equal(isClearConfiguration({ ...c, variant: 5 }), false);
    assert.equal(isClearConfiguration({ ...c, course: { ...c.course, start: 3 } }), false);
});
