import assert from "node:assert/strict";
import { it } from "node:test";
import { U } from "../../paper";
import { golfCup } from "../sport/golfcup";
import { golfGreen } from "../sport/golfgreen";
import { golfRail } from "../sport/golfrail";
import { golfSand } from "../sport/golfsand";
import { drawn } from "./check";
it("the cup anchor stays at its physical centre with or without a flag", () => {
    for (const flag of [false, true])
        for (const paper of [false, true]) {
            assert.deepEqual(golfCup.box({ flag }), { w: 2, h: 2 });
            assert.deepEqual(drawn(golfCup, { flag }, { paper }).anchors.hole, [U, U, "up"]);
        }
});
it("course surfaces keep their authored collision dimensions", () => {
    const size = { width: 5, height: 4 };
    for (const d of [golfGreen, golfRail, golfSand]) {
        assert.deepEqual(d.box(size), { w: 5, h: 4 });
        assert.ok(drawn(d, size, { paper: false }).marks.length > 0);
        assert.ok(drawn(d, size, { paper: true }).marks.length > 0);
    }
});
