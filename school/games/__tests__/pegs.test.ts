// Marble pegs: every variation of every target level is won by the solver through the keys and the
// same keys replay to the same board; the same aims by a finger win the same way; random aims rarely
// win past the first level; a peg counts once a shot; a peg past an exact target lights grey, keeps
// the total and spends the marble; a peg out of turn lights grey; a board that can no longer make its
// target and a tray run dry both end the round not won; a stuck marble pops the pegs holding it; the
// dotted aim is the marble's own path to the first peg; a winning shot slows for its fever; free play
// keeps its best; the state survives JSON; and the frame names only shelf drawings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { endOf } from "../game";
import {
    PEG_LEVELS,
    guideOf,
    pegsGame as g,
    startPegs,
    strike,
    type PegLevel,
    type PegState,
} from "../pegs";
import {
    PEG_VARIANTS,
    openPegConfiguration,
    pegPlan,
    playPlan,
    shotPads,
    varyPegs,
} from "../pegs-challenges";

const TARGETS = PEG_LEVELS.map((_, i) => i).filter((i) => PEG_LEVELS[i]?.ask.kind !== "free");
const copy = (p: Pad): Pad => ({ ...p, holding: [...p.holding], pressed: [...p.pressed] });
const play = (s: PegState, pads: readonly Pad[]) => {
    for (const p of pads) g.step(s, copy(p));
};
/** What a round leaves on the board, whichever hands played it. */
const board = (s: PegState) => ({
    off: s.live.off,
    t: s.live.t,
    parts: s.parts,
    sum: s.sum,
    left: s.left,
    end: s.end,
});
const levelOf = (i: number): PegLevel => {
    const L = PEG_LEVELS[i];
    if (!L) throw new Error(`no level ${i}`);
    return L;
};

test("every variation of every target level is won by the keys, and the keys replay to the same board", () => {
    for (const phase of TARGETS)
        for (let variant = 0; variant < PEG_VARIANTS; variant++) {
            const c = { phase, variant },
                plan = pegPlan(openPegConfiguration(c));
            assert.ok(plan, `level ${phase} variation ${variant} has no way through`);
            const a = openPegConfiguration(c),
                keys = playPlan(a, plan, "keys");
            assert.equal(
                a.end,
                "won",
                `level ${phase} variation ${variant} is not won by its keys`,
            );
            assert.ok(keys.every((p) => !p.touch && !p.lifted && !p.hover));
            const b = openPegConfiguration(c);
            play(b, keys);
            assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
        }
});

test("the same aims by a finger held towards them and let go win the same board", () => {
    for (const phase of TARGETS)
        for (let variant = 0; variant < PEG_VARIANTS; variant++) {
            const c = { phase, variant },
                plan = pegPlan(openPegConfiguration(c));
            if (!plan) continue;
            const keys = openPegConfiguration(c),
                hands = openPegConfiguration(c);
            playPlan(keys, plan, "keys");
            const touches = playPlan(hands, plan, "touch");
            assert.ok(touches.some((p) => p.lifted) && touches.every((p) => !p.tapped));
            assert.equal(hands.end, "won", `level ${phase} variation ${variant} by a finger`);
            assert.deepEqual(board(hands), board(keys));
        }
});

/** Random play: a finger let go at a random aim for every marble, until the round ends. */
function randomRate(L: PegLevel, tries: number, seed: number): number {
    let r = seed,
        wins = 0;
    const rand = () => {
        r = (Math.imul(r, 1103515245) + 12345) & 0x7fffffff;
        return r / 0x7fffffff;
    };
    for (let t = 0; t < tries; t++) {
        const s = startPegs(varyPegs(L, t % PEG_VARIANTS));
        s.sim = true;
        for (let shot = 0; shot < 20 && !s.end; shot++) {
            play(s, shotPads(s.aim, Math.round((rand() * 2 - 1) * 160), "touch"));
            for (let i = 0; i < 60 * 60 && s.stage !== "aim" && !s.end; i++) g.step(s, emptyPad());
        }
        if (s.end === "won") wins++;
    }
    return wins / tries;
}

test("random aims rarely win past the first level, which is meant to be won", () => {
    const rates = TARGETS.map((i) => randomRate(levelOf(i), 48, 7 + i));
    const [first = 0, second = 0, ...rest] = rates;
    assert.ok(first > 0.8, `the garden fence is won ${first} at random`);
    assert.ok(second <= 0.55, `the sweet jar is won ${second} at random`);
    rest.forEach((r, i) => assert.ok(r <= 0.4, `level ${i + 2} is won ${r} at random`));
    const after = rates.slice(1).reduce((a, b) => a + b, 0) / (rates.length - 1);
    assert.ok(after <= 0.3, `past the first level ${after.toFixed(2)} at random`);
});

test("a peg counts once a shot, however often the marble meets it", () => {
    const s = g.start(0);
    strike(s, "p0", []);
    strike(s, "p0", []);
    assert.deepEqual(s.parts, [levelOf(0).pegs[0]?.n]);
    assert.equal(s.lit.length, 1);
});

test("a peg past an exact target lights grey, keeps the total and spends the marble", () => {
    const s = g.start(1),
        pegs = levelOf(1).pegs,
        big = pegs.findIndex((p) => p.n === 7),
        small = pegs.findIndex((p) => p.n === 3);
    s.sum = 5;
    s.parts = [5];
    strike(s, `p${big}`, []);
    assert.equal(s.sum, 5);
    assert.ok(s.grey.includes(`p${big}`));
    assert.match(s.note, /5 \+ 7 would make 12, more than 10.*counts no more\. Still 5\./);
    strike(s, `p${small}`, []);
    assert.equal(s.sum, 5, "a spent marble counts nothing more");
    assert.ok(s.grey.includes(`p${small}`));
});

test("a peg out of turn lights grey and says which is next", () => {
    const s = g.start(4),
        pegs = levelOf(4).pegs,
        four = pegs.findIndex((p) => p.n === 4),
        two = pegs.findIndex((p) => p.n === 2);
    strike(s, `p${four}`, []);
    assert.equal(s.next, 0);
    assert.match(s.note, /That was 4\. 2 is next\./);
    strike(s, `p${two}`, []);
    assert.equal(s.next, 1);
});

/** A state as a shot ends, with the lit pegs popped, about to decide what comes next. */
function shotOver(s: PegState): void {
    s.stage = "pop";
    s.queue = [];
    s.wait = 20;
    s.ball.mode = "gone";
}

test("a board that can no longer make its target ends the round not won, and says why", () => {
    const s = g.start(1);
    s.sum = 9;
    s.parts = [4, 5];
    shotOver(s);
    g.step(s, emptyPad());
    assert.deepEqual(endOf(g, s), {
        won: false,
        words: "9 so far, and no pegs left on the board make 1. Again?",
    });
});

test("a tray run dry ends the round not won, and it stays ended", () => {
    const s = g.start(1);
    s.sum = 6;
    s.parts = [6];
    s.left = 0;
    shotOver(s);
    g.step(s, emptyPad());
    assert.deepEqual(endOf(g, s), { won: false, words: "Out of marbles at 6 of 10. Again?" });
    play(s, shotPads(s.aim, 20, "keys"));
    assert.equal(s.end, "out");
    assert.equal(g.won(s), false);
});

test("a marble stopped on a flat peg pops it away and falls on", () => {
    const L: PegLevel = {
        ...levelOf(0),
        pegs: [{ x: 10, y: 8, n: 2, long: { len: 6, angle: 0 } }],
    };
    const s = startPegs(L);
    play(s, shotPads(0, 0, "keys"));
    for (let i = 0; i < 60 * 8 && s.stage === "fly"; i++) g.step(s, emptyPad());
    assert.notEqual(s.stage, "fly", "the marble never left the board");
    assert.ok(s.live.off.p0, "the peg holding it did not pop");
});

test("the dotted aim is the marble's own path, to the peg it strikes first", () => {
    for (const phase of [0, 1, 3, 6])
        for (const aim of [-120, -40, 0, 30, 90]) {
            const s = startPegs({ ...levelOf(phase), preview: 1 });
            s.aim = aim;
            const guide = guideOf(s);
            play(s, [{ ...emptyPad(), tapped: true, go: true, keys: true }]);
            const seen = [{ x: s.ball.x, y: s.ball.y }];
            for (let i = 0; i < 600 && s.shot.length === 0 && s.ball.mode === "free"; i++) {
                g.step(s, emptyPad());
                if (s.shot.length === 0) seen.push({ x: s.ball.x, y: s.ball.y });
            }
            assert.equal(s.shot[0] ?? null, guide.first, `level ${phase} aim ${aim}`);
            // every place the marble passed lies on the dotted line
            const off = (p: { x: number; y: number }) =>
                Math.min(
                    ...guide.pts.slice(1).map((b, i) => {
                        const a = guide.pts[i] ?? b,
                            ex = b.x - a.x,
                            ey = b.y - a.y,
                            l2 = ex * ex + ey * ey,
                            k = l2
                                ? Math.max(
                                      0,
                                      Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / l2),
                                  )
                                : 0;
                        return Math.hypot(p.x - a.x - ex * k, p.y - a.y - ey * k);
                    }),
                );
            for (const p of seen) assert.ok(off(p) < 0.05, `level ${phase} aim ${aim}: ${off(p)}`);
        }
});

test("a winning shot is known as it leaves, and slows for its fever", () => {
    const plan = pegPlan(g.start(0));
    assert.ok(plan && plan.length === 1);
    const real = g.start(0),
        quick: PegState = { ...g.start(0), sim: true };
    let realSteps = 0,
        quickSteps = 0;
    play(real, shotPads(0, plan[0] ?? 0, "keys"));
    play(quick, shotPads(0, plan[0] ?? 0, "keys"));
    assert.equal(typeof real.fever, "number");
    for (; real.stage === "fly" && realSteps < 3600; realSteps++) g.step(real, emptyPad());
    for (; quick.stage === "fly" && quickSteps < 3600; quickSteps++) g.step(quick, emptyPad());
    assert.ok(realSteps > quickSteps + 20, `${realSteps} against ${quickSteps}`);
    assert.deepEqual(real.parts, quick.parts);
});

test("free play ends won on its last marble with the score, and keeps the best", () => {
    const last = PEG_LEVELS.length - 1,
        s = g.start(last);
    assert.equal(s.L.ask.kind, "free");
    assert.ok(g.restore?.(s, { best: 40 }));
    for (let shot = 0; shot < 40 && !s.end; shot++) {
        play(s, shotPads(s.aim, ((shot * 37) % 300) - 150, "keys"));
        for (let i = 0; i < 60 * 60 && s.stage !== "aim" && !s.end; i++) g.step(s, emptyPad());
    }
    assert.equal(s.end, "won");
    assert.ok(s.score > 0);
    assert.match(s.note, /You scored \d+\. Your best is \d+\./);
    assert.deepEqual(g.checkpoint?.(s), { best: Math.max(40, s.score) });
    assert.equal(g.restore?.(s, { best: "lots" }), false);
});

test("a round in play is the same after a trip through JSON, and plays on the same", () => {
    const c = { phase: 4, variant: 1 },
        plan = pegPlan(openPegConfiguration(c)) ?? [];
    const s = openPegConfiguration(c);
    play(s, shotPads(0, plan[0] ?? 0, "keys"));
    for (let i = 0; i < 90; i++) g.step(s, emptyPad());
    const back: unknown = JSON.parse(JSON.stringify(s));
    assert.deepEqual(back, structuredClone(s));
    const a = structuredClone(s),
        b = structuredClone(s);
    for (let i = 0; i < 300; i++) {
        g.step(a, emptyPad());
        g.step(b, emptyPad());
    }
    assert.deepEqual(a, b);
});

test("the game is not a lesson card, and every frame names only shelf drawings", () => {
    assert.equal(g.card, null);
    for (let level = 0; level < PEG_LEVELS.length; level++) {
        const s = g.start(level);
        const frames = [g.frame(s, true)];
        play(s, shotPads(0, 40, "keys"));
        for (let i = 0; i < 40; i++) g.step(s, emptyPad());
        frames.push(g.frame(s));
        for (const f of frames)
            for (const sp of f.sprites)
                assert.ok(SHELF_IDS.has(sp.art), `level ${level}: ${sp.art} is not on the shelf`);
    }
});
