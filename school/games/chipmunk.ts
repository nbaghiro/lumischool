// Nutmeg's winter store: a chipmunk gathers acorns before the first snow, in a wood cut away like an
// ant farm, with the trees and the stream above and the burrow's tunnels and rooms below.
//
// Nutmeg runs and jumps as Charlie does in her climb, and shakes a tree from its trunk by degrees:
// short shakes drop the loosest acorns close by, a long hard one drops many and throws them wide,
// where some roll into the stream. Running over food stuffs it into her cheeks, which hold six, and
// the load slows her and shortens her jump. A cheekful taken onto the burrow's door goes down it, and
// standing still in a room empties her cheeks into it; Action takes one back from a room with too
// many. The rooms say what they want: a number, an equal share, a half, a double. A squirrel takes food left lying and a hawk's shadow makes her drop
// what she carries, and neither loses anything for good. The nuts are engine/motion/forage.ts and the
// running the runner of engine/motion/walker.ts. See .docs/games.md.
import {
    actor,
    actorSprites,
    land,
    stepActor,
    type Actor,
    type Cycle,
} from "../../engine/motion/actor";
import { follow, type Cam } from "../../engine/motion/camera";
import {
    FORAGE,
    laden,
    loosen,
    stepNuts,
    stepShake,
    type Bump,
    type Nut,
    type Shake,
    type Wood,
} from "../../engine/motion/forage";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import {
    course,
    standingOn,
    type Block,
    type Ledge,
    type Place,
    type Rung,
} from "../../engine/motion/platforms";
import type { Frame, Happening, Mark, Sprite, Water } from "../../engine/motion/scene";
import { seeded } from "../../engine/motion/spawn";
import { knob } from "../../engine/motion/tune";
import {
    grounded,
    runner,
    seek,
    stepRunner,
    type Course,
    type Intent,
    type Moves,
    type Runner,
} from "../../engine/motion/walker";
import { bounce } from "../../engine/motion/guide";
import { panOf, semitones, type Hum, type Kit } from "../../engine/sound/kit";
import { BEYOND, row, type Eye } from "./scenery";
import type { ActionGame, ActionLevel, Levels, RoundEnd } from "./game";

export const RATE = 60;
const DT = 1 / RATE;
const VIEW = { w: 24, h: 15 };
/** The top of the ground, and how tall a tunnel is inside. */
export const G = 12;
const TUNNEL = 2.5;
/** How many places the cheeks hold: an acorn takes one and a pinecone three. */
export const CHEEKS = 6;
/** Half the width of a burrow's door and the shaft under it. */
const DOOR = 1;
const WATER = G + 1.2;
/** How far from a trunk she can stand and still shake the tree from the ground. */
const REACH = 1.4;
/** Seconds standing still in a room before her cheeks empty into it by themselves. */
const SETTLE = 0.18;
/** Steps of standing idle before the guide's arrow shows on a level that waits for it. */
const GUIDE_WAIT = RATE * 4;

export const CHIP = {
    gravity: knob(45, 30, 70, 1, "squares a second, each second", "the climb's springy jump"),
    jump: knob(
        3.1,
        2,
        4,
        0.1,
        "squares",
        "an empty-cheeked jump clears the low branch of the first oak; a full one does not",
    ),
    speed: knob(6.5, 4, 9, 0.1, "squares a second", "a quick scurry, a little slower than Charlie"),
};

export const movesOf = (load: number): Moves =>
    laden(
        {
            speed: CHIP.speed.value,
            accel: 46,
            airAccel: 28,
            gravity: CHIP.gravity.value,
            jump: CHIP.jump.value,
            cut: 1.5,
            coyote: 0.12,
            buffer: 0.14,
            step: 0.35,
            fall: 24,
            climb: 5,
            pace: 0.8,
            height: 1.1,
        },
        load,
        CHEEKS,
    );

export type Food = "acorn" | "pinecone";
export const PLACES: Record<Food, number> = { acorn: 1, pinecone: 3 };

export interface Tree {
    x: number;
    kind: "oak" | "fir";
    /** The branch the trunk is climbed to and shaken. */
    branch: { x0: number; x1: number; y: number };
    nuts: number;
}

export interface Stream {
    x0: number;
    x1: number;
    stones: { x0: number; x1: number }[];
}

/** A tunnel's floor from `x0` to `x1` at `y`, reached by the shaft under its door at `door`. */
export interface Tunnel {
    x0: number;
    x1: number;
    y: number;
    door: number;
    flooded?: true;
}

export interface Room {
    tunnel: number;
    x0: number;
    x1: number;
}

/** What the board keeps a tally of: the store as a sum, each room's count, or the trips made. */
export type Tally = "sum" | "rooms" | "trips";

export type Scene = "garden" | "oaks" | "stream" | "patch" | "windy" | "meadow" | "rain" | "snow";

export interface ChipLevel extends ActionLevel {
    scene: Scene;
    w: number;
    h: number;
    start: Pt;
    ground: { x0: number; x1: number }[];
    streams: Stream[];
    trees: Tree[];
    tunnels: Tunnel[];
    rooms: Room[];
    /** Hollow logs to hide in, by the middle of each and its length. */
    logs: { x: number; w: number }[];
    tally: Tally;
    /** How much help shows: 3 the arrow at once, the jump's arc over a stream, the shake's ring and the rooms' words; 2 the step strip, the arrow after a wait, the ring and the words; 1 the words; 0 none. */
    help: 0 | 1 | 2 | 3;
    wind?: number;
    squirrel?: { home: number };
    hawk?: { every: number; first: number };
    /** Seconds of autumn before the first snow, or left out for no clock. */
    time?: number;
    /** Charlie watching from the garden fence. */
    charlie?: number;
    /** Hazel's room, by its place in the list. */
    hazel: number;
    free?: true;
    variants: Variant[];
}

export interface Variant {
    /** What each room wants in all, counted as acorns at one and pinecones at five; nought for free play. */
    needs: number[];
    /** What each room holds already, in acorns. */
    has?: number[];
    /** The words over each room. */
    labels: string[];
    ask: string;
}

const branchOf = (x: number, half: number, y: number) => ({ x0: x - half, x1: x + half, y });

export const CHIP_LEVELS: Levels<ChipLevel> = [
    {
        title: "The garden fence",
        grades: [1, 1],
        goal: "Shake the oak, pick up the acorns, and take them into the burrow.",
        scene: "garden",
        w: 34,
        h: 19,
        start: { x: 8, y: G },
        ground: [{ x0: 0, x1: 34 }],
        streams: [],
        trees: [{ x: 13, kind: "oak", branch: branchOf(13, 4, G - 2.7), nuts: 9 }],
        tunnels: [{ x0: 19.5, x1: 30, y: 16, door: 22 }],
        rooms: [{ tunnel: 0, x0: 23.5, x1: 29.5 }],
        logs: [],
        tally: "sum",
        help: 3,
        charlie: 2.5,
        hazel: 0,
        variants: [
            { needs: [6], labels: ["6"], ask: "Fill the store with 6 acorns." },
            { needs: [5], labels: ["5"], ask: "Fill the store with 5 acorns." },
            { needs: [7], labels: ["7"], ask: "Fill the store with 7 acorns." },
        ],
    },
    {
        title: "The oak wood",
        grades: [1, 2],
        goal: "Two oaks, two rooms: fill each room with the number over it.",
        scene: "oaks",
        w: 52,
        h: 19,
        start: { x: 24, y: G },
        ground: [{ x0: 0, x1: 52 }],
        streams: [],
        trees: [
            { x: 9, kind: "oak", branch: branchOf(9, 4, G - 4), nuts: 8 },
            { x: 43, kind: "oak", branch: branchOf(43, 4, G - 4), nuts: 8 },
        ],
        tunnels: [{ x0: 18, x1: 34, y: 16, door: 26 }],
        rooms: [
            { tunnel: 0, x0: 18.5, x1: 23 },
            { tunnel: 0, x0: 29, x1: 33.5 },
        ],
        logs: [],
        tally: "rooms",
        help: 3,
        hazel: 1,
        variants: [
            { needs: [5, 7], labels: ["5", "7"], ask: "Fill one room with 5, the other with 7." },
            { needs: [4, 8], labels: ["4", "8"], ask: "Fill one room with 4, the other with 8." },
            { needs: [6, 6], labels: ["6", "6"], ask: "Fill both rooms with 6 each." },
        ],
    },
    {
        title: "The stream crossing",
        grades: [1, 2],
        goal: "The oaks are over the stream. Full cheeks are heavy: carry fewer to make the long jump.",
        scene: "stream",
        w: 64,
        h: 19,
        start: { x: 14, y: G },
        ground: [
            { x0: 0, x1: 24 },
            { x0: 36, x1: 64 },
        ],
        streams: [
            {
                x0: 24,
                x1: 36,
                stones: [
                    { x0: 26.5, x1: 28.5 },
                    { x0: 31.8, x1: 33.8 },
                ],
            },
        ],
        trees: [
            { x: 45, kind: "oak", branch: branchOf(45, 4, G - 4), nuts: 8 },
            { x: 56, kind: "oak", branch: branchOf(56, 3.5, G - 4), nuts: 7 },
        ],
        tunnels: [{ x0: 3, x1: 21, y: 16, door: 13 }],
        rooms: [
            { tunnel: 0, x0: 3.5, x1: 8 },
            { tunnel: 0, x0: 16, x1: 20.5 },
        ],
        logs: [],
        tally: "rooms",
        help: 3,
        time: 300,
        hazel: 1,
        variants: [
            {
                needs: [4, 8],
                has: [4, 0],
                labels: ["Nutmeg's", "double"],
                ask: "Hazel wants double Nutmeg's room.",
            },
            {
                needs: [3, 6],
                has: [3, 0],
                labels: ["Nutmeg's", "double"],
                ask: "Hazel wants double Nutmeg's room.",
            },
            {
                needs: [5, 10],
                has: [5, 0],
                labels: ["Nutmeg's", "double"],
                ask: "Hazel wants double Nutmeg's room.",
            },
        ],
    },
    {
        title: "The squirrel's patch",
        grades: [2, 3],
        goal: "Share the acorns equally between the three rooms. A squirrel takes what is left lying: run at it and it drops them.",
        scene: "patch",
        w: 62,
        h: 19,
        start: { x: 30, y: G },
        ground: [{ x0: 0, x1: 62 }],
        streams: [],
        trees: [
            { x: 12, kind: "oak", branch: branchOf(12, 4.5, G - 4), nuts: 11 },
            { x: 47, kind: "oak", branch: branchOf(47, 4.5, G - 4), nuts: 11 },
        ],
        tunnels: [{ x0: 17, x1: 43, y: 16, door: 30 }],
        rooms: [
            { tunnel: 0, x0: 17.5, x1: 22.5 },
            { tunnel: 0, x0: 23.5, x1: 28.2 },
            { tunnel: 0, x0: 33, x1: 38 },
        ],
        logs: [],
        tally: "rooms",
        help: 2,
        squirrel: { home: 59 },
        time: 360,
        hazel: 2,
        variants: [
            {
                needs: [6, 6, 6],
                labels: ["?", "?", "?"],
                ask: "Share 18 acorns equally in 3 rooms.",
            },
            {
                needs: [5, 5, 5],
                labels: ["?", "?", "?"],
                ask: "Share 15 acorns equally in 3 rooms.",
            },
            {
                needs: [4, 4, 4],
                labels: ["?", "?", "?"],
                ask: "Share 12 acorns equally in 3 rooms.",
            },
        ],
    },
    {
        title: "A windy day",
        grades: [2, 3],
        goal: "Store a big pile, a cheekful of 6 at a time: how many trips will it take? The wind blows the acorns as they fall.",
        scene: "windy",
        w: 64,
        h: 19,
        start: { x: 30, y: G },
        ground: [{ x0: 0, x1: 64 }],
        streams: [],
        trees: [
            { x: 10, kind: "oak", branch: branchOf(10, 4.5, G - 4), nuts: 12 },
            { x: 44, kind: "oak", branch: branchOf(44, 4.5, G - 4), nuts: 12 },
            { x: 56, kind: "oak", branch: branchOf(56, 3.5, G - 3.6), nuts: 10 },
        ],
        tunnels: [{ x0: 20, x1: 38, y: 16, door: 27 }],
        rooms: [{ tunnel: 0, x0: 29.5, x1: 37.5 }],
        logs: [],
        tally: "trips",
        help: 2,
        wind: 2.2,
        time: 420,
        hazel: 0,
        variants: [
            {
                needs: [30],
                labels: ["30"],
                ask: "Store 30 acorns, 6 at a time.",
            },
            {
                needs: [24],
                labels: ["24"],
                ask: "Store 24 acorns, 6 at a time.",
            },
            {
                needs: [18],
                labels: ["18"],
                ask: "Store 18 acorns, 6 at a time.",
            },
        ],
    },
    {
        title: "The hawk meadow",
        grades: [2, 3],
        goal: "Acorns count 1 and pinecones 5. When the hawk cries, hide in a log or the burrow.",
        scene: "meadow",
        w: 60,
        h: 19,
        start: { x: 28, y: G },
        ground: [{ x0: 0, x1: 60 }],
        streams: [],
        trees: [
            { x: 10, kind: "fir", branch: branchOf(10, 3.5, G - 4), nuts: 5 },
            { x: 48, kind: "oak", branch: branchOf(48, 4.5, G - 4), nuts: 11 },
        ],
        tunnels: [{ x0: 24, x1: 38, y: 16, door: 29 }],
        rooms: [{ tunnel: 0, x0: 31.5, x1: 37.5 }],
        logs: [
            { x: 18, w: 3 },
            { x: 39, w: 3 },
        ],
        tally: "sum",
        help: 1,
        hawk: { every: 17, first: 12 },
        time: 420,
        hazel: 0,
        variants: [
            { needs: [23], labels: ["23"], ask: "Acorns 1, pinecones 5: store 23." },
            { needs: [17], labels: ["17"], ask: "Acorns 1, pinecones 5: store 17." },
            { needs: [26], labels: ["26"], ask: "Acorns 1, pinecones 5: store 26." },
        ],
    },
    {
        title: "A rainy day",
        grades: [3, 4],
        goal: "Store half the acorns in one room and a quarter in each of the others. The deep tunnel has flooded, so use the rooms above it.",
        scene: "rain",
        w: 58,
        h: 23,
        start: { x: 27, y: G },
        ground: [{ x0: 0, x1: 58 }],
        streams: [],
        trees: [
            { x: 9, kind: "oak", branch: branchOf(9, 4.5, G - 4), nuts: 11 },
            { x: 48, kind: "oak", branch: branchOf(48, 4.5, G - 4), nuts: 11 },
        ],
        tunnels: [
            { x0: 14, x1: 41.5, y: 16, door: 22 },
            { x0: 24, x1: 40, y: 20.5, door: 28.5, flooded: true },
        ],
        rooms: [
            { tunnel: 0, x0: 14.5, x1: 19.5 },
            { tunnel: 0, x0: 30, x1: 35.2 },
            { tunnel: 0, x0: 36, x1: 41.2 },
        ],
        logs: [],
        tally: "rooms",
        help: 1,
        time: 420,
        hazel: 2,
        variants: [
            {
                needs: [8, 4, 4],
                labels: ["half", "a quarter", "a quarter"],
                ask: "16 acorns: a half, a quarter, a quarter.",
            },
            {
                needs: [6, 3, 3],
                labels: ["half", "a quarter", "a quarter"],
                ask: "12 acorns: a half, a quarter, a quarter.",
            },
            {
                needs: [10, 5, 5],
                labels: ["half", "a quarter", "a quarter"],
                ask: "20 acorns: a half, a quarter, a quarter.",
            },
        ],
    },
    {
        title: "The first snow",
        grades: [3, 4],
        goal: "Snow is coming soon. Pinecones count 5. Fill one room, then double it in the other.",
        scene: "snow",
        w: 58,
        h: 19,
        start: { x: 30, y: G },
        ground: [{ x0: 0, x1: 58 }],
        streams: [],
        trees: [
            { x: 10, kind: "fir", branch: branchOf(10, 3.5, G - 4), nuts: 4 },
            { x: 20, kind: "oak", branch: branchOf(20, 3.5, G - 4), nuts: 9 },
            { x: 47, kind: "oak", branch: branchOf(47, 4.5, G - 4), nuts: 11 },
        ],
        tunnels: [{ x0: 26, x1: 43, y: 16, door: 33 }],
        rooms: [
            { tunnel: 0, x0: 26.5, x1: 31 },
            { tunnel: 0, x0: 36, x1: 42.5 },
        ],
        logs: [{ x: 39, w: 3 }],
        tally: "rooms",
        help: 0,
        hawk: { every: 22, first: 18 },
        time: 300,
        hazel: 1,
        variants: [
            {
                needs: [9, 18],
                labels: ["9", "double"],
                ask: "9 in one room, double that in the other.",
            },
            {
                needs: [8, 16],
                labels: ["8", "double"],
                ask: "8 in one room, double that in the other.",
            },
            {
                needs: [7, 14],
                labels: ["7", "double"],
                ask: "7 in one room, double that in the other.",
            },
        ],
    },
    {
        title: "The free woodland",
        grades: [1, 4],
        goal: "Gather as much as you like. Your store is kept for next time.",
        scene: "oaks",
        w: 56,
        h: 19,
        start: { x: 27, y: G },
        ground: [{ x0: 0, x1: 56 }],
        streams: [],
        trees: [
            { x: 9, kind: "oak", branch: branchOf(9, 4.5, G - 4), nuts: 10 },
            { x: 45, kind: "fir", branch: branchOf(45, 3.5, G - 4), nuts: 4 },
            { x: 52, kind: "oak", branch: branchOf(52, 3, G - 3.4), nuts: 7 },
        ],
        tunnels: [{ x0: 17, x1: 39, y: 16, door: 28 }],
        rooms: [
            { tunnel: 0, x0: 17.5, x1: 22.5 },
            { tunnel: 0, x0: 30, x1: 34 },
            { tunnel: 0, x0: 34.8, x1: 38.8 },
        ],
        logs: [{ x: 36, w: 3 }],
        tally: "sum",
        help: 3,
        hazel: 1,
        free: true,
        variants: [
            { needs: [0, 0, 0], labels: ["", "", ""], ask: "Gather as much as you like." },
            { needs: [0, 0, 0], labels: ["", "", ""], ask: "Fill the burrow for winter." },
        ],
    },
];

export const variantOf = (L: ChipLevel, n: number): Variant =>
    L.variants[((n % L.variants.length) + L.variants.length) % L.variants.length] ??
    L.variants[0] ?? { needs: [], labels: [], ask: "" };

type Act = "stand" | "run" | "rise" | "fall" | "climb" | "shake" | "spit" | "hide" | "cheer";

const ACTS: Record<Act, Cycle> = {
    stand: { poses: ["stand", "sit"], every: 1.6 },
    run: { poses: ["run", "leap"], per: 0.5 },
    rise: { poses: ["leap"] },
    fall: { poses: ["leap"] },
    climb: { poses: ["climb"] },
    shake: { poses: ["shake", "stand"], every: 0.09 },
    spit: { poses: ["spit"] },
    hide: { poses: ["hide"] },
    cheer: { poses: ["cheer", "stand"], every: 0.35 },
};

export interface Store {
    acorns: number;
    pinecones: number;
}

export const worth = (r: Store): number => r.acorns + r.pinecones * 5;

interface Squirrel {
    x: number;
    mode: "wait" | "sneak" | "carry" | "flee";
    wait: number;
    /** The nut it is going for, and the ones it carries, by their places in the list. */
    after: number;
    carry: number[];
    facing: 1 | -1;
}

/** A bit of food tumbling from her mouth into a room's pile, for the eye. */
interface Tumble {
    room: number;
    t: number;
    n: number;
}

export interface ChipState {
    phase: number;
    variant: number;
    L: ChipLevel;
    V: Variant;
    r: Runner;
    act: Actor<Act>;
    steps: number;
    nuts: Nut[];
    kinds: Food[];
    /** Where each nut hung, for a branch that grows them back in free play. */
    spots: Pt[];
    shakes: Shake[];
    /** What is in her cheeks, in the order it went in, with the nut each was, or -1 for one taken from a store. */
    cheeks: { food: Food; nut: number }[];
    /** Nuts just spat out, not picked up again until she has moved off them. */
    spat: number[];
    rooms: Store[];
    trips: number;
    /** The tree whose branch she is shaking this step, or -1. */
    shaking: number;
    /** Seconds of shake left from a press of the Shake button. */
    pulse: number;
    lastCreak: number;
    /** Set from a drop through a door until she lands, so a dive falls rather than climbs down. */
    diving: boolean;
    splash: number;
    safe: Pt;
    /** Seconds she is startled for, after the hawk's shadow caught her in the open. */
    fright: number;
    hawk: { next: number; x: number | null } | null;
    squirrel: Squirrel | null;
    tumbles: Tumble[];
    above: boolean;
    touchFrom: number;
    /** Where a tap sent her, whether to empty her cheeks on getting there, and whether to shake the tree there. */
    goto: { x: number; act: boolean; shake?: true; tree?: number } | null;
    /** Down into the burrow by its door, or up out of it, as a tap on the hole or a press asks. */
    route: "in" | "out" | null;
    /** The room a tap asked for from above ground, reached once she is down, or -1. */
    routeRoom: number;
    /** The step she last came up out of the burrow, so she is not taken straight back down. */
    cameUp: number;
    /** Seconds standing still in a room with food in her cheeks. */
    stillFor: number;
    /** The room her cheeks last emptied into or took one back from, so they do not empty there again until she moves. */
    settledIn: number;
    /** The guide's step to do, and the step it last changed. */
    stepNow: number;
    stepAt: number;
    /** The warnings given once: the squirrel's and the hawk's. */
    warned: string[];
    cam: Cam;
    time: number;
    won: boolean;
    wonAt: number;
    out: boolean;
    said: string;
    /** A thing said once until it changes: the full cheeks, a room's count, a shut door. */
    told: string;
}

export const placesOf = (cheeks: readonly { food: Food }[]): number =>
    cheeks.reduce((n, c) => n + PLACES[c.food], 0);

const loadOf = (s: ChipState): number => placesOf(s.cheeks);

/** Every solid stretch of the level: the earth under the ground with the tunnels and shafts cut out of it, the stream's bed and its stones. */
function blocksOf(L: ChipLevel): Block[] {
    const deep = L.h + 6;
    const open = L.tunnels.flatMap((t, k) => {
        const above = k === 0 ? G : (L.tunnels[k - 1]?.y ?? G);
        return [
            { x0: t.x0, x1: t.x1, y0: t.y - TUNNEL, y1: t.y },
            { x0: t.door - DOOR, x1: t.door + DOOR, y0: above, y1: t.y - TUNNEL },
        ];
    });
    const cuts = [
        ...new Set([G, deep, ...open.flatMap((o) => [o.y0, o.y1])].filter((y) => y >= G)),
    ].toSorted((a, b) => a - b);
    const out: Block[] = [];
    for (let i = 0; i + 1 < cuts.length; i++) {
        const y0 = cuts[i] ?? G,
            y1 = cuts[i + 1] ?? deep;
        const gaps = open
            .filter((o) => o.y0 <= y0 + 1e-6 && o.y1 >= y1 - 1e-6)
            .map((o): [number, number] => [o.x0, o.x1])
            .toSorted((a, b) => a[0] - b[0]);
        for (const g of L.ground) {
            let x = g.x0;
            for (const [a, b] of gaps) {
                if (b <= x || a >= g.x1) continue;
                if (a > x) out.push({ x0: x, x1: a, y0, y1 });
                x = Math.max(x, b);
            }
            if (x < g.x1) out.push({ x0: x, x1: g.x1, y0, y1 });
        }
    }
    // the world's ends are walls, so she never runs off the edge of the wood
    out.push({ x0: -8, x1: 0, y0: -30, y1: deep }, { x0: L.w, x1: L.w + 8, y0: -30, y1: deep });
    for (const st of L.streams) {
        out.push({ x0: st.x0, x1: st.x1, y0: G + 3, y1: deep });
        for (const stone of st.stones) out.push({ x0: stone.x0, x1: stone.x1, y0: G, y1: G + 3 });
    }
    return out;
}

/** The branches first, by their tree's place, then a lip over each door. */
function ledgesOf(L: ChipLevel): Ledge[] {
    return [
        ...L.trees.map((t) => ({ ...t.branch, oneWay: true })),
        ...L.tunnels.map((t, k) => ({
            x0: t.door - DOOR,
            x1: t.door + DOOR,
            y: k === 0 ? G : (L.tunnels[k - 1]?.y ?? G),
            oneWay: true,
        })),
    ];
}

const laddersOf = (L: ChipLevel): Rung[] => [
    ...L.trees.map((t) => ({ x: t.x, y0: t.branch.y, y1: G })),
    ...L.tunnels.map((t, k) => ({
        x: t.door,
        y0: k === 0 ? G : (L.tunnels[k - 1]?.y ?? G),
        y1: t.y,
    })),
];

const PLACE = new WeakMap<ChipLevel, { place: Place; course: Course; wood: Wood }>();

/** The level as the runner and the nuts move through it, worked out once for each level. */
export function worldOf(L: ChipLevel): { place: Place; course: Course; wood: Wood } {
    const known = PLACE.get(L);
    if (known) return known;
    const blocks = blocksOf(L),
        ledges = ledgesOf(L);
    const place: Place = { ledges, blocks, ladders: laddersOf(L) };
    // the nuts fall through the branches, and land on the ground, the stones and the lips over the doors
    const under = course({ ledges: ledges.slice(L.trees.length), blocks, ladders: [] }, 0);
    const bumps: Bump[] = L.trees.flatMap((t) => [
        { x: t.x - 0.9, y: G + 0.05, r: 0.3 },
        { x: t.x + 0.9, y: G + 0.05, r: 0.3 },
    ]);
    const wood: Wood = {
        floor: (x, from, to) => under.floor(x, from, to)?.y ?? null,
        solid: (x, y) => under.solid?.(x, y) ?? false,
        bumps,
        water: [
            ...L.streams.map((st) => ({ x0: st.x0, x1: st.x1, level: WATER })),
            ...L.tunnels
                .filter((t) => t.flooded)
                .map((t) => ({ x0: t.x0, x1: t.x1, level: t.y - TUNNEL * 0.55 })),
        ],
        wind: L.wind ?? 0,
    };
    const out = { place, course: course(place, 0), wood };
    PLACE.set(L, out);
    return out;
}

const courseOf = (s: ChipState): Course => worldOf(s.L).course;

/** The tunnel she is in by the height of her feet, or -1 above ground. */
export function tunnelAt(s: ChipState, p: Pt = s.r): number {
    if (p.y <= G + 0.3) return -1;
    return s.L.tunnels.findIndex((t) => p.y <= t.y + 0.3 && p.y > t.y - TUNNEL - 0.3);
}

/** The room she stands in, or -1. */
export function roomAt(s: ChipState, p: Pt = s.r): number {
    const k = tunnelAt(s, p);
    if (k < 0) return -1;
    const t = s.L.tunnels[k];
    if (!t || Math.abs(p.y - t.y) > 0.3) return -1;
    return s.L.rooms.findIndex((m) => m.tunnel === k && p.x >= m.x0 - 0.3 && p.x <= m.x1 + 0.3);
}

/** The tree whose branch she stands on, or -1. */
export function branchAt(s: ChipState): number {
    if (!grounded(s.r)) return -1;
    const on = standingOn(worldOf(s.L).place, s.r.x, s.r.y, 0);
    return on >= 0 && on < s.L.trees.length ? on : -1;
}

/** The water she has fallen into, if any: a stream's, or a flooded tunnel's. */
function inWater(s: ChipState): boolean {
    return worldOf(s.L).wood.water.some(
        (w) => s.r.x >= w.x0 && s.r.x <= w.x1 && s.r.y > w.level + 0.2,
    );
}

/** Hidden from the hawk: in the burrow, or inside a hollow log on the ground. */
export function hidden(s: ChipState): boolean {
    if (s.r.y > G + 0.3) return true;
    return (
        Math.abs(s.r.y - G) < 0.1 && s.L.logs.some((l) => Math.abs(s.r.x - l.x) <= l.w / 2 - 0.2)
    );
}

function nutsOf(L: ChipLevel, phase: number, variant: number) {
    const rand = seeded(9301 + phase * 7919 + variant * 104729);
    const nuts: Nut[] = [],
        kinds: Food[] = [],
        spots: Pt[] = [];
    L.trees.forEach((t, k) => {
        const n = t.nuts,
            grips = Array.from(
                { length: n },
                (_, i) => 0.03 + i * (t.kind === "fir" ? 0.1 : 0.055),
            );
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            const a = grips[i] ?? 0;
            grips[i] = grips[j] ?? 0;
            grips[j] = a;
        }
        const span = t.branch.x1 - t.branch.x0 - 1;
        for (let i = 0; i < n; i++) {
            let x = t.branch.x0 + 0.5 + ((i + 0.5) / n) * span;
            // none hangs in front of the trunk, where she climbs
            if (Math.abs(x - t.x) < 0.6) x = t.x + (x < t.x ? -0.6 : 0.6);
            const y = t.branch.y + (t.kind === "fir" ? 1.25 : 1.1);
            nuts.push({
                x,
                y,
                vx: 0,
                vy: 0,
                at: "hang",
                grip: grips[i] ?? 0.1,
                branch: k,
                lean: Math.max(
                    -1,
                    Math.min(1, (x - t.x) / Math.max(1, span / 2) + (rand() - 0.5) * 0.6),
                ),
                turn: 0,
                age: 0,
            });
            kinds.push(t.kind === "fir" ? "pinecone" : "acorn");
            spots.push({ x, y });
        }
    });
    return { nuts, kinds, spots };
}

export function startChip(phase: number, variant = 0): ChipState {
    const L = CHIP_LEVELS[phase] ?? CHIP_LEVELS[0];
    const V = variantOf(L, variant);
    const { nuts, kinds, spots } = nutsOf(L, phase, variant);
    return {
        phase,
        variant,
        L,
        V,
        r: runner(L.start.x, L.start.y),
        act: actor<Act>("stand", "stand"),
        steps: 0,
        nuts,
        kinds,
        spots,
        shakes: L.trees.map(() => ({ strength: 0, energy: 0 })),
        cheeks: [],
        spat: [],
        rooms: L.rooms.map((_, i) => ({ acorns: V.has?.[i] ?? 0, pinecones: 0 })),
        trips: 0,
        shaking: -1,
        pulse: 0,
        lastCreak: -99,
        diving: false,
        splash: 0,
        safe: { ...L.start },
        fright: 0,
        hawk: L.hawk ? { next: L.hawk.first, x: null } : null,
        squirrel: L.squirrel
            ? { x: L.squirrel.home, mode: "wait", wait: 6, after: -1, carry: [], facing: -1 }
            : null,
        tumbles: [],
        above: false,
        touchFrom: -1,
        goto: null,
        route: null,
        routeRoom: -1,
        cameUp: -RATE * 9,
        stillFor: 0,
        settledIn: -1,
        stepNow: 0,
        stepAt: 0,
        warned: L.squirrel ? ["squirrel"] : [],
        cam: { x: L.start.x, y: aboveY(L, L.start.y), zoom: 1 },
        time: 0,
        won: false,
        wonAt: 0,
        out: false,
        said: L.squirrel
            ? "A squirrel lives here. It takes acorns left lying: run at it and it drops them."
            : phase === 0
              ? "Tap the oak to run there and shake down some acorns."
              : "",
        told: "",
    };
}

const pan = (s: ChipState, x: number): number => panOf(x, s.cam.x, VIEW.w);

function cue(
    s: ChipState,
    out: Happening[],
    c:
        | "lift"
        | "place"
        | "bump"
        | "ring"
        | "level"
        | "nope"
        | "back"
        | "splash"
        | "win"
        | "creak"
        | "crash",
    strength = 0.5,
    pitch = 1,
    x = s.r.x,
): void {
    out.push({ cue: c, strength, pitch, pan: pan(s, x) });
}

/** What each room still wants, in its own worth, and whether it is right. */
export function wants(s: ChipState): number[] {
    return s.rooms.map((r, i) => (s.V.needs[i] ?? 0) - worth(r));
}

export const allRight = (s: ChipState): boolean => !s.L.free && wants(s).every((w) => w === 0);

/** The tree she can shake from where she stands: the one whose trunk she is at on the ground, or whose branch she is on, or -1. */
export function treeAt(s: ChipState): number {
    const on = branchAt(s);
    if (on >= 0) return on;
    const r = s.r;
    if (!grounded(r) || Math.abs(r.y - G) > 0.05) return -1;
    return s.L.trees.findIndex((t) => Math.abs(r.x - t.x) <= REACH);
}

const hangingOn = (s: ChipState, tree: number): number =>
    s.nuts.filter((n) => n.at === "hang" && n.branch === tree).length;

/** Whether a press of the big button shakes a tree now, rather than jumping. */
const canShake = (s: ChipState): boolean => {
    const k = treeAt(s);
    return k >= 0 && hangingOn(s, k) > 0;
};

/** The tree a point on the field is on, its crown and branch or its trunk, or -1. */
function treeUnder(s: ChipState, p: Pt): number {
    return s.L.trees.findIndex(
        (t) =>
            (Math.abs(p.x - t.x) <= (t.branch.x1 - t.branch.x0) / 2 + 0.5 &&
                p.y >= t.branch.y - 5.5 &&
                p.y <= t.branch.y + 0.6) ||
            (Math.abs(p.x - t.x) <= 0.8 && p.y > t.branch.y && p.y <= G + 0.2),
    );
}

/** A run to a tree's trunk along the ground, jumping what is in the way but never up onto its branch. */
function toTrunk(s: ChipState, k: number, c: Course, m: Moves): Intent {
    const t = s.L.trees[k],
        r = s.r;
    if (!t) return { run: 0, jump: false, jumped: false };
    const g = seek(r, t.x, c, m, 0.25);
    const under = Math.abs(r.x + g.run * 0.8 - t.x) <= (t.branch.x1 - t.branch.x0) / 2 + 0.3;
    return under && grounded(r) ? { run: g.run, jump: false, jumped: false } : g;
}

/** Whether a point on the field is on the burrow's door or the shaft under it. */
function onDoor(s: ChipState, p: Pt): boolean {
    const t = s.L.tunnels[0];
    return t !== undefined && Math.abs(p.x - t.door) <= 1.6 && p.y >= G - 2 && p.y <= t.y - TUNNEL;
}

export const cheekWorth = (s: ChipState): number =>
    s.cheeks.reduce((n, c) => n + (c.food === "pinecone" ? 5 : 1), 0);

/** What the store still wants in all, counting only the rooms short of what they want. */
const stillWanted = (s: ChipState): number => wants(s).reduce((n, w) => n + Math.max(0, w), 0);

/** Whether what she carries is a cheekful worth taking home: full cheeks, or all the store still wants. */
function homeward(s: ChipState): boolean {
    if (!s.cheeks.length) return false;
    if (loadOf(s) >= CHEEKS) return true;
    // with one room and every tree on one side of the door, the door is only ever crossed going home
    const door = s.L.tunnels[0]?.door ?? 0;
    if (
        s.L.rooms.length === 1 &&
        s.L.trees.every((t) => t.x < door) !== s.L.trees.every((t) => t.x > door)
    )
        return true;
    const need = stillWanted(s);
    return !s.L.free && need > 0 && cheekWorth(s) >= need;
}

const centreOf = (s: ChipState, room: number): number => {
    const m = s.L.rooms[room];
    return m ? (m.x0 + m.x1) / 2 : s.r.x;
};

/** The intent the hands give this step: the keys, the buttons, or a finger on the field. */
export function intentOf(s: ChipState, pad: Pad): Intent & { shake: boolean; act: boolean } {
    const r = s.r,
        m = movesOf(loadOf(s)),
        c = courseOf(s);
    // on a trunk or in a shaft she keeps climbing until her feet reach the top, past where her middle leaves it
    const onLadder = r.state === "climb" || (c.ladder?.(r.x, r.y - m.height / 2) ?? false);
    const onBranch = branchAt(s) >= 0;
    const below = tunnelAt(s) >= 0;
    // at a tree with acorns on it the big button shakes it; anywhere else it jumps
    const shakes = canShake(s);
    const keyRun: -1 | 0 | 1 = pad.holding.includes("right")
        ? pad.holding.includes("left") && pad.held === "left"
            ? -1
            : 1
        : pad.holding.includes("left")
          ? -1
          : 0;
    let run = keyRun;
    let jump = (pad.go && !shakes) || (pad.holding.includes("up") && !onLadder && !below);
    let jumped = (pad.tapped && !shakes) || (pad.pressed.includes("up") && !onLadder && !below);
    let climb: -1 | 0 | 1 = onLadder
        ? pad.holding.includes("up")
            ? -1
            : pad.holding.includes("down")
              ? 1
              : 0
        : 0;
    let shake = shakes && (pad.holding.includes("down") || pad.go);
    if (shakes && (pad.tapped || pad.pressed.includes("down"))) s.pulse = Math.max(s.pulse, 1.05);
    let drop = !onBranch && pad.pressed.includes("down") && !onLadder;
    let act = false;
    if (keyRun || pad.go) {
        s.goto = null;
        // a dive already begun lands her in the burrow and takes her on to the room all the same
        if (!s.diving) s.route = null;
    }
    // up in a tunnel takes her back to the shaft and out
    if (below && !onLadder && pad.pressed.includes("up")) s.route = "out";
    const t = pad.touch;
    if (t) {
        if (s.touchFrom < 0) s.touchFrom = s.steps;
        s.goto = null;
        const held = treeUnder(s, t);
        if (held >= 0 && !below && r.state !== "climb") {
            // a finger held on a tree: run to its trunk, then shake it for as long as the finger stays
            if (treeAt(s) === held && Math.abs(r.x - (s.L.trees[held]?.x ?? r.x)) < 1.1) {
                shake = shakes;
                run = 0;
            } else {
                const g = toTrunk(s, held, c, m);
                run = g.run;
                jump = g.jump;
                jumped = g.jumped;
            }
            s.above = false;
        } else {
            const dx = t.x - r.x,
                dy = t.y - (r.y - m.height / 2);
            if (Math.abs(dx) > 0.7) run = dx > 0 ? 1 : -1;
            const up = dy < -2.2 || (s.above && !grounded(r) && dy < 0),
                down = dy > 1.5;
            if (onLadder || r.state === "climb") climb = up ? -1 : down ? 1 : 0;
            else {
                if (up) {
                    jump = true;
                    if (!s.above) jumped = true;
                }
                if (down && Math.abs(dx) < 2 && !s.above) drop = true;
            }
            s.above = up;
        }
    } else {
        const lift = pad.lifted;
        if (lift && s.touchFrom >= 0 && s.steps - s.touchFrom < RATE * 0.3) {
            const body = { x: r.x, y: r.y - m.height / 2 };
            const room = s.L.rooms.findIndex((rm) => {
                const tn = s.L.tunnels[rm.tunnel];
                return (
                    tn !== undefined &&
                    lift.x >= rm.x0 &&
                    lift.x <= rm.x1 &&
                    lift.y >= tn.y - TUNNEL - 0.5 &&
                    lift.y <= tn.y + 0.5
                );
            });
            const tree = treeUnder(s, lift);
            // a tap on an acorn lying about runs her to it, before the tree or the door it lies by
            const nut = s.nuts.some(
                (n) =>
                    n.at === "rest" && Math.abs(n.x - lift.x) < 0.8 && Math.abs(n.y - lift.y) < 1.2,
            );
            // a tap on her takes one back in the burrow, or spits one out to make the long jump over a stream
            const onHer =
                Math.hypot(lift.x - body.x, lift.y - body.y) < 1.6 &&
                (below || s.L.streams.length > 0);
            if (nut) s.goto = { x: lift.x, act: false };
            else if (onHer) act = true;
            else if (onDoor(s, lift)) {
                s.route = below || r.state === "climb" ? "out" : "in";
                s.routeRoom = -1;
                s.goto = null;
            } else if (room >= 0 && s.L.rooms[room]?.tunnel === tunnelAt(s))
                s.goto = { x: centreOf(s, room), act: false };
            else if (room >= 0 && !below) {
                s.route = "in";
                s.routeRoom = room;
                s.goto = null;
            } else if (tree >= 0 && !below)
                s.goto = { x: s.L.trees[tree]?.x ?? lift.x, act: false, shake: true, tree };
            else s.goto = { x: lift.x, act: false };
        }
        s.touchFrom = -1;
        s.above = false;
    }
    // walking onto the door with a cheekful worth taking home goes down it
    const door = s.L.tunnels[0]?.door;
    if (
        !s.route &&
        door !== undefined &&
        homeward(s) &&
        grounded(r) &&
        Math.abs(r.y - G) < 0.05 &&
        Math.abs(r.x - door) < 0.85 &&
        s.steps - s.cameUp > RATE * 1.5 &&
        !pad.holding.includes("up")
    ) {
        drop = true;
        s.route = "in";
    }
    if (s.route === "in") {
        if (below && grounded(r) && !s.diving) {
            const room = s.routeRoom >= 0 ? s.routeRoom : s.L.rooms.length === 1 ? 0 : -1;
            s.route = null;
            s.routeRoom = -1;
            if (room >= 0) s.goto = { x: centreOf(s, room), act: false };
        } else if (!below && grounded(r) && door !== undefined && !s.diving) {
            if (Math.abs(r.x - door) > 0.3) {
                const g = seek(r, door, c, m, 0.2);
                run = g.run;
                jump = g.jump;
                jumped = g.jumped;
            } else drop = true;
        }
    } else if (s.route === "out") {
        const k = tunnelAt(s);
        if (k < 0 && grounded(r) && r.state !== "climb") {
            s.route = null;
            s.cameUp = s.steps;
        } else if (onLadder) {
            climb = -1;
            run = 0;
        } else {
            const exit = s.L.tunnels[Math.max(0, k)]?.door ?? r.x;
            const g = seek(r, exit, c, m, 0.2);
            run = g.run;
            jump = false;
            jumped = false;
            if (g.run === 0) climb = -1;
        }
    }
    if (s.goto && !s.route) {
        const g =
            s.goto.tree === undefined
                ? seek(r, s.goto.x, c, m, 0.25)
                : toTrunk(s, s.goto.tree, c, m);
        run = g.run;
        jump = g.jump;
        jumped = g.jumped;
        if (run === 0 && grounded(r)) {
            act = act || s.goto.act;
            if (s.goto.shake && canShake(s)) s.pulse = Math.max(s.pulse, 1.05);
            s.goto = null;
        }
    }
    if (shake && !onBranch) climb = 0;
    if (s.diving) climb = 0;
    return { run, jump, jumped, climb, drop, shake, act };
}

/** Picks up the food she runs over, as much as her cheeks have room for. */
function pickUp(s: ChipState, out: Happening[]): void {
    const r = s.r;
    s.spat = s.spat.filter((k) => {
        const n = s.nuts[k];
        return n !== undefined && n.at !== "gone" && Math.hypot(n.x - r.x, n.y - r.y) < 1.4;
    });
    s.nuts.forEach((n, k) => {
        if (n.at !== "rest" && !(n.at === "air" && n.vy > 0 && n.y > r.y - 0.6)) return;
        if (s.spat.includes(k)) return;
        if (Math.abs(n.x - r.x) > (s.phase < 2 ? 1.3 : 1) || n.y < r.y - 1.3 || n.y > r.y + 0.4)
            return;
        const food = s.kinds[k] ?? "acorn";
        if (loadOf(s) + PLACES[food] > CHEEKS) {
            if (s.told !== "full") {
                s.told = "full";
                s.said =
                    loadOf(s) >= CHEEKS
                        ? "Your cheeks are full. Take it home to the burrow."
                        : "No room in your cheeks for a pinecone: it takes three places.";
            }
            return;
        }
        n.at = "gone";
        s.cheeks.push({ food, nut: k });
        s.told = "";
        cue(s, out, "lift", 0.35, semitones(Math.min(10, loadOf(s) * 2)), n.x);
        const load = loadOf(s);
        s.said =
            food === "pinecone"
                ? `A pinecone, worth 5. Your cheeks hold ${load} of ${CHEEKS} places.`
                : `An acorn. ${load} in your cheeks.`;
    });
}

/** A nut back in the world from her mouth, or from a cheekful dropped: an old one if it was one, or a new one. */
function release(s: ChipState, food: Food, nut: number, at: Pt, vx: number, vy: number): number {
    const n = s.nuts[nut];
    const k = n ? nut : s.nuts.length;
    const fresh: Nut = {
        x: at.x,
        y: at.y,
        vx,
        vy,
        at: "air",
        grip: 0,
        branch: -1,
        lean: 0,
        turn: 0,
        age: 0,
    };
    if (n) Object.assign(n, fresh);
    else {
        s.nuts.push(fresh);
        s.kinds.push(food);
        s.spots.push({ ...at });
    }
    return k;
}

/**
 * Action: in a room with too many, takes one back; in any other room, empties her cheeks into its
 * store or, with nothing in them, takes one back; outside, spits one out to lighten the load.
 */
export function act(s: ChipState, out: Happening[] = []): void {
    if (s.won || s.splash > 0) return;
    const r = s.r,
        room = roomAt(s);
    const store = room >= 0 ? s.rooms[room] : undefined;
    const over = store !== undefined && !s.L.free && worth(store) > (s.V.needs[room] ?? 0);
    if (store && s.cheeks.length && !over) {
        const n = s.cheeks.length;
        for (const c of s.cheeks) {
            if (c.food === "pinecone") store.pinecones++;
            else store.acorns++;
        }
        s.cheeks = [];
        s.trips++;
        s.settledIn = room;
        s.tumbles.push({ room, t: 0, n });
        cue(s, out, "level", 0.5, 1, r.x);
        s.said = roomWords(s, room, true);
        return;
    }
    if (store) {
        const food: Food | null =
            store.acorns > 0 ? "acorn" : store.pinecones > 0 ? "pinecone" : null;
        if (!food) {
            s.said = "This room is empty, and so are your cheeks.";
            return;
        }
        if (food === "acorn") store.acorns--;
        else store.pinecones--;
        s.cheeks.push({ food, nut: -1 });
        s.settledIn = room;
        cue(s, out, "lift", 0.35, 0.8, r.x);
        s.said = `You take ${food === "acorn" ? "an acorn" : "a pinecone"} back. ${roomWords(s, room, false)}`;
        return;
    }
    const last = s.cheeks.pop();
    if (!last) {
        s.said =
            tunnelAt(s) >= 0
                ? "Stand in a room to fill it."
                : "Your cheeks are empty. Run over acorns to pick them up.";
        return;
    }
    const k = release(
        s,
        last.food,
        last.nut,
        { x: r.x + r.facing * 0.5, y: r.y - 0.7 },
        r.facing * 1.4,
        -2,
    );
    s.spat.push(k);
    cue(s, out, "place", 0.35, 1.2, r.x);
    s.said = `You spit ${last.food === "acorn" ? "an acorn" : "a pinecone"} out. ${loadOf(s)} places full now.`;
}

/** What a room's words say: what it holds, and on the early levels how far it is from what it wants. */
function roomWords(s: ChipState, room: number, filled: boolean): string {
    const has = worth(s.rooms[room] ?? { acorns: 0, pinecones: 0 }),
        need = s.V.needs[room] ?? 0;
    if (s.L.free) return `This room holds ${has}.`;
    const label = s.V.labels[room] ?? "";
    const named = /^\d+$/.test(label) ? `wants ${need}` : `is ${label === "?" ? "a share" : label}`;
    if (has === need) return `${filled ? "In they go: " : ""}this room has ${has}, just right.`;
    if (s.L.help === 0) return `This room has ${has}.`;
    if (has < need)
        return s.L.help >= 2 || /^\d+$/.test(label)
            ? `This room has ${has}. It ${named}: ${need - has} more.`
            : `This room has ${has}.`;
    return `This room has ${has}, ${has - need} too many. Action takes one back.`;
}

export function stepChip(s: ChipState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    const L = s.L,
        r = s.r;
    s.steps++;
    const t = s.steps * DT;
    for (const tb of s.tumbles) tb.t += DT;
    s.tumbles = s.tumbles.filter((tb) => tb.t < 0.9);
    if (s.won) {
        stepActor(s.act, "cheer", ACTS, DT, r.stride, r.facing);
        frameCamera(s);
        return out;
    }
    if (s.out) {
        stepActor(s.act, "stand", ACTS, DT, r.stride, r.facing);
        frameCamera(s);
        return out;
    }
    s.time += DT;
    if (L.time !== undefined && s.time >= L.time) {
        s.out = true;
        cue(s, out, "nope", 0.5);
        s.said = "The first snow has come.";
    }
    const w = worldOf(L);
    const moved = stepNuts(s.nuts, w.wood, DT);
    for (const e of moved) {
        const n = s.nuts[e.nut];
        if (!n) continue;
        if (e.e === "bounced" && n.vy < -1.5) cue(s, out, "place", 0.15, 1.6, n.x);
        if (e.e === "splashed") {
            cue(s, out, "splash", 0.25, 1.6, n.x);
            out.push({ burst: { kind: "splash", x: n.x, y: n.y, n: 3 } });
        }
    }
    regrow(s);
    hawk(s, out);
    squirrel(s, out);
    if (s.splash > 0) {
        s.splash -= DT;
        if (s.splash <= 0) {
            Object.assign(r, runner(s.safe.x, s.safe.y, r.facing));
            s.diving = false;
            out.push({ puff: { x: r.x, y: r.y - 0.5, n: 5 } });
            cue(s, out, "back", 0.35);
            s.said = s.cheeks.length
                ? "Back on dry ground, with your cheeks still full. A lighter load jumps further."
                : "Back on dry ground.";
        }
        frameCamera(s);
        return out;
    }
    const i = intentOf(s, pad);
    if (s.fright > 0) {
        s.fright -= DT;
        i.run = 0;
        i.jump = false;
        i.jumped = false;
        i.shake = false;
        i.act = false;
    }
    const m = movesOf(loadOf(s));
    const before = r.vy;
    // a dive through a door falls straight down the shaft, and a door is not dived through with a run held
    if (i.drop) {
        const lip = worldOf(L).place.ledges.findIndex(
            (l, k) =>
                k >= L.trees.length &&
                r.x >= l.x0 - 0.2 &&
                r.x <= l.x1 + 0.2 &&
                Math.abs(l.y - r.y) < 0.05,
        );
        if (lip >= 0 && grounded(r)) {
            s.diving = true;
            r.x = L.tunnels[lip - L.trees.length]?.door ?? r.x;
            i.run = 0;
            s.goto = null;
            if (!s.route) s.route = "in";
        }
    }
    const ran = stepRunner(r, i, w.course, m, DT);
    for (const e of ran) {
        if (e === "jumped") {
            cue(s, out, "lift", 0.25, 1.4 - loadOf(s) * 0.06);
            out.push({ puff: { x: r.x, y: r.y, n: 2 } });
        }
        if (e === "landed") {
            s.diving = false;
            land(s.act, Math.max(0, before));
            if (before > 8) {
                cue(s, out, "bump", Math.min(0.5, before / 30), 1.3);
                out.push({ puff: { x: r.x, y: r.y, n: 2 } });
            }
        }
        if (e === "dropped") cue(s, out, "lift", 0.3, 0.7);
    }
    if (grounded(r) && !inWater(s)) s.safe = safeSpot(s);
    // shaking: the big button, the down arrow or a finger held on the tree, at its trunk or on its branch
    const on = treeAt(s);
    if (s.pulse > 0) s.pulse = Math.max(0, s.pulse - DT);
    s.shaking = on >= 0 && (i.shake || s.pulse > 0) ? on : -1;
    s.shakes.forEach((sh, k) => stepShake(sh, s.shaking === k, DT));
    if (s.shaking >= 0) {
        const sh = s.shakes[s.shaking];
        if (sh) {
            const fell = loosen(s.nuts, s.shaking, sh);
            for (const nut of fell) {
                nut.vx *= 0.45;
                nut.vy *= 0.65;
            }
            if (fell.length) cue(s, out, "place", 0.2 + sh.strength * 0.2, 1.4, r.x);
            if (t - s.lastCreak > 0.22) {
                s.lastCreak = t;
                cue(s, out, "creak", 0.15 + sh.strength * 0.3, 1 + sh.strength * 0.3);
            }
            if (s.L.help >= 2 && fell.length === 0 && s.told !== "shake") {
                s.told = "shake";
                s.said =
                    "A tap gives the tree a good shake. Run over the fallen acorns to collect them.";
            }
        }
    }
    if (i.act) act(s, out);
    settle(s, out);
    pickUp(s, out);
    if (inWater(s)) {
        s.splash = 0.55;
        s.diving = false;
        cue(s, out, "splash", 0.55);
        out.push({ burst: { kind: "splash", x: r.x, y: r.y - 0.3, n: 8 } });
        s.said =
            loadOf(s) >= 4
                ? "Splash! Full cheeks are heavy. Carry fewer, or spit one out, to jump further."
                : "Splash! Back to dry ground in a moment.";
    }
    if (r.y > L.h + 2) Object.assign(r, runner(s.safe.x, s.safe.y, r.facing));
    roomNotes(s, out);
    const now = stepOf(s);
    if (now !== s.stepNow) {
        s.stepNow = now;
        s.stepAt = s.steps;
    }
    if (allRight(s) && s.tumbles.length === 0) {
        s.won = true;
        s.wonAt = s.steps;
        cue(s, out, "win", 0.8);
        out.push({ burst: { kind: "sparkle", x: r.x, y: r.y - 1.5, n: 16 } });
        s.said = wonWords(s);
    }
    const pose: Act =
        r.state === "climb"
            ? "climb"
            : s.shaking >= 0
              ? "shake"
              : s.tumbles.some((tb) => tb.t < 0.35)
                ? "spit"
                : hidden(s) && s.r.y <= G + 0.3 && s.hawk?.x != null
                  ? "hide"
                  : r.state === "rise"
                    ? "rise"
                    : r.state === "fall"
                      ? "fall"
                      : r.state === "run"
                        ? "run"
                        : "stand";
    stepActor(s.act, pose, ACTS, DT, r.stride, r.facing);
    frameCamera(s);
    return out;
}

/** Standing still in a room short of what it wants, her cheeks empty into it by themselves. */
function settle(s: ChipState, out: Happening[]): void {
    const k = roomAt(s),
        store = s.rooms[k];
    // still means not moving: an arrow held against the tunnel's end counts as standing still
    const moving = Math.abs(s.r.vx) > 0.3;
    if (k !== s.settledIn || moving) s.settledIn = -1;
    const short =
        store !== undefined &&
        k !== s.settledIn &&
        (s.L.free || worth(store) < (s.V.needs[k] ?? 0));
    if (!short || !s.cheeks.length || s.goto || !grounded(s.r) || moving) {
        s.stillFor = 0;
        return;
    }
    s.stillFor += DT;
    if (s.stillFor >= SETTLE) {
        s.stillFor = 0;
        act(s, out);
    }
}

/** Where she is put back after a splash: on what she last stood on, back from its edge, so the next jump has a run-up. */
function safeSpot(s: ChipState): Pt {
    const r = s.r,
        w = worldOf(s.L).place;
    const under = w.blocks.find(
        (b) => r.x >= b.x0 - 0.3 && r.x <= b.x1 + 0.3 && Math.abs(b.y0 - r.y) < 0.05,
    );
    if (!under) return { x: r.x, y: r.y };
    const room = Math.min(1.5, (under.x1 - under.x0) / 2);
    return { x: Math.max(under.x0 + room, Math.min(under.x1 - room, r.x)), y: r.y };
}

/** Walking into a room says what it holds, once. */
function roomNotes(s: ChipState, out: Happening[]): void {
    const k = roomAt(s);
    if (k < 0) {
        if (s.told.startsWith("room")) s.told = "";
        return;
    }
    if (s.told === `room${k}`) return;
    s.told = `room${k}`;
    s.said = roomWords(s, k, false);
    if (s.cheeks.length && s.L.help >= 1 && wants(s)[k] !== undefined && (wants(s)[k] ?? 0) > 0)
        s.said += " Stand still and your cheeks empty here.";
    cue(s, out, "ring", 0.12, 1.5);
}

/** The words of a win, with the sum the store makes. */
function wonWords(s: ChipState): string {
    const L = s.L;
    if (L.tally === "trips") {
        const need = s.V.needs[0] ?? 0;
        return `The store is full: ${need} acorns in ${s.trips} trips. ${need} is ${Math.ceil(need / CHEEKS)} cheekfuls of 6.`;
    }
    if (L.tally === "sum") {
        const r = s.rooms[0] ?? { acorns: 0, pinecones: 0 };
        const parts = [...Array<number>(r.pinecones).fill(5), ...(r.acorns ? [r.acorns] : [])];
        return parts.length > 1
            ? `The store is full: ${parts.join(" + ")} = ${worth(r)}. Hazel is ready for winter.`
            : `The store is full with ${worth(r)}. Hazel is ready for winter.`;
    }
    return `Every room is right: ${s.rooms.map(worth).join(", ")}. Hazel is ready for winter.`;
}

/** In free play the branches grow their nuts back, one every few seconds. */
function regrow(s: ChipState): void {
    if (!s.L.free || s.steps % (RATE * 5) !== 0) return;
    const k = s.nuts.findIndex(
        (n, i) =>
            n.at === "gone" &&
            n.branch >= 0 &&
            s.kinds[i] !== undefined &&
            !s.cheeks.some((c) => c.nut === i),
    );
    const n = s.nuts[k],
        spot = s.spots[k];
    if (!n || !spot) return;
    Object.assign(n, { x: spot.x, y: spot.y, vx: 0, vy: 0, at: "hang", age: 0 });
    const sh = s.shakes[n.branch];
    if (sh) n.grip = sh.energy + 0.05 + (k % 5) * 0.05;
}

/** The hawk passes every so often: its cry, then its shadow sweeping across; caught in the open, she drops her cheekful. */
function hawk(s: ChipState, out: Happening[]): void {
    const h = s.hawk,
        L = s.L;
    if (!h || !L.hawk) return;
    if (h.x === null) {
        h.next -= DT;
        if (h.next <= 4 && !s.warned.includes("hawk")) {
            s.warned.push("hawk");
            s.said = "A hawk will fly over soon. When it cries, hide in a log or the burrow.";
        }
        if (h.next <= 0) {
            h.x = -18;
            cue(s, out, "crash", 0.35, 1, s.cam.x - VIEW.w / 2);
            s.said = "A hawk is coming! Hide in a log or the burrow.";
        }
        return;
    }
    h.x += 14 * DT;
    if (h.x > L.w + 18) {
        h.x = null;
        h.next = L.hawk.every;
        return;
    }
    const r = s.r;
    if (Math.abs(h.x - r.x) < 1.3 && !hidden(s) && s.fright <= 0 && s.splash <= 0) {
        s.fright = 0.7;
        if (s.cheeks.length) {
            const spill = s.cheeks;
            s.cheeks = [];
            spill.forEach((c, i) => {
                s.spat.push(
                    release(
                        s,
                        c.food,
                        c.nut,
                        { x: r.x, y: r.y - 0.6 },
                        (i - (spill.length - 1) / 2) * 1.1,
                        -3,
                    ),
                );
            });
            s.said =
                "The hawk's shadow! Nutmeg dropped her cheekful. It is all still there to pick up.";
        } else s.said = "The hawk's shadow! Nutmeg ducks.";
        r.vy = -6;
        r.state = "rise";
        cue(s, out, "bump", 0.4, 0.8);
    }
}

/** The squirrel takes food left lying where Nutmeg is not, carries it to its tree and leaves it there; run at it and it drops what it has. */
function squirrel(s: ChipState, out: Happening[]): void {
    const q = s.squirrel,
        home = s.L.squirrel?.home;
    if (!q || home === undefined) return;
    const r = s.r,
        near = Math.abs(r.x - q.x) < 2.6 && Math.abs(r.y - G) < 1.5;
    const go = (to: number, speed: number): boolean => {
        const d = to - q.x;
        if (Math.abs(d) < speed * DT) {
            q.x = to;
            return true;
        }
        q.facing = d > 0 ? 1 : -1;
        q.x += q.facing * speed * DT;
        return false;
    };
    const drop = (x: number) => {
        q.carry.forEach((k, i) => {
            const n = s.nuts[k];
            if (n)
                Object.assign(n, {
                    x: x + (i - 0.5) * 0.6,
                    y: G - 0.3,
                    vx: 0,
                    vy: 0,
                    at: "air",
                    age: 0,
                });
        });
        q.carry = [];
    };
    if ((q.mode === "sneak" || q.mode === "carry") && near) {
        drop(q.x);
        q.mode = "flee";
        cue(s, out, "back", 0.4, 1.6, q.x);
        s.said = "The squirrel drops the acorns and runs off.";
        return;
    }
    if (q.mode === "wait") {
        q.wait -= DT;
        if (q.wait > 0) return;
        let best = -1,
            far = Infinity;
        s.nuts.forEach((n, k) => {
            if (n.at !== "rest" || Math.abs(n.y - G) > 0.2) return;
            if (Math.abs(n.x - home) < 1.5 || Math.abs(n.x - r.x) < 7) return;
            const d = Math.abs(n.x - q.x);
            if (d < far) {
                far = d;
                best = k;
            }
        });
        if (best < 0) {
            q.wait = 1;
            return;
        }
        q.after = best;
        q.mode = "sneak";
        return;
    }
    if (q.mode === "sneak") {
        const n = s.nuts[q.after];
        if (!n || n.at !== "rest") {
            q.mode = "carry";
            return;
        }
        if (go(n.x, 3.4)) {
            s.nuts.forEach((m, k) => {
                if (
                    q.carry.length < 2 &&
                    m.at === "rest" &&
                    Math.abs(m.x - q.x) < 1.2 &&
                    Math.abs(m.y - G) < 0.2
                ) {
                    m.at = "gone";
                    q.carry.push(k);
                }
            });
            q.mode = "carry";
            cue(s, out, "back", 0.25, 1.8, q.x);
        }
        return;
    }
    if (go(home, q.mode === "flee" ? 6 : 2.8)) {
        drop(home);
        q.mode = "wait";
        q.wait = 5;
    }
}

/** The camera's height above ground: low enough to show the room floors, high enough for the crowns. */
const aboveY = (L: ChipLevel, y: number): number => Math.min(y - 1.5, L.h - VIEW.h / 2);

/** The camera leads the way she runs, and goes down into the burrow with her. */
function frameCamera(s: ChipState): void {
    const r = s.r,
        L = s.L;
    const want = {
        x: r.x + Math.max(-3, Math.min(3, r.vx * 0.45)) + r.facing * 1.5,
        y: r.y > G + 0.3 ? r.y - 3 : aboveY(L, r.y),
        zoom: 1,
    };
    s.cam = follow(s.cam, want, { rate: 4, dt: DT, view: VIEW, world: { w: L.w, h: L.h } });
}

/** Where a full jump from where she stands would take her with the load she carries, as dots until it comes down. */
export function arcOf(s: ChipState): Pt[] {
    const copy = structuredClone(s.r),
        m = movesOf(loadOf(s)),
        c = courseOf(s),
        pts: Pt[] = [];
    const dir: -1 | 0 | 1 = Math.abs(copy.vx) > 0.5 ? (copy.vx > 0 ? 1 : -1) : copy.facing;
    if (Math.abs(copy.vx) < 0.5) copy.vx = dir * m.speed;
    stepRunner(copy, { run: dir, jump: true, jumped: true }, c, m, DT);
    for (let n = 1; n < RATE * 1.4; n++) {
        const ran = stepRunner(copy, { run: dir, jump: true, jumped: false }, c, m, DT);
        if (n % 4 === 0) pts.push({ x: copy.x, y: copy.y - 0.5 });
        if (ran.includes("landed") || copy.y > WATER) break;
    }
    return pts;
}

/** Where the loose nuts of a branch would land if it were shaken now: its middle under it, and how wide a shake at this strength throws them. */
export function shakeRing(s: ChipState, tree: number): { x: number; r: number } | null {
    const t = s.L.trees[tree],
        sh = s.shakes[tree];
    if (!t || !sh) return null;
    const left = s.nuts.filter((n) => n.at === "hang" && n.branch === tree);
    if (!left.length) return null;
    return { x: t.x, r: (t.branch.x1 - t.branch.x0) / 2 + 0.5 + sh.strength * 2.2 };
}

const SCENES: Record<
    Scene,
    {
        far: string;
        farParams: Record<string, unknown>;
        near?: string;
        nearParams?: Record<string, unknown>;
    }
> = {
    garden: {
        far: "houses",
        farParams: { count: 2, windows: 2 },
        near: "flowers",
        nearParams: { count: 3, petals: 5 },
    },
    oaks: {
        far: "firs",
        farParams: { count: 3, snow: 0 },
        near: "toadstools",
        nearParams: { count: 2, spots: 4 },
    },
    stream: { far: "firs", farParams: { count: 2, snow: 0 }, near: "reeds", nearParams: {} },
    patch: {
        far: "tree",
        farParams: { fruit: 0, fallen: 0, item: "apple" },
        near: "toadstools",
        nearParams: { count: 3, spots: 3 },
    },
    windy: { far: "windmill", farParams: {}, near: "flowers", nearParams: { count: 2, petals: 6 } },
    meadow: {
        far: "tree",
        farParams: { fruit: 0, fallen: 0, item: "apple" },
        near: "flowers",
        nearParams: { count: 3, petals: 6 },
    },
    rain: {
        far: "firs",
        farParams: { count: 3, snow: 0 },
        near: "toadstools",
        nearParams: { count: 2, spots: 4 },
    },
    snow: { far: "firs", farParams: { count: 3, snow: 1 } },
};

function backdrop(s: ChipState, sprites: Sprite[], rest: boolean): void {
    const L = s.L,
        eye: Eye = { cam: s.cam, view: { w: 72, h: VIEW.h } },
        look = SCENES[L.scene];
    sprites.push(
        ...row(
            {
                key: "cloud",
                depth: 0.15,
                // low enough to pass under the board in the top right corner rather than behind its edge
                base: 8.8,
                every: 26,
                stray: 3,
                z: 0,
                gaps: 0.3,
                alpha: 0.3,
                drift: rest ? 0 : L.wind ? 1.4 : 0.2,
                things: [
                    {
                        art: "cloud",
                        params: { puffs: 4, rain: L.scene === "rain" ? 1 : 0 },
                        size: 5,
                        often: 2,
                    },
                    { art: "cloud", params: { puffs: 3, rain: 0 }, size: 3.6, often: 1 },
                ],
            },
            eye,
            13,
            rest ? 0 : s.steps * DT,
        ),
        ...(L.scene === "garden"
            ? []
            : row(
                  {
                      key: "far",
                      depth: 0.35,
                      base: G,
                      every: 24,
                      stray: 3,
                      z: 1,
                      gaps: 0.25,
                      alpha: 0.18,
                      things: [{ art: look.far, params: look.farParams, size: 6, often: 1 }],
                  },
                  eye,
                  19,
              )),
    );
    if (L.scene !== "garden" && look.near && look.nearParams)
        sprites.push(
            ...row(
                {
                    key: "near",
                    depth: 0.75,
                    base: G,
                    every: 22,
                    stray: 3,
                    z: 2,
                    gaps: 0.45,
                    alpha: 0.35,
                    things: [{ art: look.near, params: look.nearParams, size: 2.4, often: 1 }],
                },
                eye,
                29,
            ),
        );
}

const half = (n: number): number => Math.max(0.5, Math.min(12, Math.round(n * 2) / 2));

/** A piece of the burrow's cut-away drawn in lengths of twelve squares and what is left, every length on the half square. */
function pieces(
    key: string,
    kind: string,
    x0: number,
    x1: number,
    y0: number,
    d: number,
    z: number,
): Sprite[] {
    const out: Sprite[] = [];
    for (let x = x0, i = 0; x < x1 - 0.25; x += 12, i++) {
        const w = half(Math.min(12, x1 - x));
        out.push({
            key: `${key}:${i}`,
            art: "burrow",
            params: { kind, w, d: half(d) },
            x: x + w / 2,
            y: y0 + half(d) / 2,
            z,
            alpha: kind === "soil" || kind === "grass" ? 0.5 : 1,
            still: true,
        });
    }
    return out;
}

/** The burrow and the ground: the earth in pieces, the grass along its top, the tunnels, the rooms and the doors. */
function groundSprites(s: ChipState, sprites: Sprite[]): void {
    const L = s.L,
        blocks = worldOf(L).place.blocks;
    // past the world's ends the ground goes on, drawn and never stood on
    for (const [x0, x1] of [
        [-BEYOND, 0],
        [L.w, L.w + BEYOND],
    ] as const)
        for (let y = G; y < L.h + 2; y += 12)
            sprites.push(
                ...pieces(
                    `beyond:${x0}:${y}`,
                    y === G ? "grass" : "soil",
                    x0,
                    x1,
                    y,
                    Math.min(12, L.h + 2 - y),
                    4,
                ),
            );
    blocks.forEach((b, k) => {
        if (b.y0 < 0) return;
        const deep = Math.min(L.h + 2, b.y1) - b.y0;
        const surface = Math.abs(b.y0 - G) < 1e-6;
        const stone = L.streams.some((st) => st.stones.some((x) => x.x0 === b.x0 && x.x1 === b.x1));
        for (let y = b.y0; y < b.y0 + deep - 1e-6; y += 12) {
            const d = Math.min(12, b.y0 + deep - y);
            sprites.push(
                ...pieces(
                    `earth:${k}:${y}`,
                    stone ? "stone" : surface && y === b.y0 ? "grass" : "soil",
                    b.x0,
                    b.x1,
                    y,
                    d,
                    4,
                ),
            );
        }
    });
    L.tunnels.forEach((t, k) => {
        sprites.push(...pieces(`tunnel:${k}`, "tunnel", t.x0, t.x1, t.y - TUNNEL, TUNNEL, 3));
        const top = k === 0 ? G : (L.tunnels[k - 1]?.y ?? G);
        sprites.push({
            key: `shaft:${k}`,
            art: "burrow",
            params: { kind: "shaft", w: 2, d: Math.max(1, Math.round(t.y - top)) },
            x: t.door,
            y: (top + t.y) / 2,
            size: 2,
            z: 3.2,
            still: true,
        });
        sprites.push({
            key: `door:${k}`,
            art: "burrow",
            params: { kind: "door", w: 3, d: 1 },
            x: t.door,
            y: top - 0.1,
            stand: true,
            size: 3,
            z: 6,
            still: true,
        });
    });
    L.rooms.forEach((m, k) => {
        const t = L.tunnels[m.tunnel];
        if (!t) return;
        sprites.push({
            key: `room:${k}`,
            art: "burrow",
            params: { kind: "room", w: Math.round(m.x1 - m.x0), d: 3 },
            x: (m.x0 + m.x1) / 2,
            y: t.y,
            stand: true,
            size: m.x1 - m.x0,
            z: 3.4,
            still: true,
        });
    });
}

const CHIP_LOOK = (who: "nutmeg" | "hazel", pose: string, cheeks: number, facing: 1 | -1) => ({
    art: "chipmunk",
    params: { who, pose, cheeks: Math.max(0, Math.min(CHEEKS, cheeks)) },
    flip: facing < 0,
    size: who === "hazel" ? 2.2 : 2.8,
});

/** A room's store laid out in rows of five, pinecones first, so the pile can be counted. */
function pileSprites(s: ChipState, sprites: Sprite[]): void {
    s.L.rooms.forEach((m, k) => {
        const t = s.L.tunnels[m.tunnel],
            st = s.rooms[k];
        if (!t || !st) return;
        const each = 0.62,
            per = Math.max(5, Math.floor((m.x1 - m.x0 - 0.6) / each / 5) * 5);
        const items: Food[] = [
            ...Array<Food>(st.pinecones).fill("pinecone"),
            ...Array<Food>(st.acorns).fill("acorn"),
        ];
        const fresh = s.tumbles.filter((tb) => tb.room === k).reduce((n, tb) => n + tb.n, 0);
        items.forEach((food, i) => {
            const col = i % per,
                rowN = Math.floor(i / per);
            // a group of five then a gap, as a tens frame keeps them
            const x = m.x0 + 0.5 + col * each + Math.floor(col / 5) * 0.25,
                y = t.y - 0.05 - rowN * 0.55;
            const late = i >= items.length - fresh;
            sprites.push({
                key: `pile:${k}:${i}`,
                art: "acorn",
                params: { kind: food },
                x,
                y,
                stand: true,
                size: food === "pinecone" ? 0.75 : 0.55,
                z: 11,
                ...(late ? { scale: 1.15 } : {}),
                still: !late,
            });
        });
    });
}

function nutSprites(s: ChipState, sprites: Sprite[], rest: boolean): void {
    const t = rest ? 0 : s.steps * DT;
    s.nuts.forEach((n, k) => {
        if (n.at === "gone") return;
        const food = s.kinds[k] ?? "acorn";
        const sh = n.at === "hang" ? s.shakes[n.branch] : undefined;
        const wobble = sh && !rest ? sh.strength * 0.5 * Math.sin(t * 38 + k) : 0;
        sprites.push({
            key: `nut:${k}`,
            art: "acorn",
            params: { kind: food },
            x: n.x + (sh && !rest ? sh.strength * 0.08 * Math.sin(t * 31 + k * 1.7) : 0),
            y: n.at === "hang" ? n.y : n.y - (food === "pinecone" ? 0.5 : 0.38),
            size: food === "pinecone" ? 1 : 0.75,
            angle: n.at === "hang" ? wobble : n.turn,
            z: 8,
            ...(n.at === "float" ? { alpha: Math.max(0, 1 - n.age / FORAGE.floats) } : {}),
        });
    });
}

function treeSprites(s: ChipState, sprites: Sprite[], rest: boolean): void {
    const t = rest ? 0 : s.steps * DT;
    s.L.trees.forEach((tr, k) => {
        const sh = s.shakes[k];
        const sway = sh && !rest ? sh.strength * 0.12 * Math.sin(t * 34) : 0;
        const tall = Math.round(G - tr.branch.y + 3);
        sprites.push({
            key: `trunk:${k}`,
            art: "oaktree",
            params: { kind: tr.kind === "fir" ? "firtrunk" : "trunk", tall },
            x: tr.x,
            y: G,
            stand: true,
            size: 2,
            z: 3.5,
            still: true,
        });
        sprites.push({
            key: `crown:${k}`,
            art: "oaktree",
            params: { kind: tr.kind === "fir" ? "fircrown" : "crown", tall: 6 },
            x: tr.x + sway * 0.5,
            y: tr.branch.y - 1.5,
            stand: true,
            size: tr.kind === "fir" ? 4.6 : 7,
            z: 3.6,
            ...(sway ? {} : { still: true }),
        });
        const w = tr.branch.x1 - tr.branch.x0;
        sprites.push({
            key: `branch:${k}`,
            art: "climbledge",
            params: { kind: "branch", w: Math.round(w), h: 1 },
            x: (tr.branch.x0 + tr.branch.x1) / 2 + sway,
            y: tr.branch.y + 0.5,
            size: w,
            z: 5,
            ...(sway ? {} : { still: true }),
        });
    });
}

export function chipFrame(s: ChipState, rest = false): Frame {
    const L = s.L,
        sprites: Sprite[] = [],
        marks: Mark[] = [],
        t = rest ? 0 : s.steps * DT;
    backdrop(s, sprites, rest);
    groundSprites(s, sprites);
    treeSprites(s, sprites, rest);
    if (L.charlie !== undefined) {
        sprites.push({
            key: "fence",
            art: "parkfence",
            params: { w: 6, h: 2, hole: 0 },
            x: L.charlie + 1.5,
            y: G,
            stand: true,
            size: 6,
            z: 5.5,
            still: true,
        });
        sprites.push({
            key: "charlie",
            art: "charlie",
            params: {
                pose: s.won ? "cheer" : "stand",
                mood: "happy",
                dir: 1,
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
            x: L.charlie,
            y: G,
            stand: true,
            size: 1.8,
            z: 5.6,
        });
    }
    L.logs.forEach((lg, k) =>
        sprites.push({
            key: `log:${k}`,
            art: "hollowlog",
            params: { w: lg.w },
            x: lg.x,
            y: G,
            stand: true,
            size: lg.w,
            z: 11,
            still: true,
        }),
    );
    nutSprites(s, sprites, rest);
    pileSprites(s, sprites);
    const hz = L.rooms[L.hazel],
        ht = hz ? L.tunnels[hz.tunnel] : undefined;
    if (hz && ht)
        sprites.push({
            key: "hazel",
            ...CHIP_LOOK(
                "hazel",
                s.won ? (Math.floor(t * 3) % 2 ? "cheer" : "stand") : "sit",
                0,
                -1,
            ),
            x: hz.x1 - 0.7,
            y: ht.y,
            stand: true,
            z: 6.5,
        });
    const q = s.squirrel;
    if (q)
        sprites.push({
            key: "squirrel",
            art: "squirrel",
            params: { pose: q.mode === "wait" ? "sit" : q.carry.length ? "carry" : "run" },
            x: q.x,
            y: G,
            stand: true,
            flip: q.facing < 0,
            size: 2.4,
            z: 9,
        });
    const h = s.hawk;
    if (h && h.x !== null) {
        sprites.push({
            key: "hawkshadow",
            art: "hawk",
            params: { kind: "shadow" },
            x: h.x,
            y: G + 0.1,
            stand: true,
            size: 4,
            z: 9.5,
            alpha: 0.5,
        });
        sprites.push({
            key: "hawk",
            art: "hawk",
            params: { kind: "bird" },
            x: h.x - 2,
            y: 5,
            size: 4,
            z: 12,
        });
    }
    if (s.splash <= 0) {
        const r = s.r,
            load = loadOf(s);
        const dress = (pose: string, facing: 1 | -1): Sprite => ({
            key: "nutmeg",
            ...CHIP_LOOK("nutmeg", pose, load, facing),
            x: r.x + (s.shaking >= 0 && !rest ? Math.sin(t * 40) * 0.05 : 0),
            y: r.y,
            stand: true,
            z: 10,
        });
        sprites.push(...actorSprites(s.act, ACTS, dress, r.stride, rest));
    }
    hud(s, sprites, marks);
    help(s, marks, rest);
    guide(s, sprites, marks, rest);
    const water: Water[] = [
        ...L.streams.map((st) => ({
            x: st.x0,
            w: st.x1 - st.x0,
            level: WATER,
            bottom: G + 3,
            waves: 0.1,
            flow: 0.6,
            z: 4.5,
        })),
        ...L.tunnels
            .filter((tn) => tn.flooded)
            .map((tn) => ({
                x: tn.x0,
                w: tn.x1 - tn.x0,
                level: tn.y - TUNNEL * 0.55,
                bottom: tn.y,
                waves: 0.05,
                z: 4.5,
            })),
    ];
    return {
        sprites,
        marks,
        camera: { ...s.cam },
        focus: { x: s.r.x + s.r.facing * 1.5, y: s.r.y > G + 0.3 ? s.r.y - 2 : s.r.y - 1.5 },
        view: { ...VIEW },
        world: { w: L.w, h: L.h },
        time: t,
        water,
    };
}

/** What she carries, the board and the time to the first snow, kept in the view's own corners. */
function hud(s: ChipState, sprites: Sprite[], marks: Mark[]): void {
    let x = 1;
    for (const c of s.cheeks) {
        // an acorn's place is a little wider than the acorn, so a row of them never runs together
        const wide = c.food === "pinecone" ? 1.6 : 0.8;
        sprites.push({
            key: `cheek:${x.toFixed(2)}`,
            art: "acorn",
            params: { kind: c.food },
            x: x + wide / 2 - 0.3,
            y: 1.2,
            size: c.food === "pinecone" ? 0.95 : 0.7,
            z: 50,
            fixed: true,
        });
        x += wide;
    }
    for (let k = placesOf(s.cheeks); k < CHEEKS; k++) {
        sprites.push({
            key: `cheek:${x.toFixed(2)}`,
            art: "acorn",
            params: { kind: "acorn" },
            x: x + 0.1,
            y: 1.2,
            size: 0.7,
            z: 50,
            fixed: true,
            faint: true,
        });
        x += 0.8;
    }
    // the board sits in the top right corner, small enough to leave the tree and the burrow the room
    const bx = VIEW.w - 5.2;
    sprites.push({
        key: "board",
        art: "kiteboard",
        params: { tone: s.L.scene === "snow" ? "sky" : "berry" },
        x: bx,
        y: 1.6,
        size: 9.6,
        z: 49,
        fixed: true,
        still: true,
    });
    marks.push(
        { kind: "word", x: bx, y: 1.35, text: s.V.ask, size: 0.42, fixed: true },
        { kind: "word", x: bx, y: 2.15, text: tallyWords(s), size: 0.42, fixed: true },
    );
    if (s.L.time !== undefined) {
        const left = Math.max(0, Math.ceil(s.L.time - s.time));
        marks.push({
            kind: "word",
            x: 2.8,
            y: 2.4,
            text: `snow in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`,
            size: 0.5,
            fixed: true,
        });
    }
    // how full her cheeks are, over her head, while she carries anything
    if (s.cheeks.length && s.splash <= 0) {
        const load = loadOf(s);
        marks.push({
            kind: "word",
            x: s.r.x,
            y: s.r.y - 2.5,
            text: load >= CHEEKS ? `${CHEEKS} of ${CHEEKS}, full!` : `${load} of ${CHEEKS}`,
            size: 0.55,
        });
    }
}

/** The board's second line: the store as a sum, each room's count, or the trips made. */
export function tallyWords(s: ChipState): string {
    const L = s.L;
    if (L.tally === "trips") {
        const has = worth(s.rooms[0] ?? { acorns: 0, pinecones: 0 });
        return `trips: ${s.trips}   stored: ${has}`;
    }
    if (L.tally === "rooms") return `rooms: ${s.rooms.map(worth).join(", ")}`;
    const r = s.rooms.reduce(
        (a, b) => ({ acorns: a.acorns + b.acorns, pinecones: a.pinecones + b.pinecones }),
        { acorns: 0, pinecones: 0 },
    );
    const parts = [...Array<number>(r.pinecones).fill(5), ...(r.acorns ? [r.acorns] : [])];
    return parts.length > 1 ? `stored: ${parts.join(" + ")} = ${worth(r)}` : `stored: ${worth(r)}`;
}

const STEPS = ["Shake the tree", "Pick up acorns", "Into the burrow"] as const;

/** The guide's step to do, worked out from the wood as it stands: 0 shake, 1 pick up, 2 take home, 3 done. */
export function stepOf(s: ChipState): number {
    if (s.won || allRight(s)) return 3;
    const lying = s.nuts.some((n) => n.at === "rest" || n.at === "air"),
        hung = s.nuts.some((n) => n.at === "hang");
    if (homeward(s) || wants(s).some((w) => w < 0)) return 2;
    if (lying) return 1;
    if (s.cheeks.length && !hung) return 2;
    return 0;
}

/** Where the guide's arrow points for the step to do: a tree, the nearest acorn, the door, or the room. */
function pointerOf(s: ChipState): Pt | null {
    const r = s.r,
        L = s.L,
        now = s.stepNow;
    if (now === 0) {
        const tree = L.trees
            .map((t, k) => ({ t, k }))
            .filter(({ k }) => hangingOn(s, k) > 0)
            .toSorted((a, b) => Math.abs(a.t.x - r.x) - Math.abs(b.t.x - r.x))[0];
        return tree && treeAt(s) !== tree.k ? { x: tree.t.x, y: G - 0.6 } : null;
    }
    if (now === 1) {
        const nut = s.nuts
            .filter((n) => n.at === "rest" && Math.abs(n.y - G) < 0.3 && Math.abs(n.x - r.x) > 1.2)
            .toSorted((a, b) => Math.abs(a.x - r.x) - Math.abs(b.x - r.x))[0];
        return nut ? { x: nut.x, y: nut.y - 0.4 } : null;
    }
    if (now === 2) {
        const w = wants(s);
        const room =
            w.findIndex((x) => x < 0) >= 0
                ? w.findIndex((x) => x < 0)
                : w.reduce((best, x, i) => (x > (w[best] ?? 0) ? i : best), 0);
        const m = L.rooms[room],
            tn = m ? L.tunnels[m.tunnel] : undefined;
        if (tunnelAt(s) >= 0 && m && tn) return { x: (m.x0 + m.x1) / 2, y: tn.y - 0.8 };
        const door = L.tunnels[0]?.door;
        return door === undefined ? null : { x: door, y: G - 0.3 };
    }
    return null;
}

/** Squares the step strip's words take, per letter, at the size they are written. */
const STRIP_LETTER = 0.21;

/** The step strip at the top of the view and the arrow over the next thing to touch, on the levels with the most help. */
function guide(s: ChipState, sprites: Sprite[], marks: Mark[], rest: boolean): void {
    const L = s.L;
    if (L.help < 2) return;
    const now = s.stepNow;
    const label = now >= STEPS.length ? "All done!" : `${now + 1} ${STEPS[now] ?? ""}`;
    // smaller than the garden's strip, since this view is closer and its squares larger on the screen
    const dot = 0.95,
        dots = STEPS.length * dot,
        across = Math.max(dots, label.length * STRIP_LETTER * 0.8) + 0.8;
    const cardW = Math.min(9, Math.ceil(across + 1));
    // in the top left corner under the cheeks and the snow clock, clear of the trees in the middle of the view
    const fx = (cardW * 0.8) / 2 + 0.4,
        fy = 3.7;
    sprites.push({
        key: "steps",
        art: "dollchip",
        params: { kind: "card", tone: "sky", on: false, w: cardW, h: 3 },
        x: fx,
        y: fy + 0.55,
        size: cardW * 0.8,
        fixed: true,
        z: 48,
    });
    let x = fx - dots / 2;
    STEPS.forEach((_, i) => {
        if (i === now)
            sprites.push({
                key: "steps:now",
                art: "dollchip",
                params: { kind: "ring", tone: "glow", on: true, w: 2, h: 2 },
                x: x + dot / 2,
                y: fy,
                size: 0.85,
                fixed: true,
                z: 49,
            });
        sprites.push({
            key: `steps:tick:${i}`,
            art: "dollchip",
            params: { kind: "tick", tone: "mint", on: i < now, w: 2, h: 2 },
            x: x + dot / 2,
            y: fy,
            size: 0.62,
            fixed: true,
            z: 49.5,
        });
        x += dot;
    });
    marks.push({ kind: "word", x: fx, y: fy + 0.95, text: label, size: 0.36, fixed: true });
    if (s.won || rest) return;
    const to = pointerOf(s);
    const shows = L.help >= 3 || s.steps - s.stepAt >= GUIDE_WAIT;
    // no arrow over what she has reached already, where it would stand on her and her cheek count
    const there = to !== null && Math.abs(to.x - s.r.x) < 1.5 && Math.abs(to.y - s.r.y) < 2;
    const half = VIEW.w / 2 - 1.5;
    if (to && shows && Math.abs(to.x - s.cam.x) > half) {
        // what to do next is off the view: an arrow at its edge points the way
        const dir = to.x > s.cam.x ? 1 : -1,
            b = bounce(s.steps, rest) * dir,
            y = Math.min(s.r.y - 1.6, G - 1.6);
        marks.push({
            kind: "line",
            a: { x: s.cam.x + dir * (half - 2) + b, y },
            b: { x: s.cam.x + dir * half + b, y },
            head: true,
        });
    } else if (to && shows && !there) {
        const b = bounce(s.steps, rest);
        marks.push({
            kind: "line",
            a: { x: to.x, y: to.y - 3.2 - b },
            b: { x: to.x, y: to.y - 1.2 - b },
            head: true,
        });
    }
}

/** The help the level shows: a room's words, the shake's ring and the jump's arc. */
function help(s: ChipState, marks: Mark[], rest: boolean): void {
    const L = s.L;
    L.rooms.forEach((m, k) => {
        const t = L.tunnels[m.tunnel];
        if (!t) return;
        const has = worth(s.rooms[k] ?? { acorns: 0, pinecones: 0 }),
            need = s.V.needs[k] ?? 0,
            label = s.V.labels[k] ?? "";
        const named = /^\d+$/.test(label);
        const more = L.free
            ? `${has}`
            : named
              ? L.help >= 1
                  ? `${has} of ${need}`
                  : `${has}`
              : label === "?"
                ? `${has}`
                : `${label}: ${has}`;
        marks.push({
            kind: "word",
            x: (m.x0 + m.x1) / 2,
            y: t.y - TUNNEL + 0.55,
            text: more,
            size: 0.6,
        });
    });
    if (rest || s.won) return;
    const on = treeAt(s);
    if (L.help >= 2 && on >= 0) {
        const ring = shakeRing(s, on);
        if (ring) {
            const pts: Pt[] = [];
            for (let x = ring.x - ring.r; x <= ring.x + ring.r + 1e-6; x += 0.5)
                pts.push({ x, y: G - 0.15 });
            marks.push({ kind: "dots", pts, faint: true });
        }
    }
    // the jump's arc only where a jump decides anything, over a stream
    if (L.help >= 3 && L.streams.length > 0 && grounded(s.r) && s.r.y <= G + 0.3 && on < 0)
        marks.push({ kind: "dots", pts: arcOf(s), faint: true });
}

function say(s: ChipState): string {
    const r = s.r,
        L = s.L;
    if (s.won) return s.said;
    const where =
        branchAt(s) >= 0
            ? "on a branch"
            : r.state === "climb"
              ? "climbing"
              : tunnelAt(s) >= 0
                ? roomAt(s) >= 0
                    ? `in room ${roomAt(s) + 1} of the burrow`
                    : "in the burrow"
                : grounded(r)
                  ? "on the ground"
                  : "in the air";
    const cheeks = s.cheeks.length
        ? `${s.cheeks.filter((c) => c.food === "acorn").length} acorns and ${s.cheeks.filter((c) => c.food === "pinecone").length} pinecones in her cheeks`
        : "empty cheeks";
    const lying = s.nuts.filter((n) => n.at === "rest").length,
        hanging = s.nuts.filter((n) => n.at === "hang").length;
    return `${s.V.ask} Nutmeg is ${where}, ${Math.round(r.x)} squares along, with ${cheeks}. Rooms: ${s.rooms.map(worth).join(", ")}. ${lying} lying on the ground, ${hanging} on the trees.${L.time !== undefined ? ` ${Math.max(0, Math.ceil(L.time - s.time))} seconds to the first snow.` : ""}`;
}

export function chipEnded(s: ChipState): RoundEnd | null {
    if (s.won) return { won: true, words: wonWords(s) };
    if (s.out) {
        const left = wants(s).reduce((n, w) => n + Math.abs(w), 0);
        return {
            won: false,
            words: `The first snow came with the store ${left} away from right. Another go?`,
        };
    }
    return null;
}

const SOUNDS: Kit = {
    lift: [
        { wave: "sine", hz: 260, to: 200, attack: 0.01, decay: 0.12, gain: 0.25 },
        { wave: "noise", hz: 900, attack: 0.005, decay: 0.05, gain: 0.08 },
    ],
    place: [
        { wave: "sine", hz: 900, to: 600, attack: 0.002, decay: 0.07, gain: 0.25 },
        { wave: "noise", hz: 1600, attack: 0.002, decay: 0.03, gain: 0.08 },
    ],
    creak: [{ wave: "noise", hz: 1100, attack: 0.02, decay: 0.18, gain: 0.22 }],
    level: [
        { wave: "triangle", hz: 660, attack: 0.004, decay: 0.08, gain: 0.25 },
        { wave: "triangle", hz: 740, attack: 0.004, decay: 0.08, gain: 0.22, delay: 0.07 },
        { wave: "triangle", hz: 830, attack: 0.004, decay: 0.08, gain: 0.2, delay: 0.14 },
        { wave: "triangle", hz: 990, attack: 0.004, decay: 0.2, gain: 0.2, delay: 0.21 },
    ],
    ring: [{ wave: "sine", hz: 1320, attack: 0.003, decay: 0.15, gain: 0.15 }],
    back: [
        { wave: "square", hz: 1700, to: 1500, attack: 0.002, decay: 0.03, gain: 0.06 },
        { wave: "square", hz: 1800, to: 1600, attack: 0.002, decay: 0.03, gain: 0.06, delay: 0.06 },
        { wave: "square", hz: 1750, to: 1550, attack: 0.002, decay: 0.03, gain: 0.06, delay: 0.12 },
    ],
    crash: [{ wave: "triangle", hz: 1500, to: 1100, attack: 0.04, decay: 0.6, gain: 0.12 }],
    bump: [
        { wave: "sine", hz: 180, to: 110, attack: 0.002, decay: 0.1, gain: 0.3 },
        { wave: "noise", hz: 600, attack: 0.002, decay: 0.05, gain: 0.12 },
    ],
    nope: [{ wave: "triangle", hz: 300, to: 220, attack: 0.01, decay: 0.25, gain: 0.25 }],
    splash: [
        { wave: "noise", hz: 1400, attack: 0.005, decay: 0.35, gain: 0.4 },
        { wave: "sine", hz: 220, to: 90, attack: 0.005, decay: 0.25, gain: 0.25 },
    ],
    win: [
        { wave: "triangle", hz: 523, attack: 0.005, decay: 0.18, gain: 0.4 },
        { wave: "triangle", hz: 659, attack: 0.005, decay: 0.18, gain: 0.36, delay: 0.14 },
        { wave: "triangle", hz: 784, attack: 0.005, decay: 0.2, gain: 0.34, delay: 0.28 },
        { wave: "triangle", hz: 1047, attack: 0.005, decay: 0.5, gain: 0.32, delay: 0.42 },
    ],
};

const isStore = (v: unknown): v is { rooms: { acorns: number; pinecones: number }[] } =>
    typeof v === "object" &&
    v !== null &&
    "rooms" in v &&
    Array.isArray(v.rooms) &&
    v.rooms.every(
        (r: unknown) =>
            typeof r === "object" &&
            r !== null &&
            "acorns" in r &&
            "pinecones" in r &&
            Number.isInteger(r.acorns) &&
            Number.isInteger(r.pinecones) &&
            Number(r.acorns) >= 0 &&
            Number(r.pinecones) >= 0,
    );

export const chipmunkGame: ActionGame<ChipState> = {
    id: "chipmunk",
    title: "Nutmeg's winter store",
    group: "action",
    levels: CHIP_LEVELS,
    rate: RATE,
    touch: true,
    quiet: true,
    wasd: true,
    sounds: SOUNDS,
    card: { round: { level: 0 }, keep: 24, minutes: 3 },
    portrait: { keep: 18 },
    saves: { level: CHIP_LEVELS.length - 1 },
    cover: { art: "chipmunkcover", params: {} },
    hint: "Tap a tree to run there and shake it, or run close and tap Shake, space or down. Run over acorns to pick them up. Walk onto the burrow's door with a cheekful, or press down there, and Nutmeg runs to the room and fills it. Up in the burrow takes her out again. Tap a tree, the door or a room to go there.",
    controls: {
        arrows: {
            left: "Run left",
            right: "Run right",
            up: "Jump, climb, or out of the burrow",
            down: "Shake, or into the burrow",
        },
        go: "Jump",
        icons: { go: "launch" },
    },
    goLabel: (s) => (canShake(s) ? "Shake" : "Jump"),
    goIcon: (s) => (canShake(s) ? "shake" : "launch"),
    commands: [
        { id: "act", label: "Take one back or spit one out", key: "e", icon: "grab" },
        { id: "shake", label: "Shake the tree", key: "q", icon: "shake", keysOnly: true },
    ],
    command: (s, id) => {
        if (id === "act") act(s);
        if (id === "shake" && canShake(s)) s.pulse = Math.max(s.pulse, 1.05);
    },
    // Action shows only where it is needed: a room with too many, or a load to lighten before the stream
    shows: (s, id) =>
        id === "act" &&
        ((roomAt(s) >= 0 && (wants(s)[roomAt(s)] ?? 0) < 0) ||
            (s.L.streams.length > 0 && s.cheeks.length > 0 && tunnelAt(s) < 0)),
    checkpoint: (s) => ({ rooms: s.rooms.map((r) => ({ ...r })) }),
    restore: (s, v) => {
        if (!isStore(v) || v.rooms.length !== s.rooms.length) return false;
        s.rooms = v.rooms.map((r) => ({ acorns: r.acorns, pinecones: r.pinecones }));
        return true;
    },
    start: (phase, seed) => startChip(phase, seed === undefined ? 0 : seed - 1),
    step: stepChip,
    frame: chipFrame,
    say,
    note: (s) => s.said,
    won: (s) => s.won,
    ended: chipEnded,
    objectives: (s) => ({
        completed: wants(s).filter((w) => w === 0).length,
        total: s.rooms.length,
    }),
    cancelInput: (s) => {
        s.touchFrom = -1;
        s.above = false;
        s.goto = null;
        s.route = null;
    },
    hum: (s) => {
        const out: Hum[] = [
            { kind: "wind", level: s.L.wind ? 0.25 : 0.05 },
            { kind: "birds", level: s.hawk?.x != null ? 0 : 0.05 },
        ];
        if (s.L.streams.length) out.push({ kind: "water", level: 0.08 });
        return out;
    },
    tuning: CHIP,
    still: {
        press: () => Math.round(RATE * 0.35),
        settling: (s) =>
            (!grounded(s.r) && s.r.state !== "climb") ||
            s.splash > 0 ||
            s.tumbles.length > 0 ||
            s.nuts.some(
                (n) => n.at === "air" || n.at === "float" || (n.at === "rest" && n.vx !== 0),
            ),
    },
};
