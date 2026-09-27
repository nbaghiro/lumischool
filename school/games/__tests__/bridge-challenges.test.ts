// A stored layout of Charlie's bridge opens only as it was made; that every layout is crossed and
// rarely made by random planks is held in bridge.test.ts beside the authored levels.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BRIDGE_LEVELS } from "../bridge";
import { bridgeChallenge, bridgeLayouts, isBridgeConfiguration } from "../bridge-challenges";

test("every level has layouts, and a stored layout opens as it was made while an edited one does not", () => {
    BRIDGE_LEVELS.forEach((_, phase) => assert.ok(bridgeLayouts(phase) >= 2));
    const c = JSON.parse(JSON.stringify(bridgeChallenge(2, 1))) as unknown;
    assert.ok(isBridgeConfiguration(c));
    const made = bridgeChallenge(2, 1);
    const edited = { ...made, level: { ...made.level, stones: [5, 7] } };
    assert.ok(!isBridgeConfiguration(edited));
    assert.throws(() => bridgeChallenge(0, 99));
    for (let phase = 0; phase < BRIDGE_LEVELS.length; phase++)
        for (let v = 0; v < bridgeLayouts(phase); v++)
            assert.ok(!/[—!]/.test(bridgeChallenge(v, phase).level.prompt));
});
