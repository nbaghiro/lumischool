// Stones on ice: sweeping carries a stone further and straighter, a turned stone bends to its side,
// two stones that knock share their speed as equal weights do, a stone over the back line goes out,
// and the same throw always ends in the same place.
import { test } from "node:test";
import assert from "node:assert/strict";
import { glideOf, moving, path, speedFor, stepIce, type Sheet, type Stone } from "../ice";

const SHEET: Sheet = {
    front: 0,
    back: 60,
    top: 0,
    bottom: 12,
    r: 0.45,
    friction: 1.25,
    curl: 0.34,
    restitution: 0.86,
    rest: 0.04,
};

const stone = (more: Partial<Stone> = {}): Stone => ({
    id: 1,
    team: "ours",
    x: 3,
    y: 6,
    vx: 0,
    vy: 0,
    spin: 0,
    turn: 0,
    out: false,
    ...more,
});

test("an unturned stone glides as far as its speed says, and sweeping carries it further", () => {
    const v = speedFor(30, SHEET);
    assert.ok(Math.abs(glideOf(v, SHEET) - 30) < 1e-9);
    const plain = path(stone({ vx: v }), SHEET);
    const swept = path(stone({ vx: v }), SHEET, 1);
    assert.ok(Math.abs(plain.stop.x - 33) < 0.6, `stopped at ${plain.stop.x}`);
    assert.ok(swept.stop.x > plain.stop.x + 3, "sweeping did not carry it further");
    assert.ok(Math.abs(plain.stop.y - 6) < 1e-9, "a stone with no turn bent");
});

test("a turned stone bends to its side as it slows, and sweeping takes some of the bend out", () => {
    const v = speedFor(30, SHEET);
    const down = path(stone({ vx: v, spin: 1 }), SHEET).stop;
    const up = path(stone({ vx: v, spin: -1 }), SHEET).stop;
    const swept = path(stone({ vx: v, spin: 1 }), SHEET, 0.5).stop;
    assert.ok(down.y - 6 > 1.5, `bent only ${down.y - 6}`);
    assert.ok(Math.abs(down.y - 6 + (up.y - 6)) < 1e-6, "the two turns did not mirror");
    // judged by the bend for each square travelled, since a swept stone also goes further
    assert.ok(
        (swept.y - 6) / (swept.x - 3) < (down.y - 6) / (down.x - 3),
        "sweeping did not straighten it",
    );
});

test("a stone that strikes another square on stops nearly dead and sends it on, and momentum is kept", () => {
    const a = stone({ id: 1, x: 3, vx: 6 }),
        b = stone({ id: 2, x: 10 });
    const before = a.vx + b.vx;
    let knocks = 0;
    for (let i = 0; i < 180 && knocks === 0; i++)
        knocks += stepIce([a, b], { ...SHEET, friction: 0 }, null, 1 / 60).filter(
            (e) => e.kind === "knock",
        ).length;
    assert.equal(knocks, 1);
    assert.ok(Math.abs(a.vx + b.vx - before) < 1e-9, "momentum changed in the knock");
    assert.ok(b.vx > a.vx * 5, "the struck stone did not take the speed");
});

test("a stone over the back line or a side line goes out, and a stopped stone is still", () => {
    const fast = stone({ vx: 20 });
    const wide = stone({ id: 2, x: 5, vy: 6 });
    const stones = [fast, wide];
    for (let i = 0; i < 60 * 30 && moving(stones); i++) stepIce(stones, SHEET, null, 1 / 60);
    assert.ok(fast.out, "the fast stone stayed in");
    assert.ok(wide.out, "the wide stone stayed in");
    assert.equal(moving(stones), false);
});

test("the same throw played twice ends in the same place", () => {
    const go = () => {
        const s = [stone({ vx: 9, vy: 0.3, spin: -1 }), stone({ id: 2, x: 30, y: 6.4 })];
        for (let i = 0; i < 60 * 20 && moving(s); i++)
            stepIce(s, SHEET, i > 200 ? { id: 1, level: 0.7 } : null, 1 / 60);
        return JSON.stringify(s);
    };
    assert.equal(go(), go());
});
