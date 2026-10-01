// Other machines for each level of the number machine: the same tray and the same numbers to drop,
// with a different rule of the same kind, so the orders change and have to be worked out again.
import { configurationKey } from "../../engine/motion/configuration";
import { MACHINE_LEVELS, inTray, through, type MachineLevel, type Rule } from "./rule";

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
        ...(base.missing ? { missing: [...base.missing] } : {}),
    };
    level.orders = (INPUTS[phase] ?? []).map((x) => through(level, x));
    return { phase, variant, level };
}

/**
 * The tray place to drop for each order, or null when an order cannot be made: every order has
 * exactly one ball in the tray that makes it, so the answer is a number to find, not a guess.
 */
export function machineSolve(level: MachineLevel): number[] | null {
    const places: number[] = [];
    for (const want of level.orders) {
        const makes = level.numbers.flatMap((n, j) => (through(level, n) === want ? [j] : []));
        const j = makes[0];
        if (makes.length !== 1 || j === undefined || !inTray(level, j)) return null;
        places.push(j);
    }
    return places;
}

export function isMachineConfiguration(
    value: unknown,
    phase: number,
): value is MachineConfiguration {
    for (let i = 0; i < machineLayouts(phase); i++)
        if (configurationKey(value) === configurationKey(machineChallenge(i, phase))) return true;
    return false;
}
