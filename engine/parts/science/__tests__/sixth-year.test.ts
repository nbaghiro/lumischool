import assert from "node:assert/strict";
import { test } from "node:test";
import { eclipseOf } from "../eclipse";
import { efficiencyOf, energyBands } from "../energyflow";
import { beadsFallen, roomReadings } from "../heatflow";
import { sledgeBack, sledgeMotion } from "../sledgeforce";
import { midnightHeight, noonHeight, sunAt, sunOverhead } from "../tilt";
import { hertzOf } from "../wave";

test("the tilted Earth keeps the sun up all day north of the Arctic circle in June, and none in December", () => {
    const june = sunOverhead(0, 23.5);
    const december = sunOverhead(1, 23.5);
    assert.equal(sunAt(80, june), "all day");
    assert.equal(sunAt(60, june), "day and night");
    assert.equal(sunAt(80, december), "all night");
    assert.equal(sunAt(-80, june), "all night");
    assert.equal(sunAt(66.5, june), "edge");
    assert.equal(sunAt(80, sunOverhead(0, 0)), "day and night");
    assert.equal(noonHeight(80, june), 33.5);
    assert.equal(noonHeight(23.5, june), 90);
    assert.equal(noonHeight(60, december), 6.5);
    assert.equal(midnightHeight(80, june), 13.5);
    assert.ok(midnightHeight(60, june) < 0);
});

test("a sledge changes speed only when the forces along the snow do not balance", () => {
    assert.equal(sledgeMotion([120], [80], 1), "speeds up");
    assert.equal(sledgeMotion([60, 40], [70, 30], 1), "keeps a steady speed");
    assert.equal(sledgeMotion([50], [80], 1), "slows down");
    assert.equal(sledgeMotion([50], [80], 0), "stays still");
    assert.equal(sledgeMotion([90], [80], 0), "starts to move");
});

test("friction on a still sledge pushes back only as hard as the pull, up to its most", () => {
    assert.deepEqual(sledgeBack([100], [150], 0), [100]);
    assert.deepEqual(sledgeBack([], [220], 0), []);
    assert.deepEqual(sledgeBack([180], [150], 0), [150]);
    assert.deepEqual(sledgeBack([100], [80, 20], 1), [80, 20]);
});

test("the energy bands add up, with the blank one worked out from the rest", () => {
    assert.deepEqual(energyBands({ input: 1000, useful: 0, wasted: [300, 100], blank: 1 }), {
        input: 1000,
        useful: 600,
        wasted: [300, 100],
    });
    assert.equal(energyBands({ input: 0, useful: 1800, wasted: [150, 50], blank: 0 }).input, 2000);
    assert.equal(energyBands({ input: 100, useful: 10, wasted: [0], blank: 2 }).wasted[0], 90);
    assert.equal(efficiencyOf(1000, 600), 60);
});

test("heat, sound and eclipses follow the rules their drawings are drawn by", () => {
    assert.deepEqual(
        ["copper", "aluminium", "brass", "steel", "glass", "wood"].map((r) => beadsFallen(r, 10)),
        [5, 4, 3, 2, 0, 0],
    );
    assert.equal(beadsFallen("copper", 5), 3);
    assert.equal(beadsFallen("copper", 0), 0);
    assert.deepEqual(roomReadings(0), [22, 20, 18]);
    assert.equal(hertzOf(4, 10), 400);
    assert.equal(hertzOf(3, 100), 30);
    assert.equal(eclipseOf(0, 0), "solar eclipse");
    assert.equal(eclipseOf(1, 0), "lunar eclipse");
    assert.equal(eclipseOf(1, 1), "no eclipse");
});
