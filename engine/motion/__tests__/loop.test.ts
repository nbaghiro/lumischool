import assert from "node:assert/strict";
import { test } from "node:test";
import { advance, loop, ticker } from "../loop";

test("the fixed step runs whole steps and keeps the remainder, and caps a long gap", () => {
    const l = loop(100);
    const seen: number[] = [];
    const alpha = advance(l, 0.035, (t) => seen.push(t));
    assert.equal(seen.length, 3);
    assert.ok(Math.abs(alpha - 0.5) < 1e-9, `${alpha}`);
    assert.ok(Math.abs(l.time - 0.03) < 1e-9);
    const before = seen.length;
    advance(l, 5, (t) => seen.push(t));
    assert.equal(
        seen.length - before,
        10,
        "a five second gap is the ticker's longest frame of steps, not five hundred",
    );
    assert.equal(l.acc, 0, "and the time that could not be stepped is dropped");
});

test("a device at ten frames a second plays at full speed, and a time that is not finite is none", () => {
    const l = loop(120);
    for (let i = 0; i < 100; i++) advance(l, 0.1, () => {});
    assert.ok(
        Math.abs(l.time - 10) <= l.step + 1e-9,
        `ten seconds of frames simulated ${l.time} s`,
    );
    const k = loop(4);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])
        advance(k, bad, () => {});
    assert.equal(k.acc, 0);
    let steps = 0;
    advance(k, 1, () => steps++);
    assert.equal(steps, 4, "and the loop still steps afterwards");
});

test("a frame that throws stops the ticker, and start() runs it again", () => {
    const queue: ((t: number) => void)[] = [];
    let calls = 0;
    const tk = ticker({
        now: () => 0,
        schedule: (f) => queue.push(f),
        onFrame: () => {
            calls++;
            if (calls === 2) throw new Error("a bug in a frame");
            return true;
        },
    });
    const next = (t: number): void => {
        const f = queue.shift();
        assert.ok(f, "the ticker asked for a frame");
        f(t);
    };
    tk.start();
    next(16);
    assert.throws(() => next(32), /a bug in a frame/);
    assert.equal(tk.running, false);
    assert.equal(queue.length, 0);
    tk.start();
    assert.equal(tk.running, true);
    next(48);
    assert.equal(calls, 3);
});

test("a ticker measures frames from the times it is given and stops when asked", () => {
    const queue: ((t: number) => void)[] = [];
    const frames: [number, number][] = [];
    let keep = true;
    let clock = 1000;
    const tk = ticker({
        now: () => clock,
        schedule: (f) => queue.push(f),
        onFrame: (t, dt) => {
            frames.push([t, dt]);
            return keep;
        },
    });
    const next = (t: number): void => {
        const f = queue.shift();
        assert.ok(f, "the ticker asked for a frame");
        f(t);
    };
    tk.start();
    assert.equal(tk.now(), 0, "the clock starts at the start");
    clock = 1008;
    assert.equal(tk.now(), 0.008, "and reads the time now, between frames");
    for (const t of [1000, 1016, 1033, 1050]) next(t);
    assert.deepEqual(
        frames.map((f) => f[0]),
        [0, 0.016, 0.033, 0.05],
    );
    assert.equal(frames[0]?.[1], 0, "the first frame has no length");
    const second = frames[1];
    assert.ok(second);
    assert.ok(Math.abs(second[1] - 0.016) < 1e-9);
    keep = false;
    next(1066);
    assert.equal(tk.running, false);
    assert.equal(queue.length, 0);
});
