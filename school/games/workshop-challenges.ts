// Certified cargo arrangements. The browser selects an arrangement; the test suite replays its
// complete delivery through the same commands and pointer input as the player. The marble workshop
// has its own levels in marble.ts and no generated arrangements.
import {
    CARGO_LEVELS,
    startWorkshopLevel,
    type WorkshopLevel,
    type WorkshopState,
} from "./workshops";

/** A stored arrangement; `kind` is kept so arrangements stored before the marble run moved out still open. */
export interface WorkshopConfiguration {
    kind: "cargo";
    phase: number;
    level: WorkshopLevel;
}

export function workshopChallengeCount(phase: number): number {
    return phase === 0 ? 3 : (CARGO_LEVELS[phase]?.pieces.length ?? 3);
}

export function workshopChallenge(seed: number, phase: number): WorkshopConfiguration {
    const safePhase = Number.isInteger(phase) && phase >= 0 && phase < 4 ? phase : 0;
    const base = CARGO_LEVELS[safePhase];
    if (!base) throw new Error("Missing workshop phase");
    const index = (seed >>> 0) % workshopChallengeCount(safePhase);
    const level: WorkshopLevel = {
        ...base,
        grades: [...base.grades],
        pieces: base.pieces.map((piece) => ({ ...piece })),
        masses: base.pieces.map((_, i) =>
            safePhase === 0 ? index + 1 : (base.masses?.[(i + index) % base.pieces.length] ?? 1),
        ),
    };
    return { kind: "cargo", phase: safePhase, level };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

function sameShape(value: unknown, expected: unknown): boolean {
    if (expected === null || typeof expected !== "object") return value === expected;
    if (Array.isArray(expected))
        return (
            Array.isArray(value) &&
            value.length === expected.length &&
            expected.every((item, index) => sameShape(value[index], item))
        );
    if (!isRecord(value)) return false;
    const entries = Object.entries(expected);
    return (
        Object.keys(value).length === entries.length &&
        entries.every(([key, item]) => sameShape(value[key], item))
    );
}

export function isWorkshopConfiguration(value: unknown): value is WorkshopConfiguration {
    if (!value || typeof value !== "object" || !("kind" in value) || !("phase" in value))
        return false;
    const { kind, phase } = value;
    if (
        kind !== "cargo" ||
        typeof phase !== "number" ||
        !Number.isInteger(phase) ||
        phase < 0 ||
        phase > 3
    )
        return false;
    for (let seed = 0; seed < workshopChallengeCount(phase); seed++)
        if (sameShape(value, workshopChallenge(seed, phase))) return true;
    return false;
}

export function openWorkshopConfiguration(configuration: WorkshopConfiguration): WorkshopState {
    if (!isWorkshopConfiguration(configuration)) throw new Error("Unverified workshop arrangement");
    return startWorkshopLevel(configuration.phase, configuration.level);
}

/** The barge's middle, where the mast stands, and how far either way a crate can stand on its deck. */
const MAST = 30,
    REACH = 7.2;

/**
 * Where to set each crate down on the barge, in the level's piece order, so the load balances: the
 * crates stand a little apart, the heaviest nearest the middle, and the whole row is slid along until
 * the weights times their distances from the mast cancel.
 */
export function cargoPlan(level: WorkshopLevel): number[] {
    const n = level.pieces.length,
        masses = level.pieces.map((_, i) => level.masses?.[i] ?? 1),
        gap = Math.min(2.6, (REACH * 2) / Math.max(1, n - 1)),
        slots = Array.from({ length: n }, (_, k) => (k - (n - 1) / 2) * gap);
    // the heaviest crates take the slots nearest the mast
    const byWeight = masses.map((m, i) => ({ m, i })).sort((a, b) => b.m - a.m || a.i - b.i),
        bySlot = slots
            .map((o, k) => ({ o, k }))
            .sort((a, b) => Math.abs(a.o) - Math.abs(b.o) || a.o - b.o),
        offsets: number[] = Array.from({ length: n }, () => 0);
    byWeight.forEach(({ i }, k) => {
        offsets[i] = bySlot[k]?.o ?? 0;
    });
    const total = masses.reduce((a, m) => a + m, 0),
        moment = offsets.reduce((a, o, i) => a + o * (masses[i] ?? 1), 0),
        shift = -moment / total;
    return offsets.map((o) => MAST + Math.max(-REACH, Math.min(REACH, o + shift)));
}
