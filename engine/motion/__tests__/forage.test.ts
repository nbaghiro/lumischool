// Nuts on a branch: a shake builds and dies by degrees, short shakes drop the loosest close by and a
// hard one drops many and throws them wide, a falling nut bounces lower each time and rests, floats
// off on water and glances off a root, the same shaking drops the same nuts the same way, and a load
// in the cheeks slows a runner and shortens its jump.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    laden,
    loosen,
    reach,
    stepNuts,
    stepShake,
    type Nut,
    type Shake,
    type Wood,
} from "../forage";
import { grounded, runner, stepRunner, type Moves } from "../walker";

const DT = 1 / 60;
const GROUND = 10;
const resting = (n: Nut): boolean => n.at === "rest";

const flat = (more: Partial<Wood> = {}): Wood => ({
    floor: (_x, from, to) => (GROUND >= from && GROUND <= to ? GROUND : null),
    solid: () => false,
    bumps: [],
    water: [],
    wind: 0,
    ...more,
});

function branch(n: number): Nut[] {
    return Array.from({ length: n }, (_, i): Nut => ({
        x: 10 + (i - (n - 1) / 2) * 0.8,
        y: 5,
        vx: 0,
        vy: 0,
        at: "hang",
        grip: 0.03 + i * 0.05,
        branch: 0,
        lean: (i - (n - 1) / 2) / ((n - 1) / 2),
        turn: 0,
        age: 0,
    }));
}

/** Shakes a branch of `n` nuts in pulses of `on` steps with `off` between, for `steps`, and lets them land. */
function shaken(n: number, on: number, off: number, steps: number): Nut[] {
    const nuts = branch(n),
        sh: Shake = { strength: 0, energy: 0 },
        w = flat();
    for (let i = 0; i < steps; i++) {
        stepShake(sh, i % (on + off) < on, DT);
        loosen(nuts, 0, sh);
        stepNuts(nuts, w, DT);
    }
    for (let i = 0; i < 600; i++) stepNuts(nuts, w, DT);
    return nuts;
}

test("a held shake builds towards full strength and a let-go one dies away, and shaking only adds to what has been shaken", () => {
    const sh: Shake = { strength: 0, energy: 0 };
    const seen: number[] = [];
    for (let i = 0; i < 60; i++) {
        stepShake(sh, true, DT);
        seen.push(sh.strength);
    }
    assert.ok(
        seen.every((v, i) => i === 0 || v >= (seen[i - 1] ?? 0)),
        "it builds",
    );
    assert.ok((seen[10] ?? 1) < 0.3 && sh.strength > 0.9, "by degrees, then nearly full");
    const energy = sh.energy;
    for (let i = 0; i < 20; i++) stepShake(sh, false, DT);
    assert.equal(sh.strength, 0);
    assert.equal(sh.energy, energy, "resting does not undo the shaking");
});

test("short shakes drop a few of the loosest nuts close under the branch; a long hard one drops most and throws them wider", () => {
    const gentle = shaken(9, 9, 21, 120),
        hard = shaken(9, 90, 0, 90);
    const down = (ns: Nut[]) => ns.filter((n) => n.at !== "hang");
    const spread = (ns: Nut[]) => Math.max(...down(ns).map((n) => Math.abs(n.x - 10)));
    assert.ok(
        down(gentle).length >= 1 && down(gentle).length <= 4,
        `${down(gentle).length} gently`,
    );
    assert.ok(down(hard).length >= 8, `${down(hard).length} hard`);
    assert.ok(spread(hard) > spread(gentle) + 1, `${spread(hard)} against ${spread(gentle)}`);
    // the loosest went first
    const fell = gentle.filter((n) => n.at !== "hang").map((n) => n.grip);
    const held = gentle.filter((n) => n.at === "hang").map((n) => n.grip);
    assert.ok(Math.max(...fell) < Math.min(...held));
});

test("a falling nut bounces lower each time and comes to rest on the ground", () => {
    const nuts = branch(1);
    const n = nuts[0];
    assert.ok(n);
    n.at = "air";
    const tops: number[] = [];
    let rising = false,
        top = n.y;
    for (let i = 0; i < 600 && !resting(n); i++) {
        stepNuts(nuts, flat(), DT);
        if (n.vy < 0) {
            rising = true;
            top = Math.min(top, n.y);
        } else if (rising) {
            tops.push(top);
            rising = false;
            top = n.y;
        }
    }
    assert.equal(n.at, "rest");
    assert.equal(n.y, GROUND);
    assert.ok(tops.length >= 1, "it bounced");
    assert.ok(
        tops.every((t, i) => i === 0 || t > (tops[i - 1] ?? 0)),
        "each bounce lower",
    );
});

test("a nut that lands on water floats off and is gone; one that meets a root glances off it", () => {
    const wet = branch(1),
        n = wet[0];
    assert.ok(n);
    n.at = "air";
    const w = flat({ water: [{ x0: 5, x1: 15, level: 9 }] });
    for (let i = 0; i < 60 * 3; i++) stepNuts(wet, w, DT);
    assert.equal(n.at, "gone");
    const rooty = branch(1),
        m = rooty[0];
    assert.ok(m);
    m.at = "air";
    m.x = 10.1;
    const events: string[] = [];
    const r = flat({ bumps: [{ x: 10, y: 8, r: 0.4 }] });
    for (let i = 0; i < 300; i++) events.push(...stepNuts(rooty, r, DT).map((e) => e.e));
    assert.ok(events.includes("glanced"));
    assert.ok(Math.abs(m.x - 10) > 0.5, "it went off to one side");
});

test("the same shaking drops the same nuts to the same places", () => {
    assert.deepEqual(shaken(9, 12, 18, 200), shaken(9, 12, 18, 200));
});

const MOVES: Moves = {
    speed: 6.5,
    accel: 46,
    airAccel: 28,
    gravity: 45,
    jump: 3.1,
    cut: 1.5,
    coyote: 0.12,
    buffer: 0.14,
    step: 0.35,
    fall: 24,
    climb: 5,
    pace: 0.8,
    height: 1.1,
};

/** How high a held jump from standing rises with a load, stepped through the runner. */
function apex(load: number): number {
    const m = laden(MOVES, load, 6),
        r = runner(0, GROUND),
        ground = {
            floor: (_x: number, a: number, b: number) =>
                GROUND >= a && GROUND <= b ? { y: GROUND } : null,
        };
    let top = GROUND;
    stepRunner(r, { run: 0, jump: true, jumped: true }, ground, m, DT);
    for (let i = 0; i < 120 && !grounded(r); i++) {
        stepRunner(r, { run: 0, jump: true, jumped: false }, ground, m, DT);
        top = Math.min(top, r.y);
    }
    return GROUND - top;
}

test("full cheeks run about a third slower and jump about two fifths lower, and every acorn more jumps less far", () => {
    const empty = apex(0),
        full = apex(6);
    assert.ok(Math.abs(empty - 3.1) < 0.1, `${empty}`);
    assert.ok(Math.abs(full / empty - 0.6) < 0.05, `${full / empty}`);
    assert.ok(Math.abs(laden(MOVES, 6, 6).speed / MOVES.speed - 0.68) < 0.01);
    const reaches = [0, 1, 2, 3, 4, 5, 6].map((load) => reach(MOVES, load, 6));
    assert.ok(reaches.every((r, i) => i === 0 || r < (reaches[i - 1] ?? 0)));
});
