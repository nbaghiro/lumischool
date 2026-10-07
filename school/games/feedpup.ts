// Feed the pup, after Cut the Rope: a biscuit hangs on ropes from pegs, and a swipe across a rope cuts
// it. The biscuit swings and falls through numbered stars, puffs of air and soap bubbles to Pip, and
// the stars it catches on the way have to make the number on Pip's bowl, so which rope goes first and
// when is the sum. The hand chooses when and where to cut and how hard to blow; the rope physics in
// engine/motion/tether.ts decides the rest. See .docs/games.md.
import type { Hum, Kit } from "../../engine/sound/kit";
import { semitones } from "../../engine/sound/kit";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import {
    puffOn,
    sagOf,
    stepBob,
    swipeCuts,
    type Air,
    type Bob,
    type Bubble,
    type Puffer,
    type Tether,
} from "../../engine/motion/tether";
import type { ActionGame, ActionLevel, Levels } from "./game";

export type FeedPlace = "kitchen" | "garden" | "playground" | "bath" | "hill" | "treehouse";

/**
 * What the stars on the way have to make: the bowl's number; that number from odd stars only; that
 * number from exactly `count` stars; or the number missing from `given` to make `total`.
 */
export type FeedAsk =
    | { kind: "sum"; total: number }
    | { kind: "odd"; total: number }
    | { kind: "count"; total: number; count: number }
    | { kind: "missing"; given: number; total: number };

export interface FeedPeg {
    x: number;
    y: number;
    /** The rope's length in squares; left out, it is just long enough to reach the biscuit where it starts, taut. */
    len?: number;
    hook?: true;
}

export interface FeedPuffer extends Puffer {
    /** A bellows on a wall, or a dandelion clock on the hill. */
    kind: "bellows" | "dandelion";
}

export interface FeedLevel extends ActionLevel {
    place: FeedPlace;
    ask: FeedAsk;
    pegs: FeedPeg[];
    /** Where the biscuit is let go from as the round opens, which sets the swing it starts with. */
    from: Pt;
    stars: { x: number; y: number; n: number }[];
    bubbles: { x: number; y: number; r: number }[];
    puffers: FeedPuffer[];
    /** Where Pip stands, across. */
    pip: number;
    /** How much of the fall the dotted path shows, in seconds: none on the later levels. */
    preview: number;
    /**
     * How far across from Pip's mouth the biscuit is still caught, and how near a star's middle it
     * passes to catch the star, in squares. Wider on the first levels; left out, `REACH`.
     */
    reach?: { mouth: number; star: number };
    /** The first thing said, until the child acts. */
    prompt: string;
    /** The same place with other numbers on its stars and its bowl, for the variations. */
    other?: { ask: FeedAsk; stars: number[]; goal: string };
}

export interface FeedRope extends Tether {
    /** Seconds since it was cut, for the spring of the cut end back up to its peg. */
    snap: number;
    /** Where the swipe crossed it. */
    at: Pt;
}

export interface FeedState {
    L: FeedLevel;
    phase: number;
    bob: Bob;
    ropes: FeedRope[];
    bubbles: (Bubble & { pop: number })[];
    /** How long each puffer has left to show its squeeze, in seconds. */
    puffing: number[];
    got: boolean[];
    /** The stars' numbers in the order they were caught. */
    caught: number[];
    /** Seconds since each star was caught, for its pop. */
    popped: number[];
    /** What the keys have chosen: a rope, a bubble or a puffer, by its index. */
    pick: Target | null;
    /** A puffer being squeezed: by the keys or a finger, and for how many steps so far. */
    squeeze: { i: number; by: "keys" | "touch"; n: number } | null;
    /** Where a finger on the field was a step ago, and what it pressed on when it came down. */
    hand: { last: Pt; on: "air" | "puffer" | "bubble" } | null;
    /** The slash a swipe leaves, newest last, and how long since the finger lifted. */
    trail: Pt[];
    fade: number;
    steps: number;
    end: "won" | "fell" | "floated" | "refused" | null;
    /** Steps since the round ended, for Pip's chomp and wag. */
    since: number;
    touched: boolean;
    note: string;
}

export interface Target {
    kind: "rope" | "bubble" | "puffer";
    i: number;
}

const RATE = 60;
const DT = 1 / RATE;
const VIEW = { w: 30, h: 20 };
/** Where the floor is, and Pip's mouth above it: pupfamily's Pip drawn 4 squares across stands 5 tall with its mouth 3 up. */
const FLOOR = 19;
const MOUTH_UP = 3.05;
const BISCUIT = 0.8;
/** How far across from the mouth Pip still catches the biscuit, and how near a star's middle it passes to catch it, in squares. */
const REACH = { mouth: 1.4, star: 1.35 };
/** How near a rope a tap or a swipe has to come to cut it, in squares: a child's finger, not a blade. */
const TAP = 1;
const BAND = 0.5;
/** Steps a squeeze is held for its strongest puff. */
const FULL_SQUEEZE = 45;

const FEED = {
    gravity: knob(
        30,
        15,
        45,
        1,
        "squares/s²",
        "A drop of a whole field takes about a second, quick enough to see the whole fall and slow enough to follow it.",
    ),
    drag: knob(
        0.05,
        0,
        0.4,
        0.01,
        "share/s",
        "A swing that dies away slowly, so a child can wait for the next one and the one after.",
    ),
    lift: knob(
        0.25,
        0.1,
        1,
        0.05,
        "share of g",
        "A bubble lifts against the pull down hard enough to climb at all but not to race.",
    ),
    float: knob(
        1.5,
        0.5,
        4,
        0.1,
        "share/s",
        "With the lift, a bubble climbs about 5 squares a second, a walking pace a tap can catch.",
    ),
    puff: knob(
        13,
        5,
        25,
        1,
        "squares/s",
        "A full squeeze sends a still biscuit about a third of the field across.",
    ),
};

const air = (): Air => ({
    g: FEED.gravity.value,
    drag: FEED.drag.value,
    lift: FEED.lift.value,
    float: FEED.float.value,
});

const kitchen = "kitchen" as const;

export const FEED_LEVELS: Levels<FeedLevel> = [
    {
        title: "The kitchen peg",
        grades: [1, 2],
        goal: "Cut the rope so the biscuit drops through the 3 to Pip.",
        place: kitchen,
        ask: { kind: "sum", total: 3 },
        // a rope 3 squares long swings in about 2 seconds, right over Pip, and let go from the start it
        // lands just beside the mouth, so the dots go green only once it swings
        pegs: [{ x: 15, y: 7.5, len: 3 }],
        from: { x: 17.2, y: 9.54 },
        stars: [
            { x: 15, y: 13.4, n: 3 },
            { x: 20.8, y: 13.6, n: 2 },
        ],
        bubbles: [],
        puffers: [],
        pip: 15,
        preview: 2.5,
        reach: { mouth: 1.8, star: 1.7 },
        prompt: "Tap the rope when the dots turn green.",
        other: {
            ask: { kind: "sum", total: 4 },
            stars: [4, 1],
            goal: "Cut the rope so the biscuit drops through the 4 to Pip.",
        },
    },
    {
        title: "Two ropes",
        grades: [1, 2],
        goal: "Catch stars that make 5 on the way down to Pip. Which rope goes first?",
        place: kitchen,
        ask: { kind: "sum", total: 5 },
        pegs: [
            { x: 9, y: 3, hook: true },
            { x: 21, y: 3, hook: true },
        ],
        from: { x: 15, y: 5.5 },
        stars: [
            { x: 21, y: 9.6, n: 2 },
            { x: 9, y: 9.6, n: 1 },
            { x: 26.3, y: 12.4, n: 3 },
            { x: 15, y: 12.6, n: 4 },
        ],
        bubbles: [],
        puffers: [],
        pip: 26.3,
        preview: 2,
        reach: { mouth: 1.7, star: 1.55 },
        prompt: "Cut one rope and the biscuit swings on the other.",
        other: {
            ask: { kind: "sum", total: 7 },
            stars: [3, 2, 4, 5],
            goal: "Catch stars that make 7 on the way down to Pip. Which rope goes first?",
        },
    },
    {
        title: "The washing line",
        grades: [1, 3],
        goal: "Three ropes on the washing line. Catch stars that make 7.",
        place: "garden",
        ask: { kind: "sum", total: 7 },
        pegs: [
            { x: 10, y: 3 },
            { x: 16, y: 3 },
            { x: 24, y: 3 },
        ],
        from: { x: 16, y: 7 },
        stars: [
            { x: 10, y: 10.3, n: 1 },
            { x: 24, y: 12, n: 2 },
            { x: 5, y: 12.4, n: 3 },
            { x: 16, y: 12, n: 4 },
            { x: 19, y: 9, n: 5 },
        ],
        bubbles: [],
        puffers: [],
        pip: 19,
        preview: 0.6,
        reach: { mouth: 1.55, star: 1.45 },
        prompt: "Each rope you cut changes the swing. Which order catches 7?",
        other: {
            ask: { kind: "sum", total: 9 },
            stars: [2, 4, 1, 3, 5],
            goal: "Three ropes on the washing line. Catch stars that make 9.",
        },
    },
    {
        title: "A bubble in the playground",
        grades: [1, 3],
        goal: "A bubble floats the biscuit up. Catch stars that make 6, then pop it over Pip.",
        place: "playground",
        ask: { kind: "sum", total: 6 },
        pegs: [{ x: 8, y: 3 }],
        from: { x: 3, y: 6.5 },
        stars: [
            { x: 16.1, y: 9.8, n: 2 },
            { x: 16.2, y: 5.5, n: 4 },
            { x: 11, y: 12.3, n: 3 },
            { x: 12.6, y: 7.4, n: 1 },
        ],
        bubbles: [{ x: 15.2, y: 12, r: 1.5 }],
        puffers: [],
        pip: 16,
        preview: 0.5,
        prompt: "Fling the biscuit into the bubble, then tap the bubble to pop it.",
        other: {
            ask: { kind: "sum", total: 8 },
            stars: [3, 5, 2, 1],
            goal: "A bubble floats the biscuit up. Catch stars that make 8, then pop it over Pip.",
        },
    },
    {
        title: "Bath time",
        grades: [2, 3],
        goal: "Only odd stars, making 8. An even star spoils it.",
        place: "bath",
        ask: { kind: "odd", total: 8 },
        pegs: [
            { x: 19, y: 3 },
            { x: 26, y: 3 },
        ],
        from: { x: 22.5, y: 6.5 },
        stars: [
            { x: 12.8, y: 8.8, n: 3 },
            { x: 12.8, y: 4.6, n: 5 },
            { x: 17.5, y: 12.5, n: 8 },
            { x: 25, y: 7.5, n: 1 },
            { x: 19, y: 10.5, n: 2 },
        ],
        bubbles: [
            { x: 13.5, y: 11.8, r: 1.5 },
            { x: 25, y: 12.5, r: 1.5 },
        ],
        puffers: [],
        pip: 12.5,
        preview: 0,
        prompt: "Odd stars only. Which rope first, and when?",
        other: {
            ask: { kind: "odd", total: 6 },
            stars: [1, 5, 6, 3, 4],
            goal: "Only odd stars, making 6. An even star spoils it.",
        },
    },
    {
        title: "The windy hill",
        grades: [2, 3],
        goal: "Blow the dandelions to carry the biscuit to Pip through stars that make 9.",
        place: "hill",
        ask: { kind: "sum", total: 9 },
        pegs: [{ x: 9, y: 3 }],
        from: { x: 9, y: 8 },
        stars: [
            { x: 15.7, y: 10.6, n: 4 },
            { x: 18.4, y: 13.3, n: 5 },
            { x: 14.2, y: 12.4, n: 3 },
            { x: 11.5, y: 10.6, n: 2 },
        ],
        bubbles: [],
        puffers: [
            { x: 3.5, y: 8, dir: 0, reach: 10, spread: 0.45, kind: "dandelion" },
            { x: 6, y: 16, dir: -0.5, reach: 11, spread: 0.5, kind: "dandelion" },
        ],
        pip: 20.2,
        preview: 0,
        prompt: "Hold a dandelion longer for a bigger puff.",
        other: {
            ask: { kind: "sum", total: 10 },
            stars: [6, 4, 2, 5],
            goal: "Blow the dandelions to carry the biscuit to Pip through stars that make 10.",
        },
    },
    {
        title: "Three stars for ten",
        grades: [2, 4],
        goal: "Exactly three stars, making 10. Two stars that make 10 will not do.",
        place: kitchen,
        ask: { kind: "count", total: 10, count: 3 },
        pegs: [
            { x: 20, y: 3, hook: true },
            { x: 14, y: 3, hook: true },
            { x: 6, y: 3, hook: true },
        ],
        from: { x: 14, y: 7 },
        stars: [
            { x: 20, y: 10.3, n: 5 },
            { x: 6, y: 12, n: 2 },
            { x: 25, y: 12.4, n: 6 },
            { x: 14, y: 12, n: 5 },
            { x: 11, y: 9, n: 3 },
        ],
        bubbles: [],
        puffers: [{ x: 27.2, y: 14.5, dir: Math.PI, reach: 9, spread: 0.45, kind: "bellows" }],
        pip: 16,
        preview: 0,
        prompt: "Two stars can make 10 too, but Pip wants three.",
        other: {
            ask: { kind: "count", total: 12, count: 3 },
            stars: [6, 3, 4, 6, 3],
            goal: "Exactly three stars, making 12. Two stars that make 12 will not do.",
        },
    },
    {
        title: "The treehouse",
        grades: [3, 4],
        goal: "Pip's bowl says 6 + ? = 10. Catch the stars that make the missing number.",
        place: "treehouse",
        ask: { kind: "missing", given: 6, total: 10 },
        pegs: [{ x: 22, y: 3 }],
        from: { x: 27, y: 6.5 },
        stars: [
            { x: 13.6, y: 10.6, n: 1 },
            { x: 13.5, y: 6.2, n: 2 },
            { x: 20.8, y: 9.5, n: 3 },
            { x: 24.5, y: 12.5, n: 5 },
        ],
        bubbles: [{ x: 15, y: 14, r: 1.5 }],
        puffers: [{ x: 6, y: 7.5, dir: 0, reach: 14, spread: 0.5, kind: "dandelion" }],
        pip: 21,
        preview: 0,
        prompt: "The dandelion can blow a bubble along.",
        other: {
            ask: { kind: "missing", given: 5, total: 12 },
            stars: [3, 2, 4, 6],
            goal: "Pip's bowl says 5 + ? = 12. Catch the stars that make the missing number.",
        },
    },
];

export function startFeed(L: FeedLevel, phase: number): FeedState {
    const bob: Bob = { x: L.from.x, y: L.from.y, vx: 0, vy: 0 };
    return {
        L,
        phase,
        bob,
        ropes: L.pegs.map((p) => ({
            ax: p.x,
            ay: p.y,
            len: p.len ?? Math.hypot(L.from.x - p.x, L.from.y - p.y),
            cut: false,
            snap: 0,
            at: { x: p.x, y: p.y },
        })),
        bubbles: L.bubbles.map((b) => ({ ...b, held: false, popped: false, pop: 0 })),
        puffing: L.puffers.map(() => 0),
        got: L.stars.map(() => false),
        caught: [],
        popped: L.stars.map(() => 0),
        pick: null,
        squeeze: null,
        hand: null,
        trail: [],
        fade: 1,
        steps: 0,
        end: null,
        since: 0,
        touched: false,
        note: L.prompt,
    };
}

export const mouthOf = (s: FeedState): Pt => ({ x: s.L.pip, y: FLOOR - MOUTH_UP });

const reachOf = (L: FeedLevel) => L.reach ?? REACH;

/** Whether the biscuit at `p` is in reach of Pip's mouth. */
function inMouth(s: FeedState, p: Pt): boolean {
    const m = mouthOf(s);
    return Math.abs(p.x - m.x) < reachOf(s.L).mouth && Math.abs(p.y - m.y) < 1.2;
}

/** Whether the biscuit at `p` has gone past the floor or off a side. */
const lost = (p: Pt): boolean => p.y + BISCUIT > FLOOR + 0.2 || p.x < -1.5 || p.x > VIEW.w + 1.5;

const sumOf = (s: FeedState): number => s.caught.reduce((a, n) => a + n, 0);

/** The stars' sum the bowl asks for. */
export function wanted(a: FeedAsk): number {
    return a.kind === "missing" ? a.total - a.given : a.total;
}

/** Whether the stars caught are what the bowl asks for. */
export function fits(a: FeedAsk, caught: readonly number[]): boolean {
    const sum = caught.reduce((t, n) => t + n, 0);
    if (sum !== wanted(a)) return false;
    if (a.kind === "odd") return caught.every((n) => n % 2 === 1);
    if (a.kind === "count") return caught.length === a.count;
    return true;
}

/** What Pip's bowl says. */
export function bowlText(a: FeedAsk): string {
    return a.kind === "missing" ? `${a.given}+?=${a.total}` : String(a.total);
}

export function askWords(a: FeedAsk): string {
    switch (a.kind) {
        case "sum":
            return `The stars have to make ${a.total}`;
        case "odd":
            return `Odd stars only, making ${a.total}`;
        case "count":
            return `Exactly ${a.count} stars, making ${a.total}`;
        case "missing":
            return `${a.given} and the stars make ${a.total}`;
    }
}

const live = (s: FeedState): boolean => s.end === null;

/** The ropes still holding the biscuit. */
const holding = (s: FeedState): FeedRope[] => s.ropes.filter((r) => !r.cut);

const heldBubble = (s: FeedState) => s.bubbles.find((b) => b.held && !b.popped) ?? null;

/** Where a thing the keys can choose is, for the ring round it and the order the arrows go in. */
function whereOf(s: FeedState, t: Target): Pt | null {
    if (t.kind === "rope") {
        const r = s.ropes[t.i];
        return r && !r.cut ? { x: (r.ax + s.bob.x) / 2, y: (r.ay + s.bob.y) / 2 } : null;
    }
    if (t.kind === "bubble") {
        const b = s.bubbles[t.i];
        return b && !b.popped ? { x: b.x, y: b.y } : null;
    }
    const p = s.L.puffers[t.i];
    return p ? { x: p.x, y: p.y } : null;
}

/** Everything the keys can choose now, left to right. */
export function targets(s: FeedState): Target[] {
    const all: Target[] = [
        ...s.ropes.map((_, i) => ({ kind: "rope" as const, i })),
        ...s.bubbles.map((_, i) => ({ kind: "bubble" as const, i })),
        ...s.L.puffers.map((_, i) => ({ kind: "puffer" as const, i })),
    ];
    const placed = all.flatMap((t) => {
        const at = whereOf(s, t);
        return at ? [{ t, at }] : [];
    });
    // ropes keep their pegs' order, so a choice does not jump about as the biscuit swings
    const key = (p: { t: Target; at: Pt }) =>
        p.t.kind === "rope" ? (s.ropes[p.t.i]?.ax ?? 0) : p.at.x;
    placed.sort((a, b) => key(a) - key(b) || a.at.y - b.at.y);
    return placed.map((p) => p.t);
}

const same = (a: Target | null, b: Target | null): boolean =>
    a !== null && b !== null && a.kind === b.kind && a.i === b.i;

/** The target the keys have now, falling back to the first when the chosen one has gone. */
export function chosen(s: FeedState): Target | null {
    const all = targets(s);
    return all.find((t) => same(t, s.pick)) ?? all[0] ?? null;
}

function cut(s: FeedState, r: FeedRope, at: Pt, out: Happening[]): void {
    r.cut = true;
    r.snap = 0;
    r.at = at;
    s.touched = true;
    const left = holding(s).length;
    s.note = left
        ? `Snip. ${left === 1 ? "One rope" : `${left} ropes`} left.`
        : "Snip. Down it goes.";
    out.push(
        { cue: "lift", pan: panAt(at.x) },
        { event: { kind: "cut" } },
        { burst: { kind: "dust", x: at.x, y: at.y, n: 3 } },
    );
}

function pop(s: FeedState, b: FeedState["bubbles"][number], out: Happening[]): void {
    b.popped = true;
    b.held = false;
    b.pop = 0;
    s.touched = true;
    s.note = "Pop.";
    out.push(
        { cue: "splash", strength: 0.5, pan: panAt(b.x) },
        { burst: { kind: "bubble", x: b.x, y: b.y, n: 6 } },
    );
}

function blow(s: FeedState, i: number, n: number, out: Happening[]): void {
    const p = s.L.puffers[i];
    if (!p) return;
    const strength = Math.min(1, n / FULL_SQUEEZE);
    const push = puffOn(p, s.bob, strength, FEED.puff.value);
    s.bob.vx += push.x;
    s.bob.vy += push.y;
    s.puffing[i] = 0.4;
    s.touched = true;
    s.note = strength > 0.7 ? "A big puff." : strength > 0.3 ? "A puff." : "A little puff.";
    out.push(
        { cue: "back", strength: 0.4 + 0.6 * strength, pan: panAt(p.x) },
        {
            puff: {
                x: p.x + Math.cos(p.dir) * 1.6,
                y: p.y + Math.sin(p.dir) * 1.6,
                n: 2 + Math.round(3 * strength),
            },
        },
    );
}

const panAt = (x: number): number => Math.max(-1, Math.min(1, ((x - VIEW.w / 2) / VIEW.w) * 1.6));

function act(s: FeedState, t: Target, out: Happening[]): void {
    if (t.kind === "rope") {
        const r = s.ropes[t.i];
        if (r && !r.cut) cut(s, r, { x: (r.ax + s.bob.x) / 2, y: (r.ay + s.bob.y) / 2 }, out);
    } else if (t.kind === "bubble") {
        const b = s.bubbles[t.i];
        if (b && !b.popped) pop(s, b, out);
    }
}

/** What is under a finger that comes down at `p`: a puffer, a bubble, or air to swipe through. */
function under(s: FeedState, p: Pt): { on: "air" | "puffer" | "bubble"; i: number } {
    const b = s.bubbles.findIndex((b) => !b.popped && Math.hypot(p.x - b.x, p.y - b.y) < b.r + 0.6);
    if (b >= 0) return { on: "bubble", i: b };
    const f = s.L.puffers.findIndex((q) => Math.hypot(p.x - q.x, p.y - q.y) < 1.8);
    if (f >= 0) return { on: "puffer", i: f };
    return { on: "air", i: -1 };
}

function swipe(s: FeedState, a: Pt, b: Pt, out: Happening[]): void {
    for (const r of s.ropes) {
        if (r.cut) continue;
        if (swipeCuts(a, b, r, s.bob)) cut(s, r, crossing(a, b, r, s.bob), out);
        else if (Math.min(apart(a, r, s.bob), apart(b, r, s.bob)) < BAND)
            cut(s, r, nearest(b, r, s.bob), out);
    }
}

/** The point on the rope from its peg to the biscuit nearest `p`. */
function nearest(p: Pt, r: Tether, bob: Pt): Pt {
    const dx = bob.x - r.ax,
        dy = bob.y - r.ay,
        d2 = dx * dx + dy * dy;
    const t = d2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - r.ax) * dx + (p.y - r.ay) * dy) / d2));
    return { x: r.ax + dx * t, y: r.ay + dy * t };
}

const apart = (p: Pt, r: Tether, bob: Pt): number => {
    const q = nearest(p, r, bob);
    return Math.hypot(p.x - q.x, p.y - q.y);
};

/** The rope a finger coming down at `p` taps, on the rope or on its peg: the nearest within `TAP`. */
function tapped(s: FeedState, p: Pt): FeedRope | null {
    let best: FeedRope | null = null,
        most = TAP;
    for (const r of s.ropes) {
        const d = r.cut ? Infinity : apart(p, r, s.bob);
        if (d < most) {
            best = r;
            most = d;
        }
    }
    return best;
}

/** Where the swipe `a`-`b` crosses the rope from its peg to the biscuit. */
function crossing(a: Pt, b: Pt, r: Tether, bob: Pt): Pt {
    const dx = b.x - a.x,
        dy = b.y - a.y,
        ex = bob.x - r.ax,
        ey = bob.y - r.ay,
        den = dx * ey - dy * ex;
    if (den === 0) return { x: (r.ax + bob.x) / 2, y: (r.ay + bob.y) / 2 };
    const t = ((r.ax - a.x) * ey - (r.ay - a.y) * ex) / den;
    return { x: a.x + dx * t, y: a.y + dy * t };
}

function hands(s: FeedState, pad: Pad, out: Happening[]): void {
    for (const d of pad.pressed) {
        const all = targets(s);
        if (!all.length) break;
        const at = Math.max(
            0,
            all.findIndex((t) => same(t, s.pick)),
        );
        const by = d === "left" || d === "up" ? -1 : 1;
        s.pick = all[(at + by + all.length) % all.length] ?? null;
    }
    const t = chosen(s);
    if (s.squeeze?.by === "keys") {
        if (pad.go) s.squeeze.n++;
        else {
            blow(s, s.squeeze.i, s.squeeze.n, out);
            s.squeeze = null;
        }
    } else if (pad.go && t?.kind === "puffer" && !s.squeeze)
        s.squeeze = { i: t.i, by: "keys", n: 1 };
    if (pad.tapped && t && t.kind !== "puffer") act(s, t, out);

    if (pad.touch) {
        const p = pad.touch;
        if (!s.hand) {
            const u = under(s, p);
            s.hand = { last: p, on: u.on };
            s.trail = [p];
            s.fade = 0;
            const b = s.bubbles[u.i];
            if (u.on === "bubble" && b) pop(s, b, out);
            if (u.on === "puffer") s.squeeze = { i: u.i, by: "touch", n: 1 };
            const r = u.on === "air" ? tapped(s, p) : null;
            if (r) cut(s, r, nearest(p, r, s.bob), out);
        } else {
            if (s.hand.on === "air") swipe(s, s.hand.last, p, out);
            if (s.squeeze?.by === "touch") s.squeeze.n++;
            s.hand.last = p;
            if (s.hand.on === "air") {
                s.trail.push(p);
                if (s.trail.length > 8) s.trail.shift();
            }
        }
    }
    if (pad.lifted) {
        if (s.hand?.on === "air") swipe(s, s.hand.last, pad.lifted, out);
        if (s.squeeze?.by === "touch") {
            blow(s, s.squeeze.i, s.squeeze.n, out);
            s.squeeze = null;
        }
        s.hand = null;
    }
}

export function stepFeed(s: FeedState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    for (const r of s.ropes) if (r.cut) r.snap += DT;
    for (const b of s.bubbles) if (b.popped) b.pop += DT;
    for (let i = 0; i < s.popped.length; i++) if (s.got[i]) s.popped[i] = (s.popped[i] ?? 0) + DT;
    for (let i = 0; i < s.puffing.length; i++) s.puffing[i] = Math.max(0, (s.puffing[i] ?? 0) - DT);
    if (!s.hand) s.fade += DT;
    if (!live(s)) {
        s.since++;
        s.hand = pad.touch ? (s.hand ?? { last: pad.touch, on: "air" }) : null;
        if (s.end === "fell" || s.end === "refused") bounce(s.bob);
        return out;
    }
    hands(s, pad, out);
    const bubble = heldBubble(s);
    stepBob(s.bob, s.ropes, bubble, air(), DT);
    const b = s.bob;
    if (!bubble)
        for (const q of s.bubbles)
            if (!q.popped && !q.held && Math.hypot(b.x - q.x, b.y - q.y) < q.r) {
                q.held = true;
                b.vx *= 0.3;
                b.vy *= 0.3;
                s.note = "The bubble has the biscuit. Tap it to pop it.";
                out.push({ cue: "place", pan: panAt(q.x) });
                break;
            }
    s.L.stars.forEach((st, i) => {
        if (s.got[i] || Math.hypot(b.x - st.x, b.y - st.y) > reachOf(s.L).star) return;
        s.got[i] = true;
        s.popped[i] = 0;
        s.caught.push(st.n);
        s.note = s.caught.length > 1 ? `${s.caught.join(" + ")} = ${sumOf(s)}.` : `${st.n}.`;
        out.push(
            // each star a step higher than the one before, so a run of them climbs
            { cue: "ring", pitch: semitones(4 * (s.caught.length - 1)), pan: panAt(st.x) },
            { burst: { kind: "sparkle", x: st.x, y: st.y, n: 6 } },
            { event: { kind: "star", value: st.n } },
        );
    });
    const m = mouthOf(s);
    if (inMouth(s, b)) {
        s.since = 0;
        if (fits(s.L.ask, s.caught)) {
            s.end = "won";
            s.note = `Chomp! ${s.caught.length ? `${s.caught.join(" + ")} = ${sumOf(s)}` : "No stars"}, just what the bowl says.`;
            b.vx = 0;
            b.vy = 0;
            out.push(
                { cue: "win" },
                { burst: { kind: "sparkle", x: m.x, y: m.y, n: 14 } },
                { event: { kind: "fed" } },
            );
        } else {
            s.end = "refused";
            b.vx = b.x < m.x ? -3 : 3;
            b.vy = -4;
            s.note = `Pip's bowl says ${bowlText(s.L.ask)}, and the stars made ${s.caught.length ? `${s.caught.join(" + ")} = ${sumOf(s)}` : "nothing"}${s.L.ask.kind === "odd" && s.caught.some((n) => n % 2 === 0) ? ", with an even one" : s.L.ask.kind === "count" ? ` from ${s.caught.length} star${s.caught.length === 1 ? "" : "s"}` : ""}. Again?`;
            out.push({ cue: "nope" });
        }
        return out;
    }
    if (lost(b)) {
        s.end = "fell";
        s.since = 0;
        s.note = "The biscuit fell. Again?";
        if (b.y + BISCUIT > FLOOR) {
            b.y = FLOOR - BISCUIT;
            b.vy = -Math.abs(b.vy) * 0.35;
            b.vx *= 0.6;
        }
        out.push(
            { cue: "crash", strength: 0.5, pan: panAt(b.x) },
            { burst: { kind: "dust", x: b.x, y: Math.min(b.y, FLOOR), n: 5 } },
        );
    } else if (b.y < -1.5) {
        s.end = "floated";
        s.since = 0;
        s.note = "The bubble floated away with the biscuit. Again?";
        out.push({ cue: "nope" });
    }
    return out;
}

/** A biscuit that missed, or that Pip turned down, hops on the floor and rolls to a stop. */
function bounce(b: Bob): void {
    if (b.x < 0 || b.x > VIEW.w) return;
    const rest = FLOOR - BISCUIT;
    b.vy += FEED.gravity.value * DT;
    b.vx *= 1 - 2 * DT;
    b.x += b.vx * DT;
    b.y = Math.min(rest, b.y + b.vy * DT);
    if (b.y < rest) return;
    b.vy = Math.abs(b.vy) > 2 ? -Math.abs(b.vy) * 0.35 : 0;
    b.vx *= 0.8;
}

/** Whether the biscuit is on its way down to Pip, with nothing holding it. */
const falling = (s: FeedState): boolean => live(s) && holding(s).length === 0 && !heldBubble(s);

function pipPose(s: FeedState): { pose: string; mood: string } {
    if (s.end === "won") return { pose: s.since < 70 ? "chomp" : "cheer", mood: "happy" };
    if (s.end === "refused") return { pose: "stand", mood: "worried" };
    // a miss is watched land first, then sat down about
    if (s.end)
        return s.since < 30 ? { pose: "stand", mood: "surprised" } : { pose: "sit", mood: "sad" };
    const m = mouthOf(s),
        near = Math.hypot(s.bob.x - m.x, s.bob.y - m.y);
    if (falling(s) && near < 7) return { pose: "catch", mood: "excited" };
    return { pose: "stand", mood: near < 9 ? "surprised" : "happy" };
}

/** The scenery of each place, behind everything, drawn once, wider than the view so a wide room is filled. */
function place(L: FeedLevel): Sprite[] {
    const back = (
        key: string,
        art: string,
        x: number,
        y: number,
        params: Record<string, unknown>,
        more: Partial<Sprite> = {},
    ): Sprite => ({ key, art, params, x, y, still: true, z: 0, ...more });
    const stand = { stand: true } as const;
    const tiles = back("tiles", "feedpup", 15, FLOOR - 2, {
        part: "tiles",
        text: "",
        on: 0,
        w: 48,
    });
    const skirting = back("skirting", "toyroom", 15, FLOOR + 0.5, {
        part: "skirting",
        w: 48,
        h: 2,
    });
    const ground = [-3, 33].map((x, i) =>
        back(`ground${i}`, "arcade.ground", x, FLOOR + 1.5, { w: 36, snow: 0 }),
    );
    const cloud = (key: string, x: number, y: number, puffs: number) =>
        back(key, "cloud", x, y, { puffs, rain: 0 }, { alpha: 0.7 });
    switch (L.place) {
        case "kitchen":
            return [
                tiles,
                back("window", "world.window", 3.5, 6.5, { outside: "clear" }, { size: 5 }),
                back(
                    "fridge",
                    "furniture",
                    1.5,
                    FLOOR,
                    { kind: "fridge", tone: "sky", on: false },
                    stand,
                ),
                skirting,
            ];
        case "bath":
            return [
                tiles,
                back(
                    "bath",
                    "furniture",
                    4.5,
                    FLOOR,
                    { kind: "bath", tone: "sky", on: true },
                    stand,
                ),
                back("bubbles", "bubbles", 28, 3, { count: 5 }, { alpha: 0.5 }),
                skirting,
            ];
        case "garden":
            return [
                back("tree", "tree", 1.5, FLOOR, { fruit: 6, fallen: 0, item: "apple" }, stand),
                back("line", "clothesline", 28, FLOOR, { count: 3, pattern: 2 }, stand),
                cloud("cloud", 24, 1.5, 3),
                ...ground,
            ];
        case "playground":
            return [
                back("slide", "parkslide", 28, FLOOR, { h: 3 }, stand),
                back("swing", "swing", 2, FLOOR, { seats: 1 }, stand),
                cloud("cloud", 15, 1.5, 3),
                ...ground,
            ];
        case "hill":
            return [
                cloud("cloud", 4, 2.5, 4),
                cloud("cloud2", 25, 2, 3),
                back(
                    "hill",
                    "parkhill",
                    3.5,
                    FLOOR,
                    { w: 12, h: 8, snow: 0 },
                    { ...stand, alpha: 0.7 },
                ),
                back(
                    "hill2",
                    "parkhill",
                    30,
                    FLOOR,
                    { w: 20, h: 4, snow: 0 },
                    { ...stand, alpha: 0.7 },
                ),
                ...ground,
            ];
        case "treehouse":
            return [
                back("tree", "treeplatform", 3, FLOOR, { basket: 0 }, stand),
                cloud("cloud", 26, 2, 3),
                ...ground,
            ];
    }
}

/** A spring's settling from 1 to 0 over about half a second, overshooting once. */
const spring = (t: number): number => Math.exp(-7 * t) * Math.cos(11 * t);

function frame(s: FeedState, rest?: boolean): Frame {
    const L = s.L,
        b = s.bob,
        t = rest ? 0 : s.steps / RATE;
    const sprites: Sprite[] = place(L);
    const marks: Mark[] = [];
    const pick = s.touched || s.pick ? chosen(s) : null;
    s.ropes.forEach((r, i) => {
        sprites.push({
            key: `peg${i}`,
            art: "feedpup",
            params: { part: L.pegs[i]?.hook ? "hook" : "peg", text: "", on: 0, w: 12 },
            x: r.ax,
            y: L.pegs[i]?.hook ? r.ay - 0.5 : r.ay,
            size: 1,
            z: 3,
            still: true,
        });
        if (!r.cut) {
            // a taut rope still hangs in a slight curve, so it reads as a rope and not a rod
            marks.push({
                kind: "line",
                a: { x: r.ax, y: r.ay },
                b: { x: b.x, y: b.y },
                bend: -Math.max(sagOf(r, b), 0.04 * r.len),
                style: "ink",
            });
            return;
        }
        if (r.snap < 0.2) {
            const dx = r.at.x - r.ax,
                dy = r.at.y - r.ay,
                d = Math.hypot(dx, dy) || 1,
                k = 0.8 * (1 - r.snap / 0.2);
            const across = { x: (-dy / d) * k, y: (dx / d) * k };
            marks.push({
                kind: "line",
                a: { x: r.at.x - across.x - 0.2, y: r.at.y - across.y - 0.2 },
                b: { x: r.at.x + across.x + 0.2, y: r.at.y + across.y + 0.2 },
                style: "aim",
            });
        }
        // the piece left on the biscuit flicks back into it
        if (r.snap < 0.3 && live(s)) {
            const dx = r.at.x - b.x,
                dy = r.at.y - b.y,
                d = Math.hypot(dx, dy) || 1,
                k = Math.min(1.2, d) * (1 - r.snap / 0.3);
            marks.push({
                kind: "line",
                a: { x: b.x, y: b.y },
                b: { x: b.x + (dx / d) * k, y: b.y + (dy / d) * k },
                bend: 0.15,
                style: "ink",
            });
        }
        // the cut end springs back up towards its peg and hangs there
        const k = r.snap > 0.8 ? 0 : Math.max(-0.3, spring(r.snap)),
            hang = 0.9;
        const end = {
            x: r.ax + (r.at.x - r.ax) * k * 0.9,
            y: r.ay + hang + (r.at.y - r.ay - hang) * k,
        };
        marks.push({ kind: "line", a: { x: r.ax, y: r.ay }, b: end, bend: -0.2, style: "ink" });
    });
    L.stars.forEach((st, i) => {
        const age = s.popped[i] ?? 0,
            got = s.got[i] ?? false;
        if (got && age > 0.35) return;
        sprites.push({
            key: `star${i}`,
            art: "feedpup",
            params: { part: "star", text: String(st.n), on: 0, w: 12 },
            x: st.x,
            y: st.y + (got ? 0 : Math.sin(t * 2 + i) * 0.12),
            size: 2,
            z: 4,
            scale: got ? 1 + age * 2 : 1,
            alpha: got ? Math.max(0, 1 - age / 0.35) : 1,
        });
    });
    s.bubbles.forEach((q, i) => {
        if (q.popped) return;
        sprites.push({
            key: `bubble${i}`,
            art: "feedpup",
            params: { part: "bubble", text: "", on: 0, w: 12 },
            x: q.x,
            y: q.held ? q.y : q.y + Math.sin(t * 1.5 + i) * 0.15,
            size: q.r * 2,
            z: 7,
            alpha: 0.75,
        });
    });
    L.puffers.forEach((p, i) => {
        const squeezed = Math.max(
            (s.puffing[i] ?? 0) / 0.4,
            s.squeeze?.i === i ? Math.min(1, s.squeeze.n / FULL_SQUEEZE) * 0.6 : 0,
        );
        sprites.push(
            p.kind === "bellows"
                ? {
                      key: `puffer${i}`,
                      art: "feedpup",
                      params: {
                          part: "bellows",
                          text: "",
                          on: Math.round(squeezed * 20) / 20,
                          w: 12,
                      },
                      x: p.x,
                      y: p.y,
                      size: 3,
                      // a bellows blowing leftward is the same bellows turned round, not upside down
                      angle: Math.cos(p.dir) < 0 ? p.dir - Math.PI : p.dir,
                      flip: Math.cos(p.dir) < 0,
                      z: 3,
                      live: true,
                  }
                : {
                      key: `puffer${i}`,
                      art: "dandelion",
                      params: { seeds: 16, blown: (s.puffing[i] ?? 0) > 0 ? 1 : 0, flower: 0 },
                      x: p.x,
                      y: p.y + 1,
                      size: 2.5,
                      z: 3,
                      live: true,
                  },
        );
        if ((s.puffing[i] ?? 0) > 0) {
            const k = 1 - (s.puffing[i] ?? 0) / 0.4,
                d = 1.5 + k * p.reach * 0.6;
            marks.push({
                kind: "puff",
                x: p.x + Math.cos(p.dir) * d,
                y: p.y + Math.sin(p.dir) * d,
                r: 0.6 + k,
            });
        }
    });
    const pose = pipPose(s),
        dir = b.x < L.pip ? -1 : 1,
        lean = leanOf(s);
    sprites.push(
        {
            key: "bowl",
            art: "feedpup",
            params: { part: "bowl", text: bowlText(L.ask), on: 0, w: 12 },
            x: bowlX(L),
            y: FLOOR,
            size: 4,
            stand: true,
            z: 5,
        },
        {
            key: "pip",
            art: "pupfamily",
            params: { member: "pip", ...pose, dir, gear: "none" },
            // turned about its middle, 2.5 squares above its feet, so moved to keep the feet where they stand
            x: L.pip + 2.5 * Math.sin(lean),
            y: FLOOR,
            size: 4,
            stand: true,
            z: 6,
            angle: lean,
            squash: pose.pose === "catch" ? -0.08 : 0,
            live: true,
        },
    );
    // a biscuit caught at the edge of the reach goes the rest of the way into the leaning mouth
    const into = s.end === "won" ? Math.min(1, s.since / 6) : 0,
        mouth = { x: mouthOf(s).x + 3 * Math.sin(lean), y: mouthOf(s).y };
    if (s.end !== "won" || s.since < 20)
        sprites.push({
            key: "biscuit",
            art: "feedpup",
            params: { part: "biscuit", text: "", on: 0, w: 12 },
            x: b.x + (mouth.x - b.x) * into,
            y: b.y + (mouth.y - b.y) * into,
            size: 2 * BISCUIT,
            angle: rest ? 0 : (b.x * 0.6) % (2 * Math.PI),
            z: 8,
            scale: s.end === "won" ? Math.max(0, 1 - s.since / 20) : 1,
        });
    // the fall the last rope would give, dotted, on the early levels: to where it lands when the
    // preview reaches that far, green when that is Pip's mouth
    const ropes = holding(s);
    if (L.preview > 0 && live(s) && ropes.length === 1 && !heldBubble(s)) {
        const fall = landing(s);
        if (fall.at) {
            const tone = fall.caught ? ("ok" as const) : undefined;
            marks.push(
                { kind: "dots", pts: fall.pts, opacity: 0.8, tone },
                { kind: "ring", x: fall.at.x, y: fall.at.y, r: 0.7, solid: true, tone },
            );
        } else marks.push({ kind: "dots", pts: fall.pts, faint: true, opacity: 0.55 });
    }
    if (pick && live(s)) {
        const at = whereOf(s, pick);
        if (at)
            marks.push({
                kind: "ring",
                x: at.x,
                y: at.y,
                r: pick.kind === "rope" ? 0.8 : 1.6,
                on: true,
            });
    }
    if (s.trail.length > 1 && s.fade < 0.25)
        for (let i = 1; i < s.trail.length; i++) {
            const a = s.trail[i - 1],
                c = s.trail[i];
            if (a && c) marks.push({ kind: "line", a, b: c, style: "aim" });
        }
    // the sum so far stands over the bowl, beside the number it has to make
    const sum = tally(s);
    if (sum) marks.push({ kind: "word", x: bowlX(L), y: FLOOR - 2.9, text: sum, size: 0.9 });
    // once the round is over the field rises, so the card under it leaves Pip and the bowl in sight
    const up = live(s) ? 0 : PAN * (rest ? 1 : easeOut(Math.min(1, Math.max(0, s.since - 6) / 24)));
    return {
        sprites,
        marks,
        camera: { x: VIEW.w / 2, y: VIEW.h / 2 + up, zoom: 1 },
        view: { ...VIEW },
        world: { w: VIEW.w, h: VIEW.h + up },
        focus: { x: Math.max(9, Math.min(21, live(s) ? b.x : L.pip)), y: VIEW.h / 2 + up },
        time: t,
    };
}

/** Squares the field rises by when the round is over: the floor ends a little above the middle. */
const PAN = 10;

const easeOut = (k: number): number => 1 - (1 - k) ** 3;

/** How far Pip leans towards a biscuit coming down near it, in radians, clockwise. */
function leanOf(s: FeedState): number {
    const near = falling(s) || (s.end === "won" && s.since < 30);
    if (!near) return 0;
    const m = mouthOf(s),
        dy = m.y - s.bob.y;
    if (dy > 6) return 0;
    return 0.22 * Math.max(-1, Math.min(1, (s.bob.x - m.x) / reachOf(s.L).mouth));
}

/** The dots of the fall a biscuit let go now would take, where it comes down if the preview reaches it, and whether Pip catches it there. */
function landing(s: FeedState): { pts: Pt[]; at: Pt | null; caught: boolean } {
    const f = { ...s.bob },
        pts: Pt[] = [],
        a = air(),
        n = Math.round(s.L.preview * RATE);
    for (let i = 1; i <= n; i++) {
        stepBob(f, [], null, a, DT);
        if (inMouth(s, f)) return { pts, at: mouthOf(s), caught: true };
        if (lost(f))
            return { pts, at: { x: f.x, y: Math.min(f.y, FLOOR - BISCUIT) }, caught: false };
        if (i % 5 === 0) pts.push({ x: f.x, y: f.y });
    }
    return { pts, at: null, caught: false };
}

/** Where Pip's bowl stands: beside Pip, on the side nearer the middle. */
const bowlX = (L: FeedLevel): number => L.pip + (L.pip > 15 ? -3.4 : 3.4);

/** The stars caught so far as a sum, with the bowl's given number first when it has one; empty before the first. */
function tally(s: FeedState): string {
    const a = s.L.ask,
        parts = a.kind === "missing" ? [a.given, ...s.caught] : s.caught;
    if (!s.caught.length) return "";
    const total = parts.reduce((t, n) => t + n, 0);
    return parts.length > 1 ? `${parts.join(" + ")} = ${total}` : String(total);
}

function say(s: FeedState): string {
    const L = s.L,
        b = s.bob;
    const ropes = holding(s).length;
    const stars = L.stars
        .map(
            (st, i) =>
                `${st.n}${s.got[i] ? " caught" : ""} ${st.x < b.x - 1 ? "to the left" : st.x > b.x + 1 ? "to the right" : "straight"} ${st.y > b.y ? "below" : "above"}`,
        )
        .join(", ");
    const where = falling(s)
        ? "The biscuit is falling."
        : heldBubble(s)
          ? "The biscuit is floating up in a bubble."
          : `The biscuit hangs on ${ropes === 1 ? "one rope" : `${ropes} ropes`}, ${b.vx > 0.3 ? "swinging right" : b.vx < -0.3 ? "swinging left" : "nearly still"}, ${b.x < L.pip - 1 ? "left of Pip" : b.x > L.pip + 1 ? "right of Pip" : "over Pip"}.`;
    const pick = chosen(s);
    const keys = pick
        ? ` Chosen: ${pick.kind === "rope" ? `rope ${pick.i + 1}` : pick.kind === "bubble" ? "the bubble" : L.puffers[pick.i]?.kind === "dandelion" ? "the dandelion" : "the bellows"}.`
        : "";
    return `${askWords(L.ask)}. Caught ${tally(s) || "no stars yet"}. Stars: ${stars || "none"}. ${where}${keys} ${s.note}`;
}

/** Feed the pup's own sounds: a snip, a chime for a star, a bubble's pop, a puff, a thud and a chomp. */
const SOUNDS: Kit = {
    lift: [
        { wave: "noise", hz: 4200, attack: 0.001, decay: 0.03, gain: 0.3 },
        { wave: "triangle", hz: 520, to: 260, attack: 0.002, decay: 0.12, gain: 0.2 },
    ],
    ring: [
        { wave: "triangle", hz: 880, attack: 0.005, decay: 0.25, gain: 0.25 },
        { wave: "sine", hz: 1760, attack: 0.005, decay: 0.18, gain: 0.12, delay: 0.04 },
    ],
    splash: [
        { wave: "sine", hz: 900, to: 1500, attack: 0.001, decay: 0.05, gain: 0.25 },
        { wave: "noise", hz: 3000, attack: 0.001, decay: 0.03, gain: 0.12 },
    ],
    place: [{ wave: "sine", hz: 380, to: 520, attack: 0.01, decay: 0.2, gain: 0.2 }],
    back: [{ wave: "noise", hz: 500, to: 900, attack: 0.03, decay: 0.35, gain: 0.3 }],
    crash: [
        { wave: "sine", hz: 160, to: 90, attack: 0.002, decay: 0.12, gain: 0.35 },
        { wave: "noise", hz: 800, attack: 0.001, decay: 0.05, gain: 0.2 },
    ],
    nope: [
        { wave: "sine", hz: 440, to: 330, attack: 0.01, decay: 0.2, gain: 0.25 },
        { wave: "sine", hz: 330, to: 260, attack: 0.01, decay: 0.25, gain: 0.25, delay: 0.18 },
    ],
    win: [
        { wave: "noise", hz: 1200, attack: 0.001, decay: 0.05, gain: 0.3 },
        { wave: "noise", hz: 1200, attack: 0.001, decay: 0.05, gain: 0.3, delay: 0.16 },
        { wave: "triangle", hz: 523, attack: 0.01, decay: 0.2, gain: 0.3, delay: 0.32 },
        { wave: "triangle", hz: 659, attack: 0.01, decay: 0.2, gain: 0.3, delay: 0.44 },
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.4, gain: 0.3, delay: 0.56 },
    ],
};

export const feedGame: ActionGame<FeedState> = {
    id: "feedpup",
    title: "Feed the pup",
    group: "action",
    card: { round: { level: 0 }, keep: 30, minutes: 1 },
    portrait: { keep: 18 },
    quiet: true,
    touch: true,
    levels: FEED_LEVELS,
    rate: RATE,
    cover: { art: "feedpup", params: { part: "cover", text: "", on: 0, w: 12 } },
    hint: "Tap a rope or swipe across it to cut it, tap a bubble to pop it, and hold a bellows to squeeze it, longer for a bigger puff. With the keys, the arrows choose a rope, a bubble or a bellows, and space cuts, pops or, held, squeezes.",
    controls: {
        arrows: { left: "Choose the one before", right: "Choose the next" },
        go: "Cut, pop or puff",
        icons: { go: "cut" },
    },
    sounds: SOUNDS,
    start: (phase) => startFeed(FEED_LEVELS[phase] ?? FEED_LEVELS[0], phase),
    step: stepFeed,
    say,
    note: (s) => s.note,
    won: (s) => s.end === "won",
    ended: (s) => (s.end ? { won: s.end === "won", words: s.note } : null),
    objectives: (s) => ({ completed: Math.min(sumOf(s), wanted(s.L.ask)), total: wanted(s.L.ask) }),
    frame,
    cancelInput: (s) => {
        s.hand = null;
        s.squeeze = null;
        s.trail = [];
    },
    hum: (s): Hum[] => {
        const blowing = s.puffing.some((p) => p > 0);
        const m = mouthOf(s),
            near = Math.hypot(s.bob.x - m.x, s.bob.y - m.y);
        return [
            ...(blowing ? [{ kind: "wind" as const, level: 0.6 }] : []),
            ...(live(s) && near < 8
                ? [{ kind: "pant" as const, level: 0.5 * (1 - near / 8) }]
                : []),
        ];
    },
    tuning: FEED,
    still: {
        press: () => Math.round(RATE * 0.25),
        settling: (s) => falling(s) || heldBubble(s) !== null || (!live(s) && s.since < 40),
    },
};
