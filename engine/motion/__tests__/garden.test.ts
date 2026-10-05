import assert from "node:assert/strict";
import { test } from "node:test";
import {
    arrayOf,
    bed,
    cellAt,
    garden,
    holes,
    night,
    pests,
    sow,
    sowingFrom,
    stage,
    thirst,
    water,
    type Night,
} from "../garden";

const NIGHT: Night = { drink: 0.25, soggy: 2.5, rain: 0, ripe: () => 3 };

test("a drag from corner to corner sows the rectangle between, either way round", () => {
    const g = garden([bed(10, 10, 6, 4)]);
    assert.deepEqual(cellAt(g.beds, { x: 13.5, y: 12.1 }), { bed: 0, c: 1, r: 1 });
    assert.equal(cellAt(g.beds, { x: 9.9, y: 12 }), null);
    const w = sowingFrom(g.beds, 0, { c: 4, r: 2 }, { c: 1, r: 0 }, 1);
    assert.deepEqual(w, { bed: 0, c: 1, r: 0, cols: 4, rows: 3, span: 1 });
    assert.ok(w);
    assert.equal(holes(w).length, 12);
    assert.equal(sow(g, w, "carrot"), 12);
    assert.equal(sow(g, w, "carrot"), 0, "a second sowing over the same cells puts nothing in");
    assert.deepEqual(arrayOf(g, 0, "carrot"), { rows: 3, cols: 4 });
});

test("a crop two cells across snaps to its own grid and stays inside the bed", () => {
    const g = garden([bed(0, 0, 5, 4)]);
    const w = sowingFrom(g.beds, 0, { c: 1, r: 1 }, { c: 4, r: 3 }, 2);
    assert.deepEqual(w, { bed: 0, c: 0, r: 0, cols: 2, rows: 2, span: 2 });
});

test("an array with a gap is not an array", () => {
    const g = garden([bed(0, 0, 6, 4)]);
    const w = sowingFrom(g.beds, 0, { c: 0, r: 0 }, { c: 2, r: 1 }, 1);
    assert.ok(w);
    sow(g, w, "lettuce");
    g.plants.pop();
    assert.equal(arrayOf(g, 0, "lettuce"), null);
});

test("water lands in the bed under it, runs down a slope into the bed below, or soaks away", () => {
    const g = garden([bed(0, 10, 4, 2), bed(10, 10, 4, 2)]);
    const slope = [{ x: 10, y: 6, w: 8, h: 4, into: 1 }];
    assert.equal(water(g, { x: 1, y: 11 }, 0.5, slope), 0);
    assert.equal(water(g, { x: 12, y: 7 }, 0.25, slope), 1);
    assert.equal(water(g, { x: 30, y: 2 }, 1, slope), null);
    assert.equal(g.beds[0]?.water, 0.5);
    assert.equal(g.beds[1]?.today, 0.25);
});

test("a watered bed grows, a dry one droops, and a drowned one does not grow", () => {
    const g = garden([bed(0, 0, 2, 1), bed(10, 0, 2, 1), bed(20, 0, 2, 1)]);
    for (const b of [0, 1, 2]) sow(g, { bed: b, c: 0, r: 0, cols: 2, rows: 1, span: 1 }, "carrot");
    assert.equal(thirst(g, 0, NIGHT), 0.5);
    water(g, { x: 1, y: 1 }, 0.5);
    water(g, { x: 21, y: 1 }, 3);
    assert.equal(night(g, NIGHT), 2);
    assert.deepEqual(
        g.plants.map((p) => p.rest),
        ["fine", "fine", "dry", "dry", "soggy", "soggy"],
    );
    assert.equal(g.beds[0]?.water, 0);
    assert.ok((g.beds[2]?.water ?? 0) < 3, "a soggy bed drains a little each night");
    assert.equal(g.day, 1);
});

test("rain waters every bed, and a level that measures litres wants them near the mark", () => {
    const g = garden([bed(0, 0, 2, 1)]);
    sow(g, { bed: 0, c: 0, r: 0, cols: 2, rows: 1, span: 1 }, "carrot");
    assert.equal(night(g, { ...NIGHT, rain: 1 }), 2);
    const exact = { ...NIGHT, exact: { litres: 2, within: 0.25 } };
    water(g, { x: 1, y: 1 }, 1.5);
    assert.equal(night(g, exact), 0);
    water(g, { x: 1, y: 1 }, 2.1);
    assert.equal(night(g, exact), 2);
    water(g, { x: 1, y: 1 }, 2.5);
    night(g, exact);
    assert.equal(g.plants[0]?.rest, "soggy");
});

test("a weed beside a plant drinks its night, and a snail eats it back a stage", () => {
    const g = garden([bed(0, 0, 4, 1)]);
    sow(g, { bed: 0, c: 0, r: 0, cols: 2, rows: 1, span: 1 }, "carrot");
    for (const p of g.plants) p.age = 2;
    g.weeds.push({ bed: 0, c: 3, r: 0 });
    g.snails.push({ bed: 0, c: 0, r: 0 });
    water(g, { x: 1, y: 1 }, 1);
    night(g, NIGHT);
    assert.deepEqual(
        g.plants.map((p) => [p.rest, p.age]),
        [
            ["eaten", 1],
            ["fine", 3],
        ],
    );
    g.plants.pop();
    g.weeds.push({ bed: 0, c: 1, r: 0 });
    const lone = g.plants[0];
    assert.ok(lone);
    night(g, NIGHT);
    assert.equal(lone.rest, "weeded");
    assert.deepEqual(g.snails, [], "snails leave by morning");
});

test("a plant's stage follows its age, and pests come the same way for the same seed", () => {
    const p = { bed: 0, c: 0, r: 0, crop: "carrot", span: 1, age: 0, rest: "fine" as const };
    assert.deepEqual(
        [0, 1, 2, 3, 4].map((age) => stage({ ...p, age }, 3)),
        [0, 1, 2, 3, 3],
    );
    const grow = () => {
        const g = garden([bed(0, 0, 6, 3)]);
        sow(g, { bed: 0, c: 1, r: 1, cols: 3, rows: 1, span: 1 }, "carrot");
        pests(g, 5, { weeds: 2, snails: 1, ripe: () => 3 });
        return g;
    };
    const a = grow();
    assert.equal(a.weeds.length, 2);
    assert.equal(a.snails.length, 1);
    assert.deepEqual(a, grow());
    assert.ok(a.weeds.every((w) => !a.plants.some((q) => q.c === w.c && q.r === w.r)));
});
