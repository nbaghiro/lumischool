// Pocket pool: a small table seen from above, numbered balls on it, and a white ball the child
// strikes. A pull back from the white ball, or the arrows and space, sets the aim and how hard by
// degrees, as the putt does in Garden mini-golf; once it is struck the table decides, the balls
// knocking each other, banking off the cushions and dropping into the pockets. The sum is the
// target: pot exactly ten, ten in two shots, even balls only, twelve with three balls, or the ball
// that makes the total a multiple of five. A shot that breaks the rule is taken back for free, so a
// child tries again from where they stood. See .docs/games.md.
import type { ActionGame, ActionLevel, Levels } from "./game";
import { stepAim, type Aim, type AimSpec } from "../../engine/motion/aim";
import {
    SUB,
    rolling,
    spinnerEnds,
    stepTable,
    type Ball,
    type Feel,
    type Knock,
    type Patch,
    type Spinner,
    type Table,
} from "../../engine/motion/billiards";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import { panOf, type Hum, type Kit } from "../../engine/sound/kit";
import { RAIL, tableOutline, tablePockets } from "../../engine/parts/sport/pooltable";
import { POOLCUE } from "../../engine/parts/sport/poolcue";

const RATE = 60;

/**
 * The room is the table with a margin: room above for the pocket signs, and a band below for the balls
 * kept, the sum so far and the target, so the table takes as much of the field as it can.
 */
const roomOf = (L: PoolLevel) => ({ w: L.w + 6, h: L.h + 8 });
const TABLE_AT = { x: 3, y: 3.6 };

export type Ask =
    | { kind: "sum"; total: number; shots?: number; count?: number; even?: true }
    | { kind: "multiple"; of: number; start: number };

/** A ball's number and where it stands, in squares from the cloth's top left. */
export interface Spot {
    n: number;
    x: number;
    y: number;
}

export interface PoolLevel extends ActionLevel {
    prompt: string;
    shape: "rect" | "L";
    w: number;
    h: number;
    cloth: "mint" | "sky" | "berry";
    cue: Pt;
    balls: Spot[];
    /** Round things on the cloth a ball bounces off: a rubber bumper, or the kitchen's fruit bowl. */
    bumpers: { x: number; y: number; r: number; bowl?: true }[];
    patches: Patch[];
    spinners: Spinner[];
    /** Which pockets, by their place in the table's list, take only even balls. */
    evens: number[];
    ask: Ask;
    /** How much of the shot the dotted line shows: its first bank and the ball it meets, only the way to what it meets first, or nothing. */
    preview: 0 | 1 | 2;
}

export const POOL = {
    roll: knob(
        1.6,
        0.8,
        3,
        0.1,
        "squares a second each second",
        "the cloth slows a ball by this much: a firm shot crosses the table and back before it stops",
    ),
    cushion: knob(
        0.78,
        0.5,
        0.95,
        0.01,
        "of the speed",
        "a cushion gives back about four fifths, so a bank shot still reaches the far pocket",
    ),
    ball: knob(
        0.95,
        0.8,
        1,
        0.01,
        "of the speed",
        "two balls part with nearly all their speed, so the struck ball goes where it was aimed",
    ),
};

const FEEL = (): Feel => ({
    r: 0.7,
    mouth: 1.25,
    roll: POOL.roll.value,
    rest: 0.06,
    ball: POOL.ball.value,
    cushion: POOL.cushion.value,
    bumper: 0.9,
});

/** A shot: from a nudge to twenty squares a second, turned all the way round. */
export const SHOT: AimSpec = {
    min: 0.6,
    max: 20,
    per: 3.2,
    dead: 0.15,
    lo: -Infinity,
    hi: Infinity,
    turn: 1,
    ramp: 6,
    turns: "across",
};

const plain = { bumpers: [], patches: [], spinners: [], evens: [] };

export const POOL_LEVELS: Levels<PoolLevel> = [
    {
        title: "Pot ten",
        grades: [1, 3],
        goal: "Pot balls that add up to exactly 10.",
        prompt: "Pull back from the white ball and let go. Which two balls make 10?",
        shape: "rect",
        w: 24,
        h: 12,
        cloth: "mint",
        cue: { x: 6, y: 6 },
        balls: [
            { n: 3, x: 15, y: 3.5 },
            { n: 7, x: 15, y: 8.5 },
            { n: 5, x: 19.5, y: 6 },
        ],
        ...plain,
        ask: { kind: "sum", total: 10 },
        preview: 2,
    },
    {
        title: "Ten in two shots",
        grades: [1, 3],
        goal: "Make 10 with two shots. After two shots the balls are set out again.",
        prompt: "Two shots, and they must make 10. Look for a pair.",
        shape: "rect",
        w: 24,
        h: 12,
        cloth: "sky",
        cue: { x: 5, y: 6 },
        balls: [
            { n: 2, x: 12, y: 3 },
            { n: 8, x: 17, y: 9 },
            { n: 5, x: 12, y: 9 },
            { n: 4, x: 17, y: 3 },
        ],
        ...plain,
        ask: { kind: "sum", total: 10, shots: 2 },
        preview: 2,
    },
    {
        title: "Round the corner",
        grades: [2, 4],
        goal: "Pot balls that add up to exactly 12 on the L-shaped table.",
        prompt: "The table turns a corner. Bank off a cushion to reach the far pockets.",
        shape: "L",
        w: 24,
        h: 14,
        cloth: "sky",
        cue: { x: 5, y: 10 },
        balls: [
            { n: 5, x: 9, y: 4 },
            { n: 7, x: 16, y: 10 },
            { n: 4, x: 20, y: 11 },
            { n: 9, x: 11, y: 11.5 },
        ],
        ...plain,
        ask: { kind: "sum", total: 12 },
        preview: 1,
    },
    {
        title: "The bumpers",
        grades: [2, 4],
        goal: "Pot balls that add up to exactly 9. The round bumpers bounce a ball away.",
        prompt: "Two bumpers stand in the middle. Go round them, or bounce off them.",
        shape: "rect",
        w: 24,
        h: 12,
        cloth: "mint",
        cue: { x: 4, y: 6 },
        balls: [
            { n: 4, x: 18, y: 3 },
            { n: 5, x: 18, y: 9 },
            { n: 6, x: 21, y: 6 },
            { n: 2, x: 8, y: 2.5 },
        ],
        bumpers: [
            { x: 12, y: 4, r: 0.9 },
            { x: 12, y: 8, r: 0.9 },
        ],
        patches: [],
        spinners: [],
        evens: [],
        ask: { kind: "sum", total: 9 },
        preview: 1,
    },
    {
        title: "Evens only",
        grades: [2, 4],
        goal: "Make 10 with even balls only. The middle pockets take even balls and turn odd ones away.",
        prompt: "Only even numbers count. An odd ball rattles out of the middle pockets.",
        shape: "rect",
        w: 24,
        h: 12,
        cloth: "berry",
        cue: { x: 5, y: 6 },
        balls: [
            { n: 6, x: 12, y: 3 },
            { n: 3, x: 16, y: 6 },
            { n: 4, x: 12, y: 9 },
            { n: 8, x: 19, y: 3.5 },
            { n: 5, x: 19, y: 8.5 },
        ],
        ...plain,
        evens: [1, 4],
        ask: { kind: "sum", total: 10, even: true },
        preview: 1,
    },
    {
        title: "Soft cloth and a slope",
        grades: [3, 4],
        goal: "Make 12 with exactly three balls. Soft cloth slows a ball, and the slope pulls it down.",
        prompt: "Three balls must make 12. Watch the soft patch and the slope.",
        shape: "rect",
        w: 24,
        h: 12,
        cloth: "mint",
        cue: { x: 4, y: 6 },
        balls: [
            { n: 3, x: 11, y: 3 },
            { n: 4, x: 11, y: 9 },
            { n: 5, x: 18, y: 6 },
            { n: 6, x: 20, y: 2.5 },
            { n: 1, x: 20, y: 9.5 },
        ],
        bumpers: [],
        patches: [
            { x: 6.5, y: 0, w: 3, h: 4, drag: 3 },
            { x: 14, y: 7, w: 4, h: 5, lean: { x: 0, y: 1.1 } },
        ],
        spinners: [],
        evens: [],
        ask: { kind: "sum", total: 12, count: 3 },
        preview: 0,
    },
    {
        title: "The spinner",
        grades: [3, 4],
        goal: "7 is already potted. Pot one ball that makes the total a multiple of 5.",
        prompt: "The bar keeps turning. Time your shot, and choose the ball that makes a multiple of 5.",
        shape: "rect",
        w: 24,
        h: 12,
        cloth: "sky",
        cue: { x: 4, y: 6 },
        balls: [
            { n: 3, x: 20, y: 3 },
            { n: 4, x: 20, y: 9 },
            { n: 8, x: 8, y: 2.5 },
            { n: 6, x: 8, y: 9.5 },
        ],
        bumpers: [],
        patches: [],
        spinners: [{ x: 13, y: 6, half: 2.5, speed: 0.9, from: 0 }],
        evens: [],
        ask: { kind: "multiple", of: 5, start: 7 },
        preview: 0,
    },
    {
        title: "The kitchen table",
        grades: [3, 4],
        goal: "Pot balls that add up to exactly 15. The fruit bowl sits in the way.",
        prompt: "A game on the kitchen table. Play round the fruit bowl to make 15.",
        shape: "rect",
        w: 24,
        h: 12,
        cloth: "berry",
        cue: { x: 4, y: 6 },
        balls: [
            { n: 6, x: 18, y: 3 },
            { n: 9, x: 18, y: 9 },
            { n: 4, x: 8, y: 2.5 },
            { n: 7, x: 21, y: 6 },
            { n: 2, x: 8, y: 9.5 },
        ],
        bumpers: [{ x: 12, y: 6, r: 1.8, bowl: true }],
        patches: [],
        spinners: [],
        evens: [],
        ask: { kind: "sum", total: 15 },
        preview: 0,
    },
];

export interface PoolState {
    phase: number;
    L: PoolLevel;
    /** Where the cloth's top left is in the room. */
    at: Pt;
    table: Table;
    balls: Ball[];
    aim: Aim;
    steps: number;
    /** Set from the strike until everything has stopped and the shot is judged. */
    shooting: boolean;
    /** The balls as they stood before the shot, for taking a shot back. */
    before: Ball[];
    /** Balls that went down this shot, the white one among them. */
    dropped: number[];
    /** Balls potted and kept, in the order they went down. */
    potted: number[];
    /** Shots taken since the balls were last set out. */
    shots: number;
    won: boolean;
    touched: boolean;
    note: string;
}

const cloneBalls = (bs: readonly Ball[]): Ball[] => bs.map((b) => ({ ...b }));

function rack(L: PoolLevel, at: Pt): Ball[] {
    return [
        { n: 0, x: at.x + L.cue.x, y: at.y + L.cue.y, vx: 0, vy: 0, potted: false },
        ...L.balls.map((b) => ({
            n: b.n,
            x: at.x + b.x,
            y: at.y + b.y,
            vx: 0,
            vy: 0,
            potted: false,
        })),
    ];
}

/** The level's table in the room's squares. */
export function tableOf(L: PoolLevel, at: Pt): Table {
    return {
        outline: tableOutline(L.shape, L.w, L.h).map((p) => ({ x: p.x + at.x, y: p.y + at.y })),
        pockets: tablePockets(L.shape, L.w, L.h).map((p, i) => ({
            x: p.x + at.x,
            y: p.y + at.y,
            ...(L.evens.includes(i) ? { only: "even" as const } : {}),
        })),
        bumpers: L.bumpers.map((b) => ({ x: b.x + at.x, y: b.y + at.y, r: b.r })),
        patches: L.patches.map((p) => ({ ...p, x: p.x + at.x, y: p.y + at.y })),
        spinners: L.spinners.map((p) => ({ ...p, x: p.x + at.x, y: p.y + at.y })),
    };
}

/** The aim a level opens with: at the ball nearest the white one. */
function firstAim(balls: readonly Ball[]): Aim {
    const cue = balls[0],
        near = balls
            .slice(1)
            .filter((b) => !b.potted)
            .sort(
                (a, b) =>
                    Math.hypot(a.x - (cue?.x ?? 0), a.y - (cue?.y ?? 0)) -
                    Math.hypot(b.x - (cue?.x ?? 0), b.y - (cue?.y ?? 0)),
            )[0];
    const angle = cue && near ? Math.atan2(near.y - cue.y, near.x - cue.x) : 0;
    return { angle, power: 8, pulling: false };
}

export function startPool(L: PoolLevel, phase = 0): PoolState {
    const at = { ...TABLE_AT };
    const balls = rack(L, at);
    return {
        phase,
        L,
        at,
        table: tableOf(L, at),
        balls,
        aim: firstAim(balls),
        steps: 0,
        shooting: false,
        before: cloneBalls(balls),
        dropped: [],
        potted: [],
        shots: 0,
        won: false,
        touched: false,
        note: "",
    };
}

const sum = (ns: readonly number[]) => ns.reduce((a, n) => a + n, 0);

/** Whether some of the balls still on the table can finish the target from where the tally stands. */
export function reachable(s: PoolState): boolean {
    const ask = s.L.ask;
    if (ask.kind === "multiple") return true;
    const left = s.balls.filter((b) => b.n > 0 && !b.potted && (!ask.even || b.n % 2 === 0));
    const need = ask.total - sum(s.potted),
        more = ask.count === undefined ? Infinity : ask.count - s.potted.length;
    for (let mask = 1; mask < 1 << left.length; mask++) {
        let t = 0,
            k = 0;
        left.forEach((b, i) => {
            if (mask & (1 << i)) {
                t += b.n;
                k++;
            }
        });
        if (t === need && k <= more && (ask.count === undefined || k === more)) return true;
    }
    return false;
}

/** The target in a few words, for the band above the table. */
export function askWords(ask: Ask): string {
    if (ask.kind === "multiple") return `${ask.start} + ? makes a multiple of ${ask.of}`;
    const extra = ask.shots
        ? ` in ${ask.shots} shots`
        : ask.count
          ? ` with ${ask.count} balls`
          : ask.even
            ? " with even balls"
            : "";
    return `Make ${ask.total}${extra}`;
}

/** The tally so far, written as a sum. */
function tallyWords(s: PoolState): string {
    const ask = s.L.ask;
    if (ask.kind === "multiple")
        return s.potted.length
            ? `${ask.start} + ${s.potted.join(" + ")} = ${ask.start + sum(s.potted)}`
            : `${ask.start} so far`;
    return s.potted.length ? `${s.potted.join(" + ")} = ${sum(s.potted)}` : "Nothing potted yet";
}

/** Sets the balls out again from the start, keeping what the child has learned and nothing else. */
function setOut(s: PoolState): void {
    s.balls = rack(s.L, s.at);
    s.before = cloneBalls(s.balls);
    s.potted = [];
    s.shots = 0;
    s.aim = { ...firstAim(s.balls), power: s.aim.power };
}

function takeBack(s: PoolState, why: string, out: Happening[]): void {
    s.balls = cloneBalls(s.before);
    s.shots = Math.max(0, s.shots - 1);
    s.note = `${why} The balls are back where they were, so try that shot again.`;
    out.push({ cue: "back" });
}

/** Judges a shot once everything has stopped: keeps what it potted, or takes it back, and says so. */
function judge(s: PoolState, out: Happening[]): void {
    const ask = s.L.ask,
        dropped = s.dropped;
    s.dropped = [];
    if (dropped.includes(0)) return takeBack(s, "The white ball dropped into a pocket.", out);
    if (dropped.length === 0) {
        if (ask.kind === "sum" && ask.shots !== undefined && s.shots >= ask.shots) {
            s.note = `That was ${ask.shots} shots without making ${ask.total}. The balls are set out again.`;
            setOut(s);
            out.push({ cue: "back" });
        } else s.note = "Nothing went down. Take another shot from where the white ball stopped.";
        return;
    }
    const all = [...s.potted, ...dropped];
    if (ask.kind === "multiple") {
        const total = ask.start + sum(all);
        if (total % ask.of !== 0)
            return takeBack(
                s,
                `${ask.start} and ${dropped.join(" and ")} make ${total}, which is not a multiple of ${ask.of}.`,
                out,
            );
        s.potted = all;
        for (const n of dropped) out.push({ event: { kind: "pot", value: n } });
        s.won = true;
        s.note = `${ask.start} + ${dropped.join(" + ")} = ${total}, a multiple of ${ask.of}.`;
        out.push({ event: { kind: "won" } }, { cue: "win" });
        return;
    }
    const odd = dropped.find((n) => n % 2 === 1);
    if (ask.even && odd !== undefined)
        return takeBack(s, `${odd} is odd, and only even balls count here.`, out);
    const total = sum(all);
    if (total > ask.total)
        return takeBack(s, `${all.join(" + ")} makes ${total}, more than ${ask.total}.`, out);
    if (ask.count !== undefined && all.length > ask.count)
        return takeBack(s, `That is ${all.length} balls, and it must be ${ask.count}.`, out);
    if (ask.count !== undefined && all.length === ask.count && total !== ask.total)
        return takeBack(
            s,
            `${ask.count} balls make ${total}, and they must make ${ask.total}.`,
            out,
        );
    s.potted = all;
    for (const n of dropped) out.push({ event: { kind: "pot", value: n } });
    if (total === ask.total) {
        s.won = true;
        s.note = `${all.join(" + ")} = ${total}. That makes ${ask.total}.`;
        out.push({ event: { kind: "won" } }, { cue: "win" });
        return;
    }
    out.push({ event: { kind: "checkpoint" } }, { cue: "ring", pitch: 1 + all.length * 0.12 });
    if (ask.shots !== undefined && s.shots >= ask.shots) {
        s.note = `${all.join(" + ")} = ${total} after ${ask.shots} shots, not ${ask.total}. The balls are set out again.`;
        setOut(s);
        return;
    }
    if (!reachable(s)) {
        s.note = `${all.join(" + ")} = ${total}, and no balls left can make ${ask.total} now. The balls are set out again.`;
        setOut(s);
        return;
    }
    s.note = `${all.join(" + ")} = ${total}. ${ask.total - total} more to make ${ask.total}.`;
}

function sounds(s: PoolState, ks: readonly Knock[], out: Happening[]): void {
    const room = roomOf(s.L),
        pan = (x: number) => panOf(x, room.w / 2, room.w);
    for (const k of ks) {
        if (k.kind === "clack")
            out.push({
                cue: "bump",
                strength: Math.min(1, k.speed / 10),
                pitch: 1 + Math.min(0.6, k.speed / 30),
                pan: pan(k.x),
            });
        else if ((k.kind === "cushion" || k.kind === "bumper") && k.speed > 0.4)
            out.push({ cue: "crash", strength: Math.min(1, k.speed / 12), pan: pan(k.x) });
        else if (k.kind === "pot") {
            if (s.shooting) s.dropped.push(k.n);
            out.push({ cue: "splash", pan: pan(k.x) });
        } else if (k.kind === "rattle") out.push({ cue: "nope", pan: pan(k.x) });
    }
}

export function stepPool(s: PoolState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (s.won) return out;
    const t = s.steps / RATE;
    if (!s.shooting && !rolling(s.balls)) {
        const v = stepAim(s.aim, pad, SHOT, 1 / RATE);
        if (pad.pull || pad.released || pad.tapped || pad.holding.length) s.touched = true;
        if (v) {
            const cue = s.balls[0];
            if (cue && !cue.potted) {
                cue.vx = v.x;
                cue.vy = v.y;
                s.shooting = true;
                s.shots++;
                s.note = "";
                out.push({ cue: "lift", strength: Math.min(1, s.aim.power / SHOT.max + 0.2) });
            }
        }
    }
    if (!s.shooting) s.before = cloneBalls(s.balls);
    for (let k = 0; k < SUB / RATE; k++)
        sounds(s, stepTable(s.balls, s.table, FEEL(), t + k / SUB, 1 / SUB), out);
    // the spinner can knock a ball at rest, and what that ball does is judged as a shot is
    if (!s.shooting && rolling(s.balls)) s.shooting = true;
    if (s.shooting && !rolling(s.balls)) {
        s.shooting = false;
        judge(s, out);
    }
    return out;
}

/** The cue ball's path along the aim: where it banks and what it meets first, for the dotted preview. */
export function preview(s: PoolState): { pts: Pt[]; hit: { ghost: Pt; ball: Ball } | null } {
    const cue = s.balls[0];
    if (!cue) return { pts: [], hit: null };
    const feel = FEEL(),
        pts: Pt[] = [{ x: cue.x, y: cue.y }];
    let p = { x: cue.x, y: cue.y },
        d = { x: Math.cos(s.aim.angle), y: Math.sin(s.aim.angle) };
    const banks = s.L.preview === 2 ? 1 : 0;
    for (let bank = 0; bank <= banks; bank++) {
        let best = Infinity,
            normal: Pt | null = null,
            ball: Ball | null = null;
        for (const b of s.balls) {
            if (b === cue || b.potted) continue;
            const hit = rayCircle(p, d, b, feel.r * 2);
            if (hit < best) {
                best = hit;
                ball = b;
                normal = null;
            }
        }
        for (const m of s.table.bumpers) {
            const hit = rayCircle(p, d, m, m.r + feel.r);
            if (hit < best) {
                best = hit;
                ball = null;
                const q = { x: p.x + d.x * hit, y: p.y + d.y * hit },
                    l = Math.hypot(q.x - m.x, q.y - m.y);
                normal = { x: (q.x - m.x) / l, y: (q.y - m.y) / l };
            }
        }
        const o = s.table.outline;
        for (let i = 0; i < o.length; i++) {
            const a = o[i],
                c = o[(i + 1) % o.length];
            if (!a || !c) continue;
            const hit = raySegment(p, d, a, c, feel.r);
            if (hit && hit.t < best) {
                best = hit.t;
                ball = null;
                normal = hit.n;
            }
        }
        if (!Number.isFinite(best)) break;
        const q = { x: p.x + d.x * best, y: p.y + d.y * best };
        pts.push(q);
        if (ball) return { pts, hit: { ghost: q, ball } };
        if (!normal) break;
        const into = d.x * normal.x + d.y * normal.y;
        d = { x: d.x - 2 * into * normal.x, y: d.y - 2 * into * normal.y };
        p = q;
    }
    return { pts, hit: null };
}

function rayCircle(p: Pt, d: Pt, c: Pt, r: number): number {
    const fx = p.x - c.x,
        fy = p.y - c.y,
        b = fx * d.x + fy * d.y,
        cc = fx * fx + fy * fy - r * r,
        disc = b * b - cc;
    if (disc < 0) return Infinity;
    const t = -b - Math.sqrt(disc);
    return t > 1e-6 ? t : Infinity;
}

/** Where a ball of radius `r` moving along `d` from `p` first touches the segment, with the side it meets. */
function raySegment(p: Pt, d: Pt, a: Pt, b: Pt, r: number): { t: number; n: Pt } | null {
    const ex = b.x - a.x,
        ey = b.y - a.y,
        len = Math.hypot(ex, ey);
    let nx = -ey / len,
        ny = ex / len;
    // the normal that faces the ball
    if ((p.x - a.x) * nx + (p.y - a.y) * ny < 0) {
        nx = -nx;
        ny = -ny;
    }
    const toward = d.x * nx + d.y * ny;
    if (toward >= 0) return null;
    const dist = (p.x - a.x) * nx + (p.y - a.y) * ny - r;
    const t = dist / -toward;
    if (t < 1e-6) return null;
    const qx = p.x + d.x * t - a.x,
        qy = p.y + d.y * t - a.y,
        along = (qx * ex + qy * ey) / (len * len);
    return along >= 0 && along <= 1 ? { t, n: { x: nx, y: ny } } : null;
}

/** How far the cue is drawn back from the ball, in squares, as the shot is made stronger. */
const drawBack = (a: Aim) => 0.35 + (a.power / SHOT.max) * 2.6;

export function poolFrame(s: PoolState, rest = false): Frame {
    const L = s.L,
        room = roomOf(L),
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    sprites.push({
        key: "table",
        art: "pooltable",
        params: { shape: L.shape, width: L.w, height: L.h, cloth: L.cloth, dressed: false },
        x: s.at.x + L.w / 2,
        y: s.at.y + L.h / 2,
        z: 1,
        still: true,
    });
    L.patches.forEach((p, i) =>
        sprites.push({
            key: `patch:${i}`,
            art: "poolpatch",
            params: {
                kind: p.lean ? "slope" : "soft",
                width: p.w,
                height: p.h,
                dir: p.lean ? slopeWay(p.lean) : "down",
            },
            x: s.at.x + p.x + p.w / 2,
            y: s.at.y + p.y + p.h / 2,
            z: 2,
            still: true,
        }),
    );
    s.table.pockets.forEach((p, i) => {
        if (!p.only) return;
        const top = p.y < s.at.y + L.h / 2;
        sprites.push({
            key: `sign:${i}`,
            art: "pocketsign",
            params: { word: p.only },
            x: p.x,
            y: top ? p.y - RAIL - 1.4 : p.y + RAIL + 1.4,
            z: 3,
            still: true,
        });
    });
    L.bumpers.forEach((b, i) =>
        sprites.push({
            key: `bumper:${i}`,
            art: b.bowl ? "fruitbowl" : "poolbumper",
            params: b.bowl ? { fruit: 5 } : { tone: "berry" },
            x: s.at.x + b.x,
            y: s.at.y + b.y,
            size: b.r * 2,
            z: 3,
            still: true,
        }),
    );
    const t = s.steps / RATE;
    s.table.spinners.forEach((sp, i) => {
        const [a, b] = spinnerEnds(sp, t);
        sprites.push({
            key: `spinner:${i}`,
            art: "poolspinner",
            params: { length: sp.half * 2 },
            x: sp.x,
            y: sp.y,
            angle: Math.atan2(b.y - a.y, b.x - a.x),
            z: 4,
        });
    });
    for (const b of s.balls)
        sprites.push({
            key: `ball:${b.n}`,
            art: "poolball",
            params: { n: b.n },
            x: b.x,
            y: b.y,
            size: 1.4,
            z: 5,
            alpha: b.potted ? 0 : 1,
        });
    // the balls kept, in a row under the table as a tally
    s.potted.forEach((n, i) =>
        sprites.push({
            key: `kept:${n}`,
            art: "poolball",
            params: { n },
            x: s.at.x + 1 + i * 1.8,
            y: s.at.y + L.h + RAIL + 1.6,
            size: 1.4,
            z: 5,
        }),
    );
    const ready = !s.won && !s.shooting && !rolling(s.balls),
        cue = s.balls[0];
    if (ready && cue && !cue.potted) {
        const back = drawBack(s.aim) + FEEL().r + POOLCUE.w / 2,
            d = { x: Math.cos(s.aim.angle), y: Math.sin(s.aim.angle) };
        sprites.push({
            key: "cue",
            art: "poolcue",
            params: { chalk: true },
            x: cue.x - d.x * back,
            y: cue.y - d.y * back,
            angle: s.aim.angle,
            z: 6,
        });
        if (!rest && L.preview > 0) {
            const way = preview(s);
            if (way.pts.length > 1) marks.push({ kind: "dots", pts: dotted(way.pts), faint: true });
            if (way.hit) {
                marks.push({ kind: "ring", x: way.hit.ghost.x, y: way.hit.ghost.y, r: FEEL().r });
                if (L.preview === 2) {
                    const b = way.hit.ball,
                        nx = b.x - way.hit.ghost.x,
                        ny = b.y - way.hit.ghost.y,
                        l = Math.hypot(nx, ny) || 1;
                    marks.push({
                        kind: "line",
                        a: { x: b.x, y: b.y },
                        b: { x: b.x + (nx / l) * 3, y: b.y + (ny / l) * 3 },
                        style: "aim",
                        head: true,
                    });
                }
            }
        }
    }
    // under the table: the kept balls and the sum they make on the left, the target on the right
    const under = s.at.y + L.h + RAIL + 1.6,
        widthOf = (text: string, size: number) => text.length * size * 0.5,
        tally = tallyWords(s),
        ask = askWords(L.ask),
        // a sign under a middle pocket stands in the band, so the target keeps to the right of it
        signBelow = s.table.pockets.some((p) => p.only && p.y >= s.at.y + L.h / 2),
        askSize = signBelow ? Math.min(0.85, (L.w / 2 - 3) / (ask.length * 0.5)) : 0.85;
    marks.push(
        {
            kind: "word",
            x:
                s.at.x +
                1 +
                s.potted.length * 1.8 +
                widthOf(tally, 0.6) / 2 -
                (s.potted.length ? 0.4 : 1),
            y: under,
            text: tally,
            size: 0.6,
        },
        {
            kind: "word",
            x: s.at.x + L.w - widthOf(ask, askSize) / 2,
            y: under,
            text: ask,
            size: askSize,
        },
    );
    if (ready && L.ask.kind === "sum" && L.ask.shots) {
        const shot = `Shot ${s.shots + 1} of ${L.ask.shots}`;
        marks.push({
            kind: "word",
            x: s.at.x + L.w - widthOf(shot, 0.55) / 2,
            y: under + 1.2,
            text: shot,
            size: 0.55,
        });
    }
    return {
        sprites,
        marks,
        camera: { x: room.w / 2, y: room.h / 2 },
        view: room,
        world: { ...room },
        time: rest ? 0 : t,
    };
}

/** Points every half square along a broken line, for a dotted preview. */
function dotted(pts: readonly Pt[]): Pt[] {
    const out: Pt[] = [];
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
            b = pts[i];
        if (!a || !b) continue;
        const l = Math.hypot(b.x - a.x, b.y - a.y);
        for (let d = 0; d < l; d += 0.6)
            out.push({ x: a.x + ((b.x - a.x) * d) / l, y: a.y + ((b.y - a.y) * d) / l });
    }
    return out;
}

const slopeWay = (lean: Pt): string =>
    Math.abs(lean.x) > Math.abs(lean.y)
        ? lean.x > 0
            ? "right"
            : "left"
        : lean.y > 0
          ? "down"
          : "up";

/** Pocket pool's own sounds: the cue's tap, balls clacking, the cushion's thud, the rattle down a pocket and a cheer. */
const SOUNDS: Kit = {
    lift: [
        { wave: "noise", hz: 2400, attack: 0.001, decay: 0.03, gain: 0.35 },
        { wave: "sine", hz: 520, to: 440, attack: 0.001, decay: 0.06, gain: 0.25 },
    ],
    bump: [
        { wave: "sine", hz: 1850, attack: 0.001, decay: 0.05, gain: 0.35 },
        { wave: "noise", hz: 4200, attack: 0.001, decay: 0.02, gain: 0.25 },
    ],
    crash: [{ wave: "sine", hz: 140, to: 95, attack: 0.004, decay: 0.12, gain: 0.35 }],
    splash: [
        { wave: "noise", hz: 900, attack: 0.002, decay: 0.05, gain: 0.3 },
        { wave: "sine", hz: 330, to: 220, attack: 0.002, decay: 0.08, gain: 0.25, delay: 0.05 },
        { wave: "sine", hz: 260, to: 180, attack: 0.002, decay: 0.08, gain: 0.2, delay: 0.13 },
    ],
    nope: [
        { wave: "sine", hz: 700, attack: 0.001, decay: 0.04, gain: 0.3 },
        { wave: "sine", hz: 640, attack: 0.001, decay: 0.04, gain: 0.3, delay: 0.07 },
    ],
    ring: [
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.2, gain: 0.3 },
        { wave: "triangle", hz: 1175, attack: 0.01, decay: 0.3, gain: 0.25, delay: 0.08 },
    ],
    win: [
        { wave: "triangle", hz: 523, attack: 0.01, decay: 0.25, gain: 0.35 },
        { wave: "triangle", hz: 659, attack: 0.01, decay: 0.25, gain: 0.35, delay: 0.12 },
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.45, gain: 0.35, delay: 0.24 },
    ],
};

function say(s: PoolState): string {
    const on = s.balls
        .filter((b) => b.n > 0 && !b.potted)
        .map(
            (b) =>
                `${b.n} at ${Math.round(b.x - s.at.x)} across and ${Math.round(b.y - s.at.y)} down`,
        )
        .join(", ");
    const cue = s.balls[0];
    const where =
        cue && !cue.potted
            ? `The white ball is ${Math.round(cue.x - s.at.x)} across and ${Math.round(cue.y - s.at.y)} down.`
            : "";
    const deg = Math.round(((((s.aim.angle * 180) / Math.PI) % 360) + 360) % 360);
    return `${askWords(s.L.ask)}. ${tallyWords(s)}. Balls on the table: ${on || "none"}. ${where} The aim points ${deg} degrees round from the right, at ${Math.round((s.aim.power / SHOT.max) * 100)}% strength.${rolling(s.balls) ? " The balls are rolling." : ""}`;
}

export const poolGame: ActionGame<PoolState> = {
    id: "pool",
    title: "Pocket pool",
    group: "action",
    seen: "above",
    quiet: true,
    levels: POOL_LEVELS,
    rate: RATE,
    cover: {
        art: "pooltable",
        params: { shape: "rect", width: 12, height: 6, cloth: "berry", dressed: true },
    },
    hint: "Pull back from the white ball and let go to strike it. With the keys, left and right turn the aim, up and down change how hard, and space strikes.",
    controls: {
        arrows: { left: "Aim left", right: "Aim right", up: "Harder", down: "Softer" },
        go: "Strike",
    },
    sounds: SOUNDS,
    start: (phase) => startPool(POOL_LEVELS[phase] ?? POOL_LEVELS[0], phase),
    step: stepPool,
    say,
    note: (s) => (!s.touched && !s.won ? s.L.prompt : s.note),
    won: (s) => s.won,
    objectives: (s) =>
        s.L.ask.kind === "sum"
            ? { completed: Math.min(s.L.ask.total, sum(s.potted)), total: s.L.ask.total }
            : { completed: s.won ? 1 : 0, total: 1 },
    frame: poolFrame,
    pullFrom: (s) => {
        const cue = s.balls[0];
        return !s.won && !s.shooting && !rolling(s.balls) && cue && !cue.potted
            ? { x: cue.x, y: cue.y }
            : null;
    },
    cancelInput: (s) => {
        s.aim.pulling = false;
    },
    hum: (s): Hum[] => {
        const fastest = Math.max(
            0,
            ...s.balls.filter((b) => !b.potted).map((b) => Math.hypot(b.vx, b.vy)),
        );
        return fastest > 0.3 ? [{ kind: "roll", level: Math.min(1, fastest / 12) }] : [];
    },
    tuning: POOL,
    still: {
        press: () => Math.round(RATE * 0.1),
        settling: (s) => s.shooting || rolling(s.balls),
    },
};
