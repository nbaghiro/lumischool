import assert from "node:assert/strict";
import { test } from "node:test";
import { flowAt, flowTime, shared, type Flow } from "../flow";

const f: Flow = { amount: 300, rate: 400, ramp: 0.15 };

test("the two levels always hold together what they held before", () => {
    const end = flowTime(f);
    for (let t = -0.1; t <= end + 0.1; t += 0.01) {
        const s = shared(f, 500, 100, t);
        assert.ok(Math.abs(s.giver + s.taker - 600) < 1e-9, `${t}`);
    }
    assert.deepEqual(shared(f, 500, 100, end), { giver: 200, taker: 400, rate: 0 });
});

test("a flow starts and stops over its ramp, holds its rate between, and only ever moves one way", () => {
    let last = 0;
    const end = flowTime(f);
    for (let t = 0; t <= end; t += 0.005) {
        const { moved, rate } = flowAt(f, t);
        assert.ok(moved >= last - 1e-9 && rate >= 0 && rate <= f.rate + 1e-9, `${t}`);
        last = moved;
    }
    assert.equal(flowAt(f, end / 2).rate, f.rate);
    assert.ok(flowAt(f, 0.02).rate < f.rate && flowAt(f, end - 0.02).rate < f.rate);
});

test("a small amount never reaches the steady rate, and nothing to move takes no time", () => {
    const small: Flow = { ...f, amount: 20 };
    assert.equal(flowTime(small), 2 * f.ramp);
    assert.ok(Math.abs(flowAt(small, flowTime(small)).moved - 20) < 1e-9);
    assert.equal(flowTime({ ...f, amount: 0 }), 0);
});
