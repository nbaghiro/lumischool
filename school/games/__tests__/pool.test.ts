// Pocket pool: every variation of every level is won by strikes the solver found through the keys,
// and those pads replay to the same table; a shot that breaks the target is taken back for free;
// the dotted line shows less as the levels go on; random shots rarely win; and the room's floor runs
// past every side of the view.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { POOL, POOL_LEVELS, askWords, poolGame, preview, startPool, type PoolState } from "../pool";
import {
    POOL_VARIANTS,
    isPoolConfiguration,
    openPoolConfiguration,
    poolChallenge,
    poolWay,
} from "../pool-challenges";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { rolling } from "../../../engine/motion/billiards";
import { faults } from "../../../engine/motion/tune";

const RATE = poolGame.rate;

const level = (i: number) => {
    const L = POOL_LEVELS[i];
    assert.ok(L, `level ${i}`);
    return L;
};

const tick = (s: PoolState, pad: Pad) => {
    const out = poolGame.step(s, pad);
    spent(pad);
    return out;
};

function settle(s: PoolState) {
    const out = [];
    for (let i = 0; i < RATE * 40 && (s.shooting || rolling(s.balls)); i++)
        out.push(...tick(s, emptyPad()));
    return out;
}

/** Sets the aim straight and strikes, then steps until the shot is judged. */
function shoot(s: PoolState, angle: number, power: number) {
    s.aim.angle = angle;
    s.aim.power = power;
    return [...tick(s, { ...emptyPad(), tapped: true }), ...settle(s)];
}

const signature = (s: PoolState) =>
    JSON.stringify({
        won: s.won,
        steps: s.steps,
        potted: s.potted,
        balls: s.balls.map((b) => [b.n, b.potted, b.x.toFixed(6), b.y.toFixed(6)]),
    });

test("every variation of every level is won by strikes from the keys, and the pads replay to the same table", () => {
    for (let phase = 0; phase < POOL_LEVELS.length; phase++)
        for (let variant = 0; variant < POOL_VARIANTS; variant++) {
            const c = { phase, variant };
            const pads = poolWay(c);
            assert.ok(pads, `level ${phase} variation ${variant} has a way`);
            const a = openPoolConfiguration(c),
                b = openPoolConfiguration(c);
            const events: string[] = [];
            for (const p of pads) {
                for (const h of poolGame.step(a, {
                    ...p,
                    holding: [...p.holding],
                    pressed: [...p.pressed],
                }))
                    if ("event" in h) events.push(h.event.kind);
                poolGame.step(b, { ...p, holding: [...p.holding], pressed: [...p.pressed] });
            }
            assert.ok(a.won, `level ${phase} variation ${variant} is won`);
            assert.equal(signature(a), signature(b));
            assert.ok(events.includes("won") && events.includes("pot"));
            const o = poolGame.objectives?.(a);
            assert.ok(o && o.completed === o.total);
        }
});

test("a white ball in a pocket, an odd ball on evens only and a total past the target are all taken back for free", () => {
    const white = startPool(level(0));
    const cue = white.balls[0];
    assert.ok(cue);
    white.before = white.balls.map((b) => ({ ...b }));
    white.shooting = true;
    cue.potted = true;
    white.dropped = [0];
    const out = tick(white, emptyPad());
    assert.equal(white.balls[0]?.potted, false, "the white ball is back on the table");
    assert.ok(out.some((h) => "cue" in h && h.cue === "back"));
    assert.match(white.note, /white ball/);

    const evens = startPool(level(4));
    const odd = evens.balls.find((b) => b.n === 3);
    assert.ok(odd);
    const before = evens.balls.map((b) => ({ ...b }));
    evens.shooting = true;
    evens.before = before;
    odd.potted = true;
    evens.dropped = [3];
    settle(evens);
    tick(evens, emptyPad());
    assert.deepEqual(evens.potted, []);
    assert.equal(evens.balls.find((b) => b.n === 3)?.potted, false, "the 3 is back on the table");
    assert.match(evens.note, /odd/);

    const over = startPool(level(0));
    over.potted = [7];
    over.balls.forEach((b) => {
        if (b.n === 7) b.potted = true;
    });
    const five = over.balls.find((b) => b.n === 5);
    assert.ok(five);
    over.before = over.balls.map((b) => ({ ...b }));
    over.shooting = true;
    five.potted = true;
    over.dropped = [5];
    tick(over, emptyPad());
    assert.deepEqual(over.potted, [7]);
    assert.equal(over.balls.find((b) => b.n === 5)?.potted, false);
    assert.match(over.note, /more than 10/);
});

test("ten in two shots sets the balls out again when two shots miss the target", () => {
    const s = startPool(level(1));
    for (let k = 0; k < 2; k++) shoot(s, Math.PI, 0.6);
    assert.equal(s.shots, 0);
    assert.deepEqual(s.potted, []);
    assert.match(s.note, /set out again/);
});

test("the dotted line shows the first bank and the ball it meets early, only the first meeting later, and nothing last", () => {
    const early = startPool(level(0));
    const cue = early.balls[0];
    assert.ok(cue);
    early.aim.angle = -Math.PI / 2 - 0.3;
    const banked = preview(early);
    assert.ok(banked.pts.length >= 3, "the line banks off the top cushion");
    const middle = startPool(level(3));
    middle.aim.angle = -Math.PI / 2 - 0.3;
    assert.ok(preview(middle).pts.length <= 2);
    const late = startPool(level(7));
    const marks = poolGame.frame(late).marks;
    assert.ok(!marks.some((m) => m.kind === "dots" || m.kind === "ring"));
    const first = poolGame.frame(early).marks;
    assert.ok(first.some((m) => m.kind === "dots"));
});

test("random shots rarely win a level", () => {
    let seed = 7;
    const rand = () => {
        seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x6d2b79f5) >>> 0;
        return seed / 2 ** 32;
    };
    for (let phase = 0; phase < POOL_LEVELS.length; phase++) {
        let wins = 0;
        for (let k = 0; k < 20; k++) {
            const s = startPool(level(phase), phase);
            for (let shot = 0; shot < 3 && !s.won; shot++)
                shoot(s, rand() * Math.PI * 2, 2 + rand() * 18);
            if (s.won) wins++;
        }
        assert.ok(wins <= 5, `level ${phase} is won by ${wins} of 20 random tries`);
    }
});

test("the floor runs past every side of the room, and the rest frame shows no aim line", () => {
    const s = startPool(level(7));
    const f = poolGame.frame(s, true);
    const floor = f.sprites.filter((p) => p.art === "floorboards");
    const xs = floor.map((p) => p.x),
        ys = floor.map((p) => p.y);
    assert.ok(Math.min(...xs) - 10 < -20 && Math.max(...xs) + 10 > f.world.w + 20);
    assert.ok(Math.min(...ys) - 10 < -20 && Math.max(...ys) + 10 > f.world.h + 20);
    assert.ok(!f.marks.some((m) => m.kind === "dots"));
});

test("under reduced motion a strike settles where the balls stop", () => {
    const s = startPool(level(0));
    tick(s, { ...emptyPad(), tapped: true });
    assert.ok(poolGame.still.settling?.(s));
    settle(s);
    assert.equal(poolGame.still.settling?.(s), false);
    assert.ok(poolGame.still.press(s) >= 1);
});

test("stored layouts read back only as the variations they are", () => {
    for (let phase = 0; phase < POOL_LEVELS.length; phase++) {
        const c = poolChallenge(5, phase),
            reads = (v: unknown, p: number): boolean => isPoolConfiguration(v, p);
        assert.ok(reads(c, phase));
        assert.ok(!reads(c, phase + 1));
        assert.ok(!reads({ ...c, variant: POOL_VARIANTS }, phase));
        assert.ok(!reads({ ...c, extra: 1 }, phase));
    }
});

test("every drawing it names is on the shelf, its tuning is sound, it says no dashes, and it rumbles while balls roll", () => {
    const seen = new Set<string>();
    for (let phase = 0; phase < POOL_LEVELS.length; phase++) {
        const s = startPool(level(phase), phase);
        for (const p of poolGame.frame(s).sprites) seen.add(p.art);
    }
    seen.add(poolGame.cover.art);
    for (const art of seen) assert.ok(SHELF_IDS.has(art), `${art} is not on the shelf`);
    assert.deepEqual(faults(POOL), []);
    for (const L of POOL_LEVELS)
        assert.ok(!/[—!]/.test(`${L.goal} ${L.prompt} ${askWords(L.ask)} ${poolGame.hint}`));
    const s = startPool(level(0));
    assert.deepEqual(poolGame.hum?.(s), []);
    tick(s, { ...emptyPad(), tapped: true });
    tick(s, emptyPad());
    assert.equal(poolGame.hum?.(s)[0]?.kind, "roll");
});
