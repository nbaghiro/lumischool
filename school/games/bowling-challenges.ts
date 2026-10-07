import { BOWLING_LEVELS, startBowling, type BowlingState } from "./bowling";

export interface BowlingConfiguration {
    phase: number;
    variant: number;
}
export function bowlingChallenge(seed: number, phase: number): BowlingConfiguration {
    return {
        phase: Number.isInteger(phase) && BOWLING_LEVELS[phase] ? phase : 0,
        variant: (seed >>> 0) % 3,
    };
}
export function isBowlingConfiguration(v: unknown, phase: number): v is BowlingConfiguration {
    return (
        typeof v === "object" &&
        v !== null &&
        "phase" in v &&
        "variant" in v &&
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        BOWLING_LEVELS[phase] !== undefined &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < 3
    );
}
export const openBowlingConfiguration = (c: BowlingConfiguration): BowlingState =>
    startBowling(c.phase, c.variant);
