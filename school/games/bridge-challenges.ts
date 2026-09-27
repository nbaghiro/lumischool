// Other crossings for each level of Charlie's bridge: the stones stand elsewhere and the planks on
// the grass are the level's own, and where there is a rope its posts stand on the stones. Each layout
// is chosen so that one set of the planks measures every gap exactly, the rope's by two planks or more, and the tests lay that set by hand and walk it for every layout, and check that random
// planks still make a bridge at most one time in five.
import { configurationKey } from "../../engine/motion/configuration";
import { BRIDGE_LEVELS, startBridge, type BridgeLevel, type BridgeState } from "./bridge";

/**
 * Where the stones stand, per level, for each layout; the first is the authored one. Each gap is the
 * length of one of the level's own planks, so the level's pile always makes the bridge.
 */
const STONES: readonly (readonly number[])[][] = [
    [[4], [6]],
    [
        [3, 7],
        [4, 9],
        [5, 8],
    ],
    [
        [6, 13],
        [7, 14],
        [7, 13],
    ],
    [
        [5, 12],
        [8, 15],
        [5, 13],
        [7, 12],
    ],
    [
        [150, 350],
        [200, 350],
        [150, 300],
    ],
    [
        [1.5, 3.2],
        [1.8, 3.5],
        [1.7, 3.5],
        [1.5, 3.3],
    ],
    [
        [4, 12],
        [3, 11],
        [5, 12],
    ],
    [[], [], []],
];

/** The sacks on the grass for each layout of a level with a lift, by kilograms; the first is the authored pile. */
const PILES: Partial<Record<number, number[][]>> = {
    7: [
        [5, 8, 6, 3, 9, 4, 7],
        [6, 4, 9, 2, 7, 5, 8],
        [3, 7, 8, 6, 5, 9, 2],
    ],
};

const written = (L: BridgeLevel, n: number) => (L.unit ? `${n} ${L.unit}` : String(n));

const PROMPTS: ((L: BridgeLevel) => string)[] = [
    () => "Drag a plank over the water and let go. Then press Go.",
    () => "A plank has to reach from one stone to the next.",
    (L) => `How far is it from ${L.stones[0] ?? 0} to ${L.stones[1] ?? 0}?`,
    () => "Count the marks along the water to find each stone.",
    (L) => `The stones stand at ${L.stones.map((n) => written(L, n)).join(" and ")}.`,
    (L) => `The stones stand at ${L.stones.map((n) => written(L, n)).join(" and ")}.`,
    (L) =>
        `The posts stand at ${L.stones.join(" and ")}. Hang planks that add up to the gap between them.`,
    () => "Charlie weighs 20 kg. Put more than 20 kg in the basket, but no more than 24 kg.",
];

export const bridgeLayouts = (phase: number): number => STONES[phase]?.length ?? 0;

export interface BridgeConfiguration {
    phase: number;
    variant: number;
    level: BridgeLevel;
}

export function bridgeChallenge(seed: number, phase: number): BridgeConfiguration {
    const base = BRIDGE_LEVELS[phase],
        n = bridgeLayouts(phase);
    if (!base || !Number.isInteger(phase) || n === 0) throw new Error("Unknown bridge phase");
    const variant = (seed >>> 0) % n,
        stones = STONES[phase]?.[variant] ?? base.stones;
    const level: BridgeLevel = {
        ...base,
        stones: [...stones],
        ...(base.rope ? { rope: { from: stones[0] ?? 0, to: stones[1] ?? 0 } } : {}),
        planks: [...(PILES[phase]?.[variant] ?? base.planks)],
        outfit: { ...base.outfit },
    };
    return { phase, variant, level: { ...level, prompt: PROMPTS[phase]?.(level) ?? base.prompt } };
}

export function isBridgeConfiguration(value: unknown): value is BridgeConfiguration {
    if (
        !value ||
        typeof value !== "object" ||
        !("phase" in value) ||
        typeof value.phase !== "number" ||
        !Number.isInteger(value.phase) ||
        value.phase < 0 ||
        value.phase >= BRIDGE_LEVELS.length
    )
        return false;
    for (let i = 0; i < bridgeLayouts(value.phase); i++)
        if (configurationKey(value) === configurationKey(bridgeChallenge(i, value.phase)))
            return true;
    return false;
}

export function openBridgeConfiguration(value: BridgeConfiguration): BridgeState {
    if (!isBridgeConfiguration(value)) throw new Error("Unverified bridge layout");
    return startBridge(value.level, value.phase);
}
