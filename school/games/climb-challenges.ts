// A climb is only shipped once it has been climbed through the game itself.
//
// Each level has a route: run to a place, hop towards one, wait for a moving ledge, climb a ladder,
// give coins back at a box until a door's number is met. The pilot follows a route by asking the
// game for one step at a time, with the keys or with a finger on the field, so what it records is
// what a child's hands could do; the tests play the recorded pads back through a fresh climb.
import { configurationKey } from "../../engine/motion/configuration";
import { emptyPad, type Pad } from "../../engine/motion/pad";
import { ledgeAt } from "../../engine/motion/platforms";
import { grounded, type Intent } from "../../engine/motion/walker";
import {
    CLIMB_LEVELS,
    RATE,
    movesOf,
    startClimb,
    stepClimb,
    variantOf,
    type ClimbState,
    type Rule,
} from "./climb";

/** One part of a route. */
export type Leg =
    | { go: number; stop?: true }
    | { hop: number; hold?: number; after?: number }
    | { wait: number; x0: number }
    | { climb: number }
    | { give: number; at: number };

/** The way through each level, by its place in the list. */
export const ROUTES: Leg[][] = [
    [{ go: 21.4 }, { hop: 28 }, { go: 34.4 }, { hop: 40 }, { go: 58 }],
    [
        { go: 13.4 },
        { hop: 19.5 },
        { go: 27.4 },
        { hop: 33 },
        { go: 41.4 },
        { hop: 47.5 },
        { go: 57.4 },
        { hop: 63 },
        { go: 67 },
    ],
    [
        { go: 9.4, stop: true },
        { hop: 12, hold: 0.25, after: 17 },
        { go: 21.4 },
        { hop: 27 },
        { go: 29.4 },
        { hop: 35 },
        { go: 42 },
        { go: 60 },
    ],
    [
        { go: 13.6 },
        { wait: 0, x0: 12.6 },
        { go: 15 },
        { wait: 0, x0: 19.4 },
        { hop: 28 },
        { go: 70 },
    ],
    [
        { go: 15.4 },
        { hop: 21 },
        { go: 29.4 },
        { hop: 35 },
        { go: 37 },
        { give: 0, at: 40 },
        { go: 43.4 },
        { hop: 50 },
        { go: 64 },
    ],
    [{ go: 18.6 }, { hop: 23.2 }, { hop: 25.5 }, { go: 26.6 }, { hop: 30 }, { go: 61 }, { go: 67 }],
    [
        { go: 16.4 },
        { hop: 21.6 },
        { go: 34.4 },
        { give: 0, at: 36 },
        { go: 38.2 },
        { hop: 43.6 },
        { go: 50.4 },
        { give: 1, at: 52 },
        { go: 66 },
    ],
    [
        { go: 6.5, stop: true },
        { hop: 7 },
        { go: 9.2, stop: true },
        { hop: 9.5 },
        { go: 8.8, stop: true },
        { hop: 8.5 },
        { go: 9.2, stop: true },
        { hop: 9.5 },
        { go: 13.6 },
        { hop: 20 },
        { go: 25.6 },
        { hop: 30 },
        { go: 50 },
    ],
];

/** The number a door wants, where it wants one number. */
export const wanted = (r: Rule | undefined): number | null =>
    !r ? null : r.kind === "exact" ? r.n : r.kind === "sum" ? r.a + r.b : null;

/** The longest a climb may take before the pilot gives up: three minutes of play. */
const LIMIT = RATE * 180;

interface Leading {
    n: number;
    pressed: boolean;
    /** Set once a spring has thrown her up, when the hop's `after` is where she heads. */
    sprung?: boolean;
    /** Which way a leg run through set out, so it is done once the place is passed. */
    dir?: 1 | -1;
}

/** What the hands do this step for a part of the route, and whether that part is done. */
function legIntent(s: ClimbState, leg: Leg, at: Leading): { intent: Intent; done: boolean } {
    const r = s.r,
        none: Intent = { run: 0, jump: false, jumped: false };
    const toward = (x: number, near = 0.2): -1 | 0 | 1 =>
        Math.abs(x - r.x) <= near ? 0 : x > r.x ? 1 : -1;
    if ("go" in leg) {
        // a leg run through keeps its speed for the hop after it; one that stops waits to stand still
        if (at.n === 0) at.dir = leg.go >= r.x ? 1 : -1;
        const past = leg.stop
            ? Math.abs(leg.go - r.x) <= 0.25
            : (leg.go - r.x) * (at.dir ?? 1) <= 0.25;
        if (grounded(r) && past && (!leg.stop || Math.abs(r.vx) < 0.5))
            return { intent: none, done: true };
        return { intent: { ...none, run: toward(leg.go) }, done: false };
    }
    if ("hop" in leg) {
        const hold = (leg.hold ?? 0.5) * RATE;
        if (at.n === 0) {
            if (!grounded(r) && r.state !== "climb") return { intent: none, done: false };
            at.pressed = true;
            return { intent: { run: toward(leg.hop), jump: true, jumped: true }, done: false };
        }
        if (r.vy < -20) at.sprung = true;
        if (at.n > 4 && grounded(r)) return { intent: none, done: true };
        const to = at.sprung && leg.after !== undefined ? leg.after : leg.hop;
        return {
            intent: { run: toward(to, 0.3), jump: at.n < hold, jumped: false },
            done: false,
        };
    }
    if ("wait" in leg) {
        const l = s.L.ledges.find((x) => x.move);
        if (!l) return { intent: none, done: true };
        const now = ledgeAt(l, s.steps / RATE);
        return { intent: none, done: Math.abs(now.x0 - leg.x0) < 0.35 };
    }
    if ("climb" in leg) {
        if (at.n > 2 && r.state !== "climb" && grounded(r) && r.y <= leg.climb + 0.1)
            return { intent: none, done: true };
        return { intent: { ...none, climb: -1 }, done: false };
    }
    // giving coins back: hop onto the box's button until the door's number is met
    const target = wanted(s.rules[leg.give]);
    if (target === null || s.coins <= target) return { intent: none, done: grounded(r) };
    if (!grounded(r)) return { intent: { ...none, run: toward(leg.at, 0.1) }, done: false };
    return { intent: { run: toward(leg.at, 0.1), jump: true, jumped: true }, done: false };
}

/** The pad a hand gives for an intent: the keys, or a finger on the field. */
function padOf(s: ClimbState, i: Intent, hands: "keys" | "touch"): Pad {
    const pad = emptyPad();
    if (hands === "keys") {
        if (i.run) {
            const d = i.run > 0 ? "right" : "left";
            pad.holding = [d];
            pad.held = d;
        }
        if (i.climb) {
            const d = i.climb < 0 ? "up" : "down";
            pad.holding = [...pad.holding, d];
            pad.held = d;
        }
        pad.go = i.jump;
        pad.keys = i.jump || undefined;
        if (i.jumped) pad.tapped = true;
        if (i.drop) pad.pressed = ["down"];
        if (!pad.keys) delete pad.keys;
        return pad;
    }
    const m = movesOf(s.who),
        body = s.r.y - m.height / 2;
    const up = i.jump || (i.climb ?? 0) < 0;
    // a new jump needs the finger to have come down first, so a jump pressed while the last was held lowers it for this step
    const lift = i.jumped && s.above;
    pad.touch = {
        x: s.r.x + i.run * 3,
        y: lift ? body : up ? body - 3.5 : (i.climb ?? 0) > 0 || i.drop ? body + 2.6 : body,
    };
    return pad;
}

/**
 * A climb of a level's variant by `hands`, as the pads it took, or null when the route does not get
 * home within three minutes of play.
 */
export function climbThrough(
    phase: number,
    variant: number,
    hands: "keys" | "touch",
    watch?: (s: ClimbState, leg: number) => void,
): Pad[] | null {
    const route = ROUTES[phase];
    if (!route) return null;
    const s = startClimb(phase, variant),
        pads: Pad[] = [];
    let k = 0;
    let at: Leading = { n: 0, pressed: false };
    while (!s.won && s.steps < LIMIT) {
        const leg = route[k];
        let intent: Intent = { run: 0, jump: false, jumped: false };
        if (leg) {
            const next = legIntent(s, leg, at);
            if (next.done) {
                k++;
                at = { n: 0, pressed: false };
                continue;
            }
            intent = next.intent;
            at.n++;
        }
        let pad = padOf(s, intent, hands);
        if (hands === "touch" && intent.jumped && s.above) {
            // lower the finger for a step, then raise it again, so the jump is a new one
            pads.push(pad);
            stepClimb(s, kept(pad));
            pad = padOf(s, intent, hands);
        }
        pads.push(pad);
        stepClimb(s, kept(pad));
        watch?.(s, k);
    }
    return s.won ? pads : null;
}

const kept = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

/** A stored climb: which level, and which of its variants. */
export interface ClimbConfiguration {
    phase: number;
    variant: number;
}

export const isClimbConfiguration = (v: unknown, phase: number): v is ClimbConfiguration =>
    typeof v === "object" &&
    v !== null &&
    "phase" in v &&
    "variant" in v &&
    v.phase === phase &&
    typeof v.variant === "number" &&
    Number.isInteger(v.variant) &&
    v.variant >= 0 &&
    v.variant < (CLIMB_LEVELS[phase]?.variants.length ?? 0);

export const climbChallenge = (seed: number, phase: number): ClimbConfiguration => ({
    phase,
    variant: seed % (CLIMB_LEVELS[phase]?.variants.length ?? 1),
});

const PROVEN = new Map<string, boolean>();

/** Whether a variant has been climbed both by the keys and by a finger, kept once found. */
export function climbCertified(c: ClimbConfiguration): boolean {
    const key = configurationKey(c);
    const known = PROVEN.get(key);
    if (known !== undefined) return known;
    const ok =
        climbThrough(c.phase, c.variant, "keys") !== null &&
        climbThrough(c.phase, c.variant, "touch") !== null;
    PROVEN.set(key, ok);
    return ok;
}

export const openClimbConfiguration = (c: ClimbConfiguration): ClimbState =>
    startClimb(
        c.phase,
        variantOf(CLIMB_LEVELS[c.phase] ?? CLIMB_LEVELS[0], c.variant) ? c.variant : 0,
    );
