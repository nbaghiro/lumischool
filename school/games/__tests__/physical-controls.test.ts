import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyPad, spent } from "../../../engine/motion/pad";
import * as shove from "../shove";
import * as row from "../row";
import { gameRulesVersion } from "../../../engine/answer";

test("a forward flick launches in the hand's direction and preserves the drawer", () => {
    const s = shove.start(0),
        p = emptyPad(),
        from = shove.pileAt(s.L, "penny");
    const count = shove.pieceCount(s);
    p.touch = from;
    shove.step(s, p);
    p.touch = null;
    p.lifted = { x: from.x + 2, y: from.y };
    p.flick = { x: 40, y: 0 };
    shove.step(s, p);
    const c = s.coins[0];
    assert.ok(c?.body);
    assert.ok(s.world.velocity(c.body).x > 0);
    assert.equal(shove.pieceCount(s), count);
    spent(p);
    assert.equal(p.flick, null);
});

test("coin aiming can turn away from the centre and cancelling a grab returns its coin", () => {
    const s = shove.start(0),
        p = emptyPad();
    const count = shove.pieceCount(s);
    shove.shoveGame.command?.(s, "aim-left");
    assert.ok((s.cursor?.angle ?? 0) < 0);
    p.touch = shove.pileAt(s.L, "penny");
    shove.step(s, p);
    assert.ok(s.held);
    shove.shoveGame.cancelInput?.(s);
    assert.equal(s.held, null);
    assert.equal(shove.pieceCount(s), count);
});

test("a paddle key held longer makes a stronger stroke, and letting go of it is the stroke", () => {
    const speed = (s: ReturnType<typeof row.start>) => Math.hypot(s.boat.vx, s.boat.vy);
    const tap = row.start(0),
        held = row.start(0);
    for (const [s, n] of [
        [tap, 1],
        [held, 40],
    ] as const) {
        const p = emptyPad();
        p.pressed = ["up"];
        p.holding = ["up"];
        row.step(s, p);
        spent(p);
        for (let i = 1; i < n; i++) {
            p.holding = ["up"];
            row.step(s, p);
        }
        assert.equal(s.strokes, 0, "nothing happens while the key is held");
        p.holding = [];
        row.step(s, p);
        assert.equal(s.strokes, 1);
    }
    assert.ok(speed(held) > speed(tap) * 1.8);
});

test("only the three refined games receive a new mechanics revision", () => {
    assert.equal(gameRulesVersion("golf"), gameRulesVersion("rally"));
    for (const id of ["pay", "fish", "straight"])
        assert.notEqual(gameRulesVersion(id), gameRulesVersion("golf"));
});
