import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { notFromField } from "./card-hands";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { faults } from "../../../engine/motion/tune";
import { endOf } from "../game";
import {
    FEED_LEVELS,
    bowlText,
    feedGame as g,
    fits,
    mouthOf,
    startFeed,
    targets,
    type FeedState,
} from "../feedpup";
import {
    FEED_VARIANTS,
    feedMoves,
    feedWay,
    isFeedConfiguration,
    openFeedConfiguration,
    vary,
} from "../feedpup-challenges";

const copy = (p: Pad): Pad => ({ ...p, holding: [...p.holding], pressed: [...p.pressed] });

/** Plays `pads` on a fresh variation, then waits for the round to end, and returns where it ended. */
function play(c: { phase: number; variant: number }, pads: readonly Pad[]): FeedState {
    const s = openFeedConfiguration(c);
    for (const p of pads) g.step(s, copy(p));
    for (let i = 0; i < 60 * 20 && !s.end; i++) g.step(s, emptyPad());
    return s;
}

test("eight to ten levels, through all six places, with every kind of ask and previews that fade", () => {
    assert.ok(FEED_LEVELS.length >= 8 && FEED_LEVELS.length <= 10);
    assert.deepEqual(
        new Set(FEED_LEVELS.map((L) => L.place)),
        new Set(["kitchen", "garden", "playground", "bath", "hill", "treehouse"]),
    );
    assert.deepEqual(
        new Set(FEED_LEVELS.map((L) => L.ask.kind)),
        new Set(["sum", "odd", "count", "missing"]),
    );
    FEED_LEVELS.forEach((L, i) => {
        const before = FEED_LEVELS[i - 1];
        if (before)
            assert.ok(L.preview <= before.preview, `${L.title} shows more than the level before`);
        assert.equal(L.other?.stars.length ?? L.stars.length, L.stars.length, L.title);
    });
    assert.ok((FEED_LEVELS[0]?.preview ?? 0) > 1);
    assert.equal(FEED_LEVELS[FEED_LEVELS.length - 1]?.preview, 0);
    assert.deepEqual(faults(g.tuning ?? {}), []);
});

test("every level and variation is won by the keys and by a finger, and each way replays to the same win", () => {
    for (let phase = 0; phase < FEED_LEVELS.length; phase++)
        for (let variant = 0; variant < FEED_VARIANTS; variant++) {
            const c = { phase, variant },
                name = `level ${phase + 1} variation ${variant}`;
            const moves = feedMoves(c),
                keys = feedWay(c, "keys", moves),
                touch = feedWay(c, "touch", moves);
            assert.ok(keys, `${name}: the solver found no way by the keys`);
            assert.ok(touch, `${name}: no way by a finger`);
            for (const p of keys) {
                assert.equal(p.touch, null, `${name}: the keys touched the field`);
                assert.equal(p.lifted, null);
            }
            for (const p of touch)
                assert.equal(notFromField(g, p), null, `${name}: a finger cannot give that pad`);
            const byKeys = play(c, keys),
                byTouch = play(c, touch);
            assert.equal(byKeys.end, "won", `${name}: the keys did not win: ${byKeys.note}`);
            assert.equal(byTouch.end, "won", `${name}: a finger did not win: ${byTouch.note}`);
            assert.ok(fits(byKeys.L.ask, byKeys.caught));
            assert.deepEqual(
                byKeys.caught,
                byTouch.caught,
                `${name}: the two hands caught different stars`,
            );
            // the replay witness: the same pads on a fresh round end in the same round, to the step
            assert.deepEqual(JSON.stringify(play(c, keys)), JSON.stringify(byKeys));
            assert.deepEqual(JSON.stringify(play(c, touch)), JSON.stringify(byTouch));
        }
});

const random = (seed: number): (() => number) => {
    let t = seed >>> 0;
    return () => {
        t = (Math.imul(t, 1103515245) + 12345) >>> 0;
        return t / 4294967296;
    };
};

/** A child acting at random moments on whatever the arrows land on: a cut, a pop, or a squeeze of any length. */
function randomRound(phase: number, seed: number): FeedState {
    const s = g.start(phase),
        r = random(seed);
    let squeeze = 0;
    for (let i = 0; i < 60 * 15 && !s.end; i++) {
        const p = emptyPad();
        if (squeeze > 0) {
            p.go = true;
            squeeze--;
        } else if (r() < 1 / 45) {
            p.pressed = Array.from({ length: Math.floor(r() * 4) }, () => "right" as const);
            p.go = true;
            p.tapped = true;
            squeeze = Math.floor(r() * 45);
        }
        g.step(s, p);
    }
    return s;
}

test("cutting at random rarely feeds Pip, past the first level", () => {
    let wins = 0,
        rounds = 0;
    for (let phase = 0; phase < FEED_LEVELS.length; phase++) {
        let won = 0;
        for (let seed = 1; seed <= 150; seed++)
            if (randomRound(phase, seed * 7 + phase).end === "won") won++;
        // the first level swings right over Pip, so about a third of each swing lands in the mouth
        const most = phase === 0 ? 0.5 : 0.12;
        assert.ok(won / 150 < most, `level ${phase + 1} won ${won} of 150 at random`);
        wins += won;
        rounds += 150;
    }
    assert.ok(wins / rounds < 0.08, `${wins} of ${rounds} won at random`);
});

test("a round is plain data: it survives JSON and plays on the same from the copy", () => {
    for (let phase = 0; phase < FEED_LEVELS.length; phase++) {
        const s = randomRound(phase, 3);
        const back: unknown = JSON.parse(JSON.stringify(s));
        assert.deepEqual(back, s);
        const a = g.start(phase),
            b = g.start(phase);
        for (let i = 0; i < 40; i++) g.step(a, emptyPad());
        const c = structuredClone(a);
        for (let i = 0; i < 60; i++) {
            const p = { ...emptyPad(), go: i === 5, tapped: i === 5 };
            g.step(a, copy(p));
            g.step(c, copy(p));
        }
        assert.deepEqual(c, a);
        assert.notDeepEqual(b, a);
    }
});

test("a biscuit lost off the field ends the round not won, and stays ended", () => {
    const s = g.start(0);
    g.step(s, { ...emptyPad(), go: true, tapped: true });
    for (let i = 0; i < 300 && !s.end; i++) g.step(s, emptyPad());
    assert.equal(s.end, "fell");
    const end = endOf(g, s);
    assert.deepEqual(end, { won: false, words: "The biscuit fell. Again?" });
    for (let i = 0; i < 120; i++) g.step(s, { ...emptyPad(), go: true, tapped: true });
    assert.deepEqual(endOf(g, s), end);
    assert.equal(g.still.settling?.(s), false);
});

test("Pip turns down the wrong stars and says what the bowl wanted", () => {
    const L = FEED_LEVELS[0];
    assert.ok(L);
    // the biscuit let go straight over Pip, through the other star
    const s = startFeed(
        { ...L, from: { x: L.pip, y: 12 }, stars: [{ x: L.pip, y: 13.4, n: 2 }] },
        0,
    );
    for (let i = 0; i < 60 && !s.end; i++)
        g.step(s, i === 1 ? { ...emptyPad(), go: true, tapped: true } : emptyPad());
    assert.equal(s.end, "refused");
    assert.equal(endOf(g, s)?.won, false);
    assert.match(s.note, new RegExp(`bowl says ${bowlText(L.ask)}, and the stars made 2`));
});

test("Pip opens its mouth as the biscuit falls near and chomps it on a win", () => {
    const c = { phase: 0, variant: 0 },
        way = feedWay(c, "keys");
    assert.ok(way);
    const s = openFeedConfiguration(c),
        poses = new Set<string>();
    const pose = () => {
        const pip = g.frame(s).sprites.find((sp) => sp.key === "pip");
        poses.add(String(pip?.params?.pose));
    };
    for (const p of way) {
        g.step(s, copy(p));
        pose();
    }
    for (let i = 0; i < 200; i++) {
        g.step(s, emptyPad());
        pose();
    }
    assert.equal(s.end, "won");
    for (const p of ["stand", "catch", "chomp", "cheer"]) assert.ok(poses.has(p), `never ${p}`);
    assert.ok(Math.hypot(s.bob.x - mouthOf(s).x, s.bob.y - mouthOf(s).y) < 2);
});

test("a swipe leaves its slash, a choice shows its ring, and the frame names only drawings on the shelf", () => {
    for (let phase = 0; phase < FEED_LEVELS.length; phase++)
        for (let variant = 0; variant < FEED_VARIANTS; variant++) {
            const s = openFeedConfiguration({ phase, variant });
            for (const sp of g.frame(s, true).sprites)
                assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
        }
    const s = g.start(1);
    g.step(s, { ...emptyPad(), pressed: ["right"] });
    assert.ok(g.frame(s).marks.some((m) => m.kind === "ring"));
    g.step(s, { ...emptyPad(), touch: { x: 11.4, y: 1.6 } });
    g.step(s, { ...emptyPad(), touch: { x: 12.6, y: 5.6 } });
    assert.ok(g.frame(s).marks.filter((m) => m.kind === "line" && m.style === "aim").length > 0);
    assert.ok(
        s.ropes.some((r) => r.cut),
        "the swipe did not cut the rope it crossed",
    );
});

test("the keys choose left to right, and a squeeze held longer puffs harder", () => {
    const L = FEED_LEVELS.find((l) => l.puffers.length > 0);
    assert.ok(L);
    const speed = (n: number) => {
        const s = startFeed(L, 0);
        const at = targets(s).findIndex((t) => t.kind === "puffer");
        g.step(s, {
            ...emptyPad(),
            pressed: Array.from({ length: at }, () => "right" as const),
            go: true,
            tapped: true,
        });
        for (let i = 1; i < n; i++) g.step(s, { ...emptyPad(), go: true });
        const before = s.bob.vx;
        g.step(s, emptyPad());
        return s.bob.vx - before;
    };
    assert.ok(speed(40) > speed(5) + 1, `${speed(40)} against ${speed(5)}`);
    const s = g.start(2),
        xs = targets(s).map((t) => (t.kind === "rope" ? (s.ropes[t.i]?.ax ?? 0) : 0));
    assert.deepEqual(
        xs,
        [...xs].sort((a, b) => a - b),
    );
});

test("a variation reads back only as itself, and mirrors and renumbers its level", () => {
    assert.ok(isFeedConfiguration({ phase: 2, variant: 3 }, 2));
    assert.equal(isFeedConfiguration({ phase: 2, variant: 3 }, 1), false);
    assert.equal(isFeedConfiguration({ phase: 2, variant: FEED_VARIANTS }, 2), false);
    assert.equal(isFeedConfiguration({ phase: 2, variant: 1, more: 1 }, 2), false);
    const L = FEED_LEVELS[2];
    assert.ok(L);
    assert.equal(vary(L, 1).pip, 30 - L.pip);
    assert.notDeepEqual(vary(L, 2).ask, L.ask);
    assert.notEqual(vary(L, 2).goal, L.goal);
});

test("a tap on the rope or its peg cuts it on that step, and a swipe that passes near enough cuts it too", () => {
    const at = (s: FeedState, f: number) => {
        const r = s.ropes[0];
        assert.ok(r);
        return { x: r.ax + (s.bob.x - r.ax) * f, y: r.ay + (s.bob.y - r.ay) * f };
    };
    for (const f of [0, 0.5]) {
        const s = g.start(0);
        g.step(s, { ...emptyPad(), touch: { x: at(s, f).x + 0.6, y: at(s, f).y } });
        assert.ok(s.ropes[0]?.cut, `a tap ${f ? "on the rope" : "on the peg"} did not cut it`);
    }
    // from 2.5 squares off the rope's middle to 0.4 short of it, straight towards it
    const s = g.start(0),
        m = at(s, 0.5),
        r = s.ropes[0];
    assert.ok(r);
    const d = Math.hypot(s.bob.x - r.ax, s.bob.y - r.ay),
        n = { x: (s.bob.y - r.ay) / d, y: -(s.bob.x - r.ax) / d };
    g.step(s, { ...emptyPad(), touch: { x: m.x + n.x * 2.5, y: m.y + n.y * 2.5 } });
    assert.equal(r.cut, false);
    g.step(s, { ...emptyPad(), touch: { x: m.x + n.x * 0.4, y: m.y + n.y * 0.4 } });
    assert.ok(s.ropes[0]?.cut, "a swipe a little short of the rope did not cut it");
});

test("the first level's preview goes green while a cut would land in Pip's mouth, and only then", () => {
    const s = g.start(0);
    let green = 0,
        plain = 0;
    for (let i = 0; i < 120; i++) {
        const tone = g.frame(s).marks.find((m) => m.kind === "ring" && m.solid);
        assert.ok(tone, "the landing has no marker");
        const c = structuredClone(s);
        g.step(c, { ...emptyPad(), go: true, tapped: true });
        for (let k = 0; k < 120 && !c.end; k++) g.step(c, emptyPad());
        const lands = c.end === "won" || c.end === "refused";
        assert.equal(tone.kind === "ring" && tone.tone === "ok", lands, `step ${i}`);
        if (lands) green++;
        else plain++;
        g.step(s, emptyPad());
    }
    assert.ok(green > 20 && plain > 20, `${green} green and ${plain} not`);
});

test("a miss bounces on the floor where Pip can see it, and the field rises so the card leaves Pip in sight", () => {
    const s = g.start(0);
    g.step(s, { ...emptyPad(), go: true, tapped: true });
    for (let i = 0; i < 300 && !s.end; i++) g.step(s, emptyPad());
    assert.equal(s.end, "fell");
    const ys: number[] = [];
    for (let i = 0; i < 60; i++) {
        g.step(s, emptyPad());
        ys.push(s.bob.y);
    }
    assert.ok(Math.min(...ys) < (ys[ys.length - 1] ?? 0) - 0.2, "the biscuit never hopped");
    const pip = g.frame(s).sprites.find((sp) => sp.key === "pip");
    assert.equal(pip?.params?.dir, s.bob.x < s.L.pip ? -1 : 1);
    const f = g.frame(s, true);
    assert.ok(f.camera.y > 18, `the camera stays at ${f.camera.y}`);
    assert.ok(f.world.h >= f.camera.y + f.view.h / 2);
});
