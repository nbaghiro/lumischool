// Bridge builder: every variation of every level is built and crossed by dragging, by a chain of taps
// and by the keys, a try replays to the same bridge from its tape, a bridge laid at random rarely gets the pups over,
// a round that ends without a win says why, and a built bridge is kept and put back.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { endOf } from "../game";
import {
    BRIDGE_LEVELS,
    FREE,
    VARIANTS,
    bridgeGame,
    coins,
    startBridge,
    type BridgeState,
    type Seg,
} from "../bridgebuild";
import {
    bridgeCertified,
    buildByKeys,
    buildByTaps,
    buildByTouch,
    drag,
    openBridgeConfiguration,
    pick,
    press,
    runIt,
    tap,
} from "../bridgebuild-challenges";

const random = (seed: number): (() => number) => {
    let t = seed >>> 0;
    return () => {
        t = (Math.imul(t, 1103515245) + 12345) >>> 0;
        return t / 4294967296;
    };
};

/** Plays a tape of pads on a fresh start of a level, as the page's replay does. */
function replay(phase: number, variant: number, tape: readonly Pad[]): BridgeState {
    const s = openBridgeConfiguration({ phase, variant });
    for (const p of tape) bridgeGame.step(s, structuredClone(p));
    return s;
}

test("there are eight to ten levels, each with variations, and the last is the free build that is kept", () => {
    assert.ok(BRIDGE_LEVELS.length >= 8 && BRIDGE_LEVELS.length <= 10);
    assert.equal(FREE, BRIDGE_LEVELS.length - 1);
    assert.deepEqual(bridgeGame.saves, { level: FREE });
    for (const v of VARIANTS) assert.ok(v.length >= 2);
});

test("every variation is built and crossed by dragging, by a chain of taps and by the keys", () => {
    for (const [phase, vs] of VARIANTS.entries())
        for (const variant of vs.keys())
            assert.ok(bridgeCertified({ phase, variant }), `level ${phase} variation ${variant}`);
});

test("a try by dragging, by taps and by the keys each replay from their tape to the same crossing", () => {
    for (const [phase, vs] of VARIANTS.entries())
        for (const [variant, L] of vs.entries()) {
            for (const [how, build] of [
                ["dragging", buildByTouch],
                ["taps", buildByTaps],
            ] as const) {
                const touch: Pad[] = [],
                    s = openBridgeConfiguration({ phase, variant });
                assert.ok(build(s, L.plan, touch) && runIt(s, touch));
                const again = replay(phase, variant, touch);
                assert.deepEqual(again, s, `level ${phase} variation ${variant} by ${how}`);
                assert.equal(endOf(bridgeGame, again)?.won, true);
            }
            // the keys go through the game's commands, which a tape of pads does not hold, so the
            // witness is the keys pressed, played again
            const keys: string[] = [],
                k = openBridgeConfiguration({ phase, variant });
            assert.ok(buildByKeys(k, L.plan, undefined, keys) && runIt(k));
            const byKeys = openBridgeConfiguration({ phase, variant });
            for (const key of keys) press(byKeys, key);
            assert.ok(runIt(byKeys));
            assert.deepEqual(byKeys, k, `level ${phase} variation ${variant} by the keys`);
        }
});

test("a bridge laid at random rarely gets the pups over", () => {
    const r = random(17);
    let tries = 0,
        wins = 0;
    for (const [phase, vs] of VARIANTS.entries())
        for (const variant of vs.keys())
            for (let n = 0; n < 6; n++) {
                const s = openBridgeConfiguration({ phase, variant });
                const beams = 2 + Math.floor(r() * 7);
                for (let k = 0; k < beams * 3 && s.design.length < beams; k++) {
                    const joints = [s.L.near, s.L.far, ...s.L.pegs, ...s.design.map((d) => d.b)];
                    const from = joints[Math.floor(r() * joints.length)];
                    if (!from) continue;
                    const m = (["wood", "road", "rope"] as const)[Math.floor(r() * 3)] ?? "wood";
                    if (s.pen !== m) pick(s, m);
                    drag(s, from, { x: from.x + r() * 9 - 4.5, y: from.y + r() * 9 - 4.5 });
                }
                tries++;
                if (runIt(s)) wins++;
            }
    assert.ok(wins / tries < 0.1, `${wins} of ${tries} random bridges crossed`);
});

test("the state is plain data, the same after a trip through JSON, building and crossing", () => {
    const L = VARIANTS[7]?.[0];
    assert.ok(L);
    const s = startBridge(L, 7);
    buildByTouch(s, L.plan.slice(0, 4));
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
    const go = emptyPad();
    go.tapped = true;
    bridgeGame.step(s, go);
    for (let k = 0; k < 200; k++) bridgeGame.step(s, emptyPad());
    assert.equal(s.phase, "run");
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});

test("a bridge that breaks ends the round unwon and says where, and Go goes back to the bridge as built", () => {
    // the squares as the level opens, with no beam across them
    const s = openBridgeConfiguration({ phase: 2, variant: 0 });
    const built = structuredClone(s.design);
    assert.equal(runIt(s), false);
    const end = endOf(bridgeGame, s);
    assert.equal(end?.won, false);
    assert.match(
        end?.words ?? "",
        /^The bridge broke (near this bank|in the middle|near the far bank)\. Add a triangle\?$/,
    );
    const go = emptyPad();
    go.tapped = true;
    bridgeGame.step(s, go);
    assert.equal(s.phase, "build");
    assert.equal(endOf(bridgeGame, s), null);
    assert.deepEqual(s.design, built);
});

test("a road with a gap, a bridge over budget and the wrong count of beams each end unwon with their reason", () => {
    const gap = openBridgeConfiguration({ phase: 1, variant: 0 });
    buildByTouch(gap, [{ a: { x: 14, y: 14 }, b: { x: 17, y: 14 }, m: "road" }]);
    assert.equal(runIt(gap), false);
    assert.match(gap.end?.words ?? "", /gap in the road/);

    const L3 = VARIANTS[3]?.[0];
    assert.ok(L3);
    const dear = startBridge(L3, 3);
    const extra: Seg[] = [{ a: { x: 17, y: 14 }, b: { x: 17, y: 10 }, m: "wood" }];
    buildByTouch(dear, [...L3.plan, ...extra]);
    assert.ok(coins(dear.design) > (L3.budget ?? 0));
    assert.equal(runIt(dear), false);
    assert.match(dear.end?.words ?? "", /cost \d+ coins\. Can you build one for 20 or less\?/);

    const L6 = VARIANTS[6]?.[0];
    assert.ok(L6);
    const seven = startBridge(L6, 6);
    buildByTouch(seven, [...L6.plan, { a: { x: 17, y: 12 }, b: { x: 20, y: 12 }, m: "rope" }]);
    assert.equal(seven.design.length, 7);
    assert.equal(runIt(seven), false);
    assert.match(seven.end?.words ?? "", /on 7 beams\. Can you build a bridge with exactly 6\?/);
});

test("a tap changes a beam's material, a hold, a drag away or a right click takes it away, and Backspace takes it back", () => {
    const s = openBridgeConfiguration({ phase: 0, variant: 0 });
    buildByTouch(s, [{ a: { x: 14, y: 14 }, b: { x: 18, y: 14 }, m: "road" }]);
    tap(s, { x: 16, y: 14 });
    assert.equal(s.design[0]?.m, "rope");
    tap(s, { x: 16, y: 14 });
    assert.equal(s.design[0]?.m, "wood");
    drag(s, { x: 16, y: 14 }, { x: 16, y: 10 });
    assert.equal(s.design.length, 0);
    assert.equal(bridgeGame.back?.(s), true);
    assert.equal(s.design[0]?.m, "wood");
    const hold = emptyPad();
    hold.touch = { x: 16, y: 14 };
    for (let k = 0; k < 40; k++) bridgeGame.step(s, { ...hold, touch: { x: 16, y: 14 } });
    assert.equal(s.design.length, 0);
    bridgeGame.step(s, { ...emptyPad(), lifted: { x: 16, y: 14 } });
    assert.equal(s.design.length, 0);
    assert.equal(bridgeGame.back?.(s), true);
    bridgeGame.step(s, { ...emptyPad(), aside: { x: 16.2, y: 14.1 } });
    assert.equal(s.design.length, 0);
    assert.equal(bridgeGame.back?.(s), true);
    assert.equal(s.design.length, 1);
});

test("a tapped joint is armed, each tap after lays the next beam of a chain, and a tap on its end stops it", () => {
    const s = openBridgeConfiguration({ phase: 1, variant: 0 });
    tap(s, { x: 14.6, y: 13.3 });
    assert.deepEqual(s.armed, { x: 14, y: 14 });
    tap(s, { x: 17.2, y: 13.9 });
    assert.equal(s.design.length, 1);
    assert.deepEqual(s.design[0], { a: { x: 14, y: 14 }, b: { x: 17, y: 14 }, m: "road" });
    assert.deepEqual(s.armed, { x: 17, y: 14 });
    tap(s, { x: 20, y: 14 });
    assert.equal(s.design.length, 2);
    assert.deepEqual(s.armed, { x: 20, y: 14 });
    // a beam the rules refuse is not laid, and the chain waits where it was
    tap(s, { x: 21, y: 15 });
    assert.equal(s.design.length, 2);
    assert.deepEqual(s.armed, { x: 20, y: 14 });
    tap(s, { x: 20, y: 14 });
    assert.equal(s.armed, null);
    // a tap far past the reach stops a chain too
    tap(s, { x: 14, y: 14 });
    assert.ok(s.armed);
    tap(s, { x: 14, y: 3 });
    assert.equal(s.armed, null);
    assert.equal(s.design.length, 2);
});

test("the build is framed large, and the camera zooms out to follow the car after Go", () => {
    const s = openBridgeConfiguration({ phase: 0, variant: 0 });
    assert.ok(s.cam.zoom > 1.3, `zoom ${s.cam.zoom}`);
    buildByTouch(s, s.L.plan);
    const go = emptyPad();
    go.tapped = true;
    bridgeGame.step(s, go);
    let last = s.cam.zoom;
    for (let k = 0; k < 120; k++) {
        bridgeGame.step(s, emptyPad());
        assert.ok(s.cam.zoom <= last + 1e-9);
        last = s.cam.zoom;
    }
    assert.ok(last < 1.1, `zoom ${last}`);
});

test("Again on the round's card keeps the bridge, and Clear bridge takes the child's beams away", () => {
    assert.equal(bridgeGame.againKeeps, true);
    const L = VARIANTS[1]?.[0];
    assert.ok(L);
    const s = startBridge(L, 1);
    buildByTouch(s, L.plan);
    assert.ok(runIt(s));
    assert.equal(bridgeGame.shows?.(s, "clear"), true);
    const fresh = startBridge(L, 1);
    assert.equal(bridgeGame.restore?.(fresh, bridgeGame.checkpoint?.(s)), true);
    assert.deepEqual(fresh.design, s.design);
    bridgeGame.command?.(s, "clear");
    assert.equal(s.phase, "build");
    assert.equal(s.design.length, 0);
    assert.equal(bridgeGame.back?.(s), true);
    assert.equal(s.design.length, L.plan.length);
});

test("the material and remove buttons show only while a beam or a joint is chosen", () => {
    const s = openBridgeConfiguration({ phase: 0, variant: 0 });
    assert.equal(bridgeGame.shows?.(s, "material"), false);
    assert.equal(bridgeGame.shows?.(s, "remove"), false);
    tap(s, { x: 14, y: 14 });
    assert.equal(bridgeGame.shows?.(s, "material"), true);
    tap(s, { x: 18, y: 14 });
    assert.equal(bridgeGame.shows?.(s, "remove"), true);
    tap(s, { x: 18, y: 14 });
    tap(s, { x: 8, y: 6 });
    assert.equal(bridgeGame.shows?.(s, "material"), false);
    assert.equal(bridgeGame.shows?.(s, "remove"), false);
});

test("a beam too long, in the ground or through the boat's room is not laid, and says why", () => {
    const s = openBridgeConfiguration({ phase: 4, variant: 0 });
    drag(s, { x: 14, y: 14 }, { x: 15, y: 17 });
    assert.equal(s.design.length, 0);
    assert.match(s.text, /boat|ground/);
    press(s, "join");
    for (let k = 0; k < 6; k++) press(s, "right");
    press(s, "join");
    assert.equal(s.design.length, 0);
    assert.match(s.text, /^Too long/);
});

test("a built bridge is kept and put back, and what is not one is refused", () => {
    const L = VARIANTS[FREE]?.[0];
    assert.ok(L);
    const s = startBridge(L, FREE);
    buildByTouch(s, L.plan);
    const kept: unknown = JSON.parse(JSON.stringify(bridgeGame.checkpoint?.(s)));
    const fresh = startBridge(L, FREE);
    assert.equal(bridgeGame.restore?.(fresh, kept), true);
    assert.deepEqual(fresh.design, s.design);
    assert.ok(runIt(fresh));
    const other = startBridge(L, FREE);
    for (const junk of [
        null,
        3,
        { beams: "x" },
        { beams: [{ a: { x: 0, y: 0 }, b: 1, m: "wood" }] },
    ])
        assert.equal(bridgeGame.restore?.(other, junk), false);
    // a beam that starts from nothing already standing is not laid back
    const floating = { beams: [{ a: { x: 18, y: 10 }, b: { x: 20, y: 10 }, m: "wood" }] };
    assert.equal(bridgeGame.restore?.(other, floating), false);
});

test("under reduced motion one press of Go runs the crossing to its end", () => {
    const L = VARIANTS[0]?.[0];
    assert.ok(L);
    const s = startBridge(L, 0);
    buildByTouch(s, L.plan);
    const go = emptyPad();
    go.tapped = true;
    bridgeGame.step(s, go);
    for (let i = 0; i < 60 * 30 && bridgeGame.still.settling?.(s); i++)
        bridgeGame.step(s, emptyPad());
    assert.equal(s.end?.won, true);
});
