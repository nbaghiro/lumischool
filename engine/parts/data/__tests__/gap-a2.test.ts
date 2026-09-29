import assert from "node:assert/strict";
import { test } from "node:test";
import { barColumn, barValueAt } from "../bargraph";

const chart = { labels: ["a", "b", "c", "d"], values: [3, 6, 0, 0], max: 8, touch: 0 };

test("bars stand three squares apart, or two with no gaps as a histogram", () => {
    assert.deepEqual(barColumn(chart, 2), { x: 9.5, w: 2 });
    assert.deepEqual(barColumn({ ...chart, touch: 1 }, 2), { x: 7.5, w: 2 });
    assert.equal(
        barColumn({ ...chart, touch: 1 }, 1).x + 2,
        barColumn({ ...chart, touch: 1 }, 2).x,
    );
});

test("a bar let go lands on the nearest whole unit, from nought to the top of the scale", () => {
    // the axis's nought is max + 1 squares down, and each unit is a square
    assert.equal(barValueAt(chart, 9), 0);
    assert.equal(barValueAt(chart, 1), 8);
    assert.equal(barValueAt(chart, 6), 3);
    assert.equal(barValueAt(chart, 5.6), 3);
    assert.equal(barValueAt(chart, 5.4), 4);
    assert.equal(barValueAt(chart, -3), 8);
    assert.equal(barValueAt(chart, 12), 0);
    assert.equal(barValueAt({ ...chart, values: [12, 0, 0, 0] }, 1), 12);
});
