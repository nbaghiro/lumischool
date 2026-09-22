// The paint box mixes like paint: every pigment a reflectance curve, a mix worked out band by band, and
// a colour named and told warm from cool, checked against the numbers rather than by eye.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    PIGMENTS,
    hexOf,
    lightness,
    mix,
    mixAmounts,
    nameOf,
    panColour,
    parseRecipe,
    recipeText,
    rgbOf,
    warmth,
} from "../pigment";

const made = (s: string) => {
    const r = parseRecipe(s);
    assert.ok(r, `${s} is a recipe`);
    return mix(r);
};

test("each pan's curve paints the pan's own colour", () => {
    for (const [j, p] of PIGMENTS.entries()) {
        const got = mixAmounts(PIGMENTS.map((_, k) => (k === j ? 1 : 0))),
            want = rgbOf(panColour(p));
        got.forEach((v, c) =>
            assert.ok(Math.abs(v - (want[c] ?? 0)) <= 2, `${p}: ${hexOf(got)} for ${panColour(p)}`),
        );
    }
});

test("blue and yellow make green, where averaging makes grey", () => {
    assert.equal(nameOf(made("blue+yellow")).name, "green");
    const [b, y] = [rgbOf(panColour("blue")), rgbOf(panColour("yellow"))];
    assert.equal(
        nameOf(hexOf(b.map((v, i) => (v + (y[i] ?? 0)) / 2))).name,
        "grey",
        "averaging the bytes is the mistake this avoids",
    );
    assert.equal(nameOf(made("red+yellow")).name, "orange");
    assert.equal(nameOf(made("red+blue")).name, "purple");
    assert.equal(nameOf(made("red+yellow+blue")).name, "brown");
    assert.equal(nameOf(made("red+green")).name, "brown", "opposites mixed go dull");
});

test("the parts matter: more yellow is a yellower, lighter green", () => {
    const yellowish = made("yellow 2+blue"),
        bluish = made("yellow+blue 2");
    assert.ok(lightness(yellowish) > lightness(bluish));
    assert.equal(nameOf(yellowish).name, "green");
    assert.equal(nameOf(bluish).name, "green");
});

test("warm and cool follow the classroom, and a colour on the line is neither", () => {
    for (const p of ["red", "orange", "yellow", "pink"] as const)
        assert.equal(warmth(panColour(p)), "warm", p);
    for (const p of ["blue", "sky", "green"] as const)
        assert.equal(warmth(panColour(p)), "cool", p);
    assert.equal(warmth(panColour("white")), null);
});

test("a recipe reads the way it is written, and says itself back", () => {
    assert.deepEqual(parseRecipe("yellow 2 + blue"), [
        { pigment: "yellow", parts: 2 },
        { pigment: "blue", parts: 1 },
    ]);
    assert.deepEqual(parseRecipe("2 yellow and 1 blue"), [
        { pigment: "yellow", parts: 2 },
        { pigment: "blue", parts: 1 },
    ]);
    assert.deepEqual(parseRecipe("red, red"), [{ pigment: "red", parts: 2 }]);
    assert.equal(parseRecipe("purple"), null, "purple is a mix, not a pan");
    assert.equal(
        recipeText([
            { pigment: "red", parts: 1 },
            { pigment: "white", parts: 1 },
        ]),
        "red and white",
    );
});
