// A game card's rules: one live card a page, the card's states, the round it opens, its buttons, its
// goal line and the result it reports.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gameById } from "../../../school/games/catalogue";
import {
    claim,
    goalOf,
    liveCard,
    next,
    release,
    resultOf,
    roundOf,
    showsButtons,
    type Live,
} from "../game-card-rules";

const card = (): Live & { stilled: number } => {
    const c = {
        stilled: 0,
        still: () => {
            c.stilled++;
        },
    };
    return c;
};

const game = (id: string) => {
    const g = gameById(id);
    if (!g) throw new Error(`No game ${id}`);
    return g;
};

test("a page keeps one live card: starting another stills the one before, and releasing frees it", () => {
    const a = card(),
        b = card();
    claim(a);
    assert.equal(liveCard(), a);
    claim(a);
    assert.equal(a.stilled, 0, "claiming again stills nothing");
    claim(b);
    assert.equal(a.stilled, 1);
    assert.equal(liveCard(), b);
    release(a);
    assert.equal(liveCard(), b, "a card that is not live releases nothing");
    release(b);
    assert.equal(liveCard(), null);
});

test("a card goes from its picture to live, to won, and back to its picture when stilled", () => {
    assert.equal(next("poster", "play"), "live");
    assert.equal(next("live", "won"), "won");
    assert.equal(next("poster", "won"), "poster", "a picture cannot be won");
    assert.equal(next("won", "won"), "won");
    assert.equal(next("won", "restart"), "live");
    assert.equal(next("live", "still"), "poster");
    assert.equal(next("won", "still"), "poster");
});

test("a card opens the level asked for, kept in range, as authored or as a generated variation", () => {
    const jump = game("jump");
    const authored = roundOf(jump, 0);
    assert.equal(authored.level, 0);
    assert.equal(authored.challenge.source, "authored");
    assert.equal(authored.challenge.game, "jump");
    assert.equal(roundOf(jump, 99).level, jump.levels.length - 1);
    assert.equal(roundOf(jump, -3).level, 0);
    const varied = roundOf(game("pool"), 1, 7);
    assert.equal(varied.challenge.source, "generated");
    assert.equal(varied.level, 1);
});

test("a card shows its game's buttons only where the field does not play the game by itself", () => {
    assert.equal(showsButtons(game("sling")), false, "pulled from the field");
    assert.equal(showsButtons(game("snake")), false, "a finger it follows");
    assert.equal(showsButtons(game("road")), true, "played by its buttons");
    assert.equal(showsButtons(game("shut")), true, "a turn game's tray chooses its moves");
});

test("a card's goal is the lesson's words where it gave some, and the level's otherwise", () => {
    const jump = game("jump");
    assert.equal(goalOf(jump, 0, "Hop to the carrot."), "Hop to the carrot.");
    assert.equal(goalOf(jump, 0, "  "), goalOf(jump, 0));
    assert.ok(goalOf(jump, 0).length > 0);
    assert.ok(goalOf(game("shut"), 0).length > 0);
});

test("a round's result carries the game, its rules and challenge, and whole tries and tenths of seconds", () => {
    const round = roundOf(game("golf"), 0);
    const r = resultOf({
        challenge: round.challenge,
        won: true,
        tries: 0,
        activeMs: 12_345,
        assistance: 2,
    });
    assert.deepEqual(r, {
        game: "golf",
        rulesVersion: round.challenge.rulesVersion,
        challenge: round.challenge.id,
        won: true,
        tries: 1,
        seconds: 12.3,
        assistance: 2,
    });
});

test("a card plays only the first asks of a level where the game says how to start that way", () => {
    const pool = game("pool");
    if (pool.group !== "action") throw new Error("Pocket pool is an action game");
    const asked: number[] = [];
    const counted = {
        ...pool,
        round: (level: number, asks: number) => {
            asked.push(asks);
            return pool.start(level);
        },
    };
    const two = roundOf(counted, 0, undefined, 2);
    assert.equal(two.asks, 2);
    if (two.game.group !== "action") throw new Error("still an action game");
    two.game.start(0);
    assert.deepEqual(asked, [2]);
    assert.equal(
        roundOf(pool, 0, undefined, 2).asks,
        null,
        "a game with no round plays its level whole",
    );
});
