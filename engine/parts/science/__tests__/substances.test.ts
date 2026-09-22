import assert from "node:assert/strict";
import { test } from "node:test";
import { mix, nameOf, parseRecipe } from "../../../pigment";
import { CHANGES, INDICATOR, LIQUIDS, bandOf, iceLeft, kindOfBand, rustOf } from "../substances";

test("the indicator says acid for red, alkali for green, and only 'not an acid' for blue", () => {
    const kind = (liq: string): "acid" | "alkali" | null =>
        kindOfBand(bandOf(LIQUIDS[liq]?.ph ?? 7));
    assert.equal(bandOf(LIQUIDS.lemon?.ph ?? 7).colour, "red");
    assert.equal(kind("lemon"), "acid");
    assert.equal(kind("washingsoda"), "alkali");
    assert.equal(kind("water"), null);
    assert.equal(bandOf(LIQUIDS.bakingsoda?.ph ?? 7).colour, "blue");
    for (let ph = 1; ph <= 14; ph++) {
        assert.ok(bandOf(ph).from <= ph && ph <= bandOf(ph).to, `pH ${ph} has a band`);
    }
});

test("every colour on the indicator chart is the paint box's colour of that name, clear of any line", () => {
    for (const band of INDICATOR) {
        const recipe = parseRecipe(band.paint);
        assert.ok(recipe, band.paint);
        const named = nameOf(mix(recipe ?? []));
        assert.equal(named.name, band.colour, `${band.paint} mixes to ${named.name}`);
        assert.equal(named.close, false, `${band.paint} is too near the next colour to name`);
    }
});

test("ice melts a quarter every ten minutes on the table, and rust needs water and air", () => {
    assert.deepEqual(
        [0, 10, 20, 30, 40].map((m) => iceLeft(m, 1)),
        [4, 3, 2, 1, 0],
    );
    assert.deepEqual(
        [0, 10, 20].map((m) => iceLeft(m, 2)),
        [4, 2, 0],
    );
    assert.equal(iceLeft(60, 0), 4);
    assert.ok(rustOf("salt", 7) > rustOf("water", 7));
    for (const jar of ["dry", "oil", "painted"]) assert.equal(rustOf(jar, 30), 0, jar);
});

test("the changes that can be undone are the five a child can reverse at home", () => {
    const undo = Object.entries(CHANGES)
        .filter(([, c]) => c.undo)
        .map(([k]) => k)
        .sort();
    assert.deepEqual(undo, [
        "boil-water",
        "dissolve-sugar",
        "freeze-water",
        "melt-chocolate",
        "melt-ice",
    ]);
    for (const c of Object.values(CHANGES)) {
        assert.equal(c.makes, !c.undo, "here a new material and not undoing go together");
    }
});
