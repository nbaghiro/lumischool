// A deliberately finite catalogue of physics-certified arrangements. Selection is constant-time;
// no solver runs on a child's device. Geometry is stored with the challenge so a retry is exact.
// The replay suite is empirical evidence for this version of the physics, not a universal proof.
import { SLING_LEVELS, startSlingLevel, type SlingLevel, type SlingState } from "./sling";

export interface SlingConfiguration {
    phase: number;
    level: SlingLevel;
}

export interface SlingWitness {
    /** Keyboard-reachable angles and pulls; stop when the game reports a win. */
    shots: readonly { degrees: number; pull: number }[];
}

const SHIFTS = [-2, 0, 2] as const;

function arrangement(phase: number, shift: number): SlingConfiguration {
    const base = SLING_LEVELS[phase] ?? SLING_LEVELS[0];
    const displacement = phase === 2 ? 0 : shift;
    return {
        phase,
        level: {
            ...base,
            world: { ...base.world },
            pouch: { ...base.pouch },
            grades: [...base.grades],
            pieces: base.pieces.map((piece) =>
                phase === 2 && piece.kind === "rod" && piece.fixed
                    ? { ...piece, n: 4 + shift / 2 }
                    : phase !== 2 && piece.kind === "rod" && piece.fixed
                      ? { ...piece }
                      : { ...piece, x: piece.x + displacement },
            ),
            ...(base.seesaw ? { seesaw: { ...base.seesaw, x: base.seesaw.x + shift } } : {}),
        },
    };
}

/** Three certified layouts per phase: target placements, or stone ledge lengths in the rolling course. */
export const SLING_CHALLENGE_COUNT = SHIFTS.length;

export function slingChallenge(seed: number, phase: number): SlingConfiguration {
    const index = (seed >>> 0) % SHIFTS.length;
    return arrangement(
        Number.isInteger(phase) && phase >= 0 && phase < SLING_LEVELS.length ? phase : 0,
        SHIFTS[index] ?? 0,
    );
}

function sameShape(value: unknown, expected: unknown): boolean {
    if (expected === null || typeof expected !== "object") return value === expected;
    if (Array.isArray(expected)) {
        return (
            Array.isArray(value) &&
            value.length === expected.length &&
            expected.every((item, index) => sameShape(value[index], item))
        );
    }
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const actual = value as Record<string, unknown>;
    const entries = Object.entries(expected);
    return (
        Object.keys(actual).length === entries.length &&
        entries.every(([key, item]) => sameShape(actual[key], item))
    );
}

/** Reject hand-edited or unchecked geometry, independently of JSON object key order. */
export function isSlingConfiguration(value: unknown): value is SlingConfiguration {
    return SLING_LEVELS.some((_, phase) =>
        SHIFTS.some((shift) => sameShape(value, arrangement(phase, shift))),
    );
}

export function openSlingConfiguration(configuration: SlingConfiguration): SlingState {
    if (!isSlingConfiguration(configuration)) throw new Error("Unverified slingshot arrangement");
    return startSlingLevel(configuration.level, configuration.phase);
}
