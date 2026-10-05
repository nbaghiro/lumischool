import { configurationKey } from "../../engine/motion/configuration";
import { inside } from "../../engine/motion/geometry";
import { emptyPad, spent } from "../../engine/motion/pad";
import {
    GOLF_LEVELS,
    golfCourse,
    golfGame,
    startGolf,
    type GolfCourse,
    type GolfState,
} from "./golf";

export interface GolfConfiguration {
    phase: number;
    course: GolfCourse;
}
export function golfChallenge(seed: number, phase: number): GolfConfiguration {
    if (!Number.isInteger(phase) || phase < 0 || phase >= GOLF_LEVELS.length)
        throw new Error("Unknown golf phase");
    return { phase, course: golfCourse(phase, (seed >>> 0) % 3) };
}
export function isGolfConfiguration(value: unknown): value is GolfConfiguration {
    if (
        !value ||
        typeof value !== "object" ||
        !("phase" in value) ||
        typeof value.phase !== "number" ||
        !Number.isInteger(value.phase) ||
        value.phase < 0 ||
        value.phase >= GOLF_LEVELS.length
    )
        return false;
    for (let i = 0; i < 3; i++)
        if (configurationKey(value) === configurationKey(golfChallenge(i, value.phase)))
            return true;
    return false;
}
export function openGolfConfiguration(value: GolfConfiguration) {
    if (!isGolfConfiguration(value)) throw new Error("Unverified golf course");
    return startGolf(value.course);
}

/** One putt as the Pad gives it: wait this many steps, then let go of a pull. */
export interface GolfPutt {
    wait: number;
    pull: { x: number; y: number };
}

const CELL = 0.5;

/**
 * Squares from each point of the green to the cup the long way round, through the gaps and the pipes,
 * so a putt can be judged by how much nearer it leaves the ball rather than by a straight line.
 */
function walkingDistance(course: GolfCourse): (x: number, y: number) => number {
    const cols = 60,
        rows = 40,
        r = 0.4,
        cellOf = (x: number, y: number) =>
            Math.max(0, Math.min(rows - 1, Math.floor((y - 3) / CELL))) * cols +
            Math.max(0, Math.min(cols - 1, Math.floor((x - 3) / CELL)));
    const solid = [...course.walls, ...(course.water ?? [])].map((w) => ({
        x: w.x - r,
        y: w.y - r,
        w: w.w + 2 * r,
        h: w.h + 2 * r,
    }));
    const open = Array.from({ length: cols * rows }, (_, i) => {
        const x = 3 + ((i % cols) + 0.5) * CELL,
            y = 3 + (Math.floor(i / cols) + 0.5) * CELL;
        return !solid.some((w) => inside(w, { x, y }));
    });
    const dist = Array.from({ length: cols * rows }, () => Infinity),
        done = Array.from({ length: cols * rows }, () => false);
    dist[cellOf(course.cup.x, course.cup.y)] = 0;
    // the way out of a pipe is as far from the cup as its way in
    const pipes = (course.tunnels ?? []).map((t) => ({
        from: cellOf(t.from.x, t.from.y),
        to: cellOf(t.to.x, t.to.y),
    }));
    for (;;) {
        let at = -1;
        for (let i = 0; i < dist.length; i++)
            if (
                !done[i] &&
                (dist[i] ?? Infinity) < Infinity &&
                (at < 0 || (dist[i] ?? 0) < (dist[at] ?? 0))
            )
                at = i;
        if (at < 0) break;
        done[at] = true;
        const here = dist[at] ?? Infinity,
            ax = at % cols,
            ay = Math.floor(at / cols);
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                const nx = ax + dx,
                    ny = ay + dy;
                if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
                const n = ny * cols + nx;
                if (!open[n]) continue;
                const d = here + Math.hypot(dx, dy) * CELL;
                if (d < (dist[n] ?? Infinity)) dist[n] = d;
            }
        for (const p of pipes)
            if (p.to === at && here < (dist[p.from] ?? Infinity)) dist[p.from] = here;
    }
    return (x, y) => dist[cellOf(x, y)] ?? Infinity;
}

/** Plays one putt on a copy and says where the ball came to rest. */
function tryPutt(s: GolfState, putt: GolfPutt): GolfState {
    const copy = structuredClone(s);
    const pad = emptyPad();
    for (let i = 0; i < putt.wait; i++) golfGame.step(copy, pad);
    pad.released = { ...putt.pull };
    golfGame.step(copy, pad);
    spent(pad);
    for (let i = 0; i < 1800 && copy.moving; i++) golfGame.step(copy, pad);
    return copy;
}

const pullOf = (angle: number, length: number) => ({
    x: -Math.cos(angle) * length,
    y: -Math.sin(angle) * length,
});

/**
 * The putts that sink the ball from the start of a course, found by trying a fan of aims and
 * strengths on copies and keeping the one that leaves the ball nearest the cup the long way round.
 * Where something on the course keeps time (the windmill, the gnome), each aim is also tried after
 * waits through one turn of it. Null when no way in is found in `most` putts.
 */
export function golfPlan(course: GolfCourse, most = 5): GolfPutt[] | null {
    const far = walkingDistance(course),
        period = Math.max(
            ...(course.gates ?? []).map((g) => g.period),
            ...(course.movers ?? []).map((m) => m.period),
            0,
        );
    // aims are first judged with the timed things taken away, then the best few are timed
    const still: GolfCourse = { ...course, gates: [], movers: [] };
    let s = startGolf(course);
    const plan: GolfPutt[] = [];
    while (plan.length < most && !s.ball.sunk) {
        const here = { ...s, course: still };
        const fan: { putt: GolfPutt; score: number }[] = [];
        for (let a = 0; a < 90; a++)
            for (let k = 0; k < 19; k++) {
                const putt = { wait: 0, pull: pullOf((a / 90) * Math.PI * 2, 0.8 + k * 0.4) },
                    after = tryPutt(here, putt);
                fan.push({ putt, score: after.ball.sunk ? -1 : far(after.ball.x, after.ball.y) });
            }
        fan.sort((x, y) => x.score - y.score);
        let best: { putt: GolfPutt; after: GolfState; score: number } | null = null;
        for (const { putt } of fan.slice(0, period ? 8 : 1)) {
            for (let wait = 0; wait <= period * 60; wait += 6) {
                const timed = { ...putt, wait },
                    after = tryPutt(s, timed),
                    score = after.ball.sunk ? -1 : far(after.ball.x, after.ball.y);
                if (!best || score < best.score) best = { putt: timed, after, score };
                if (after.ball.sunk || !period) break;
            }
            if (best?.after.ball.sunk) break;
        }
        if (!best || best.score >= far(s.ball.x, s.ball.y)) return null;
        plan.push(best.putt);
        s = best.after;
    }
    return s.ball.sunk ? plan : null;
}

/** Plays a plan through the game's own steps with a Pad, as a child would, and returns the end. */
export function playGolf(course: GolfCourse, plan: readonly GolfPutt[]): GolfState {
    let s = startGolf(course);
    for (const putt of plan) s = tryPutt(s, putt);
    return s;
}
