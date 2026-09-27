// The lemonade stand's variations are other orders and other handfuls of coins for each level. The
// solver serves a stand the way a child at the keys would: it holds the jug tipped until a pour let go
// now would settle on the order, pushes each cup with the push that stops it at its customer, and
// rolls each coin of the change with the push that lands it in the dish, trying each move on a copy
// first. The keys it pressed replay to the same win, which is the game's replay witness.
import { configurationKey } from "../../engine/motion/configuration";
import { emptyPad, type Pad } from "../../engine/motion/pad";
import {
    HOME,
    STAND_LEVELS,
    STEP,
    WORTH,
    busy,
    changeOf,
    changing,
    dishSum,
    falling,
    lemonadeGame,
    owedTo,
    startStand,
    stepStand,
    toleranceOf,
    vary,
    waiting,
    type StandState,
} from "./lemonade";

/** How many variations each level has, the level as written among them. */
export const VARIATIONS = 6;

export interface StandConfiguration {
    phase: number;
    n: number;
}

export function standChallenge(seed: number, phase: number): StandConfiguration {
    if (!STAND_LEVELS[phase]) throw new Error("Unknown stand level");
    return { phase, n: (seed >>> 0) % VARIATIONS };
}

export function isStandConfiguration(value: unknown, phase: number): value is StandConfiguration {
    if (typeof value !== "object" || value === null) return false;
    return Array.from({ length: VARIATIONS }, (_, n) => ({ phase, n })).some(
        (c) => STAND_LEVELS[phase] !== undefined && configurationKey(c) === configurationKey(value),
    );
}

export function openStandConfiguration(c: StandConfiguration): StandState {
    const L = STAND_LEVELS[c.phase];
    if (!L) throw new Error("Unknown stand level");
    return startStand(c.phase, vary(L, c.n));
}

/** A move the solver made: a step of the pad, or a command between steps. */
export type Move = { pad: Pad } | { command: string };

const idle = (): Pad => emptyPad();
const holdDown = (first: boolean): Pad => ({
    ...emptyPad(),
    held: "down",
    holding: ["down"],
    pressed: first ? ["down"] : [],
});
const press = (d: "left" | "right"): Pad => ({ ...emptyPad(), pressed: [d] });
const tap = (): Pad => ({ ...emptyPad(), tapped: true, go: true });
const brake = (): Pad => ({ ...emptyPad(), brake: true });

/** Runs a copy of `s` with nothing held until everything has settled, for a look ahead. */
function settled(s: StandState, most = 600): StandState {
    const c = structuredClone(s);
    for (let i = 0; i < most && (busy(c) || c.tilt > 0); i++) stepStand(c, idle());
    return c;
}

/** The pushes to try for a target this far away, nearest first. */
function pushesFor(distance: number, most: number): number[] {
    const out: number[] = [];
    const base = Math.round(distance / STEP) * STEP;
    for (let k = 0; k <= 30; k++)
        for (const p of k === 0 ? [base] : [base + k * STEP, base - k * STEP])
            if (p >= 1 && p <= most) out.push(p);
    return out;
}

/**
 * The keys that serve every customer of the stand `s` starts as, or null when the solver cannot
 * find a way within `most` steps.
 */
export function standWay(start: StandState, most = 60 * 240): Move[] | null {
    const s = structuredClone(start);
    const moves: Move[] = [];
    const run = (pad: Pad) => {
        moves.push({ pad });
        stepStand(s, pad);
    };
    const command = (id: string) => {
        moves.push({ command: id });
        lemonadeGame.command?.(s, id);
    };
    /** Presses left or right until the push is `power`. */
    const setPower = (power: number) => {
        for (let i = 0; i < 200 && Math.abs(s.power - power) > 1e-9; i++)
            run(press(power > s.power ? "right" : "left"));
    };
    /** Tries a push on a copy and says whether what it pushed ended up where `good` says. */
    const tryPush = (power: number, good: (c: StandState) => boolean): boolean => {
        const c = structuredClone(s);
        for (let i = 0; i < 400 && Math.abs(c.power - power) > 1e-9; i++)
            stepStand(c, press(power > c.power ? "right" : "left"));
        stepStand(c, tap());
        // only until what was pushed stops: a customer who is then served takes their coins away
        for (let i = 0; i < 600; i++) {
            const moving =
                c.cup.mode === "sliding" ||
                c.cup.mode === "falling" ||
                c.coins.some((o) => o.mode === "rolling" || o.mode === "falling");
            if (!moving) break;
            stepStand(c, idle());
        }
        return good(c);
    };
    let tries = 0;
    while (!s.won && moves.length < most) {
        if (busy(s) && !changing(s) && waiting(s).length === 0) {
            run(idle());
            continue;
        }
        if (
            s.coins.some((c) => c.mode !== "dish") ||
            ["sliding", "falling", "back"].includes(s.cup.mode)
        ) {
            run(idle());
            continue;
        }
        const g = changing(s);
        if (g) {
            const customer = s.L.customers[g.i];
            if (!customer) return null;
            const left = owedTo(s.L, customer) - dishSum(s, g.i);
            if (left < 0) {
                run(brake());
                run(idle());
                continue;
            }
            if (left === 0) {
                run(idle());
                continue;
            }
            const plan = changeOf(s.L.tray, left);
            const kind = plan?.[0];
            if (!kind) return null;
            for (let i = 0; i < 6 && s.hand !== kind; i++) command("coin");
            const at = s.L.slots[g.slot] ?? 0;
            const before = dishSum(s, g.i);
            const good = (c: StandState) => dishSum(c, g.i) === before + WORTH[kind];
            const power = pushesFor(at - 15.8, s.L.counter + 8).find((p) => tryPush(p, good));
            if (power === undefined || ++tries > 60) return null;
            setPower(power);
            run(tap());
            continue;
        }
        const w = waiting(s)[0];
        if (!w) {
            run(idle());
            continue;
        }
        const want = s.L.customers[w.i]?.want ?? 0,
            tol = toleranceOf(s.L);
        if (s.cup.mode === "resting") {
            run(brake());
            run(idle());
            continue;
        }
        if (s.cup.mode !== "home") {
            run(idle());
            continue;
        }
        if (s.cup.level > want + tol * 0.9) {
            run(brake());
            run(idle());
            continue;
        }
        if (Math.abs(s.cup.level - want) <= tol * 0.6 && falling(s) === 0 && s.tilt === 0) {
            const at = s.L.slots[w.slot] ?? 0;
            const served = (c: StandState) => {
                const now = c.guests.find((o) => o.i === w.i);
                return !now || now.phase !== "waiting" || now.got > w.got;
            };
            const power = pushesFor(at - HOME, s.L.counter + 8).find((p) => tryPush(p, served));
            if (power === undefined || ++tries > 60) return null;
            setPower(power);
            run(tap());
            continue;
        }
        // pour: hold the jug tipped until letting go now would settle on the order
        let first = true;
        for (let i = 0; i < 600; i++) {
            if (s.cup.level + falling(s) >= want - 0.3) {
                const ahead = settled(s);
                if (ahead.cup.level >= want - tol * 0.4) break;
            }
            run(holdDown(first));
            first = false;
        }
        for (let i = 0; i < 600 && (s.tilt > 0 || falling(s) > 0); i++) run(idle());
        if (++tries > 80) return null;
    }
    return s.won ? moves : null;
}

/** Plays `moves` into `s`, as a replay does. */
export function replay(s: StandState, moves: readonly Move[]): StandState {
    for (const m of moves)
        if ("pad" in m) stepStand(s, m.pad);
        else lemonadeGame.command?.(s, m.command);
    return s;
}

const ways = new Map<string, Move[] | null>();

/** A way through a variation, found once and kept, since the corpus asks for the same few again and again. */
export function standCertified(c: StandConfiguration): Move[] | null {
    const key = configurationKey(c);
    if (!ways.has(key)) ways.set(key, standWay(openStandConfiguration(c)));
    return ways.get(key) ?? null;
}
