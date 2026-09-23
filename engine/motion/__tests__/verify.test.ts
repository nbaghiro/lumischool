import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyReplay } from "../verify";

const game = {
    start: () => ({ position: 0, speed: 0 }),
    input: (s: { speed: number }, speed: number) => {
        s.speed = speed;
    },
    step: (s: { position: number; speed: number }) => {
        s.position += s.speed;
    },
    won: (s: { position: number }) => s.position === 3,
};

test("a witness replays timed inputs and must actually reach the objective", () => {
    assert.equal(verifyReplay(game, [{ tick: 0, input: 1 }], 10).ticks, 3);
    assert.equal(verifyReplay(game, [{ tick: 0, input: 2 }], 10).won, false);
    assert.equal(verifyReplay(game, [], 10).won, false);
});
test("invalid replay schedules and unbounded runs are rejected", () => {
    assert.throws(() => verifyReplay(game, [], Infinity));
    assert.throws(() => verifyReplay(game, [{ tick: -1, input: 1 }], 10));
    assert.throws(() => verifyReplay(game, [{ tick: 10, input: 1 }], 10));
    assert.throws(() =>
        verifyReplay(
            game,
            [
                { tick: 2, input: 1 },
                { tick: 1, input: 0 },
            ],
            10,
        ),
    );
});
