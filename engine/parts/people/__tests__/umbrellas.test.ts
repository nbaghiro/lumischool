import assert from "node:assert/strict";
import { test } from "node:test";
import { drawn, partsIn } from "../../__tests__/check";
import { umbrellas } from "../umbrellas";

test("every umbrella is anchored at its tip, and the people under it walk as one part", () => {
    for (const take of umbrellas.takes) {
        const { anchors, marks } = drawn(umbrellas, take.params, { paper: false });
        const n = Math.max(1, Math.min(3, take.params.count));
        for (let i = 1; i <= n; i++)
            assert.ok(anchors[`umbrella(${i})`], `${take.label}: umbrella(${i})`);
        assert.ok(!anchors[`umbrella(${n + 1})`], take.label);
        assert.equal(partsIn(marks).filter((p) => p === "walker").length, n, take.label);
    }
});

test("the description says who walks under what and never how many", () => {
    for (const take of umbrellas.takes) {
        const said = umbrellas.describe(take.params) ?? "";
        assert.doesNotMatch(said, /\b(one|two|three|[0-9])\b/i, take.label);
        assert.match(said, take.params.rain ? /rain/ : /street/, take.label);
    }
});
