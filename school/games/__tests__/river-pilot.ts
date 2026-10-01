// A paddler for the river's tests: it steers for the gate that comes next in the count, round the
// rocks, then pulls in along the pool's bank and stops with the bow beside the number. It paddles only
// through a Pad, with the keys or with a finger held on the water, so a win it makes is a win a child
// can make.
import type { Pt } from "../../../engine/motion/geometry";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { recordStep, type Tape } from "../../../engine/motion/tape";
import {
    ROW,
    bankAt,
    bowOf,
    dockTolerance,
    gateX,
    halfAt,
    lineX,
    HULL,
    middle,
    poolStart,
    step,
    type RiverState,
} from "../row";

export type Input = "keys" | "pointer";

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

const taping = new WeakMap<RiverState, Tape>();

/** Records every pad the pilot paddles `s` with onto `t`, for a test that replays the try. */
export const recordInto = (s: RiverState, t: Tape): void => void taping.set(s, t);

function tick(s: RiverState, pad: Pad, n = 1): void {
    const t = taping.get(s);
    for (let i = 0; i < n && !s.won; i++) {
        if (t) recordStep(t, pad);
        step(s, pad);
        spent(pad);
    }
}

/** One stroke through the Pad: a key held for as long as the power asks. */
export function paddle(s: RiverState, side: 1 | -1, power: number, straight = false): void {
    const pad = emptyPad();
    const key = straight ? "up" : side === 1 ? "left" : "right";
    const n = Math.round(Math.max(0, (power - 0.35) / 0.65) * ROW.charge.value * 60);
    pad.pressed = [key];
    pad.holding = [key];
    tick(s, pad);
    for (let i = 0; i < n; i++) {
        pad.holding = [key];
        tick(s, pad);
    }
    pad.holding = [];
    tick(s, pad);
}

/** Holds the paddle back against the water for `n` steps, with the down key. */
export function backWater(s: RiverState, n: number): void {
    const pad = emptyPad();
    for (let i = 0; i < n && !s.won; i++) {
        pad.holding = ["down"];
        tick(s, pad);
    }
    pad.holding = [];
    tick(s, pad);
}

/** Holds a finger on the water at `at` for `n` steps, then lifts it. */
export function hold(s: RiverState, at: Pt, n: number): void {
    const pad = emptyPad();
    for (let i = 0; i < n && !s.won; i++) {
        pad.touch = { ...at };
        tick(s, pad);
    }
    pad.touch = null;
    pad.lifted = { ...at };
    tick(s, pad);
}

/** Where to steer for next: the gate in the count, or round a rock that stands in the way to it. */
function waypoint(s: RiverState): Pt {
    const L = s.L,
        c = s.boat;
    if (s.next < L.count.length) {
        const x = gateX(L, s.next),
            side = L.sides[s.next] ?? 1;
        let goal = { x: x + 2, y: middle(L, x) + (side * halfAt(L, x)) / 2 };
        for (const r of L.rocks) {
            const at = { x: r.at, y: middle(L, r.at) + r.off * halfAt(L, r.at) };
            if (at.x < c.x + 1 || at.x > goal.x) continue;
            const k = (at.x - c.x) / Math.max(1e-6, goal.x - c.x),
                y = c.y + (goal.y - c.y) * k;
            if (Math.abs(y - at.y) < r.size * 0.42 + 1.6) {
                const away = at.y > middle(L, at.x) ? -1 : 1;
                goal = { x: at.x, y: at.y + away * (r.size * 0.42 + 2.2) };
                break;
            }
        }
        return goal;
    }
    const target = lineX(L, L.dock) - 1.8;
    return {
        x: Math.min(target - 5, Math.max(c.x + 4, poolStart(L) + 2)),
        y: bankAt(L, target) + 1.1,
    };
}

/** Steers the river to its end with a finger held ahead of the canoe, and says whether it won. */
function fingerPilot(s: RiverState, limit: number): boolean {
    const L = s.L,
        pad = emptyPad();
    while (!s.won && s.steps < limit) {
        if (s.carried > 0) {
            pad.touch = null;
            tick(s, pad);
            continue;
        }
        const docking = s.next >= L.count.length;
        const x = lineX(L, L.dock);
        // the finger rests on each gate in turn, or beside a rock in the way, then on the bank at the number
        const goal = docking ? { x, y: bankAt(L, x) + HULL.r + 0.5 } : waypoint(s);
        pad.touch = goal;
        tick(s, pad, 6);
    }
    pad.touch = null;
    tick(s, pad);
    return s.won;
}

/** Paddles the river to its end with one kind of input, and says whether it won. */
export function pilot(s: RiverState, input: Input, limit = 60 * 300): boolean {
    if (input === "pointer") return fingerPilot(s, limit);
    const L = s.L;
    let turnSide: 1 | -1 = 1;
    while (!s.won && s.steps < limit) {
        if (s.carried > 0) {
            tick(s, emptyPad());
            continue;
        }
        const c = s.boat,
            speed = Math.hypot(c.vx, c.vy);
        const docking = s.next >= L.count.length && c.x > poolStart(L) - 2;
        const target = lineX(L, L.dock) - 1.8,
            bank = bankAt(L, target) + 1.1;
        if (docking && Math.abs(c.x - (target - 3)) < 5 && Math.abs(c.y - bank) < 0.9) {
            // the last few squares: face along the bank, and paddle or back water only when where the
            // canoe would drift to rest is off the number; the bank's slack water stops it that fast
            const e = wrap(0 - c.angle),
                ex = lineX(L, L.dock) - bowOf(s).x,
                tol = dockTolerance(L) * 0.5,
                fwd = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle),
                rest = fwd / (ROW.glide.value + 0.6 * ROW.back.value);
            if (Math.abs(e) > 0.3 && speed < 0.4)
                paddle(s, e > 0 ? -1 : 1, Math.min(0.5, Math.abs(e)));
            else if (ex - rest > tol)
                paddle(
                    s,
                    e > 0 ? -1 : 1,
                    Math.min(0.5, Math.max(0.15, (ex - rest) * 0.25)),
                    Math.abs(e) < 0.05,
                );
            else if (ex - rest < -tol) backWater(s, Math.min(30, 8 + Math.round((rest - ex) * 20)));
            else tick(s, emptyPad(), 10);
            turnSide = turnSide === 1 ? -1 : 1;
            tick(s, emptyPad(), 20);
            continue;
        }
        const goal = waypoint(s);
        const e = wrap(Math.atan2(goal.y - c.y, goal.x - c.x) - c.angle);
        const fwd = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
        const cap = docking ? 1.4 : 2.6;
        if (Math.abs(e) > 0.3) paddle(s, e > 0 ? -1 : 1, Math.min(1, Math.abs(e) * 0.9));
        else if (fwd < cap) paddle(s, e > 0 ? -1 : 1, 0.8, Math.abs(e) < 0.05);
        else if (docking) backWater(s, 10);
        tick(s, emptyPad(), 16);
    }
    return s.won;
}
