// Charlie's lemonade stand: customers come up to the counter and ask for a drink, and Charlie pours
// it, slides it down to them and gives them their change.
//
// The jug is tipped by degrees, by a hand drawn down it or a held arrow: a gentle tilt dribbles and a
// steep one gushes, and the lemonade falls as drops into the cup, whose level is what has landed in
// it, so a pour is stopped by eye against the cup's marks. A full cup is pulled back and let go, or
// its push set with the arrows, and slides along the counter against its friction: too soft and it
// stops short and can be pushed on, too hard and it goes off the end, and a cup that stops at a
// customer who asked for something else is slid back. A customer who has their drink pays, and
// the change is rolled back to them a coin at a time into their dish. Nothing is ever lost but the
// time it takes: a cup can be tipped out, a coin comes back, and a waiting customer's smile only
// fades. The mathematics is in the order and the change, never in the push. See .docs/games.md.
import type { ActionGame, ActionLevel, Levels } from "./game";
import type { Pt } from "../../engine/motion/geometry";
import { submerged } from "../../engine/motion/float";
import { actor, actorSprites, stepActor, type Actor, type Cycle } from "../../engine/motion/actor";
import { done, feed, progress, track, type GameEvent, type Track } from "../../engine/motion/goals";
import { gustAt, gustLength, type Gust } from "../../engine/motion/gust";
import {
    count,
    drain,
    liquid,
    places,
    pour,
    STREAM,
    stepLiquid,
    WATER,
    type Liquid,
} from "../../engine/motion/liquid";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Pool, Sprite } from "../../engine/motion/scene";
import { RIPPLE, rippleAt } from "../../engine/motion/surface";
import { knob } from "../../engine/motion/tune";
import { lipAngle, pourRate, type Pouring } from "../../engine/motion/vessel";
import type { Hum, Kit } from "../../engine/sound/kit";
import { panOf, semitones } from "../../engine/sound/kit";
import { LEMONCUP } from "../../engine/parts/food/lemoncup";
import { PITCHER } from "../../engine/parts/food/pitcher";
import { STAND_ROOF } from "../../engine/parts/food/lemonadestand";
import { price } from "../../engine/parts/money/price";
import { BEYOND, ground, row, type Eye } from "./scenery";

export type CoinKind = "penny" | "nickel" | "dime" | "quarter";
const KINDS: readonly CoinKind[] = ["penny", "nickel", "dime", "quarter"];
export const WORTH: Record<CoinKind, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
/** A coin's radius in squares, in the proportions of the real coins. */
const RADIUS: Record<CoinKind, number> = { penny: 0.44, nickel: 0.48, dime: 0.41, quarter: 0.55 };
/** Millimetres across, as the coin drawing draws them, to crop one coin out of it. */
const MM: Record<CoinKind, number> = { penny: 19.05, nickel: 21.21, dime: 17.91, quarter: 24.26 };

type Scale = "halves" | "quarters" | "ml";

export type Who =
    | { kind: "person"; look: Record<string, string | number | boolean> }
    | { kind: "pup"; member: string };

/** Someone who comes to the stand: who, the drink they want as a share of a cup, how many, and the coins they pay with. */
export interface Customer {
    who: Who;
    want: number;
    cups: 1 | 2;
    pays: CoinKind[];
}

export interface StandLevel extends ActionLevel {
    prompt: string;
    cup: { scale: Scale; max: number; step: number };
    /** In cents, for one cup. */
    price: number;
    /** The coins Charlie can give change with; none when every customer pays exactly. */
    tray: CoinKind[];
    /** How long the counter is, in squares from the booth's left end. */
    counter: number;
    /** Where the customers stand along the counter, in squares; they come in this order. */
    slots: number[];
    customers: Customer[];
    /** The wind's push on a sliding cup or coin at the height of a gust, in squares a second each second. */
    wind: number;
    /** The dashed line on the cup at the next order, and where a push will stop: drawn, a spot only, or not at all. */
    guide: { fill: boolean; slide: "path" | "spot" };
    /** The shares of a cup the level's orders come in, for its variations. */
    amounts: number[];
}

const RATE = 60,
    DT = 1 / RATE;
const COUNTER_TOP = 21,
    FLOOR = 27;
const VIEW = { w: 46, h: 30 };
const BOOTH = 16;
/** Where the cup stands under the jug's spout, and where a coin waits to be rolled. */
export const HOME = 12.6;
export const COIN_AT = 15.8;
/** The middle of the jug's handle, where Charlie holds it and it turns. */
const HAND: Pt = { x: 8.2, y: COUNTER_TOP - 8.4 };
/** The jug and the cup are drawn at these shares of their boxes. */
const PK = 0.8,
    CK = 0.95;
/** Charlie's own dish at the left of the booth: her change, and where what is paid goes. */
const TRAY = { x: 3.6, w: 5 };
/** A customer's dish for their change, and how much of it catches a coin. */
const DISH = { w: 5, inner: 2.05 };
/** How near a customer a cup has to stop for them to reach it, in squares: wide, since customers stand at least 8 apart. */
const ZONE = 3;
/** The most a jug tips, in radians. */
const MOST_TILT = 1.25;
/** How many cups a full jug holds. */
const JUG_CUPS = 5;
const MOST_DROPS = 180;
/** The pull a hand can make, in squares, and the least push that sets anything going. */
const MOST_PULL = 7.5;
export const LEAST = 1;
/** One arrow press moves the push this many squares of slide. */
export const STEP = 0.5;
const GRAIN = 0.22,
    SKIN = 0.12;
const SLOSH = { k: 55, damping: 3.4, most: 0.3 };
/** A gust of wind, repeating every `WIND_EVERY` seconds and turning about each time. */
const GUST: Gust = { rise: 1.4, hold: 2.4, fall: 1.8, flutter: 0.3 };
const WIND_EVERY = 8;

export const STAND = {
    cupFriction: knob(
        10,
        6,
        16,
        0.5,
        "squares a second each second",
        "a cup slows by this much: a push down the whole counter lasts under three seconds",
    ),
    coinFriction: knob(
        9,
        5,
        15,
        0.5,
        "squares a second each second",
        "a rolling coin slows a little less than a cup, so it reaches the far dishes easily",
    ),
    dish: knob(
        26,
        12,
        60,
        2,
        "squares a second each second",
        "a dish's rims catch a coin this hard, so a range of pushes lands it and a wild one jumps out",
    ),
    pull: knob(
        8,
        5,
        12,
        0.5,
        "squares of slide a square of pull",
        "a square of pull sends a cup eight squares, so the far end of the counter is a long pull",
    ),
    gush: knob(
        0.1,
        0.05,
        0.2,
        0.01,
        "of the jug a second",
        "tipped all the way, the jug pours half a cup a second: quick to feel, easy to stop",
    ),
    keys: knob(
        1.1,
        0.5,
        2,
        0.1,
        "radians a second",
        "a held arrow tips the jug to a steady pour in about a second",
    ),
};

const pouring = (): Pouring => ({ full: 0.35, empty: 1.25, span: 0.6, most: STAND.gush.value });

const look = (o: Record<string, string | number | boolean>): Who => ({
    kind: "person",
    look: o,
});
const pup = (member: string): Who => ({ kind: "pup", member });

/** The people and pups who come to the stand, in turn. */
const FOLK: Who[] = [
    pup("rufus"),
    look({
        age: "child",
        tone: 5,
        hair: "puffs",
        colour: "black",
        top: "berry",
        wear: "shorts",
        bottom: "sky",
    }),
    look({
        age: "grownup",
        tone: 2,
        hair: "bob",
        colour: "auburn",
        top: "mint",
        wear: "dress",
        pattern: "spots",
    }),
    pup("maple"),
    look({
        age: "child",
        tone: 3,
        hair: "curly",
        colour: "brown",
        top: "tang",
        wear: "trousers",
        glasses: true,
    }),
    look({ age: "older", tone: 4, hair: "short", colour: "grey", top: "sky", wear: "trousers" }),
    pup("pip"),
    look({
        age: "child",
        tone: 1,
        hair: "ponytail",
        colour: "blonde",
        top: "glow",
        wear: "skirt",
        pattern: "stripes",
    }),
    look({
        age: "grownup",
        tone: 6,
        hair: "coily",
        colour: "black",
        top: "berry",
        wear: "trousers",
    }),
    pup("dot"),
];

const guest = (n: number, want: number, pays: CoinKind[], cups: 1 | 2 = 1): Customer => ({
    who: FOLK[n % FOLK.length] ?? pup("rufus"),
    want,
    cups,
    pays,
});

export const STAND_LEVELS: Levels<StandLevel> = [
    {
        title: "A sunny park",
        grades: [1, 1],
        goal: "Pour each customer the drink they ask for and slide it along the counter to them.",
        prompt: "Drag the jug down to pour, then pull the cup back and let go.",
        cup: { scale: "halves", max: 200, step: 100 },
        price: 5,
        tray: [],
        counter: 44,
        slots: [24, 34],
        customers: [guest(0, 0.5, ["nickel"]), guest(1, 1, ["nickel"])],
        wind: 0,
        guide: { fill: true, slide: "path" },
        amounts: [0.5, 1],
    },
    {
        title: "Quarters of a cup",
        grades: [1, 2],
        goal: "Pour a quarter, a half and three quarters of a cup, and slide each to the right customer.",
        prompt: "Read the marks on the cup. Three quarters is one mark under the top.",
        cup: { scale: "quarters", max: 200, step: 50 },
        price: 10,
        tray: [],
        counter: 44,
        slots: [22, 30, 38],
        customers: [
            guest(2, 0.25, ["dime"]),
            guest(3, 0.75, ["nickel", "nickel"]),
            guest(4, 0.5, ["dime"]),
        ],
        wind: 0,
        guide: { fill: true, slide: "path" },
        amounts: [0.25, 0.5, 0.75],
    },
    {
        title: "Change, please",
        grades: [2, 2],
        goal: "Pour each order in millilitres, then roll back the right change into the customer's dish.",
        prompt: "A cup is 15 cents. Someone who pays 25 cents gets 10 cents back.",
        cup: { scale: "ml", max: 200, step: 50 },
        price: 15,
        tray: ["penny", "nickel", "dime"],
        counter: 44,
        slots: [22, 31, 40],
        customers: [
            guest(5, 0.5, ["quarter"]),
            guest(6, 0.75, ["dime", "dime"]),
            guest(7, 0.25, ["quarter"]),
        ],
        wind: 0,
        guide: { fill: true, slide: "spot" },
        amounts: [0.25, 0.5, 0.75, 1],
    },
    {
        title: "A windy day",
        grades: [2, 3],
        goal: "Serve every order and give the change while gusts push the cups along the counter.",
        prompt: "Watch the windsock. A gust helps a push the way it blows and holds one back the other way.",
        cup: { scale: "ml", max: 250, step: 50 },
        price: 20,
        tray: ["penny", "nickel", "dime"],
        counter: 46,
        slots: [23, 32, 41],
        customers: [
            guest(8, 0.4, ["quarter", "quarter"], 2),
            guest(9, 0.8, ["quarter"]),
            guest(1, 0.6, ["quarter"]),
        ],
        wind: 1.2,
        guide: { fill: true, slide: "spot" },
        amounts: [0.2, 0.4, 0.6, 0.8],
    },
    {
        title: "The long counter",
        grades: [3, 3],
        goal: "Slide each drink all the way down the long counter and give the change from a dollar.",
        prompt: "The customers are far away now. Four quarters make a dollar.",
        cup: { scale: "ml", max: 250, step: 50 },
        price: 35,
        tray: ["nickel", "dime", "quarter"],
        counter: 66,
        slots: [28, 43, 58],
        customers: [
            guest(2, 1, ["quarter", "quarter"]),
            guest(3, 0.4, ["quarter", "dime"]),
            guest(4, 0.8, ["quarter", "quarter", "quarter", "quarter"]),
        ],
        wind: 0,
        guide: { fill: false, slide: "spot" },
        amounts: [0.2, 0.4, 0.6, 0.8, 1],
    },
    {
        title: "The busy fair",
        grades: [3, 4],
        goal: "Serve four customers at the fair, with a double order and the change for each.",
        prompt: "No marks to help now: read the cup, count the change, and mind the wind.",
        cup: { scale: "ml", max: 250, step: 50 },
        price: 30,
        tray: ["nickel", "dime", "quarter"],
        counter: 52,
        slots: [22, 30, 38, 46],
        customers: [
            guest(5, 0.6, ["quarter", "quarter", "quarter"], 2),
            guest(6, 0.2, ["quarter", "nickel"]),
            guest(7, 1, ["quarter", "quarter"]),
            guest(8, 0.8, ["quarter", "quarter", "quarter", "quarter"]),
        ],
        wind: 0.8,
        guide: { fill: false, slide: "spot" },
        amounts: [0.2, 0.4, 0.6, 0.8, 1],
    },
];

const cost = (L: StandLevel, c: Customer): number => L.price * c.cups;
const paid = (c: Customer): number => c.pays.reduce((n, k) => n + WORTH[k], 0);
/** What a customer is owed back. */
export const owedTo = (L: StandLevel, c: Customer): number => paid(c) - cost(L, c);

/** The fewest of the tray's coins that make `cents`, largest first, or null when they cannot. */
export function changeOf(tray: readonly CoinKind[], cents: number): CoinKind[] | null {
    const kinds = [...tray].sort((a, b) => WORTH[b] - WORTH[a]);
    const out: CoinKind[] = [];
    let left = cents;
    for (const k of kinds)
        while (left >= WORTH[k]) {
            out.push(k);
            left -= WORTH[k];
        }
    return left === 0 ? out : null;
}

/** The coins a customer pays `cents` or a little over with: quarters first, then what makes up the rest. */
function payWith(cents: number, over: number): CoinKind[] {
    const total = over > 0 ? Math.ceil((cents + 1) / 25) * 25 + (over - 1) * 25 : cents;
    return changeOf(KINDS, total) ?? [];
}

/**
 * Variation `n` of a level: the customers ask for other amounts from the level's list and come in
 * another order, and where there is change they pay with a different handful. Variation nought is
 * the level as written.
 */
export function vary(L: StandLevel, n: number): StandLevel {
    if (n === 0) return L;
    const k = L.customers.length;
    const customers = L.customers.map((_, i) => {
        const was = L.customers[(i + n) % k] ?? L.customers[0];
        if (!was) throw new Error("A level with no customers");
        const want = L.amounts[(i + n) % L.amounts.length] ?? was.want;
        const c: Customer = { ...was, want, who: FOLK[(i + n * 3) % FOLK.length] ?? was.who };
        const owed = owedTo(L, was);
        if (L.tray.length === 0 || owed === 0) return c;
        const pays = payWith(cost(L, c), 1 + ((n + i) % 2));
        const back = owedTo(L, { ...c, pays });
        return back <= 100 && changeOf(L.tray, back) ? { ...c, pays } : c;
    });
    return { ...L, customers };
}

type CupMode = "home" | "sliding" | "resting" | "back" | "falling" | "taken";

interface Cup {
    mode: CupMode;
    x: number;
    /** Where its foot stands, which is the counter's top until it goes off the end. */
    base: number;
    v: number;
    vy: number;
    angle: number;
    /** What has landed in it, as a share of the cup. */
    level: number;
    /** A cup gliding back to the jug: where it set off from, and how far along it is, from nought to one. */
    from: number;
    t: number;
    slosh: { a: number; v: number; vx: number; waves: { x: number; age: number; size: number }[] };
}

type CoinMode = "rolling" | "dish" | "back" | "falling" | "paid";

interface Coin {
    kind: CoinKind;
    mode: CoinMode;
    x: number;
    y: number;
    v: number;
    vy: number;
    /** The customer whose dish it is in or was paid by, or -1. */
    owner: number;
    /** A coin gliding somewhere: from where, and how far along. */
    from: Pt;
    t: number;
}

type Phase = "coming" | "waiting" | "served" | "paying" | "change" | "thanks" | "going" | "gone";
type Act = "walk" | "wait" | "happy" | "drink";

interface Guest {
    /** Which customer of the level, and which place along the counter. */
    i: number;
    slot: number;
    x: number;
    phase: Phase;
    /** Seconds in this phase. */
    t: number;
    got: number;
    /** How much of their smile is left, from one to nought. It fades while they wait and never makes them leave. */
    patience: number;
    actor: Actor<Act>;
    stride: number;
}

type CharlieAct = "stand" | "pour" | "slide" | "wave" | "cheer";

type Hand =
    | { on: "jug"; y0: number; tilt0: number }
    | { on: "cup" }
    | { on: "coin" }
    | { on: "tray"; kind: CoinKind }
    | { on: "dish" }
    | { on: "none" };

export interface StandState {
    phase: number;
    L: StandLevel;
    cup: Cup;
    /** How far the jug is tipped, in radians, and how full it is, as a share. */
    tilt: number;
    jug: number;
    /** Whether a hand or the keys hold the jug tipped; when neither does it tips back. */
    tipping: boolean;
    drops: Liquid;
    carry: number[];
    thread: number;
    coins: Coin[];
    /** The coin waiting to be rolled, while change is being given. */
    hand: CoinKind | null;
    guests: Guest[];
    /** The next customer of the level to come to the counter. */
    next: number;
    /** How far a push sends a cup or a coin on a still day, in squares. */
    power: number;
    grip: Hand | null;
    pull: number | null;
    charlie: Actor<CharlieAct>;
    goal: Track;
    cam: Pt;
    time: number;
    steps: number;
    note: string;
    touched: boolean;
    braked: boolean;
    won: boolean;
    /** Seconds since the last customer said thank you, for the stand's cheer. */
    after: number;
    spilt: number;
}

/** A point in the jug's own squares, in the world, for the jug tipped by `tilt` about Charlie's hand. */
function jugPoint(tilt: number, q: Pt): Pt {
    const c = Math.cos(tilt),
        s = Math.sin(tilt);
    const dx = (q.x - PITCHER.handle.x) * PK,
        dy = (q.y - PITCHER.handle.y) * PK;
    return { x: HAND.x + dx * c - dy * s, y: HAND.y + dx * s + dy * c };
}

/** The inside of a cup whose foot is at `x`, `base`: its walls, the line a full cup reaches, and its floor. */
function cupInside(x: number, base: number) {
    const off = (lx: number) => x + (lx - LEMONCUP.w / 2) * CK,
        up = (ly: number) => base - (LEMONCUP.h - ly) * CK;
    return {
        l: off(LEMONCUP.left),
        r: off(LEMONCUP.right),
        full: up(LEMONCUP.full),
        bottom: up(LEMONCUP.bottom),
        rim: up(0.35),
    };
}

/** Where the drink in a cup stands. */
const surfaceIn = (cup: Cup): number => {
    const k = cupInside(cup.x, cup.base);
    return k.bottom - cup.level * (k.bottom - k.full);
};

const eventOf = (out: Happening[], event: GameEvent) => out.push({ event });

function freshCup(): Cup {
    return {
        mode: "home",
        x: HOME,
        base: COUNTER_TOP,
        v: 0,
        vy: 0,
        angle: 0,
        level: 0,
        from: HOME,
        t: 1,
        slosh: { a: 0, v: 0, vx: 0, waves: [] },
    };
}

export function startStand(phase: number, given?: StandLevel): StandState {
    const L = given ?? STAND_LEVELS[phase] ?? STAND_LEVELS[0];
    const s: StandState = {
        phase,
        L,
        cup: freshCup(),
        tilt: 0,
        jug: 1,
        tipping: false,
        drops: liquid(MOST_DROPS),
        carry: [],
        thread: 0,
        coins: [],
        hand: null,
        guests: [],
        next: 0,
        power: Math.round((L.slots[0] ?? 24) - HOME - 6),
        grip: null,
        pull: null,
        charlie: actor<CharlieAct>("wave", "wave"),
        goal: track({ on: "served", times: L.customers.length }),
        cam: { x: VIEW.w / 2, y: VIEW.h / 2 },
        time: 0,
        steps: 0,
        note: "",
        touched: false,
        braked: false,
        won: false,
        after: 0,
        spilt: 0,
    };
    // the first customers are already waiting when the stand opens, so their orders can be read at once
    for (let k = 0; k < L.slots.length && s.next < L.customers.length; k++) comeIn(s, k, true);
    s.cam = { x: camAim(s), y: VIEW.h / 2 };
    return s;
}

/** The world is as long as the counter and a little more, and never narrower than the view. */
const worldOf = (L: StandLevel) => ({ w: Math.max(VIEW.w, L.counter + 6), h: VIEW.h });

/** The next customer walks up to place `slot` from past the right of the world, or is `there` already. */
function comeIn(s: StandState, slot: number, there = false): void {
    const i = s.next++,
        x = s.L.slots[slot];
    if (x === undefined || !s.L.customers[i]) return;
    s.guests.push({
        i,
        slot,
        x: there ? x : worldOf(s.L).w + 2 + slot * 6,
        phase: there ? "waiting" : "coming",
        t: 0,
        got: 0,
        patience: 1,
        actor: there ? actor<Act>("wait", "stand", -1) : actor<Act>("walk", "walk", -1),
        stride: 0,
    });
}

const customerOf = (s: StandState, g: Guest): Customer => {
    const c = s.L.customers[g.i];
    if (!c) throw new Error("A guest with no customer");
    return c;
};
const slotX = (s: StandState, g: Guest): number => s.L.slots[g.slot] ?? 0;

/** How near a pour must come to the order to count, as a share of the cup. */
export const toleranceOf = (L: StandLevel): number => (L.cup.scale === "halves" ? 0.08 : 0.06);

const matches = (s: StandState, level: number, want: number): boolean =>
    Math.abs(level - want) <= toleranceOf(s.L);

/** The customer who is waiting for change, if anyone is: while they are, the hand holds a coin. */
export const changing = (s: StandState): Guest | null =>
    s.guests.find((g) => g.phase === "change") ?? null;

/** The customers still waiting for a drink, nearest first. */
export const waiting = (s: StandState): Guest[] =>
    s.guests.filter((g) => g.phase === "waiting").sort((a, b) => a.slot - b.slot);

/** The wind's push now, in squares a second each second, to the right when above nought. */
export function windAt(s: StandState, time = s.time): number {
    if (s.L.wind === 0) return 0;
    const n = Math.floor(time / WIND_EVERY),
        t = time - n * WIND_EVERY;
    return (n % 2 === 0 ? 1 : -1) * s.L.wind * gustAt(GUST, Math.min(t, gustLength(GUST)));
}

/**
 * Lets the drink go from the spout: `amount` of a cup in as many drops as the stream is thick, each
 * carrying its share. A thin stream lets a drop go only every few steps, so it dribbles.
 */
function stream(s: StandState, amount: number, weight: number): void {
    const spout = jugPoint(s.tilt, PITCHER.spout),
        way = { x: Math.cos(s.tilt) * 0.8, y: Math.sin(s.tilt) * 0.8 };
    const t = s.thread + 0.3 + 2.2 * weight;
    const n = Math.max(amount > 0 ? 1 : 0, Math.floor(t));
    s.thread = t - Math.floor(t);
    // a stream wavers a little as it leaves, the same way every time
    const waver = 0.3 * Math.sin(s.steps * 0.45);
    const cup = s.cup,
        k = cupInside(cup.x, cup.base);
    const into = cup.mode === "home" && spout.x > k.l - 0.2 && spout.x < k.r + 0.2 ? 1 : 0;
    for (let i = 0; i < n; i++) {
        const across = n > 1 ? (i / (n - 1) - 0.5) * 0.2 : 0;
        if (
            pour(s.drops, { x: spout.x + across, y: spout.y }, { x: way.x + waver, y: way.y }, into)
        )
            s.carry.push(amount / n);
    }
}

/** Moves the falling drink on, and lets each drop that reaches the cup's drink or the counter go. */
function fall(s: StandState, out: Happening[]): void {
    if (count(s.drops) === 0) return;
    stepLiquid(s.drops, DT, STREAM);
    const cup = s.cup,
        k = cupInside(cup.x, cup.base),
        top = surfaceIn(cup);
    const carry: number[] = [];
    let splashed = false;
    drain(s.drops, (d, n) => {
        const c = s.carry[n] ?? 0;
        if (d.tag === 1 && cup.mode === "home" && d.x > k.l && d.x < k.r && d.y >= top - 0.05) {
            const was = cup.level;
            cup.level = Math.min(1, cup.level + c);
            if (was + c > 1 + 1e-9) {
                s.spilt += was + c - 1;
                if (!splashed) {
                    splashed = true;
                    out.push({ burst: { kind: "splash", x: k.r, y: k.full, n: 2 } });
                }
                if (was < 1) s.note = "The cup is full to the top and spilling over.";
            }
            cup.slosh.waves = [
                { x: d.x - cup.x, age: 0, size: Math.min(1, d.vy / 16) },
                ...cup.slosh.waves,
            ].slice(0, 6);
            return true;
        }
        if (d.y >= COUNTER_TOP - 0.05) {
            s.spilt += c;
            if (!splashed && s.steps % 6 === 0) {
                splashed = true;
                out.push({ burst: { kind: "splash", x: d.x, y: COUNTER_TOP, n: 2 } });
            }
            return true;
        }
        carry.push(c);
        return false;
    });
    s.carry = carry;
}

/** What is still falling towards the cup, as a share of it. */
export function falling(s: StandState): number {
    let n = 0;
    for (let k = 0; k < s.carry.length; k++) if (s.drops.tags[k] === 1) n += s.carry[k] ?? 0;
    return n;
}

/** Tips the jug by the hand or the keys, or back when neither holds it, and pours what it lets go. */
function tip(s: StandState, pad: Pad): number {
    const grip = s.grip;
    if (grip?.on === "jug" && pad.touch) {
        s.tilt = Math.max(0, Math.min(MOST_TILT, grip.tilt0 + (pad.touch.y - grip.y0) * 0.32));
        s.tipping = true;
    } else if (pad.holding.includes("down")) {
        // a press brings the jug straight to its lip, so the arrow pours at once and a held one pours more
        if (pad.pressed.includes("down"))
            s.tilt = Math.max(s.tilt, lipAngle(s.jug, 1, pouring()) + 0.02);
        s.tilt = Math.min(MOST_TILT, s.tilt + STAND.keys.value * DT);
        s.tipping = true;
    } else {
        s.tipping = false;
        s.tilt = Math.max(0, s.tilt - (pad.holding.includes("up") ? 6 : 3.5) * DT);
    }
    const rate = pourRate(s.tilt, s.jug, 1, pouring());
    if (rate <= 0) return 0;
    const jugShare = Math.min(s.jug, rate * DT);
    s.jug -= jugShare;
    stream(s, jugShare * JUG_CUPS, Math.min(1, rate / STAND.gush.value));
    if (!s.touched) s.touched = true;
    return rate;
}

/** The jug is topped up whenever it stands level and is getting low. */
function topUp(s: StandState, out: Happening[]): void {
    if (s.tilt === 0 && s.jug < 0.45 && count(s.drops) === 0) {
        s.jug = 1;
        out.push({ cue: "lift", strength: 0.3, pitch: 0.7 });
    }
}

/** The speed that sends something `power` squares on a still counter against `friction`. */
const speedFor = (power: number, friction: number): number => Math.sqrt(2 * friction * power);

/** Sends the cup off along the counter from where it stands. */
export function slideCup(s: StandState, power: number, out: Happening[] = []): boolean {
    const cup = s.cup;
    if (s.won || (cup.mode !== "home" && cup.mode !== "resting")) return false;
    if (changing(s)) {
        s.note = "Give the change first, then the next drink.";
        out.push({ cue: "nope" });
        return false;
    }
    if (power < LEAST) return false;
    cup.mode = "sliding";
    cup.v = speedFor(power, STAND.cupFriction.value);
    s.note = "";
    stepActor(s.charlie, "slide", CHARLIE_ACTS, 0);
    out.push({ cue: "lift", strength: Math.min(1, power / 40), pan: pan(s, cup.x) });
    return true;
}

/** Rolls the coin in Charlie's hand along the counter towards the customer waiting for change. */
export function rollCoin(s: StandState, power: number, out: Happening[] = []): boolean {
    const g = changing(s);
    if (s.won || !g || !s.hand || power < LEAST) return false;
    s.coins.push({
        kind: s.hand,
        mode: "rolling",
        x: COIN_AT,
        y: COUNTER_TOP - RADIUS[s.hand],
        v: speedFor(power, STAND.coinFriction.value),
        vy: 0,
        owner: g.i,
        from: { x: COIN_AT, y: COUNTER_TOP },
        t: 0,
    });
    stepActor(s.charlie, "slide", CHARLIE_ACTS, 0);
    out.push({ cue: "lift", strength: 0.4, pitch: 1.6, pan: pan(s, COIN_AT) });
    return true;
}

const pan = (s: StandState, x: number): number => panOf(x, s.cam.x, VIEW.w);

/** Slows a sliding thing against its friction, lets the wind push it while it moves, and moves it. */
function glide(v: number, friction: number, wind: number): number {
    if (v === 0) return 0;
    const slowed = Math.abs(v) <= friction * DT ? 0 : v - Math.sign(v) * friction * DT;
    return slowed === 0 ? 0 : slowed + wind * DT;
}

const ease = (t: number): number => 1 - (1 - t) ** 3;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const near = (a: Pt, b: Pt, r: number): boolean => Math.hypot(a.x - b.x, a.y - b.y) <= r;

const SHARE_WORDS: Record<string, string> = {
    "0.25": "a quarter of a cup",
    "0.5": "half a cup",
    "0.75": "three quarters of a cup",
    "1": "a full cup",
};

/** What a customer asks for, in the words the cup is marked in. */
export function orderWords(L: StandLevel, want: number): string {
    return L.cup.scale === "ml"
        ? `${Math.round(want * L.cup.max)} ml`
        : (SHARE_WORDS[String(want)] ?? `${Math.round(want * 100)}% of a cup`);
}

/** Where the cup stops, what the customer there makes of it, and what happens next. */
function arrive(s: StandState, out: Happening[]): void {
    const cup = s.cup;
    const g = waiting(s).find((w) => Math.abs(cup.x - slotX(s, w)) <= ZONE);
    if (!g) {
        cup.mode = "resting";
        const first = Math.min(...waiting(s).map((w) => slotX(s, w)));
        s.note =
            cup.x < first - ZONE
                ? "A little short. Push it on from where it stands."
                : "It stopped where nobody is waiting. Push it on, or bring it back.";
        out.push({ cue: "bump", strength: 0.2, pan: pan(s, cup.x) });
        return;
    }
    const c = customerOf(s, g);
    if (matches(s, cup.level, c.want)) {
        serve(s, g, out);
        return;
    }
    cup.mode = "back";
    cup.from = cup.x;
    cup.t = 0;
    s.note =
        cup.level < 0.02
            ? "That cup is empty! It slides back to Charlie."
            : `${cup.level > c.want ? "Too much" : "Not enough"}! This customer asked for ${orderWords(s.L, c.want)}. The cup slides back.`;
    out.push({ cue: "nope", pan: pan(s, cup.x) });
}

function serve(s: StandState, g: Guest, out: Happening[]): void {
    g.got++;
    g.phase = "served";
    g.t = 0;
    s.cup.mode = "taken";
    s.cup.x = slotX(s, g);
    const c = customerOf(s, g);
    s.note =
        c.cups === 2 && g.got < 2
            ? `One cup of ${orderWords(s.L, c.want)}. They want two!`
            : `Just right: ${orderWords(s.L, c.want)}.`;
    out.push({ cue: "place", pitch: semitones(4), pan: pan(s, g.x) });
    eventOf(out, { kind: "poured", value: g.i });
}

function moveCup(s: StandState, out: Happening[]): void {
    const cup = s.cup,
        was = cup.x;
    if (cup.mode === "sliding") {
        cup.v = glide(cup.v, STAND.cupFriction.value, windAt(s));
        cup.x += cup.v * DT;
        if (cup.x > s.L.counter - 0.4) {
            cup.mode = "falling";
            cup.vy = 0;
            s.note = "Too hard! It went off the end of the counter. Here is a fresh cup.";
        } else if (cup.v === 0) arrive(s, out);
    } else if (cup.mode === "falling") {
        cup.x += cup.v * DT;
        cup.vy += 30 * DT;
        cup.base += cup.vy * DT;
        cup.angle += 5 * DT;
        if (cup.base >= FLOOR) {
            s.spilt += cup.level;
            out.push(
                { cue: "crash", strength: 0.5, pan: pan(s, cup.x) },
                { burst: { kind: "splash", x: cup.x, y: FLOOR, n: 6 } },
            );
            eventOf(out, { kind: "fell" });
            s.cup = freshCup();
            return;
        }
    } else if (cup.mode === "back") {
        cup.t = Math.min(1, cup.t + DT / 0.9);
        cup.x = cup.from + (HOME - cup.from) * ease(cup.t);
        if (cup.t >= 1) {
            cup.mode = "home";
            cup.x = HOME;
        }
    }
    // a cup that is pushed or stopped leaves its drink behind, which leans and swings back level
    const sl = cup.slosh,
        vx = (cup.x - was) / DT,
        ax = (vx - sl.vx) / DT;
    const lean = clamp(ax / WATER.gravity, -SLOSH.most, SLOSH.most);
    sl.v += (SLOSH.k * (lean - sl.a) - SLOSH.damping * sl.v) * DT;
    sl.a = clamp(sl.a + sl.v * DT, -SLOSH.most, SLOSH.most);
    if (Math.abs(sl.a) < 1e-5 && Math.abs(sl.v) < 1e-4) sl.a = sl.v = 0;
    sl.vx = cup.mode === "taken" ? 0 : vx;
    sl.waves = sl.waves.map((w) => ({ ...w, age: w.age + DT })).filter((w) => w.age < RIPPLE.life);
}

/** Where Charlie's dish holds coin `kind`, for a hand to choose it. */
export function trayAt(s: StandState, kind: CoinKind): Pt | null {
    const i = s.L.tray.indexOf(kind);
    if (i < 0) return null;
    const n = s.L.tray.length;
    return { x: TRAY.x + (i - (n - 1) / 2) * 1.15, y: COUNTER_TOP - 0.75 - RADIUS[kind] };
}

const dishFloor = (): number => COUNTER_TOP - 0.75;

function moveCoins(s: StandState, out: Happening[]): void {
    const g = changing(s);
    const keep: Coin[] = [];
    for (const c of s.coins) {
        const r = RADIUS[c.kind];
        if (c.mode === "rolling") {
            const owner = s.guests.find((w) => w.i === c.owner);
            const at = owner ? slotX(s, owner) : -99;
            const inDish = (x: number) => Math.abs(x - at) <= DISH.inner;
            const friction = inDish(c.x) ? STAND.dish.value : STAND.coinFriction.value;
            c.v = glide(c.v, friction, windAt(s) * 0.6);
            c.x += c.v * DT;
            c.y = (inDish(c.x) ? dishFloor() : COUNTER_TOP) - r;
            if (c.x > s.L.counter - 0.2) {
                c.mode = "falling";
                s.note = "It rolled right off the end. Charlie takes another from her dish.";
            } else if (c.v === 0) {
                if (inDish(c.x) && owner === g) {
                    c.mode = "dish";
                    const n = s.coins.filter(
                        (o) => o.mode === "dish" && o.owner === c.owner,
                    ).length;
                    out.push({ cue: "ring", pitch: semitones(n * 2), pan: pan(s, c.x) });
                    s.note = `${price(dishSum(s, c.owner) + WORTH[c.kind])} in the dish.`;
                } else {
                    c.mode = "back";
                    c.from = { x: c.x, y: c.y };
                    c.t = 0;
                    s.note =
                        c.x < at
                            ? "The coin stopped short of the dish. It comes back to Charlie."
                            : "The coin rolled past the dish. It comes back to Charlie.";
                }
            }
        } else if (c.mode === "falling") {
            c.x += c.v * DT;
            c.vy += 30 * DT;
            c.y += c.vy * DT;
            if (c.y >= FLOOR) {
                out.push({ cue: "ring", strength: 0.3, pitch: 0.7, pan: pan(s, c.x) });
                continue;
            }
        } else if (c.mode === "back" || c.mode === "paid") {
            c.t = Math.min(1, c.t + DT / (c.mode === "paid" ? 1 : 0.7));
            // a customer's coins set off one after another, so each waits its turn at nought
            const u = Math.max(0, c.t),
                e = ease(u),
                to = { x: TRAY.x, y: dishFloor() - r };
            c.x = c.from.x + (to.x - c.from.x) * e;
            c.y = c.from.y + (to.y - c.from.y) * e - Math.sin(Math.PI * u) * 3;
            if (c.t >= 1) {
                if (c.mode === "paid") out.push({ cue: "ring", strength: 0.35, pitch: 0.9 });
                continue;
            }
        }
        keep.push(c);
    }
    s.coins = keep;
}

/** What is resting in customer `i`'s dish, in cents; the coin just landing is not in it yet. */
export const dishSum = (s: StandState, i: number): number =>
    s.coins
        .filter((c) => c.mode === "dish" && c.owner === i)
        .reduce((n, c) => n + WORTH[c.kind], 0);

const rolling = (s: StandState): boolean => s.coins.some((c) => c.mode !== "dish");

/** Takes the last coin out of the dish of the customer waiting for change. */
export function takeBack(s: StandState, out: Happening[] = []): boolean {
    const g = changing(s);
    if (!g) return false;
    const inDish = s.coins.filter((c) => c.mode === "dish" && c.owner === g.i);
    const last = inDish.at(-1);
    if (!last) return false;
    last.mode = "back";
    last.from = { x: last.x, y: last.y };
    last.t = 0;
    s.note = `The ${last.kind} comes back to Charlie.`;
    out.push({ cue: "back" });
    return true;
}

/** Charlie picks up coin `kind` from her dish to roll next. */
function choose(s: StandState, kind: CoinKind, out: Happening[]): void {
    if (!changing(s) || !s.L.tray.includes(kind)) return;
    s.hand = kind;
    s.note = `Charlie picks up a ${kind}, worth ${price(WORTH[kind])}.`;
    out.push({ cue: "lift", strength: 0.3, pitch: 1.5 });
}

/** The big button's other half: the last coin back, a stopped cup back, or a cup at the jug tipped out. */
function brake(s: StandState, out: Happening[]): boolean {
    if (s.won) return false;
    if (changing(s)) return takeBack(s, out);
    const cup = s.cup;
    if (cup.mode === "resting") {
        cup.mode = "back";
        cup.from = cup.x;
        cup.t = 0;
        s.note = "The cup comes back to the jug.";
        out.push({ cue: "back" });
        return true;
    }
    if (cup.mode === "home" && cup.level > 0) {
        s.spilt += cup.level;
        cup.level = 0;
        cup.slosh.waves = [];
        s.note = "Charlie tips the cup out. Try again.";
        out.push(
            { cue: "splash", strength: 0.4 },
            { burst: { kind: "splash", x: cup.x, y: cupInside(cup.x, cup.base).rim, n: 4 } },
        );
        return true;
    }
    return false;
}

const PERSON_ACTS: Record<Act, Cycle> = {
    walk: { poses: ["walk"] },
    wait: { poses: ["stand", "think"], every: 3.5 },
    happy: { poses: ["cheer"] },
    drink: { poses: ["hold"] },
};
const PUP_ACTS: Record<Act, Cycle> = {
    walk: { poses: ["walk"] },
    wait: { poses: ["stand", "wave"], every: 4 },
    happy: { poses: ["cheer", "jump"], every: 0.45 },
    drink: { poses: ["carry"] },
};
const CHARLIE_ACTS: Record<CharlieAct, Cycle> = {
    stand: { poses: ["stand"] },
    pour: { poses: ["hold"] },
    slide: { poses: ["point"] },
    wave: { poses: ["wave"] },
    cheer: { poses: ["cheer"] },
};

const actsOf = (s: StandState, g: Guest) =>
    customerOf(s, g).who.kind === "pup" ? PUP_ACTS : PERSON_ACTS;

/** How long each passing phase of a customer lasts, in seconds. */
const LASTS: Partial<Record<Phase, number>> = { served: 1.1, paying: 1.2, thanks: 1.3 };

function moveGuests(s: StandState, out: Happening[]): void {
    const world = worldOf(s.L);
    for (const g of s.guests) {
        g.t += DT;
        const c = customerOf(s, g),
            at = slotX(s, g);
        let act: Act = "wait",
            facing: 1 | -1 = -1;
        if (g.phase === "coming") {
            act = "walk";
            g.x = Math.max(at, g.x - 8 * DT);
            g.stride += 8 * DT;
            if (g.x === at) {
                g.phase = "waiting";
                g.t = 0;
            }
        } else if (g.phase === "waiting") {
            g.patience = Math.max(0, g.patience - DT / 70);
        } else if (g.phase === "served") {
            act = "drink";
            if (g.t >= (LASTS.served ?? 1)) {
                s.cup = freshCup();
                if (g.got < c.cups) {
                    g.phase = "waiting";
                    g.t = 0;
                } else {
                    g.phase = "paying";
                    g.t = 0;
                    c.pays.forEach((kind, k) =>
                        s.coins.push({
                            kind,
                            mode: "paid",
                            x: at,
                            y: COUNTER_TOP - 1.5,
                            v: 0,
                            vy: 0,
                            owner: g.i,
                            from: { x: at - 0.6 + k * 0.5, y: COUNTER_TOP - 1.5 - k * 0.3 },
                            t: -k * 0.15,
                        }),
                    );
                    s.note = `They pay ${price(paid(c))} for ${c.cups === 2 ? "two cups" : "a cup"} at ${price(s.L.price)} each.`;
                    out.push({ cue: "ring", strength: 0.4, pan: pan(s, at) });
                }
            }
        } else if (g.phase === "paying") {
            act = "happy";
            if (g.t >= (LASTS.paying ?? 1)) {
                g.t = 0;
                if (owedTo(s.L, c) > 0) {
                    g.phase = "change";
                    s.hand = s.L.tray.at(-1) ?? null;
                    s.note = "Now roll their change into the dish.";
                } else thank(s, g, out);
            }
        } else if (g.phase === "change") {
            const sum = dishSum(s, g.i),
                owed = owedTo(s.L, c);
            if (!rolling(s) && sum === owed) thank(s, g, out);
            else if (!rolling(s) && sum > owed && !s.note.startsWith("That is more"))
                s.note = "That is more than the change. Take a coin back.";
        } else if (g.phase === "thanks") {
            act = "happy";
            if (g.t >= (LASTS.thanks ?? 1)) {
                g.phase = "going";
                g.t = 0;
                s.coins = s.coins.filter((o) => o.owner !== g.i);
            }
        } else if (g.phase === "going") {
            act = "walk";
            facing = 1;
            g.x += 5 * DT;
            g.stride += 5 * DT;
            if (g.x > world.w + 6) {
                g.phase = "gone";
                comeIn(s, g.slot);
            }
        }
        stepActor(g.actor, act, actsOf(s, g), DT, g.stride, facing);
    }
    s.guests = s.guests.filter((g) => g.phase !== "gone");
}

function thank(s: StandState, g: Guest, out: Happening[]): void {
    g.phase = "thanks";
    g.t = 0;
    s.hand = null;
    s.after = 0;
    s.note = "Thank you, Charlie!";
    out.push({ cue: "level", pan: pan(s, g.x) });
    eventOf(out, { kind: "served", value: g.i });
    eventOf(out, { kind: "checkpoint" });
    feed(s.goal, { kind: "served", value: g.i });
}

/** Where a hand takes hold of the jug to tip it, of the cup to pull it back, and of the coin to roll. */
export const jugHold = (s: StandState): Pt => jugPoint(s.tilt, { x: 3.5, y: 3.8 });
export const cupHold = (s: StandState): Pt => ({ x: s.cup.x, y: s.cup.base - 2 });
export const coinHold: Pt = { x: COIN_AT, y: COUNTER_TOP - 0.6 };

function hands(s: StandState, pad: Pad, out: Happening[]): void {
    const t = pad.touch,
        g = changing(s);
    const cupAt = cupHold(s),
        coinAt = coinHold;
    if (t && !s.grip) {
        s.touched = true;
        const tray = s.L.tray.find((k) => {
            const p = trayAt(s, k);
            return p !== null && near(t, p, 0.9);
        });
        if (near(t, jugHold(s), 3.2)) s.grip = { on: "jug", y0: t.y, tilt0: s.tilt };
        else if (g && s.hand && near(t, coinAt, 2.4)) s.grip = { on: "coin" };
        else if (!g && (s.cup.mode === "home" || s.cup.mode === "resting") && near(t, cupAt, 2.8))
            s.grip = { on: "cup" };
        else if (tray) s.grip = { on: "tray", kind: tray };
        else if (g && near(t, { x: slotX(s, g), y: COUNTER_TOP - 1 }, 3)) s.grip = { on: "dish" };
        else s.grip = { on: "none" };
    }
    const held = pad.touch ?? pad.lifted,
        grip = s.grip;
    if (held && (grip?.on === "cup" || grip?.on === "coin")) {
        const from = grip.on === "cup" ? cupAt : coinAt;
        // measured back and upwards, so the edge of the field leaves room for a hard push
        const back = Math.max(0, from.x - held.x),
            up = Math.max(0, from.y - held.y);
        s.pull = Math.min(MOST_PULL, Math.hypot(back, up));
    }
    if (pad.lifted && grip) {
        const at = pad.lifted;
        if ((grip.on === "cup" || grip.on === "coin") && s.pull !== null) {
            const power = s.pull * STAND.pull.value;
            if (power >= LEAST) {
                s.power = Math.round(power / STEP) * STEP;
                if (grip.on === "cup") slideCup(s, power, out);
                else rollCoin(s, power, out);
            }
        } else if (grip.on === "tray") {
            const p = trayAt(s, grip.kind);
            if (p && near(at, p, 1.3)) choose(s, grip.kind, out);
        } else if (grip.on === "dish") takeBack(s, out);
        s.grip = null;
        s.pull = null;
    }
    if (!pad.touch && !pad.lifted) {
        s.grip = null;
        s.pull = null;
    }
    const most = s.L.counter + 8;
    for (const d of pad.pressed) {
        if (d === "right") s.power = Math.min(most, s.power + STEP);
        else if (d === "left") s.power = Math.max(LEAST, s.power - STEP);
    }
    if (pad.tapped) {
        s.touched = true;
        if (g) rollCoin(s, s.power, out);
        else slideCup(s, s.power, out);
    }
    if (pad.brake && !s.braked) brake(s, out);
    s.braked = pad.brake;
}

/** Where the camera looks: along with a cup or a coin on its way, and back at the booth otherwise. */
function camAim(s: StandState): number {
    const w = worldOf(s.L).w;
    const cup = s.cup,
        coin = s.coins.find((c) => c.mode === "rolling" || c.mode === "falling");
    const served = s.guests.find((g) => g.phase === "served");
    const follow =
        cup.mode === "sliding" || cup.mode === "falling"
            ? cup.x
            : coin
              ? coin.x
              : served
                ? served.x
                : null;
    const booth = VIEW.w / 2;
    return clamp(follow === null ? booth : Math.max(booth, follow), VIEW.w / 2, w - VIEW.w / 2);
}

export function stepStand(s: StandState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    s.time += DT;
    if (!s.won) hands(s, pad, out);
    const pouring = s.won ? (tipBack(s), 0) : tip(s, pad);
    fall(s, out);
    topUp(s, out);
    moveCup(s, out);
    moveCoins(s, out);
    moveGuests(s, out);
    s.after += DT;
    const act: CharlieAct =
        pouring > 0 || s.tipping
            ? "pour"
            : s.guests.some((g) => g.phase === "thanks") || s.won
              ? "cheer"
              : s.charlie.act === "slide" && s.charlie.since < 0.8
                ? "slide"
                : s.guests.some((g) => g.phase === "coming" || (g.phase === "waiting" && g.t < 1.5))
                  ? "wave"
                  : "stand";
    stepActor(s.charlie, act, CHARLIE_ACTS, DT);
    const aim = camAim(s);
    s.cam = { x: s.cam.x + (aim - s.cam.x) * Math.min(1, 3 * DT), y: VIEW.h / 2 };
    if (!s.won && done(s.goal) && s.guests.every((g) => g.phase === "going")) {
        s.won = true;
        s.note = "Every customer has their lemonade. What a day at the stand!";
        out.push(
            { cue: "win" },
            { burst: { kind: "sparkle", x: HOME, y: COUNTER_TOP - 8, n: 16 } },
        );
        eventOf(out, { kind: "sold-out" });
    }
    return out;
}

function tipBack(s: StandState): void {
    s.tipping = false;
    s.tilt = Math.max(0, s.tilt - 3.5 * DT);
}

/** Whether anything is still on its way: drink falling, a cup or a coin moving, a customer coming or going. */
export function busy(s: StandState): boolean {
    return (
        count(s.drops) > 0 ||
        s.tilt > 0 ||
        ["sliding", "falling", "back"].includes(s.cup.mode) ||
        rolling(s) ||
        s.guests.some((g) => g.phase !== "waiting" && g.phase !== "change")
    );
}

const PERSON_BASE: Record<string, string | number | boolean> = {
    pose: "stand",
    age: "child",
    tone: 3,
    hair: "short",
    colour: "brown",
    top: "sky",
    wear: "trousers",
    sleeves: "short",
    print: "none",
    bottom: "grey",
    pattern: "plain",
    legs: "covered",
    feet: "shoes",
    glasses: false,
    hearing: "none",
    aid: "none",
    mood: "happy",
    dir: -1,
    holding: "",
};

/** Charlie at her stand: a sunhat of a ponytail, a yellow top with a star, and a striped skirt. */
const CHARLIE_LOOK = {
    mood: "happy",
    hair: "ponytail",
    top: "glow",
    sleeves: "short",
    print: "star",
    wear: "skirt",
    bottom: "berry",
    pattern: "stripes",
    feet: "shoes",
    holding: "",
};
/** Charlie stands behind the booth, looking over the counter at her customers. */
const CHARLIE_AT = { x: 4.6, size: 6.5, feet: COUNTER_TOP + 2.2 };

/**
 * A person is drawn `size` squares across in the usual four-square box, and a pose that reaches out
 * (a point, a balance) has a box six squares across (engine/parts/people/figure.ts), so it is drawn
 * wider to stay the same height.
 */
const acrossFor = (pose: string, size: number): number =>
    pose === "point" || pose === "balance" ? size * 1.5 : size;

/** How tall a customer is drawn, and how far they stand up behind the counter, so each looks over it. */
const TALL: Record<string, number> = { child: 9, grownup: 12, older: 12 };
const liftOf = (w: Who): number => (w.kind === "pup" ? 1.4 : w.look.age === "child" ? 1 : 0);
const heightOf = (w: Who): number =>
    w.kind === "pup" ? (w.member === "dot" ? 7.5 : 9) : (TALL[String(w.look.age)] ?? 9);

function moodOf(g: Guest): string {
    if (g.phase === "coming" || g.phase === "thanks" || g.phase === "paying") return "excited";
    return g.patience > 0.45 ? "happy" : "worried";
}

function coinSprite(key: string, kind: CoinKind, at: Pt, angle = 0, z = 20): Sprite {
    const d = (MM[kind] * 1.55) / 20;
    const crop = { x: 1.5 - d / 2 - 0.08, y: 1.5 - d / 2 - 0.08, w: d + 0.16, h: d + 0.16 };
    return {
        key,
        art: "prop.coins",
        params: { coins: [kind] },
        crop,
        size: (crop.w * 2 * RADIUS[kind]) / d,
        x: at.x,
        y: at.y,
        angle,
        z,
    };
}

/** A cup's drink as drops for the view to run together: under its surface, which leans and rings as it sloshes. */
function drinkIn(x: number, base: number, level: number, slosh: Cup["slosh"] | null): number[] {
    if (level <= 0.005) return [];
    const k = cupInside(x, base),
        top = k.bottom - level * (k.bottom - k.full);
    const at = (px: number): number => {
        if (!slosh) return top;
        let y = top + Math.tan(slosh.a) * (px - x);
        for (const w of slosh.waves) y += rippleAt(w, px - x) * 0.4;
        return Math.max(k.full - 0.3, y);
    };
    const out: number[] = [];
    for (let y = k.bottom - GRAIN / 2; y > k.full - 0.3; y -= GRAIN)
        for (let px = k.l + GRAIN / 2; px < k.r; px += GRAIN)
            if (y > at(px) + 0.08) out.push(px, y);
    for (let px = k.l + SKIN; px < k.r - SKIN / 2; px += SKIN) out.push(px, at(px) + 0.1);
    return out;
}

/** The jug's inside as the world holds it, tipped. */
const jugInside = (tilt: number): Pt[] => PITCHER.inside.map((q) => jugPoint(tilt, q));

/** The drink in the jug: level across however it is tipped, as much of it as the jug still holds. */
function drinkInJug(tilt: number, share: number): number[] {
    if (share <= 0.01) return [];
    const poly = jugInside(tilt),
        whole = submerged(poly, Math.min(...poly.map((p) => p.y)) - 1).area,
        want = whole * 0.82 * share;
    let lo = Math.min(...poly.map((p) => p.y)),
        hi = Math.max(...poly.map((p) => p.y));
    for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        if (submerged(poly, mid).area > want) lo = mid;
        else hi = mid;
    }
    const top = (lo + hi) / 2,
        out: number[] = [];
    const inside = (p: Pt): boolean => {
        let hit = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const a = poly[i],
                b = poly[j];
            if (!a || !b) continue;
            if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
                hit = !hit;
        }
        return hit;
    };
    const xs = poly.map((p) => p.x),
        ys = poly.map((p) => p.y);
    for (let y = Math.max(...ys) - GRAIN / 2; y > top; y -= GRAIN)
        for (let x = Math.min(...xs) + GRAIN / 2; x < Math.max(...xs); x += GRAIN) {
            const p = { x, y };
            if (inside(p) && inside({ x: x - 0.1, y }) && inside({ x: x + 0.1, y })) out.push(x, y);
        }
    for (let x = Math.min(...xs); x < Math.max(...xs); x += SKIN)
        if (inside({ x, y: top + 0.12 })) out.push(x, top + 0.12);
    return out;
}

/** The lines in a customer's speech bubble for what they are doing now. */
function bubbleOf(s: StandState, g: Guest): string[] | null {
    const c = customerOf(s, g);
    if (g.phase === "waiting") {
        const what = orderWords(s.L, c.want);
        if (c.cups === 2)
            return g.got === 0
                ? ["Two cups of", `${what}, please!`]
                : ["One more of", `${what}, please!`];
        return [`${what.charAt(0).toUpperCase()}${what.slice(1)},`, "please!"];
    }
    if (g.phase === "paying") return [`Here is ${price(paid(c))}.`];
    if (g.phase === "change") return [`I paid ${price(paid(c))}.`, "My change, please!"];
    if (g.phase === "thanks") return ["Thank you!"];
    return null;
}

const guestSprites = (s: StandState, g: Guest, rest: boolean): Sprite[] => {
    const who = customerOf(s, g).who,
        lift = liftOf(who),
        mood = moodOf(g);
    const dress = (pose: string, facing: 1 | -1): Sprite =>
        who.kind === "pup"
            ? {
                  key: `guest:${g.i}`,
                  art: "pupfamily",
                  params: { member: who.member, pose, mood, dir: facing },
                  x: g.x,
                  y: FLOOR - lift,
                  stand: true,
                  size: 6,
                  z: 5,
              }
            : {
                  key: `guest:${g.i}`,
                  art: "person",
                  params: { ...PERSON_BASE, ...who.look, pose, mood, dir: facing },
                  x: g.x,
                  y: FLOOR - lift,
                  stand: true,
                  size: acrossFor(pose, 6),
                  z: 5,
              };
    return actorSprites(g.actor, actsOf(s, g), dress, g.stride, rest);
};

/** How far a push goes on a still counter, for the guide: the power set, or the pull being made. */
const previewPower = (s: StandState): number =>
    s.pull !== null ? s.pull * STAND.pull.value : s.power;

export function standFrame(s: StandState, rest = false): Frame {
    const L = s.L,
        world = worldOf(L),
        sprites: Sprite[] = [],
        marks: Mark[] = [],
        pools: Pool[] = [];
    const eye: Eye = { cam: { ...s.cam, zoom: 1 }, view: { w: VIEW.w + 40, h: VIEW.h } };
    const t = rest ? 0 : s.time;
    sprites.push(
        ...row(
            {
                key: "cloud",
                depth: 0.15,
                base: 6,
                every: 17,
                stray: 4,
                z: 0,
                gaps: 0.3,
                alpha: 0.9,
                drift: 0.25,
                things: [
                    { art: "cloud", params: { puffs: 4, rain: 0 }, size: 5, often: 2 },
                    { art: "cloud", params: { puffs: 3, rain: 0 }, size: 3.6, often: 1 },
                ],
            },
            eye,
            5,
            t,
        ),
        ...row(
            {
                key: "far",
                depth: 0.35,
                base: FLOOR - 0.6,
                every: 12,
                stray: 3,
                z: 1,
                alpha: 0.5,
                things: [
                    {
                        art: "tree",
                        params: { fruit: 0, fallen: 0, item: "apple" },
                        size: 6,
                        often: 2,
                    },
                    { art: "hedge", params: { clumps: 4, berries: 0, gap: 0 }, size: 5, often: 2 },
                ],
            },
            eye,
            13,
        ),
        ...(s.phase === STAND_LEVELS.length - 1
            ? row(
                  {
                      key: "bunting",
                      depth: 0.6,
                      base: COUNTER_TOP - STAND_ROOF - 1,
                      every: 11,
                      stray: 0.3,
                      z: 2,
                      alpha: 0.9,
                      things: [{ art: "strokes.bunting", size: 5, often: 1 }],
                  },
                  eye,
                  29,
              )
            : []),
        ...ground("grass", -BEYOND, world.w + BEYOND, FLOOR, 3),
    );
    if (L.wind > 0) {
        const w = windAt(s, t);
        sprites.push({
            key: "windsock",
            art: "windsock",
            params: { wind: Math.round((Math.abs(w) / L.wind) * 4) / 4, stripes: 5 },
            x: BOOTH - 1.2,
            y: COUNTER_TOP - STAND_ROOF + 2.8,
            stand: true,
            size: 4,
            flip: w < 0,
            z: 7,
        });
    }
    sprites.push(
        {
            key: "stand",
            art: "lemonadestand",
            params: {
                w: L.counter,
                booth: BOOTH,
                counter: FLOOR - COUNTER_TOP,
                stripes: "glow",
                price: `${price(L.price)} a cup`,
            },
            x: L.counter / 2,
            y: FLOOR,
            stand: true,
            size: L.counter,
            z: 8,
            still: true,
        },
        {
            key: "tray",
            art: "coindish",
            params: { w: TRAY.w },
            x: TRAY.x,
            y: COUNTER_TOP,
            stand: true,
            size: TRAY.w,
            z: 12,
            still: true,
        },
    );
    sprites.push(
        ...actorSprites(
            s.charlie,
            CHARLIE_ACTS,
            (pose) => ({
                key: "charlie",
                art: "charlie",
                params: { ...CHARLIE_LOOK, pose, dir: 1, mood: s.won ? "excited" : "happy" },
                x: CHARLIE_AT.x,
                y: CHARLIE_AT.feet,
                stand: true,
                size: acrossFor(pose, CHARLIE_AT.size),
                z: 4,
            }),
            0,
            rest,
        ),
    );
    const g = changing(s);
    for (const k of L.tray) {
        const p = trayAt(s, k);
        if (!p) continue;
        sprites.push(coinSprite(`tray:${k}`, k, p, 0, 13));
        if (g && s.hand === k)
            marks.push({
                kind: "ring",
                x: p.x,
                y: p.y,
                r: RADIUS[k] + 0.35,
                on: true,
                solid: true,
            });
    }
    for (const w of s.guests) {
        sprites.push(...guestSprites(s, w, rest));
        const c = customerOf(s, w),
            head = FLOOR - liftOf(c.who) - heightOf(c.who);
        const lines = bubbleOf(s, w);
        if (lines) {
            const width = Math.max(
                    6,
                    Math.min(12, Math.ceil(Math.max(...lines.map((l) => l.length)) * 0.5) + 2),
                ),
                k = 0.62,
                h = (lines.length * 2 + 2) * k;
            sprites.push({
                key: `bubble:${w.i}`,
                art: "bubble",
                params: { lines, width, tail: null },
                x: w.x,
                y: head - 0.5 - h / 2,
                size: width * k,
                z: 30,
            });
        }
        if (w.phase === "change")
            sprites.push({
                key: `dish:${w.i}`,
                art: "coindish",
                params: { w: DISH.w },
                x: slotX(s, w),
                y: COUNTER_TOP,
                stand: true,
                size: DISH.w,
                z: 12,
            });
        // the first of two cups waits on the counter beside its customer
        if (c.cups === 2 && w.got === 1 && w.phase === "waiting") {
            const x = slotX(s, w) + 2.4;
            pools.push({
                drops: drinkIn(x, COUNTER_TOP, c.want, null),
                r: WATER.r,
                hue: "glow",
                z: 15.5,
            });
            sprites.push(cupSprite(s, `cup:first:${w.i}`, x, COUNTER_TOP, 0));
        }
    }
    // the jug turns on a pin at the top of a post, so it tips where it hangs and never has to be carried
    marks.push({ kind: "line", a: { x: HAND.x, y: COUNTER_TOP }, b: HAND, style: "rod" });
    const jugMid = jugPoint(s.tilt, { x: PITCHER.w / 2, y: PITCHER.h / 2 });
    sprites.push({
        key: "jug",
        art: "pitcher",
        params: { lemon: 1 },
        x: jugMid.x,
        y: jugMid.y,
        angle: s.tilt,
        size: PITCHER.w * PK,
        z: 14,
    });
    pools.push({ drops: drinkInJug(s.tilt, s.jug), r: WATER.r, hue: "glow", z: 13.5 });
    const cup = s.cup;
    const served = s.guests.find((w) => w.phase === "served");
    const cupX = cup.mode === "taken" && served ? served.x - 1.6 : cup.x,
        cupBase = cup.mode === "taken" ? COUNTER_TOP - 1.2 : cup.base;
    if (cup.mode !== "falling")
        pools.push({
            drops: drinkIn(cupX, cupBase, cup.level, rest ? null : cup.slosh),
            r: WATER.r,
            hue: "glow",
            z: 15.5,
        });
    sprites.push(cupSprite(s, "cup", cupX, cupBase, cup.angle));
    if (count(s.drops)) pools.push({ drops: places(s.drops), r: WATER.r, hue: "glow", z: 15 });
    for (const [n, c] of s.coins.entries())
        sprites.push(
            coinSprite(
                `coin:${n}`,
                c.kind,
                { x: c.x, y: c.y },
                c.mode === "rolling" ? c.x / RADIUS[c.kind] : 0,
                17,
            ),
        );
    if (g && s.hand)
        sprites.push(
            coinSprite("hand", s.hand, { x: COIN_AT, y: COUNTER_TOP - RADIUS[s.hand] }, 0, 17),
        );
    // the guides: where the next order comes up to on the cup, and where a push will stop
    const next = waiting(s)[0];
    if (L.guide.fill && next && (cup.mode === "home" || cup.mode === "resting")) {
        const k = cupInside(cup.x, cup.base),
            want = customerOf(s, next).want,
            y = k.bottom - want * (k.bottom - k.full);
        marks.push({
            kind: "line",
            a: { x: k.l - 0.35, y },
            b: { x: k.r + 0.35, y },
            style: "aim",
        });
    }
    const from = g
        ? s.hand
            ? COIN_AT
            : null
        : cup.mode === "home" || cup.mode === "resting"
          ? cup.x
          : null;
    if (from !== null && !s.won) {
        const to = Math.min(L.counter + 2, from + previewPower(s)),
            y = COUNTER_TOP - 0.4;
        if (L.guide.slide === "path") {
            const pts: Pt[] = [];
            for (let x = from + 1; x < to; x += 1.2) pts.push({ x, y });
            if (pts.length) marks.push({ kind: "dots", pts, faint: true });
        }
        // the customer the push will reach is ringed, so a child aims at a person, not a place on the counter
        const target = waiting(s).find((w) => Math.abs(to - slotX(s, w)) <= ZONE);
        if (target)
            marks.push({ kind: "ring", x: slotX(s, target), y, r: 1.6, on: true, solid: true });
        marks.push({ kind: "ring", x: to, y, r: 0.9, on: target !== undefined });
    }
    if (s.pull !== null && from !== null)
        marks.push({
            kind: "line",
            a: { x: from, y: COUNTER_TOP - 1 },
            b: { x: from - s.pull * 0.6, y: COUNTER_TOP - 1 },
            style: "aim",
            head: true,
        });
    return {
        sprites,
        marks,
        camera: { x: s.cam.x, y: s.cam.y },
        // the whole stand is in view wherever the room allows, so no customer waits out of sight
        view: world,
        world,
        liquid: pools,
        time: t,
    };
}

function cupSprite(s: StandState, key: string, x: number, base: number, angle: number): Sprite {
    const h = LEMONCUP.h * CK;
    return {
        key,
        art: "lemoncup",
        params: { scale: s.L.cup.scale, max: s.L.cup.max, step: s.L.cup.step },
        x,
        y: base - h / 2,
        angle,
        size: LEMONCUP.w * CK,
        z: 16,
    };
}

/** The stand's own sounds: glass, a slide along wood, the chink of coins and a thank-you chime. */
const SOUNDS: Kit = {
    place: [
        { wave: "sine", hz: 1760, attack: 0.002, decay: 0.25, gain: 0.35 },
        { wave: "sine", hz: 2640, attack: 0.002, decay: 0.18, gain: 0.2 },
        { wave: "noise", hz: 3500, attack: 0.002, decay: 0.03, gain: 0.25 },
    ],
    lift: [{ wave: "noise", hz: 900, to: 500, attack: 0.02, decay: 0.4, gain: 0.35 }],
    ring: [
        { wave: "sine", hz: 2350, attack: 0.001, decay: 0.12, gain: 0.3 },
        { wave: "sine", hz: 3130, attack: 0.001, decay: 0.2, gain: 0.25, delay: 0.03 },
    ],
    level: [
        { wave: "triangle", hz: 659, attack: 0.02, decay: 0.25, gain: 0.35 },
        { wave: "triangle", hz: 880, attack: 0.02, decay: 0.4, gain: 0.35, delay: 0.12 },
    ],
    bump: [{ wave: "sine", hz: 220, to: 160, attack: 0.005, decay: 0.12, gain: 0.3 }],
};

function say(s: StandState): string {
    const cup = s.cup;
    const words = s.guests
        .filter((g) => g.phase !== "going")
        .map((g) => {
            const c = customerOf(s, g),
                where = `standing ${Math.round(slotX(s, g) - HOME)} squares down the counter`;
            if (g.phase === "coming") return "A customer is walking up to the counter.";
            if (g.phase === "waiting")
                return `A customer ${where} wants ${c.cups === 2 ? `two cups of ${orderWords(s.L, c.want)}${g.got ? ", and has one" : ""}` : orderWords(s.L, c.want)}.`;
            if (g.phase === "change")
                return `A customer ${where} paid ${price(paid(c))} for ${price(cost(s.L, c))} and has ${price(dishSum(s, g.i))} of change in the dish.`;
            return `A customer ${where} is being served.`;
        })
        .join(" ");
    const cupWords =
        cup.mode === "home"
            ? s.L.cup.scale === "ml"
                ? `The cup under the jug has ${Math.round(cup.level * s.L.cup.max)} ml in it.`
                : `The cup under the jug is ${Math.round(cup.level * 100)}% full.`
            : cup.mode === "resting"
              ? `The cup stands ${Math.round(cup.x - HOME)} squares down the counter.`
              : "The cup is on its way.";
    const hand = changing(s) && s.hand ? ` Charlie holds a ${s.hand}.` : "";
    return `${words} ${cupWords} The push is set to ${s.power} squares.${hand}`;
}

export const lemonadeGame: ActionGame<StandState> = {
    portrait: { hint: true },
    id: "wardrobe",
    title: "Charlie's lemonade stand",
    group: "action",
    quiet: true,
    levels: STAND_LEVELS,
    rate: RATE,
    touch: true,
    cover: { art: "pitcher", params: { lemon: 1 } },
    hint: "Drag the jug down to pour, then pull the cup back and let go to slide it to a customer. With the keys: hold down to pour, left and right set the push, space slides, C picks the next coin, and Backspace tips a cup out or takes a coin back",
    controls: {
        arrows: { up: "Tip back", down: "Pour", left: "Softer", right: "Harder" },
        go: "Slide",
        brake: "Tip out",
    },
    commands: [{ id: "coin", label: "Next coin", key: "c" }],
    command(s, id) {
        if (id !== "coin" || !changing(s) || s.L.tray.length === 0) return;
        const at = s.hand ? s.L.tray.indexOf(s.hand) : -1,
            kind = s.L.tray[(at + 1) % s.L.tray.length];
        if (kind) choose(s, kind, []);
    },
    sounds: SOUNDS,
    start: (phase) => startStand(phase),
    step: stepStand,
    say,
    note: (s) => (!s.touched && !s.won ? s.L.prompt : s.note),
    won: (s) => s.won,
    objectives: (s) => {
        const p = progress(s.goal);
        return { completed: p.completed, total: p.total };
    },
    frame: standFrame,
    back: (s) => brake(s, []),
    cancelInput(s) {
        s.grip = null;
        s.pull = null;
    },
    hum: (s): Hum[] => {
        const rate = pourRate(s.tilt, s.jug, 1, pouring());
        const w = Math.abs(windAt(s));
        return [
            ...(rate > 0
                ? [{ kind: "water" as const, level: Math.min(1, 0.3 + rate / STAND.gush.value) }]
                : []),
            ...(s.L.wind > 0 && w > 0.05
                ? [{ kind: "wind" as const, level: Math.min(1, w / s.L.wind) }]
                : []),
        ];
    },
    tuning: STAND,
    still: {
        press: () => Math.round(RATE * 0.25),
        settling: busy,
    },
};
