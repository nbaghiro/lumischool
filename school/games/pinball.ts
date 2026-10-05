// Pinball garden: a pinball table whose playfield is a garden. The plunger is pulled back by degrees
// and let go, the flippers are swung up while they are held, and once the ball is away the table
// decides: flower bumpers kick it, slingshots throw it, a snail slides under it, a beehive catches it
// and spits it out, a watering can carries it up and round. The numbers are on the flowers, and the
// target is a sum: exactly ten, only the odd flowers, the ladybirds in order, fifty in three balls. A
// hit that would go past an exact target puts the total back where it stood when this ball was
// launched, so a child learns to steer away from the big flower without losing everything, and a
// drained ball comes back to the plunger in a moment. See .docs/games.md.
import type { ActionGame, ActionLevel, Levels } from "./game";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import {
    SUB,
    flipperTip,
    liveOf,
    nearest,
    postAt,
    stepTable,
    type Ball,
    type Hit,
    type Live,
    type Table,
} from "../../engine/motion/pinball";
import type { Frame, Happening, Light, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import { panOf, type Hum, type Kit } from "../../engine/sound/kit";
import { LEAF } from "../../engine/parts/sport/leafflipper";
import { PINBALL, pinballFlippers, pinballWalls } from "../../engine/parts/sport/pinballtable";

const RATE = 60;
const P = PINBALL;

/** The world: the table with its backbox over it, in a garden wide enough that no edge shows. */
const WORLD = { w: 96, h: 44 };
/** Where the table's top left stands in the world, under the backbox. */
export const TABLE_AT = { x: WORLD.w / 2 - P.w / 2, y: 5.5 };
const VIEW = { w: 26, h: WORLD.h };

export type Ask =
    | { kind: "hits"; count: number }
    | { kind: "sum"; total: number }
    | { kind: "odd" }
    | { kind: "order" }
    | { kind: "atleast"; total: number }
    | { kind: "free" };

type Place = "lawn" | "pond" | "meadow" | "orchard" | "dusk";
type Tone = "berry" | "sky" | "tang" | "glow" | "mint";

export interface PinLevel extends ActionLevel {
    prompt: string;
    place: Place;
    /** The flowers' numbers, slot by slot; nought is a flower with no number. */
    flowers: number[];
    snail?: number;
    /** The ladybirds' numbers, left to right; hit in this order on an order level. */
    ladies?: number[];
    hive?: number;
    ramp?: number;
    /** A rollover lane that makes the next flower count twice. */
    double?: true;
    spinner?: true;
    ask: Ask;
    /** Balls a try has, for a target that is reached over several. */
    balls?: number;
    /** How much the dots show: the launch and what a flip now would do, the launch alone, or nothing. */
    preview: 0 | 1 | 2;
    lights?: true;
}

/** Where the flowers stand, slot by slot, in squares on the table. */
const SLOTS: Pt[] = [
    { x: 5.8, y: 10 },
    { x: 10.15, y: 8 },
    { x: 14.5, y: 10 },
    { x: 7.8, y: 14.2 },
    { x: 12.5, y: 14.2 },
];
const TONES: Tone[] = ["berry", "sky", "tang", "mint", "glow"];
const LADY_X = [5, 7.7, 12.6, 15.3];
const LADY_Y = 17.6;
const POSTS: Pt[] = [
    { x: 3.3, y: 15.5 },
    { x: 17, y: 15.5 },
];
const HIVE = { x: 16.6, y: 12.5 };
const LANE = { x: 9.35, y: 2.6, w: 1.6, h: 1.6 };
const SPIN = { x: 10.15, y: 19.8, half: 1.1 };
const SNAIL = { x: 10.15, y: 11.5 };

export const PIN_LEVELS: Levels<PinLevel> = [
    {
        title: "The flowerbed",
        goal: "Hit three different flowers.",
        prompt: "Pull the plunger down and let go. Hold a flipper to bat the ball back up. Hit three different flowers; each one counts once.",
        grades: [1, 1],
        place: "lawn",
        flowers: [1, 2, 3],
        ask: { kind: "hits", count: 3 },
        preview: 2,
    },
    {
        title: "Make ten",
        goal: "Make exactly 10 with the flowers.",
        prompt: "Each flower adds its number. Make exactly 10. Going past puts the total back to where this ball started.",
        grades: [1, 2],
        place: "lawn",
        flowers: [1, 5, 2],
        ask: { kind: "sum", total: 10 },
        balls: 3,
        preview: 2,
    },
    {
        title: "The pond lane",
        goal: "Light all the odd flowers.",
        prompt: "Light the odd flowers. An even flower closes the ones already lit.",
        grades: [1, 2],
        place: "pond",
        flowers: [1, 2, 3, 4, 5],
        ask: { kind: "odd" },
        preview: 2,
    },
    {
        title: "Ladybirds in order",
        goal: "Knock the ladybirds down in order.",
        prompt: "Knock the ladybirds down in counting order. One out of turn just bounces the ball away.",
        grades: [2, 2],
        place: "meadow",
        flowers: [0, 0, 0],
        ladies: [2, 4, 6, 8],
        ask: { kind: "order" },
        preview: 1,
    },
    {
        title: "Exactly twenty",
        goal: "Make exactly 20.",
        prompt: "Make exactly 20. The snail is worth 5 and slides about.",
        grades: [2, 3],
        place: "orchard",
        flowers: [1, 10, 2, 5, 2],
        snail: 5,
        ask: { kind: "sum", total: 20 },
        balls: 3,
        preview: 1,
    },
    {
        title: "The beehive and the double lane",
        goal: "Make exactly 30.",
        prompt: "Make exactly 30. Roll over the lane at the top and the next flower counts twice. The hive is worth 4.",
        grades: [3, 3],
        place: "meadow",
        flowers: [3, 5, 2],
        hive: 4,
        double: true,
        ask: { kind: "sum", total: 30 },
        balls: 3,
        preview: 1,
    },
    {
        title: "Three balls to fifty",
        goal: "Make 50 or more with three balls.",
        prompt: "Make 50 or more before three balls drain. The watering can is worth 10.",
        grades: [3, 4],
        place: "lawn",
        flowers: [2, 5, 2, 5, 2],
        ramp: 10,
        spinner: true,
        ask: { kind: "atleast", total: 50 },
        balls: 3,
        preview: 0,
    },
    {
        title: "The evening garden",
        goal: "Make exactly 100 with tens and ones.",
        prompt: "Make exactly 100 in tens and ones. The watering can is worth 10.",
        grades: [4, 4],
        place: "dusk",
        flowers: [10, 1, 10, 1, 10],
        ramp: 10,
        ask: { kind: "sum", total: 100 },
        balls: 5,
        preview: 0,
        lights: true,
    },
    {
        title: "Free play",
        goal: "Play for the best score.",
        prompt: "Everything counts. Play for your best score.",
        grades: [1, 4],
        place: "lawn",
        flowers: [1, 2, 5, 10, 5],
        snail: 5,
        ladies: [2, 4, 6, 8],
        hive: 5,
        ramp: 10,
        double: true,
        spinner: true,
        ask: { kind: "free" },
        preview: 2,
    },
];

export const PIN = {
    gravity: knob(
        13,
        8,
        20,
        0.5,
        "squares a second each second",
        "the table's tilt: steep enough that a flip is needed often, gentle enough to follow",
    ),
    launch: knob(
        22,
        14,
        30,
        0.5,
        "squares a second",
        "how much a full pull adds to the least launch, so a full pull reaches the top",
    ),
    kick: knob(
        9,
        5,
        14,
        0.5,
        "squares a second",
        "what a flower adds as it kicks the ball away, so a hit is felt and seen",
    ),
};

/** Squares a second the weakest launch leaves at, and how long a full pull takes on the key, in seconds. */
const LEAST = 14,
    PULL_TIME = 0.8;
/**
 * A pull on the plunger, in ninety-sixths: a finger and the key arrive at the same pull by different
 * sums, and rounding both to the same steps keeps a try the keys found the same try by a finger.
 */
const notch = (v: number): number => Math.max(0, Math.min(1, Math.round(v * 96) / 96));

/** Hits past an exact target a try may make before its total starts again. */
const TOO_FAR = 3;
/** Squares of finger travel for a full pull on the plunger. */
const PULL_TRAVEL = 4;

type Side = "left" | "right";
/**
 * The flippers' grace, in steps: a swing pressed while the ball is still dropping onto that flipper
 * waits up to GRACE for it to arrive, and a tap shorter than MIN_UP is held up that long, so a child a
 * moment early or quick still bats the ball.
 */
const GRACE = Math.round(RATE * 0.2),
    MIN_UP = 8;
/** Squares between the ball and a flipper at which a waiting swing goes. */
const REACH = 0.45;

const flowerId = (i: number) => `f${i}`;
const ladyId = (i: number) => `l${i}`;

/** The table a level plays on, in table squares. */
export function tableOf(L: PinLevel): Table {
    return {
        walls: pinballWalls().map((w) => ({ a: w.a, b: w.b, ...(w.kick ? { kick: w.kick } : {}) })),
        posts: [
            ...L.flowers.map((_, i) => ({
                id: flowerId(i),
                x: SLOTS[i]?.x ?? 0,
                y: SLOTS[i]?.y ?? 0,
                r: 1.05,
                kick: PIN.kick.value,
            })),
            ...POSTS.map((p, i) => ({ id: `p${i}`, x: p.x, y: p.y, r: 0.55 })),
            ...(L.snail !== undefined
                ? [{ id: "snail", ...SNAIL, r: 0.85, kick: 6, move: { dx: 3.5, period: 7 } }]
                : []),
        ],
        flippers: pinballFlippers(),
        targets: (L.ladies ?? []).map((_, i) => {
            const x = LADY_X[i] ?? 0;
            return { id: ladyId(i), a: { x: x - 0.65, y: LADY_Y }, b: { x: x + 0.65, y: LADY_Y } };
        }),
        sensors: L.double ? [{ id: "double", ...LANE }] : [],
        spinners: L.spinner ? [{ id: "spin", ...SPIN }] : [],
        saucers:
            L.hive !== undefined
                ? [{ id: "hive", ...HIVE, r: 0.75, hold: 0.7, out: { x: -9, y: -11 } }]
                : [],
        ramps:
            L.ramp !== undefined
                ? [
                      {
                          id: "ramp",
                          entry: { x: 2, y: 17, w: 2, h: 1.6 },
                          path: [
                              { x: 3, y: 17.8 },
                              { x: 2.2, y: 11 },
                              { x: 3.2, y: 4.6 },
                              { x: 7, y: 2.2 },
                              { x: 10.15, y: 2.1 },
                          ],
                          time: 1,
                          out: { x: 4, y: 6 },
                      },
                  ]
                : [],
        gravity: PIN.gravity.value,
        drain: P.drain,
        r: P.ball,
    };
}

export interface PinState {
    phase: number;
    L: PinLevel;
    table: Table;
    live: Live;
    ball: Ball;
    steps: number;
    /** The ball waits on the plunger. */
    resting: boolean;
    /** How far the plunger is pulled, from nought to one, whether it is being pulled, and where a finger first took it. */
    pull: number;
    pulling: boolean;
    grab: number | null;
    /** Steps until the next ball comes up after a drain. */
    wait: number;
    sum: number;
    /** Hits this try that would have gone past an exact target. */
    over: number;
    /** The last sum, as words: "12 + 5 = 17". */
    said: string;
    hits: number;
    lit: string[];
    next: number;
    /** Steps the double lane stays lit, or nought. */
    double: number;
    balls: number;
    nudges: number;
    cool: number;
    slow: number;
    bloom: Record<string, number>;
    wilt: Record<string, number>;
    cheer: number;
    /** Which flippers are up, which the player is holding, and each flipper's grace. */
    held: Record<Side, boolean>;
    hands: Record<Side, boolean>;
    grace: Record<Side, { wait: number; up: number }>;
    score: number;
    best: number;
    trail: Pt[];
    won: boolean;
    /** Every ball of a level that counts balls has drained short of the target: the round is over until it starts again. */
    out: boolean;
    touched: boolean;
    note: string;
}

const restBall = (): Ball => ({
    x: P.rest.x,
    y: P.rest.y,
    vx: 0,
    vy: 0,
    mode: "held",
    t: 0,
    on: null,
});

export function startPin(L: PinLevel, phase = 0): PinState {
    const table = tableOf(L);
    return {
        phase,
        L,
        table,
        live: liveOf(table),
        ball: restBall(),
        steps: 0,
        resting: true,
        pull: 0,
        pulling: false,
        grab: null,
        wait: 0,
        sum: 0,
        over: 0,
        said: "",
        hits: 0,
        lit: [],
        next: 0,
        double: 0,
        balls: 0,
        nudges: 0,
        cool: 0,
        slow: 0,
        bloom: {},
        wilt: {},
        cheer: -999,
        held: { left: false, right: false },
        hands: { left: false, right: false },
        grace: { left: { wait: 0, up: 0 }, right: { wait: 0, up: 0 } },
        score: 0,
        best: 0,
        trail: [],
        won: false,
        out: false,
        touched: false,
        note: "",
    };
}

/** What a thing on the table is worth, by its id. */
export function valueOf(L: PinLevel, id: string): number {
    if (id.startsWith("f")) return L.flowers[Number(id.slice(1))] ?? 0;
    if (id.startsWith("l")) return L.ladies?.[Number(id.slice(1))] ?? 0;
    if (id === "snail") return L.snail ?? 0;
    if (id === "hive") return L.hive ?? 0;
    if (id === "ramp") return L.ramp ?? 0;
    return 0;
}

const oddIds = (L: PinLevel): string[] =>
    L.flowers.map((n, i) => (n % 2 === 1 ? flowerId(i) : "")).filter((id) => id !== "");

export function askWords(L: PinLevel): string {
    const a = L.ask;
    switch (a.kind) {
        case "hits":
            return `Hit ${a.count} different flowers`;
        case "sum":
            return `Make exactly ${a.total}`;
        case "odd":
            return "Light the odd flowers";
        case "order":
            return `Ladybirds in order: ${(L.ladies ?? []).join(", ")}`;
        case "atleast":
            return `Make ${a.total} or more with ${L.balls ?? 3} balls`;
        case "free":
            return "Free play";
    }
}

export function tallyWords(s: PinState): string {
    const L = s.L,
        a = L.ask;
    switch (a.kind) {
        case "hits":
            return `${s.hits} of ${a.count}`;
        case "sum":
            return `${s.said || `${s.sum} so far`}${s.over ? ` · too far ${s.over} of ${TOO_FAR}` : ""}${L.balls !== undefined ? ` · ball ${Math.min(s.balls + 1, L.balls)} of ${L.balls}` : ""}`;
        case "odd": {
            const lit = s.lit.map((id) => valueOf(L, id)).sort((x, y) => x - y);
            return lit.length ? `Lit: ${lit.join(", ")}` : "None lit yet";
        }
        case "order":
            return s.next < (L.ladies?.length ?? 0)
                ? `Next: ${L.ladies?.[s.next] ?? ""}`
                : "All down";
        case "atleast":
            return `${s.said || `${s.sum} so far`} · ball ${Math.min(s.balls + 1, L.balls ?? 3)} of ${L.balls ?? 3}`;
        case "free":
            return `Score ${s.score} · best ${Math.max(s.best, s.score)}`;
    }
}

function win(s: PinState, out: Happening[], words: string): void {
    s.won = true;
    s.note = words;
    s.cheer = s.steps;
    out.push(
        { event: { kind: "won" } },
        { cue: "win" },
        { burst: { kind: "sparkle", x: s.ball.x + TABLE_AT.x, y: s.ball.y + TABLE_AT.y, n: 18 } },
    );
}

/** Counts what the ball hit towards the target, and says so. */
export function award(s: PinState, id: string, out: Happening[]): void {
    const L = s.L,
        a = L.ask,
        base = valueOf(L, id);
    if (a.kind === "hits") {
        // each flower counts once, so one flower bouncing the ball about is still one flower
        if (!id.startsWith("f") || s.lit.includes(id)) return;
        s.lit.push(id);
        s.hits = s.lit.length;
        s.note = `${s.hits} of ${a.count}.`;
        if (s.hits >= a.count) win(s, out, `${a.count} different flowers hit.`);
        return;
    }
    if (base === 0) return;
    const twice = s.double > 0 && id.startsWith("f"),
        v = twice ? base * 2 : base;
    if (twice) s.double = 0;
    const show = twice ? `${base} × 2` : `${base}`;
    if (a.kind === "sum") {
        const was = s.sum,
            now = was + v;
        if (now > a.total) {
            s.wilt[id] = s.steps;
            s.over++;
            out.push({ cue: "nope" });
            if (s.over >= TOO_FAR) {
                s.note = `${was} + ${show} = ${now}, past ${a.total} for the ${TOO_FAR === 3 ? "third" : "last"} time. The total starts again from 0.`;
                s.sum = 0;
                s.over = 0;
                s.balls = 0;
                s.said = "";
            } else
                s.note = `${was} + ${show} = ${now}, more than ${a.total}, so that flower does not count. Still ${was}.`;
            return;
        }
        s.sum = now;
        s.said = `${was} + ${show} = ${now}`;
        if (now === a.total) win(s, out, `${s.said}. That makes ${a.total}.`);
        else {
            s.note = `${s.said}. ${a.total - now} more.`;
            out.push({ cue: "ring", pitch: 1 + Math.min(0.6, now / a.total / 2) });
        }
        return;
    }
    if (a.kind === "odd") {
        if (!id.startsWith("f")) return;
        if (base % 2 === 1) {
            if (!s.lit.includes(id)) s.lit.push(id);
            const left = oddIds(L).filter((o) => !s.lit.includes(o));
            if (left.length === 0) win(s, out, "Every odd flower is lit.");
            else {
                s.note = `${base} is odd, and it lights up.`;
                out.push({ cue: "ring", pitch: 1.2 });
            }
        } else {
            for (const lit of s.lit) s.wilt[lit] = s.steps;
            s.lit = [];
            s.wilt[id] = s.steps;
            s.note = `${base} is even, and the odd flowers close again.`;
            out.push({ cue: "nope" });
        }
        return;
    }
    if (a.kind === "atleast") {
        const was = s.sum;
        s.sum += v;
        s.said = `${was} + ${show} = ${s.sum}`;
        if (s.sum >= a.total) win(s, out, `${s.said}. That is ${a.total} or more.`);
        else s.note = `${s.said}.`;
        return;
    }
    if (a.kind === "free") {
        s.score += v;
        s.best = Math.max(s.best, s.score);
        s.said = `+${v}`;
    }
}

/** A ladybird knocked: down in its turn on an order level, or counted in free play. */
export function ladyHit(s: PinState, i: number, out: Happening[]): void {
    const L = s.L,
        id = ladyId(i),
        n = L.ladies?.[i] ?? 0;
    if (L.ask.kind === "order") {
        if (i === s.next) {
            s.live.down.push(id);
            s.next++;
            out.push({ cue: "crash" });
            if (s.next >= (L.ladies?.length ?? 0))
                win(s, out, `${(L.ladies ?? []).join(", ")}: every ladybird down in order.`);
            else {
                s.note = `${n} is down. Next is ${L.ladies?.[s.next] ?? ""}.`;
                out.push({ cue: "ring", pitch: 1 + s.next * 0.12 });
            }
        } else {
            s.note = `That was ${n}. Ladybird ${L.ladies?.[s.next] ?? ""} is next.`;
            out.push({ cue: "nope" });
        }
        return;
    }
    s.live.down.push(id);
    out.push({ cue: "crash" });
    award(s, id, out);
    if (s.live.down.filter((d) => d.startsWith("l")).length >= (L.ladies?.length ?? 0))
        s.live.down = s.live.down.filter((d) => !d.startsWith("l"));
}

const local = (p: Pt): Pt => ({ x: p.x - TABLE_AT.x, y: p.y - TABLE_AT.y });
const inLane = (t: Pt) => t.x >= P.right - 0.4 && t.x <= P.lane + 1 && t.y > 14;

function launch(s: PinState, out: Happening[]): void {
    s.ball = {
        ...restBall(),
        mode: "free",
        vy: -(LEAST + PIN.launch.value * s.pull),
    };
    s.resting = false;
    s.pulling = false;
    s.grab = null;
    out.push({ cue: "creak", strength: 0.4 + s.pull * 0.6 });
    s.pull = 0;
}

/** What a step's hits sound like and look like, and what they count for. */
function react(s: PinState, hits: Hit[], out: Happening[]): void {
    const pan = (x: number) => panOf(x, P.w / 2, P.w);
    for (const h of hits) {
        const wx = h.x + TABLE_AT.x,
            wy = h.y + TABLE_AT.y;
        switch (h.kind) {
            case "post":
                if (h.id.startsWith("f") || h.id === "snail") {
                    s.bloom[h.id] = s.steps;
                    const n = valueOf(s.L, h.id);
                    out.push(
                        {
                            cue: "bump",
                            strength: Math.min(1, 0.4 + h.speed / 16),
                            pitch: 0.8 + Math.min(0.9, n / 12),
                            pan: pan(h.x),
                        },
                        { burst: { kind: "sparkle", x: wx, y: wy, n: 6 } },
                    );
                    award(s, h.id, out);
                } else if (h.speed > 2)
                    out.push({ cue: "place", strength: Math.min(1, h.speed / 18), pan: pan(h.x) });
                break;
            case "wall":
                if (h.kick) out.push({ cue: "bump", strength: 0.6, pitch: 0.65, pan: pan(h.x) });
                else if (h.speed > 7)
                    out.push({
                        cue: "place",
                        strength: Math.min(0.6, h.speed / 30),
                        pan: pan(h.x),
                    });
                break;
            case "target":
                ladyHit(s, Number(h.id.slice(1)), out);
                break;
            case "sensor":
                if (h.id === "double") {
                    s.double = RATE * 8;
                    s.note = "The lane is lit: the next flower counts twice.";
                    out.push({ cue: "ring", pitch: 1.5, pan: pan(h.x) });
                }
                break;
            case "spinner":
                if (s.steps % 3 === 0) out.push({ cue: "level", pan: pan(h.x) });
                if (s.L.ask.kind === "free") {
                    s.score++;
                    s.best = Math.max(s.best, s.score);
                }
                break;
            case "saucer":
                s.bloom.hive = s.steps;
                out.push({ cue: "crash", strength: 0.5, pan: pan(h.x) });
                award(s, "hive", out);
                break;
            case "out":
                out.push({ cue: "lift", strength: 0.6, pan: pan(h.x) });
                break;
            case "ramp":
                out.push({ cue: "splash", pan: pan(h.x) });
                award(s, "ramp", out);
                break;
            case "flipper":
                break;
            case "drain":
                out.push({ cue: "back" });
                break;
        }
    }
}

/** How far the ball is from a flipper as it lies now, and whether the ball is dropping towards it. */
function toward(s: PinState, side: Side): { gap: number; coming: boolean } {
    const i = s.table.flippers.findIndex((f) => f.side === side),
        f = s.table.flippers[i],
        b = s.ball;
    if (!f || b.mode !== "free") return { gap: Infinity, coming: false };
    const q = nearest(b, f, flipperTip(f, s.live.angles[i] ?? f.rest)),
        gap = Math.hypot(b.x - q.x, b.y - q.y) - f.r - s.table.r;
    const coming =
        b.vy > 0 && b.y > f.y - 5 && b.y < f.y + 0.5 && (side === "left") === b.x < P.mid;
    return { gap, coming };
}

/** Whether a flipper is up this step, from whether its key or finger is down and its grace. */
function swung(s: PinState, side: Side, hand: boolean): boolean {
    const g = s.grace[side];
    if (hand && !s.hands[side]) {
        const t = toward(s, side);
        g.up = MIN_UP;
        g.wait = t.coming && t.gap > REACH ? GRACE : 0;
    }
    if (g.wait > 0) {
        if (toward(s, side).gap <= REACH) g.wait = 0;
        else {
            g.wait--;
            return false;
        }
    }
    if (g.up > 0) {
        g.up--;
        return true;
    }
    return hand;
}

export function stepPin(s: PinState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (s.won || s.out) return out;
    const L = s.L;
    const touch = pad.touch ? local(pad.touch) : null;
    if (pad.touch || pad.holding.length || pad.tapped || pad.lifted) s.touched = true;
    let left = pad.holding.includes("left"),
        right = pad.holding.includes("right");
    const onLane = touch !== null && s.resting && inLane(touch);
    if (touch && !onLane && touch.y > 18 && touch.x < P.right) {
        if (touch.x < P.mid) left = true;
        else right = true;
    }
    const up = { left: swung(s, "left", left), right: swung(s, "right", right) };
    if (up.left && !s.held.left) out.push({ cue: "lift", strength: 0.5, pan: -0.5 });
    if (up.right && !s.held.right) out.push({ cue: "lift", strength: 0.5, pan: 0.5 });
    s.hands = { left, right };
    s.held = up;
    // the plunger: held down on the key, or drawn down by a finger in the lane, and let go to launch
    if (s.resting) {
        const down = pad.holding.includes("down");
        if (down) {
            if (!s.pulling) {
                s.pulling = true;
                s.pull = 0;
            } else s.pull = notch(s.pull + 1 / (RATE * PULL_TIME));
        } else if (onLane && touch) {
            if (s.grab === null) {
                s.grab = touch.y;
                s.pulling = true;
                s.pull = 0;
            } else s.pull = notch((touch.y - s.grab) / PULL_TRAVEL);
        } else if (s.pulling) {
            if (s.pull >= 0.05) launch(s, out);
            else {
                s.pulling = false;
                s.pull = 0;
                s.grab = null;
            }
        }
    }
    // a nudge: a small push up the table, three to a ball
    if (s.cool > 0) s.cool--;
    if (pad.tapped && s.ball.mode === "free" && !s.resting && s.cool === 0) {
        if (s.nudges < 3) {
            s.ball.vy -= 4.5;
            s.ball.vx += s.nudges % 2 === 0 ? 1.5 : -1.5;
            s.nudges++;
            s.cool = Math.round(RATE * 0.8);
            out.push({ shake: 0.25 }, { cue: "place", strength: 0.4 });
        } else s.note = "That ball has had its three nudges.";
    }
    if (s.double > 0) s.double--;
    for (let k = 0; k < SUB / RATE; k++)
        react(s, stepTable(s.ball, s.table, s.live, s.held, 1 / SUB), out);
    const b = s.ball;
    // a launch too weak to clear the lane rolls back onto the plunger
    if (b.mode === "free" && b.x > P.right && b.y > P.rest.y - 0.6 && Math.hypot(b.vx, b.vy) < 2) {
        s.ball = restBall();
        s.resting = true;
    }
    if (b.mode === "free" && !s.resting) {
        if (Math.hypot(b.vx, b.vy) < 0.6) s.slow++;
        else s.slow = 0;
        // a ball that has come to rest somewhere is given a push, so it never sits stuck
        if (s.slow > RATE * 2.5) {
            b.vy -= 7;
            b.vx += b.x < P.mid ? 2 : -2;
            s.slow = 0;
        }
        if (s.steps % 2 === 0) {
            if (Math.hypot(b.vx, b.vy) > 16) s.trail = [...s.trail, { x: b.x, y: b.y }].slice(-7);
            else if (s.trail.length) s.trail = s.trail.slice(1);
        }
    }
    if (b.mode === "gone") {
        if (s.wait === 0) {
            s.wait = Math.round(RATE * 0.9);
            s.balls++;
            s.trail = [];
            if (
                (L.ask.kind === "atleast" || L.ask.kind === "sum") &&
                L.balls !== undefined &&
                s.balls >= L.balls &&
                !s.won
            ) {
                s.note =
                    L.ask.kind === "atleast"
                        ? `Out of balls with ${s.sum} of ${L.ask.total}.`
                        : `Out of balls with ${s.sum}, and the target was exactly ${L.ask.total}.`;
                s.out = true;
                return out;
            } else if (!s.note.includes("past "))
                s.note = "The ball drained. Here comes the next one.";
        }
        s.wait--;
        if (s.wait <= 0) {
            s.wait = 0;
            s.ball = restBall();
            s.resting = true;
            s.nudges = 0;
            s.slow = 0;
        }
    }
    return out;
}

/** The ball's path from the plunger at `pull`, with no flipper moved, for the dotted launch. */
function launchPath(s: PinState, pull: number): Pt[] {
    const ball: Ball = { ...restBall(), mode: "free", vy: -(LEAST + PIN.launch.value * pull) },
        live = structuredClone(s.live),
        pts: Pt[] = [];
    for (let i = 0; i < SUB * 1.3 && ball.mode === "free"; i++) {
        stepTable(ball, s.table, live, { left: false, right: false }, 1 / SUB);
        if (i % 6 === 0) pts.push({ x: ball.x, y: ball.y });
        if (i > SUB * 0.3 && ball.y > 24) break;
    }
    return pts;
}

/** The flipper nearest a ball coming down onto it, if one is, and the path the ball would take if it were swung now. */
function flipPath(s: PinState): { side: "left" | "right"; pts: Pt[] } | null {
    const b = s.ball;
    if (b.mode !== "free" || s.resting || b.y < 25 || b.vy < -1) return null;
    const side = b.x < P.mid ? "left" : "right",
        f = s.table.flippers.find((x) => x.side === side);
    if (!f || Math.hypot(b.x - f.x, b.y - f.y) > 5.5) return null;
    const ball = { ...b },
        live = structuredClone(s.live),
        pts: Pt[] = [],
        held = { left: side === "left", right: side === "right" };
    for (let i = 0; i < SUB * 0.9 && ball.mode === "free"; i++) {
        stepTable(ball, s.table, live, held, 1 / SUB);
        if (i % 6 === 0) pts.push({ x: ball.x, y: ball.y });
    }
    return pts.length > 2 && (pts[pts.length - 1]?.y ?? 99) < b.y - 2 ? { side, pts } : null;
}

const recent = (at: number | undefined, now: number, within: number) =>
    at !== undefined && now - at < within;

export function pinFrame(s: PinState, rest = false): Frame {
    const L = s.L,
        sprites: Sprite[] = [],
        marks: Mark[] = [],
        lights: Light[] = [],
        w = (p: Pt) => ({ x: p.x + TABLE_AT.x, y: p.y + TABLE_AT.y });
    // the garden round the table: a hedge behind, trees and flowers either side, the gate and Charlie
    for (let x = 4; x < WORLD.w; x += 9)
        if (Math.abs(x + 4 - WORLD.w / 2) > P.w / 2 + 3)
            sprites.push({
                key: `hedge:${x}`,
                art: "hedge",
                params: { clumps: 4, berries: x % 18 === 4 ? 3 : 0, gap: 0 },
                x: x + 4,
                y: 40.5,
                size: 9,
                stand: true,
                z: 0,
                still: true,
            });
    for (const [i, x] of [12, 26, 72, 86].entries())
        sprites.push({
            key: `tree:${i}`,
            art: "tree",
            params: { fruit: i % 2 === 0 ? 4 : 0, fallen: 0, item: "apple" },
            x,
            y: 24 + (i % 2) * 3,
            size: 9,
            stand: true,
            z: 0,
            still: true,
        });
    for (const [i, x] of [18, 31, 65, 79].entries())
        sprites.push({
            key: `flowers:${i}`,
            art: "flowers",
            params: { count: 3, petals: 5 + (i % 3) },
            x,
            y: 37 + (i % 2),
            size: 4,
            stand: true,
            z: 1,
            still: true,
        });
    sprites.push({
        key: "gate",
        art: "gardengate",
        params: { bars: 5, open: 1 },
        x: TABLE_AT.x - 5,
        y: 36,
        size: 6,
        stand: true,
        z: 1,
        still: true,
    });
    const cheering = s.won || recent(s.cheer, s.steps, RATE * 1.4);
    sprites.push({
        key: "charlie",
        art: "charlie",
        params: {
            pose: cheering ? "cheer" : "point",
            mood: cheering ? "excited" : "happy",
            hair: "ponytail",
            top: "berry",
            sleeves: "short",
            print: "heart",
            wear: "shorts",
            bottom: "sky",
        },
        x: TABLE_AT.x + P.w + 4.5,
        y: 36.5,
        size: 6,
        stand: true,
        flip: true,
        z: 2,
        live: true,
        seed: 5,
    });
    sprites.push({
        key: "board",
        art: "pinballboard",
        params: { tone: "tang" },
        x: TABLE_AT.x + P.w / 2,
        y: 2.75,
        size: 20,
        z: 2,
        still: true,
    });
    marks.push(
        { kind: "word", x: TABLE_AT.x + P.w / 2, y: 2.35, text: askWords(L), size: 0.85 },
        { kind: "word", x: TABLE_AT.x + P.w / 2, y: 3.75, text: tallyWords(s), size: 0.7 },
    );
    sprites.push({
        key: "table",
        art: "pinballtable",
        params: { place: L.place },
        x: TABLE_AT.x + P.w / 2,
        y: TABLE_AT.y + P.h / 2,
        z: 3,
        still: true,
    });
    if (L.ramp !== undefined)
        sprites.push({
            key: "ramp",
            art: "canramp",
            params: { tone: "sky" },
            ...w({ x: 3.3, y: 15.9 }),
            size: 4,
            z: 5,
            still: true,
        });
    if (L.double) {
        const lit = s.double > 0;
        sprites.push({
            key: "lane",
            art: "rollover",
            params: { label: "×2", lit },
            ...w({ x: LANE.x + LANE.w / 2, y: LANE.y + LANE.h / 2 }),
            size: 1.8,
            z: 5,
            ...(lit ? { glow: 1.6 } : {}),
        });
    }
    if (L.spinner) {
        const spin = s.live.spin.spin?.a ?? 0;
        sprites.push({
            key: "spin",
            art: "sunflower",
            params: { turn: Math.round(((spin / (Math.PI * 2)) % 1) * 8) / 8 },
            ...w(SPIN),
            size: 2.2,
            z: 5,
            live: true,
        });
    }
    if (L.hive !== undefined)
        sprites.push({
            key: "hive",
            art: "beehive",
            params: { bees: 2 },
            ...w(HIVE),
            size: 2,
            z: 5,
            ...(recent(s.bloom.hive, s.steps, RATE * 0.6) ? { glow: 1.4, scale: 1.08 } : {}),
        });
    POSTS.forEach((p, i) =>
        sprites.push({
            key: `post:${i}`,
            art: "toadstools",
            params: { count: 1, spots: 3 },
            ...w(p),
            size: 1.5,
            z: 5,
            still: true,
        }),
    );
    L.flowers.forEach((n, i) => {
        const id = flowerId(i),
            slot = SLOTS[i];
        if (!slot) return;
        const wilted = recent(s.wilt[id], s.steps, RATE * 1.2),
            lit = s.lit.includes(id),
            since = s.steps - (s.bloom[id] ?? -999),
            bloom = since < RATE * 0.4 ? Math.round((1 - since / (RATE * 0.4)) * 4) / 4 : 0;
        sprites.push({
            key: `flower:${i}`,
            art: "flowerbumper",
            params: {
                n,
                tone: TONES[i % TONES.length] ?? "berry",
                state: wilted ? "wilted" : lit ? "lit" : "plain",
                bloom,
            },
            ...w(slot),
            size: 2.3,
            z: 6,
            live: true,
            ...(lit || bloom > 0 ? { glow: lit ? 1.8 : 1.3 } : {}),
        });
        if (L.lights) lights.push({ ...w(slot), r: 2.6, hue: "glow", strength: lit ? 1 : 0.55 });
    });
    if (L.snail !== undefined) {
        const at = postAt(
                { id: "snail", ...SNAIL, r: 0.85, move: { dx: 3.5, period: 7 } },
                s.live.t,
            ),
            going = Math.cos((s.live.t / 7) * Math.PI * 2) > 0;
        sprites.push({
            key: "snail",
            art: "snailtarget",
            params: { n: L.snail },
            ...w(at),
            size: 2.6,
            z: 6,
            flip: !going,
            ...(recent(s.bloom.snail, s.steps, RATE * 0.4) ? { glow: 1.3 } : {}),
        });
    }
    (L.ladies ?? []).forEach((n, i) => {
        const down = s.live.down.includes(ladyId(i));
        sprites.push({
            key: `lady:${i}`,
            art: "ladybird",
            params: { n, down },
            ...w({ x: LADY_X[i] ?? 0, y: LADY_Y }),
            size: 1.6,
            z: 6,
            alpha: down ? 0.6 : 1,
            ...(L.ask.kind === "order" && i === s.next && !s.won ? { glow: 1.2 } : {}),
        });
    });
    s.table.flippers.forEach((f, i) => {
        const a = s.live.angles[i] ?? f.rest,
            // the drawing's pivot is LEAF.pivot from its left end, and its box is four squares wide
            centre = {
                x: f.x + Math.cos(a) * (2 - LEAF.pivot),
                y: f.y + Math.sin(a) * (2 - LEAF.pivot),
            };
        sprites.push({
            key: `flipper:${f.side}`,
            art: "leafflipper",
            params: { tone: "mint" },
            ...w(centre),
            angle: a,
            size: 4,
            z: 7,
        });
    });
    const plungerPull = s.resting ? s.pull : 0;
    sprites.push({
        key: "plunger",
        art: "plunger",
        params: { pull: Math.round(plungerPull * 10) / 10 },
        // its plate, 0.4 down its 4-square box, meets the lane floor under the ball; the knob stands out below the rim
        ...w({ x: P.rest.x, y: P.floor - 0.3 + 2 }),
        size: 2,
        z: 5,
        live: true,
    });
    const b = s.ball;
    if (b.mode !== "gone") {
        const at = s.resting
            ? { x: P.rest.x, y: P.rest.y + Math.round(plungerPull * 10) * 0.13 }
            : { x: b.x, y: b.y };
        sprites.push({
            key: "ball",
            art: "marble",
            params: { tone: "sky" },
            ...w(at),
            size: 1.15,
            z: b.mode === "ramp" ? 9 : 8,
        });
        if (!rest && s.trail.length > 1)
            marks.push({ kind: "dots", pts: s.trail.map(w), faint: true, opacity: 0.5 });
    }
    if (!s.won) {
        if (s.resting && L.preview >= 1 && s.pull >= 0.05)
            marks.push({ kind: "dots", pts: launchPath(s, s.pull).map(w), faint: true });
        else if (s.resting && L.preview >= 1)
            marks.push({
                kind: "line",
                a: w({ x: P.rest.x, y: P.rest.y - 1 }),
                b: w({ x: P.rest.x, y: P.rest.y - 3.5 }),
                style: "aim",
                head: true,
            });
        if (L.preview === 2) {
            const way = flipPath(s);
            if (way) marks.push({ kind: "dots", pts: way.pts.map(w), faint: true, opacity: 0.55 });
        }
    }
    const centre = { x: WORLD.w / 2, y: WORLD.h / 2 };
    return {
        sprites,
        marks,
        camera: centre,
        view: { ...VIEW },
        world: { ...WORLD },
        focus: centre,
        time: rest ? 0 : s.steps / RATE,
        ...(lights.length ? { lights } : {}),
    };
}

/** Pinball garden's own sounds: a flipper's clack, a flower's boing, the spring, a ladybird's knock, the spinner's tick and the can's whoosh. */
const SOUNDS: Kit = {
    lift: [
        { wave: "noise", hz: 1800, attack: 0.001, decay: 0.025, gain: 0.3 },
        { wave: "sine", hz: 240, to: 180, attack: 0.001, decay: 0.05, gain: 0.25 },
    ],
    bump: [
        { wave: "sine", hz: 420, to: 640, attack: 0.002, decay: 0.12, gain: 0.35 },
        { wave: "triangle", hz: 840, to: 1100, attack: 0.002, decay: 0.08, gain: 0.15 },
    ],
    place: [{ wave: "sine", hz: 300, to: 220, attack: 0.002, decay: 0.05, gain: 0.25 }],
    creak: [
        { wave: "sine", hz: 160, to: 520, attack: 0.004, decay: 0.16, gain: 0.3 },
        { wave: "noise", hz: 3000, attack: 0.001, decay: 0.03, gain: 0.2 },
    ],
    crash: [
        { wave: "sine", hz: 200, to: 120, attack: 0.002, decay: 0.09, gain: 0.35 },
        { wave: "noise", hz: 1400, attack: 0.001, decay: 0.04, gain: 0.25 },
    ],
    level: [{ wave: "triangle", hz: 1500, attack: 0.001, decay: 0.02, gain: 0.18 }],
    splash: [{ wave: "noise", hz: 700, to: 2200, attack: 0.02, decay: 0.3, gain: 0.25 }],
    back: [{ wave: "sine", hz: 330, to: 160, attack: 0.004, decay: 0.3, gain: 0.25 }],
    nope: [
        { wave: "sine", hz: 620, attack: 0.001, decay: 0.05, gain: 0.25 },
        { wave: "sine", hz: 520, attack: 0.001, decay: 0.07, gain: 0.25, delay: 0.08 },
    ],
    ring: [
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.18, gain: 0.28 },
        { wave: "triangle", hz: 1175, attack: 0.01, decay: 0.26, gain: 0.22, delay: 0.07 },
    ],
    win: [
        { wave: "triangle", hz: 523, attack: 0.01, decay: 0.25, gain: 0.35 },
        { wave: "triangle", hz: 659, attack: 0.01, decay: 0.25, gain: 0.35, delay: 0.12 },
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.3, gain: 0.35, delay: 0.24 },
        { wave: "triangle", hz: 1047, attack: 0.01, decay: 0.5, gain: 0.35, delay: 0.36 },
    ],
};

function say(s: PinState): string {
    const b = s.ball,
        where = s.resting
            ? `The ball waits on the plunger, pulled back ${Math.round(s.pull * 100)}%.`
            : b.mode === "gone"
              ? "The ball has drained, and the next one is coming up."
              : b.mode === "saucer"
                ? "The ball is in the beehive."
                : b.mode === "ramp"
                  ? "The ball is riding the watering can."
                  : `The ball is ${Math.round(b.x)} across and ${Math.round(b.y)} down the table, ${b.vy < 0 ? "going up" : "coming down"}.`;
    const flowers = s.L.flowers
        .map((n, i) => (n > 0 ? `${n}${s.lit.includes(flowerId(i)) ? " lit" : ""}` : ""))
        .filter((t) => t !== "")
        .join(", ");
    return `${askWords(s.L)}. ${tallyWords(s)}. ${flowers ? `Flowers: ${flowers}. ` : ""}${where}`;
}

const isBest = (v: unknown): v is { best: number } =>
    typeof v === "object" &&
    v !== null &&
    "best" in v &&
    typeof v.best === "number" &&
    Number.isFinite(v.best) &&
    v.best >= 0;

export const pinballGame: ActionGame<PinState> = {
    id: "pinball",
    title: "Pinball garden",
    group: "action",
    // the whole table has to be in view to play it, and a 240 px card shows it at under 12 px a square
    card: null,
    portrait: { keep: 24 },
    quiet: true,
    touch: true,
    levels: PIN_LEVELS,
    rate: RATE,
    cover: { art: "flowerbumper", params: { n: 5, tone: "berry", state: "lit", bloom: 1 } },
    hint: "Pull the plunger down and let go, then hold a flipper to bat the ball. With the keys, hold down to pull and let go to launch, left and right swing the flippers, and space nudges.",
    controls: {
        arrows: { left: "Left flipper", right: "Right flipper", down: "Pull the plunger" },
        go: "Nudge",
        icons: { go: "faster" },
    },
    sounds: SOUNDS,
    saves: { level: PIN_LEVELS.length - 1 },
    checkpoint: (s) => ({ best: Math.max(s.best, s.score) }),
    restore: (s, v) => {
        if (!isBest(v)) return false;
        s.best = Math.max(s.best, Math.round(v.best));
        return true;
    },
    start: (phase) => startPin(PIN_LEVELS[phase] ?? PIN_LEVELS[0], phase),
    step: stepPin,
    say,
    note: (s) => (!s.touched && !s.won ? s.L.prompt : s.note),
    won: (s) => s.won,
    ended: (s) =>
        s.won ? { won: true, words: s.note } : s.out ? { won: false, words: s.note } : null,
    objectives: (s) => {
        const a = s.L.ask;
        if (a.kind === "hits") return { completed: s.hits, total: a.count };
        if (a.kind === "sum" || a.kind === "atleast")
            return { completed: Math.min(a.total, s.sum), total: a.total };
        if (a.kind === "odd") return { completed: s.lit.length, total: oddIds(s.L).length };
        if (a.kind === "order") return { completed: s.next, total: s.L.ladies?.length ?? 0 };
        return { completed: 0, total: 1 };
    },
    frame: pinFrame,
    cancelInput: (s) => {
        s.pulling = false;
        s.pull = 0;
        s.grab = null;
        s.held = { left: false, right: false };
        s.hands = { left: false, right: false };
        s.grace = { left: { wait: 0, up: 0 }, right: { wait: 0, up: 0 } };
    },
    hum: (s): Hum[] => {
        const v = s.ball.mode === "free" && !s.resting ? Math.hypot(s.ball.vx, s.ball.vy) : 0;
        return v > 0.5 ? [{ kind: "roll", level: Math.min(1, v / 26) }] : [];
    },
    tuning: PIN,
    still: {
        press: () => Math.round(RATE * 0.15),
        settling: (s) => !s.won && !s.out && (s.ball.mode !== "held" || s.wait > 0),
    },
};

/** The tip of a flipper at its angle now, for a test. */
export const tipOf = (s: PinState, side: "left" | "right"): Pt | null => {
    const i = s.table.flippers.findIndex((f) => f.side === side),
        f = s.table.flippers[i];
    return f ? flipperTip(f, s.live.angles[i] ?? f.rest) : null;
};
