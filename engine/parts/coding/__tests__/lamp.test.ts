import assert from "node:assert/strict";
import { test } from "node:test";
import { parse, run } from "../../../coding";
import { coloursIn, drawn, everyMark } from "../../__tests__/check";
import { lampRun, pixels, printerOf } from "../pixels";

const LAMP = ["repeat for ever", "  light red", "  light green"];
const row = (code: readonly string[], cols = 6) => ({
    ...pixels.params,
    cols,
    rows: 1,
    code: [...code],
    beside: false,
    upto: -1,
});

test("a lamp's run is the frames that fill its row, however long the program goes on", () => {
    const r = run(parse(LAMP), printerOf({ cols: 6, rows: 1 }));
    assert.equal(r.stopped, "limit");
    assert.ok(
        r.frames.length > 1000,
        `an endless repeat runs to the step limit, not ${r.frames.length}`,
    );
    const cap = lampRun(r, 6);
    assert.ok(cap !== null && cap < 20, `the row of six fills in ${cap} frames`);
    assert.equal(r.frames.slice(0, cap ?? 0).filter((f) => f.kind === "light").length, 6);
    // a program that lights fewer than the row holds is played to its end
    const short = run(parse(["light red", "light green"]), printerOf({ cols: 6, rows: 1 }));
    assert.equal(lampRun(short, 6), short.frames.length);
    // a printer program lights no lamp, and reads as it always did
    assert.equal(lampRun(run(parse(["3 red 3 green"]), printerOf({ cols: 6, rows: 1 })), 6), null);
});

test("a lamp program paints the row a printer line of the same colours paints", () => {
    const lamp = drawn(pixels, row(LAMP), { paper: false });
    const printer = drawn(pixels, row(["1 red 1 green 1 red 1 green 1 red 1 green"]), {
        paper: false,
    });
    assert.deepEqual([...coloursIn(lamp.marks)], [...coloursIn(printer.marks)]);
    assert.deepEqual(pixels.box(row(LAMP)), pixels.box(row(["1 red 1 green 1 red 1 green"])));
});

test("a lamp lights one square at a time, so a run can be watched a step at a time", () => {
    /** How many squares are lit: a cell's fill is the light's own colour, and an unlit cell has none. */
    const lit = (upto: number) => {
        let n = 0;
        for (const { mark } of everyMark(
            drawn(pixels, { ...row(LAMP), upto }, { paper: false }).marks,
        ))
            if (mark.kind === "shape")
                for (const t of mark.traces) if (t.fill === "#f39cbf" || t.fill === "#93d5b3") n++;
        return n;
    };
    // the repeat's own frame lights nothing, and each light line lights one more square
    assert.equal(lit(1), 0);
    assert.equal(lit(2), 1);
    assert.equal(lit(3), 2);
    assert.equal(lit(5), 3);
    assert.equal(lit(-1), 6, "left to itself the lamp fills the row and stops there");
});
