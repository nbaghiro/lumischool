import { ROAD_LEVELS, startRoadLevel, type RoadLevel } from "./road";
import { ROW_LEVELS, startRowLevel, type RowLevel } from "./row";
import { PLANE_LEVELS, startPlaneLevel, type PlaneLevel } from "./plane";

export type ActionKind = "road" | "row" | "plane";
export type ActionConfiguration =
    | { kind: "road"; phase: number; level: RoadLevel }
    | { kind: "row"; phase: number; level: RowLevel }
    | { kind: "plane"; phase: number; level: Omit<PlaneLevel, "words"> };
export const ACTION_CHALLENGE_COUNT = 3;
const PHASES = { road: 2, row: 6, plane: 4 };

/** A finite, replay-tested catalogue; selection never runs a physics search in the app. */
export function actionChallenge(
    seed: number,
    kind: ActionKind,
    phase: number,
): ActionConfiguration {
    const index = (seed >>> 0) % ACTION_CHALLENGE_COUNT;
    const safePhase = Number.isInteger(phase) && phase >= 0 && phase < PHASES[kind] ? phase : 0;
    if (kind === "road") {
        const base = ROAD_LEVELS[safePhase] ?? ROAD_LEVELS[0];
        const target = base.target + (index - 1) * (safePhase === 0 ? 4 : 10);
        return {
            kind,
            phase: safePhase,
            level: {
                ...base,
                grades: [...base.grades],
                boxes: base.boxes.map((b) => ({ ...b })),
                target,
                title: `Stop on ${target}`,
                goal: `Brake so the front of the car stops on ${target}.`,
            },
        };
    }
    if (kind === "row") {
        const base = ROW_LEVELS[safePhase] ?? ROW_LEVELS[0];
        const target = base.target + (index - 1) * (base.end === "jetty" ? base.every * 2 : 2);
        const title = `The ${base.end} at ${target} metres`;
        return {
            kind,
            phase: safePhase,
            level: {
                ...base,
                grades: [...base.grades],
                target,
                metres: base.end === "jetty" ? target : base.metres,
                title,
                goal: `Row to the ${base.end} at ${target} metres${base.current ? " against the current" : ""}.`,
                prompt: `Stop gently at the ${base.end} on ${target}.`,
                done: `Tied up at the ${base.end} on ${target} metres.`,
            },
        };
    }
    const { words: _words, ...base } = PLANE_LEVELS[safePhase] ?? PLANE_LEVELS[0];
    return {
        kind,
        phase: safePhase,
        level: {
            ...base,
            grades: [...base.grades],
            labels: [...base.labels],
            gates: base.gates.map((_, i) => {
                const gate = base.gates[(i + index * 2) % base.gates.length] ?? base.gates[0];
                if (!gate) throw new Error("Missing plane gate");
                return { ...gate, hoops: [...gate.hoops] };
            }),
        },
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

export function isActionConfiguration(value: unknown): value is ActionConfiguration {
    if (!value || typeof value !== "object" || !("kind" in value) || !("phase" in value))
        return false;
    const { kind, phase } = value;
    if (
        (kind !== "road" && kind !== "row" && kind !== "plane") ||
        typeof phase !== "number" ||
        !Number.isInteger(phase) ||
        phase < 0 ||
        phase >= PHASES[kind]
    )
        return false;
    return Array.from({ length: ACTION_CHALLENGE_COUNT }, (_, seed) => seed).some((seed) =>
        sameShape(value, actionChallenge(seed, kind, phase)),
    );
}

export function openActionConfiguration(configuration: ActionConfiguration) {
    if (!isActionConfiguration(configuration)) throw new Error("Unverified game arrangement");
    if (configuration.kind === "road")
        return startRoadLevel(configuration.level, configuration.phase);
    if (configuration.kind === "row")
        return startRowLevel(configuration.level, configuration.phase);
    return startPlaneLevel(
        {
            ...configuration.level,
            words: (PLANE_LEVELS[configuration.phase] ?? PLANE_LEVELS[0]).words,
        },
        configuration.phase,
    );
}

export function actionKind(gameId: string): ActionKind | undefined {
    return gameId === "straight"
        ? "row"
        : gameId === "road" || gameId === "plane"
          ? gameId
          : undefined;
}
