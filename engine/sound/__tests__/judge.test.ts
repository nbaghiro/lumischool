// The two checked tiers of .docs/sound.md: pitches exactly, and rhythm against a declared window
// whose goldens prove the check is well formed rather than that the window is right.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ONSET_FLOOR_MS, TOLERANCE, onsetsOf } from "../beat";
import {
    distinctRun,
    emptyPerformance,
    fitBeat,
    goldenPerformance,
    goldens,
    judgePitches,
    judgeRhythm,
    onsets,
    pitches,
    steadyLike,
    teachesRhythm,
    type Performance,
} from "../judge";
import type { Note } from "../pitch";

const perform = (notes: readonly Note[], gap = 300): Performance => ({
    instrument: "piano",
    started: 0,
    struck: notes.map((note, i) => ({ note, at: i * gap, how: "pointer" as const })),
});

test("a performance is data", () => {
    const p = perform([60, 64, 67]);
    assert.deepEqual(pitches(p), [60, 64, 67]);
    assert.deepEqual(onsets(p), [0, 300, 600]);
    assert.deepEqual(distinctRun(perform([60, 60, 62])), [60, 62]);
    assert.deepEqual(pitches(emptyPerformance("piano")), []);
});

test("play the C is provable, with no tolerance anywhere in it", () => {
    const want = { notes: [60] };
    assert.equal(judgePitches(perform([60]), want).ok, true);
    assert.match(judgePitches(perform([60]), want).because, /That is C4/);
    const miss = judgePitches(perform([62]), want);
    assert.equal(miss.ok, false);
    assert.deepEqual(miss.missing, [60]);
    // The feedback that works without hearing and without reading: which way to move along the
    // keys the child can already see.
    assert.match(miss.because, /2 to the left/);
    assert.equal(judgePitches(emptyPerformance("piano"), want).ok, false);
    assert.equal(judgePitches(perform([60, 62]), { notes: [60], exact: true }).ok, false);
    assert.equal(
        judgePitches(perform([60, 62]), { notes: [60] }).ok,
        true,
        "a first attempt is not punished for extras",
    );
});

test("an order can be checked, and so can a chord", () => {
    const run = { notes: [60, 62, 64], ordered: true };
    assert.equal(judgePitches(perform([60, 62, 64]), run).ok, true);
    assert.equal(judgePitches(perform([60, 62, 64, 65]), run).ok, false);
    assert.equal(judgePitches(perform([60, 64, 62]), run).ok, false);
    assert.match(judgePitches(perform([60, 64, 62]), run).because, /second note should be D4/);
    assert.equal(judgePitches(perform([60, 62]), run).ok, false);
    assert.match(judgePitches(perform([60, 62]), run).because, /still to play/);
    // A chord does not care about the order, and a grade one lesson about names does not care
    // about the octave.
    assert.equal(judgePitches(perform([67, 60, 64]), { notes: [60, 64, 67] }).ok, true);
    assert.equal(judgePitches(perform([72]), { notes: [60], anyOctave: true }).ok, true);
    assert.equal(judgePitches(perform([72]), { notes: [60] }).ok, false);
});

test("a repeated note is one press unless the judgement asks for repeats", () => {
    // "Play C then D" forgives a key pressed twice; a melody that repeats a note, as most songs
    // do, is compared press for press.
    const p = perform([60, 60, 62], 1);
    assert.ok(judgePitches(p, { notes: [60, 62], ordered: true }).ok);
    assert.ok(!judgePitches(p, { notes: [60, 62], ordered: true, repeats: true }).ok);
    assert.ok(judgePitches(p, { notes: [60, 60, 62], ordered: true, repeats: true }).ok);
});

const TARGET = [0, 1, 2, 3];

test("a rhythm is judged on its gaps, so playing it slowly is playing it right", () => {
    const tol = TOLERANCE.early;
    const exact = judgeRhythm(goldenPerformance(TARGET, { bpm: 80 }), {
        target: TARGET,
        tolerance: tol,
    });
    assert.equal(exact.ok, true);
    assert.ok(Math.abs(exact.msPerBeat - 750) < 1);
    assert.match(exact.because, /about 80 beats a minute/);
    // The same rhythm at half the speed is the same rhythm, which is why the tempo is fitted
    // rather than imposed.
    const slow = judgeRhythm(goldenPerformance(TARGET, { bpm: 40 }), {
        target: TARGET,
        tolerance: tol,
    });
    assert.equal(slow.ok, true);
    assert.ok(Math.abs(slow.msPerBeat - 1500) < 1);
    assert.deepEqual(
        slow.off.map((d) => Math.round(d * 1000)),
        [0, 0, 0, 0],
    );
});

test("the wrong number of notes is reported as a number, not as bad timing", () => {
    const v = judgeRhythm(perform([60, 60, 60], 750), {
        target: TARGET,
        tolerance: TOLERANCE.early,
    });
    assert.equal(v.ok, false);
    assert.match(v.because, /The bar has 4 notes, and 3 were played/);
    assert.equal(v.msPerBeat, 0, "nothing is fitted when there is nothing to compare");
    assert.equal(
        judgeRhythm(emptyPerformance("piano"), { target: TARGET, tolerance: 0.25 }).ok,
        false,
    );
});

test("a note outside the window fails, and the report says which one and by how much", () => {
    const late = goldenPerformance(TARGET, { bpm: 80, late: { index: 2, beats: 0.75 } });
    const v = judgeRhythm(late, { target: TARGET, tolerance: TOLERANCE.early });
    assert.equal(v.ok, false);
    assert.match(v.because, /third note came late/);
    assert.ok(v.worst > v.tolerance);
    // The played positions come back in beats, which is what the beat track draws, so the
    // tolerance is visible as a distance rather than only reported as a verdict.
    assert.equal(v.played.length, TARGET.length);
    assert.equal(v.off.length, TARGET.length);
});

test("the window never falls below the input jitter, however fast the tempo", () => {
    // The fractions in TOLERANCE are not measured. The floor is: pointer and key events carry tens
    // of milliseconds of error before the child has done anything, so a tighter window would be
    // measuring our own latency.
    const fast = judgeRhythm(goldenPerformance(TARGET, { bpm: 400 }), {
        target: TARGET,
        tolerance: 0.02,
    });
    assert.ok(fast.windowMs >= ONSET_FLOOR_MS, `window ${fast.windowMs}ms`);
    const slow = judgeRhythm(goldenPerformance(TARGET, { bpm: 60 }), {
        target: TARGET,
        tolerance: 0.25,
    });
    assert.equal(slow.windowMs, 250, "at a normal tempo the declared fraction is what applies");
});

test("one or two taps are a tempo rather than a rhythm, and are not failed for it", () => {
    // Two onsets fix a tempo exactly, so there is nothing left for them to be wrong about, which
    // is why the timing goldens start at three.
    for (const target of [[0], [0, 2]]) {
        const v = judgeRhythm(perform(target.map(() => 60)), { target, tolerance: 0.25 });
        assert.equal(v.ok, true);
        assert.match(v.because, /no rhythm to keep yet/);
    }
    // With two onsets the only wrong goldens left are the ones with the wrong number of notes.
    for (const g of goldens([0, 2], 0.25)) {
        if (!g.want) assert.notEqual(g.p.struck.length, 2, g.name);
    }
});

test("a bar can be reported as one that does not teach the rhythm it claims to", () => {
    // The cost of a generous window: on a bar whose values are only mildly uneven, clapping every
    // note the same length lands inside a quarter of a beat everywhere, so the exercise would mark
    // a child correct for not having read the rhythm. That is a bar to reject at authoring time.
    assert.equal(
        teachesRhythm([0, 1, 2, 3], TOLERANCE.early),
        false,
        "an even bar tests counting, not rhythm",
    );
    assert.equal(teachesRhythm([0, 2], TOLERANCE.early), false, "two taps test nothing at all");
    assert.equal(
        teachesRhythm([0, 0.5, 1, 1.5, 2, 3], TOLERANCE.early),
        false,
        "a mildly uneven bar passes an even clap at the grade one window, so it is not a grade one bar",
    );
    assert.equal(
        teachesRhythm([0, 0.5, 1, 1.5, 2, 3], TOLERANCE.later),
        true,
        "the same bar does tell them apart at the narrower window",
    );
    assert.equal(teachesRhythm([0, 3, 3.5], TOLERANCE.early), true);
    assert.deepEqual(
        steadyLike([0, 1, 1.5, 2]).map((b) => Math.round(b * 300) / 300),
        [0, 2 / 3, 4 / 3, 2],
    );
    assert.deepEqual(steadyLike([]), []);
});

test("a tolerance cannot be proved right, so the goldens prove the check is well formed", () => {
    // The verifier cannot prove that a quarter of a beat is the right window. It can prove that a
    // perfect performance passes, that a slower perfect one passes, and that three named wrong
    // ones fail. Two of the failures are a count and one is a timing on purpose: a check that only
    // rejects the wrong number of notes has not been shown to apply its tolerance at all.
    const bars: number[][] = [
        [0, 1, 2, 3],
        [0, 1, 2, 2.5, 3],
        [0, 2],
        [0, 0.5, 1, 1.5, 2, 3],
        [0, 1, 1.5, 2],
        onsetsOf([1, 1, 0.5, 0.5, 1]),
    ];
    for (const tolerance of [TOLERANCE.early, TOLERANCE.later]) {
        for (const target of bars) {
            for (const g of goldens(target, tolerance)) {
                const v = judgeRhythm(g.p, { target, tolerance });
                assert.equal(
                    v.ok,
                    g.want,
                    `${g.name} on [${target.join(" ")}] at ${tolerance}: ${v.because}`,
                );
            }
        }
    }
});

test("the fit is a least squares fit on the onsets, anchored on the first", () => {
    assert.equal(fitBeat([0, 500, 1000, 1500], [0, 1, 2, 3]), 500);
    assert.equal(
        fitBeat([100, 600, 1100], [0, 1, 2]),
        500,
        "when the child started is not part of it",
    );
    assert.equal(fitBeat([0], [0]), 0);
    assert.equal(
        fitBeat([0, 100], [0, 0]),
        0,
        "a degenerate target fits nothing rather than dividing by zero",
    );
});
