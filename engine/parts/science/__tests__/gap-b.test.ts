import assert from "node:assert/strict";
import { test } from "node:test";
import { bentAngle, looksDeep } from "../refraction";
import { offSquare, panelWatts } from "../solarpanel";
import { PLOUGH, POLARIS, poleHeight, starAt, turnIn } from "../starmap";

test("a beam into water or glass bends towards the upright by Snell's law", () => {
    // asin(sin 30° / 1.33) = 22.08°, asin(sin 30° / 1.5) = 19.47°, asin(sin 60° / 1.33) = 40.63°
    assert.equal(bentAngle(30, 0), 22);
    assert.equal(bentAngle(30, 1), 19);
    assert.equal(bentAngle(60, 0), 41);
    assert.equal(bentAngle(45, 1), 28);
    assert.equal(bentAngle(0, 0), 0);
    for (let a = 1; a <= 80; a++)
        assert.ok(bentAngle(a, 0) <= a && bentAngle(a, 1) <= bentAngle(a, 0));
});

test("a coin under water looks raised to its depth over 1.33", () => {
    assert.equal(looksDeep(12), 9);
    assert.equal(looksDeep(8), 6);
    assert.equal(looksDeep(10), 7.5);
});

test("the sky turns anticlockwise round the pole star, 15 degrees an hour", () => {
    assert.equal(turnIn(6), 90);
    assert.equal(poleHeight(52), 52);
    const star = PLOUGH[3] ?? POLARIS;
    const [x0, y0] = starAt(star, star.ra);
    assert.ok(
        Math.abs(x0) < 1e-9 && y0 > 0,
        "a star whose hour it is stands straight above the pole",
    );
    const [x6, y6] = starAt(star, star.ra + 6);
    assert.ok(
        x6 < 0 && Math.abs(y6) < 1e-9,
        "six hours later it stands to the left, a quarter turn anticlockwise",
    );
    assert.ok(Math.abs(Math.hypot(x6, y6) - (90 - star.dec)) < 1e-9);
});

test("the pointers, Merak through Dubhe, lead to the pole star about five times their gap away", () => {
    const [dubhe, merak] = PLOUGH;
    assert.ok(dubhe && merak);
    for (const sky of [0, 7, 13, 19]) {
        const [dx, dy] = starAt(dubhe, sky),
            [mx, my] = starAt(merak, sky),
            [px, py] = starAt(POLARIS, sky),
            gap = Math.hypot(dx - mx, dy - my),
            off = Math.abs((dx - mx) * (py - my) - (dy - my) * (px - mx)) / gap,
            along = Math.hypot(px - dx, py - dy) / gap;
        assert.ok(off < 3, `the pointer line misses the pole star by ${off.toFixed(2)} degrees`);
        assert.ok(along > 4.5 && along < 6, `the pole star is ${along.toFixed(2)} gaps on`);
    }
});

test("a solar panel gives its watts times the light's share times the cosine of the angle off square", () => {
    assert.equal(offSquare(40, 50), 0);
    assert.equal(panelWatts(200, 100, 40, 50), 200);
    // flat under a sun 30° up: 60° off square, cos 60° = 0.5
    assert.equal(panelWatts(200, 100, 30, 0), 100);
    assert.equal(panelWatts(300, 50, 60, 30), 150);
    // 30° off square: 250 × 0.8 × 0.866 = 173.2
    assert.equal(panelWatts(250, 80, 20, 40), 173);
    // 80° off square: 200 × cos 80° = 34.7
    assert.equal(panelWatts(200, 100, 10, 0), 35);
    assert.equal(panelWatts(200, 100, 90, 90), 0);
    assert.equal(panelWatts(200, 0, 40, 50), 0);
});
