// The number machine: drop a numbered ball into the machine, and it turns the number into another by a
// rule nobody has told you.
//
// Numbered balls wait in a tray. The child taps one, or drags it, and it hops into the machine's
// funnel; the machine chugs, and a ball with the answer pops out of the chute and rolls to the order at
// the front of the line. If it is the number the order asks for, it drops in; if not, it bounces off,
// and what it showed is written in the table all the same. The mathematics is in the orders: to make
// 11 with a machine you have to work out what it does, and then what goes in to make 11. Nothing is in
// the hand but the choice of ball, so a wrong ball is always a wrong idea and costs nothing. See
// .docs/games.md.
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";
import { BEYOND, ground } from "./scenery";

/** A rule a machine might be using. Kept as data so an author can write one. */
export interface Rule {
    op: "add" | "mul" | "muladd";
    a: number;
    /** Only for muladd: the number added after multiplying. It may be negative. */
    b?: number;
}

const signed = (n: number): string => `${n < 0 ? "-" : "+"} ${Math.abs(n)}`;

export const label = (r: Rule): string =>
    r.op === "add" ? signed(r.a) : r.op === "mul" ? `× ${r.a}` : `× ${r.a} ${signed(r.b ?? 0)}`;

export const run = (r: Rule, n: number): number =>
    r.op === "add" ? n + r.a : r.op === "mul" ? n * r.a : n * r.a + (r.b ?? 0);

export interface MachineLevel extends ActionLevel {
    /** The machines in the order a ball goes through them, and whether each one's rule is shown. */
    machines: { rule: Rule; shown?: boolean }[];
    /** The numbers on the balls in the tray, left to right. */
    numbers: number[];
    /** What the orders ask for, front of the line first. */
    orders: number[];
    /** Balls that are lost from the tray, by number, so the easy guess is not there to try. */
    missing?: number[];
}

export const MACHINE_LEVELS: Levels<MachineLevel> = [
    {
        title: "The adding machine",
        grades: [3, 3],
        goal: "Drop balls into the machine and fill every order.",
        machines: [{ rule: { op: "add", a: 3 } }],
        numbers: [1, 2, 3, 4, 5, 6, 7, 8],
        orders: [7, 5, 10],
    },
    {
        title: "The doubling machine",
        grades: [3, 3],
        goal: "Work out what the machine does, then fill every order.",
        machines: [{ rule: { op: "mul", a: 2 } }],
        numbers: [1, 2, 3, 4, 5, 6, 7, 8],
        orders: [8, 14, 6],
    },
    {
        title: "A mixed-up tray",
        grades: [3, 4],
        goal: "The balls are mixed up. Read each number before you drop it in.",
        machines: [{ rule: { op: "add", a: 6 } }],
        numbers: [6, 2, 9, 4, 1, 7, 3, 8, 5],
        orders: [11, 8, 15],
    },
    {
        title: "No 1 ball",
        grades: [4, 4],
        goal: "The 1 ball is lost. Find the rule from the other numbers.",
        machines: [{ rule: { op: "muladd", a: 2, b: 1 } }],
        numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        orders: [7, 15, 11],
        missing: [1],
    },
    {
        title: "Two machines",
        grades: [4, 4],
        goal: "The second machine takes 2 away. Find what the first one does.",
        machines: [{ rule: { op: "mul", a: 3 } }, { rule: { op: "add", a: -2 }, shown: true }],
        numbers: [1, 2, 3, 4, 5, 6, 7, 8],
        orders: [10, 19, 4],
    },
    {
        title: "Mixed up, and no 3",
        grades: [4, 4],
        goal: "The balls are mixed up and the 3 is lost. Find the rule and fill every order.",
        machines: [{ rule: { op: "muladd", a: 3, b: -1 } }],
        numbers: [9, 4, 7, 2, 10, 6, 3, 8, 5],
        orders: [14, 26, 20],
        missing: [3],
    },
];

const RATE = 60,
    DT = 1 / RATE;
const H = 28,
    FLOOR = 26;
/** The top of the tray the balls sit on, a ball's radius, and how big a ball in the tray is drawn, in squares. */
const TRAY = 9,
    R = 0.65,
    BALL = 2;
/** Where the first ball sits in the tray, and the squares from one ball to the next. */
const FIRST = 2.4,
    GAP = 2.3;
/** The machine drawing's own size, how big it is drawn here, and its anchors in its own squares. */
const MACHINE = {
    w: 17,
    drawn: 13,
    hopper: { x: 4.5, y: 0.6 },
    spout: { x: 11.5, y: 12.2 },
    lip: { x: 16.6, y: 13.9 },
    foot: 14.6,
};
const K = MACHINE.drawn / MACHINE.w;
/** How far apart the machines and the order cups stand. */
const MACHINE_STEP = 14,
    CUP_STEP = 4.6;

/**
 * The pace of a turn, in seconds, and the speed a ball rolls out at, in squares a second: a ball
 * dropped, worked and judged takes about two seconds, so trying an idea is quick.
 */
export const MACHINE_TUNING = {
    hop: 0.55,
    work: 0.5,
    carry: 20,
    judge: 0.3,
};

type Phase = "pick" | "hop" | "work" | "out" | "judge" | "won";

export interface MachineState {
    level: number;
    L: MachineLevel;
    phase: Phase;
    /** Seconds in this phase. */
    t: number;
    /** The ball the keys have chosen, by its place in the tray. */
    pick: number;
    /** Whether the keys have been used, so the choice is ringed. */
    keyed: boolean;
    /** A ball held by a finger, by its place in the tray, and where the finger is. */
    grab: { slot: number; at: Pt } | null;
    /** Where the ball in play left from, on its hop to the funnel. */
    from: Pt;
    /** The number dropped in last. */
    fed: number | null;
    /** The machine working on the ball now, and the number the ball carries. */
    stage: number;
    value: number;
    /** Every number dropped in and what came out of the last machine. */
    seen: [number, number][];
    done: number;
    /** The step the last order was filled on, for its cup's little jump. */
    filledAt: number;
    /** Whether the last ball out was what its order wanted. */
    hit: boolean;
    rejects: number;
    drops: number;
    said: string;
    touched: boolean;
    steps: number;
}

/** Where ball `j` sits in the tray, and where the tray ends. */
export const slotAt = (j: number): Pt => ({ x: FIRST + j * GAP, y: TRAY - BALL / 2 });
const trayEnd = (L: MachineLevel) => FIRST + (L.numbers.length - 1) * GAP + 1.4;

/** Machine `i`'s top left: past the end of the tray, then one after another. */
const machineAt = (L: MachineLevel, i: number): Pt => ({
    x: Math.max(22, Math.ceil(trayEnd(L) + 4)) + i * MACHINE_STEP,
    y: FLOOR - MACHINE.foot * K,
});
const on = (m: Pt, p: Pt): Pt => ({ x: m.x + p.x * K, y: m.y + p.y * K });
const worldOf = (L: MachineLevel) => {
    const last = on(machineAt(L, L.machines.length - 1), MACHINE.lip);
    const first = last.x + 4.2;
    return { w: Math.ceil(first + CUP_STEP * (L.orders.length - 1) + 4), h: H, cup: first };
};
const cupAt = (L: MachineLevel, k: number): Pt => ({
    x: worldOf(L).cup + CUP_STEP * k,
    y: FLOOR - 1.2,
});

/** What the machines make of a number, one after another. */
export const through = (L: MachineLevel, n: number): number =>
    L.machines.reduce((v, m) => run(m.rule, v), n);

/** Whether ball `j` is in the tray: there is a ball at that place and it is not lost. */
export const inTray = (L: MachineLevel, j: number): boolean => {
    const n = L.numbers[j];
    return n !== undefined && !L.missing?.includes(n);
};

export function startMachine(L: MachineLevel, level: number): MachineState {
    const first = L.numbers.findIndex((_, j) => inTray(L, j));
    return {
        level,
        L,
        phase: "pick",
        t: 0,
        pick: Math.max(0, first),
        keyed: false,
        grab: null,
        from: slotAt(0),
        fed: null,
        stage: 0,
        value: 0,
        seen: [],
        done: 0,
        filledAt: -1000,
        hit: false,
        rejects: 0,
        drops: 0,
        said: "Tap a ball to drop it into the machine, and watch what comes out.",
        touched: false,
        steps: 0,
    };
}

/** The way a ball travels out of machine `i`: into the next one's hopper, or down to the order at the front. */
function outPath(s: MachineState, i: number): Pt[] {
    const m = machineAt(s.L, i),
        spout = on(m, MACHINE.spout),
        lip = on(m, MACHINE.lip);
    const next = s.L.machines[i + 1] ? on(machineAt(s.L, i + 1), MACHINE.hopper) : null;
    if (next)
        return [
            spout,
            lip,
            { x: lip.x + 0.6, y: next.y - 2 },
            { x: next.x, y: next.y - 2 },
            { x: next.x, y: next.y + 0.4 },
        ];
    const rail = FLOOR - R,
        cup = cupAt(s.L, s.done);
    const want = s.L.orders[s.done];
    return want === s.value
        ? [
              spout,
              lip,
              { x: lip.x + 0.8, y: rail },
              { x: cup.x, y: rail - 1.4 },
              { x: cup.x, y: cup.y },
          ]
        : [
              spout,
              lip,
              { x: lip.x + 0.8, y: rail },
              { x: cup.x - 1.9, y: rail },
              { x: cup.x - 3.6, y: rail },
          ];
}

const lengthOfPath = (p: Pt[]): number =>
    p.reduce((sum, q, k) => {
        const a = p[k - 1];
        return a ? sum + Math.hypot(q.x - a.x, q.y - a.y) : sum;
    }, 0);

/** The point `d` squares along a path. */
function along(p: Pt[], d: number): Pt {
    let left = d;
    for (let k = 1; k < p.length; k++) {
        const a = p[k - 1],
            b = p[k];
        if (!a || !b) continue;
        const seg = Math.hypot(b.x - a.x, b.y - a.y);
        if (left <= seg) {
            const u = seg ? left / seg : 1;
            return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
        }
        left -= seg;
    }
    return p[p.length - 1] ?? { x: 0, y: 0 };
}

/** Where a ball on its hop from `from` to the funnel is, `u` of the way there: an arc that clears the funnel's rim. */
function hopAt(s: MachineState, u: number): Pt {
    const to = on(machineAt(s.L, 0), MACHINE.hopper);
    // a straight line between the ends, lifted by a parabola that is 3.5 squares high halfway
    return {
        x: s.from.x + (to.x - s.from.x) * u,
        y: s.from.y + (to.y - s.from.y) * u - 14 * u * (1 - u),
    };
}

function tell(s: MachineState, text: string): void {
    s.said = text;
}

function enter(s: MachineState, phase: Phase): void {
    s.phase = phase;
    s.t = 0;
}

const ready = (s: MachineState): boolean => s.phase === "pick" || s.phase === "judge";

/** The next ball in the tray from `j` in direction `d`, skipping lost ones, or `j` when there is none. */
function nextBall(L: MachineLevel, j: number, d: 1 | -1): number {
    for (let k = j + d; k >= 0 && k < L.numbers.length; k += d) if (inTray(L, k)) return k;
    return j;
}

/** The tray place under `p`, within a ball and a half, or null. */
function ballUnder(L: MachineLevel, p: Pt): number | null {
    let best: number | null = null,
        near = GAP / 2 + 0.2;
    L.numbers.forEach((_, j) => {
        if (!inTray(L, j)) return;
        const at = slotAt(j),
            d = Math.hypot(p.x - at.x, p.y - at.y);
        if (d < near) {
            near = d;
            best = j;
        }
    });
    return best;
}

/** Drops the ball at tray place `j` into the machine, from `from`. */
function drop(s: MachineState, j: number, from: Pt, out: Happening[]): void {
    const n = s.L.numbers[j];
    if (n === undefined || !inTray(s.L, j) || !ready(s)) return;
    s.touched = true;
    s.fed = n;
    s.value = n;
    s.stage = 0;
    s.from = from;
    s.drops++;
    s.pick = j;
    enter(s, "hop");
    out.push({ cue: "lift" });
    tell(s, `In goes ${n}.`);
}

function hands(s: MachineState, pad: Pad, out: Happening[]): void {
    for (const d of pad.pressed) {
        if (d === "left" || d === "right") {
            s.keyed = true;
            s.touched = true;
            s.pick = nextBall(s.L, s.pick, d === "left" ? -1 : 1);
        }
    }
    if (pad.tapped && ready(s)) {
        s.keyed = true;
        drop(s, s.pick, slotAt(s.pick), out);
    }
    if (pad.touch) {
        if (!s.grab && ready(s)) {
            const j = ballUnder(s.L, pad.touch);
            if (j !== null) s.grab = { slot: j, at: { ...pad.touch } };
        } else if (s.grab) s.grab.at = { ...pad.touch };
    }
    if (pad.lifted && s.grab) {
        const g = s.grab;
        s.grab = null;
        // a tap drops from the tray; a drag drops from wherever the finger let go
        const moved = Math.hypot(pad.lifted.x - slotAt(g.slot).x, pad.lifted.y - slotAt(g.slot).y);
        drop(s, g.slot, moved > 1 ? { ...pad.lifted } : slotAt(g.slot), out);
    }
}

function step(s: MachineState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    s.t += DT;
    const T = MACHINE_TUNING;
    hands(s, pad, out);
    switch (s.phase) {
        case "pick":
            break;
        case "hop":
            if (s.t < T.hop) break;
            enter(s, "work");
            {
                const hop = on(machineAt(s.L, 0), MACHINE.hopper);
                out.push({ cue: "ring" }, { puff: { x: hop.x, y: hop.y, n: 5 } });
            }
            break;
        case "work": {
            if (s.t < T.work) break;
            const m = s.L.machines[s.stage];
            if (m) s.value = run(m.rule, s.value);
            enter(s, "out");
            const spout = on(machineAt(s.L, s.stage), MACHINE.spout);
            out.push(
                { cue: "level" },
                { burst: { kind: "sparkle", x: spout.x, y: spout.y, n: 6, dir: 0 } },
            );
            break;
        }
        case "out":
            if (s.t * T.carry < lengthOfPath(outPath(s, s.stage))) break;
            if (s.stage + 1 < s.L.machines.length) {
                s.stage++;
                enter(s, "work");
                out.push({ cue: "ring" });
                break;
            }
            judge(s, out);
            break;
        case "judge":
            if (s.t < T.judge) break;
            if (s.done < s.L.orders.length) {
                enter(s, "pick");
                break;
            }
            enter(s, "won");
            {
                const cup = cupAt(s.L, s.L.orders.length - 1);
                out.push(
                    { cue: "win" },
                    { burst: { kind: "sparkle", x: cup.x, y: cup.y - 2, n: 16 } },
                );
                tell(
                    s,
                    s.L.machines.length === 1
                        ? `Every order is filled. The machine was doing ${label(s.L.machines[0]?.rule ?? { op: "add", a: 0 })}.`
                        : "Every order is filled, and now you can see what each machine does.",
                );
            }
            break;
        case "won":
            break;
    }
    return out;
}

function judge(s: MachineState, out: Happening[]): void {
    const fed = s.fed ?? 0,
        want = s.L.orders[s.done];
    s.seen.push([fed, s.value]);
    enter(s, "judge");
    s.hit = want === s.value;
    if (s.hit) {
        const cup = cupAt(s.L, s.done);
        s.done++;
        s.filledAt = s.steps;
        out.push(
            { cue: "place" },
            { burst: { kind: "sparkle", x: cup.x, y: cup.y - 1, n: 12 } },
            { burst: { kind: "splash", x: cup.x, y: cup.y - 1, n: 6 } },
        );
        const next = s.L.orders[s.done];
        tell(
            s,
            next === undefined
                ? `${fed} made ${s.value}. That was the last order.`
                : `${fed} made ${s.value}, just what the order wanted. The next one wants ${next}.`,
        );
        return;
    }
    s.rejects++;
    out.push({ cue: "nope" });
    tell(s, `${fed} made ${s.value}, and the order wants ${want ?? 0}. It is in the table now.`);
}

/** Whether a ball is on its way, so reduced motion keeps stepping until it has landed. */
const moving = (s: MachineState): boolean => s.phase !== "pick" && s.phase !== "won";

/** Where the ball in play is drawn, if one is, and how far it has bounced up off the rail. */
function ballAt(s: MachineState): Pt | null {
    const T = MACHINE_TUNING;
    switch (s.phase) {
        case "pick":
        case "work":
        case "won":
            return null;
        case "hop":
            return hopAt(s, Math.min(1, s.t / T.hop));
        case "out": {
            const p = along(outPath(s, s.stage), s.t * T.carry);
            // it pops out of the chute with a little bounce that dies away
            const last = s.stage === s.L.machines.length - 1;
            const bounce = last ? Math.abs(Math.sin(s.t * 14)) * 0.7 * Math.exp(-s.t * 5) : 0;
            return { x: p.x, y: p.y - bounce };
        }
        case "judge": {
            const p = outPath(s, s.stage);
            return s.hit ? null : along(p, lengthOfPath(p));
        }
    }
}

function frame(s: MachineState, rest = false): Frame {
    const L = s.L,
        W = worldOf(L),
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    sprites.push(...ground("floor", -BEYOND, W.w + BEYOND, FLOOR, 0, 3));
    // the tray: a board the balls sit on, with a lip at its end
    const end = trayEnd(L);
    sprites.push({
        key: "track",
        art: "marblerun",
        params: { part: "ramp", w: Math.round(end - 1.6), h: 1, label: "", colour: "sky" },
        size: end - 1.6,
        x: (end + 1.6) / 2,
        y: TRAY + 0.5,
        z: 1,
        still: true,
    });
    const inPlay = s.phase === "hop" ? s.pick : null;
    L.numbers.forEach((n, j) => {
        if (!inTray(L, j) || j === inPlay) return;
        const held = s.grab?.slot === j ? s.grab.at : null,
            at = held ?? slotAt(j);
        sprites.push({
            key: `tray:${j}`,
            art: "numberball",
            params: { n: String(n), tone: "sky" },
            size: BALL,
            x: at.x,
            y: at.y,
            z: held ? 7 : 3,
            scale: held ? 1.15 : 1,
        });
    });
    if (s.keyed && ready(s) && !rest) {
        const at = slotAt(s.pick);
        marks.push({ kind: "ring", x: at.x, y: at.y, r: BALL / 2 + 0.35, on: true });
    }
    L.machines.forEach((m, i) => {
        const at = machineAt(L, i),
            working = s.stage === i && s.phase === "work" && !rest,
            // the machine gives a little chug while it works
            chug = working ? Math.sin(s.t * 40) * 0.08 : 0;
        sprites.push({
            key: `machine:${i}`,
            art: "rulemachine",
            params: {
                rule: m.shown || s.phase === "won" ? label(m.rule) : "",
                pull: working && s.t < MACHINE_TUNING.work / 2 ? 1 : 0,
                turn: working ? Math.min(1, s.t / MACHINE_TUNING.work) : 0,
                lit: s.phase === "won",
            },
            size: MACHINE.drawn,
            x: at.x + MACHINE.drawn / 2,
            y: at.y + (15 * K) / 2,
            z: 4,
            squash: chug,
            live: true,
        });
        const next = L.machines[i + 1] ? on(machineAt(L, i + 1), MACHINE.hopper) : null;
        if (next) {
            const lip = on(at, MACHINE.lip);
            marks.push(
                { kind: "line", a: lip, b: { x: lip.x + 0.6, y: next.y - 2 }, style: "rod" },
                {
                    kind: "line",
                    a: { x: lip.x + 0.6, y: next.y - 2 },
                    b: { x: next.x, y: next.y - 2 },
                    style: "rod",
                },
            );
        }
    });
    const since = (s.steps - s.filledAt) * DT;
    L.orders.forEach((n, k) => {
        const c = cupAt(L, k),
            // a cup just filled jumps, and the one now at the front gives a little wiggle
            jump =
                !rest && k === s.done - 1 && since < 0.45 ? Math.sin((since / 0.45) * Math.PI) : 0,
            wiggle =
                !rest && k === s.done && s.done > 0 && since < 0.6
                    ? Math.sin(since * 30) * 0.12 * (1 - since / 0.6)
                    : 0;
        sprites.push({
            key: `order:${k}`,
            art: "marblerun",
            params: {
                part: "cup",
                w: 3,
                h: 3,
                label: String(n),
                colour: k < s.done ? "mint" : "berry",
            },
            size: 3,
            x: c.x,
            y: FLOOR - 1.5 - jump * 0.8,
            angle: wiggle,
            scale: 1 + jump * 0.12,
            z: 3,
        });
        if (k < s.done)
            sprites.push({
                key: `filled:${k}`,
                art: "numberball",
                params: { n: String(n), tone: "mint" },
                size: 1.3,
                x: c.x,
                y: c.y - 0.2 - jump * 0.8,
                z: 5,
            });
    });
    if (s.phase !== "won" && s.done < L.orders.length) {
        const c = cupAt(L, s.done);
        marks.push({ kind: "ring", x: c.x, y: FLOOR - 1.6, r: 2.1, on: true });
    }
    const b = rest ? null : ballAt(s);
    if (b)
        sprites.push({
            key: "ball",
            art: "numberball",
            params: {
                n: s.phase === "hop" ? String(s.fed ?? "") : String(s.value),
                tone: s.phase === "hop" ? "sky" : "glow",
            },
            size: 1.3,
            x: b.x,
            y: b.y,
            z: 6,
            live: true,
        });
    // the table of what has gone in and what came out, the latest five
    const rows = s.seen.slice(-5);
    sprites.push({
        key: "table",
        art: "inout",
        params: {
            rule:
                s.phase === "won" && L.machines.length === 1
                    ? label(L.machines[0]?.rule ?? { op: "add", a: 0 })
                    : "",
            rows: rows.length ? rows : [[0, 0]],
            blanks: rows.length ? [] : [0],
        },
        size: 10,
        x: 8,
        y: 12 + ((Math.max(1, rows.length) * 2 + 6) * (10 / 13)) / 2,
        z: 3,
        live: true,
    });
    return {
        sprites,
        marks,
        camera: { x: W.w / 2, y: H / 2, zoom: 1 },
        view: { w: W.w, h: H },
        world: { w: W.w, h: H },
    };
}

function say(s: MachineState): string {
    const L = s.L,
        parts: string[] = [];
    const lost = L.missing?.length ? ` The ${L.missing.join(" and ")} ball is lost.` : "";
    parts.push(
        `The tray holds balls numbered ${L.numbers.filter((_, j) => inTray(L, j)).join(", ")}.${lost}`,
    );
    const shown = L.machines.flatMap((m, i) =>
        m.shown ? [`machine ${i + 1} does ${label(m.rule)}`] : [],
    );
    if (shown.length) parts.push(`${shown.join(", ")}.`);
    parts.push(
        s.seen.length
            ? `So far: ${s.seen.map(([a, b]) => `${a} made ${b}`).join(", ")}.`
            : "Nothing has gone in yet.",
    );
    const want = L.orders[s.done];
    parts.push(
        want === undefined
            ? "Every order is filled."
            : `${s.done} of ${L.orders.length} orders filled. The next order wants ${want}.`,
    );
    if (ready(s) && want !== undefined) parts.push(`Ball ${L.numbers[s.pick] ?? ""} is chosen.`);
    return parts.join(" ");
}

export const ruleGame: ActionGame<MachineState> = {
    id: "rule",
    title: "The number machine",
    group: "action",
    levels: MACHINE_LEVELS,
    rate: RATE,
    cover: { art: "rulemachine", params: { rule: "", pull: 0, turn: 0, lit: false } },
    hint: "Tap a ball, or drag it, to drop it into the machine. With the keys, left and right choose a ball and space drops it in.",
    // the buttons under the machine do what the keys do, for a switch or a player who prefers them
    controls: { arrows: { left: "Ball before", right: "Ball after" }, go: "Drop" },
    touch: true,
    start: (level) => startMachine(MACHINE_LEVELS[level] ?? MACHINE_LEVELS[0], level),
    step,
    frame,
    say,
    note: (s) => s.said,
    won: (s) => s.phase === "won",
    objectives: (s) => ({ completed: s.done, total: s.L.orders.length }),
    cancelInput: (s) => {
        s.grab = null;
    },
    still: { press: () => 1, settling: moving },
};
