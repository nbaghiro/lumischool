import assert from "node:assert/strict";
import { test } from "node:test";
import { atRest, followedBy, jumps, mismatches, poseAt, score } from "../beat";
import type { Scene } from "../scene";

const SPOUT = { x: 1.9, y: 1.8 };

/** Two jugs on a bench, the first holding `a` and the second `b`, as a pour's scene before and after. */
const bench = (a: number, b: number, x = 0): Scene => ({
    parts: [
        { art: "jug", key: "a", at: { x, y: 0 }, params: { max: 5, level: a }, pivot: SPOUT },
        { art: "jug", key: "b", at: { x: 12, y: 0 }, params: { max: 3, level: b }, pivot: SPOUT },
    ],
});

test("a beat starts on the scene before it, ends exactly on the scene after, and keeps a pour's water", () => {
    const was = bench(5, 0),
        now = bench(2, 3);
    const s = score();
    const over = { x: 12, y: -3 };
    let t = s.lob("a", 0, { x: 0, y: 0 }, over, 2);
    t = s.track("a", "angle", t, 0, -0.8, { ease: "inOut" }, 0.3);
    const pour = { flow: { rate: 4, ramp: 0.12 } } as const;
    s.track("a", "param:level", t, 5, 2, pour);
    const poured = s.track("b", "param:level", t, 0, 3, pour);
    const upright = s.track("a", "angle", poured, -0.8, 0, { ease: "inOut" }, 0.3);
    const hits = s.drop("a", upright, over, { x: 0, y: 0 });
    s.squash("a", hits[0] ?? upright, 0.1);
    s.cue(0, "lift");
    s.burst(t, "splash", 13, 2, 6);
    const beat = s.beat();
    assert.deepEqual(mismatches(beat, now), []);
    assert.deepEqual(jumps(beat, now, was), []);
    for (let u = 0; u <= beat.length; u += 0.01) {
        const p = poseAt(beat, now, u);
        assert.ok(
            Math.abs(Number(p.get("a")?.params.level) + Number(p.get("b")?.params.level) - 5) <
                1e-9,
            `the water is kept at ${u}`,
        );
    }
    assert.ok(
        (poseAt(beat, now, t + 0.1).get("a")?.angle ?? 0) < -0.5,
        "it is tipped while it pours",
    );
    assert.ok(
        hits.length >= 2 && (hits.at(-1) ?? 0) <= beat.length,
        "it bounces when it comes down",
    );
});

test("a part that moves with nothing to move it is caught, and a part that leaves without a beat of its own vanishes", () => {
    const was = bench(5, 0),
        now = bench(5, 0, 4);
    const s = score();
    s.cue(0.4, "place");
    s.set("b", 0, { level: 0 });
    const beat = s.beat();
    assert.ok(
        jumps(beat, now, was).some((m) => m.startsWith("a: x")),
        "a part that moved with no track jumps",
    );
    assert.ok(
        jumps(beat, bench(5, 0), {
            parts: [...was.parts, { art: "ball", key: "gone", params: {} }],
        }).includes("gone vanishes"),
    );
});

test("mismatches names every part whose pose at the end is not the scene's", () => {
    const now = bench(2, 3);
    const s = score();
    // the pour stops a square short of the jug's place and leaves it a turn out of true
    s.track("a", "x", 0, 0, 1, { ease: "out" }, 0.2);
    s.track("a", "angle", 0, 0, 0.5, { ease: "out" }, 0.2);
    s.track("b", "param:level", 0, 0, 3, { ease: "out" }, 0.2);
    const wrong = mismatches(s.beat(), now);
    assert.deepEqual(wrong, ["a: x is 1, not 0", "a: angle is 0.5, not 0"]);
    const right = score();
    right.track("a", "x", 0, 1, 0, { ease: "out" }, 0.2);
    right.track("b", "param:level", 0, 0, 3, { ease: "out" }, 0.2);
    assert.deepEqual(mismatches(right.beat(), now), []);
});

test("under reduced motion a beat is its sounds, all at once, and nothing that moves", () => {
    const s = score();
    s.track("a", "x", 0, 0, 6, { ease: "out" }, 0.4);
    s.set("b", 0.1, { level: 2 });
    s.mark(0, 0.5, [{ kind: "ring", x: 1, y: 1, r: 1 }]);
    s.burst(0.2, "splash", 3, 3, 6);
    s.extra({ art: "drop", key: "spill", params: {} });
    s.cue(0.4, "place");
    s.cue(0.6, "win");
    const rest = atRest(s.beat());
    assert.deepEqual(
        [
            rest.tracks.length,
            rest.sets.length,
            rest.extra.length,
            rest.bursts.length,
            rest.marks.length,
            rest.length,
        ],
        [0, 0, 0, 0, 0, 0],
    );
    assert.deepEqual(rest.cues, [
        { at: 0, cue: "place" },
        { at: 0, cue: "win" },
    ]);
    // With nothing left to play, the scene after the move is what the board shows.
    assert.deepEqual(mismatches(rest, bench(2, 3)), []);
});

test("a finish plays after its move, and the two together still end on the scene", () => {
    const now = bench(2, 3);
    const move = score();
    move.track("b", "param:level", 0, 0, 3, { ease: "out" }, 0.5);
    const finish = score();
    const up = finish.track("b", "y", 0, 0, -1, { ease: "out" }, 0.2);
    finish.drop("b", up, { x: 12, y: -1 }, { x: 12, y: 0 });
    finish.cue(0, "ring");
    const both = followedBy(move.beat(), finish.beat());
    assert.equal(both.cues[0]?.at, 0.5);
    assert.deepEqual(mismatches(both, now), []);
    assert.equal(poseAt(both, now, 0.25).get("b")?.y, 0, "the hop waits for the pour");
    assert.ok(Number(poseAt(both, now, 0.25).get("b")?.params.level) < 3);
});
