// The number machine: roll a ball into a numbered pocket, and the machine turns its number into
// another by a rule nobody has told you.
//
// A ball waits at the end of a track with numbered pockets along it. The child pulls it back and
// lets go, and it rolls: friction slows it, a hump sends a slow ball back, a stone covers a pocket,
// and it drops into the first pocket it is slow enough to fall into. That number goes up the pipe and
// into the machine, and a ball with the answer rolls out towards the order at the front of the line.
// If it is the number the order asks for, it drops in; if not, it bounces back, and what it showed is
// written in the table all the same. The mathematics is in the orders: to make 11 with a machine you
// have to work out what it does, and then what goes in to make 11. A wrong ball costs nothing but the
// roll. See .docs/games.md.
import { aimAt, stepAim, type Aim, type AimSpec } from "../../engine/motion/aim";
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
    /** The numbers on the pockets, left to right. */
    numbers: number[];
    /** What the orders ask for, front of the line first. */
    orders: number[];
    /** Pockets a stone lies over, by number, so no ball falls into them. */
    stones?: number[];
    /** A hump in the track after each of these pockets, by number. */
    humps?: number[];
    /** How much of the ball's path is dotted in while it is pulled back. */
    preview: "full" | "short" | "none";
}

export const MACHINE_LEVELS: Levels<MachineLevel> = [
    {
        title: "The adding machine",
        grades: [3, 3],
        goal: "Roll balls into the machine and fill every order.",
        machines: [{ rule: { op: "add", a: 3 } }],
        numbers: [1, 2, 3, 4, 5, 6, 7, 8],
        orders: [7, 5, 10],
        preview: "full",
    },
    {
        title: "The doubling machine",
        grades: [3, 3],
        goal: "Work out what the machine does, then fill every order.",
        machines: [{ rule: { op: "mul", a: 2 } }],
        numbers: [1, 2, 3, 4, 5, 6, 7, 8],
        orders: [8, 14, 6],
        preview: "full",
    },
    {
        title: "Over the hump",
        grades: [3, 4],
        goal: "Roll hard enough to get over the hump when you need a bigger number.",
        machines: [{ rule: { op: "add", a: 6 } }],
        numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        orders: [11, 8, 15],
        humps: [4],
        preview: "short",
    },
    {
        title: "A stone on the 1",
        grades: [4, 4],
        goal: "A stone covers the 1. Find the rule from the other numbers.",
        machines: [{ rule: { op: "muladd", a: 2, b: 1 } }],
        numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        orders: [7, 15, 11],
        stones: [1],
        preview: "short",
    },
    {
        title: "Two machines",
        grades: [4, 4],
        goal: "The second machine takes 2 away. Find what the first one does.",
        machines: [{ rule: { op: "mul", a: 3 } }, { rule: { op: "add", a: -2 }, shown: true }],
        numbers: [1, 2, 3, 4, 5, 6, 7, 8],
        orders: [10, 19, 4],
        preview: "short",
    },
    {
        title: "The long track",
        grades: [4, 4],
        goal: "No dotted path this time. Find the rule and fill every order.",
        machines: [{ rule: { op: "muladd", a: 3, b: -1 } }],
        numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        orders: [14, 26, 20],
        stones: [3],
        humps: [5],
        preview: "none",
    },
];

const RATE = 60,
    DT = 1 / RATE;
const H = 28,
    FLOOR = 26;
/** The top of the track the ball rolls along, and the ball's radius, in squares. */
const TRACK = 9,
    R = 0.65;
/** Where the ball waits to be pulled, the first pocket, and the squares from one pocket to the next. */
const START = 4.4,
    FIRST = 6.6,
    GAP = 1.8,
    /** A pocket catches a ball within this of its middle. */
    CATCH_WIDTH = 0.85,
    /** Squares a hump takes up, how high it rises, and the flat after it where a ball off it slows. */
    HUMP = { w: 2.6, h: 0.55, runout: 3 };
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
/** How far apart the machines and the order cups stand, and how long the machine works. */
const MACHINE_STEP = 14,
    CUP_STEP = 4.6,
    WORK = 1.2;

export const MACHINE_TUNING = {
    /** Squares a second, each second, that the track's friction takes off a rolling ball. */
    friction: 2.6,
    /** A ball slower than this, in squares a second, drops into a pocket it is over. */
    catch: 1.1,
    /** Squares a second, each second, that a hump's slope gives or takes. */
    slope: 16,
    /** Squares a second the ball travels along the pipes and the rail. */
    carry: 12,
};

export const FEED: AimSpec = {
    min: 2,
    max: 11,
    per: 2.6,
    dead: 0.35,
    lo: 0,
    hi: 0,
    turn: 0,
    ramp: 3.5,
    turns: "up",
};

type Phase = "aim" | "roll" | "lift" | "work" | "out" | "judge" | "won";

export interface MachineState {
    level: number;
    L: MachineLevel;
    phase: Phase;
    /** Seconds in this phase. */
    t: number;
    aim: Aim;
    /** The ball on the track while it rolls, or null. */
    ball: { x: number; v: number } | null;
    /** The pocket the last ball fell into, by number. */
    fed: number | null;
    /** The machine working on the ball now, and the number the ball carries. */
    stage: number;
    value: number;
    /** Every number fed and what came out of the last machine. */
    seen: [number, number][];
    done: number;
    /** Whether the last ball out was what its order wanted. */
    hit: boolean;
    rejects: number;
    rolls: number;
    said: string;
    touched: boolean;
    steps: number;
}

/** Where each pocket is along the track, in squares, and where each hump starts. */
export function trackOf(L: MachineLevel): { pockets: number[]; humps: number[]; wall: number } {
    const pockets: number[] = [],
        humps: number[] = [];
    let x = FIRST;
    for (const n of L.numbers) {
        pockets.push(x);
        x += GAP;
        if (L.humps?.includes(n)) {
            humps.push(x - GAP / 2 + 0.1);
            x += HUMP.w + HUMP.runout;
        }
    }
    return { pockets, humps, wall: x - GAP + 1.4 };
}

/** Machine `i`'s top left: past the end of the track, then one after another. */
const machineAt = (L: MachineLevel, i: number): Pt => ({
    x: Math.max(22, Math.ceil(trackOf(L).wall + 4)) + i * MACHINE_STEP,
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

/** The slope under the ball at `x`, as the push it gives: back towards the start going up a hump, and on going down. */
function slopeAt(humps: number[], x: number): number {
    for (const a of humps) {
        if (x < a || x > a + HUMP.w) continue;
        const up = x < a + HUMP.w / 2;
        return (up ? -1 : 1) * MACHINE_TUNING.slope * ((2 * HUMP.h) / HUMP.w);
    }
    return 0;
}

/** How high the track is at `x`: level, or up over a hump. */
function heightAt(humps: number[], x: number): number {
    for (const a of humps) {
        if (x < a || x > a + HUMP.w) continue;
        return HUMP.h * Math.sin(((x - a) / HUMP.w) * Math.PI);
    }
    return 0;
}

type Rolled = "rolling" | "bump" | "stopped" | "home" | { pocket: number };

/** One step of a ball on the track. */
export function rollStep(
    L: MachineLevel,
    track: ReturnType<typeof trackOf>,
    b: { x: number; v: number },
): Rolled {
    const f = MACHINE_TUNING.friction * DT;
    b.v = Math.abs(b.v) <= f ? 0 : b.v - Math.sign(b.v) * f;
    b.v += slopeAt(track.humps, b.x) * DT;
    b.x += b.v * DT;
    if (b.x > track.wall - R) {
        b.x = track.wall - R;
        b.v = -0.45 * Math.abs(b.v);
        return "bump";
    }
    if (Math.abs(b.v) <= MACHINE_TUNING.catch && slopeAt(track.humps, b.x) === 0) {
        const j = track.pockets.findIndex((p) => Math.abs(b.x - p) <= CATCH_WIDTH);
        const n = L.numbers[j];
        if (n !== undefined && !L.stones?.includes(n)) return { pocket: n };
        if (b.v === 0) return "stopped";
    }
    if (b.x < START - 0.8 && b.v < 0) return "home";
    return "rolling";
}

/** Where a ball let go at `power` ends up, and the dots of its way there, as the preview draws them. */
export function predict(L: MachineLevel, power: number): { pocket: number | null; dots: Pt[] } {
    const track = trackOf(L),
        b = { x: START, v: power },
        dots: Pt[] = [];
    for (let i = 0; i < RATE * 20; i++) {
        const r = rollStep(L, track, b);
        if (i % 6 === 0) dots.push({ x: b.x, y: TRACK - R - heightAt(track.humps, b.x) });
        if (typeof r === "object") return { pocket: r.pocket, dots };
        if (r === "stopped" || r === "home") return { pocket: null, dots };
    }
    return { pocket: null, dots };
}

export function startMachine(L: MachineLevel, level: number): MachineState {
    return {
        level,
        L,
        phase: "aim",
        t: 0,
        aim: aimAt(0, 4),
        ball: null,
        fed: null,
        stage: 0,
        value: 0,
        seen: [],
        done: 0,
        hit: false,
        rejects: 0,
        rolls: 0,
        said: "Pull the ball back and let go. It drops into the first pocket it is slow enough for.",
        touched: false,
        steps: 0,
    };
}

/** The way a ball travels from the pocket it fell into up to the first machine's hopper. */
function liftPath(s: MachineState): Pt[] {
    const track = trackOf(s.L),
        j = s.L.numbers.indexOf(s.fed ?? -1),
        x = track.pockets[j] ?? FIRST,
        hop = on(machineAt(s.L, 0), MACHINE.hopper);
    return [
        { x, y: TRACK + 0.2 },
        { x, y: 5 },
        { x: hop.x, y: 5 },
        { x: hop.x, y: hop.y + 0.4 },
    ];
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

function tell(s: MachineState, text: string): void {
    s.said = text;
}

function enter(s: MachineState, phase: Phase): void {
    s.phase = phase;
    s.t = 0;
}

function stepAiming(s: MachineState, pad: Pad, out: Happening[]): void {
    if (pad.pull || pad.pressed.length || pad.holding.length) s.touched = true;
    const v = stepAim(s.aim, pad, FEED, DT);
    if (!v) return;
    s.touched = true;
    s.ball = { x: START, v: v.x };
    s.rolls++;
    enter(s, "roll");
    out.push({ cue: "lift" });
}

function stepRolling(s: MachineState, out: Happening[]): void {
    const b = s.ball;
    if (!b) return enter(s, "aim");
    const r = rollStep(s.L, trackOf(s.L), b);
    if (r === "bump") out.push({ cue: "bump" });
    if (r === "stopped" || r === "home") {
        s.ball = null;
        enter(s, "aim");
        out.push({ cue: "back" });
        tell(
            s,
            r === "home"
                ? "The ball rolled back to you. Pull harder to get it over."
                : "The ball stopped on the stone. Pull again.",
        );
        return;
    }
    if (typeof r === "object") {
        s.fed = r.pocket;
        s.value = r.pocket;
        s.stage = 0;
        s.ball = null;
        enter(s, "lift");
        out.push({ cue: "place" });
        tell(s, `In goes ${r.pocket}.`);
    }
}

function step(s: MachineState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    s.t += DT;
    const carry = MACHINE_TUNING.carry;
    switch (s.phase) {
        case "aim":
            stepAiming(s, pad, out);
            break;
        case "roll":
            stepRolling(s, out);
            break;
        case "lift":
            if (s.t * carry >= lengthOfPath(liftPath(s))) {
                enter(s, "work");
                out.push({ cue: "ring" });
            }
            break;
        case "work": {
            if (s.t < WORK) break;
            const m = s.L.machines[s.stage];
            if (m) s.value = run(m.rule, s.value);
            enter(s, "out");
            out.push({ cue: "level" });
            break;
        }
        case "out":
            if (s.t * carry < lengthOfPath(outPath(s, s.stage))) break;
            if (s.stage + 1 < s.L.machines.length) {
                s.stage++;
                enter(s, "work");
                out.push({ cue: "ring" });
                break;
            }
            judge(s, out);
            break;
        case "judge":
            if (s.t < 0.5) break;
            if (s.done < s.L.orders.length) {
                enter(s, "aim");
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
        out.push({ cue: "place" }, { burst: { kind: "sparkle", x: cup.x, y: cup.y - 1, n: 8 } });
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
const moving = (s: MachineState): boolean => s.phase !== "aim" && s.phase !== "won";

/** Where the ball in play is drawn, if one is. */
function ballAt(s: MachineState): Pt | null {
    const carry = MACHINE_TUNING.carry;
    const track = trackOf(s.L);
    switch (s.phase) {
        case "aim":
            return { x: START, y: TRACK - R };
        case "roll":
            return s.ball ? { x: s.ball.x, y: TRACK - R - heightAt(track.humps, s.ball.x) } : null;
        case "lift":
            return along(liftPath(s), s.t * carry);
        case "work":
            return null;
        case "out":
            return along(outPath(s, s.stage), s.t * carry);
        case "judge": {
            const p = outPath(s, s.stage);
            return s.hit ? null : along(p, lengthOfPath(p));
        }
        case "won":
            return null;
    }
}

function frame(s: MachineState): Frame {
    const L = s.L,
        W = worldOf(L),
        track = trackOf(L),
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    sprites.push(...ground("floor", -BEYOND, W.w + BEYOND, FLOOR, 0, 3));
    // the track: a board under the pockets, the humps drawn over it, and a stop at its end
    sprites.push({
        key: "track",
        art: "marblerun",
        params: { part: "ramp", w: Math.round(track.wall - 1.6), h: 1, label: "", colour: "sky" },
        size: track.wall - 1.6,
        x: (track.wall + 1.6) / 2,
        y: TRACK + 0.5,
        z: 1,
        still: true,
    });
    sprites.push({
        key: "stop",
        art: "marblerun",
        params: { part: "wall", w: 1, h: 2, label: "", colour: "sky" },
        size: 0.8,
        x: track.wall + 0.3,
        y: TRACK - 0.6,
        z: 2,
        still: true,
    });
    for (const a of track.humps)
        marks.push({
            kind: "line",
            a: { x: a, y: TRACK },
            b: { x: a + HUMP.w, y: TRACK },
            bend: HUMP.h,
            style: "ink",
        });
    L.numbers.forEach((n, j) => {
        const x = track.pockets[j] ?? 0;
        sprites.push({
            key: `pocket:${n}`,
            art: "marblerun",
            params: { part: "cup", w: 2, h: 3, label: String(n), colour: "tang" },
            size: 1.6,
            x,
            y: TRACK + 1.9,
            z: 2,
            still: true,
        });
        if (L.stones?.includes(n))
            sprites.push({
                key: `stone:${n}`,
                art: "slingweight",
                size: 1.5,
                seed: 7 + n,
                x,
                y: TRACK - 0.55,
                z: 3,
                still: true,
            });
    });
    // the pipe from the track up and over to the first machine's hopper
    const hop = on(machineAt(L, 0), MACHINE.hopper);
    marks.push(
        { kind: "line", a: { x: FIRST - 1, y: 5 }, b: { x: hop.x, y: 5 }, style: "rod" },
        { kind: "line", a: { x: hop.x, y: 5 }, b: { x: hop.x, y: hop.y - 0.2 }, style: "rod" },
    );
    L.machines.forEach((m, i) => {
        const at = machineAt(L, i),
            working = s.stage === i && s.phase === "work";
        sprites.push({
            key: `machine:${i}`,
            art: "rulemachine",
            params: {
                rule: m.shown || s.phase === "won" ? label(m.rule) : "",
                pull: working && s.t < WORK / 2 ? 1 : 0,
                turn: working ? Math.min(1, s.t / WORK) : 0,
                lit: s.phase === "won",
            },
            size: MACHINE.drawn,
            x: at.x + MACHINE.drawn / 2,
            y: at.y + (15 * K) / 2,
            z: 4,
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
    L.orders.forEach((n, k) => {
        const c = cupAt(L, k);
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
            y: FLOOR - 1.5,
            z: 3,
            still: true,
        });
        if (k < s.done)
            sprites.push({
                key: `filled:${k}`,
                art: "numberball",
                params: { n: String(n), tone: "mint" },
                size: 1.3,
                x: c.x,
                y: c.y - 0.2,
                z: 5,
            });
    });
    if (s.phase !== "won" && s.done < L.orders.length) {
        const c = cupAt(L, s.done);
        marks.push({ kind: "ring", x: c.x, y: FLOOR - 1.6, r: 2.1, on: true });
    }
    const b = ballAt(s);
    if (b) {
        const shows =
            s.phase === "lift" || s.phase === "roll" || s.phase === "aim"
                ? s.phase === "lift"
                    ? String(s.fed ?? "")
                    : ""
                : String(s.value);
        sprites.push({
            key: "ball",
            art: "numberball",
            params: {
                n: shows,
                tone:
                    s.phase === "lift" || s.phase === "roll" || s.phase === "aim" ? "sky" : "glow",
            },
            size: 1.3,
            x: b.x,
            y: b.y,
            z: 6,
            live: true,
        });
    }
    if (s.phase === "aim") {
        const back = (s.aim.power - FEED.min) / FEED.per;
        marks.push({
            kind: "line",
            a: { x: START - R - back * 0.6, y: TRACK - R },
            b: { x: START - R, y: TRACK - R },
            style: "rod",
        });
        if (L.preview !== "none") {
            const p = predict(L, s.aim.power);
            const dots = L.preview === "full" ? p.dots : p.dots.filter((d) => d.x < START + 3.5);
            marks.push({ kind: "dots", pts: dots, faint: true });
            if (L.preview === "full" && p.pocket !== null) {
                const j = L.numbers.indexOf(p.pocket);
                marks.push({ kind: "ring", x: track.pockets[j] ?? 0, y: TRACK + 1.4, r: 1.1 });
            }
        }
    }
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
    parts.push(
        `The pockets are numbered ${L.numbers.join(", ")}.${L.stones?.length ? ` A stone covers ${L.stones.join(" and ")}.` : ""}${L.humps?.length ? ` The track has a hump after ${L.humps.join(" and ")}.` : ""}`,
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
    if (s.phase === "aim")
        parts.push(`Pull strength ${Math.round(s.aim.power * 10) / 10} of ${FEED.max}.`);
    return parts.join(" ");
}

export const ruleGame: ActionGame<MachineState> = {
    id: "rule",
    title: "The number machine",
    group: "action",
    levels: MACHINE_LEVELS,
    rate: RATE,
    cover: { art: "rulemachine", params: { rule: "", pull: 0, turn: 0, lit: false } },
    hint: "Pull the ball back and let go, or use left and right to set how hard and press space. The number it drops on goes into the machine.",
    controls: { arrows: { left: "Softer", right: "Harder" }, go: "Roll" },
    start: (level) => startMachine(MACHINE_LEVELS[level] ?? MACHINE_LEVELS[0], level),
    step,
    frame,
    say,
    note: (s) => s.said,
    won: (s) => s.phase === "won",
    objectives: (s) => ({ completed: s.done, total: s.L.orders.length }),
    pullFrom: (s) => (s.phase === "aim" ? { x: START, y: TRACK - R } : null),
    cancelInput: (s) => {
        s.aim.pulling = false;
    },
    still: { press: () => 1, settling: moving },
};
