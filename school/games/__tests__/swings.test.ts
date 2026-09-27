import { test } from "node:test";
import assert from "node:assert/strict";
import { eventsOf, progress } from "../../../engine/motion/goals";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { amplitudeOf } from "../../../engine/motion/swing";
import { recordStep, replay, tape } from "../../../engine/motion/tape";
import {
    goalText,
    RATE,
    startSwings,
    stepSwings,
    sumLine,
    SWINGS,
    SWINGS_LEVELS,
    swingsFrame,
    swingsGame,
    xOf,
    type SwingsLevel,
    type SwingsState,
} from "../swings";
import {
    crossing,
    isSwingsConfiguration,
    play,
    swingsChallenge,
    swingsLayouts,
    swingsLevel,
    type Hold,
} from "../swings-challenges";
import { SHELF_IDS } from "./shelf";

const LAYOUTS = SWINGS_LEVELS.flatMap((_, phase) =>
    Array.from({ length: swingsLayouts(phase) }, (_, variant) => ({
        phase,
        variant,
        L: swingsLevel(phase, variant),
    })),
);

function level(phase: number): SwingsLevel {
    const L = SWINGS_LEVELS[phase];
    assert.ok(L);
    return L;
}

function planFor(L: SwingsLevel): Hold[] {
    const plan = crossing(L);
    assert.ok(plan, `${L.title} has a crossing`);
    return plan;
}

const held = (): Pad => ({ ...emptyPad(), go: true });

function steps(s: SwingsState, n: number, pad: () => Pad = emptyPad): string[] {
    const seen: string[] = [];
    for (let i = 0; i < n; i++)
        for (const e of eventsOf(stepSwings(s, pad()))) seen.push(`${e.kind}${e.value ?? ""}`);
    return seen;
}

/** The pads a crossing's holds are, one a step, as a hand gives them. */
function* padsOf(holds: readonly Hold[]): Generator<Pad> {
    for (const h of holds) {
        for (let i = 0; i < h.idle; i++) yield emptyPad();
        for (let i = 0; i < h.hold; i++) yield held();
        yield emptyPad();
    }
}

test("every level's goal says what it asks for, and every layout is crossed by the holds found for it", () => {
    for (const L of SWINGS_LEVELS) assert.equal(L.goal, goalText(L));
    for (const { phase, L } of LAYOUTS) {
        assert.equal(L.goal, goalText(L));
        assert.ok(!/[—!]/.test(`${L.goal} ${L.prompt}`), L.title);
        const s = play(startSwings(L, phase), planFor(L));
        assert.ok(swingsGame.won(s), `${L.title}: ${swingsGame.say(s)}`);
        const o = swingsGame.objectives?.(s);
        assert.ok(o && o.completed === o.total);
    }
});

test("a crossing replays from its tape, with a checkpoint for each steady stone", () => {
    const L = swingsLevel(2, 0),
        s = startSwings(L, 2),
        t = tape();
    const seen: string[] = [];
    for (const pad of padsOf(planFor(L))) {
        recordStep(t, pad);
        for (const e of eventsOf(stepSwings(s, pad))) seen.push(`${e.kind}${e.value ?? ""}`);
    }
    for (let i = 0; i < RATE * 3 && !s.won; i++) {
        const pad = emptyPad();
        recordStep(t, pad);
        for (const e of eventsOf(stepSwings(s, pad))) seen.push(`${e.kind}${e.value ?? ""}`);
    }
    assert.ok(s.won);
    const again = replay({ start: () => startSwings(L, 2), step: stepSwings }, t);
    assert.deepEqual(JSON.parse(JSON.stringify(again)), JSON.parse(JSON.stringify(s)));
    assert.deepEqual(
        seen.filter((e) => e !== "checkpoint"),
        ["land2", "land4", "land6", "land8", "arrive"],
    );
    assert.equal(seen.filter((e) => e === "checkpoint").length, 4);
});

test("holding pumps the swing higher by degrees, and a quick tap starts it without letting go", () => {
    const reach = (n: number) => {
        const s = startSwings(level(0), 0);
        steps(s, n, held);
        const r = s.ropes[s.held];
        assert.ok(r && s.mode === "swing");
        return amplitudeOf(r, SWINGS.gravity.value);
    };
    assert.ok(reach(60) > reach(20));
    assert.ok(reach(120) > reach(60));
    const s = startSwings(level(0), 0);
    steps(s, 5, held);
    steps(s, 30);
    assert.equal(s.mode, "swing", "a tap swings her off and she keeps hold");
    steps(s, 20, held);
    steps(s, 1);
    assert.equal(s.mode, "fly", "letting go after a hold lets go");
});

test("a stone the level does not ask for wobbles and tips her in, and she is back where she last stood", () => {
    const L = level(1);
    // the first hold that comes down on the stone at 2 rather than 4
    for (let hold = 22; hold < 320; hold += 5) {
        const s = startSwings(L, 1);
        steps(s, hold, held);
        steps(s, 1);
        const seen = steps(s, RATE * 2);
        if (!s.said.startsWith("That stone is 2")) continue;
        assert.deepEqual(seen, []);
        steps(s, RATE * 2);
        assert.equal(s.mode, "ready");
        assert.equal(s.on, 0, "back on the near bank");
        assert.equal(progress(s.goal).completed, 0);
        return;
    }
    assert.fail("no hold lands on the stone at 2");
});

test("a rope is caught only by a hand held out for it, and a rope the level does not ask for slips", () => {
    const L = level(3);
    const plan = planFor(L);
    const first = plan[0];
    assert.ok(first);
    // let go as the crossing does, but keep the hand off: she flies past the rope and falls in
    const s = startSwings(L, 3);
    steps(s, first.hold, held);
    steps(s, RATE * 2);
    assert.equal(progress(s.goal).completed, 0);
    // a rope at 7, loosely tied, slips out of her hands
    const loose = startSwings({ ...L, wants: [{ rope: 10 }] }, 3);
    steps(loose, first.hold, held);
    steps(loose, 1);
    for (let i = 0; i < 90 && loose.mode === "fly"; i++) steps(loose, 1, held);
    assert.equal(loose.mode, "wobble");
    assert.match(loose.said, /That rope hangs at 5/);
});

test("jumps add up as they are made, and the far bank reached in the wrong number of them starts again", () => {
    const L = level(7),
        s = startSwings(L, 7);
    s.landings = [0, 4, 8];
    assert.equal(sumLine(s), "4 + 4 = 8");
    s.landings = [0, 5, 4];
    assert.equal(sumLine(s), "5 - 1 = 4");
    // two stones and the bank is three jumps; the crossing found lands there in three
    const won = play(startSwings(L, 7), planFor(L));
    assert.ok(won.won);
    assert.equal(won.landings.length - 1, 3);
    assert.equal(won.landings[won.landings.length - 1], 12);
    // a crossing of two jumps to the bank is sent back to the start
    const short = startSwings({ ...L, jumps: 2 }, 7);
    play(short, planFor(L));
    assert.ok(!short.won);
});

test("every stone she can stand on has a rope ahead she can reach, so none is a dead end", () => {
    for (const { L } of LAYOUTS)
        for (const n of L.stones) {
            if (!L.jumps && !L.wants.some((w) => "stone" in w && w.stone === n)) continue;
            const s = startSwings(L, 0);
            s.x = xOf(L, n);
            s.y = s.footings.find((f) => f.kind === "stone" && f.n === n)?.top ?? 0;
            const h = { x: s.x, y: s.y - 2.38 };
            const ok = s.ropes.some(
                (r) => r.ax >= s.x - 0.3 && Math.hypot(h.x - r.ax, h.y - r.ay) <= r.long,
            );
            assert.ok(ok, `${L.title}: the stone at ${n} has no rope ahead`);
        }
});

test("random presses and let-goes rarely win a level that asks for anything", () => {
    for (const { phase, variant, L } of LAYOUTS) {
        if (!L.wants.length && !L.jumps) continue;
        let wins = 0,
            seed = phase * 31 + variant * 7 + 1;
        const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
        for (let t = 0; t < 20; t++) {
            const s = startSwings(L, phase),
                pad = emptyPad();
            let left = 0;
            for (let i = 0; i < RATE * 20 && !s.won; i++) {
                if (left <= 0) {
                    pad.go = !pad.go;
                    left = Math.floor(rnd() * 180) + 10;
                }
                left--;
                stepSwings(s, pad);
            }
            if (s.won) wins++;
        }
        assert.ok(wins <= 4, `${L.title} layout ${variant}: ${wins} of 20 random tries won`);
    }
});

test("the frame draws the shelf's drawings, ground and water to every edge, and stands still at rest", () => {
    for (const { phase, L } of LAYOUTS) {
        const s = startSwings(L, phase);
        steps(s, 40, held);
        const f = swingsFrame(s);
        for (const sp of f.sprites)
            assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
        const banks = f.sprites.filter((sp) => sp.art === "streambank");
        const reach = (sp: (typeof banks)[number]) => ({
            x0: sp.x - (sp.size ?? 0) / 2,
            x1: sp.x + (sp.size ?? 0) / 2,
            y1: sp.y + Number(sp.params?.h) / 2,
        });
        assert.ok(banks.some((b) => reach(b).x0 <= 0));
        assert.ok(banks.some((b) => reach(b).x1 >= f.world.w - 0.01));
        for (const b of banks)
            assert.ok(reach(b).y1 >= f.world.h, `${L.title}: a bank stops short of the bottom`);
        const water = f.water?.[0];
        assert.ok(water && water.x <= xOf(L, 0) && water.x + water.w >= xOf(L, L.far));
        const rest = swingsFrame(s, true);
        assert.equal(rest.time, 0);
        assert.deepEqual(rest.water?.[0]?.ripples, []);
        assert.ok(!rest.marks.some((m) => m.kind === "dots"));
    }
});

test("a stored layout opens as it was made, and an edited one does not", () => {
    const c = JSON.parse(JSON.stringify(swingsChallenge(4, 3))) as unknown;
    assert.ok(isSwingsConfiguration(c));
    const made = swingsChallenge(4, 3);
    assert.ok(!isSwingsConfiguration({ ...made, level: { ...made.level, far: 3 } }));
    assert.throws(() => swingsChallenge(0, 99));
});

test("under reduced motion a press is worth a swing, and a flight settles before it is drawn", () => {
    const s = startSwings(level(0), 0);
    assert.ok(swingsGame.still.press(s) >= RATE / 2);
    steps(s, 60, held);
    steps(s, 1);
    assert.equal(swingsGame.still.settling?.(s), true);
    assert.equal(swingsGame.id, "bridge");
});
