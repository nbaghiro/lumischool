import assert from "node:assert/strict";
import { test } from "node:test";
import {
    EASE,
    LIMITS,
    MOMENTS,
    POKE,
    PRIMITIVES,
    REST,
    amplitudeAt,
    choose,
    combine,
    gainFor,
    isRest,
    keyframesOf,
    matrixOf,
    momentAt,
    movesOf,
    nextCap,
    onScreen,
    poseOf,
    rigid,
    seedOf,
    spinSettle,
    timing,
    towards,
    transformOf,
    turnedAt,
    type Move,
    type PartMove,
    type Pose,
} from "../animation";

/** How far any corner of a square moves under a whole drawing's pose, in pixels. */
function reach(p: Pose, size = 160, pivot: readonly [number, number] = [0.5, 1]): number {
    const q = onScreen(p, size);
    const [a, b, c, d, e, f] = matrixOf(q, [(q.px ?? pivot[0]) * size, (q.py ?? pivot[1]) * size]);
    let most = 0;
    for (const [x, y] of [
        [0, 0],
        [size, 0],
        [0, size],
        [size, size],
    ] as const) {
        most = Math.max(most, Math.hypot(a * x + c * y + e - x, b * x + d * y + f - y));
    }
    return most;
}

/** How long each moment lasts, in seconds, for finding the time between moments. */
const LENGTH: Partial<Record<string, number>> = {
    hop: 1,
    wiggle: 1.1,
    stir: 1.6,
    blink: 0.56,
    flap: 1.1,
};

test("every motion comes back exactly to the drawing as drawn", () => {
    for (const is of PRIMITIVES) {
        for (let t = 0; t < 20; t += 0.37) {
            assert.ok(
                isRest(towards(poseOf({ is }, t, 11), 0)),
                `${is} at rest amplitude is not the drawing`,
            );
        }
    }
    // between its moments a moment primitive is exactly at rest, and the envelope that settles it ends at nought
    for (const is of MOMENTS) {
        for (let t = 0; t < 40; t += 0.05) {
            if (momentAt(t, 5, timing({ is }, 5).period, LENGTH[is] ?? 2) < 0) {
                assert.ok(
                    isRest(poseOf({ is }, t, 5)),
                    `${is} moves between moments at ${t.toFixed(2)}`,
                );
            }
        }
    }
    assert.equal(amplitudeAt({ from: 0.73, to: 0, at: 2, dur: EASE.settle }, 2 + EASE.settle), 0);
    assert.ok(isRest(onScreen(REST, 160)));
    assert.ok(matrixOf(REST, [30, 40]).every((v, i) => v === [1, 0, 0, 1, 0, 0][i]));
    // a part turns about its own pivot: the pivot does not move
    const [a, b, c, d, e, f] = matrixOf({ ...REST, r: 20, k: 8, sx: 1.1, sy: 0.9 }, [30, 40]);
    assert.ok(
        Math.abs(a * 30 + c * 40 + e - 30) < 1e-9 && Math.abs(b * 30 + d * 40 + f - 40) < 1e-9,
    );
    // a spin coasts to an angle at which it looks as drawn, however far round it was
    for (const turned of [0, 1.3, 7.77, 19.99]) {
        for (const sym of [1, 4, 5, 8]) {
            const env = { from: 1, to: 0, at: 0, dur: spinSettle(turned, 16, sym, 1) };
            const steps = turnedAt(env, turned, env.dur) / (16 / sym);
            assert.ok(
                Math.abs(steps - Math.round(steps)) < 1e-6 && env.dur >= EASE.settle - 1e-9,
                `${turned} with ${sym}-fold symmetry stops at ${steps} steps`,
            );
        }
    }
    // the spin's clock is the integral of the envelope: at full strength it keeps time, and it never runs backwards
    assert.ok(Math.abs(turnedAt({ from: 1, to: 1, at: 0, dur: 0 }, 2, 5) - 7) < 1e-9);
    let last = -1;
    for (let t = 0; t < 3; t += 0.01) {
        const v = turnedAt({ from: 1, to: 0, at: 0, dur: 1.2 }, 0, t);
        assert.ok(v >= last);
        last = v;
    }
});

test("the reading rule takes every turn, lean and change of size out, and every part not marked free", () => {
    const r = rigid({
        body: [
            { is: "sway", deg: 5 },
            { is: "hop", squash: 0.2 },
        ],
        parts: { hand: { is: "spin" }, cloud: { is: "drift", free: true } },
    });
    assert.deepEqual(Object.keys(r.parts ?? {}), ["cloud"]);
    for (const m of movesOf(r)) {
        for (let t = 0; t < 12; t += 0.1) {
            const p = poseOf(m, t, 7);
            assert.ok(
                p.r === 0 && p.k === 0 && p.sx === 1 && p.sy === 1,
                `${m.is} at ${t.toFixed(1)} s`,
            );
        }
    }
});

test("the size rule keeps a small drawing's movement visible and a large one's calm", () => {
    assert.ok(gainFor(40) > 1.4 && gainFor(160) === 1 && gainFor(600) < 0.75);
    const bob = (size: number): number => {
        let most = 0;
        for (let t = 0; t < 4; t += 0.02)
            most = Math.max(most, reach(poseOf({ is: "bob" }, t, 3), size));
        return most;
    };
    assert.ok(
        bob(40) >= 2.5 && bob(600) <= 0.04 * 600,
        `a bob reaches ${bob(40).toFixed(1)} px at 40 and ${bob(600).toFixed(1)} px at 600`,
    );
});

test("on a stage scaled by a camera, the gain follows the size on screen and the cap on travel is screen pixels", () => {
    const big = { x: 0.5, y: 0, r: 0, k: 0, sx: 1, sy: 1, o: 1, px: 0.5, py: 1 };
    const small = { ...big, x: 0.02 };
    // far out, a 160 px drawing is 40 on screen: it moves more of its own pixels than at zoom 1, and its
    // cap is the screen limit in its own pixels, so what reaches the screen is never past the limit
    const far = onScreen(small, 160, false, 0.25),
        near = onScreen(small, 160, false, 1);
    assert.ok(far.x > near.x && Math.abs(far.x - small.x * 160 * gainFor(40)) < 1e-9);
    assert.equal(onScreen(big, 160, false, 0.25).x, LIMITS.px / 0.25);
    assert.equal(onScreen(big, 160, false, 4).x, LIMITS.px / 4);
    // a part's turn takes the gain of its size on screen and no cap on travel
    assert.equal(onScreen({ ...big, x: 0, r: 5 }, 160, true, 0.25).r, 5 * gainFor(40));
    // without a zoom nothing changes
    assert.deepEqual(onScreen(small, 160), onScreen(small, 160, false, 1));
});

test("however lively a site and however small the drawing, nothing passes the limits, flashes or keeps a beat", () => {
    const [smallest, largest] = LIMITS.scale;
    for (let t = 0; t < 10; t += 0.03) {
        for (const is of PRIMITIVES) {
            for (const size of [30, 160, 900]) {
                const p = onScreen(
                    towards(poseOf({ is, deg: 30, lift: 0.5, amt: 0.5, dim: 0.9 }, t, 9), 3),
                    size,
                );
                assert.ok(
                    Math.abs(p.r) <= LIMITS.bodyDeg &&
                        Math.abs(p.k) <= LIMITS.bodyDeg &&
                        Math.abs(p.x) <= LIMITS.px &&
                        Math.abs(p.y) <= LIMITS.px &&
                        p.o >= LIMITS.opacity,
                    `${is} at ${size}`,
                );
                assert.ok(
                    p.sx >= smallest && p.sx <= largest && p.sy >= smallest && p.sy <= largest,
                    `${is} at ${size} grows past the limit`,
                );
            }
        }
    }
    // moments come irregularly: never on a beat, which is what would read as a timer
    for (const is of MOMENTS) {
        for (const seed of [1, 99, 12345]) {
            const starts: number[] = [];
            let was = false;
            for (let t = 0; t < 120; t += 0.01) {
                const now = momentAt(t, seed, timing({ is }, seed).period, 0.5) >= 0;
                if (now && !was) starts.push(t);
                was = now;
            }
            const gaps = starts.slice(1).map((s, i) => s - (starts[i] ?? 0));
            assert.ok(
                gaps.length > 15 && Math.max(...gaps) / Math.min(...gaps) > 1.5,
                `${is} keeps a beat for seed ${seed}`,
            );
            assert.ok((starts[0] ?? 9) < 2, `${is} waits ${starts[0]} s for its first moment`);
        }
    }
});

test("a given seed moves the same way every time, and a row of the same drawing never moves in step", () => {
    for (const is of PRIMITIVES) {
        const a = Array.from({ length: 200 }, (_, k) =>
            poseOf({ is }, k * 0.05, seedOf("rabbits", 2)),
        );
        const b = Array.from({ length: 200 }, (_, k) =>
            poseOf({ is }, k * 0.05, seedOf("rabbits", 2)),
        );
        assert.deepEqual(a, b, `${is} is not deterministic`);
        if (is === "spin") continue;
        const row = [0, 1, 2, 3, 4].map((key) =>
            Array.from({ length: 300 }, (_, k) => poseOf({ is }, k * 0.04, seedOf("rabbits", key))),
        );
        for (let i = 0; i < row.length; i++) {
            for (let j = i + 1; j < row.length; j++) {
                const same = (row[i] ?? []).every(
                    (p, k) => JSON.stringify(p) === JSON.stringify(row[j]?.[k]),
                );
                assert.ok(!same, `${is}: rabbits ${i} and ${j} move in step`);
            }
        }
    }
});

test("the frame budget gives way when frames cost too much and takes back slowly", () => {
    const o = { min: 6, max: 64, ms: 4 };
    assert.equal(nextCap(48, 6, 0, o), 36, "over budget, a quarter settle");
    assert.equal(nextCap(48, 1, 0.4, o), 36, "late frames count, though our own work was cheap");
    assert.equal(nextCap(48, 1, 0, o), 49, "comfortably under, one more wakes");
    assert.equal(nextCap(6, 50, 1, o), 6, "never below the floor");
    assert.equal(nextCap(64, 0.5, 0, o), 64, "never above the ceiling");
    const picked = choose(
        [
            { key: "a", weight: 0.5, moving: false },
            { key: "b", weight: 0.45, moving: true },
            { key: "c", weight: 0.1, moving: false },
        ],
        1,
    );
    assert.deepEqual(
        [...picked],
        ["b"],
        "one already moving keeps its place against a slightly bigger newcomer",
    );
});

/** Where a CSS matrix puts a point. */
function apply(transform: string | undefined, x: number, y: number): [number, number] {
    const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = (transform ?? "")
        .replace(/^matrix\(|\)$/g, "")
        .split(", ")
        .map(Number);
    return [a * x + c * y + e, b * x + d * y + f];
}

test("a whole drawing's pose as a matrix turns, leans and grows about its pivot, and travels by the pose", () => {
    assert.equal(transformOf({ ...REST }, 120, 80), "matrix(1, 0, 0, 1, 0, 0)");
    const bent = { ...REST, r: 5, k: 2, sx: 1.1, sy: 0.9 };
    const [px, py] = apply(transformOf(bent, 120, 80, [0.5, 1]), 60, 80);
    assert.ok(
        Math.abs(px - 60) < 1e-3 && Math.abs(py - 80) < 1e-3,
        `the pivot moved to ${px}, ${py}`,
    );
    const [mx, my] = apply(
        transformOf({ ...bent, x: 3, y: -2, px: 0.25, py: 0.5 }, 120, 80),
        30,
        40,
    );
    assert.ok(
        Math.abs(mx - 33) < 1e-3 && Math.abs(my - 38) < 1e-3,
        `a pose's own pivot moved to ${mx}, ${my}`,
    );
});

test("a whole drawing's keyframes are its poses as the page drew them, and each cycle ends where it began", () => {
    const cases: [Move[], "loop" | "long"][] = [
        [[{ is: "bob" }], "loop"],
        [[{ is: "breathe", pivot: [0.5, 1] }], "loop"],
        [[{ is: "twinkle", dim: 0.3 }], "loop"],
        [[{ is: "float", lift: 0.04, deg: 3 }], "long"],
        [[{ is: "idle" }], "long"],
        [[{ is: "hop" }, { is: "sway", deg: 2 }], "long"],
    ];
    for (const [moves, kind] of cases) {
        const name = moves.map((m) => m.is).join("+");
        const { duration, frames } = keyframesOf(moves, {
            seed: 7,
            w: 120,
            h: 80,
            level: 1,
            rate: 20,
        });
        const [only] = moves;
        assert.equal(duration, kind === "loop" && only ? timing(only, 7).period : 60, name);
        assert.equal(
            frames[0]?.transform,
            frames.at(-1)?.transform,
            `${name} jumps at the end of its cycle`,
        );
        assert.equal(frames.at(-1)?.offset, 1, name);
        assert.equal(
            frames.some((f) => f.opacity !== undefined),
            name === "twinkle",
            `${name} and opacity`,
        );
        // away from the seam, a keyframe is exactly what the player drew at that moment
        for (const i of [1, Math.floor(frames.length / 3), Math.floor(frames.length / 2)]) {
            const t = (frames[i]?.offset ?? 0) * duration;
            let raw: Pose = { ...REST };
            for (const m of moves) raw = combine(raw, poseOf(m, t, 7));
            const want = transformOf(
                onScreen(towards(raw, 1), 120),
                120,
                80,
                only?.pivot ?? [0.5, 1],
            );
            assert.equal(frames[i]?.transform, want, `${name} at ${t.toFixed(2)} s`);
        }
    }
});

test("keyframes turn, grow and fade no further than the limits, however lively the site", () => {
    const [smallest, largest] = LIMITS.scale;
    for (const is of PRIMITIVES) {
        if (is === "spin") continue;
        const moves: Move[] = [{ is, deg: 30, lift: 0.5, amt: 0.5, dim: 0.9 }];
        for (const [w, h] of [
            [30, 30],
            [400, 160],
        ] as const) {
            const { frames } = keyframesOf(moves, { seed: 3, w, h, level: 3, rate: 10 });
            for (const f of frames) {
                const [a = 1, b = 0] = f.transform
                    .replace(/^matrix\(|\)$/g, "")
                    .split(", ")
                    .map(Number);
                const turn = (Math.atan2(b, a) * 180) / Math.PI;
                const grown = Math.hypot(a, b);
                assert.ok(Math.abs(turn) <= LIMITS.bodyDeg + 0.01, `${is} at ${w} turns ${turn}`);
                assert.ok(
                    grown >= smallest - 1e-3 && grown <= largest + 1e-3,
                    `${is} at ${w} grows to ${grown}`,
                );
                assert.ok((f.opacity ?? 1) >= LIMITS.opacity, `${is} fades to ${f.opacity}`);
            }
        }
    }
});

test("a wake starts at rest and a poke dies away, and each ends on the pose where the cycle takes over", () => {
    const o = { seed: 11, w: 100, h: 100, level: 1, rate: 20 };
    const float: Move[] = [{ is: "float", lift: 0.04, deg: 3 }];
    const wake = keyframesOf(float, { ...o, window: { at: 70, dur: 0.8, from: 0 } });
    assert.equal(wake.frames[0]?.transform, "matrix(1, 0, 0, 1, 0, 0)");
    const after = keyframesOf(float, { ...o, window: { at: 70.8, dur: 1, from: 1 } });
    assert.equal(wake.frames.at(-1)?.transform, after.frames[0]?.transform);
    // 70.8 s on the drawing's clock is 10.8 s into its minute-long cycle
    const loop = keyframesOf(float, o);
    const k = Math.round((10.8 / loop.duration) * (loop.frames.length - 1));
    assert.equal(loop.frames[k]?.transform, after.frames[0]?.transform);
    const hop: Move[] = [{ is: "hop" }];
    const poke = keyframesOf(hop, { ...o, window: { at: 5, dur: POKE, from: 1, poked: 5 } });
    const next = keyframesOf(hop, { ...o, window: { at: 5 + POKE, dur: 1, from: 1 } });
    assert.equal(poke.frames.at(-1)?.transform, next.frames[0]?.transform);
    assert.notEqual(
        poke.frames[8]?.transform,
        "matrix(1, 0, 0, 1, 0, 0)",
        "a poke's moment comes at once",
    );
});

test("a part's keyframes are its matrix inside the drawing as the page drew it, mirrored and trailing in a wave", () => {
    const wing: PartMove = { is: "sway", deg: 9 };
    for (const place of [
        { pivot: [40, 30], dir: 1, lag: 0 },
        { pivot: [90, 30], dir: -1, lag: 0.42 },
    ] as const) {
        const o = { seed: 5, w: 130, h: 60, level: 1, rate: 20, part: place };
        const { duration, frames } = keyframesOf([wing], o);
        assert.equal(frames[0]?.transform, frames.at(-1)?.transform);
        for (const i of [3, Math.floor(frames.length / 2)]) {
            const t = (frames[i]?.offset ?? 0) * duration;
            const q = onScreen(
                towards(poseOf(wing, t - place.lag, 5, "normal", t - place.lag), 1),
                130,
                true,
            );
            const drawn = place.dir < 0 ? { ...q, r: -q.r } : q;
            const want = matrixOf(drawn, [place.pivot[0], place.pivot[1]]).map((v) =>
                Math.abs(v) < 5e-5 ? "0" : String(Math.round(v * 1e4) / 1e4),
            );
            assert.equal(
                frames[i]?.transform,
                `matrix(${want.join(", ")})`,
                `dir ${place.dir} at ${t.toFixed(2)} s`,
            );
        }
    }
});
