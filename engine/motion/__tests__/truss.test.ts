import assert from "node:assert/strict";
import { test } from "node:test";
import { STUFF, stepTruss, strainOf, truss, type Load, type Plan } from "../truss";

const DT = 1 / 60;

/** Steps a bridge with a weight on one bar, and says how far its lowest joint fell and which bars snapped. */
function load(plan: Plan, bar: number, at: number, mass: number, steps = 240) {
    const t = truss(plan),
        snapped: number[] = [];
    const loads: Load[] = [{ bar, at, mass }];
    for (let k = 0; k < steps; k++) {
        const s = stepTruss(t, DT, loads, { floor: 30 });
        if (s !== null) snapped.push(s);
    }
    const sag = Math.max(...t.nodes.map((n, i) => n.y - (plan.joints[i]?.y ?? n.y)));
    return { t, snapped, sag };
}

// a road of two lengths over a gap of six, its middle joint held from below by two beams to the
// banks' faces (two triangles), or by a post standing on a bottom chord (two squares)
const ROAD: Plan["beams"] = [
    { a: 0, b: 2, m: "road" },
    { a: 2, b: 1, m: "road" },
];
const triangles: Plan = {
    joints: [
        { x: 0, y: 0, fixed: true },
        { x: 6, y: 0, fixed: true },
        { x: 3, y: 0 },
        { x: 0, y: 2, fixed: true },
        { x: 6, y: 2, fixed: true },
    ],
    beams: [...ROAD, { a: 3, b: 2, m: "wood" }, { a: 4, b: 2, m: "wood" }],
};
const squares: Plan = {
    joints: [
        { x: 0, y: 0, fixed: true },
        { x: 6, y: 0, fixed: true },
        { x: 3, y: 0 },
        { x: 0, y: 3, fixed: true },
        { x: 6, y: 3, fixed: true },
        { x: 3, y: 3 },
    ],
    beams: [
        ...ROAD,
        { a: 3, b: 5, m: "wood" },
        { a: 5, b: 4, m: "wood" },
        { a: 2, b: 5, m: "wood" },
    ],
};

test("the same bridge under the same weight is the same bridge after every step", () => {
    const a = load(triangles, 0, 0.6, 1.5),
        b = load(triangles, 0, 0.6, 1.5);
    assert.deepEqual(a.t, b.t);
    assert.deepEqual(JSON.parse(JSON.stringify(a.t)), a.t);
});

test("a triangle holds the car where a square folds under it", () => {
    const held = load(triangles, 1, 0, 1.5);
    assert.deepEqual(held.snapped, []);
    assert.ok(held.sag < 0.1, `the triangles sag ${held.sag}`);
    const folded = load(squares, 1, 0, 1.5);
    assert.ok(
        folded.snapped.length > 0 || folded.sag > 1,
        `the squares sag ${folded.sag} and nothing snapped`,
    );
    assert.ok(
        folded.sag > held.sag * 3,
        `the squares sag ${folded.sag}, the triangles ${held.sag}`,
    );
});

test("a beam snaps past its strength and not before, and a rope pushed goes slack", () => {
    // one beam hanging from a peg with a weight at its foot: it pulls with the weight's weight
    const hang = (m: "wood" | "rope", mass: number) =>
        load(
            {
                joints: [
                    { x: 0, y: 0, fixed: true },
                    { x: 0, y: 3 },
                ],
                beams: [{ a: 0, b: 1, m }],
            },
            0,
            1,
            mass,
            180,
        );
    const g = 10;
    // a weight let go at once swings to twice its pull, so the weight that holds is under half the strength
    const under = hang("wood", (STUFF.wood.strength / g) * 0.45);
    assert.deepEqual(under.snapped, []);
    const bar = under.t.bars[0];
    assert.ok(bar && Math.abs(strainOf(bar) - 0.45) < 0.05, `strain ${bar ? strainOf(bar) : 0}`);
    assert.deepEqual(hang("wood", (STUFF.wood.strength / g) * 1.3).snapped, [0]);
    assert.deepEqual(hang("rope", (STUFF.rope.strength / g) * 0.45).snapped, []);
    // a rope standing up from a peg with a weight on top: pushed, it holds nothing and nothing in it works
    const prop = load(
        {
            joints: [
                { x: 0, y: 3, fixed: true },
                { x: 0, y: 0 },
            ],
            beams: [{ a: 0, b: 1, m: "rope" }],
        },
        0,
        1,
        0.5,
        30,
    );
    const rope = prop.t.bars[0];
    assert.ok(rope && strainOf(rope) === 0 && !rope.broken);
    assert.ok((prop.t.nodes[1]?.y ?? 0) > 0.5, "the weight fell through the slack rope");
});

test("a trial that holds reads how hard a bar works without ever snapping it", () => {
    const t = truss(squares);
    for (let k = 0; k < 240; k++)
        assert.equal(stepTruss(t, DT, [{ bar: 1, at: 0, mass: 3 }], { holds: true }), null);
    assert.ok(t.bars.every((b) => !b.broken));
    assert.ok(Math.max(...t.bars.map(strainOf)) > 1);
});
