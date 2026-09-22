import assert from "node:assert/strict";
import { test } from "node:test";
import { CUES, noCues, recordCues, type Cue } from "../cues";
import { collapse, cuesBetween, timeline } from "../timeline";

/** A cue read back off a timeline, whose cues are plain names, or null when it names no cue. */
const cueOf = (name: string): Cue | null => CUES.find((c) => c === name) ?? null;

test("a recorder keeps every cue asked for, with when it was asked for", () => {
    const cues = recordCues();
    cues.cue("lift");
    cues.cue("splash", 0.4);
    cues.cue("win", 1);
    assert.deepEqual(cues.heard, [
        { cue: "lift", at: 0 },
        { cue: "splash", at: 0.4 },
        { cue: "win", at: 1 },
    ]);
});

test("a sink with nothing listening takes a cue and is not an error", () => {
    assert.doesNotThrow(() => {
        noCues.cue("nope");
        noCues.cue("ring", 2);
    });
});

test("a collapsed timeline's cues are heard in the order they fire", () => {
    const tl = timeline(
        [],
        [
            { at: 0, cue: "level" },
            { at: 0.6, cue: "win" },
        ],
    );
    const cues = recordCues();
    for (const name of cuesBetween(collapse(tl), -1, 0)) {
        const cue = cueOf(name);
        if (cue) cues.cue(cue);
    }
    assert.deepEqual(
        cues.heard.map((h) => h.cue),
        ["level", "win"],
    );
});
