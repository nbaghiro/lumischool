import assert from "node:assert/strict";
import { test } from "node:test";
import { drawn } from "../../__tests__/check";
import { tallyTable } from "../tallytable";

test("a tally table given counts and labels draws the rows its own rows would", () => {
    const own = tallyTable.params;
    const given = {
        ...own,
        rows: [],
        labels: own.rows.map((r) => r.label),
        counts: own.rows.map((r) => r.count),
    };
    assert.deepEqual(tallyTable.box(given), tallyTable.box(own));
    assert.deepEqual(
        drawn(tallyTable, given, { paper: true }),
        drawn(tallyTable, own, { paper: true }),
    );
    // a count without its label is a row without a name, not a row left out
    assert.equal(tallyTable.box({ ...given, labels: ["Red"] }).h, tallyTable.box(own).h);
});
