// The voices by name, as data: what an instrument declares it plays with and what a sounder is asked
// for. The names live apart from the voices themselves so a drawing can name its voice without
// reaching the sounder's definitions, which stay with the sounder.
import type { Note } from "./pitch";

/**
 * The voices that are one oscillator on a periodic wave: every partial an exact multiple of the
 * fundamental, every partial on one shared envelope. That is a bell or a glockenspiel.
 */
export const WAVE_NAMES = ["chime", "wood"] as const;
export type WaveName = (typeof WAVE_NAMES)[number];

/** The voices that are struck and mostly noise: the hand drum, the metronome's click, a shaker. */
export const HIT_NAMES = ["drum", "click", "shaker"] as const;
export type HitName = (typeof HIT_NAMES)[number];

/**
 * The voices that are a struck string: partials that are not quite harmonic, each with its own
 * decay, and no sustain at all.
 */
export const STRUCK_NAMES = ["piano"] as const;
export type StruckName = (typeof STRUCK_NAMES)[number];

/**
 * The voices that are a plucked string: a burst of noise circulating round a loop one period long,
 * rendered to samples rather than built from oscillators.
 */
export const PLUCK_NAMES = ["nylon", "uke"] as const;
export type PluckName = (typeof PLUCK_NAMES)[number];

/** The voices that are a struck bar: modes far from harmonic, each on one exponential, and no damper. */
export const MALLET_NAMES = ["glock"] as const;
export type MalletName = (typeof MALLET_NAMES)[number];

export const VOICE_NAMES = [
    ...STRUCK_NAMES,
    ...PLUCK_NAMES,
    ...MALLET_NAMES,
    ...WAVE_NAMES,
    ...HIT_NAMES,
] as const;
export type VoiceName = (typeof VOICE_NAMES)[number];

/** The hand drum's two notes, the middle's low dum and the edge's high ta, which the drum voice plays and the drum is drawn with. */
export const DUM: Note = 45;
export const TA: Note = 57;
