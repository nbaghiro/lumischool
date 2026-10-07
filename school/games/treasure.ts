// Treasure island: an island seen from above, squared like the map that comes with it, where a child
// walks Charlie about and digs where the map says. The clues are the mathematics: so many squares north
// and east of a landmark, a square named by its letter and number, a compass point and a distance, a
// distance measured with a knotted rope and walked again somewhere else, and clues that lead to the next
// clue in a bottle. Charlie walks freely at any time, carries the spade or the rope, and one Action does
// what is in front of her. The island's ground and grid are engine/parts/outdoors/islandground.ts, the
// map's squares and compass points engine/motion/compass.ts. See .docs/games.md.
import { actor, actorSprites, stepActor, type Actor, type Cycle } from "../../engine/motion/actor";
import { keepInside } from "../../engine/motion/camera";
import {
    LETTERS,
    STEP,
    bearing,
    letterOf,
    middleOf,
    nameOf,
    offset,
    offsetWords,
    pointOf as compassPoint,
    sameSquare,
    squareAt,
    squareNamed,
    stepsApart,
    walkFrom,
    type Leg,
    type Point,
    type Square,
} from "../../engine/motion/compass";
import type { Pt } from "../../engine/motion/geometry";
import { bounce, bubbleWidth, currentOf, pointing, wrap } from "../../engine/motion/guide";
import type { Pad } from "../../engine/motion/pad";
import {
    blockedAt,
    faceTo,
    heading,
    onLand,
    roamer,
    route,
    stepRoam,
    walkTo,
    type Gait,
    type Place,
    type Roamer,
} from "../../engine/motion/roam";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import type { IconName } from "../../engine/parts/apps/icon";
import {
    COAST,
    DOCK,
    GRASS,
    GRID,
    ISLAND,
    POND,
    SPOTS,
    WALK,
    within,
    type Spot,
} from "../../engine/parts/outdoors/islandground";
import type { Hum, Kit } from "../../engine/sound/kit";
import type { ActionGame, ActionLevel, Levels } from "./game";

export const RATE = 60;
const DT = 1 / RATE;
/** Steps idle before the guide points and Charlie says the next step, on levels past the first. */
const GUIDE_WAIT = RATE * 8;

/** How much of the island is in view: the island is bigger, and the view follows Charlie round it. */
export const VIEW = { w: 30, h: 19 } as const;
export const WORLD = { w: ISLAND.w, h: ISLAND.h } as const;

/** Squares across a phone held upright shows, following her. */
const PORTRAIT = 20;

/** Where she lands: on the beach at the foot of the dock, the boat behind her. */
export const START = { x: 30.2, y: 38.4 } as const;
/** Where the spade lies on the beach, on the level she has to fetch it. */
export const SHOVEL_AT = { x: 34, y: 38.3 } as const;
const BOAT = { x: 30.2, y: 46.6 } as const;
/** How far from her feet she reaches to take, open or read a thing. */
export const REACH = 2.4;

export const TREASURE = {
    walk: knob(6.5, 4, 10, 0.5, "squares/s", "how fast Charlie walks about the island"),
    dig: knob(0.9, 0.4, 2, 0.1, "s", "how long one hole takes to dig"),
    follow: knob(3, 1, 8, 0.5, "/s", "how quickly the view catches up with her"),
};

export type Landmark = Spot;

/** The square each landmark stands in, where counting from it starts: the cave's is the one at its mouth. */
export const LANDMARK_SQUARE: Record<Landmark, Square> = {
    palm: { c: 3, r: 5 },
    rock: { c: 8, r: 5 },
    lighthouse: { c: 11, r: 2 },
    cave: { c: 5, r: 4 },
    wreck: { c: 0, r: 6 },
    parrot: { c: 9, r: 7 },
};

export const LANDMARK_NAME: Record<Landmark, string> = {
    palm: "the palm tree",
    rock: "the big rock",
    lighthouse: "the lighthouse",
    cave: "the cave",
    wreck: "the shipwreck",
    parrot: "the parrot's tree",
};

const LANDMARKS: Landmark[] = ["palm", "rock", "lighthouse", "cave", "wreck", "parrot"];

/** What a clue says to do to find where to dig. */
export type Clue =
    /** Start at a landmark and walk the legs. */
    | { kind: "walk"; from: Landmark; legs: Leg[] }
    /** Dig in the square with this name. */
    | { kind: "at"; square: string }
    /** Walk the legs from where the last thing was dug up. */
    | { kind: "here"; legs: Leg[] }
    /** Measure from `a` to `b` with the rope, and walk that far towards `point` from `from`. */
    | { kind: "measure"; a: Landmark; b: Landmark; from: Landmark; point: Point };

export interface TreasureLevel extends ActionLevel {
    /** The first thing to do, said before anything has been. */
    prompt: string;
    /** The clues, each leading to something buried. */
    clues: Clue[];
    /** A chain is followed clue by clue, each bottle holding the next; any order is a list of squares. */
    order: "chain" | "any";
    /** How much the board helps: counting aloud and the way on the map at 2, the count under her at 1, nothing at nought. */
    preview: 0 | 1 | 2;
    /** Where the spade is at the start: lying on the beach to fetch, or in her bag. */
    spade: "beach" | "bag";
    /** A compass rose round her feet, for levels that walk to the compass's points. */
    compass?: true;
    /** The knotted rope in her bag too. */
    rope?: true;
    /** A star for digging it up having walked no further than the shortest way. */
    shortest?: true;
    /** The free island: three treasures at a time, and a new map when they are found. */
    free?: true;
}

const legs = (...ls: [number, Point][]): Leg[] => ls.map(([n, point]) => ({ n, point }));

export const TREASURE_LEVELS: Levels<TreasureLevel> = [
    {
        title: "Three north, four east",
        grades: [1, 1],
        goal: "Fetch the spade, then start at the palm tree, walk 3 squares north and 4 squares east, and dig.",
        prompt: "The spade is on the beach. Pick it up first.",
        clues: [{ kind: "walk", from: "palm", legs: legs([3, "north"], [4, "east"]) }],
        order: "chain",
        preview: 2,
        spade: "beach",
    },
    {
        title: "Round the pond",
        grades: [1, 2],
        goal: "Start at the cave, walk 4 squares west and 3 squares north, and dig. The pond is in the way, so go round it and keep counting.",
        prompt: "Walk to the cave first. That is where the counting starts.",
        clues: [{ kind: "walk", from: "cave", legs: legs([4, "west"], [3, "north"]) }],
        order: "chain",
        preview: 2,
        spade: "bag",
    },
    {
        title: "Dig at G7",
        grades: [2, 2],
        goal: "Find square G7, its letter along the top of the map and its number down the side, and dig there.",
        prompt: "The posts on the beach name the squares: letters along the top, numbers down the side.",
        clues: [{ kind: "at", square: "G7" }],
        order: "chain",
        preview: 1,
        spade: "bag",
    },
    {
        title: "A message in a bottle",
        grades: [2, 2],
        goal: "Dig at C8. What you dig up says where to dig next.",
        prompt: "Find C8 and dig. Something there tells you where to go next.",
        clues: [
            { kind: "at", square: "C8" },
            { kind: "here", legs: legs([3, "north"], [5, "east"]) },
        ],
        order: "chain",
        preview: 1,
        spade: "bag",
    },
    {
        title: "Follow the compass",
        grades: [2, 3],
        goal: "From the lighthouse, walk 4 squares south-west, one square south and one west at every step, and dig.",
        prompt: "South-west is between south and west. The compass at your feet shows the way.",
        clues: [{ kind: "walk", from: "lighthouse", legs: legs([4, "south-west"]) }],
        order: "chain",
        preview: 1,
        spade: "bag",
        compass: true,
    },
    {
        title: "Measure with the rope",
        grades: [3, 3],
        goal: "Tie the rope at the palm tree and walk it to the big rock to measure how far it is. The treasure is that far north of the parrot's tree.",
        prompt: "Tie the rope to the palm tree, then walk to the big rock and count the knots.",
        clues: [{ kind: "measure", a: "palm", b: "rock", from: "parrot", point: "north" }],
        order: "chain",
        preview: 1,
        spade: "bag",
        compass: true,
        rope: true,
    },
    {
        title: "Three bottles",
        grades: [3, 3],
        goal: "Dig at H8, then follow each bottle's clue to the next, until you find the chest.",
        prompt: "Dig at H8. Every bottle says where the next clue is.",
        clues: [
            { kind: "at", square: "H8" },
            { kind: "here", legs: legs([3, "north"], [2, "west"]) },
            { kind: "walk", from: "parrot", legs: legs([5, "north-west"]) },
        ],
        order: "chain",
        preview: 0,
        spade: "bag",
        compass: true,
    },
    {
        title: "The shortest way",
        grades: [3, 4],
        goal: "The treasure is 2 squares south and 5 east of the cave. Work out where that is and walk there the shortest way.",
        prompt: "You do not have to walk to the cave first. Where is the spot, and what is the shortest way there?",
        clues: [{ kind: "walk", from: "cave", legs: legs([2, "south"], [5, "east"]) }],
        order: "chain",
        preview: 0,
        spade: "bag",
        compass: true,
        shortest: true,
    },
    {
        title: "Three treasures",
        grades: [3, 4],
        goal: "Three chests are buried at B2, H5 and E8. Dig them all up, in any order.",
        prompt: "Three squares to find. Read each one's letter and number on the posts.",
        clues: [
            { kind: "at", square: "B2" },
            { kind: "at", square: "H5" },
            { kind: "at", square: "E8" },
        ],
        order: "any",
        preview: 0,
        spade: "bag",
    },
    {
        title: "Treasure island",
        grades: [1, 4],
        goal: "Explore the island. The map shows three squares with treasure; dig them up, and a new map comes. Shells are buried all over.",
        prompt: "Walk anywhere and dig anywhere. The map says where the chests are.",
        clues: [],
        order: "any",
        preview: 1,
        spade: "bag",
        compass: true,
        rope: true,
        free: true,
    },
];

export const FREE = TREASURE_LEVELS.length - 1;

export type Tool = "spade" | "rope";
type Hand = Tool | "none";

/** A hole dug, and what came out of it. */
export interface Dug {
    c: number;
    r: number;
    what: "none" | "chest" | "bottle" | "shell";
    /** The clue it answered, or -1. */
    clue: number;
    /** A chest opened, a bottle read. */
    open: boolean;
    at: number;
}

interface Print {
    x: number;
    y: number;
    /** Radians, clockwise from the toe pointing up. */
    a: number;
    left: boolean;
    at: number;
}

interface Floater {
    text: string;
    x: number;
    y: number;
    at: number;
}

type Act = "stand" | "walk" | "dig" | "cheer";

/** What the one Action does, for what is in front of her or what a finger touched. */
export type Target =
    | { kind: "spade" }
    | { kind: "chest"; i: number }
    | { kind: "bottle"; i: number }
    | { kind: "dig"; c: number; r: number }
    | { kind: "dug" }
    | { kind: "off" }
    | { kind: "tie"; at: Landmark }
    | { kind: "untie" }
    | { kind: "parrot" }
    | { kind: "take"; tool: Tool };

interface Drag {
    at: number;
    from: Pt;
    /** Held or moved past a tap, so she follows the finger. */
    follow: boolean;
    /** A touch that only closed or opened the map. */
    spent: boolean;
}

export interface TreasureState {
    phase: number;
    L: TreasureLevel;
    seed: number;
    /** Maps found on the free island, for the next map's squares. */
    round: number;
    me: Roamer;
    actor: Actor<Act>;
    dir: 1 | -1;
    cam: Pt;
    pip: Roamer;
    pipActor: Actor<Act>;
    pipDir: 1 | -1;
    bag: Tool[];
    hand: Hand;
    spadeAt: Pt | null;
    /** The clue being followed, in a chain. */
    at: number;
    /** Each clue's thing found: its chest opened or its bottle read. */
    found: boolean[];
    dug: Dug[];
    /** The square the last thing was dug up in, where a clue that says "from here" starts. */
    lastDug: Square | null;
    /** A hole being dug: walking to stand by it while `from` is below nought, then digging since `from`. */
    digging: { c: number; r: number; from: number } | null;
    rope: { from: Landmark } | null;
    measured: { a: Landmark; b: Landmark; n: number } | null;
    /** Whether she has stood at the clue's start since the clue began. */
    started: boolean;
    square: Square | null;
    prints: Print[];
    printAt: number;
    left: boolean;
    floaters: Floater[];
    /** Squares of the island walked since landing, for the shortest way. */
    walked: number;
    mapBig: boolean;
    newClue: number;
    errand: Target | null;
    drag: Drag | null;
    last: Pt | null;
    said: string;
    saidAt: number;
    bubble: { text: string; until: number; parrot: boolean } | null;
    used: boolean;
    guideAt: number;
    stepWas: number;
    cheer: number;
    collection: { coins: number; gems: number; shells: number };
    steps: number;
    won: boolean;
    wonAt: number;
}

const POINT_WORDS = (l: Leg): string => `${l.n} ${l.n === 1 ? "square" : "squares"} ${l.point}`;
const legsWords = (ls: readonly Leg[]): string =>
    ls.length === 1
        ? POINT_WORDS(ls[0] ?? { n: 0, point: "north" })
        : ls
              .map((l, i) => (i === ls.length - 1 ? `then ${POINT_WORDS(l)}` : POINT_WORDS(l)))
              .join(", ");
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** The square a landmark's clue starts at, or a "here" clue's dug square. */
function anchorOf(s: Pick<TreasureState, "lastDug">, clue: Clue): Square | null {
    if (clue.kind === "walk") return LANDMARK_SQUARE[clue.from];
    if (clue.kind === "measure") return LANDMARK_SQUARE[clue.from];
    if (clue.kind === "here") return s.lastDug;
    return null;
}

/** How far the rope measures between two landmarks, in squares. */
export const measureOf = (a: Landmark, b: Landmark): number =>
    stepsApart(LANDMARK_SQUARE[a], LANDMARK_SQUARE[b]);

/** The legs a clue walks from its start. */
function legsOf(clue: Clue): Leg[] {
    if (clue.kind === "walk" || clue.kind === "here") return clue.legs;
    if (clue.kind === "measure") return [{ point: clue.point, n: measureOf(clue.a, clue.b) }];
    return [];
}

/** Where a clue says to dig, given the square the last thing was dug up in. */
export function targetOf(clue: Clue, lastDug: Square | null): Square | null {
    if (clue.kind === "at") return squareNamed(GRID, clue.square);
    const from = clue.kind === "here" ? lastDug : LANDMARK_SQUARE[clue.from];
    return from ? walkFrom(from, legsOf(clue)) : null;
}

/** A clue in words, as the map's note says it. */
export function clueWords(clue: Clue): string {
    switch (clue.kind) {
        case "walk":
            return `Start at ${LANDMARK_NAME[clue.from]}. Walk ${legsWords(clue.legs)}. Dig there.`;
        case "at":
            return `Dig at ${clue.square}.`;
        case "here":
            return `From where you dug this up, walk ${legsWords(clue.legs)}. Dig there.`;
        case "measure":
            return `Measure from ${LANDMARK_NAME[clue.a]} to ${LANDMARK_NAME[clue.b]} with the rope. Dig that far ${clue.point} of ${LANDMARK_NAME[clue.from]}.`;
    }
}

/** A clue as short as the line under the map card holds. */
function clueShort(clue: Clue): string {
    const short = (ls: readonly Leg[]) => ls.map((l) => `${l.n} ${LETTERS[l.point]}`).join(", ");
    switch (clue.kind) {
        case "walk":
            return `${cap(LANDMARK_NAME[clue.from].replace(/^the /, ""))}: ${short(clue.legs)}`;
        case "at":
            return `Dig at ${clue.square}`;
        case "here":
            return `From here: ${short(clue.legs)}`;
        case "measure":
            return `${cap(LANDMARK_NAME[clue.a].replace(/^the /, ""))} to ${LANDMARK_NAME[clue.b].replace(/^the /, "")}, then ${LETTERS[clue.point]}`;
    }
}

/** The clues showing now: the one being followed in a chain, or every one not found yet. */
function current(s: TreasureState): number[] {
    if (s.L.order === "chain") return s.at < s.L.clues.length ? [s.at] : [];
    return s.L.clues.flatMap((_, i) => (s.found[i] ? [] : [i]));
}

/** A small number from two, for what lies buried on the free island. */
const mix = (a: number, b: number): number => {
    const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return v - Math.floor(v);
};

/** Squares a chest can be buried in: on the grid, on land, and with room to stand and dig. */
export function diggable(q: Square): boolean {
    const m = middleOf(GRID, q);
    return within(COAST, m) && !blockedAt(placeOf(), m, 0.4) && stancesOf(q).length > 0;
}

/** Where she can stand to dig a square: beside its middle, below it first, so the hole is in front of her. */
function stancesOf(q: Square): Pt[] {
    const m = middleOf(GRID, q);
    const place = placeOf(),
        r = gaitOf().radius;
    // beside the hole rather than in front of it, so what comes up is not hidden behind her
    return [
        { x: m.x - 1.15, y: m.y + 0.35 },
        { x: m.x + 1.15, y: m.y + 0.35 },
        { x: m.x, y: m.y + 1.1 },
        { x: m.x, y: m.y - 1.1 },
    ].filter((p) => !blockedAt(place, p, r));
}

/** Three squares for the free island's next map, none dug yet. */
function freeClues(seed: number, round: number, dug: readonly Dug[]): Clue[] {
    const out: Clue[] = [];
    for (let k = 0; out.length < 3 && k < 400; k++) {
        const c = Math.floor(mix(seed + k * 7, round * 13 + 1) * GRID.cols),
            r = Math.floor(mix(seed + k * 11, round * 17 + 3) * GRID.rows);
        const name = nameOf({ c, r });
        if (!diggable({ c, r })) continue;
        if (dug.some((d) => d.c === c && d.r === r)) continue;
        if (out.some((x) => x.kind === "at" && x.square === name)) continue;
        out.push({ kind: "at", square: name });
    }
    return out;
}

/** The island as she walks it: the land and the dock, round the pond, the rocks and the landmarks. */
const PLACE: Place = (() => {
    const foot = (p: Pt, w: number, h: number) => ({ x: p.x - w / 2, y: p.y - h, w, h });
    return {
        w: WORLD.w,
        h: WORLD.h,
        land: WALK,
        blocked: [
            {
                x: POND.x - POND.rx + 0.3,
                y: POND.y - POND.ry + 0.3,
                w: POND.rx * 2 - 0.6,
                h: POND.ry * 2 - 0.6,
            },
            foot(SPOTS.palm, 0.8, 0.6),
            foot(SPOTS.rock, 2.4, 1.3),
            foot(SPOTS.lighthouse, 2.2, 1.3),
            { x: SPOTS.cave.x - 3.2, y: SPOTS.cave.y - 3.1, w: 6.4, h: 2.8 },
            { x: 6.2, y: SPOTS.wreck.y - 2.6, w: 6, h: 2.4 },
            foot(SPOTS.parrot, 1, 0.7),
        ],
        soft: [{ x: 35.2, y: 9.2, w: 11, h: 6.4 }],
    };
})();

export const placeOf = (): Place => PLACE;

export const gaitOf = (): Gait => ({
    speed: TREASURE.walk.value,
    accel: TREASURE.walk.value * 7,
    radius: 0.5,
});

/** The view's centre for her standing here, kept inside the island's sea. */
const lookAt = (p: Pt): Pt => keepInside(p, VIEW, WORLD);

export function startTreasure(L: TreasureLevel, phase: number, seed = 1): TreasureState {
    const level = L.free ? { ...L, clues: freeClues(seed, 0, []) } : L;
    const bag: Tool[] = L.spade === "bag" ? ["spade"] : [];
    if (L.rope) bag.push("rope");
    const s: TreasureState = {
        phase,
        L: level,
        seed,
        round: 0,
        me: roamer(START.x, START.y, { x: 0, y: -1 }),
        actor: actor<Act>("stand", "stand", 1),
        dir: 1,
        cam: lookAt(START),
        pip: roamer(START.x - 1.8, START.y + 0.6, { x: 0, y: -1 }),
        pipActor: actor<Act>("stand", "stand", 1),
        pipDir: 1,
        bag,
        hand: L.rope && L.clues[0]?.kind === "measure" ? "rope" : (bag[0] ?? "none"),
        spadeAt: L.spade === "beach" ? { ...SHOVEL_AT } : null,
        at: 0,
        found: level.clues.map(() => false),
        dug: [],
        lastDug: null,
        digging: null,
        rope: null,
        measured: null,
        started: false,
        square: null,
        prints: [],
        printAt: 0,
        left: false,
        floaters: [],
        walked: 0,
        mapBig: false,
        newClue: 0,
        errand: null,
        drag: null,
        last: null,
        said: "",
        saidAt: -999,
        bubble: null,
        used: false,
        guideAt: 0,
        stepWas: 0,
        cheer: -999,
        collection: { coins: 0, gems: 0, shells: 0 },
        steps: 0,
        won: false,
        wonAt: 0,
    };
    return s;
}

export const start = (phase: number, seed = 1): TreasureState =>
    startTreasure(TREASURE_LEVELS[phase] ?? TREASURE_LEVELS[0], phase, seed);

function tell(s: TreasureState, words: string): void {
    s.said = words;
    s.saidAt = s.steps;
}

function speak(s: TreasureState, words: string, seconds = 4, parrot = false): void {
    tell(s, words);
    s.bubble = { text: words, until: s.steps + Math.round(RATE * seconds), parrot };
}

/** Where a dug thing lies: in the middle of its square. */
const holeAt = (d: Pick<Dug, "c" | "r">): Pt => middleOf(GRID, d);

const near = (a: Pt, b: Pt, d: number) => Math.hypot(a.x - b.x, a.y - b.y) <= d;

/** The landmark she is beside, if any. */
function landmarkNear(p: Pt, within = 2.8): Landmark | null {
    let best: Landmark | null = null,
        bd = within;
    for (const id of LANDMARKS) {
        const d = Math.hypot(SPOTS[id].x - p.x, SPOTS[id].y - p.y);
        if (d <= bd) {
            bd = d;
            best = id;
        }
    }
    return best;
}

/** What the Action would do now, for what is in front of her. */
export function aim(s: TreasureState): Target | null {
    if (s.digging) return null;
    const me = s.me;
    for (const [i, d] of s.dug.entries())
        if (!d.open && (d.what === "chest" || d.what === "bottle") && near(me, holeAt(d), REACH))
            return { kind: d.what, i };
    if (s.spadeAt && near(me, s.spadeAt, REACH)) return { kind: "spade" };
    if (s.hand === "rope") {
        if (s.rope) return { kind: "untie" };
        const at = landmarkNear(me);
        if (at) return { kind: "tie", at };
        if (s.bag.includes("spade")) return { kind: "take", tool: "spade" };
    }
    if (s.hand === "spade") {
        const q = squareAt(GRID, me);
        if (!q) return { kind: "off" };
        return s.dug.some((d) => d.c === q.c && d.r === q.r)
            ? { kind: "dug" }
            : { kind: "dig", ...q };
    }
    if (near(me, SPOTS.parrot, 3)) return { kind: "parrot" };
    const tool = s.bag[0];
    if (s.hand === "none" && tool) return { kind: "take", tool };
    return null;
}

/** The Action's word for a target. */
export function labelOf(_s: TreasureState, t: Target | null): string {
    if (!t) return "Action";
    switch (t.kind) {
        case "spade":
            return "Pick up spade";
        case "chest":
            return "Open chest";
        case "bottle":
            return "Read bottle";
        case "dig":
        case "off":
            return "Dig";
        case "dug":
            return "Dug here";
        case "tie":
            return `Tie rope to ${LANDMARK_NAME[t.at].replace(/^the /, "")}`;
        case "untie":
            return "Untie rope";
        case "parrot":
            return "Ask the parrot";
        case "take":
            return `Take out ${t.tool}`;
    }
}

const ICON: Record<Target["kind"], IconName> = {
    spade: "grab",
    chest: "grab",
    bottle: "words",
    dig: "dig",
    dug: "dig",
    off: "dig",
    tie: "grab",
    untie: "grab",
    parrot: "words",
    take: "grab",
};

/** Where a target is, for the ring under it and for walking to it. */
export function pointOf(s: TreasureState, t: Target): Pt | null {
    switch (t.kind) {
        case "spade":
            return s.spadeAt;
        case "chest":
        case "bottle": {
            const d = s.dug[t.i];
            return d ? holeAt(d) : null;
        }
        case "dig":
            return middleOf(GRID, t);
        case "tie":
            return SPOTS[t.at];
        case "parrot":
            return SPOTS.parrot;
        default:
            return null;
    }
}

/** What the parrot says: the clue, short, as a parrot would. */
function parrotLine(s: TreasureState): string {
    const now = current(s)
        .map((i) => s.L.clues[i])
        .filter((c): c is Clue => c !== undefined);
    if (!now.length) return "Squawk. All found. Pieces of eight.";
    return `Squawk. ${now.map(clueShort).join(". ")}. Squawk.`;
}

function takeOut(s: TreasureState, tool: Tool, out: Happening[]): void {
    s.hand = tool;
    out.push({ cue: "lift", strength: 0.4 });
    tell(
        s,
        tool === "spade"
            ? "The spade. Press the button on a square to dig it."
            : "The rope. Tie it to a landmark, then walk to measure.",
    );
}

/** Opens a chest or reads a bottle, and with the last one found, wins. */
function openUp(s: TreasureState, i: number, out: Happening[]): void {
    const d = s.dug[i];
    if (!d || d.open) return;
    d.open = true;
    if (d.clue >= 0) s.found[d.clue] = true;
    if (d.what === "bottle") {
        s.at = d.clue + 1;
        s.newClue = s.steps;
        s.started = clueStarted(s);
        s.measured = null;
        s.rope = null;
        out.push(
            { cue: "level", strength: 0.5 },
            { burst: { kind: "sparkle", ...holeAt(d), n: 6 } },
        );
        const next = s.L.clues[s.at];
        speak(s, next ? `A note in the bottle: ${clueWords(next)}` : "An empty bottle.", 6);
        return;
    }
    const at = holeAt(d);
    s.cheer = s.steps;
    out.push(
        { cue: "ring", strength: 0.8 },
        { burst: { kind: "sparkle", x: at.x, y: at.y - 1, n: 14 } },
    );
    s.collection.coins += 5 + Math.floor(mix(d.c + s.round, d.r + s.seed) * 5);
    s.collection.gems += 1;
    if (s.L.free) {
        if (s.found.every(Boolean)) {
            s.round++;
            s.L = { ...s.L, clues: freeClues(s.seed, s.round, s.dug) };
            s.found = s.L.clues.map(() => false);
            s.newClue = s.steps;
            speak(s, `Treasure. A new map came with it: ${s.L.clues.map(clueWords).join(" ")}`, 5);
        } else speak(s, "Treasure. Coins and a gem for your collection.", 3);
        return;
    }
    if (s.found.every(Boolean)) {
        s.won = true;
        s.wonAt = s.steps;
        out.push({ cue: "win" });
        speak(s, winWords(s), 5);
    } else speak(s, `Treasure. ${s.found.filter((f) => !f).length} more to find.`, 3);
}

/** The shortest way from the beach to the treasure, walking round what is in the way, in squares of the island. */
export function shortestWalk(L: TreasureLevel): number {
    const clue = L.clues[0];
    const to = clue ? targetOf(clue, null) : null;
    if (!to) return 0;
    const end = { x: middleOf(GRID, to).x, y: middleOf(GRID, to).y + 0.9 };
    const way = route(placeOf(), START, end, gaitOf().radius) ?? [end];
    let at: Pt = START,
        n = 0;
    for (const p of way) {
        n += Math.hypot(p.x - at.x, p.y - at.y);
        at = p;
    }
    return n / GRID.cell;
}

function winWords(s: TreasureState): string {
    if (!s.L.shortest) return "You found the treasure.";
    const walked = s.walked / GRID.cell,
        best = shortestWalk(s.L);
    return walked <= best * 1.25 + 1.5
        ? `You found it, and walked about ${Math.round(walked)} squares: the shortest way. A star.`
        : `You found it after about ${Math.round(walked)} squares. The shortest way is about ${Math.round(best)}: try again for the star.`;
}

/** Whether she stands, or has stood, at where the clue being followed starts. */
function clueStarted(s: TreasureState): boolean {
    const i = current(s)[0];
    const clue = i === undefined ? undefined : s.L.clues[i];
    if (!clue) return false;
    if (clue.kind === "here") return true;
    const a = anchorOf(s, clue);
    return a !== null && sameSquare(squareAt(GRID, s.me), a);
}

/**
 * How a square lies from where a clue starts, in the clue's own terms: along a diagonal for a clue that
 * walks one, otherwise so many north or south and east or west.
 */
function fromWords(clue: Clue, a: Square, q: Square): string {
    const b = bearing(a, q);
    const diagonal = legsOf(clue).some((l) => l.point.includes("-"));
    return diagonal && b && b.point.includes("-") ? `${b.n} ${b.point}` : offsetWords(offset(a, q));
}

/** What she is told when a hole has nothing in it: how far off she is, as kindly as the level allows. */
function missWords(s: TreasureState, q: Square): string {
    const i = current(s)[0];
    const clue = i === undefined ? undefined : s.L.clues[i];
    if (s.L.free) return "Just sand here.";
    if (!clue) return "Nothing here.";
    if (s.L.order === "any") {
        const names = current(s)
            .map((k) => s.L.clues[k])
            .flatMap((c) => (c?.kind === "at" ? [c.square] : []));
        return s.L.preview >= 1
            ? `Nothing here. This is ${nameOf(q)}. The map says ${names.join(", ")}.`
            : `Nothing here. Find the letter along the top and the number down the side.`;
    }
    if (clue.kind === "at")
        return s.L.preview >= 1
            ? `Nothing here. This is ${nameOf(q)}. The map says ${clue.square}.`
            : `Nothing here. Find ${clue.square}: its letter along the top, its number down the side.`;
    if (clue.kind === "measure")
        return `Nothing here. Measure from ${LANDMARK_NAME[clue.a]} to ${LANDMARK_NAME[clue.b]}, then walk that far ${clue.point} of ${LANDMARK_NAME[clue.from]}.`;
    const a = anchorOf(s, clue);
    const from = clue.kind === "here" ? "where you dug the bottle up" : LANDMARK_NAME[clue.from];
    if (!a) return "Nothing here.";
    if (s.L.preview === 0) return `Nothing here. Count again from ${from}.`;
    return `Nothing here. This is ${fromWords(clue, a, q)} from ${from}. The map says ${legsWords(clue.legs)}.`;
}

/** The hole is dug: what was buried there comes up, or nothing does. */
function unearth(s: TreasureState, q: Square, out: Happening[]): void {
    const at = middleOf(GRID, q);
    const hit = current(s).find((i) => {
        const clue = s.L.clues[i];
        return clue !== undefined && sameSquare(targetOf(clue, s.lastDug), q);
    });
    s.lastDug = { c: q.c, r: q.r };
    out.push({ burst: { kind: "dust", x: at.x, y: at.y, n: 4 } });
    if (hit !== undefined) {
        const bottle = s.L.order === "chain" && hit < s.L.clues.length - 1;
        s.dug.push({
            c: q.c,
            r: q.r,
            what: bottle ? "bottle" : "chest",
            clue: hit,
            open: false,
            at: s.steps,
        });
        out.push({ cue: "creak", strength: 0.6 }, { shake: 0.15 });
        speak(
            s,
            bottle
                ? "A bottle. Press the button to read it."
                : "A chest. Press the button to open it.",
            3,
        );
        return;
    }
    const shell = s.L.free === true && mix(q.c * 3 + s.seed, q.r * 5 + s.round) < 0.35;
    s.dug.push({
        c: q.c,
        r: q.r,
        what: shell ? "shell" : "none",
        clue: -1,
        open: shell,
        at: s.steps,
    });
    if (shell) {
        s.collection.shells += 1;
        s.floaters.push({ text: "a shell", x: at.x, y: at.y - 1.5, at: s.steps });
        out.push(
            { cue: "ring", strength: 0.35, pitch: 1.5 },
            { burst: { kind: "sparkle", x: at.x, y: at.y, n: 4 } },
        );
        speak(s, "A shell for your collection.", 2.5);
        return;
    }
    out.push({ cue: "nope", strength: 0.3 });
    speak(s, missWords(s, q), 6);
}

/** Starts a hole in her square: she steps to stand just below its middle, turned to it, and digs. */
function dig(s: TreasureState, q: Square): void {
    const m = middleOf(GRID, q);
    const stance = stancesOf(q).find((p) => near(s.me, p, 1.6)) ?? stancesOf(q)[0];
    if (stance && !near(s.me, stance, 0.2)) {
        walkTo(s.me, placeOf(), stance, gaitOf());
        s.digging = { ...q, from: -1 };
    } else {
        s.me.route = [];
        faceTo(s.me, m);
        s.digging = { ...q, from: s.steps };
    }
}

/** Does what a target asks, by the keys or by a finger's errand. */
function act(s: TreasureState, t: Target, out: Happening[]): void {
    s.used = true;
    s.guideAt = s.steps;
    s.bubble = null;
    switch (t.kind) {
        case "spade":
            s.spadeAt = null;
            if (!s.bag.includes("spade")) s.bag.unshift("spade");
            s.hand = "spade";
            out.push(
                { cue: "lift", strength: 0.5 },
                { puff: { x: SHOVEL_AT.x, y: SHOVEL_AT.y, n: 3 } },
            );
            speak(s, speechOf(s), 4);
            return;
        case "chest":
        case "bottle":
            openUp(s, t.i, out);
            return;
        case "dig":
            dig(s, t);
            return;
        case "dug":
            out.push({ cue: "nope", strength: 0.3 });
            speak(s, "You dug here already. Try another square.", 3);
            return;
        case "off":
            out.push({ cue: "nope", strength: 0.3 });
            speak(s, "This is off the map. Dig inside the squares the posts name.", 3);
            return;
        case "tie":
            s.rope = { from: t.at };
            s.measured = null;
            out.push({ cue: "place", strength: 0.4 });
            speak(s, `The rope is tied to ${LANDMARK_NAME[t.at]}. Walk and count the knots.`, 3);
            return;
        case "untie":
            s.rope = null;
            out.push({ cue: "lift", strength: 0.3 });
            tell(s, "The rope is coiled up again.");
            return;
        case "parrot":
            out.push({ cue: "ring", strength: 0.3, pitch: 2 });
            speak(s, parrotLine(s), 4, true);
            return;
        case "take":
            takeOut(s, t.tool, out);
            return;
    }
}

/** The next tool in her bag into her hand. */
function swap(s: TreasureState, out: Happening[]): void {
    if (!s.bag.length) {
        tell(
            s,
            s.spadeAt ? "Your bag is empty. Pick up the spade on the beach." : "Your bag is empty.",
        );
        return;
    }
    const i = s.hand === "none" ? 0 : (s.bag.indexOf(s.hand) + 1) % s.bag.length;
    const next = s.bag[i] ?? "spade";
    if (next === s.hand) return;
    if (s.hand === "rope") s.rope = null;
    takeOut(s, next, out);
}

/** Puts her back where the clue being followed starts, for another go at counting. */
export function back(s: TreasureState): boolean {
    const i = current(s)[0];
    const clue = i === undefined ? undefined : s.L.clues[i];
    const a = clue ? anchorOf(s, clue) : null;
    if (!a || s.won) return false;
    const m = middleOf(GRID, a);
    const free = [0.9, 0, -0.9, 1.2].map((dy) => ({ x: m.x, y: m.y + dy }));
    const to = free.find((p) => !blockedAt(placeOf(), p, gaitOf().radius)) ?? m;
    s.me.x = to.x;
    s.me.y = to.y;
    s.me.vx = s.me.vy = 0;
    s.me.route = [];
    s.digging = null;
    s.errand = null;
    s.rope = null;
    s.square = squareAt(GRID, s.me);
    s.started = true;
    s.cam = lookAt(s.me);
    tell(
        s,
        `Back at ${clue?.kind === "here" ? "where you dug the bottle up" : clue && "from" in clue ? LANDMARK_NAME[clue.from] : "the start"}. Count again from here.`,
    );
    return true;
}

export interface GuideStep {
    key: string;
    label: string;
    done: boolean;
}

/** Whether a leg of the clue has been walked: her square is as far that way from the start as it says. */
function legDone(
    o: { north: number; east: number },
    l: Leg,
    all: readonly Leg[],
    at: Square,
    to: Square,
): boolean {
    const st = STEP[l.point];
    if (st.c !== 0 && st.r !== 0) return sameSquare(at, to);
    // legs along the same line add up, so each is done once the walk along that line has gone as far
    const along = all.filter((x) => STEP[x.point].c === st.c && STEP[x.point].r === st.r);
    if (along.length > 1) return sameSquare(at, to);
    return st.r !== 0 ? -o.north === st.r * l.n : o.east === st.c * l.n;
}

/** The steps to do, each ticked from the island as it stands. */
export function stepsOf(s: TreasureState): GuideStep[] {
    const out: GuideStep[] = [];
    if (s.L.spade === "beach")
        out.push({ key: "spade", label: "Get the spade", done: s.bag.includes("spade") });
    if (s.L.order === "any") {
        for (const [i, clue] of s.L.clues.entries())
            out.push({
                key: `find:${i}`,
                label: clue.kind === "at" ? `Dig ${clue.square}` : "Dig",
                done: s.found[i] ?? false,
            });
        return out;
    }
    const i = Math.min(s.at, s.L.clues.length - 1);
    const clue = s.L.clues[i];
    if (!clue) return out;
    const found = s.found[i] ?? false;
    const dug = found || s.dug.some((d) => d.clue === i);
    const to = targetOf(clue, s.lastDug);
    const here = squareAt(GRID, s.me);
    const there = dug || (to !== null && sameSquare(here, to));
    if (clue.kind === "measure") {
        const measured = s.measured !== null || s.started || there;
        out.push(
            {
                key: "tie",
                label: `Tie the rope at ${LANDMARK_NAME[clue.a].replace(/^the /, "")}`,
                done: measured || s.rope?.from === clue.a,
            },
            {
                key: "measure",
                label: `Walk to ${LANDMARK_NAME[clue.b].replace(/^the /, "")}`,
                done: measured,
            },
            {
                key: "start",
                label: `Go to ${LANDMARK_NAME[clue.from].replace(/^the /, "")}`,
                done: s.started || there,
            },
            { key: "leg:0", label: `Walk ${measureOf(clue.a, clue.b)} ${clue.point}`, done: there },
        );
    } else if (clue.kind === "at")
        out.push({ key: "find", label: `Find ${clue.square}`, done: there });
    else {
        if (clue.kind === "walk")
            out.push({
                key: "start",
                label: `Go to ${LANDMARK_NAME[clue.from].replace(/^the /, "")}`,
                done: s.started || there,
            });
        const a = anchorOf(s, clue);
        for (const [k, l] of clue.legs.entries())
            out.push({
                key: `leg:${k}`,
                label: `Walk ${l.n} ${l.point}`,
                done:
                    there ||
                    (s.started &&
                        a !== null &&
                        here !== null &&
                        to !== null &&
                        legDone(offset(a, here), l, clue.legs, here, to)),
            });
    }
    out.push({ key: "dig", label: "Dig", done: dug });
    const bottle = i < s.L.clues.length - 1;
    out.push({ key: "open", label: bottle ? "Read the bottle" : "Open the chest", done: found });
    return out;
}

/** What Charlie says the next thing to do is, in a short, kind sentence. */
export function speechOf(s: TreasureState): string {
    if (s.won) return "You found the treasure.";
    const steps = stepsOf(s);
    const now = steps[currentOf(steps)];
    const i = current(s)[0];
    const clue = i === undefined ? undefined : s.L.clues[i];
    switch (now?.key.split(":")[0]) {
        case "spade":
            return "The spade is on the beach by the dock. Walk to it and pick it up.";
        case "tie":
            return clue?.kind === "measure"
                ? `Take the rope to ${LANDMARK_NAME[clue.a]} and tie it there.`
                : "Tie the rope to a landmark.";
        case "measure":
            return clue?.kind === "measure"
                ? `Walk to ${LANDMARK_NAME[clue.b]} and count the knots on the rope.`
                : "Walk and count the knots.";
        case "start":
            return clue && "from" in clue
                ? `Go to ${LANDMARK_NAME[clue.from]} first. That is where the counting starts.`
                : "Go to where the clue starts.";
        case "leg":
            return `Now walk ${now?.label.replace(/^Walk /, "") ?? ""}, counting the squares.`;
        case "find":
            return clue?.kind === "at"
                ? `Find ${clue.square}: the letter ${clue.square.charAt(0)} along the top, the number ${clue.square.slice(1)} down the side.`
                : "Find the square.";
        case "dig":
            return s.hand === "spade"
                ? "This is the square. Press the button to dig."
                : "Take out the spade to dig.";
        case "open":
            return "Press the button to open it.";
        default:
            return s.L.free
                ? "Dig on the squares the map shows."
                : "Read the map and follow the clue.";
    }
}

/** Where the guide's arrow points, and what at. */
export function pointerOf(s: TreasureState): { at: Pt; name: string } | null {
    if (s.won) return null;
    const steps = stepsOf(s);
    const now = steps[currentOf(steps)];
    const i = current(s)[0];
    const clue = i === undefined ? undefined : s.L.clues[i];
    const here = squareAt(GRID, s.me);
    switch (now?.key.split(":")[0]) {
        case "spade":
            return s.spadeAt ? { at: s.spadeAt, name: "the spade" } : null;
        case "tie":
            return clue?.kind === "measure"
                ? { at: SPOTS[clue.a], name: LANDMARK_NAME[clue.a] }
                : null;
        case "measure":
            return clue?.kind === "measure"
                ? { at: SPOTS[clue.b], name: LANDMARK_NAME[clue.b] }
                : null;
        case "start":
            return clue && "from" in clue
                ? { at: SPOTS[clue.from], name: LANDMARK_NAME[clue.from] }
                : null;
        case "leg": {
            const k = Number(now?.key.split(":")[1] ?? 0);
            const l = legsOf(clue ?? { kind: "at", square: "A1" })[k];
            if (!l || !here) return null;
            const next = { c: here.c + STEP[l.point].c, r: here.r + STEP[l.point].r };
            return { at: middleOf(GRID, next), name: `the next square ${l.point}` };
        }
        case "find": {
            const to = clue ? targetOf(clue, s.lastDug) : null;
            if (!to || !here) return null;
            if (here.c !== to.c)
                return {
                    at: { x: middleOf(GRID, to).x, y: GRID.y - 1.4 },
                    name: `the post for ${letterOf(to.c)}`,
                };
            if (here.r !== to.r)
                return {
                    at: { x: GRID.x - 1.2, y: middleOf(GRID, to).y },
                    name: `the post for ${to.r + 1}`,
                };
            return null;
        }
        case "dig":
            return here ? { at: middleOf(GRID, here), name: "this square" } : null;
        case "open": {
            const d = s.dug.find((x) => x.clue === i && !x.open);
            return d
                ? { at: holeAt(d), name: d.what === "bottle" ? "the bottle" : "the chest" }
                : null;
        }
        default:
            return null;
    }
}

export const pointerShows = (s: TreasureState): boolean =>
    pointing({ always: s.phase === 0, idle: s.steps - s.guideAt, after: GUIDE_WAIT });

/** The map card in the view's corner, in the view's own squares. */
// a fixed sprite keeps its place as a share of the view, so on a phone showing PORTRAIT of the
// view's 30 squares the card's middle moves in by a third: here it still ends inside the field
const CARD = { w: 6.6, x: 25, y: 0.25 } as const;
const cardHeight = CARD.w * (12 / 16);
const onCard = (v: Pt): boolean =>
    v.x >= CARD.x - CARD.w / 2 - 0.3 &&
    v.x <= VIEW.w &&
    v.y >= 0 &&
    v.y <= CARD.y + cardHeight + 1.4;

/** What a finger touched: a thing to walk to and use, or null for the ground. */
export function targetAt(s: TreasureState, p: Pt): Target | null {
    for (const [i, d] of s.dug.entries())
        if (!d.open && (d.what === "chest" || d.what === "bottle") && near(p, holeAt(d), 1.5))
            return { kind: d.what, i };
    if (s.spadeAt && near(p, { x: s.spadeAt.x, y: s.spadeAt.y - 0.8 }, 1.5))
        return { kind: "spade" };
    const parrot = { x: SPOTS.parrot.x + 1.2, y: SPOTS.parrot.y - 4.2 };
    if (near(p, parrot, 1.6)) return { kind: "parrot" };
    if (s.hand === "rope" && !s.rope) {
        const at = landmarkNear(p, 2.2);
        if (at) return { kind: "tie", at };
    }
    return null;
}

const TAP = { steps: Math.round(RATE * 0.35), squares: 0.9 } as const;

const routeEnd = (s: TreasureState): Pt | null => s.me.route[s.me.route.length - 1] ?? null;

function send(s: TreasureState, to: Pt): void {
    walkTo(s.me, placeOf(), to, gaitOf());
}

function touchDown(s: TreasureState, p: Pt, view: Pt | null, out: Happening[]): void {
    s.errand = null;
    const spent = s.mapBig || (view !== null && onCard(view));
    if (spent) {
        s.mapBig = !s.mapBig;
        out.push({ cue: "lift", strength: 0.25 });
    }
    s.drag = { at: s.steps, from: p, follow: false, spent };
}

function touchMove(s: TreasureState, d: Drag, p: Pt): void {
    if (d.spent) return;
    if (!d.follow && (s.steps - d.at > TAP.steps || !near(p, d.from, TAP.squares))) d.follow = true;
    if (d.follow) {
        if (s.digging) s.digging = null;
        const end = routeEnd(s);
        if (!end || !near(end, p, 0.8)) send(s, p);
    }
}

function touchUp(s: TreasureState, d: Drag, p: Pt, out: Happening[]): void {
    s.drag = null;
    if (d.spent || d.follow) return;
    // a tap on her does the Action
    if (Math.abs(p.x - s.me.x) <= 0.8 && p.y >= s.me.y - 3 && p.y <= s.me.y + 0.3) {
        s.me.route = [];
        press(s, out);
        return;
    }
    const t = targetAt(s, p);
    if (t?.kind === "parrot") {
        act(s, t, out);
        return;
    }
    if (t) {
        s.errand = t;
        const at = pointOf(s, t);
        if (at) send(s, at);
        return;
    }
    if (s.digging) s.digging = null;
    send(s, p);
}

/** The Action, pressed: what is in front of her, or a word on what to do. */
function press(s: TreasureState, out: Happening[]): void {
    const t = aim(s);
    if (t) {
        act(s, t, out);
        return;
    }
    if (s.digging) return;
    out.push({ cue: "nope", strength: 0.3 }, { shake: 0.1 });
    speak(s, speechOf(s), 3);
}

/** An errand she has walked to: done once she is near enough, or dropped where she cannot get there. */
function errandStep(s: TreasureState, out: Happening[]): void {
    const t = s.errand;
    if (!t) return;
    const at = pointOf(s, t);
    if (!at) {
        s.errand = null;
        return;
    }
    const d = Math.hypot(at.x - s.me.x, at.y - s.me.y);
    if (d <= REACH - 0.3 || (!s.me.route.length && d <= REACH + 0.6)) {
        s.me.route = [];
        faceTo(s.me, at);
        s.errand = null;
        act(s, t, out);
    } else if (!s.me.route.length) s.errand = null;
}

function digStep(s: TreasureState, want: Pt | null, out: Happening[]): boolean {
    const d = s.digging;
    if (!d) return false;
    if (want) {
        s.digging = null;
        return false;
    }
    const m = middleOf(GRID, d);
    if (d.from < 0) {
        if (!s.me.route.length && Math.hypot(s.me.vx, s.me.vy) < 0.3) {
            faceTo(s.me, m);
            d.from = s.steps;
        }
        return false;
    }
    const t = s.steps - d.from;
    const long = Math.round(TREASURE.dig.value * RATE);
    if (t > 0 && t % Math.round(long / 3) === 0 && t < long) {
        out.push({ cue: "bump", strength: 0.4 }, { burst: { kind: "dust", x: m.x, y: m.y, n: 2 } });
    }
    if (t >= long) {
        s.digging = null;
        unearth(s, d, out);
        return false;
    }
    return true;
}

const PEOPLE: Record<Act, Cycle> = {
    stand: { poses: ["stand"] },
    walk: { poses: ["walk", "stand"], per: 0.9 },
    dig: { poses: ["hold", "sweep"], every: 0.15 },
    cheer: { poses: ["cheer", "wave"], every: 0.35 },
};
const PUPS: Record<Act, Cycle> = {
    stand: { poses: ["sit"] },
    walk: { poses: ["walk", "stand"], per: 0.9 },
    dig: { poses: ["stand"] },
    cheer: { poses: ["cheer", "jump"], every: 0.35 },
};

const onSand = (p: Pt): boolean => onLand(COAST, p) && !within(GRASS, p);

/** Pip trots after her, never in her way, and sits when she stops. */
function pipStep(s: TreasureState): void {
    const p = s.pip,
        me = s.me;
    const d = Math.hypot(me.x - p.x, me.y - p.y);
    const want = d > 2.8 ? { x: (me.x - p.x) / d, y: (me.y - p.y) / d } : null;
    const walked = stepRoam(
        p,
        want,
        placeOf(),
        { speed: TREASURE.walk.value * 1.1, accel: 40, radius: 0.4 },
        DT,
    );
    if (p.face.x !== 0) s.pipDir = p.face.x > 0 ? 1 : -1;
    const cheering = s.won || s.steps - s.cheer < RATE * 1.5;
    stepActor(
        s.pipActor,
        cheering ? "cheer" : walked === "walk" ? "walk" : "stand",
        PUPS,
        DT,
        p.stride,
        s.pipDir,
    );
}

export function step(s: TreasureState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    const me = s.me;
    const want = heading(pad.holding);
    if (want) {
        s.errand = null;
        s.mapBig = false;
    }
    const turned = want ? null : heading(pad.pressed);
    if (turned && !s.digging) faceTo(me, { x: me.x + turned.x, y: me.y + turned.y });
    if (pad.touch && !s.last) touchDown(s, pad.touch, pad.view ?? null, out);
    if (pad.touch && s.drag) touchMove(s, s.drag, pad.touch);
    if (pad.lifted && !pad.touch && s.drag) touchUp(s, s.drag, pad.lifted, out);
    s.last = pad.touch;
    if (pad.tapped) {
        if (s.mapBig) s.mapBig = false;
        else press(s, out);
    }
    const x0 = me.x,
        y0 = me.y;
    const walked = stepRoam(me, want, placeOf(), gaitOf(), DT);
    s.walked += Math.hypot(me.x - x0, me.y - y0);
    errandStep(s, out);
    const digging = digStep(s, want, out);
    if (me.face.x !== 0) s.dir = me.face.x > 0 ? 1 : -1;
    // the square under her: the start reached, and each square counted out loud on the first levels
    const q = squareAt(GRID, me);
    if (!sameSquare(q, s.square) && !(q === null && s.square === null)) {
        s.square = q ? { ...q } : null;
        if (!s.started && clueStarted(s)) {
            s.started = true;
            out.push({ cue: "place", strength: 0.4 });
            const i = current(s)[0];
            const clue = i === undefined ? undefined : s.L.clues[i];
            if (clue && clue.kind !== "at")
                speak(
                    s,
                    `This is ${clue.kind === "here" ? "the start" : "from" in clue ? LANDMARK_NAME[clue.from] : "the start"}. Now count: ${legsWords(legsOf(clue))}.`,
                    4,
                );
        } else if (s.started && q) countAloud(s, q, out);
    }
    // the rope, tied and walked to the far landmark, reads off how far it is
    if (s.rope && s.hand === "rope" && !s.measured) {
        const b = landmarkNear(me, 2.6);
        if (b && b !== s.rope.from && q && sameSquare(q, LANDMARK_SQUARE[b])) {
            s.measured = { a: s.rope.from, b, n: measureOf(s.rope.from, b) };
            out.push({ cue: "level", strength: 0.4 });
            speak(
                s,
                `From ${LANDMARK_NAME[s.rope.from]} to ${LANDMARK_NAME[b]} is ${s.measured.n} squares.`,
                4,
            );
        }
    }
    // footprints in the sand behind her
    if (walked === "walk" && me.stride - s.printAt > 0.85 && onSand(me)) {
        s.printAt = me.stride;
        s.left = !s.left;
        const a = Math.atan2(me.vx, -me.vy);
        const side = s.left ? -0.22 : 0.22;
        s.prints.push({
            x: me.x + Math.cos(a) * side,
            y: me.y + Math.sin(a) * side,
            a,
            left: s.left,
            at: s.steps,
        });
        if (s.prints.length > 36) s.prints.shift();
    }
    s.prints = s.prints.filter((p) => s.steps - p.at < RATE * 12);
    s.floaters = s.floaters.filter((f) => s.steps - f.at < RATE * 1.2);
    const cheering = s.won || s.steps - s.cheer < RATE * 1.4;
    const now: Act = cheering ? "cheer" : digging ? "dig" : walked === "walk" ? "walk" : "stand";
    stepActor(s.actor, now, PEOPLE, DT, me.stride, s.dir);
    pipStep(s);
    const to = lookAt(me);
    const k = Math.min(1, TREASURE.follow.value * DT);
    s.cam = { x: s.cam.x + (to.x - s.cam.x) * k, y: s.cam.y + (to.y - s.cam.y) * k };
    const todo = currentOf(stepsOf(s));
    if (todo !== s.stepWas) {
        s.stepWas = todo;
        s.guideAt = s.steps;
    }
    return out;
}

/** On the first levels each square walked along the leg being walked is counted out loud. */
function countAloud(s: TreasureState, q: Square, out: Happening[]): void {
    if (s.L.preview < 2) return;
    const i = current(s)[0];
    const clue = i === undefined ? undefined : s.L.clues[i];
    const a = clue ? anchorOf(s, clue) : null;
    if (!clue || !a) return;
    const o = offset(a, q);
    const leg = legsOf(clue).find((l) => {
        const st = STEP[l.point];
        return st.r !== 0 ? -o.north !== st.r * l.n : o.east !== st.c * l.n;
    });
    const n = leg ? (STEP[leg.point].r !== 0 ? Math.abs(o.north) : Math.abs(o.east)) : 0;
    if (!leg || n === 0) return;
    s.floaters.push({ text: String(n), x: s.me.x + 1.6, y: s.me.y - 2.6, at: s.steps });
    out.push({ cue: "place", strength: 0.3, pitch: 1 + n * 0.12 });
}

/** The island's ground, in lengths that meet, as far round the view as can be seen. */
const TILE = { w: 20, h: 16 } as const;

function ground(cam: Pt, sprites: Sprite[]): void {
    for (let gx = -40; gx < WORLD.w + 40; gx += TILE.w)
        for (let gy = -32; gy < WORLD.h + 32; gy += TILE.h) {
            if (gx + TILE.w < cam.x - VIEW.w || gx > cam.x + VIEW.w) continue;
            if (gy + TILE.h < cam.y - VIEW.h || gy > cam.y + VIEW.h) continue;
            sprites.push({
                key: `ground:${gx}:${gy}`,
                art: "islandground",
                params: { across: TILE.w, deep: TILE.h, x0: gx, y0: gy, grid: true },
                x: gx + TILE.w / 2,
                y: gy + TILE.h / 2,
                size: TILE.w,
                still: true,
                z: 0,
            });
        }
}

/** Waves running up the beach all round, each at a point a little off the coast. */
const SURF: { x: number; y: number; nx: number; ny: number; a: number }[] = COAST.flatMap(
    (a, i) => {
        const b = COAST[(i + 1) % COAST.length];
        if (!b) return [];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const nx = (b.y - a.y) / len,
            ny = -(b.x - a.x) / len;
        return [0.5].map((k) => ({
            x: a.x + (b.x - a.x) * k + nx * 0.9,
            y: a.y + (b.y - a.y) * k + ny * 0.9,
            nx,
            ny,
            a: Math.atan2(b.y - a.y, b.x - a.x),
        }));
    },
);

const standZ = (y: number) => 10 + y / 60;

/** A tall thing she has walked behind is drawn faint, so she is never lost behind a tree or the lighthouse. */
function seeThrough(s: TreasureState, x: number, y: number, w: number, h: number): number {
    const me = s.me;
    const behind = me.y < y - 0.1 && Math.abs(me.x - x) < w / 2 + 0.4 && me.y > y - h + 0.3;
    return behind ? 0.45 : 1;
}

export function frame(s: TreasureState, rest = false): Frame {
    const L = s.L;
    const sprites: Sprite[] = [];
    const marks: Mark[] = [];
    const cam = rest ? lookAt(s.me) : s.cam;
    const t = rest ? 0 : s.steps / RATE;
    ground(cam, sprites);
    for (const [k, w] of SURF.entries()) {
        const swell = rest ? 0 : Math.sin(t * 0.9 + k * 1.7);
        sprites.push({
            key: `surf:${k}`,
            art: "shorewave",
            params: { curls: 2 },
            x: w.x + w.nx * swell * 0.35,
            y: w.y + w.ny * swell * 0.35,
            angle: w.a,
            size: 3,
            alpha: rest ? 0.8 : 0.55 + 0.35 * (0.5 - swell / 2),
            z: 1,
        });
    }
    sprites.push({
        key: "dock",
        art: "islanddock",
        params: { long: 6 },
        x: DOCK.x + DOCK.w / 2,
        y: DOCK.y + 3.4,
        size: 3,
        still: true,
        z: 1,
    });
    sprites.push({
        key: "boat",
        art: "rowboat",
        params: {
            stroke: 0.5,
            lifted: 1,
            facing: -1,
            tone: 4,
            hair: "curly",
            colour: "black",
            top: "berry",
            cheer: s.won ? 1 : 0,
        },
        x: BOAT.x + 2.6,
        y: BOAT.y,
        size: 6,
        stand: true,
        z: standZ(BOAT.y),
    });
    // the posts that name the squares: letters along the top of the grid, numbers down its side
    for (let c = 0; c < GRID.cols; c++)
        sprites.push({
            key: `post:c:${c}`,
            art: "gridpost",
            params: { mark: letterOf(c) },
            x: GRID.x + (c + 0.5) * GRID.cell,
            y: GRID.y - 0.5,
            size: 1.5,
            stand: true,
            still: true,
            z: standZ(GRID.y - 0.5),
        });
    for (let r = 0; r < GRID.rows; r++)
        sprites.push({
            key: `post:r:${r}`,
            art: "gridpost",
            params: { mark: String(r + 1) },
            x: GRID.x - 1.2,
            y: GRID.y + (r + 0.5) * GRID.cell + 0.9,
            size: 1.5,
            stand: true,
            still: true,
            z: standZ(GRID.y + (r + 0.5) * GRID.cell + 0.9),
        });
    // the landmarks, standing on their feet
    sprites.push(
        {
            key: "palm",
            art: "palms",
            params: { count: 1, coconuts: 3 },
            x: SPOTS.palm.x + 0.4,
            y: SPOTS.palm.y,
            size: 4.6,
            stand: true,
            alpha: seeThrough(s, SPOTS.palm.x + 0.4, SPOTS.palm.y, 4.6, 7.2),
            z: standZ(SPOTS.palm.y),
        },
        {
            key: "rock",
            art: "bigrock",
            params: { moss: true },
            x: SPOTS.rock.x,
            y: SPOTS.rock.y,
            size: 3,
            stand: true,
            alpha: seeThrough(s, SPOTS.rock.x, SPOTS.rock.y, 3, 2.3),
            z: standZ(SPOTS.rock.y),
        },
        {
            key: "lighthouse",
            art: "lighthouse",
            params: { stripes: 3, beam: 1 },
            x: SPOTS.lighthouse.x,
            y: SPOTS.lighthouse.y + 0.4,
            size: 4.4,
            stand: true,
            alpha: seeThrough(s, SPOTS.lighthouse.x, SPOTS.lighthouse.y + 0.4, 4.4, 7.8),
            z: standZ(SPOTS.lighthouse.y),
        },
        {
            key: "cave",
            art: "islandcave",
            params: { mouth: true },
            x: SPOTS.cave.x,
            y: SPOTS.cave.y + 0.3,
            size: 6.6,
            stand: true,
            alpha: seeThrough(s, SPOTS.cave.x, SPOTS.cave.y + 0.3, 6.6, 4.1),
            z: standZ(SPOTS.cave.y),
        },
        {
            key: "wreck",
            art: "shipwreck",
            params: { mast: true },
            x: SPOTS.wreck.x,
            y: SPOTS.wreck.y,
            size: 7,
            stand: true,
            alpha: seeThrough(s, SPOTS.wreck.x, SPOTS.wreck.y, 7, 3.9),
            z: standZ(SPOTS.wreck.y),
        },
        {
            key: "parrottree",
            art: "tree",
            params: { fruit: 4, fallen: 0, item: "mango" },
            x: SPOTS.parrot.x,
            y: SPOTS.parrot.y,
            size: 4.6,
            stand: true,
            alpha: seeThrough(s, SPOTS.parrot.x, SPOTS.parrot.y, 4.6, 5.5),
            z: standZ(SPOTS.parrot.y),
        },
        {
            key: "parrot",
            art: "parrot",
            params: { facing: -1 },
            x: SPOTS.parrot.x + 1.2,
            y:
                SPOTS.parrot.y -
                3.2 +
                (rest || !s.bubble?.parrot ? 0 : -Math.abs(Math.sin(t * 8)) * 0.2),
            size: 1.5,
            stand: true,
            z: standZ(SPOTS.parrot.y) + 0.001,
        },
    );
    // crabs scuttling sideways on the beaches, and out of her way
    for (const [k, c] of [
        { x: 15, y: 37.4 },
        { x: 47.5, y: 34.6 },
        { x: 14.5, y: 7.6 },
        { x: 51.4, y: 21 },
    ].entries()) {
        let x = c.x + (rest ? 0 : Math.sin(t * 0.7 + k * 2) * 1.6),
            y = c.y;
        const d = Math.hypot(x - s.me.x, y - s.me.y);
        if (d < 3 && d > 0.01) {
            x += ((x - s.me.x) / d) * (3 - d);
            y += ((y - s.me.y) / d) * (3 - d) * 0.5;
        }
        sprites.push({
            key: `crab:${k}`,
            art: "crabs",
            params: { count: 1 },
            x,
            y,
            size: 1.4,
            stand: true,
            z: standZ(y),
        });
    }
    // gulls wheeling over the island and the sea
    for (let k = 0; k < 2; k++) {
        const span = WORLD.w + 30;
        const gx = ((((t * 2.4 + k * 37) % span) + span) % span) - 15;
        sprites.push({
            key: `gull:${k}`,
            art: "gull",
            params: { flying: 1 },
            x: k === 0 ? gx : WORLD.w - gx,
            y: 8 + k * 22 + Math.sin(t * 0.6 + k) * 2,
            size: 2,
            flip: k === 1,
            z: 60,
        });
    }
    // footprints fading behind her
    for (const p of s.prints)
        sprites.push({
            key: `print:${p.at}`,
            art: "sandprint",
            params: { foot: p.left ? "left" : "right" },
            x: p.x,
            y: p.y,
            angle: p.a,
            size: 0.36,
            alpha: rest ? 0.8 : Math.max(0, 0.8 * (1 - (s.steps - p.at) / (RATE * 12))),
            z: 1.5,
        });
    // what she has dug: holes, and what came out of them
    for (const [i, d] of s.dug.entries()) {
        const at = holeAt(d);
        sprites.push({
            key: `hole:${d.c}:${d.r}`,
            art: "dig",
            params: { dug: 1, spade: 0 },
            x: at.x + 0.4,
            y: at.y,
            size: 2.6,
            z: 2,
        });
        const age = rest ? 1 : Math.min(1, (s.steps - d.at) / (RATE * 0.4));
        const rise = 1 - (1 - age) ** 3;
        if (d.what === "chest")
            sprites.push({
                key: `chest:${i}`,
                art: "chest",
                params: { open: d.open ? 1 : 0, coins: d.open ? 9 : 0 },
                x: at.x - 0.1,
                y: at.y + 0.5,
                size: 2.6,
                scale: 0.6 + 0.4 * rise,
                stand: true,
                z: standZ(at.y + 0.5),
                ...(d.open ? { glow: 1.6 } : {}),
            });
        else if (d.what === "bottle")
            sprites.push({
                key: `bottle:${i}`,
                art: "bottle",
                params: { cork: d.open ? 0 : 1, letter: d.open ? 0 : 1, sea: false },
                x: at.x - 0.2,
                y: at.y + 0.2,
                size: 2,
                scale: 0.6 + 0.4 * rise,
                stand: true,
                z: standZ(at.y + 0.2),
            });
    }
    if (s.spadeAt)
        sprites.push({
            key: "spade",
            art: "shovel",
            params: { sand: false },
            x: s.spadeAt.x,
            y: s.spadeAt.y,
            size: 1.1,
            angle: 0.35,
            stand: true,
            z: standZ(s.spadeAt.y),
        });
    // the rope, from the landmark it is tied to, to her hand, with a knot at every square
    if (s.rope) {
        const from = SPOTS[s.rope.from];
        const a = { x: from.x, y: from.y - 0.6 },
            b = { x: s.me.x + s.dir * 0.6, y: s.me.y - 1.1 };
        marks.push({ kind: "line", a, b, style: "rod", bend: -0.25 });
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const knots: Pt[] = [];
        for (let d = GRID.cell; d < len; d += GRID.cell)
            knots.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len });
        if (knots.length) marks.push({ kind: "dots", pts: knots });
        const fromSq = LANDMARK_SQUARE[s.rope.from],
            here = squareAt(GRID, s.me);
        if (L.preview >= 1 && here)
            marks.push({
                kind: "word",
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2 - 0.8,
                text: `${stepsApart(fromSq, here)} ${stepsApart(fromSq, here) === 1 ? "square" : "squares"}`,
                size: 0.75,
            });
    }
    // her square, dashed, while she holds the spade: the one a dig would open
    const here = squareAt(GRID, s.me);
    if (here && s.hand === "spade" && !s.won) {
        const m = middleOf(GRID, here);
        marks.push({
            kind: "box",
            x: m.x - GRID.cell / 2,
            y: m.y - GRID.cell / 2,
            w: GRID.cell,
            h: GRID.cell,
            on: !!s.digging,
        });
    }
    // the compass at her feet, north up, on the levels that walk by the compass
    if (L.compass)
        sprites.push({
            key: "compass",
            art: "compass",
            params: { needle: 0 },
            x: s.me.x,
            y: s.me.y,
            size: 3.4,
            alpha: 0.45,
            z: 1.8,
        });
    // what she has in her hand
    const hand = { x: s.me.x + s.dir * 0.85, y: s.me.y - 0.55 };
    const digT = s.digging && s.digging.from >= 0 && !rest ? (s.steps - s.digging.from) / RATE : -1;
    if (s.hand === "spade")
        sprites.push({
            key: "inhand:spade",
            art: "shovel",
            params: { sand: s.dug.length > 0 },
            x: hand.x,
            y: hand.y + (digT >= 0 ? Math.abs(Math.sin(digT * 10)) * 0.5 : 0),
            size: 0.9,
            angle: s.dir * (digT >= 0 ? 0.2 + Math.abs(Math.sin(digT * 10)) * 0.6 : 0.25),
            z: standZ(s.me.y) + 0.002,
        });
    else if (s.hand === "rope" && !s.rope)
        sprites.push({
            key: "inhand:rope",
            art: "ropecoil",
            params: { knots: 6 },
            x: hand.x,
            y: hand.y,
            size: 1.1,
            z: standZ(s.me.y) + 0.002,
        });
    // Pip, and Charlie
    const pip = s.pip;
    sprites.push(
        ...actorSprites(
            s.pipActor,
            PUPS,
            (pose, dir) => ({
                key: "pip",
                art: "pupfamily",
                params: {
                    member: "pip",
                    pose,
                    mood: s.won ? "excited" : "happy",
                    dir,
                    gear: "none",
                },
                x: pip.x,
                y: pip.y,
                size: 2.2,
                stand: true,
                z: standZ(pip.y),
            }),
            pip.stride,
            rest,
        ),
    );
    const me = s.me;
    sprites.push(
        ...actorSprites(
            s.actor,
            PEOPLE,
            (pose, dir) => ({
                key: "charlie",
                art: "charlie",
                params: {
                    pose,
                    mood: s.won ? "excited" : "happy",
                    dir,
                    hair: "ponytail",
                    top: "tang",
                    sleeves: "short",
                    print: "star",
                    wear: "shorts",
                    bottom: "sky",
                    pattern: "plain",
                    feet: "bare",
                },
                x: me.x,
                y: me.y,
                size: 3,
                stand: true,
                z: standZ(me.y) + 0.001,
            }),
            me.stride,
            rest,
        ),
    );
    // the count, and where she stands, over her head on the levels that show it
    const i = current(s)[0];
    const clue = i === undefined ? undefined : L.clues[i];
    if (L.preview >= 1 && here && clue && !s.won) {
        const a = anchorOf(s, clue);
        const text =
            clue.kind === "at" || L.order === "any"
                ? nameOf(here)
                : s.started && a
                  ? fromWords(clue, a, here)
                  : "";
        if (text) marks.push({ kind: "word", x: me.x, y: me.y - 3.9, text, size: 0.75 });
    }
    if (!rest)
        for (const f of s.floaters) {
            const k = (s.steps - f.at) / (RATE * 1.2);
            marks.push({ kind: "word", x: f.x, y: f.y - k * 1.2, text: f.text, size: 1.1 });
        }
    // a soft ring under what a finger sent her to, or what the Action would use
    if (!s.won && !s.digging) {
        const tg = s.errand ?? aim(s);
        const at = tg && tg.kind !== "dig" ? pointOf(s, tg) : null;
        // a chest or a bottle is ringed round, dashed, so the ring never hides it
        const up = tg?.kind === "chest" || tg?.kind === "bottle";
        if (at)
            marks.push(
                up
                    ? { kind: "ring", x: at.x, y: at.y - 0.4, r: 1.7 }
                    : { kind: "ring", x: at.x, y: at.y + 0.2, r: 1.2, on: true },
            );
    }
    // the way on the first levels: dotted from the start along the legs to the X, drawn on the sand
    if (L.preview >= 2 && clue && !s.won) {
        const a = anchorOf(s, clue);
        if (a) {
            const pts: Pt[] = [];
            let at = a;
            for (const l of legsOf(clue)) {
                for (let n = 0; n < l.n; n++) {
                    const next = { c: at.c + STEP[l.point].c, r: at.r + STEP[l.point].r };
                    const p = middleOf(GRID, at),
                        q2 = middleOf(GRID, next);
                    for (let k = 0; k < 3; k++)
                        pts.push({
                            x: p.x + ((q2.x - p.x) * k) / 3,
                            y: p.y + ((q2.y - p.y) * k) / 3,
                        });
                    at = next;
                }
            }
            if (s.started) marks.push({ kind: "dots", pts, faint: true });
        }
    }
    guide(s, rest, sprites, marks);
    mapCard(s, sprites, marks);
    return {
        sprites,
        marks: s.mapBig ? [PUT_AWAY] : marks,
        camera: { x: cam.x, y: cam.y, zoom: 1 },
        view: { ...VIEW },
        world: { ...WORLD },
        focus: { x: me.x, y: me.y - 1 },
    };
}

/** The squares a clue's map marks: where it starts, the way, and the X, as the map card's settings take them. */
function mapParams(s: TreasureState, big: boolean): Record<string, unknown> {
    const L = s.L;
    const shown = current(s);
    const xs: number[] = [],
        path: number[] = [];
    let ring = "";
    const lines: string[] = [];
    for (const i of shown) {
        const clue = L.clues[i];
        if (!clue) continue;
        if (big) lines.push(...wrap(clueWords(clue), 38, 3));
        const to = targetOf(clue, s.lastDug);
        if (clue.kind === "walk" || clue.kind === "measure") ring = clue.from;
        if (L.preview >= 2 && to) {
            xs.push(to.c, to.r);
            const a = anchorOf(s, clue);
            if (a) {
                path.push(a.c, a.r);
                let at = a;
                for (const l of legsOf(clue)) {
                    at = { c: at.c + STEP[l.point].c * l.n, r: at.r + STEP[l.point].r * l.n };
                    path.push(at.c, at.r);
                }
            }
        }
        if (clue.kind === "at" && L.order === "any" && to && L.preview >= 1) xs.push(to.c, to.r);
    }
    const done: number[] = [];
    for (const [i, clue] of L.clues.entries())
        if (s.found[i] && L.order === "any") {
            const to = targetOf(clue, null);
            if (to) {
                done.push(to.c, to.r);
                xs.push(to.c, to.r);
            }
        }
    const grid = L.clues.some((c) => c.kind === "at") || L.preview < 2;
    return {
        grid,
        ring,
        path,
        xs: xs.slice(0, 8),
        done: done.slice(0, 8),
        lines: big ? lines.slice(0, 3) : [],
        torn: L.clues.some((c) => c.kind === "measure"),
    };
}

/** The map card in the corner, the clue's short words under it, and the map held up big when asked. */
function mapCard(s: TreasureState, sprites: Sprite[], marks: Mark[]): void {
    const fresh = s.steps - s.newClue < RATE * 0.6 && s.newClue > 0;
    sprites.push({
        key: "map:card",
        art: "cluemap",
        params: mapParams(s, false),
        x: CARD.x,
        y: CARD.y + cardHeight / 2,
        size: CARD.w,
        fixed: true,
        ...(fresh ? { scale: 1.08 } : {}),
        z: 70,
    });
    const shown = (s.won ? [] : current(s))
        .map((i) => s.L.clues[i])
        .filter((c): c is Clue => c !== undefined);
    const words = shown.length ? shown.map(clueShort).join(" · ") : s.won ? "All found" : "";
    if (words)
        marks.push({
            kind: "word",
            // left of the card's middle, so on a phone its words, held at their least size, stay in the field
            x: CARD.x - 2,
            y: CARD.y + cardHeight + 0.9,
            text: words,
            size: 0.45,
            fixed: true,
        });
    if (s.L.free)
        marks.push({
            kind: "word",
            x: 7,
            y: VIEW.h - 0.8,
            text: `${s.collection.coins} coins, ${s.collection.gems} gems, ${s.collection.shells} shells`,
            size: 0.55,
            fixed: true,
        });
    if (!s.mapBig) return;
    const p = mapParams(s, true);
    const lines = Array.isArray(p.lines) ? p.lines.length : 0;
    const w = Math.min(22, (VIEW.h - 1.6) * (16 / (12 + (lines ? lines + 1 : 0))));
    sprites.push({
        key: "map:big",
        art: "cluemap",
        params: p,
        x: VIEW.w / 2,
        y: VIEW.h / 2,
        size: w,
        fixed: true,
        z: 80,
    });
}

/** Held up, the map is all there is to read, so the words drawn over the island give way to how to put it away. */
const PUT_AWAY: Mark = {
    kind: "word",
    x: VIEW.w / 2,
    y: VIEW.h - 0.4,
    text: "Tap or press M to put the map away",
    size: 0.5,
    fixed: true,
};

/** Squares the step strip's words take, per letter, at the size they are written. */
const STRIP_LETTER = 0.21;

/** The guide on the board: the step strip, the arrow to what is next, and what Charlie says. */
function guide(s: TreasureState, rest: boolean, sprites: Sprite[], marks: Mark[]): void {
    const steps = stepsOf(s);
    const now = currentOf(steps);
    const doing = steps[now];
    const label = s.won || !doing ? "All done!" : `${now + 1} ${doing.label}`;
    const dot = 0.95,
        dots = steps.length * dot,
        across = Math.max(dots, label.length * STRIP_LETTER) + 1.2;
    const cardW = Math.min(14, Math.ceil(across + 1.5));
    const fx = (VIEW.w - CARD.w - 0.6) / 2,
        fy = 0.9;
    sprites.push({
        key: "steps",
        art: "dollchip",
        params: { kind: "card", tone: "sky", on: false, w: cardW, h: 3 },
        x: fx,
        y: fy + 0.5,
        size: cardW,
        fixed: true,
        z: 70,
    });
    let x = fx - dots / 2;
    for (const [i, st] of steps.entries()) {
        if (i === now && !s.won)
            sprites.push({
                key: "steps:now",
                art: "dollchip",
                params: { kind: "ring", tone: "glow", on: true, w: 2, h: 2 },
                x: x + dot / 2,
                y: fy,
                size: 0.85,
                fixed: true,
                z: 71,
            });
        sprites.push({
            key: `steps:tick:${i}`,
            art: "dollchip",
            params: { kind: "tick", tone: "mint", on: st.done, w: 2, h: 2 },
            x: x + dot / 2,
            y: fy,
            size: 0.62,
            fixed: true,
            z: 72,
        });
        x += dot;
    }
    marks.push({ kind: "word", x: fx, y: fy + 1.05, text: label, size: 0.4, fixed: true });
    if (s.won) return;
    const to = pointerOf(s);
    if (to && pointerShows(s)) {
        const b = bounce(s.steps, rest);
        marks.push({
            kind: "line",
            a: { x: to.at.x, y: to.at.y - 3.4 - b },
            b: { x: to.at.x, y: to.at.y - 1.4 - b },
            head: true,
        });
    }
    const idle = s.steps - s.guideAt;
    const first =
        s.phase === 0 && !s.used
            ? "Walk with the arrows or tap where to go. Press Space or the big button to use what is in front of you."
            : null;
    const said = s.bubble && s.steps < s.bubble.until ? s.bubble : null;
    const text = first ?? said?.text ?? (idle >= GUIDE_WAIT ? speechOf(s) : null);
    if (!text) return;
    const lines = wrap(text, 26);
    const width = bubbleWidth(lines);
    const k = 0.58;
    const w = width * k,
        h = (lines.length * 2 + 2) * k;
    const who = said?.parrot
        ? { x: SPOTS.parrot.x + 1.2, y: SPOTS.parrot.y - 3.4 }
        : { x: s.me.x, y: s.me.y };
    const cam = rest ? lookAt(s.me) : s.cam;
    const top = cam.y - VIEW.h / 2 + 3.6,
        bottom = cam.y + VIEW.h / 2 - 0.3,
        left = cam.x - VIEW.w / 2 + 0.3,
        edge = cam.x + VIEW.w / 2 - 0.3;
    // the map card holds the top right corner, so a bubble that high keeps left of it
    const rightAt = (y: number) =>
        y - h / 2 < cam.y - VIEW.h / 2 + cardHeight + 1.8 ? edge - CARD.w - 0.3 : edge;
    // over her head where there is room, otherwise beside her on the side with room, never over her
    const overY = who.y - 3.4 - h / 2;
    const sideY = Math.min(bottom - h / 2, Math.max(top + h / 2, who.y - 2.2));
    const place =
        overY - h / 2 >= top
            ? { x: Math.max(left + w / 2, Math.min(rightAt(overY) - w / 2, who.x)), y: overY }
            : who.x + 1.4 + w <= rightAt(sideY)
              ? { x: who.x + 1.4 + w / 2, y: sideY }
              : { x: Math.max(left + w / 2, who.x - 1.4 - w / 2), y: sideY };
    sprites.push({
        key: "say",
        art: "bubble",
        params: { lines, width, tail: null },
        x: place.x,
        y: place.y,
        size: w,
        live: true,
        z: 75,
    });
}

export function say(s: TreasureState): string {
    const here = squareAt(GRID, s.me);
    const parts: string[] = [
        here
            ? `Charlie is in square ${nameOf(here)}.`
            : "Charlie is on the beach, off the map's squares.",
        `She faces ${compassPoint(s.me.face)}.`,
    ];
    if (s.hand !== "none") parts.push(`She holds the ${s.hand}.`);
    if (s.rope) parts.push(`The rope is tied to ${LANDMARK_NAME[s.rope.from]}.`);
    for (const i of current(s)) {
        const clue = s.L.clues[i];
        if (clue) parts.push(`The map says: ${clueWords(clue)}`);
    }
    const t = aim(s);
    if (t) parts.push(`The Action: ${labelOf(s, t).toLowerCase()}.`);
    if (!s.won) {
        const steps = stepsOf(s);
        const now = currentOf(steps);
        const st = steps[now];
        if (st) parts.push(`Step ${now + 1} of ${steps.length}: ${st.label}.`);
        const to = pointerOf(s);
        if (to && pointerShows(s)) parts.push(`The arrow points at ${to.name}.`);
    } else parts.push(winWords(s));
    if (s.L.free)
        parts.push(
            `Found so far: ${s.collection.coins} coins, ${s.collection.gems} gems and ${s.collection.shells} shells.`,
        );
    return parts.join(" ");
}

/** A kept collection, read back from storage: unknown until every field is checked. */
export interface Design {
    collection: { coins: number; gems: number; shells: number };
    round: number;
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

export function readDesign(value: unknown): Design | null {
    if (typeof value !== "object" || value === null) return null;
    if (!("collection" in value) || !("round" in value)) return null;
    const c = value.collection;
    if (
        typeof c !== "object" ||
        c === null ||
        !("coins" in c) ||
        !("gems" in c) ||
        !("shells" in c)
    )
        return null;
    const { coins, gems, shells } = c;
    if (!isCount(coins) || !isCount(gems) || !isCount(shells) || !isCount(value.round)) return null;
    return { collection: { coins, gems, shells }, round: value.round };
}

const SOUNDS: Kit = {
    // a square counted: a soft wooden tick, higher with each one
    place: [{ wave: "sine", hz: 520, to: 560, attack: 0.002, decay: 0.08, gain: 0.25 }],
    // the spade biting into sand
    bump: [
        { wave: "noise", hz: 900, to: 500, attack: 0.004, decay: 0.12, gain: 0.3 },
        { wave: "sine", hz: 140, to: 90, attack: 0.002, decay: 0.08, gain: 0.25 },
    ],
    // the spade or the rope taken up
    lift: [{ wave: "noise", hz: 2200, to: 1400, attack: 0.01, decay: 0.12, gain: 0.2 }],
    // a lid knocked, something hard under the sand
    creak: [
        { wave: "triangle", hz: 220, to: 180, attack: 0.002, decay: 0.15, gain: 0.35 },
        { wave: "triangle", hz: 330, to: 300, attack: 0.002, decay: 0.12, gain: 0.25, delay: 0.09 },
    ],
    // coins tumbling out of an opened chest
    ring: [
        { wave: "sine", hz: 1320, attack: 0.002, decay: 0.1, gain: 0.22 },
        { wave: "sine", hz: 1760, attack: 0.002, decay: 0.1, gain: 0.2, delay: 0.07 },
        { wave: "sine", hz: 1480, attack: 0.002, decay: 0.12, gain: 0.18, delay: 0.14 },
    ],
    // a cork out of a bottle
    level: [{ wave: "sine", hz: 600, to: 1100, attack: 0.002, decay: 0.09, gain: 0.3 }],
};

const hum = (): Hum[] => [
    { kind: "water", level: 0.25 },
    { kind: "wind", level: 0.12 },
];

export const treasureGame: ActionGame<TreasureState> = {
    id: "treasure",
    title: "Treasure island",
    group: "action",
    // the clue, the map and the walk from a landmark to the spot span most of the island, which a small card crops to a few squares
    card: null,
    seen: "above",
    // a phone held upright follows Charlie across 20 of the view's 30 squares, enough for a landmark and the squares counted from it
    portrait: { keep: PORTRAIT },
    quiet: true,
    touch: true,
    saves: { level: FREE },
    levels: TREASURE_LEVELS,
    rate: RATE,
    sounds: SOUNDS,
    hum,
    cover: { art: "treasurecover", params: { charlie: true } },
    hint: "Walk Charlie with the arrows or WASD, or tap where she should go. Space or Enter does what is in front of her: picks up the spade, digs, opens a chest, reads a bottle or ties the rope. T swaps the tool in her hand, M holds the map up, and Undo puts her back where the clue starts",
    wasd: true,
    controls: {
        arrows: { left: "West", right: "East", up: "North", down: "South" },
        go: "Action",
        icons: { go: "dig" },
    },
    goLabel: (s) => labelOf(s, aim(s)),
    goIcon: (s) => {
        const t = aim(s);
        return t ? ICON[t.kind] : "dig";
    },
    commands: [
        { id: "map", label: "Map", key: "m", icon: "map" },
        { id: "bag", label: "Swap tool", key: "t", icon: "bag" },
    ],
    shows: (s, id) =>
        id === "bag" ? s.bag.length > 1 || (s.bag.length === 1 && s.hand === "none") : true,
    command: (s, id) => {
        const out: Happening[] = [];
        if (id === "map") s.mapBig = !s.mapBig;
        else if (id === "bag") swap(s, out);
    },
    checkpoint: (s): Design => ({ collection: { ...s.collection }, round: s.round }),
    restore: (s, value) => {
        const d = readDesign(value);
        if (!d || !s.L.free) return false;
        s.collection = d.collection;
        s.round = d.round;
        s.L = { ...s.L, clues: freeClues(s.seed, s.round, []) };
        s.found = s.L.clues.map(() => false);
        return true;
    },
    start,
    step,
    frame,
    say,
    note: (s) => (s.steps - s.saidAt < RATE * 6 && s.said ? s.said : s.won ? "" : speechOf(s)),
    won: (s) => s.won,
    objectives: (s) => ({
        completed: s.found.filter(Boolean).length,
        total: Math.max(1, s.found.length),
    }),
    back,
    cancelInput: (s) => {
        s.drag = null;
        s.last = null;
    },
    tuning: TREASURE,
    still: {
        // a press walks her about a square, or digs a hole through
        press: () => 20,
        settling: (s) =>
            s.me.route.length > 0 ||
            s.errand !== null ||
            s.digging !== null ||
            Math.hypot(s.me.vx, s.me.vy) > 0.05,
    },
};
