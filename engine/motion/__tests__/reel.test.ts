import assert from "node:assert/strict";
import { test } from "node:test";
import { reelStep } from "../reel";

test("a loaded reel builds tension and travels less than an unloaded reel", () => {
    const loaded = { speed: 0, tension: 0 },
        free = { speed: 0, tension: 0 };
    let a = 0,
        b = 0;
    for (let n = 0; n < 120; n++) {
        a += reelStep(loaded, 1, 0.8, 5, 1 / 60);
        b += reelStep(free, 1, 0, 5, 1 / 60);
    }
    assert.ok(a > 0 && a < b);
    assert.ok(loaded.tension > 0.7 && loaded.tension <= 1);
    for (let n = 0; n < 120; n++) reelStep(loaded, 0, 0.8, 5, 1 / 60);
    assert.ok(loaded.speed < 0.001 && loaded.tension < 0.001);
});

test("reel response remains bounded and rejects invalid time or speed", () => {
    const s = { speed: 0, tension: 0 };
    for (let n = 0; n < 600; n++) {
        assert.ok(reelStep(s, n % 2 ? 5 : -5, 3, 4, 1 / 60) >= 0);
        assert.ok(s.speed >= 0 && s.speed <= 4 && s.tension >= 0 && s.tension <= 1);
    }
    assert.throws(() => reelStep(s, 1, 1, 5, NaN));
    assert.throws(() => reelStep(s, 1, 1, -1, 0.1));
});
