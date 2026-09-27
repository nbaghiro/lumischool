// Other days of fishing: the same spot and the same fish, swimming where another seed puts them, and
// another weight to make, each one the fish in the water can make exactly within the pan's room.
import { configurationKey } from "../../engine/motion/configuration";
import { FISH_LEVELS, startFishing, words, type FishLevel, type FishState } from "./fishing";

const SEEDS = [
    [2, 3, 5],
    [2, 3, 4],
    [2, 3, 4],
    [2, 3, 4],
    [4, 6, 8],
    [2, 5, 8],
];
const TARGETS = [
    [7, 9, 12],
    [19, 17, 14],
    [700, 1050, 900],
    [2, 2.25, 1.75],
    [40, 45, 35],
    [1.25, 1.75, 1.35],
];

export const FISH_CHALLENGE_COUNT = 3;

export interface FishConfiguration {
    phase: number;
    seed: number;
    level: FishLevel;
}

export function fishChallenge(seed: number, phase: number): FishConfiguration {
    const base = FISH_LEVELS[phase];
    if (!base) throw new Error("Unknown fishing phase");
    const k = (seed >>> 0) % FISH_CHALLENGE_COUNT,
        target = TARGETS[phase]?.[k] ?? base.target,
        w = words(base.units, target);
    const goal = `Catch fish that weigh ${w} together. The pan holds ${base.holds}.`;
    return {
        phase,
        seed: SEEDS[phase]?.[k] ?? 1,
        level: {
            ...base,
            grades: [base.grades[0], base.grades[1]],
            kinds: base.kinds.map((x) => ({ ...x })),
            dial: { ...base.dial },
            weeds: base.weeds.map((x) => ({ ...x })),
            target,
            title: `Fish to make ${w}`,
            goal,
            prompt: goal,
            done: `The scale reads ${w}.`,
        },
    };
}

export function isFishConfiguration(value: unknown, phase: number): value is FishConfiguration {
    for (let k = 0; k < FISH_CHALLENGE_COUNT; k++)
        if (configurationKey(value) === configurationKey(fishChallenge(k, phase))) return true;
    return false;
}

export function openFishConfiguration(value: FishConfiguration): FishState {
    if (!isFishConfiguration(value, value.phase)) throw new Error("Unverified fishing day");
    return startFishing(value.level, value.phase, value.seed);
}
