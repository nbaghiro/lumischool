// The yard's variations are the orders the wagons wait in. The solver plans the moves on the
// sidings as a puzzle, then plays each push through the real yard, and the pads it pressed replay to
// the same win, which is the game's replay witness.
import { configurationKey } from "../../engine/motion/configuration";
import { emptyPad, type Pad } from "../../engine/motion/pad";
import {
    LEAST,
    MOST,
    ORIGIN,
    PER,
    STEP,
    YARD_LEVELS,
    made,
    moving,
    pushableAt,
    startYard,
    stepYard,
    type YardState,
} from "./yard";

export interface YardConfiguration {
    phase: number;
    queue: string[];
}

/** The waiting orders a level can start from: as authored, reversed, and turned round by one and by two. */
export function yardConfigurations(phase: number): YardConfiguration[] {
    const L = YARD_LEVELS[phase];
    if (!L) return [];
    const q = L.queue,
        orders = [
            q,
            [...q].reverse(),
            [...q.slice(1), ...q.slice(0, 1)],
            [...q.slice(2), ...q.slice(0, 2)],
        ];
    return orders
        .filter(
            (o, i) =>
                o.join() !== L.order.join() && orders.findIndex((t) => t.join() === o.join()) === i,
        )
        .map((queue) => ({ phase, queue: [...queue] }));
}

export function yardChallenge(seed: number, phase: number): YardConfiguration {
    const pool = yardConfigurations(phase),
        c = pool[(seed >>> 0) % pool.length];
    if (!c) throw new Error("Unknown yard level");
    return c;
}

export function isYardConfiguration(value: unknown, phase: number): value is YardConfiguration {
    return yardConfigurations(phase).some((c) => configurationKey(c) === configurationKey(value));
}

export const openYardConfiguration = (c: YardConfiguration): YardState =>
    startYard(c.phase, c.queue);

/** A move on the sidings: send the front wagon into siding `k`, or the last of siding `k` back. */
export type Move = { push: number } | { back: number };

/**
 * The fewest moves that make the yard up, searched on the sidings alone: a siding is filled from its
 * buffer stop, the waiting line from its end. Null when there is no way in `most` moves.
 */
export function plan(s: YardState, most = 24): Move[] | null {
    const rooms = s.sidings.map((sd) => sd.room);
    const done = (queue: string[], sidings: string[][]) =>
        queue.length === 0 &&
        s.sidings.every((sd, k) => {
            const m = sidings[k] ?? [];
            if (sd.wants === "spare") return true;
            if (sd.wants === "order") return m.join() === s.order.join();
            return m.reduce((n, x) => n + Number(x), 0) === sd.wants;
        });
    type Node = { queue: string[]; sidings: string[][]; moves: Move[] };
    const start: Node = {
        queue: s.queue.map((w) => w.label),
        sidings: s.sidings.map((_, k) => made(s, k)),
        moves: [],
    };
    const key = (n: Node) => `${n.queue.join()}|${n.sidings.map((x) => x.join()).join("/")}`;
    const seen = new Set([key(start)]);
    let frontier = [start];
    for (let depth = 0; depth <= most && frontier.length; depth++) {
        const next: Node[] = [];
        for (const n of frontier) {
            if (done(n.queue, n.sidings)) return n.moves;
            n.sidings.forEach((m, k) => {
                const front = n.queue[0];
                if (front !== undefined && m.length < (rooms[k] ?? 0)) {
                    const sidings = n.sidings.map((x, j) => (j === k ? [...x, front] : x));
                    next.push({
                        queue: n.queue.slice(1),
                        sidings,
                        moves: [...n.moves, { push: k }],
                    });
                }
                const last = m.at(-1);
                if (last !== undefined) {
                    const sidings = n.sidings.map((x, j) => (j === k ? x.slice(0, -1) : x));
                    next.push({
                        queue: [...n.queue, last],
                        sidings,
                        moves: [...n.moves, { back: k }],
                    });
                }
            });
        }
        frontier = next.filter((n) => {
            const k = key(n);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }
    return null;
}

const idle = (): Pad => emptyPad();
const run = (s: YardState, p: Pad) =>
    stepYard(s, { ...p, pressed: [...p.pressed], holding: [...p.holding] });

/** Steps a pad sequence on a state, and says whether the state was won by its end. */
export function replay(s: YardState, pads: readonly Pad[]): boolean {
    for (const p of pads) run(s, p);
    return s.won;
}

/** How a way pushes: a finger pulled back from the wagon, or the keys stepping the push and space. */
export type By = "touch" | "keys";

function pointsPads(s: YardState, k: number): Pad[] {
    const n = k - s.points,
        key = n > 0 ? ("up" as const) : ("down" as const);
    return Array.from({ length: Math.abs(n) }, () => ({ ...idle(), pressed: [key] }));
}

/** The pads of one push of `power`, in whole presses of the keys or a finger's pull. */
function pushPads(s: YardState, power: number, by: By): Pad[] {
    if (by === "keys") {
        const n = Math.round((power - s.power) / STEP),
            key = n > 0 ? ("right" as const) : ("left" as const);
        return [
            ...Array.from({ length: Math.abs(n) }, () => ({ ...idle(), pressed: [key] })),
            { ...idle(), tapped: true },
        ];
    }
    const w = pushableAt(s);
    if (!w) return [];
    const at = { x: w.x + ORIGIN.x, y: w.y + ORIGIN.y },
        to = { x: at.x + power / PER, y: at.y };
    return [
        { ...idle(), touch: at },
        { ...idle(), touch: to },
        { ...idle(), lifted: to },
    ];
}

/** Runs the pads, then waits for the yard to be still; returns every pad stepped. */
function settle(s: YardState, pads: Pad[]): { pads: Pad[]; knocked: boolean } {
    const out = [...pads];
    let knocked = false;
    const go = (p: Pad) => {
        if (run(s, p).some((h) => "shake" in h)) knocked = true;
    };
    for (const p of pads) go(p);
    for (let i = 0; i < 60 * 20 && moving(s); i++) {
        out.push(idle());
        go(idle());
    }
    return { pads: out, knocked };
}

type Outcome = "couple" | "short" | "knock";

function tryPush(s: YardState, k: number, power: number, by: By) {
    const after = structuredClone(s),
        before = made(after, k).length,
        { pads, knocked } = settle(after, pushPads(after, power, by));
    const outcome: Outcome =
        made(after, k).length > before ? "couple" : knocked ? "knock" : "short";
    return { outcome, pads, after };
}

/** The pushes a hand can make, in steps of the keys. */
const POWERS = Array.from(
    { length: Math.floor((MOST - LEAST) / STEP) + 1 },
    (_, i) => LEAST + i * STEP,
);

/**
 * One wagon into siding `k`: the middle of the widest run of pushes that couple, so a hand a little
 * off still couples, or else the hardest push that stops short, and a nudge from there.
 */
function into(s: YardState, k: number, by: By): { pads: Pad[]; after: YardState } | null {
    let now = s;
    const pads: Pad[] = [];
    for (let tries = 0; tries < 6; tries++) {
        const outcomes = POWERS.map((p) => tryPush(now, k, p, by).outcome);
        let best: [number, number] | null = null;
        for (let i = 0; i < outcomes.length; i++) {
            if (outcomes[i] !== "couple") continue;
            let j = i;
            while (outcomes[j + 1] === "couple") j++;
            if (!best || j - i > best[1] - best[0]) best = [i, j];
            i = j;
        }
        if (best) {
            const t = tryPush(now, k, POWERS[Math.floor((best[0] + best[1]) / 2)] ?? LEAST, by);
            return { pads: [...pads, ...t.pads], after: t.after };
        }
        const short = outcomes.lastIndexOf("short");
        if (short < 0) return null;
        const t = tryPush(now, k, POWERS[short] ?? LEAST, by);
        pads.push(...t.pads);
        now = t.after;
    }
    return null;
}

/**
 * A way to make the yard up from `start`: the pads that set the points, push each wagon on and
 * send wagons back, as the plan says. Null when there is no plan or some push cannot couple.
 */
export function yardWay(start: YardState, { by = "keys" }: { by?: By } = {}): Pad[] | null {
    const moves = plan(start);
    if (!moves) return null;
    let s = structuredClone(start);
    const pads: Pad[] = [];
    for (const m of moves) {
        const k = "push" in m ? m.push : m.back;
        for (const p of pointsPads(s, k)) {
            pads.push(p);
            run(s, p);
        }
        if ("back" in m) {
            const press = [{ ...idle(), brake: true }, idle()];
            for (const p of press) run(s, p);
            pads.push(...press);
            continue;
        }
        const t = into(s, k, by);
        if (!t) return null;
        pads.push(...t.pads);
        s = t.after;
    }
    for (let i = 0; i < 5; i++) {
        pads.push(idle());
        run(s, idle());
    }
    return s.won ? pads : null;
}
