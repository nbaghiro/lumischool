import assert from "node:assert/strict";
import { test } from "node:test";
import { lineOf, oneLine } from "../../../coding";
import { linesFromKey } from "../codepad";

test("a key written on one line reads back as the same blocks, a list's numbers and all", () => {
    const programs = [
        ["right 2", "repeat 3", "  up 1", "  right 1", "down 1"],
        ["set boats to list 2, 5, 1, 3", "add 6 to boats", "right item 5 of boats"],
        ["set t to list 4, -2, 7", "for each x in t", "  if x is more than 3", "    right 1"],
    ];
    for (const code of programs) {
        const want = code.map((t, i) => {
            const l = lineOf(t, i + 1);
            return { text: l.text, depth: l.depth };
        });
        assert.deepEqual(linesFromKey(oneLine(code)), want);
    }
});
