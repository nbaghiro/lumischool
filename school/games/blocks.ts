// A home for the pups: a crane swings the Pup family's wooden blocks over the building site, and the
// child drops each one where it should go. A finger held over the site, or the arrow keys, drives the
// crane; the block swings as the crane moves and stops, and it falls as it swings when it is let go,
// so a steady hand places it and a hasty one sends it wide. When the house matches the pup's note, the
// wolf comes to huff and puff, and a house that stands is moved into. One the wolf blows down is put
// back exactly as it was built. The mathematics is in the notes: widths, heights, counts, area and
// halves. See .docs/games.md.
import { bodies, type Bodies, type Body, type Piece } from "../../engine/motion/bodies";
import { follow, keepInside, type Cam } from "../../engine/motion/camera";
import { edit, snap, undo, workshop, type Workshop } from "../../engine/motion/construction";
import {
    actor,
    actorSprites,
    land,
    stepActor,
    type Actor,
    type Cycle,
} from "../../engine/motion/actor";
import type { Pt } from "../../engine/motion/geometry";
import { gustAt, gustLength, type Gust } from "../../engine/motion/gust";
import type { Pad } from "../../engine/motion/pad";
import { stepsOf } from "../../engine/motion/touches";
import { heightAt, rooms, rows, type Solid } from "../../engine/motion/room";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import {
    runner,
    seek,
    stepRunner,
    type Course,
    type Moves,
    type Runner,
    type Surface,
} from "../../engine/motion/walker";
import { PUPS, PUP_FACTS, type Pup } from "../../engine/parts/animals/pupfamily";
import type { Hum, Kit, Layer } from "../../engine/sound/kit";
import type { ActionGame, ActionLevel, Levels } from "./game";

/** Each kind of block: its size in squares, its shape, and how it is painted. */
export const KINDS = {
    cube: { w: 1, h: 1, shape: "block", colour: "tang", face: "star", name: "cube" },
    brick: { w: 2, h: 1, shape: "block", colour: "berry", face: "window", name: "brick" },
    half: { w: 0.5, h: 1, shape: "block", colour: "glow", face: "plain", name: "half block" },
    plank3: { w: 3, h: 0.5, shape: "block", colour: "mint", face: "plain", name: "3 plank" },
    plank4: { w: 4, h: 0.5, shape: "block", colour: "sky", face: "plain", name: "4 plank" },
    plank6: { w: 6, h: 0.5, shape: "block", colour: "mint", face: "plain", name: "6 plank" },
    roof: { w: 4, h: 2, shape: "roof", colour: "berry", face: "plain", name: "roof" },
    roof6: { w: 6, h: 2, shape: "roof", colour: "tang", face: "plain", name: "wide roof" },
    arch: { w: 4, h: 3, shape: "arch", colour: "glow", face: "plain", name: "arch" },
    frame: { w: 2, h: 3, shape: "frame", colour: "sky", face: "plain", name: "door frame" },
} as const;
export type Kind = keyof typeof KINDS;

/** Whether a kind can hang on its side: a block longer one way than the other. A roof or an arch hangs one way up. */
export const turns = (k: Kind): boolean => KINDS[k].shape === "block" && KINDS[k].w !== KINDS[k].h;

/** A kind's outline, piece by piece, from its middle before it is turned. */
function outlineOf(k: Kind): Pt[][] {
    const box = (x: number, y: number, w: number, h: number): Pt[] => [
        { x: x - w / 2, y: y - h / 2 },
        { x: x + w / 2, y: y - h / 2 },
        { x: x + w / 2, y: y + h / 2 },
        { x: x - w / 2, y: y + h / 2 },
    ];
    const parts = piecesOf(k);
    if (!parts) return [box(0, 0, KINDS[k].w, KINDS[k].h)];
    return parts.map((p) =>
        "box" in p ? box(p.box.x, p.box.y, p.box.w, p.box.h) : "poly" in p ? p.poly : [],
    );
}

/**
 * The pieces a kind's body is made of, from its middle, or null for a plain box. An arch is open under
 * the middle half of its width and two thirds of its height, a door frame under the middle half and
 * five sixths, as the woodblock drawing paints them.
 */
function piecesOf(k: Kind): Piece[] | null {
    const { w, h, shape } = KINDS[k];
    if (shape === "roof")
        return [
            {
                poly: [
                    { x: -w / 2, y: h / 2 },
                    { x: w / 2, y: h / 2 },
                    { x: 0, y: -h / 2 },
                ],
            },
        ];
    if (shape === "arch" || shape === "frame") {
        const ow = w / 2,
            oh = shape === "arch" ? (h * 2) / 3 : (h * 5) / 6,
            leg = (w - ow) / 2;
        return [
            { box: { x: -w / 2 + leg / 2, y: h / 2 - oh / 2, w: leg, h: oh } },
            { box: { x: w / 2 - leg / 2, y: h / 2 - oh / 2, w: leg, h: oh } },
            { box: { x: 0, y: -oh / 2, w, h: h - oh } },
        ];
    }
    return null;
}

export type Job =
    | { kind: "room"; width: number; tall: number; above?: number }
    /** A room under a roof piece, `height` squares to the roof's tip, and with a door frame beside it when `door` is set. */
    | { kind: "house"; width: number; tall: number; height: number; door?: boolean }
    | { kind: "rooms"; count: number; width: number; tall: number }
    | { kind: "tower"; at: number; height: number }
    | { kind: "count"; blocks: number; width: number; tall: number }
    | { kind: "area"; area: number; tall: number }
    | { kind: "wall"; length: number };

export interface BlocksLevel extends ActionLevel {
    who: Pup;
    /** The job, as it is written on the pup's note. */
    brief: string[];
    /** The ground, as strips with their tops, from one side of the world to the other. */
    ground: { x: number; w: number; y: number }[];
    water?: { x: number; w: number; y: number };
    /** Where the crane can carry a block, across. */
    site: { a: number; b: number };
    /** The blocks, in the order the crane fetches them. */
    pile: Kind[];
    job: Job;
    /** How hard the wolf blows, as a share of the tuned force. */
    wind: number;
    /** What the crane shows of where a block will land: its outline, a line straight down, or nothing. */
    guide: "ghost" | "line" | "none";
    prompt: string;
}

// The world is wider and taller than any view the page grows to, so no edge of it is ever in sight:
// its ground's hatching runs down to the bottom edge, and sky and hills run past both sides.
const W = 72,
    H = 26.8;
/** The ground most levels stand on, and where the crane's tower stands, across. */
const GROUND = 24,
    TOWER = 22;
/** The crane's jib, from the top of the world: the drawing's top, and the rail the trolley runs under. */
const JIB = 5,
    RAIL = 6.3;
/** How far a hanging block's bottom is kept above what is under it, and how long the hook is, in squares. */
const CLEAR = 0.6,
    HOOK = 0.9;

const strips = (y: number, from = 0, to = W) => [{ x: from, w: to - from, y }];
const cubes = (n: number): Kind[] => Array.from({ length: n }, (): Kind => "cube");
const SITE = { a: 31, b: 47 };

export const BLOCKS_LEVELS: Levels<BlocksLevel> = [
    {
        title: "A bed for Dot",
        grades: [1, 1],
        goal: "Build Dot a room 2 squares wide, under a roof.",
        prompt: "Hold a finger over the site and the crane follows it. Let go to drop the block.",
        who: "dot",
        brief: ["A room 2 squares", "wide, with a roof,", "for my bed."],
        ground: strips(GROUND),
        site: SITE,
        pile: [...cubes(4), "plank4", "plank3"],
        job: { kind: "room", width: 2, tall: 2 },
        wind: 0.4,
        guide: "ghost",
    },
    {
        title: "Three rooms in a row",
        grades: [1, 2],
        goal: "Build three rooms side by side, each 2 squares wide.",
        prompt: "An arch is a room already. Build the third room from blocks.",
        who: "pip",
        brief: ["Three rooms, each", "2 squares wide,", "one for each of us."],
        ground: strips(GROUND),
        site: SITE,
        pile: ["arch", "arch", ...cubes(4), "plank4", "plank3", "brick"],
        job: { kind: "rooms", count: 3, width: 2, tall: 2 },
        wind: 0.4,
        guide: "ghost",
    },
    {
        title: "Pip's lookout",
        grades: [1, 2],
        goal: "Build a tower exactly 6 squares tall on the flag.",
        prompt: "A brick hung on its end is 2 squares tall. Turn it before you drop it.",
        who: "pip",
        brief: ["A lookout on the", "flag, exactly 6", "squares tall."],
        ground: [...strips(GROUND, 0, 41), ...strips(GROUND - 1, 41, W)],
        site: SITE,
        pile: ["brick", "brick", "brick", ...cubes(4), "half", "half"],
        job: { kind: "tower", at: 44, height: 6 },
        wind: 0.18,
        guide: "ghost",
    },
    {
        title: "Ten blocks by the river",
        grades: [2, 2],
        goal: "Build a room 4 squares wide using exactly 10 blocks.",
        prompt: "Count the blocks as you build.",
        who: "pip",
        brief: ["A room 4 squares", "wide, and use", "exactly 10 blocks."],
        ground: [...strips(GROUND, 0, 52), ...strips(GROUND + 4, 52, 60), ...strips(GROUND, 60, W)],
        water: { x: 52, w: 8, y: GROUND + 1 },
        site: { a: 31, b: 44.5 },
        pile: [...cubes(4), "plank6", ...cubes(6), "brick", "brick", "plank4"],
        job: { kind: "count", blocks: 10, width: 4, tall: 2 },
        wind: 0.5,
        guide: "line",
    },
    {
        title: "A pointed roof",
        grades: [2, 3],
        goal: "Build Rufus a room 2 squares wide under a roof whose tip is exactly 4 squares high.",
        prompt: "Walls 2 squares tall and a roof 2 squares tall make a house 4 squares tall.",
        who: "rufus",
        brief: ["A room 2 squares", "wide, 4 squares to", "the tip of the roof."],
        ground: strips(GROUND),
        site: SITE,
        pile: [...cubes(6), "roof", "brick", "brick", "plank4", "roof6"],
        job: { kind: "house", width: 2, tall: 2, height: 4 },
        wind: 0.5,
        guide: "line",
    },
    {
        title: "Windy hilltop",
        grades: [2, 3],
        goal: "Build Maple a room with an area of 6 squares that stands in a strong wind.",
        prompt: "A room 2 wide and 3 tall has an area of 6 squares. Thick walls stand up to the wolf.",
        who: "maple",
        brief: ["A room with an area", "of 6 squares. It is", "windy up here."],
        ground: [
            ...strips(GROUND + 1, 0, 35),
            ...strips(GROUND - 1, 35, 47),
            ...strips(GROUND + 1, 47, W),
        ],
        site: { a: 35, b: 47 },
        pile: [...Array.from({ length: 6 }, (): Kind => "brick"), "plank6", ...cubes(4), "plank4"],
        job: { kind: "area", area: 6, tall: 1.5 },
        wind: 1,
        guide: "line",
    },
    {
        title: "Over the pond",
        grades: [3, 3],
        goal: "Build Dot a room 3 squares wide with its floor at least 2 squares above the water.",
        prompt: "Drop bricks on end into the pond as stilts, then lay a floor across them.",
        who: "dot",
        brief: ["A room 3 squares", "wide, 2 squares", "above the water."],
        ground: [...strips(GROUND, 0, 33), ...strips(GROUND + 3, 33, 47), ...strips(GROUND, 47, W)],
        water: { x: 33, w: 14, y: GROUND + 1 },
        site: SITE,
        pile: ["brick", "brick", "brick", "brick", "plank6", ...cubes(6), "plank6"],
        job: { kind: "room", width: 3, tall: 2, above: 2 },
        wind: 0.3,
        guide: "line",
    },
    {
        title: "A door for the family",
        grades: [3, 4],
        goal: "Build a room 3 squares wide with a door beside it, and a roof whose tip is 5 and a half squares high.",
        prompt: "The door frame is one wall. Measure how tall it is before you choose the other wall.",
        who: "maple",
        brief: ["A room 3 squares", "wide with a door,", "5½ squares to the tip."],
        ground: strips(GROUND),
        site: SITE,
        pile: [
            "frame",
            "brick",
            ...cubes(4),
            "brick",
            "half",
            "half",
            "plank6",
            "roof6",
            "plank4",
            "roof",
        ],
        job: { kind: "house", width: 3, tall: 2.5, height: 5.5, door: true },
        wind: 0.4,
        guide: "none",
    },
    {
        title: "A garden wall in halves",
        grades: [4, 4],
        goal: "Build Rufus a garden wall exactly 7 and a half squares long.",
        prompt: "Drop blocks end to end along the grass. A half block is half a square wide, and it stands best with the wall behind it.",
        who: "rufus",
        brief: ["A garden wall", "exactly 7½", "squares long."],
        ground: strips(GROUND),
        site: SITE,
        pile: ["brick", "brick", "brick", ...cubes(3), "half", "half", "half"],
        job: { kind: "wall", length: 7.5 },
        wind: 0.25,
        guide: "none",
    },
];

const RATE = 60,
    DT = 1 / RATE;
const VIEW = { w: 36, h: 21 } as const;
const G = 30;
/** How big the pups and the wolf are drawn: squares across for each square of their drawing's box. */
const K = 0.46;
const GUST: Gust = { rise: 0.8, hold: 1.6, fall: 0.8, flutter: 0.35 };
/** How far a block may move, and turn, in the huff before the house counts as fallen. */
const MOVED = 0.4,
    TURNED = 0.3;
/** How long the wolf takes to walk up, and to breathe in, in seconds. */
const WALK_IN = 1.6,
    INHALE = 1;

export const BLOCKS = {
    force: knob(
        20,
        4,
        60,
        1,
        "square-kilograms a second, each second",
        "a strong huff topples a thin wall and leaves a thick one standing",
    ),
    density: knob(0.8, 0.3, 2, 0.1, "kilograms a square", "a block feels solid but still topples"),
    speed: knob(
        7,
        3,
        14,
        0.5,
        "squares a second",
        "the crane crosses the site in a couple of seconds",
    ),
    accel: knob(
        16,
        6,
        40,
        1,
        "squares a second, each second",
        "a quick start or stop sets the block swinging, a gentle one hardly does",
    ),
    damping: knob(
        1.6,
        0.2,
        4,
        0.1,
        "a second",
        "a swing dies away in a couple of swings, so waiting a moment is a way to aim",
    ),
};

interface Block {
    kind: Kind;
    home: Pt;
    body: Body | null;
}

type Phase = "build" | "huff" | "fallen" | "movein" | "won";

/** The crane: the trolley along the jib, the rope's length and the hanging block's swing. */
export interface Crane {
    x: number;
    v: number;
    /** The rope's angle from straight down, in radians, positive with the hook to the right. */
    angle: number;
    spin: number;
    /** From the rail to the top of the hanging block, in squares. */
    rope: number;
    /** The block on the hook, by its place in the pile, or null while the crane fetches the next. */
    load: number | null;
    /** Whether the hanging block hangs on its side. */
    turned: boolean;
    /** Seconds until the crane has fetched the next block. */
    fetch: number;
    /** The highest thing under the hanging block, measured every few steps. */
    under: number;
}

export interface BlocksState {
    L: BlocksLevel;
    level: number;
    physics: Bodies;
    blocks: Block[];
    design: Workshop;
    crane: Crane;
    /** Two fingers' turn not yet a quarter turn, in radians. Left out until two fingers turn. */
    twist?: number;
    /** How far the site is zoomed in while building, from one; left out until a pinch or the wheel. */
    look?: number;
    /** What the finger on the field is doing: driving the crane, or choosing from the pile. */
    hand: "steer" | "pick" | null;
    /** Where the finger driving the crane wants it, across. */
    aim: number | null;
    /** Set when two fingers pinched or turned during this touch, so lifting them does not drop the block. */
    pinched: boolean;
    braking: boolean;
    phase: Phase;
    t: number;
    /** Where every block stood as the huff began, to tell whether the house fell. */
    before: { x: number; y: number; angle: number }[];
    /** Steps the blocks have been still since the last change, and whether a change waits to be kept. */
    calm: number;
    changed: boolean;
    /** Whether the house has changed since the wolf last blew it down, so he comes again. */
    ready: boolean;
    bumpAt: number;
    creakAt: number;
    said: string;
    saidAt: number;
    touched: boolean;
    steps: number;
    won: boolean;
    tries: number;
    cam: Cam;
    /** The family moving in, each running to their place, from the moment the house stands. */
    family: { r: Runner; a: Actor<PupAct> }[];
}

const sizeOf = (k: Kind) => KINDS[k];
const groundAt = (L: BlocksLevel, x: number): number =>
    L.ground.find((g) => x >= g.x && x < g.x + g.w)?.y ?? H;

/** Half the width and half the height of the upright box a block turned by `angle` fills. */
function extent(k: Kind, angle: number): { hw: number; hh: number } {
    const { w, h } = sizeOf(k),
        c = Math.abs(Math.cos(angle)),
        s = Math.abs(Math.sin(angle));
    return { hw: (c * w + s * h) / 2, hh: (s * w + c * h) / 2 };
}

/** The highest thing under a span, from the ground and the blocks on the site. */
function topUnder(s: BlocksState, a: number, b: number): number {
    let top = H;
    for (let u = a + 0.05; u <= b - 0.05 + 1e-9; u += 0.1)
        top = Math.min(top, s.physics.rayDown(u, 0, H)?.y ?? groundAt(s.L, u));
    return top;
}

/** Where a block let go over `x` at `angle` comes to rest: on the highest thing under it. */
export function restOf(s: BlocksState, k: Kind, x: number, angle: number): Pt {
    const { hw, hh } = extent(k, angle);
    return { x, y: topUnder(s, x - hw, x + hw) - hh - 0.01 };
}

function tell(s: BlocksState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

/** Where the pile's blocks wait, stacked in rows between the crane's tower and the site. */
function pileOf(L: BlocksLevel): Pt[] {
    const out: Pt[] = [];
    const from = TOWER + 1.8,
        end = L.site.a - 0.8;
    let x = from,
        floor = groundAt(L, from),
        tallest = 0;
    for (const k of L.pile) {
        const { w, h } = sizeOf(k);
        // a new row sits on the tallest block of the row before, so a roof or an arch overlaps nothing
        if (x + w > end) {
            x = from;
            floor -= tallest + 0.2;
            tallest = 0;
        }
        tallest = Math.max(tallest, h);
        out.push({ x: x + w / 2, y: Math.min(floor, groundAt(L, x + w / 2)) - h / 2 });
        x += w + 0.3;
    }
    return out;
}

function makeBody(s: BlocksState, k: Kind, at: Pt, angle: number): Body {
    const { w, h } = sizeOf(k),
        m = { density: BLOCKS.density.value, friction: 0.9, restitution: 0.02 };
    const parts = piecesOf(k);
    return parts
        ? s.physics.compound({ x: at.x, y: at.y, angle, parts, ...m })
        : s.physics.box({ x: at.x, y: at.y, w, h, angle, ...m });
}

export function startBlocks(L: BlocksLevel, level: number): BlocksState {
    const physics = bodies({ gravity: { x: 0, y: G } });
    for (const g of L.ground)
        physics.box({ x: g.x + g.w / 2, y: g.y + 5, w: g.w, h: 10, fixed: true, friction: 0.95 });
    const homes = pileOf(L);
    const blocks: Block[] = L.pile.map((kind, i) => ({
        kind,
        home: homes[i] ?? { x: TOWER + 2, y: GROUND - 1 },
        body: null,
    }));
    const s: BlocksState = {
        L,
        level,
        physics,
        blocks,
        design: workshop(
            blocks.map((b, i) => ({ id: `block:${i}`, x: b.home.x, y: b.home.y, angle: 0 })),
            { w: W, h: H },
        ),
        crane: {
            x: (L.site.a + L.site.b) / 2,
            v: 0,
            angle: 0,
            spin: 0,
            rope: 4,
            load: null,
            turned: false,
            fetch: 0,
            under: H,
        },
        hand: null,
        aim: null,
        pinched: false,
        braking: false,
        phase: "build",
        t: 0,
        before: [],
        calm: 0,
        changed: false,
        ready: false,
        bumpAt: -99,
        creakAt: -99,
        said: "",
        saidAt: -999,
        touched: false,
        steps: 0,
        won: false,
        tries: 0,
        cam: { x: W / 2, y: H / 2, zoom: 1 },
        family: [],
    };
    fetchNext(s);
    s.crane.rope = ropeWanted(s);
    const want = wantedCam(s);
    s.cam = { ...keepInside(want, VIEW, { w: W, h: H }), zoom: 1 };
    return s;
}

/** Whether a point is inside the ground or a block on the site. */
export function solidOf(s: BlocksState): Solid {
    const shapes = s.blocks.flatMap((b) => (b.body ? s.physics.outline(b.body) : []));
    const inside = (poly: Pt[], x: number, y: number): boolean => {
        // every piece is convex, so a point inside is on the same side of every edge
        let sign = 0;
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i],
                b = poly[(i + 1) % poly.length];
            if (!a || !b) continue;
            const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x),
                len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            if (cross / len > 0.01) {
                if (sign < 0) return false;
                sign = 1;
            } else if (cross / len < -0.01) {
                if (sign > 0) return false;
                sign = -1;
            }
        }
        return true;
    };
    return (x, y) => y >= groundAt(s.L, x) || shapes.some((poly) => inside(poly, x, y));
}

/** Whether a door frame stands upright on the room's floor, at one side of it, so the family can walk in. */
function doorBeside(s: BlocksState, r: { a: number; b: number; floor: number }): boolean {
    return s.blocks.some((b) => {
        if (!b.body || b.kind !== "frame") return false;
        const at = s.physics.where(b.body),
            { w, h } = sizeOf(b.kind);
        return (
            Math.abs(at.angle) < 0.15 &&
            Math.abs(at.y + h / 2 - r.floor) < 0.3 &&
            at.x + w / 2 > r.a - 0.6 &&
            at.x - w / 2 < r.b + 0.6
        );
    });
}

const halves = (v: number) => Math.round(v * 2) / 2;
const said = (v: number) =>
    v % 1 === 0 ? String(v) : v < 1 ? "half a" : `${Math.floor(v)} and a half`;
const squares = (v: number) => `${said(v)} ${v === 1 ? "square" : "squares"}`;

export interface Measured {
    ok: boolean;
    /** What was found, in words, for the note after a block settles. */
    text: string;
    /** Where to draw what was measured. */
    marks: Mark[];
}

/** Measures the house against the pup's job. */
export function measure(s: BlocksState): Measured {
    const L = s.L,
        goal = L.job,
        solid = solidOf(s),
        name = PUP_FACTS[L.who].name;
    const ground = (x: number) => groundAt(L, x);
    const placed = s.blocks.filter((b) => b.body).length;
    const roomMarks = (r: { a: number; b: number; floor: number; clear: number }): Mark[] => [
        {
            kind: "line",
            a: { x: r.a, y: r.floor - 0.3 },
            b: { x: r.b, y: r.floor - 0.3 },
            style: "aim",
            head: true,
        },
        {
            kind: "word",
            x: (r.a + r.b) / 2,
            y: r.floor - r.clear / 2,
            text: `${said(halves(r.b - r.a))} wide`,
            size: 0.6,
        },
    ];
    if (goal.kind === "tower") {
        const h = heightAt(solid, goal.at, ground(goal.at), 0);
        const top = ground(goal.at) - h;
        return {
            ok: Math.abs(h - goal.height) <= 0.25,
            text:
                h < 0.2
                    ? `Nothing stands on the flag yet.`
                    : `The tower is ${squares(halves(h))} tall. ${name} wants ${squares(goal.height)}.`,
            marks:
                h < 0.2
                    ? []
                    : [
                          {
                              kind: "line",
                              a: { x: goal.at + 1.2, y: ground(goal.at) },
                              b: { x: goal.at + 1.2, y: top },
                              style: "aim",
                              head: true,
                          },
                          {
                              kind: "word",
                              x: goal.at + 2.6,
                              y: (ground(goal.at) + top) / 2,
                              text: said(halves(h)),
                              size: 0.7,
                          },
                      ],
        };
    }
    if (goal.kind === "wall") {
        const run = rows(solid, L.site.a, L.site.b, ground).sort((p, q) => q.length - p.length)[0];
        if (!run) return { ok: false, text: "No wall lies along the grass yet.", marks: [] };
        const length = halves(run.length);
        return {
            ok: Math.abs(run.length - goal.length) <= 0.2,
            text: `The wall is ${squares(length)} long. ${name} wants ${squares(goal.length)}.`,
            marks: [
                {
                    kind: "line",
                    a: { x: run.a, y: ground(run.a) + 0.6 },
                    b: { x: run.b, y: ground(run.b) + 0.6 },
                    style: "aim",
                    head: true,
                },
                {
                    kind: "word",
                    x: (run.a + run.b) / 2,
                    y: ground(run.a) + 1.4,
                    text: said(length),
                    size: 0.7,
                },
            ],
        };
    }
    const least = goal.tall - 0.25;
    const found = rooms(solid, L.site.a, L.site.b, ground, 0, least, { dx: 0.2, dy: 0.1 }).filter(
        (r) =>
            goal.kind !== "room" ||
            !goal.above ||
            !L.water ||
            r.floor <= L.water.y - goal.above + 0.1,
    );
    if (goal.kind === "rooms") {
        const good = found.filter((r) => Math.abs(r.width - goal.width) <= 0.3),
            n = good.length;
        return {
            ok: n >= goal.count,
            text:
                n === 0
                    ? `There is no room ${squares(goal.width)} wide under a roof yet.`
                    : `There ${n === 1 ? "is 1 room" : `are ${n} rooms`} ${squares(goal.width)} wide. ${name} wants ${goal.count}.`,
            marks: good.flatMap(roomMarks),
        };
    }
    if (goal.kind === "house") {
        const best = found.sort(
            (p, q) => Math.abs(p.width - goal.width) - Math.abs(q.width - goal.width),
        )[0];
        if (!best)
            return {
                ok: false,
                text: `There is no room under a roof yet, ${squares(goal.tall)} tall.`,
                marks: [],
            };
        const width = halves(best.width),
            mid = (best.a + best.b) / 2,
            // the tip is the highest point over the room and its walls, wherever the roof's point is
            tip = Array.from({ length: Math.round((best.b - best.a + 3) / 0.1) + 1 }, (_, k) =>
                heightAt(solid, best.a - 1.5 + k * 0.1, ground(mid), 0),
            ).reduce((p, q) => Math.max(p, q), 0),
            roofed = s.blocks.some((b) => {
                if (!b.body || KINDS[b.kind].shape !== "roof") return false;
                const at = s.physics.where(b.body);
                return at.x > best.a - 1 && at.x < best.b + 1 && at.y < best.floor - best.clear;
            }),
            door = !goal.door || doorBeside(s, best);
        const ok =
            Math.abs(best.width - goal.width) <= 0.3 &&
            roofed &&
            Math.abs(tip - goal.height) <= 0.25 &&
            door;
        const found1 = roofed
            ? `The room is ${squares(width)} wide and the house is ${squares(halves(tip))} tall to the tip of its roof.`
            : `The room is ${squares(width)} wide, and it has no pointed roof yet.`;
        const doorLine = goal.door
            ? door
                ? " It has a door."
                : " It has no door beside it yet."
            : "";
        const top = ground(mid) - tip;
        return {
            ok,
            text: `${found1}${doorLine} ${name} wants a room ${squares(goal.width)} wide and ${squares(goal.height)} to the tip${goal.door ? ", with a door" : ""}.`,
            marks: [
                ...roomMarks(best),
                ...(roofed
                    ? [
                          {
                              kind: "line" as const,
                              a: { x: best.b + 1.4, y: ground(mid) },
                              b: { x: best.b + 1.4, y: top },
                              style: "aim" as const,
                              head: true,
                          },
                          {
                              kind: "word" as const,
                              x: best.b + 2.6,
                              y: (ground(mid) + top) / 2,
                              text: said(halves(tip)),
                              size: 0.7,
                          },
                      ]
                    : []),
            ],
        };
    }
    if (goal.kind === "area") {
        const best = found
            .map((r) => ({ r, area: halves(r.width) * halves(r.clear) }))
            .sort((p, q) => Math.abs(p.area - goal.area) - Math.abs(q.area - goal.area))[0];
        if (!best) return { ok: false, text: "There is no room under a roof yet.", marks: [] };
        const w = halves(best.r.width),
            t = halves(best.r.clear);
        return {
            ok: best.area === goal.area,
            text: `The room is ${said(w)} wide and ${said(t)} tall, an area of ${squares(best.area)}. ${name} wants ${squares(goal.area)}.`,
            marks: roomMarks(best.r),
        };
    }
    const want = goal.width;
    const best = found.sort((p, q) => Math.abs(p.width - want) - Math.abs(q.width - want))[0];
    if (!best)
        return {
            ok: false,
            text:
                goal.kind === "room" && goal.above
                    ? `There is no room with its floor ${squares(goal.above)} above the water yet.`
                    : `There is no room under a roof yet, ${squares(goal.tall)} tall.`,
            marks: [],
        };
    const width = halves(best.width),
        fits = Math.abs(best.width - want) <= 0.3;
    if (goal.kind === "count") {
        const counted = placed === goal.blocks;
        return {
            ok: fits && counted,
            text: `The room is ${squares(width)} wide and the house has ${placed} ${placed === 1 ? "block" : "blocks"}. ${name} wants ${squares(want)} and ${goal.blocks} blocks.`,
            marks: roomMarks(best),
        };
    }
    return {
        ok: fits,
        text: `The room is ${squares(width)} wide. ${name} wants ${squares(want)}.`,
        marks: roomMarks(best),
    };
}

/** The last measure taken of each game, so drawing a frame does not measure the whole site again. */
const lately = new WeakMap<BlocksState, { at: number; phase: Phase; m: Measured }>();
function measured(s: BlocksState): Measured {
    const c = lately.get(s);
    if (c && c.phase === s.phase && s.steps - c.at < 8) return c.m;
    const m = measure(s);
    lately.set(s, { at: s.steps, phase: s.phase, m });
    return m;
}

/** Keeps the house as it now stands as the child's design, one step of it, so taking back undoes a whole drop. */
function record(s: BlocksState): void {
    const before = s.design.past.length;
    s.blocks.forEach((b, i) => {
        const at = b.body ? s.physics.where(b.body) : { ...b.home, angle: 0 };
        const p = s.design.design.pieces[i];
        if (!p) return;
        if (Math.abs(p.x - at.x) > 1e-4 || Math.abs(p.y - at.y) > 1e-4)
            edit(s.design, { kind: "move", id: p.id, x: at.x, y: at.y });
        if (Math.abs(p.angle - at.angle) > 1e-4)
            edit(s.design, { kind: "rotate", id: p.id, angle: at.angle });
    });
    if (s.design.past.length > before + 1) s.design.past.splice(before + 1);
}

const onSite = (s: BlocksState, i: number, p: { x: number; y: number }): boolean =>
    Math.abs(p.x - (s.blocks[i]?.home.x ?? 0)) > 1e-4 ||
    Math.abs(p.y - (s.blocks[i]?.home.y ?? 0)) > 1e-4;

/** Puts every block where the design says, still, as the child built it. */
function rebuild(s: BlocksState): void {
    s.blocks.forEach((b, i) => {
        if (b.body) s.physics.remove(b.body);
        b.body = null;
        const p = s.design.design.pieces[i];
        if (!p || i === s.crane.load) return;
        if (onSite(s, i, p)) b.body = makeBody(s, b.kind, { x: p.x, y: p.y }, p.angle);
    });
    s.calm = 0;
    s.changed = false;
}

/** The blocks still in the pile, in the order the crane fetches them. */
export const inPile = (s: BlocksState): number[] =>
    s.blocks.flatMap((b, i) => (b.body || i === s.crane.load ? [] : [i]));

/** Hangs the next block from the pile on the hook, or leaves the hook empty when the pile is. */
function fetchNext(s: BlocksState): void {
    const c = s.crane;
    c.load = inPile(s)[0] ?? null;
    c.turned = false;
    c.angle = c.spin = 0;
    c.rope = Math.min(c.rope, ropeWanted(s));
}

/** Puts the hanging block back in the pile and hangs block `i` instead. */
function choose(s: BlocksState, i: number, out: Happening[]): void {
    const c = s.crane;
    if (s.phase !== "build" || i === c.load || s.blocks[i]?.body) return;
    c.load = i;
    c.turned = false;
    c.angle = c.spin = 0;
    c.fetch = 0;
    c.rope = Math.min(c.rope, ropeWanted(s));
    s.touched = true;
    out.push({ cue: "lift" });
}

/** Where the hanging block's middle is, and how it is turned. */
export function loadPose(s: BlocksState): { x: number; y: number; angle: number } | null {
    const c = s.crane,
        b = c.load === null ? undefined : s.blocks[c.load];
    if (!b || c.fetch > 0) return null;
    const base = c.turned ? Math.PI / 2 : 0,
        { hh } = extent(b.kind, base),
        sn = Math.sin(c.angle),
        cs = Math.cos(c.angle);
    return {
        x: c.x + (c.rope + hh) * sn,
        y: RAIL + (c.rope + hh) * cs,
        angle: base - c.angle,
    };
}

/** How far the trolley can go each way with the hanging block still over the site. */
function reach(s: BlocksState): { a: number; b: number } {
    const c = s.crane,
        b = c.load === null ? undefined : s.blocks[c.load];
    const hw = b ? extent(b.kind, c.turned ? Math.PI / 2 : 0).hw : 0;
    return { a: s.L.site.a + hw, b: s.L.site.b - hw };
}

/** The rope's length that keeps the hanging block a little above whatever is under it, measuring again when asked. */
function ropeWanted(s: BlocksState, look = true): number {
    const c = s.crane,
        b = c.load === null ? undefined : s.blocks[c.load];
    if (!b) return 2;
    const { hw, hh } = extent(b.kind, c.turned ? Math.PI / 2 : 0);
    if (look) c.under = topUnder(s, c.x - hw - 0.3, c.x + hw + 0.3);
    return Math.max(HOOK + 0.4, c.under - CLEAR - 2 * hh - RAIL);
}

/** Moves the trolley towards what the hand or the keys want, and swings the block under it. */
function stepCrane(s: BlocksState, pad: Pad): void {
    const c = s.crane,
        r = reach(s),
        top = BLOCKS.speed.value;
    const keyed = pad.holding.includes("right") ? 1 : pad.holding.includes("left") ? -1 : 0;
    const wantV =
        s.hand === "steer" && s.aim !== null
            ? Math.max(-top, Math.min(top, (Math.max(r.a, Math.min(r.b, s.aim)) - c.x) * 4))
            : keyed * top * 0.6;
    const most = BLOCKS.accel.value * DT;
    const v0 = c.v;
    c.v += Math.max(-most, Math.min(most, wantV - c.v));
    c.x += c.v * DT;
    if (c.x < r.a || c.x > r.b) {
        c.x = Math.max(r.a, Math.min(r.b, c.x));
        c.v = 0;
    }
    const accel = (c.v - v0) / DT;
    // the rope winds in at once over a taller stack, so a hanging block never passes through one
    const want = ropeWanted(s, s.steps % 3 === 0);
    c.rope = c.rope > want ? Math.max(want, c.rope - 14 * DT) : Math.min(want, c.rope + 6 * DT);
    // a pendulum from a moving point: the trolley's start and stop set the block swinging, and it dies away
    const len = c.rope + HOOK;
    c.spin +=
        (-(G / len) * Math.sin(c.angle) -
            (accel / len) * Math.cos(c.angle) -
            BLOCKS.damping.value * c.spin) *
        DT;
    c.angle += c.spin * DT;
    if (c.fetch > 0) {
        c.fetch -= DT;
        if (c.fetch <= 0) {
            fetchNext(s);
            c.fetch = 0;
        }
    }
}

/** How near a block let go beside a neighbour must be for it to meet that side, in squares. */
const SNAP = 0.3;

/** Where a block dropped over `x` lands across: against a neighbour's side when it falls a hair from it. */
function snapped(s: BlocksState, k: Kind, angle: number, x: number): number {
    const { hw } = extent(k, angle);
    const sides = s.blocks.flatMap((b) =>
        b.body
            ? s.physics.outline(b.body).flatMap((poly) => {
                  const xs = poly.map((p) => p.x);
                  return [
                      { x: Math.min(...xs), y: 0 },
                      { x: Math.max(...xs), y: 0 },
                  ];
              })
            : [],
    );
    const move = snap(
        [
            { x: x - hw, y: 0 },
            { x: x + hw, y: 0 },
        ],
        sides,
        SNAP,
        "x",
    );
    return x + (move?.x ?? 0);
}

/** Whether the hanging block hangs still enough to fall straight down, and so meet a neighbour. */
const steady = (c: Crane): boolean =>
    Math.abs(c.v) < 0.3 && Math.abs(c.angle) < 0.03 && Math.abs(c.spin) < 0.1;

/** Lets the hanging block go: it falls as it swings, and the crane fetches the next. */
function drop(s: BlocksState, out: Happening[]): void {
    const c = s.crane,
        at = loadPose(s),
        i = c.load,
        b = i === null ? undefined : s.blocks[i];
    if (s.phase !== "build") return;
    s.touched = true;
    if (!at || !b || i === null) {
        tell(s, inPile(s).length ? "The crane is fetching the next block." : "The pile is empty.");
        return;
    }
    const { hh } = extent(b.kind, c.turned ? Math.PI / 2 : 0),
        len = c.rope + hh,
        sn = Math.sin(c.angle),
        cs = Math.cos(c.angle);
    const x = steady(c) ? snapped(s, b.kind, at.angle, at.x) : at.x;
    // never inside what is under it, even when the rope has not wound in yet
    const y = Math.min(at.y, restOf(s, b.kind, x, at.angle).y);
    b.body = makeBody(s, b.kind, { x, y }, at.angle);
    s.physics.launch(b.body, { x: c.v + len * c.spin * cs, y: -len * c.spin * sn }, -c.spin);
    c.load = null;
    c.fetch = 0.5;
    s.changed = true;
    s.ready = true;
    s.calm = 0;
    out.push({ cue: "back", strength: 0.3, pitch: 1.5 });
}

/** Turns the hanging block onto its side, or back, where it can hang that way. */
function turn(s: BlocksState, out: Happening[]): void {
    const c = s.crane,
        b = c.load === null ? undefined : s.blocks[c.load];
    if (!b || s.phase !== "build") return;
    s.touched = true;
    if (!turns(b.kind)) {
        tell(s, `A ${KINDS[b.kind].name} hangs only one way up.`);
        out.push({ cue: "nope" });
        return;
    }
    c.turned = !c.turned;
    c.spin += 0.6;
    c.rope = Math.min(c.rope, ropeWanted(s));
    out.push({ cue: "lift", strength: 0.4 });
}

/** Whether a point on the field is on block `i` in the pile. */
function onPileBlock(s: BlocksState, i: number, p: Pt): boolean {
    const b = s.blocks[i];
    if (!b || b.body || i === s.crane.load) return false;
    const { w, h } = sizeOf(b.kind);
    return Math.abs(p.x - b.home.x) <= w / 2 + 0.2 && Math.abs(p.y - b.home.y) <= h / 2 + 0.3;
}

function hands(s: BlocksState, pad: Pad, out: Happening[]): void {
    const t = pad.touch;
    if (t && s.hand === null) {
        s.pinched = false;
        const picked = inPile(s).find((i) => onPileBlock(s, i, t));
        if (picked !== undefined) {
            s.hand = "pick";
            choose(s, picked, out);
        } else {
            s.hand = "steer";
            s.touched = true;
        }
    }
    if (t && s.hand === "steer") s.aim = t.x;
    if (pad.lifted) {
        if (s.hand === "steer" && !s.pinched) drop(s, out);
        s.hand = null;
        s.aim = null;
    }
}

function keys(s: BlocksState, pad: Pad, out: Happening[]): void {
    for (const d of pad.pressed) {
        if (d !== "up" && d !== "down") continue;
        const list = [...inPile(s), ...(s.crane.load === null ? [] : [s.crane.load])].sort(
            (p, q) => p - q,
        );
        if (list.length < 2) continue;
        const at = list.indexOf(s.crane.load ?? list[0] ?? 0);
        const next = list[(at + (d === "down" ? 1 : list.length - 1)) % list.length];
        if (next !== undefined) choose(s, next, out);
    }
    if (pad.tapped) drop(s, out);
    if (pad.brake && !s.braking) turn(s, out);
    s.braking = pad.brake;
}

/** The closest the site can be zoomed while building. */
const LOOK = 1.8;

/** Two fingers turn the hanging block a quarter turn at a time, and a pinch or the wheel zooms the site. */
function intents(s: BlocksState, pad: Pad, out: Happening[]): void {
    for (const i of pad.intents ?? []) {
        s.pinched = true;
        if (i.kind === "zoom") s.look = Math.max(1, Math.min(LOOK, (s.look ?? 1) * i.by));
        else {
            const r = stepsOf(s.twist ?? 0, i.by, Math.PI / 2);
            s.twist = r.left;
            if (r.steps % 2 !== 0) turn(s, out);
        }
    }
}

/** When the wolf starts to blow, in seconds from the start of the huff. */
const BLOW = WALK_IN + INHALE;

function startHuff(s: BlocksState, m: Measured, out: Happening[]): void {
    s.before = s.blocks.map((b) => (b.body ? s.physics.where(b.body) : { x: 0, y: 0, angle: 0 }));
    s.phase = "huff";
    s.t = 0;
    s.hand = null;
    s.aim = null;
    tell(s, `${m.text.split(".")[0]}. Here comes the wolf to huff and puff.`);
    out.push({ cue: "level" });
}

function stepHuff(s: BlocksState, out: Happening[]): void {
    s.t += DT;
    const strength = s.t > BLOW ? gustAt(GUST, s.t - BLOW) * s.L.wind * BLOCKS.force.value : 0;
    if (strength > 0) {
        for (const b of s.blocks)
            if (b.body) s.physics.push(b.body, { x: strength * sizeOf(b.kind).h, y: 0 });
        if (s.steps % 10 === 0)
            out.push({
                burst: { kind: "dust", x: wolfX(s) + 2, y: groundAt(s.L, wolfX(s)) - 3, n: 2 },
            });
    }
    if (s.t < BLOW + gustLength(GUST) + 1.2) return;
    const fell = s.blocks.some((b, i) => {
        const was = s.before[i];
        if (!b.body || !was) return false;
        const now = s.physics.where(b.body);
        return (
            Math.hypot(now.x - was.x, now.y - was.y) > MOVED ||
            Math.abs(now.angle - was.angle) > TURNED
        );
    });
    if (fell || !measure(s).ok) {
        s.phase = "fallen";
        s.t = 0;
        s.tries++;
        s.ready = false;
        out.push({ cue: "crash" }, { shake: 0.5 });
        tell(
            s,
            "The wolf blew the house down. It is back as you built it: make it stronger, and he will come again.",
        );
        return;
    }
    s.phase = "movein";
    s.t = 0;
    s.family = PUPS.map((_, k) => {
        const at = waitingAt(s, k);
        return { r: runner(at.x, at.y, -1), a: actor<PupAct>("wait", "stand", -1) };
    });
    tell(s, `The house stands. The wolf gives up, and the Pup family moves in.`);
    out.push({ cue: "ring" });
}

/** A block's knock is lower the bigger the block. */
const pitchOf = (k: Kind): number =>
    Math.max(0.6, Math.min(1.3, 1.3 - 0.1 * sizeOf(k).w * sizeOf(k).h));

function kindOf(s: BlocksState, body: Body): Kind | null {
    return s.blocks.find((b) => b.body === body)?.kind ?? null;
}

function step(s: BlocksState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (s.phase === "build") {
        hands(s, pad, out);
        intents(s, pad, out);
        keys(s, pad, out);
    }
    stepCrane(s, s.phase === "build" ? pad : { ...pad, holding: [] });
    s.physics.step(DT);
    for (const hit of s.physics.hits())
        if (hit.speed > 2 && s.steps - s.bumpAt > 6) {
            s.bumpAt = s.steps;
            const body = hit.a.shape === "ground" ? hit.b : hit.a,
                at = s.physics.where(body),
                k = kindOf(s, body);
            out.push(
                { cue: "bump", strength: Math.min(1, hit.speed / 9), pitch: k ? pitchOf(k) : 1 },
                { burst: { kind: "dust", x: at.x, y: at.y, n: 3 } },
            );
        }
    // a block rocking on its corner creaks, as a stack does before it goes
    if (s.steps - s.creakAt > 40)
        for (const b of s.blocks)
            if (b.body && Math.abs(s.physics.spin(b.body)) > 1.2) {
                s.creakAt = s.steps;
                out.push({ cue: "creak", strength: 0.5, pitch: pitchOf(b.kind) });
                break;
            }
    if (s.phase === "build") {
        const still = s.blocks.every((b) => !b.body || !s.physics.moving(b.body, 0.05));
        s.calm = still ? s.calm + 1 : 0;
        if (s.changed && s.calm >= 20) {
            record(s);
            s.changed = false;
            const m = measure(s);
            if (!m.ok)
                tell(
                    s,
                    inPile(s).length || s.crane.load !== null
                        ? m.text
                        : `${m.text} The pile is empty: take a block back with the back arrow.`,
                );
        }
        if (s.ready && !s.changed && s.calm === 40) {
            const m = measure(s);
            if (m.ok) startHuff(s, m, out);
        }
    } else if (s.phase === "huff") stepHuff(s, out);
    else if (s.phase === "fallen") {
        s.t += DT;
        if (s.t >= 1.6) {
            rebuild(s);
            s.phase = "build";
        }
    } else if (s.phase === "movein") {
        s.t += DT;
        const home = moveIn(s);
        const last = Math.max(...PUPS.map((_, k) => arrives(s, k)));
        // a pup that cannot reach their place in good time is put there, so a house that stands is always moved into
        if (home || s.t >= last + 3) {
            settleIn(s);
            s.won = true;
            s.phase = "won";
            out.push(
                { cue: "win" },
                { burst: { kind: "sparkle", x: (s.L.site.a + s.L.site.b) / 2, y: 17, n: 14 } },
            );
            tell(s, `The Pup family loves their new home.`);
        }
    } else if (s.phase === "won") {
        s.t += DT;
        stepFamily(s);
    }
    s.cam = follow(s.cam, wantedCam(s), { rate: 2.5, dt: DT, view: VIEW, world: { w: W, h: H } });
    return out;
}

/** Takes back the last block dropped, and puts the house back as it was before it. */
function back(s: BlocksState): boolean {
    if (s.phase !== "build") return false;
    if (s.changed) record(s);
    if (!undo(s.design)) return false;
    rebuild(s);
    s.ready = true;
    tell(s, "Taken back.");
    return true;
}

/** Whether anything is still moving or happening: a block settling, the huff, a fall or moving in. */
const busy = (s: BlocksState): boolean =>
    s.phase === "huff" ||
    s.phase === "fallen" ||
    s.phase === "movein" ||
    s.changed ||
    s.blocks.some((b) => b.body !== null && s.physics.moving(b.body, 0.05));

/** How fast the pups walk in, in squares a second, and how long each waits for the one in front. */
const WALK = 3,
    AFTER = 0.45;

type PupAct = "wait" | "walk" | "air" | "home" | "cheer";
const PUP_ACTS: Record<PupAct, Cycle> = {
    wait: { poses: ["stand"] },
    walk: { poses: ["walk"] },
    air: { poses: ["jump"] },
    home: { poses: ["stand"] },
    cheer: { poses: ["cheer", "jump"], every: 0.6 },
};

/** A pup's legs: a steady walk, and a hop high enough for a floor on stilts. */
const PUP_MOVES: Moves = {
    speed: WALK,
    accel: 20,
    airAccel: 12,
    gravity: 40,
    jump: 3.2,
    cut: 1,
    coyote: 0.1,
    buffer: 0.1,
    step: 0.45,
    fall: 20,
    climb: 2,
    pace: 0.7,
    height: 2,
};

/** What the family walks on: the ground, the pond's top, and the floors of the new home, which are hopped up through. */
function familyCourse(s: BlocksState): Course {
    const floors = PUPS.map((_, k) => homeOf(s, k)).filter((h) => h.y < walkY(s, h.x) - 0.4);
    return {
        floor: (x, from, to) => {
            let best: Surface | null = null;
            const g = walkY(s, x);
            if (g >= from && g <= to) best = { y: g };
            for (const f of floors)
                if (Math.abs(x - f.x) <= 1.6 && f.y >= from && f.y <= to && (!best || f.y < best.y))
                    best = { y: f.y, oneWay: true };
            return best;
        },
    };
}

/** Moves each pup on towards their place, in turn; true once every one is there and standing. */
function moveIn(s: BlocksState): boolean {
    const course = familyCourse(s);
    let all = true;
    s.family.forEach((p, k) => {
        const to = homeOf(s, k),
            going = s.t >= walkOrder(s, k) * AFTER;
        const want = going
            ? seek(p.r, to.x, course, PUP_MOVES)
            : { run: 0 as const, jump: false, jumped: false };
        const ran = stepRunner(p.r, want, course, PUP_MOVES, DT);
        if (ran.includes("landed")) land(p.a, p.r.landed);
        const there = Math.abs(p.r.x - to.x) <= 0.2 && Math.abs(p.r.y - to.y) < 0.05;
        if (!there) all = false;
        const act: PupAct =
            p.r.state === "rise" || p.r.state === "fall"
                ? "air"
                : p.r.state === "run"
                  ? "walk"
                  : there
                    ? "home"
                    : "wait";
        stepActor(p.a, act, PUP_ACTS, DT, p.r.stride, p.r.facing);
    });
    return all;
}

/** The family's last word: each pup at their place, the one who asked cheering and the rest hopping. */
function settleIn(s: BlocksState): void {
    const who = PUPS.indexOf(s.L.who);
    s.family.forEach((p, k) => {
        const to = homeOf(s, k);
        p.r.x = to.x;
        p.r.y = to.y;
        p.r.state = "stand";
        p.r.vx = p.r.vy = 0;
        p.a = actor<PupAct>("cheer", k === who ? "cheer" : "jump", p.a.facing);
        if (k !== who) p.a.since = 0.6;
    });
}

/** Moves the pups' cheer on once they are home. */
function stepFamily(s: BlocksState): void {
    for (const p of s.family) stepActor(p.a, "cheer", PUP_ACTS, DT);
}

/** The order the pups walk in: the one who asked first, then the others. */
const walkOrder = (s: BlocksState, k: number): number => {
    const who = PUPS.indexOf(s.L.who);
    return k === who ? 0 : k < who ? k + 1 : k;
};

/** Where a pup waits while the house is built. */
function waitingAt(s: BlocksState, k: number): Pt {
    const x = s.L.site.b + 1.6 + k * 1.8;
    return { x, y: groundAt(s.L, x) };
}

/** The height a pup walks at over `x`: the ground, or the water's top where there is water. */
function walkY(s: BlocksState, x: number): number {
    const w = s.L.water;
    const g = groundAt(s.L, x);
    return w && x >= w.x && x <= w.x + w.w ? Math.min(g, w.y) : g;
}

/** Where a pup goes once the house stands: into a room, or beside the tower or wall. */
function homeOf(s: BlocksState, k: number): Pt {
    const L = s.L,
        spots = measured(s).marks.flatMap((m) =>
            m.kind === "line" && m.head && m.a.y === m.b.y ? [m] : [],
        );
    const o = walkOrder(s, k);
    if (L.job.kind === "tower") {
        const g = groundAt(L, L.job.at);
        return o === 0
            ? { x: L.job.at - 1.2, y: g }
            : { x: L.site.a + 1 + o * 1.5, y: groundAt(L, L.site.a + 1 + o * 1.5) };
    }
    const room = L.job.kind === "rooms" ? spots[o % Math.max(1, spots.length)] : spots[0];
    if (!room || L.job.kind === "wall") {
        const x = L.site.a + 1 + o * 1.5;
        return { x, y: groundAt(L, x) };
    }
    const a = Math.min(room.a.x, room.b.x),
        b = Math.max(room.a.x, room.b.x),
        inRoom = L.job.kind === "rooms" ? 0 : o,
        x = Math.max(a + 0.5, Math.min(b - 0.5, (a + b) / 2 + (inRoom - 1.5) * 0.9));
    return { x, y: room.a.y + 0.3 };
}

/** When a pup has walked in, in seconds from the start of moving in. */
function arrives(s: BlocksState, k: number): number {
    return walkOrder(s, k) * AFTER + Math.abs(homeOf(s, k).x - waitingAt(s, k).x) / WALK + 0.4;
}

/** Where the wolf stands to blow, and where he walks in from and back to. */
const wolfSpot = (s: BlocksState): number => s.L.site.a - 2.2;
const WOLF_FROM = 8;

function wolfX(s: BlocksState): number {
    const spot = wolfSpot(s);
    if (s.phase === "huff")
        return s.t < WALK_IN ? WOLF_FROM + (spot - WOLF_FROM) * (s.t / WALK_IN) : spot;
    if (s.phase === "movein" || s.phase === "won") return spot - s.t * 3;
    return spot;
}

/** The wolf, while he walks up, breathes in, blows, waits, or walks off beaten; none while the child builds. */
function wolfOf(s: BlocksState): { x: number; pose: string; dir: number } | null {
    const x = wolfX(s);
    if (s.phase === "huff") {
        const pose =
            s.t < WALK_IN
                ? "walk"
                : s.t < BLOW
                  ? "huff"
                  : s.t < BLOW + gustLength(GUST)
                    ? "blow"
                    : "stand";
        return { x, pose, dir: 1 };
    }
    if (s.phase === "fallen") return { x, pose: "stand", dir: 1 };
    if ((s.phase === "movein" || s.phase === "won") && x > WOLF_FROM - 4)
        return { x, pose: "walk", dir: -1 };
    return null;
}

/** Where the camera wants to be: the crane, the site and the family while building, and close on the house once it stands. */
function wantedCam(s: BlocksState): Cam {
    if (s.phase !== "movein" && s.phase !== "won") {
        // zoomed about the site rather than the hand, so a finger held still does not drag the view after it
        const zoom = s.look ?? 1,
            a = TOWER - 3,
            b = waitingAt(s, PUPS.length - 1).x + 1.2,
            y = JIB - 0.4 + VIEW.h / (2 * zoom);
        return { x: zoom > 1 ? (s.L.site.a + s.L.site.b) / 2 : (a + b) / 2, y, zoom };
    }
    const boxes = s.blocks.flatMap((b) => (b.body ? s.physics.outline(b.body).flat() : []));
    if (!boxes.length) return { x: W / 2, y: H / 2, zoom: 1 };
    const xs = boxes.map((p) => p.x),
        ys = boxes.map((p) => p.y);
    const a = Math.min(...xs) - 4,
        b = Math.max(...xs) + 4,
        top = Math.min(...ys) - 3,
        floor = Math.max(...ys) + 2;
    const zoom = Math.max(1, Math.min(1.4, VIEW.w / (b - a), VIEW.h / (floor - top)));
    return { x: (a + b) / 2, y: (top + floor) / 2, zoom };
}

function blockSprite(
    key: string,
    k: Kind,
    at: { x: number; y: number; angle: number },
    z: number,
): Sprite {
    const size = sizeOf(k);
    return {
        key,
        art: "woodblock",
        params: {
            w: Math.round(size.w * 2),
            h: Math.round(size.h * 2),
            colour: size.colour,
            face: size.face,
            shape: size.shape,
        },
        size: size.w,
        x: at.x,
        y: at.y,
        angle: at.angle,
        z,
    };
}

/** Sky, hills and ground from one side of the world to the other, so no edge of it shows. */
function backdrop(L: BlocksLevel, sprites: Sprite[]): void {
    [
        [4, 3, 4],
        [15, 2, 4.5],
        [27, 3.2, 4],
        [40, 2.2, 5],
        [52, 3.5, 4],
        [64, 2.4, 4.5],
    ].forEach(([x = 0, y = 0, size = 4], k) =>
        sprites.push({
            key: `cloud:${k}`,
            art: "cloud",
            params: { puffs: 3 + (k % 3), rain: 0 },
            seed: 11 + k,
            size,
            x,
            y,
            depth: 0.6,
            z: 0,
        }),
    );
    for (let k = 0; k < 5; k++)
        sprites.push({
            key: `hills:${k}`,
            art: "strokes.hills",
            seed: 30 + k,
            size: 18,
            x: k * 17 - 2,
            y: GROUND + 0.4,
            stand: true,
            depth: 0.5,
            z: 0.5,
            still: true,
        });
    [4, 11, 60, 67].forEach((x, k) =>
        sprites.push({
            key: `tree:${k}`,
            art: "tree",
            params: { fruit: k % 2 ? 3 : 0, fallen: 0, item: "apple" },
            seed: 5 + k,
            size: 5 + (k % 2),
            x,
            y: groundAt(L, x),
            stand: true,
            z: 1,
            still: true,
        }),
    );
    const base = Math.max(...L.ground.map((g) => g.y));
    L.ground.forEach((g, k) => {
        // a strip draws only so wide, so a long one is laid in pieces end to end
        for (let x = g.x, n = 0; x < g.x + g.w - 1e-6; x += 24, n++) {
            const w = Math.min(24, g.x + g.w - x);
            sprites.push({
                key: `ground:${k}:${n}`,
                art: "arcade.ground",
                params: { w: Math.max(1, Math.round(w)) },
                seed: 61 + k * 7 + n,
                size: w,
                x: x + w / 2,
                y: g.y + 1.1,
                z: 2,
                still: true,
            });
            // under raised ground, the earth goes on down to the bottom of the world
            if (g.y < base)
                sprites.push({
                    key: `earth:${k}:${n}`,
                    art: "arcade.ground",
                    params: { w: Math.max(1, Math.round(w)) },
                    seed: 91 + k * 7 + n,
                    size: w,
                    x: x + w / 2,
                    y: g.y + 3.3,
                    z: 1.9,
                    still: true,
                });
        }
    });
}

function frame(s: BlocksState, rest = false): Frame {
    const L = s.L,
        sprites: Sprite[] = [],
        marks: Mark[] = [],
        c = s.crane;
    backdrop(L, sprites);
    if (L.water)
        sprites.push({
            key: "water",
            art: "sea",
            params: {
                across: Math.round(L.water.w),
                deep: Math.round(H - L.water.y),
                x0: 0,
                bed: false,
            },
            seed: 70,
            size: L.water.w,
            x: L.water.x + L.water.w / 2,
            y: L.water.y + (H - L.water.y) / 2,
            z: 1.5,
            still: true,
        });
    const craneW = Math.round(L.site.b + 1.2 - (TOWER - 1.75));
    sprites.push({
        key: "crane",
        art: "crane",
        params: { w: craneW, tall: Math.round(groundAt(L, TOWER) - JIB) },
        size: craneW,
        x: TOWER - 1.75 + craneW / 2,
        y: groundAt(L, TOWER),
        stand: true,
        flip: true,
        z: 3,
        still: true,
    });
    // the ruler along the site, a mark a square
    for (let x = L.site.a; x <= L.site.b + 1e-9; x += 1) {
        const y = groundAt(L, Math.min(x, W - 0.01)) + 0.35;
        marks.push({
            kind: "line",
            a: { x, y },
            b: { x, y: y + ((x - L.site.a) % 5 === 0 ? 0.6 : 0.35) },
            style: "thin",
        });
    }
    if (L.job.kind === "tower") {
        const g = groundAt(L, L.job.at);
        marks.push(
            {
                kind: "line",
                a: { x: L.job.at, y: g },
                b: { x: L.job.at, y: g - L.job.height - 1.2 },
                style: "thin",
            },
            { kind: "word", x: L.job.at, y: g - L.job.height - 1.8, text: "flag", size: 0.55 },
        );
    }
    s.blocks.forEach((b, i) => {
        if (i === c.load && c.fetch <= 0) return;
        const at = b.body ? s.physics.where(b.body) : { ...b.home, angle: 0 };
        sprites.push(blockSprite(`block:${i}`, b.kind, at, b.body ? 6 : 5));
    });
    const load = loadPose(s),
        hung = c.load === null ? undefined : s.blocks[c.load];
    const hookTop = {
        x: c.x + (c.rope - HOOK) * Math.sin(c.angle),
        y: RAIL + (c.rope - HOOK) * Math.cos(c.angle),
    };
    sprites.push({
        key: "trolley",
        art: "workshop-piece",
        params: { kind: "crate", w: 2, h: 1 },
        size: 1.4,
        x: c.x,
        y: RAIL - 0.1,
        z: 4,
    });
    marks.push({ kind: "line", a: { x: c.x, y: RAIL + 0.25 }, b: hookTop, style: "rod" });
    sprites.push({
        key: "hook",
        art: "workshop-piece",
        params: { kind: "hook", w: 1, h: 2 },
        size: 0.45,
        x: hookTop.x + (HOOK / 2) * Math.sin(c.angle),
        y: hookTop.y + (HOOK / 2) * Math.cos(c.angle),
        angle: -c.angle,
        z: 11,
    });
    if (load && hung && c.load !== null) {
        sprites.push(blockSprite(`block:${c.load}`, hung.kind, load, 12));
        // where the hanging block would land if it were dropped now, as far as the level shows it
        if (s.phase === "build" && L.guide !== "none" && !rest) {
            const hh = extent(hung.kind, load.angle).hh,
                r = restOf(
                    s,
                    hung.kind,
                    steady(c) ? snapped(s, hung.kind, load.angle, load.x) : load.x,
                    load.angle,
                );
            marks.push({
                kind: "line",
                a: { x: load.x, y: load.y + hh },
                b: { x: r.x, y: r.y + hh },
                style: "aim",
            });
            if (L.guide === "ghost")
                for (const poly of outlineOf(hung.kind)) {
                    const cs = Math.cos(load.angle),
                        sn = Math.sin(load.angle);
                    const pts = poly.map((p) => ({
                        x: r.x + p.x * cs - p.y * sn,
                        y: r.y + p.x * sn + p.y * cs,
                    }));
                    pts.forEach((p, k) =>
                        marks.push({
                            kind: "line",
                            a: p,
                            b: pts[(k + 1) % pts.length] ?? p,
                            style: "aim",
                        }),
                    );
                }
        }
    }
    if (s.phase === "build" || s.phase === "won" || s.phase === "movein")
        marks.push(...measured(s).marks);
    const wolf = wolfOf(s);
    if (wolf) {
        const g = groundAt(L, wolf.x);
        sprites.push({
            key: "wolf",
            art: "wolf",
            params: { pose: wolf.pose, dir: wolf.dir },
            size: 5 * K,
            x: wolf.x,
            y: g + 0.2 * K,
            stand: true,
            z: 9,
        });
        // the gust, as lines streaming from his mouth across the site while he blows
        if (wolf.pose === "blow" && !rest)
            for (let k = 0; k < 7; k++) {
                const u = (s.t * 9 + k * 3.1) % 16,
                    y = g - 2.6 + ((k * 0.7) % 2.4) - 0.6;
                marks.push({
                    kind: "line",
                    a: { x: wolf.x + 1.4 + u, y },
                    b: { x: wolf.x + 3 + u, y: y - 0.2 },
                    bend: 0.2,
                    style: "thin",
                });
            }
    }
    PUPS.forEach((member, k) => {
        const moving = s.family[k];
        const at = moving ? moving.r : waitingAt(s, k);
        const dress = (pose: string, facing: 1 | -1): Sprite => ({
            key: `pup:${member}`,
            art: "pupfamily",
            params: {
                member,
                pose,
                mood:
                    s.phase === "fallen"
                        ? "surprised"
                        : s.phase === "huff" && s.t > WALK_IN
                          ? "worried"
                          : s.won
                            ? "excited"
                            : "happy",
                dir: facing,
            },
            size: 4 * K,
            x: at.x,
            y: at.y + 0.2 * K,
            stand: true,
            z: 8 - k * 0.1,
        });
        if (moving) sprites.push(...actorSprites(moving.a, PUP_ACTS, dress, moving.r.stride, rest));
        else sprites.push(dress(k === PUPS.indexOf(L.who) ? "wave" : "stand", -1));
    });
    if (s.phase === "build" && !rest) {
        const w = waitingAt(s, PUPS.indexOf(L.who));
        sprites.push({
            key: "brief",
            art: "pinned",
            params: { hold: "pin", lines: L.brief, width: 11, size: 16, align: "start" },
            size: 7,
            x: Math.min(W - 4, Math.max(4, w.x)),
            y: w.y - 7,
            z: 9,
        });
    }
    return {
        sprites,
        marks,
        camera: rest ? { ...wantedCam(s) } : { x: s.cam.x, y: s.cam.y, zoom: s.cam.zoom },
        view: VIEW,
        world: { w: W, h: H },
    };
}

function say(s: BlocksState): string {
    const L = s.L,
        placed = s.blocks.filter((b) => b.body).length,
        m = measure(s),
        c = s.crane,
        hung = c.load === null ? undefined : s.blocks[c.load];
    const parts = [
        `${PUP_FACTS[L.who].name} asks: ${L.brief.join(" ")}`,
        `${placed} ${placed === 1 ? "block is" : "blocks are"} on the site.`,
        m.text,
    ];
    if (hung && c.fetch <= 0)
        parts.push(
            `The crane holds a ${KINDS[hung.kind].name}${c.turned ? " on its side" : ""}, ${said(halves(c.x - L.site.a))} squares along the site.`,
        );
    if (s.phase === "huff") parts.push("The wolf is huffing and puffing at the house.");
    return parts.join(" ");
}

const tone = (
    wave: Layer["wave"],
    hz: number,
    decay: number,
    gain: number,
    more: Partial<Layer> = {},
): Layer => ({ wave, hz, attack: 0.004, decay, gain, ...more });

/** Wooden sounds: a clack when a block meets another, a creak when one rocks, a winch, and a cheer. */
const WOOD: Kit = {
    bump: [tone("triangle", 520, 0.07, 0.55, { to: 380 }), tone("noise", 2600, 0.03, 0.3)],
    place: [tone("triangle", 700, 0.06, 0.45), tone("noise", 3200, 0.02, 0.25)],
    back: [tone("sine", 900, 0.05, 0.25, { to: 600 })],
    lift: [
        tone("sawtooth", 110, 0.18, 0.1, { to: 150 }),
        tone("triangle", 660, 0.05, 0.25, { delay: 0.12 }),
    ],
    creak: [
        tone("sawtooth", 150, 0.35, 0.14, { attack: 0.05, to: 118 }),
        tone("triangle", 310, 0.3, 0.1, { attack: 0.04, to: 270 }),
    ],
    crash: [
        tone("triangle", 400, 0.08, 0.6, { to: 300 }),
        tone("triangle", 330, 0.08, 0.55, { to: 250, delay: 0.09 }),
        tone("triangle", 470, 0.08, 0.5, { to: 340, delay: 0.17 }),
        tone("noise", 1400, 0.3, 0.4, { delay: 0.05 }),
    ],
    win: [
        tone("noise", 2400, 0.7, 0.3, { attack: 0.12 }),
        tone("triangle", 523, 0.16, 0.4),
        tone("triangle", 659, 0.16, 0.4, { delay: 0.12 }),
        tone("triangle", 784, 0.16, 0.4, { delay: 0.24 }),
        tone("triangle", 1047, 0.45, 0.45, { delay: 0.36 }),
    ],
};

/** The wolf's breath, as a wind that rises as he breathes in and blows with his gust. */
function hum(s: BlocksState): Hum[] {
    if (s.phase !== "huff" || s.t < WALK_IN) return [];
    const level = s.t < BLOW ? 0.25 * ((s.t - WALK_IN) / INHALE) : gustAt(GUST, s.t - BLOW);
    return level > 0.01 ? [{ kind: "wind", level: Math.min(1, level) }] : [];
}

export const blocksGame: ActionGame<BlocksState> = {
    id: "blocks",
    title: "A home for the pups",
    group: "action",
    quiet: true,
    levels: BLOCKS_LEVELS,
    rate: RATE,
    touch: true,
    intents: true,
    sounds: WOOD,
    hum,
    cover: { art: "pupfamily", params: { member: "dot", pose: "cheer", mood: "excited", dir: 1 } },
    hint: "Hold a finger over the site and the crane follows it; let go to drop the block. Tap a block in the pile to hang it instead. With the keys: left and right drive the crane, up and down choose a block, space drops and B turns it",
    controls: { go: "Drop", brake: "Turn" },
    start: (level) => startBlocks(BLOCKS_LEVELS[level] ?? BLOCKS_LEVELS[0], level),
    step,
    frame,
    say,
    back,
    note: (s) =>
        !s.touched && !s.won ? s.L.prompt : s.steps - s.saidAt < RATE * 5 || s.won ? s.said : "",
    won: (s) => s.won,
    objectives: (s) => ({ completed: s.won ? 1 : 0, total: 1 }),
    cancelInput: (s) => {
        s.hand = null;
        s.aim = null;
    },
    tuning: BLOCKS,
    still: { press: () => Math.round(RATE * 0.25), settling: busy },
};
