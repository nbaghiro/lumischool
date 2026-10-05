// Charlie's climb: a gentle platformer over garden walls, rooftops, treetops and clouds, where coins
// open doors that show numbers.
//
// Charlie runs where she is sent and jumps as high as the jump is held. The coins she picks up are
// counted on the corner of the view, and the doors on her way show what they open for: a number
// (12 coins exactly, or at least 10 on the first levels), a sum ("7 + 5"), or one side of a fork (odd
// or even, more than 20 or 20 and less), so the way through depends on what she carries. A coin box
// takes one coin back for each hop onto its button, so a count that is too big can be made right.
// A fall into the water puts her back at the last flag with nothing lost. The keys run, jump and
// drop; on the field a held finger is where she runs, and a finger above her is a jump held. The
// walking, jumping and riding are the runner in engine/motion/walker.ts over the ledges, blocks and
// ladders of engine/motion/platforms.ts. See .docs/games.md.
import {
    actor,
    actorSprites,
    land,
    stepActor,
    type Actor,
    type Cycle,
} from "../../engine/motion/actor";
import { follow, type Cam } from "../../engine/motion/camera";
import { feed, progress, track, type GameEvent, type Track } from "../../engine/motion/goals";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import {
    course,
    ledgeAt,
    springSpeed,
    standingOn,
    type Block,
    type Ledge,
    type Place,
    type Rung,
} from "../../engine/motion/platforms";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import {
    grounded,
    runner,
    stepRunner,
    type Intent,
    type Moves,
    type Runner,
} from "../../engine/motion/walker";
import { panOf, semitones, type Kit } from "../../engine/sound/kit";
import { BEYOND, row, type Eye } from "./scenery";
import type { ActionGame, ActionLevel, Levels } from "./game";

export const RATE = 60;
const DT = 1 / RATE;
const VIEW = { w: 32, h: 20 };

/** The numbers that make the climb feel the way it does. */
export const CLIMB = {
    gravity: knob(
        45,
        30,
        70,
        1,
        "squares a second, each second",
        "a full jump is up and down in eight tenths of a second, quick enough to feel springy",
    ),
    cut: knob(
        1.5,
        1,
        5,
        0.1,
        "times gravity",
        "let go early, a jump is pulled down this much harder; gentle, so a quick tap of space still clears a ledge",
    ),
    coyote: knob(
        0.12,
        0,
        0.3,
        0.01,
        "seconds",
        "a jump pressed just after running off an edge still jumps, as a child expects it to",
    ),
    buffer: knob(
        0.14,
        0,
        0.3,
        0.01,
        "seconds",
        "a jump pressed just before landing is kept and jumps on landing",
    ),
    wind: knob(
        1.6,
        0,
        4,
        0.1,
        "squares a second",
        "how far the windy hill's gusts carry her through the air, felt and never fought",
    ),
};

/** Who climbs, and how each moves: a pup jumps higher, a grown-up runs faster. */
export const WHO = ["charlie", "pup", "grownup"] as const;
export type Who = (typeof WHO)[number];

const STATS: Record<Who, { speed: number; jump: number; name: string }> = {
    charlie: { speed: 6.5, jump: 3.6, name: "Charlie" },
    pup: { speed: 6, jump: 4.4, name: "Pip" },
    grownup: { speed: 8, jump: 3.3, name: "Charlie's mum" },
};

export const movesOf = (who: Who): Moves => ({
    speed: STATS[who].speed,
    accel: 42,
    airAccel: 26,
    gravity: CLIMB.gravity.value,
    jump: STATS[who].jump,
    cut: CLIMB.cut.value,
    coyote: CLIMB.coyote.value,
    buffer: CLIMB.buffer.value,
    step: 0.35,
    fall: 24,
    climb: 4.5,
    pace: 1.1,
    height: 2.4,
});

/** What a door opens for: a number exactly, at least a number, or one side of a fork. */
export type Rule =
    | { kind: "exact"; n: number }
    | { kind: "atLeast"; n: number }
    | { kind: "sum"; a: number; b: number }
    | { kind: "odd" }
    | { kind: "even" }
    | { kind: "more"; than: number }
    | { kind: "atMost"; n: number };

export const passes = (r: Rule, coins: number): boolean =>
    r.kind === "exact"
        ? coins === r.n
        : r.kind === "atLeast"
          ? coins >= r.n
          : r.kind === "sum"
            ? coins === r.a + r.b
            : r.kind === "odd"
              ? coins % 2 === 1
              : r.kind === "even"
                ? coins % 2 === 0
                : r.kind === "more"
                  ? coins > r.than
                  : coins <= r.n;

/** What a door shows on its card. */
export const ruleText = (r: Rule): string =>
    r.kind === "exact"
        ? String(r.n)
        : r.kind === "atLeast"
          ? `${r.n}+`
          : r.kind === "sum"
            ? `${r.a} + ${r.b}`
            : r.kind === "odd"
              ? "odd"
              : r.kind === "even"
                ? "even"
                : r.kind === "more"
                  ? `> ${r.than}`
                  : `≤ ${r.n}`;

const ruleWords = (r: Rule): string =>
    r.kind === "exact"
        ? `exactly ${r.n} coins`
        : r.kind === "atLeast"
          ? `${r.n} coins or more`
          : r.kind === "sum"
            ? `${r.a} and ${r.b} coins together`
            : r.kind === "odd"
              ? "an odd number of coins"
              : r.kind === "even"
                ? "an even number of coins"
                : r.kind === "more"
                  ? `more than ${r.than} coins`
                  : `${r.n} coins or fewer`;

/** How each ledge and block is drawn: they all stand and hold the same way. */
export type Look =
    | "grass"
    | "plank"
    | "roof"
    | "branch"
    | "cloud"
    | "stone"
    | "mushroom"
    | "crate"
    | "stall"
    | "button";

export type ClimbLedge = Ledge & { look: Look };
export type ClimbBlock = Block & { look: Look };

export interface Coin {
    x: number;
    y: number;
}
export interface Door {
    x: number;
    /** The floor it stands on. */
    y: number;
}
/** A coin box: a button on the floor at `x` that takes one coin back each time she lands on it. */
export interface Slot {
    x: number;
    y: number;
}

/** A place, as the background rows draw it. */
export type Scene =
    "garden" | "roofs" | "trees" | "tower" | "hill" | "castle" | "market" | "clouds";

export interface ClimbLevel extends ActionLevel {
    scene: Scene;
    w: number;
    h: number;
    start: Pt;
    ledges: ClimbLedge[];
    blocks: ClimbBlock[];
    ladders: Rung[];
    /** Where the coins lie; what each is worth is the variant's. */
    coins: Coin[];
    doors: Door[];
    slots: Slot[];
    flags: Pt[];
    stars: Pt[];
    /** The cottage or flag at the end. */
    home: Pt & { kind: "cottage" | "flag" };
    /** Squares a second the wind carries her in the air. */
    wind?: boolean;
    /** The faint arc of a full jump: always, only while a jump is held, or never. */
    preview: "always" | "holding" | "never";
    /** The values and rules a level is played with: each variant is what one seed gives. */
    variants: Variant[];
}

export interface Variant {
    /** What each coin is worth, in the order of `coins`; nought leaves a coin out. */
    values: number[];
    rules: Rule[];
}

const H0 = 24,
    G0 = 20;
const ground = (x0: number, x1: number, top = G0, look: Look = "grass", h = H0): ClimbBlock => ({
    x0,
    x1,
    y0: top,
    y1: h + 6,
    look,
});
const ledge = (
    x0: number,
    x1: number,
    y: number,
    look: Look,
    more: Partial<Ledge> = {},
): ClimbLedge => ({ x0, x1, y, look, oneWay: look !== "mushroom" && look !== "button", ...more });
const coinsAt = (y: number, ...xs: number[]): Coin[] => xs.map((x) => ({ x, y }));

export const CLIMB_LEVELS: Levels<ClimbLevel> = [
    {
        title: "The garden wall",
        grades: [1, 1],
        goal: "Pick up the coins on the way. The garden door opens for 10 coins or more.",
        scene: "garden",
        w: 64,
        h: H0,
        start: { x: 3, y: G0 },
        blocks: [
            ground(0, 22),
            ground(26, 64),
            { x0: 36, x1: 38, y0: G0 - 2, y1: G0, look: "stone" },
        ],
        ledges: [],
        ladders: [],
        coins: [...coinsAt(G0 - 1, 6, 7, 8, 9, 10), ...coinsAt(G0 - 1, 28, 29, 30, 31, 32)],
        doors: [{ x: 45, y: G0 }],
        slots: [],
        flags: [{ x: 27, y: G0 }],
        stars: [{ x: 37, y: G0 - 5 }],
        home: { x: 57, y: G0, kind: "cottage" },
        preview: "always",
        variants: [
            { values: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], rules: [{ kind: "atLeast", n: 10 }] },
            { values: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], rules: [{ kind: "atLeast", n: 8 }] },
            { values: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0], rules: [{ kind: "atLeast", n: 9 }] },
        ],
    },
    {
        title: "The rooftops",
        grades: [1, 2],
        goal: "The coins on the roofs are worth 2 each. The door opens for the number on it, exactly.",
        scene: "roofs",
        w: 72,
        h: H0,
        start: { x: 3, y: G0 },
        blocks: [
            ground(0, 14, G0, "roof"),
            ground(17, 28, G0 - 2, "roof"),
            ground(31, 42, G0 - 1, "roof"),
            ground(45, 58, G0 - 3, "roof"),
            ground(61, 72, G0 - 3, "roof"),
        ],
        ledges: [],
        ladders: [],
        coins: [...coinsAt(G0 - 1, 8, 10), ...coinsAt(G0 - 3, 20, 22), ...coinsAt(G0 - 2, 34, 36)],
        doors: [{ x: 53, y: G0 - 3 }],
        slots: [],
        flags: [{ x: 32, y: G0 - 1 }],
        stars: [{ x: 50, y: G0 - 8 }],
        home: { x: 67, y: G0 - 3, kind: "flag" },
        preview: "always",
        variants: [
            { values: [2, 2, 2, 2, 2, 2], rules: [{ kind: "exact", n: 12 }] },
            { values: [2, 2, 2, 2, 2, 0], rules: [{ kind: "exact", n: 10 }] },
            { values: [2, 0, 2, 2, 2, 0], rules: [{ kind: "exact", n: 8 }] },
        ],
    },
    {
        title: "The treetops",
        grades: [1, 2],
        goal: "Bounce on the mushroom up into the trees. The coins are worth 5, and the door wants its number exactly.",
        scene: "trees",
        w: 66,
        h: H0,
        start: { x: 3, y: G0 },
        blocks: [ground(0, 14), ground(40, 66)],
        ledges: [
            ledge(11, 13, G0 - 1, "mushroom", { spring: 7.5 }),
            ledge(14, 22, G0 - 6.5, "branch"),
            ledge(25, 30, G0 - 7, "branch"),
            ledge(33, 38, G0 - 6, "branch"),
        ],
        ladders: [],
        coins: [...coinsAt(G0 - 7.5, 18, 20.5), ...coinsAt(G0 - 8, 27), ...coinsAt(G0 - 7, 35)],
        doors: [{ x: 50, y: G0 }],
        slots: [],
        flags: [{ x: 15, y: G0 - 6.5 }],
        stars: [{ x: 27.5, y: G0 - 12 }],
        home: { x: 60, y: G0, kind: "cottage" },
        preview: "always",
        variants: [
            { values: [5, 5, 5, 5], rules: [{ kind: "exact", n: 20 }] },
            { values: [5, 5, 5, 0], rules: [{ kind: "exact", n: 15 }] },
            { values: [5, 0, 5, 5], rules: [{ kind: "exact", n: 15 }] },
        ],
    },
    {
        title: "The clock tower",
        grades: [2, 3],
        goal: "Ride the moving ledge over the gap. Then the doors fork: one opens for an odd count, the other for an even one.",
        scene: "tower",
        w: 76,
        h: 30,
        start: { x: 3, y: 26 },
        blocks: [ground(0, 14, 26, "stone", 30), ground(26, 76, 26, "stone", 30)],
        ledges: [
            ledge(16, 19, 26, "plank", { oneWay: false, move: { dx: 3.5, dy: 0, period: 4.6 } }),
            ledge(34, 64, 19, "plank"),
        ],
        ladders: [{ x: 42.5, y0: 19, y1: 26 }],
        coins: [...coinsAt(25, 30, 32, 34), ...coinsAt(18, 46)],
        doors: [
            { x: 58, y: 19 },
            { x: 58, y: 26 },
        ],
        slots: [],
        flags: [{ x: 27, y: 26 }],
        stars: [{ x: 50, y: 14 }],
        home: { x: 70, y: 26, kind: "cottage" },
        preview: "holding",
        variants: [
            { values: [10, 10, 10, 5], rules: [{ kind: "odd" }, { kind: "even" }] },
            { values: [10, 10, 20, 5], rules: [{ kind: "odd" }, { kind: "even" }] },
            { values: [20, 10, 10, 5], rules: [{ kind: "odd" }, { kind: "even" }] },
        ],
    },
    {
        title: "The windy hill",
        grades: [2, 3],
        goal: "The wind blows you along in the air. The door wants its number exactly; hop on the coin box to give a coin back.",
        scene: "hill",
        w: 70,
        h: 26,
        start: { x: 3, y: 22 },
        wind: true,
        blocks: [
            ground(0, 16, 22, "grass", 26),
            ground(19, 30, 20, "grass", 26),
            ground(33, 44, 18, "grass", 26),
            ground(47, 70, 18, "grass", 26),
        ],
        ledges: [ledge(39.4, 40.6, 17.7, "button")],
        ladders: [],
        coins: [...coinsAt(21, 6, 10), ...coinsAt(19, 22, 26), ...coinsAt(17, 36)],
        doors: [{ x: 53, y: 18 }],
        slots: [{ x: 40, y: 17.7 }],
        flags: [{ x: 34, y: 18 }],
        stars: [{ x: 25, y: 13 }],
        home: { x: 64, y: 18, kind: "cottage" },
        preview: "holding",
        variants: [
            { values: [3, 3, 3, 3, 1], rules: [{ kind: "exact", n: 12 }] },
            { values: [3, 3, 3, 3, 2], rules: [{ kind: "exact", n: 12 }] },
            { values: [3, 3, 3, 0, 1], rules: [{ kind: "exact", n: 9 }] },
        ],
    },
    {
        title: "The castle",
        grades: [3, 4],
        goal: "Two doors at the end: the high one opens for more than 20 coins, the low one for 20 or fewer.",
        scene: "castle",
        w: 72,
        h: 28,
        start: { x: 3, y: 24 },
        blocks: [
            ground(0, 72, 24, "stone", 28),
            { x0: 20, x1: 22, y0: 21, y1: 24, look: "stone" },
            { x0: 24, x1: 27, y0: 21.5, y1: 24, look: "crate" },
        ],
        ledges: [ledge(28, 60, 19, "stone")],
        ladders: [],
        coins: [...coinsAt(23, 10, 14, 18), ...coinsAt(18, 32)],
        doors: [
            { x: 56, y: 19 },
            { x: 56, y: 24 },
        ],
        slots: [],
        flags: [{ x: 29, y: 19 }],
        stars: [{ x: 44, y: 13 }],
        home: { x: 67, y: 24, kind: "flag" },
        preview: "never",
        variants: [
            {
                values: [10, 5, 5, 2],
                rules: [
                    { kind: "more", than: 20 },
                    { kind: "atMost", n: 20 },
                ],
            },
            {
                values: [5, 5, 10, 5],
                rules: [
                    { kind: "more", than: 20 },
                    { kind: "atMost", n: 20 },
                ],
            },
            {
                values: [10, 10, 5, 2],
                rules: [
                    { kind: "more", than: 20 },
                    { kind: "atMost", n: 20 },
                ],
            },
        ],
    },
    {
        title: "The night market",
        grades: [3, 4],
        goal: "Each door wants its number exactly. Hop on a coin box to give back a coin for every hop.",
        scene: "market",
        w: 70,
        h: H0,
        start: { x: 3, y: G0 },
        blocks: [
            ground(0, 70),
            { x0: 18, x1: 20, y0: G0 - 2, y1: G0, look: "stall" },
            { x0: 40, x1: 42, y0: G0 - 2, y1: G0, look: "stall" },
        ],
        ledges: [ledge(35.4, 36.6, G0 - 0.3, "button"), ledge(51.4, 52.6, G0 - 0.3, "button")],
        ladders: [],
        coins: [...coinsAt(G0 - 1, 6, 12, 24, 28, 32)],
        doors: [
            { x: 46, y: G0 },
            { x: 60, y: G0 },
        ],
        slots: [
            { x: 36, y: G0 - 0.3 },
            { x: 52, y: G0 - 0.3 },
        ],
        flags: [{ x: 23, y: G0 }],
        stars: [{ x: 41, y: G0 - 7 }],
        home: { x: 66, y: G0, kind: "cottage" },
        preview: "never",
        variants: [
            {
                values: [10, 10, 5, 2, 1],
                rules: [
                    { kind: "exact", n: 25 },
                    { kind: "exact", n: 20 },
                ],
            },
            {
                values: [10, 5, 5, 2, 2],
                rules: [
                    { kind: "exact", n: 21 },
                    { kind: "exact", n: 18 },
                ],
            },
            {
                values: [10, 10, 2, 2, 1],
                rules: [
                    { kind: "exact", n: 22 },
                    { kind: "exact", n: 19 },
                ],
            },
        ],
    },
    {
        title: "The cloud climb",
        grades: [3, 4],
        goal: "Climb the clouds. Each door shows two numbers: add them to know how many coins it wants.",
        scene: "clouds",
        w: 52,
        h: 40,
        start: { x: 2, y: 36 },
        blocks: [ground(0, 52, 36, "grass", 40)],
        ledges: [
            ledge(4, 10, 33, "cloud"),
            ledge(8, 14, 30, "cloud"),
            ledge(4, 10, 27, "cloud"),
            ledge(8, 14, 24, "cloud"),
            ledge(18, 26, 22, "cloud"),
            ledge(28, 52, 22, "cloud"),
        ],
        ladders: [],
        coins: [{ x: 7, y: 32 }, { x: 9.5, y: 29 }, { x: 8.5, y: 26 }, ...coinsAt(21, 38, 40)],
        doors: [
            { x: 35, y: 22 },
            { x: 45, y: 22 },
        ],
        slots: [],
        flags: [{ x: 20, y: 22 }],
        stars: [{ x: 22, y: 15 }],
        home: { x: 50, y: 22, kind: "flag" },
        preview: "never",
        variants: [
            {
                values: [5, 5, 2, 2, 1],
                rules: [
                    { kind: "sum", a: 7, b: 5 },
                    { kind: "sum", a: 9, b: 6 },
                ],
            },
            {
                values: [5, 5, 2, 2, 1],
                rules: [
                    { kind: "sum", a: 6, b: 6 },
                    { kind: "sum", a: 8, b: 7 },
                ],
            },
            {
                values: [5, 5, 2, 2, 1],
                rules: [
                    { kind: "sum", a: 5, b: 7 },
                    { kind: "sum", a: 10, b: 5 },
                ],
            },
        ],
    },
];

type Act = "stand" | "run" | "rise" | "fall" | "climb" | "cheer";

const ACTS: Record<Who, Record<Act, Cycle>> = {
    charlie: {
        stand: { poses: ["stand"] },
        run: { poses: ["run", "walk"], per: 0.5 },
        rise: { poses: ["jump"] },
        fall: { poses: ["jump"] },
        climb: { poses: ["hang"] },
        cheer: { poses: ["cheer", "jump"], every: 0.4 },
    },
    pup: {
        stand: { poses: ["stand"] },
        run: { poses: ["run", "walk"], per: 0.5 },
        rise: { poses: ["leap"] },
        fall: { poses: ["leap"] },
        climb: { poses: ["jump"] },
        cheer: { poses: ["cheer", "jump"], every: 0.4 },
    },
    grownup: {
        stand: { poses: ["stand"] },
        run: { poses: ["run", "walk"], per: 0.5 },
        rise: { poses: ["jump"] },
        fall: { poses: ["jump"] },
        climb: { poses: ["hang"] },
        cheer: { poses: ["cheer", "wave"], every: 0.4 },
    },
};

export interface ClimbState {
    phase: number;
    L: ClimbLevel;
    variant: number;
    values: number[];
    rules: Rule[];
    who: Who;
    r: Runner;
    act: Actor<Act>;
    steps: number;
    coins: number;
    taken: boolean[];
    stars: boolean[];
    /** How far each door has swung open, from nought to one, and whether it is opening. */
    open: number[];
    opening: boolean[];
    /** The flag she starts again at, by its place in the list, or -1 for the start. */
    flag: number;
    /** Seconds since each ledge last sprang someone, for its squash. */
    sprung: number[];
    /** Coins picked up close together, for the rising ding of a run of them. */
    streak: number;
    lastCoin: number;
    /** Set while a spring throws her up, so the rise is the spring's whole height whether a jump is held or not. */
    boosting: boolean;
    /** Seconds left of a splash before she is put back at the flag. */
    splash: number;
    /** A door she has been told about, so the note is said once per visit. */
    told: number;
    /** Whether the finger was above her last step, so a finger moved up is one jump. */
    above: boolean;
    touchFrom: number;
    cam: Cam;
    goal: Track;
    won: boolean;
    wonAt: number;
    said: string;
}

export const variantOf = (L: ClimbLevel, n: number): Variant =>
    L.variants[((n % L.variants.length) + L.variants.length) % L.variants.length] ??
    L.variants[0] ?? { values: [], rules: [] };

export function startClimb(phase: number, variant = 0, who: Who = "charlie"): ClimbState {
    const L = CLIMB_LEVELS[phase] ?? CLIMB_LEVELS[0];
    const v = variantOf(L, variant);
    const r = runner(L.start.x, L.start.y);
    return {
        phase,
        L,
        variant,
        values: [...v.values],
        rules: v.rules.map((x) => ({ ...x })),
        who,
        r,
        act: actor<Act>("stand", ACTS[who].stand.poses[0]),
        steps: 0,
        coins: 0,
        taken: L.coins.map((_, i) => (v.values[i] ?? 0) === 0),
        stars: L.stars.map(() => false),
        open: L.doors.map(() => 0),
        opening: L.doors.map(() => false),
        flag: -1,
        sprung: L.ledges.map(() => 99),
        streak: 0,
        lastCoin: -999,
        splash: 0,
        boosting: false,
        told: -1,
        above: false,
        touchFrom: -1,
        cam: { x: L.start.x + 8, y: L.start.y - 6, zoom: 1 },
        goal: track({ on: "home" }),
        won: false,
        wonAt: 0,
        said: "",
    };
}

const place = (s: ClimbState): Place => ({
    ledges: s.L.ledges,
    blocks: s.L.blocks,
    ladders: s.L.ladders,
});

/** A shut door, as solid as a wall: four squares tall, as no jump is. */
export const doorBlock = (d: Door): Block => ({
    x0: d.x - 0.45,
    x1: d.x + 0.45,
    y0: d.y - 4,
    y1: d.y,
});

const shut = (s: ClimbState): Block[] =>
    s.L.doors.filter((_, i) => (s.open[i] ?? 0) < 0.6).map(doorBlock);

export const courseOf = (s: ClimbState) => course(place(s), s.steps * DT, shut(s));

const emit = (s: ClimbState, out: Happening[], event: GameEvent): void => {
    feed(s.goal, event);
    out.push({ event });
};

const pan = (s: ClimbState, x: number): number => panOf(x, s.cam.x, VIEW.w);

/** The intent the pad gives: the keys, the buttons, or a finger on the field. */
export function intentOf(s: ClimbState, pad: Pad): Intent {
    const r = s.r,
        m = movesOf(s.who),
        c = courseOf(s);
    const onLadder = c.ladder?.(r.x, r.y - m.height / 2) ?? false;
    const keyRun: -1 | 0 | 1 = pad.holding.includes("right")
        ? pad.holding.includes("left") && pad.held === "left"
            ? -1
            : 1
        : pad.holding.includes("left")
          ? -1
          : 0;
    let run = keyRun;
    let jump = pad.go || (pad.holding.includes("up") && !onLadder);
    let jumped = pad.tapped || (pad.pressed.includes("up") && !onLadder);
    let climb: -1 | 0 | 1 = onLadder
        ? pad.holding.includes("up")
            ? -1
            : pad.holding.includes("down")
              ? 1
              : 0
        : 0;
    let drop = pad.pressed.includes("down") && !onLadder;
    const t = pad.touch;
    if (t) {
        if (s.touchFrom < 0) s.touchFrom = s.steps;
        const dx = t.x - r.x,
            dy = t.y - (r.y - m.height / 2);
        if (Math.abs(dx) > 0.6) run = dx > 0 ? 1 : -1;
        // a finger held still above her keeps the jump going as she rises up to it
        const up = dy < -2.2 || (s.above && !grounded(r) && dy < 0),
            down = dy > 1.8;
        if (onLadder || r.state === "climb") climb = up ? -1 : down ? 1 : 0;
        else {
            if (up) {
                jump = true;
                if (!s.above) jumped = true;
            }
            if (down && Math.abs(dx) < 2 && !s.above) drop = true;
        }
        s.above = up;
    } else {
        // a quick tap on the field is a hop
        if (pad.lifted && s.touchFrom >= 0 && s.steps - s.touchFrom < RATE * 0.25)
            jumped = jump = true;
        s.touchFrom = -1;
        s.above = false;
    }
    return { run, jump, jumped, climb, drop };
}

function cue(
    s: ClimbState,
    out: Happening[],
    c: "lift" | "place" | "bump" | "ring" | "level" | "nope" | "back" | "splash" | "win",
    strength = 0.6,
    pitch = 1,
    x = s.r.x,
): void {
    out.push({ cue: c, strength, pitch, pan: pan(s, x) });
}

/** What the note says at a door that stays shut: how many it wants against how many she has. */
function shutWords(s: ClimbState, rule: Rule): string {
    const has = s.coins === 1 ? "1 coin" : `${s.coins} coins`;
    const want = rule.kind === "sum" ? rule.a + rule.b : rule.kind === "exact" ? rule.n : null;
    if (want !== null && s.coins < want)
        return `This door wants ${ruleWords(rule)}. You have ${has}: ${want - s.coins} more.`;
    if (want !== null && s.coins > want)
        return `This door wants ${ruleWords(rule)}. You have ${has}: ${s.coins - want} too many. A coin box takes coins back.`;
    if (rule.kind === "atLeast")
        return `This door wants ${ruleWords(rule)}. You have ${has}: ${rule.n - s.coins} more.`;
    return `This door takes ${ruleWords(rule)}. You have ${has}, so try the other door.`;
}

export function stepClimb(s: ClimbState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    const L = s.L,
        r = s.r,
        m = movesOf(s.who);
    s.steps++;
    for (let i = 0; i < s.sprung.length; i++) s.sprung[i] = (s.sprung[i] ?? 99) + DT;
    for (let i = 0; i < s.open.length; i++)
        if (s.opening[i]) s.open[i] = Math.min(1, (s.open[i] ?? 0) + DT / 0.45);
    if (s.won) {
        stepActor(s.act, "cheer", ACTS[s.who], DT, r.stride, r.facing);
        frameCamera(s);
        return out;
    }
    if (s.splash > 0) {
        s.splash -= DT;
        if (s.splash <= 0) {
            const f = L.flags[s.flag];
            const back = f ?? L.start;
            Object.assign(r, runner(back.x, back.y, 1));
            out.push({ puff: { x: back.x, y: back.y - 1, n: 6 } });
            cue(s, out, "back", 0.4);
            s.said =
                s.flag >= 0
                    ? "Back at the flag, with every coin still in hand."
                    : "Back at the start, with every coin still in hand.";
        }
        frameCamera(s);
        return out;
    }
    const i = intentOf(s, pad);
    if (s.boosting && r.vy < 0) i.jump = true;
    else s.boosting = false;
    const before = r.vy;
    const ran = stepRunner(r, i, courseOf(s), m, DT);
    if (L.wind && !grounded(r) && r.state !== "climb") r.x += CLIMB.wind.value * DT;
    for (const e of ran) {
        if (e === "jumped") {
            cue(s, out, "lift", 0.45, semitones(Math.round((STATS[s.who].jump - 3) * 3)));
            out.push({ puff: { x: r.x, y: r.y, n: 3 } });
        }
        if (e === "landed") {
            land(s.act, Math.max(0, before));
            if (before > 6) {
                cue(s, out, "bump", Math.min(0.6, before / 30), 1.2);
                out.push({ puff: { x: r.x, y: r.y, n: before > 12 ? 4 : 2 } });
            }
            const on = standingOn(place(s), r.x, r.y, s.steps * DT);
            const l = L.ledges[on];
            if (l?.spring) {
                r.vy = springSpeed(l.spring, m.gravity);
                r.state = "rise";
                r.air = m.coyote;
                s.sprung[on] = 0;
                s.boosting = true;
                cue(s, out, "lift", 0.6, 1.6);
            }
            if (l?.look === "button") {
                const k = L.slots.findIndex((sl) => Math.abs(sl.x - r.x) < 1.2);
                if (k >= 0 && s.coins > 0) {
                    s.coins--;
                    s.sprung[on] = 0;
                    cue(s, out, "back", 0.6, 1.1);
                    out.push({
                        burst: { kind: "sparkle", x: L.slots[k]?.x ?? r.x, y: r.y - 1.4, n: 4 },
                    });
                    s.said = `A coin into the box. You have ${s.coins} now.`;
                } else if (k >= 0)
                    s.said = "The coin box has nothing to take: your pocket is empty.";
            }
        }
        if (e === "bumped") cue(s, out, "bump", 0.3, 0.9);
    }
    // a footstep on each stride, soft enough to sit under everything else
    if (
        grounded(r) &&
        Math.abs(r.vx) > 2 &&
        Math.floor(r.stride * 2) !== Math.floor((r.stride - (Math.abs(r.vx) * DT) / m.pace) * 2)
    )
        cue(s, out, "place", 0.08, 1.4);
    pickUp(s, out, m);
    doors(s, out, m);
    flags(s, out);
    if (r.y > L.h + 1) {
        s.splash = 0.55;
        cue(s, out, "splash", 0.6);
        out.push({ burst: { kind: "splash", x: r.x, y: L.h - 1.5, n: 10 } });
        s.said = "Splash! Back to the flag in a moment.";
    }
    const home = L.home;
    if (grounded(r) && r.x >= home.x - 1.2 && Math.abs(r.y - home.y) < 0.6) {
        s.won = true;
        s.wonAt = s.steps;
        emit(s, out, { kind: "home" });
        cue(s, out, "win", 0.8);
        out.push({ burst: { kind: "sparkle", x: home.x, y: home.y - 3, n: 16 } });
        const stars = s.stars.filter(Boolean).length;
        s.said = `${STATS[s.who].name} made it home with ${s.coins} coins${stars ? " and the star" : ""}!`;
    }
    const act: Act =
        r.state === "climb"
            ? "climb"
            : r.state === "rise"
              ? "rise"
              : r.state === "fall"
                ? "fall"
                : r.state === "run"
                  ? "run"
                  : "stand";
    stepActor(s.act, act, ACTS[s.who], DT, r.stride, r.facing);
    frameCamera(s);
    return out;
}

function pickUp(s: ClimbState, out: Happening[], m: Moves): void {
    const r = s.r;
    s.L.coins.forEach((c, k) => {
        if (s.taken[k]) return;
        if (Math.abs(c.x - r.x) < 0.8 && c.y >= r.y - m.height - 0.6 && c.y <= r.y + 0.6) {
            s.taken[k] = true;
            const v = s.values[k] ?? 0;
            s.coins += v;
            s.streak = s.steps - s.lastCoin < RATE * 0.9 ? s.streak + 1 : 0;
            s.lastCoin = s.steps;
            cue(s, out, "ring", 0.55, semitones(Math.min(12, s.streak * 2)), c.x);
            out.push({ burst: { kind: "sparkle", x: c.x, y: c.y, n: 5 } });
            s.said =
                v === 1
                    ? `A coin. You have ${s.coins}.`
                    : `A coin worth ${v}. You have ${s.coins}.`;
        }
    });
    s.L.stars.forEach((p, k) => {
        if (s.stars[k]) return;
        if (Math.abs(p.x - r.x) < 0.9 && p.y >= r.y - m.height - 0.5 && p.y <= r.y + 0.4) {
            s.stars[k] = true;
            cue(s, out, "ring", 0.7, 2);
            out.push({ burst: { kind: "sparkle", x: p.x, y: p.y, n: 12 } });
            s.said = "The hidden star! It is not needed, just found.";
        }
    });
}

function doors(s: ClimbState, out: Happening[], m: Moves): void {
    const r = s.r;
    s.L.doors.forEach((d, k) => {
        if (s.opening[k]) return;
        const near =
            Math.abs(d.x - r.x) < 1.1 && r.y <= d.y + 0.1 && r.y > d.y - 4 + m.height * 0.3;
        if (!near) {
            if (s.told === k && Math.abs(d.x - r.x) > 3) s.told = -1;
            return;
        }
        const rule = s.rules[k];
        if (!rule) return;
        if (passes(rule, s.coins)) {
            s.opening[k] = true;
            emit(s, out, { kind: "door", value: k });
            cue(s, out, "level", 0.7, 1, d.x);
            out.push({ burst: { kind: "sparkle", x: d.x, y: d.y - 3, n: 8 } });
            s.said = `The door opens for ${s.coins}.`;
        } else if (s.told !== k) {
            s.told = k;
            cue(s, out, "nope", 0.35, 1, d.x);
            s.said = shutWords(s, rule);
        }
    });
}

function flags(s: ClimbState, out: Happening[]): void {
    const r = s.r;
    s.L.flags.forEach((f, k) => {
        if (k <= s.flag) return;
        if (r.x >= f.x && Math.abs(r.y - f.y) < 3 && grounded(r)) {
            s.flag = k;
            emit(s, out, { kind: "checkpoint" });
            cue(s, out, "ring", 0.4, 1.5, f.x);
            out.push({ burst: { kind: "sparkle", x: f.x, y: f.y - 3, n: 6 } });
        }
    });
}

/** The camera leads the way she runs and keeps still while she hops, moving up or down only when she climbs out of the middle of the view. */
function frameCamera(s: ClimbState): void {
    const r = s.r,
        L = s.L;
    const body = r.y - 3;
    let ty = s.cam.y;
    if (body < ty - 2) ty = body + 2;
    if (body > ty + 2.5) ty = body - 2.5;
    const want = { x: r.x + Math.max(-4, Math.min(4, r.vx * 0.55)) + r.facing * 2, y: ty, zoom: 1 };
    s.cam = follow(s.cam, want, {
        rate: 4,
        dt: DT,
        view: VIEW,
        world: { w: L.w, h: L.h },
    });
}

/** Where a full jump from where she stands would take her, at the speed she has, as dots until it comes down. */
export function arcOf(s: ClimbState): Pt[] {
    const copy = structuredClone(s.r),
        m = movesOf(s.who),
        c = courseOf(s),
        pts: Pt[] = [];
    const dir: -1 | 0 | 1 = Math.abs(copy.vx) > 0.5 ? (copy.vx > 0 ? 1 : -1) : 0;
    stepRunner(copy, { run: dir, jump: true, jumped: true }, c, m, DT);
    for (let n = 1; n < RATE * 1.4; n++) {
        const ran = stepRunner(copy, { run: dir, jump: true, jumped: false }, c, m, DT);
        if (n % 4 === 0) pts.push({ x: copy.x, y: copy.y - 1.1 });
        if (ran.includes("landed") || copy.y > s.L.h) break;
    }
    return pts;
}

const LOOKS: Record<
    Scene,
    {
        far: string;
        farParams: Record<string, unknown>;
        near?: string;
        nearParams?: Record<string, unknown>;
    }
> = {
    garden: {
        far: "tree",
        farParams: { fruit: 4, fallen: 0, item: "apple" },
        near: "flowers",
        nearParams: { count: 3, petals: 5 },
    },
    roofs: { far: "houses", farParams: { count: 3, windows: 2 } },
    trees: {
        far: "firs",
        farParams: { count: 3, snow: 0 },
        near: "toadstools",
        nearParams: { count: 2, spots: 4 },
    },
    tower: { far: "clocktower", farParams: {} },
    hill: { far: "windmill", farParams: {}, near: "flowers", nearParams: { count: 2, petals: 6 } },
    castle: { far: "citywalls", farParams: {} },
    market: { far: "lamppost", farParams: {} },
    clouds: { far: "cloud", farParams: { puffs: 4, rain: 0 } },
};

function backdrop(s: ClimbState, sprites: Sprite[], rest: boolean): void {
    const L = s.L,
        eye: Eye = { cam: s.cam, view: { w: 72, h: VIEW.h } },
        look = LOOKS[L.scene],
        base = L.home.y;
    sprites.push(
        ...row(
            {
                key: "cloud",
                depth: 0.15,
                base: Math.max(4, s.cam.y - 6),
                every: 16,
                stray: 4,
                z: 0,
                gaps: 0.3,
                alpha: 0.8,
                drift: rest ? 0 : L.wind ? 1.2 : 0.2,
                things: [
                    { art: "cloud", params: { puffs: 4, rain: 0 }, size: 5, often: 2 },
                    { art: "cloud", params: { puffs: 3, rain: 0 }, size: 3.6, often: 1 },
                ],
            },
            eye,
            11,
            rest ? 0 : s.steps * DT,
        ),
        ...row(
            {
                key: "far",
                depth: 0.35,
                base,
                every: 14,
                stray: 3,
                z: 1,
                gaps: 0.3,
                alpha: 0.45,
                things: [{ art: look.far, params: look.farParams, size: 6, often: 1 }],
            },
            eye,
            17,
        ),
    );
    if (look.near && look.nearParams)
        sprites.push(
            ...row(
                {
                    key: "near",
                    depth: 0.7,
                    base,
                    every: 11,
                    stray: 3,
                    z: 2,
                    gaps: 0.4,
                    alpha: 0.7,
                    things: [{ art: look.near, params: look.nearParams, size: 2.6, often: 1 }],
                },
                eye,
                23,
            ),
        );
}

/** A long ledge or block is drawn in lengths, as one drawing as wide as a world is too big to draw at once. */
function lengths(
    key: string,
    x0: number,
    x1: number,
    y: number,
    look: Look,
    deep: number,
    z: number,
): Sprite[] {
    const out: Sprite[] = [];
    for (let x = x0; x < x1 - 1e-6; x += 12) {
        const w = Math.min(12, x1 - x);
        out.push({
            key: `${key}:${x}`,
            art: "climbledge",
            params: { kind: look, w: Math.max(1, Math.round(w * 2) / 2), h: deep },
            x: x + w / 2,
            y: y + deep / 2,
            z,
            still: true,
        });
    }
    return out;
}

const FIGURE: Record<Who, (pose: string, facing: 1 | -1) => Omit<Sprite, "key" | "x" | "y">> = {
    charlie: (pose, facing) => ({
        art: "charlie",
        params: {
            pose,
            mood: "happy",
            dir: facing,
            hair: "ponytail",
            top: "glow",
            sleeves: "short",
            print: "star",
            wear: "shorts",
            bottom: "sky",
            pattern: "plain",
            feet: "shoes",
            holding: "",
        },
        size: 1.8,
    }),
    pup: (pose, facing) => ({
        art: "pupfamily",
        params: { member: "pip", pose, mood: "excited", dir: facing },
        size: 2.4,
    }),
    grownup: (pose, facing) => ({
        art: "person",
        params: {
            pose,
            age: "grownup",
            tone: 3,
            hair: "bob",
            colour: "auburn",
            top: "mint",
            wear: "trousers",
            bottom: "sky",
            dir: facing,
        },
        size: pose === "run" ? 2.1 : 1.7,
    }),
};

function climberSprites(s: ClimbState, rest: boolean): Sprite[] {
    const r = s.r;
    if (s.splash > 0) return [];
    const dress = (pose: string, facing: 1 | -1): Sprite => ({
        key: "climber",
        ...FIGURE[s.who](pose, facing),
        x: r.x,
        y: r.y,
        stand: true,
        z: 9,
    });
    return actorSprites(s.act, ACTS[s.who], dress, r.stride, rest);
}

export function climbFrame(s: ClimbState, rest = false): Frame {
    const L = s.L,
        sprites: Sprite[] = [],
        marks: Mark[] = [],
        t = rest ? 0 : s.steps * DT;
    backdrop(s, sprites, rest);
    L.blocks.forEach((b, k) =>
        sprites.push(
            ...lengths(`block:${k}`, b.x0, b.x1, b.y0, b.look, Math.min(12, b.y1 - b.y0), 4),
        ),
    );
    L.ledges.forEach((l, k) => {
        const at = ledgeAt(l, t);
        const w = l.x1 - l.x0,
            moving = l.move !== undefined;
        const squash = (s.sprung[k] ?? 99) < 0.35 ? 0.25 * (1 - (s.sprung[k] ?? 0) / 0.35) : 0;
        // a ledge longer than the drawing's widest is drawn in pieces laid end to end
        const pieces = Math.ceil(w / 12 - 1e-6),
            each = w / pieces;
        for (let n = 0; n < pieces; n++)
            sprites.push({
                key: n === 0 ? `ledge:${k}` : `ledge:${k}:${n}`,
                art: "climbledge",
                params: {
                    kind: l.look,
                    w: Math.max(1, Math.round(each * 2) / 2),
                    h: 1,
                },
                x: at.x0 + each * (n + 0.5),
                y: at.y + (l.look === "cloud" ? 1 : 0.5),
                z: 5,
                ...(moving ? {} : { still: true }),
                ...(squash ? { squash } : {}),
            });
    });
    L.ladders.forEach((d, k) =>
        sprites.push({
            key: `ladder:${k}`,
            art: "climbladder",
            params: { rungs: Math.max(2, Math.round(d.y1 - d.y0)) },
            x: d.x,
            y: (d.y0 + d.y1) / 2,
            size: 1.4,
            z: 3.5,
            still: true,
        }),
    );
    L.slots.forEach((sl, k) => {
        const button = L.ledges.findIndex(
            (l) => l.look === "button" && Math.abs((l.x0 + l.x1) / 2 - sl.x) < 1.2,
        );
        sprites.push({
            key: `slot:${k}`,
            art: "coinslot",
            params: { dropping: (s.sprung[button] ?? 99) < 0.5 },
            x: sl.x,
            y: sl.y - 0.1,
            stand: true,
            size: 2.2,
            z: 3.6,
            still: true,
        });
    });
    L.doors.forEach((d, k) => {
        const rule = s.rules[k];
        sprites.push({
            key: `door:${k}`,
            art: "climbdoor",
            params: {
                text: rule ? ruleText(rule) : "",
                open: Math.round((s.open[k] ?? 0) * 4) / 4,
            },
            x: d.x,
            y: d.y,
            stand: true,
            size: 2.4,
            z: 6,
        });
    });
    L.flags.forEach((f, k) =>
        sprites.push({
            key: `flag:${k}`,
            art: "flag",
            params: { stripes: k <= s.flag ? 4 : 2 },
            x: f.x - 0.6,
            y: f.y,
            stand: true,
            size: 2,
            z: 3,
        }),
    );
    sprites.push({
        key: "home",
        art: L.home.kind,
        params: L.home.kind === "cottage" ? { windows: 2, lit: s.won ? 1 : 0 } : { stripes: 5 },
        x: L.home.x + (L.home.kind === "cottage" ? 2 : 0),
        y: L.home.y,
        stand: true,
        size: L.home.kind === "cottage" ? 6 : 2.6,
        z: 3,
    });
    L.coins.forEach((c, k) => {
        if (s.taken[k]) return;
        sprites.push({
            key: `coin:${k}`,
            art: "climbcoin",
            params: { value: s.values[k] ?? 1 },
            x: c.x,
            y: c.y + (rest ? 0 : Math.sin(t * 3 + k) * 0.08),
            size: 0.9,
            z: 7,
        });
    });
    L.stars.forEach((p, k) => {
        if (s.stars[k]) return;
        sprites.push({
            key: `star:${k}`,
            art: "prop.star",
            params: {},
            x: p.x,
            y: p.y,
            size: 1,
            z: 7,
            ...(rest ? {} : { angle: Math.sin(t * 2) * 0.15 }),
        });
    });
    sprites.push(...climberSprites(s, rest));
    // the coins in hand, kept in the view's own corner
    sprites.push({
        key: "purse",
        art: "climbcoin",
        params: { value: 1 },
        x: 1.6,
        y: 1.6,
        size: 1.4,
        z: 50,
        fixed: true,
    });
    marks.push({ kind: "word", x: 4.6, y: 1.9, text: `${s.coins}`, size: 1.1, fixed: true });
    if (L.stars.length && s.stars.some(Boolean))
        marks.push({
            kind: "word",
            x: VIEW.w - 2.5,
            y: 1.9,
            text: "star!",
            size: 0.8,
            fixed: true,
        });
    const show = L.preview === "always" || (L.preview === "holding" && s.above);
    if (show && !rest && grounded(s.r) && !s.won && s.splash <= 0)
        marks.push({ kind: "dots", pts: arcOf(s), faint: true });
    return {
        sprites,
        marks,
        camera: { ...s.cam },
        focus: { x: s.r.x + s.r.facing * 2, y: s.r.y - 3 },
        view: { ...VIEW },
        world: { w: L.w, h: L.h },
        time: t,
        water: pits(L).map(([x0, x1]) => ({
            x: x0,
            w: x1 - x0,
            level: L.h - 1.5,
            bottom: L.h + 3,
            waves: 0.08,
            z: 2,
        })),
    };
}

/** Where the water shows: past both ends, and in every gap the ground leaves down to the bottom. */
function pits(L: ClimbLevel): [number, number][] {
    const grounds = L.blocks
        .filter((b) => b.y1 >= L.h)
        .map((b): [number, number] => [b.x0, b.x1])
        .toSorted((a, b) => a[0] - b[0]);
    const out: [number, number][] = [];
    let x = -BEYOND;
    for (const [x0, x1] of grounds) {
        if (x0 > x) out.push([x, x0]);
        x = Math.max(x, x1);
    }
    out.push([x, L.w + BEYOND]);
    return out;
}

function say(s: ClimbState): string {
    const r = s.r,
        L = s.L,
        name = STATS[s.who].name;
    if (s.won) return s.said;
    const parts = [
        `${name} is ${r.state === "climb" ? "on a ladder" : grounded(r) ? "standing" : "in the air"}, ${Math.round(L.home.x - r.x)} squares from the end, with ${s.coins} coins.`,
    ];
    const next = L.doors.findIndex((d, k) => !s.opening[k] && d.x > r.x);
    const rule = s.rules[next];
    if (rule) parts.push(`The next door wants ${ruleWords(rule)}.`);
    const coins = L.coins.filter((c, k) => !s.taken[k] && c.x > r.x).length;
    if (coins) parts.push(`${coins} coins lie ahead.`);
    return parts.join(" ");
}

const SOUNDS: Kit = {
    lift: [
        { wave: "triangle", hz: 330, to: 660, attack: 0.005, decay: 0.16, gain: 0.3 },
        { wave: "sine", hz: 660, to: 990, attack: 0.01, decay: 0.12, gain: 0.12, delay: 0.03 },
    ],
    ring: [
        { wave: "sine", hz: 1320, attack: 0.003, decay: 0.18, gain: 0.25 },
        { wave: "sine", hz: 1980, attack: 0.003, decay: 0.22, gain: 0.14, delay: 0.05 },
    ],
    level: [
        { wave: "triangle", hz: 523, attack: 0.005, decay: 0.3, gain: 0.3 },
        { wave: "triangle", hz: 659, attack: 0.005, decay: 0.3, gain: 0.26, delay: 0.1 },
        { wave: "triangle", hz: 784, attack: 0.005, decay: 0.45, gain: 0.24, delay: 0.2 },
    ],
    place: [{ wave: "noise", hz: 700, attack: 0.002, decay: 0.05, gain: 0.25 }],
    bump: [
        { wave: "sine", hz: 160, to: 90, attack: 0.002, decay: 0.12, gain: 0.35 },
        { wave: "noise", hz: 500, attack: 0.002, decay: 0.07, gain: 0.2 },
    ],
    back: [
        { wave: "sine", hz: 880, to: 440, attack: 0.003, decay: 0.2, gain: 0.25 },
        { wave: "noise", hz: 1800, attack: 0.04, decay: 0.08, gain: 0.12, delay: 0.08 },
    ],
    nope: [{ wave: "triangle", hz: 300, to: 220, attack: 0.01, decay: 0.25, gain: 0.25 }],
    splash: [
        { wave: "noise", hz: 1400, attack: 0.005, decay: 0.4, gain: 0.5 },
        { wave: "sine", hz: 220, to: 90, attack: 0.005, decay: 0.3, gain: 0.3 },
    ],
    win: [
        { wave: "triangle", hz: 523, attack: 0.005, decay: 0.18, gain: 0.4 },
        { wave: "triangle", hz: 659, attack: 0.005, decay: 0.18, gain: 0.36, delay: 0.14 },
        { wave: "triangle", hz: 784, attack: 0.005, decay: 0.2, gain: 0.34, delay: 0.28 },
        { wave: "triangle", hz: 1047, attack: 0.005, decay: 0.5, gain: 0.32, delay: 0.42 },
    ],
};

/** Who climbs next when the picker is pressed. */
export function nextWho(s: ClimbState): void {
    const k = WHO.indexOf(s.who);
    s.who = WHO[(k + 1) % WHO.length] ?? "charlie";
    s.act = actor<Act>("stand", ACTS[s.who].stand.poses[0], s.r.facing);
    s.said = `${STATS[s.who].name} climbs now: ${
        s.who === "pup"
            ? "a pup jumps higher"
            : s.who === "grownup"
              ? "a grown-up runs faster"
              : "Charlie is quick and light"
    }.`;
}

export const climbGame: ActionGame<ClimbState> = {
    id: "climb",
    title: "Charlie's climb",
    group: "action",
    levels: CLIMB_LEVELS,
    rate: RATE,
    touch: true,
    quiet: true,
    sounds: SOUNDS,
    card: { round: { level: 0 }, keep: 24, minutes: 2 },
    portrait: { keep: 22 },
    cover: { art: "climbcover", params: {} },
    hint: "Hold left or right to run and space or up to jump, held longer for higher; down drops through a ledge. On the field, hold a finger where she should go, above her to jump. C changes who climbs.",
    controls: {
        arrows: { left: "Run left", right: "Run right", up: "Climb up", down: "Drop down" },
        go: "Jump",
        icons: { go: "launch" },
    },
    commands: [{ id: "who", label: "Who climbs", key: "c", icon: "who" }],
    command: (s, id) => {
        if (id === "who") nextWho(s);
    },
    start: (phase, seed) => startClimb(phase, seed === undefined ? 0 : seed - 1),
    step: stepClimb,
    frame: climbFrame,
    say,
    note: (s) => s.said,
    won: (s) => s.won,
    objectives: (s) => {
        const p = progress(s.goal);
        return { completed: p.completed, total: p.total };
    },
    cancelInput: (s) => {
        s.touchFrom = -1;
        s.above = false;
    },
    hum: (s) => [{ kind: "wind", level: s.L.wind ? 0.25 : grounded(s.r) ? 0.04 : 0.1 }],
    tuning: CLIMB,
    still: {
        press: () => Math.round(RATE * 0.35),
        settling: (s) => (!grounded(s.r) && s.r.state !== "climb") || s.splash > 0,
    },
};
