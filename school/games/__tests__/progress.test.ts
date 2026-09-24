import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { it } from "node:test";
import { isGameAttempt, type GameAttempt } from "../../../engine/answer";
import { gameProgress } from "../progress";
const attempt = (n: number): GameAttempt => ({
    id: randomUUID(),
    challenge: {
        id: `test-${n}`,
        game: "pour",
        phase: 0,
        seed: n,
        source: "generated",
        generatorVersion: "pool-1",
        rulesVersion: "games-1",
        configuration: { target: n },
        difficulty: { version: "initial-1", band: 1, reasoning: 1, motor: 0, content: 1 },
        validation: { method: "search", version: "1" },
    },
    startedAt: "2026-09-23T10:00:00.000Z",
    completedAt: "2026-09-23T10:01:00.000Z",
    outcome: "completed",
    moves: 4,
    assistance: 0,
    retries: 0,
    activeMs: 60000,
    input: "keyboard",
    reducedMotion: false,
    objectives: { completed: 1, total: 1 },
});
it("recommends only for distinct, unassisted generated configurations under matching versions", () => {
    const a = attempt(1),
        b = attempt(2),
        c = attempt(3);
    assert.equal(gameProgress([a, b, c])[0]?.recommendNext, true);
    assert.equal(gameProgress([a, a, b])[0]?.recommendNext, false);
    assert.equal(gameProgress([a, b, { ...c, assistance: 1 }])[0]?.recommendNext, false);
    assert.equal(
        gameProgress([a, b, { ...c, challenge: { ...c.challenge, source: "authored" } }])[0]
            ?.recommendNext,
        false,
    );
    assert.equal(
        gameProgress([a, b, { ...c, challenge: { ...c.challenge, rulesVersion: "old" } }])[0]
            ?.recommendNext,
        false,
    );
    assert.equal(
        gameProgress([
            a,
            b,
            { ...c, challenge: { ...c.challenge, configuration: a.challenge.configuration } },
        ])[0]?.recommendNext,
        false,
    );
});
it("validates finite bounded historical data and rejects invalid terminal summaries", () => {
    const good = attempt(1);
    assert.equal(isGameAttempt(good), true);
    assert.equal(isGameAttempt({ ...good, activeMs: Infinity }), false);
    assert.equal(isGameAttempt({ ...good, completedAt: "2026-09-22T00:00:00.000Z" }), false);
    assert.equal(isGameAttempt({ ...good, objectives: { completed: 2, total: 1 } }), false);
    assert.equal(
        isGameAttempt({
            ...good,
            challenge: { ...good.challenge, configuration: { tooMany: Array(5000).fill(1) } },
        }),
        false,
    );
    assert.equal(
        isGameAttempt({
            ...good,
            challenge: { ...good.challenge, configuration: { invalid: undefined } },
        }),
        false,
    );
});
