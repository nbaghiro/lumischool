import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeIn, digitsOf, inFours } from "../codes";

describe("the codes a family types", () => {
    it("keeps the digits of a sign-in code, however it was typed or pasted, and at most eight", () => {
        assert.equal(digitsOf("4820 7316"), "48207316");
        assert.equal(digitsOf(" 4820-7316\n"), "48207316");
        assert.equal(digitsOf("Your code is 4820 7316."), "48207316");
        assert.equal(digitsOf("482073169999"), "48207316");
        assert.equal(digitsOf("abc"), "");
    });

    it("shows a code in its two fours, and a short one as it is", () => {
        assert.equal(inFours("48207316", " "), "4820 7316");
        assert.equal(inFours("48207316", "-"), "4820-7316");
        assert.equal(inFours("482", " "), "482");
    });

    it("finds the sign-in code in an email as the console transport prints it", () => {
        const text = [
            "Your code is 4820 7316.",
            "",
            "Type it on the page where you asked for it. It works for ten minutes, once.",
        ].join("\n");
        assert.equal(codeIn(text), "48207316");
        assert.equal(codeIn("Your code is 48207316."), "48207316");
        assert.equal(codeIn("A child was added on 12 September 2026."), null);
    });
});
