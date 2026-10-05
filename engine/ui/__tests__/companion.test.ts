import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rungOf } from "../companion";

describe("the ladder a question's help climbs", () => {
    it("opens the hints in order, then the worked example, then the walk to the answer", () => {
        const of = (opened: number, worked = false, told = false) =>
            rungOf({ opened, total: 2, worked, hasWorked: true, told });
        assert.equal(of(0), "hint");
        assert.equal(of(1), "hint");
        assert.equal(of(2), "worked");
        assert.equal(of(2, true), "answer");
        assert.equal(of(2, true, true), "done");
    });

    it("goes past the worked example where the lesson has none", () => {
        const at = { worked: false, hasWorked: false, told: false };
        assert.equal(rungOf({ opened: 1, total: 1, ...at }), "answer");
        assert.equal(rungOf({ opened: 0, total: 0, ...at, hasWorked: true }), "worked");
    });
});
