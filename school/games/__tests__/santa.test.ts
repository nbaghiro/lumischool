import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyPad } from "../../../engine/motion/pad";
import { SANTA_LEVELS, santaGame, santaPreview, startSanta, stepSanta } from "../santa";
import { isSantaConfiguration, santaWay } from "../santa-challenges";
import { SHELF_IDS } from "./shelf";

test("every delivery route and variation is won by keyboard and touch, with deterministic replays", () => {
    for (const [phase, L] of SANTA_LEVELS.entries())
        for (let variant = 0; variant < 3; variant++) {
            for (const mode of ["keys", "touch"] as const) {
                const way = santaWay({ phase, variant }, mode);
                assert.ok(way, `${L.title}, ${variant}, ${mode}`);
                const a = startSanta(phase, variant),
                    b = startSanta(phase, variant);
                for (const p of way) {
                    stepSanta(a, p);
                    stepSanta(b, p);
                }
                assert.equal(a.won, true);
                assert.deepEqual(a, b);
                assert.deepEqual(
                    a.got,
                    a.L.houses.map((h) => h.want),
                );
            }
        }
});

test("a previewed delivery follows exactly the live flight under gusts", () => {
    const s = startSanta(2);
    for (let i = 0; i < 1200; i++) {
        const expected = santaPreview(s);
        if (expected.house >= 0) {
            stepSanta(s, { ...emptyPad(), tapped: true });
            for (let n = 0; n < 240; n++) stepSanta(s, emptyPad());
            assert.equal(s.got[expected.house], 1);
            return;
        }
        stepSanta(s, emptyPad());
    }
    assert.fail("never found a delivery");
});

test("holding Space does not spam gifts, cancelling a touch does not drop, and a miss comes back", () => {
    const s = startSanta(0);
    for (let i = 0; i < 120; i++) stepSanta(s, { ...emptyPad(), go: true });
    assert.equal(s.serial, 0);
    stepSanta(s, { ...emptyPad(), touch: { x: s.x, y: 6 } });
    santaGame.cancelInput?.(s);
    stepSanta(s, { ...emptyPad(), lifted: { x: s.x, y: 6 } });
    assert.equal(s.serial, 0);
    s.x = 5;
    stepSanta(s, { ...emptyPad(), tapped: true });
    let returned = false;
    for (let i = 0; i < 360; i++) {
        returned ||= s.gifts.some((g) => g.returning);
        stepSanta(s, emptyPad());
    }
    assert.ok(returned);
    assert.equal(s.gifts.length, 0);
    assert.equal(s.won, false);
});

test("all frames use registered shelf drawings and configurations reject malformed input", () => {
    for (let i = 0; i < SANTA_LEVELS.length; i++) {
        const s = startSanta(i);
        stepSanta(s, { ...emptyPad(), tapped: true });
        for (const sprite of santaGame.frame(s).sprites)
            assert.ok(SHELF_IDS.has(sprite.art), sprite.art);
        assert.equal(isSantaConfiguration({ phase: i, variant: 2 }, i), true);
    }
    for (const v of [
        null,
        {},
        { phase: 0, variant: -1 },
        { phase: 0, variant: 3 },
        { phase: 0, variant: 1, extra: true },
    ])
        assert.equal(isSantaConfiguration(v, 0), false);
});
