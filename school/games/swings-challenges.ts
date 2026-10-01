// A layout is only shipped once a crossing of it has been found through the game itself.
//
// A crossing is a list of moves, each some steps with nothing pressed and then one key: the left arrow
// pulls Charlie back a step, and Go starts the swing, lets her go, or reaches for a rope in the air.
// `crossing` searches those moves, stepping copies of the game, for each thing the level asks for in
// turn, so what it finds is what a child's hand could do, and the tests play it back through a fresh
// game.
import { configurationKey } from "../../engine/motion/configuration";
import { progress } from "../../engine/motion/goals";
import { emptyPad, type Pad } from "../../engine/motion/pad";
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

/** One move of a crossing: steps with nothing pressed, then the left arrow or Go, pressed and let up. */
export interface Move {
    idle: number;
    key: "left" | "go";
}

/** The most pulls a search tries from standing: each is a tenth of a radian further back. */
const PULLS = 10;
/** Steps a search waits for a flight to come down before giving it up. */
const SETTLE = 360;
/** Steps of a swing a search watches for a moment to let go: a full swing and a little more. */
const WATCH = 200;
/** Copies of the game a search may step before it gives up on a layout. */
const BUDGET = 40_000;

type Seen = { kind: string; value?: number | string };

const keyPad = (key: Move["key"]): Pad => {
    const pad = emptyPad();
    if (key === "left") pad.pressed = ["left"];
    else {
        pad.go = true;
        pad.tapped = true;
    }
    return pad;
};

function step(s: SwingsState, pad: Pad, seen: Seen[]): void {
    for (const h of stepSwings(s, pad)) if ("event" in h) seen.push(h.event);
}

/** A move played into a game: its idle steps, the key pressed for a step, and let up for one. */
function apply(s: SwingsState, m: Move, seen: Seen[] = []): void {
    for (let i = 0; i < m.idle; i++) step(s, emptyPad(), seen);
    step(s, keyPad(m.key), seen);
    step(s, emptyPad(), seen);
}

/** The pads a crossing's moves are, one a step, as a hand gives them. */
export function* padsOf(moves: readonly Move[]): Generator<Pad> {
    for (const m of moves) {
        for (let i = 0; i < m.idle; i++) yield emptyPad();
        yield keyPad(m.key);
        yield emptyPad();
    }
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

const forward = (s: SwingsState): boolean => (s.ropes[s.held]?.omega ?? 0) > 0;

/**
 * A crossing for a level, or null when none is found. From standing, each pull is tried and the swing
 * watched for a moment to let go that brings her down somewhere steady further on, or into a rope the
 * level wants; the search goes back a step when a later part cannot be done from where an earlier one
 * left her.
 */
export function crossing(L: SwingsLevel): Move[] | null {
    const known = configurationKey(L);
    if (!PLANS.has(known)) PLANS.set(known, search(L));
    return PLANS.get(known) ?? null;
}

const PLANS = new Map<string, Move[] | null>();

function search(L: SwingsLevel): Move[] | null {
    let spent = 0;
    const ropeWants = L.wants.some((w) => "rope" in w);
    const standing = (s: SwingsState, depth: number): Move[] | null => {
        if (s.won) return [];
        const r = s.ropes[s.held];
        if (s.mode !== "ready" || depth > 8 || !r) return null;
        // on a level of so many jumps, a try that has used them all up on stones can no longer win
        if (L.jumps && s.landings.length - 1 >= L.jumps) return null;
        const before = along(s);
        if (r.sway) {
            // reach for the swaying rope at each moment in turn, and swing on from where it is taken
            const probe = structuredClone(s);
            for (let c = 0; c < 240; c++) {
                if (c % 8 === 0) {
                    if (++spent > BUDGET) return null;
                    const next = structuredClone(probe);
                    apply(next, { idle: 0, key: "go" });
                    let n = 0;
                    while (next.mode === "ready" && next.reachFor > 0 && n < 40) {
                        stepSwings(next, emptyPad());
                        n++;
                    }
                    if (next.mode === "swing") {
                        const rest = letGos(next, before, depth, n);
                        if (rest) return [{ idle: c, key: "go" }, ...rest];
                    }
                }
                stepSwings(probe, emptyPad());
            }
            return null;
        }
        for (let k = 0; k <= PULLS; k++) {
            if (++spent > BUDGET) return null;
            const next = structuredClone(s),
                moves: Move[] = [];
            for (let i = 0; i < k; i++) moves.push({ idle: 0, key: "left" });
            moves.push({ idle: 0, key: "go" });
            for (const m of moves) apply(next, m);
            if (next.mode !== "swing") continue;
            const rest = letGos(next, before, depth, 0);
            if (rest) return [...moves, ...rest];
        }
        return null;
    };
    // watch the swing, and at each moment she goes forward try letting her go
    const letGos = (
        s: SwingsState,
        before: number,
        depth: number,
        offset: number,
    ): Move[] | null => {
        const probe = structuredClone(s);
        for (let w = 0; w < WATCH; w++) {
            if (w % 3 === 0 && forward(probe)) {
                if (++spent > BUDGET) return null;
                const next = structuredClone(probe);
                apply(next, { idle: 0, key: "go" });
                if (next.mode === "fly" || next.won) {
                    const rest = flying(next, before, depth);
                    if (rest) return [{ idle: offset + w, key: "go" }, ...rest];
                }
            }
            stepSwings(probe, emptyPad());
            if (probe.mode !== "swing") return null;
        }
        return null;
    };
    // just let go: come down somewhere steady further on, or reach for a rope the level wants
    const flying = (s: SwingsState, before: number, depth: number): Move[] | null => {
        if (s.won) return [];
        if (s.mode !== "fly") return null;
        const down = structuredClone(s),
            n = settle(down);
        if (down.won) return [];
        if (down.mode === "ready" && along(down) > before) {
            const rest = standing(down, depth + 1);
            if (rest) {
                const [first, ...more] = rest;
                return first ? [{ idle: first.idle + n, key: first.key }, ...more] : [];
            }
        }
        if (!ropeWants) return null;
        const probe = structuredClone(s);
        for (let c = 0; c < 60; c++) {
            if (c % 2 === 0) {
                if (++spent > BUDGET) return null;
                const next = structuredClone(probe),
                    seen: Seen[] = [];
                apply(next, { idle: 0, key: "go" }, seen);
                let n = 0;
                while (next.mode === "fly" && n < 40) {
                    step(next, emptyPad(), seen);
                    n++;
                }
                if (next.mode === "swing" && seen.some((e) => e.kind === "catch")) {
                    const rest = letGos(next, along(s), depth + 1, n);
                    if (rest) return [{ idle: c, key: "go" }, ...rest];
                }
            }
            stepSwings(probe, emptyPad());
            if (probe.mode !== "fly") break;
        }
        return null;
    };
    return standing(startSwings(L), 0);
}

/** Plays moves into a game, as a child's hand would, and lets the last flight come down. */
export function play(s: SwingsState, moves: readonly Move[]): SwingsState {
    for (const m of moves) apply(s, m);
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
            prompt: "Only the stone at 5 is steady. Watch the dots, then tap.",
            stones: [3, 5, 6],
            wants: [{ stone: 5 }],
            ropes: [r(1.5), r(6.4)],
        }),
        () => ({
            title: "Land on 3",
            prompt: "Only the stone at 3 is steady. Watch the dots, then tap.",
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
