// Certified workshop families. The browser selects an arrangement; the test suite replays its
// complete construction/delivery through the same commands and pointer input as the player.
import {
    CARGO_LEVELS,
    MARBLE_LEVELS,
    startWorkshopLevel,
    type WorkshopLevel,
    type WorkshopState,
} from "./workshops";

export interface WorkshopConfiguration {
    kind: WorkshopState["kind"];
    phase: number;
    level: WorkshopLevel;
}

const TRAY_SHIFTS = [
    [-1, 0, 1],
    [-1, 0, 1],
    [-2, -1, 0],
    [0, 1, 2],
];

export function workshopChallengeCount(kind: WorkshopState["kind"], phase: number): number {
    return kind === "marble" || phase === 0 ? 3 : (CARGO_LEVELS[phase]?.pieces.length ?? 3);
}

export function workshopChallenge(
    seed: number,
    kind: WorkshopState["kind"],
    phase: number,
): WorkshopConfiguration {
    const safePhase = Number.isInteger(phase) && phase >= 0 && phase < 4 ? phase : 0;
    const levels = kind === "cargo" ? CARGO_LEVELS : MARBLE_LEVELS;
    const base = levels[safePhase];
    if (!base) throw new Error("Missing workshop phase");
    const index = (seed >>> 0) % workshopChallengeCount(kind, safePhase);
    const shift = TRAY_SHIFTS[safePhase]?.[index] ?? 0;
    const level: WorkshopLevel = {
        ...base,
        grades: [...base.grades],
        pieces: base.pieces.map((piece) => ({
            ...piece,
            ...(kind === "marble" ? { x: piece.x + index - 1 } : {}),
        })),
        ...(kind === "cargo"
            ? {
                  masses: base.pieces.map((_, i) =>
                      safePhase === 0
                          ? index + 1
                          : (base.masses?.[(i + index) % base.pieces.length] ?? 1),
                  ),
              }
            : {
                  target: base.target + shift,
                  ...(base.gate ? { gate: { ...base.gate, x: base.gate.x + shift / 4 } } : {}),
              }),
    };
    return { kind, phase: safePhase, level };
}

function sameShape(value: unknown, expected: unknown): boolean {
    if (expected === null || typeof expected !== "object") return value === expected;
    if (Array.isArray(expected))
        return (
            Array.isArray(value) &&
            value.length === expected.length &&
            expected.every((item, index) => sameShape(value[index], item))
        );
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const entries = Object.entries(expected);
    const actual = value as Record<string, unknown>;
    return (
        Object.keys(actual).length === entries.length &&
        entries.every(([key, item]) => sameShape(actual[key], item))
    );
}

export function isWorkshopConfiguration(value: unknown): value is WorkshopConfiguration {
    if (!value || typeof value !== "object" || !("kind" in value) || !("phase" in value))
        return false;
    const { kind, phase } = value;
    if (
        (kind !== "cargo" && kind !== "marble") ||
        typeof phase !== "number" ||
        !Number.isInteger(phase) ||
        phase < 0 ||
        phase > 3
    )
        return false;
    for (let seed = 0; seed < workshopChallengeCount(kind, phase); seed++)
        if (sameShape(value, workshopChallenge(seed, kind, phase))) return true;
    return false;
}

export function openWorkshopConfiguration(configuration: WorkshopConfiguration): WorkshopState {
    if (!isWorkshopConfiguration(configuration)) throw new Error("Unverified workshop arrangement");
    return startWorkshopLevel(configuration.kind, configuration.phase, configuration.level);
}
