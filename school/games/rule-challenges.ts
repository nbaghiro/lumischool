// Other machines for each level of the number machine: the same track and the same numbers to feed,
// with a different rule of the same kind, so the orders change and have to be worked out again.
import { configurationKey } from "../../engine/motion/configuration";
import { FEED, MACHINE_LEVELS, predict, through, type MachineLevel, type Rule } from "./rule";

/** The first machine's rule for each layout, per level; the first is the authored one. */
const RULES: readonly Rule[][] = [
    [
        { op: "add", a: 3 },
        { op: "add", a: 2 },
        { op: "add", a: 4 },
        { op: "add", a: 5 },
    ],
    [
        { op: "mul", a: 2 },
        { op: "mul", a: 3 },
        { op: "mul", a: 4 },
    ],
    [
        { op: "add", a: 6 },
        { op: "add", a: 5 },
        { op: "add", a: 7 },
    ],
    [
        { op: "muladd", a: 2, b: 1 },
        { op: "muladd", a: 2, b: 3 },
        { op: "muladd", a: 3, b: 1 },
    ],
    [
        { op: "mul", a: 3 },
        { op: "mul", a: 4 },
        { op: "mul", a: 2 },
    ],
    [
        { op: "muladd", a: 3, b: -1 },
        { op: "muladd", a: 3, b: 1 },
        { op: "muladd", a: 2, b: 3 },
    ],
];

/** The numbers each level's orders are made from, in order: the authored orders are these through its rule. */
const INPUTS: readonly number[][] = [
    [4, 2, 7],
    [4, 7, 3],
    [5, 2, 9],
    [3, 7, 5],
    [4, 7, 2],
    [5, 9, 7],
];

export const machineLayouts = (phase: number): number => RULES[phase]?.length ?? 0;

export interface MachineConfiguration {
    phase: number;
    variant: number;
    level: MachineLevel;
}

export function machineChallenge(seed: number, phase: number): MachineConfiguration {
    const base = MACHINE_LEVELS[phase],
        n = machineLayouts(phase);
    if (!base || n === 0) throw new Error("Unknown machine phase");
    const variant = (seed >>> 0) % n,
        rule = RULES[phase]?.[variant] ?? base.machines[0]?.rule;
    if (!rule) throw new Error("Unknown machine phase");
    const machines = base.machines.map((m, i) =>
        i === 0 ? { ...m, rule: { ...rule } } : { ...m, rule: { ...m.rule } },
    );
    const level: MachineLevel = {
        ...base,
        machines,
        numbers: [...base.numbers],
        orders: [],
        ...(base.stones ? { stones: [...base.stones] } : {}),
        ...(base.humps ? { humps: [...base.humps] } : {}),
    };
    level.orders = (INPUTS[phase] ?? []).map((x) => through(level, x));
    return { phase, variant, level };
}

/**
 * The strength to roll at for each order, or null when an order cannot be made: every order has
 * exactly one number on an open pocket that makes it, and some pull drops a ball into that pocket.
 */
export function machineSolve(level: MachineLevel): number[] | null {
    const powers: number[] = [];
    for (const want of level.orders) {
        const makes = level.numbers.filter((n) => through(level, n) === want);
        const n = makes[0];
        if (makes.length !== 1 || n === undefined || level.stones?.includes(n)) return null;
        const power = powerFor(level, n);
        if (power === null) return null;
        powers.push(power);
    }
    return powers;
}

/** The middle of the band of pulls that drop a ball into pocket `n`, to a hundredth. */
export function powerFor(level: MachineLevel, n: number): number | null {
    const hits: number[] = [];
    for (let p = FEED.min; p <= FEED.max + 1e-9; p += 0.01)
        if (predict(level, p).pocket === n) hits.push(p);
    if (!hits.length) return null;
    return Math.round(((hits[0] ?? 0) + (hits[hits.length - 1] ?? 0)) * 50) / 100;
}

export function isMachineConfiguration(
    value: unknown,
    phase: number,
): value is MachineConfiguration {
    for (let i = 0; i < machineLayouts(phase); i++)
        if (configurationKey(value) === configurationKey(machineChallenge(i, phase))) return true;
    return false;
}
