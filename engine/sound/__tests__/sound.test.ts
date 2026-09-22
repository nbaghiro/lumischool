// The pure sound, checked against the declaration rather than by ear: pitch, intervals and scales,
// note values and tempo, and the keyboard maps, in a plain node process.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    A4,
    CONCERT_A,
    MIDDLE_C,
    PitchError,
    chromatic,
    frequency,
    inRange,
    isBlack,
    letterOf,
    nearestNote,
    noteName,
    noteOf,
    noteText,
    notesOf,
    octaveOf,
    readNote,
    spokenNote,
    whiteAt,
    whiteFrom,
    whiteIndex,
    whiteKeys,
    type Note,
} from "../pitch";
import {
    INTERVALS,
    KEY_SIGNATURES,
    OCTAVE,
    SCALES,
    alteredIn,
    degreeOf,
    describePair,
    gapPattern,
    inScale,
    intervalName,
    keySignature,
    scaleNotes,
    semitonesBetween,
    solfaOf,
    sortPitches,
    stepName,
    stepsBetween,
} from "../scale";
import {
    BPM_RANGE,
    DEFAULT_BPM,
    TOLERANCE,
    VALUES,
    barFits,
    barMissing,
    barTotal,
    beatsOf,
    beatsToMs,
    headOf,
    msPerBeat,
    onsetsOf,
    steady,
    toleranceFor,
    valueName,
} from "../beat";
import { LETTER_ROWS, NUMBER_ROW, caps, keyCap, keyFor, mapHelp, type Key } from "../keys";

test("a pitch is its MIDI number, and the names round trip", () => {
    assert.equal(MIDDLE_C, 60);
    assert.equal(noteOf("C4"), 60);
    assert.equal(noteOf("A4"), A4);
    assert.equal(noteOf("C-1"), 0);
    for (const n of chromatic(36, 96)) assert.equal(noteOf(noteName(n)), n, noteName(n));
    for (const n of chromatic(36, 96)) assert.equal(noteOf(noteText(n)), n, noteText(n));
    assert.equal(noteName(61), "C#4");
    assert.equal(noteName(61, "flat"), "Db4");
    assert.equal(noteText(61), "Cs4");
    assert.equal(noteText(61, "flat"), "Df4");
});

test("every spelling of an accidental reads as the same key", () => {
    const same = ["F#4", "Fs4", "fsharp4", "F♯4", "Gb4", "Gf4", "gflat4", "G♭4"];
    for (const s of same) assert.equal(readNote(s), 66, s);
    assert.equal(readNote("Cbb4"), 58);
    assert.equal(readNote("Css4"), 62);
    for (const s of ["", "H4", "C", "4", "C4x", "Cx4"]) assert.equal(readNote(s), null, s);
});

const whyNot = (s: string): string => {
    try {
        noteOf(s);
    } catch (e) {
        assert.ok(e instanceof PitchError, `${s} threw something else`);
        return e.message;
    }
    return assert.fail(`"${s}" was read as a note`);
};

test('writing "F#4" in a content file fails with a message about the comment', () => {
    // A "#" starts a comment in the notation, so the lexer hands the checker a bare "F" and swallows
    // the rest of the line. Without this message the failure that reaches the author is about a
    // missing setting several lines further on, which looks unrelated.
    const why = whyNot("F");
    assert.match(why, /has no octave/);
    assert.match(why, /Fs4/);
    assert.match(why, /"#" starts a comment/);
    assert.match(whyNot("Fs"), /has no octave/);
    assert.match(whyNot("wat"), /is not a note/);
});

test("frequency is equal temperament from A 440", () => {
    assert.equal(frequency(A4), CONCERT_A);
    assert.ok(Math.abs(frequency(MIDDLE_C) - 261.6256) < 0.001);
    assert.ok(
        Math.abs(frequency(72) - 2 * frequency(60)) < 1e-9,
        "an octave is twice the frequency",
    );
    for (const n of chromatic(36, 96)) assert.equal(nearestNote(frequency(n)), n);
    assert.equal(
        frequency(A4, 442),
        442,
        "concert pitch is a parameter, even though we never move it",
    );
});

test("black keys are where a piano puts them", () => {
    const black = chromatic(60, 71)
        .filter(isBlack)
        .map((n) => noteName(n));
    assert.deepEqual(black, ["C#4", "D#4", "F#4", "G#4", "A#4"]);
    assert.equal(isBlack(MIDDLE_C), false);
    assert.equal(letterOf(61), "C", "a sharp is named after the white key below it");
    assert.equal(octaveOf(71), 4);
    assert.equal(octaveOf(72), 5, "the octave number changes at C, not at A");
});

test("the white key index is what a staff and a keyboard both lay out against", () => {
    // One step in it is one line or space on the staff and one white key on the piano, which is why
    // both parts can read it.
    assert.equal(whiteIndex(noteOf("C4")) + 1, whiteIndex(noteOf("D4")));
    assert.equal(whiteIndex(noteOf("B4")) + 1, whiteIndex(noteOf("C5")));
    assert.equal(
        whiteIndex(noteOf("C#4")),
        whiteIndex(noteOf("C4")),
        "a black key takes the index below it",
    );
    for (const n of chromatic(36, 96).filter((q) => !isBlack(q)))
        assert.equal(whiteAt(whiteIndex(n)), n);
    assert.deepEqual(
        whiteKeys(noteOf("C4"), 8).map((n) => noteName(n)),
        ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    );
    assert.equal(
        whiteFrom(noteOf("C#4")),
        noteOf("D4"),
        "a keyboard asked to start on a black key does not",
    );
    assert.equal(whiteFrom(noteOf("D4")), noteOf("D4"));
});

test("a note can be said out loud, which is the screen reader path", () => {
    assert.equal(spokenNote(MIDDLE_C), "middle C");
    assert.equal(spokenNote(noteOf("F#4")), "F sharp, octave 4");
    assert.deepEqual(notesOf(["C4", "E4"]), [60, 64]);
    assert.equal(inRange(60), true);
    assert.equal(inRange(12), false);
});

test("an interval has a musician's name and a child's name for the same fact", () => {
    assert.equal(semitonesBetween(60, 64), 4);
    assert.equal(intervalName(4), "major third");
    assert.equal(intervalName(12), "octave");
    assert.equal(intervalName(24), "2 octaves");
    assert.equal(intervalName(13), "13 semitones");
    assert.equal(INTERVALS.length, OCTAVE + 1);
    // The grade two vocabulary counts white keys, not semitones, which is why C to D and E to F are
    // both one step even though one is a tone and the other a semitone. That difference is exactly
    // what the grade three lesson on the black keys goes on to teach.
    assert.equal(stepName(noteOf("C4"), noteOf("D4")), "a step");
    assert.equal(stepName(noteOf("E4"), noteOf("F4")), "a step");
    assert.equal(semitonesBetween(noteOf("C4"), noteOf("D4")), 2);
    assert.equal(semitonesBetween(noteOf("E4"), noteOf("F4")), 1);
    assert.equal(stepName(noteOf("C4"), noteOf("E4")), "a skip");
    assert.equal(stepName(noteOf("C4"), noteOf("G4")), "a leap");
    assert.equal(stepName(60, 60), "the same note");
    assert.equal(stepsBetween(noteOf("C4"), noteOf("C5")), 7);
    assert.match(describePair(noteOf("C4"), noteOf("E4")), /C4 to E4: a skip, major third/);
});

test("a scale is a pattern that is the same from any note", () => {
    assert.deepEqual(
        scaleNotes(noteOf("C4"), "major").map((n) => noteName(n)),
        ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    );
    assert.deepEqual(
        scaleNotes(noteOf("G4"), "major").map((n) => noteName(n)),
        ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
    );
    assert.deepEqual(gapPattern("major"), [
        "tone",
        "tone",
        "semitone",
        "tone",
        "tone",
        "tone",
        "semitone",
    ]);
    // The grade four claim, checked: the gaps are the same wherever the scale starts.
    for (const tonic of chromatic(48, 72)) {
        const notes = scaleNotes(tonic, "major");
        assert.deepEqual(
            notes.slice(1).map((n, i) => n - (notes[i] ?? 0)),
            [2, 2, 1, 2, 2, 2, 1],
            noteName(tonic),
        );
    }
    for (const name of Object.keys(SCALES)) assert.equal(SCALES[name as keyof typeof SCALES][0], 0);
    assert.equal(degreeOf(noteOf("E4"), noteOf("C4")), 3);
    assert.equal(degreeOf(noteOf("C#4"), noteOf("C4")), null);
    assert.equal(inScale(noteOf("F#5"), noteOf("G4")), true);
    assert.deepEqual(sortPitches([64, 60, 62]), [60, 62, 64]);
    assert.equal(solfaOf(noteOf("E4"), noteOf("C4")), "mi");
    assert.equal(solfaOf(noteOf("C5"), noteOf("C4")), "do");
});

test("a key signature names the black keys a key needs", () => {
    assert.deepEqual(keySignature(noteOf("C4")), { sharps: [], flats: [] });
    assert.deepEqual(keySignature(noteOf("G4"))?.sharps, ["F"]);
    assert.equal(keySignature(noteOf("C#4")), null);
    // G major over one octave of the keyboard: the one black key is the F sharp, which is the whole
    // of the grade four lesson.
    assert.deepEqual(
        alteredIn(noteOf("G4"), noteOf("C4"), noteOf("C6")).map((n) => noteName(n)),
        ["F#4", "F#5"],
    );
    assert.deepEqual(
        alteredIn(noteOf("F4"), noteOf("C4"), noteOf("C5")).map((n) => noteName(n)),
        ["A#4"],
    );
    assert.deepEqual(alteredIn(noteOf("C4"), noteOf("C4"), noteOf("C5")), []);
    for (const sig of Object.values(KEY_SIGNATURES))
        assert.ok(!sig.sharps.length || !sig.flats.length);
});

test("a note value is beats, by name or by number", () => {
    assert.equal(beatsOf("crotchet"), 1);
    assert.equal(beatsOf("quarter"), 1, "the American name reads and is never printed");
    assert.equal(beatsOf("minim"), 2);
    assert.equal(beatsOf("quaver"), 0.5);
    assert.equal(beatsOf(0.25), 0.25);
    assert.equal(beatsOf("1.5"), 1.5);
    assert.throws(() => beatsOf("twiddle"), /not a note value/);
    assert.equal(valueName(2), "minim");
    assert.equal(valueName(3), "3 beats");
    assert.equal(VALUES.semibreve, 4);
});

test("a bar is arithmetic, which is the grade one lesson", () => {
    const bar = [1, 1, 0.5, 0.5, 1];
    assert.equal(barTotal(bar), 4);
    assert.equal(barFits(bar), true);
    assert.equal(barMissing([1, 1]), 2, "the answer to finish the bar");
    assert.equal(barMissing(["minim", "crotchet"]), 1);
    assert.deepEqual(onsetsOf(bar), [0, 1, 2, 2.5, 3]);
    assert.deepEqual(steady(4), [0, 1, 2, 3]);
    // The existing rhythm bar's own example, which this has to agree with.
    assert.equal(barTotal([1, 1, 0.5, 0.5, 2]), 5);
    assert.deepEqual(headOf(2), { open: true, flags: 0 });
    assert.deepEqual(headOf(1), { open: false, flags: 0 });
    assert.deepEqual(headOf(0.5), { open: false, flags: 1 });
    assert.deepEqual(headOf(0.25), { open: false, flags: 2 });
});

test("a tempo turns beats into milliseconds and never the other way round in content", () => {
    assert.equal(msPerBeat(60), 1000);
    assert.equal(msPerBeat(120), 500);
    assert.equal(beatsToMs(4, 60), 4000);
    assert.ok(DEFAULT_BPM >= BPM_RANGE[0] && DEFAULT_BPM <= BPM_RANGE[1]);
    assert.equal(toleranceFor(1), TOLERANCE.early);
    assert.equal(toleranceFor(4), TOLERANCE.later);
    assert.ok(TOLERANCE.early > TOLERANCE.later, "the younger child gets the wider window");
});

// The computer keyboard's maps are checked against keys made here, since no instrument is drawn at the root yet.
const fakeKeys = (notes: readonly Note[]): Key[] =>
    notes.map((n) => ({
        id: noteText(n),
        note: n,
        anchor: `key(${noteText(n)})`,
        label: letterOf(n),
        spoken: spokenNote(n),
        raised: isBlack(n),
        hit: { x: 0, y: 0, w: 60, h: 180 },
    }));

test("the number row plays the white keys, because that is what a five-year-old can read", () => {
    const keys = fakeKeys(chromatic(60, 72));
    assert.equal(keyFor("Digit1", keys, "numbers")?.id, "C4");
    assert.equal(keyFor("Digit3", keys, "numbers")?.id, "E4");
    assert.equal(keyFor("Digit8", keys, "numbers")?.id, "C5");
    assert.equal(keyFor("KeyW", keys, "numbers"), undefined);
    assert.equal(
        keyFor("Digit9", fakeKeys(whiteKeys(60, 8)), "numbers"),
        undefined,
        "past the end is nothing",
    );
    assert.deepEqual([...caps(keys, "numbers").entries()].slice(0, 3), [
        ["C4", "1"],
        ["D4", "2"],
        ["E4", "3"],
    ]);
});

test("the letter map reaches the black keys, which is its whole point", () => {
    const keys = fakeKeys(chromatic(60, 72));
    assert.equal(keyFor("KeyA", keys, "letters")?.id, "C4");
    assert.equal(keyFor("KeyW", keys, "letters")?.id, "Cs4");
    assert.equal(keyFor("KeyS", keys, "letters")?.id, "D4");
    assert.equal(keyFor("KeyK", keys, "letters")?.id, "C5");
    assert.equal(keyCap("Digit4"), "4");
    assert.equal(keyCap("KeyD"), "D");
    assert.equal(keyCap("Semicolon"), ";");
    assert.equal(NUMBER_ROW.length, 10);
    assert.ok(LETTER_ROWS.length >= 13, "at least an octave of the chromatic scale");
    assert.ok(mapHelp.numbers.length > 10 && mapHelp.letters.length > 10);
});
