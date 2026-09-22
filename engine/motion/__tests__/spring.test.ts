import assert from "node:assert/strict";
import { test } from "node:test";
import { SPRINGS, settleTime, settled, springAt } from "../spring";

test("a spring starts where it was, ends where it is going, and is the same at the same time", () => {
    const at = (t: number) => springAt(SPRINGS.snap, 0, 10, 0, t);
    assert.equal(at(0).x, 0);
    assert.ok(Math.abs(at(3).x - 10) < 1e-6, `${at(3).x}`);
    assert.deepEqual(at(0.2), at(0.2));
    assert.ok(settled(at(3), 10));
    assert.ok(!settled(at(0.05), 10));
});

test("critically damped never overshoots; the swing does, once, and rings down", () => {
    let over = false;
    for (let t = 0; t < 3; t += 0.01)
        if (springAt(SPRINGS.snap, 0, 1, 0, t).x > 1 + 1e-9) over = true;
    assert.ok(!over, "snap overshot");
    let peak = 0;
    for (let t = 0; t < 3; t += 0.01) peak = Math.max(peak, springAt(SPRINGS.swing, 0, 1, 0, t).x);
    assert.ok(peak > 1.1 && peak < 1.6, `swing peak ${peak}`);
    assert.ok(settled(springAt(SPRINGS.swing, 0, 1, 0, 4), 1), "swing settles within the bound");
    assert.ok(settleTime(SPRINGS.swing, 0, 1, 0) <= 4);
});

test("an overdamped spring and a spring given a push both still arrive", () => {
    const slow = springAt({ hz: 2, zeta: 1.8 }, 5, 0, 0, 3);
    assert.ok(Math.abs(slow.x) < 0.01, `${slow.x}`);
    const pushed = springAt(SPRINGS.back, 0, 4, -30, 0.02);
    assert.ok(pushed.x < 0, "a push away from the target moves it away first");
    assert.ok(settled(springAt(SPRINGS.back, 0, 4, -30, 3), 4));
});

test("an overdamped spring stays where it is going from the time settleTime gives", () => {
    const two = { hz: 2, zeta: 2 };
    assert.ok(Math.abs(springAt(two, 0, 1, 0, settleTime(two, 0, 1, 0)).x - 1) < 0.003);
    let checked = 0;
    for (const zeta of [1.0001, 1.05, 1.2, 1.5, 2, 3])
        for (const hz of [0.5, 2, 4.5])
            for (const [from, to, v0] of [
                [0, 10, 0],
                [5, -5, 30],
                [-40, 40, -60],
                [0, 1, 20],
            ] as const) {
                const s = { hz, zeta };
                const at = settleTime(s, from, to, v0);
                if (at >= 4) continue;
                checked++;
                for (let t = at; t < at + 3; t += 0.01) {
                    const off = Math.abs(springAt(s, from, to, v0, t).x - to);
                    assert.ok(
                        off < 0.003,
                        `hz ${hz} zeta ${zeta} ${from} to ${to} v0 ${v0}: ${off} at ${t}`,
                    );
                }
            }
    assert.ok(checked > 20, `only ${checked} springs settled inside the 4 s bound`);
});
