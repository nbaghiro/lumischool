import assert from "node:assert/strict";
import { test } from "node:test";
import { cuboidArea, cylinderArea, cylinderSide } from "../../shapes/net";
import { catchAt, hoursWords, meetAt, riverSpeeds } from "../motionline";
import {
    estimateSquares,
    exactSquares,
    sharesOf,
    squareArea,
    squareWords,
    squaresOf,
} from "../outlinearea";

test("every outline's squares are plainly whole, part or outside, and the estimate is near its area", () => {
    for (const shape of [0, 1, 2, 3]) {
        for (const share of sharesOf(shape).flat()) {
            const sliver = (share > 1e-9 && share < 0.05) || (share > 0.95 && share < 1 - 1e-9);
            assert.ok(!sliver, `outline ${shape} cuts a square by ${share}`);
        }
        const { whole, part } = squaresOf(shape);
        assert.equal(estimateSquares(shape), whole + part / 2);
        const exact = exactSquares(shape);
        assert.ok(
            Math.abs(estimateSquares(shape) - exact) / exact < 0.05,
            `outline ${shape} estimates ${estimateSquares(shape)} for ${exact}`,
        );
    }
    assert.deepEqual(squaresOf(1), { whole: 49, part: 33 });
    assert.equal(squareArea(100), 10000);
    assert.equal(squareWords(100, "m"), "1 ha");
    assert.equal(squareWords(50, "m"), "2500 m²");
    assert.equal(squareWords(1, "km"), "1 km²");
});

test("two movers meet and catch up where distance, speed and time say", () => {
    // 300 km at 60 and 40 km/h: 300 ÷ 100 = 3 h, 180 km from A
    assert.deepEqual(meetAt(300, 60, 40, 0), { t: 3, x: 180 });
    // the second leaves an hour later: 50 km gone, 220 ÷ 110 = 2 h more
    assert.deepEqual(meetAt(270, 50, 60, 1), { t: 3, x: 150 });
    assert.equal(meetAt(100, 60, 40, 2), null);
    // 40 km ahead, closing at 20 km/h: 2 h after the second leaves, 120 km out
    assert.deepEqual(catchAt(200, 40, 60, 1), { t: 3, x: 120 });
    assert.equal(catchAt(100, 40, 60, 1), null);
    assert.equal(catchAt(200, 60, 40, 1), null);
    assert.deepEqual(riverSpeeds(8, 2), { down: 10, up: 6 });
    assert.equal(riverSpeeds(2, 2), null);
    assert.equal(hoursWords(1.5), "1 h 30 min");
    assert.equal(hoursWords(0.25), "15 min");
    assert.equal(hoursWords(24 / 7), "about 3 h 26 min");
});

test("a net's surface area is its faces', with π as 3.14", () => {
    assert.equal(cuboidArea(6, 4, 3), 108);
    assert.equal(cuboidArea(5, 5, 5), 150);
    assert.equal(cylinderSide(3), 18.84);
    // two circles of 28.26 and a rectangle 18.84 by 10
    assert.equal(cylinderArea(3, 10), 244.92);
});
