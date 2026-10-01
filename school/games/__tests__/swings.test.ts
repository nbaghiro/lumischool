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
    padsOf,
    play,
    swingsChallenge,
    swingsLayouts,
    swingsLevel,
    type Move,
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

function planFor(L: SwingsLevel): Move[] {
    const plan = crossing(L);
    assert.ok(plan, `${L.title} has a crossing`);
    return plan;
}

const held = (): Pad => ({ ...emptyPad(), go: true });
const tap = (): Pad => ({ ...emptyPad(), go: true, tapped: true });
const left = (): Pad => ({ ...emptyPad(), pressed: ["left"] });

function steps(s: SwingsState, n: number, pad: () => Pad = emptyPad): string[] {
    const seen: string[] = [];
    for (let i = 0; i < n; i++)
        for (const e of eventsOf(stepSwings(s, pad()))) seen.push(`${e.kind}${e.value ?? ""}`);
    return seen;
}

/** Pulled back `k` presses of the left arrow, and Go pressed and let up to start the swing. */
function pullAndSwing(s: SwingsState, k: number): void {
    for (let i = 0; i < k; i++) steps(s, 1, left);
    steps(s, 1, tap);
    steps(s, 1);
}

const reachOf = (s: SwingsState): number => {
    const r = s.ropes[s.held];
    assert.ok(r);
    return amplitudeOf(r, SWINGS.gravity.value);
};

test("every level's goal says what it asks for, and every layout is crossed by the moves found for it", () => {
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

test("the pull sets how high she swings, the swing keeps going, and one tap lets her go", () => {
    const pulled = (k: number) => {
        const s = startSwings(level(0), 0);
        pullAndSwing(s, k);
        assert.equal(s.mode, "swing");
        return reachOf(s);
    };
    assert.ok(pulled(6) > pulled(2) + 0.2);
    assert.ok(pulled(2) > pulled(0));
    // a finger pulls her to where it is held, round the rope's branch, no higher than the highest swing
    const s = startSwings(level(0), 0),
        r = s.ropes[s.held];
    assert.ok(r);
    const at = (angle: number) => ({
        x: r.ax - 5 * Math.sin(angle),
        y: r.ay + 5 * Math.cos(angle),
    });
    steps(s, 1, () => ({ ...emptyPad(), touch: at(0.9) }));
    assert.equal(s.mode, "pull");
    assert.ok(Math.abs(s.pulled - 0.9) < 1e-9);
    steps(s, 1, () => ({ ...emptyPad(), touch: at(2) }));
    assert.equal(s.pulled, SWINGS.most.value);
    steps(s, 1);
    assert.equal(s.mode, "swing", "lifting the finger starts the swing");
    const start = reachOf(s);
    steps(s, RATE * 6);
    assert.equal(s.mode, "swing", "left alone she swings on");
    assert.ok(reachOf(s) > start * 0.9, "and hardly loses height");
    steps(s, 1, tap);
    assert.equal(s.mode, "fly", "a tap lets her go");
    // holding Go at the bank winds the pull further the longer it is held
    const wound = (n: number) => {
        const w = startSwings(level(0), 0);
        steps(w, n, held);
        assert.equal(w.mode, "pull");
        return w.pulled;
    };
    assert.ok(wound(40) > wound(10));
});

test("the button's word follows what a press will do", () => {
    const s = startSwings(level(0), 0),
        word = () => swingsGame.goLabel?.(s);
    assert.equal(word(), "Pull");
    pullAndSwing(s, 3);
    assert.equal(word(), "Let go");
    steps(s, 30);
    steps(s, 1, tap);
    assert.equal(word(), "Catch");
    const sway = startSwings(level(7), 7);
    assert.equal(swingsGame.goLabel?.(sway), "Reach");
});

test("a stone the level does not ask for wobbles and tips her in, and she is back where she last stood", () => {
    const L = level(1);
    for (let k = 0; k <= 10; k++)
        for (let wait = 0; wait < 200; wait += 3) {
            const s = startSwings(L, 1);
            pullAndSwing(s, k);
            steps(s, wait);
            if ((s.ropes[s.held]?.omega ?? 0) <= 0) continue;
            steps(s, 1, tap);
            const seen = steps(s, RATE);
            if (!s.said.startsWith("That stone is 2")) continue;
            assert.deepEqual(seen, []);
            steps(s, RATE * 2);
            assert.equal(s.mode, "ready");
            assert.equal(s.on, 0, "back on the near bank");
            assert.equal(progress(s.goal).completed, 0);
            return;
        }
    assert.fail("no let go lands on the stone at 2");
});

test("a landing past a stone's edge still counts, and she steps back to its middle", () => {
    const L = level(1),
        s = startSwings(L, 1);
    const stone = s.footings.find((f) => f.kind === "stone" && f.n === 4);
    assert.ok(stone);
    s.mode = "fly";
    s.held = -1;
    s.lean = 0;
    s.flight = { x: stone.x1 + 0.25, y: stone.top - 2.38 - 0.05, vx: 0, vy: 4 };
    steps(s, 3);
    assert.equal(s.mode, "land");
    steps(s, Math.round(RATE * 0.3));
    assert.ok(Math.abs(s.x - (stone.x0 + stone.x1) / 2) < 0.1, `she stands at ${s.x}`);
});

test("a rope is caught only by a tap in the air, the nearest in reach, and a rope the level does not ask for slips", () => {
    const L = level(3);
    const plan = planFor(L);
    // the moves up to and including the let go, and the reach that follows it
    const letGo = plan.findIndex((m, i) => m.key === "go" && i > 0 && plan[i - 1]?.key === "go");
    const upTo = plan.slice(0, letGo + 1),
        reach = plan[letGo + 1];
    assert.ok(reach && reach.key === "go");
    // let go as the crossing does, but never tap in the air: she flies on and falls in
    const s = play(startSwings(L, 3), upTo);
    assert.equal(progress(s.goal).completed, 0);
    assert.notEqual(s.mode, "swing");
    // with the level asking for the rope at 10, the rope at 5 is loosely tied and slips out of her hands
    const loose = play(startSwings({ ...L, wants: [{ rope: 10 }] }, 3), [...upTo, reach]);
    assert.ok(loose.mode === "wobble" || loose.mode === "splash" || loose.mode === "ready");
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

test("pulled back she shows how high she will swing, and swinging she shows where she would land", () => {
    const s = startSwings(level(1), 1);
    steps(s, 1, left);
    steps(s, 1, left);
    const pulled = swingsFrame(s);
    assert.ok(pulled.marks.some((m) => m.kind === "dots" && m.faint));
    steps(s, 1, tap);
    steps(s, 20);
    const swinging = swingsFrame(s);
    assert.ok(swinging.marks.some((m) => m.kind === "dots" && !m.faint));
    assert.ok(swinging.marks.some((m) => m.kind === "ring" && m.r === 0.6));
    const late = startSwings(level(7), 7);
    assert.ok(!swingsFrame(late).marks.some((m) => m.kind === "dots"));
});

test("under reduced motion a press winds the pull at the bank, and the swing waits halfway up going forward for a tap", () => {
    const s = startSwings(level(0), 0);
    assert.ok(swingsGame.still.press(s) >= RATE / 2);
    steps(s, 30, held);
    steps(s, 1);
    assert.equal(s.mode, "swing");
    assert.equal(swingsGame.still.press(s), 1);
    let n = 0;
    while (swingsGame.still.settling?.(s) && n < RATE * 10) {
        steps(s, 1);
        n++;
    }
    assert.equal(s.mode, "swing");
    assert.ok(s.rising, "it waits halfway up the swing going forward");
    steps(s, 1, tap);
    assert.equal(s.mode, "fly");
    assert.equal(swingsGame.still.settling?.(s), true);
    assert.equal(swingsGame.id, "bridge");
});
