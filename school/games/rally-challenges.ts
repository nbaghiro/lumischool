import { configurationKey } from "../../engine/motion/configuration";
import { rallyCourse, startRally, type RallyCourse, type RallyState } from "./rally";

export interface RallyConfiguration {
    phase: number;
    variant: number;
    course: RallyCourse;
}
export function rallyChallenge(seed: number, phase: number): RallyConfiguration {
    const variant = (seed >>> 0) % 3;
    return { phase, variant, course: rallyCourse(phase, variant) };
}
export function isRallyConfiguration(value: unknown, phase?: number): value is RallyConfiguration {
    if (
        !value ||
        typeof value !== "object" ||
        !("phase" in value) ||
        !("variant" in value) ||
        typeof value.phase !== "number" ||
        typeof value.variant !== "number" ||
        !Number.isInteger(value.phase) ||
        value.phase < 0 ||
        value.phase > 2 ||
        !Number.isInteger(value.variant) ||
        value.variant < 0 ||
        value.variant > 2 ||
        (phase !== undefined && value.phase !== phase)
    )
        return false;
    return configurationKey(value) === configurationKey(rallyChallenge(value.variant, value.phase));
}
export function openRallyConfiguration(value: RallyConfiguration): RallyState {
    if (!isRallyConfiguration(value)) throw new Error("Unverified rally course");
    return startRally(value.course);
}
