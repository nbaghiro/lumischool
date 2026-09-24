import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyPad, spent } from "../../../engine/motion/pad";
import * as shove from "../shove";
import * as row from "../row";
import * as cast from "../cast";
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

test("a full held stroke feathers the oar and may coast gently into the jetty", () => {
    const s = row.start(0),
        p = emptyPad();
    p.go = true;
    for (let n = 0; n < 120; n++) row.step(s, p);
    assert.equal(s.strokes, 1);
    assert.equal(s.stroke?.length, 1);
    const boat = row.frame(s).sprites.find((v) => v.key === "boat");
    assert.equal(boat?.params?.lifted, 1);
    s.x = s.L.target - 0.001;
    s.v = 0.1;
    row.step(s, p);
    assert.equal(s.won, true);
});

test("fishing reel responds to a held control, eases without losing the fish, and pauses", () => {
    const hooked = () => {
        const s = cast.start(0),
            f = s.fish[0];
        assert.ok(f);
        s.phase = "reel";
        s.line = 0;
        f.at = "line";
        s.float = { x: 30, y: cast.SEA.surface };
        s.hook = { x: 30, y: cast.SEA.surface + 8 };
        return s;
    };
    const held = hooked(),
        eased = hooked();
    for (let n = 0; n < 45; n++) {
        cast.step(held, { ...emptyPad(), go: true });
        cast.step(eased, emptyPad());
    }
    assert.ok(held.hook.y < eased.hook.y);
    assert.ok(held.reel.tension > eased.reel.tension);
    for (let n = 0; n < 120; n++) cast.step(eased, { ...emptyPad(), brake: true });
    assert.ok(eased.reel.speed < 0.001);
    assert.equal(eased.line, 0);
    assert.equal(eased.fish[0]?.at, "line");
});

test("only the three refined games receive a new mechanics revision", () => {
    assert.equal(gameRulesVersion("golf"), gameRulesVersion("rally"));
    for (const id of ["pay", "fish", "straight"])
        assert.notEqual(gameRulesVersion(id), gameRulesVersion("golf"));
});
