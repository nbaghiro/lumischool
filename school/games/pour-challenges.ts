import { configurationKey } from "../../engine/motion/configuration";
import { seeded } from "../../engine/motion/spawn";
import { bind, type Round } from "./games";
import { pour, type PourVersion } from "./pour";

// Each tuple is exhaustively gated by the prover in the generation regression suite.
const RECIPES: readonly (readonly [number, number, number, number])[] = [
    [3, 2, 1, 2],
    [4, 3, 1, 2],
    [5, 3, 2, 2],
    [6, 4, 2, 2],
    [7, 4, 3, 2],
    [8, 3, 5, 2],
    [9, 4, 5, 2],
    [10, 3, 7, 2],
    [4, 3, 2, 4],
    [5, 2, 1, 4],
    [5, 3, 1, 4],
    [6, 5, 4, 4],
    [7, 3, 6, 4],
    [8, 5, 2, 4],
    [9, 4, 8, 4],
    [10, 7, 4, 4],
    [5, 3, 4, 6],
    [5, 4, 2, 6],
    [6, 5, 2, 6],
    [7, 2, 6, 6],
    [8, 5, 6, 6],
    [9, 4, 3, 6],
    [10, 3, 1, 6],
    [11, 4, 1, 6],
    [6, 5, 3, 8],
    [7, 3, 5, 8],
    [7, 4, 2, 8],
    [8, 3, 7, 8],
    [9, 4, 6, 8],
    [10, 3, 2, 8],
    [11, 4, 10, 8],
    [12, 5, 9, 8],
    [7, 5, 6, 10],
    [7, 6, 3, 10],
    [8, 3, 4, 10],
    [9, 4, 2, 10],
];
const STEPS = [2, 4, 6, 8, 8, 6];

export function pourConfigurations(phase: number): PourVersion[] {
    const steps = STEPS[phase];
    if (steps === undefined) return [];
    const scale = phase === 2 || phase === 3 ? 1 : 100;
    return RECIPES.filter((r) => r[3] === steps).flatMap(([a, b, target]) =>
        [false, true].map((reverse) => ({
            jugs: (reverse ? [b, a] : [a, b]).map((max) => ({ max: max * scale, step: scale })),
            target: target * scale,
            unit: scale === 1 ? "l" : "ml",
        })),
    );
}

export function pourChallenge(seed: number, phase: number): PourVersion {
    const pool = pourConfigurations(phase);
    const configuration = pool[Math.floor(seeded(seed)() * pool.length)];
    if (!configuration) throw new Error("Unknown measuring phase");
    return configuration;
}

export function isPourConfiguration(value: unknown, phase: number): value is PourVersion {
    if (!value || typeof value !== "object") return false;
    return pourConfigurations(phase).some((v) => configurationKey(v) === configurationKey(value));
}

export function openPourConfiguration(v: PourVersion): Round {
    return bind(
        pour,
        {
            id: "pour.measure-it-out",
            title: "Measure it out",
            kind: "pour",
            skills: [],
            grades: [2, 4],
            paper: "jug.read-the-scale",
            versions: [{ values: JSON.stringify(v), v }],
        },
        0,
    );
}
