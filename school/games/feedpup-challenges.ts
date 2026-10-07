// The variations of Feed the pup, and a solver that wins each one through the real game. A round is a
// handful of choices (which rope to cut, which bubble to pop, which puffer to squeeze and for how
// long) each made at some moment of a swing, so the solver walks those moments a few steps apart, plays
// each choice with the keys, and prunes a round as soon as the stars it caught can no longer make the
// bowl's number. The keys it finds are turned into the same choices by a finger, a tap on the rope or
// on the bubble or a press on the bellows, and both replay to the same win.
import { emptyPad, type Dir, type Pad } from "../../engine/motion/pad";
import type { Pt } from "../../engine/motion/geometry";
import {
    FEED_LEVELS,
    chosen,
    feedGame,
    startFeed,
    targets,
    wanted,
    type FeedLevel,
    type FeedState,
    type Target,
} from "./feedpup";

export interface FeedConfiguration {
    phase: number;
    variant: number;
}

/** The level as authored, mirrored, with its other numbers, and with those mirrored. */
export const FEED_VARIANTS = 4;

const WIDE = 30;

function mirror(L: FeedLevel): FeedLevel {
    const x = (v: number) => WIDE - v;
    return {
        ...L,
        pegs: L.pegs.map((p) => ({ ...p, x: x(p.x) })),
        from: { x: x(L.from.x), y: L.from.y },
        stars: L.stars.map((s) => ({ ...s, x: x(s.x) })),
        bubbles: L.bubbles.map((b) => ({ ...b, x: x(b.x) })),
        puffers: L.puffers.map((p) => ({ ...p, x: x(p.x), dir: Math.PI - p.dir })),
        pip: x(L.pip),
    };
}

/** A level as one of its variations lays it out. */
export function vary(L: FeedLevel, variant: number): FeedLevel {
    const other: FeedLevel =
        variant >= 2 && L.other
            ? {
                  ...L,
                  ask: L.other.ask,
                  goal: L.other.goal,
                  stars: L.stars.map((s, i) => ({ ...s, n: L.other?.stars[i] ?? s.n })),
              }
            : L;
    return variant % 2 === 1 ? mirror(other) : other;
}

export function feedChallenge(seed: number, phase: number): FeedConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < FEED_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % FEED_VARIANTS };
}

export function isFeedConfiguration(v: unknown, phase: number): v is FeedConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < FEED_VARIANTS &&
        FEED_LEVELS[phase] !== undefined
    );
}

export function openFeedConfiguration(c: FeedConfiguration): FeedState {
    const L = FEED_LEVELS[c.phase];
    if (!L) throw new Error("No such Feed the pup level");
    return startFeed(vary(L, c.variant), c.phase);
}

/** One choice: what to act on, the step it is made at, and for a puffer how many steps it is squeezed. */
export interface FeedMove {
    at: number;
    t: Target;
    n: number;
}

const copyPad = (p: Pad): Pad => ({ ...p, holding: [...p.holding], pressed: [...p.pressed] });

/** The arrows that move the keys' choice from what it is now to `t`. */
function arrowsTo(s: FeedState, t: Target): Dir[] {
    const all = targets(s),
        now = chosen(s),
        from = all.findIndex((x) => now !== null && x.kind === now.kind && x.i === now.i),
        to = all.findIndex((x) => x.kind === t.kind && x.i === t.i);
    if (to < 0) return [];
    const d = to - Math.max(0, from);
    return Array.from({ length: Math.abs(d) }, () => (d > 0 ? "right" : "left"));
}

/** Plays `move` with the keys from `s`, which stands at the step before it, keeping each pad. */
function playKeys(s: FeedState, move: FeedMove, pads: Pad[]): void {
    const go = (p: Pad) => {
        pads.push(copyPad(p));
        feedGame.step(s, p);
    };
    const first = {
        ...emptyPad(),
        pressed: arrowsTo(s, move.t),
        go: true,
        tapped: true,
        keys: true,
    };
    go(first);
    if (move.t.kind !== "puffer") return;
    for (let i = 1; i < move.n; i++) go({ ...emptyPad(), go: true, keys: true });
    go(emptyPad());
}

/** Whether the stars a round has caught can still make the bowl's number. */
function hopeful(s: FeedState): boolean {
    if (s.end) return s.end === "won";
    const a = s.L.ask,
        sum = s.caught.reduce((t, n) => t + n, 0);
    if (sum > wanted(a)) return false;
    if (a.kind === "odd" && s.caught.some((n) => n % 2 === 0)) return false;
    if (a.kind === "count" && s.caught.length > a.count) return false;
    return true;
}

/** Whether a round left alone would never end: the biscuit hanging still on a rope. */
const hanging = (s: FeedState): boolean =>
    s.ropes.some((r) => !r.cut) && Math.hypot(s.bob.vx, s.bob.vy) < 0.05;

/** Steps a copy of `s` on with nothing pressed until it ends, comes to rest, or reaches step `most`. */
function runOut(s: FeedState, most: number): FeedState {
    const c = structuredClone(s);
    while (c.steps < most && !c.end && hopeful(c) && !(c.steps > s.steps + 2 && hanging(c)))
        feedGame.step(c, emptyPad());
    return c;
}

/** How long a squeeze is held, in steps: a little puff and a big one. */
const SQUEEZES = [10, 45];

/** A round reduced to what matters for the rest of it, so two ways to the same swing are walked once. */
const keyOf = (s: FeedState): string =>
    [
        s.ropes.map((r) => (r.cut ? 1 : 0)).join(""),
        s.bubbles.map((b) => (b.popped ? 2 : b.held ? 1 : 0)).join(""),
        s.got.map((g) => (g ? 1 : 0)).join(""),
        Math.round(s.bob.x * 20),
        Math.round(s.bob.y * 20),
        Math.round(s.bob.vx * 10),
        Math.round(s.bob.vy * 10),
    ].join(",");

/** What has been cut, popped and caught, without where the biscuit is: the kind of round it is. */
const kindOf = (s: FeedState): string => keyOf(s).split(",").slice(0, 3).join(",");

/**
 * The `wide` rounds to go on from, taken in turn from each kind of round so that one kind with many
 * moments to choose from does not crowd out the others, earliest first within a kind.
 */
function spread<T extends { s: FeedState }>(all: T[], wide: number): T[] {
    const kinds = new Map<string, T[]>();
    for (const r of all) {
        const k = kindOf(r.s);
        kinds.set(k, [...(kinds.get(k) ?? []), r]);
    }
    const out: T[] = [];
    for (let i = 0; out.length < wide; i++) {
        let any = false;
        for (const rs of kinds.values()) {
            const r = rs[i];
            if (!r) continue;
            any = true;
            if (out.length < wide) out.push(r);
        }
        if (!any) break;
    }
    return out;
}

/**
 * The moves that win a variation, or null when there are none: each layer adds one move, made at any
 * moment `every` steps apart up to `most` steps into the round, and keeps `wide` of the rounds it
 * reaches, spread over what has been cut and caught, to add the next move to.
 */
export function feedMoves(
    c: FeedConfiguration,
    deepest = 4,
    every = 4,
    most = 480,
    wide = 240,
): FeedMove[] | null {
    const start = openFeedConfiguration(c);
    if (runOut(start, most).end === "won") return [];
    let layer: { s: FeedState; moves: FeedMove[] }[] = [{ s: start, moves: [] }];
    for (let depth = 0; depth < deepest && layer.length; depth++) {
        const next: { s: FeedState; moves: FeedMove[] }[] = [],
            seen = new Set<string>();
        for (const { s, moves } of layer) {
            const base = structuredClone(s);
            // a finger needs a step to come down before a swipe and one to lift after it
            for (let i = 0; i < 3; i++) feedGame.step(base, emptyPad());
            while (base.steps < most && !base.end && hopeful(base)) {
                for (const t of targets(base))
                    for (const n of t.kind === "puffer" ? SQUEEZES : [1]) {
                        const after = structuredClone(base),
                            move = { at: base.steps, t, n };
                        playKeys(after, move, []);
                        if (!hopeful(after)) continue;
                        if (runOut(after, most).end === "won") return [...moves, move];
                        const k = keyOf(after);
                        if (seen.has(k)) continue;
                        seen.add(k);
                        next.push({ s: after, moves: [...moves, move] });
                    }
                for (let i = 0; i < every && !base.end; i++) feedGame.step(base, emptyPad());
            }
        }
        layer = spread(next, wide);
    }
    return null;
}

/** The keys that make `moves`, step by step, then wait for the end. */
function keysFor(c: FeedConfiguration, moves: readonly FeedMove[]): Pad[] {
    const s = openFeedConfiguration(c),
        pads: Pad[] = [];
    for (const m of moves) {
        while (s.steps < m.at) {
            const p = emptyPad();
            pads.push(copyPad(p));
            feedGame.step(s, p);
        }
        playKeys(s, m, pads);
    }
    return pads;
}

/** How far `p` is from the rope `o` as it runs from its peg to the biscuit at `b`. */
function apart(p: Pt, o: { ax: number; ay: number }, b: Pt): number {
    const dx = b.x - o.ax,
        dy = b.y - o.ay,
        d2 = dx * dx + dy * dy,
        t = d2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - o.ax) * dx + (p.y - o.ay) * dy) / d2));
    return Math.hypot(p.x - o.ax - dx * t, p.y - o.ay - dy * t);
}

/** A place on the rope `i` to tap that is clear of the other ropes, the bubbles and the puffers. */
function tapOn(s: FeedState, i: number): Pt | null {
    const r = s.ropes[i],
        b = s.bob;
    if (!r) return null;
    for (const f of [0.5, 0.35, 0.65, 0.2, 0.8]) {
        const p = { x: r.ax + (b.x - r.ax) * f, y: r.ay + (b.y - r.ay) * f };
        const others = s.ropes.some((o, j) => j !== i && !o.cut && apart(p, o, b) < 0.3);
        const onSomething =
            s.bubbles.some((q) => !q.popped && Math.hypot(p.x - q.x, p.y - q.y) < q.r + 0.7) ||
            s.L.puffers.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 1.9);
        if (!others && !onSomething) return p;
    }
    return null;
}

/** The same moves made by a finger: a tap on a rope or a bubble, a held press for a puffer. */
function touchFor(c: FeedConfiguration, moves: readonly FeedMove[]): Pad[] | null {
    const s = openFeedConfiguration(c),
        pads: Pad[] = [];
    const go = (p: Pad) => {
        pads.push(copyPad(p));
        feedGame.step(s, p);
    };
    for (const m of moves) {
        while (s.steps < m.at - 1) go(emptyPad());
        if (m.t.kind === "rope") {
            go(emptyPad());
            const p = tapOn(s, m.t.i);
            if (!p) return null;
            go({ ...emptyPad(), touch: p });
            go({ ...emptyPad(), lifted: p });
        } else if (m.t.kind === "bubble") {
            go(emptyPad());
            const q = s.bubbles[m.t.i];
            if (!q) return null;
            go({ ...emptyPad(), touch: { x: q.x, y: q.y } });
            go({ ...emptyPad(), lifted: { x: q.x, y: q.y } });
        } else {
            go(emptyPad());
            const p = s.L.puffers[m.t.i];
            if (!p) return null;
            for (let i = 0; i < m.n; i++) go({ ...emptyPad(), touch: { x: p.x, y: p.y } });
            go({ ...emptyPad(), lifted: { x: p.x, y: p.y } });
        }
    }
    return pads;
}

/** The pads that win a variation by the keys or by a finger, from the solver's moves, or null when it found none. */
export function feedWay(
    c: FeedConfiguration,
    hand: "keys" | "touch",
    moves = feedMoves(c),
): Pad[] | null {
    if (!moves) return null;
    return hand === "keys" ? keysFor(c, moves) : touchFor(c, moves);
}
