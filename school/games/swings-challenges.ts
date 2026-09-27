// A layout is only shipped once a crossing of it has been found through the game itself.
//
// A crossing is a list of holds: nothing pressed for so many steps, then held for so many. From a
// stone a hold swings Charlie and lets her go; in the air a hold catches the rope she reaches first
// and then pumps it. `crossing` searches those holds, stepping copies of the game, for each thing the
// level asks for in turn, so what it finds is what a child's hand could do, and the tests play it
// back through a fresh game.
import { configurationKey } from "../../engine/motion/configuration";
import { progress } from "../../engine/motion/goals";
import { emptyPad } from "../../engine/motion/pad";
import {
    SWINGS_LEVELS,
    goalText,
    startSwings,
    stepSwings,
    xOf,
    type RopeAt,
    type SwingsLevel,
    type SwingsState,
    type Want,
} from "./swings";

/** One hold of a crossing: steps with nothing pressed, then steps held. */
export interface Hold {
    idle: number;
    hold: number;
}

/** The holds a search tries on a rope: under a second to five seconds, a twelfth of a second apart. */
const HOLDS: readonly number[] = Array.from({ length: 60 }, (_, i) => 22 + i * 5);
/** Steps a search waits for a flight to come down before giving it up. */
const SETTLE = 360;
/** Copies of the game a search may step before it gives up on a layout. */
const BUDGET = 6_000;

type Seen = { kind: string; value?: number | string };

function run(s: SwingsState, idle: number, hold: number, seen: Seen[]): void {
    const pad = emptyPad();
    for (let i = 0; i < idle + hold; i++) {
        pad.go = i >= idle;
        for (const h of stepSwings(s, pad)) if ("event" in h) seen.push(h.event);
    }
    pad.go = false;
    for (const h of stepSwings(s, pad)) if ("event" in h) seen.push(h.event);
}

/** Steps with nothing pressed until she stands, is home or falls in, and says how many it took. */
function settle(s: SwingsState): number {
    const pad = emptyPad();
    let n = 0;
    while (n < SETTLE && s.mode !== "ready" && s.mode !== "home") {
        stepSwings(s, pad);
        n++;
        if (s.mode === "splash" || s.mode === "back" || s.mode === "wobble") break;
    }
    return n;
}

/** How far along a try is: what the goal has counted, and the places landed on. */
const along = (s: SwingsState): number =>
    progress(s.goal).completed * 100 + (s.L.jumps ? (s.landings[s.landings.length - 1] ?? 0) : 0);

/** The mode a copy is in now, read afresh after it has been stepped. */
const modeOf = (s: SwingsState): string => s.mode;

/**
 * A crossing for a level, or null when none is found. From standing, each hold is tried until one
 * lets her go into a flight that comes down somewhere steady further on, or that catches a rope the
 * level wants; the search goes back a step when a later part cannot be done from where an earlier one
 * left her.
 */
export function crossing(L: SwingsLevel): Hold[] | null {
    const known = configurationKey(L);
    if (!PLANS.has(known)) PLANS.set(known, search(L));
    return PLANS.get(known) ?? null;
}

const PLANS = new Map<string, Hold[] | null>();

function search(L: SwingsLevel): Hold[] | null {
    let spent = 0;
    const standing = (s: SwingsState, depth: number): Hold[] | null => {
        if (s.won) return [];
        if (s.mode !== "ready" || depth > 8) return null;
        for (const hold of HOLDS) {
            if (++spent > BUDGET) return null;
            const next = structuredClone(s);
            run(next, 0, hold, []);
            const rest = flying(next, along(s), depth);
            if (rest) return [{ idle: 0, hold }, ...rest];
        }
        return null;
    };
    // just let go: come down somewhere steady further on, or catch a rope the level wants
    const flying = (s: SwingsState, before: number, depth: number): Hold[] | null => {
        if (s.won) return [];
        if (s.mode !== "fly") return null;
        const down = structuredClone(s),
            n = settle(down);
        if (down.won) return [];
        if (down.mode === "ready" && along(down) > before) {
            const rest = standing(down, depth + 1);
            if (rest) {
                const [first, ...more] = rest;
                return first ? [{ idle: first.idle + n, hold: first.hold }, ...more] : [];
            }
        }
        for (const c of catches(s)) {
            if (++spent > BUDGET) return null;
            const rest = flying(c.state, along(s), depth + 1);
            if (rest) return [c.hold, ...rest];
        }
        return null;
    };
    return standing(startSwings(L), 0);
}

/**
 * From a flight just let go, each way of catching a rope the level wants and pumping it: the press
 * starts as early as it still catches that rope, and each length of pump is let go in turn.
 */
function catches(s: SwingsState): { hold: Hold; state: SwingsState }[] {
    for (let idle = 0; idle < 50; idle += 2) {
        const probe = structuredClone(s),
            seen: Seen[] = [],
            pad = emptyPad();
        for (let i = 0; i < idle; i++) stepSwings(probe, pad);
        if (probe.mode !== "fly") return [];
        pad.go = true;
        let steps = 0;
        while (probe.mode === "fly" && steps < 90) {
            for (const h of stepSwings(probe, pad)) if ("event" in h) seen.push(h.event);
            steps++;
        }
        if (modeOf(probe) !== "swing") continue;
        if (!seen.some((e) => e.kind === "catch")) continue;
        const out: { hold: Hold; state: SwingsState }[] = [];
        for (const more of HOLDS) {
            const after = structuredClone(probe);
            run(after, 0, more, []);
            if (after.mode === "fly" || after.won)
                out.push({ hold: { idle, hold: steps + more }, state: after });
        }
        return out;
    }
    return [];
}

/** Plays holds into a game, as a child's hand would, and lets the last flight come down. */
export function play(s: SwingsState, holds: readonly Hold[]): SwingsState {
    for (const h of holds) run(s, h.idle, h.hold, []);
    settle(s);
    return s;
}

/** The layouts of each level: where its stones, ropes and wants move to, each one crossed before it ships. */
const LAYOUTS: ((L: SwingsLevel) => Partial<SwingsLevel>)[][] = [
    [() => ({}), () => ({ far: 6, per: 1.6 }), () => ({ far: 5, per: 1.8 })],
    [
        () => ({}),
        () => ({
            title: "Land on 5",
            prompt: "Only the stone at 5 is steady. Hold, then let go.",
            stones: [3, 5, 6],
            wants: [{ stone: 5 }],
            ropes: [r(1.5), r(6.4)],
        }),
        () => ({
            title: "Land on 3",
            prompt: "Only the stone at 3 is steady. Hold, then let go.",
            stones: [2, 3, 5],
            wants: [{ stone: 3 }],
            ropes: [r(1.5), r(4.4)],
        }),
    ],
    [() => ({}), () => ({ stones: [2, 4, 5, 6, 8, 9] }), () => ({ stones: [1, 2, 4, 6, 7, 8] })],
    [
        () => ({}),
        () => ({
            far: 14,
            ropes: [r(1.5), r(4), r(6), r(8), r(11)],
            wants: [{ rope: 4 }, { rope: 8 }],
        }),
        () => ({
            ropes: [r(1.5), r(3), r(6), r(9), r(12)],
            wants: [{ rope: 6 }, { rope: 12 }],
        }),
    ],
    [
        () => ({}),
        () => ({ ropes: [r(0.8), r(3), r(4.5), r(5), r(7)], wants: [{ rope: 3 }, { rope: 5 }] }),
        () => ({
            ropes: [r(0.8), r(2.5), r(5), r(6), r(7.5)],
            wants: [{ rope: 5 }, { rope: 7.5 }],
        }),
    ],
    [
        () => ({}),
        () => ({ ropes: [r(1), r(3), r(4), r(6), r(8), r(9)] }),
        () => ({ ropes: [r(1), r(2), r(3), r(6), r(7), r(9)] }),
    ],
    [
        () => ({}),
        (L) => ({ wind: { strength: -7, period: L.wind?.period ?? 5 } }),
        () => ({ stones: [3, 5, 8, 10, 15], wind: { strength: 11, period: 4 } }),
    ],
    [
        () => ({}),
        () => ({
            title: "Three jumps to 10",
            prompt: "Which three jumps add up to 10?",
            far: 10,
            stones: [2, 3, 4, 6, 7, 8],
        }),
        () => ({ stones: [2, 4, 5, 6, 8, 9] }),
    ],
];

const r = (at: number, long = 11): RopeAt => ({ at, long });

export const swingsLayouts = (phase: number): number => LAYOUTS[phase]?.length ?? 0;

/** A level laid out as a layout says, with its goal said again for what it now asks. */
export function swingsLevel(phase: number, variant: number): SwingsLevel {
    const base = SWINGS_LEVELS[phase],
        layout = LAYOUTS[phase]?.[variant];
    if (!base || !layout) throw new Error("Unknown rope swings layout");
    const L: SwingsLevel = { ...base, ...layout(base) };
    return { ...L, goal: goalText(L) };
}

export interface SwingsConfiguration {
    phase: number;
    variant: number;
    level: SwingsLevel;
}

export function swingsChallenge(seed: number, phase: number): SwingsConfiguration {
    const n = swingsLayouts(phase);
    if (!Number.isInteger(phase) || n === 0) throw new Error("Unknown rope swings phase");
    const variant = (seed >>> 0) % n,
        level = swingsLevel(phase, variant);
    if (!crossing(level)) throw new Error("That layout cannot be crossed");
    return { phase, variant, level };
}

export function isSwingsConfiguration(
    value: unknown,
    phase?: number,
): value is SwingsConfiguration {
    if (
        !value ||
        typeof value !== "object" ||
        !("phase" in value) ||
        !("variant" in value) ||
        typeof value.phase !== "number" ||
        typeof value.variant !== "number" ||
        !Number.isInteger(value.phase) ||
        !Number.isInteger(value.variant) ||
        value.variant < 0 ||
        value.variant >= swingsLayouts(value.phase) ||
        (phase !== undefined && value.phase !== phase)
    )
        return false;
    return (
        configurationKey(value) ===
        configurationKey({
            phase: value.phase,
            variant: value.variant,
            level: swingsLevel(value.phase, value.variant),
        })
    );
}

export function openSwingsConfiguration(value: SwingsConfiguration): SwingsState {
    if (!isSwingsConfiguration(value)) throw new Error("Unverified rope swings layout");
    return startSwings(value.level, value.phase);
}

/** Where each want of a level stands along the line, for a test that checks every want is reachable. */
export const wantsAt = (L: SwingsLevel): number[] =>
    L.wants.map((w: Want) => xOf(L, "stone" in w ? w.stone : w.rope));
