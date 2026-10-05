// Charlie's rope swings: Charlie crosses a stream, a ravine or a garden pond on ropes hung from the
// branches overhead. The child pulls her back up the rope's arc and lets go to start the swing, so the
// pull sets how high she swings; the swing then keeps going, and a tap lets her go, so when the child
// taps sets where she flies. A tap in the air reaches for the next rope. She lands on a numbered stepping stone, the far bank or the
// tree house; a stone the level does not ask for wobbles and tips her in, and a splash costs nothing,
// since she climbs back out where she last stood. The mathematics is in where she lands: a stone on
// the number line, the stones that count in twos, a rope that hangs at so many metres, and jumps
// that add up to the far bank. See .docs/games.md.
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
    feed,
    progress,
    track,
    type GameEvent,
    type Goal,
    type Track,
} from "../../engine/motion/goals";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import {
    amplitudeOf,
    apexEase,
    catchRope,
    handsOf,
    letGo,
    stepFlight,
    stepSwing,
    velocityOf,
    type Flight,
    type Swing,
} from "../../engine/motion/swing";
import { knob } from "../../engine/motion/tune";
import { panOf, type Kit } from "../../engine/sound/kit";
import { BEYOND, row, type Eye } from "./scenery";
import type { ActionGame, ActionLevel, Levels } from "./game";

export const RATE = 60;
const DT = 1 / RATE;

/** The numbers that make the swinging feel the way it does, which the review drawer can turn. */
export const SWINGS = {
    gravity: knob(
        50,
        30,
        80,
        1,
        "squares a second, each second",
        "a swing on an eleven-square rope takes under three seconds, quick enough to feel",
    ),
    pump: knob(
        10,
        4,
        20,
        0.5,
        "squares a second, each second",
        "on a rope she has caught, a swing below its keep height is topped up within a couple of swings",
    ),
    keep: knob(
        1.25,
        0.5,
        1.2,
        0.05,
        "radians",
        "a caught rope swings at least this far either way, so a rope reached low still carries her on",
    ),
    wind: knob(
        0.8,
        0.3,
        2,
        0.05,
        "radians a second",
        "holding Go pulls her back from standing to the highest pull in about a second",
    ),
    slow: knob(
        0.3,
        0,
        0.6,
        0.05,
        "a share of the time",
        "she lingers a little at each end of the swing, so the moment to let go can be seen",
    ),
    most: knob(
        1.3,
        0.9,
        1.5,
        0.05,
        "radians",
        "the highest swing stops short of level with the branch",
    ),
    damping: knob(
        0.01,
        0,
        0.3,
        0.01,
        "a share each second",
        "a swing keeps going for many swings, so a child can watch a few before letting go",
    ),
    reach: knob(
        1.4,
        0.5,
        2,
        0.05,
        "squares",
        "hands reaching out take a rope that passes within a square and a half, so a catch is forgiving",
    ),
};

/** Seconds her hands stay reaching after a tap in the air, so a tap a little early still catches. */
const REACH = 0.6;
/** Radians one press of the left or right arrow pulls her back or lets her forward, from the keys. */
const KEY_PULL = 0.1;
/** Seconds a landing, a wobble, a splash and a walk back take: short, so a try again is quick. */
const LANDING = 0.35;
const WOBBLE = 0.5;
const SPLASH = 0.7;
/** Squares past a stone's edge that still count as landing on it: she steps back to its middle. */
const EDGE = 0.35;

const VIEW = { w: 32, h: 20 };
/** The view's middle up and down: the branches in sight at the top, the stream's bed below the foot. */
const CAM_Y = 14.5;
/** The world's height: sky over the branches, and the stream's bed at its foot. */
const H = 26;
/** Where the near bank ends and the line along the water starts. */
const X0 = 16;

/** Charlie's drawing is four squares by six; she is drawn at this many squares for each of its squares. */
const K = 0.55;
/** From her raised hands to her feet, and to the middle of her drawing, in squares, when she hangs. */
const BODY = 2.38;
const MIDDLE = 0.84;

/** A stepping stone: drawn this wide, the half of its top she can stand on, and its top above its foot. */
const STONE = { size: 2.4, half: 0.92, rise: 1.16 } as const;

export type Place = "stream" | "ravine" | "garden";

/** Where things stand in each place: the banks' tops, the water's surface and the branches' undersides. */
const PLACES: Record<Place, { bank: number; surface: number; anchor: number; bed: number }> = {
    stream: { bank: 18, surface: 20, anchor: 7.5, bed: 25 },
    ravine: { bank: 16.5, surface: 23, anchor: 7.5, bed: 26 },
    garden: { bank: 18, surface: 19.8, anchor: 7.5, bed: 24 },
};

/** The branch drawing's underside, where the ropes are tied, and its middle, down its box: in step with swingbranch.ts. */
const BRANCH = { under: 3.35, middle: 2 } as const;
/** Squares from the rope's frayed end up to its knot, where she holds it: in step with swingrope.ts. */
const SWINGROPE_KNOT = 0.9;
/** The bank drawing's grass line down its box, and how far its slope runs out: in step with streambank.ts. */
const BANK = { top: 0.4, slope: 1 } as const;

/** Something the level asks for in order: landing on the stone at a number, or catching the rope that hangs at one. */
export type Want = { stone: number } | { rope: number };

export interface RopeAt {
    /** Where it hangs along the line, in the level's units. */
    at: number;
    /** Squares from the branch to its frayed end. */
    long: number;
    /** Swings on its own this far either way, in radians, before anyone takes it. */
    sway?: number;
}

export interface SwingsLevel extends ActionLevel {
    place: Place;
    /** Squares for one unit along the line. */
    per: number;
    unit: "" | "m";
    /** A mark along the line every `tick` units, numbered every `every`. */
    tick: number;
    every: number;
    /** Where the far side begins, in units from the near bank's edge. */
    far: number;
    /** The stepping stones, in units, and whether each carries its number. */
    stones: number[];
    numbers: boolean;
    ropes: RopeAt[];
    /** Whether a rope carries a tag with where it hangs. */
    tags: boolean;
    /** What must happen, in order, before the far side counts. */
    wants: Want[];
    /** Landings the far side must be reached in, counting it, for a level about jumps that add up. */
    jumps?: number;
    /** A wind along the line, in squares a second each second, gusting over `period` seconds. */
    wind?: { strength: number; period: number };
    /** The far side is a tree house high in a tree rather than a bank. */
    treehouse?: boolean;
    /** How the flight she would take if let go now is drawn: with where she would land, faintly, or not at all. */
    arc: "always" | "faint" | "never";
    outfit: Record<string, string>;
    prompt: string;
}

const COUNT = ["no", "one", "two", "three", "four", "five"];

/** What winning a level means, in one sentence, from what it asks for. */
export function goalText(L: Omit<SwingsLevel, "goal">): string {
    const list = (ns: string[]) =>
        ns.length > 1
            ? `${ns.slice(0, -1).join(", ")} and ${ns[ns.length - 1] ?? ""}`
            : (ns[0] ?? "");
    const at = (n: number) => (L.unit ? `${n} ${L.unit}` : String(n));
    const stones = L.wants.flatMap((w) => ("stone" in w ? [w.stone] : []));
    const ropes = L.wants.flatMap((w) => ("rope" in w ? [w.rope] : []));
    const wind = L.wind
        ? L.wind.strength < 0
            ? " The wind blows against her as she flies."
            : " The wind pushes her as she flies."
        : "";
    const sway = L.ropes.some((r) => r.sway) ? " The ropes swing on their own." : "";
    if (L.jumps)
        return `Reach the far bank at ${at(L.far)} in exactly ${COUNT[L.jumps] ?? L.jumps} jumps.${wind}${sway}`;
    const end = L.treehouse
        ? "swing high enough to land in the tree house"
        : L.place === "ravine"
          ? "fly to the far side"
          : ropes.length
            ? "fly to the far bank"
            : "swing on to the far bank";
    if (stones.length === 1)
        return `Land on the stone at ${at(stones[0] ?? 0)}, then ${end}.${wind}${sway}`;
    if (stones.length) return `Land on ${list(stones.map(at))}, then ${end}.${wind}${sway}`;
    if (ropes.length > 2)
        return `Catch the ropes at ${list(ropes.map(at))}, then ${end}.${wind}${sway}`;
    if (ropes.length)
        return `Catch ${ropes.map((n) => `the rope at ${at(n)}`).join(", then ")}, then ${end}.${wind}${sway}`;
    return `Swing Charlie over the ${L.place === "ravine" ? "ravine" : "stream"} to the ${L.treehouse ? "tree house" : "picnic on the far bank"}.${wind}${sway}`;
}

const rope = (at: number, long = 11, sway?: number): RopeAt =>
    sway === undefined ? { at, long } : { at, long, sway };

export const SWINGS_LEVELS: Levels<SwingsLevel> = [
    {
        title: "Over the stream",
        grades: [1, 1],
        goal: "Swing Charlie over the stream to the picnic on the far bank.",
        prompt: "Pull Charlie back and let go to swing. Tap to fly.",
        place: "stream",
        per: 1.5,
        unit: "",
        tick: 1,
        every: 1,
        far: 6,
        stones: [],
        numbers: true,
        ropes: [rope(1.5)],
        tags: false,
        wants: [],
        arc: "always",
        outfit: {},
    },
    {
        title: "Land on 4",
        grades: [1, 1],
        goal: "Land on the stone at 4, then swing on to the far bank.",
        prompt: "Only the stone at 4 is steady. Watch the dots, then tap.",
        place: "stream",
        per: 1.6,
        unit: "",
        tick: 1,
        every: 1,
        far: 8,
        stones: [2, 4, 6],
        numbers: true,
        ropes: [rope(1.5), rope(5.4)],
        tags: false,
        wants: [{ stone: 4 }],
        arc: "always",
        outfit: { top: "sky", sleeves: "short", print: "star", wear: "shorts", bottom: "mint" },
    },
    {
        title: "Stones in twos",
        grades: [1, 2],
        goal: "Land on 2, 4, 6 and 8, then swing on to the far bank.",
        prompt: "Count in twos along the stones.",
        place: "stream",
        per: 1.5,
        unit: "",
        tick: 1,
        every: 1,
        far: 10,
        stones: [2, 3, 4, 6, 7, 8],
        numbers: true,
        ropes: [rope(1), rope(3), rope(5), rope(7), rope(9)],
        tags: false,
        wants: [{ stone: 2 }, { stone: 4 }, { stone: 6 }, { stone: 8 }],
        arc: "always",
        outfit: {
            hair: "ponytail",
            top: "berry",
            sleeves: "short",
            print: "heart",
            pattern: "stripes",
            bottom: "sky",
        },
    },
    {
        title: "Rope to rope",
        grades: [2, 2],
        goal: "Catch the rope at 5, then the rope at 10, then fly to the far bank.",
        prompt: "Tap again in the air to catch a rope.",
        place: "stream",
        per: 1.2,
        unit: "",
        tick: 1,
        every: 5,
        far: 16,
        stones: [],
        numbers: true,
        ropes: [rope(1.5), rope(5), rope(7), rope(10), rope(12)],
        tags: true,
        wants: [{ rope: 5 }, { rope: 10 }],
        arc: "faint",
        outfit: {
            hair: "bunches",
            top: "glow",
            sleeves: "long",
            print: "flower",
            wear: "trousers",
            bottom: "sky",
            feet: "boots",
        },
    },
    {
        title: "The ravine",
        grades: [2, 3],
        goal: "Catch the rope at 4 m, then the rope at 6 m, then fly to the far side.",
        prompt: "Read the tape across the ravine to find each rope.",
        place: "ravine",
        per: 2,
        unit: "m",
        tick: 1,
        every: 1,
        far: 9,
        stones: [],
        numbers: false,
        ropes: [rope(0.8), rope(3), rope(4), rope(6), rope(7)],
        tags: false,
        wants: [{ rope: 4 }, { rope: 6 }],
        arc: "faint",
        outfit: {
            hair: "braids",
            top: "tang",
            sleeves: "long",
            print: "none",
            wear: "trousers",
            bottom: "mint",
            feet: "boots",
        },
    },
    {
        title: "Up to the tree house",
        grades: [2, 3],
        goal: "Catch the ropes at 3, 6 and 9, then swing high enough to land in the tree house.",
        prompt: "The ropes that count in threes are tied tight.",
        place: "garden",
        per: 1.5,
        unit: "",
        tick: 1,
        every: 3,
        far: 14,
        stones: [],
        numbers: true,
        ropes: [rope(1), rope(3), rope(5), rope(6), rope(9), rope(10)],
        tags: true,
        wants: [{ rope: 3 }, { rope: 6 }, { rope: 9 }],
        treehouse: true,
        arc: "faint",
        outfit: {
            hair: "bun",
            top: "white",
            sleeves: "short",
            print: "bear",
            wear: "dress",
            pattern: "spots",
            bottom: "berry",
            feet: "shoes",
        },
    },
    {
        title: "A windy day",
        grades: [2, 4],
        goal: "Land on 5, 10 and 15, then swing on to the far bank. The wind pushes her as she flies.",
        prompt: "Watch the windsock. Let go a little earlier into the wind.",
        place: "stream",
        per: 1.3,
        unit: "",
        tick: 1,
        every: 5,
        far: 20,
        stones: [5, 7, 10, 12, 15],
        numbers: true,
        ropes: [rope(1.5), rope(6.5), rope(11.5), rope(16.5)],
        tags: false,
        wants: [{ stone: 5 }, { stone: 10 }, { stone: 15 }],
        wind: { strength: 9, period: 5 },
        arc: "faint",
        outfit: {
            hair: "fringe",
            top: "mint",
            sleeves: "long",
            print: "star",
            wear: "trousers",
            bottom: "berry",
            feet: "boots",
        },
    },
    {
        title: "Three jumps to 12",
        grades: [3, 4],
        goal: "Reach the far bank at 12 in exactly three jumps. The ropes swing on their own.",
        prompt: "Which three jumps add up to 12?",
        place: "stream",
        per: 2.2,
        unit: "",
        tick: 1,
        every: 1,
        far: 12,
        stones: [3, 4, 5, 7, 8, 9],
        numbers: true,
        ropes: [
            rope(1, 12, 0.5),
            rope(3.5, 12, 0.55),
            rope(5.5, 12, 0.5),
            rope(8, 12, 0.55),
            rope(10, 12, 0.5),
        ],
        tags: false,
        wants: [],
        jumps: 3,
        arc: "never",
        outfit: {
            hair: "ponytail",
            top: "sky",
            sleeves: "none",
            print: "heart",
            wear: "skirt",
            bottom: "glow",
            pattern: "rainbow",
            feet: "bare",
        },
    },
];

/** A place Charlie can stand: the near bank, a stone, the far bank or the tree house. */
interface Footing {
    kind: "near" | "stone" | "far";
    /** The stone's number, or the far side's place on the line. */
    n: number;
    x0: number;
    x1: number;
    top: number;
}

interface RopeState extends Swing {
    long: number;
    sway: number;
}

type Mode = "ready" | "pull" | "swing" | "fly" | "land" | "wobble" | "splash" | "back" | "home";

type Act = "ready" | "swing" | "fly" | "land" | "wobble" | "splash" | "cheer";

const ACTS: Record<Act, Cycle> = {
    ready: { poses: ["hang"] },
    swing: { poses: ["hang"] },
    fly: { poses: ["hang"] },
    land: { poses: ["stand"] },
    wobble: { poses: ["balance"] },
    splash: { poses: ["hang"] },
    cheer: { poses: ["cheer", "jump"], every: 0.4 },
};

/** Where she last stood safely, and how far along the level she was then. */
interface Restart {
    x: number;
    footing: number;
    track: Track;
    landings: number[];
}

export interface SwingsState {
    phase: number;
    L: SwingsLevel;
    footings: Footing[];
    ropes: RopeState[];
    mode: Mode;
    /** The rope she holds or is about to take, or -1. */
    held: number;
    /** The footing she stands on, or -1 while she is off the ground. */
    on: number;
    /** Her feet while she stands, and her hands while she swings or flies. */
    x: number;
    y: number;
    flight: Flight;
    /** The way her body hangs from her hands, from straight down, as a rope's angle is. */
    lean: number;
    holding: boolean;
    /** Steps left of her hands reaching for a rope, after a tap in the air or at a swaying rope. */
    reachFor: number;
    /** How far back she is pulled, from straight down, in radians, while the child pulls her, and where she stood. */
    pulled: number;
    stand: number;
    /** The pull was set by the arrow keys, so Go starts the swing rather than winding it further. */
    keyed: boolean;
    /** On a rope caught in the air, which a gentle pump keeps swinging at least its keep height. */
    assist: boolean;
    /** She has just come halfway up the swing going forward, where a still view waits for a tap. */
    rising: boolean;
    /** Steps on the rope, in the air, and in the mode she is in. */
    onFor: number;
    since: number;
    /** The rope let go of last, which cannot be caught again straight away. */
    left: number;
    /** The numbers she has landed on since the start, the near bank's 0 first. */
    landings: number[];
    goal: Track;
    restart: Restart;
    act: Actor<Act>;
    won: boolean;
    said: string;
    touched: boolean;
    steps: number;
    cam: Cam;
    ripples: { x: number; age: number; size: number }[];
    /** The way the swing turned last step, for the creak at each end of it. */
    turning: number;
}

const place = (L: SwingsLevel) => PLACES[L.place];
export const xOf = (L: SwingsLevel, u: number): number => X0 + u * L.per;
const farX = (L: SwingsLevel): number => xOf(L, L.far);
const worldOf = (L: SwingsLevel) => ({ w: farX(L) + BEYOND, h: H });

/** The tree house's tree: drawn this many squares across, its deck this high over its roots, and the deck's half width. */
const TREE = { size: 9, deck: 6.3, half: 2.6, trunk: 0.3 } as const;
const treeX = (L: SwingsLevel): number => farX(L) + 4.5;

function footingsOf(L: SwingsLevel): Footing[] {
    const p = place(L),
        out: Footing[] = [{ kind: "near", n: 0, x0: 0, x1: X0, top: p.bank }];
    for (const n of L.stones) {
        const x = xOf(L, n);
        out.push({
            kind: "stone",
            n,
            x0: x - STONE.half,
            x1: x + STONE.half,
            top: p.surface - 0.5,
        });
    }
    if (L.treehouse) {
        const x = treeX(L) - TREE.trunk;
        out.push({
            kind: "far",
            n: L.far,
            x0: x - TREE.half,
            x1: x + TREE.half,
            top: p.bank - TREE.deck,
        });
    } else out.push({ kind: "far", n: L.far, x0: farX(L), x1: worldOf(L).w, top: p.bank });
    return out;
}

const goalOf = (L: SwingsLevel): Goal => ({
    inOrder: [
        ...L.wants.map((w): Goal =>
            "stone" in w ? { on: "land", value: w.stone } : { on: "catch", value: w.rope },
        ),
        { on: "arrive" },
    ],
});

const copyTrack = (t: Track): Track => structuredClone(t);

export function startSwings(L: SwingsLevel, phase = 0): SwingsState {
    const p = place(L);
    const ropes: RopeState[] = L.ropes.map((r, i) => ({
        ax: xOf(L, r.at),
        ay: p.anchor,
        r: r.long,
        long: r.long,
        // neighbours start swinging opposite ways, so the ropes are never all in step
        theta: (r.sway ?? 0) * (i % 2 ? -1 : 1),
        omega: 0,
        sway: r.sway ?? 0,
    }));
    const goal = track(goalOf(L));
    const s: SwingsState = {
        phase,
        L,
        footings: footingsOf(L),
        ropes,
        mode: "ready",
        held: -1,
        on: 0,
        x: X0 - 1.3,
        y: p.bank,
        flight: { x: 0, y: 0, vx: 0, vy: 0 },
        lean: 0,
        holding: false,
        reachFor: 0,
        pulled: 0,
        stand: 0,
        keyed: false,
        assist: false,
        rising: false,
        onFor: 0,
        since: 0,
        left: -1,
        landings: [0],
        goal,
        restart: { x: X0 - 1.3, footing: 0, track: copyTrack(goal), landings: [0] },
        act: actor<Act>("ready", "hang"),
        won: false,
        said: L.prompt,
        touched: false,
        steps: 0,
        cam: { x: X0 + 6, y: CAM_Y, zoom: 1 },
        ripples: [],
        turning: 0,
    };
    ready(s);
    return s;
}

/** Her hands while she stands, raised to the rope. */
const standingHands = (s: SwingsState): Pt => ({ x: s.x, y: s.y - BODY });

/** The rope ahead of where she stands that she can reach, or -1. */
function ropeAhead(s: SwingsState): number {
    const h = standingHands(s);
    let best = -1;
    s.ropes.forEach((r, i) => {
        if (r.ax < s.x - 0.3 || Math.hypot(h.x - r.ax, h.y - r.ay) > r.long) return;
        if (best < 0 || r.ax < (s.ropes[best]?.ax ?? Infinity)) best = i;
    });
    return best;
}

/** She stands ready with the rope ahead pulled back to her hands, or reaching for it while it sways. */
function ready(s: SwingsState): void {
    s.mode = "ready";
    s.reachFor = 0;
    s.pulled = 0;
    s.keyed = false;
    s.assist = false;
    s.held = ropeAhead(s);
    const r = s.ropes[s.held];
    if (!r || r.sway) return;
    const h = standingHands(s);
    r.r = Math.hypot(h.x - r.ax, h.y - r.ay);
    r.theta = Math.atan2(h.x - r.ax, h.y - r.ay);
    r.omega = 0;
}

const emit = (s: SwingsState, out: Happening[], event: GameEvent): void => {
    feed(s.goal, event);
    out.push({ event });
};

const cue = (
    s: SwingsState,
    out: Happening[],
    c: "lift" | "place" | "creak" | "splash" | "ring" | "nope" | "win" | "bump",
    strength: number,
    pitch = 1,
): void => {
    out.push({ cue: c, strength, pitch, pan: panOf(s.x, s.cam.x, VIEW.w) });
};

/** What the level wants next, or null once only the far side is left. */
export function nextWant(s: SwingsState): Want | null {
    const t = s.goal;
    if (!("inOrder" in t)) return null;
    return s.L.wants[t.at] ?? null;
}

const wantsDone = (s: SwingsState): boolean => nextWant(s) === null;

/** The flight's wind now: steady for a gust's length, rising and falling over the level's period. */
export function windAt(L: SwingsLevel, steps: number): number {
    if (!L.wind) return 0;
    const t = steps * DT;
    return L.wind.strength * (0.55 + 0.45 * Math.sin((2 * Math.PI * t) / L.wind.period));
}

function takeRope(s: SwingsState, out: Happening[]): void {
    const r = s.ropes[s.held];
    if (!r) return;
    s.mode = "swing";
    s.on = -1;
    s.onFor = 0;
    s.rising = false;
    s.lean = r.theta;
    cue(s, out, "lift", 0.3);
}

/** She takes the rope ahead in both hands and leans back on it, from where she stands. */
function startPull(s: SwingsState, r: RopeState): void {
    s.stand = Math.abs(r.theta);
    s.pulled = s.stand;
    s.keyed = false;
}

/** Pulls her back up the rope's arc to `angle` from straight down, no nearer than she stood nor higher than the highest swing. */
function setPull(s: SwingsState, r: RopeState, angle: number): void {
    s.pulled = Math.max(s.stand, Math.min(Math.max(s.stand, SWINGS.most.value), angle));
    r.theta = -s.pulled;
    r.omega = 0;
    const h = handsOf(r);
    s.x = h.x;
    s.y = h.y;
    s.lean = r.theta;
    s.mode = "pull";
}

/** Let go of from where she is pulled back to, she swings from rest. */
function swingOff(s: SwingsState, out: Happening[]): void {
    const r = s.ropes[s.held];
    if (!r) return;
    r.omega = 0;
    s.assist = false;
    takeRope(s, out);
}

/** Where a finger held on the field pulls her to: its angle from the rope's branch, back from straight down. */
const fingerAngle = (r: RopeState, t: Pt): number => -Math.atan2(t.x - r.ax, t.y - r.ay);

/** The arrow keys pull her back, left, or let her forward, right, a step for each press. */
const keyPull = (pad: Pad): number =>
    pad.pressed.reduce((n, d) => n + (d === "left" ? 1 : d === "right" ? -1 : 0), 0);

function fly(s: SwingsState, out: Happening[]): void {
    const r = s.ropes[s.held];
    if (!r) return;
    s.flight = letGo(r);
    s.left = s.held;
    s.held = -1;
    s.mode = "fly";
    s.since = 0;
    s.reachFor = 0;
    // the rope swings on from where it was let go, at its own length
    r.omega = (r.omega * r.r) / r.long;
    r.r = r.long;
    const v = Math.hypot(s.flight.vx, s.flight.vy);
    cue(s, out, "lift", Math.min(1, 0.25 + v / 30), 1 + v / 60);
}

function catchIt(s: SwingsState, out: Happening[], i: number, got: Swing): void {
    const r = s.ropes[i];
    if (!r) return;
    Object.assign(r, got);
    s.held = i;
    s.mode = "swing";
    s.onFor = 0;
    s.rising = false;
    s.reachFor = 0;
    s.assist = true;
    s.lean = got.theta;
    cue(s, out, "place", 0.6, 1.2);
    const at = s.L.ropes[i]?.at ?? 0;
    if (!s.L.wants.some((w) => "rope" in w)) return;
    const want = nextWant(s);
    if (want && "rope" in want && want.rope === at) {
        emit(s, out, { kind: "catch", value: at });
        cue(s, out, "ring", 0.6, 1.1);
        s.said = `${written(s.L, at)}. ${nextLine(s)}`;
    } else if (!wanted(s, (w) => "rope" in w && w.rope === at)) {
        // a rope the level does not ask for is only loosely tied, and slips
        s.mode = "wobble";
        s.since = 0;
        s.said = `That rope hangs at ${written(s.L, at)}. ${nextLine(s)}`;
        cue(s, out, "nope", 0.6);
    }
}

/** Whether the level asks for this now or asked for it already: a steady stone or a tight rope. */
function wanted(s: SwingsState, is: (w: Want) => boolean): boolean {
    const want = nextWant(s);
    if (want && is(want)) return true;
    return s.L.wants.some((w) => is(w) && doneBefore(s, w));
}

/** Whether a want was met before the one the level is on now. */
function doneBefore(s: SwingsState, w: Want): boolean {
    const t = s.goal;
    if (!("inOrder" in t)) return false;
    const i = s.L.wants.indexOf(w);
    return i >= 0 && i < t.at;
}

const written = (L: SwingsLevel, n: number): string => (L.unit ? `${n} ${L.unit}` : String(n));

function nextLine(s: SwingsState): string {
    const w = nextWant(s);
    if (w)
        return "stone" in w
            ? `Now the stone at ${w.stone}.`
            : `Now the rope at ${written(s.L, w.rope)}.`;
    return s.L.treehouse ? "Now the tree house." : "Now the far bank.";
}

/** A landing on footing `i` at `x`: a steady place is a checkpoint, a wrong one wobbles, and the far side ends it. */
function landOn(s: SwingsState, out: Happening[], i: number, speed: number): void {
    const f = s.footings[i];
    if (!f) return;
    s.on = i;
    s.x = Math.max(f.x0 + 0.4, Math.min(f.x1 - 0.4, s.flight.x));
    s.y = f.top;
    s.lean = 0;
    s.since = 0;
    land(s.act, speed);
    out.push({ puff: { x: s.x, y: f.top, n: 3 } });
    const L = s.L;
    if (f.kind === "near") {
        s.mode = "land";
        cue(s, out, "place", 0.4, 0.9);
        return;
    }
    if (f.kind === "stone") {
        const steady = L.jumps !== undefined || wanted(s, (w) => "stone" in w && w.stone === f.n);
        const want = nextWant(s);
        if (!steady) {
            s.mode = "wobble";
            s.said = `That stone is ${f.n}. ${nextLine(s)}`;
            cue(s, out, "nope", 0.6);
            return;
        }
        if (s.landings[s.landings.length - 1] !== f.n) s.landings.push(f.n);
        if (want && "stone" in want && want.stone === f.n) {
            emit(s, out, { kind: "land", value: f.n });
            cue(s, out, "ring", 0.6, 1 + s.landings.length * 0.06);
        } else cue(s, out, "place", 0.6);
        s.said = L.jumps ? `${sumLine(s)}. ${jumpsLeft(s)}` : `${f.n}. ${nextLine(s)}`;
        checkpoint(s, out);
        s.mode = "land";
        return;
    }
    // the far side
    const jumps = s.landings.length;
    if (!wantsDone(s)) {
        s.mode = "back";
        s.said = `Not yet. ${nextLine(s)}`;
        cue(s, out, "nope", 0.5);
        return;
    }
    if (L.jumps && jumps !== L.jumps) {
        s.landings.push(f.n);
        s.mode = "back";
        s.said = `${sumLine(s)}. That is ${jumps} jumps, not ${L.jumps}. Back to the start.`;
        cue(s, out, "nope", 0.5);
        // a count gone wrong starts again from the near bank
        s.restart = { x: X0 - 1.3, footing: 0, track: track(goalOf(L)), landings: [0] };
        return;
    }
    s.landings.push(f.n);
    emit(s, out, { kind: "arrive" });
    s.won = true;
    s.mode = "home";
    s.said = L.jumps ? `${sumLine(s)}. Three jumps to ${L.far}.` : "Charlie made it across!";
    cue(s, out, "win", 0.9);
    out.push({ burst: { kind: "sparkle", x: s.x, y: f.top - 3, n: 14 } });
}

/** The jumps so far as a sum: 0 + 4 + 4 = 8 reads as 4 + 4 = 8. */
export function sumLine(s: SwingsState): string {
    const at = s.landings;
    const steps = at.slice(1).map((n, i) => n - (at[i] ?? 0));
    const said = steps.map((n, i) => (i === 0 ? String(n) : n < 0 ? `- ${-n}` : `+ ${n}`));
    return `${said.join(" ")} = ${at[at.length - 1] ?? 0}`;
}

function jumpsLeft(s: SwingsState): string {
    const left = (s.L.jumps ?? 0) - (s.landings.length - 1);
    return left === 1 ? "One jump left." : `${left} jumps left.`;
}

function checkpoint(s: SwingsState, out: Happening[]): void {
    s.restart = { x: s.x, footing: s.on, track: copyTrack(s.goal), landings: [...s.landings] };
    emit(s, out, { kind: "checkpoint" });
}

function restore(s: SwingsState): void {
    const r = s.restart,
        f = s.footings[r.footing];
    s.x = r.x;
    s.y = f?.top ?? place(s.L).bank;
    s.on = r.footing;
    s.goal = copyTrack(r.track);
    s.landings = [...r.landings];
    s.lean = 0;
    s.left = -1;
    ready(s);
}

function splash(s: SwingsState, out: Happening[], x: number): void {
    s.mode = "splash";
    s.since = 0;
    s.x = x;
    s.held = -1;
    s.ripples.push({ x, age: 0, size: 1.2 });
    cue(s, out, "splash", 0.8);
    out.push({ burst: { kind: "splash", x, y: place(s.L).surface, n: 12 } });
    if (!s.said.startsWith("That")) s.said = "Splash! She climbs back out to try again.";
}

/** The footing whose top her feet came down through in this step, or -1. */
function footingUnder(s: SwingsState, x: number, before: number, after: number): number {
    return s.footings.findIndex((f) => {
        const edge = f.kind === "stone" ? EDGE : 0;
        return x >= f.x0 - edge && x <= f.x1 + edge && before <= f.top + 0.05 && after >= f.top;
    });
}

const feetOf = (hands: Pt, lean: number): Pt => ({
    x: hands.x + BODY * Math.sin(lean),
    y: hands.y + BODY * Math.cos(lean),
});

function stepRopes(s: SwingsState): void {
    const g = SWINGS.gravity.value;
    s.ropes.forEach((r, i) => {
        if (i === s.held && (s.mode !== "ready" || !r.sway)) return;
        // a rope nobody holds swings back to hanging, unless it sways on its own
        stepSwing(r, g, DT, { pump: 0, most: 0, damping: r.sway ? 0 : 0.6 }, false);
    });
}

export function stepSwings(s: SwingsState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    s.since++;
    const hand = pad.go || pad.touch !== null;
    // a press is a new hold, or a tap of the button that came and went between two steps
    const pressed = !s.holding && (hand || pad.tapped),
        released = !hand && s.holding;
    s.holding = hand;
    if (pressed) s.touched = true;
    const g = SWINGS.gravity.value,
        p = place(s.L);
    stepRopes(s);
    if (s.reachFor > 0) s.reachFor--;
    switch (s.mode) {
        case "ready": {
            const r = s.ropes[s.held];
            if (!r) break;
            if (r.sway) {
                // a swaying rope is taken when it comes within reach of the hands held up for it
                if (pressed) s.reachFor = Math.round(REACH * RATE);
                const got =
                    s.reachFor > 0
                        ? catchRope(
                              standingHands(s),
                              { x: 0, y: 0 },
                              r,
                              SWINGS.reach.value * 1.6,
                              1.5,
                          )
                        : null;
                if (got) {
                    r.r = got.r;
                    r.theta = got.theta;
                    s.reachFor = 0;
                    s.assist = true;
                    takeRope(s, out);
                }
                break;
            }
            const keys = keyPull(pad);
            if (keys !== 0) {
                startPull(s, r);
                setPull(s, r, s.pulled + keys * KEY_PULL);
                s.keyed = true;
            } else if (pressed) {
                startPull(s, r);
                setPull(s, r, pad.touch ? fingerAngle(r, pad.touch) : s.stand);
                // a click that came and went starts a small swing at once
                if (!hand) swingOff(s, out);
            }
            break;
        }
        case "pull": {
            const r = s.ropes[s.held];
            if (!r) break;
            const keys = keyPull(pad);
            if (keys !== 0) {
                setPull(s, r, s.pulled + keys * KEY_PULL);
                s.keyed = true;
            } else if (pad.touch) {
                setPull(s, r, fingerAngle(r, pad.touch));
                s.keyed = false;
            } else if (hand && !s.keyed) setPull(s, r, s.pulled + SWINGS.wind.value * DT);
            if (released || (pressed && s.keyed && !pad.touch)) swingOff(s, out);
            break;
        }
        case "swing": {
            const r = s.ropes[s.held];
            if (!r) break;
            s.onFor++;
            const before = r.theta,
                half = amplitudeOf(r, g) / 2;
            stepSwing(
                r,
                g,
                DT * apexEase(r, SWINGS.slow.value),
                { pump: SWINGS.pump.value, most: SWINGS.keep.value, damping: SWINGS.damping.value },
                s.assist,
            );
            s.rising = before < half && r.theta >= half && r.omega > 0;
            s.lean = r.theta;
            const way = Math.sign(r.omega);
            if (way !== 0 && way !== s.turning) {
                const reach = amplitudeOf(r, g);
                if (s.turning !== 0 && reach > 0.35)
                    cue(s, out, "creak", Math.min(0.7, reach * 0.4), 0.8 + reach * 0.2);
                s.turning = way;
            }
            const h = handsOf(r);
            s.x = h.x;
            s.y = h.y;
            // her toes skim the water at the bottom of a long swing
            const feet = feetOf(h, s.lean);
            if (feet.y > p.surface - 0.1 && s.steps % 6 === 0)
                s.ripples.push({ x: feet.x, age: 0, size: 0.4 });
            if (pressed && s.onFor > 2) fly(s, out);
            break;
        }
        case "fly": {
            const f = s.flight,
                before = feetOf({ x: f.x, y: f.y }, s.lean).y;
            stepFlight(f, g, windAt(s.L, s.steps), DT);
            s.lean += (0 - s.lean) * Math.min(1, 5 * DT);
            s.x = f.x;
            s.y = f.y;
            const feet = feetOf({ x: f.x, y: f.y }, s.lean);
            if (pressed) s.reachFor = Math.round(REACH * RATE);
            if (s.reachFor > 0) {
                // the nearest rope in reach, since two ropes can hang closer than her reach; the rope
                // just let go of swings back behind her and is not taken again in this flight
                let best: { i: number; got: Swing; d: number } | null = null;
                for (const [i, r] of s.ropes.entries()) {
                    if (i === s.left) continue;
                    const got = catchRope(
                        { x: f.x, y: f.y },
                        { x: f.vx, y: f.vy },
                        r,
                        SWINGS.reach.value,
                        1.5,
                    );
                    const d = Math.abs(f.x - handsOf(r).x);
                    if (got && (!best || d < best.d)) best = { i, got, d };
                }
                if (best) {
                    catchIt(s, out, best.i, best.got);
                    break;
                }
            }
            const under = footingUnder(s, feet.x, before, feet.y);
            if (under >= 0) {
                s.flight.x = feet.x;
                landOn(s, out, under, f.vy);
                break;
            }
            // flying low into a bank's side or a stone's knocks her back into the water
            const wall = s.footings.find(
                (f) =>
                    !(f.kind === "far" && s.L.treehouse) &&
                    feet.x >= f.x0 &&
                    feet.x <= f.x1 &&
                    feet.y > f.top + 0.3,
            );
            if (wall) {
                cue(s, out, "bump", 0.6);
                splash(s, out, wall.kind === "near" ? wall.x1 + 0.4 : wall.x0 - 0.4);
            } else if (feet.y > p.surface || feet.y > H) splash(s, out, feet.x);
            break;
        }
        case "land": {
            // a landing near a stone's edge steps back to its middle
            const f = s.footings[s.on];
            if (f?.kind === "stone") s.x += ((f.x0 + f.x1) / 2 - s.x) * Math.min(1, 8 * DT);
            if (s.since * DT >= LANDING && !s.won) ready(s);
            break;
        }
        case "wobble":
            if (s.since * DT >= WOBBLE) {
                const r = s.ropes[s.held];
                if (r) {
                    r.r = r.long;
                    r.omega = 0;
                }
                splash(s, out, s.x);
            }
            break;
        case "splash":
        case "back":
            if (s.since * DT >= SPLASH) restore(s);
            break;
        case "home":
            break;
    }
    for (const w of s.ripples) w.age += DT;
    s.ripples = s.ripples.filter((w) => w.age < 2.5);
    stepActor(s.act, actOf(s), ACTS, DT, 0, 1);
    s.cam = follow(s.cam, wantedCam(s), { rate: 3.2, dt: DT, view: VIEW, world: worldOf(s.L) });
    return out;
}

/** A rope the level asks for next is in reach of her hands in the air: where a still view stops for a tap. */
export function catchable(s: SwingsState): boolean {
    if (s.mode !== "fly" || s.reachFor > 0) return false;
    const want = nextWant(s);
    if (!want || !("rope" in want)) return false;
    const i = s.L.ropes.findIndex((r) => r.at === want.rope),
        r = s.ropes[i];
    return (
        !!r &&
        i !== s.left &&
        catchRope(
            { x: s.flight.x, y: s.flight.y },
            { x: s.flight.vx, y: s.flight.vy },
            r,
            SWINGS.reach.value,
            1.5,
        ) !== null
    );
}

function wantedCam(s: SwingsState): Cam {
    const r = s.ropes[s.held];
    const lead =
        s.mode === "fly"
            ? s.flight.vx * 0.4
            : s.mode === "swing" && r
              ? 3 + velocityOf(r).x * 0.25
              : 5;
    return { x: s.x + lead, y: CAM_Y, zoom: 1 };
}

function actOf(s: SwingsState): Act {
    if (s.mode === "home") return "cheer";
    if (s.mode === "land") return s.since * DT < LANDING ? "land" : "ready";
    if (s.mode === "wobble") return s.on >= 0 ? "wobble" : "swing";
    if (s.mode === "splash" || s.mode === "back") return "splash";
    if (s.mode === "fly") return "fly";
    if (s.mode === "swing" || s.mode === "pull") return "swing";
    return "ready";
}

/** The flight she would take if let go now: dots along it, and the footing she would come down on, or -1 for the water. */
export function arcOf(s: SwingsState): { pts: Pt[]; at: Pt | null; footing: number } {
    const r = s.ropes[s.held];
    if (s.mode !== "swing" || !r) return { pts: [], at: null, footing: -1 };
    const f = letGo(r),
        g = SWINGS.gravity.value,
        wind = windAt(s.L, s.steps),
        surface = place(s.L).surface,
        pts: Pt[] = [];
    let lean = r.theta;
    for (let i = 0; i < 90; i++) {
        const before = feetOf({ x: f.x, y: f.y }, lean).y;
        stepFlight(f, g, wind, DT);
        lean += (0 - lean) * Math.min(1, 5 * DT);
        const feet = feetOf({ x: f.x, y: f.y }, lean);
        if (i % 3 === 2) pts.push({ x: feet.x, y: feet.y - 0.2 });
        const under = footingUnder(s, feet.x, before, feet.y);
        if (under >= 0)
            return { pts, at: { x: feet.x, y: s.footings[under]?.top ?? feet.y }, footing: under };
        if (feet.y > surface) return { pts, at: { x: feet.x, y: surface }, footing: -1 };
    }
    return { pts, at: null, footing: -1 };
}

/** Whether coming down on footing `i` now would count: a steady stone, or the far side once nothing else is asked for. */
function goodLanding(s: SwingsState, i: number): boolean {
    const f = s.footings[i];
    if (!f) return false;
    if (f.kind === "stone")
        return s.L.jumps !== undefined || wanted(s, (w) => "stone" in w && w.stone === f.n);
    return f.kind === "far" && wantsDone(s);
}

/** The swing's reach while she is pulled back: dots round the rope's arc from where she is to as high on the other side. */
function reachOf(s: SwingsState): Pt[] {
    const r = s.ropes[s.held];
    if (s.mode !== "pull" || !r) return [];
    const pts: Pt[] = [];
    for (let k = 0; k <= 16; k++) {
        const theta = -s.pulled + (2 * s.pulled * k) / 16;
        pts.push(handsOf({ ...r, theta }));
    }
    return pts;
}

const MOOD: Record<Act, string> = {
    ready: "happy",
    swing: "excited",
    fly: "surprised",
    land: "happy",
    wobble: "worried",
    splash: "surprised",
    cheer: "excited",
};

function charlieSprites(s: SwingsState, rest: boolean): Sprite[] {
    const act = s.act.act,
        z = act === "splash" ? 2.9 : 9;
    const dress = (pose: string): Sprite => {
        const wide = pose === "balance" ? 6 : 4;
        const base = {
            key: "charlie",
            art: "charlie",
            params: { ...s.L.outfit, pose, mood: MOOD[act], dir: 1 },
            size: wide * K,
            z,
        };
        if (pose === "hang" && (s.mode === "swing" || s.mode === "pull" || s.mode === "fly")) {
            const h = { x: s.x, y: s.y };
            return {
                ...base,
                x: h.x + MIDDLE * Math.sin(s.lean),
                y: h.y + MIDDLE * Math.cos(s.lean),
                angle: -s.lean,
            };
        }
        if (act === "splash") return { ...base, x: s.x, y: place(s.L).surface + 1.7, stand: true };
        return { ...base, x: s.x, y: s.y, stand: true };
    };
    return actorSprites(s.act, ACTS, (pose) => dress(pose), 0, rest);
}

/** The ropes' sprites: each hangs from its branch at its angle, and the one she holds runs to her hands. */
function ropeSprites(s: SwingsState): Sprite[] {
    return s.ropes.map((r, i) => {
        const at = s.L.ropes[i]?.at ?? 0;
        // a rope in her hands is drawn to its knot, which she holds, rather than past her into the ground
        const inHand =
            i === s.held &&
            (s.mode === "swing" ||
                s.mode === "pull" ||
                s.mode === "wobble" ||
                (s.mode === "ready" && !r.sway));
        const long = inHand ? Math.max(3, Math.round(r.r + SWINGROPE_KNOT)) : r.long;
        return {
            key: `rope:${i}`,
            art: "swingrope",
            params: {
                long: Math.round(long),
                tag: s.L.tags ? written({ ...s.L, unit: "" }, at) : "",
            },
            size: 2,
            x: r.ax + (long / 2 - 0.15) * Math.sin(r.theta),
            y: r.ay + (long / 2 - 0.15) * Math.cos(r.theta),
            angle: -r.theta,
            z: 7,
        };
    });
}

function backdrop(s: SwingsState, sprites: Sprite[], rest: boolean): void {
    const L = s.L,
        p = place(L),
        W = worldOf(L),
        eye: Eye = { cam: s.cam, view: { w: 72, h: H } };
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
                alpha: 0.8,
                drift: rest ? 0 : 0.2 + windAt(L, s.steps) * 0.15,
                things: [
                    { art: "cloud", params: { puffs: 4, rain: 0 }, size: 5, often: 2 },
                    { art: "cloud", params: { puffs: 3, rain: 0 }, size: 3.6, often: 1 },
                ],
            },
            eye,
            7,
            rest ? 0 : s.steps * DT,
        ),
        ...row(
            {
                key: "far",
                depth: 0.35,
                base: p.bank,
                every: 12,
                stray: 3,
                z: 1,
                gaps: 0.35,
                alpha: 0.5,
                things: [
                    { art: "firs", params: { count: 3, snow: 0 }, size: 5, often: 2 },
                    {
                        art: "hedge",
                        params: { clumps: 4, berries: 0, gap: 0 },
                        size: 4.5,
                        often: 1,
                    },
                ],
            },
            eye,
            13,
        ),
    );
    // the banks, their earth going on down to the bottom of the world, and a cliff for a ravine
    const deep = Math.min(16, Math.ceil(H - p.bank + BANK.top + 0.5)),
        cliff = L.place === "ravine",
        out = cliff ? 0 : BANK.slope;
    for (const [key, x0, x1, edge] of [
        ["near", 0, X0 + out, "right"],
        ["far", farX(L) - out, W.w, "left"],
    ] as const) {
        const w = Math.min(36, Math.round(x1 - x0));
        sprites.push({
            key: `bank:${key}`,
            art: "streambank",
            params: { w, h: deep, edge, cliff: cliff ? 1 : 0 },
            seed: key === "near" ? 61 : 62,
            size: w,
            x: edge === "right" ? x1 - w / 2 : x0 + w / 2,
            y: p.bank - BANK.top + deep / 2,
            // over the water, so the water runs in under the sloping bank
            z: 3.2,
            still: true,
        });
    }
    // a tree on each bank, whose branch reaches out over the water to hold the ropes; one branch
    // reaches as far as twenty squares, and ropes past that hang from the far tree's
    const nearTrunk = X0 - 4,
        farTrunk = farX(L) + 4;
    const near = s.ropes.filter((r) => r.ax - nearTrunk <= 20),
        far = s.ropes.filter((r) => r.ax - nearTrunk > 20);
    const tree = (key: string, x: number, fruit: number): Sprite => ({
        key: `tree:${key}`,
        art: "tree",
        params: { fruit, fallen: 0, item: "apple" },
        seed: key === "near" ? 5 : 9,
        size: 11,
        x,
        // the tree's own ground line stands a little above its box's foot
        y: p.bank + 1.6,
        stand: true,
        z: 1.5,
        still: true,
    });
    const branch = (key: string, from: number, to: number, flip: boolean): Sprite => {
        const long = Math.max(4, Math.min(24, Math.round(Math.abs(to - from))));
        return {
            key: `branch:${key}`,
            art: "swingbranch",
            params: { long, leaves: Math.round(long / 4) },
            size: long,
            x: flip ? from - long / 2 : from + long / 2,
            y: p.anchor - BRANCH.under + BRANCH.middle,
            z: 6,
            ...(flip ? { flip: true } : {}),
            still: true,
        };
    };
    sprites.push(tree("near", nearTrunk, L.place === "garden" ? 5 : 0));
    const lastNear = near[near.length - 1]?.ax ?? X0;
    sprites.push(branch("near", nearTrunk + 0.5, lastNear + 1.5, false));
    const firstFar = far[0]?.ax;
    if (firstFar !== undefined && !L.treehouse)
        sprites.push(tree("far", farTrunk, 0), branch("far", farTrunk - 0.5, firstFar - 1.5, true));
    // stones stand in the water, which covers their feet
    s.footings.forEach((f, k) => {
        if (f.kind !== "stone") return;
        sprites.push({
            key: `stone:${k}`,
            art: "steppingstone",
            params: { n: L.numbers ? String(f.n) : "", w: 3, dark: 0 },
            size: STONE.size,
            seed: 40 + k,
            x: (f.x0 + f.x1) / 2,
            y: f.top + STONE.rise,
            stand: true,
            z: 2.5,
            still: true,
        });
    });
    const fx = farX(L);
    if (L.treehouse) {
        sprites.push({
            key: "treehouse",
            art: "treeplatform",
            params: { basket: 1 },
            size: TREE.size,
            x: treeX(L),
            y: p.bank + 0.2,
            stand: true,
            z: 2,
            still: true,
        });
    } else
        sprites.push(
            {
                key: "rug",
                art: "picnicrug",
                params: { w: 6, colour: "berry" },
                size: 6,
                x: fx + 7,
                y: p.bank + 0.25,
                stand: true,
                z: 4,
                still: true,
            },
            {
                key: "basket",
                art: "basket",
                params: { item: "apple", count: 5, label: "" },
                size: 2,
                x: fx + 8.7,
                y: p.bank - 0.2,
                stand: true,
                z: 4,
                still: true,
            },
        );
    const top = s.footings[s.footings.length - 1]?.top ?? p.bank;
    sprites.push({
        key: "dog",
        art: "dog",
        params: { facing: -1, ball: 0 },
        crop: { x: 0.8, y: 0.4, w: 7.4, h: 5.2 },
        size: 2.4,
        x: L.treehouse ? treeX(L) + 1.2 : fx + 4,
        y: top - (5.2 / 7.4) * 1.2 + 0.2,
        z: 5,
        ...(s.won && !rest ? { squash: 0.12 * Math.sin(s.steps * 0.4) } : {}),
    });
    if (L.wind)
        sprites.push({
            key: "windsock",
            art: "windsock",
            params: {
                wind: Math.min(1, Math.round((windAt(L, s.steps) / L.wind.strength) * 4) / 4),
                stripes: 5,
            },
            size: 3,
            x: fx + 1.5,
            y: p.bank,
            stand: true,
            z: 4,
        });
    for (const [k, x] of [X0 - 0.4, fx + 0.5].entries())
        sprites.push({
            key: `reeds:${k}`,
            art: "reeds",
            params: { stems: 5 + k, lean: k ? -0.15 : 0.2 },
            seed: 80 + k,
            size: 2.4,
            x,
            y: p.surface - 0.1,
            stand: true,
            z: 3.5,
            still: true,
        });
}

/** The line along the water, or the tape across the ravine, marked in the level's units. */
function line(s: SwingsState, marks: Mark[]): void {
    const L = s.L,
        p = place(L),
        y = L.place === "ravine" ? p.bank + 0.4 : p.surface + 0.7;
    marks.push({ kind: "line", a: { x: X0, y }, b: { x: farX(L), y }, style: "thin" });
    for (let u = 0; u <= L.far + 1e-9; u += L.tick) {
        const x = xOf(L, u),
            numbered = Math.abs(u / L.every - Math.round(u / L.every)) < 1e-6;
        marks.push({
            kind: "line",
            a: { x, y },
            b: { x, y: y + (numbered ? 0.7 : 0.4) },
            style: "thin",
        });
        if (numbered) marks.push({ kind: "word", x, y: y + 1.4, text: String(u), size: 0.55 });
    }
    if (L.unit) marks.push({ kind: "word", x: farX(L) + 1.3, y: y + 1.4, text: L.unit, size: 0.5 });
}

export function swingsFrame(s: SwingsState, rest = false): Frame {
    const L = s.L,
        p = place(L),
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    backdrop(s, sprites, rest);
    sprites.push(...ropeSprites(s), ...charlieSprites(s, rest));
    line(s, marks);
    const want = nextWant(s);
    if (want && !s.won) {
        if ("stone" in want) {
            const f = s.footings.find((g) => g.kind === "stone" && g.n === want.stone);
            if (f && L.numbers)
                marks.push({ kind: "ring", x: (f.x0 + f.x1) / 2, y: f.top, r: 1.5 });
        } else if (L.tags) {
            const i = L.ropes.findIndex((r) => r.at === want.rope);
            const r = s.ropes[i];
            if (r) marks.push({ kind: "ring", x: r.ax, y: r.ay + 0.2, r: 0.7 });
        }
    }
    if (L.jumps && s.landings.length > 1)
        marks.push({ kind: "word", x: s.cam.x, y: 2.2, text: sumLine(s), size: 0.8 });
    if (L.arc !== "never" && !rest) {
        if (s.mode === "pull") marks.push({ kind: "dots", pts: reachOf(s), faint: true });
        if (s.mode === "swing") {
            const arc = arcOf(s);
            marks.push({ kind: "dots", pts: arc.pts, faint: L.arc === "faint" });
            if (L.arc === "always" && arc.at)
                marks.push({
                    kind: "ring",
                    x: arc.at.x,
                    y: arc.at.y,
                    r: 0.6,
                    on: goodLanding(s, arc.footing),
                });
        }
    }
    if (s.mode === "ready" && !s.touched && !rest) {
        const h = standingHands(s);
        const sway = s.ropes[s.held]?.sway;
        marks.push({
            kind: "word",
            x: h.x - (sway ? -0.5 : 1.2),
            y: h.y - 1.4,
            text: sway ? "tap to reach" : "pull back",
            size: 0.5,
        });
    }
    return {
        sprites,
        marks,
        camera: { ...s.cam },
        focus: { x: s.x + 3, y: CAM_Y },
        view: { ...VIEW },
        world: worldOf(L),
        time: rest ? 0 : s.steps * DT,
        water: [
            {
                x: X0 - 0.5,
                w: farX(L) - X0 + 1,
                level: p.surface,
                bottom: p.bed,
                waves: L.place === "garden" ? 0.05 : 0.1,
                flow: L.place === "stream" ? 0.6 : 0,
                ripples: rest ? [] : s.ripples.map((r) => ({ ...r })),
                z: 3,
            },
        ],
    };
}

function say(s: SwingsState): string {
    const L = s.L,
        parts: string[] = [];
    const u = (x: number) => Math.round(((x - X0) / L.per) * 10) / 10;
    if (s.won) return L.treehouse ? "Charlie is in the tree house." : "Charlie is at the picnic.";
    const r = s.ropes[s.held];
    if (s.mode === "swing" && r)
        parts.push(
            `Charlie is swinging on the rope at ${written(L, L.ropes[s.held]?.at ?? 0)}, reaching ${Math.round((amplitudeOf(r, SWINGS.gravity.value) * 180) / Math.PI)} degrees.`,
        );
    else if (s.mode === "pull")
        parts.push(
            `Charlie is pulled back ${Math.round((s.pulled * 180) / Math.PI)} degrees on the rope, ready to swing.`,
        );
    else if (s.mode === "fly") parts.push(`Charlie is flying, over ${written(L, u(s.x))}.`);
    else if (s.mode === "splash") parts.push("Charlie fell in and is climbing back out.");
    else {
        const f = s.footings[s.on];
        parts.push(
            f?.kind === "near"
                ? "Charlie is on the near bank, holding a rope."
                : f?.kind === "stone"
                  ? `Charlie is on the stone at ${f.n}, holding a rope.`
                  : "Charlie is on the far side.",
        );
    }
    const want = nextWant(s);
    parts.push(
        want
            ? "stone" in want
                ? `Next: the stone at ${want.stone}.`
                : `Next: the rope at ${written(L, want.rope)}.`
            : L.treehouse
              ? "Next: the tree house."
              : `Next: the far bank at ${written(L, L.far)}.`,
    );
    if (L.stones.length) parts.push(`Stones stand at ${L.stones.join(", ")}.`);
    if (L.jumps) parts.push(`${sumLine(s)}. ${jumpsLeft(s)}`);
    return parts.join(" ");
}

/** Charlie's own sounds: a whoosh as she lets go, a creak at each end of the swing, a catch, a splash and a cheer. */
const SOUNDS: Kit = {
    lift: [
        { wave: "noise", hz: 1100, attack: 0.02, decay: 0.28, gain: 0.35 },
        { wave: "triangle", hz: 280, to: 460, attack: 0.01, decay: 0.2, gain: 0.12 },
    ],
    creak: [
        { wave: "sawtooth", hz: 170, to: 150, attack: 0.03, decay: 0.22, gain: 0.08 },
        { wave: "triangle", hz: 340, to: 300, attack: 0.03, decay: 0.18, gain: 0.06, delay: 0.05 },
    ],
    place: [
        { wave: "noise", hz: 500, attack: 0.002, decay: 0.06, gain: 0.4 },
        { wave: "sine", hz: 140, to: 100, attack: 0.002, decay: 0.1, gain: 0.35 },
    ],
    splash: [
        { wave: "noise", hz: 1400, attack: 0.005, decay: 0.45, gain: 0.55 },
        { wave: "sine", hz: 220, to: 90, attack: 0.005, decay: 0.3, gain: 0.3 },
        { wave: "noise", hz: 2600, attack: 0.05, decay: 0.3, gain: 0.25, delay: 0.12 },
    ],
    nope: [
        { wave: "triangle", hz: 330, to: 220, attack: 0.01, decay: 0.3, gain: 0.3 },
        { wave: "noise", hz: 600, attack: 0.02, decay: 0.2, gain: 0.2, delay: 0.1 },
    ],
    ring: [
        { wave: "sine", hz: 880, attack: 0.005, decay: 0.35, gain: 0.3 },
        { wave: "sine", hz: 1320, attack: 0.005, decay: 0.45, gain: 0.22, delay: 0.08 },
    ],
    win: [
        { wave: "triangle", hz: 523, attack: 0.005, decay: 0.18, gain: 0.4 },
        { wave: "triangle", hz: 659, attack: 0.005, decay: 0.18, gain: 0.4, delay: 0.12 },
        { wave: "triangle", hz: 784, attack: 0.005, decay: 0.18, gain: 0.4, delay: 0.24 },
        { wave: "triangle", hz: 1046, attack: 0.005, decay: 0.6, gain: 0.45, delay: 0.36 },
    ],
};

export const swingsGame: ActionGame<SwingsState> = {
    portrait: { keep: 22 },
    id: "bridge",
    title: "Charlie's rope swings",
    group: "action",
    card: { round: { level: 0 }, keep: 22, minutes: 3 },
    quiet: true,
    levels: SWINGS_LEVELS,
    rate: RATE,
    touch: true,
    sounds: SOUNDS,
    cover: { art: "charlie", params: { pose: "hang", mood: "excited", hair: "ponytail" } },
    hint: "Pull Charlie back and let go to start her swinging, or set the pull with left and right and press Pull. Tap, or press Let go, to fly, and tap again in the air to catch the next rope.",
    controls: { go: "Pull" },
    goLabel: (s) =>
        s.mode === "swing"
            ? "Let go"
            : s.mode === "fly"
              ? "Catch"
              : s.mode === "ready" && s.ropes[s.held]?.sway
                ? "Reach"
                : "Pull",
    start: (phase) => startSwings(SWINGS_LEVELS[phase] ?? SWINGS_LEVELS[0], phase),
    step: stepSwings,
    frame: swingsFrame,
    say,
    note: (s) => s.said,
    won: (s) => s.won,
    objectives: (s) => {
        const p = progress(s.goal);
        return { completed: p.completed, total: p.total };
    },
    cancelInput: (s) => {
        s.holding = false;
        if (s.mode === "pull") ready(s);
    },
    hum: (s) => {
        const v =
            s.mode === "fly"
                ? Math.hypot(s.flight.vx, s.flight.vy)
                : s.mode === "swing"
                  ? Math.hypot(
                        velocityOf(s.ropes[s.held] ?? { ax: 0, ay: 0, r: 0, theta: 0, omega: 0 }).x,
                        0,
                    )
                  : 0;
        return [
            { kind: "water", level: s.L.place === "stream" ? 0.3 : 0.15 },
            { kind: "wind", level: Math.min(0.5, v / 50 + (s.L.wind ? 0.15 : 0)) },
        ];
    },
    tuning: SWINGS,
    // held still, a press winds the pull for a moment; from the swing or the air it is one tap, and
    // the view then runs on to halfway up the swing going forward, or to a wanted rope in reach
    still: {
        press: (s) => (s.mode === "ready" && !s.ropes[s.held]?.sway ? Math.round(RATE * 0.6) : 1),
        settling: (s) =>
            (s.mode === "fly" && !catchable(s)) ||
            (s.mode === "ready" && s.reachFor > 0) ||
            (s.mode === "swing" && !s.rising) ||
            s.mode === "land" ||
            s.mode === "wobble" ||
            s.mode === "splash" ||
            s.mode === "back",
    },
};
