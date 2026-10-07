// The variations of Marble pegs, and a solver that wins each one through the real game. A shot is an
// aim and nothing else, so the solver tries the launcher at every other notch, plays each shot out on
// a copy of the board until the lit pegs have popped, and keeps the few boards nearest the target for
// the next marble. The aims it finds are played by the keys, a press a notch and space to fire, and by
// a finger held towards the aim and let go on the same step, and both replay to the same board.
import {
    FIELD_AT,
    LAUNCHER,
    NOTCH,
    PEG_LEVELS,
    REACH,
    canMake,
    pegsGame,
    progressOf,
    startPegs,
    type PegLevel,
    type PegState,
} from "./pegs";
import { emptyPad, type Pad } from "../../engine/motion/pad";
import { MARBLEBOARD } from "../../engine/parts/sport/marbleboard";

const F_W = MARBLEBOARD.field.w;

export interface PegConfiguration {
    phase: number;
    variant: number;
}

/** The level as authored, mirrored, with its numbers turned round the pegs, and those mirrored. */
export const PEG_VARIANTS = 4;

/** The other way round, and never nought below zero, which a trip through JSON would not keep. */
const flip = (v: number) => 0 - v;

function mirror(L: PegLevel): PegLevel {
    return {
        ...L,
        pegs: L.pegs.map((p) => ({
            ...p,
            x: F_W - p.x,
            ...(p.long ? { long: { len: p.long.len, angle: flip(p.long.angle) } } : {}),
            ...(p.move ? { move: { ...p.move, dx: flip(p.move.dx) } } : {}),
            ...(p.spin !== undefined ? { spin: flip(p.spin) } : {}),
        })),
    };
}

/** The numbers read from the last numbered peg to the first, so every number stays on the board and moves. */
function turned(L: PegLevel): PegLevel {
    const numbers = L.pegs
        .filter((p) => p.n > 0)
        .map((p) => p.n)
        .reverse();
    let k = 0;
    return { ...L, pegs: L.pegs.map((p) => (p.n > 0 ? { ...p, n: numbers[k++] ?? p.n } : p)) };
}

/** A level as one of its variations lays it out. */
export function varyPegs(L: PegLevel, variant: number): PegLevel {
    const numbers = variant >= 2 ? turned(L) : L;
    return variant % 2 === 1 ? mirror(numbers) : numbers;
}

export function pegChallenge(seed: number, phase: number): PegConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < PEG_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % PEG_VARIANTS };
}

export function isPegConfiguration(v: unknown, phase: number): v is PegConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < PEG_VARIANTS &&
        PEG_LEVELS[phase] !== undefined
    );
}

export function openPegConfiguration(c: PegConfiguration): PegState {
    const L = PEG_LEVELS[c.phase];
    if (!L) throw new Error("No such Marble pegs level");
    return startPegs(varyPegs(L, c.variant), c.phase);
}

const copyPad = (p: Pad): Pad => ({ ...p, holding: [...p.holding], pressed: [...p.pressed] });

/** The pads that turn the launcher from where it points to `aim` and fire: a press a notch with the keys, or a finger held towards it and let go. */
export function shotPads(from: number, aim: number, by: "keys" | "touch"): Pad[] {
    const d = aim - from,
        steps = Math.max(1, Math.abs(d)),
        a = Math.PI / 2 + aim * NOTCH,
        at = {
            x: FIELD_AT.x + LAUNCHER.x + Math.cos(a) * 6,
            y: FIELD_AT.y + LAUNCHER.y + Math.sin(a) * 6,
        };
    return Array.from({ length: steps }, (_, i) => {
        const last = i === steps - 1;
        if (by === "touch")
            return last ? { ...emptyPad(), lifted: at } : { ...emptyPad(), touch: at };
        return {
            ...emptyPad(),
            pressed: d === 0 ? [] : [d > 0 ? "left" : "right"],
            ...(last ? { tapped: true, go: true, keys: true } : {}),
        };
    });
}

/** Steps the game with each pad, keeping a copy of each. */
function play(s: PegState, pads: Pad[], kept: Pad[]): void {
    for (const p of pads) {
        kept.push(copyPad(p));
        pegsGame.step(s, copyPad(p));
    }
}

/** Steps with nothing held until the launcher is ready again or the round is over. */
function settle(s: PegState, kept: Pad[]): void {
    for (let i = 0; i < 60 * 90 && s.stage !== "aim" && !s.end; i++) play(s, [emptyPad()], kept);
}

/** How good a board is to go on from: met, or how much is met, and nothing if the target can no longer be made. */
function worth(s: PegState): number {
    if (s.end === "won" || s.won) return 1e6;
    const a = s.L.ask,
        p = progressOf(s);
    if (a.kind === "sum" && !canMake(s, a.total - s.sum)) return -1;
    return (p.completed / Math.max(1, p.total)) * 1000 + s.left;
}

/** A shot tried on a copy of the board: where it leaves the game, and the aim. */
interface Tried {
    s: PegState;
    aims: number[];
}

/**
 * The aims of a win from `start`, a shot a marble, found a shot at a time over every other notch,
 * keeping the `width` best boards; or null when none is found.
 */
export function pegPlan(start: PegState, width = 3): number[] | null {
    let beam: Tried[] = [{ s: structuredClone(start), aims: [] }];
    for (let shot = 0; shot < 12 && beam.length; shot++) {
        const next: Tried[] = [];
        for (const t of beam) {
            for (let aim = -REACH; aim <= REACH; aim += 2) {
                const s: PegState = { ...structuredClone(t.s), sim: true },
                    kept: Pad[] = [];
                play(s, shotPads(s.aim, aim, "keys"), kept);
                settle(s, kept);
                const tried = { s, aims: [...t.aims, aim] };
                if (s.won) return tried.aims;
                if (!s.end && worth(s) >= 0) next.push(tried);
            }
        }
        // the best boards, spread over how far they have got, so one lucky number does not crowd the rest out
        next.sort((x, y) => worth(y.s) - worth(x.s));
        const seen = new Set<number>();
        beam = next
            .filter((t) => {
                const w = Math.round(worth(t.s));
                if (seen.has(w)) return false;
                seen.add(w);
                return true;
            })
            .slice(0, width);
    }
    return null;
}

/** A plan played on the real game by the keys or by a finger, every pad kept, until the round ends. */
export function playPlan(s: PegState, aims: number[], by: "keys" | "touch"): Pad[] {
    const kept: Pad[] = [];
    for (const aim of aims) {
        if (s.end) break;
        play(s, shotPads(s.aim, aim, by), kept);
        settle(s, kept);
    }
    return kept;
}
