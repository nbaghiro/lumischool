import assert from "node:assert/strict";
import { test } from "node:test";
import { drawn, letteringIn } from "../../__tests__/check";
import { flowchart, shapeWords } from "../flowchart";

const THERMOSTAT = [
    "repeat 20",
    "  if temp is less than 18",
    "    switch heater on",
    "  if temp is more than 21",
    "    switch heater off",
    "  wait 1",
];

const words = (code: string[], blank = 0): string[] =>
    letteringIn(drawn(flowchart, { code, blank, run: 0, sense: [] }, { paper: true }).marks).map(
        (l) => l.s,
    );

test("every line but otherwise is a shape, carrying the words its block prints", () => {
    for (const take of flowchart.takes)
        take.params.code.forEach((line, i) => {
            const got = shapeWords(take.params.code, i + 1);
            if (/^\s*otherwise$/.test(line)) assert.equal(got, null, take.label);
            else assert.ok(got, `${take.label}: line ${i + 1} has no shape`);
        });
    assert.equal(shapeWords(THERMOSTAT, 1), "done 20 times?", "a repeat asks whether it is done");
    assert.equal(shapeWords(THERMOSTAT, 2), "temp is less than 18?", "an if asks its question");
    assert.equal(shapeWords(THERMOSTAT, 3), "switch heater on");
    assert.equal(shapeWords(["repeat until at flag", "  forward 1"], 1), "at flag?");
    assert.equal(
        shapeWords(["when the flag is tapped", "broadcast go", "when I receive go", "jump"], 3),
        "when I receive go",
        "each script starts at its own oval",
    );
});

test("the chart starts, asks, loops back and stops", () => {
    const got = words(["repeat 3", "  forward 2", "say done"]);
    for (const w of ["start", "done 3 times?", "forward 2", "say done", "stop", "yes", "no"])
        assert.ok(got.includes(w), `${w} is written: ${got.join(" | ")}`);
    const endless = words(["repeat for ever", "  light red", "  wait"]);
    assert.ok(!endless.includes("stop"), "a repeat for ever never reaches stop");
    assert.ok(!endless.some((w) => w.endsWith("?")), "and asks nothing");
});

test("blank leaves one shape empty for the missing step, and its anchor stays", () => {
    assert.ok(words(THERMOSTAT).includes("switch heater on"));
    const left = drawn(
        flowchart,
        { code: THERMOSTAT, blank: 3, run: 0, sense: [] },
        { paper: true },
    );
    assert.ok(!letteringIn(left.marks).some((l) => l.s === "switch heater on"));
    assert.ok(left.anchors["box(3)"], "the empty shape can still be pointed at");
});

test("a longer program makes a taller chart, and a decision's no way makes it wider", () => {
    const box = (code: string[]) => flowchart.box({ code, blank: 0, run: 0, sense: [] });
    const short = box(["forward 1"]),
        long = box(["forward 1", "turn left", "forward 1"]);
    assert.ok(long.h > short.h);
    const ask = box(["if n is more than 5", "  say big", "otherwise", "  say small"]);
    assert.ok(ask.w > box(["say big"]).w);
});
