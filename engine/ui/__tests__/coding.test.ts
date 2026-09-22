import { test } from "node:test";
import assert from "node:assert/strict";
import type { PackItem, PackQuestion } from "../../pack";
import type { SceneNode } from "../../scene";
import { codingTarget, gridOf, readableListing } from "../coding";

const item = (name: string, settings: Record<string, string> = {}): PackItem => ({
    id: "test",
    hash: "hash",
    title: "Test",
    skills: [],
    check: { name, settings },
});

const question = (nodes: SceneNode[]): PackQuestion => ({
    n: 1,
    variant: "",
    env: {},
    answers: {},
    labels: null,
    ask: "",
    hints: [],
    feedback: [],
    scene: {
        size: [20, 12],
        nodes,
        arrows: [],
        marks: [],
        boxes: { maze: { x: 0, y: 0, w: 8, h: 6 } },
    },
    arranged: null,
    explain: null,
});

test("selects an explicit coding world and its readable listing", () => {
    const q = question([
        { type: "program", id: "listing", v: { code: ["right 1"] }, place: null },
        {
            type: "maze",
            id: "maze",
            v: { code: ["right 1"], cols: 3, rows: 2, flag: [2, 1] },
            place: null,
        },
    ]);
    const target = codingTarget(q, item("coding.runs", { of: "maze" }));
    assert.equal(target?.mode, "run");
    assert.equal(target?.node.id, "maze");
    assert.equal(target?.listing?.id, "listing");
    assert.deepEqual(target && gridOf(target), { cols: 3, rows: 2 });
});

test("does not treat an illustrative listing as a runnable target", () => {
    const q = question([
        { type: "program", id: "listing", v: { code: ["define square size"] }, place: null },
    ]);
    const node = q.scene?.nodes[0];
    assert.equal(node ? readableListing(node) : true, false);
    assert.equal(codingTarget(q, item("coding.runs", { of: "listing" })), null);
});

test("selects build mode before ordinary playback and recognizes toys", () => {
    const build = question([
        { type: "maze", id: "maze", v: { code: ["right 1"], cols: 2, rows: 1 }, place: null },
    ]);
    assert.equal(codingTarget(build, item("coding.builds", { of: "maze" }))?.mode, "build");
    const toy = question([{ type: "lamps", id: "lamps", v: { bits: 4, n: 3 }, place: null }]);
    assert.equal(codingTarget(toy, item("coding.runs"))?.mode, "toy");
});
