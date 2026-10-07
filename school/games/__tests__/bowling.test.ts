import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad } from "../../../engine/motion/pad";
import {
    BOWLING_LEVELS,
    bowlingGame,
    bowlingLaneOf,
    bowlingPreview,
    startBowling,
    stepBowling,
} from "../bowling";
import { bowlingChallenge, isBowlingConfiguration } from "../bowling-challenges";
import { stepSkittles } from "../../../engine/motion/skittles";
import { bowlWith, findBowls, settleBowl } from "./bowling-hands";

test("every bowling layout can be won by keys and by a pull, replaying identically", () => {
    for (let phase = 0; phase < BOWLING_LEVELS.length; phase++)
        for (let variant = 0; variant < 3; variant++)
            for (const mode of ["keys", "touch"] as const) {
                const s = startBowling(phase, variant),
                    plan = findBowls(s, mode);
                assert.ok(plan, `${phase}/${variant}/${mode}`);
                const replay = startBowling(phase, variant);
                for (const angle of plan)
                    for (const p of bowlWith(s, angle, mode)) stepBowling(replay, p);
                assert.equal(s.mode, "won");
                assert.deepEqual(replay, s);
                assert.equal(s.total, s.L.target);
                if (phase === 0)
                    assert.equal(s.bowls, 2, "first garden asks for two consequential bowls");
            }
});
test("second bowl keeps the standing pins and counted total, and rerack costs nothing", () => {
    const s = startBowling();
    bowlWith(s, -0.225, "touch");
    assert.equal(s.mode, "aim");
    assert.equal(s.bowls, 1);
    assert.equal(s.total, 2);
    assert.equal(s.bodies.filter((b) => b.id !== 0).length, 1);
    const p = s.bodies[0];
    assert.ok(p);
    assert.equal(p.id, 3);
    bowlingGame.command?.(s, "rack");
    assert.equal(s.total, 0);
    assert.equal(s.bowls, 0);
    assert.equal(s.bodies.length, 3);
});
test("a cancelled pull never bowls, a held go never repeats, and short bowls reset", () => {
    const s = startBowling();
    stepBowling(s, { ...emptyPad(), touch: { x: 9, y: 25 } });
    stepBowling(s, { ...emptyPad(), touch: { x: 10, y: 28 } });
    bowlingGame.cancelInput?.(s);
    stepBowling(s, { ...emptyPad(), lifted: { x: 10, y: 28 } });
    assert.equal(s.bowls, 0);
    for (let i = 0; i < 60; i++) stepBowling(s, { ...emptyPad(), go: true });
    assert.equal(s.bowls, 0);
    s.aim.power = 7;
    for (let k = 0; k < 2; k++) {
        stepBowling(s, { ...emptyPad(), tapped: true });
        settleBowl(s);
    }
    assert.equal(s.mode, "retry");
    for (let k = 0; k < 80; k++) stepBowling(s, emptyPad());
    assert.equal(s.mode, "aim");
    assert.equal(s.bowls, 0);
});
test("preview uses the rolling physics and curve changes the line", () => {
    const s = startBowling();
    s.spin = 1;
    const preview = bowlingPreview(s, 0.8);
    stepBowling(s, { ...emptyPad(), tapped: true });
    const b = s.bodies.find((b) => b.id === 0);
    assert.ok(b);
    const ball = { ...b };
    for (let k = 0; k < 48; k++) stepSkittles([ball], bowlingLaneOf(s), 1 / 60);
    const last = preview.at(-1);
    assert.ok(last);
    assert.ok(Math.abs(last.x - ball.x) < 1e-10);
    assert.ok(Math.abs(last.y - ball.y) < 1e-10);
    const straight = startBowling();
    assert.ok(
        (bowlingPreview(straight, 1.5).at(-1)?.x ?? 0) <
            (bowlingPreview({ ...straight, spin: 1 }, 1.5).at(-1)?.x ?? 0),
    );
});
test("configuration round trips and rejects untrusted fields", () => {
    const c = bowlingChallenge(5, 2);
    assert.ok(isBowlingConfiguration(c, 2));
    assert.equal(isBowlingConfiguration({ ...c, extra: 1 }, 2), false);
    assert.equal(isBowlingConfiguration({ ...c, variant: 3 }, 2), false);
});
