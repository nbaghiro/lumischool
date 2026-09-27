import assert from "node:assert/strict";
import { it } from "node:test";
import { emptyPad } from "../../../engine/motion/pad";
import { headingError } from "../../../engine/motion/vehicle";
import { isRallyConfiguration, openRallyConfiguration, rallyChallenge } from "../rally-challenges";
import { rallyGame, recoverRally, speedOf, stepRally, type RallyState } from "../rally";

for (let phase = 0; phase < 3; phase++)
    for (let variant = 0; variant < 3; variant++) {
        for (const input of ["pointer", "keyboard"] as const)
            it(`rally phase ${phase}, variation ${variant}: ${input} completes the full course`, () => {
                const config = rallyChallenge(variant, phase);
                assert.ok(isRallyConfiguration(config, phase));
                const s = openRallyConfiguration(config);
                for (let tick = 0; tick < 3600 && !s.won; tick++) {
                    const target = s.course.points[(s.next + 3) % s.course.points.length];
                    assert.ok(target);
                    const pad = emptyPad();
                    if (input === "pointer") pad.touch = target;
                    else {
                        const error = headingError(
                            Math.atan2(target.y - s.car.y, target.x - s.car.x) - s.car.angle,
                        );
                        pad.go = true;
                        pad.holding = Math.abs(error) < 0.08 ? [] : [error > 0 ? "right" : "left"];
                    }
                    stepRally(s, pad);
                }
                assert.ok(s.won);
                assert.equal(s.passed, s.course.points.length * s.course.laps);
                assert.equal(s.recoveries, 0);
                const frozen = structuredClone(s.car);
                stepRally(s, { ...emptyPad(), go: true });
                assert.deepEqual(s.car, frozen);
            });
    }
it("idle, backwards crossings and a shortcut cannot earn checkpoints; recovery preserves earned progress", () => {
    const s = openRallyConfiguration(rallyChallenge(0, 0));
    const before = structuredClone(s.car);
    for (let i = 0; i < 120; i++) stepRally(s, emptyPad());
    assert.deepEqual(s.car, before);
    s.car.x = 18;
    s.car.y = 12;
    stepRally(s, { ...emptyPad(), go: true });
    assert.equal(s.passed, 0);
    s.next = 0;
    const target = s.course.points[0];
    assert.ok(target);
    s.car = { ...s.car, x: target.x, y: target.y + 0.02, angle: -Math.PI / 2, vx: 0, vy: -4 };
    stepRally(s, emptyPad());
    assert.equal(s.laps, 0);
    s.next = 12;
    s.passed = 11;
    recoverRally(s);
    assert.equal(s.next, 12);
    assert.equal(s.passed, 11);
    assert.equal(s.car.vx, 0);
    assert.equal(rallyGame.still.press(s), 12);
    assert.equal(
        isRallyConfiguration({ ...rallyChallenge(0, 0), course: { ...s.course, lane: 100 } }),
        false,
    );
});

it("down and the brake control stop forward motion before reversing", () => {
    for (const control of ["key", "button"] as const) {
        const s = openRallyConfiguration(rallyChallenge(0, 0));
        const { angle } = s.car;
        s.car.vx = Math.cos(angle) * 3;
        s.car.vy = Math.sin(angle) * 3;
        const pad = emptyPad();
        if (control === "key") pad.holding = ["down"];
        else pad.brake = true;
        stepRally(s, pad);
        assert.ok(s.car.vx * Math.cos(angle) + s.car.vy * Math.sin(angle) > 0);
        for (let i = 0; i < 100; i++) stepRally(s, pad);
        assert.ok(s.car.vx * Math.cos(angle) + s.car.vy * Math.sin(angle) < -1);
        assert.equal(s.recoveries, 0);
        for (let i = 0; i < 120; i++) stepRally(s, { ...emptyPad(), go: true });
        assert.ok(s.car.vx * Math.cos(angle) + s.car.vy * Math.sin(angle) > 0);
    }
});

it("holding behind the car backs out of grass without awarding checkpoints", () => {
    const s = openRallyConfiguration(rallyChallenge(0, 0));
    s.car = { ...s.car, x: 33, y: 18, angle: 0 };
    for (let i = 0; i < 120; i++) stepRally(s, { ...emptyPad(), touch: { x: 28, y: 18 } });
    assert.ok(s.car.x < 31 && s.car.vx < 0);
    assert.equal(s.recoveries, 0);
    assert.equal(s.passed, 0);
});

/** Drives a signed course, braking to under each sign's speed before its bend when `careful`. */
function driveBends(s: RallyState, input: "pointer" | "keyboard", careful: boolean): void {
    const n = s.course.points.length;
    for (let tick = 0; tick < 60 * 90 && !s.won; tick++) {
        const target = s.course.points[(s.next + 3) % n];
        assert.ok(target);
        const ahead = (s.course.signs ?? []).filter((b) => {
            const d = (b.from - s.next + n) % n;
            return d <= 7 || bendAtIndex((s.next - 1 + n) % n, b);
        });
        const want = careful && ahead.length ? Math.min(...ahead.map((b) => b.limit)) - 0.6 : 99;
        const speed = speedOf(s.car);
        const pad = emptyPad();
        const error = headingError(
            Math.atan2(target.y - s.car.y, target.x - s.car.x) - s.car.angle,
        );
        if (input === "pointer") {
            // a finger held close to the car brakes it, and one further ahead drives it on
            const near = speed > want + 0.2 ? 0.8 : 3;
            const a = Math.atan2(target.y - s.car.y, target.x - s.car.x);
            pad.touch = { x: s.car.x + Math.cos(a) * near, y: s.car.y + Math.sin(a) * near };
        } else {
            pad.go = speed < want;
            pad.brake = speed > want + 0.2;
            pad.holding = Math.abs(error) < 0.08 ? [] : [error > 0 ? "right" : "left"];
        }
        stepRally(s, pad);
    }
}

const bendAtIndex = (i: number, b: { from: number; to: number }): boolean =>
    b.from <= b.to ? i >= b.from && i <= b.to : i >= b.from || i <= b.to;

for (let variant = 0; variant < 3; variant++)
    for (const input of ["pointer", "keyboard"] as const)
        it(`slow for the bends, variation ${variant}: ${input} braking for each sign finishes the lap`, () => {
            const s = openRallyConfiguration(rallyChallenge(variant, 3));
            driveBends(s, input, true);
            assert.ok(s.won, rallyGame.say(s));
            assert.ok(!s.fast?.some(Boolean));
        });

it("a lap driven flat out through the signed bends does not count", () => {
    const s = openRallyConfiguration(rallyChallenge(0, 3));
    const n = s.course.points.length;
    for (let tick = 0; tick < 60 * 30 && !s.won; tick++) {
        const target = s.course.points[(s.next + 3) % n];
        assert.ok(target);
        stepRally(s, { ...emptyPad(), touch: target });
    }
    assert.equal(s.fast?.[0], true, "the first bend was taken too fast");
    assert.equal(s.laps, 0);
    assert.ok(!s.won);
});
