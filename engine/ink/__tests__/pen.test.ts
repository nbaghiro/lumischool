import assert from "node:assert/strict";
import { test } from "node:test";
import rough from "roughjs";
import { withSeededRandom } from "../pen";

const dotted = (): string => {
    const gen = rough.generator();
    const shape = gen.circle(30, 30, 40, {
        seed: 7,
        fill: "#000",
        fillStyle: "dots",
        hachureGap: 5,
    });
    return JSON.stringify(gen.toPaths(shape));
};

test("a dotted fill drawn twice with one seed is the same drawing", () => {
    assert.equal(withSeededRandom(7, dotted), withSeededRandom(7, dotted));
});

test("rough.js on its own would draw a dotted fill differently each time, which is why the pen seeds it", () => {
    assert.notEqual(dotted(), dotted());
});

test("seeding leaves Math.random as it was afterwards", () => {
    const before = Math.random;
    withSeededRandom(3, () => Math.random());
    assert.equal(Math.random, before);
});
