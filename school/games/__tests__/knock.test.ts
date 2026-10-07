// Knock it down: every variation of every target level is won by the pilot through the keys and through
// a finger, and the pads replay to the same round; random hands rarely win past the first level; a
// block that would take a sum past its target stays, greys and says why; a piece that falls never
// counts towards a sum; an odd number stays when only the evens count, and a number out of turn
// stays; a two-hit block cracks first; a piece that loses its hold falls and counts where it would;
// the gifts widen the tray, hold the ball, add a ball and add up as stars; a round out of balls, or
// past making its target, ends not won and says why; the dotted path is the ball's own way; the arrows
// speed the tray up and a tap is a fine step, and a finger leads it without overshooting; free play
// keeps its best; the state survives JSON; and the frame names only shelf drawings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, type Dir, type Pad } from "../../../engine/motion/pad";
import { endOf } from "../game";
import {
    FIELD_AT,
    KNOCK_LEVELS,
    TRAY_Y,
    guideOf,
    knockGame as g,
    startKnock,
    type BlockSpec,
    type KnockLevel,
    type KnockState,
} from "../knock";
import { KNOCK_VARIANTS, knockWay, openKnockConfiguration } from "../knock-challenges";

const TARGETS = KNOCK_LEVELS.map((_, i) => i).filter((i) => KNOCK_LEVELS[i]?.ask.kind !== "free");
const copy = (p: Pad): Pad => ({ ...p, holding: [...p.holding], pressed: [...p.pressed] });
const play = (s: KnockState, pads: readonly Pad[]) => {
    for (const p of pads) g.step(s, copy(p));
};
const levelOf = (i: number): KnockLevel => {
    const L = KNOCK_LEVELS[i];
    if (!L) throw new Error(`no level ${i}`);
    return L;
};
const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

for (const hands of ["keys", "touch"] as const)
    test(`every variation of every target level is won by ${hands === "keys" ? "the keys" : "a finger"}, and replays to the same round`, () => {
        for (const phase of TARGETS)
            for (let variant = 0; variant < KNOCK_VARIANTS; variant++) {
                const c = { phase, variant },
                    pads = knockWay(c, hands);
                assert.ok(pads, `level ${phase} variation ${variant} is not won by ${hands}`);
                if (hands === "keys")
                    assert.ok(pads.every((p) => !p.touch && !p.lifted && !p.hover));
                else assert.ok(pads.every((p) => !p.tapped && p.holding.length === 0));
                const a = openKnockConfiguration(c),
                    b = openKnockConfiguration(c);
                play(a, pads);
                play(b, pads);
                assert.equal(a.end, "won", `level ${phase} variation ${variant} replays to a win`);
                assert.deepEqual(json(a), json(b));
            }
    });

/** Random hands: an arrow or none held for a fifth of a second at a time, and now and then a serve. */
function randomRate(phase: number, tries: number): number {
    let wins = 0;
    for (let t = 0; t < tries; t++) {
        let r = 7 + phase * 1000 + t;
        const rand = () => (r = (Math.imul(r, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff;
        const s = openKnockConfiguration({ phase, variant: t % KNOCK_VARIANTS });
        s.sim = true;
        let pad: Pad = emptyPad();
        for (let n = 0; n < 60 * 180 && !s.end; n++) {
            if (n % 12 === 0) {
                const k = rand(),
                    d: Dir[] = k < 0.33 ? ["left"] : k < 0.66 ? ["right"] : [];
                pad = {
                    ...emptyPad(),
                    holding: d,
                    held: d[0] ?? null,
                    pressed: [...d],
                    tapped: rand() < 0.1,
                };
            } else pad = { ...pad, pressed: [], tapped: false };
            g.step(s, pad);
        }
        if (s.end === "won") wins++;
    }
    return wins / tries;
}

test("random hands rarely win past the first level, which is meant to be won", () => {
    const rates = TARGETS.map((i) => randomRate(i, 40));
    const [first = 0, ...rest] = rates;
    assert.ok(first > 0.4, `the little house is won ${first} at random`);
    rest.forEach((r, i) =>
        assert.ok(r <= (i + 1 === 2 ? 0.4 : 0.2), `${levelOf(i + 1).title} is won ${r} at random`),
    );
    const after = rest.reduce((a, b) => a + b, 0) / rest.length;
    assert.ok(after <= 0.12, `past the first level ${after.toFixed(2)} at random`);
});

/** A level of one fixed rock and the blocks given above it, played from a ball already on its way up from `x`. */
function lab(
    blocks: BlockSpec[],
    ask: KnockLevel["ask"],
    x: number,
    more: Partial<KnockLevel> = {},
) {
    const L: KnockLevel = {
        ...levelOf(0),
        blocks: [{ x: 8, y: 14, w: 6, h: 2, look: "rock" }, ...blocks],
        ask,
        preview: 2,
        ...more,
    };
    const s = startKnock(L);
    s.held = null;
    s.stage = "play";
    s.touched = true;
    s.balls = [{ x, y: 24, vx: 0, vy: -12, a: 0 }];
    return s;
}

/** Steps until `done`, or a few seconds. */
function until(s: KnockState, done: (s: KnockState) => boolean, pad: Pad = emptyPad()): void {
    for (let i = 0; i < 60 * 8 && !done(s); i++) g.step(s, copy(pad));
}

test("a block that would take a sum past its target stays, greys, and says why", () => {
    const s = lab(
        [
            { x: 2, y: 10, w: 2, h: 2, look: "toy", n: 7 },
            { x: 8, y: 12, w: 2, h: 2, look: "toy", n: 4 },
        ],
        { kind: "sum", total: 10 },
        3,
    );
    s.sum = 6;
    s.parts = [6];
    until(s, (k) => Object.keys(k.greyed).length > 0);
    assert.equal(s.off.b1, undefined, "the 7 still stands");
    assert.equal(s.sum, 6);
    assert.match(s.note, /6 \+ 7 would make 13, more than 10, so the 7 stays\. Still 6\./);
});

test("a piece that falls never counts towards a sum, but one the ball breaks does", () => {
    // a 4 hangs off a 2 that holds it to the rock: break the 2 and the 4 falls
    const s = lab(
        [
            { x: 14, y: 14, w: 2, h: 2, look: "toy", n: 2 },
            { x: 16, y: 14, w: 2, h: 2, look: "toy", n: 4 },
            { x: 8, y: 12, w: 2, h: 2, look: "toy", n: 8 },
        ],
        { kind: "sum", total: 10 },
        15,
    );
    until(s, (k) => k.off.b1 === true);
    assert.equal(s.sum, 2, "the 2 the ball broke counts");
    assert.equal(s.off.b2, true, "the 4 came away");
    assert.ok(
        s.falls.some((f) => f.id === "b2"),
        "and is falling",
    );
    assert.deepEqual(s.parts, [2]);
    assert.match(s.note, /The 4 fell, so it does not count\. Still 2\./);
});

test("an odd number stays when only the evens count, and a number out of turn stays", () => {
    const evens = lab(
        [{ x: 2, y: 10, w: 2, h: 2, look: "apple", n: 5 }],
        { kind: "multiples", of: 2 },
        3,
    );
    until(evens, (k) => Object.keys(k.greyed).length > 0);
    assert.equal(evens.off.b1, undefined);
    assert.match(evens.note, /5 is odd, so it stays\./);
    const order = lab(
        [
            { x: 2, y: 10, w: 2, h: 2, look: "snow", n: 4 },
            { x: 8, y: 12, w: 2, h: 2, look: "snow", n: 2 },
        ],
        { kind: "order", seq: [2, 4] },
        3,
    );
    until(order, (k) => Object.keys(k.greyed).length > 0);
    assert.equal(order.off.b1, undefined);
    assert.match(order.note, /That is 4\. 2 is next\./);
});

test("a two-hit block cracks on its first hit and breaks on its second", () => {
    const s = lab(
        [{ x: 2, y: 10, w: 2, h: 2, look: "stone", hits: 2 }],
        { kind: "count", n: 5 },
        3,
    );
    until(s, (k) => (k.hp.b1 ?? 2) < 2);
    assert.equal(s.hp.b1, 1);
    assert.equal(s.off.b1, undefined, "cracked, not broken");
    // the ball comes back down; sent up again under the block, it breaks it
    s.balls = [{ x: 3, y: 24, vx: 0, vy: -12, a: 0 }];
    until(s, (k) => k.off.b1 === true);
    assert.equal(s.parts.length, 1);
});

test("a piece that loses its hold falls, and counts where it would", () => {
    // a beam on the rock, a block hanging off its end: break the beam and the block comes down
    const s = lab(
        [
            { x: 14, y: 14, w: 2, h: 1, look: "brick" },
            { x: 16, y: 14, w: 2, h: 1, look: "brick" },
            { x: 18, y: 14, w: 2, h: 1, look: "brick" },
        ],
        { kind: "count", n: 5 },
        15,
    );
    until(s, (k) => k.off.b1 === true);
    assert.equal(s.off.b2, true);
    assert.equal(s.off.b3, true);
    assert.equal(s.parts.length, 3, "the beam and the two that fell with it all count");
    const ys = () => s.falls.map((f) => f.y);
    const before = ys();
    for (let i = 0; i < 20; i++) g.step(s, emptyPad());
    assert.ok(
        ys().every((y, i) => y > (before[i] ?? 0)),
        "and they fall",
    );
});

test("the gifts widen the tray, hold the ball until it is served, add a ball, and add up as stars", () => {
    const s = startKnock(levelOf(0));
    const drop = (kind: "wide" | "sticky" | "ball" | "star", n = 0) =>
        s.gifts.push({ id: `g${kind}`, kind, n, x: s.tray.x, y: TRAY_Y - 3 });
    play(s, [{ ...emptyPad(), tapped: true }]);
    drop("wide");
    until(s, (k) => k.wide > 0);
    for (let i = 0; i < 60; i++) g.step(s, emptyPad());
    assert.ok(s.tray.half > levelOf(0).tray * 1.3, "the tray grows");
    drop("ball");
    until(s, (k) => k.balls.length === 2);
    assert.equal(s.balls.length, 2, "another ball joins");
    drop("sticky");
    until(s, (k) => k.sticky > 0);
    assert.equal(s.sticky, 3);
    const stars = startKnock(levelOf(6));
    stars.sum = 12;
    stars.parts = [12];
    stars.gifts.push({ id: "g1", kind: "star", n: 5, x: stars.tray.x, y: TRAY_Y - 2 });
    until(stars, (k) => k.gifts.length === 0);
    assert.equal(stars.sum, 12, "a star past 15 does not count");
    assert.match(stars.note, /12 \+ 5 would make 17, more than 15, so that star does not count\./);
    stars.gifts.push({ id: "g2", kind: "star", n: 3, x: stars.tray.x, y: TRAY_Y - 2 });
    until(stars, (k) => k.gifts.length === 0 || k.won);
    assert.ok(stars.won, "12 + 3 makes 15");
});

test("a sticky tray holds the ball where it landed, and a serve sends it off again", () => {
    const s = lab([], { kind: "count", n: 5 }, 11);
    s.sticky = 2;
    s.balls = [{ x: s.tray.x + 1, y: TRAY_Y - 4, vx: 0, vy: 10, a: 0 }];
    until(s, (k) => k.held !== null);
    assert.ok(s.held !== null && s.held > 0, "held right of the middle, where it landed");
    assert.equal(s.balls.length, 0);
    assert.equal(s.sticky, 1);
    play(s, [{ ...emptyPad(), tapped: true }]);
    assert.equal(s.held, null);
    assert.ok((s.balls[0]?.vx ?? 0) > 0, "served up and to the right");
});

test("a round out of balls ends not won and says so, and stays ended", () => {
    const s = startKnock(levelOf(2));
    s.left = 0;
    play(s, [{ ...emptyPad(), tapped: true }]);
    s.balls = [{ x: 1, y: TRAY_Y + 2, vx: 0, vy: 12, a: 0 }];
    s.tray.x = 18;
    until(s, (k) => k.end !== null);
    assert.deepEqual(endOf(g, s), { won: false, words: "Out of balls at 0 of 10. Again?" });
    play(s, [{ ...emptyPad(), tapped: true }]);
    assert.equal(s.end, "out");
    assert.equal(g.won(s), false);
});

test("a sum that the blocks left can no longer make ends the round, and says why", () => {
    const s = lab([{ x: 2, y: 10, w: 2, h: 2, look: "toy", n: 4 }], { kind: "sum", total: 10 }, 3);
    s.sum = 9;
    s.parts = [9];
    g.step(s, emptyPad());
    assert.deepEqual(endOf(g, s), {
        won: false,
        words: "9 so far, and no blocks left make 1. Again?",
    });
});

test("the dotted path is the ball's own way back down to the tray's line", () => {
    for (const phase of [0, 2, 3])
        for (const nudge of [0, 4, -5]) {
            const s = startKnock({ ...levelOf(phase), preview: 2 }, phase);
            s.tray.x += nudge;
            const pts = guideOf(s);
            assert.ok(pts.length > 4, `level ${phase}: a path is drawn`);
            play(s, [{ ...emptyPad(), tapped: true }]);
            const seen: { x: number; y: number }[] = [];
            for (
                let i = 0;
                // the path looks four seconds ahead at most
                i < 60 * 4 &&
                s.balls[0] &&
                s.catches === 0 &&
                !(s.balls[0].vy > 0 && s.balls[0].y + 0.45 >= TRAY_Y);
                i++
            ) {
                const m = s.balls[0];
                seen.push({ x: m.x, y: m.y });
                g.step(s, emptyPad());
                if (s.catches > 0) seen.pop();
            }
            const off = (p: { x: number; y: number }) =>
                Math.min(
                    ...pts.slice(1).map((b, i) => {
                        const a = pts[i] ?? b,
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
            for (const p of seen)
                assert.ok(off(p) < 0.05, `level ${phase} nudge ${nudge}: ${off(p)}`);
        }
});

test("a held arrow speeds the tray up, a tap is a fine step, and a finger leads it without overshooting", () => {
    const s = startKnock(levelOf(0)),
        x0 = s.tray.x;
    play(s, [{ ...emptyPad(), pressed: ["right"], holding: ["right"], held: "right" }]);
    const tap = s.tray.x - x0;
    assert.ok(tap > 0.3 && tap < 0.6, `a tap moves the tray ${tap}`);
    play(s, [
        emptyPad(),
        emptyPad(),
        emptyPad(),
        emptyPad(),
        emptyPad(),
        emptyPad(),
        emptyPad(),
        emptyPad(),
        emptyPad(),
        emptyPad(),
    ]);
    const speeds: number[] = [];
    const left = startKnock(levelOf(0));
    for (let i = 0; i < 20; i++) {
        g.step(left, {
            ...emptyPad(),
            holding: ["left"],
            held: "left",
            pressed: i === 0 ? ["left"] : [],
        });
        speeds.push(-left.tray.v);
    }
    assert.ok(
        speeds.every((v, i) => i === 0 || v >= (speeds[i - 1] ?? 0)),
        "it speeds up while held",
    );
    assert.ok((speeds[19] ?? 0) > 12);
    const f = startKnock(levelOf(0)),
        want = 4,
        at = { x: FIELD_AT.x + want, y: FIELD_AT.y + TRAY_Y + 2 };
    let was = f.tray.x;
    for (let i = 0; i < 60; i++) {
        g.step(f, { ...emptyPad(), touch: at });
        assert.ok(
            f.tray.x <= was + 1e-9 && f.tray.x >= Math.max(want, f.tray.half) - 1e-9,
            "no overshoot",
        );
        was = f.tray.x;
    }
    assert.ok(Math.abs(f.tray.x - Math.max(want, f.tray.half)) < 0.05, "it gets there");
});

test("free play ends won when the balls run out, with the score, and keeps the best", () => {
    const last = KNOCK_LEVELS.length - 1,
        s = g.start(last);
    assert.equal(s.L.ask.kind, "free");
    assert.ok(g.restore?.(s, { best: 40 }));
    s.score = 12;
    s.left = 0;
    play(s, [{ ...emptyPad(), tapped: true }]);
    s.balls = [{ x: 1, y: TRAY_Y + 2, vx: 0, vy: 12, a: 0 }];
    s.tray.x = 18;
    until(s, (k) => k.end !== null);
    assert.equal(s.end, "won");
    assert.match(s.note, /You scored 12\. Your best is 40\./);
    assert.deepEqual(g.checkpoint?.(s), { best: 40 });
    assert.equal(g.restore?.(s, { best: "lots" }), false);
});

test("a round in play is the same after a trip through JSON, and plays on the same", () => {
    const pads = knockWay({ phase: 3, variant: 1 }, "keys") ?? [];
    const s = openKnockConfiguration({ phase: 3, variant: 1 });
    play(s, pads.slice(0, 900));
    const back: unknown = JSON.parse(JSON.stringify(s));
    assert.deepEqual(back, structuredClone(s));
    const a = structuredClone(s),
        b = structuredClone(s);
    for (let i = 0; i < 300; i++) {
        g.step(a, emptyPad());
        g.step(b, emptyPad());
    }
    assert.deepEqual(json(a), json(b));
});

test("the game is not a lesson card, and every frame names only shelf drawings", () => {
    assert.equal(g.card, null);
    for (let level = 0; level < KNOCK_LEVELS.length; level++) {
        const s = g.start(level);
        const frames = [g.frame(s, true)];
        play(s, [{ ...emptyPad(), tapped: true }]);
        for (let i = 0; i < 90; i++) g.step(s, emptyPad());
        frames.push(g.frame(s));
        for (const f of frames)
            for (const sp of f.sprites)
                assert.ok(SHELF_IDS.has(sp.art), `level ${level}: ${sp.art} is not on the shelf`);
    }
});
