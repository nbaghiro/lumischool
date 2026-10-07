import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyPad } from "../../../engine/motion/pad";
import { paperBoatGame, paperBoatPreview, startPaperBoat, stepPaperBoat } from "../paperboat";
import {
    isPaperBoatConfiguration,
    openPaperBoatConfiguration,
    paperBoatChallenge,
    paperBoatWay,
} from "../paperboat-challenges";

test("every paper boat reach and variation can be raced with keys and touch, then replayed", () => {
    for (let phase = 0; phase < 6; phase++)
        for (let variant = 0; variant < 3; variant++) {
            const c = paperBoatChallenge(variant, phase);
            const saved: unknown = JSON.parse(JSON.stringify(c));
            assert.ok(isPaperBoatConfiguration(saved, phase));
            for (const mode of ["keys", "touch"] as const) {
                const way = paperBoatWay(c, mode);
                assert.ok(way, `${phase}/${variant}/${mode} is solvable`);
                const s = openPaperBoatConfiguration(saved);
                for (const p of way) stepPaperBoat(s, p);
                assert.equal(s.won, true);
                assert.equal(s.reach, 3);
            }
        }
});

test("preview follows an unsteered launch, and wind runs out without relaunching", () => {
    const s = startPaperBoat(0),
        dots = paperBoatPreview(s, 61);
    stepPaperBoat(s, { ...emptyPad(), tapped: true });
    for (let i = 0; i < 61; i++) stepPaperBoat(s, emptyPad());
    const last = dots.at(-1);
    assert.ok(last && s.boat);
    assert.ok(Math.abs(last.y - s.boat.y) < 0.03);
    while (s.boat) stepPaperBoat(s, { ...emptyPad(), go: true });
    assert.equal(s.wind, 0);
    for (let i = 0; i < 100; i++) stepPaperBoat(s, { ...emptyPad(), go: true });
    assert.equal(s.boat, null);
});

test("a weak unattended launch loses while steering and wind win the same race", () => {
    const s = startPaperBoat(0);
    s.y = 6;
    s.push = 0.5;
    stepPaperBoat(s, { ...emptyPad(), tapped: true });
    while (s.boat) stepPaperBoat(s, emptyPad());
    assert.equal(s.reach, 0);
    assert.match(s.note, /finished first/);
    const way = paperBoatWay({ phase: 0, variant: 0 }, "keys");
    assert.ok(way);
    const raced = startPaperBoat(0);
    for (const pad of way) stepPaperBoat(raced, pad);
    assert.equal(raced.won, true);
});

test("steering changes the running boat and reduced motion waits for the next input", () => {
    const a = startPaperBoat(0),
        b = startPaperBoat(0);
    stepPaperBoat(a, { ...emptyPad(), tapped: true });
    stepPaperBoat(b, { ...emptyPad(), tapped: true });
    for (let i = 0; i < 30; i++) {
        stepPaperBoat(a, { ...emptyPad(), holding: ["up"] });
        stepPaperBoat(b, { ...emptyPad(), touch: { x: 8, y: 16 } });
    }
    assert.ok(a.boat && b.boat && a.boat.y < b.boat.y - 0.5);
    assert.ok(!paperBoatGame.still.settling?.(a));
});

test("cancelled touch never launches, and returning to bank keeps completed reaches", () => {
    const s = startPaperBoat(2);
    stepPaperBoat(s, { ...emptyPad(), touch: { x: 3, y: 7 } });
    paperBoatGame.cancelInput?.(s);
    stepPaperBoat(s, { ...emptyPad(), lifted: { x: 8, y: 7 } });
    assert.equal(s.boat, null);
    s.reach = 1;
    stepPaperBoat(s, { ...emptyPad(), tapped: true });
    stepPaperBoat(s, { ...emptyPad(), brake: true });
    assert.equal(s.boat, null);
    assert.equal(s.reach, 1);
    assert.equal(isPaperBoatConfiguration({ phase: 0, variant: 3 }, 0), false);
    assert.equal(isPaperBoatConfiguration({ phase: 0, variant: 0, extra: true }, 0), false);
});
