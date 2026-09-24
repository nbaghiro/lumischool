import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { waitsForSheets } from "../opening";

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
});
