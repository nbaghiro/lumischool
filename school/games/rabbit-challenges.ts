import { configurationKey } from "../../engine/motion/configuration";
import { HOP_LEVELS, hopsTo, start, type HopLevel, type HopState } from "./rabbit";

export function rabbitConfigurations(phase: number): HopLevel[] {
    const base = HOP_LEVELS[phase];
    if (!base) return [];
    return base.stones
        .filter((target) => !base.sinking.includes(target) && (phase !== 1 || target < 0))
        .map((target) => ({
            ...base,
            target,
            goal: `Hop the rabbit from stone to stone to the carrot on ${target}.`,
            prompt: base.sinking.length
                ? "Dark stones sink as the rabbit hops off them."
                : `Hop to the carrot on ${target}.`,
        }))
        .filter((level) => {
            const distances = hopsTo(level, (i) => !level.sinking.includes(level.stones[i] ?? NaN));
            const distance = distances[level.stones.indexOf(level.start)] ?? Infinity;
            return (
                distance >= 3 &&
                distance <= 12 &&
                distances.every(
                    (d, i) => level.sinking.includes(level.stones[i] ?? NaN) || Number.isFinite(d),
                )
            );
        });
}

export function rabbitChallenge(seed: number, phase: number): HopLevel {
    const pool = rabbitConfigurations(phase);
    const configuration = pool[(seed >>> 0) % pool.length];
    if (!configuration) throw new Error("Unknown rabbit phase");
    return configuration;
}

export function isRabbitConfiguration(value: unknown, phase: number): value is HopLevel {
    return rabbitConfigurations(phase).some((v) => configurationKey(value) === configurationKey(v));
}

export function openRabbitConfiguration(configuration: HopLevel, phase: number): HopState {
    if (!isRabbitConfiguration(configuration, phase)) throw new Error("Unverified rabbit route");
    const s = start(phase);
    s.L = configuration;
    s.facing = configuration.target >= configuration.start ? 1 : -1;
    return s;
}
