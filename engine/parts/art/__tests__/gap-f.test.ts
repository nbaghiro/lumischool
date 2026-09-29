import assert from "node:assert/strict";
import { test } from "node:test";
import { RELIEFS, extentOf, reliefKind } from "../sculpture";
import { WORKS } from "../studies";

test("a solid's three views agree: as wide front and top, as tall front and left, as deep left and top", () => {
    for (let shape = 0; shape < 4; shape++) {
        const front = extentOf(shape, "front"),
            left = extentOf(shape, "left"),
            top = extentOf(shape, "top");
        assert.equal(front.w, top.w, `shape ${shape}: front and top widths`);
        assert.equal(front.h, left.h, `shape ${shape}: front and left heights`);
        assert.equal(left.w, top.h, `shape ${shape}: left width and top depth`);
    }
});

test("each relief is drawn as its kind: low under half the figure's depth, high over, sunk below the ground", () => {
    RELIEFS.forEach((r, k) => assert.equal(reliefKind(r.rise, r.cut), k, r.name));
});

test("each study's frame is in the proportions of the work, to within three per cent", () => {
    for (const w of WORKS) {
        const [h, wide] = w.cm,
            [fw, fh] = w.frame;
        assert.ok(Math.abs(fh / fw / (h / wide) - 1) < 0.03, `${w.title}: ${fw} by ${fh}`);
    }
});
