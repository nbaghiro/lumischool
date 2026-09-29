// A game's sounds as data, so a test can read what a cue would sound like without audio; the page
// plays them in engine/ui/game-sound.ts. Every cue is also drawn. See .docs/sound.md.
import type { Cue } from "../motion/cues";

export type Wave = "sine" | "triangle" | "square" | "sawtooth" | "noise";

/** One sound in a cue: a tone or a burst of noise, rising to `gain` in `attack` seconds and dying in `decay`. */
export interface Layer {
    wave: Wave;
    /** The tone's frequency, or for noise the frequency it is filtered to. */
    hz: number;
    /** Where the tone glides to over its decay, for a whistle or a falling bump. */
    to?: number;
    attack: number;
    decay: number;
    /** From nought to one, before the cue's strength scales it. */
    gain: number;
    /** Seconds after the cue before this layer starts, for a phrase such as a fanfare. */
    delay?: number;
}

/** A game's own sounds for the cues it wants different from everyone's. */
export type Kit = Partial<Record<Cue, Layer[]>>;

/** How a cue is asked for: how hard, how much higher than its own pitch, and where across the view. */
export interface Voicing {
    /** From nought, a touch, to one, as hard as the game hits. Left out, it is a middling 0.6. */
    strength?: number;
    /** A multiple of every layer's frequency: two is an octave up. */
    pitch?: number;
    /** From -1 at the left of the view to 1 at the right. */
    pan?: number;
}

/** A layer as it will be played, with every setting worked out. */
export interface Played extends Layer {
    delay: number;
    pan: number;
}

const tone = (wave: Wave, hz: number, decay: number, gain: number, more: Partial<Layer> = {}) => ({
    wave,
    hz,
    attack: 0.005,
    decay,
    gain,
    ...more,
});

/** Everyone's sounds: soft struck tones and short noise, in the spirit of the drawings. */
export const BASE: Record<Cue, Layer[]> = {
    lift: [tone("triangle", 330, 0.12, 0.5, { to: 440 })],
    place: [tone("sine", 440, 0.14, 0.5), tone("noise", 2400, 0.03, 0.25)],
    back: [tone("triangle", 392, 0.14, 0.45, { to: 294 })],
    nope: [tone("triangle", 220, 0.08, 0.45), tone("triangle", 196, 0.1, 0.45, { delay: 0.1 })],
    bump: [tone("sine", 150, 0.1, 0.6, { to: 90 }), tone("noise", 500, 0.05, 0.35)],
    creak: [tone("sawtooth", 160, 0.3, 0.12, { attack: 0.05, to: 130 })],
    crash: [tone("noise", 900, 0.32, 0.7), tone("sine", 90, 0.25, 0.6, { to: 50 })],
    level: [tone("sine", 660, 0.3, 0.4), tone("sine", 990, 0.3, 0.25)],
    ring: [tone("sine", 880, 0.6, 0.4), tone("sine", 1320, 0.4, 0.2)],
    splash: [
        tone("noise", 1800, 0.3, 0.5, { attack: 0.02 }),
        tone("sine", 300, 0.12, 0.25, { to: 180 }),
    ],
    win: [
        tone("triangle", 523, 0.18, 0.45),
        tone("triangle", 659, 0.18, 0.45, { delay: 0.1 }),
        tone("triangle", 784, 0.4, 0.5, { delay: 0.2 }),
    ],
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The layers a cue plays with a kit: the kit's own where it has them, everyone's otherwise. A
 * stronger cue is louder and a little brighter, and a touch is still heard.
 */
export function voice(kit: Kit | undefined, cue: Cue, how: Voicing = {}): Played[] {
    const strength = clamp(how.strength ?? 0.6, 0, 1),
        pitch = clamp(how.pitch ?? 1, 0.25, 4),
        pan = clamp(how.pan ?? 0, -1, 1);
    const loud = 0.35 + 0.65 * strength,
        bright = 0.9 + 0.2 * strength;
    return (kit?.[cue] ?? BASE[cue]).map((l) => ({
        ...l,
        hz: l.hz * pitch * (l.wave === "noise" ? bright : 1),
        ...(l.to !== undefined ? { to: l.to * pitch } : {}),
        gain: l.gain * loud,
        delay: l.delay ?? 0,
        pan,
    }));
}

/** How long a voicing sounds, in seconds, so a limit on voices knows when one has ended. */
export const lengthOf = (layers: readonly Played[]): number =>
    Math.max(0, ...layers.map((l) => l.delay + l.attack + l.decay));

/** The most voices sounding at once; past it the quietest to come is dropped rather than a loud one cut. */
export const VOICES = 8;
/** Two asks for one cue this close together, in seconds, are one sound: a pile of blocks landing is one thud. */
export const MERGE = 0.04;

export interface Sounding {
    cue: Cue;
    from: number;
    until: number;
    strength: number;
}

/**
 * Whether a cue asked for at `now` is played, given what is sounding. It is not when the same cue
 * began a moment ago at least as hard, or when every voice is taken by something at least as loud.
 */
export function admit(
    sounding: readonly Sounding[],
    cue: Cue,
    strength: number,
    now: number,
    limit = VOICES,
): boolean {
    const live = sounding.filter((v) => v.until > now);
    if (live.some((v) => v.cue === cue && now - v.from < MERGE && v.strength >= strength))
        return false;
    return live.length < limit || live.some((v) => v.strength < strength);
}

/** Where a thing at `x` squares is across a view centred on `camera` and `width` squares wide, from -1 to 1. */
export const panOf = (x: number, camera: number, width: number): number =>
    clamp(((x - camera) / Math.max(1, width)) * 2 * 0.8, -1, 1);

/** A sound that goes on while something does: water running, wind, an engine, a dog panting. */
export interface Hum {
    kind: "water" | "wind" | "engine" | "pant" | "roll" | "siren" | "rotor" | "rumble";
    /** From nought, silent, to one. */
    level: number;
    /** A multiple of its own pitch, for an engine working harder. */
    pitch?: number;
}

/** What each hum is made of: noise filtered to a band, or a low tone, and how fast it sways. */
export const HUMS: Record<Hum["kind"], { wave: Wave; hz: number; gain: number; sway: number }> = {
    water: { wave: "noise", hz: 700, gain: 0.18, sway: 0.4 },
    wind: { wave: "noise", hz: 350, gain: 0.16, sway: 0.15 },
    engine: { wave: "sawtooth", hz: 55, gain: 0.08, sway: 6 },
    // breathy and quick, about three pants a second
    pant: { wave: "noise", hz: 1400, gain: 0.1, sway: 3 },
    // low and steady, the rumble of balls on cloth
    roll: { wave: "noise", hz: 180, gain: 0.07, sway: 0.5 },
    // a two-tone call swaying about once a second, kept quiet so it colours play rather than alarms
    siren: { wave: "triangle", hz: 620, gain: 0.05, sway: 1.1 },
    // the chop of a rotor, a low noise beating eight times a second
    rotor: { wave: "noise", hz: 240, gain: 0.12, sway: 8 },
    // a digger's diesel, lower and slower than a car's engine
    rumble: { wave: "sawtooth", hz: 38, gain: 0.09, sway: 3 },
};

/** A pitch a whole number of semitones up from one, for a cue that climbs with a count. */
export const semitones = (n: number): number => 2 ** (n / 12);
