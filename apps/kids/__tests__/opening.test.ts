import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openingLine, SAY_OPENING, TOO_LONG, waitsForSheets } from "../opening";

describe("going into a world", () => {
    it("waits for today's sheets only while there are some to draw and they can still come", () => {
        assert.equal(waitsForSheets(2, "pending"), true);
        assert.equal(waitsForSheets(2, "refreshing"), true);
        assert.equal(
            waitsForSheets(0, "pending"),
            false,
            "a day with nothing planned waited for sheets",
        );
        assert.equal(waitsForSheets(0, "unresolved"), false);
        assert.equal(
            waitsForSheets(2, "errored"),
            false,
            "sheets that failed to draw were waited for",
        );
    });

    it("says nothing for a moment, then that the page is opening, and never only that for ever", () => {
        assert.equal(openingLine(0), "nothing");
        assert.equal(openingLine(SAY_OPENING), "opening");
        assert.equal(openingLine(TOO_LONG - 1), "opening");
        assert.equal(openingLine(TOO_LONG), "slow");
        assert.equal(openingLine(10 * 60_000), "slow");
    });
});
