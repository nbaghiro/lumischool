import assert from "node:assert/strict";
import { test } from "node:test";
import { bodies } from "../../motion/bodies";
import type { Frame } from "../../motion/scene";
import { tape } from "../../motion/tape";
import {
    bytesText,
    inkOf,
    isChord,
    pick,
    readTapeText,
    spriteRows,
    tapeText,
    toolsFrom,
    withInk,
    worldsIn,
} from "../game-tools";

const frame = (sprites: Frame["sprites"]): Frame => ({
    sprites,
    marks: [],
    camera: { x: 0, y: 0 },
    view: { w: 20, h: 10 },
    world: { w: 20, h: 10 },
});

test("the address opens every tool, the frame readout alone, or nothing", () => {
    assert.deepEqual(toolsFrom("?g=golf&tools=1"), ["inspect", "tune", "replay", "perf"]);
    assert.deepEqual(toolsFrom("?g=golf&perf=1"), ["perf"]);
    assert.deepEqual(toolsFrom("?g=golf"), []);
    assert.ok(isChord({ code: "KeyD", shiftKey: true, altKey: true }));
    assert.ok(!isChord({ code: "KeyD", shiftKey: true, altKey: false }));
});

test("the worlds in a game's state are found two levels down, once each, and nothing else is", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    const state = {
        physics: w,
        lift: { world: w },
        deep: { a: { b: bodies({ gravity: { x: 0, y: 1 } }) } },
    };
    assert.deepEqual(worldsIn(state), [w]);
    assert.deepEqual(worldsIn(null), []);
    assert.deepEqual(worldsIn({ x: 1, list: [1, 2] }), []);
});

test("the inspector's ink draws each outline edge, each joint as a rod ringed at both ends, and the picked sprite's box", () => {
    const w = bodies({ gravity: { x: 0, y: 30 } });
    const b = w.box({ x: 0, y: 0, w: 2, h: 2 });
    w.hinge(null, b, { x: 0, y: -1 });
    const marks = inkOf([w.survey()], { key: "a", art: "x", x: 5, y: 5, size: 2 });
    assert.equal(marks.filter((m) => m.kind === "line" && m.style === "ink").length, 4);
    assert.equal(marks.filter((m) => m.kind === "line" && m.style === "rod").length, 1);
    assert.equal(marks.filter((m) => m.kind === "ring").length, 2);
    assert.deepEqual(marks.at(-1), { kind: "box", x: 4, y: 4, w: 2, h: 2, on: true });
    const f = frame([]);
    assert.equal(withInk(f, []), f);
    assert.equal(withInk(f, marks).marks.length, marks.length);
});

test("the sprite under the pointer is the nearest in reach, the topmost of equals, never a readout", () => {
    const f = frame([
        { key: "low", art: "a", x: 5, y: 5, z: 1 },
        { key: "high", art: "a", x: 5, y: 5, z: 3 },
        { key: "near", art: "a", x: 8, y: 5 },
        { key: "hud", art: "a", x: 9, y: 5, fixed: true },
        { key: "hill", art: "a", x: 12, y: 5, depth: 0.3 },
        { key: "tree", art: "a", x: 15, y: 6, stand: true, size: 2 },
    ]);
    assert.equal(pick(f, { x: 5.2, y: 5 })?.key, "high");
    assert.equal(pick(f, { x: 8.9, y: 5 })?.key, "near");
    assert.equal(pick(f, { x: 12, y: 5 }), null);
    assert.equal(pick(f, { x: 15, y: 5 })?.key, "tree");
    assert.equal(pick(f, { x: 1, y: 1 }), null);
});

test("a sprite reads as rows, with its settings, and sizes read in bytes, kilobytes and megabytes", () => {
    const rows = spriteRows({
        key: "k",
        art: "plank",
        x: 1.234,
        y: 2,
        angle: Math.PI / 2,
        params: { len: 3, tone: "sky" },
    });
    assert.deepEqual(rows, [
        ["key", "k"],
        ["art", "plank"],
        ["at", "1.23, 2"],
        ["angle", "90°"],
        ["len", "3"],
        ["tone", '"sky"'],
    ]);
    assert.equal(bytesText(512), "512 B");
    assert.equal(bytesText(4096), "4 kB");
    assert.equal(bytesText(16 * 1024 * 1024), "16.0 MB");
});

test("a tape goes out as text and comes back, and text that is not a tape says so", () => {
    const t = tape();
    assert.deepEqual(readTapeText(tapeText(t)), t);
    assert.equal(readTapeText("{"), "that is not JSON");
    assert.equal(typeof readTapeText("[]"), "string");
});
