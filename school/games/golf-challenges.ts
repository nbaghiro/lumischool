import { configurationKey } from "../../engine/motion/configuration";
import { golfCourse, startGolf, type GolfCourse } from "./golf";

export interface GolfConfiguration {
    phase: number;
    course: GolfCourse;
}
export function golfChallenge(seed: number, phase: number): GolfConfiguration {
    if (!Number.isInteger(phase) || phase < 0 || phase > 2) throw new Error("Unknown golf phase");
    return { phase, course: golfCourse(phase, (seed >>> 0) % 3) };
}
export function isGolfConfiguration(value: unknown): value is GolfConfiguration {
    if (
        !value ||
        typeof value !== "object" ||
        !("phase" in value) ||
        typeof value.phase !== "number" ||
        !Number.isInteger(value.phase) ||
        value.phase < 0 ||
        value.phase > 2
    )
        return false;
    for (let i = 0; i < 3; i++)
        if (configurationKey(value) === configurationKey(golfChallenge(i, value.phase)))
            return true;
    return false;
}
export function openGolfConfiguration(value: GolfConfiguration) {
    if (!isGolfConfiguration(value)) throw new Error("Unverified golf course");
    return startGolf(value.course);
}
