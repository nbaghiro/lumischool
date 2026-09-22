import assert from "node:assert/strict";
import { test } from "node:test";
import { dropAt, dropTime, impacts, type Drop } from "../drop";

const d: Drop = { from: 0, to: 6, v0: 0, g: 40, bounce: 0.35 };

test("a drop falls from where it was let go and is exactly on the floor once it has settled", () => {
    assert.equal(dropAt(d, 0).y, 0);
    const end = dropTime(d);
    assert.ok(end > 0);
    assert.equal(dropAt(d, end).y, 6);
    assert.deepEqual(dropAt(d, end + 3), { y: 6, v: 0 });
});

test("it never goes through the floor, and each bounce is lower than the one before", () => {
    const end = dropTime(d);
    for (let t = 0; t <= end + 0.1; t += 0.002) assert.ok(dropAt(d, t).y <= 6 + 1e-9, `${t}`);
    const hits = impacts(d);
    assert.ok(hits.length >= 2, "a hard fall bounces at least once");
    for (let i = 1; i < hits.length; i++) {
        const a = hits[i - 1],
            b = hits[i];
        assert.ok(a && b && b.speed < a.speed && b.t > a.t);
    }
});

test("it meets the floor at the moments it says, and a soft landing does not bounce", () => {
    for (const hit of impacts(d)) assert.ok(Math.abs(dropAt(d, hit.t).y - 6) < 1e-9);
    assert.equal(impacts({ ...d, from: 5.97 }).length, 1);
    assert.equal(impacts({ ...d, bounce: 0 }).length, 1);
});
