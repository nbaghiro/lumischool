import assert from "node:assert/strict";
import { test } from "node:test";
import { anchorsAt, checkpoint, edit, restore, snap, undo, workshop } from "../construction";

test("anchors turn and move with their piece", () => {
    const at = anchorsAt([{ x: 1, y: 0 }], { x: 5, y: 5 }, Math.PI / 2);
    assert.ok(Math.abs((at[0]?.x ?? 0) - 5) < 1e-9 && Math.abs((at[0]?.y ?? 0) - 6) < 1e-9);
});

test("a piece let go near a neighbour's anchor snaps onto it, and one too far away does not", () => {
    const held = [
        { x: 3.2, y: 0 },
        { x: 4.2, y: 0 },
    ];
    const around = [
        { x: 3, y: 0 },
        { x: 7, y: 0 },
    ];
    const move = snap(held, around, 0.3, "x");
    assert.ok(move && Math.abs(move.x + 0.2) < 1e-9 && move.y === 0);
    assert.equal(snap(held, around, 0.1, "x"), null);
    assert.deepEqual(snap([{ x: 1, y: 1 }], [{ x: 1.1, y: 1.1 }], 0.5), {
        x: 0.10000000000000009,
        y: 0.10000000000000009,
    });
});

test("a design is edited, taken back and restored only from a checkpoint that fits it", () => {
    const w = workshop(
        [
            { id: "a", x: 2, y: 2, angle: 0 },
            { id: "b", x: 4, y: 2, angle: 0, locked: true },
        ],
        { w: 10, h: 10 },
    );
    assert.ok(edit(w, { kind: "move", id: "a", x: 5, y: 3 }));
    assert.equal(edit(w, { kind: "move", id: "b", x: 5, y: 3 }), false, "a locked piece stays");
    const saved = JSON.parse(JSON.stringify(checkpoint(w))) as unknown;
    assert.ok(undo(w));
    assert.equal(w.design.pieces[0]?.x, 2);
    assert.ok(restore(w, saved));
    assert.equal(w.design.pieces[0]?.x, 5);
    assert.equal(restore(w, { version: 1, pieces: [] }), false);
});
