import assert from "node:assert/strict";
import { test } from "node:test";
import { firstHand, sourceCard } from "../sourcecard";

test("a source card is first-hand only when its writer was there", () => {
    const [transcript, newspaper, encyclopaedia, letter] = sourceCard.takes;
    assert.ok(transcript && newspaper && encyclopaedia && letter);
    assert.equal(firstHand(transcript.params), true);
    assert.equal(firstHand(newspaper.params), false);
    assert.equal(firstHand(encyclopaedia.params), false);
    assert.equal(firstHand(letter.params), true);
});
