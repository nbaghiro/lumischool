import assert from "node:assert/strict";
import { test } from "node:test";
import { frameWork } from "../scene-work";

test("scenes share a frame allowance and queued scenes precede returning work", () => {
    let now = 0;
    const frames: (() => void)[] = [];
    const queue = frameWork({
        now: () => now,
        request(run) {
            frames.push(run);
            return frames.length;
        },
        cancel() {},
    });
    const seen: string[] = [];
    queue.schedule((deadline) => {
        seen.push("first");
        now = deadline;
        queue.schedule(() => seen.push("first again"));
    });
    queue.schedule(() => seen.push("second"));
    assert.equal(frames.length, 1);
    frames[0]?.();
    assert.deepEqual(seen, ["first"]);
    frames[1]?.();
    assert.deepEqual(seen, ["first", "second", "first again"]);
});

test("disposing queued scenery cancels its pending frame", () => {
    const cancelled: number[] = [];
    const queue = frameWork({
        now: () => 0,
        request: () => 42,
        cancel: (id) => cancelled.push(id),
    });
    const id = queue.schedule(() => assert.fail("disposed scenery ran"));
    queue.cancel(id);
    assert.deepEqual(cancelled, [42]);
});

test("new work waits until the next frame even when the caller finishes early", () => {
    const frames: (() => void)[] = [];
    const seen: string[] = [];
    const queue = frameWork({
        now: () => 0,
        request(run) {
            frames.push(run);
            return frames.length;
        },
        cancel() {},
    });
    queue.schedule(() => {
        seen.push("one");
        queue.schedule(() => seen.push("two"));
    });
    frames[0]?.();
    assert.deepEqual(seen, ["one"]);
    frames[1]?.();
    assert.deepEqual(seen, ["one", "two"]);
});
