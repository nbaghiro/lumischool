// Knock it down: a brick breaker in the way of Breakout and Arkanoid. Charlie carries a tray along the
// foot of a tall frame, and a ball sent up off it knocks blocks out of a structure built on a rock: a
// house, a tower of toy blocks, an apple tree, a castle, a snowman, a rocket, a pirate ship. Where the
// ball meets the tray sets where it goes next, so catching it is also aiming it. A piece of the
// structure that nothing holds up any more falls, and broken blocks drop gifts to catch: a star, a
// second ball, a wider tray, a sticky one. The maths is in which blocks count: a sum to make exactly,
// only the multiples, the numbers in order, half of the windows, stars to a total. A block that does
// not count does not break: the ball bounces off it, it greys, and the line above the field says why.
// See .docs/games.md.
import type { ActionGame, ActionLevel, Levels, RoundEnd } from "./game";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import {
    DT,
    fallOf,
    offTray,
    stepBall,
    stepFall,
    unheld,
    type Ball,
    type Box,
    type Fall,
    type Field,
    type Strike,
    type Tray,
} from "../../engine/motion/breakout";
import { SUB } from "../../engine/motion/pinball";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import { panOf, type Kit } from "../../engine/sound/kit";
import { KNOCKFRAME } from "../../engine/parts/sport/knockframe";

const RATE = 60;
const TICKS = SUB / RATE;
const F = KNOCKFRAME.field;

/** The world: the frame, with room either side for its place and a strip under it for Charlie's feet. */
const WORLD = { w: 84, h: 41 };
const FRAME_AT = { x: WORLD.w / 2 - KNOCKFRAME.w / 2, y: 0.5 };
export const FIELD_AT = { x: FRAME_AT.x + F.x, y: FRAME_AT.y + F.y };
const VIEW = { w: 30, h: WORLD.h };
const GROUND = WORLD.h - 0.5;

/** The tray's top, in the field's squares, and where the ball rests on it before it is served. */
export const TRAY_Y = 28;
const SERVE_OFF = 0.3;
const FIELD: Field = { w: F.w, h: F.h, r: 0.45 };

type Look =
    | "brick"
    | "window"
    | "roof"
    | "door"
    | "plank"
    | "toy"
    | "leaf"
    | "apple"
    | "snow"
    | "metal"
    | "sail"
    | "stone"
    | "rock"
    | "trunk"
    | "mast"
    | "pad";
type Tone = "berry" | "tang" | "sky" | "mint" | "glow";
type GiftKind = "star" | "ball" | "wide" | "sticky";
type Place =
    "meadow" | "street" | "playroom" | "orchard" | "castle" | "snow" | "space" | "sea" | "paper";

const FIXED: readonly Look[] = ["rock", "trunk", "mast", "pad"];

/** A block as a level lays it out, in the field's squares from its top left. */
export interface BlockSpec {
    x: number;
    y: number;
    w: number;
    h: number;
    look: Look;
    tone?: Tone;
    n?: number;
    /** Two for a block that cracks on its first hit. */
    hits?: 2;
    gift?: GiftKind;
    /** The number on a star it drops. */
    star?: number;
}

type Ask =
    | { kind: "count"; n: number; look?: Look; of?: number }
    | { kind: "sum"; total: number }
    | { kind: "multiples"; of: number }
    | { kind: "order"; seq: number[] }
    | { kind: "stars"; total: number }
    | { kind: "free" };

export interface KnockLevel extends ActionLevel {
    prompt: string;
    place: Place;
    blocks: BlockSpec[];
    ask: Ask;
    balls: number;
    /** How far the dotted path reaches: back down to the tray, to the first thing the ball meets, or not at all. */
    preview: 0 | 1 | 2;
    /** The ball's speed as a round starts and the most it rises to, in squares a second. */
    speed: [number, number];
    /** Half the tray's length, in squares. */
    tray: number;
}

const b = (
    x: number,
    y: number,
    w: number,
    h: number,
    look: Look,
    more: Partial<BlockSpec> = {},
): BlockSpec => ({ x, y, w, h, look, ...more });

/** A row of blocks `w` wide from `from` to `to`, numbered from `nums` in turn where it is given. */
function row(
    y: number,
    from: number,
    to: number,
    w: number,
    look: Look,
    more: Partial<BlockSpec> = {},
    nums: number[] = [],
): BlockSpec[] {
    const out: BlockSpec[] = [];
    for (let x = from, i = 0; x + w <= to + 1e-9; x += w, i++) {
        const n = nums[i % Math.max(1, nums.length)];
        out.push(
            b(x, y, w, 1, look, { ...more, ...(n !== undefined && nums.length ? { n } : {}) }),
        );
    }
    return out;
}

/** Rocks side by side under a structure, `w` squares from `x`, in pieces the drawing can draw. */
function rock(x: number, y: number, w: number, look: Look = "rock"): BlockSpec[] {
    const out: BlockSpec[] = [];
    for (let at = x; at < x + w - 1e-9; at += 6)
        out.push(b(at, y, Math.min(6, x + w - at), 2, look));
    return out;
}

/** Blocks laid out on a plan 26 squares across, set in the field and raised `dy` squares, so a tall structure leaves the tray room under it. */
const lift = (blocks: BlockSpec[], dy = 0): BlockSpec[] =>
    blocks.map((p) => ({ ...p, x: p.x - 2, y: p.y - dy }));

const HOUSE: BlockSpec[] = [
    ...rock(11, 17, 4),
    ...row(16, 7, 19, 2, "brick", { tone: "berry" }),
    b(7, 15, 2, 1, "brick", { tone: "tang" }),
    b(9, 15, 2, 1, "window"),
    ...row(15, 11, 15, 2, "brick", { tone: "tang" }),
    b(15, 15, 2, 1, "window"),
    b(17, 15, 2, 1, "brick", { tone: "tang" }),
    ...row(14, 7, 19, 2, "brick", { tone: "berry" }),
    ...row(13, 6, 20, 2, "roof", { tone: "tang" }),
    ...row(12, 8, 18, 2, "roof", { tone: "tang" }),
    ...row(11, 10, 16, 2, "roof", { tone: "tang" }),
    b(12, 10, 2, 1, "roof", { tone: "tang", gift: "wide" }),
];

const TOWN: BlockSpec[] = [
    ...rock(10, 19, 6),
    ...row(18, 6, 12, 2, "brick", { tone: "berry" }),
    b(12, 17, 2, 2, "door"),
    ...row(18, 14, 20, 2, "brick", { tone: "berry" }),
    b(6, 17, 2, 1, "brick", { tone: "tang" }),
    b(8, 17, 2, 1, "window"),
    b(10, 17, 2, 1, "brick", { tone: "tang" }),
    b(14, 17, 2, 1, "brick", { tone: "tang" }),
    b(16, 17, 2, 1, "window"),
    b(18, 17, 2, 1, "brick", { tone: "tang" }),
    ...row(16, 6, 20, 2, "brick", { tone: "berry" }),
    ...row(15, 6, 20, 2, "brick", { tone: "tang" }),
    b(6, 14, 2, 1, "brick", { tone: "berry" }),
    b(8, 14, 2, 1, "window"),
    b(10, 14, 2, 1, "brick", { tone: "berry", gift: "sticky" }),
    b(12, 14, 2, 1, "window"),
    b(14, 14, 2, 1, "brick", { tone: "berry" }),
    b(16, 14, 2, 1, "window"),
    b(18, 14, 2, 1, "brick", { tone: "berry" }),
    ...row(13, 6, 20, 2, "brick", { tone: "tang" }),
    b(8, 12, 2, 1, "window"),
    ...row(12, 5, 7, 2, "roof", { tone: "berry" }),
    ...row(12, 10, 20, 2, "roof", { tone: "berry" }),
    ...row(11, 7, 19, 2, "roof", { tone: "berry" }),
    ...row(10, 9, 17, 2, "roof", { tone: "berry" }),
    b(11, 9, 2, 1, "roof", { tone: "berry", gift: "wide" }),
    b(13, 9, 2, 1, "roof", { tone: "berry" }),
];

const TOYS: BlockSpec[] = [
    ...rock(10, 19, 6, "pad"),
    ...[9, 11, 13, 15].map((x, i) =>
        b(x, 17, 2, 2, "toy", {
            tone: (["sky", "berry", "mint", "tang"] as const)[i],
            n: [3, 1, 2, 4][i],
        }),
    ),
    ...[10, 12, 14].map((x, i) =>
        b(x, 15, 2, 2, "toy", { tone: (["glow", "sky", "berry"] as const)[i], n: [2, 5, 1][i] }),
    ),
    ...[11, 13].map((x, i) =>
        b(x, 13, 2, 2, "toy", { tone: (["mint", "tang"] as const)[i], n: [3, 2][i] }),
    ),
    b(12, 11, 2, 2, "toy", { tone: "sky", n: 4 }),
    ...[6, 17].map((x, i) =>
        b(x, 17, 3, 2, "toy", { tone: (["berry", "mint"] as const)[i], n: [1, 5][i] }),
    ),
];

const leaf = (x: number, y: number): BlockSpec => b(x, y, 2, 2, "leaf");
const apple = (x: number, y: number, n: number): BlockSpec =>
    b(x, y, 2, 2, "apple", { tone: "berry", n });

const TREE: BlockSpec[] = [
    ...rock(11, 22, 4),
    b(12, 19, 2, 3, "trunk"),
    b(12, 17, 2, 2, "trunk"),
    leaf(8, 15),
    apple(10, 15, 3),
    leaf(12, 15),
    apple(14, 15, 6),
    leaf(16, 15),
    apple(7, 13, 8),
    leaf(9, 13),
    leaf(11, 13),
    apple(13, 13, 5),
    leaf(15, 13),
    apple(17, 13, 1),
    leaf(8, 11),
    apple(10, 11, 2),
    leaf(12, 11),
    b(14, 11, 2, 2, "leaf", { gift: "ball" }),
    apple(16, 11, 7),
    apple(10, 9, 9),
    leaf(12, 9),
    apple(14, 9, 4),
];

const CASTLE: BlockSpec[] = [
    ...rock(9, 21, 8),
    ...row(20, 5, 21, 2, "stone", { hits: 2 }),
    b(5, 19, 2, 1, "stone"),
    b(7, 19, 1, 1, "window"),
    b(8, 19, 2, 1, "stone"),
    b(10, 19, 1, 1, "window"),
    b(11, 19, 4, 1, "door"),
    b(15, 19, 1, 1, "window"),
    b(16, 19, 2, 1, "stone"),
    b(18, 19, 1, 1, "window"),
    b(19, 19, 2, 1, "stone"),
    b(5, 18, 2, 1, "stone"),
    b(7, 18, 4, 1, "stone", { gift: "wide" }),
    b(15, 18, 4, 1, "stone"),
    b(19, 18, 2, 1, "stone"),
    ...row(17, 5, 21, 2, "stone"),
    b(5, 16, 1, 1, "window"),
    b(6, 16, 2, 1, "stone"),
    b(8, 16, 1, 1, "window"),
    b(9, 16, 2, 1, "stone", { hits: 2 }),
    b(11, 16, 4, 1, "stone"),
    b(15, 16, 2, 1, "stone", { hits: 2 }),
    b(17, 16, 1, 1, "window"),
    b(18, 16, 2, 1, "stone"),
    b(20, 16, 1, 1, "window"),
    ...row(15, 5, 9, 2, "stone"),
    ...row(15, 17, 21, 2, "stone"),
    b(5, 14, 1, 1, "window"),
    b(6, 14, 2, 1, "stone"),
    b(8, 14, 1, 1, "window"),
    b(17, 14, 1, 1, "window"),
    b(18, 14, 2, 1, "stone"),
    b(20, 14, 1, 1, "window"),
    ...row(13, 5, 9, 2, "stone"),
    ...row(13, 17, 21, 2, "stone"),
    b(5, 12, 1, 1, "stone"),
    b(7, 12, 1, 1, "stone"),
    b(17, 12, 1, 1, "stone"),
    b(19, 12, 1, 1, "stone"),
    b(9, 15, 8, 1, "roof", { tone: "berry" }),
    b(11, 14, 4, 1, "roof", { tone: "berry", gift: "sticky" }),
];

const branch = (x: number, y: number, n = 0, more: Partial<BlockSpec> = {}): BlockSpec =>
    b(x, y, 2, 1, "snow", { ...(n ? { n } : {}), ...more });

/** A fir in the snow: every numbered branch grows from the trunk, so none falls before its turn. */
const FIR: BlockSpec[] = [
    ...rock(11, 22, 4),
    b(12, 19, 2, 3, "trunk"),
    b(12, 16, 2, 3, "trunk"),
    b(12, 13, 2, 3, "trunk"),
    b(12, 10, 2, 3, "trunk"),
    b(12, 8, 2, 2, "trunk"),
    ...[19, 16, 13, 10].flatMap((y, i) => [
        b(10, y, 2, 2, "snow", { n: [7, 4, 6, 2][i] }),
        b(14, y, 2, 2, "snow", { n: [5, 8, 3, 10][i] }),
    ]),
    branch(8, 20),
    branch(6, 20),
    branch(16, 20),
    branch(18, 20),
    branch(8, 17),
    branch(16, 17, 0, { gift: "wide" }),
    branch(8, 14),
    branch(16, 14),
    branch(12, 7),
];

const metal = (x: number, y: number, w: number, h: number, star?: number): BlockSpec =>
    b(x, y, w, h, "metal", { tone: "sky", ...(star !== undefined ? { gift: "star", star } : {}) });

const ROCKET: BlockSpec[] = [
    ...rock(10, 23, 6, "pad"),
    b(9, 21, 2, 2, "metal", { tone: "berry" }),
    b(15, 21, 2, 2, "metal", { tone: "berry" }),
    metal(11, 21, 2, 2, 3),
    metal(13, 21, 2, 2, 1),
    metal(11, 19, 2, 2, 2),
    metal(13, 19, 2, 2),
    metal(11, 17, 4, 2, 4),
    b(12, 15, 2, 2, "window"),
    metal(11, 15, 1, 2, 1),
    metal(14, 15, 1, 2, 5),
    metal(11, 13, 2, 2, 2),
    metal(13, 13, 2, 2, 1),
    metal(11, 11, 4, 2, 3),
    metal(12, 9, 2, 2, 2),
    b(12, 8, 2, 1, "metal", { tone: "berry", gift: "ball" }),
    b(8, 19, 3, 2, "metal", { tone: "berry" }),
    b(15, 19, 3, 2, "metal", { tone: "berry" }),
];

const sail = (x: number, y: number, n: number, tone: Tone = "glow"): BlockSpec =>
    b(x, y, 3, 2, "sail", { tone, n });

const SHIP: BlockSpec[] = [
    b(12, 19, 2, 3, "mast"),
    b(12, 16, 2, 3, "mast"),
    b(12, 13, 2, 3, "mast"),
    ...row(22, 6, 20, 2, "plank", { hits: 2 }),
    ...row(21, 4, 12, 2, "plank"),
    ...row(21, 14, 22, 2, "plank"),
    b(4, 20, 2, 1, "plank"),
    b(20, 20, 2, 1, "plank", { gift: "sticky" }),
    ...row(23, 8, 18, 2, "plank"),
    // the sails hang from the mast in rows with air between, so every one can be reached
    sail(6, 17, 9, "sky"),
    sail(9, 17, 4),
    sail(14, 17, 6, "sky"),
    sail(17, 17, 8),
    sail(6, 14, 10),
    sail(9, 14, 12, "sky"),
    sail(14, 14, 16),
    sail(17, 14, 20, "sky"),
    b(12, 11, 2, 2, "sail", { tone: "berry", n: 3 }),
];

const BIG_HOUSE: BlockSpec[] = [
    ...rock(9, 20, 8),
    ...row(19, 5, 21, 2, "brick", { tone: "berry" }),
    b(5, 17, 2, 1, "brick", { tone: "tang" }),
    b(5, 18, 2, 1, "brick", { tone: "berry" }),
    b(7, 17, 2, 2, "window", { n: 5 }),
    b(9, 17, 2, 1, "brick", { tone: "tang" }),
    b(9, 18, 2, 1, "brick", { tone: "berry" }),
    b(11, 17, 4, 2, "door"),
    b(15, 17, 2, 1, "brick", { tone: "tang" }),
    b(15, 18, 2, 1, "brick", { tone: "berry" }),
    b(17, 17, 2, 2, "window", { n: 20 }),
    b(19, 17, 2, 1, "brick", { tone: "tang" }),
    b(19, 18, 2, 1, "brick", { tone: "berry" }),
    ...row(16, 5, 21, 2, "brick", { tone: "tang" }),
    b(5, 14, 2, 2, "window", { n: 15 }),
    b(7, 14, 2, 1, "brick", { tone: "berry" }),
    b(7, 15, 2, 1, "brick", { tone: "tang" }),
    b(9, 14, 2, 2, "window", { n: 10 }),
    b(11, 14, 4, 1, "brick", { tone: "berry" }),
    b(11, 15, 4, 1, "brick", { tone: "tang", gift: "wide" }),
    b(15, 14, 2, 2, "window", { n: 25 }),
    b(17, 14, 2, 1, "brick", { tone: "berry" }),
    b(17, 15, 2, 1, "brick", { tone: "tang" }),
    b(19, 14, 2, 2, "window", { n: 30 }),
    ...row(13, 5, 11, 2, "brick", { tone: "berry" }),
    b(11, 13, 4, 1, "brick", { tone: "berry", gift: "ball" }),
    ...row(13, 15, 21, 2, "brick", { tone: "berry" }),
    ...row(12, 4, 22, 2, "roof", { tone: "tang" }),
    ...row(11, 6, 20, 2, "roof", { tone: "tang" }),
    b(8, 10, 2, 1, "roof", { tone: "tang" }),
    b(10, 10, 2, 1, "roof", { tone: "tang" }),
    b(14, 10, 2, 1, "roof", { tone: "tang" }),
    b(16, 10, 2, 1, "roof", { tone: "tang" }),
    b(12, 9, 2, 2, "window", { n: 10 }),
    b(11, 8, 4, 1, "roof", { tone: "tang" }),
];

const PARTY: BlockSpec[] = [
    ...rock(10, 20, 6, "pad"),
    ...row(18, 6, 20, 2, "toy", { tone: "sky" }, [1, 2, 3, 4, 5, 6, 7]),
    ...row(16, 7, 19, 2, "toy", { tone: "berry" }, [8, 9, 1, 2, 3, 4]),
    ...row(14, 8, 18, 2, "toy", { tone: "mint" }, [5, 6, 7, 8, 9]),
    ...row(12, 9, 17, 2, "toy", { tone: "tang" }, [3, 6, 9, 2]),
    b(10, 10, 2, 2, "toy", { tone: "glow", gift: "ball" }),
    b(12, 10, 2, 2, "toy", { tone: "glow", gift: "wide" }),
    b(14, 10, 2, 2, "toy", { tone: "glow", gift: "sticky" }),
].map((p) => (p.look === "toy" && p.y < 20 ? { ...p, h: 2 } : p));

export const KNOCK_LEVELS: Levels<KnockLevel> = [
    {
        title: "The little house",
        goal: "Knock down 8 blocks.",
        prompt: "Slide the tray under the ball to send it back up: drag, or use the arrows. Where it lands on the tray sets where it goes. Tap, or press space, to serve. Knock down 8 blocks.",
        grades: [1, 1],
        place: "meadow",
        blocks: lift(HOUSE),
        ask: { kind: "count", n: 8 },
        balls: 5,
        preview: 2,
        speed: [10, 13],
        tray: 3.4,
    },
    {
        title: "The town house",
        goal: "Knock out 4 windows.",
        prompt: "Knock out 4 windows. Bricks break too, but only the windows count, and once you have 4 the rest stay.",
        grades: [1, 1],
        place: "street",
        blocks: lift(TOWN),
        ask: { kind: "count", n: 4, look: "window" },
        balls: 4,
        preview: 1,
        speed: [10.5, 14],
        tray: 3.2,
    },
    {
        title: "The toy tower",
        goal: "Make exactly 10.",
        prompt: "Knock down blocks that make exactly 10. A block that would take the total past 10 does not break.",
        grades: [1, 2],
        place: "playroom",
        blocks: lift(TOYS, 6),
        ask: { kind: "sum", total: 10 },
        balls: 3,
        preview: 0,
        speed: [12, 15],
        tray: 2.6,
    },
    {
        title: "The apple tree",
        goal: "Knock down every even apple.",
        prompt: "Knock down every apple with an even number. The leaves break, and an odd apple does not.",
        grades: [2, 2],
        place: "orchard",
        blocks: lift(TREE, 3),
        ask: { kind: "multiples", of: 2 },
        balls: 4,
        preview: 0,
        speed: [11.5, 15],
        tray: 3,
    },
    {
        title: "The castle",
        goal: "Knock out half of the 12 windows.",
        prompt: "The castle has 12 windows. Knock out half of them. Once you have half, the rest stay.",
        grades: [2, 3],
        place: "castle",
        blocks: lift(CASTLE, 2),
        ask: { kind: "count", n: 6, look: "window", of: 12 },
        balls: 4,
        preview: 0,
        speed: [12, 15.5],
        tray: 2.9,
    },
    {
        title: "The snowy fir",
        goal: "Knock down 2, 4, 6, 8 and 10 in order.",
        prompt: "Count by twos: knock down 2, then 4, 6, 8 and 10. A number out of turn does not break.",
        grades: [2, 3],
        place: "snow",
        blocks: lift(FIR, 3),
        ask: { kind: "order", seq: [2, 4, 6, 8, 10] },
        balls: 4,
        preview: 0,
        speed: [12, 15.5],
        tray: 2.9,
    },
    {
        title: "The rocket",
        goal: "Catch stars that make exactly 15.",
        prompt: "Some panels drop a star when they break. Catch stars that make exactly 15. A star that would go past 15 does not count.",
        grades: [3, 3],
        place: "space",
        blocks: lift(ROCKET, 4),
        ask: { kind: "stars", total: 15 },
        balls: 4,
        preview: 0,
        speed: [12.5, 16],
        tray: 2.9,
    },
    {
        title: "The pirate ship",
        goal: "Knock down every multiple of 4.",
        prompt: "Knock down every sail in the 4 times table. The other sails do not break, and the hull takes two hits.",
        grades: [3, 4],
        place: "sea",
        blocks: lift(SHIP, 3),
        ask: { kind: "multiples", of: 4 },
        balls: 4,
        preview: 0,
        speed: [13, 16.5],
        tray: 2.8,
    },
    {
        title: "The big house",
        goal: "Make exactly 50.",
        prompt: "Knock out windows that make exactly 50. A window that would take the total past 50 does not break.",
        grades: [3, 4],
        place: "street",
        blocks: lift(BIG_HOUSE, 1),
        ask: { kind: "sum", total: 50 },
        balls: 4,
        preview: 0,
        speed: [13, 17],
        tray: 2.8,
    },
    {
        title: "Block party",
        goal: "Play for the best score.",
        prompt: "Every block adds its number, and a caught star adds 5. Five balls: play for your best score.",
        grades: [1, 4],
        place: "paper",
        blocks: lift(PARTY, 1),
        ask: { kind: "free" },
        balls: 5,
        preview: 0,
        speed: [11, 16],
        tray: 3,
    },
];

const KNOCK = {
    trayTop: knob(26, 14, 40, 1, "squares a second", "the tray's top speed on a held arrow"),
    trayPush: knob(
        5,
        2,
        12,
        0.5,
        "per second",
        "how quickly a held arrow brings the tray to its top speed",
    ),
    follow: knob(
        16,
        6,
        30,
        1,
        "per second",
        "how closely the tray follows a finger: higher is tighter, lower is smoother",
    ),
};

/** Squares a second a dropped gift falls at, and a broken piece's gravity. */
const GIFT_FALL = 4,
    GRAVITY = 30;
/** Seconds a wider tray lasts, how much wider it is, and how many catches a sticky one holds. */
const WIDE_FOR = 14,
    WIDER = 1.45,
    STICKY = 3;

const blockId = (i: number) => `b${i}`;
const indexOf = (id: string) => Number(id.slice(1));

export interface Gift {
    id: string;
    kind: GiftKind;
    n: number;
    x: number;
    y: number;
}

type Stage = "serve" | "play" | "cheer";

export interface KnockState {
    phase: number;
    L: KnockLevel;
    boxes: Box[];
    /** Hits each block has left, the blocks gone, the pieces falling, and when each was last struck or greyed, in steps. */
    hp: Record<string, number>;
    off: Record<string, true>;
    falls: Fall[];
    struck: Record<string, number>;
    greyed: Record<string, number>;
    balls: Ball[];
    tray: Tray;
    /** Where on the tray a ball waits to be served, as a share of half its length, or null when none waits. */
    held: number | null;
    stage: Stage;
    /** Balls left to serve, not counting one on the tray or in play. */
    left: number;
    speed: number;
    wide: number;
    sticky: number;
    gifts: Gift[];
    /** What has counted, in order, the sum of a sum, and the next of an order. */
    parts: number[];
    sum: number;
    next: number;
    /** Breaks in a row without the ball touching the tray, for the chime that climbs. */
    combo: number;
    /** Every bounce so far, and every catch on the tray: a pilot reads these to know when the ball's way has changed. */
    bounces: number;
    catches: number;
    score: number;
    best: number;
    /** How long an arrow has been held, in steps, where the mouse last rested, and where Pip runs. */
    hold: number;
    hover: Pt | null;
    pip: number;
    steps: number;
    wait: number;
    won: boolean;
    end: "won" | "out" | null;
    cheer: number;
    touched: boolean;
    sim: boolean;
    note: string;
}

const specOf = (s: KnockState, id: string): BlockSpec | undefined => s.L.blocks[indexOf(id)];

export function startKnock(L: KnockLevel, phase = 0): KnockState {
    const boxes = L.blocks.map((p, i): Box => ({
        id: blockId(i),
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        ...(FIXED.includes(p.look) ? { fixed: true as const } : {}),
    }));
    const hp: Record<string, number> = {};
    L.blocks.forEach((p, i) => (hp[blockId(i)] = p.hits ?? 1));
    return {
        phase,
        L,
        boxes,
        hp,
        off: {},
        falls: [],
        struck: {},
        greyed: {},
        balls: [],
        tray: { x: F.w / 2, y: TRAY_Y, half: L.tray, v: 0 },
        held: SERVE_OFF,
        stage: "serve",
        left: L.balls - 1,
        speed: L.speed[0],
        wide: 0,
        sticky: 0,
        gifts: [],
        parts: [],
        sum: 0,
        next: 0,
        combo: 0,
        bounces: 0,
        catches: 0,
        score: 0,
        best: 0,
        hold: 0,
        hover: null,
        pip: F.w / 2 - 4,
        steps: 0,
        wait: 0,
        won: false,
        end: null,
        cheer: -999,
        touched: false,
        sim: false,
        note: "",
    };
}

const standing = (s: KnockState): Box[] => s.boxes.filter((x) => !s.off[x.id]);

/** The blocks still to win of an ask that names them: every multiple, or the windows. */
function wantedLeft(s: KnockState): number {
    const a = s.L.ask;
    if (a.kind === "multiples")
        return s.L.blocks.filter(
            (p, i) => (p.n ?? 0) > 0 && (p.n ?? 0) % a.of === 0 && !s.off[blockId(i)],
        ).length;
    return 0;
}

const wantedAll = (L: KnockLevel): number => {
    const a = L.ask;
    return a.kind === "multiples"
        ? L.blocks.filter((p) => (p.n ?? 0) > 0 && (p.n ?? 0) % a.of === 0).length
        : 0;
};

/** How much of the target is met, and of how much. */
export function progressOf(s: KnockState): { completed: number; total: number } {
    const a = s.L.ask;
    switch (a.kind) {
        case "count":
            return { completed: Math.min(a.n, s.parts.length), total: a.n };
        case "sum":
        case "stars":
            return { completed: s.sum, total: a.total };
        case "multiples":
            return { completed: s.parts.length, total: wantedAll(s.L) };
        case "order":
            return { completed: s.next, total: a.seq.length };
        case "free":
            return { completed: 0, total: 1 };
    }
}

function askWords(L: KnockLevel): string {
    const a = L.ask;
    switch (a.kind) {
        case "count":
            return a.look === "window"
                ? a.of
                    ? `Knock out half of the ${a.of} windows`
                    : `Knock out ${a.n} windows`
                : `Knock down ${a.n} blocks`;
        case "sum":
            return `Make exactly ${a.total}`;
        case "multiples":
            return a.of === 2 ? "Every even number" : `Every multiple of ${a.of}`;
        case "order":
            return `In order: ${a.seq.join(", ")}`;
        case "stars":
            return `Catch stars that make ${a.total}`;
        case "free":
            return "Block party";
    }
}

function tallyWords(s: KnockState): string {
    const a = s.L.ask;
    switch (a.kind) {
        case "count":
            return `${s.parts.length} of ${a.n}`;
        case "sum":
        case "stars":
            return s.parts.length > 1 ? `${s.parts.join(" + ")} = ${s.sum}` : `${s.sum} so far`;
        case "multiples":
            return `${s.parts.length} of ${wantedAll(s.L)}${s.parts.length ? `: ${s.parts.join(", ")}` : ""}`;
        case "order":
            return s.next < a.seq.length ? `Next: ${a.seq[s.next] ?? ""}` : "All down";
        case "free":
            return `Score ${s.score} · best ${Math.max(s.best, s.score)}`;
    }
}

/** A rising scale through a run of breaks, as a brick breaker's chime climbs. */
const SCALE = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8];
const climb = (i: number) =>
    (SCALE[i % SCALE.length] ?? 1) * 2 ** Math.min(1, Math.floor(i / SCALE.length)) * 0.8;

type Verdict = { kind: "counts" } | { kind: "free" } | { kind: "no"; why: string };

/** Whether a block counts if it goes now, goes without counting, or stays, and why. */
function verdict(s: KnockState, p: BlockSpec): Verdict {
    const a = s.L.ask,
        n = p.n ?? 0;
    switch (a.kind) {
        case "count":
            if (a.look && p.look !== a.look) return { kind: "free" };
            if (s.parts.length >= a.n)
                return { kind: "no", why: `That makes ${a.n} already, so the rest stay.` };
            return { kind: "counts" };
        case "sum":
            if (n === 0) return { kind: "free" };
            if (s.sum + n > a.total)
                return {
                    kind: "no",
                    why: `${s.sum} + ${n} would make ${s.sum + n}, more than ${a.total}, so the ${n} stays. Still ${s.sum}.`,
                };
            return { kind: "counts" };
        case "multiples":
            if (n === 0) return { kind: "free" };
            if (n % a.of !== 0)
                return {
                    kind: "no",
                    why:
                        a.of === 2
                            ? `${n} is odd, so it stays.`
                            : `${n} is not in the ${a.of} times table, so it stays.`,
                };
            return { kind: "counts" };
        case "order": {
            if (n === 0) return { kind: "free" };
            const want = a.seq[s.next];
            if (n !== want) return { kind: "no", why: `That is ${n}. ${want ?? ""} is next.` };
            return { kind: "counts" };
        }
        case "stars":
            return { kind: "free" };
        case "free":
            return { kind: "counts" };
    }
}

function meet(s: KnockState, words: string, out: Happening[]): void {
    if (s.won) return;
    s.won = true;
    s.note = words;
    s.stage = "cheer";
    s.wait = 0;
    s.held = null;
    // the round is won: what still stands comes down, and the balls are done
    const from = { x: F.w / 2, y: TRAY_Y };
    for (const x of standing(s))
        if (!x.fixed) {
            s.off[x.id] = true;
            s.falls.push(fallOf(x, from, ((indexOf(x.id) % 5) - 2) * 1.2));
        }
    if (s.sim) {
        s.balls = [];
        return;
    }
    for (const m of s.balls)
        out.push({ burst: { kind: "sparkle", x: m.x + FIELD_AT.x, y: m.y + FIELD_AT.y, n: 8 } });
    s.balls = [];
    s.cheer = s.steps;
    out.push(
        { event: { kind: "won" } },
        { cue: "win" },
        { cue: "crash", strength: 0.6 },
        { shake: 0.4 },
    );
}

/** Counts a block gone towards the target, once, and meets it when that is the last. */
function tally(s: KnockState, p: BlockSpec, out: Happening[]): void {
    const a = s.L.ask,
        n = p.n ?? 0;
    switch (a.kind) {
        case "count":
            s.parts.push(n);
            if (s.parts.length >= a.n)
                meet(
                    s,
                    a.look === "window"
                        ? a.of
                            ? `${a.n} of the ${a.of} windows: that is half.`
                            : `${a.n} windows knocked out.`
                        : `${a.n} blocks knocked down.`,
                    out,
                );
            else
                s.note = `${s.parts.length} of ${a.n}${a.of ? `, and half of ${a.of} is ${a.n}` : ""}.`;
            return;
        case "sum": {
            const was = s.sum;
            s.sum += n;
            s.parts.push(n);
            if (s.sum === a.total)
                meet(s, `${s.parts.join(" + ")} = ${a.total}. That makes exactly ${a.total}.`, out);
            else s.note = `${was} + ${n} = ${s.sum}. ${a.total - s.sum} more.`;
            return;
        }
        case "multiples": {
            s.parts.push(n);
            const left = wantedLeft(s);
            if (left === 0)
                meet(
                    s,
                    `${[...s.parts].sort((x, y) => x - y).join(", ")}: every ${a.of === 2 ? "even number" : `multiple of ${a.of}`} is down.`,
                    out,
                );
            else s.note = `${n} is ${n / a.of} times ${a.of}. ${left} more to go.`;
            return;
        }
        case "order":
            s.parts.push(n);
            s.next++;
            if (s.next >= a.seq.length) meet(s, `${a.seq.join(", ")}: all down in order.`, out);
            else s.note = `${n} is down. ${a.seq[s.next] ?? ""} is next.`;
            return;
        case "stars":
            return;
        case "free":
            s.score += Math.max(1, n);
            s.best = Math.max(s.best, s.score);
            s.note = `+${Math.max(1, n)}`;
            return;
    }
}

/** Takes a block out of the structure: it counts if it would, drops its gift, and lets fall what it held up. */
function remove(s: KnockState, id: string, out: Happening[], fell: boolean): void {
    if (s.off[id]) return;
    const p = specOf(s, id),
        box = s.boxes[indexOf(id)];
    if (!p || !box) return;
    s.off[id] = true;
    const v = verdict(s, p);
    // a sum counts only what the ball breaks, so a piece coming down never spoils a total
    if (v.kind === "counts" && fell && s.L.ask.kind === "sum") {
        if (!s.sim) s.note = `The ${p.n ?? 0} fell, so it does not count. Still ${s.sum}.`;
    } else if (v.kind === "counts") tally(s, p, out);
    if (p.gift)
        s.gifts.push({
            id: `g${indexOf(id)}`,
            kind: p.gift,
            n: p.star ?? 0,
            x: box.x + box.w / 2,
            y: box.y + box.h / 2,
        });
    if (!s.sim && !fell) {
        out.push(
            { cue: "ring", pitch: climb(s.combo), strength: v.kind === "counts" ? 0.6 : 0.35 },
            {
                burst: {
                    kind: v.kind === "counts" ? "sparkle" : "dust",
                    x: box.x + box.w / 2 + FIELD_AT.x,
                    y: box.y + box.h / 2 + FIELD_AT.y,
                    n: v.kind === "counts" ? 7 : 4,
                },
            },
        );
        s.combo++;
    }
    if (!fell) collapse(s, { x: box.x + box.w / 2, y: box.y + box.h / 2 }, out);
}

/** Whatever no longer stands on anything fixed comes away and falls, counting as it goes if it would. */
function collapse(s: KnockState, from: Pt, out: Happening[]): void {
    if (s.won) return;
    const loose = unheld(standing(s));
    if (!loose.length) return;
    for (const x of loose) {
        s.falls.push(fallOf(x, from, ((indexOf(x.id) % 5) - 2) * 1.4));
        remove(s, x.id, out, true);
        if (s.won) break;
    }
    if (!s.sim)
        out.push(
            { cue: "crash", strength: Math.min(0.7, 0.25 + loose.length * 0.05), pitch: 0.7 },
            ...(loose.length > 3 ? [{ shake: Math.min(0.5, loose.length * 0.04) }] : []),
        );
}

/** What the ball does to a block it meets: breaks it, cracks it, or bounces off one that stays. */
function hitBlock(s: KnockState, id: string, speed: number, out: Happening[]): void {
    const p = specOf(s, id);
    if (!p || s.off[id]) return;
    s.struck[id] = s.steps;
    const clack = () => {
        if (!s.sim)
            out.push({
                cue: "place",
                strength: Math.min(0.6, speed / 26),
                pitch: 0.8 + speed / 40,
            });
    };
    if (FIXED.includes(p.look)) {
        clack();
        return;
    }
    const v = verdict(s, p);
    if (v.kind === "no") {
        s.greyed[id] = s.steps;
        s.note = v.why;
        if (!s.sim) out.push({ cue: "nope", strength: 0.35 });
        return;
    }
    const hp = (s.hp[id] ?? 1) - 1;
    s.hp[id] = hp;
    if (hp > 0) {
        if (!s.sim) out.push({ cue: "creak", strength: 0.5, pitch: 1.3 });
        if (v.kind === "counts") s.note = "Cracked: one more hit.";
        return;
    }
    remove(s, id, out, false);
}

/** A ball lost off the foot: the next waits on the tray, or the round is over. */
function lose(s: KnockState, out: Happening[]): void {
    if (s.won || s.end) return;
    if (s.left > 0) {
        s.left--;
        s.held = SERVE_OFF;
        s.stage = "serve";
        s.combo = 0;
        s.note = `The ball got past the tray. ${s.left + 1} ball${s.left === 0 ? "" : "s"} left: serve when you are ready.`;
        return;
    }
    s.stage = "serve";
    s.held = null;
    if (s.L.ask.kind === "free") {
        s.best = Math.max(s.best, s.score);
        s.note = `You scored ${s.score}. Your best is ${s.best}.`;
        s.won = true;
        s.end = "won";
        if (!s.sim) out.push({ event: { kind: "won" } }, { cue: "win" });
        return;
    }
    s.note = outWords(s);
    s.end = "out";
}

function outWords(s: KnockState): string {
    const a = s.L.ask;
    switch (a.kind) {
        case "count":
            return `Out of balls with ${s.parts.length} of ${a.n}. Again?`;
        case "sum":
        case "stars":
            return `Out of balls at ${s.sum} of ${a.total}. Again?`;
        case "multiples":
            return `Out of balls with ${wantedLeft(s)} still standing. Again?`;
        case "order":
            return `Out of balls with ${a.seq.slice(0, s.next).join(", ") || "none"} down, and ${a.seq[s.next] ?? ""} next. Again?`;
        case "free":
            return `You scored ${s.score}.`;
    }
}

/** Whether `total` can still be made from `nums`, each used once. */
export function canMake(nums: number[], total: number): boolean {
    let can = new Set([0]);
    for (const n of nums) {
        const next = new Set(can);
        for (const v of can) if (v + n <= total) next.add(v + n);
        can = next;
    }
    return can.has(total);
}

/** Whether the target can no longer be met. */
export const deadEnd = (s: KnockState): boolean => stuck(s) !== null;

/** Why the target can no longer be met, or null while it can. */
function stuck(s: KnockState): string | null {
    const a = s.L.ask;
    if (s.won) return null;
    const standingNums = s.L.blocks
        .map((p, i) => (s.off[blockId(i)] ? 0 : (p.n ?? 0)))
        .filter((n) => n > 0);
    switch (a.kind) {
        case "sum":
            return canMake(standingNums, a.total - s.sum)
                ? null
                : `${s.sum} so far, and no blocks left make ${a.total - s.sum}. Again?`;
        case "stars": {
            const stars = [
                ...s.L.blocks.map((p, i) =>
                    s.off[blockId(i)] || p.gift !== "star" ? 0 : (p.star ?? 0),
                ),
                ...s.gifts.filter((g) => g.kind === "star").map((g) => g.n),
            ].filter((n) => n > 0);
            return canMake(stars, a.total - s.sum)
                ? null
                : `${s.sum} so far, and no stars left make ${a.total - s.sum}. Again?`;
        }
        case "order": {
            const want = a.seq[s.next];
            return want === undefined || standingNums.includes(want)
                ? null
                : `${want} fell before its turn, so the count cannot go on. Again?`;
        }
        case "count": {
            if (!a.look) return null;
            const left = s.L.blocks.filter(
                (p, i) => p.look === a.look && !s.off[blockId(i)],
            ).length;
            return s.parts.length + left >= a.n
                ? null
                : `Not enough windows are left to make ${a.n}. Again?`;
        }
        case "multiples":
        case "free":
            return null;
    }
}

/** A caught gift: a star counts or not, a ball joins in, the tray grows or turns sticky. */
function catchGift(s: KnockState, g: Gift, out: Happening[]): void {
    if (!s.sim)
        out.push(
            { cue: "bump", strength: 0.5, pitch: 1.2 },
            { burst: { kind: "sparkle", x: g.x + FIELD_AT.x, y: g.y + FIELD_AT.y, n: 6 } },
        );
    const a = s.L.ask;
    switch (g.kind) {
        case "star":
            if (a.kind === "stars") {
                if (s.sum + g.n > a.total) {
                    s.note = `${s.sum} + ${g.n} would make ${s.sum + g.n}, more than ${a.total}, so that star does not count. Still ${s.sum}.`;
                    return;
                }
                const was = s.sum;
                s.sum += g.n;
                s.parts.push(g.n);
                if (s.sum === a.total)
                    meet(
                        s,
                        `${s.parts.join(" + ")} = ${a.total}. The stars make exactly ${a.total}.`,
                        out,
                    );
                else s.note = `${was} + ${g.n} = ${s.sum}. ${a.total - s.sum} more.`;
            } else if (a.kind === "free") {
                s.score += 5;
                s.best = Math.max(s.best, s.score);
            }
            return;
        case "ball": {
            const v = offTray(-0.55, s.speed, 0);
            s.balls.push({
                x: s.tray.x - s.tray.half * 0.5,
                y: TRAY_Y - FIELD.r,
                vx: v.vx,
                vy: v.vy,
                a: 0,
            });
            if (!s.sim) s.note = "Another ball!";
            return;
        }
        case "wide":
            s.wide = WIDE_FOR;
            if (!s.sim) s.note = "The tray grows wide for a while.";
            return;
        case "sticky":
            s.sticky = STICKY;
            if (!s.sim)
                s.note = `Sticky honey: the next ${STICKY} catches stay on the tray until you serve.`;
            return;
    }
}

function react(
    s: KnockState,
    ball: Ball,
    hits: Strike[],
    out: Happening[],
): "gone" | "held" | null {
    const pan = (x: number) => panOf(x, F.w / 2, F.w);
    let fate: "gone" | "held" | null = null;
    for (const h of hits) {
        if (h.kind !== "gone") s.bounces++;
        switch (h.kind) {
            case "block":
                hitBlock(s, h.id, h.speed, out);
                break;
            case "wall":
                if (h.speed > 2 && !s.sim)
                    out.push({
                        cue: "place",
                        strength: Math.min(0.45, h.speed / 30),
                        pitch: 0.7,
                        pan: pan(h.x),
                    });
                break;
            case "tray": {
                s.combo = 0;
                s.catches++;
                s.speed = Math.min(s.L.speed[1], s.speed + 0.2);
                const now = Math.hypot(ball.vx, ball.vy);
                if (now > 0) {
                    ball.vx *= s.speed / now;
                    ball.vy *= s.speed / now;
                }
                if (!s.sim) out.push({ cue: "place", strength: 0.5, pitch: 0.55, pan: pan(h.x) });
                if (s.sticky > 0 && s.held === null && !s.won) {
                    s.sticky--;
                    s.held = Math.max(-0.9, Math.min(0.9, h.off));
                    fate = "held";
                }
                break;
            }
            case "gone":
                if (!s.sim) out.push({ cue: "back", strength: 0.4, pan: pan(h.x) });
                fate = "gone";
                break;
        }
    }
    return fate;
}

/** One sub-step: the balls move and what they meet happens, the loose pieces fall, and the gifts drop. */
function tick(s: KnockState, out: Happening[], stand: { boxes: Box[]; at: number }): void {
    const gone = Object.keys(s.off).length;
    if (stand.at !== gone) {
        stand.boxes = standing(s);
        stand.at = gone;
    }
    const tray = s.stage === "cheer" ? null : s.tray;
    for (let i = 0; i < s.balls.length; i++) {
        const m = s.balls[i];
        if (!m) continue;
        const fate = react(s, m, stepBall(m, FIELD, stand.boxes, tray, DT), out);
        if (Object.keys(s.off).length !== stand.at) {
            stand.boxes = standing(s);
            stand.at = Object.keys(s.off).length;
        }
        if (fate) {
            s.balls.splice(i, 1);
            i--;
        }
        if (s.won) break;
    }
    for (let i = 0; i < s.falls.length; i++) {
        const f = s.falls[i];
        if (!f) continue;
        stepFall(f, GRAVITY, DT);
        const p = specOf(s, f.id);
        // a piece meets the tray and bounces off it, harmless; one meeting the ground goes
        if (
            !s.won &&
            p &&
            f.vy > 0 &&
            Math.abs(f.x - s.tray.x) < s.tray.half + p.w / 2 &&
            Math.abs(f.y + p.h / 2 - s.tray.y) < 0.4
        ) {
            f.vy = -f.vy * 0.35;
            f.vx += (f.x - s.tray.x) * 0.8;
            if (!s.sim) out.push({ cue: "bump", strength: 0.3, pitch: 0.8 });
        }
        // a piece coming down on what still stands breaks up on it, rather than passing through
        const lands =
            p &&
            f.vy > 0 &&
            stand.boxes.some(
                (o) =>
                    Math.abs(o.x + o.w / 2 - f.x) < (o.w + p.w) / 2 - 0.2 &&
                    Math.abs(o.y + o.h / 2 - f.y) < (o.h + p.h) / 2 - 0.2,
            );
        if (lands || f.y > F.h + 3) {
            s.falls.splice(i, 1);
            i--;
            if (lands && !s.sim)
                out.push({
                    burst: { kind: "dust", x: f.x + FIELD_AT.x, y: f.y + FIELD_AT.y, n: 3 },
                });
        }
    }
    for (let i = 0; i < s.gifts.length; i++) {
        const g = s.gifts[i];
        if (!g) continue;
        const was = g.y;
        g.y += GIFT_FALL * DT;
        g.x += Math.sin(g.y * 1.3) * 0.004;
        if (
            !s.won &&
            was < s.tray.y &&
            g.y >= s.tray.y - 0.2 &&
            Math.abs(g.x - s.tray.x) < s.tray.half + 0.7
        ) {
            s.gifts.splice(i, 1);
            i--;
            catchGift(s, g, out);
        } else if (g.y > F.h + 1) {
            s.gifts.splice(i, 1);
            i--;
        }
    }
}

/** A copy of a round to look ahead on, sharing its level, which never changes. */
export function cloneKnock(s: KnockState): KnockState {
    const { L, ...rest } = s;
    return { ...structuredClone(rest), L, sim: true };
}

/**
 * Runs a copy's sub-steps with its tray held where it is, or taken away when `tray` is false, until `stop`
 * says so or `most` have run, for a look ahead; returns how many ran.
 */
export function fly(
    s: KnockState,
    tray: boolean,
    most: number,
    stop: (s: KnockState) => boolean,
): number {
    if (!tray) s.tray = { ...s.tray, x: -1000 };
    const stand = { boxes: standing(s), at: Object.keys(s.off).length };
    let i = 0;
    for (; i < most && !stop(s); i++) {
        tick(s, [], stand);
        if (i % TICKS === 0) s.steps++;
    }
    return i;
}

/** Where the tray's middle may go: its whole length inside the posts. */
const clampTray = (s: KnockState, x: number) =>
    Math.max(s.tray.half, Math.min(F.w - s.tray.half, x));

/** Serves the ball waiting on the tray, from where it waits. */
function serve(s: KnockState, out: Happening[]): void {
    if (s.held === null || s.end || s.won) return;
    const off = s.held,
        v = offTray(off, s.speed, s.tray.v);
    s.balls.push({
        x: s.tray.x + off * s.tray.half,
        y: TRAY_Y - FIELD.r,
        vx: v.vx,
        vy: v.vy,
        a: 0,
    });
    s.held = null;
    s.stage = "play";
    s.touched = true;
    if (!s.sim) out.push({ cue: "lift", strength: 0.45, pitch: 1.1 });
}

/** Reads the hands: the arrows push the tray, a finger or a resting mouse leads it, and a tap, space or a finger let go serves. */
function handsFrom(s: KnockState, pad: Pad, out: Happening[]): void {
    const dt = 1 / RATE,
        t = s.tray,
        dir =
            pad.holding.includes("left") && pad.holding.includes("right")
                ? pad.held === "left"
                    ? -1
                    : 1
                : pad.holding.includes("left")
                  ? -1
                  : pad.holding.includes("right")
                    ? 1
                    : 0;
    let lead: number | null = null;
    if (
        pad.hover &&
        (!s.hover || Math.hypot(pad.hover.x - s.hover.x, pad.hover.y - s.hover.y) > 0.05)
    ) {
        s.hover = { ...pad.hover };
        lead = pad.hover.x - FIELD_AT.x;
    } else if (s.hover && !pad.touch && !dir) lead = s.hover.x - FIELD_AT.x;
    if (pad.touch) lead = pad.touch.x - FIELD_AT.x;
    if (pad.lifted) lead = pad.lifted.x - FIELD_AT.x;
    if (dir !== 0) {
        s.hover = null;
        s.hold++;
        const top = KNOCK.trayTop.value;
        t.v += (dir * top - t.v) * (1 - Math.exp(-KNOCK.trayPush.value * dt));
        // a fresh press moves the tray a little at once, so a tap is a fine step
        if (pad.pressed.some((d) => d === "left" || d === "right")) t.x += dir * 0.35;
    } else if (lead !== null) {
        s.hold = 0;
        const want = clampTray(s, lead);
        t.v = Math.max(-45, Math.min(45, (want - t.x) * KNOCK.follow.value));
    } else {
        s.hold = 0;
        t.v *= Math.exp(-25 * dt);
        if (Math.abs(t.v) < 0.05) t.v = 0;
    }
    t.x = clampTray(s, t.x + t.v * dt);
    if (t.x <= t.half + 1e-9 || t.x >= F.w - t.half - 1e-9) t.v = 0;
    if (pad.tapped || pad.lifted) serve(s, out);
}

function stepKnock(s: KnockState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (s.end) return out;
    if (pad.touch || pad.holding.length || pad.tapped || pad.lifted) s.touched = true;
    if (s.stage !== "cheer") handsFrom(s, pad, out);
    // a wide tray grows and shrinks smoothly rather than jumping
    s.wide = Math.max(0, s.wide - 1 / RATE);
    const want = s.L.tray * (s.wide > 0 ? WIDER : 1);
    s.tray.half += (want - s.tray.half) * (1 - Math.exp(-8 / RATE));
    s.tray.x = clampTray(s, s.tray.x);
    const stand = { boxes: standing(s), at: Object.keys(s.off).length };
    for (let i = 0; i < TICKS; i++) {
        tick(s, out, stand);
        if (s.end) break;
    }
    s.pip += (s.tray.x - 4.5 - s.pip) * (1 - Math.exp(-3 / RATE));
    if (s.stage === "play" && !s.balls.length && s.held === null && !s.won) lose(s, out);
    if (s.stage === "play" && s.held !== null && !s.balls.length) s.stage = "serve";
    if (!s.end && !s.won) {
        const why = stuck(s);
        if (why) {
            s.note = why;
            s.end = "out";
            s.balls = [];
        }
    }
    if (s.stage === "cheer" && ++s.wait > RATE * 1.6) s.end = "won";
    return out;
}

/** The lead ball's way from where it is, or from the tray as it would be served now, by the game's own sub-step: back down to the tray's line, or to the first thing it meets. */
export function guideOf(s: KnockState): Pt[] {
    if (s.L.preview === 0 || s.end || s.won) return [];
    const sim = cloneKnock(s);
    if (sim.held !== null) serve(sim, []);
    const lead = sim.balls[0];
    if (!lead) return [];
    // the tray is taken away, so the way runs to its line
    sim.tray = { ...sim.tray, x: -1000 };
    const pts: Pt[] = [{ x: lead.x, y: lead.y }],
        stand = { boxes: standing(sim), at: Object.keys(sim.off).length };
    let gone = 0,
        laid = 0;
    for (let i = 0; i < SUB * 4; i++) {
        const was = { x: lead.x, y: lead.y, vx: lead.vx, vy: lead.vy };
        tick(sim, [], stand);
        if (!sim.balls.includes(lead)) break;
        gone += Math.hypot(lead.x - was.x, lead.y - was.y);
        const bounced =
            Math.sign(lead.vx) !== Math.sign(was.vx) || Math.sign(lead.vy) !== Math.sign(was.vy);
        // a dot where it bounces, so the dots turn the corner where the ball does
        if (gone - laid > 0.6 || bounced) {
            laid = gone;
            pts.push({ x: lead.x, y: lead.y });
        }
        if (s.L.preview === 1 && bounced) break;
        if (lead.vy > 0 && lead.y + FIELD.r >= TRAY_Y) break;
    }
    pts.push({ x: lead.x, y: lead.y });
    return pts;
}

const recent = (at: number | undefined, now: number, within: number) =>
    at !== undefined && now - at < within;

/** What stands either side of the frame in each place, from the shelf. */
function scenery(place: Place): Sprite[] {
    const left = FRAME_AT.x,
        right = FRAME_AT.x + KNOCKFRAME.w,
        put = (
            key: string,
            art: string,
            params: Record<string, unknown>,
            x: number,
            size: number,
        ): Sprite => ({
            key,
            art,
            params,
            x,
            y: GROUND,
            size,
            stand: true,
            z: 0,
            still: true,
        }),
        sky = (
            key: string,
            art: string,
            params: Record<string, unknown>,
            x: number,
            y: number,
            size: number,
        ): Sprite => ({
            key,
            art,
            params,
            x,
            y,
            size,
            z: 0,
            still: true,
        });
    switch (place) {
        case "meadow":
        case "orchard":
            return [
                put(
                    "tree:0",
                    "tree",
                    { fruit: place === "orchard" ? 5 : 0, fallen: 0, item: "apple" },
                    left - 8,
                    11,
                ),
                put(
                    "tree:1",
                    "tree",
                    { fruit: place === "orchard" ? 3 : 0, fallen: 1, item: "apple" },
                    right + 13,
                    10,
                ),
                put("hedge", "hedge", { clumps: 4, berries: 2, gap: 0 }, left - 20, 9),
                put("flowers:0", "flowers", { count: 3, petals: 5 }, right + 4, 4),
                sky("cloud:0", "cloud", { puffs: 4, rain: 0 }, left - 12, 8, 7),
                sky("cloud:1", "cloud", { puffs: 3, rain: 0 }, right + 16, 5, 6),
            ];
        case "street":
            return [
                put("houses:0", "houses", { count: 2, windows: 2 }, left - 10, 11),
                put("houses:1", "houses", { count: 2, windows: 1 }, right + 11, 11),
                sky("cloud:0", "cloud", { puffs: 4, rain: 0 }, left - 14, 6, 7),
            ];
        case "playroom":
            return [
                put("blocks", "blocks", {}, left - 6, 5),
                put("jar", "sweetjar", { count: 10, color: "berry" }, right + 6, 6),
                put("balloons", "balloons", { count: 3 }, left - 16, 7),
            ];
        case "castle":
            return [
                put("tower", "tower", { courses: 8, flag: 1 }, left - 8, 8),
                put("tree", "tree", { fruit: 0, fallen: 0, item: "apple" }, right + 12, 10),
                sky("cloud", "cloud", { puffs: 4, rain: 0 }, right + 16, 6, 7),
            ];
        case "snow":
            return [
                put("snowman", "snowman", { buttons: 3, hat: 1 }, left - 8, 6),
                put("tree", "tree", { fruit: 0, fallen: 0, item: "apple" }, right + 12, 10),
            ];
        case "space":
            return [
                sky("moon", "moon", { phase: 0.5 }, left - 10, 8, 6),
                put("rocket", "rocket", { flame: 0 }, right + 10, 5),
            ];
        case "sea":
            return [
                put("lighthouse", "lighthouse", { stripes: 3, beam: 1 }, left - 9, 14),
                put("palms", "palms", { count: 2, coconuts: 3 }, right + 13, 12),
            ];
        case "paper":
            return [put("balloons", "balloons", { count: 4 }, right + 8, 7)];
    }
}

function knockFrame(s: KnockState, rest = false): Frame {
    const L = s.L,
        sprites: Sprite[] = scenery(L.place),
        marks: Mark[] = [],
        w = (p: Pt): Pt => ({ x: p.x + FIELD_AT.x, y: p.y + FIELD_AT.y });
    const cheering = s.stage === "cheer" || s.end === "won" || recent(s.cheer, s.steps, RATE * 1.4),
        trayAt = w({ x: s.tray.x, y: TRAY_Y });
    sprites.push(
        {
            key: "frame",
            art: "knockframe",
            params: { place: L.place },
            x: FRAME_AT.x + KNOCKFRAME.w / 2,
            y: FRAME_AT.y + KNOCKFRAME.h / 2,
            size: KNOCKFRAME.w,
            z: 1,
            still: true,
        },
        {
            key: "charlie",
            art: "charlie",
            params: {
                pose: cheering ? "cheer" : "shoot",
                mood: cheering ? "excited" : s.end === "out" ? "calm" : "happy",
                hair: "ponytail",
                top: "berry",
                sleeves: "short",
                print: "heart",
                wear: "shorts",
                bottom: "sky",
            },
            x: trayAt.x,
            y: GROUND,
            size: 4.6,
            stand: true,
            flip: s.tray.v < -1,
            z: 7,
            live: true,
            seed: 5,
        },
        {
            key: "pip",
            art: "pupfamily",
            params: {
                member: "pip",
                pose: cheering ? "cheer" : Math.abs(s.tray.x - 4.5 - s.pip) > 0.6 ? "walk" : "sit",
                mood: cheering ? "excited" : "happy",
                dir: s.tray.x - 4.5 > s.pip ? 1 : -1,
                gear: "none",
            },
            x: s.pip + FIELD_AT.x,
            y: GROUND,
            size: 3,
            stand: true,
            z: 6,
            live: true,
        },
        {
            key: "tray",
            art: "knocktray",
            params: { w: Math.round(s.tray.half * 2), sticky: s.sticky > 0, wide: s.wide > 0 },
            x: trayAt.x,
            y: trayAt.y + 0.32,
            size: s.tray.half * 2,
            z: 8,
            ...(s.wide > 0 ? { glow: 1.2 } : {}),
        },
        {
            key: "balls",
            art: "marbletray",
            params: { count: Math.min(10, s.left + (s.held !== null ? 1 : 0)) },
            x: FRAME_AT.x + KNOCKFRAME.sign.x + 4.6,
            y: FRAME_AT.y + KNOCKFRAME.sign.y + 2.35,
            size: 6,
            z: 4,
        },
    );
    marks.push(
        {
            kind: "word",
            x: FRAME_AT.x + KNOCKFRAME.w / 2,
            y: FRAME_AT.y + KNOCKFRAME.sign.y + 1.3,
            text: askWords(L),
            size: 0.9,
        },
        {
            kind: "word",
            x: FRAME_AT.x + KNOCKFRAME.w / 2 + 3.3,
            y: FRAME_AT.y + KNOCKFRAME.sign.y + 2.5,
            text: tallyWords(s),
            size: 0.75,
        },
    );
    s.boxes.forEach((box, i) => {
        const p = L.blocks[i];
        if (!p || s.off[box.id]) return;
        const flash = recent(s.struck[box.id], s.steps, 6),
            grey = recent(s.greyed[box.id], s.steps, 40);
        sprites.push({
            key: `block:${i}`,
            art: "knockblock",
            params: {
                look: p.look,
                tone: p.tone ?? "berry",
                n: p.n ?? 0,
                state: grey ? "grey" : (s.hp[box.id] ?? 1) < (p.hits ?? 1) ? "cracked" : "whole",
                w: p.w,
                h: p.h,
            },
            ...w({ x: box.x + box.w / 2, y: box.y + box.h / 2 }),
            size: p.w,
            z: 5,
            ...(flash && !rest ? { scale: 1.06 } : {}),
        });
    });
    for (const f of s.falls) {
        const p = specOf(s, f.id);
        if (!p) continue;
        sprites.push({
            key: `block:${indexOf(f.id)}`,
            art: "knockblock",
            params: {
                look: p.look,
                tone: p.tone ?? "berry",
                n: p.n ?? 0,
                state: "whole",
                w: p.w,
                h: p.h,
            },
            ...w(f),
            size: p.w,
            angle: f.a,
            z: 5,
            alpha: Math.max(0.3, Math.min(1, (F.h + 3 - f.y) / 4)),
        });
    }
    for (const g of s.gifts)
        sprites.push({
            key: g.id,
            art: "knockgift",
            params: { kind: g.kind, n: g.n },
            ...w(g),
            size: 1.6,
            z: 9,
            glow: 1,
        });
    const ballAt = (key: string, p: Pt, a = 0): Sprite => ({
        key,
        art: "marble",
        params: { tone: "sky" },
        ...w(p),
        size: FIELD.r * 2.2,
        angle: a,
        z: 10,
    });
    if (s.held !== null && !s.end && !s.won)
        sprites.push(ballAt("ball:0", { x: s.tray.x + s.held * s.tray.half, y: TRAY_Y - FIELD.r }));
    s.balls.forEach((m, i) =>
        sprites.push(ballAt(`ball:${i + (s.held !== null ? 1 : 0)}`, m, m.a)),
    );
    if (!rest) {
        const g = guideOf(s);
        if (g.length > 1)
            marks.push({ kind: "dots", pts: g.map(w), faint: s.L.preview < 2, opacity: 0.8 });
    }
    const centre = { x: WORLD.w / 2, y: WORLD.h / 2 };
    return {
        sprites,
        marks,
        camera: centre,
        view: { ...VIEW },
        world: { ...WORLD },
        focus: centre,
        time: rest ? 0 : s.steps / RATE,
    };
}

/** Knock it down's own sounds: a wooden clack, a chime for a break, a crack, a dull tock for a block that stays, the serve, a catch and the fall of a piece. */
const SOUNDS: Kit = {
    place: [
        { wave: "noise", hz: 2200, attack: 0.001, decay: 0.025, gain: 0.2 },
        { wave: "sine", hz: 900, attack: 0.001, decay: 0.04, gain: 0.16 },
    ],
    ring: [
        { wave: "triangle", hz: 784, attack: 0.003, decay: 0.2, gain: 0.3 },
        { wave: "sine", hz: 1568, attack: 0.003, decay: 0.1, gain: 0.1 },
    ],
    creak: [
        { wave: "noise", hz: 1400, attack: 0.001, decay: 0.06, gain: 0.25 },
        { wave: "sine", hz: 260, to: 200, attack: 0.002, decay: 0.08, gain: 0.2 },
    ],
    nope: [{ wave: "sine", hz: 280, to: 220, attack: 0.002, decay: 0.09, gain: 0.25 }],
    bump: [
        { wave: "sine", hz: 160, to: 110, attack: 0.003, decay: 0.12, gain: 0.35 },
        { wave: "triangle", hz: 880, to: 1320, attack: 0.004, decay: 0.12, gain: 0.15 },
    ],
    lift: [{ wave: "triangle", hz: 520, to: 880, attack: 0.004, decay: 0.12, gain: 0.2 }],
    crash: [
        { wave: "noise", hz: 500, attack: 0.01, decay: 0.35, gain: 0.25 },
        { wave: "sine", hz: 120, to: 70, attack: 0.005, decay: 0.3, gain: 0.3 },
    ],
    back: [{ wave: "sine", hz: 330, to: 160, attack: 0.004, decay: 0.3, gain: 0.18 }],
    win: [
        { wave: "triangle", hz: 523, attack: 0.01, decay: 0.25, gain: 0.35 },
        { wave: "triangle", hz: 659, attack: 0.01, decay: 0.25, gain: 0.35, delay: 0.1 },
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.3, gain: 0.35, delay: 0.2 },
        { wave: "triangle", hz: 1047, attack: 0.01, decay: 0.6, gain: 0.38, delay: 0.3 },
    ],
};

function say(s: KnockState): string {
    const where =
        s.held !== null
            ? `The ball waits on the tray, ${Math.round(s.tray.x)} squares from the left. Serve it when you are ready.`
            : s.balls[0]
              ? `The ball is ${Math.round(s.balls[0].x)} across and ${Math.round(s.balls[0].y)} down, and the tray is ${Math.round(s.tray.x)} across.`
              : "";
    const nums = s.L.blocks
        .map((p, i) => ((p.n ?? 0) > 0 && !s.off[blockId(i)] ? `${p.n}` : ""))
        .filter((x) => x !== "")
        .join(", ");
    const balls = s.left + (s.held !== null ? 1 : 0);
    return `${askWords(s.L)}. ${tallyWords(s)}.${nums ? ` Numbers standing: ${nums}.` : ""} ${balls} ball${balls === 1 ? "" : "s"} left. ${where}`.trim();
}

const isBest = (v: unknown): v is { best: number } =>
    typeof v === "object" &&
    v !== null &&
    "best" in v &&
    typeof v.best === "number" &&
    Number.isFinite(v.best) &&
    v.best >= 0;

export const knockGame: ActionGame<KnockState> = {
    id: "knock",
    title: "Knock it down",
    group: "action",
    // the ball, the structure and the tray have to be seen together, 33 squares tall, and a 240 px card shows them at 7 px a square
    card: null,
    portrait: { keep: KNOCKFRAME.w + 1 },
    quiet: true,
    touch: true,
    levels: KNOCK_LEVELS,
    rate: RATE,
    cover: { art: "knockcover", params: { flying: 3 } },
    hint: "Drag to slide the tray under the ball, and let go or tap to serve. With the keys, left and right slide the tray, faster when held, and space serves.",
    controls: {
        arrows: { left: "Slide the tray left", right: "Slide the tray right" },
        go: "Serve",
        icons: { go: "launch" },
    },
    sounds: SOUNDS,
    saves: { level: KNOCK_LEVELS.length - 1 },
    checkpoint: (s) => ({ best: Math.max(s.best, s.score) }),
    restore: (s, v) => {
        if (!isBest(v)) return false;
        s.best = Math.max(s.best, Math.round(v.best));
        return true;
    },
    start: (phase) => startKnock(KNOCK_LEVELS[phase] ?? KNOCK_LEVELS[0], phase),
    step: stepKnock,
    say,
    note: (s) => (!s.touched && !s.end ? s.L.prompt : s.note),
    won: (s) => s.end === "won",
    ended: (s): RoundEnd | null => (s.end ? { won: s.end === "won", words: s.note } : null),
    objectives: progressOf,
    frame: knockFrame,
    cancelInput: (s) => {
        s.hold = 0;
        s.hover = null;
    },
    tuning: KNOCK,
    still: {
        press: () => Math.round(RATE * 0.25),
        settling: (s) => !s.end && (s.falls.length > 0 || s.stage === "cheer"),
    },
};
