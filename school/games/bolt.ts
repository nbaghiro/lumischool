// Bolt's rescue: a small robot runs, jumps, hovers and spins across eight planets to find its lost
// crew and fly them home. A held jump fires two little jets at its top; a spin breaks crates and
// walls, rolls boulders and wakes sleeping crew; each planet has its gadget and its own pull. The
// crew follow Bolt in a line once found and climb aboard the ship by their numbers, and the ship
// leaves once its seats are full, the count shown as a sum and as rows of seats. The running and
// jumping are walker.ts's runner over platforms.ts's ledges and blocks, the jets and the planets'
// pull are jets.ts's. See .docs/games.md.
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
import {
    hoverMoves,
    jets,
    onPlanet,
    stepJets,
    type JetSpec,
    type Jets,
} from "../../engine/motion/jets";
import type { Pad } from "../../engine/motion/pad";
import {
    course,
    ledgeAt,
    springSpeed,
    standingOn,
    type Block,
    type Ledge,
    type Place,
} from "../../engine/motion/platforms";
import type { Frame, Happening, Hue, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import {
    grounded,
    runner,
    stepRunner,
    type Course,
    type Intent,
    type Moves,
    type Runner,
} from "../../engine/motion/walker";
import { panOf, semitones, type Hum, type Kit } from "../../engine/sound/kit";
import type { ActionGame, ActionLevel, Levels, RoundEnd } from "./game";
import { BEYOND, row, type Eye } from "./scenery";

export const RATE = 60;
const DT = 1 / RATE;
const VIEW = { w: 32, h: 20 };
/** Earth's pull, which a planet's is written against, in squares a second each second. */
export const EARTH = 45;

/** The numbers that make Bolt feel the way it does. */
export const BOLT = {
    jump: knob(
        4,
        2.5,
        6,
        0.1,
        "squares",
        "a held jump on Earth; the moon makes it 6 and the heavy junkyard 2, the readings the levels ask about",
    ),
    cut: knob(
        1.5,
        1,
        5,
        0.1,
        "times gravity",
        "let go early, a jump is pulled down this much harder, so a tap is a hop and a hold is the whole jump",
    ),
    coyote: knob(
        0.12,
        0,
        0.3,
        0.01,
        "seconds",
        "a jump pressed just after running off an edge still jumps",
    ),
    buffer: knob(
        0.14,
        0,
        0.3,
        0.01,
        "seconds",
        "a jump pressed just before landing is kept and jumps on landing",
    ),
    fuel: knob(
        1.2,
        0.4,
        3,
        0.1,
        "seconds",
        "how long the jets hold Bolt up: long enough to cross a gap a jump alone does not, short enough to choose when",
    ),
    sink: knob(
        0.9,
        0,
        3,
        0.1,
        "squares a second",
        "how fast Bolt sinks while the jets fire: nearly level, so a hover reads as one",
    ),
    drift: knob(
        4.5,
        2,
        8,
        0.5,
        "squares a second",
        "how fast Bolt drifts on along while hovering, slower than a run",
    ),
    spin: knob(
        0.35,
        0.2,
        0.8,
        0.05,
        "seconds",
        "how long a spin lasts, quick enough to spin again at once",
    ),
    reach: knob(15, 6, 20, 1, "squares", "how far the spring gloves stretch out to a handle"),
    leverage: knob(
        1.6,
        1,
        3,
        0.1,
        "squares of plank a square",
        "how far the plank slides for each square Bolt walks back, so a short walk pulls it across",
    ),
    magnet: knob(
        5,
        2,
        10,
        0.5,
        "squares a second",
        "how fast the magnet slides a metal block towards Bolt",
    ),
    boost: knob(
        14,
        8,
        20,
        1,
        "squares a second",
        "how fast the rocket pack throws Bolt along for its burst",
    ),
};

const SPEC = (): JetSpec => ({
    seconds: BOLT.fuel.value,
    sink: BOLT.sink.value,
    brake: 70,
    drift: BOLT.drift.value,
});

/** How Bolt moves on Earth; a planet scales the jump by its pull. */
const earthMoves = (): Moves => ({
    speed: 7,
    accel: 50,
    airAccel: 30,
    gravity: EARTH,
    jump: BOLT.jump.value,
    cut: BOLT.cut.value,
    coyote: BOLT.coyote.value,
    buffer: BOLT.buffer.value,
    step: 0.35,
    fall: 24,
    climb: 4,
    pace: 1,
    height: 1.8,
});

export const movesOn = (L: BoltLevel): Moves => onPlanet(earthMoves(), L.gravity);

export type Planet = "moon" | "ice" | "jungle" | "lava" | "sand" | "gas" | "junk" | "crystal";
export type Look =
    "moon" | "ice" | "jungle" | "lava" | "sand" | "cloud" | "junk" | "crystal" | "metal";
export type Gadget = "gloves" | "rocket" | "magnet";
export type Colour = "sky" | "mint" | "berry" | "tang" | "glow";

export type BoltLedge = Ledge & { look: Look; sinks?: true };
export type BoltBlock = Block & { look: Look };

/** Something in the way: a crate and a wall a spin breaks, a tile the jets break, a boulder a spin rolls, a block the magnet pulls. */
export interface Thing {
    kind: "crate" | "wall" | "tile" | "rock" | "metal";
    x: number;
    /** The floor it stands on; for a tile, its own top. */
    y: number;
    /** Where a metal block may slide between. */
    rail?: [number, number];
}

export interface Crew {
    x: number;
    /** The floor it stands on. */
    y: number;
    colour: Colour;
    asleep?: true;
    /** The crate it is shut in, by its place among the things. */
    in?: number;
}

/** A gate that opens once this many crew are rescued. */
export interface Gate {
    x: number;
    y: number;
    need: number;
}

/** A plank housed in a wall at `x`, its top at `y`, that the spring gloves pull out to the left by up to `max` squares. */
export interface Bridge {
    x: number;
    y: number;
    max: number;
}

export interface BoltLevel extends ActionLevel {
    planet: Planet;
    /** The planet's pull, in squares a second each second. */
    gravity: number;
    /** What Bolt is told about a jump here, beside the goal. */
    jumpWords: string;
    w: number;
    h: number;
    start: Pt;
    blocks: BoltBlock[];
    ledges: BoltLedge[];
    things: Thing[];
    crew: Crew[];
    gates: Gate[];
    beacons: Pt[];
    ship: Pt;
    bridge?: Bridge;
    gadget?: Gadget;
    /** The dotted arc of a full jump: all of it, its first rise, or none. */
    preview: "full" | "short" | "none";
    /** Tries on the planet; left out, a fall costs nothing. */
    batteries?: number;
    /** Seats in a row of the ship's deck. */
    rows: number;
    /** What fills the pits. */
    pit?: "lava" | "water" | "swamp";
    /** What each crew member counts for, one list a variant, in the order of `crew`. */
    variants: number[][];
    /** The free planet, whose rescued crew are kept between visits. */
    free?: true;
}

const H = 24,
    G = 20;
const ground = (x0: number, x1: number, look: Look, top = G): BoltBlock => ({
    x0,
    x1,
    y0: top,
    y1: H + 6,
    look,
});
const ledge = (
    x0: number,
    x1: number,
    y: number,
    look: Look,
    more: Partial<BoltLedge> = {},
): BoltLedge => ({ x0, x1, y, look, oneWay: true, ...more });

export const BOLT_LEVELS: Levels<BoltLevel> = [
    {
        title: "The moon",
        grades: [1, 1],
        goal: "Find the lost crew and walk them to the ship. Spin to open a crate.",
        jumpWords: "On the moon a jump goes 6 squares high, half as high again as on Earth.",
        planet: "moon",
        gravity: 30,
        w: 64,
        h: H,
        start: { x: 3, y: G },
        blocks: [ground(0, 20, "moon"), ground(25, 44, "moon"), ground(49, 64, "moon")],
        ledges: [ledge(34, 40, G - 4.5, "moon")],
        things: [{ kind: "crate", x: 30, y: G }],
        crew: [
            { x: 12, y: G, colour: "sky" },
            { x: 30, y: G, colour: "mint", in: 0 },
            { x: 37, y: G - 4.5, colour: "berry" },
        ],
        gates: [],
        beacons: [{ x: 27, y: G }],
        ship: { x: 57, y: G },
        preview: "full",
        rows: 4,
        variants: [
            [1, 1, 1],
            [1, 1, 2],
            [2, 1, 1],
        ],
    },
    {
        title: "The ice planet",
        grades: [1, 2],
        goal: "Hold jump at the top to hover over the wide gap. A sleeping robot wakes with a spin. The gate opens for 3 crew.",
        jumpWords: "Here a jump goes 4 squares high, as on Earth, and the ice is slippery.",
        planet: "ice",
        gravity: EARTH,
        w: 66,
        h: H,
        start: { x: 3, y: G },
        blocks: [ground(0, 16, "ice"), ground(24, 66, "ice")],
        ledges: [ledge(33, 37, G - 3.5, "ice")],
        things: [{ kind: "crate", x: 29, y: G }],
        crew: [
            { x: 8, y: G, colour: "tang", asleep: true },
            { x: 29, y: G, colour: "sky", in: 0 },
            { x: 35, y: G - 3.5, colour: "mint" },
            { x: 50, y: G, colour: "glow" },
        ],
        gates: [{ x: 45, y: G, need: 3 }],
        beacons: [{ x: 25, y: G }],
        ship: { x: 59, y: G },
        preview: "full",
        rows: 5,
        pit: "water",
        variants: [
            [1, 1, 1, 2],
            [1, 2, 1, 1],
            [2, 1, 1, 1],
        ],
    },
    {
        title: "The jungle planet",
        grades: [1, 2],
        goal: "The gap is too wide to hover. Use the spring gloves on the handle and walk back to pull the plank across.",
        jumpWords: "A jump goes 4 squares, and the spring pad throws Bolt much higher.",
        planet: "jungle",
        gravity: EARTH,
        w: 66,
        h: H,
        start: { x: 3, y: G },
        blocks: [ground(0, 18, "jungle"), ground(32, 66, "jungle")],
        ledges: [
            ledge(10, 12, G - 0.5, "jungle", { oneWay: false, spring: 7.5 }),
            ledge(13, 17, G - 7, "jungle"),
        ],
        things: [{ kind: "crate", x: 40, y: G }],
        crew: [
            { x: 5, y: G, colour: "berry" },
            { x: 15, y: G - 7, colour: "sky" },
            { x: 40, y: G, colour: "tang", in: 0 },
            { x: 52, y: G, colour: "mint" },
        ],
        gates: [{ x: 46, y: G, need: 4 }],
        beacons: [{ x: 34, y: G }],
        ship: { x: 60, y: G },
        bridge: { x: 32, y: G, max: 14 },
        gadget: "gloves",
        preview: "short",
        rows: 3,
        pit: "swamp",
        variants: [
            [1, 2, 1, 2],
            [2, 1, 1, 2],
            [1, 1, 2, 2],
        ],
    },
    {
        title: "The lava planet",
        grades: [2, 3],
        goal: "Hop across the rocks before they sink into the lava. Spin the cracked wall down. The gate opens for 6 crew.",
        jumpWords: "A jump goes 4 squares. A rock that sinks into the lava takes Bolt with it.",
        planet: "lava",
        gravity: EARTH,
        w: 78,
        h: H,
        start: { x: 3, y: G },
        blocks: [ground(0, 14, "lava"), ground(34, 50, "lava"), ground(58, 78, "lava")],
        ledges: [
            ledge(17, 20, G, "lava", { move: { dx: 0, dy: 2.6, period: 3.6 } }),
            ledge(23, 26, G - 1, "lava", { move: { dx: 0, dy: 2.6, period: 3.6, phase: 0.67 } }),
            ledge(29, 32, G, "lava", { move: { dx: 0, dy: 2.6, period: 3.6, phase: 0.34 } }),
            ledge(61, 65, G - 3.5, "lava"),
        ],
        things: [{ kind: "wall", x: 44, y: G }],
        crew: [
            { x: 8, y: G, colour: "sky" },
            { x: 38, y: G, colour: "glow" },
            { x: 47, y: G, colour: "berry" },
            { x: 63, y: G - 3.5, colour: "mint" },
        ],
        gates: [{ x: 68, y: G, need: 6 }],
        beacons: [
            { x: 35, y: G },
            { x: 59, y: G },
        ],
        ship: { x: 73, y: G },
        preview: "short",
        rows: 4,
        pit: "lava",
        variants: [
            [1, 1, 5, 1],
            [2, 1, 5, 1],
            [1, 2, 5, 2],
        ],
    },
    {
        title: "The sand planet",
        grades: [2, 3],
        goal: "The dunes sink while you stand on them, so keep moving. Hover over the cracked tile to blast it open. Fill 2 rows of 5.",
        jumpWords: "A jump goes 4 squares, and the jets' blast breaks a cracked tile below.",
        planet: "sand",
        gravity: EARTH,
        w: 70,
        h: H,
        start: { x: 3, y: G },
        blocks: [
            ground(0, 16, "sand"),
            ground(30, 36, "sand"),
            ground(36, 38, "sand", G + 2.2),
            ground(38, 70, "sand"),
        ],
        ledges: [
            ledge(17, 22, G, "sand", { sinks: true, oneWay: false }),
            ledge(24, 29, G, "sand", { sinks: true, oneWay: false }),
            ledge(48, 52, G - 3.5, "sand"),
        ],
        things: [
            { kind: "tile", x: 37, y: G },
            { kind: "crate", x: 44, y: G },
        ],
        crew: [
            { x: 10, y: G, colour: "tang" },
            { x: 37, y: G + 2.2, colour: "sky" },
            { x: 44, y: G, colour: "mint", in: 1 },
            { x: 50, y: G - 3.5, colour: "berry" },
        ],
        gates: [{ x: 56, y: G, need: 6 }],
        beacons: [
            { x: 31, y: G },
            { x: 40, y: G },
        ],
        ship: { x: 64, y: G },
        preview: "short",
        batteries: 3,
        rows: 5,
        variants: [
            [2, 5, 1, 2],
            [1, 5, 2, 2],
            [2, 5, 2, 1],
        ],
    },
    {
        title: "The gas giant",
        grades: [2, 3],
        goal: "Ride the floating clouds. The last gap is too wide to hover: jump, then fire the rocket pack. Fill 3 rows of 4.",
        jumpWords: "A jump goes 4 squares, and the rocket pack throws Bolt a long way along.",
        planet: "gas",
        gravity: EARTH,
        w: 82,
        h: H,
        start: { x: 3, y: G },
        blocks: [ground(0, 12, "cloud"), ground(49, 82, "cloud")],
        ledges: [
            ledge(15, 19, G - 1, "cloud", { move: { dx: 0, dy: 1.2, period: 4 } }),
            ledge(23, 27, G - 2.5, "cloud", { move: { dx: 1.5, dy: 0, period: 5 } }),
            ledge(31, 35, G - 1, "cloud"),
            ledge(53, 56, G - 3.5, "cloud"),
            ledge(57, 61, G - 7, "cloud"),
        ],
        things: [],
        crew: [
            { x: 6, y: G, colour: "glow" },
            { x: 33, y: G - 1, colour: "berry" },
            { x: 59, y: G - 7, colour: "sky" },
            { x: 66, y: G, colour: "mint" },
            { x: 70, y: G, colour: "tang", asleep: true },
        ],
        gates: [{ x: 64, y: G, need: 5 }],
        beacons: [
            { x: 2, y: G },
            { x: 51, y: G },
        ],
        ship: { x: 77, y: G },
        gadget: "rocket",
        preview: "none",
        batteries: 3,
        rows: 4,
        variants: [
            [2, 2, 5, 1, 2],
            [1, 2, 5, 2, 2],
            [2, 1, 5, 2, 2],
        ],
    },
    {
        title: "The junkyard",
        grades: [3, 4],
        goal: "The pull here is so heavy a jump goes only 2 squares. Use the magnet to pull a metal block under a high ledge and climb up. Fill 4 rows of 3.",
        jumpWords: "Here a jump goes only 2 squares, half as high as on Earth.",
        planet: "junk",
        gravity: EARTH * 2,
        w: 72,
        h: H,
        start: { x: 2, y: G },
        blocks: [ground(0, 22, "junk"), ground(28, 72, "junk")],
        ledges: [ledge(5, 10, G - 3.4, "junk"), ledge(40, 44, G - 3.4, "junk")],
        things: [
            { kind: "metal", x: 16, y: G, rail: [3, 21] },
            { kind: "crate", x: 33, y: G },
            { kind: "metal", x: 52, y: G, rail: [30, 60] },
        ],
        crew: [
            { x: 7, y: G - 3.4, colour: "berry" },
            { x: 14, y: G, colour: "sky", asleep: true },
            { x: 33, y: G, colour: "tang", in: 1 },
            { x: 42, y: G - 3.4, colour: "mint" },
            { x: 47, y: G, colour: "glow" },
        ],
        gates: [{ x: 58, y: G, need: 8 }],
        beacons: [{ x: 29, y: G }],
        ship: { x: 66, y: G },
        gadget: "magnet",
        preview: "none",
        batteries: 3,
        rows: 3,
        variants: [
            [5, 1, 2, 2, 2],
            [5, 2, 1, 2, 2],
            [5, 2, 2, 1, 2],
        ],
    },
    {
        title: "The crystal cave",
        grades: [3, 4],
        goal: "Everything Bolt can do: spin a wall down, blast a tile open and hover over the gap. Fill 3 rows of 5.",
        jumpWords: "A jump goes 4 squares here, as on Earth.",
        planet: "crystal",
        gravity: EARTH,
        w: 86,
        h: H,
        start: { x: 3, y: G },
        blocks: [
            ground(0, 14, "crystal"),
            ground(20, 40, "crystal"),
            ground(40, 42, "crystal", G + 2.2),
            ground(42, 52, "crystal"),
            ground(60, 86, "crystal"),
        ],
        ledges: [ledge(45, 49, G - 3.5, "crystal")],
        things: [
            { kind: "wall", x: 26, y: G },
            { kind: "tile", x: 41, y: G },
            { kind: "rock", x: 34, y: G },
            { kind: "crate", x: 72, y: G },
        ],
        crew: [
            { x: 8, y: G, colour: "sky" },
            { x: 29, y: G, colour: "berry" },
            { x: 41, y: G + 2.2, colour: "glow" },
            { x: 47, y: G - 3.5, colour: "mint" },
            { x: 66, y: G, colour: "tang", asleep: true },
            { x: 72, y: G, colour: "sky", in: 3 },
        ],
        gates: [{ x: 76, y: G, need: 12 }],
        beacons: [
            { x: 21, y: G },
            { x: 61, y: G },
        ],
        ship: { x: 81, y: G },
        preview: "none",
        batteries: 3,
        rows: 5,
        variants: [
            [1, 5, 5, 2, 1, 1],
            [2, 5, 5, 1, 1, 1],
            [1, 5, 5, 1, 2, 1],
        ],
    },
    {
        title: "The playground planet",
        grades: [1, 4],
        goal: "A planet to play on. Find all ten crew. Every crew member you have ever flown home is counted.",
        jumpWords: "A jump goes 4 squares here, as on Earth.",
        planet: "moon",
        gravity: EARTH,
        w: 74,
        h: H,
        start: { x: 3, y: G },
        blocks: [ground(0, 22, "moon"), ground(28, 50, "moon"), ground(56, 74, "moon")],
        ledges: [
            ledge(8, 12, G - 3.5, "moon"),
            ledge(14, 18, G - 7, "moon"),
            ledge(34, 38, G - 3.5, "moon"),
            ledge(40, 44, G - 6.5, "moon"),
            ledge(20, 22, G - 0.5, "moon", { oneWay: false, spring: 8 }),
        ],
        things: [
            { kind: "crate", x: 31, y: G },
            { kind: "crate", x: 46, y: G },
            { kind: "rock", x: 60, y: G },
        ],
        crew: [
            { x: 6, y: G, colour: "sky" },
            { x: 10, y: G - 3.5, colour: "mint" },
            { x: 16, y: G - 7, colour: "berry", asleep: true },
            { x: 31, y: G, colour: "tang", in: 0 },
            { x: 36, y: G - 3.5, colour: "glow" },
            { x: 42, y: G - 6.5, colour: "sky" },
            { x: 46, y: G, colour: "mint", in: 1 },
            { x: 58, y: G, colour: "berry" },
            { x: 63, y: G, colour: "tang", asleep: true },
            { x: 67.6, y: G, colour: "glow" },
        ],
        gates: [],
        beacons: [
            { x: 29, y: G },
            { x: 57, y: G },
        ],
        ship: { x: 70, y: G },
        preview: "full",
        rows: 5,
        variants: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 2, 1, 1, 2, 1, 1, 2, 1, 1],
        ],
        free: true,
    },
];

/** The level a phase names, or the first. */
export const levelOf = (phase: number): BoltLevel => BOLT_LEVELS[phase] ?? BOLT_LEVELS[0];

export const valuesOf = (L: BoltLevel, variant: number): number[] => {
    const n = L.variants.length;
    return [...(L.variants[((variant % n) + n) % n] ?? L.variants[0] ?? [])];
};

type Act = "stand" | "run" | "rise" | "hover" | "spin" | "cheer";

const ACTS: Record<Act, Cycle> = {
    stand: { poses: ["stand"] },
    run: { poses: ["run", "stride"], per: 0.5 },
    rise: { poses: ["jump"] },
    hover: { poses: ["hover"] },
    spin: { poses: ["spin"] },
    cheer: { poses: ["cheer", "jump"], every: 0.4 },
};

export interface Mate {
    state: "hidden" | "asleep" | "waiting" | "following" | "aboard";
    x: number;
    y: number;
    /** Seconds since it woke or was found, for its little hop. */
    since: number;
}

export interface Piece {
    x: number;
    y: number;
    vx: number;
    vy: number;
    turn: number;
    spin: number;
    age: number;
}

export interface Held {
    gone: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    turn: number;
    /** Seconds the jets have blasted it, for a tile. */
    blast: number;
}

export interface BoltState {
    phase: number;
    L: BoltLevel;
    variant: number;
    values: number[];
    need: number;
    r: Runner;
    act: Actor<Act>;
    jets: Jets;
    steps: number;
    mates: Mate[];
    /** The order the crew climbed aboard, by their place in the list. */
    aboard: number[];
    /** Bolt's feet over the last few seconds, x then y, oldest first, for the line of crew to follow. */
    trail: number[];
    held: Held[];
    pieces: Piece[];
    /** Seconds left of a spin, and whether this time in the air has had its spin's lift. */
    spin: number;
    spunAir: boolean;
    /** Set by a command between steps: spin, or use the gadget, on the next step. */
    wantSpin: boolean;
    wantGadget: boolean;
    /** How far the plank is pulled out, and where Bolt was when the gloves took the handle. */
    plank: number;
    grab: { from: number; plank: number } | null;
    magnet: boolean;
    /** Seconds left of a rocket burst, and whether this time in the air has had it. */
    boost: number;
    boosted: boolean;
    springing: boolean;
    brake: boolean;
    /** How far each sinking ledge has sunk. */
    sunk: number[];
    sprung: number[];
    flag: number;
    batteries: number | null;
    splash: number;
    /** A gate or the ship it has been told about, so a note is said once a visit. */
    told: string;
    above: boolean;
    touchFrom: number;
    boardWait: number;
    cam: Cam;
    goal: Track;
    end: "won" | "out" | null;
    /** Seconds since the ship's door shut on the last crew member. */
    launch: number;
    said: string;
    /** Crew flown home on earlier visits to the free planet. */
    kept: number;
}

export function startBolt(phase: number, variant = 0): BoltState {
    const L = levelOf(phase);
    const values = valuesOf(L, variant);
    const r = runner(L.start.x, L.start.y);
    return {
        phase,
        L,
        variant,
        values,
        need: values.reduce((a, b) => a + b, 0),
        r,
        act: actor<Act>("stand", "stand"),
        jets: jets(SPEC()),
        steps: 0,
        mates: L.crew.map((c) => ({
            state: c.in !== undefined ? "hidden" : c.asleep ? "asleep" : "waiting",
            x: c.x,
            y: c.y,
            since: 9,
        })),
        aboard: [],
        trail: [r.x, r.y],
        held: L.things.map((t) => ({
            gone: false,
            x: t.x,
            y: t.y,
            vx: 0,
            vy: 0,
            turn: 0,
            blast: 0,
        })),
        pieces: [],
        spin: 0,
        spunAir: false,
        wantSpin: false,
        wantGadget: false,
        plank: 0,
        grab: null,
        magnet: false,
        boost: 0,
        boosted: false,
        springing: false,
        brake: false,
        sunk: L.ledges.map(() => 0),
        sprung: L.ledges.map(() => 99),
        flag: -1,
        batteries: L.batteries ?? null,
        splash: 0,
        told: "",
        above: false,
        touchFrom: -1,
        boardWait: 0,
        cam: { x: L.start.x + 8, y: L.start.y - 6, zoom: 1 },
        goal: track({ on: "crew", times: L.crew.length }),
        end: null,
        launch: 0,
        said: L.goal,
        kept: 0,
    };
}

/** Where a thing is solid now, or null once it has gone. */
export function thingBlock(t: Thing, h: Held): Block | null {
    if (h.gone) return null;
    if (t.kind === "crate" || t.kind === "rock")
        return { x0: h.x - 0.8, x1: h.x + 0.8, y0: h.y - 1.6, y1: h.y };
    if (t.kind === "metal") return { x0: h.x - 1, x1: h.x + 1, y0: h.y - 1.6, y1: h.y };
    if (t.kind === "wall") return { x0: t.x - 0.5, x1: t.x + 0.5, y0: t.y - 4.5, y1: t.y };
    return { x0: t.x - 1, x1: t.x + 1, y0: t.y, y1: t.y + 1 };
}

/** A shut gate, as solid as a wall and taller than any jump. */
const gateBlock = (g: Gate): Block => ({ x0: g.x - 0.5, x1: g.x + 0.5, y0: g.y - 6, y1: g.y });

export const rescued = (s: BoltState): number =>
    s.mates.reduce(
        (n, m, k) => n + (m.state === "following" || m.state === "aboard" ? (s.values[k] ?? 0) : 0),
        0,
    );

// at the ship one short, say where the rest are, since a crate gives no other sign of a robot inside
function whereWords(s: BoltState): string {
    const shut = s.mates.filter((m) => m.state === "hidden").length,
        sleeping = s.mates.filter((m) => m.state === "asleep").length;
    if (shut)
        return shut === 1
            ? " One is waiting in a crate. Spin next to it to let it out."
            : ` ${shut} are waiting in crates. Spin next to each one to let them out.`;
    if (sleeping)
        return sleeping === 1
            ? " One is asleep. Spin next to it to wake it."
            : ` ${sleeping} are asleep. Spin next to each one to wake them.`;
    return "";
}

const seated = (s: BoltState): number => s.aboard.reduce((n, k) => n + (s.values[k] ?? 0), 0);

const ledgesNow = (s: BoltState): BoltLedge[] => {
    const t = s.steps * DT;
    // a ledge rising is held where it was a step ago, so feet falling onto it are not passed through
    const out = s.L.ledges.map((l, k) => {
        const rise = l.move ? Math.max(0, ledgeAt(l, t - DT).y - ledgeAt(l, t).y) : 0;
        return { ...l, y: l.y + (s.sunk[k] ?? 0) + rise };
    });
    const b = s.L.bridge;
    if (b && s.plank > 0.2)
        out.push({ x0: b.x - s.plank, x1: b.x, y: b.y, look: "metal", oneWay: false });
    return out;
};

const placeOf = (s: BoltState, skip = -1): { place: Place; more: Block[] } => {
    const more: Block[] = [];
    s.L.things.forEach((t, k) => {
        if (k === skip) return;
        const b = thingBlock(
            t,
            s.held[k] ?? { gone: true, x: 0, y: 0, vx: 0, vy: 0, turn: 0, blast: 0 },
        );
        if (b) more.push(b);
    });
    const open = rescued(s);
    for (const g of s.L.gates) if (open < g.need) more.push(gateBlock(g));
    return { place: { ledges: ledgesNow(s), blocks: s.L.blocks, ladders: [] }, more };
};

export function courseOf(s: BoltState, skip = -1): Course {
    const { place, more } = placeOf(s, skip);
    return course(place, s.steps * DT, more);
}

const pan = (s: BoltState, x: number): number => panOf(x, s.cam.x, VIEW.w);

function cue(
    s: BoltState,
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
        | "crash"
        | "creak",
    strength = 0.6,
    pitch = 1,
    x = s.r.x,
): void {
    out.push({ cue: c, strength, pitch, pan: pan(s, x) });
}

const emit = (s: BoltState, out: Happening[], event: GameEvent): void => {
    feed(s.goal, event);
    out.push({ event });
};

/** The middle of Bolt's body. */
const body = (s: BoltState): Pt => ({ x: s.r.x, y: s.r.y - 0.9 });

/** What a tap on the field at `p` means: a spin on Bolt, the gadget on what it works on, or a hop. */
export function tapMeans(s: BoltState, p: Pt): "spin" | "gadget" | "hop" {
    const b = body(s);
    if (Math.hypot(p.x - b.x, p.y - b.y) < 1.4) return "spin";
    const L = s.L;
    if (L.gadget === "gloves" && L.bridge) {
        const hx = L.bridge.x - s.plank;
        if (Math.hypot(p.x - hx, p.y - (L.bridge.y - 0.3)) < 1.4) return "gadget";
    }
    if (L.gadget === "magnet")
        for (const [k, t] of L.things.entries()) {
            const h = s.held[k];
            if (
                t.kind === "metal" &&
                h &&
                Math.abs(p.x - h.x) < 1.3 &&
                p.y > h.y - 2 &&
                p.y < h.y + 0.4
            )
                return "gadget";
        }
    return "hop";
}

/** The intent the pad gives: the keys, the buttons, or a finger on the field. */
export function intentOf(s: BoltState, pad: Pad): Intent {
    const r = s.r;
    let run: -1 | 0 | 1 = pad.holding.includes("right")
        ? pad.holding.includes("left") && pad.held === "left"
            ? -1
            : 1
        : pad.holding.includes("left")
          ? -1
          : 0;
    let jump = pad.go || pad.holding.includes("up");
    let jumped = pad.tapped || pad.pressed.includes("up");
    if (pad.pressed.includes("down")) s.wantSpin = true;
    const t = pad.touch;
    if (t) {
        if (s.touchFrom < 0) s.touchFrom = s.steps;
        const dx = t.x - r.x,
            dy = t.y - (r.y - 0.9);
        if (Math.abs(dx) > 0.6) run = dx > 0 ? 1 : -1;
        // a finger held still above Bolt keeps the jump going, and so the jets
        const up = dy < -2.2 || (s.above && !grounded(r) && dy < 0);
        if (up) {
            jump = true;
            if (!s.above) jumped = true;
        }
        s.above = up;
    } else {
        // a quick tap is a hop, a spin on Bolt, or the gadget on what it works on
        if (pad.lifted && s.touchFrom >= 0 && s.steps - s.touchFrom < RATE * 0.25) {
            const means = tapMeans(s, pad.lifted);
            if (means === "spin") s.wantSpin = true;
            else if (means === "gadget") s.wantGadget = true;
            else jumped = jump = true;
        }
        s.touchFrom = -1;
        s.above = false;
    }
    return { run, jump, jumped };
}

/** Whether the floor under Bolt's feet is ice. */
function onIce(s: BoltState): boolean {
    const r = s.r;
    if (!grounded(r)) return false;
    return (
        s.L.blocks.some(
            (b) =>
                b.look === "ice" &&
                r.x >= b.x0 - 0.3 &&
                r.x <= b.x1 + 0.3 &&
                Math.abs(b.y0 - r.y) < 0.05,
        ) ||
        s.L.ledges.some(
            (l) =>
                l.look === "ice" &&
                r.x >= l.x0 - 0.3 &&
                r.x <= l.x1 + 0.3 &&
                Math.abs(l.y - r.y) < 0.05,
        )
    );
}

/** The moves for this step: the planet's, slippery on ice, a burst of the rocket, the jets' hover. */
function movesNow(s: BoltState): Moves {
    let m = movesOn(s.L);
    if (onIce(s)) m = { ...m, accel: 16 };
    if (s.jets.on) m = hoverMoves(m, s.r, SPEC(), DT);
    if (s.boost > 0) m = { ...m, speed: BOLT.boost.value, airAccel: 400, accel: 400 };
    return m;
}

function useGadget(s: BoltState, out: Happening[]): void {
    const L = s.L,
        r = s.r;
    if (L.gadget === "gloves" && L.bridge) {
        if (s.grab) {
            s.grab = null;
            cue(s, out, "back", 0.4);
            s.said = `The gloves let go. The plank is out ${Math.round(s.plank)} of ${L.bridge.max} squares.`;
            return;
        }
        const hx = L.bridge.x - s.plank;
        if (
            grounded(r) &&
            r.x < hx &&
            hx - r.x <= BOLT.reach.value &&
            Math.abs(L.bridge.y - r.y) < 3
        ) {
            s.grab = { from: r.x, plank: s.plank };
            cue(s, out, "lift", 0.5, 1.3, hx);
            s.said = "The gloves have the handle. Walk back to pull the plank out.";
        } else {
            cue(s, out, "nope", 0.3);
            s.said = "The handle is out of the gloves' reach. Stand on the near side, facing it.";
        }
        return;
    }
    if (L.gadget === "magnet") {
        s.magnet = !s.magnet;
        cue(s, out, s.magnet ? "lift" : "back", 0.45);
        s.said = s.magnet
            ? "The magnet is on: a metal block nearby slides towards Bolt."
            : "The magnet is off.";
        return;
    }
    if (L.gadget === "rocket") {
        if (s.boosted) {
            cue(s, out, "nope", 0.3);
            s.said = "The rocket pack fires once each jump. Land to fill it again.";
            return;
        }
        s.boost = 0.42;
        s.boosted = true;
        r.vy = Math.min(r.vy, -5);
        r.state = "rise";
        r.air = movesOn(L).coyote;
        cue(s, out, "creak", 0.7, 1.4);
        out.push({
            burst: {
                kind: "dust",
                x: r.x - r.facing,
                y: r.y - 0.6,
                n: 6,
                dir: r.facing > 0 ? -Math.PI / 2 : Math.PI / 2,
            },
        });
        s.said = "Whoosh: the rocket pack fires.";
        return;
    }
    cue(s, out, "nope", 0.25);
}

function startSpin(s: BoltState, out: Happening[]): void {
    if (s.spin > 0) return;
    s.spin = BOLT.spin.value;
    const r = s.r;
    if (!grounded(r) && !s.spunAir) {
        // a spin in the air gives one little lift, as a twirl does
        s.spunAir = true;
        r.vy = Math.min(r.vy, -4.5);
        if (r.state === "fall") r.state = "rise";
    }
    cue(s, out, "back", 0.4, 1.6);
}

function breakThing(s: BoltState, out: Happening[], k: number): void {
    const t = s.L.things[k],
        h = s.held[k];
    if (!t || !h || h.gone) return;
    h.gone = true;
    const cx = t.kind === "tile" ? t.x : h.x,
        cy = t.kind === "tile" ? t.y + 0.5 : t.kind === "wall" ? t.y - 2 : h.y - 0.8;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        s.pieces.push({
            x: cx + Math.cos(a) * 0.4,
            y: cy + Math.sin(a) * 0.4,
            vx: Math.cos(a) * 4 + s.r.facing * 1.5,
            vy: -5 - (i % 3) * 1.5,
            turn: a,
            spin: (i % 2 ? 1 : -1) * (6 + i),
            age: 0,
        });
    }
    cue(s, out, "crash", 0.7, t.kind === "tile" ? 1.2 : 1, cx);
    out.push({ burst: { kind: "dust", x: cx, y: cy, n: 8 } });
    out.push({ shake: 0.15 });
    s.L.crew.forEach((c, i) => {
        const m = s.mates[i];
        if (c.in === k && m && m.state === "hidden") {
            m.state = "waiting";
            m.since = 0;
            s.said = `A crew robot was in the crate! It counts for ${s.values[i] ?? 1}.`;
            cue(s, out, "ring", 0.6, 1.5, c.x);
        }
    });
    if (t.kind === "wall") s.said = "The cracked wall comes down.";
    if (t.kind === "tile") s.said = "The jets blast the cracked tile open.";
}

function spinHits(s: BoltState, out: Happening[]): void {
    const b = body(s);
    s.L.things.forEach((t, k) => {
        const h = s.held[k];
        if (!h || h.gone) return;
        if (t.kind === "crate" || t.kind === "wall") {
            const box = thingBlock(t, h);
            if (!box) return;
            const dx = Math.max(box.x0 - b.x, 0, b.x - box.x1),
                dy = Math.max(box.y0 - b.y, 0, b.y - box.y1);
            if (Math.hypot(dx, dy) < 1.3) breakThing(s, out, k);
        } else if (t.kind === "rock") {
            if (
                Math.abs(h.x - b.x) < 1.9 &&
                Math.abs(h.y - 0.8 - b.y) < 1.6 &&
                Math.abs(h.vx) < 1
            ) {
                h.vx = (h.x >= b.x ? 1 : -1) * 9;
                h.vy = -3;
                cue(s, out, "bump", 0.6, 0.8, h.x);
                s.said = "The boulder rolls away.";
            }
        }
    });
    s.L.crew.forEach((c, i) => {
        const m = s.mates[i];
        if (m?.state === "asleep" && Math.abs(m.x - b.x) < 2.2 && Math.abs(m.y - 0.6 - b.y) < 1.8) {
            m.state = "waiting";
            m.since = 0;
            cue(s, out, "ring", 0.5, 1.8, c.x);
            s.said = "The sleeping robot wakes up.";
        }
    });
}

/** Boulders roll and fall, metal blocks slide to the magnet, cracked tiles give way under the jets. */
function stepThings(s: BoltState, out: Happening[], m: Moves): void {
    const r = s.r;
    s.L.things.forEach((t, k) => {
        const h = s.held[k];
        if (!h || h.gone) return;
        if (t.kind === "rock" && (Math.abs(h.vx) > 0.01 || Math.abs(h.vy) > 0.01)) {
            const c = courseOf(s, k);
            h.vy = Math.min(24, h.vy + m.gravity * DT);
            const nx = h.x + h.vx * DT;
            if (c.solid?.(nx + Math.sign(h.vx) * 0.85, h.y - 0.8)) h.vx = -h.vx * 0.3;
            else h.x = nx;
            const ny = h.y + h.vy * DT,
                f = h.vy >= 0 ? c.floor(h.x, h.y - 1e-6, ny) : null;
            if (f) {
                h.y = f.y;
                h.vy = 0;
                h.vx *= Math.exp(-1.8 * DT);
                if (Math.abs(h.vx) < 0.3) h.vx = 0;
            } else h.y = ny;
            h.turn += (h.vx * DT) / 0.8;
            if (h.y > s.L.h + 3) {
                h.gone = true;
                out.push({ burst: { kind: "dust", x: h.x, y: s.L.h, n: 6 } });
            }
        }
        if (t.kind === "metal" && s.magnet && t.rail) {
            const near = Math.abs(h.x - r.x) < 12 && Math.abs(h.y - r.y) < 2.5;
            const onTop =
                grounded(r) && Math.abs(r.y - (h.y - 1.6)) < 0.05 && Math.abs(r.x - h.x) < 1.3;
            if (near && !onTop) {
                const want = r.x + (h.x >= r.x ? 1.9 : -1.9),
                    step = BOLT.magnet.value * DT,
                    to = Math.max(
                        t.rail[0],
                        Math.min(t.rail[1], h.x + Math.max(-step, Math.min(step, want - h.x))),
                    );
                const c = courseOf(s, k);
                const lead = to > h.x ? 1.05 : -1.05;
                if (Math.abs(to - h.x) > 1e-4 && !c.solid?.(to + lead, h.y - 0.8)) {
                    h.x = to;
                    if (s.steps % 8 === 0) cue(s, out, "creak", 0.2, 1.6, h.x);
                }
            }
        }
        if (
            t.kind === "tile" &&
            s.jets.on &&
            Math.abs(t.x - r.x) < 1.3 &&
            t.y - r.y > -0.1 &&
            t.y - r.y < 4.5
        ) {
            h.blast += DT;
            if (h.blast >= 0.3) breakThing(s, out, k);
        }
    });
    for (const p of s.pieces) {
        p.vy += 30 * DT;
        p.x += p.vx * DT;
        p.y += p.vy * DT;
        p.turn += p.spin * DT;
        p.age += DT;
    }
    s.pieces = s.pieces.filter((p) => p.age < 1.2);
}

/** Crew that have been found follow Bolt's footsteps, each this many footprints further back, a footprint every tenth of a square, so a line that stops keeps its spacing. */
const SPACING = 13;
const STRIDE = 0.1;
const TRAIL = 2 * SPACING * 12;

function stepCrew(s: BoltState, out: Happening[]): void {
    const r = s.r,
        L = s.L;
    if (!s.end && s.splash <= 0) {
        const lx = s.trail[s.trail.length - 2] ?? r.x,
            ly = s.trail[s.trail.length - 1] ?? r.y;
        if (Math.hypot(r.x - lx, r.y - ly) >= STRIDE) s.trail.push(r.x, r.y);
        if (s.trail.length > TRAIL) s.trail.splice(0, s.trail.length - TRAIL);
    }
    let behind = 0;
    s.mates.forEach((m, i) => {
        m.since += DT;
        const c = L.crew[i];
        if (!c) return;
        if (
            m.state === "waiting" &&
            Math.abs(m.x - r.x) < 1.2 &&
            r.y > m.y - 1 &&
            r.y < m.y + 0.5
        ) {
            m.state = "following";
            m.since = 0;
            const v = s.values[i] ?? 1;
            cue(s, out, "ring", 0.6, semitones(Math.min(12, rescued(s) * 2)), m.x);
            out.push({ burst: { kind: "sparkle", x: m.x, y: m.y - 1, n: 6 } });
            s.said = `Found one, counting for ${v}! That makes ${rescued(s)} of ${s.need} crew.`;
        }
        if (m.state === "following") {
            behind++;
            const back = Math.max(0, s.trail.length - 2 * behind * SPACING);
            m.x = s.trail[back] ?? m.x;
            m.y = s.trail[back + 1] ?? m.y;
        }
    });
    // at the ship the crew climb aboard one at a time
    const at = Math.abs(r.x - L.ship.x) < 3.5 && Math.abs(r.y - L.ship.y) < 0.6 && grounded(r);
    if (at && !s.end) {
        s.boardWait -= DT;
        const next = s.mates.findIndex((m) => m.state === "following");
        if (next >= 0 && s.boardWait <= 0) {
            const m = s.mates[next];
            if (m) {
                m.state = "aboard";
                m.since = 0;
                s.aboard.push(next);
                s.boardWait = 0.22;
                emit(s, out, { kind: "crew" });
                cue(s, out, "level", 0.5, semitones(Math.min(12, s.aboard.length)), L.ship.x);
                const now = seated(s),
                    climbing = s.mates.some((o) => o.state === "following");
                s.said =
                    now >= s.need
                        ? `${now} aboard: ${rowWords(s.need, L.rows)}. Lift off!`
                        : climbing
                          ? `${sumWords(s)} = ${now} aboard.`
                          : `${sumWords(s)} = ${now} aboard. ${s.need - now} more to find.`;
            }
        } else if (next < 0 && seated(s) < s.need && s.told !== "ship") {
            s.told = "ship";
            cue(s, out, "nope", 0.3, 1, L.ship.x);
            s.said = `The ship needs ${s.need} crew. ${seated(s)} aboard: ${s.need - seated(s)} more to find.${whereWords(s)}`;
        }
    } else if (s.told === "ship") s.told = "";
}

/** The crew aboard as a sum, in the order they climbed on: "2 + 1 + 5". */
const sumWords = (s: BoltState): string =>
    s.aboard.map((k) => String(s.values[k] ?? 0)).join(" + ") || "0";

/** A count as rows of seats: "3 rows of 4", or the rows and what is left over. */
export const rowWords = (n: number, per: number): string => {
    const full = Math.floor(n / per),
        left = n % per;
    const rows = full === 1 ? `1 row of ${per}` : `${full} rows of ${per}`;
    if (full === 0) return `${left} in a row`;
    return left ? `${rows} and ${left} more` : rows;
};

function gates(s: BoltState, out: Happening[]): void {
    const r = s.r,
        open = rescued(s);
    s.L.gates.forEach((g, k) => {
        const near = Math.abs(g.x - r.x) < 1.4 && Math.abs(g.y - r.y) < 3;
        const id = `gate${k}`;
        if (!near) {
            if (s.told === id && Math.abs(g.x - r.x) > 3) s.told = "";
            return;
        }
        if (s.told === id) return;
        s.told = id;
        if (open >= g.need) {
            cue(s, out, "level", 0.5, 1.2, g.x);
            s.said = `The gate opens for ${g.need} crew.`;
        } else {
            cue(s, out, "nope", 0.35, 1, g.x);
            s.said = `This gate opens for ${g.need} crew. You have ${open}: rescue ${g.need - open} more.`;
        }
    });
}

function beacons(s: BoltState, out: Happening[]): void {
    const r = s.r;
    s.L.beacons.forEach((b, k) => {
        if (k <= s.flag) return;
        if (r.x >= b.x && Math.abs(r.y - b.y) < 3 && grounded(r)) {
            s.flag = k;
            emit(s, out, { kind: "checkpoint" });
            cue(s, out, "ring", 0.4, 1.5, b.x);
            out.push({ burst: { kind: "sparkle", x: b.x, y: b.y - 3, n: 6 } });
        }
    });
}

/** A fall into a pit or the lava, or a dune that has swallowed Bolt: back to the beacon, for a battery where they count. */
function fall(s: BoltState, out: Happening[], words: string): void {
    s.splash = 0.55;
    s.grab = null;
    s.magnet = false;
    cue(s, out, "splash", 0.6);
    out.push({
        burst: { kind: s.L.pit === "lava" ? "dust" : "splash", x: s.r.x, y: s.L.h - 1.5, n: 10 },
    });
    if (s.batteries !== null) {
        s.batteries = Math.max(0, s.batteries - 1);
        s.said =
            s.batteries > 0
                ? `${words} ${s.batteries} batter${s.batteries === 1 ? "y" : "ies"} left.`
                : `${words} That was the last battery.`;
    } else s.said = `${words} Back to the beacon in a moment.`;
}

export function stepBolt(s: BoltState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    const L = s.L,
        r = s.r;
    s.steps++;
    for (let i = 0; i < s.sprung.length; i++) s.sprung[i] = (s.sprung[i] ?? 99) + DT;
    if (s.end) {
        s.launch += DT;
        stepActor(s.act, "cheer", ACTS, DT, r.stride, r.facing);
        frameCamera(s);
        return out;
    }
    if (s.splash > 0) {
        s.splash -= DT;
        if (s.splash <= 0) {
            if (s.batteries === 0) {
                s.end = "out";
                s.said = `Out of batteries with ${seated(s)} of ${s.need} crew aboard. Another go?`;
                return out;
            }
            const back = L.beacons[s.flag] ?? L.start;
            Object.assign(r, runner(back.x, back.y, 1));
            s.jets = jets(SPEC());
            s.trail = [back.x, back.y];
            s.sunk = s.sunk.map(() => 0);
            for (const m of s.mates)
                if (m.state === "following") {
                    m.x = back.x;
                    m.y = back.y;
                }
            out.push({ puff: { x: back.x, y: back.y - 1, n: 6 } });
            cue(s, out, "back", 0.4);
        }
        frameCamera(s);
        return out;
    }
    const brake = pad.brake;
    if (brake && !s.brake) s.wantGadget = true;
    s.brake = brake;
    const i = intentOf(s, pad);
    if (s.wantGadget) {
        s.wantGadget = false;
        useGadget(s, out);
    }
    if (s.wantSpin) {
        s.wantSpin = false;
        startSpin(s, out);
    }
    // a spring throws Bolt its whole height whether the jump is held or not
    if (s.springing && r.vy < 0) i.jump = true;
    else s.springing = false;
    if (s.boost > 0) {
        i.run = r.facing;
        s.boost = Math.max(0, s.boost - DT);
    }
    const lit = stepJets(s.jets, r, i.jump && s.boost <= 0, SPEC(), DT);
    if (lit === "lit") cue(s, out, "creak", 0.35, 2);
    const m = movesNow(s),
        before = r.vy;
    const ran = stepRunner(r, i, courseOf(s), m, DT);
    for (const e of ran) {
        if (e === "jumped") {
            cue(s, out, "lift", 0.45, semitones(Math.round((m.jump - 4) * 2)));
            out.push({ puff: { x: r.x, y: r.y, n: 3 } });
        }
        if (e === "landed") {
            land(s.act, Math.max(0, before));
            s.spunAir = false;
            s.boosted = false;
            if (before > 6) {
                cue(s, out, "bump", Math.min(0.6, before / 30), 1.2);
                out.push({ puff: { x: r.x, y: r.y, n: before > 12 ? 4 : 2 } });
            }
            const on = standingOn(
                { ledges: ledgesNow(s), blocks: [], ladders: [] },
                r.x,
                r.y,
                s.steps * DT,
            );
            const l = L.ledges[on];
            if (l?.spring) {
                r.vy = springSpeed(l.spring, m.gravity);
                r.state = "rise";
                r.air = m.coyote;
                s.sprung[on] = 0;
                s.springing = true;
                cue(s, out, "lift", 0.6, 1.6);
            }
        }
        if (e === "bumped") cue(s, out, "bump", 0.3, 0.9);
    }
    if (s.spin > 0) {
        spinHits(s, out);
        s.spin = Math.max(0, s.spin - DT);
    }
    // the gloves pull the plank out as Bolt walks back from where they took the handle
    const b = L.bridge;
    if (s.grab && b) {
        if (!grounded(r)) {
            s.grab = null;
            s.said = "The gloves let go as Bolt jumps.";
        } else {
            const want = s.grab.plank + (s.grab.from - r.x) * BOLT.leverage.value;
            const next = Math.max(s.plank, Math.min(b.max, want));
            if (next > s.plank + 0.4 || (next >= b.max && s.plank < b.max)) {
                cue(s, out, "creak", 0.25, 1.2 + next / b.max, b.x - next);
            }
            s.plank = next;
            if (b.x - s.plank - r.x < 0.8) {
                s.grab = null;
                s.said = "The plank is right up to Bolt.";
            }
        }
    }
    sinkDunes(s, out);
    stepThings(s, out, m);
    stepCrew(s, out);
    gates(s, out);
    beacons(s, out);
    const deep = L.pit === "lava" ? L.h - 1.8 : L.h + 1;
    if (r.y > deep) fall(s, out, L.pit === "lava" ? "Too hot!" : "Bolt fell.");
    if (!s.end && s.aboard.length && seated(s) >= s.need) {
        s.end = "won";
        s.launch = 0;
        emit(s, out, { kind: "home" });
        cue(s, out, "win", 0.8);
        out.push({ burst: { kind: "sparkle", x: L.ship.x, y: L.ship.y - 5, n: 16 } });
        s.said = `All ${s.need} crew aboard: ${rowWords(s.need, L.rows)}. Lift off!`;
    }
    const act: Act =
        s.spin > 0
            ? "spin"
            : s.jets.on
              ? "hover"
              : r.state === "rise" || r.state === "fall"
                ? "rise"
                : r.state === "run"
                  ? "run"
                  : "stand";
    stepActor(s.act, act, ACTS, DT, r.stride, r.facing);
    frameCamera(s);
    return out;
}

function sinkDunes(s: BoltState, out: Happening[]): void {
    const r = s.r;
    const on = grounded(r)
        ? standingOn({ ledges: ledgesNow(s), blocks: [], ladders: [] }, r.x, r.y, s.steps * DT)
        : -1;
    s.L.ledges.forEach((l, k) => {
        if (!l.sinks) return;
        const now = s.sunk[k] ?? 0;
        s.sunk[k] = on === k ? now + 1.1 * DT : Math.max(0, now - 0.8 * DT);
        if (on === k && (s.sunk[k] ?? 0) >= 2.2) fall(s, out, "The dune swallowed Bolt.");
    });
}

/** The camera leads the way Bolt runs and keeps still through a hop, moving up or down only when Bolt leaves the middle of the view. */
function frameCamera(s: BoltState): void {
    const r = s.r,
        L = s.L;
    const at = r.y - 3;
    let ty = s.cam.y;
    if (at < ty - 2) ty = at + 2;
    if (at > ty + 2.5) ty = at - 2.5;
    const want = s.end
        ? { x: L.ship.x, y: L.ship.y - 8, zoom: 1 }
        : { x: r.x + Math.max(-4, Math.min(4, r.vx * 0.55)) + r.facing * 2, y: ty, zoom: 1 };
    s.cam = follow(s.cam, want, {
        rate: 4,
        dt: DT,
        view: VIEW,
        world: { w: L.w, h: L.h },
    });
}

/** Where a full jump from where Bolt stands would take it, at the speed it has, as dots until it comes down. */
export function arcOf(s: BoltState): Pt[] {
    const copy = structuredClone(s.r),
        m = movesOn(s.L),
        c = courseOf(s),
        pts: Pt[] = [];
    const dir: -1 | 0 | 1 = Math.abs(copy.vx) > 0.5 ? (copy.vx > 0 ? 1 : -1) : 0;
    const most = s.L.preview === "short" ? RATE * 0.35 : RATE * 2;
    stepRunner(copy, { run: dir, jump: true, jumped: true }, c, m, DT);
    for (let n = 1; n < most; n++) {
        const ran = stepRunner(copy, { run: dir, jump: true, jumped: false }, c, m, DT);
        if (n % 4 === 0) pts.push({ x: copy.x, y: copy.y - 0.9 });
        if (ran.includes("landed") || copy.y > s.L.h) break;
    }
    return pts;
}

const SKY: Record<Planet, { far: string; near?: string }> = {
    moon: { far: "earth", near: "stars" },
    ice: { far: "small", near: "stars" },
    jungle: { far: "ringed" },
    lava: { far: "giant" },
    sand: { far: "ringed", near: "stars" },
    gas: { far: "giant", near: "small" },
    junk: { far: "small" },
    crystal: { far: "ringed", near: "stars" },
};

const PIT_HUE: Record<"lava" | "water" | "swamp", Hue> = {
    lava: "tang",
    water: "sky",
    swamp: "mint",
};

function backdrop(s: BoltState, sprites: Sprite[]): void {
    const L = s.L,
        eye: Eye = { cam: s.cam, view: { w: 72, h: VIEW.h } },
        look = SKY[L.planet];
    sprites.push(
        ...row(
            {
                key: "planets",
                depth: 0.1,
                base: G - 9,
                every: 40,
                stray: 6,
                z: 0,
                alpha: 0.55,
                things: [{ art: "skyplanet", params: { kind: look.far }, size: 7, often: 1 }],
            },
            eye,
            7,
        ),
    );
    if (look.near)
        sprites.push(
            ...row(
                {
                    key: "sky",
                    depth: 0.25,
                    base: G - 11,
                    every: 18,
                    stray: 5,
                    z: 0.5,
                    gaps: 0.3,
                    alpha: 0.5,
                    things: [
                        {
                            art: "skyplanet",
                            params: { kind: look.near },
                            size: look.near === "stars" ? 6 : 3,
                            often: 1,
                        },
                    ],
                },
                eye,
                13,
            ),
        );
}

/** A long ground or ledge is drawn in lengths, since one drawing as wide as a world is too big to draw at once. */
function lengths(
    key: string,
    x0: number,
    x1: number,
    y: number,
    look: Look,
    deep: number,
    z: number,
    still: boolean,
): Sprite[] {
    const out: Sprite[] = [];
    // laid from the right-hand end, so a plank growing out to the left keeps its pieces
    for (let n = 0, end = x1; end > x0 + 1e-6; n++, end -= 12) {
        const w = Math.min(12, end - x0),
            x = end - w;
        out.push({
            key: `${key}:${n}`,
            art: "planetground",
            params: { kind: look, w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(deep)) },
            x: x + w / 2,
            y: y + deep / 2,
            size: w,
            z,
            ...(still ? { still: true } : {}),
        });
    }
    return out;
}

const GEAR: Record<Gadget, string> = { gloves: "gloves", rocket: "rocket", magnet: "magnet" };

function boltSprites(s: BoltState, rest: boolean): Sprite[] {
    const r = s.r;
    if (s.splash > 0) return [];
    const gear = s.L.gadget ? GEAR[s.L.gadget] : "none";
    const dress = (pose: string, facing: 1 | -1): Sprite => ({
        key: "bolt",
        art: "boltbot",
        params: { pose, gear },
        x: r.x,
        y: r.y,
        size: 1.3,
        stand: true,
        z: 9,
        ...(facing < 0 ? { flip: true } : {}),
        ...(s.spin > 0 && !rest
            ? { angle: Math.sin((1 - s.spin / BOLT.spin.value) * Math.PI * 2) * 0.25 }
            : {}),
    });
    const out = actorSprites(s.act, ACTS, dress, r.stride, rest);
    if (s.jets.on || s.boost > 0) {
        const flick = rest ? 2 : 1 + (Math.floor(s.steps / 3) % 3);
        for (const dx of s.boost > 0 ? [-r.facing * 0.5] : [-0.25, 0.25])
            out.push({
                key: `flame:${dx}`,
                art: "spacekit",
                params: { kind: "flame", n: flick, on: true },
                x: r.x + dx,
                y: r.y + 0.45,
                size: 0.8,
                z: 8.9,
                ...(s.boost > 0 ? { angle: r.facing > 0 ? Math.PI / 2 : -Math.PI / 2 } : {}),
            });
    }
    if (!grounded(r) && (s.jets.on || s.jets.fuel < BOLT.fuel.value - 1e-6))
        out.push({
            key: "fuel",
            art: "spacekit",
            params: { kind: "fuel", n: Math.ceil((s.jets.fuel / BOLT.fuel.value) * 6), on: true },
            x: r.x,
            y: r.y - 1,
            size: 2.6,
            z: 8.8,
            alpha: 0.8,
            live: true,
        });
    return out;
}

const SIZE: Record<Thing["kind"], number> = { crate: 1.6, metal: 2, tile: 2, wall: 1.1, rock: 1.7 };

/** How far the ship rises at lift-off, in squares: high enough to fly, low enough to stay above the round's card. */
const RISE = 6;

export function boltFrame(s: BoltState, rest = false): Frame {
    const L = s.L,
        sprites: Sprite[] = [],
        marks: Mark[] = [],
        t = rest ? 0 : s.steps * DT;
    backdrop(s, sprites);
    L.blocks.forEach((b, k) =>
        sprites.push(
            ...lengths(`block:${k}`, b.x0, b.x1, b.y0, b.look, Math.min(12, b.y1 - b.y0), 4, true),
        ),
    );
    ledgesNow(s).forEach((l, k) => {
        const at = ledgeAt(l, t);
        const spring = L.ledges[k]?.spring !== undefined;
        if (spring) {
            const squash = (s.sprung[k] ?? 99) < 0.35 ? 0.3 * (1 - (s.sprung[k] ?? 0) / 0.35) : 0;
            sprites.push({
                key: `spring:${k}`,
                art: "spacekit",
                params: { kind: "spring", n: 0, on: false },
                x: (at.x0 + at.x1) / 2,
                y: at.y + 0.5,
                size: at.x1 - at.x0,
                z: 5,
                ...(squash ? { squash } : {}),
            });
            return;
        }
        const still = l.move === undefined && !l.sinks && k < L.ledges.length;
        sprites.push(...lengths(`ledge:${k}`, at.x0, at.x1, at.y, l.look, 1, 5, still));
    });
    const bridge = L.bridge;
    if (bridge) {
        const hx = bridge.x - s.plank;
        sprites.push({
            key: "handle",
            art: "spacekit",
            params: { kind: "handle", n: 0, on: false },
            x: hx,
            y: bridge.y - 0.3,
            size: 0.9,
            z: 6,
        });
        if (s.grab)
            marks.push({
                kind: "line",
                a: { x: s.r.x + s.r.facing * 0.4, y: s.r.y - 1 },
                b: { x: hx, y: bridge.y - 0.3 },
                bend: -0.4,
                style: "rod",
            });
    }
    L.things.forEach((th, k) => {
        const h = s.held[k];
        if (!h || h.gone) return;
        const box = thingBlock(th, h);
        if (!box) return;
        const inside = L.crew.findIndex((c, i) => c.in === k && s.mates[i]?.state === "hidden");
        const shut = L.crew[inside];
        // a robot shut in a crate peeks over its lid, and the crate rocks every few seconds
        const knock = shut && !rest ? Math.max(0, Math.sin(t * 2.2 + k)) ** 8 : 0;
        if (shut)
            sprites.push({
                key: `peek:${k}`,
                art: "crewbot",
                params: { colour: shut.colour, mood: "cheer", n: s.values[inside] ?? 0 },
                x: (box.x0 + box.x1) / 2,
                y: box.y0 + 0.3 - knock * 0.3,
                stand: true,
                size: 0.8,
                z: 5.9,
            });
        sprites.push({
            key: `thing:${k}`,
            art: "spacecrate",
            params: { kind: th.kind },
            x: (box.x0 + box.x1) / 2,
            y: (box.y0 + box.y1) / 2,
            size: SIZE[th.kind],
            z: 6,
            ...(th.kind === "rock" && h.turn ? { angle: h.turn } : {}),
            ...(knock ? { angle: Math.sin(t * 40) * 0.08 * knock } : {}),
            ...(th.kind === "tile" && h.blast > 0 && !rest
                ? { angle: Math.sin(t * 60) * 0.04 }
                : {}),
        });
        if (th.kind === "metal" && s.magnet && Math.abs(h.x - s.r.x) < 12)
            marks.push({
                kind: "dots",
                pts: [0.25, 0.5, 0.75].map((f) => ({
                    x: s.r.x + (h.x - s.r.x) * f,
                    y: s.r.y - 1 + (h.y - 0.8 - s.r.y + 1) * f,
                })),
                faint: true,
            });
    });
    s.pieces.forEach((p, k) =>
        sprites.push({
            key: `piece:${k}`,
            art: "spacecrate",
            params: { kind: "plank" },
            x: p.x,
            y: p.y,
            size: 0.7,
            angle: p.turn,
            alpha: Math.max(0, 1 - p.age / 1.2),
            z: 10,
        }),
    );
    const open = rescued(s);
    L.gates.forEach((g, k) =>
        sprites.push({
            key: `gate:${k}`,
            art: "spacekit",
            params: { kind: "gate", n: g.need, on: open >= g.need },
            x: g.x,
            y: g.y,
            stand: true,
            size: 2,
            z: 6,
        }),
    );
    L.beacons.forEach((b, k) =>
        sprites.push({
            key: `beacon:${k}`,
            art: "spacekit",
            params: { kind: "beacon", n: 0, on: k <= s.flag },
            x: b.x - 0.6,
            y: b.y,
            stand: true,
            size: 0.9,
            z: 3,
        }),
    );
    const lift = s.end === "won" ? Math.max(0, s.launch - 0.8) : 0,
        rise = Math.min(RISE, 3 * lift * lift);
    sprites.push({
        key: "ship",
        art: "boltship",
        params: { flame: lift > 0, ramp: lift <= 0 },
        x: L.ship.x,
        y: L.ship.y - rise,
        stand: true,
        size: 8,
        z: 3,
    });
    sprites.push({
        key: "charlie",
        art: "charlie",
        params: {
            pose: s.end === "won" ? "cheer" : "wave",
            mood: "happy",
            dir: -1,
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
        x: L.ship.x,
        y: L.ship.y - 8 + 3.7 - rise,
        stand: true,
        size: 1.2,
        z: 3.2,
    });
    s.mates.forEach((m, i) => {
        const c = L.crew[i];
        if (!c || m.state === "hidden") return;
        if (m.state === "aboard") {
            if (lift > 0) return;
            const k = s.aboard.indexOf(i),
                per = L.rows,
                col = k % per,
                rowN = Math.floor(k / per);
            sprites.push({
                key: `mate:${i}`,
                art: "crewbot",
                params: { colour: c.colour, mood: "cheer", n: s.values[i] ?? 0 },
                x: L.ship.x - 2 + (col - (per - 1) / 2) * 0.9 + 2,
                y: L.ship.y - 3 - rowN * 0.9,
                stand: true,
                size: 0.8,
                z: 3.4,
            });
            return;
        }
        const hop =
            rest || m.state === "asleep"
                ? 0
                : m.state === "following"
                  ? Math.abs(Math.sin(t * 9 + i)) * 0.25
                  : m.since < 0.6
                    ? Math.sin((m.since / 0.6) * Math.PI) * 0.8
                    : 0;
        sprites.push({
            key: `mate:${i}`,
            art: "crewbot",
            params: {
                colour: c.colour,
                mood: m.state === "asleep" ? "asleep" : m.state === "following" ? "cheer" : "awake",
                n: s.values[i] ?? 0,
            },
            x: m.x,
            y: m.y - hop,
            stand: true,
            size: 1.1,
            z: 8,
            ...(m.state === "following" && s.r.x < m.x ? { flip: true } : {}),
        });
    });
    sprites.push(...boltSprites(s, rest));
    hud(s, sprites, marks);
    const show = L.preview !== "none" && !rest && grounded(s.r) && !s.end && s.splash <= 0;
    if (show) marks.push({ kind: "dots", pts: arcOf(s), faint: true });
    return {
        sprites,
        marks,
        camera: { ...s.cam },
        focus: { x: s.r.x + s.r.facing * 2, y: s.r.y - 3 },
        view: { ...VIEW },
        world: { w: L.w, h: L.h },
        time: t,
        water: L.pit
            ? pits(L).map(([x0, x1]) => ({
                  x: x0,
                  w: x1 - x0,
                  level: L.h - 1.5,
                  bottom: L.h + 3,
                  waves: L.pit === "lava" ? 0.05 : 0.08,
                  hue: PIT_HUE[L.pit ?? "water"],
                  z: 2,
              }))
            : [],
    };
}

/** The readouts kept in the corner: the crew as a sum and as seats in rows, and the batteries left. */
function hud(s: BoltState, sprites: Sprite[], marks: Mark[]): void {
    const L = s.L,
        found = s.mates
            .map((m, k) =>
                m.state === "following" || m.state === "aboard" ? (s.values[k] ?? 0) : 0,
            )
            .filter((v) => v > 0);
    sprites.push({
        key: "hud:crew",
        art: "crewbot",
        params: { colour: "sky", mood: "awake", n: 0 },
        x: 1.3,
        y: 1.5,
        size: 1.3,
        z: 50,
        fixed: true,
    });
    const sum = found.length > 1 ? `${found.join(" + ")} = ${rescued(s)}` : `${rescued(s)}`,
        text = `${sum} of ${s.need}`;
    // a word is placed by its middle, so a longer sum moves along to keep its start by the icon
    marks.push({ kind: "word", x: 2.5 + text.length * 0.2, y: 1.8, text, size: 0.75, fixed: true });
    // the ship's seats as rows, filled as the crew climb aboard
    const per = L.rows,
        seats = s.need,
        full = seated(s);
    for (let k = 0; k < seats; k++)
        sprites.push({
            key: `seat:${k}`,
            art: "crewbot",
            params: {
                colour: k < full ? "mint" : "glow",
                mood: k < full ? "cheer" : "awake",
                n: 0,
            },
            x: 1 + (k % per) * 0.75,
            y: 3 + Math.floor(k / per) * 0.8,
            size: 0.65,
            z: 50,
            fixed: true,
            ...(k < full ? {} : { faint: true }),
        });
    if (s.batteries !== null)
        for (let k = 0; k < (L.batteries ?? 0); k++)
            sprites.push({
                key: `battery:${k}`,
                art: "spacekit",
                params: { kind: "battery", n: 0, on: k < s.batteries },
                x: VIEW.w - 1.5 - k * 1.7,
                y: 1.5,
                size: 1.5,
                z: 50,
                fixed: true,
            });
    if (L.free)
        marks.push({
            kind: "word",
            x: VIEW.w - 10,
            y: 1.9,
            text: `All visits: ${s.kept + seated(s)}`,
            size: 0.8,
            fixed: true,
        });
}

/** Where the pits show their lava or water: past both ends, and in every gap the ground leaves. */
function pits(L: BoltLevel): [number, number][] {
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

function say(s: BoltState): string {
    const r = s.r,
        L = s.L;
    if (s.end) return s.said;
    const parts = [
        `Bolt is ${grounded(r) ? "standing" : s.jets.on ? "hovering" : "in the air"}, ${Math.round(L.ship.x - r.x)} squares from the ship, with ${rescued(s)} of ${s.need} crew found and ${seated(s)} aboard.`,
    ];
    const left = s.mates.filter(
        (m) => m.state === "waiting" || m.state === "asleep" || m.state === "hidden",
    ).length;
    if (left) parts.push(`${left} crew still to find.`);
    const gate = L.gates.find((g) => g.x > r.x && rescued(s) < g.need);
    if (gate) parts.push(`The next gate opens for ${gate.need} crew.`);
    if (s.batteries !== null) parts.push(`${s.batteries} batteries left.`);
    return parts.join(" ");
}

const SOUNDS: Kit = {
    lift: [
        { wave: "triangle", hz: 392, to: 784, attack: 0.005, decay: 0.16, gain: 0.3 },
        { wave: "sine", hz: 784, to: 1176, attack: 0.01, decay: 0.12, gain: 0.12, delay: 0.03 },
    ],
    // a little chirp, for a crew robot found
    ring: [
        { wave: "square", hz: 1200, to: 1800, attack: 0.003, decay: 0.08, gain: 0.08 },
        { wave: "sine", hz: 1800, to: 2400, attack: 0.003, decay: 0.12, gain: 0.16, delay: 0.07 },
    ],
    level: [
        { wave: "triangle", hz: 523, attack: 0.005, decay: 0.2, gain: 0.26 },
        { wave: "triangle", hz: 784, attack: 0.005, decay: 0.3, gain: 0.22, delay: 0.08 },
    ],
    // the spin's whoosh
    back: [{ wave: "noise", hz: 1600, to: 600, attack: 0.03, decay: 0.22, gain: 0.3 }],
    // the jets catching, and the rocket's burst
    creak: [{ wave: "noise", hz: 2400, attack: 0.01, decay: 0.25, gain: 0.25 }],
    crash: [
        { wave: "noise", hz: 900, attack: 0.002, decay: 0.25, gain: 0.45 },
        { wave: "sine", hz: 140, to: 70, attack: 0.002, decay: 0.2, gain: 0.3 },
    ],
    bump: [
        { wave: "sine", hz: 160, to: 90, attack: 0.002, decay: 0.12, gain: 0.35 },
        { wave: "noise", hz: 500, attack: 0.002, decay: 0.07, gain: 0.2 },
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

const isKept = (v: unknown): v is { flown: number } =>
    typeof v === "object" &&
    v !== null &&
    "flown" in v &&
    typeof v.flown === "number" &&
    Number.isFinite(v.flown) &&
    v.flown >= 0;

const GADGETS: readonly Gadget[] = ["gloves", "rocket", "magnet"];

export const boltGame: ActionGame<BoltState> = {
    id: "bolt",
    title: "Bolt's rescue",
    group: "action",
    levels: BOLT_LEVELS,
    rate: RATE,
    touch: true,
    quiet: true,
    wasd: true,
    sounds: SOUNDS,
    card: { round: { level: 0 }, keep: 24, minutes: 2 },
    portrait: { keep: 22 },
    cover: { art: "boltcover", params: { crew: 3 } },
    hint: "Hold left or right to run and space or up to jump; keep holding at the top to hover on Bolt's jets. X or down spins, and E uses the planet's gadget. On the field, hold a finger where Bolt should go, above Bolt to jump and hover; tap Bolt to spin.",
    controls: {
        arrows: { left: "Run left", right: "Run right" },
        go: "Jump",
        icons: { go: "up" },
    },
    commands: [
        { id: "gadget", label: "Use the gadget", key: "e", keysOnly: true },
        { id: "spin", label: "Spin", key: "x", icon: "spin" },
        { id: "spinShift", label: "Spin with shift", key: "shift", keysOnly: true },
        { id: "gloves", label: "Spring gloves", icon: "grab" },
        { id: "rocket", label: "Rocket pack", icon: "launch" },
        { id: "magnet", label: "Magnet", icon: "magnet" },
    ],
    command: (s, id) => {
        if (id === "spin" || id === "spinShift") s.wantSpin = true;
        else if (id === "gadget" || GADGETS.some((g) => g === id)) s.wantGadget = true;
    },
    shows: (s, id) => (GADGETS.some((g) => g === id) ? s.L.gadget === id : true),
    saves: { level: BOLT_LEVELS.length - 1 },
    checkpoint: (s) => ({ flown: s.kept + (s.end === "won" ? seated(s) : 0) }),
    restore: (s, v) => {
        if (!isKept(v)) return false;
        s.kept = Math.round(v.flown);
        return true;
    },
    start: (phase, seed) => startBolt(phase, seed === undefined ? 0 : seed - 1),
    step: stepBolt,
    frame: boltFrame,
    say,
    note: (s) => s.said,
    won: (s) => s.end === "won",
    ended: (s): RoundEnd | null => (s.end ? { won: s.end === "won", words: s.said } : null),
    objectives: (s) => {
        const p = progress(s.goal);
        return { completed: p.completed, total: p.total };
    },
    cancelInput: (s) => {
        s.touchFrom = -1;
        s.above = false;
    },
    hum: (s): Hum[] =>
        s.end === "won" && s.launch > 0.8
            ? [{ kind: "engine", level: 0.4, pitch: 1.5 }]
            : s.jets.on || s.boost > 0
              ? [{ kind: "sweep", level: 0.35 }]
              : [],
    tuning: BOLT,
    still: {
        press: () => Math.round(RATE * 0.35),
        settling: (s) =>
            (!grounded(s.r) && !s.end) ||
            s.splash > 0 ||
            s.spin > 0 ||
            (s.end === "won" && s.launch < 1.5),
    },
};
