// Charlie's market stall: dress Charlie from a clothes stall, then pay for what she chose by pitching
// coins from her purse across the counter into the stallholder's dish.
//
// Trying things on is free: a tap puts a thing on or takes it off, and the receipt adds up whatever
// she wears. Paying is a fairground penny pitch seen from the side. The coin in Charlie's hand is
// pulled back and let go, or aimed with the arrows and thrown with the big button, and the physics
// decides where it goes: it bounces off the counter's edge and the dish's rims and off other coins,
// and one that does not end in the dish rolls away and comes back to the purse after a moment. The
// round is won when Charlie wears a whole outfit and the coins resting in the dish make exactly the
// receipt's total. A coin too many is tapped out of the dish again. The mathematics is in the amount
// and in which coins make it, never in the throw. See .docs/games.md.
import type { ActionGame, ActionLevel } from "./game";
import { aimAt, nearness, stepAim, type Aim, type AimSpec } from "../../engine/motion/aim";
import { bodies, type Bodies, type Body } from "../../engine/motion/bodies";
import { arc } from "../../engine/motion/flight";
import { moverAt, type Path } from "../../engine/motion/mover";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import { price } from "../../engine/parts/money/price";
import { BEYOND } from "./scenery";

export type CoinKind = "penny" | "nickel" | "dime" | "quarter";
const KINDS: CoinKind[] = ["penny", "nickel", "dime", "quarter"];
const WORTH: Record<CoinKind, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
/** A coin's radius in squares, in the proportions of the real coins. */
const RADIUS: Record<CoinKind, number> = { penny: 0.44, nickel: 0.48, dime: 0.41, quarter: 0.55 };
/** Millimetres across, as the coin drawing draws them, to crop one coin out of it. */
const MM: Record<CoinKind, number> = { penny: 19.05, nickel: 21.21, dime: 17.91, quarter: 24.26 };

type Kind = "top" | "dress" | "skirt" | "shorts" | "trousers" | "shoes" | "boots";
type Slot = "top" | "bottom" | "feet";
const SLOTS: Record<Kind, Slot[]> = {
    top: ["top"],
    dress: ["top", "bottom"],
    skirt: ["bottom"],
    shorts: ["bottom"],
    trousers: ["bottom"],
    shoes: ["feet"],
    boots: ["feet"],
};

export interface Item {
    kind: Kind;
    colour: "sky" | "mint" | "berry" | "tang" | "glow" | "white";
    sleeves: "long" | "short" | "none";
    print: "none" | "bear" | "star" | "heart" | "flower";
    pattern: "plain" | "stripes" | "rainbow" | "spots";
    /** In cents. */
    price: number;
}

export interface StallLevel extends ActionLevel {
    prompt: string;
    items: Item[];
    purse: Record<CoinKind, number>;
    /** Where the dish stands on the counter, in squares across; with two, the stallholder glides it back and forth between them, coins in flight or not. */
    dish: number[];
    /** How fast a gliding dish goes, in squares a second. */
    dishSpeed?: number;
    /** How wide the dish is, in whole squares: a dollar in quarters needs room for a pile. */
    dishW: number;
}

const it = (
    kind: Kind,
    colour: Item["colour"],
    cents: number,
    o: Partial<Pick<Item, "sleeves" | "print" | "pattern">> = {},
): Item => ({
    kind,
    colour,
    sleeves: o.sleeves ?? "short",
    print: o.print ?? "none",
    pattern: o.pattern ?? "plain",
    price: cents,
});
const shoes = (cents: number): Item => it("shoes", "white", cents, { sleeves: "none" });
const wellies = (cents: number): Item => it("boots", "white", cents, { sleeves: "none" });
const purse = (penny: number, nickel: number, dime: number, quarter: number) => ({
    penny,
    nickel,
    dime,
    quarter,
});

export const STALL_LEVELS: StallLevel[] = [
    {
        title: "Pennies and nickels",
        grades: [1, 1],
        goal: "Dress Charlie, then toss coins into the dish to pay exactly what the receipt says.",
        prompt: "Tap the clothes to dress Charlie. Then pull back the coin in her hand and let go.",
        items: [
            it("top", "sky", 3, { print: "star" }),
            it("top", "berry", 2, { print: "heart" }),
            it("shorts", "mint", 3),
            it("skirt", "glow", 4, { pattern: "spots" }),
            shoes(2),
            wellies(1),
        ],
        purse: purse(6, 2, 0, 0),
        dish: [26],
        dishW: 5,
    },
    {
        title: "Dimes as well",
        grades: [1, 2],
        goal: "Pay up to twenty cents exactly, with pennies, nickels and dimes.",
        prompt: "Dress Charlie, then pay the receipt exactly. A dime is ten cents.",
        items: [
            it("top", "tang", 6),
            it("top", "sky", 8, { sleeves: "long", print: "flower" }),
            it("dress", "mint", 12, { pattern: "spots" }),
            it("skirt", "berry", 5),
            it("trousers", "sky", 7),
            shoes(3),
            wellies(4),
        ],
        purse: purse(5, 2, 2, 0),
        dish: [27],
        dishW: 5,
    },
    {
        title: "Up to fifty cents",
        grades: [2, 2],
        goal: "Pay up to fifty cents exactly. A quarter is twenty five cents.",
        prompt: "Dress Charlie, then pay the receipt exactly. Choose your coins.",
        items: [
            it("top", "white", 15, { print: "star" }),
            it("top", "berry", 20, { sleeves: "long" }),
            it("dress", "sky", 30, { pattern: "rainbow" }),
            it("shorts", "mint", 10, { pattern: "stripes" }),
            it("skirt", "tang", 15, { pattern: "stripes" }),
            shoes(10),
            wellies(5),
        ],
        purse: purse(0, 3, 4, 1),
        dish: [28],
        dishW: 5,
    },
    {
        title: "Up to a dollar",
        grades: [2, 3],
        goal: "Pay up to a dollar exactly. The dish is further along the counter.",
        prompt: "Dress Charlie, then pay the receipt exactly. The dish is further away now.",
        items: [
            it("top", "sky", 25, { print: "star" }),
            it("top", "mint", 35, { sleeves: "long" }),
            it("dress", "tang", 60, { pattern: "stripes" }),
            it("skirt", "berry", 30, { pattern: "spots" }),
            it("shorts", "tang", 20),
            shoes(15),
            wellies(10),
        ],
        purse: purse(0, 3, 4, 3),
        dish: [31],
        dishW: 6,
    },
    {
        title: "Dollars and cents",
        grades: [3, 3],
        goal: "Pay dollars and cents exactly. The purse holds more than you need, so choose the coins.",
        prompt: "The purse holds more than the receipt. Choose which coins to throw.",
        items: [
            it("top", "berry", 115, { print: "star" }),
            it("top", "sky", 140, { sleeves: "long", print: "bear" }),
            it("dress", "white", 225, { pattern: "stripes", print: "star" }),
            it("skirt", "sky", 95, { pattern: "rainbow" }),
            it("trousers", "tang", 120),
            shoes(65),
            wellies(45),
        ],
        purse: purse(4, 3, 6, 12),
        dish: [29],
        dishW: 8,
    },
    {
        title: "The dish on the move",
        grades: [4, 4],
        goal: "The stallholder glides the dish back and forth along the counter, and the purse is short of small coins.",
        prompt: "The dish keeps moving. Throw where it will be. Pay exactly, with few small coins to spare.",
        items: [
            it("top", "mint", 85, { sleeves: "none", print: "flower" }),
            it("top", "sky", 70, { print: "star" }),
            it("dress", "mint", 165, { pattern: "spots" }),
            it("skirt", "berry", 95, { pattern: "spots" }),
            it("trousers", "sky", 80),
            shoes(55),
            wellies(40),
        ],
        purse: purse(0, 2, 3, 9),
        dish: [24, 32],
        dishSpeed: 2,
        dishW: 8,
    },
];

/** The numbers that make a throw feel the way it does. They take hold at the next throw. */
export const STALL = {
    gravity: knob(
        30,
        20,
        45,
        1,
        "squares a second each second",
        "a throw across the stall takes about a second, long enough to watch it land",
    ),
    speed: knob(
        32,
        24,
        40,
        1,
        "squares a second",
        "a full pull reaches the far end of the counter and no further",
    ),
    bounce: knob(
        0.25,
        0,
        0.6,
        0.05,
        "of the speed",
        "a coin hops once on the counter and settles, and rarely jumps a rim",
    ),
    friction: knob(
        0.6,
        0.2,
        1,
        0.05,
        "of the load",
        "a coin that lands flat slides a little and stops instead of skating off",
    ),
    preview: knob(
        0.35,
        0,
        1,
        0.05,
        "seconds",
        "the dots show how a throw leaves the hand, not where it lands, so the landing is learned",
    ),
    rest: knob(
        0.6,
        0.2,
        1.5,
        0.1,
        "seconds",
        "a missed coin is seen where it stopped before it goes back to the purse",
    ),
};

const RATE = 60;
const DT = 1 / RATE;
const FLOOR = 24;
const VIEW = { w: 40, h: 28 };
/** Charlie stands by her middle at the foot of the view, and holds the next coin here. */
const CHARLIE = { x: 6, size: 9 };
export const HAND: Pt = { x: 6.6, y: 16.9 };
/** A press this near the hand pulls the coin; further away it is a tap. */
const GRAB = 2.4;
const STALL_BOX = { x: 16, w: 20, counter: 6 };
const COUNTER_TOP = FLOOR - STALL_BOX.counter;
const RAIL = { x: 18, top: 3, w: 15, bar: 1, shelf: 8 };
/** How tall a dish's rims stand, in squares; a dish's width is its level's. */
const RIM = 1.8;
const innerOf = (s: StallState): number => s.L.dishW / 2 - 0.45;

/** A throw from the hand, arrows up and down to aim and left and right for strength. */
const THROW: AimSpec = {
    min: 8,
    max: 32,
    per: 4,
    dead: 0.4,
    lo: -1.45,
    hi: 0.2,
    turn: 0.8,
    ramp: 9,
    turns: "up",
};
const specOf = (): AimSpec => ({ ...THROW, max: STALL.speed.value, per: STALL.speed.value / 8 });

interface Coin {
    id: number;
    kind: CoinKind;
    body: Body;
    /** Steps it has been still for. */
    still: number;
    /** Thrown and not yet come to rest for the first time. */
    flying: boolean;
    /** The step it goes back to the purse, once it has rested outside the dish. */
    home: number | null;
}

export interface StallState {
    level: number;
    L: StallLevel;
    world: Bodies;
    dishBodies: Body[];
    dishAt: number;
    /** How fast the dish is gliding now, in squares a second across. */
    dishV: number;
    worn: number[];
    purse: Record<CoinKind, number>;
    hand: CoinKind | null;
    coins: Coin[];
    ids: number;
    aim: Aim;
    press: { start: Pt; pulling: boolean } | null;
    /** The thing on the stall the keys point at, or -1. */
    cursor: number;
    /** The last coin thrown, whose landing the note speaks about. */
    last: number | null;
    throws: number;
    steps: number;
    said: string;
    saidAt: number;
    won: boolean;
    wonAt: number;
}

const complete = (s: StallState): boolean => {
    const taken = s.worn.flatMap((i) => SLOTS[s.L.items[i]?.kind ?? "top"]);
    return taken.includes("top") && taken.includes("bottom") && taken.includes("feet");
};

export const totalOf = (s: StallState): number =>
    s.worn.reduce((n, i) => n + (s.L.items[i]?.price ?? 0), 0);

function inDish(s: StallState, c: Coin): boolean {
    const p = s.world.where(c.body);
    return Math.abs(p.x - s.dishAt) < innerOf(s) && p.y < COUNTER_TOP && p.y > COUNTER_TOP - 3;
}

const resting = (c: Coin): boolean => c.still >= 20;

/** The coins resting in the dish. */
const dishCoins = (s: StallState): Coin[] =>
    s.coins.filter((c) => !c.flying && c.home === null && resting(c) && inDish(s, c));

export const dishSum = (s: StallState): number =>
    dishCoins(s).reduce((n, c) => n + WORTH[c.kind], 0);

const busy = (s: StallState): boolean =>
    s.coins.some((c) => c.flying || c.home !== null || !resting(c));

/** The way a gliding dish goes, there and back along the counter, or null for a dish that stands still. */
function dishPath(L: StallLevel): Path | null {
    const [a, b] = L.dish;
    if (a === undefined || b === undefined) return null;
    return {
        points: [
            { x: a, y: 0 },
            { x: b, y: 0 },
        ],
        speed: L.dishSpeed ?? 2,
        mode: "bounce",
    };
}

/** Where the dish's middle is at a step: a function of the steps alone, so a throw can be led and a replay agrees. */
export function dishAtStep(s: StallState, step: number): number {
    const path = dishPath(s.L);
    return path ? moverAt(path, step * DT).at.x : s.dishAt;
}

function buildDish(s: StallState): void {
    for (const b of s.dishBodies) s.world.remove(b);
    const x = s.dishAt,
        floor = COUNTER_TOP - 0.75,
        glides = dishPath(s.L) !== null;
    // a gliding dish is carried by the game and carries the coins resting in it
    const kind = glides ? { carried: true } : { fixed: true };
    s.dishBodies = [
        s.world.box({ x, y: floor + 0.35, w: s.L.dishW - 0.6, h: 0.7, ...kind, friction: 0.8 }),
        ...[-1, 1].map((k) =>
            s.world.box({
                x: x + k * (s.L.dishW / 2 - 0.25),
                y: COUNTER_TOP - RIM / 2 - 0.35,
                w: 0.35,
                h: RIM,
                ...kind,
                friction: 0.4,
                restitution: 0.1,
            }),
        ),
    ];
}

export function startStall(level: number, given?: StallLevel): StallState {
    const L = given ?? STALL_LEVELS[level] ?? STALL_LEVELS[0];
    if (!L) throw new Error("the stall has no levels");
    const world = bodies({ gravity: { x: 0, y: STALL.gravity.value } });
    world.ground({ y: FLOOR, from: -4, to: VIEW.w + 4, friction: 0.9 });
    world.box({
        x: STALL_BOX.x + STALL_BOX.w / 2,
        y: COUNTER_TOP + STALL_BOX.counter / 2,
        w: STALL_BOX.w,
        h: STALL_BOX.counter,
        fixed: true,
        friction: 0.7,
        restitution: 0.2,
    });
    for (const x of [-1, VIEW.w + 1])
        world.box({ x, y: FLOOR / 2, w: 2, h: FLOOR * 2, fixed: true });
    const s: StallState = {
        level,
        L,
        world,
        dishBodies: [],
        dishAt: L.dish[0] ?? 27,
        dishV: 0,
        worn: [],
        purse: { ...L.purse },
        hand: KINDS.find((k) => L.purse[k] > 0) ?? null,
        coins: [],
        ids: 0,
        aim: aimAt(-0.8, 18),
        press: null,
        cursor: -1,
        last: null,
        throws: 0,
        steps: 0,
        said: L.prompt,
        saidAt: 0,
        won: false,
        wonAt: 0,
    };
    buildDish(s);
    return s;
}

const say = (s: StallState, text: string): void => {
    s.said = text;
    s.saidAt = s.steps;
};

const coinName = (k: CoinKind): string => k;

const COLOUR_WORDS: Record<Item["colour"], string> = {
    sky: "blue",
    mint: "green",
    berry: "pink",
    tang: "orange",
    glow: "yellow",
    white: "white",
};

function nameOf(i: Item): string {
    const c = COLOUR_WORDS[i.colour];
    const look =
        i.pattern === "stripes"
            ? `${c} striped`
            : i.pattern === "spots"
              ? `${c} spotty`
              : i.pattern === "rainbow"
                ? "rainbow"
                : c;
    const print = i.print === "none" ? "" : ` with a ${i.print}`;
    if (i.kind === "top")
        return `${c} ${i.sleeves === "long" ? "jumper" : i.sleeves === "none" ? "vest top" : "T-shirt"}${print}`;
    if (i.kind === "dress") return `${look} dress${print}`;
    if (i.kind === "shoes") return "black shoes";
    if (i.kind === "boots") return "yellow wellies";
    if (i.kind === "trousers") return `${c} trousers`;
    return `${look} ${i.kind}`;
}

/** Puts a thing on, taking off whatever it would be worn in place of, or takes it off. */
export function wear(s: StallState, i: number): void {
    const item = s.L.items[i];
    if (!item || s.won) return;
    if (s.worn.includes(i)) {
        s.worn = s.worn.filter((j) => j !== i);
        say(s, `Charlie takes off the ${nameOf(item)}.`);
        return;
    }
    const slots = SLOTS[item.kind];
    s.worn = [
        ...s.worn.filter((j) => {
            const other = s.L.items[j];
            return !other || !SLOTS[other.kind].some((x) => slots.includes(x));
        }),
        i,
    ].sort((a, b) => a - b);
    say(
        s,
        `Charlie tries on the ${nameOf(item)}, ${price(item.price)}. The receipt says ${price(totalOf(s))}.`,
    );
}

function nextHand(s: StallState, from: CoinKind | null): CoinKind | null {
    const start = from ? KINDS.indexOf(from) : -1;
    for (let k = 1; k <= KINDS.length; k++) {
        const kind = KINDS[(start + k) % KINDS.length];
        if (kind && s.purse[kind] > 0) return kind;
    }
    return null;
}

function takeBack(s: StallState, c: Coin): void {
    s.world.remove(c.body);
    s.coins = s.coins.filter((x) => x !== c);
    s.purse[c.kind]++;
    s.hand ??= c.kind;
}

const canThrow = (s: StallState): boolean =>
    !s.won && !s.coins.some((c) => c.flying) && s.hand !== null && s.purse[s.hand] > 0;

function throwCoin(s: StallState, v: Pt): void {
    const kind = s.hand;
    if (!kind) return;
    s.purse[kind]--;
    const body = s.world.ball({
        x: HAND.x,
        y: HAND.y,
        r: RADIUS[kind],
        fast: true,
        density: 1,
        friction: STALL.friction.value,
        restitution: STALL.bounce.value,
        damping: { turn: 4 },
    });
    s.world.launch(body, v);
    const id = s.ids++;
    s.coins.push({ id, kind, body, still: 0, flying: true, home: null });
    s.last = id;
    s.throws++;
    if (s.purse[kind] === 0) s.hand = nextHand(s, kind);
}

/** Where each thing hangs on the stall: its middle, and how big it is drawn. */
export function spotOf(s: StallState, i: number): { x: number; y: number; w: number; h: number } {
    const item = s.L.items[i];
    const feet = item?.kind === "shoes" || item?.kind === "boots";
    const same = s.L.items.filter((x) => (x.kind === "shoes" || x.kind === "boots") === feet);
    const k = item ? same.indexOf(item) : 0;
    if (feet) {
        const h = item?.kind === "boots" ? 2.4 : 1.8;
        return { x: RAIL.x + 2 + k * 6, y: RAIL.top + RAIL.shelf - h / 2, w: 3, h };
    }
    return { x: RAIL.x + 1.9 + k * 2.85, y: RAIL.top + RAIL.bar - 0.2 + 1.8, w: 3, h: 3.6 };
}

const PURSE_ROW = { y: 26.1, x0: 6, gap: 2.4 };
export const purseSpot = (k: CoinKind): Pt => ({
    x: PURSE_ROW.x0 + KINDS.indexOf(k) * PURSE_ROW.gap,
    y: PURSE_ROW.y,
});

function tapAt(s: StallState, p: Pt): void {
    if (s.won) return;
    for (const c of dishCoins(s)) {
        const at = s.world.where(c.body);
        if (Math.hypot(p.x - at.x, p.y - at.y) <= RADIUS[c.kind] + 0.5) {
            takeBack(s, c);
            say(
                s,
                `The ${coinName(c.kind)} goes back to the purse. The dish holds ${price(dishSum(s))}.`,
            );
            return;
        }
    }
    for (const k of KINDS) {
        const at = purseSpot(k);
        if (s.purse[k] > 0 && Math.hypot(p.x - at.x, p.y - at.y) <= 1.2) {
            s.hand = k;
            say(s, `Charlie holds a ${coinName(k)}, worth ${price(WORTH[k])}.`);
            return;
        }
    }
    s.L.items.forEach((_, i) => {
        const r = spotOf(s, i);
        if (Math.abs(p.x - r.x) <= r.w / 2 + 0.2 && Math.abs(p.y - r.y) <= r.h / 2 + 0.3)
            wear(s, i);
    });
}

/** Coins that have come to rest are judged: in the dish they count, anywhere else they go home. */
function judge(s: StallState, out: Happening[]): void {
    for (const c of s.coins) {
        // a coin riding the gliding dish is still when it keeps pace with the dish
        const v = s.world.velocity(c.body),
            riding = inDish(s, c);
        c.still = Math.hypot(v.x - (riding ? s.dishV : 0), v.y) > 0.12 ? 0 : c.still + 1;
        const at = s.world.where(c.body);
        const gone = at.y > VIEW.h + 2 || at.x < -2 || at.x > VIEW.w + 2;
        if (c.home !== null) {
            if (s.steps >= c.home || gone) {
                takeBack(s, c);
                out.push({ cue: "back" });
            }
            continue;
        }
        if (!resting(c) && !gone) continue;
        const inside = !gone && inDish(s, c);
        if (c.flying) {
            c.flying = false;
            if (inside) {
                out.push({ cue: "place" }, { burst: { kind: "sparkle", x: at.x, y: at.y, n: 5 } });
                const paid = dishSum(s),
                    owed = totalOf(s);
                say(
                    s,
                    `In the dish. It holds ${price(paid)}${owed ? ` of ${price(owed)}` : ""}.${paid > owed && owed > 0 ? " That is too much: tap a coin in the dish to take it back." : ""}`,
                );
            } else {
                const word = nearness(at.x - s.dishAt, innerOf(s));
                say(
                    s,
                    `${word === "on it" ? "On the rim" : word[0]?.toUpperCase() + word.slice(1)}. The ${coinName(c.kind)} goes back to the purse.`,
                );
            }
        }
        if (!inside) c.home = s.steps + Math.round(STALL.rest.value * RATE);
    }
}

export function stepStall(s: StallState, pad: Pad): Happening[] {
    s.steps++;
    const out: Happening[] = [];
    let pull: Pt | null = pad.pull,
        released: Pt | null = pad.released;
    if (pad.touch && !s.press)
        s.press = {
            start: pad.touch,
            pulling: canThrow(s) && Math.hypot(pad.touch.x - HAND.x, pad.touch.y - HAND.y) <= GRAB,
        };
    if (s.press?.pulling && pad.touch) pull = { x: pad.touch.x - HAND.x, y: pad.touch.y - HAND.y };
    if (pad.lifted && s.press) {
        const p = pad.lifted;
        if (s.press.pulling) released = { x: p.x - HAND.x, y: p.y - HAND.y };
        else if (Math.hypot(p.x - s.press.start.x, p.y - s.press.start.y) < 1.2) tapAt(s, p);
        s.press = null;
    }
    if (!s.won) {
        const v = stepAim(s.aim, { ...pad, pull, released }, specOf(), DT);
        if (v && canThrow(s)) {
            throwCoin(s, v);
            out.push({ cue: "lift" });
        }
    }
    s.world.gravity({ x: 0, y: STALL.gravity.value });
    if (dishPath(s.L)) {
        // set the dish's speed so that after this step it is exactly where its path says
        const floor = s.dishBodies[0];
        const now = floor ? s.world.where(floor).x : s.dishAt;
        s.dishV = (dishAtStep(s, s.steps) - now) / DT;
        for (const b of s.dishBodies) s.world.launch(b, { x: s.dishV, y: 0 });
    }
    s.world.step(DT);
    if (dishPath(s.L) && s.dishBodies[0]) s.dishAt = s.world.where(s.dishBodies[0]).x;
    const hard = s.world.hits().find((h) => h.speed > 4);
    if (hard) {
        // a coin that strikes the counter or the dish's rim throws a spark where it hit
        const coin = s.coins.find((c) => c.body === hard.a || c.body === hard.b);
        const at = coin ? s.world.where(coin.body) : null;
        out.push({ cue: "bump" });
        if (at) out.push({ burst: { kind: "sparkle", x: at.x, y: at.y, n: 2 } });
    }
    judge(s, out);
    if (!s.won && complete(s) && !busy(s) && dishSum(s) === totalOf(s)) {
        s.won = true;
        s.wonAt = s.steps;
        say(s, `Paid exactly ${price(totalOf(s))}. Charlie is ready for the party.`);
        out.push(
            { cue: "win" },
            { burst: { kind: "sparkle", x: CHARLIE.x, y: FLOOR - 10, n: 14 } },
            { burst: { kind: "sparkle", x: s.dishAt, y: COUNTER_TOP - 1.5, n: 10 } },
        );
    } else if (
        !s.won &&
        !busy(s) &&
        s.last !== null &&
        totalOf(s) > 0 &&
        dishSum(s) === totalOf(s) &&
        !complete(s)
    ) {
        say(
            s,
            "The dish matches the receipt, but Charlie still needs a top and a bottom, or a dress, and something on her feet.",
        );
        s.last = null;
    }
    return out;
}

function charlieParams(s: StallState): Record<string, unknown> {
    const p: Record<string, unknown> = {
        pose: s.won ? "cheer" : "hold",
        mood: s.won ? "excited" : "happy",
        dir: 1,
        hair: "fringe",
        holding: "",
        top: "white",
        sleeves: "none",
        print: "none",
        wear: "shorts",
        bottom: "grey",
        pattern: "plain",
        feet: "bare",
    };
    for (const i of s.worn) {
        const item = s.L.items[i];
        if (!item) continue;
        if (item.kind === "top")
            Object.assign(p, { top: item.colour, sleeves: item.sleeves, print: item.print });
        else if (item.kind === "dress")
            Object.assign(p, {
                wear: "dress",
                top: item.colour,
                sleeves: item.sleeves,
                print: item.print,
                pattern: item.pattern,
            });
        else if (item.kind === "shoes" || item.kind === "boots") p.feet = item.kind;
        else Object.assign(p, { wear: item.kind, bottom: item.colour, pattern: item.pattern });
    }
    return p;
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

function receiptLines(s: StallState): { name: string; cents: number }[] {
    const word: Record<Kind, string> = {
        top: "Top",
        dress: "Dress",
        skirt: "Skirt",
        shorts: "Shorts",
        trousers: "Trousers",
        shoes: "Shoes",
        boots: "Wellies",
    };
    return s.worn.flatMap((i) => {
        const item = s.L.items[i];
        return item ? [{ name: word[item.kind], cents: item.price }] : [];
    });
}

export function stallFrame(s: StallState, rest = false): Frame {
    const lines = receiptLines(s);
    const sprites: Sprite[] = [
        {
            key: "rail",
            art: "clothesrail",
            params: { w: RAIL.w, h: FLOOR - RAIL.top, bars: [RAIL.bar], shelf: RAIL.shelf },
            x: RAIL.x + RAIL.w / 2,
            y: FLOOR,
            stand: true,
            size: RAIL.w,
            z: 1,
            still: true,
        },
        {
            key: "stallholder",
            art: "person",
            params: {
                pose: s.won ? "wave" : "stand",
                age: "grownup",
                tone: 5,
                hair: "curly",
                colour: "black",
                top: "tang",
                wear: "trousers",
                sleeves: "short",
                print: "none",
                bottom: "grey",
                pattern: "plain",
                legs: "covered",
                feet: "shoes",
                glasses: true,
                hearing: "none",
                aid: "none",
                mood: "happy",
                dir: -1,
                holding: "",
            },
            x: 34.2,
            y: FLOOR,
            stand: true,
            size: 6,
            z: 2,
        },
        {
            key: "stall",
            art: "stallcounter",
            params: { w: STALL_BOX.w, h: FLOOR, counter: STALL_BOX.counter },
            x: STALL_BOX.x + STALL_BOX.w / 2,
            y: FLOOR,
            stand: true,
            size: STALL_BOX.w,
            z: 3,
            still: true,
        },
        {
            key: "dish",
            art: "coindish",
            params: { w: s.L.dishW },
            x: s.dishAt,
            y: COUNTER_TOP + 0.35,
            stand: true,
            size: s.L.dishW,
            z: 5,
        },
        {
            key: "charlie",
            art: "charlie",
            params: charlieParams(s),
            x: CHARLIE.x,
            y: FLOOR,
            stand: true,
            size: CHARLIE.size,
            z: 6,
        },
        {
            key: "dog",
            art: "dog",
            params: { facing: 1, ball: 0 },
            x: 12.2,
            y: FLOOR,
            stand: true,
            size: 7,
            z: 6,
        },
        {
            key: "receipt",
            art: "receipt",
            params: { shop: "Charlie's outfit", items: lines, total: true },
            x: 4.4,
            y: 0.4 + ((lines.length * 2 + 9) * 8) / 12 / 2,
            size: 8,
            z: 8,
        },
        {
            key: "purse",
            art: "purse",
            params: { coins: [] },
            x: 2.6,
            y: PURSE_ROW.y,
            size: 4,
            z: 8,
        },
    ];
    s.L.items.forEach((item, i) => {
        const r = spotOf(s, i);
        const worn = s.worn.includes(i);
        sprites.push({
            key: `item:${i}`,
            art: "garment",
            params: {
                kind: item.kind,
                colour: item.colour,
                sleeves: item.sleeves,
                print: item.print,
                pattern: item.pattern,
            },
            x: r.x,
            y: r.y,
            size: r.w,
            z: 4,
            faint: worn,
        });
        const feet = item.kind === "shoes" || item.kind === "boots";
        sprites.push({
            key: `tag:${i}`,
            art: "pricetag",
            params: { now: item.price, was: 0 },
            x: r.x,
            y: feet ? RAIL.top + RAIL.shelf + 1.3 : r.y + r.h / 2 + 0.2,
            size: 2.7,
            z: 4.5,
        });
    });
    const marks: Mark[] = [
        {
            kind: "line",
            a: { x: -BEYOND, y: FLOOR },
            b: { x: VIEW.w + BEYOND, y: FLOOR },
            style: "ink",
        },
    ];
    for (const k of KINDS) {
        const at = purseSpot(k);
        if (s.L.purse[k] === 0 && s.purse[k] === 0) continue;
        sprites.push({ ...coinSprite(`purse:${k}`, k, at, 0, 9), faint: s.purse[k] === 0 });
        marks.push({ kind: "word", x: at.x, y: at.y + 1.45, text: `${s.purse[k]}`, size: 0.7 });
        if (k === s.hand)
            marks.push({ kind: "ring", x: at.x, y: at.y, r: 0.95, on: true, solid: true });
    }
    for (const c of s.coins) {
        const at = s.world.where(c.body);
        sprites.push(coinSprite(`coin:${c.id}`, c.kind, at, at.angle, 12));
    }
    if (canThrow(s) && s.hand) {
        sprites.push(coinSprite("hand", s.hand, HAND, 0, 12));
        const v = {
            x: Math.cos(s.aim.angle) * s.aim.power,
            y: Math.sin(s.aim.angle) * s.aim.power,
        };
        if (!rest || s.aim.pulling)
            marks.push({
                kind: "dots",
                pts: arc(HAND, v, STALL.gravity.value, {
                    seconds: STALL.preview.value,
                    every: 0.05,
                }),
            });
        marks.push({ kind: "ring", x: HAND.x, y: HAND.y, r: 0.9, on: s.aim.pulling });
    }
    if (s.cursor >= 0) {
        const r = spotOf(s, s.cursor);
        marks.push({
            kind: "box",
            x: r.x - r.w / 2 - 0.2,
            y: r.y - r.h / 2 - 0.2,
            w: r.w + 0.4,
            h: r.h + 0.4,
            on: true,
        });
    }
    marks.push({
        kind: "word",
        x: s.dishAt,
        y: COUNTER_TOP - 2.6,
        text: `${price(dishSum(s))} in the dish`,
        size: 0.7,
    });
    return {
        sprites,
        marks,
        camera: { x: VIEW.w / 2, y: VIEW.h / 2 },
        view: { ...VIEW },
        world: { ...VIEW },
    };
}

function sayStall(s: StallState): string {
    const worn = s.worn.flatMap((i) => (s.L.items[i] ? [nameOf(s.L.items[i])] : []));
    const wearing = worn.length
        ? `Charlie is wearing the ${worn.join(", the ")}`
        : "Charlie is in her vest and shorts";
    const coins = KINDS.filter((k) => s.purse[k] > 0).map(
        (k) => `${s.purse[k]} ${s.purse[k] === 1 ? k : k === "penny" ? "pennies" : `${k}s`}`,
    );
    const flying = s.coins.some((c) => c.flying) ? " A coin is in the air." : "";
    return `${wearing}, and the receipt says ${price(totalOf(s))}. The dish holds ${price(dishSum(s))}. The purse holds ${coins.length ? coins.join(", ") : "nothing"}${s.hand ? `, and Charlie holds a ${s.hand}` : ""}.${flying}`;
}

export const wardrobeGame: ActionGame<StallState> = {
    id: "wardrobe",
    title: "Charlie's market stall",
    group: "action",
    levels: STALL_LEVELS,
    rate: RATE,
    touch: true,
    cover: { art: "coindish", params: { w: 5 } },
    hint: "Tap the clothes to dress Charlie. Pull back the coin in her hand and let go to toss it into the dish, or aim with the arrows and throw with space. C changes the coin, N and T choose and try on clothes, and Backspace takes a coin back",
    controls: {
        arrows: { up: "Aim higher", down: "Aim lower", left: "Softer", right: "Harder" },
        go: "Throw",
    },
    commands: [
        { id: "coin", label: "Next coin", key: "c" },
        { id: "thing", label: "Next thing", key: "n" },
        { id: "wear", label: "Try it on", key: "t" },
    ],
    command(s, id) {
        if (s.won) return;
        if (id === "coin") {
            s.hand = nextHand(s, s.hand);
            if (s.hand) say(s, `Charlie holds a ${s.hand}, worth ${price(WORTH[s.hand])}.`);
        } else if (id === "thing") {
            s.cursor = (s.cursor + 1) % s.L.items.length;
            const item = s.L.items[s.cursor];
            if (item) say(s, `The ${nameOf(item)}, ${price(item.price)}.`);
        } else if (id === "wear" && s.cursor >= 0) wear(s, s.cursor);
    },
    start: (level) => startStall(level),
    step: stepStall,
    say: sayStall,
    note: (s) => (s.steps - s.saidAt < RATE * 5 || s.won ? s.said : ""),
    won: (s) => s.won,
    objectives: (s) => ({ completed: s.won ? 1 : 0, total: 1 }),
    frame: stallFrame,
    pullFrom: (s) => (canThrow(s) ? { ...HAND } : null),
    cancelInput(s) {
        s.press = null;
        s.aim.pulling = false;
    },
    back(s) {
        const last = dishCoins(s).at(-1);
        if (!last || s.won) return false;
        takeBack(s, last);
        say(s, `The ${last.kind} goes back to the purse.`);
        return true;
    },
    tuning: STALL,
    still: {
        press: () => 1,
        settling: busy,
    },
};
