import assert from "node:assert/strict";
import { test } from "node:test";
import { cellLines, subpaths, type Stroke } from "../map-tile-lines";

test("each subpath is rounded to a tenth, written relative and boxed by its points", () => {
    const [first, second] = subpaths("M10.04 20 C12 22, 14.26 24, 16 26 M-5 -5 L-5.06 -8 L1 -8");
    assert.deepEqual(first, {
        d: "M10 20c2 2 4.3 4 6 6",
        box: { x: 10, y: 20, w: 6, h: 6 },
    });
    assert.equal(second?.d, "M-5-5l-0.1-3l6.1 0");
    assert.deepEqual(second?.box, { x: -5.1, y: -8, w: 6.1, h: 3 });
    assert.throws(() => subpaths("M0 0 Q1 1 2 2"), /Unsupported path command Q/);
});

test("each subpath lands once, in its centre's cell and bin, grouped and merged in order", () => {
    const grid = { bounds: { x: 0, y: 0, w: 320, h: 160 }, span: 160, columns: 2, rows: 1 };
    const stroke = (over: Partial<Stroke>): Stroke => ({
        group: -1,
        alpha: 1,
        stroke: "#000",
        width: 4,
        dash: [],
        d: "M1 1 L5 1",
        ...over,
    });
    const { cells, bleed } = cellLines(
        {
            pencil: [
                stroke({}),
                stroke({ d: "M2 3 L6 3", dash: [2, 1] }),
                stroke({ d: "M3 5 L7 5", dash: [2, 1] }),
                stroke({ d: "M40 5 L44 5", dash: [2, 1] }),
                stroke({ group: 0, alpha: 0.66, d: "M150 50 L166 50" }),
            ],
            colour: [stroke({ d: "M200 50 L210 50" })],
        },
        grid,
    );
    const shape = (id: number) =>
        cells.get(id)?.pencil?.map((g) => [g.alpha, g.runs.map((r) => r.parts.map((p) => p.d))]);
    assert.deepEqual(shape(0), [
        [1, [["M1 1l4 0"], ["M2 3l4 0M3 5l4 0", "M40 5l4 0"]]],
        [0.66, [["M150 50l16 0"]]],
    ]);
    assert.deepEqual(cells.get(0)?.pencil?.[0]?.runs[1]?.parts[0]?.box, {
        x: -1,
        y: 0,
        w: 11,
        h: 8,
    });
    assert.equal(cells.get(1)?.pencil, undefined);
    assert.equal(cells.get(1)?.colour?.[0]?.runs[0]?.parts[0]?.d, "M200 50l10 0");
    assert.equal(bleed, 9);
});
