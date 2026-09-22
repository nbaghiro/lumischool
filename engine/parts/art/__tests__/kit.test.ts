import assert from "node:assert/strict";
import { test } from "node:test";
import { lightness, mix, nameOf, parseRecipe, rgbOf } from "../../../pigment";
import { ladderRecipe, mirrorOptions, mirrorsAmong } from "../kit";

const made = (s: string): string => {
    const r = parseRecipe(s);
    assert.ok(r, `${s} is a recipe`);
    return mix(r);
};

test("white makes a tint and black a shade, and the tints are the palette", () => {
    assert.equal(nameOf(made("red+white")).name, "pink");
    for (const c of ["red", "blue", "green"]) {
        assert.ok(
            lightness(made(`${c}+white`)) > lightness(made(c)) + 0.05,
            `${c} and white is lighter`,
        );
        assert.ok(
            lightness(made(`${c} 4+black`)) < lightness(made(c)) - 0.03,
            `${c} and black is darker`,
        );
    }
    // red and white is close to the palette's berry, blue and white to its sky
    const near = (a: string, b: string): boolean =>
        rgbOf(a).every((v, i) => Math.abs(v - (rgbOf(b)[i] ?? 0)) < 30);
    assert.ok(near(made("red+white"), "#F39CBF"), made("red+white"));
    assert.ok(near(made("blue+white"), "#8CC7EF"), made("blue+white"));
    const up = [0, 1, 2, 3, 4].map((i) => lightness(made(ladderRecipe("red", "white", i))));
    assert.deepEqual(
        [...up].sort((a, b) => a - b),
        up,
        "each step of a tint ladder is lighter than the last",
    );
});

test("the mirror question has one mirror among its halves, and the copy is the other way round", () => {
    for (let seed = 1; seed <= 6; seed++)
        for (let k = 0; k < 3; k++) {
            const { half, options, right } = mirrorOptions(seed, 4, 3, k);
            assert.deepEqual(mirrorsAmong(half, options), [right], `seed ${seed}`);
            assert.equal(right, k);
        }
});
