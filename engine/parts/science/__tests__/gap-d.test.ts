import assert from "node:assert/strict";
import { test } from "node:test";
import { airAfter, candleBurns } from "../chamber";
import { EARTH_LAYERS, EARTH_RADIUS, layerAt, thicknessOf } from "../earthinside";
import { hydrogenBubbles } from "../substances";

const sealed = { place: 0, plants: 0, candle: 0, people: 0, light: 1, hours: 0 };

test("the Earth's layers meet end to end from the surface to the centre", () => {
    EARTH_LAYERS.forEach((l, i) => {
        assert.equal(l.from, i === 0 ? 0 : EARTH_LAYERS[i - 1]?.to);
    });
    assert.equal(EARTH_LAYERS.at(-1)?.to, EARTH_RADIUS);
    assert.deepEqual([0, 1, 2, 3].map(thicknessOf), [35, 2855, 2260, 1221]);
    assert.deepEqual(
        [10, 100, 2890, 3000, 5150, 6000, 6371, 6400].map(layerAt),
        [0, 1, 1, 2, 2, 3, 3, -1],
    );
});

test("a candle in a sealed jar burns the oxygen down to 16% and makes 25 carbon dioxide for 38 oxygen", () => {
    assert.deepEqual(airAfter({ ...sealed, candle: 1 }), { o2: 2100, co2: 4 });
    // 500 x 25 / 38 = 328.9, so 3.29 points on the 0.04 already there
    assert.deepEqual(airAfter({ ...sealed, candle: 1, hours: 3 }), { o2: 1600, co2: 333 });
    assert.equal(candleBurns(1600), false);
    assert.equal(candleBurns(1650), true);
});

test("a plant in light takes in carbon dioxide and gives out as much oxygen, and in the dark only breathes", () => {
    assert.deepEqual(airAfter({ ...sealed, candle: 1, plants: 1, hours: 4 }), {
        o2: 1800,
        co2: 133,
    });
    // after 7 hours all 3.33 points are taken in, and the candle would light again
    const later = airAfter({ ...sealed, candle: 1, plants: 1, hours: 7 });
    assert.deepEqual(later, { o2: 1933, co2: 0 });
    assert.equal(candleBurns(later.o2), true);
    assert.deepEqual(airAfter({ ...sealed, plants: 2, hours: 1 }), { o2: 2104, co2: 0 });
    assert.deepEqual(airAfter({ ...sealed, plants: 2, light: 0, hours: 10 }), {
        o2: 1900,
        co2: 204,
    });
    assert.deepEqual(airAfter({ ...sealed, candle: 1, plants: 1, light: 0, hours: 5 }), {
        o2: 1550,
        co2: 383,
    });
});

test("in the cabin a tray in light keeps up with one of the crew", () => {
    const cabin = { ...sealed, place: 1 };
    assert.deepEqual(airAfter({ ...cabin, people: 2, plants: 2, hours: 12 }), { o2: 2100, co2: 4 });
    assert.deepEqual(airAfter({ ...cabin, people: 3, plants: 1, hours: 4 }), {
        o2: 1900,
        co2: 204,
    });
    assert.deepEqual(airAfter({ ...cabin, people: 3, plants: 4, light: 0, hours: 6 }), {
        o2: 1530,
        co2: 574,
    });
    // a candle is never lit in the cabin, and the jar holds no crew
    assert.deepEqual(airAfter({ ...cabin, candle: 1, hours: 2 }), { o2: 2100, co2: 4 });
    assert.deepEqual(airAfter({ ...sealed, people: 3, hours: 2 }), { o2: 2100, co2: 4 });
});

test("reactive metals give hydrogen in acid, most first, and copper and water give none", () => {
    assert.deepEqual(
        [1, 2, 3, 4].map((m) => hydrogenBubbles(m, 1)),
        [10, 6, 3, 0],
    );
    assert.deepEqual(
        [0, 1, 2, 3, 4].map((m) => hydrogenBubbles(m, 0)),
        [0, 0, 0, 0, 0],
    );
});
