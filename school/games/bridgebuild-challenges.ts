// Bridge builder's variations, and the hands that build each one. A variation moves a level's
// numbers: how wide the gap is, how high each bank stands, where the rock is and what the budget is.
// Each is proven before a child is given it by building its plan through the real game, by the
// finger dragging (the material tapped in the picker, then a drag from a joint to where the beam
// ends), by the finger tapping (a joint tapped, then each end of a chain of beams in turn) and by the
// keys (the cursor walked to a joint, Enter, walked to the end, M for the material, Enter), then
// pressing Go and watching the pups' car reach the far bank.
import { emptyPad, spent as consumed, type Dir, type Pad } from "../../engine/motion/pad";
import type { Pt } from "../../engine/motion/geometry";
import type { Material } from "../../engine/motion/truss";
import {
    BRIDGE_LEVELS,
    VARIANTS,
    bridgeCommand,
    bridgeGame,
    pickCentre,
    startBridge,
    type BridgeLevel,
    type BridgeState,
    type Seg,
} from "./bridgebuild";

export interface BridgeConfiguration {
    phase: number;
    variant: number;
}

const variantsOf = (phase: number): readonly BridgeLevel[] => VARIANTS[phase] ?? [];

export function bridgeChallenge(seed: number, phase: number): BridgeConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < BRIDGE_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % Math.max(1, variantsOf(p).length) };
}

export function isBridgeConfiguration(v: unknown, phase: number): v is BridgeConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < variantsOf(phase).length
    );
}

export function levelOf(c: BridgeConfiguration): BridgeLevel {
    const L = variantsOf(c.phase)[c.variant];
    if (!L) throw new Error("No such bridge variation");
    return L;
}

export function openBridgeConfiguration(c: BridgeConfiguration): BridgeState {
    return startBridge(levelOf(c), c.phase);
}

/** One step of the game with a pad, the pad recorded for a replay, its presses then spent. */
function tick(s: BridgeState, pad: Pad, tape?: Pad[]): void {
    tape?.push(structuredClone(pad));
    bridgeGame.step(s, pad);
    consumed(pad);
}

const same = (a: Pt, b: Pt): boolean => a.x === b.x && a.y === b.y;
const touching = (at: Pt): Pad => ({ ...emptyPad(), touch: { ...at } });
const lifting = (at: Pt): Pad => ({ ...emptyPad(), lifted: { ...at } });

/** A finger pressed at `from`, slid to `to` and lifted there. */
export function drag(s: BridgeState, from: Pt, to: Pt, tape?: Pad[]): void {
    tick(s, touching(from), tape);
    for (let k = 1; k <= 6; k++)
        tick(
            s,
            touching({
                x: from.x + ((to.x - from.x) * k) / 6,
                y: from.y + ((to.y - from.y) * k) / 6,
            }),
            tape,
        );
    tick(s, lifting(to), tape);
    tick(s, emptyPad(), tape);
}

/** A finger tapped at a place: pressed and lifted where it went down. */
export function tap(s: BridgeState, at: Pt, tape?: Pad[]): void {
    tick(s, touching(at), tape);
    tick(s, lifting(at), tape);
    tick(s, emptyPad(), tape);
}

/** A material tapped in the picker at the top of the field, which the page reads in the view's own squares. */
export function pick(s: BridgeState, m: Material, tape?: Pad[]): void {
    const view = pickCentre(s.L, m);
    tick(s, { ...touching(s.L.near), view }, tape);
    tick(s, { ...lifting(s.L.near), view }, tape);
    tick(s, emptyPad(), tape);
}

/** Builds a plan by the finger: the picker's tile for each beam's material, then a drag from its start to its end. */
export function buildByTouch(s: BridgeState, plan: readonly Seg[], tape?: Pad[]): boolean {
    for (const seg of plan) {
        if (s.pen !== seg.m) pick(s, seg.m, tape);
        const n = s.design.length;
        drag(s, seg.a, seg.b, tape);
        if (s.design.length !== n + 1) return false;
    }
    return true;
}

/**
 * Builds a plan by taps: a joint tapped to start, then the end of each beam, so a beam that starts
 * where the last one ended is one more tap of the chain; a chain that does not go on is stopped by
 * tapping its end again.
 */
export function buildByTaps(s: BridgeState, plan: readonly Seg[], tape?: Pad[]): boolean {
    for (const seg of plan) {
        const armed = s.armed;
        if (armed && !same(armed, seg.a)) {
            tap(s, armed, tape);
            if (s.armed) return false;
        }
        if (!s.armed) {
            tap(s, seg.a, tape);
            if (!s.armed || !same(s.armed, seg.a)) return false;
        }
        if (s.pen !== seg.m) pick(s, seg.m, tape);
        const n = s.design.length;
        tap(s, seg.b, tape);
        if (s.design.length !== n + 1) return false;
    }
    if (s.armed) tap(s, s.armed, tape);
    return s.armed === null;
}

/** A key pressed: an arrow through the pad, any other through the game's command, as the page does; `keys` logs it. */
export function press(s: BridgeState, key: string, tape?: Pad[], keys?: string[]): void {
    keys?.push(key);
    if (key === "up" || key === "down" || key === "left" || key === "right") {
        const pad = emptyPad();
        pad.pressed.push(key);
        tick(s, pad, tape);
        return;
    }
    bridgeCommand(s, key);
    tick(s, emptyPad(), tape);
}

function walk(s: BridgeState, to: Pt, tape?: Pad[], keys?: string[]): boolean {
    for (let k = 0; k < 80 && (s.cursor.x !== to.x || s.cursor.y !== to.y); k++) {
        const d: Dir =
            s.cursor.x < to.x
                ? "right"
                : s.cursor.x > to.x
                  ? "left"
                  : s.cursor.y < to.y
                    ? "down"
                    : "up";
        press(s, d, tape, keys);
    }
    return s.cursor.x === to.x && s.cursor.y === to.y;
}

/** Builds a plan by the keys: the cursor walked to each beam's start, Enter, walked to its end, M to its material, Enter. */
export function buildByKeys(
    s: BridgeState,
    plan: readonly Seg[],
    tape?: Pad[],
    keys?: string[],
): boolean {
    for (const seg of plan) {
        if (!walk(s, seg.a, tape, keys)) return false;
        press(s, "join", tape, keys);
        if (!walk(s, seg.b, tape, keys)) return false;
        for (let k = 0; k < 3 && s.pen !== seg.m; k++) press(s, "material", tape, keys);
        const n = s.design.length;
        press(s, "join", tape, keys);
        if (s.design.length !== n + 1) return false;
    }
    return true;
}

/** Presses Go and steps until the crossing is judged: whether the round was won. */
export function runIt(s: BridgeState, tape?: Pad[]): boolean {
    const pad = emptyPad();
    pad.tapped = true;
    pad.go = true;
    tick(s, pad, tape);
    for (let k = 0; k < 60 * 45 && s.phase === "run"; k++) tick(s, emptyPad(), tape);
    return s.end?.won === true;
}

const proven = new Map<string, boolean>();

/** Whether a variation's plan wins when built by dragging, by a chain of taps and by the keys. */
export function bridgeCertified(c: BridgeConfiguration): boolean {
    const id = `${c.phase}:${c.variant}`,
        known = proven.get(id);
    if (known !== undefined) return known;
    const L = levelOf(c);
    const touch = openBridgeConfiguration(c),
        taps = openBridgeConfiguration(c),
        keys = openBridgeConfiguration(c);
    const ok =
        buildByTouch(touch, L.plan) &&
        runIt(touch) &&
        buildByTaps(taps, L.plan) &&
        runIt(taps) &&
        buildByKeys(keys, L.plan) &&
        runIt(keys);
    proven.set(id, ok);
    return ok;
}
