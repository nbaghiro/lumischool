// Marble workshop: every level is built and run through the child's own controls, by hand and by
// the keys, random machines rarely make the numbers, and a run repeats itself exactly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import {
    BUDGET,
    FLOOR,
    LENGTH,
    MARBLE,
    MARBLE_LEVELS,
    PLAY,
    marbleCommand,
    marbleGame,
    placed,
    settleAngle,
    startMarbleLevel,
    type MarbleState,
    type PartKind,
} from "../marble";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { faults } from "../../../engine/motion/tune";

/** A part as the keys place it: half squares right and down of the bench's middle, and presses of a turn button. */
type Place = { a: number; b: number; k: number };

/** A machine for each level that fills every cup, one entry for each tray part it uses, in tray order. */
const WITNESSES: Place[][] = [
    [
        { a: -20, b: 0, k: 4 },
        { a: -11, b: 16, k: 7 },
    ],
    [
        { a: -20, b: 5, k: -2 },
        { a: 22, b: 3, k: -9 },
        { a: -23, b: -10, k: -2 },
    ],
    [
        { a: -31, b: -1, k: 7 },
        { a: 35, b: -5, k: 8 },
        { a: 6, b: -7, k: 7 },
        { a: -35, b: -2, k: -1 },
    ],
    [
        { a: -29, b: -2, k: -15 },
        { a: -5, b: -8, k: -1 },
        { a: -33, b: 26, k: -9 },
    ],
    [
        { a: -26, b: -12, k: 10 },
        { a: 29, b: -16, k: -13 },
        { a: 6, b: 12, k: -1 },
        { a: 11, b: -15, k: 5 },
    ],
    [
        { a: 22, b: -18, k: 11 },
        { a: -23, b: 26, k: 3 },
        { a: -20, b: 7, k: -12 },
        { a: -13, b: 7, k: -15 },
        { a: 4, b: -9, k: 9 },
    ],
    [
        { a: 0, b: -14, k: 0 },
        { a: -4, b: 26, k: -14 },
        { a: 6, b: 12, k: 3 },
    ],
    [
        { a: -22, b: -12, k: 0 },
        { a: -14, b: -2, k: 1 },
        { a: 5, b: 2, k: 0 },
    ],
    [
        { a: -29, b: 15, k: 4 },
        { a: -3, b: -3, k: -14 },
        { a: 34, b: 9, k: 6 },
    ],
    [
        { a: -24, b: -10, k: 1 },
        { a: -7, b: -3, k: 0 },
        { a: -2, b: 1, k: 0 },
    ],
];

const kindOf = (id: string): PartKind => {
    const k = id.split(":")[0];
    return k === "short" ||
        k === "long" ||
        k === "bouncer" ||
        k === "funnel" ||
        k === "seesaw" ||
        k === "splitter" ||
        k === "bucket"
        ? k
        : "ramp";
};
const startAngle = (kind: PartKind) =>
    kind === "ramp" || kind === "short" || kind === "long" ? 0.3 : 0;
const angleOf = (kind: PartKind, k: number): number => {
    let v = startAngle(kind);
    for (let i = 0; i < Math.abs(k); i++)
        v = settleAngle(v + (Math.sign(k) * MARBLE.turn.value * Math.PI) / 180);
    return v;
};
const at = (p: Place) => ({
    x: Math.max(1.5, Math.min(PLAY - 1.5, PLAY / 2 + p.a * 0.5)),
    y: Math.max(5.5, Math.min(FLOOR - 1, 14 + p.b * 0.5)),
});

function tick(s: MarbleState, pad: Pad = emptyPad(), n = 1): void {
    for (let i = 0; i < n; i++) {
        marbleGame.step(s, pad);
        spent(pad);
    }
}

/** Presses Go and steps until the run has been judged. */
function run(s: MarbleState): void {
    const pad = emptyPad();
    pad.tapped = true;
    pad.go = true;
    tick(s, pad);
    for (let i = 0; i < 60 * 40 && s.phase === "run"; i++) tick(s);
}

/** Places tray part `i` by hand: dragged from the tray onto the bench, then turned by an end. */
function byHand(s: MarbleState, i: number, p: Place): void {
    const piece = s.build.design.pieces[i];
    assert.ok(piece);
    const sprite = marbleGame.frame(s).sprites.find((x) => x.key === piece.id);
    assert.ok(sprite);
    const to = at(p);
    tick(s, { ...emptyPad(), touch: { x: sprite.x, y: sprite.y } });
    tick(s, { ...emptyPad(), lifted: to });
    const now = s.build.design.pieces[i];
    assert.ok(now && placed(now), `part ${piece.id} went onto the bench`);
    const angle = angleOf(kindOf(piece.id), p.k);
    if (Math.abs(angle - now.angle) < 1e-9) return;
    const h = LENGTH[kindOf(piece.id)] / 2;
    const end = { x: now.x + Math.cos(now.angle) * h, y: now.y + Math.sin(now.angle) * h };
    tick(s, { ...emptyPad(), touch: end });
    tick(s, {
        ...emptyPad(),
        lifted: { x: now.x + Math.cos(angle) * h, y: now.y + Math.sin(angle) * h },
    });
    assert.ok(Math.abs((s.build.design.pieces[i]?.angle ?? 0) - angle) < 1e-9);
}

/** Places tray part `i` with the keys: Next to choose it, the arrows to move it, the turn buttons to turn it. */
function byKeys(s: MarbleState, i: number, p: Place): void {
    const id = s.build.design.pieces[i]?.id;
    for (let n = 0; n < 12 && s.selected !== id; n++) marbleCommand(s, "next");
    assert.equal(s.selected, id);
    const press = (d: "left" | "right" | "up" | "down") => tick(s, { ...emptyPad(), pressed: [d] });
    press("right");
    for (let n = 0; n < Math.abs(p.a); n++) press(p.a < 0 ? "left" : "right");
    for (let n = 0; n < Math.abs(p.b); n++) press(p.b < 0 ? "up" : "down");
    for (let n = 0; n < Math.abs(p.k); n++) marbleCommand(s, p.k < 0 ? "turn-left" : "turn-right");
}

test("every level has a machine that fills its cups, built by hand and built with the keys", () => {
    assert.equal(WITNESSES.length, MARBLE_LEVELS.length);
    MARBLE_LEVELS.forEach((L, level) => {
        for (const how of [byHand, byKeys]) {
            const s = marbleGame.start(level);
            WITNESSES[level]?.forEach((p, i) => how(s, i, p));
            run(s);
            assert.equal(s.phase, "won", `${L.title}, ${how.name}: ${marbleGame.say(s)}`);
            if (!L.chutes.some((c) => c.water))
                assert.deepEqual(
                    s.counts,
                    L.cups.map((c) => c.want),
                );
        }
    });
});

test("random machines rarely make the numbers, and an empty bench never does", () => {
    MARBLE_LEVELS.forEach((L, level) => {
        const rnd = seeded(41 + level),
            ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
        let wins = 0;
        const trials = 15;
        for (let t = 0; t < trials; t++) {
            const s = marbleGame.start(level);
            L.tray.forEach((_, i) =>
                byKeys(s, i, { a: ri(-35, 35), b: ri(-18, 26), k: ri(-16, 16) }),
            );
            run(s);
            if (s.phase === "won") wins++;
        }
        assert.ok(wins / trials <= 0.2, `${L.title}: ${wins} of ${trials}`);
        const bare = marbleGame.start(level);
        run(bare);
        assert.notEqual(bare.phase, "won", `${L.title} is won with nothing built`);
    });
});

test("a run that misses keeps the machine, and Go again or a touch returns to building", () => {
    const s = marbleGame.start(1);
    byHand(s, 0, { a: -20, b: -8, k: 2 });
    const design = JSON.stringify(s.build.design);
    run(s);
    assert.equal(s.phase, "result");
    assert.match(s.text, /Not yet/);
    tick(s, { ...emptyPad(), touch: { x: 5, y: 5 } });
    assert.equal(s.phase, "build");
    assert.equal(JSON.stringify(s.build.design), design);
});

test("a part let go over the tray goes back, and undo puts it out again", () => {
    const s = marbleGame.start(0);
    byHand(s, 0, { a: -20, b: -6, k: 0 });
    const out = { ...s.build.design.pieces[0] };
    const sprite = marbleGame.frame(s).sprites.find((x) => x.key === out.id);
    assert.ok(sprite);
    tick(s, { ...emptyPad(), touch: { x: sprite.x, y: sprite.y } });
    tick(s, { ...emptyPad(), lifted: { x: 43, y: 12 } });
    assert.equal(placed(s.build.design.pieces[0] ?? { x: 99 }), false);
    marbleCommand(s, "undo");
    assert.deepEqual(s.build.design.pieces[0], out);
});

test("the path a marble would take follows the parts on the bench", () => {
    const s = marbleGame.start(0);
    const before = JSON.stringify(s.ghost.paths);
    byHand(s, 0, { a: -26, b: -8, k: 0 });
    assert.notEqual(JSON.stringify(s.ghost.paths), before);
    assert.ok((s.ghost.paths[0]?.length ?? 0) > 5);
});

test("the same machine runs the same way", () => {
    const once = () => {
        const s = marbleGame.start(2);
        WITNESSES[2]?.forEach((p, i) => byKeys(s, i, p));
        run(s);
        return { counts: s.counts, phase: s.phase, steps: s.steps, text: s.text };
    };
    assert.deepEqual(once(), once());
});

test("under reduced motion a press and its settling judge the run as the steps would", () => {
    const normal = marbleGame.start(0),
        reduced = marbleGame.start(0);
    for (const s of [normal, reduced]) WITNESSES[0]?.forEach((p, i) => byKeys(s, i, p));
    run(normal);
    const pad = emptyPad();
    pad.tapped = true;
    pad.go = true;
    for (let i = 0; i < marbleGame.still.press(reduced); i++) tick(reduced, pad);
    pad.go = false;
    for (let i = 0; i < 60 * 40 && marbleGame.still.settling?.(reduced); i++) tick(reduced, pad);
    assert.equal(reduced.phase, normal.phase);
    assert.deepEqual(reduced.counts, normal.counts);
});

test("every drawing is on the shelf, the tuning is sound, and a level stays inside its body budget", () => {
    const seen = new Set<string>([marbleGame.cover.art]);
    MARBLE_LEVELS.forEach((L, level) => {
        const s = startMarbleLevel(L, level);
        for (const sp of marbleGame.frame(s).sprites) seen.add(sp.art);
        const marbles = L.chutes.reduce((n, c) => n + c.n, 0);
        const bodies = marbles + L.tray.length * 2 + L.fixed.length + L.cups.length * 2 + 3;
        assert.ok(bodies <= 150, `${L.title} has ${bodies} bodies`);
        assert.ok(!/[—!]/.test(`${L.goal} ${L.prompt}`));
    });
    for (const art of seen) assert.ok(SHELF_IDS.has(art), `${art} is not on the shelf`);
    assert.deepEqual(faults(MARBLE), []);
    assert.ok(!/[—!]/.test(marbleGame.hint));
});

test("a splitter sends every other marble the other way, and a bucket tips out fives and keeps the rest", () => {
    const half = marbleGame.start(MARBLE_LEVELS.findIndex((L) => L.tray.includes("splitter")));
    byKeys(half, 0, { a: 0, b: -14, k: 0 });
    run(half);
    const world = half.world;
    assert.ok(world);
    const xs = half.marbles.filter((m) => !m.out).map((m) => world.where(m.body).x);
    assert.equal(xs.filter((x) => x < PLAY / 2).length, 6, "half went left");
    const fives = MARBLE_LEVELS.findIndex((L) => L.tray.includes("bucket"));
    const b = marbleGame.start(fives);
    byKeys(b, 0, { a: -22, b: -12, k: 0 });
    run(b);
    const w = b.world;
    assert.ok(w);
    const left = b.marbles.filter((m) => !m.out && w.where(m.body).y < 12).length;
    assert.equal(left, 3, "13 is two fives and 3 left in the bucket");
    assert.ok(MARBLE_LEVELS.every((L) => L.chutes.reduce((n, c) => n + c.n, 0) <= BUDGET));
});
