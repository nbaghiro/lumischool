import assert from "node:assert/strict";
import { test } from "node:test";
import { drawn } from "../../__tests__/check";
import { pieChart } from "../pie";

test("a pie chart given values, labels and colours draws the slices its own slices would", () => {
    const own = pieChart.params;
    const given = {
        ...own,
        slices: [],
        labels: own.slices.map((s) => s.label),
        values: own.slices.map((s) => s.value),
        colors: own.slices.map((s) => s.color),
    };
    assert.deepEqual(
        drawn(pieChart, given, { paper: true }),
        drawn(pieChart, own, { paper: true }),
    );
    // without colours the slices take the markers in turn
    const plain = drawn(pieChart, { ...given, colors: [] }, { paper: true });
    assert.deepEqual(plain.anchors, drawn(pieChart, own, { paper: true }).anchors);
});
