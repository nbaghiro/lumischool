// Rabbit crossing: every level has a route of hops to the apple, a rabbit stands only on a stone's
// top, and one in the water swims back to the last stone on its way that still stands.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, spent } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";

/** Steps a rabbit until it sits again or has won. */
async function rabbitRest(s: import("../rabbit").HopState): Promise<void> {
    const R = await import("../rabbit");
    const pad = emptyPad();
    for (let i = 0; i < 60 * 30 && !s.won && s.phase !== "sit"; i++) {
        R.step(s, pad);
        spent(pad);
    }
}

/** A hop played by a finger: press on the rabbit, pull back by `pull` squares, let go, and step until it sits again. */
async function rabbitPull(
    s: import("../rabbit").HopState,
    pull: { x: number; y: number },
): Promise<void> {
    const R = await import("../rabbit");
    const pad = emptyPad(),
        grab = { x: s.at.x, y: s.at.y - 1.2 };
    pad.touch = grab;
    R.step(s, pad);
    spent(pad);
    pad.touch = { x: grab.x + pull.x, y: grab.y + pull.y };
    R.step(s, pad);
    spent(pad);
    pad.lifted = pad.touch;
    pad.touch = null;
    R.step(s, pad);
    spent(pad);
    await rabbitRest(s);
}

test("every rabbit level has a route of hops to the apple, several hops long, and the stones that never sink join every stone to it", async () => {
    const R = await import("../rabbit");
    for (const [level, L] of R.HOP_LEVELS.entries()) {
        const first = L.stones.indexOf(L.start),
            sinks = (i: number) => L.sinking.includes(L.stones[i] ?? NaN);
        assert.ok(
            first >= 0 && L.stones.includes(L.target),
            `${L.title}: the start and the apple are on stones`,
        );
        assert.ok(
            !L.sinking.includes(L.start) &&
                !L.sinking.includes(L.target) &&
                L.sinking.every((n) => L.stones.includes(n)),
        );
        const all = R.hopsTo(L, () => true),
            firm = R.hopsTo(L, (i) => !sinks(i));
        assert.ok(
            (all[first] ?? 0) >= 3 && (all[first] ?? Infinity) < Infinity,
            `${L.title} takes ${all[first]} hops`,
        );
        L.stones.forEach((n, i) =>
            assert.ok(
                sinks(i) || (firm[i] ?? Infinity) < Infinity,
                `${L.title}: no way on from ${n} without a sinking stone`,
            ),
        );
        for (const n of L.stones)
            assert.ok(
                n >= L.from && n <= L.to && R.xOf(L, n) > R.STREAM.x0 && R.xOf(L, n) < R.STREAM.x1,
            );
        // Hopped exactly along a fewest-hops route, the rabbit gets there in that many hops and never gets wet.
        const s = R.start(level);
        while (!s.won && s.hops < 20) {
            const left = R.hopsTo(L, (i) => !s.sunk[i]),
                here = L.stones[s.stone] ?? 0;
            const next = L.stones.findIndex(
                (n, j) =>
                    !s.sunk[j] &&
                    Math.abs(n - here) <= L.most &&
                    left[j] === (left[s.stone] ?? 0) - 1,
            );
            R.hopBy(s, (L.stones[next] ?? 0) - here);
            await rabbitRest(s);
        }
        assert.ok(
            s.won && s.hops === all[first] && s.dips === 0,
            `${L.title}: won ${s.won} in ${s.hops} hops with ${s.dips} dips`,
        );
    }
});

test("a rabbit stands only on a stone's top: firm near the middle, wobbling further out, tipping in past the tip share of its half width, and in the water beyond", async () => {
    const R = await import("../rabbit");
    const firm = R.HOP.firm.value,
        tip = R.HOP.tip.value,
        up = () => true;
    for (const L of R.HOP_LEVELS) {
        const half = R.halfOf(L);
        L.stones.forEach((n, i) => {
            for (const f of [0, 0.3, firm - 0.01, firm + 0.01, tip - 0.01, tip + 0.01, 0.99, 1.01])
                for (const side of [-1, 1]) {
                    const got = R.landingAt(L, R.xOf(L, n) + side * f * half, up),
                        want = f > 1 ? "water" : f <= firm ? "stand" : f <= tip ? "wobble" : "tip";
                    assert.equal(got.kind, want, `${L.title}: ${f} of the way out from ${n}`);
                    if (want !== "water") assert.equal(got.stone, i);
                }
        });
        for (let x = R.STREAM.x0; x <= R.STREAM.x1; x += 0.05) {
            const near = Math.min(...L.stones.map((n) => Math.abs(R.xOf(L, n) - x)));
            assert.equal(
                R.landingAt(L, x, up).kind === "water",
                near > half,
                `${L.title} at ${x.toFixed(2)}`,
            );
        }
    }
    const L0 = R.HOP_LEVELS[0];
    assert.ok(L0);
    const outBy = (f: number) => 5 + (f * R.halfOf(L0)) / R.perOf(L0);
    const wobbly = R.start(0);
    R.hopBy(wobbly, outBy(0.7));
    await rabbitRest(wobbly);
    assert.ok(L0.stones[wobbly.stone] === 5 && wobbly.dips === 0, "a wobble holds");
    const tipped = R.start(0);
    R.hopBy(tipped, outBy(0.9));
    let wobbled = false;
    for (let i = 0; i < 60 * 30 && tipped.phase !== "sit"; i++) {
        R.step(tipped, emptyPad());
        wobbled ||= tipped.phase === "wobble";
    }
    assert.ok(
        wobbled && tipped.dips === 1 && L0.stones[tipped.stone] === 0,
        "a landing past the tip share wobbles, tips in, and the rabbit swims back to 0",
    );
});

test("a sunk stone never holds the rabbit again", async () => {
    const R = await import("../rabbit");
    const s = R.start(2),
        L = s.L,
        at = (n: number) => L.stones.indexOf(n);
    R.hopBy(s, 5);
    await rabbitRest(s);
    R.hopBy(s, 5);
    await rabbitRest(s);
    assert.ok(
        s.sunk[at(5)] && !s.sunk[at(10)] && L.stones[s.stone] === 10,
        "the stone at 5 sank as the rabbit left it",
    );
    assert.equal(R.landingAt(L, R.xOf(L, 5), (i) => !s.sunk[i]).kind, "water");
    R.hopBy(s, -5);
    await rabbitRest(s);
    assert.ok(
        s.dips === 1 && s.sunk[at(10)] && L.stones[s.stone] === 0,
        "back onto a sunk stone is the water, and both stones it came by have sunk",
    );
    const rand = seeded(311);
    for (const level of [2, 4]) {
        const f = R.start(level),
            ever = f.sunk.map(() => false);
        for (let h = 0; h < 60 && !f.won; h++) {
            R.hopBy(f, (rand() * 2 - 1) * f.L.most);
            await rabbitRest(f);
            assert.ok(!f.sunk[f.stone], "the rabbit sits on a standing stone");
            f.sunk.forEach((d, i) => {
                assert.ok(d || !ever[i], `${f.L.stones[i]} came back up`);
                ever[i] = d;
            });
        }
    }
});

test("a rabbit in the water always swims back to the last stone on its way that still stands, and loses nothing but the hop", async () => {
    const R = await import("../rabbit");
    const rand = seeded(2024);
    let wet = 0;
    for (const level of R.HOP_LEVELS.keys()) {
        const s = R.start(level);
        for (let h = 0; h < 40 && !s.won; h++) {
            const path = [...s.path],
                dips = s.dips;
            R.hopBy(s, (rand() * 2 - 1) * s.L.most);
            await rabbitRest(s);
            assert.equal(s.hops, h + 1);
            if (s.dips === dips) continue;
            wet++;
            assert.equal(
                s.stone,
                [...path].reverse().find((i) => !s.sunk[i]),
                `${s.L.title}: swam back to ${s.L.stones[s.stone]}`,
            );
            assert.ok(
                s.phase === "sit" &&
                    Math.abs(s.at.x - R.xOf(s.L, s.L.stones[s.stone] ?? 0)) < 1e-9 &&
                    s.at.y === R.TOP,
            );
        }
    }
    assert.ok(wet > 20, `only ${wet} dips`);
});

test("twelve hops made at random reach the apple at most one time in five, and a pull held at its longest never does", async () => {
    const R = await import("../rabbit");
    const rand = seeded(77);
    for (const [level, L] of R.HOP_LEVELS.entries()) {
        let won = 0;
        const trials = 100;
        for (let t = 0; t < trials; t++) {
            const s = R.start(level);
            for (let h = 0; h < 12 && !s.won; h++) {
                R.hopBy(s, (rand() * 2 - 1) * L.most);
                await rabbitRest(s);
            }
            if (s.won) won++;
        }
        assert.ok(won / trials <= 0.2, `${L.title}: ${won} of ${trials}`);
        const full = R.start(level);
        for (let h = 0; h < 20 && !full.won; h++) {
            R.hopBy(full, Math.sign(L.target - (L.stones[full.stone] ?? 0)) * L.most);
            await rabbitRest(full);
        }
        assert.equal(full.won, false, `${L.title}: the longest hop every time wins`);
    }
});

test("the same pulls give the same crossing", async () => {
    const R = await import("../rabbit");
    const play = async () => {
        const s = R.start(4);
        for (const pull of [
            { x: 3, y: 2 },
            { x: 2.5, y: 2 },
            { x: 4, y: 1 },
            { x: 1.2, y: 1 },
            { x: 3.3, y: 2.4 },
            { x: -2, y: 1.5 },
            { x: 3, y: 3 },
        ])
            await rabbitPull(s, pull);
        return JSON.stringify({
            at: s.at,
            stone: s.stone,
            path: s.path,
            sunk: s.sunk,
            hops: s.hops,
            dips: s.dips,
            steps: s.steps,
            won: s.won,
            said: s.said,
        });
    };
    const a = await play();
    assert.equal(a, await play());
    assert.ok((JSON.parse(a) as { hops: number }).hops >= 3);
});

test("under reduced motion a hop is worked out to rest, a dip and its swim back included", async () => {
    const R = await import("../rabbit");
    const g = R.rabbitGame,
        s = R.start(0),
        pad = emptyPad();
    const press = () => {
        for (let i = 0; i < g.still.press(s); i++) {
            R.step(s, pad);
            spent(pad);
        }
        let n = 0;
        while (g.still.settling?.(s) && n++ < 60 * 30) R.step(s, emptyPad());
    };
    for (let k = 0; k < Math.round(5 / R.keyStepOf(s.L)); k++) {
        pad.pressed.push("right");
        press();
    }
    assert.ok(!g.still.settling?.(s) && s.hops === 0, "setting the hop moves nothing");
    pad.tapped = true;
    press();
    assert.ok(
        s.phase === "sit" && s.L.stones[s.stone] === 5 && !g.still.settling?.(s),
        `after one press the rabbit sits on 5, not ${s.phase} at ${s.L.stones[s.stone]}`,
    );
    for (let k = 0; k < 8; k++) {
        pad.pressed.push("right");
        press();
    }
    pad.tapped = true;
    press();
    assert.ok(
        s.phase === "sit" && s.dips === 1 && s.L.stones[s.stone] === 5,
        "the longest hop from 5 tips in, and one press later the rabbit is back on 5",
    );
});

test("every drawing the rabbit crossing draws is on the shelf, the stones and the swimmer stand by their drawings' own lines, and the camera keeps the rabbit in a view close in", async () => {
    const R = await import("../rabbit");
    const art = {
        ...(await import("../../../engine/parts/outdoors/steppingstone")),
        ...(await import("../../../engine/parts/animals/swimmingrabbit")),
    };
    const known = SHELF_IDS;
    assert.ok(known.has(R.rabbitGame.cover.art));
    assert.ok(
        R.STREAM.view.w <= 34 && R.STREAM.view.w < R.STREAM.world.w,
        "the view is close in, so the field pans",
    );
    const rand = seeded(5),
        seen = new Set<string>();
    for (const level of [0, 2, 4]) {
        const s = R.start(level),
            pad = emptyPad();
        for (let n = 0; n <= 60 * 40; n++) {
            if (s.phase === "sit" && !s.won && n % 90 === 0)
                R.hopBy(s, (rand() * 2 - 1) * s.L.most);
            R.step(s, pad);
            spent(pad);
            if (n % 20 === 0) {
                for (const rest of [false, true]) {
                    const f = R.frame(s, rest);
                    for (const sp of f.sprites) {
                        seen.add(sp.art);
                        assert.ok(
                            known.has(sp.art),
                            `${sp.key} asks for ${sp.art}, which is not on the shelf`,
                        );
                    }
                    assert.ok(
                        Math.abs(f.camera.x - s.at.x) <= f.view.w / 2 - 1 &&
                            f.camera.x >= f.view.w / 2 &&
                            f.camera.x <= f.world.w - f.view.w / 2,
                        `the rabbit is in view and the view is inside the world at step ${n}`,
                    );
                    const stone = f.sprites.find((sp) => sp.key === `stone:${s.stone}`),
                        rabbit = f.sprites.find((sp) => sp.key === "rabbit");
                    if (s.phase === "sit" && stone && rabbit && stone.size !== undefined) {
                        // The stone's box stands with its top where the rabbit's feet are, as the drawing lays the top out.
                        const h = stone.size * (art.STONE.h / 3),
                            top = stone.y - h + art.STONE.top * (stone.size / 3);
                        assert.ok(
                            Math.abs(top - rabbit.y) < 1e-6,
                            `the rabbit's feet are on the stone's top at step ${n}`,
                        );
                        assert.ok(
                            stone.size >= 2.5 && rabbit.size !== undefined && rabbit.size >= 2.5,
                            "the stones and the rabbit are near three squares",
                        );
                    }
                    const swimmer = f.sprites.find((sp) => sp.key === "rabbit:swim");
                    if (swimmer)
                        assert.ok(
                            Math.abs(
                                swimmer.y +
                                    (art.SWIMMER.surface - art.SWIMMER.h / 2) -
                                    (s.at.y - 0.1),
                            ) < 1e-6,
                            "the swimmer floats by its drawing's surface",
                        );
                }
            }
        }
    }
    for (const id of ["steppingstone", "carrot", "swimmingrabbit", "reeds", "rabbits"])
        assert.ok(seen.has(id), `${id} was drawn`);
});

test("a jump clears its aim and its short trail fades away after landing", async () => {
    const R = await import("../rabbit");
    const s = R.start(0);
    s.aim = 3;
    R.hopBy(s, 3);
    assert.equal(s.aim, null);
    for (let i = 0; i < 10; i++) R.step(s, emptyPad());
    assert.ok(s.trail.length > 0);
    assert.ok(s.trail.length <= 6);
    await rabbitRest(s);
    for (let i = 0; i < 20; i++) R.step(s, emptyPad());
    assert.equal(s.trail.length, 0);
    assert.equal(R.rabbitGame.frame(s).marks?.filter((m) => m.kind === "dots").length, 0);
});

test("a quick mouse drag uses the release position and a cancelled grab never jumps", async () => {
    const R = await import("../rabbit");
    const s = R.start(0),
        p = emptyPad();
    const grab = { x: s.at.x, y: s.at.y - 1.2 };
    p.touch = grab;
    R.step(s, p);
    spent(p);
    p.touch = null;
    p.lifted = { x: grab.x - (3 * R.HOP.pull.value) / s.L.most, y: grab.y };
    R.step(s, p);
    assert.equal(s.hops, 1);
    await rabbitRest(s);
    assert.equal(s.L.stones[s.stone], 3);
    const q = emptyPad();
    q.touch = { x: s.at.x, y: s.at.y - 1.2 };
    R.step(s, q);
    assert.equal(s.phase, "held");
    R.rabbitGame.cancelInput?.(s);
    assert.equal(s.phase, "sit");
    assert.equal(s.hops, 1);
});

test("held arrow aiming starts smoothly and ignores arrows while airborne", async () => {
    const R = await import("../rabbit");
    const s = R.start(0),
        p = emptyPad();
    p.pressed = ["right"];
    p.holding = ["right"];
    R.step(s, p);
    spent(p);
    const initial = s.aim ?? 0;
    R.step(s, p);
    assert.ok((s.aim ?? 0) > initial);
    assert.ok((s.aim ?? 0) - initial < R.keyStepOf(s.L));
    R.hopBy(s, 3);
    p.pressed = ["right"];
    R.step(s, p);
    assert.equal(s.aim, null);
});
