import assert from "node:assert/strict";
import { test } from "node:test";
import { FAMILIES, MATHS } from "../drawing";
import { GROUPING, IDEAS, SHELVES } from "../shelf";
import { LINES } from "./check";

test("the shelves are the families, in their order, and the guides have no shelf of their own", () => {
    assert.deepEqual(
        SHELVES.map((s) => s.id),
        FAMILIES.filter((f) => f !== "guide"),
    );
    assert.deepEqual(
        SHELVES.filter((s) => s.band === "Maths").map((s) => s.id),
        [...MATHS],
    );
});

test("every drawing in the catalogue has a line in the grouping, and every line names one", () => {
    const ids = Object.values(LINES).flatMap((lines) => Object.keys(lines ?? {}));
    assert.deepEqual(Object.keys(GROUPING).sort(), [...ids].sort());
});

test("no shelf, idea or placement has an em-dash in what it says", () => {
    for (const s of SHELVES) assert.doesNotMatch(`${s.name} ${s.blurb}`, /—/, s.id);
    for (const [id, idea] of Object.entries(IDEAS))
        assert.doesNotMatch(`${idea.name} ${idea.words}`, /—/, id);
    for (const [id, placed] of Object.entries(GROUPING)) assert.doesNotMatch(placed.words, /—/, id);
});
