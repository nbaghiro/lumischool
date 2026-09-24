import { strict as assert } from "node:assert";
import { test } from "node:test";
import { reads } from "../reads";

test("concurrent readers share a request without retaining evicted fulfilled promises", async () => {
    const cache = reads<string>((value) => value.length, 2, 5);
    let calls = 0;
    const load = async () => {
        calls++;
        return "aaa";
    };
    assert.deepEqual(await Promise.all([cache.read("a", load), cache.read("a", load)]), [
        "aaa",
        "aaa",
    ]);
    assert.equal(calls, 1);
    await cache.read("b", async () => "bbb");
    assert.equal(cache.size(), 1);
    await cache.read("a", load);
    assert.equal(calls, 2);
});

test("a required oversized body is delivered and failures can be retried", async () => {
    const cache = reads<string>((value) => value.length, 2, 3);
    assert.equal(await cache.read("large", async () => "abcdef"), "abcdef");
    assert.equal(cache.size(), 0);
    await assert.rejects(
        cache.read("a", async () => {
            throw new Error("offline");
        }),
    );
    assert.equal(await cache.read("a", async () => "a"), "a");
    assert.equal(await cache.read("missing", async () => null), null);
    assert.equal(await cache.read("missing", async () => "b"), "b");
});

test("recency protects reused content and separate owners share no data", async () => {
    const cache = reads<string>((value) => value.length, 2, 10);
    await cache.read("a", async () => "a");
    await cache.read("b", async () => "b");
    await cache.read("a", async () => "wrong");
    await cache.read("c", async () => "c");
    assert.equal(await cache.read("a", async () => "wrong"), "a");
    assert.equal(await cache.read("b", async () => "new"), "new");
    assert.equal(
        await reads<string>(() => 1).read("a", async () => "other family"),
        "other family",
    );
});
