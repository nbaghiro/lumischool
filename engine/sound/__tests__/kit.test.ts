import assert from "node:assert/strict";
import { test } from "node:test";
import { CUES } from "../../motion/cues";
import { admit, BASE, lengthOf, panOf, semitones, voice, type Kit, type Sounding } from "../kit";

test("every cue has everyone's sound, and a kit changes only its own", () => {
    for (const c of CUES) assert.ok(BASE[c].length > 0, c);
    const kit: Kit = { place: [{ wave: "square", hz: 180, attack: 0, decay: 0.1, gain: 1 }] };
    assert.equal(voice(kit, "place")[0]?.wave, "square");
    assert.deepEqual(
        voice(kit, "lift").map((l) => l.hz),
        voice(undefined, "lift").map((l) => l.hz),
    );
});

test("a harder cue is louder, a higher one is higher, and a touch is still heard", () => {
    const soft = voice(undefined, "bump", { strength: 0 }),
        hard = voice(undefined, "bump", { strength: 1 });
    assert.ok((soft[0]?.gain ?? 0) > 0);
    assert.ok((hard[0]?.gain ?? 0) > (soft[0]?.gain ?? 0));
    const up = voice(undefined, "ring", { pitch: semitones(12) });
    assert.ok(Math.abs((up[0]?.hz ?? 0) - 1760) < 1e-6);
    assert.equal(voice(undefined, "ring", { pan: 3 })[0]?.pan, 1);
    assert.ok(lengthOf(voice(undefined, "win")) > 0.5);
});

test("one cue asked twice at once is one sound, and a full set of voices drops the quietest", () => {
    const one: Sounding[] = [{ cue: "bump", from: 1, until: 1.2, strength: 0.8 }];
    assert.equal(admit(one, "bump", 0.5, 1.01), false);
    assert.equal(admit(one, "bump", 0.9, 1.01), true);
    assert.equal(admit(one, "bump", 0.5, 1.1), true);
    const full: Sounding[] = Array.from({ length: 8 }, () => ({
        cue: "crash",
        from: 0,
        until: 5,
        strength: 0.5,
    }));
    assert.equal(admit(full, "place", 0.4, 1), false);
    assert.equal(admit(full, "place", 0.9, 1), true);
    assert.equal(admit(full, "place", 0.4, 6), true);
});

test("a thing's place across the view pans it, and stays within the speakers", () => {
    assert.equal(panOf(20, 20, 40), 0);
    assert.ok(panOf(40, 20, 40) > 0.7);
    assert.equal(panOf(-500, 20, 40), -1);
});
