import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditEnvelope, improveFeedback } from "../envelope";

describe("the authoring envelope", () => {
    it("contains only catalogue notation and verifier messages", () => {
        const envelope = improveFeedback("items/add.lumi", "item add.one {}", [
            "rule is too broad",
        ]);
        assert.deepEqual(auditEnvelope(envelope), []);
        assert.deepEqual(envelope, {
            operation: "improve-feedback",
            content: { path: "items/add.lumi", source: "item add.one {}" },
            problems: ["rule is too broad"],
        });
    });

    it("refuses fields that could carry family or child data", () => {
        assert.deepEqual(auditEnvelope({ content: { source: "x" }, kid: "k-1" }), [
            "kid is not a declared field",
            "kid is withheld",
        ]);
    });
});
