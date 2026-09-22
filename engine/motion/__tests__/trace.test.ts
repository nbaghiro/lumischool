import assert from "node:assert/strict";
import { test } from "node:test";
import { line, moves, note, summarise, trace } from "../trace";

test("the trace sums up how moves were chosen and gives back the moves for a replay", () => {
    const tr = trace();
    note(tr, { t: 0.5, how: "drag", move: 1, landing: "on" });
    note(tr, { t: 1.5, how: "drag", move: null, landing: "miss" });
    note(tr, { t: 2.5, how: "flick", move: 0, landing: "flick" });
    note(tr, { t: 3.5, how: "key", move: 2 });
    note(tr, { t: 4.5, how: "drag", move: 1, landing: "near" });
    note(tr, { t: 5.5, how: "key", move: null, undo: true });
    const s = summarise(tr);
    assert.deepEqual(s, {
        moves: 4,
        byHand: 3,
        byKey: 1,
        flicks: 1,
        misses: 1,
        nearMisses: 1,
        undos: 1,
    });
    assert.deepEqual(moves(tr), [1, 0, 2, 1]);
    assert.equal(
        line(s),
        "Moves: 3 by hand and 1 by key, 1 flicked, 1 that only just landed, 1 drop that went home.",
    );
});
