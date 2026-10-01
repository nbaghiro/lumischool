import { goalWords, ROAD_LEVELS, startRoadLevel, type RoadLevel } from "./road";
import { RIVER_LEVELS, startRiver, type RiverLevel } from "./row";
import { PLANE_LEVELS, startPlaneLevel, type PlaneLevel } from "./plane";

export type ActionKind = "road" | "row" | "plane";
export type ActionConfiguration =
    | { kind: "road"; phase: number; level: RoadLevel }
    | { kind: "row"; phase: number; level: RiverLevel }
    | { kind: "plane"; phase: number; level: Omit<PlaneLevel, "words"> };
export const ACTION_CHALLENGE_COUNT = 3;
const PHASES = { road: ROAD_LEVELS.length, row: RIVER_LEVELS.length, plane: 4 };

/** A finite, replay-tested catalogue; selection never runs a physics search in the app. */
export function actionChallenge(
    seed: number,
    kind: ActionKind,
    phase: number,
): ActionConfiguration {
    const index = (seed >>> 0) % ACTION_CHALLENGE_COUNT;
    const safePhase = Number.isInteger(phase) && phase >= 0 && phase < PHASES[kind] ? phase : 0;
    if (kind === "road") {
        // another round of the same level: stops written in words keep their words and come in
        // another order, and plain numbers move along the line by a tick
        const base = ROAD_LEVELS[safePhase] ?? ROAD_LEVELS[0];
        const worded = base.stops.some((st) => st.words !== undefined);
        const stops = worded
            ? [...base.stops.slice(index), ...base.stops.slice(0, index)].map((st) => ({ ...st }))
            : base.stops.map((st) => ({ ...st, at: st.at + (index - 1) * base.tick }));
        const level: RoadLevel = {
            ...base,
            grades: [...base.grades],
            boxes: base.boxes.map((b) => ({ ...b })),
            stops,
        };
        return { kind, phase: safePhase, level: { ...level, goal: goalWords(level) } };
    }
    if (kind === "row") {
        // another stretch of the same river: the gates' sides mirrored or turned about, the bends shifted, the rocks moved across
        const base = RIVER_LEVELS[safePhase] ?? RIVER_LEVELS[0];
        const flip = index === 1 ? -1 : 1;
        return {
            kind,
            phase: safePhase,
            level: {
                ...base,
                grades: [...base.grades],
                bends: base.bends.map(([amp, wave, phase]) => [amp, wave, phase + index * 1.3]),
                narrows: base.narrows.map((n) => ({ ...n })),
                rocks: base.rocks.map((r) => ({ ...r, off: r.off * flip })),
                logs: base.logs.map((g) => ({ ...g, phase: g.phase + index * 0.7 })),
                count: [...base.count],
                decoys: [...base.decoys],
                sides: base.sides.map((side, i) =>
                    index === 2
                        ? (base.sides[base.sides.length - 1 - i] ?? side)
                        : flip === 1
                          ? side
                          : side === 1
                            ? -1
                            : 1,
                ),
                line: { ...base.line },
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
    if (configuration.kind === "row") return startRiver(configuration.level, configuration.phase);
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
