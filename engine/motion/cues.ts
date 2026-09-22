// How a game asks for a sound without reaching into audio.
//
// A game names a cue, and nothing else: a piece was lifted, a piece was placed, a piece went home,
// a push met a buffer, a car ran out of road, the beam came level, a plane went through its hoop, a
// fish met the water, the round was won. The page maps each cue to a note on the sound core's
// sounder, which is off until a visitor asks and silent on paper and in a test. `motion` reaches no
// other module, so the games' model and view can be tested in a plain node run, and a cue with
// nothing listening is not an error: every cue is also something drawn, so the volume at zero loses
// the sound and keeps the information.

export const CUES = [
    "lift",
    "place",
    "back",
    "nope",
    "bump",
    "crash",
    "level",
    "ring",
    "splash",
    "win",
] as const;
export type Cue = (typeof CUES)[number];

export interface Cues {
    /** Ask for a cue now, or `at` seconds from now for a phrase spread over time. */
    cue(c: Cue, at?: number): void;
}

/** What a print render, a test with nothing to assert, and a page with sound off all get. */
export const noCues: Cues = { cue() {} };

export interface CueRecorder extends Cues {
    heard: { cue: Cue; at: number }[];
}

/** A cues sink that keeps every request, which is how a test asserts a game asked for a sound. */
export function recordCues(): CueRecorder {
    const heard: { cue: Cue; at: number }[] = [];
    return {
        heard,
        cue(c, at = 0) {
            heard.push({ cue: c, at });
        },
    };
}
