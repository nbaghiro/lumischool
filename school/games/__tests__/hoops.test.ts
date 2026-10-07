// Hoops in the yard: every variation of every level is won by baskets the solver found, by the keys
// and by a finger, and those pads replay to the same yard; every throw starts from the same soft aim
// and the spots move after a basket, so one throw found does not keep going in; a basket that would go
// past the target, or that missed the board where only bank shots count, does not count; a world tour
// moves on after a basket and stays after a miss; the shots or the clock running out ends the round
// not won; Pip's shots are the same for a seed; free play keeps its best run; play at random rarely
// wins; the state is plain data; and only shelf drawings are drawn. A missed throw's flight stays on
// the paper until the spot moves and its note says which way it missed; the gauge's green band holds
// powers that go in; and the aim's arrow grows with the power.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import type { Pt } from "../../../engine/motion/geometry";
import { emptyPad, type Dir, type Pad } from "../../../engine/motion/pad";
import { faults } from "../../../engine/motion/tune";
import { endOf } from "../game";
import {
    HOOP_LEVELS,
    HOOPS,
    READY,
    SHOT,
    arrowLength,
    countsAs,
    flightOf,
    handOf,
    hoopsGame,
    startHoops,
    sweetBand,
    type Flight,
    type HoopState,
} from "../hoops";
import { HOOP_VARIANTS, hoopWay, openHoopConfiguration, waysToMake } from "../hoops-challenges";

const level = (i: number) => {
    const L = HOOP_LEVELS[i];
    if (!L) throw new Error(`no level ${i}`);
    return L;
};
const phaseOf = (title: string) => {
    const i = HOOP_LEVELS.findIndex((L) => L.title === title);
    if (i < 0) throw new Error(`no level ${title}`);
    return i;
};

/** Every level with a score to make, which is every level but the shoot-around. */
const TARGETS = HOOP_LEVELS.map((_, i) => i).filter((i) => level(i).ask.kind !== "free");

const play = (s: HoopState, pads: readonly Pad[]) => {
    for (const p of pads)
        hoopsGame.step(s, { ...p, holding: [...p.holding], pressed: [...p.pressed] });
    for (let i = 0; i < 60 * 20 && !hoopsGame.won(s) && hoopsGame.still.settling?.(s); i++)
        hoopsGame.step(s, emptyPad());
};

/** Waits until it is the child's throw again, or the round is over. */
const settle = (s: HoopState) => {
    for (let i = 0; i < 60 * 40 && hoopsGame.still.settling?.(s); i++)
        hoopsGame.step(s, emptyPad());
};

/** Lets the ball go with the keys at the aim as it stands, and waits for it to come back. */
const shootNow = (s: HoopState) => {
    hoopsGame.step(s, { ...emptyPad(), go: true, tapped: true });
    settle(s);
};

/** The surest throw from where the shooter stands now that flies as `ok` says, by its angle and power. */
function throwWhere(s: HoopState, ok: (f: Flight) => boolean): { angle: number; power: number } {
    const from = handOf(s);
    let best: { angle: number; power: number; width: number } | null = null;
    for (let angle = SHOT.lo; angle <= -0.55; angle += 0.05) {
        let start: number | null = null;
        for (let power = SHOT.min; power <= SHOT.max + 0.2; power += 0.2) {
            const v = { x: Math.cos(angle) * power, y: Math.sin(angle) * power };
            const good = power <= SHOT.max && ok(flightOf(s.L, from, v, s.steps + 1, s.wind));
            if (good && start === null) start = power;
            if (!good && start !== null) {
                if (!best || power - start > best.width)
                    best = { angle, power: (start + power - 0.2) / 2, width: power - start };
                start = null;
            }
        }
    }
    if (!best) throw new Error("no such throw");
    return best;
}

/** The held arrows that turn the aim from the fresh one to `to`, then space. */
function keysFor(to: { angle: number; power: number }): Pad[] {
    const pads: Pad[] = [];
    const held = (d: Dir): Pad => ({ ...emptyPad(), holding: [d], held: d });
    const steps = (to.angle - READY.angle) / (SHOT.turn / 60),
        turns = to.angle <= SHOT.lo + 1e-9 ? Math.floor(steps) - 1 : Math.round(steps),
        ramps = Math.round((to.power - READY.power) / (SHOT.ramp / 60));
    for (let i = 0; i < Math.abs(turns); i++) pads.push(held(turns < 0 ? "up" : "down"));
    for (let i = 0; i < Math.abs(ramps); i++) pads.push(held(ramps < 0 ? "left" : "right"));
    pads.push({ ...emptyPad(), go: true, tapped: true });
    return pads;
}

test("every variation of every level is won by the keys and by a finger, and the same pads replay to the same yard", () => {
    for (const phase of TARGETS)
        for (let variant = 0; variant < HOOP_VARIANTS; variant++)
            for (const hands of ["keys", "touch"] as const) {
                const c = { phase, variant };
                const way = hoopWay(c, hands);
                assert.ok(way, `${phase}/${variant} by ${hands}: no way found`);
                const a = openHoopConfiguration(c),
                    b = openHoopConfiguration(c);
                play(a, way);
                play(b, way);
                assert.ok(hoopsGame.won(a), `${phase}/${variant} by ${hands}: not won`);
                assert.equal(JSON.stringify(a), JSON.stringify(b));
            }
});

test("every throw starts from the same soft aim, and the same keys again after a basket mostly miss", () => {
    for (const phase of HOOP_LEVELS.map((_, i) => i)) {
        let repeats = 0,
            scored = 0;
        for (let seed = 1; seed <= 10; seed++) {
            const s = startHoops(level(phase), phase, seed);
            settle(s);
            const keys = keysFor(throwWhere(s, (f) => f.scored));
            for (let k = 0; k < 4 && !endOf(hoopsGame, s); k++) {
                const before = s.makes;
                play(s, keys);
                settle(s);
                if (!endOf(hoopsGame, s))
                    assert.deepEqual(s.aim, READY, "the aim was not set back after a throw");
                if (k > 0) {
                    repeats++;
                    if (s.makes > before) scored++;
                }
            }
        }
        // the first level may forgive a repeat now and then; from the second on, about three in ten
        assert.ok(
            scored <= repeats * (phase === 0 ? 0.5 : 0.34),
            `level ${phase}: the same keys scored ${scored} of ${repeats} repeats`,
        );
    }
});

test("after a basket the spot is chalked again somewhere else, and after a miss it stays", () => {
    const s = startHoops(level(1));
    const at = s.place;
    shootNow(s);
    assert.equal(s.makes, 0);
    assert.deepEqual(s.place, at, "a miss moved the spot");
    play(s, keysFor(throwWhere(s, (f) => f.scored)));
    settle(s);
    assert.equal(s.makes, 1);
    assert.notDeepEqual(s.place, at, "a basket left the spot where it was");
    assert.equal(s.at, s.place.x);
});

test("a basket that would go past the target does not count, and the note says why", () => {
    const s = startHoops(level(0));
    // two baskets from the 2 spot: the first makes 2, the second would make 4
    hoopsGame.command?.(s, "spot");
    settle(s);
    for (let k = 0; k < 2; k++) {
        play(s, keysFor(throwWhere(s, (f) => f.scored)));
        settle(s);
    }
    assert.deepEqual(s.made, [2]);
    assert.match(s.note, /past 3, so it does not count/);
    assert.equal(s.mode, "aim");
});

test("off the board only a bank shot counts, and the note says so", () => {
    const s = startHoops(level(phaseOf("Off the board")));
    play(s, keysFor(throwWhere(s, (f) => f.scored && !f.banked)));
    settle(s);
    assert.deepEqual(s.made, []);
    assert.match(s.note, /not off the board/);
    play(s, keysFor(throwWhere(s, (f) => f.banked)));
    settle(s);
    assert.deepEqual(s.made, [1]);
});

test("two hoops: the low one is worth 2 and the high one 3", () => {
    const s = startHoops(level(phaseOf("Two hoops")));
    play(s, keysFor(throwWhere(s, (f) => f.hoop === 1)));
    settle(s);
    play(s, keysFor(throwWhere(s, (f) => f.hoop === 0)));
    settle(s);
    assert.deepEqual(s.made, [2, 3]);
});

test("around the world moves on after a basket and stays after a miss", () => {
    const s = startHoops(level(phaseOf("Around the world")));
    shootNow(s);
    assert.equal(s.spot, 0);
    play(s, keysFor(throwWhere(s, (f) => f.scored)));
    settle(s);
    assert.equal(s.spot, 1);
    assert.deepEqual(s.made, [1]);
    assert.equal(hoopsGame.shows?.(s, "spot"), false, "the walk round can be skipped");
});

test("a round whose shots run out without the score ends not won, kindly, and stays ended", () => {
    const s = startHoops(level(1));
    for (let k = 0; k < level(1).shots; k++) shootNow(s);
    const end = endOf(hoopsGame, s);
    assert.ok(end);
    assert.equal(end.won, false);
    assert.match(end.words, /Out of balls this time/);
    for (let i = 0; i < 120; i++) hoopsGame.step(s, { ...emptyPad(), go: true, tapped: true });
    assert.deepEqual(endOf(hoopsGame, s), end);
    assert.equal(hoopsGame.still.settling?.(s), false);
});

test("the clock starts with the first throw, and running out of time ends the round not won", () => {
    const L = level(phaseOf("Beat the clock"));
    const s = startHoops(L);
    for (let i = 0; i < 60 * 5; i++) hoopsGame.step(s, emptyPad());
    assert.equal(s.left, (L.clock ?? 0) * 60);
    shootNow(s);
    for (let i = 0; i < 60 * 40 && !endOf(hoopsGame, s); i++) hoopsGame.step(s, emptyPad());
    const end = endOf(hoopsGame, s);
    assert.ok(end);
    assert.equal(end.won, false);
    assert.match(end.words, /Time's up/);
});

test("Pip's shots land the same every time for a seed, and a copy missed is a letter", () => {
    const phase = phaseOf("Copy Pip");
    const run = (seed: number) => {
        const s = startHoops(level(phase), phase, seed);
        settle(s);
        return JSON.stringify([s.pup, s.place]);
    };
    assert.equal(run(3), run(3));
    assert.equal(run(1), run(1));
    const s = startHoops(level(phase));
    settle(s);
    assert.equal(s.turn, "child");
    assert.equal(s.at, s.pup.at.x, "Charlie is not where Pip shot from");
    shootNow(s);
    assert.equal(s.letters, 1);
    assert.match(s.note, /P/);
});

test("free play keeps its best run of baskets through the page's saving, and nothing else", () => {
    const free = HOOP_LEVELS.length - 1;
    assert.equal(hoopsGame.saves?.level, free);
    const s = hoopsGame.start(free, 1);
    s.best = 4;
    const kept = hoopsGame.checkpoint?.(s);
    const t = hoopsGame.start(free, 1);
    assert.equal(hoopsGame.restore?.(t, kept), true);
    assert.equal(t.best, 4);
    assert.equal(hoopsGame.restore?.(t, { best: "a lot" }), false);
    assert.equal(hoopsGame.ended?.(t) ?? null, null);
});

test("presses made at random rarely win a level", () => {
    for (const phase of TARGETS) {
        let wins = 0;
        const tries = 20;
        for (let t = 0; t < tries; t++) {
            let seed = (t + 1) * 9973 + phase;
            const rnd = () => {
                seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
                return seed / 4294967296;
            };
            const s = openHoopConfiguration({ phase, variant: 0 });
            const dirs: Dir[] = ["up", "down", "left", "right"];
            for (let i = 0; i < 60 * 90 && !endOf(hoopsGame, s); i++) {
                const p = emptyPad(),
                    r = rnd();
                if (r < 0.3) {
                    const d = dirs[Math.floor(rnd() * 4)] ?? "up";
                    p.holding = [d];
                    p.held = d;
                } else if (r < 0.31) {
                    p.tapped = true;
                    p.go = true;
                } else if (r < 0.315) p.brake = true;
                hoopsGame.step(s, p);
            }
            if (hoopsGame.won(s)) wins++;
        }
        assert.ok(
            wins <= tries * (phase === 0 ? 0.3 : 0.1),
            `level ${phase} won ${wins} of ${tries} at random`,
        );
    }
});

test("throws aimed anywhere at random, from spots chosen at random, rarely win past the first level", () => {
    let seed = 777;
    const rnd = () => {
        seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
        return seed / 4294967296;
    };
    for (const phase of TARGETS) {
        let wins = 0;
        const tries = 60;
        for (let t = 0; t < tries; t++) {
            const s = hoopsGame.start(phase, t + 1);
            for (let k = 0; k < 4000 && !endOf(hoopsGame, s); k++) {
                if (s.mode !== "aim" || s.turn !== "child") {
                    hoopsGame.step(s, emptyPad());
                    continue;
                }
                if (rnd() < 0.5) hoopsGame.command?.(s, "spot");
                while (hoopsGame.still.settling?.(s)) hoopsGame.step(s, emptyPad());
                s.aim = {
                    angle: SHOT.lo + rnd() * (SHOT.hi - SHOT.lo),
                    power: SHOT.min + rnd() * (SHOT.max - SHOT.min),
                    pulling: false,
                };
                hoopsGame.step(s, { ...emptyPad(), go: true, tapped: true });
            }
            if (hoopsGame.won(s)) wins++;
        }
        // the first level is meant to be easy: a 1 and a 2 from twelve balls
        assert.ok(
            wins <= tries * (phase === 0 ? 0.35 : 0.1),
            `level ${phase} won ${wins} of ${tries}`,
        );
    }
});

test("the state is plain data, the frame draws only shelf drawings, and the tuning is sound", () => {
    for (let phase = 0; phase < HOOP_LEVELS.length; phase++) {
        const s = hoopsGame.start(phase, 1);
        assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
        for (let i = 0; i < 200; i++)
            hoopsGame.step(s, i === 5 ? { ...emptyPad(), go: true, tapped: true } : emptyPad());
        assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
        for (const rest of [false, true])
            for (const sp of hoopsGame.frame(s, rest).sprites)
                assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
        const L = level(phase);
        assert.ok(!/[—!]/.test(`${L.goal} ${L.prompt}`), "a goal with a dash or an exclamation");
    }
    assert.deepEqual(faults(HOOPS), []);
});

test("lining up shows green dots on an early level when the throw would go in, and none on a late one", () => {
    const way = hoopWay({ phase: 0, variant: 0 }, "touch");
    assert.ok(way);
    const s = openHoopConfiguration({ phase: 0, variant: 0 });
    // stop with the finger still pulled back, just before it lets go
    const last = way.findIndex((p, i) => p.lifted && way[i - 2]?.touch);
    for (const p of way.slice(0, last)) hoopsGame.step(s, { ...p, holding: [...p.holding] });
    const dots = hoopsGame.frame(s).marks.filter((m) => m.kind === "dots");
    assert.ok(dots.length > 0 && dots.every((m) => m.kind === "dots" && m.tone === "ok"));
    const late = hoopsGame.start(phaseOf("Copy Pip"), 1);
    settle(late);
    assert.equal(late.turn, "child");
    assert.equal(hoopsGame.frame(late).marks.filter((m) => m.kind === "dots").length, 0);
});

test("a pull may start anywhere above the drive, and is measured from where the finger went down", () => {
    const s = startHoops(level(1));
    const from = handOf(s);
    const down: Pt = { x: from.x - 6, y: from.y - 6 };
    const to = throwWhere(s, (f) => f.scored),
        len = to.power / SHOT.per;
    const end = { x: down.x - Math.cos(to.angle) * len, y: down.y - Math.sin(to.angle) * len };
    play(s, [
        { ...emptyPad(), touch: down },
        { ...emptyPad(), touch: end },
        { ...emptyPad(), lifted: end },
    ]);
    settle(s);
    assert.equal(s.makes, 1);
});

test("under reduced motion a shot settles where the ball comes back, and nothing drifts", () => {
    const s = startHoops(level(1));
    hoopsGame.step(s, { ...emptyPad(), go: true, tapped: true });
    assert.ok(hoopsGame.still.settling?.(s));
    settle(s);
    assert.equal(s.mode, "aim");
    const f = hoopsGame.frame(s, true);
    assert.ok(!f.marks.some((m) => m.kind === "word" && !m.fixed), "a pop-up drawn at rest");
    assert.ok(!f.marks.some((m) => m.kind === "ring"), "a glow drawn at rest");
});

test("the ways to make a number use the fewest baskets, and different ways are different", () => {
    assert.deepEqual(waysToMake(7, [1, 2, 3])[0], [3, 3, 1]);
    assert.deepEqual(waysToMake(10, [2, 3])[0], [3, 3, 2, 2]);
    assert.deepEqual(waysToMake(6, [1, 2, 3], 3), [
        [3, 3],
        [3, 2, 1],
        [2, 2, 2],
    ]);
    assert.deepEqual(waysToMake(1, [2, 3]), []);
});

/** The surest basket from where the shooter stands, thrown `by` more or less power, until it misses. */
function missBy(s: HoopState, by: number): void {
    for (let k = 0; k < 4; k++) {
        const sure = throwWhere(s, (f) => f.scored),
            before = s.makes;
        const power = Math.min(SHOT.max, Math.max(SHOT.min, sure.power + by * (1 + k * 0.5)));
        play(s, keysFor({ angle: sure.angle, power }));
        settle(s);
        if (s.makes === before) return;
    }
    throw new Error("every throw went in");
}

test("a missed throw stays on the paper until the spot moves, and its note says which way it missed", () => {
    const s = startHoops(level(1));
    missBy(s, 4);
    assert.ok(s.last.length > 2, "the missed throw was not kept");
    assert.match(s.note, /long|back/i);
    const lines = hoopsGame.frame(s).marks.filter((m) => m.kind === "line" && m.style === "thin");
    assert.ok(lines.length >= s.last.length - 1, "the missed throw is not drawn");
    missBy(s, -4);
    assert.match(s.note, /short|front/i);
    play(s, keysFor(throwWhere(s, (f) => f.scored)));
    settle(s);
    assert.equal(s.makes, 1);
    assert.deepEqual(s.last, [], "the old throw stayed after the spot moved");
});

test("the gauge's green band holds powers that go in at the angle aimed, and shows only where the level has one", () => {
    for (const title of ["A gusty day", "Hedge and branch", "Off the board", "Around the world"]) {
        const s = startHoops(level(phaseOf(title)));
        settle(s);
        const sure = throwWhere(s, (f) => countsAs(s.L, f));
        s.aim = { angle: Math.round(sure.angle * 100) / 100, power: READY.power, pulling: false };
        const runs = sweetBand(s);
        assert.ok(runs.length > 0, `${title}: no band`);
        for (const [lo, hi] of runs)
            for (const k of [0.1, 0.5, 0.9]) {
                const p = lo + (hi - lo) * k,
                    v = { x: Math.cos(s.aim.angle) * p, y: Math.sin(s.aim.angle) * p };
                assert.ok(
                    countsAs(s.L, flightOf(s.L, handOf(s), v, s.steps, s.wind)),
                    `${title}: ${p.toFixed(2)} is in the band but does not go in`,
                );
            }
    }
    for (const title of [
        "First baskets",
        "The sliding hoop",
        "Copy Pip",
        "Beat the clock",
        "Shoot-around",
    ]) {
        const s = startHoops(level(phaseOf(title)));
        settle(s);
        assert.deepEqual(sweetBand(s), [], `${title}: a band where the level has none`);
    }
});

test("the aim's arrow grows with the power, and the frame draws it that long", () => {
    let was = 0;
    for (let p = SHOT.min; p <= SHOT.max; p += 0.5) {
        const len = arrowLength({ ...READY, power: p });
        assert.ok(len > was, `the arrow did not grow at ${p}`);
        was = len;
    }
    const s = startHoops(level(1));
    s.aim = { ...READY, power: 25 };
    const arrow = hoopsGame
        .frame(s)
        .marks.find((m) => m.kind === "line" && m.style === "rod" && m.head);
    assert.ok(arrow && arrow.kind === "line");
    const drawn = Math.hypot(arrow.b.x - arrow.a.x, arrow.b.y - arrow.a.y);
    assert.ok(Math.abs(drawn - arrowLength(s.aim)) < 1e-9);
});
