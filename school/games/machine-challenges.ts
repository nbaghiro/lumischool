// The domino machine's variations, and the hands that build each one. A variation moves a level's
// numbers: how many dominoes fill a gap, how heavy the weight is, where the boat floats. Each is
// proven before a child is given it by building its plan through the real game, by the finger (a
// part dragged up from the drawer and let go where the plan puts it, then its grip dragged to the
// plan's count or slope) or by the keys (a part chosen, stood out with an arrow, stepped to its place
// and counted or tipped with its keys), and then pressing Go and watching the bell ring.
import { emptyPad, spent as consumed, type Pad } from "../../engine/motion/pad";
import type { Pt } from "../../engine/motion/geometry";
import { LENGTHS } from "../../engine/motion/contraption";
import {
    MACHINE_LEVELS,
    VARIANTS,
    gripOf,
    machineCommand,
    machineGame,
    onBench,
    settleAngle,
    slotOf,
    startMachine,
    type MachineLevel,
    type MachineState,
    type Placement,
} from "./machine";

export interface DominoConfiguration {
    phase: number;
    variant: number;
}

const variantsOf = (phase: number): readonly MachineLevel[] => VARIANTS[phase] ?? [];

export function dominoChallenge(seed: number, phase: number): DominoConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < MACHINE_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % Math.max(1, variantsOf(p).length) };
}

export function isDominoConfiguration(v: unknown, phase: number): v is DominoConfiguration {
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

export function levelOf(c: DominoConfiguration): MachineLevel {
    const L = variantsOf(c.phase)[c.variant];
    if (!L) throw new Error("No such machine variation");
    return L;
}

export function openDominoConfiguration(c: DominoConfiguration): MachineState {
    return startMachine(levelOf(c), c.phase);
}

/** One step of the game with a pad, the pad recorded for a replay, its presses then spent. */
function tick(s: MachineState, pad: Pad, tape?: Pad[]): void {
    tape?.push(structuredClone(pad));
    machineGame.step(s, pad);
    consumed(pad);
}

const touching = (at: Pt): Pad => ({ ...emptyPad(), touch: { ...at } });
const lifting = (at: Pt): Pad => ({ ...emptyPad(), lifted: { ...at } });

/** A finger pressed at `from`, slid to `to` and lifted there. */
function drag(s: MachineState, from: Pt, to: Pt, tape?: Pad[]): void {
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

/** Where a finger lets go of a fresh part for it to come down at a placement. */
function aim(kind: string, p: Placement): Pt {
    const standing =
        kind === "row" ||
        kind === "seesaw" ||
        kind === "fan" ||
        kind === "spring" ||
        kind === "weight";
    return standing ? { x: p.x, y: p.y - 0.5 - 0.01 } : { x: p.x, y: p.y };
}

/** Builds a level's plan by the finger: each part dragged up from the drawer, then its count or slope set by its grip. */
export function buildByTouch(
    s: MachineState,
    plan: readonly (Placement | null)[],
    tape?: Pad[],
): boolean {
    for (const [i, p] of plan.entries()) {
        const t = s.tray[i];
        if (!p || !t) continue;
        drag(s, slotOf(i), aim(t.kind, p), tape);
        const placed = onBench(s, t.id);
        if (!placed) return false;
        if (p.n !== undefined && p.n !== placed.n) {
            const grip = gripOf(s, placed);
            if (!grip) return false;
            const per = t.kind === "row" ? s.scene.gap : 0.8;
            drag(s, grip, { x: placed.x + (p.n - 1) * per, y: grip.y }, tape);
        }
        if (p.angle !== undefined && (t.kind === "ramp" || t.kind === "long")) {
            const now = onBench(s, t.id);
            const grip = now ? gripOf(s, now) : null;
            if (!now || !grip) return false;
            const h = LENGTHS[t.kind] / 2;
            drag(
                s,
                grip,
                { x: now.x + Math.cos(p.angle) * h, y: now.y + Math.sin(p.angle) * h },
                tape,
            );
        }
    }
    return true;
}

/** A key pressed: an arrow through the pad, any other through the game's command, as the page does; `keys` logs it. */
function press(s: MachineState, key: string, tape?: Pad[], keys?: string[]): void {
    keys?.push(key);
    if (key === "up" || key === "down" || key === "left" || key === "right") {
        const pad = emptyPad();
        pad.pressed.push(key);
        tick(s, pad, tape);
        return;
    }
    machineCommand(s, key);
    tick(s, emptyPad(), tape);
}

/** Builds a level's plan by the keys: each part chosen, stood out, stepped to its place, then counted or tipped. */
export function buildByKeys(
    s: MachineState,
    plan: readonly (Placement | null)[],
    tape?: Pad[],
    keys?: string[],
): boolean {
    for (const [i, p] of plan.entries()) {
        const t = s.tray[i];
        if (!p || !t) continue;
        for (let k = 0; k < s.tray.length && s.selected !== t.id; k++) press(s, "next", tape, keys);
        if (s.selected !== t.id) return false;
        press(s, "right", tape, keys);
        let at = onBench(s, t.id);
        if (!at) return false;
        const along = () => {
            for (let k = 0; k < 120 && at && Math.abs(at.x - p.x) > 0.26; k++) {
                press(s, at.x > p.x ? "left" : "right", tape, keys);
                const next = onBench(s, t.id);
                if (next && next.x === at.x) break;
                at = next;
            }
        };
        // along to the plan's place first, then up to the shelf it stands on or down to the floor, then along again
        along();
        for (let k = 0; k < 6 && at && Math.abs(at.y - p.y) > 0.3; k++) {
            press(s, at.y > p.y ? "up" : "down", tape, keys);
            const next = onBench(s, t.id);
            if (next && next.y === at.y) break;
            at = next;
        }
        along();
        at = onBench(s, t.id);
        if (!at) return false;
        if (p.n !== undefined)
            for (let k = 0; k < 14 && at && at.n !== p.n; k++) {
                press(s, at.n < p.n ? "more" : "fewer", tape, keys);
                at = onBench(s, t.id);
            }
        if (p.angle !== undefined && at) {
            const want = settleAngle(p.angle);
            for (let k = 0; k < 30 && at && Math.abs(at.angle - want) > 0.05; k++) {
                press(s, at.angle > want ? "turn-left" : "turn-right", tape, keys);
                const next = onBench(s, t.id);
                if (next && next.angle === at.angle) break;
                at = next;
            }
        }
    }
    return true;
}

/** Presses Go and steps until the machine is judged: whether the bell rang for it. */
export function runIt(s: MachineState, tape?: Pad[]): boolean {
    const pad = emptyPad();
    pad.tapped = true;
    pad.go = true;
    tick(s, pad, tape);
    for (let k = 0; k < 60 * 25 && s.phase === "run"; k++) tick(s, emptyPad(), tape);
    return s.phase === "won";
}

/** Small moves of a plan's free parts, nearest first, for a plan a variation's place needs nudged. */
function nudges(plan: readonly (Placement | null)[]): (Placement | null)[][] {
    const out: (Placement | null)[][] = [plan.map((p) => p && { ...p })];
    for (const dx of [0.5, -0.5, 1, -1, 1.5, -1.5])
        for (const dy of [0, 1, -1])
            out.push(
                plan.map((p) =>
                    p && p.n === undefined ? { ...p, x: p.x + dx, y: p.y + dy } : p && { ...p },
                ),
            );
    return out;
}

/** A plan that rings the bell in a level, built by the finger, or null. */
export function dominoWay(L: MachineLevel, level: number): (Placement | null)[] | null {
    for (const plan of nudges(L.plan)) {
        const s = startMachine(L, level);
        if (buildByTouch(s, plan) && runIt(s)) return plan;
    }
    return null;
}

/** Whether a variation can be built and rung by the keys as well as the finger. */
export function dominoCertified(c: DominoConfiguration): boolean {
    const L = levelOf(c);
    const plan = dominoWay(L, c.phase);
    if (!plan) return false;
    const s = startMachine(L, c.phase);
    return buildByKeys(s, plan) && runIt(s);
}
