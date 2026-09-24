import { test } from "node:test";
import assert from "node:assert/strict";
import { isGameChallenge } from "../../../engine/answer";
import { GAMES } from "../catalogue";
import { challengeFor, nextChallenge, openChallenge, supportsVariations } from "../challenges";
import { pourConfigurations, openPourConfiguration } from "../pour-challenges";
import { ruleConfigurations, openRuleConfiguration } from "../rule-challenges";
import { explore, nudge, prove } from "../prove";

test("every measuring and machine recipe has a complete uncapped proof and legal winning path", () => {
    for (let phase = 0; phase < 6; phase++) {
        const rounds = [
            ...pourConfigurations(phase).map(openPourConfiguration),
            ...ruleConfigurations(phase).map(openRuleConfiguration),
        ];
        for (const round of rounds) {
            const graph = explore(round);
            const proof = prove(round, graph);
            assert.equal(
                proof.ok,
                true,
                JSON.stringify({ values: round.values, problems: proof.problems }),
            );
            assert.equal(proof.capped, false);
            let position = round.start;
            for (let n = 0; n < proof.shortest; n++) {
                const i = nudge(graph, position);
                assert.notEqual(i, null);
                const move = position.moves[i ?? -1];
                assert.ok(move);
                position = move.next();
            }
            assert.equal(position.won, true);
        }
    }
});

test("all catalogue authored phases have serializable descriptors and exact retry opening", () => {
    for (const game of GAMES)
        for (let phase = 0; phase < game.levels.length; phase++) {
            const challenge = challengeFor(game, phase, 51);
            assert.ok(isGameChallenge(challenge), JSON.stringify(challenge));
            assert.deepEqual(challengeFor(game, phase, 51), challenge);
            assert.equal(openChallenge(game, challenge).id, game.id);
            assert.throws(() => openChallenge(game, { ...challenge, rulesVersion: "future" }));
        }
});

test("generated seed corpus stays validated, diverse and repeatable with bounded deduplication", () => {
    for (const game of GAMES.filter(supportsVariations)) {
        const id = game.id;
        for (let phase = 0; phase < game.levels.length; phase++) {
            const ids = new Set<string>();
            for (let seed = 0; seed < 96; seed++) {
                const c = challengeFor(game, phase, seed, true);
                assert.ok(isGameChallenge(c));
                assert.equal(c.source, "generated");
                assert.deepEqual(c, challengeFor(game, phase, seed, true));
                assert.equal(openChallenge(game, c).id, id);
                ids.add(c.id);
            }
            assert.ok(ids.size >= 2, `${id} phase ${phase} has ${ids.size}`);
            const first = challengeFor(game, phase, 1, true);
            assert.notEqual(nextChallenge(game, phase, 1, [first.id]).id, first.id);
            assert.ok(nextChallenge(game, phase, 1, [...ids]));
            assert.throws(() =>
                openChallenge(game, { ...first, configuration: { invalid: true } }),
            );
        }
    }
});

test("an unknown or capped measuring configuration is rejected before play", () => {
    const game = GAMES.find((g) => g.id === "pour");
    assert.ok(game);
    const c = challengeFor(game, 0, 0, true);
    assert.throws(() =>
        openChallenge(game, {
            ...c,
            configuration: {
                jugs: [
                    { max: 99999, step: 1 },
                    { max: 99998, step: 1 },
                ],
                target: 12,
                unit: "ml",
            },
        }),
    );
    const round = openPourConfiguration(
        pourConfigurations(0)[0] ?? { jugs: [], target: 0, unit: "ml" },
    );
    assert.equal(prove(round, explore(round, 1)).ok, false);
});

test("tabletop pool has full position graph and authored spelling or fair dice audits", async () => {
    const { tableConfigurations, openTableConfiguration } = await import("../table-challenges");
    for (const [kind, count] of [
        ["spell", 4],
        ["race", 4],
        ["shut", 5],
    ] as const)
        for (let phase = 0; phase < count; phase++)
            for (const c of tableConfigurations(kind, phase)) {
                const p = prove(openTableConfiguration(c));
                assert.ok(p.ok, JSON.stringify({ kind, phase, c, problems: p.problems }));
                assert.equal(p.capped, false);
            }
});

test("authored action geometry changes invalidate a saved descriptor even with an unchanged title", () => {
    const game = GAMES.find((g) => g.id === "jump");
    assert.ok(game && game.group === "action");
    const saved = challengeFor(game, 0, 1);
    const changed = {
        ...game,
        start: (level: number) => ({ original: game.start(level, 1), changedTarget: 99 }),
    };
    assert.throws(() => openChallenge(changed, saved), /has changed/);
});

test("an authored phase without a certified pool falls back in bounded time", () => {
    const game = GAMES.find((g) => g.id === "pour");
    assert.ok(game && game.group !== "action");
    const first = game.levels[0];
    assert.ok(first);
    const extended = { ...game, levels: [...game.levels, first] };
    const challenge = nextChallenge(extended, game.levels.length, 7, []);
    assert.equal(challenge.source, "authored");
    assert.equal(openChallenge(extended, challenge).id, game.id);
});
