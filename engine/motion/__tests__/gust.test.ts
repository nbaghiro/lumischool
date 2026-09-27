import assert from "node:assert/strict";
import { test } from "node:test";
import { gustAt, gustLength, type Gust } from "../gust";

const G: Gust = { rise: 1, hold: 2, fall: 1, flutter: 0.3 };

test("a gust rises, blows and dies away, and is still before and after", () => {
    assert.equal(gustLength(G), 4);
    assert.equal(gustAt(G, -1), 0);
    assert.equal(gustAt(G, 5), 0);
    assert.ok(gustAt(G, 0.1) < gustAt(G, 0.9));
    for (let t = 1; t < 3; t += 0.05) {
        const v = gustAt(G, t);
        assert.ok(v >= 0.69 && v <= 1, `${t}: ${v}`);
    }
    assert.ok(gustAt(G, 3.9) < 0.1);
    assert.equal(gustAt(G, 1.7), gustAt(G, 1.7), "the same time, the same strength");
});
