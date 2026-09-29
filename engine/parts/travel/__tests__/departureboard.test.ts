import assert from "node:assert/strict";
import { test } from "node:test";
import { departureBoard } from "../departureboard";

const board = (over: Partial<typeof departureBoard.params>) => ({
    ...departureBoard.params,
    ...over,
});

test("a question's own rows replace the board's, and the old boards keep their size", () => {
    for (const take of departureBoard.takes)
        assert.deepEqual(
            departureBoard.box({ ...departureBoard.params, ...take.params }),
            {
                w: take.params.platforms > 0 ? 22 : 13,
                h: take.params.rows.length * 2 + 4,
            },
            take.label,
        );
    const boats = board({
        platforms: 0,
        head: ["boat", "leaves"],
        trains: ["A, 12:40", "B, 13:05", "C, 13:25"],
    });
    assert.deepEqual(departureBoard.box(boats), { w: 13, h: 10 });
    const stops = board({ platforms: 0, trains: ["Mill, 13:40", "Ash Bridge, 14:05"] });
    assert.ok(departureBoard.box(stops).w > 13, "a long stop name widens the first column");
});
