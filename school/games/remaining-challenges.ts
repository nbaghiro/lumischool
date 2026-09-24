import { RAFT_LEVELS, startRaftLevel, type RaftLevel } from "./rafts";
import { CAST_LEVELS, start as startCast, type CastLevel, type CastState } from "./cast";
import { SHOVE_LEVELS, startShoveLevel, type ShoveLevel } from "./shove";
import { CAKE_LEVELS, startCakeLevel, type CakeLevel } from "./cake";
import { SEESAW_LEVELS, startSeesawLevel, type SeesawLevel } from "./seesaw";
import { start as startSnake, type SnakeLevel, type SnakeState } from "./snake";

export type RemainingKind = "cake" | "seesaw" | "snake" | "shove" | "cast" | "rafts";
export type RemainingConfiguration =
    | { kind: "rafts"; phase: number; level: RaftLevel }
    | {
          kind: "cast";
          phase: number;
          level: Omit<CastLevel, "words">;
          fish: CastState["fish"];
          swimSeed: number;
      }
    | { kind: "shove"; phase: number; level: ShoveLevel }
    | { kind: "cake"; phase: number; level: CakeLevel }
    | { kind: "seesaw"; phase: number; level: SeesawLevel }
    | { kind: "snake"; phase: number; level: SnakeLevel; cards: SnakeState["cards"] };

const LOADS = [
    [6, 7, 8],
    [9, 10, 11],
    [7, 9, 11],
    [4, 6, 8],
    [5, 8, 11],
    [3, 4, 5],
];
export const REMAINING_CHALLENGE_COUNT = 3;

export function remainingChallenge(
    seed: number,
    kind: RemainingKind,
    phase: number,
): RemainingConfiguration {
    const index = (seed >>> 0) % REMAINING_CHALLENGE_COUNT;
    const safePhase =
        Number.isInteger(phase) && phase >= 0 && phase < (kind === "snake" ? 2 : 6) ? phase : 0;
    if (kind === "rafts") {
        const base = RAFT_LEVELS[safePhase] ?? RAFT_LEVELS[0];
        return {
            kind,
            phase: safePhase,
            level: {
                ...base,
                grades: [...base.grades],
                rafts: base.rafts.map((raft) => ({ ...raft, x: raft.x + (index - 1) * 0.5 })),
            },
        };
    }
    if (kind === "cast") {
        const seeds = [
            [1, 2, 4],
            [1, 2, 3],
            [1, 2, 3],
            [1, 2, 3],
            [1, 4, 8],
            [1, 2, 8],
        ];
        const targets = [
            [7, 9, 8],
            [19, 17, 14],
            [1000, 700, 1050],
            [1.5, 2, 2.25],
            [35, 40, 45],
            [1.5, 1.25, 1.75],
        ];
        const swimSeed = seeds[safePhase]?.[index] ?? 1;
        const target = targets[safePhase]?.[index] ?? 10;
        const initial = startCast(safePhase, swimSeed);
        const { words, ...base } = initial.L;
        const goal = `Catch ${base.holds} fish that weigh ${words(target)} together.`;
        return {
            kind,
            phase: safePhase,
            swimSeed,
            fish: initial.fish.map((fish) => ({ ...fish })),
            level: {
                ...base,
                grades: [...base.grades],
                kinds: base.kinds.map((fish) => ({ ...fish })),
                dial: { ...base.dial },
                target,
                title: `${base.holds} fish to make ${words(target)}`,
                goal,
                prompt: goal,
                done: `The scale reads ${words(target)}, and the pan is full.`,
            },
        };
    }
    if (kind === "shove") {
        const base = SHOVE_LEVELS[safePhase] ?? SHOVE_LEVELS[0];
        const targets = [
            [10, 15, 20],
            [20, 25, 30],
            [55, 60, 65],
            [50, 51, 52],
            [95, 96, 97],
            [185, 186, 187],
        ];
        const target = targets[safePhase]?.[index] ?? base.price;
        const price = base.paid ? base.paid - target : target;
        const goal = base.paid
            ? `The price is ${price} cents and ${base.paid} cents was paid. Put the change on the felt in ${base.most} pieces or fewer.`
            : `Make ${target} cents on the felt in ${base.most} pieces or fewer.`;
        return {
            kind,
            phase: safePhase,
            level: {
                ...base,
                grades: [...base.grades],
                drawer: { ...base.drawer },
                price,
                title: base.paid ? `${price} cents, paid ${base.paid}` : `Make ${target} cents`,
                goal,
                prompt: goal,
            },
        };
    }
    if (kind === "cake") {
        const base = CAKE_LEVELS[safePhase] ?? CAKE_LEVELS[0];
        const scale = [0.75, 0.875, 1][index] ?? 1;
        return {
            kind,
            phase: safePhase,
            level: {
                ...base,
                grades: [...base.grades],
                names: [...base.names],
                whole: base.whole * scale,
                ...(base.share ? { share: base.share * scale } : {}),
                ...(base.gone ? { gone: base.gone * scale } : {}),
                ...(base.given
                    ? { given: { ...base.given, pieces: base.given.pieces.map((n) => n * scale) } }
                    : {}),
            },
        };
    }
    if (kind === "seesaw") {
        const base = SEESAW_LEVELS[safePhase] ?? SEESAW_LEVELS[0];
        const kg = LOADS[safePhase]?.[index] ?? base.load.kg;
        const goal = `Make the plank level. The suitcase weighs ${kg} kilograms.${safePhase === 1 || safePhase === 4 ? " Use two bags." : safePhase === 3 ? " Use one bag." : ""}`;
        return {
            kind,
            phase: safePhase,
            level: {
                ...base,
                grades: [...base.grades],
                bags: [...base.bags],
                open: [...base.open],
                load: { ...base.load, kg },
                title: `Balance ${kg} kilograms`,
                goal,
                prompt: goal,
            },
        };
    }
    const state = startSnake(safePhase, [1, 2, 4][index] ?? 1);
    return {
        kind,
        phase: safePhase,
        level: { ...state.L, grades: [...state.L.grades], decoys: [...state.L.decoys] },
        cards: state.cards.map((card) => ({ ...card })),
    };
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
    const actual = value as Record<string, unknown>,
        entries = Object.entries(expected);
    return (
        Object.keys(actual).length === entries.length &&
        entries.every(([key, item]) => sameShape(actual[key], item))
    );
}

export function isRemainingConfiguration(value: unknown): value is RemainingConfiguration {
    if (!value || typeof value !== "object" || !("kind" in value) || !("phase" in value))
        return false;
    const { kind, phase } = value;
    if (
        (kind !== "cake" &&
            kind !== "seesaw" &&
            kind !== "snake" &&
            kind !== "shove" &&
            kind !== "cast" &&
            kind !== "rafts") ||
        typeof phase !== "number" ||
        !Number.isInteger(phase) ||
        phase < 0 ||
        phase >= (kind === "snake" ? 2 : 6)
    )
        return false;
    for (let seed = 0; seed < REMAINING_CHALLENGE_COUNT; seed++)
        if (sameShape(value, remainingChallenge(seed, kind, phase))) return true;
    return false;
}

export function openRemainingConfiguration(configuration: RemainingConfiguration) {
    if (!isRemainingConfiguration(configuration)) throw new Error("Unverified game arrangement");
    if (configuration.kind === "rafts")
        return startRaftLevel(configuration.level, configuration.phase);
    if (configuration.kind === "cast") {
        const state = startCast(configuration.phase, configuration.swimSeed);
        state.L = {
            ...configuration.level,
            words: (CAST_LEVELS[configuration.phase] ?? CAST_LEVELS[0]).words,
        };
        state.fish = configuration.fish.map((fish) => ({ ...fish }));
        return state;
    }
    if (configuration.kind === "shove")
        return startShoveLevel(configuration.level, configuration.phase);
    if (configuration.kind === "cake")
        return startCakeLevel(configuration.level, configuration.phase);
    if (configuration.kind === "seesaw")
        return startSeesawLevel(configuration.level, configuration.phase);
    const state = startSnake(configuration.phase);
    state.L = configuration.level;
    state.cards = configuration.cards.map((card) => ({ ...card }));
    return state;
}

/** Public catalogue IDs intentionally differ from several underlying mechanic names. */
export function remainingKind(gameId: string): RemainingKind | undefined {
    switch (gameId) {
        case "share":
            return "cake";
        case "weigh":
            return "seesaw";
        case "snake":
            return "snake";
        case "pay":
            return "shove";
        case "herd":
            return "rafts";
        case "fish":
            return "cast";
        default:
            return undefined;
    }
}
