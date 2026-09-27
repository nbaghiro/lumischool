import assert from "node:assert/strict";
import { test } from "node:test";
import { lipAngle, pourRate, transfer, type Pouring } from "../vessel";

const P: Pouring = { full: 0.2, empty: 1.5, span: 0.6, most: 0.5 };

test("a fuller vessel pours at a smaller tilt, and a tilt short of the lip pours nothing", () => {
    assert.equal(lipAngle(10, 10, P), 0.2);
    assert.equal(lipAngle(0, 10, P), 1.5);
    assert.ok(lipAngle(5, 10, P) > 0.2 && lipAngle(5, 10, P) < 1.5);
    assert.equal(pourRate(0.1, 10, 10, P), 0);
    assert.equal(pourRate(1.5, 0, 10, P), 0, "an empty vessel pours nothing however far it tips");
});

test("a gentle tilt dribbles and a steep one gushes, up to the fastest pour", () => {
    const dribble = pourRate(0.3, 10, 10, P),
        gush = pourRate(0.8, 10, 10, P);
    assert.ok(dribble > 0 && dribble < gush);
    assert.equal(pourRate(2, 10, 10, P), 5);
});

test("a transfer moves only what there is and what fits, and spills the rest", () => {
    assert.deepEqual(transfer(5, 3, 2), { moved: 2, spilt: 0 });
    assert.deepEqual(transfer(5, 1, 2), { moved: 1, spilt: 1 });
    assert.deepEqual(transfer(1, 3, 2), { moved: 1, spilt: 0 });
    assert.deepEqual(transfer(5, 0, 2), { moved: 0, spilt: 2 });
});
