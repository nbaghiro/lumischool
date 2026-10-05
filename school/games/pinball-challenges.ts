// The variations of Pinball garden, and a solver that plays each one to its win through the real
// table from the keys alone. A table is chaos after the ball is away, so the solver searches the only
// choices a player has: how far to pull the plunger, and, each time the ball comes down onto a
// flipper, whether to swing it and how soon. It keeps the few best tables after each choice by how
// near the target they are and plays on from those, so every variation a child is given has been won
// this way first, and the keys it took replay to the same win.
import { emptyPad, type Dir, type Pad } from "../../engine/motion/pad";
import { PIN_LEVELS, pinballGame, startPin, type PinLevel, type PinState } from "./pinball";
import { PINBALL } from "../../engine/parts/sport/pinballtable";

export interface PinConfiguration {
    phase: number;
    variant: number;
}

export const PIN_VARIANTS = 3;

/** The numbers moved round the slots by `k`, so the same garden asks for the sum from other places. */
function turned(xs: readonly number[], k: number): number[] {
    return xs.map((_, i) => xs[(i + k) % xs.length] ?? 0);
}

/** A level as one of its variations lays it out: the flowers' numbers turned round, and the ladybirds counting in other steps. */
export function vary(L: PinLevel, variant: number): PinLevel {
    if (variant === 0) return L;
    const step = variant === 1 ? 5 : 3;
    return {
        ...L,
        flowers: turned(L.flowers, variant),
        ...(L.ladies && L.ask.kind === "order"
            ? { ladies: L.ladies.map((_, i) => (i + 1) * step) }
            : {}),
    };
}

export function pinChallenge(seed: number, phase: number): PinConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < PIN_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % PIN_VARIANTS };
}

export function isPinConfiguration(v: unknown, phase: number): v is PinConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < PIN_VARIANTS &&
        PIN_LEVELS[phase] !== undefined
    );
}

export function openPinConfiguration(c: PinConfiguration): PinState {
    const L = PIN_LEVELS[c.phase];
    if (!L) throw new Error("No such pinball level");
    return startPin(vary(L, c.variant), c.phase);
}

const held = (...d: Dir[]): Pad => ({ ...emptyPad(), holding: [...d] });
const copyPad = (p: Pad): Pad => ({ ...p, holding: [...p.holding], pressed: [...p.pressed] });
const step = (s: PinState, p: Pad) => pinballGame.step(s, copyPad(p));

/** Pulls of the plunger to try, as steps of the key held down. */
const PULLS = [24, 29, 34, 38, 42, 46];
/** Steps to wait before swinging a flipper at a ball coming down, or null for not swinging it. */
const DELAYS: (number | null)[] = [null, 0, 2, 4, 7, 10];
/** Steps a swing is held up for. */
const SWING = 12;

/** Whether the ball is coming down onto a flipper, so a player would choose whether and when to swing. */
function choosing(s: PinState): "left" | "right" | null {
    const b = s.ball;
    if (b.mode !== "free" || s.resting || b.y < 26.5 || b.vy < -0.5) return null;
    return b.x < PINBALL.mid ? "left" : "right";
}

/** How near the target a table is, higher being nearer, with a little for a ball still in play. */
function score(s: PinState): number {
    if (s.won) return 1e9;
    const a = s.L.ask;
    const toward =
        a.kind === "hits"
            ? s.hits
            : a.kind === "sum" || a.kind === "atleast"
              ? s.sum
              : a.kind === "odd"
                ? s.lit.length
                : a.kind === "order"
                  ? s.next
                  : s.score;
    return toward * 100 + (s.ball.mode === "gone" ? -30 : 0) - s.steps / 1000;
}

/** Steps on with nothing pressed until the next choice, a win, a drain or `most` steps, keeping the pads it took. */
function until(s: PinState, pads: Pad[], most: number): void {
    for (let i = 0; i < most && !s.won; i++) {
        if (i > 0 && (choosing(s) !== null || s.resting)) return;
        const p = emptyPad();
        step(s, p);
        pads.push(p);
    }
}

/** The tables one choice away from `s`, each with the pads that make that choice and play on to the next. */
function* choices(s: PinState): Generator<{ pads: Pad[]; after: PinState }> {
    if (s.resting) {
        for (const n of PULLS) {
            const after = structuredClone(s),
                pads: Pad[] = [];
            for (let i = 0; i <= n; i++) {
                const p = held("down");
                step(after, p);
                pads.push(p);
            }
            until(after, pads, 60 * 8);
            yield { pads, after };
        }
        return;
    }
    const side = choosing(s);
    for (const d of DELAYS) {
        const after = structuredClone(s),
            pads: Pad[] = [];
        if (d !== null && side) {
            for (let i = 0; i < d; i++) {
                const p = emptyPad();
                step(after, p);
                pads.push(p);
            }
            for (let i = 0; i < SWING; i++) {
                const p = held(side);
                step(after, p);
                pads.push(p);
            }
        }
        until(after, pads, 60 * 8);
        yield { pads, after };
    }
}

/**
 * The key pads that play a variation to its win, or null when the search runs out first. It keeps the
 * `wide` best tables after each choice, so a choice that looks worse now can still lead to the win.
 */
export function pinWay(c: PinConfiguration, wide = 8, deepest = 240): Pad[] | null {
    const start = openPinConfiguration(c);
    let beam: { s: PinState; pads: Pad[] }[] = [{ s: start, pads: [] }];
    for (let depth = 0; depth < deepest; depth++) {
        const next: { s: PinState; pads: Pad[]; v: number }[] = [];
        for (const { s, pads } of beam)
            for (const { pads: more, after } of choices(s)) {
                const all = [...pads, ...more];
                if (after.won) return all;
                next.push({ s: after, pads: all, v: score(after) });
            }
        next.sort((a, b) => b.v - a.v);
        // two tables with the ball and the tally in the same place are one choice
        const seen = new Set<string>();
        beam = [];
        for (const n of next) {
            const key = `${Math.round(n.s.ball.x * 4)},${Math.round(n.s.ball.y * 4)},${n.s.sum},${n.s.hits},${n.s.next},${n.s.lit.length}`;
            if (seen.has(key)) continue;
            seen.add(key);
            beam.push(n);
            if (beam.length >= wide) break;
        }
        if (!beam.length) return null;
    }
    return null;
}

/** Whether the solver wins a variation, for the challenges' certificate. */
export const pinCertified = (c: PinConfiguration): boolean => pinWay(c) !== null;
