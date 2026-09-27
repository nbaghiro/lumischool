import { test } from "node:test";
import assert from "node:assert/strict";
import { eventsOf, progress } from "../../../engine/motion/goals";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { replay, tape } from "../../../engine/motion/tape";
import {
    bandOf,
    BEAT,
    carries,
    clearCourse,
    clearFrame,
    clearGame,
    CLEAR_LEVELS,
    GATHER,
    GROUND,
    leapOf,
    LEAST,
    RATE,
    startClear,
    type ClearState,
} from "../clear";
import { clearChallenge, isClearConfiguration, ridePlan, type Fall } from "../clear-challenges";
import { ride, riding } from "./clear-rider";
import { SHELF_IDS } from "./shelf";

const LAYOUTS = CLEAR_LEVELS.flatMap((_, phase) =>
    [0, 1, 2].map((variant) => ({ phase, variant })),
);

function planFor(phase: number, variant: number): Fall[] {
    const plan = ridePlan(clearCourse(phase, variant));
    assert.ok(plan, `level ${phase} layout ${variant} has a clear ride`);
    return plan;
}

const steps = (s: ClearState, n: number, pad: () => Pad = emptyPad) => {
    for (let i = 0; i < n; i++) clearGame.step(s, pad());
};

test("every layout of every level is ridden clean through the game by the ride its planner found", () => {
    for (const { phase, variant } of LAYOUTS) {
        const s = startClear(clearCourse(phase, variant), phase);
        assert.ok(ride(s, planFor(phase, variant)), `level ${phase} layout ${variant}`);
        assert.equal(s.faults, 0);
        assert.equal(s.stops, 0, "a ride to the plan is never refused");
        assert.deepEqual(progress(s.goal), {
            done: true,
            completed: s.course.fences.length,
            total: s.course.fences.length,
        });
    }
});

test("past the first level the stride is a question: some layout of each cannot be ridden at one stride", () => {
    for (let phase = 1; phase < CLEAR_LEVELS.length; phase++) {
        const held = [0, 1, 2].map((variant) => {
            const c = clearCourse(phase, variant);
            return c.strides.filter((L) => ridePlan({ ...c, strides: [L], stride: L }) !== null);
        });
        assert.ok(
            held.some((ok) => ok.length === 0),
            `level ${phase} rides at one stride in every layout: ${JSON.stringify(held)}`,
        );
    }
});

test("a round replays from its tape, and a checkpoint follows every clean fence", () => {
    const phase = 2,
        variant = 1,
        s = startClear(clearCourse(phase, variant), phase),
        t = tape();
    assert.ok(ride(s, planFor(phase, variant), t));
    const again = replay(
        { start: () => startClear(clearCourse(phase, variant), phase), step: clearGame.step },
        t,
    );
    assert.equal(again.steps, s.steps);
    assert.equal(again.pony.x, s.pony.x);
    assert.equal(clearGame.won(again), true);
    const fresh = startClear(clearCourse(phase, variant), phase),
        plan = planFor(phase, variant);
    const seen: string[] = [];
    for (let i = 0; i < t.steps && !fresh.done; i++)
        for (const e of eventsOf(clearGame.step(fresh, riding(fresh, plan))))
            seen.push(`${e.kind}${e.value ?? ""}`);
    assert.deepEqual(
        seen,
        fresh.course.fences.flatMap((_, i) => [`clear${i}`, "checkpoint"]),
    );
});

test("a leap with too little gather knocks a pole out of its cups, and the round is not clear", () => {
    const plan = planFor(1, 0).map((f, i, all) =>
        f.hold !== undefined && all.findIndex((g) => g.hold !== undefined) === i
            ? { ...f, hold: 9 }
            : f,
    );
    const s = startClear(clearCourse(1, 0), 1);
    ride(s, plan);
    const down = s.rails.filter((r) => r.down);
    assert.ok(down.length >= 1, "a pole fell");
    for (const r of down)
        assert.ok(s.world.where(r.body).y > r.rest.y + 0.3, "it fell out of its cups");
    assert.ok(s.faults >= 1);
    assert.equal(clearGame.won(s), false);
    assert.ok(progress(s.goal).completed < s.course.fences.length);
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
    assert.equal(s.faults, 0, "a stop is not a fault");
    assert.equal(s.fence, 0, "the fence is still ahead");
    assert.ok(s.rails.every((r) => !r.down));
});

test("a leap short of the water puts a hoof in it", () => {
    const plan = planFor(3, 0);
    const water = plan.filter((f) => f.hold !== undefined)[1];
    assert.ok(water);
    const short = plan.map((f) => (f === water ? { ...f, hold: 18 } : f));
    const s = startClear(clearCourse(3, 0), 3);
    let splashed = false;
    for (let i = 0; i < 60 * 60 && !s.done; i++)
        splashed ||= clearGame
            .step(s, riding(s, short))
            .some((h) => "cue" in h && h.cue === "splash");
    assert.ok(splashed);
    assert.ok(s.faults >= 1);
    assert.equal(clearGame.won(s), false);
});

test("the stride keys choose the next stride, which starts at the next hoof fall", () => {
    const s = startClear(clearCourse(1, 0), 1);
    const press = (d: "left" | "right") => {
        const pad = emptyPad();
        pad.pressed.push(d);
        clearGame.step(s, pad);
    };
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

test("holding gathers by degrees, letting go asks, a tap is a small hop, and a hand let go in the air asks nothing", () => {
    const s = startClear(clearCourse(0, 0), 0);
    const held = () => {
        const pad = emptyPad();
        pad.go = true;
        return pad;
    };
    steps(s, Math.round((GATHER * RATE) / 2), held);
    assert.ok(Math.abs(s.power - 0.5) < 0.02);
    clearGame.step(s, emptyPad());
    assert.ok(s.asked !== null && Math.abs(s.asked - 0.5) < 0.02);
    const t = startClear(clearCourse(0, 0), 0);
    clearGame.step(t, held());
    clearGame.step(t, emptyPad());
    assert.equal(t.asked, LEAST);
    // the ask waits for the next hoof fall, and the leap goes from it
    const next = t.fall + t.stride;
    for (let i = 0; i < 60 && !t.flight; i++) clearGame.step(t, emptyPad());
    assert.ok(t.flight);
    assert.equal(t.flight.from, next);
    const before = t.asked;
    steps(t, 5, held);
    clearGame.step(t, emptyPad());
    assert.equal(before, null);
    assert.equal(t.asked, null, "a gather let go in the air is lost");
});

test("the band is where a leap carries the fence, and a longer stride jumps flatter", () => {
    const upright = { kind: "upright" as const, at: 30, height: 2, spread: 0 };
    for (const stride of [3, 4])
        for (const power of [0.67, 1]) {
            const band = bandOf(upright, stride, power);
            assert.ok(band, `stride ${stride}, gather ${power}`);
            for (let x = band.from; x <= band.to + 1e-9; x += 0.25)
                assert.ok(carries(upright, leapOf(x, stride, power)));
            assert.equal(carries(upright, leapOf(band.from - 0.6, stride, power)), false);
        }
    assert.ok(leapOf(0, 4, 1).vy < leapOf(0, 3, 1).vy);
    assert.equal(bandOf({ kind: "water", at: 30, height: 0, spread: 5 }, 3, 1), null);
    assert.ok(bandOf({ kind: "water", at: 30, height: 0, spread: 5 }, 4, 1));
});

test("the frame names only shelf drawings, draws the helps its level has, and stands still at rest", () => {
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
        assert.equal(
            f.marks.some((m) => m.kind === "dots"),
            helps.arc === "always",
        );
        assert.equal(f.marks.filter((m) => m.kind === "ring").length <= helps.ahead, true);
        assert.equal(JSON.stringify(clearFrame(s, true)), JSON.stringify(clearFrame(s, true)));
        for (const L of CLEAR_LEVELS) assert.doesNotMatch(`${L.title} ${L.goal}`, /[—!]/);
    }
    assert.ok(startClear(clearCourse(0, 0)).pony.y === GROUND);
    assert.doesNotMatch(clearGame.hint, /—/);
});

test("reduced motion rides a stride a press and settles every leap and stop", () => {
    const s = startClear(clearCourse(0, 0), 0);
    assert.equal(clearGame.still.press(s), Math.round(BEAT * RATE));
    s.flight = { ...leapOf(s.fall, 3, 0.5), k: 0, fence: 0 };
    assert.equal(clearGame.still.settling?.(s), true);
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
