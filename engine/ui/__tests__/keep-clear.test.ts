import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rowsOf, type Box } from "../keep-clear";

const box = (left: number, top: number, width: number, height: number): Box => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
});

describe("rowsOf", () => {
    it("joins a row of stamps into one box, and keeps the title above and the line below apart", () => {
        const title = box(300, 60, 420, 80);
        const stamps = [box(280, 180, 150, 230), box(470, 176, 150, 234), box(660, 182, 150, 228)];
        const line = box(350, 440, 320, 40);
        assert.deepEqual(rowsOf([title, ...stamps, line]), [title, box(280, 176, 530, 234), line]);
    });

    it("keeps cards one under another apart, whatever order they come in", () => {
        const card = box(40, 100, 700, 360);
        const note = box(40, 490, 344, 200);
        assert.deepEqual(rowsOf([note, card]), [card, note]);
    });

    it("joins a card laid over another", () => {
        assert.deepEqual(rowsOf([box(40, 100, 700, 360), box(70, 300, 680, 300)]), [
            box(40, 100, 710, 500),
        ]);
    });

    it("leaves out a box that is not drawn, such as a card hidden on a phone", () => {
        assert.deepEqual(rowsOf([box(0, 0, 0, 0), box(16, 90, 358, 400)]), [box(16, 90, 358, 400)]);
    });
});
