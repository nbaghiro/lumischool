// The card standard: every game says how it plays as a card in a lesson or why it cannot, and every
// card game shows a square of at least 12 px in a 360 by 240 card and wins one round by the field alone,
// with no button, in its stated minutes, telling the win once and settling. See .docs/game-cards.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cardSquare } from "../../../engine/motion/camera";
import { GAMES } from "../catalogue";
import { FIELD_ROUNDS } from "./card-hands";

const CARD = { w: 360, h: 240 };

test("every game declares how it plays as a card, or null, and a card's round is a level it has", () => {
    for (const g of GAMES) {
        assert.notEqual(g.card, undefined, `${g.id} says nothing about cards`);
        if (!g.card) continue;
        assert.ok(g.card.round.level < g.levels.length, `${g.id}: no level ${g.card.round.level}`);
        assert.ok(
            g.card.minutes > 0 && g.card.minutes <= 3,
            `${g.id}: a round is one to three minutes`,
        );
        if (g.card.round.asks !== undefined)
            assert.ok(
                g.group === "action" && g.round !== undefined,
                `${g.id} asks for fewer asks and cannot start a round of them`,
            );
    }
});

test("a card game shows a square of at least 12 px in a 360 by 240 card", () => {
    for (const g of GAMES) {
        if (!g.card || g.group !== "action") continue;
        const f = g.frame(g.start(g.card.round.level, 1), true);
        const sq = cardSquare(f.view, CARD, g.card.keep);
        assert.ok(sq >= 12, `${g.id}: ${sq} px a square`);
    }
});

test("every card game wins its round by the field alone, in its minutes, telling the win once and settling", () => {
    const cards = GAMES.filter((g) => g.card);
    assert.deepEqual(
        cards.map((g) => g.id).filter((id) => !(id in FIELD_ROUNDS)),
        [],
        "a card game with no hands to play it",
    );
    for (const g of cards) {
        const round = FIELD_ROUNDS[g.id];
        if (!round || !g.card) continue;
        const v = round();
        assert.ok(v.won, `${g.id}: not won`);
        assert.equal(v.end?.won, true, `${g.id}: the round does not say it ended won`);
        assert.deepEqual(v.notField, [], `${g.id}: played with what the field cannot give`);
        assert.equal(v.wins, 1, `${g.id}: the win told ${v.wins} times`);
        assert.ok(v.minutes <= g.card.minutes, `${g.id}: ${v.minutes.toFixed(2)} minutes`);
        assert.ok(v.settles, `${g.id}: still moving after the win`);
    }
});
