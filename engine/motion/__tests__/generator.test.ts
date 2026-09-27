import { test } from "node:test";
import assert from "node:assert/strict";
import { certified, derive, type Variation } from "../generator";
import { seeded } from "../spawn";

/** A pond of stepping stones: a layout can be crossed when no gap is wider than a hop of three. */
const stones: Variation<number[]> = {
    method: "hop-search",
    generate: (seed) => {
        const r = seeded(seed);
        const out = [0];
        for (let i = 0; i < 5; i++) out.push((out[i] ?? 0) + 1 + Math.floor(r() * 4));
        return out;
    },
    read: (value) =>
        Array.isArray(value) && value.every((v) => typeof v === "number") ? value : null,
    solve: (layout) => layout.every((x, i) => i === 0 || x - (layout[i - 1] ?? 0) <= 3) || null,
};

test("a certified layout is one the solver can cross, and the same seed gives the same layout", () => {
    for (let seed = 0; seed < 50; seed++) {
        const layout = certified(stones, seed, 0, 64);
        assert.ok(stones.solve?.(layout, 0));
        assert.deepEqual(certified(stones, seed, 0, 64), layout);
    }
});

test("a seed whose own layout can be crossed is kept as it is", () => {
    const seed = [...Array(100).keys()].find((s) => stones.solve?.(stones.generate(s, 0), 0));
    assert.ok(seed !== undefined);
    assert.deepEqual(certified(stones, seed, 0), stones.generate(seed, 0));
});

test("no crossable layout in the tries allowed is an error, not a layout", () => {
    const never: Variation<number> = {
        ...stones,
        generate: () => 9,
        read: () => null,
        solve: () => null,
    };
    assert.throws(() => certified(never, 1, 0, 4), /No solvable layout/);
});

test("derived seeds spread over the range, and the validator reads stored layouts back", () => {
    const seeds = new Set([0, 1, 2, 3].map((i) => derive(7, i)));
    assert.equal(seeds.size, 4);
    for (const s of seeds) assert.ok(s >= 0 && s <= 0xffffffff);
    assert.deepEqual(stones.read(JSON.parse(JSON.stringify([0, 2, 4])), 0), [0, 2, 4]);
    assert.equal(stones.read({ not: "stones" }, 0), null);
});
