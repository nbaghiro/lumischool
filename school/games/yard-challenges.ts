import { configurationKey } from "../../engine/motion/configuration";
import { bind, type Round } from "./games";
import { shunt, type ShuntVersion } from "./shunt";
import { YARD_LEVELS, startYardLevel, type YardState } from "./yard";

export function yardConfigurations(phase: number): ShuntVersion[] {
    const v = YARD_LEVELS[phase]?.v;
    if (!v) return [];
    const orders = [
        v.train,
        [...v.train].reverse(),
        [...v.train.slice(1), ...v.train.slice(0, 1)],
        [...v.train.slice(2), ...v.train.slice(0, 2)],
    ];
    return orders
        .filter(
            (train, i) =>
                (phase < 4 || i !== 1) &&
                (phase !== 5 || i !== 2) &&
                train.join() !== v.order.join() &&
                orders.findIndex((t) => t.join() === train.join()) === i,
        )
        .map((train) => ({ ...v, train }));
}
export function yardRound(v: ShuntVersion): Round {
    return bind(
        shunt,
        {
            id: "shunt.generated",
            title: "Shunting yard",
            kind: "shunt",
            skills: [],
            grades: [1, 4],
            paper: "sequence.put-in-order",
            versions: [{ v, values: configurationKey(v) }],
        },
        0,
    );
}
export function yardChallenge(seed: number, phase: number): ShuntVersion {
    const pool = yardConfigurations(phase),
        v = pool[(seed >>> 0) % pool.length];
    if (!v) throw new Error("Unknown yard phase");
    return v;
}
export function isYardConfiguration(value: unknown, phase: number): value is ShuntVersion {
    return yardConfigurations(phase).some((v) => configurationKey(v) === configurationKey(value));
}
export function openYardConfiguration(v: ShuntVersion, phase: number): YardState {
    if (!isYardConfiguration(v, phase)) throw new Error("Unverified yard configuration");
    const base = YARD_LEVELS[phase];
    if (!base) throw new Error("Unknown yard phase");
    return startYardLevel({ ...base, v, round: () => yardRound(v), goal: shunt.goal(v) }, phase);
}
