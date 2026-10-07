// A planet is only shipped once Bolt has rescued its crew through the game itself.
//
// Each level has a route: run to a place, hop towards one (held for the jets, with the rocket fired
// on the way), spin, use the gadget, walk back with the gloves, wait for a ledge. The pilot follows a
// route by asking the game for one step at a time, with the keys or with a finger on the field and
// the buttons, so what it records is what a child's hands could do; the tests play the recorded
// inputs back through a fresh rescue.
import { configurationKey } from "../../engine/motion/configuration";
import { emptyPad, type Pad } from "../../engine/motion/pad";
import { ledgeAt } from "../../engine/motion/platforms";
import { grounded, type Intent } from "../../engine/motion/walker";
import { BOLT_LEVELS, RATE, boltGame, startBolt, stepBolt, type BoltState } from "./bolt";

/** One part of a route. */
export type Leg =
    | { go: number; stop?: true }
    | { hop: number; hold?: number; boost?: number; after?: number }
    | { spin: true }
    | { gadget: true }
    | { wait: number }
    | { ride: number; x0?: number; y?: number };

/** What the hands gave on one step: the pad, or a button or key pressed between two steps. */
export type Input = Pad | "spin" | "gadget" | "rocket";

export const ROUTES: Leg[][] = [
    [
        { go: 12, stop: true },
        { go: 19.6 },
        { hop: 27 },
        { go: 28.2, stop: true },
        { spin: true },
        { go: 31 },
        { go: 33, stop: true },
        { hop: 37, hold: 0.9 },
        { go: 42.8 },
        { hop: 52 },
        { go: 57, stop: true },
        { wait: 2 },
    ],
    [
        { go: 6.6, stop: true },
        { spin: true },
        { go: 9 },
        { go: 15.6 },
        { hop: 26, hold: 1.8 },
        { go: 27.2, stop: true },
        { spin: true },
        { go: 31.4, stop: true },
        { hop: 35, hold: 0.9 },
        { go: 38.5 },
        { go: 59, stop: true },
        { wait: 2 },
    ],
    [
        { go: 9.6, stop: true },
        { hop: 11, hold: 0.2, after: 15 },
        { go: 17.7 },
        { go: 17.4, stop: true },
        { gadget: true },
        { go: 8.8, stop: true },
        { gadget: true },
        { go: 38.2, stop: true },
        { spin: true },
        { go: 60, stop: true },
        { wait: 2 },
    ],
    [
        { go: 13.6, stop: true },
        { ride: 0, y: 17.4 },
        { hop: 19, hold: 0.8 },
        { go: 19.6, stop: true },
        { ride: 1, y: 16.8 },
        { hop: 24.5, hold: 1 },
        { go: 25.6, stop: true },
        { ride: 2, y: 17.8 },
        { hop: 30.5, hold: 1 },
        { go: 31.6, stop: true },
        { hop: 36, hold: 1 },
        { go: 42.8, stop: true },
        { spin: true },
        { go: 49.4 },
        { hop: 60, hold: 1.6 },
        { go: 61.4, stop: true },
        { hop: 63, hold: 0.9 },
        { go: 66 },
        { go: 73, stop: true },
        { wait: 2 },
    ],
    [
        { go: 15.5 },
        { hop: 18.5 },
        { go: 21.6 },
        { hop: 25.5 },
        { go: 28.6 },
        { hop: 32 },
        { go: 35.4, stop: true },
        { hop: 37, hold: 1.4 },
        { go: 37, stop: true },
        { hop: 39.6, hold: 0.9 },
        { go: 42.4, stop: true },
        { spin: true },
        { go: 46.4, stop: true },
        { hop: 50, hold: 0.9 },
        { go: 53 },
        { go: 64, stop: true },
        { wait: 2 },
    ],
    [
        { go: 11.4 },
        { hop: 17, hold: 0.6 },
        { go: 18.6, stop: true },
        { hop: 25, hold: 0.8 },
        { hop: 33, hold: 0.8 },
        { go: 34.6, stop: true },
        { hop: 52, hold: 1.8, boost: 0.45 },
        { go: 51.6, stop: true },
        { hop: 54.5, hold: 0.9 },
        { hop: 59, hold: 0.9 },
        { go: 62 },
        { go: 68.6, stop: true },
        { spin: true },
        { go: 77, stop: true },
        { wait: 2 },
    ],
    [
        { go: 12.6, stop: true },
        { spin: true },
        { go: 14.6, stop: true },
        { go: 8, stop: true },
        { gadget: true },
        { wait: 1.6 },
        { gadget: true },
        { hop: 9.6, hold: 0.5 },
        { go: 9.6, stop: true },
        { hop: 7, hold: 0.5 },
        { go: 6.6, stop: true },
        { go: 21.4 },
        { hop: 30, hold: 1.6 },
        { go: 31.4, stop: true },
        { spin: true },
        { go: 40.4, stop: true },
        { gadget: true },
        { wait: 2.4 },
        { gadget: true },
        { hop: 42.2, hold: 0.5 },
        { go: 42.2, stop: true },
        { hop: 42.4, hold: 0.5 },
        { go: 44.6 },
        { go: 66, stop: true },
        { wait: 2 },
    ],
    [
        { go: 13.4 },
        { hop: 21.5, hold: 1.2 },
        { go: 24.8, stop: true },
        { spin: true },
        { go: 32.4, stop: true },
        { spin: true },
        { wait: 1.5 },
        { go: 36, stop: true },
        { hop: 41, hold: 1.6 },
        { go: 41, stop: true },
        { hop: 43.6, hold: 0.9 },
        { go: 44.6, stop: true },
        { hop: 47, hold: 0.9 },
        { go: 51.5 },
        { hop: 62, hold: 1.6 },
        { go: 64.6, stop: true },
        { spin: true },
        { go: 70.4, stop: true },
        { spin: true },
        { go: 81, stop: true },
        { wait: 2 },
    ],
    [
        { go: 7.4, stop: true },
        { hop: 10, hold: 0.9 },
        { go: 11.6, stop: true },
        { hop: 15, hold: 0.9 },
        { go: 15, stop: true },
        { spin: true },
        { go: 18.6 },
        { go: 21.4 },
        { hop: 29, hold: 1.5 },
        { go: 29.4, stop: true },
        { spin: true },
        { go: 33, stop: true },
        { hop: 36, hold: 0.9 },
        { go: 37.6, stop: true },
        { hop: 42, hold: 0.9 },
        { go: 44.2, stop: true },
        { spin: true },
        { go: 49.5 },
        { hop: 57.5, hold: 1.5 },
        { go: 58.4, stop: true },
        { spin: true },
        { wait: 1 },
        { go: 61.8, stop: true },
        { spin: true },
        { go: 62.8, stop: true },
        { hop: 67.6, hold: 0.6 },
        { go: 70, stop: true },
        { wait: 3 },
    ],
];

/** The longest a rescue may take before the pilot gives up: four minutes of play. */
const LIMIT = RATE * 240;

interface Leading {
    n: number;
    /** Set once a spring has thrown Bolt up, when the hop's `after` is where it heads. */
    sprung?: boolean;
    /** Set once a hop's rocket has been fired. */
    fired?: boolean;
    dir?: 1 | -1;
    up?: number;
}

/** What the hands do this step for a part of the route, and whether that part is done. */
function legIntent(
    s: BoltState,
    leg: Leg,
    at: Leading,
): { intent: Intent; done: boolean; press?: "spin" | "gadget" } {
    const r = s.r,
        none: Intent = { run: 0, jump: false, jumped: false };
    const toward = (x: number, near = 0.2): -1 | 0 | 1 =>
        Math.abs(x - r.x) <= near ? 0 : x > r.x ? 1 : -1;
    if ("go" in leg) {
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
            if (!grounded(r)) return { intent: none, done: false };
            at.up = s.steps;
            return { intent: { run: toward(leg.hop), jump: true, jumped: true }, done: false };
        }
        const since = s.steps - (at.up ?? s.steps);
        if (r.vy < -22) at.sprung = true;
        if (at.n > 4 && grounded(r)) return { intent: none, done: true };
        const to = at.sprung && leg.after !== undefined ? leg.after : leg.hop;
        const press =
            leg.boost !== undefined && !at.fired && since >= Math.round(leg.boost * RATE)
                ? "gadget"
                : undefined;
        if (press) at.fired = true;
        return {
            intent: { run: toward(to, 0.3), jump: at.n < hold, jumped: false },
            done: false,
            ...(press ? { press } : {}),
        };
    }
    if ("spin" in leg) {
        if (at.n === 0) return { intent: none, done: false, press: "spin" };
        return { intent: none, done: s.spin <= 0 && at.n > 2 };
    }
    if ("gadget" in leg) {
        if (at.n === 0) return { intent: none, done: false, press: "gadget" };
        return { intent: none, done: true };
    }
    if ("wait" in leg) return { intent: none, done: at.n >= leg.wait * RATE };
    const l = s.L.ledges[leg.ride];
    if (!l) return { intent: none, done: true };
    const now = ledgeAt(l, s.steps / RATE);
    const ok =
        (leg.x0 === undefined || Math.abs(now.x0 - leg.x0) < 0.3) &&
        (leg.y === undefined || Math.abs(now.y - leg.y) < 0.15);
    return { intent: none, done: ok };
}

/** The pad the keys give for an intent. */
function keysPad(i: Intent): Pad {
    const pad = emptyPad();
    if (i.run) {
        const d = i.run > 0 ? "right" : "left";
        pad.holding = [d];
        pad.held = d;
    }
    pad.go = i.jump;
    pad.keys = i.jump || undefined;
    if (!pad.keys) delete pad.keys;
    if (i.jumped) pad.tapped = true;
    return pad;
}

/** The pad a finger on the field gives for an intent: where it is held, above Bolt to jump. */
function fingerPad(s: BoltState, i: Intent): Pad {
    const pad = emptyPad(),
        body = s.r.y - 0.9;
    pad.touch = { x: s.r.x + i.run * 3, y: i.jump ? body - 3.5 : body };
    return pad;
}

const kept = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

/** Plays one input into a rescue. */
export function play(s: BoltState, input: Input): void {
    if (typeof input === "string") boltGame.command?.(s, input);
    else stepBolt(s, kept(input));
}

/** The inputs for a press of spin or the gadget, by the keys or by a finger and the buttons. */
function pressInputs(s: BoltState, what: "spin" | "gadget", hands: "keys" | "touch"): Input[] {
    if (hands === "keys") {
        if (what === "gadget") return ["gadget"];
        const pad = emptyPad();
        pad.pressed = ["down"];
        return [pad];
    }
    const L = s.L;
    if (what === "gadget" && L.gadget === "rocket") return ["rocket"];
    // a finger taps Bolt to spin, or the handle or the metal block for the gadget
    let at = { x: s.r.x, y: s.r.y - 0.9 };
    if (what === "gadget" && L.bridge) at = { x: L.bridge.x - s.plank, y: L.bridge.y - 0.3 };
    if (what === "gadget" && L.gadget === "magnet") {
        let best = Infinity;
        L.things.forEach((t, k) => {
            const h = s.held[k];
            if (t.kind === "metal" && h && !h.gone && Math.abs(h.x - s.r.x) < best) {
                best = Math.abs(h.x - s.r.x);
                at = { x: h.x, y: h.y - 0.8 };
            }
        });
    }
    // the finger held to run comes off the glass first, so the tap is a tap of its own
    const down = emptyPad();
    down.touch = at;
    const up = emptyPad();
    up.lifted = at;
    return [emptyPad(), down, up];
}

/**
 * A rescue of a level's variant by `hands`, as the inputs it took, or null when the route does not
 * get the crew home within four minutes of play.
 */
export function rescueThrough(
    phase: number,
    variant: number,
    hands: "keys" | "touch",
    watch?: (s: BoltState, leg: number) => void,
): Input[] | null {
    const route = ROUTES[phase];
    if (!route) return null;
    const s = startBolt(phase, variant),
        inputs: Input[] = [];
    const push = (i: Input): void => {
        inputs.push(i);
        play(s, i);
    };
    let k = 0;
    let at: Leading = { n: 0 };
    while (!s.end && s.steps < LIMIT && s.splash <= 0) {
        const leg = route[k];
        let intent: Intent = { run: 0, jump: false, jumped: false };
        if (leg) {
            const next = legIntent(s, leg, at);
            if (next.done) {
                k++;
                at = { n: 0 };
                continue;
            }
            intent = next.intent;
            at.n++;
            if (next.press) {
                for (const i of pressInputs(s, next.press, hands)) push(i);
                watch?.(s, k);
                continue;
            }
        }
        if (hands === "keys") push(keysPad(intent));
        else {
            // a new jump needs the finger to have come down first
            if (intent.jumped && s.above) push(fingerPad(s, { ...intent, jump: false }));
            push(fingerPad(s, intent));
        }
        watch?.(s, k);
    }
    return s.end === "won" ? inputs : null;
}

/** A stored rescue: which level, and which of its variants. */
export interface BoltConfiguration {
    phase: number;
    variant: number;
}

export const isBoltConfiguration = (v: unknown, phase: number): v is BoltConfiguration =>
    typeof v === "object" &&
    v !== null &&
    "phase" in v &&
    "variant" in v &&
    v.phase === phase &&
    typeof v.variant === "number" &&
    Number.isInteger(v.variant) &&
    v.variant >= 0 &&
    v.variant < (BOLT_LEVELS[phase]?.variants.length ?? 0);

export const boltChallenge = (seed: number, phase: number): BoltConfiguration => ({
    phase,
    variant: seed % (BOLT_LEVELS[phase]?.variants.length ?? 1),
});

const PROVEN = new Map<string, boolean>();

/** Whether a variant has been rescued both by the keys and by a finger, kept once found. */
export function boltCertified(c: BoltConfiguration): boolean {
    const key = configurationKey(c);
    const known = PROVEN.get(key);
    if (known !== undefined) return known;
    const ok =
        rescueThrough(c.phase, c.variant, "keys") !== null &&
        rescueThrough(c.phase, c.variant, "touch") !== null;
    PROVEN.set(key, ok);
    return ok;
}

export const openBoltConfiguration = (c: BoltConfiguration): BoltState =>
    startBolt(c.phase, c.variant);
