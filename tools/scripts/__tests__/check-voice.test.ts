import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { breachesOf } from "../../../school/voice";

describe("the guard over the guide's voice", () => {
    it("refuses the guide speaking as itself, a name of its own, a relationship, an exclamation and an em-dash", () => {
        assert.deepEqual(breachesOf("I think you can count it.", { words: true }), [
            "first-person",
        ]);
        assert.deepEqual(breachesOf("Count it. My turn.", { words: true }), ["first-person"]);
        assert.deepEqual(breachesOf("The Firefly will show you.", { words: true }), ["a-name"]);
        assert.deepEqual(breachesOf("You are my friend.", { words: true }), ["relational"]);
        assert.deepEqual(breachesOf("Well done!", { words: true }), ["exclamation"]);
        assert.deepEqual(breachesOf("Count on — then check.", { words: true }), ["em-dash"]);
    });

    it("passes a line about the word I, a mark named on its own, and the firefly named as the firefly", () => {
        for (const line of [
            "Try saying: I can ... Which word fits?",
            "Look for names, days of the week and the word I.",
            "Which one becomes I'm?",
            "Asking takes ?, a shout takes !, and telling takes a full stop.",
            "The firefly is not a friend.",
            "Count the empty squares.",
        ])
            assert.deepEqual(breachesOf(line, { words: true }), [], line);
    });

    it("holds a question's own words to the marks only", () => {
        assert.deepEqual(breachesOf("I have 3 apples. How many are left?", { words: false }), []);
        assert.deepEqual(breachesOf("Count them!", { words: false }), ["exclamation"]);
    });
});
