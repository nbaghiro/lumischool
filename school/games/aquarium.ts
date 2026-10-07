// Charlie's aquarium, after Fishdom: tanks to fill, fish to net and carry, food to toss and water to
// keep healthy, each level a request from someone who wants a tank. The water pours as real drops and
// fills to the litre; fish shoal by kind and dart from a net swept too fast, so a slow sweep catches
// them; a pinch of flakes is pulled back and tossed, drifts down and is eaten; and plants, snails,
// the filter, the heater and crowding move a meter for oxygen and cleanness. Nothing dies: an unhappy
// fish droops until its tank is put right. The maths is in the requests: litres and fractions of a
// tank, fish per litre, flakes per fish, colours to sort, plants per fish and degrees on a dial.
// See .docs/games.md.
import type { Hum, Kit } from "../../engine/sound/kit";
import {
    aimAt,
    aimOfPull,
    launchOf,
    stepAim,
    type Aim,
    type AimSpec,
} from "../../engine/motion/aim";
import { bounce, currentOf, pointing } from "../../engine/motion/guide";
import type { Pt } from "../../engine/motion/geometry";
import {
    STREAM,
    count,
    drain,
    liquid,
    places,
    pour,
    stepLiquid,
    type Liquid,
} from "../../engine/motion/liquid";
import { catches, dartFrom, inMouth, sweepSpeed, type NetFeel } from "../../engine/motion/net";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Light, Mark, Sprite, Water } from "../../engine/motion/scene";
import { shoalWant, swim, type Bounds, type ShoalFeel } from "../../engine/motion/shoal";
import { arrive, flee } from "../../engine/motion/steer";
import { knob } from "../../engine/motion/tune";
import {
    FINE,
    crowding,
    healthy,
    settled,
    stepQuality,
    type Quality,
    type TankLife,
} from "../../engine/motion/waterquality";
import { TANK_EDGE, markWords, type TankScale } from "../../engine/parts/home/aquarium";
import { tankFishBox, type FishTone, type TankFishKind } from "../../engine/parts/animals/tankfish";
import type { IconName } from "../../engine/parts/apps/icon";
import type { ActionGame, ActionLevel, Levels } from "./game";

type AquaPlace = "bedroom" | "petshop" | "pond" | "tunnel" | "classroom";
type Item = "grass" | "sword" | "fern" | "arch" | "chest" | "diver" | "snail";
type Tool = "none" | "jug" | "net" | "food" | "dial" | "item";
type Kind = TankFishKind;

export const PLANTS: readonly Item[] = ["grass", "sword", "fern"];

interface TankSpec {
    /** Its middle across, and its box in squares; it stands on the table. */
    x: number;
    w: number;
    h: number;
    /** The litres it holds full, and what it holds as the level opens. */
    most: number;
    water: number;
    scale: TankScale;
    marks: number;
    /** A tank, a pet-shop bag the fish came in, or a garden pond. */
    kind: "tank" | "bag" | "pond";
    name: string;
    /** The colour of fish a sorting tank is for, shown on its tag. */
    tone?: FishTone;
    decor?: { item: Item; dx: number }[];
    filter?: boolean;
    /** The heater's dial as the level opens; left out, there is no heater. */
    heater?: number;
    /** The water's degrees as the level opens. */
    temp: number;
    haze?: number;
}

interface FishSpec {
    kind: Kind;
    tone: FishTone;
    tank: number;
    n: number;
}

/** Which fish a request is about: a kind, a colour, or every fish. */
interface FishWhich {
    kind?: Kind;
    tone?: FishTone;
}

export type Goal =
    | { kind: "fill"; tank: number; litres: number; within: number; label: string }
    | { kind: "move"; to: number; n: number; which: FishWhich; label: string }
    | { kind: "sort"; label: string }
    | {
          kind: "feed";
          tank: number;
          which: FishWhich;
          each: number;
          /** Flakes a toss lets go. */
          pinch: number;
          /** Too many flakes ends the round; on a first level it only clouds the water. */
          strict: boolean;
          label: string;
      }
    | { kind: "plants"; tank: number; plants: number; per: number; label: string }
    | { kind: "heat"; tank: number; degrees: number; label: string }
    | { kind: "healthy"; tanks: number[]; label: string }
    | { kind: "home"; tank: number; least: number; label: string };

export interface AquaLevel extends ActionLevel {
    place: AquaPlace;
    tanks: TankSpec[];
    fish: FishSpec[];
    goals: Goal[];
    /** What lies on the ledge to be placed, and how many of each. */
    tray: { item: Item; n: number }[];
    /** How many fish the net holds at once. */
    net: number;
    /** The litres a tank holds written beside it as it fills, and the dotted flight of a pinch: the early levels' help. */
    readout: boolean;
    preview: boolean;
    /** The arrow to the next thing shows at once, rather than after a wait. */
    guided: boolean;
    /** The pour and the scoop slow as the water nears a fill's line: the first levels' help. */
    ease: boolean;
    /** The line said as the level opens. */
    prompt: string;
}

export interface Fish {
    key: string;
    kind: Kind;
    tone: FishTone;
    /** The tank it is in, or -1 while it is in the net. */
    tank: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    eaten: number;
    /** Seconds left of a scatter from a tap on the glass, and where it was tapped, to come back to curious. */
    scared: number;
    knock: Pt | null;
    happy: boolean;
    /** Seconds since it was caught or let go, for its wriggle and its dive. */
    since: number;
}

interface Tank extends TankSpec {
    litres: number;
    q: Quality;
    temp: number;
    dial: number | null;
    on: boolean | null;
    placed: { item: Item; x: number; key: string }[];
    ripples: { x: number; age: number; size: number }[];
    /** Flakes that have gone into it, for a request that counts them. */
    fed: number;
    spilt: number;
}

interface Flake {
    key: string;
    tank: number;
    x: number;
    y: number;
    /** Seconds it has lain on the gravel. */
    rest: number;
}

interface Pinch {
    x: number;
    y: number;
    vx: number;
    vy: number;
    n: number;
}

/** A finger on the field: where it came down and what it is doing. */
interface Finger {
    down: Pt;
    at: Pt;
    mode: "jug" | "net" | "pull" | "place" | "dial" | "none";
    n: number;
    /** Whether the tool was in hand before this press, so a tap on it puts it back. */
    had: boolean;
}

export interface AquaState {
    L: AquaLevel;
    phase: number;
    tanks: Tank[];
    fish: Fish[];
    flakes: Flake[];
    pinches: Pinch[];
    drops: Liquid;
    /** The litres each falling drop carries. */
    carry: number[];
    hand: Pt;
    tool: Tool;
    item: Item | null;
    tray: { item: Item; n: number }[];
    /** The net's smoothed speed, the fish in it, the tank they came from, and whether it has been lifted out since. */
    net: {
        speed: number;
        fish: string[];
        from: number;
        was: Pt;
        out: boolean;
        moved: number;
        dipped: boolean;
    };
    /**
     * The jug's tilt, from nought (level) to one; the tilt a finger asks for by how far it lowers the
     * jug, or null while the keys tip it the longer they hold; and how hard it scoops, nought to one.
     */
    jug: { tilt: number; pouring: boolean; want: number | null; scoop: number };
    aim: Aim;
    finger: Finger | null;
    /** Steps the arrows have been held, which speeds the hand up the longer they are. */
    run: number;
    /** Whether the arrows moved the hand last, rather than a finger, so its cursor shows. */
    keyed: boolean;
    /** The step a request was last done, for Charlie and Pip's cheer. */
    cheerAt: number;
    doneCount: number;
    /** Steps the dial's arrow or finger has been held, for its repeat. */
    turning: number;
    steps: number;
    end: "won" | "overfed" | null;
    since: number;
    note: string;
    noteAt: number;
    /** The step the hands last did something, for the guide's wait. */
    busyAt: number;
    used: boolean;
    flakeId: number;
    placedId: number;
}

const RATE = 60;
const DT = 1 / RATE;
const VIEW = { w: 32, h: 20 };
/** The table top every tank stands on; the cabinet under it reaches the floor. */
export const TABLE = 15.5;
const FLOOR = 18.5;
const GRAVEL = 0.75;
/** Where the tools rest on the left ledge, and the tray of things to place on the right one. */
const LEDGE = { y: 5.4, tools: 1.4, tray: 21.6 };
const SPOT_REACH = 1.4;
/** Squares above a tank's rim the jug is carried level, and how much lower it has tipped all the way. */
const CARRY = 3;
const TIP = 2.5;
/** The least an eased pour or scoop slows to, at the line and past it. */
const EASE_LEAST = 0.15;
const ROOM = 23;

const AQUA = {
    pour: knob(
        1.8,
        0.8,
        3,
        0.1,
        "litres/s",
        "A full tilt fills ten litres in about six seconds: quick enough not to bore, slow enough to stop on a line.",
    ),
    trickle: knob(
        0.3,
        0.1,
        0.8,
        0.05,
        "litres/s",
        "The first moment of a pour is a trickle, so a short press tops a tank up by a little.",
    ),
    tip: knob(
        1.1,
        0.4,
        3,
        0.1,
        "s",
        "How long the jug takes to tip from a trickle to a full pour.",
    ),
    calm: knob(
        3.4,
        1.5,
        6,
        0.1,
        "squares/s",
        "A net slower than this goes unnoticed: a finger's steady sweep, or the keys' first moments.",
    ),
    splashy: knob(
        9,
        5,
        16,
        0.5,
        "squares/s",
        "A net this fast startles every fish near it, so a flick through the water catches nothing.",
    ),
    swim: knob(
        1.4,
        0.6,
        3,
        0.1,
        "squares/s",
        "A happy fish's cruising pace; a droopy one goes at half of it.",
    ),
    sink: knob(
        0.55,
        0.2,
        1.5,
        0.05,
        "squares/s",
        "Flakes drift down slowly enough that the fish reach them before the gravel.",
    ),
    scoop: knob(
        1.4,
        0.5,
        3,
        0.1,
        "litres/s",
        "The jug held deep in the water takes this much out: a tank a litre too full is put right in a second or two.",
    ),
    keys: knob(
        2.6,
        1,
        4,
        0.1,
        "squares/s",
        "The hand's first pace on the arrows, under the net's calm, so short presses sweep smoothly.",
    ),
};

const NET: NetFeel = { r: 0.95, calm: 3.4, splashy: 9, notice: 2.6, dart: 7, follow: 0.2 };
const netFeel = (): NetFeel => ({ ...NET, calm: AQUA.calm.value, splashy: AQUA.splashy.value });

const SHOAL: ShoalFeel = {
    reach: 6,
    apart: 0.9,
    cruise: 1.4,
    most: 6,
    turn: 7,
    margin: 1,
    weights: { apart: 1.6, together: 0.5, along: 0.5, wall: 1.6, wander: 0.8 },
};

/** A pinch tossed from the tub: up and over into a tank. */
export const FOOD: AimSpec = {
    min: 3,
    max: 15,
    per: 3.2,
    dead: 0.5,
    lo: -Math.PI + 0.1,
    hi: -0.1,
    turn: 1.3,
    ramp: 7,
    turns: "up",
};
const PINCH_G = 16;

/** What each kind needs and how it behaves: the litres it needs, its degrees, how shy it is of a net. */
const KINDS: Record<
    Kind,
    {
        litres: number;
        warm: [number, number];
        shy: number;
        pace: number;
        chases: Kind[];
        /** How near another fish it comes, in squares: about its own length. */
        apart: number;
    }
> = {
    neon: { litres: 2, warm: [24, 27], shy: 1.2, pace: 1.1, chases: [], apart: 1 },
    goldfish: { litres: 3, warm: [16, 24], shy: 0.9, pace: 0.8, chases: [], apart: 1.9 },
    angelfish: {
        litres: 4,
        warm: [24, 28],
        shy: 1,
        pace: 0.9,
        chases: ["neon", "guppy"],
        apart: 2,
    },
    guppy: { litres: 2, warm: [22, 28], shy: 1, pace: 1, chases: [], apart: 1.1 },
    catfish: { litres: 3, warm: [20, 27], shy: 0.8, pace: 0.6, chases: [], apart: 1.6 },
};

const KIND_WORD: Record<Kind, [string, string]> = {
    neon: ["neon", "neons"],
    goldfish: ["goldfish", "goldfish"],
    angelfish: ["angelfish", "angelfish"],
    guppy: ["guppy", "guppies"],
    catfish: ["catfish", "catfish"],
};
const TONE_WORD: Record<FishTone, string> = {
    sky: "blue",
    mint: "green",
    berry: "pink",
    tang: "orange",
    glow: "yellow",
};
const ITEM_WORD: Record<Item, string> = {
    grass: "tall grass",
    sword: "sword plant",
    fern: "fern",
    arch: "rock arch",
    chest: "treasure chest",
    diver: "diver",
    snail: "snail",
};

const tank = (o: Partial<TankSpec> & Pick<TankSpec, "x" | "w" | "h" | "most">): TankSpec => ({
    water: o.most,
    scale: "none",
    marks: 0,
    kind: "tank",
    name: "the tank",
    temp: ROOM,
    ...o,
});

const bag = (x: number): TankSpec => ({
    x,
    w: 3,
    h: 4,
    most: 1,
    water: 1,
    scale: "none",
    marks: 0,
    kind: "bag",
    name: "the bag",
    temp: ROOM,
});

/** Each level, built for one of its variations. */
const MAKERS: ((v: number) => Omit<AquaLevel, "ease">)[] = [
    (v) => {
        const [litres, tone] = (
            [
                [6, "tang"],
                [5, "berry"],
                [7, "sky"],
                [4, "glow"],
            ] as const
        )[v % 4] ?? [6, "tang"];
        return {
            title: "Charlie's first fish",
            grades: [1, 2],
            goal: `Fill the tank to ${litres} litres, net the guppy from its bag into the tank, and feed it 2 flakes.`,
            place: "bedroom",
            tanks: [
                tank({
                    x: 15,
                    w: 12,
                    h: 8,
                    most: 10,
                    water: 0,
                    scale: "litres",
                    marks: 10,
                    name: "Charlie's tank",
                    decor: [
                        { item: "grass", dx: -4 },
                        { item: "sword", dx: 3.6 },
                    ],
                }),
                bag(25.5),
            ],
            fish: [{ kind: "guppy", tone, tank: 1, n: 1 }],
            goals: [
                { kind: "fill", tank: 0, litres, within: 0.5, label: `Fill to ${litres} L` },
                { kind: "move", to: 0, n: 1, which: { kind: "guppy" }, label: "Net the guppy in" },
                {
                    kind: "feed",
                    tank: 0,
                    which: { kind: "guppy" },
                    each: 2,
                    pinch: 1,
                    strict: false,
                    label: "Feed it 2 flakes",
                },
            ],
            tray: [],
            net: 1,
            readout: true,
            preview: true,
            guided: true,
            prompt: "Drag the jug over the tank and lower it to pour. Stop at the line!",
        };
    },
    (v) => {
        const [most, each] = (
            [
                [12, 2],
                [12, 3],
                [10, 2],
                [16, 4],
            ] as const
        )[v % 4] ?? [12, 2];
        const n = most / each;
        return {
            title: "Neons for a customer",
            grades: [2, 3],
            goal: `A customer's tank holds ${most} litres, and each neon needs ${each} litres. Net that many neons into it.`,
            place: "petshop",
            tanks: [
                tank({
                    x: 10,
                    w: 12,
                    h: 9,
                    most: 30,
                    name: "the shop tank",
                    temp: 25,
                    decor: [
                        { item: "sword", dx: -3.5 },
                        { item: "grass", dx: 3 },
                    ],
                }),
                tank({
                    x: 23.5,
                    w: 9,
                    h: 7,
                    most,
                    scale: "litres",
                    marks: most,
                    name: "the customer's tank",
                    temp: 25,
                    decor: [
                        { item: "grass", dx: -2 },
                        { item: "fern", dx: 2.2 },
                    ],
                }),
            ],
            fish: [{ kind: "neon", tone: "sky", tank: 0, n: n + 3 }],
            goals: [
                {
                    kind: "move",
                    to: 1,
                    n,
                    which: { kind: "neon" },
                    label: `${most} L, ${each} L a neon`,
                },
            ],
            tray: [],
            net: 2,
            readout: false,
            preview: false,
            guided: true,
            prompt: "Sweep the net slowly through the shoal. Too fast and they dart away!",
        };
    },
    (v) => {
        const [most, marks, k] = (
            [
                [8, 4, 3],
                [10, 4, 2],
                [9, 3, 2],
                [12, 4, 1],
            ] as const
        )[v % 4] ?? [8, 4, 3];
        const frac = markWords(k, marks, "fraction", most);
        return {
            title: "Three quarters full",
            grades: [2, 3],
            goal: `Fill the class tank to ${frac} of the way up, then net the three guppies into it.`,
            place: "classroom",
            tanks: [
                tank({
                    x: 13,
                    w: 12,
                    h: 9,
                    most,
                    water: 0,
                    scale: "fraction",
                    marks,
                    name: "the class tank",
                    decor: [
                        { item: "fern", dx: -4 },
                        { item: "sword", dx: 3.5 },
                    ],
                }),
                bag(25),
            ],
            fish: [
                { kind: "guppy", tone: "berry", tank: 1, n: 1 },
                { kind: "guppy", tone: "glow", tank: 1, n: 1 },
                { kind: "guppy", tone: "mint", tank: 1, n: 1 },
            ],
            goals: [
                {
                    kind: "fill",
                    tank: 0,
                    litres: (most * k) / marks,
                    within: 0.3,
                    label: `Fill to ${frac}`,
                },
                { kind: "move", to: 0, n: 3, which: {}, label: "Net the 3 guppies in" },
            ],
            tray: [],
            net: 2,
            readout: false,
            preview: false,
            guided: false,
            prompt: "The marks are fractions of the whole tank. Pour to the right one.",
        };
    },
    (v) => {
        const [n, each, pinch] = (
            [
                [4, 3, 2],
                [3, 4, 3],
                [6, 2, 3],
                [5, 2, 2],
            ] as const
        )[v % 4] ?? [4, 3, 2];
        return {
            title: "Feeding time",
            grades: [2, 3],
            goal: `Feed ${n} goldfish ${each} flakes each. A pinch is ${pinch} flakes, so how many pinches?`,
            place: "bedroom",
            tanks: [
                tank({
                    x: 16,
                    w: 14,
                    h: 9,
                    most: 24,
                    name: "Charlie's big tank",
                    decor: [
                        { item: "grass", dx: -5 },
                        { item: "arch", dx: 0 },
                        { item: "sword", dx: 4.5 },
                    ],
                }),
            ],
            fish: [{ kind: "goldfish", tone: "tang", tank: 0, n }],
            goals: [
                {
                    kind: "feed",
                    tank: 0,
                    which: { kind: "goldfish" },
                    each,
                    pinch,
                    strict: true,
                    label: `${n} fish, ${each} flakes each`,
                },
            ],
            tray: [],
            net: 1,
            readout: false,
            preview: true,
            guided: true,
            prompt: "Pull back from the tub and let go to toss a pinch. Count the flakes!",
        };
    },
    (v) => {
        const each = [4, 5, 3, 4][v % 4] ?? 4;
        const tones: FishTone[] = v % 2 ? ["glow", "berry", "sky"] : ["berry", "sky", "glow"];
        return {
            title: "Sort by colour",
            grades: [1, 2],
            goal: `Sort the ${each * 3} guppies into the three tanks by colour, one colour to a tank.`,
            place: "petshop",
            tanks: [
                tank({
                    x: 8.5,
                    w: 11,
                    h: 9,
                    most: 30,
                    name: "the mixed tank",
                    temp: 25,
                    decor: [
                        { item: "grass", dx: -3 },
                        { item: "fern", dx: 3 },
                    ],
                }),
                ...tones.map((tone, i) =>
                    tank({
                        x: 17.2 + i * 5.1,
                        w: 4.6,
                        h: 6,
                        most: 8,
                        name: `the ${TONE_WORD[tone]} tank`,
                        tone,
                        temp: 25,
                        decor: [{ item: "fern", dx: 0.8 }],
                    }),
                ),
            ],
            fish: [
                { kind: "guppy", tone: "berry", tank: 0, n: each },
                { kind: "guppy", tone: "sky", tank: 0, n: each },
                { kind: "guppy", tone: "glow", tank: 0, n: each },
            ],
            goals: [{ kind: "sort", label: "One colour to a tank" }],
            tray: [],
            net: 3,
            readout: false,
            preview: false,
            guided: false,
            prompt: "The tag on each tank says which colour goes in it.",
        };
    },
    (v) => {
        const n = [8, 4, 12, 8][v % 4] ?? 8;
        const plants = Math.ceil((n * 2) / 4);
        return {
            title: "A balanced pond",
            grades: [2, 3],
            goal: `A balanced pond has at least 2 plants for every 4 fish. There are ${n} goldfish: plant enough.`,
            place: "pond",
            tanks: [
                tank({
                    x: 16,
                    w: 22,
                    h: 7,
                    most: 60,
                    kind: "pond",
                    name: "the pond",
                    temp: 20,
                    decor: [{ item: "arch", dx: -6 }],
                }),
            ],
            fish: [
                { kind: "goldfish", tone: v % 2 ? "glow" : "tang", tank: 0, n: n - 1 },
                { kind: "catfish", tone: "tang", tank: 0, n: 1 },
            ],
            goals: [
                { kind: "plants", tank: 0, plants: 2, per: 4, label: `${plants} plants or more` },
                { kind: "healthy", tanks: [0], label: "Oxygen up" },
            ],
            tray: [
                { item: "grass", n: 3 },
                { item: "sword", n: 2 },
                { item: "fern", n: 2 },
            ],
            net: 1,
            readout: false,
            preview: false,
            guided: false,
            prompt: "Plants breathe out oxygen. Watch the meter rise as you plant.",
        };
    },
    (v) => {
        const degrees = [26, 25, 27, 24][v % 4] ?? 26;
        return {
            title: "Warm water",
            grades: [2, 4],
            goal: `The neons are tropical fish and the tunnel is cold. Set the heater to ${degrees} degrees.`,
            place: "tunnel",
            tanks: [
                tank({
                    x: 16,
                    w: 20,
                    h: 9,
                    most: 40,
                    name: "the big tank",
                    temp: 20,
                    heater: 20,
                    decor: [
                        { item: "grass", dx: -6 },
                        { item: "chest", dx: -1 },
                        { item: "sword", dx: 5 },
                        { item: "diver", dx: 8 },
                    ],
                }),
            ],
            fish: [
                { kind: "neon", tone: "sky", tank: 0, n: 7 },
                { kind: "catfish", tone: "glow", tank: 0, n: 1 },
            ],
            goals: [{ kind: "heat", tank: 0, degrees, label: `${degrees} degrees` }],
            tray: [],
            net: 1,
            readout: false,
            preview: false,
            guided: true,
            prompt: "Turn the dial: plus for warmer, minus for cooler. The water warms slowly.",
        };
    },
    (v) => {
        const n = [5, 4, 6, 3][v % 4] ?? 5;
        return {
            title: "Some fish chase",
            grades: [2, 4],
            goal: `The angelfish chase the neons. Move all ${n} neons into the planted tank.`,
            place: "tunnel",
            tanks: [
                tank({
                    x: 10,
                    w: 13,
                    h: 9,
                    most: 30,
                    name: "the angelfish tank",
                    temp: 26,
                    decor: [
                        { item: "sword", dx: -4 },
                        { item: "arch", dx: 0.5 },
                        { item: "grass", dx: 4 },
                    ],
                }),
                tank({
                    x: 24,
                    w: 10,
                    h: 8,
                    most: 20,
                    name: "the planted tank",
                    temp: 26,
                    decor: [
                        { item: "grass", dx: -3 },
                        { item: "fern", dx: 0 },
                        { item: "grass", dx: 3 },
                    ],
                }),
            ],
            fish: [
                { kind: "angelfish", tone: "glow", tank: 0, n: 2 },
                { kind: "neon", tone: "sky", tank: 0, n },
            ],
            goals: [
                {
                    kind: "move",
                    to: 1,
                    n,
                    which: { kind: "neon" },
                    label: `All ${n} neons across`,
                },
                { kind: "healthy", tanks: [0, 1], label: "Every fish happy" },
            ],
            tray: [],
            net: 2,
            readout: false,
            preview: false,
            guided: false,
            prompt: "Neons are small and quick. Sweep slowly and they will not notice the net.",
        };
    },
    (v) => {
        const n = [8, 7, 8, 9][v % 4] ?? 8;
        return {
            title: "Keep it healthy",
            grades: [3, 4],
            goal: `The class tank holds 12 litres and each guppy needs 2. Make both tanks healthy: oxygen and clean.`,
            place: "classroom",
            tanks: [
                tank({
                    x: 10,
                    w: 12,
                    h: 9,
                    most: 12,
                    scale: "litres",
                    marks: 12,
                    name: "the class tank",
                    filter: false,
                    haze: 3,
                    decor: [{ item: "fern", dx: -3 }],
                }),
                tank({
                    x: 24,
                    w: 9,
                    h: 7,
                    most: 8,
                    scale: "litres",
                    marks: 8,
                    name: "the spare tank",
                }),
            ],
            fish: [
                { kind: "guppy", tone: "berry", tank: 0, n: Math.ceil(n / 2) },
                { kind: "guppy", tone: "mint", tank: 0, n: Math.floor(n / 2) },
            ],
            goals: [{ kind: "healthy", tanks: [0, 1], label: "Both tanks healthy" }],
            tray: [
                { item: "grass", n: 2 },
                { item: "sword", n: 1 },
                { item: "snail", n: 1 },
            ],
            net: 2,
            readout: false,
            preview: false,
            guided: false,
            prompt: "Too many fish crowd the water. The filter, plants and a snail help too.",
        };
    },
    () => ({
        title: "Charlie's own tank",
        grades: [1, 4],
        goal: "Make your own tank: fill it, plant it, put the guppies in and keep it healthy. It stays for next time.",
        place: "bedroom",
        tanks: [
            tank({
                x: 15,
                w: 14,
                h: 9,
                most: 16,
                water: 0,
                scale: "litres",
                marks: 8,
                name: "your tank",
                filter: false,
                heater: 24,
                temp: 24,
            }),
            bag(26),
        ],
        fish: [
            { kind: "guppy", tone: "berry", tank: 1, n: 2 },
            { kind: "guppy", tone: "sky", tank: 1, n: 2 },
        ],
        goals: [
            { kind: "fill", tank: 0, litres: 14, within: 2, label: "Fill it up" },
            { kind: "home", tank: 0, least: 4, label: "Fish in and happy" },
        ],
        tray: [
            { item: "grass", n: 2 },
            { item: "sword", n: 2 },
            { item: "fern", n: 2 },
            { item: "arch", n: 1 },
            { item: "chest", n: 1 },
            { item: "diver", n: 1 },
            { item: "snail", n: 1 },
        ],
        net: 2,
        readout: true,
        preview: true,
        guided: false,
        prompt: "This tank is yours. Fill it, plant it and bring the guppies home.",
    }),
];

/** The levels whose pour slows near the line. */
const EASED = 3;

/** The variations every level has. */
export const AQUA_VARIANTS = 4;
/** The level whose tank is the child's own, kept between visits. */
export const FREE = MAKERS.length - 1;

export function levelOf(phase: number, variant: number): AquaLevel {
    const make = MAKERS[phase] ?? MAKERS[0];
    if (!make) throw new Error("No aquarium levels");
    return { ...make(variant), ease: phase < EASED };
}

const first = levelOf(0, 0);
export const AQUA_LEVELS: Levels<AquaLevel> = [
    first,
    ...MAKERS.slice(1).map((_, i) => levelOf(i + 1, 0)),
];

/** The water inside a tank's glass, in squares. */
export function innerOf(t: TankSpec): { x0: number; x1: number; top: number; bottom: number } {
    if (t.kind === "bag")
        return { x0: t.x - 1.1, x1: t.x + 1.1, top: TABLE - t.h + 1.2, bottom: TABLE - 0.3 };
    return {
        x0: t.x - t.w / 2 + TANK_EDGE.side,
        x1: t.x + t.w / 2 - TANK_EDGE.side,
        top: TABLE - t.h + TANK_EDGE.top,
        bottom: TABLE - TANK_EDGE.base,
    };
}

/** Where a tank's water stands, in squares down from the top. */
export function surfaceOf(t: Tank): number {
    const k = innerOf(t);
    return k.bottom - (k.bottom - k.top) * Math.max(0, Math.min(1, t.litres / t.most));
}

/** Where across the gravel a thing may stand: clear of the glass, and of a scale's numbers so they stay readable. */
function gravelX(t: TankSpec, x: number): number {
    const k = innerOf(t);
    return Math.max(k.x0 + (t.scale === "none" ? 0.9 : 2.6), Math.min(k.x1 - 0.9, x));
}

/** Where the gravel's top is: what a placed thing stands on and a flake comes to rest on. */
const floorOf = (t: TankSpec): number => innerOf(t).bottom - (t.kind === "bag" ? 0.1 : GRAVEL);

/** The water a fish may swim in: inside the glass, under the surface and over the gravel. */
function boundsOf(t: Tank): Bounds {
    const k = innerOf(t),
        top = surfaceOf(t) + 0.45,
        bottom = floorOf(t) - 0.35;
    const pad = t.kind === "bag" ? 0.35 : 0.7;
    return { x0: k.x0 + pad, x1: k.x1 - pad, y0: Math.min(top, bottom), y1: bottom };
}

/** The tank whose water `p` is in, or -1. */
export function waterAt(s: AquaState, p: Pt): number {
    return s.tanks.findIndex((t) => {
        const k = innerOf(t);
        return (
            t.litres > 0.05 &&
            p.x > k.x0 &&
            p.x < k.x1 &&
            p.y > surfaceOf(t) + 0.1 &&
            p.y < k.bottom
        );
    });
}

/** The tank `p` is over or in, between its glass and from its rim down, or -1. */
function tankAt(s: AquaState, p: Pt, bags = false): number {
    return s.tanks.findIndex((t) => {
        const k = innerOf(t);
        return (
            (bags || t.kind !== "bag") &&
            p.x > k.x0 &&
            p.x < k.x1 &&
            p.y < k.bottom &&
            p.y > k.top - 6
        );
    });
}

/** Where each tool rests on the ledge. */
export function spotOf(s: AquaState, tool: "jug" | "net" | "food"): Pt | null {
    const have = toolsOf(s.L);
    const i = have.indexOf(tool);
    return i < 0 ? null : { x: LEDGE.tools + 0.9 + i * 2.3, y: LEDGE.y - 1.3 };
}

/** The tools a level puts on the ledge, in their order there. */
function toolsOf(L: AquaLevel): ("jug" | "net" | "food")[] {
    const out: ("jug" | "net" | "food")[] = [];
    if (L.goals.some((g) => g.kind === "fill") || L.place === "bedroom") out.push("jug");
    if (
        L.fish.some((f) => L.tanks[f.tank]?.kind === "bag") ||
        L.goals.some(
            (g) =>
                g.kind === "move" || g.kind === "sort" || g.kind === "healthy" || g.kind === "home",
        )
    )
        out.push("net");
    if (L.goals.some((g) => g.kind === "feed") || L.place === "bedroom") out.push("food");
    return out;
}

/** Where each thing on the tray lies. */
export const traySpot = (i: number): Pt => ({ x: LEDGE.tray + 0.9 + i * 1.45, y: LEDGE.y - 0.9 });

/** Where a tank's heater dial is, on the cabinet under it. */
export function dialOf(s: AquaState, i: number): Pt | null {
    const t = s.tanks[i];
    if (!t || t.dial === null) return null;
    return { x: t.x - t.w / 2 + 2.2, y: TABLE + 1.6 };
}

/** Where a tank's filter hangs on its rim. */
export function filterOf(s: AquaState, i: number): Pt | null {
    const t = s.tanks[i];
    if (!t || t.on === null) return null;
    return { x: innerOf(t).x1 - 0.9, y: innerOf(t).top + 1.1 };
}

/** What lies under `p` that a tap or the big button takes, toggles or turns. */
type Under =
    | { kind: "tool"; tool: "jug" | "net" | "food" }
    | { kind: "tray"; i: number }
    | { kind: "dial"; tank: number; up: boolean }
    | { kind: "filter"; tank: number }
    | { kind: "placed"; tank: number; i: number };

export function underOf(s: AquaState, p: Pt): Under | null {
    for (const tool of ["jug", "net", "food"] as const) {
        const at = spotOf(s, tool);
        if (at && Math.abs(p.x - at.x) < 1.1 && Math.abs(p.y - at.y) < SPOT_REACH)
            return { kind: "tool", tool };
    }
    for (const [i, t] of s.tray.entries()) {
        const at = traySpot(i);
        if (t.n > 0 && Math.abs(p.x - at.x) < 0.72 && Math.abs(p.y - at.y) < 1.2)
            return { kind: "tray", i };
    }
    for (const [i] of s.tanks.entries()) {
        const d = dialOf(s, i);
        if (d && Math.hypot(p.x - d.x, p.y - d.y) < 1.6)
            return { kind: "dial", tank: i, up: p.x >= d.x };
        const f = filterOf(s, i);
        if (f && Math.abs(p.x - f.x) < 1 && Math.abs(p.y - f.y) < 1.3)
            return { kind: "filter", tank: i };
    }
    for (const [ti, t] of s.tanks.entries())
        for (const [i, d] of t.placed.entries()) {
            const h =
                d.item === "grass" ? 4 : d.item === "sword" ? 3.2 : d.item === "snail" ? 0.8 : 2;
            if (d.item === "snail") continue;
            if (Math.abs(p.x - d.x) < 0.9 && p.y < floorOf(t) + 0.3 && p.y > floorOf(t) - h)
                return { kind: "placed", tank: ti, i };
        }
    return null;
}

const matches = (f: Fish, w: FishWhich): boolean =>
    (w.kind === undefined || f.kind === w.kind) && (w.tone === undefined || f.tone === w.tone);

/** A number from nought to one that looks random and is the same every time for the same `n`. */
const hash = (n: number): number => {
    const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return v - Math.floor(v);
};

function startFish(L: AquaLevel, tanks: Tank[]): Fish[] {
    const out: Fish[] = [];
    let n = 0;
    for (const spec of L.fish) {
        const t = tanks[spec.tank];
        if (!t) continue;
        const b = boundsOf(t);
        for (let i = 0; i < spec.n; i++) {
            // scattered over the tank from a hash of their number, so a shoal starts loose and gathers
            const fx = hash(n * 2 + 1),
                fy = hash(n * 2 + 2);
            out.push({
                key: `f${n}`,
                kind: spec.kind,
                tone: spec.tone,
                tank: spec.tank,
                x: b.x0 + (b.x1 - b.x0) * (0.1 + 0.8 * fx),
                y: spec.kind === "catfish" ? b.y1 : b.y0 + (b.y1 - b.y0) * (0.15 + 0.7 * fy),
                vx: n % 2 ? 0.6 : -0.6,
                vy: 0,
                eaten: 0,
                scared: 0,
                knock: null,
                happy: true,
                since: 10,
            });
            n++;
        }
    }
    return out;
}

const lifeOf = (s: AquaState, i: number): TankLife => {
    const t = s.tanks[i];
    if (!t) return { litres: 0, needs: 0, plants: 0, snails: 0, filter: false };
    return {
        litres: t.kind === "bag" ? 4 : t.litres,
        needs: s.fish.filter((f) => f.tank === i).reduce((a, f) => a + KINDS[f.kind].litres, 0),
        plants: t.placed.filter((d) => PLANTS.includes(d.item)).length,
        snails: t.placed.filter((d) => d.item === "snail").length,
        filter: t.on === true,
    };
};

export function startAquarium(L: AquaLevel, phase: number): AquaState {
    const tanks: Tank[] = L.tanks.map((spec, i) => ({
        ...spec,
        litres: spec.water,
        q: { oxygen: 0, clean: 0, haze: spec.haze ?? 0 },
        temp: spec.temp,
        dial: spec.heater ?? null,
        on: spec.filter ?? null,
        placed: (spec.decor ?? []).map((d, j) => ({
            item: d.item,
            x: gravelX(spec, spec.x + d.dx),
            key: `t${i}d${j}`,
        })),
        ripples: [],
        fed: 0,
        spilt: 0,
    }));
    const s: AquaState = {
        L,
        phase,
        tanks,
        fish: startFish(L, tanks),
        flakes: [],
        pinches: [],
        drops: liquid(420),
        carry: [],
        hand: { x: 16, y: 9 },
        tool: "none",
        item: null,
        tray: L.tray.map((t) => ({ ...t })),
        net: {
            speed: 0,
            fish: [],
            from: -1,
            was: { x: 16, y: 9 },
            out: false,
            moved: -100,
            dipped: false,
        },
        jug: { tilt: 0, pouring: false, want: null, scoop: 0 },
        aim: aimAt(-1.05, 7.5),
        finger: null,
        run: 0,
        keyed: false,
        cheerAt: -1000,
        doneCount: 0,
        turning: 0,
        steps: 0,
        end: null,
        since: 0,
        note: L.prompt,
        noteAt: 0,
        busyAt: 0,
        used: false,
        flakeId: 0,
        placedId: 0,
    };
    // each tank's water starts where its life settles it, so a fine tank opens fine
    for (const [i, t] of s.tanks.entries()) {
        const at = settled(lifeOf(s, i), t.q.haze);
        t.q.oxygen = at.oxygen;
        t.q.clean = at.clean;
    }
    for (const f of s.fish) f.happy = happyOf(s, f);
    s.doneCount = stepsOf(s).filter((x) => x.done).length;
    return s;
}

function tell(s: AquaState, text: string): void {
    s.note = text;
    s.noteAt = s.steps;
}

/** Whether a fish is well: its water healthy and warm enough, nothing chasing it, plants for a neon to hide in. */
function happyOf(s: AquaState, f: Fish): boolean {
    if (f.tank < 0) return true;
    const t = s.tanks[f.tank];
    if (!t) return true;
    if (t.kind === "bag") return true;
    const k = KINDS[f.kind];
    if (t.temp < k.warm[0] - 0.4 || t.temp > k.warm[1] + 0.4) return false;
    if (!healthy(t.q)) return false;
    if (s.fish.some((o) => o.tank === f.tank && KINDS[o.kind].chases.includes(f.kind)))
        return false;
    if (f.kind === "neon" && !t.placed.some((d) => PLANTS.includes(d.item))) return false;
    // each fish needs its litres, so a crowded tank's fish droop until some are moved
    if (crowding(lifeOf(s, f.tank)) > 1 + 1e-9) return false;
    return true;
}

/** How many of the fish a feeding request is about, in its tank. */
const fedFish = (s: AquaState, g: Extract<Goal, { kind: "feed" }>): Fish[] =>
    s.fish.filter((f) => f.tank === g.tank && matches(f, g.which));

export function goalDone(s: AquaState, g: Goal): boolean {
    switch (g.kind) {
        case "fill": {
            const t = s.tanks[g.tank];
            return !!t && Math.abs(t.litres - g.litres) <= g.within + 1e-9 && count(s.drops) === 0;
        }
        case "move": {
            const inIt = s.fish.filter((f) => f.tank === g.to && matches(f, g.which)).length;
            return inIt === g.n && s.net.fish.length === 0;
        }
        case "sort": {
            if (s.net.fish.length) return false;
            return s.fish.every((f) => s.tanks[f.tank]?.tone === f.tone);
        }
        case "feed": {
            const fish = fedFish(s, g);
            return fish.length > 0 && fish.every((f) => f.eaten === g.each);
        }
        case "plants": {
            const plants =
                s.tanks[g.tank]?.placed.filter((d) => PLANTS.includes(d.item)).length ?? 0;
            const fish = s.fish.filter((f) => f.tank === g.tank).length;
            return plants * g.per >= fish * g.plants;
        }
        case "heat": {
            const t = s.tanks[g.tank];
            return !!t && t.dial === g.degrees && Math.abs(t.temp - g.degrees) < 0.3;
        }
        case "healthy":
            return (
                s.net.fish.length === 0 &&
                g.tanks.every((i) => {
                    const t = s.tanks[i];
                    return !!t && healthy(t.q) && s.fish.every((f) => f.tank !== i || f.happy);
                })
            );
        case "home": {
            const t = s.tanks[g.tank];
            if (!t || s.net.fish.length) return false;
            const fish = s.fish.filter((f) => f.tank === g.tank);
            return fish.length >= g.least && healthy(t.q) && fish.every((f) => f.happy);
        }
    }
}

/** The level's requests as the step strip shows them, each done or not. */
const stepsOf = (s: AquaState): { label: string; done: boolean }[] =>
    s.L.goals.map((g) => ({ label: g.label, done: goalDone(s, g) }));

/** The litres the fish in a tank need, beside the litres it holds. */
export const needsOf = (s: AquaState, i: number): number => lifeOf(s, i).needs;

const live = (s: AquaState): boolean => s.end === null;

/** Whether the hand holding the jug is below a tank's surface, where the big button scoops instead of pours. */
const dipped = (s: AquaState): boolean => waterAt(s, s.hand) >= 0;

function take(s: AquaState, tool: "jug" | "net" | "food", out: Happening[]): void {
    putDown(s);
    s.tool = tool;
    out.push({ cue: "lift", strength: 0.5 });
    if (tool === "jug")
        tell(
            s,
            "Lower the jug over the tank to pour: the lower, the faster. Hold it in the water to scoop some out.",
        );
    else if (tool === "net")
        tell(s, "Sweep the net slowly through the water. A fast net makes the fish dart off.");
    else tell(s, "Pull back and let go to toss a pinch into the water.");
}

/** Puts what the hand holds back where it lives: a fish in the net goes back to its tank. */
function putDown(s: AquaState): void {
    if (s.tool === "item" && s.item) {
        const slot = s.tray.find((t) => t.item === s.item);
        if (slot) slot.n++;
        else s.tray.push({ item: s.item, n: 1 });
    }
    if (s.tool === "net" && s.net.fish.length) release(s, s.net.from >= 0 ? s.net.from : 0, []);
    s.tool = "none";
    s.item = null;
    stopJug(s);
}

function stopJug(s: AquaState): void {
    s.jug.pouring = false;
    s.jug.want = null;
    s.jug.scoop = 0;
}

function takeItem(s: AquaState, i: number, out: Happening[]): void {
    const slot = s.tray[i];
    if (!slot || slot.n <= 0) return;
    putDown(s);
    slot.n--;
    s.tool = "item";
    s.item = slot.item;
    out.push({ cue: "lift", strength: 0.5 });
    tell(s, `Put the ${ITEM_WORD[slot.item]} on the gravel of a tank.`);
}

function takePlaced(s: AquaState, ti: number, i: number, out: Happening[]): void {
    const t = s.tanks[ti],
        d = t?.placed[i];
    if (!t || !d) return;
    putDown(s);
    t.placed.splice(i, 1);
    s.tool = "item";
    s.item = d.item;
    out.push({ cue: "lift", strength: 0.4 });
    tell(s, `Picked up the ${ITEM_WORD[d.item]}. Put it somewhere else, or back on the shelf.`);
}

function place(s: AquaState, at: Pt, out: Happening[]): void {
    const item = s.item;
    if (s.tool !== "item" || !item) return;
    const ti = tankAt(s, at);
    const t = s.tanks[ti];
    if (!t || t.kind === "bag") {
        putDown(s);
        tell(s, "Put it back on the shelf.");
        return;
    }
    const x = gravelX(t, at.x);
    t.placed.push({ item, x, key: `p${s.placedId++}` });
    s.tool = "none";
    s.item = null;
    out.push(
        { cue: "place" },
        { burst: { kind: "bubble", x, y: floorOf(t) - 0.3, n: 3, dir: -Math.PI / 2 } },
    );
    const plants = t.placed.filter((d) => PLANTS.includes(d.item)).length;
    tell(
        s,
        PLANTS.includes(item)
            ? `${plants} ${plants === 1 ? "plant" : "plants"} in ${t.name}. Plants give the water oxygen.`
            : item === "snail"
              ? "The snail will crawl the glass and keep it clean."
              : `The ${ITEM_WORD[item]} is in ${t.name}.`,
    );
}

function turnDial(s: AquaState, ti: number, by: number, out: Happening[]): void {
    const t = s.tanks[ti];
    if (!t || t.dial === null) return;
    const was = t.dial;
    t.dial = Math.max(18, Math.min(30, t.dial + by));
    if (t.dial === was) return;
    out.push({ cue: "bump", strength: 0.4, pitch: 1 + (t.dial - 24) * 0.03 });
    tell(s, `The heater is set to ${t.dial} degrees. The water is ${Math.round(t.temp)} degrees.`);
}

function toggleFilter(s: AquaState, ti: number, out: Happening[]): void {
    const t = s.tanks[ti];
    if (!t || t.on === null) return;
    t.on = !t.on;
    out.push({ cue: t.on ? "level" : "back", strength: 0.5 });
    tell(
        s,
        t.on ? "The filter is on: it cleans the water and stirs in oxygen." : "The filter is off.",
    );
}

/** Tips the fish out of the net into tank `ti`. */
function release(s: AquaState, ti: number, out: Happening[]): void {
    const t = s.tanks[ti];
    if (!t || !s.net.fish.length) return;
    const b = boundsOf(t);
    for (const [j, key] of s.net.fish.entries()) {
        const f = s.fish.find((o) => o.key === key);
        if (!f) continue;
        f.tank = ti;
        f.x = Math.max(b.x0, Math.min(b.x1, s.hand.x + (j - 1) * 0.4));
        f.y = Math.max(b.y0, Math.min(b.y1, s.hand.y));
        f.vx = (j - 1) * 0.8;
        f.vy = 1.5;
        f.since = 0;
        f.scared = 0;
    }
    const n = s.net.fish.length;
    s.net.fish = [];
    s.net.from = -1;
    s.net.out = false;
    s.net.dipped = true;
    t.ripples.push({ x: s.hand.x, age: 0, size: 0.6 });
    out.push(
        { cue: "splash", strength: 0.5 },
        { burst: { kind: "bubble", x: s.hand.x, y: s.hand.y, n: 4, dir: -Math.PI / 2 } },
    );
    const which = s.fish.filter((f) => f.tank === ti);
    tell(s, `${n === 1 ? "A fish" : `${n} fish`} into ${t.name}: it holds ${which.length} now.`);
}

/** A scoop with the net: the first fish calm enough in its mouth, one a dip. */
function scoopNet(s: AquaState, wide: number, out: Happening[]): void {
    const ti = waterAt(s, s.hand);
    if (ti < 0) return;
    const feel = { ...netFeel(), r: netFeel().r * wide };
    for (const f of s.fish) {
        if (s.net.dipped || s.net.fish.length >= s.L.net) break;
        if (f.tank !== ti) continue;
        if (!catches(f, s.hand, s.net.speed, feel, KINDS[f.kind].shy)) continue;
        if (!s.net.fish.length) s.net.from = ti;
        s.net.fish.push(f.key);
        s.net.dipped = true;
        f.tank = -1;
        f.since = 0;
        out.push({ cue: "lift", strength: 0.6, pitch: 1.2 });
        tell(
            s,
            `Caught a ${KIND_WORD[f.kind][0]}! Lift it out and carry it to the tank it goes in.`,
        );
    }
}

function knock(s: AquaState, at: Pt, out: Happening[]): void {
    const ti = waterAt(s, at);
    if (ti < 0) return;
    for (const f of s.fish)
        if (f.tank === ti && Math.hypot(f.x - at.x, f.y - at.y) < 6) {
            f.scared = 0.8;
            f.knock = { x: at.x, y: at.y };
        }
    out.push({ cue: "bump", strength: 0.6, pitch: 1.4 });
    tell(s, "Tap tap! The fish scatter, then come back to see what it was.");
}

/** A pinch's flight for one step: the toss and its dots take the same step, so the dots land where it does. */
export function flyPinch(p: Pt, v: Pt): { p: Pt; v: Pt } {
    const nv = { x: v.x, y: v.y + PINCH_G * DT };
    return { p: { x: p.x + nv.x * DT, y: p.y + nv.y * DT }, v: nv };
}

/** Where a pinch leaves the tub. */
export const tubMouth = (s: AquaState): Pt => {
    const at = spotOf(s, "food") ?? { x: 3, y: LEDGE.y - 1.3 };
    return { x: at.x, y: at.y - 1.1 };
};

function toss(s: AquaState, v: Pt, out: Happening[]): void {
    const g = s.L.goals.find((x) => x.kind === "feed");
    const n = g?.kind === "feed" ? g.pinch : 2;
    const from = tubMouth(s);
    s.pinches.push({ x: from.x, y: from.y, vx: v.x, vy: v.y, n });
    out.push({ cue: "lift", strength: 0.35, pitch: 1.6 });
}

/** The dots a pinch let go now would fly along, and where it would land: in a tank's water, or not. */
function previewOf(s: AquaState): { pts: Pt[]; tank: number } {
    let p = tubMouth(s),
        v = launchOf(s.aim);
    const pts: Pt[] = [];
    for (let i = 1; i < 240; i++) {
        ({ p, v } = flyPinch(p, v));
        const ti = waterAt(s, { x: p.x, y: p.y + 0.05 });
        if (ti >= 0 && v.y > 0) return { pts, tank: ti };
        if (p.y > TABLE || p.x < 0 || p.x > VIEW.w) return { pts, tank: -1 };
        if (i % 4 === 0) pts.push(p);
    }
    return { pts, tank: -1 };
}

const KEY_FAST = 10;

/** The hand on the arrows: it starts slow and speeds up the longer they are held. */
function moveHand(s: AquaState, pad: Pad): void {
    const held = new Set([...pad.holding, ...pad.pressed]);
    const dx = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0),
        dy = (held.has("down") ? 1 : 0) - (held.has("up") ? 1 : 0);
    if (!dx && !dy) {
        s.run = 0;
        return;
    }
    s.run++;
    const ramp = Math.max(0, Math.min(1, (s.run - 15) / 45));
    const v = AQUA.keys.value + (KEY_FAST - AQUA.keys.value) * ramp;
    const d = Math.hypot(dx, dy);
    s.hand = clampHand({ x: s.hand.x + (dx / d) * v * DT, y: s.hand.y + (dy / d) * v * DT });
    s.busyAt = s.steps;
    s.net.moved = s.steps;
}

const clampHand = (p: Pt): Pt => ({
    x: Math.max(0.5, Math.min(VIEW.w - 0.5, p.x)),
    y: Math.max(1, Math.min(FLOOR - 0.5, p.y)),
});

/** What the big button does now, where the hand is. */
type Act =
    | { kind: "take"; tool: "jug" | "net" | "food" }
    | { kind: "tray"; i: number }
    | { kind: "dial"; tank: number }
    | { kind: "done" }
    | { kind: "filter"; tank: number }
    | { kind: "placed"; tank: number; i: number }
    | { kind: "pour" }
    | { kind: "scoop" }
    | { kind: "net" }
    | { kind: "letgo"; tank: number }
    | { kind: "toss" }
    | { kind: "place"; tank: number }
    | { kind: "putback" }
    | { kind: "knock" }
    | null;

function actOf(s: AquaState): Act {
    if (s.tool === "dial") return { kind: "done" };
    // the arrows aim the food rather than move the hand, so the button always tosses it
    if (s.tool === "food") return { kind: "toss" };
    const u = underOf(s, s.hand);
    const busy = (s.tool === "jug" && s.jug.pouring) || (s.tool === "net" && s.net.fish.length > 0);
    if (u && !busy) {
        if (u.kind === "tool")
            return u.tool === s.tool ? { kind: "putback" } : { kind: "take", tool: u.tool };
        if (u.kind === "tray") return { kind: "tray", i: u.i };
        if (u.kind === "dial") return { kind: "dial", tank: u.tank };
        if (u.kind === "filter") return { kind: "filter", tank: u.tank };
        if (u.kind === "placed" && (s.tool === "none" || s.tool === "item"))
            return { kind: "placed", tank: u.tank, i: u.i };
    }
    switch (s.tool) {
        case "jug":
            return dipped(s)
                ? { kind: "scoop" }
                : tankAt(s, s.hand) >= 0
                  ? { kind: "pour" }
                  : { kind: "putback" };
        case "net": {
            const ti = waterAt(s, s.hand);
            return s.net.fish.length && ti >= 0 ? { kind: "letgo", tank: ti } : { kind: "net" };
        }
        case "item": {
            const ti = tankAt(s, s.hand);
            return ti >= 0 ? { kind: "place", tank: ti } : { kind: "putback" };
        }
        case "none":
            return waterAt(s, s.hand) >= 0 ? { kind: "knock" } : null;
    }
}

function act(s: AquaState, a: Act, out: Happening[]): void {
    if (!a) return;
    s.used = true;
    s.busyAt = s.steps;
    switch (a.kind) {
        case "take":
            take(s, a.tool, out);
            return;
        case "tray":
            takeItem(s, a.i, out);
            return;
        case "dial":
            putDown(s);
            s.tool = "dial";
            out.push({ cue: "lift", strength: 0.4 });
            tell(s, "Up or right for warmer, down or left for cooler. Space when it is set.");
            return;
        case "done":
            s.tool = "none";
            out.push({ cue: "place", strength: 0.4 });
            return;
        case "filter":
            toggleFilter(s, a.tank, out);
            return;
        case "placed":
            takePlaced(s, a.tank, a.i, out);
            return;
        case "net":
            scoopNet(s, 1.3, out);
            return;
        case "letgo":
            release(s, a.tank, out);
            return;
        case "toss":
            toss(s, launchOf(s.aim), out);
            return;
        case "place":
            place(s, s.hand, out);
            return;
        case "putback":
            putDown(s);
            out.push({ cue: "place", strength: 0.4 });
            return;
        case "knock":
            knock(s, s.hand, out);
            return;
        case "pour":
        case "scoop":
            return;
    }
}

const ICON: Record<NonNullable<Act>["kind"], IconName> = {
    take: "grab",
    tray: "seed",
    dial: "settings",
    done: "grab",
    filter: "faster",
    placed: "grab",
    pour: "water",
    scoop: "water",
    net: "hook",
    letgo: "grab",
    toss: "launch",
    place: "seed",
    putback: "grab",
    knock: "grab",
};

function labelOf(s: AquaState, a: Act): string {
    if (!a) return "Action";
    switch (a.kind) {
        case "take":
            return a.tool === "jug"
                ? "Take the jug"
                : a.tool === "net"
                  ? "Take the net"
                  : "Take the food";
        case "tray": {
            const t = s.tray[a.i];
            return t ? `Take the ${ITEM_WORD[t.item]}` : "Take";
        }
        case "dial":
            return "Turn the dial";
        case "done":
            return "Done";
        case "filter":
            return s.tanks[a.tank]?.on ? "Filter off" : "Filter on";
        case "placed":
            return "Pick it up";
        case "pour":
            return "Pour";
        case "scoop":
            return "Scoop out";
        case "net":
            return "Scoop";
        case "letgo":
            return "Let go";
        case "toss":
            return "Toss";
        case "place":
            return s.item && PLANTS.includes(s.item) ? "Plant" : "Place";
        case "putback":
            return "Put back";
        case "knock":
            return "Tap the glass";
    }
}

/** The keys: the arrows move the hand, or aim the food, or turn the dial; the big button does what `actOf` says. */
function keys(s: AquaState, pad: Pad, out: Happening[]): void {
    if (s.tool === "food") {
        const v = stepAim(s.aim, { ...pad, tapped: false, released: null, pull: null }, FOOD, DT);
        if (v) toss(s, v, out);
        if (pad.holding.length || pad.pressed.length) s.busyAt = s.steps;
    } else if (s.tool === "dial") {
        const ti = s.tanks.findIndex((t) => t.dial !== null);
        const up = pad.pressed.filter((d) => d === "up" || d === "right").length,
            down = pad.pressed.filter((d) => d === "down" || d === "left").length;
        if (up || down) turnDial(s, ti, up - down, out);
        const held = pad.holding.length ? pad.holding[pad.holding.length - 1] : null;
        if (held && !pad.pressed.length) {
            s.turning++;
            if (s.turning > 24 && s.turning % 12 === 0)
                turnDial(s, ti, held === "up" || held === "right" ? 1 : -1, out);
        } else s.turning = 0;
    } else moveHand(s, pad);
    if (pad.holding.length || pad.pressed.length) s.keyed = true;
    const a = actOf(s);
    if (pad.tapped && a?.kind !== "pour" && a?.kind !== "scoop") act(s, a, out);
    if (s.tool === "jug") {
        // held, the button tips the jug further the longer it is held, or scoops while it is in the water
        s.jug.want = null;
        s.jug.pouring =
            pad.go &&
            !dipped(s) &&
            tankAt(s, s.hand) >= 0 &&
            (s.jug.pouring || (pad.tapped && a?.kind === "pour"));
        const scooping =
            pad.go && dipped(s) && (s.jug.scoop > 0 || (pad.tapped && a?.kind === "scoop"));
        s.jug.scoop = scooping ? depthOf(s, s.hand) : 0;
    }
    if (s.jug.pouring || s.jug.scoop > 0) s.busyAt = s.steps;
}

/** How hard the jug scoops where it is: a little just under the surface, all it can a square and a half down. */
function depthOf(s: AquaState, p: Pt): number {
    const t = s.tanks[waterAt(s, p)];
    return t ? Math.max(0.25, Math.min(1, (p.y - surfaceOf(t)) / 1.5)) : 0;
}

/** The jug held by a finger: over a tank it tips by how far it is lowered below the carry line, and in the water it scoops. */
function jugAt(s: AquaState, p: Pt): void {
    s.hand = clampHand(p);
    const t = s.tanks[tankAt(s, p)];
    if (t && waterAt(s, p) >= 0) {
        s.jug.want = 0;
        s.jug.pouring = false;
        s.jug.scoop = depthOf(s, p);
        return;
    }
    s.jug.scoop = 0;
    s.jug.want = t ? Math.max(0, Math.min(1, (p.y - (innerOf(t).top - CARRY)) / TIP)) : 0;
    s.jug.pouring = s.jug.want > 0.04;
}

/**
 * A finger on the field: it picks up what it comes down on and carries it, and the tool goes back to
 * the shelf when the finger lifts, so nothing is left lying in a tank.
 */
function hands(s: AquaState, pad: Pad, out: Happening[]): void {
    const p = pad.touch;
    if (p && !s.finger) {
        s.used = true;
        s.busyAt = s.steps;
        s.keyed = false;
        const u = underOf(s, p);
        const f: Finger = { down: { ...p }, at: { ...p }, mode: "none", n: 0, had: false };
        s.finger = f;
        if (u?.kind === "tool") {
            f.had = s.tool === u.tool;
            if (!f.had) take(s, u.tool, out);
            if (u.tool === "food") f.mode = "pull";
            else {
                f.mode = u.tool;
                s.hand = { ...p };
                s.net.was = { ...p };
            }
            if (u.tool === "jug") jugAt(s, p);
        } else if (u?.kind === "tray") {
            takeItem(s, u.i, out);
            f.mode = "place";
            s.hand = { ...p };
        } else if (u?.kind === "dial") {
            if (s.tool === "dial") s.tool = "none";
            turnDial(s, u.tank, u.up ? 1 : -1, out);
            f.mode = "dial";
        } else if (u?.kind === "filter") toggleFilter(s, u.tank, out);
        else if (u?.kind === "placed" && (s.tool === "none" || s.tool === "item")) {
            takePlaced(s, u.tank, u.i, out);
            f.mode = "place";
            s.hand = { ...p };
        } else if (s.tool === "jug") {
            f.mode = "jug";
            jugAt(s, p);
        } else if (s.tool === "net") {
            // the net goes in where the finger comes down, with the splash of a dip and no more
            s.hand = { ...p };
            s.net.was = { ...p };
            s.net.speed = Math.min(s.net.speed, AQUA.calm.value);
            f.mode = "net";
        } else if (s.tool === "food") f.mode = "pull";
        else if (s.tool === "item") {
            s.hand = { ...p };
            f.mode = "place";
        } else if (waterAt(s, p) >= 0) knock(s, p, out);
        return;
    }
    const f = s.finger;
    if (!f) return;
    if (p) {
        f.at = { ...p };
        f.n++;
        s.busyAt = s.steps;
        switch (f.mode) {
            case "jug":
                jugAt(s, p);
                break;
            case "net":
            case "place":
                s.hand = clampHand(p);
                break;
            case "pull": {
                const pull = { x: p.x - f.down.x, y: p.y - f.down.y };
                if (Math.hypot(pull.x, pull.y) >= FOOD.dead)
                    Object.assign(s.aim, aimOfPull(pull, FOOD));
                break;
            }
            case "dial": {
                const u = underOf(s, p);
                if (u?.kind === "dial" && f.n > 24 && f.n % 12 === 0)
                    turnDial(s, u.tank, u.up ? 1 : -1, out);
                break;
            }
            case "none":
                break;
        }
        return;
    }
    const up = pad.lifted ?? f.at;
    s.finger = null;
    switch (f.mode) {
        case "jug":
            putDown(s);
            out.push({ cue: "place", strength: 0.3 });
            break;
        case "net": {
            const ti = waterAt(s, up);
            // a lift lets the fish go in another tank, or in their own once they have been lifted out and dipped back
            if (s.net.fish.length && ti >= 0 && (ti !== s.net.from || s.net.out))
                release(s, ti, out);
            // a net with a fish lifted clear of the water stays where it is, to be carried on with the next press
            if (!s.net.fish.length || ti >= 0) putDown(s);
            else
                tell(s, "Press anywhere to carry the net on, and let go over the tank it goes in.");
            break;
        }
        case "place":
            if (tankAt(s, up) >= 0) place(s, up, out);
            else {
                putDown(s);
                tell(s, "Put it back on the shelf.");
            }
            break;
        case "pull": {
            const pull = { x: up.x - f.down.x, y: up.y - f.down.y };
            s.aim.pulling = false;
            if (Math.hypot(pull.x, pull.y) >= FOOD.dead) {
                Object.assign(s.aim, aimOfPull(pull, FOOD), { pulling: false });
                toss(s, launchOf(s.aim), out);
            } else if (f.had && underOf(s, up)?.kind === "tool") putDown(s);
            else {
                const ti = waterAt(s, up);
                if (ti >= 0) knock(s, up, out);
            }
            break;
        }
        case "dial":
        case "none":
            break;
    }
}

const round1 = (v: number): number => Math.round(v * 10) / 10;

const inFlight = (s: AquaState): number => s.carry.reduce((a, c) => a + c, 0);

/** How much a first level slows the water near its fill's line: not at all far off, to a fine trickle at it and past it. */
function easeOf(s: AquaState, ti: number, filling: boolean): number {
    const t = s.tanks[ti],
        g = s.L.goals.find((x) => x.kind === "fill" && x.tank === ti);
    if (!s.L.ease || !t || g?.kind !== "fill") return 1;
    const now = t.litres + (filling ? inFlight(s) : 0),
        gap = filling ? g.litres - now : now - g.litres;
    return Math.max(EASE_LEAST, Math.min(1, EASE_LEAST + ((1 - EASE_LEAST) * (gap - 0.3)) / 1.5));
}

/** Where the held jug's spout is: at the hand, but never below a tank's rim unless it is scooping. */
function spoutOf(s: AquaState): Pt {
    const t = s.tanks[tankAt(s, s.hand)];
    if (!t || s.jug.scoop > 0) return s.hand;
    return { x: s.hand.x, y: Math.min(s.hand.y, innerOf(t).top - 0.2) };
}

/**
 * The pour: a finger tips the jug as far as it lowers it, and the keys tip it further the longer they
 * hold; it lets go drops that carry their share of the flow. In the water the jug scoops instead.
 */
function pourStep(s: AquaState, out: Happening[]): void {
    const j = s.jug,
        held = s.tool === "jug";
    if (held && j.want !== null) j.tilt += (j.want - j.tilt) * Math.min(1, DT * 12);
    else if (held && j.pouring) j.tilt = Math.min(1, j.tilt + DT / AQUA.tip.value);
    else j.tilt = Math.max(0, j.tilt - DT * 3);
    const into = tankAt(s, s.hand);
    if (held && j.scoop > 0) {
        const ti = waterAt(s, s.hand),
            t = s.tanks[ti];
        if (t && t.kind !== "bag") {
            t.litres = Math.max(
                0,
                t.litres - AQUA.scoop.value * j.scoop * easeOf(s, ti, false) * DT,
            );
            if (s.steps % 6 === 0) t.ripples.push({ x: s.hand.x, age: 0, size: 0.35 });
            if (s.steps % 20 === 0) out.push({ cue: "splash", strength: 0.25, pitch: 0.8 });
            if (s.steps - s.noteAt > 30)
                tell(s, `Scooping out: ${t.name} holds ${round1(t.litres)} litres.`);
        }
    }
    if (j.pouring && held && into >= 0) {
        const ease = easeOf(s, into, true);
        const flow =
            (AQUA.trickle.value + (AQUA.pour.value - AQUA.trickle.value) * j.tilt * j.tilt) * ease;
        const amount = flow * DT,
            n = 1 + Math.floor(j.tilt * ease * 2.5);
        const spout = spoutOf(s);
        for (let i = 0; i < n; i++) {
            const across = n > 1 ? (i / (n - 1) - 0.5) * 0.25 : 0;
            if (
                pour(
                    s.drops,
                    { x: spout.x + across, y: spout.y },
                    { x: 0.6 + j.tilt * 0.8, y: 0.5 },
                )
            )
                s.carry.push(amount / n);
        }
    }
    if (!count(s.drops)) return;
    stepLiquid(s.drops, DT, STREAM);
    const carry: number[] = [];
    let splashed = false;
    drain(s.drops, (d, i) => {
        const c = s.carry[i] ?? 0;
        for (const t of s.tanks) {
            if (t.kind === "bag") continue;
            const k = innerOf(t);
            if (d.x <= k.x0 || d.x >= k.x1 || d.y < surfaceOf(t) - 0.05) continue;
            const room = t.most - t.litres;
            t.litres = Math.min(t.most, t.litres + c);
            if (c > room + 1e-9) {
                t.spilt += c - Math.max(0, room);
                if (!splashed && s.steps % 8 === 0) {
                    splashed = true;
                    out.push({ burst: { kind: "splash", x: k.x1, y: k.top, n: 2, dir: 0.3 } });
                }
                if (s.steps - s.noteAt > 60)
                    tell(
                        s,
                        "Too full! It is spilling over the top. Hold the jug in the water to scoop some out.",
                    );
            }
            if (s.steps % 3 === 0) t.ripples.push({ x: d.x, age: 0, size: 0.25 });
            return true;
        }
        if (d.y >= TABLE - 0.05 || d.x < -1 || d.x > VIEW.w + 1) {
            if (!splashed && s.steps % 10 === 0) {
                splashed = true;
                out.push({ burst: { kind: "splash", x: d.x, y: TABLE, n: 2 } });
            }
            return true;
        }
        carry.push(c);
        return false;
    });
    s.carry = carry;
}

function pinchStep(s: AquaState, out: Happening[]): void {
    const keep: Pinch[] = [];
    for (const p of s.pinches) {
        const next = flyPinch(p, { x: p.vx, y: p.vy });
        Object.assign(p, { x: next.p.x, y: next.p.y, vx: next.v.x, vy: next.v.y });
        const ti = waterAt(s, { x: p.x, y: p.y + 0.05 });
        const t = s.tanks[ti];
        if (t && p.vy > 0) {
            for (let i = 0; i < p.n; i++)
                s.flakes.push({
                    key: `k${s.flakeId++}`,
                    tank: ti,
                    x: p.x + (i - (p.n - 1) / 2) * 0.35,
                    y: surfaceOf(t) + 0.15,
                    rest: 0,
                });
            t.fed += p.n;
            t.ripples.push({ x: p.x, age: 0, size: 0.35 });
            out.push({ cue: "splash", strength: 0.25, pitch: 1.5 });
            tell(s, `A pinch of ${p.n} ${p.n === 1 ? "flake" : "flakes"} in. ${t.fed} so far.`);
            continue;
        }
        if (p.y > TABLE || p.x < -1 || p.x > VIEW.w + 1) {
            out.push({ burst: { kind: "dust", x: p.x, y: Math.min(p.y, TABLE), n: 2 } });
            tell(s, "That pinch missed the water. Pull back further or less far.");
            continue;
        }
        keep.push(p);
    }
    s.pinches = keep;
}

function flakeStep(s: AquaState): void {
    const t0 = s.steps * DT;
    const keep: Flake[] = [];
    for (const [i, f] of s.flakes.entries()) {
        const t = s.tanks[f.tank];
        if (!t) continue;
        const k = innerOf(t),
            floor = floorOf(t) - 0.1;
        if (f.y < floor) {
            f.y = Math.min(floor, f.y + AQUA.sink.value * DT);
            f.x = Math.max(
                k.x0 + 0.3,
                Math.min(k.x1 - 0.3, f.x + 0.35 * Math.sin(t0 * 2.1 + i) * DT),
            );
        } else f.rest += DT;
        const hungry = s.fish.some((o) => o.tank === f.tank && o.eaten < appetite(s, o));
        // a flake nobody will eat goes to waste on the gravel and clouds the water
        if (f.rest > 2.5 && !hungry) {
            t.q.haze += 1;
            continue;
        }
        keep.push(f);
    }
    s.flakes = keep;
}

/** How many flakes a fish wants: what a feeding request asks of it, or two. */
function appetite(s: AquaState, f: Fish): number {
    for (const g of s.L.goals)
        if (g.kind === "feed" && f.tank === g.tank && matches(f, g.which)) return g.each;
    return 2;
}

/** The fish: each tank's shoals, with food to dart to, a net to dart from, a knock, and the chase. */
function fishStep(s: AquaState, out: Happening[]): void {
    const t0 = s.steps * DT,
        feel = netFeel();
    for (const [ti, t] of s.tanks.entries()) {
        const here = s.fish.filter((f) => f.tank === ti);
        if (!here.length) continue;
        const b = boundsOf(t);
        const netIn = s.tool === "net" && waterAt(s, s.hand) === ti;
        const wants = here.map((f, i) => {
            const k = KINDS[f.kind];
            let extra: Pt = { x: 0, y: 0 };
            const add = (v: Pt, w = 1) => {
                extra = { x: extra.x + v.x * w, y: extra.y + v.y * w };
            };
            if (netIn) add(dartFrom(f, s.hand, s.net.speed, feel, k.shy), 1.6);
            if (f.scared > 0 && f.knock) add(flee(f, f.knock, 6, 6), 1.2);
            else if (f.knock) add(arrive(f, f.knock, 1.2, 1.5), 0.8);
            // food: a hungry fish darts to the nearest flake in its tank
            if (f.eaten < appetite(s, f)) {
                let best: Flake | null = null,
                    bd = 9;
                for (const fl of s.flakes) {
                    if (fl.tank !== ti) continue;
                    if (f.kind === "catfish" && fl.y < floorOf(t) - 1.2) continue;
                    const d = Math.hypot(fl.x - f.x, fl.y - f.y);
                    if (d < bd) {
                        bd = d;
                        best = fl;
                    }
                }
                if (best) add(arrive(f, best, 3.6 * k.pace + 0.8, 0.4), 1.4);
            }
            for (const o of here) {
                if (KINDS[o.kind].chases.includes(f.kind)) add(flee(f, o, 3.5, 4), 1);
                if (k.chases.includes(o.kind) && Math.hypot(o.x - f.x, o.y - f.y) < 7)
                    add(arrive(f, o, 2.2, 0.5), 0.7);
            }
            // a catfish keeps to the gravel, and a droopy fish sinks low and slow
            if (f.kind === "catfish") add({ x: 0, y: (b.y1 - f.y) * 2 }, 1);
            if (!f.happy) add({ x: 0, y: (b.y1 - 0.6 - f.y) * 0.6 }, 1);
            const pace = AQUA.swim.value * k.pace * (f.happy ? 1 : 0.45);
            return shoalWant(here, i, b, { ...SHOAL, cruise: pace, apart: k.apart }, t0, extra);
        });
        for (const [i, f] of here.entries()) {
            const pace = AQUA.swim.value * KINDS[f.kind].pace;
            swim(
                f,
                wants[i] ?? { x: 0, y: 0 },
                b,
                { ...SHOAL, cruise: pace, most: f.happy ? 7 : 3 },
                DT,
            );
            f.scared = Math.max(0, f.scared - DT);
            if (!f.scared && f.knock && Math.hypot(f.x - f.knock.x, f.y - f.knock.y) < 1.2)
                f.knock = null;
            f.since += DT;
            // eating: a flake at its mouth is gone
            if (f.eaten < appetite(s, f)) {
                const fi = s.flakes.findIndex(
                    (fl) => fl.tank === ti && Math.hypot(fl.x - f.x, fl.y - f.y) < 0.6,
                );
                if (fi >= 0) {
                    s.flakes.splice(fi, 1);
                    f.eaten++;
                    out.push({ cue: "ring", strength: 0.3, pitch: 1 + f.eaten * 0.12 });
                }
            }
        }
        // a net catches while a hand works it: held by a finger, or moved by the keys a moment ago
        // and it takes one fish a dip, so a child counts them in one at a time
        const working =
            s.finger?.mode === "net" || (s.finger === null && s.steps - s.net.moved < 30);
        if (netIn && working && !s.net.dipped && s.net.fish.length < s.L.net)
            for (const f of here) {
                if (s.net.fish.length >= s.L.net) break;
                // a fish just let go swims off before the net can take it again
                if (f.since < 1.5) continue;
                if (!catches(f, s.hand, s.net.speed, feel, KINDS[f.kind].shy)) continue;
                if (!inMouth(f, s.hand, feel)) continue;
                if (!s.net.fish.length) s.net.from = ti;
                s.net.fish.push(f.key);
                s.net.dipped = true;
                f.tank = -1;
                f.since = 0;
                out.push({ cue: "lift", strength: 0.6, pitch: 1.2 });
                tell(s, `Caught a ${KIND_WORD[f.kind][0]}! Carry it to the tank it goes in.`);
            }
    }
    // the fish in the net ride in it
    for (const [j, key] of s.net.fish.entries()) {
        const f = s.fish.find((o) => o.key === key);
        if (!f) continue;
        f.x = s.hand.x + (j - (s.net.fish.length - 1) / 2) * 0.45;
        f.y = s.hand.y + 0.35;
        f.since += DT;
    }
}

function weather(s: AquaState): void {
    for (const [i, t] of s.tanks.entries()) {
        stepQuality(t.q, lifeOf(s, i), DT);
        // the heater warms the water towards its dial; with it set lower the water cools to the room
        const want = t.dial === null ? t.temp : t.dial;
        if (want > t.temp) t.temp = Math.min(want, t.temp + 0.9 * DT);
        else if (want < t.temp) t.temp = Math.max(want, t.temp - 0.5 * DT);
        for (const r of t.ripples) r.age += DT;
        t.ripples = t.ripples.filter((r) => r.age < 2.2).slice(-8);
    }
    for (const f of s.fish) f.happy = happyOf(s, f);
}

/** Whether too many flakes have gone in for a feeding request that counts them. */
function overfed(
    s: AquaState,
): { g: Extract<Goal, { kind: "feed" }>; want: number; got: number } | null {
    for (const g of s.L.goals) {
        if (g.kind !== "feed" || !g.strict) continue;
        const want = fedFish(s, g).length * g.each,
            got = s.tanks[g.tank]?.fed ?? 0;
        if (got > want) return { g, want, got };
    }
    return null;
}

function stepAquarium(s: AquaState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (!live(s)) {
        s.since++;
        weather(s);
        fishStep(s, out);
        return out;
    }
    if (pad.touch || s.finger) hands(s, pad, out);
    else keys(s, pad, out);
    const was = s.net.was;
    s.net.speed = sweepSpeed(s.net.speed, was, s.hand, DT, netFeel());
    s.net.was = { ...s.hand };
    if (waterAt(s, s.hand) < 0) {
        s.net.dipped = false;
        if (s.tool === "net" && s.net.fish.length) s.net.out = true;
    }
    if (s.tool === "net" && s.net.fish.length && waterAt(s, s.hand) < 0 && s.steps % 9 === 0)
        out.push({ burst: { kind: "splash", x: s.hand.x, y: s.hand.y + 0.8, n: 1 } });
    pourStep(s, out);
    pinchStep(s, out);
    flakeStep(s);
    fishStep(s, out);
    weather(s);
    if (s.steps % 20 === 0)
        for (const [i, t] of s.tanks.entries()) {
            const f = filterOf(s, i);
            if (f && t.on)
                out.push({
                    burst: { kind: "bubble", x: f.x + 0.5, y: f.y + 1.6, n: 1, dir: -Math.PI / 2 },
                });
        }
    const done = stepsOf(s).filter((x) => x.done).length;
    if (done > s.doneCount) {
        s.cheerAt = s.steps;
        out.push({ cue: "ring" });
    }
    s.doneCount = done;
    const too = overfed(s);
    if (too) {
        s.end = "overfed";
        const fish = fedFish(s, too.g).length;
        tell(
            s,
            `Too many flakes: ${fish} ${KIND_WORD[too.g.which.kind ?? "goldfish"][fish === 1 ? 0 : 1]} eat ${too.g.each} each, which is ${too.want}, and ${too.got} went in. Again?`,
        );
        out.push({ cue: "nope" });
        return out;
    }
    if (s.L.goals.every((g) => goalDone(s, g))) {
        s.end = "won";
        s.tool = "none";
        stopJug(s);
        tell(s, wonWords(s));
        out.push(
            { cue: "win" },
            { burst: { kind: "sparkle", x: s.tanks[0]?.x ?? 16, y: 6, n: 12 } },
        );
        return out;
    }
    return out;
}

function wonWords(s: AquaState): string {
    const g = s.L.goals[0];
    if (!g) return "A perfect tank!";
    switch (g.kind) {
        case "fill":
            return s.L.goals.length > 1
                ? "A perfect tank: full to the line, and its fish are home."
                : "Full to the line!";
        case "move": {
            const t = s.tanks[g.to];
            return `${g.n} in ${t?.name ?? "the tank"}, and room for every one. A perfect tank!`;
        }
        case "sort":
            return "Every colour in its own tank. Lovely sorting!";
        case "feed": {
            const n = fedFish(s, g).length;
            return `${n} fish, ${g.each} flakes each: ${n * g.each} flakes, and not one wasted.`;
        }
        case "plants":
            return "Plenty of plants and plenty of oxygen. A balanced pond!";
        case "heat":
            return `${g.degrees} degrees, and the neons are lively again.`;
        case "healthy":
            return "Fresh, clean water with oxygen to spare. Every fish is happy!";
        case "home":
            return "Your own tank, healthy and happy. It will be here next time.";
    }
}

/** The arrow's target: what the step to do needs next, and its name. */
function pointerOf(s: AquaState): { at: Pt; name: string } | null {
    const steps = stepsOf(s),
        g = s.L.goals[currentOf(steps)];
    if (!g) return null;
    const tool = (tl: "jug" | "net" | "food") => {
        const at = spotOf(s, tl);
        return at
            ? { at: { x: at.x, y: at.y - 1.6 }, name: `the ${tl === "food" ? "food" : tl}` }
            : null;
    };
    switch (g.kind) {
        case "fill": {
            if (s.tool !== "jug") return tool("jug");
            const t = s.tanks[g.tank];
            return t ? { at: { x: t.x, y: innerOf(t).top - 1.5 }, name: t.name } : null;
        }
        case "move":
        case "sort":
        case "healthy":
        case "home": {
            if (g.kind === "healthy" || g.kind === "home") {
                const off = s.tanks.findIndex((t) => t.on === false);
                if (off >= 0) {
                    const f = filterOf(s, off);
                    if (f) return { at: f, name: "the filter" };
                }
            }
            if (s.tool !== "net") return tool("net");
            if (s.net.fish.length) {
                const to = g.kind === "move" ? g.to : g.kind === "home" ? g.tank : -1;
                const t = s.tanks[to];
                return t ? { at: { x: t.x, y: surfaceOf(t) + 1 }, name: t.name } : null;
            }
            const f = s.fish.find((o) =>
                g.kind === "move"
                    ? o.tank !== g.to && matches(o, g.which)
                    : g.kind === "sort"
                      ? s.tanks[o.tank]?.tone !== o.tone
                      : g.kind === "home"
                        ? o.tank !== g.tank
                        : false,
            );
            return f ? { at: { x: f.x, y: f.y - 0.6 }, name: `a ${KIND_WORD[f.kind][0]}` } : null;
        }
        case "feed": {
            if (s.tool !== "food") return tool("food");
            const t = s.tanks[g.tank];
            return t ? { at: { x: t.x, y: surfaceOf(t) - 0.5 }, name: t.name } : null;
        }
        case "plants": {
            if (s.tool !== "item") {
                const i = s.tray.findIndex((x) => x.n > 0 && PLANTS.includes(x.item));
                return i >= 0
                    ? { at: { ...traySpot(i), y: traySpot(i).y - 1.4 }, name: "the plants" }
                    : null;
            }
            const t = s.tanks[g.tank];
            return t ? { at: { x: t.x, y: floorOf(t) - 2 }, name: t.name } : null;
        }
        case "heat": {
            const d = dialOf(s, g.tank);
            return d ? { at: { x: d.x, y: d.y - 1.6 }, name: "the dial" } : null;
        }
    }
}

/** The tool the step to do needs next, while it is not in hand, to light on the shelf. */
function nextTool(s: AquaState): "jug" | "net" | "food" | null {
    const g = s.L.goals[currentOf(stepsOf(s))];
    const want =
        g?.kind === "fill"
            ? "jug"
            : g?.kind === "feed"
              ? "food"
              : g?.kind === "move" || g?.kind === "sort" || g?.kind === "home"
                ? "net"
                : null;
    return want && s.tool !== want ? want : null;
}

const GUIDE_WAIT = RATE * 6;

const pointerShows = (s: AquaState): boolean =>
    live(s) && pointing({ always: s.L.guided, idle: s.steps - s.busyAt, after: GUIDE_WAIT });

/** What the line says about the step to do, after a wait with nothing done. */
function speechOf(s: AquaState): string {
    const steps = stepsOf(s),
        g = s.L.goals[currentOf(steps)];
    if (!g) return "";
    switch (g.kind) {
        case "fill": {
            const t = s.tanks[g.tank];
            if (!t) return "";
            if (t.litres > g.litres + g.within)
                return "Too much! Hold the jug down in the water to scoop some out.";
            return s.tool === "jug"
                ? "Lower the jug to pour, and lift it as the water nears the line."
                : "Drag the jug from the shelf over the tank.";
        }
        case "move":
            return s.net.fish.length
                ? "Carry it over and dip it into the other tank."
                : "Sweep slowly, and the net catches them.";
        case "sort":
            return "Look at each tank's tag: one colour goes in each.";
        case "feed":
            return s.tool === "food"
                ? "Pull back and let go. How many pinches make enough?"
                : "Take the food tub from the shelf.";
        case "plants":
            return "Take a plant from the shelf and put it in the pond.";
        case "heat":
            return "Tap the plus side of the dial for warmer.";
        case "healthy":
            return "Look at the meter. What would give more oxygen, or clean the water?";
        case "home":
            return "Bring the fish home and keep the meter green.";
    }
}

function backdrop(s: AquaState, sprites: Sprite[]): void {
    const L = s.L;
    if (L.place === "petshop" || L.place === "tunnel" || L.place === "classroom")
        sprites.push({
            key: "room",
            art: "aquaroom",
            params: { place: L.place },
            x: VIEW.w / 2,
            y: 8,
            z: 0,
            still: true,
            faint: true,
        });
    else if (L.place === "pond") {
        const t = s.tanks[0];
        const k = t ? innerOf(t) : { x0: 5, x1: 27, top: 9, bottom: 15 };
        sprites.push(
            {
                key: "cloud0",
                art: "cloud",
                params: { puffs: 4, rain: 0 },
                x: 6,
                y: 2.5,
                size: 6,
                z: 0,
                still: true,
            },
            {
                key: "cloud1",
                art: "cloud",
                params: { puffs: 3, rain: 0 },
                x: 27,
                y: 3.2,
                size: 5,
                z: 0,
                still: true,
            },
            {
                key: "hedge0",
                art: "hedge",
                params: { clumps: 4, berries: 3, gap: 0 },
                x: 7,
                y: k.top + 0.4,
                size: 12,
                z: 1,
                stand: true,
                still: true,
                seed: 3,
            },
            {
                key: "hedge1",
                art: "hedge",
                params: { clumps: 4, berries: 0, gap: 0 },
                x: 25,
                y: k.top + 0.4,
                size: 12,
                z: 1,
                stand: true,
                still: true,
                seed: 4,
            },
            {
                key: "bank0",
                art: "streambank",
                params: { w: 6, h: 10, edge: "right", cliff: 0 },
                x: k.x0 - 2.6,
                y: k.top + 5,
                size: 6,
                z: 12,
                still: true,
            },
            {
                key: "bank1",
                art: "streambank",
                params: { w: 6, h: 10, edge: "left", cliff: 0 },
                x: k.x1 + 2.6,
                y: k.top + 5,
                size: 6,
                z: 12,
                still: true,
            },
            {
                key: "lawn",
                art: "meadow",
                params: { across: 32, deep: 4, x0: 0, y0: 0, daisies: 2 },
                x: VIEW.w / 2,
                y: k.bottom + 2.2,
                size: 33,
                z: 12,
                still: true,
            },
            {
                key: "reeds0",
                art: "reeds",
                params: { stems: 5, lean: 0.15 },
                x: k.x0 + 0.8,
                y: k.top + 0.6,
                stand: true,
                size: 2.4,
                z: 37,
                still: true,
            },
            {
                key: "reeds1",
                art: "reeds",
                params: { stems: 7, lean: -0.2 },
                x: k.x1 - 0.8,
                y: k.top + 0.6,
                stand: true,
                size: 2.6,
                z: 37,
                still: true,
            },
        );
    } else
        sprites.push(
            ...(s.tray.length
                ? []
                : [
                      {
                          key: "window",
                          art: "toyroom",
                          params: { part: "window", w: 8, h: 6 },
                          x: 25.5,
                          y: 4.6,
                          z: 1,
                          still: true,
                      },
                  ]),
        );
    // the ledges the tools and the things to place rest on
    const tools = toolsOf(L).length;
    if (tools)
        sprites.push({
            key: "ledge",
            art: "toyroom",
            params: { part: "ledge", w: 8, h: 6 },
            x: LEDGE.tools + 0.2 + tools * 1.15,
            y: LEDGE.y + 0.5,
            size: tools * 2.3 + 1.2,
            z: 3,
            still: true,
        });
    if (s.tray.length)
        sprites.push({
            key: "ledge2",
            art: "toyroom",
            params: { part: "ledge", w: 8, h: 6 },
            x: LEDGE.tray + 5,
            y: LEDGE.y + 0.5,
            size: 10.5,
            z: 3,
            still: true,
        });
    // the cabinet along the table, unless the water is a pond in the ground
    if (L.place !== "pond")
        sprites.push({
            key: "stand",
            art: "aquarium",
            params: params("stand", { w: 27 }),
            x: VIEW.w / 2,
            y: TABLE + 1.5,
            z: 10,
            still: true,
            size: 27,
        });
}

const PARAMS = {
    part: "tank",
    w: 2,
    h: 2,
    marks: 0,
    scale: "none",
    most: 10,
    on: false,
    value: 24,
    level: 0.5,
    tone: "sky",
};
const params = (part: string, o: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...PARAMS,
    part,
    ...o,
});

function tankSprites(
    s: AquaState,
    rest: boolean,
    sprites: Sprite[],
    marks: Mark[],
    water: Water[],
    lights: Light[],
): void {
    const t0 = s.steps * DT;
    for (const [i, t] of s.tanks.entries()) {
        const k = innerOf(t),
            top = surfaceOf(t);
        if (t.kind === "bag")
            sprites.push({
                key: `bag${i}`,
                art: "aquarium",
                params: params("bag"),
                x: t.x,
                y: TABLE,
                stand: true,
                z: 31,
            });
        else if (t.kind === "pond")
            sprites.push({
                key: `edge${i}`,
                art: "aquarium",
                params: params("pondedge", { w: Math.round(t.w + 2) }),
                x: t.x,
                y: k.top + 0.2,
                z: 32,
                size: t.w + 2,
            });
        else
            sprites.push({
                key: `tank${i}`,
                art: "aquarium",
                params: params("tank", {
                    w: t.w,
                    h: t.h,
                    marks: t.marks,
                    scale: t.scale,
                    most: t.most,
                }),
                x: t.x,
                y: TABLE,
                stand: true,
                z: 15,
                still: true,
            });
        if (t.kind !== "bag")
            sprites.push({
                key: `gravel${i}`,
                art: "aquarium",
                params: params("gravel", { w: Math.round(k.x1 - k.x0) }),
                x: (k.x0 + k.x1) / 2,
                y: k.bottom,
                stand: true,
                size: k.x1 - k.x0,
                z: 18,
                still: true,
            });
        if (t.litres > 0.02) {
            const cloudy = t.q.haze > 0.6 || t.q.clean < FINE;
            // under the fish and over the plants and the gravel, so a fish's colour reads true through the glass
            water.push({
                x: k.x0,
                w: k.x1 - k.x0,
                level: top,
                bottom: k.bottom,
                waves: rest ? 0 : t.kind === "pond" ? 0.08 : 0.05,
                ripples: rest ? [] : t.ripples,
                z: 23,
                hue: cloudy ? "mint" : "sky",
            });
            if (t.kind !== "bag")
                lights.push({
                    x: t.x,
                    y: top + 1,
                    r: (k.x1 - k.x0) / 2,
                    strength: 0.35,
                    hue: "sky",
                });
        }
        for (const d of t.placed) {
            const sway = rest ? 0 : Math.sin(t0 * 1.3 + d.x) * 0.06;
            if (d.item === "snail") {
                const at = snailAt(t, d.x, t0);
                sprites.push({
                    key: d.key,
                    art: "aquarium",
                    params: params("snail", { on: true }),
                    x: at.x,
                    y: at.y,
                    angle: at.angle,
                    z: 24,
                });
                continue;
            }
            const open =
                d.item === "chest" &&
                !rest &&
                Math.floor(t0 / 4 + d.x) % 2 === 0 &&
                (t0 / 4 + d.x) % 1 < 0.2;
            sprites.push({
                key: d.key,
                art: "aquarium",
                params: params(d.item, { on: open }),
                x: d.x,
                y:
                    floorOf(t) +
                    0.15 -
                    (d.item === "diver" && !rest ? Math.abs(Math.sin(t0 * 1.6)) * 0.2 : 0),
                stand: true,
                z: d.item === "grass" || d.item === "sword" ? 22 : 20,
                angle: PLANTS.includes(d.item) ? sway : 0,
            });
        }
        const heaterAt = t.dial !== null ? { x: k.x0 + 0.7, y: k.top + 0.4 } : null;
        if (heaterAt)
            sprites.push({
                key: `heater${i}`,
                art: "aquarium",
                params: params("heater"),
                x: heaterAt.x,
                y: heaterAt.y + 2.5,
                z: 21,
            });
        const f = filterOf(s, i);
        if (f)
            sprites.push({
                key: `filter${i}`,
                art: "aquarium",
                params: params("filter", { on: t.on === true }),
                x: f.x,
                y: f.y + 0.4,
                z: 33,
                live: true,
            });
        const d = dialOf(s, i);
        if (d && t.dial !== null)
            sprites.push({
                key: `dial${i}`,
                art: "aquarium",
                params: params("dial", { value: t.dial }),
                x: d.x,
                y: d.y,
                z: 34,
                live: true,
                glow: s.tool === "dial" ? 1.6 : undefined,
            });
        if (t.tone)
            sprites.push({
                key: `tag${i}`,
                art: "aquarium",
                params: params("tag", { tone: t.tone }),
                x: t.x,
                y: k.top - 0.9,
                size: 2.4,
                z: 34,
            });
        if (t.dial !== null)
            marks.push({
                kind: "word",
                x: k.x0 + 1.7,
                y: k.top + 1.2,
                text: `${Math.round(t.temp)}°`,
                size: 0.7,
            });
        // the meter on the cabinet, for a level whose request is the water's health
        if (
            s.L.goals.some(
                (g) => g.kind === "healthy" || g.kind === "home" || g.kind === "plants",
            ) &&
            t.kind !== "bag"
        )
            sprites.push({
                key: `meter${i}`,
                art: "aquarium",
                params: params("meter", { value: round2(t.q.oxygen), level: round2(t.q.clean) }),
                x: t.kind === "pond" ? t.x + 7 : t.x + (t.dial === null ? 0 : 2),
                y: t.kind === "pond" ? TABLE + 2.2 : TABLE + 1.6,
                size: 4.6,
                z: 34,
                live: true,
            });
        if (t.kind === "pond") {
            for (const [j, x] of [t.x - 6.5, t.x + 3].entries())
                sprites.push({
                    key: `lily${i}${j}`,
                    art: "aquarium",
                    params: params("lily"),
                    x: x + (rest ? 0 : Math.sin(t0 * 0.4 + j) * 0.3),
                    y: top - 0.1,
                    z: 35,
                });
            for (const [j, x] of [k.x0 - 0.6, k.x1 + 0.6].entries())
                sprites.push({
                    key: `frog${j}`,
                    art: "frog",
                    params: {
                        pose: s.end === "won" && Math.floor(t0 * 2 + j) % 2 === 0 ? "leap" : "sit",
                        facing: j ? -1 : 1,
                    },
                    x,
                    y: k.top + 0.3,
                    stand: true,
                    size: 2.2,
                    z: 36,
                });
        }
    }
}

const round2 = (v: number): number => Math.round(v * 20) / 20;

/** Where a snail is on its slow crawl round the inside of the glass, and which way it faces. */
function snailAt(t: Tank, x0: number, time: number): { x: number; y: number; angle: number } {
    const k = innerOf(t),
        w = k.x1 - k.x0 - 0.8,
        h = Math.max(0.5, floorOf(t) - surfaceOf(t) - 1.2);
    const round = 2 * (w + h),
        d = (((time * 0.25 + (x0 - k.x0)) % round) + round) % round;
    const left = k.x0 + 0.4,
        bottom = floorOf(t) - 0.4;
    if (d < w) return { x: left + d, y: bottom, angle: 0 };
    if (d < w + h) return { x: left + w, y: bottom - (d - w), angle: -Math.PI / 2 };
    if (d < 2 * w + h) return { x: left + w - (d - w - h), y: bottom - h, angle: Math.PI };
    return { x: left, y: bottom - h + (d - 2 * w - h), angle: Math.PI / 2 };
}

function fishSprite(s: AquaState, f: Fish, rest: boolean): Sprite {
    const box = tankFishBox(f.kind);
    const inNet = f.tank < 0;
    const scale =
        f.kind === "goldfish" || f.kind === "angelfish" ? 0.75 : f.kind === "catfish" ? 0.8 : 0.7;
    const wriggle = inNet && !rest ? Math.sin(s.steps * 0.6 + f.x) * 0.35 : 0;
    const tilt =
        rest || inNet
            ? 0
            : Math.max(-0.4, Math.min(0.4, f.vy / Math.max(0.5, Math.abs(f.vx) + 0.5))) *
              (f.vx < 0 ? -1 : 1);
    return {
        key: f.key,
        art: "tankfish",
        params: { kind: f.kind, tone: f.tone, happy: f.happy, facing: f.vx < 0 ? -1 : 1 },
        x: f.x,
        y: f.y,
        size: box.w * scale,
        angle: tilt + wriggle + (inNet ? -0.5 : 0),
        z: inNet && waterAt(s, s.hand) < 0 ? 52 : 26,
        glow:
            f.happy &&
            !inNet &&
            s.L.goals.some((g) => g.kind === "healthy" || g.kind === "heat" || g.kind === "home")
                ? 0.8
                : undefined,
    };
}

/** The tool in the hand, or resting on its ledge. */
function toolSprites(s: AquaState, rest: boolean, sprites: Sprite[], marks: Mark[]): void {
    for (const tool of toolsOf(s.L)) {
        const spot = spotOf(s, tool);
        if (!spot) continue;
        const held = s.tool === tool;
        const at = held && tool !== "food" ? s.hand : spot;
        const glow = live(s) ? (held ? 1.2 : nextTool(s) === tool ? 1.5 : undefined) : undefined;
        if (tool === "jug") {
            const tilt = s.jug.tilt * 1.1 + (s.jug.scoop > 0 ? 0.8 : 0);
            // held, the jug hangs from its spout at the hand, tipping forward as it pours
            const sp = held ? spoutOf(s) : at;
            const c = held
                ? { x: sp.x - 1.1 * Math.cos(tilt) - 0.2, y: sp.y + 0.9 - 1.1 * Math.sin(tilt) }
                : at;
            sprites.push({
                key: "jug",
                art: "aquarium",
                params: params("jug"),
                x: c.x,
                y: c.y,
                size: 2.6,
                angle: held ? tilt : 0,
                z: held ? (s.jug.scoop > 0 ? 27 : 55) : 6,
                glow,
            });
        } else if (tool === "net") {
            const inWater = held && waterAt(s, s.hand) >= 0;
            sprites.push({
                key: "net",
                art: "aquarium",
                params: params("net"),
                x: at.x,
                y: held ? at.y - 2.15 : at.y - 0.3,
                size: held ? 2 : 1.4,
                angle:
                    held && !rest
                        ? Math.max(-0.35, Math.min(0.35, (s.hand.x - s.net.was.x) * 2))
                        : 0,
                z: held ? (inWater ? 27 : 54) : 6,
                glow,
            });
        } else {
            sprites.push({
                key: "tub",
                art: "aquarium",
                params: params("tub"),
                x: spot.x,
                y: spot.y + 0.2,
                size: 1.9,
                z: 6,
                glow,
            });
            if (held) {
                if (s.L.preview) {
                    const pv = previewOf(s);
                    marks.push({
                        kind: "dots",
                        pts: pv.pts,
                        opacity: 0.7,
                        tone: pv.tank >= 0 ? "ok" : undefined,
                    });
                }
                const m = tubMouth(s),
                    v = launchOf(s.aim);
                marks.push({
                    kind: "line",
                    a: m,
                    b: { x: m.x + v.x * 0.18, y: m.y + v.y * 0.18 },
                    style: "aim",
                    head: true,
                });
            }
        }
    }
    if (s.tool === "item" && s.item)
        sprites.push({
            key: "held",
            art: "aquarium",
            params: params(s.item),
            x: s.hand.x,
            y: s.hand.y + 0.5,
            stand: true,
            z: 56,
            alpha: 0.85,
        });
    for (const [i, t] of s.tray.entries()) {
        if (t.n <= 0) continue;
        const at = traySpot(i);
        sprites.push({
            key: `tray${i}`,
            art: "aquarium",
            params: params(t.item),
            x: at.x,
            y: LEDGE.y,
            stand: true,
            size: 1.25,
            z: 6,
        });
        if (t.n > 1)
            marks.push({
                kind: "word",
                x: at.x + 0.5,
                y: LEDGE.y + 0.9,
                text: `×${t.n}`,
                size: 0.55,
            });
    }
}

/** Squares the step strip's words take, per letter, at the size they are written. */
const STRIP_LETTER = 0.21;

function guide(s: AquaState, rest: boolean, sprites: Sprite[], marks: Mark[]): void {
    const steps = stepsOf(s),
        now = currentOf(steps),
        doing = steps[now];
    const label = s.end === "won" || !doing ? "All done!" : `${now + 1} ${doing.label}`;
    const dot = 1.2,
        dots = steps.length * dot,
        words = label.length * STRIP_LETTER,
        across = Math.max(dots, words) + 1.5;
    const cardW = Math.min(36, Math.ceil(across + 2));
    const fx = VIEW.w / 2 + 0.5,
        fy = 1.1;
    sprites.push({
        key: "steps",
        art: "dollchip",
        params: { kind: "card", tone: "sky", on: false, w: cardW, h: 4 },
        x: fx,
        y: fy + 0.8,
        size: cardW,
        fixed: true,
        z: 70,
    });
    let x = fx - dots / 2;
    for (const [i, st] of steps.entries()) {
        if (i === now && s.end !== "won")
            sprites.push({
                key: "steps:now",
                art: "dollchip",
                params: { kind: "ring", tone: "glow", on: true, w: 2, h: 2 },
                x: x + dot / 2,
                y: fy,
                size: 1.1,
                fixed: true,
                z: 71,
            });
        sprites.push({
            key: `steps:tick:${i}`,
            art: "dollchip",
            params: { kind: "tick", tone: "mint", on: st.done, w: 2, h: 2 },
            x: x + dot / 2,
            y: fy,
            size: 0.8,
            fixed: true,
            z: 72,
        });
        x += dot;
    }
    marks.push({ kind: "word", x: fx, y: fy + 1.2, text: label, size: 0.45, fixed: true });
    if (!live(s)) return;
    const to = pointerOf(s);
    if (to && pointerShows(s)) {
        const b = bounce(s.steps, rest);
        marks.push({
            kind: "line",
            a: { x: to.at.x, y: to.at.y - 2.4 - b },
            b: { x: to.at.x, y: to.at.y - 0.6 - b },
            head: true,
        });
    }
}

/** The tank the field keeps in the middle on a narrow phone: the one in play. */
function focusOf(s: AquaState): Pt {
    const ti = s.tool !== "none" ? Math.max(tankAt(s, s.hand), waterAt(s, s.hand)) : -1;
    const t = s.tanks[ti] ?? s.tanks.find((x) => x.kind !== "bag");
    return { x: t ? Math.max(9, Math.min(VIEW.w - 9, t.x)) : VIEW.w / 2, y: VIEW.h / 2 };
}

function frame(s: AquaState, rest = false): Frame {
    const sprites: Sprite[] = [],
        marks: Mark[] = [],
        water: Water[] = [],
        lights: Light[] = [];
    backdrop(s, sprites);
    tankSprites(s, rest, sprites, marks, water, lights);
    for (const f of s.fish) sprites.push(fishSprite(s, f, rest));
    for (const fl of s.flakes)
        sprites.push({
            key: fl.key,
            art: "aquarium",
            params: params("flake"),
            x: fl.x,
            y: fl.y,
            size: 0.45,
            z: 25,
            angle: rest ? 0 : (fl.y * 1.7) % 6.28,
        });
    for (const [i, p] of s.pinches.entries())
        sprites.push({
            key: `pinch${i}`,
            art: "aquarium",
            params: params("flake"),
            x: p.x,
            y: p.y,
            size: 0.6,
            z: 50,
        });
    toolSprites(s, rest, sprites, marks);
    // the line a fill asks for, across the tank's glass, green once the water is on it
    for (const g of s.L.goals) {
        if (g.kind !== "fill") continue;
        const t = s.tanks[g.tank];
        if (!t) continue;
        const k = innerOf(t),
            y = k.bottom - ((k.bottom - k.top) * g.litres) / t.most,
            on = Math.abs(t.litres - g.litres) <= g.within;
        const band = (k.bottom - k.top) / t.most;
        marks.push({
            kind: "box",
            x: k.x0,
            y: y - band * g.within,
            w: k.x1 - k.x0,
            h: band * g.within * 2,
            on,
        });
        marks.push({ kind: "line", a: { x: k.x0 + 1.2, y }, b: { x: k.x1, y }, style: "aim" });
        if (g.label.includes(`${g.litres} L`))
            marks.push({
                kind: "word",
                x: k.x1 + 1.9,
                y: y + 0.2,
                text: `${g.litres} L`,
                size: 0.6,
            });
        marks.push({
            kind: "ring",
            x: k.x1 + 0.6,
            y,
            r: 0.45,
            solid: true,
            tone: on ? "ok" : undefined,
        });
        if (s.L.readout)
            marks.push({
                kind: "word",
                x: k.x1 - 1.6,
                y: k.top + 1,
                text: `${round1(t.litres)} L`,
                size: 0.6,
            });
    }
    if (s.tool === "net" && s.L.guided && live(s) && !s.net.fish.length) {
        const fast = s.net.speed > AQUA.calm.value;
        marks.push({
            kind: "ring",
            x: s.hand.x,
            y: s.hand.y,
            r: NET.r,
            on: !fast,
            tone: fast ? undefined : "ok",
        });
    }
    // the hand's cursor while the keys move it, washed when the Action would take what it is on
    if (s.tool === "none" && s.keyed && live(s))
        marks.push({ kind: "ring", x: s.hand.x, y: s.hand.y, r: 0.7, on: actOf(s) !== null });
    // Charlie and Pip watch from outside the glass, and cheer a perfect tank
    const won = s.end === "won",
        cheer = won || (live(s) && s.steps - s.cheerAt < RATE * 1.5),
        worried = s.fish.some((f) => f.tank >= 0 && !f.happy && s.tanks[f.tank]?.kind !== "bag");
    sprites.push(
        {
            key: "charlie",
            art: "charlie",
            params: {
                pose: cheer
                    ? "cheer"
                    : s.net.fish.length || s.jug.pouring || s.jug.scoop > 0 || s.pinches.length
                      ? "point"
                      : s.tool === "none"
                        ? "stand"
                        : "hold",
                mood: cheer ? "excited" : worried ? "worried" : "happy",
                dir: 1,
                hair: "ponytail",
                top: "sky",
                sleeves: "short",
                print: "star",
                wear: "shorts",
                bottom: "berry",
                pattern: "plain",
                feet: "bare",
                holding: "",
                talking: false,
            },
            x: 2.6,
            y: VIEW.h + 0.2,
            stand: true,
            size: 5,
            z: 60,
            live: true,
        },
        {
            key: "pip",
            art: "pupfamily",
            params: {
                member: "pip",
                pose: cheer ? "cheer" : "stand",
                mood: cheer ? "excited" : worried ? "worried" : "happy",
                dir: -1,
                gear: "none",
            },
            x: VIEW.w - 1.7,
            y: VIEW.h + 0.1,
            stand: true,
            size: 3.8,
            z: 60,
            live: true,
        },
    );
    guide(s, rest, sprites, marks);
    const pool = places(s.drops);
    return {
        sprites,
        marks,
        camera: { x: VIEW.w / 2, y: VIEW.h / 2 },
        view: { ...VIEW },
        world: { ...VIEW },
        focus: focusOf(s),
        time: s.steps * DT,
        water,
        liquid: pool.length ? [{ drops: pool, r: 0.16, hue: "sky", z: 49 }] : [],
        lights,
    };
}

function say(s: AquaState): string {
    const parts: string[] = [];
    for (const [i, t] of s.tanks.entries()) {
        const fish = s.fish.filter((f) => f.tank === i);
        const kinds = new Map<string, number>();
        for (const f of fish) {
            const w = `${TONE_WORD[f.tone]} ${KIND_WORD[f.kind][0]}`;
            kinds.set(w, (kinds.get(w) ?? 0) + 1);
        }
        const list = [...kinds].map(([w, n]) => `${n} ${w}`).join(", ");
        const what =
            t.kind === "bag" ? "The bag" : `${t.name.charAt(0).toUpperCase()}${t.name.slice(1)}`;
        const water = t.kind === "bag" ? "" : ` holds ${round1(t.litres)} of ${t.most} litres,`;
        const health =
            t.kind === "bag"
                ? ""
                : ` oxygen ${Math.round(t.q.oxygen * 100)}, clean ${Math.round(t.q.clean * 100)}.`;
        const warm =
            t.dial !== null ? ` Heater ${t.dial} degrees, water ${Math.round(t.temp)}.` : "";
        const plants = t.placed.length
            ? ` ${t.placed.map((d) => ITEM_WORD[d.item]).join(", ")}.`
            : "";
        parts.push(`${what}${water} with ${list || "no fish"}.${health}${warm}${plants}`);
    }
    const holding =
        s.tool === "none"
            ? "Nothing in hand."
            : s.tool === "item" && s.item
              ? `Holding the ${ITEM_WORD[s.item]}.`
              : s.tool === "net"
                ? `Holding the net${s.net.fish.length ? ` with ${s.net.fish.length} fish in it` : ""}.`
                : `Holding the ${s.tool}.`;
    parts.push(holding);
    const a = actOf(s);
    if (a) parts.push(`The Action: ${labelOf(s, a).toLowerCase()}.`);
    if (live(s)) {
        const steps = stepsOf(s),
            now = currentOf(steps),
            st = steps[now];
        if (st) parts.push(`Step ${now + 1} of ${steps.length}: ${st.label}.`);
    }
    return parts.join(" ");
}

/** What the free tank keeps between visits: its water, what is planted and switched on, and where its fish are. */
interface Design {
    litres: number;
    placed: { item: Item; x: number }[];
    on: boolean;
    dial: number;
    home: number;
}

function readDesign(v: unknown, s: AquaState): Design | null {
    if (typeof v !== "object" || v === null) return null;
    if (!("litres" in v) || !("placed" in v) || !("on" in v) || !("dial" in v) || !("home" in v))
        return null;
    const { litres, placed, on, dial, home } = v;
    const t = s.tanks[0];
    if (!t || typeof litres !== "number" || !(litres >= 0 && litres <= t.most)) return null;
    if (typeof on !== "boolean" || typeof dial !== "number" || typeof home !== "number")
        return null;
    if (!Array.isArray(placed) || placed.length > 12) return null;
    const k = innerOf(t);
    const items: { item: Item; x: number }[] = [];
    const list: unknown[] = placed;
    for (const p of list) {
        if (typeof p !== "object" || p === null || !("item" in p) || !("x" in p)) return null;
        const item = (["grass", "sword", "fern", "arch", "chest", "diver", "snail"] as const).find(
            (x) => x === p.item,
        );
        if (!item || typeof p.x !== "number" || p.x < k.x0 || p.x > k.x1) return null;
        items.push({ item, x: p.x });
    }
    return {
        litres,
        placed: items,
        on,
        dial: Math.max(18, Math.min(30, Math.round(dial))),
        home: Math.max(0, Math.min(s.fish.length, Math.round(home))),
    };
}

const SOUNDS: Kit = {
    lift: [{ wave: "sine", hz: 520, to: 780, attack: 0.005, decay: 0.12, gain: 0.2 }],
    place: [{ wave: "sine", hz: 420, to: 300, attack: 0.005, decay: 0.15, gain: 0.22 }],
    splash: [
        { wave: "noise", hz: 2600, attack: 0.002, decay: 0.12, gain: 0.25 },
        { wave: "sine", hz: 700, to: 1200, attack: 0.002, decay: 0.08, gain: 0.15 },
    ],
    ring: [{ wave: "sine", hz: 990, to: 1320, attack: 0.002, decay: 0.08, gain: 0.16 }],
    bump: [{ wave: "triangle", hz: 300, attack: 0.002, decay: 0.07, gain: 0.25 }],
    nope: [
        { wave: "sine", hz: 440, to: 330, attack: 0.01, decay: 0.2, gain: 0.25 },
        { wave: "sine", hz: 330, to: 260, attack: 0.01, decay: 0.25, gain: 0.25, delay: 0.18 },
    ],
    win: [
        { wave: "triangle", hz: 523, attack: 0.01, decay: 0.2, gain: 0.3 },
        { wave: "triangle", hz: 659, attack: 0.01, decay: 0.2, gain: 0.3, delay: 0.12 },
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.2, gain: 0.3, delay: 0.24 },
        { wave: "sine", hz: 1568, attack: 0.01, decay: 0.5, gain: 0.15, delay: 0.36 },
    ],
};

export const aquariumGame: ActionGame<AquaState> = {
    id: "aquarium",
    title: "Charlie's aquarium",
    group: "action",
    card: { round: { level: 0 }, keep: 30, minutes: 2 },
    portrait: { keep: 20 },
    quiet: true,
    touch: true,
    saves: { level: FREE },
    levels: AQUA_LEVELS,
    rate: RATE,
    sounds: SOUNDS,
    cover: { art: "aquarium", params: params("cover") },
    hint: "Press on the jug, the net or the food and drag. Lower the jug over a tank to pour (the lower, the faster) and hold it in the water to scoop some out; sweep the net slowly through the water to catch a fish and let go over another tank; pull back from the food and let go to toss a pinch. A tool goes back to the shelf when you let go. With the keys, the arrows move your hand (or aim the food, or turn the dial), and Space does what the Action button says, held to pour or scoop. Plus and minus turn the heater.",
    controls: {
        arrows: { left: "Left", right: "Right", up: "Up", down: "Down" },
        go: "Action",
        icons: { go: "grab" },
    },
    goLabel: (s) => labelOf(s, actOf(s)),
    goIcon: (s) => {
        const a = actOf(s);
        return a ? ICON[a.kind] : "grab";
    },
    commands: [
        { id: "warmer", label: "Warmer", key: "+", icon: "add" },
        { id: "cooler", label: "Cooler", key: "-", icon: "less" },
        { id: "drop", label: "Put down", key: "escape", keysOnly: true },
    ],
    shows: (s, id) =>
        id === "warmer" || id === "cooler" ? s.tanks.some((t) => t.dial !== null) && live(s) : true,
    command: (s, id) => {
        const out: Happening[] = [];
        const ti = s.tanks.findIndex((t) => t.dial !== null);
        if (id === "warmer") turnDial(s, ti, 1, out);
        else if (id === "cooler") turnDial(s, ti, -1, out);
        else if (id === "drop") putDown(s);
        s.used = true;
        s.busyAt = s.steps;
    },
    checkpoint: (s): Design => {
        const t = s.tanks[0];
        return {
            litres: t?.litres ?? 0,
            placed: (t?.placed ?? []).map((d) => ({ item: d.item, x: d.x })),
            on: t?.on === true,
            dial: t?.dial ?? 24,
            home: s.fish.filter((f) => f.tank === 0).length,
        };
    },
    restore: (s, value) => {
        const d = readDesign(value, s);
        const t = s.tanks[0];
        if (!d || !t) return false;
        t.litres = d.litres;
        t.placed = d.placed.map((p, i) => ({ ...p, key: `r${i}` }));
        for (const p of d.placed) {
            const slot = s.tray.find((x) => x.item === p.item);
            if (slot) slot.n = Math.max(0, slot.n - 1);
        }
        if (t.on !== null) t.on = d.on;
        if (t.dial !== null) {
            t.dial = d.dial;
            t.temp = d.dial;
        }
        const b = boundsOf(t);
        for (const [i, f] of s.fish.slice(0, d.home).entries()) {
            f.tank = 0;
            f.x = b.x0 + ((i + 0.5) * (b.x1 - b.x0)) / Math.max(1, d.home);
            f.y = (b.y0 + b.y1) / 2;
        }
        const at = settled(lifeOf(s, 0), t.q.haze);
        t.q.oxygen = at.oxygen;
        t.q.clean = at.clean;
        return true;
    },
    start: (phase) => startAquarium(AQUA_LEVELS[phase] ?? AQUA_LEVELS[0], phase),
    step: stepAquarium,
    say,
    // after a wait with nothing done, the line says what the step to do needs
    note: (s) => (live(s) && s.used && s.steps - s.busyAt >= GUIDE_WAIT ? speechOf(s) : s.note),
    won: (s) => s.end === "won",
    ended: (s) => (s.end ? { won: s.end === "won", words: s.note } : null),
    objectives: (s) => {
        const steps = stepsOf(s);
        return { completed: steps.filter((x) => x.done).length, total: steps.length };
    },
    frame,
    cancelInput: (s) => {
        s.finger = null;
        stopJug(s);
        s.aim.pulling = false;
    },
    hum: (s): Hum[] =>
        s.jug.pouring || s.jug.scoop > 0 || count(s.drops) > 20
            ? [{ kind: "water", level: 0.3 + 0.5 * s.jug.tilt }]
            : s.tanks.some((t) => t.on)
              ? [{ kind: "water", level: 0.12 }]
              : [],
    tuning: AQUA,
    still: {
        // a press pours for a second, so a tank fills in a handful of presses
        press: (s) => (s.tool === "jug" ? 60 : 12),
        settling: (s) =>
            count(s.drops) > 0 ||
            s.pinches.length > 0 ||
            s.flakes.some((f) => f.rest === 0) ||
            s.jug.tilt > 0.02 ||
            s.tanks.some((t) => t.dial !== null && Math.abs(t.dial - t.temp) > 0.01) ||
            (!live(s) && s.since < 30),
    },
};
