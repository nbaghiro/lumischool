// The jets fire only past the top of a jump and hold the fall to a slow sink, for their fuel and no
// longer; landing fills them again; and a planet's pull keeps the launch speed, so the same jump goes
// 6 squares on the moon, 4 on Earth and 2 on a heavy world, the same every time. A flyer's thrust
// follows the hand over a moment, heats the jets past the cruise share until they sputter, cools
// under it, and a moon's pull bends its path; the same hands fly the same way every time.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    flyer,
    hoverMoves,
    hoverShare,
    jets,
    onPlanet,
    pullAt,
    stepFlyer,
    stepJets,
    type FlySpec,
    type JetSpec,
} from "../jets";
import { grounded, runner, stepRunner, type Course, type Moves, type Runner } from "../walker";

const DT = 1 / 60;
const SPEC: JetSpec = { seconds: 1.2, sink: 0.9, brake: 70, drift: 4.5 };
const EARTH: Moves = {
    speed: 7,
    accel: 50,
    airAccel: 30,
    gravity: 45,
    jump: 4,
    cut: 1.5,
    coyote: 0.12,
    buffer: 0.14,
    step: 0.35,
    fall: 24,
    climb: 4,
    pace: 1,
    height: 1.8,
};

/** Flat ground at 20, and nothing else. */
const flat: Course = { floor: (_x, from, to) => (20 >= from && 20 <= to ? { y: 20 } : null) };

/** A held jump from the ground with the jets on hand, step by step, until it lands or `most` steps pass. */
function fly(
    m: Moves,
    hold: boolean,
    most = 600,
): { r: Runner; top: number; jet: number; steps: number } {
    const r = runner(0, 20),
        j = jets(SPEC);
    let top = 20,
        jet = 0,
        n = 0;
    stepRunner(r, { run: 0, jump: true, jumped: true }, flat, m, DT);
    for (n = 1; n < most; n++) {
        stepJets(j, r, hold, SPEC, DT);
        if (j.on) jet += DT;
        const now = j.on ? hoverMoves(m, r, SPEC, DT) : m;
        const ran = stepRunner(r, { run: 0, jump: hold, jumped: false }, flat, now, DT);
        top = Math.min(top, r.y);
        if (ran.includes("landed")) break;
    }
    return { r, top, jet, steps: n };
}

test("a planet's pull keeps the launch speed: 6 squares on the moon, 4 on Earth, 2 on a heavy world", () => {
    for (const [g, high] of [
        [30, 6],
        [45, 4],
        [90, 2],
    ] as const) {
        const m = onPlanet(EARTH, g);
        const { top } = fly(m, false, 600);
        // let go at once, a jump is cut short, so measure the held climb with the jets kept off
        const held = runner(0, 20);
        stepRunner(held, { run: 0, jump: true, jumped: true }, flat, m, DT);
        let best = 20;
        for (let n = 0; n < 300 && !grounded(held); n++) {
            stepRunner(held, { run: 0, jump: true, jumped: false }, flat, m, DT);
            best = Math.min(best, held.y);
        }
        assert.ok(Math.abs(20 - best - high) < 0.15, `pull ${g}: a held jump rose ${20 - best}`);
        assert.ok(20 - top < high, `pull ${g}: a tap rises less than a held jump`);
        assert.ok(
            Math.abs(Math.sqrt(2 * m.gravity * m.jump) - Math.sqrt(2 * 45 * 4)) < 1e-9,
            "the launch speed is Earth's",
        );
    }
});

test("the jets fire only once the jump has stopped rising, for their fuel, and hold the fall to a sink", () => {
    const { jet, steps } = fly(EARTH, true, 900);
    assert.ok(Math.abs(jet - SPEC.seconds) < 0.05, `the jets fired for ${jet} seconds`);
    // a held jump alone is up and down in under a second; the jets keep it up for most of their fuel more
    const plain = fly(EARTH, false, 900).steps;
    assert.ok(steps * DT > plain * DT + 0.9, `with jets ${steps * DT}s, without ${plain * DT}s`);
    const r = runner(0, 10),
        j = jets(SPEC);
    r.state = "rise";
    r.vy = -8;
    assert.equal(stepJets(j, r, true, SPEC, DT), null, "no jets while still rising fast");
    r.state = "fall";
    r.vy = 12;
    assert.equal(stepJets(j, r, true, SPEC, DT), "lit");
    for (let n = 0; n < 30; n++) {
        stepJets(j, r, true, SPEC, DT);
        stepRunner(
            r,
            { run: 0, jump: true, jumped: false },
            { floor: () => null },
            hoverMoves(EARTH, r, SPEC, DT),
            DT,
        );
    }
    assert.ok(r.vy <= SPEC.sink + 1e-9, `the fall is braked to ${r.vy}`);
});

test("landing fills the jets again, and the same held jump flies the same every time", () => {
    const j = jets(SPEC);
    const r = runner(0, 10);
    r.state = "fall";
    r.vy = 1;
    for (let n = 0; n < 30; n++) stepJets(j, r, true, SPEC, DT);
    assert.ok(j.fuel < SPEC.seconds - 0.4);
    r.state = "stand";
    stepJets(j, r, true, SPEC, DT);
    assert.equal(j.fuel, SPEC.seconds);
    assert.equal(j.on, false);
    assert.deepEqual(fly(EARTH, true), fly(EARTH, true));
});

const FLY: FlySpec = {
    gravity: 12,
    power: 22,
    spool: 4.5,
    cruise: 0.7,
    heat: 0.35,
    cool: 0.55,
    sputter: 0.9,
    side: 16,
    drag: 1.3,
    dive: 10,
    most: 11,
};
const still = { x: 0, y: 0 };

test("a flyer's thrust builds over a moment, and a hover's share holds it still in the air", () => {
    const f = flyer(0, 50);
    stepFlyer(f, { lift: 1, steer: 0, dive: false }, still, [], FLY, DT);
    assert.ok(f.thrust > 0 && f.thrust < 0.15, `one step in, the thrust is ${f.thrust}`);
    for (let n = 0; n < 30; n++)
        stepFlyer(f, { lift: 1, steer: 0, dive: false }, still, [], FLY, DT);
    assert.ok(f.thrust > 0.85, `half a second in, the thrust is ${f.thrust}`);
    const h = flyer(0, 50),
        share = hoverShare(FLY);
    h.thrust = share;
    for (let n = 0; n < 240; n++)
        stepFlyer(h, { lift: share, steer: 0, dive: false }, still, [], FLY, DT);
    assert.ok(
        Math.abs(h.y - 50) < 1e-6 && h.heat === 0,
        `a hover drifted to ${h.y}, heat ${h.heat}`,
    );
});

test("full thrust heats the jets until they sputter, they climb no more while they cough, and they cool to fire again", () => {
    const f = flyer(0, 100);
    let sputtered = -1;
    for (let n = 0; n < 600 && sputtered < 0; n++)
        if (stepFlyer(f, { lift: 1, steer: 0, dive: false }, still, [], FLY, DT) === "sputter")
            sputtered = n;
    assert.ok(sputtered > 2 * 60 && sputtered < 5 * 60, `sputtered after ${sputtered / 60} s`);
    const vy = f.vy;
    let back = -1;
    for (let n = 0; n < 120 && back < 0; n++)
        if (stepFlyer(f, { lift: 1, steer: 0, dive: false }, still, [], FLY, DT) === "back")
            back = n;
    assert.ok(back > 0 && Math.abs(back / 60 - FLY.sputter) < 0.05, `back after ${back / 60} s`);
    assert.ok(f.vy > vy + 5, `its climb of ${-vy} fell to ${-f.vy} while it coughed`);
    assert.ok(f.heat < 1, `cooled to ${f.heat}`);
    const g = flyer(0, 100);
    g.heat = 0.8;
    for (let n = 0; n < 60; n++)
        stepFlyer(g, { lift: 0, steer: 0, dive: false }, still, [], FLY, DT);
    assert.ok(Math.abs(g.heat - (0.8 - FLY.cool)) < 0.05, `a second resting cooled to ${g.heat}`);
});

test("a moon's pull bends a path towards it, fades to nothing at its reach, and never beats the jets", () => {
    const moon = { x: 10, y: 50, strength: 6, reach: 12 };
    assert.deepEqual(pullAt([moon], 30, 50), { x: 0, y: 0 });
    const near = pullAt([moon], 13, 50);
    assert.ok(near.x < -4 && Math.abs(near.y) < 1e-9, `close in the pull is ${near.x}`);
    assert.ok(FLY.gravity + moon.strength < FLY.power, "full thrust climbs away from under a moon");
    const free = flyer(16, 50),
        pulled = flyer(16, 50);
    const hands = { lift: hoverShare(FLY), steer: 0, dive: false };
    free.thrust = pulled.thrust = hands.lift;
    for (let n = 0; n < 60; n++) {
        stepFlyer(free, hands, still, [], FLY, DT);
        stepFlyer(pulled, hands, still, [moon], FLY, DT);
    }
    assert.ok(Math.abs(free.x - 16) < 1e-9 && pulled.x < 15.5, `pulled to ${pulled.x}`);
});

test("the air carries a flyer along, and the same hands fly the same way every time", () => {
    const run = () => {
        const f = flyer(5, 80);
        for (let n = 0; n < 300; n++)
            stepFlyer(
                f,
                { lift: n % 90 < 60 ? 1 : 0, steer: n % 120 < 40 ? 1 : -0.5, dive: n > 280 },
                { x: 2, y: -1 },
                [{ x: 20, y: 60, strength: 5, reach: 10 }],
                FLY,
                DT,
            );
        return f;
    };
    assert.deepEqual(run(), run());
    const drift = flyer(0, 50);
    drift.thrust = hoverShare(FLY);
    for (let n = 0; n < 300; n++)
        stepFlyer(
            drift,
            { lift: hoverShare(FLY), steer: 0, dive: false },
            { x: 2, y: 0 },
            [],
            FLY,
            DT,
        );
    assert.ok(Math.abs(drift.vx - 2) < 0.05, `carried at ${drift.vx}`);
});
