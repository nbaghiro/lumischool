import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad } from "../../../engine/motion/pad";
import { start as road, step as drive } from "../road";
import { startWorkshop, stepWorkshop, workshopFrame, workshopCommand } from "../workshops";
import { ACTIVITIES } from "../activities";
import { spellSequence } from "../spell-hands";
import { start as cake, step as cut, cakeX, cakeGame } from "../cake";
import { start as snake, step as steer } from "../snake";

test("road brake stops before reversing and release stops reversing", () => {
    const s = road(0);
    s.x = 15;
    s.v = 4;
    for (let i = 0; i < 16; i++) drive(s, { ...emptyPad(), brake: true });
    assert.equal(s.v, 0);
    const stopped = s.x;
    for (let i = 0; i < 90; i++) drive(s, { ...emptyPad(), brake: true });
    assert.ok(s.v < 0 && s.x < stopped);
    for (let i = 0; i < 60; i++) drive(s, emptyPad());
    assert.equal(s.v, 0);
    drive(s, { ...emptyPad(), go: true });
    assert.ok(s.v > 0);
});

test("ramp end dragging rotates, centre dragging previews movement and undo restores it", () => {
    const s = startWorkshop("marble", 0),
        p = s.construction.design.pieces[0];
    assert.ok(p);
    const before = { ...p };
    stepWorkshop(s, {
        ...emptyPad(),
        touch: { x: p.x + Math.cos(p.angle) * 4, y: p.y + Math.sin(p.angle) * 4 },
    });
    stepWorkshop(s, { ...emptyPad(), touch: { x: p.x + 3, y: p.y + 2 } });
    assert.notEqual(workshopFrame(s).sprites.find((x) => x.key === p.id)?.angle, before.angle);
    stepWorkshop(s, { ...emptyPad(), lifted: { x: p.x + 3, y: p.y + 2 } });
    assert.notEqual(s.construction.design.pieces[0]?.angle, before.angle);
    workshopCommand(s, "undo");
    assert.deepEqual(s.construction.design.pieces[0], before);
});

test("sound tile rearrangement and removal use only legal spelling moves", () => {
    const activity = ACTIVITIES.find((a) => a.kind === "spell");
    assert.ok(activity);
    let pos = activity.round(0).start;
    const sounds = pos.moves.flatMap((m) =>
        m.chip.text && m.chip.text !== "back" ? [m.chip.text] : [],
    );
    const a = sounds[0],
        b = sounds[1];
    assert.ok(a && b);
    for (const wanted of [[a, b], [b, a], [a]]) {
        const choice = spellSequence(pos, wanted);
        assert.ok(choice.moves.length);
        for (const i of choice.moves) {
            const move = pos.moves[i];
            assert.ok(move);
            pos = move.next();
        }
        assert.deepEqual(
            pos.board.parts.find((p) => p.art === "soundboxes")?.params.filled,
            wanted,
        );
    }
});

test("a downward knife gesture cuts once and a cancelled gesture never cuts", () => {
    const s = cake(1),
        x = cakeX(s, 3);
    cut(s, { ...emptyPad(), touch: { x, y: 10 } });
    cut(s, { ...emptyPad(), touch: { x, y: 12 } });
    assert.equal(s.cuts.length, 1);
    cut(s, { ...emptyPad(), touch: { x: cakeX(s, 5), y: 14 } });
    cut(s, { ...emptyPad(), lifted: { x: cakeX(s, 5), y: 14 } });
    assert.equal(s.cuts.length, 1);
    const cancelled = cake(1);
    cut(cancelled, { ...emptyPad(), touch: { x, y: 10 } });
    cakeGame.cancelInput?.(cancelled);
    cut(cancelled, { ...emptyPad(), lifted: { x, y: 12 } });
    assert.equal(cancelled.cuts.length, 0);
});

test("a held pointer turns the bead string without reversing through its body", () => {
    const s = snake(0);
    const head = s.body[0];
    s.body.push({ x: head.x - 1, y: head.y });
    steer(s, { ...emptyPad(), touch: { x: head.x - 3, y: head.y } });
    assert.ok(!s.queue.includes("left"));
    steer(s, { ...emptyPad(), touch: { x: head.x, y: head.y + 3 } });
    assert.ok(s.queue.includes("down") || s.dir === "down");
});
