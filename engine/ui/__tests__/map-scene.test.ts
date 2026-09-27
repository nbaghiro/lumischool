import assert from "node:assert/strict";
import { test } from "node:test";
import { bounds, multiply, translation, type Affine } from "../gl";
import { affineOf, between, frameOf, parts, toneOf } from "../map-scene";

const near = (a: readonly number[], b: readonly number[]): void =>
    a.forEach((x, i) =>
        assert.ok(Math.abs(x - (b[i] ?? NaN)) < 1e-9, `${a.join()} is not ${b.join()}`),
    );

test("an affine applies the right-hand transform first, as CSS composes a transform list", () => {
    const m = multiply(translation(10, 0), [2, 0, 0, 2, 0, 0]);
    near(m, [2, 0, 0, 2, 10, 0]);
    assert.deepEqual(bounds(m, { x: 1, y: 1, w: 1, h: 1 }), { x: 12, y: 2, w: 2, h: 2 });
});

test("a transform the painters write is read as parts where it can be, and as a matrix where not", () => {
    const moved = parts("translate(3px, 4px) rotate(90deg) scale(2)");
    assert.ok(moved && "tx" in moved);
    near(affineOf(moved), [0, 2, -2, 0, 3, 4]);
    const svg = parts("matrix(1 0 0 1 5 6)");
    assert.ok(svg && !("tx" in svg));
    near(svg, [1, 0, 0, 1, 5, 6]);
    // an svg's rotate by degrees about a centre keeps the centre where it was
    const turned = parts("rotate(180 10 10)");
    assert.ok(turned);
    const at = affineOf(turned);
    near([at[0] * 10 + at[2] * 10 + at[4], at[1] * 10 + at[3] * 10 + at[5]], [10, 10]);
    assert.equal(parts("skewX(10deg)"), null);
});

test("the filters the map's drawings take become the shader's tone, and a glow is left to the texture", () => {
    assert.deepEqual(toneOf("grayscale(1) contrast(1.08)"), {
        gray: 1,
        saturate: 1,
        contrast: 1.08,
        brightness: 1,
    });
    assert.deepEqual(toneOf("drop-shadow(0 0 16px red)"), {
        gray: 0,
        saturate: 1,
        contrast: 1,
        brightness: 1,
    });
});

test("keyframes interpolate their parts as CSS does, and matrices component by component", () => {
    const turn = [frameOf(0, "rotate(0deg)", "", ""), frameOf(1, "rotate(360deg)", "", "")];
    // a whole turn is a turn, where mixing its matrices would stand still
    near(between(turn, 0.25).m, [0, 1, -1, 0, 0, 0]);
    const drift = [
        frameOf(0, "translateX(-22px)", "0.5", "ease-in-out"),
        frameOf(1, "translateX(22px)", "1", ""),
    ];
    const half = between(drift, 0.5);
    near(half.m, [1, 0, 0, 1, 0, 0]);
    assert.ok(Math.abs((half.opacity ?? 0) - 0.75) < 1e-6);
    const written: Affine[] = [
        [1, 0, 0, 1, 0, 0],
        [1, 0, 0, 1, 10, 0],
    ];
    const script = written.map((m, i) => frameOf(i, `matrix(${m.join(", ")})`, "", "linear"));
    near(between(script, 0.3).m, [1, 0, 0, 1, 3, 0]);
});
