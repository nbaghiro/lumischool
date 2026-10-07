// The domino machine: build a chain reaction on the toy-room floor that rings the bell with one push.
//
// Charlie stands by the first thing in the chain: a domino, a ball on a shelf, a weight. The child
// drags parts up from the drawer (a row of dominoes, a ramp, a see-saw, a bag of marbles, a fan),
// stands them on the floor or a shelf, stretches a row longer or shorter by its grip and turns a
// ramp by an end, and presses Go. Charlie gives her push and real physics runs the rest: dominoes
// fall into each other, a ball rolls, a weight flips a see-saw, marbles fill a bucket until it lifts
// its counterweight, a breeze sails a boat. The bell rings or it does not, and pressing Go again puts
// every part back where it was built, to change and run again. The mathematics is in the place:
// dominoes stand two squares apart, so how many fill a gap of fourteen; a weight as heavy as six
// marbles, so how many lift it; a breeze that blows eight squares; a budget of coins. See
// .docs/games.md.
import {
    BALL_R,
    DOMINO,
    FAN,
    LENGTHS,
    MARBLE_R,
    PLANK,
    RATE,
    STAND,
    WEIGHT,
    boxOf,
    fits,
    kick,
    machine,
    settle,
    settled,
    stepMachine,
    type Machine,
    type Part,
    type PartKind,
    type Scene,
} from "../../engine/motion/contraption";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import { panOf, semitones, type Hum, type Kit } from "../../engine/sound/kit";
import type { ActionGame, ActionLevel, Levels } from "./game";

export const W = 48,
    H = 30,
    FLOOR = 24;
/** The drawer along the bottom, under the floor: parts wait there until they are dragged up. */
export const DRAWER = { y0: 25.4, y1: 29.6, slot: 6, first: 4.5, at: 27.6 };
const BELL_Y = FLOOR - 1.1;

/** A part in the drawer: what it is, how many dominoes or marbles it starts with, and whether the child sets that count. */
export interface TrayPart {
    kind: PartKind;
    n?: number;
    /** Set when the grip, or more and fewer, changes how many it holds. */
    counts?: true;
}

export interface MachineLevel extends ActionLevel {
    prompt: string;
    scene: Omit<Scene, "w" | "h" | "floor">;
    /** Parts of the place that belong to it and stay put: Charlie's first domino, a ball on a shelf. */
    fixed: Part[];
    tray: TrayPart[];
    /** A machine that rings the bell, one placement for each tray part in order: the hint drawn faintly, and where a solver starts. */
    plan: (Placement | null)[];
    /** How much is shown: 2 every part's place, faintly; 1 a ramp's or a see-saw's place but not a row's count; 0 nothing. */
    preview: 0 | 1 | 2;
    /** A length the level is about, measured along the floor or a shelf. */
    ruler?: { from: Pt; to: Pt; text: string };
    /** Coins the parts may cost at most. */
    budget?: number;
}

/** Where a plan puts a tray part: its foot or middle, a ramp's slope, a row's or a bag's count. */
export interface Placement {
    x: number;
    y: number;
    angle?: number;
    n?: number;
}

/** What each part costs, on the level that has a budget: a domino a coin each. */
export const PRICE: Record<PartKind, number> = {
    row: 1,
    ramp: 5,
    long: 8,
    seesaw: 6,
    ball: 2,
    weight: 3,
    spring: 4,
    fan: 6,
    bag: 0,
    boat: 0,
};

const dominoes = (x: number, y: number, n: number, id = "start"): Part => ({
    id,
    kind: "row",
    x,
    y,
    angle: 0,
    n,
    locked: true,
});
const locked = (id: string, kind: PartKind, x: number, y: number): Part => ({
    id,
    kind,
    x,
    y,
    angle: 0,
    n: 1,
    locked: true,
});

/** The bell's place for a row whose last domino stands at `last`: a falling domino of 2.6 just reaches it. */
const bellAfter = (last: number): Pt => ({ x: last + 2.6, y: BELL_Y });

const GAP = 2;

/** Level one: Charlie pushes the ball off the shelf, the slide takes it to the floor, and a row of `k` the child counts out carries it to the bell. */
function push(k: number, start = 22): MachineLevel {
    const last = start + (k - 1) * GAP;
    return {
        title: "Down the slide",
        grades: [1, 1],
        goal: `The ball rolls down the slide. Stand ${k} dominoes where it lands, so the last one rings the bell.`,
        prompt: "Drag the row up from the tray to the faint dominoes, then drag its grip, or press more and fewer, until it has as many.",
        // the bell stands on a step one square high, so the ball alone stops against it and only a falling domino reaches the bell
        scene: {
            shelves: [
                { x: 2, y: 13, w: 8, h: 1 },
                { x: last + 1, y: FLOOR - 1, w: 4, h: 1 },
            ],
            bell: { x: last + 2.4, y: FLOOR - 2.1 },
            gap: GAP,
            push: "ball",
        },
        fixed: [
            locked("ball", "ball", 8, 13 - BALL_R),
            { ...locked("slide", "ramp", 13, 18), angle: 0.3 },
        ],
        tray: [{ kind: "row", n: 2, counts: true }],
        plan: [{ x: start, y: FLOOR, n: k }],
        preview: 2,
    };
}

/** Level two: dominoes two apart fill a gap of `2 k` squares, so the row needs `k`. */
function gapLevel(k: number): MachineLevel {
    const span = k * GAP;
    return {
        title: "Fill the gap",
        grades: [1, 2],
        goal: `The dominoes stand 2 squares apart. How many fill the ${span} squares to the bell?`,
        prompt: "Stand the row after Charlie's domino, then drag its grip, or press more and fewer, to change how many.",
        scene: { shelves: [], bell: bellAfter(6 + span), gap: GAP, push: "start" },
        fixed: [dominoes(6, FLOOR, 1)],
        tray: [{ kind: "row", n: 3, counts: true }],
        plan: [{ x: 8, y: FLOOR, n: k }],
        preview: 1,
        ruler: {
            from: { x: 6, y: FLOOR + 0.7 },
            to: { x: 6 + span, y: FLOOR + 0.7 },
            text: `${span} squares`,
        },
    };
}

/** Level three: a ball rolls off a shelf, and a ramp takes it down to a row on the floor. */
function rampLevel(row: number): MachineLevel {
    return {
        title: "Down the ramp",
        grades: [1, 2],
        goal: "Put the ramp where the ball falls, so it rolls down into the dominoes.",
        prompt: "Drag the ramp under the end of the shelf. Drag a grip at its end to tip it.",
        scene: {
            shelves: [{ x: 2, y: 13, w: 8, h: 1 }],
            bell: bellAfter(row + 4 * GAP),
            gap: GAP,
            push: "ball",
        },
        fixed: [locked("ball", "ball", 8, 13 - BALL_R), dominoes(row, FLOOR, 5, "floor")],
        tray: [{ kind: "ramp" }],
        plan: [{ x: 13, y: 18, angle: 0.3 }],
        preview: 2,
    };
}

/** Level four: a weight pushed off a shelf lands on a see-saw, whose other end swings up into the bell. */
function seesawLevel(dx: number): MachineLevel {
    return {
        title: "The see-saw",
        grades: [2, 2],
        goal: "Stand the see-saw so the weight lands on one end and the other end swings up to the bell.",
        prompt: "The plank is 6 squares long. The bell hangs over where its right end should be.",
        scene: {
            shelves: [{ x: 2 + dx, y: 14, w: 7, h: 1 }],
            bell: { x: 15.5 + dx, y: 20.6 },
            gap: GAP,
            push: "weight",
        },
        fixed: [locked("weight", "weight", 8.4 + dx, 14)],
        tray: [{ kind: "seesaw" }],
        plan: [{ x: 13 + dx, y: FLOOR }],
        preview: 1,
        ruler: {
            from: { x: 10 + dx, y: FLOOR + 0.7 },
            to: { x: 16 + dx, y: FLOOR + 0.7 },
            text: "a plank of 6",
        },
    };
}

/** Level five: marbles fill a bucket until it outweighs a weight as heavy as `heavy` of them, which rises to the bell. */
function bucketLevel(heavy: number): MachineLevel {
    return {
        title: "Fill the bucket",
        grades: [2, 3],
        goal: `The weight is as heavy as ${heavy} marbles. Hang the bag over the bucket and let go enough marbles to lift it to the bell.`,
        prompt: "Drag the bag over the bucket, then drag its grip, or press more and fewer, to change how many marbles it lets go.",
        scene: {
            shelves: [{ x: 27, y: 20.7, w: 2, h: 1 }],
            bell: { x: 28, y: 13.5 },
            gap: GAP,
            push: null,
            hoist: { bucket: { x: 20, y: 14 }, weight: { x: 28, y: 20 }, heavy },
        },
        fixed: [],
        tray: [{ kind: "bag", n: 2, counts: true }],
        plan: [{ x: 20, y: 10, n: heavy + 1 }],
        preview: 1,
    };
}

/** Level six: a fan's breeze sails a paper boat along the pond to the bell. */
function fanLevel(boat: number): MachineLevel {
    return {
        title: "The fan",
        grades: [2, 3],
        goal: `The fan's breeze blows ${FAN.reach} squares. Stand it close behind the boat so the boat sails to the bell.`,
        prompt: "The fan blows to the right. Stand it on the floor before the pond.",
        scene: {
            shelves: [],
            bell: { x: 38, y: FLOOR - 1 },
            gap: GAP,
            push: null,
            pond: { from: boat - 4, to: 40 },
        },
        fixed: [locked("boat", "boat", boat, FLOOR)],
        tray: [{ kind: "fan" }],
        plan: [{ x: boat - 5.5, y: FLOOR }],
        preview: 1,
        ruler: {
            from: { x: boat - 8, y: FLOOR + 0.7 },
            to: { x: boat, y: FLOOR + 0.7 },
            text: `${FAN.reach} squares`,
        },
    };
}

/** Level seven: a ramp and a row that must cost no more than the budget, with a dear ramp and a cheap one. */
function budgetLevel(k: number): MachineLevel {
    const last = 22 + (k - 1) * GAP;
    return {
        title: "On a budget",
        grades: [3, 3],
        goal: `You have 12 coins. A domino costs 1, the short ramp 5 and the long ramp 8. Ring the bell for 12 coins or fewer.`,
        prompt: "Choose the ramp that leaves enough coins for the dominoes.",
        // the bell stands on a step one square high, so the ball alone stops against it and only a falling domino reaches the bell
        scene: {
            shelves: [
                { x: 2, y: 13, w: 8, h: 1 },
                { x: last + 1, y: FLOOR - 1, w: 4, h: 1 },
            ],
            bell: { x: last + 2.4, y: FLOOR - 2.1 },
            gap: GAP,
            push: "ball",
        },
        fixed: [locked("ball", "ball", 8, 13 - BALL_R), dominoes(20, FLOOR, 1)],
        tray: [{ kind: "long" }, { kind: "ramp" }, { kind: "row", n: 2, counts: true }],
        plan: [null, { x: 13, y: 18, angle: 0.3 }, { x: 22, y: FLOOR, n: k }],
        preview: 0,
        budget: 12,
        ruler: {
            from: { x: 20, y: FLOOR + 0.7 },
            to: { x: 20 + k * GAP, y: FLOOR + 0.7 },
            text: `${k * GAP} squares`,
        },
    };
}

/** Level eight: a row on a high shelf knocks a ball off its end, onto a ramp, and into a row on the floor. */
function shelfLevel(k: number): MachineLevel {
    const ball = 6 + (k - 1) * GAP + 0.85;
    return {
        title: "Off the shelf",
        grades: [3, 4],
        goal: "The row on the shelf has to reach the ball, and the ball has to roll down to the dominoes on the floor.",
        prompt: "Count how many dominoes reach from Charlie's to the ball, then catch the ball with the ramp.",
        scene: {
            shelves: [{ x: 2, y: 12, w: ball + 0.15 - 2, h: 1 }],
            bell: bellAfter(34 + 4 * GAP),
            gap: GAP,
            push: "start",
        },
        fixed: [
            dominoes(4, 12, 1),
            locked("ball", "ball", ball, 12 - BALL_R),
            dominoes(34, FLOOR, 5, "floor"),
        ],
        tray: [{ kind: "row", n: 2, counts: true }, { kind: "ramp" }],
        plan: [
            { x: 6, y: 12, n: k },
            { x: ball + 3.15, y: 17, angle: 0.35 },
        ],
        preview: 1,
        ruler: {
            from: { x: 4, y: 11.3 },
            to: { x: 6 + (k - 1) * GAP, y: 11.3 },
            text: `${2 + (k - 1) * GAP} squares`,
        },
    };
}

/** Level nine: two rows to count and a ramp between them. */
function grandLevel(k: number, j: number): MachineLevel {
    const ball = 6 + (k - 1) * GAP + 0.85;
    const floorRow = ball + 13;
    return {
        title: "The grand machine",
        grades: [3, 4],
        goal: "Two rows to fill and a ramp between them. Make the whole machine ring the bell.",
        prompt: "Fill the shelf to the ball, catch the ball with the ramp, and fill the floor to the bell.",
        scene: {
            shelves: [{ x: 2, y: 12, w: ball + 0.15 - 2, h: 1 }],
            bell: bellAfter(floorRow + j * GAP),
            gap: GAP,
            push: "start",
        },
        fixed: [
            dominoes(4, 12, 1),
            locked("ball", "ball", ball, 12 - BALL_R),
            dominoes(floorRow, FLOOR, 1, "floor"),
        ],
        tray: [
            { kind: "row", n: 2, counts: true },
            { kind: "ramp" },
            { kind: "row", n: 2, counts: true },
        ],
        plan: [
            { x: 6, y: 12, n: k },
            { x: ball + 3.15, y: 17, angle: 0.35 },
            { x: floorRow + GAP, y: FLOOR, n: j },
        ],
        preview: 0,
    };
}

/** Free play: every part, a ball on a shelf, and a bell as far along as a row of `far` from the middle of the floor. */
function freeLevel(far: number): MachineLevel {
    return {
        title: "Free play",
        grades: [1, 4],
        goal: "Build any machine you like that rings the bell. It is kept for next time.",
        prompt: "Every part is in the drawer. Press Go to try your machine.",
        scene: {
            shelves: [{ x: 2, y: 12, w: 9, h: 1 }],
            bell: bellAfter(25.4 + (far - 1) * GAP),
            gap: GAP,
            push: "ball",
        },
        fixed: [locked("ball", "ball", 9, 12 - BALL_R)],
        tray: [
            { kind: "ramp" },
            { kind: "long" },
            { kind: "row", n: 5, counts: true },
            { kind: "row", n: 5, counts: true },
            { kind: "seesaw" },
            { kind: "spring" },
            { kind: "weight" },
        ],
        plan: [
            { x: 14, y: 17, angle: 0.35 },
            null,
            { x: 25.4, y: FLOOR, n: far },
            null,
            null,
            null,
            null,
        ],
        preview: 0,
    };
}

/** Each level's variations: the first is the authored one, and each is proven to ring the bell by its plan. */
export const VARIANTS: readonly (readonly MachineLevel[])[] = [
    [push(4), push(3, 21), push(5, 20)],
    [gapLevel(7), gapLevel(6), gapLevel(8)],
    [rampLevel(22), rampLevel(24), rampLevel(20)],
    [seesawLevel(0), seesawLevel(3), seesawLevel(6)],
    [bucketLevel(6), bucketLevel(4), bucketLevel(8)],
    [fanLevel(18), fanLevel(20), fanLevel(16)],
    [budgetLevel(6), budgetLevel(5), budgetLevel(7)],
    [shelfLevel(6), shelfLevel(5), shelfLevel(7)],
    [grandLevel(5, 4), grandLevel(6, 3), grandLevel(4, 5)],
    [freeLevel(9), freeLevel(7), freeLevel(5)],
];

export const MACHINE_LEVELS: Levels<MachineLevel> = [
    push(4),
    gapLevel(7),
    rampLevel(22),
    seesawLevel(0),
    bucketLevel(6),
    fanLevel(18),
    budgetLevel(6),
    shelfLevel(6),
    grandLevel(5, 4),
    freeLevel(9),
];

/** The free play's level, whose machine the page keeps between visits. */
export const FREE = MACHINE_LEVELS.length - 1;

export const MACHINE = {
    reach: knob(
        1.2,
        0.4,
        3,
        0.1,
        "squares",
        "a row let go this near the end of another stands on after it, two squares on",
    ),
    turn: knob(
        5,
        1,
        15,
        1,
        "degrees",
        "one press of a turn button tips a ramp a little, so the keys can aim finely",
    ),
};

/** The most a row or a bag can hold. */
export const MOST = 12;

export interface MachineState {
    level: number;
    L: MachineLevel;
    scene: Scene;
    /** Every part the drawer started with, by id; those on the bench are in `bench` too. */
    tray: (TrayPart & { id: string })[];
    bench: Part[];
    past: Part[][];
    phase: "build" | "run" | "result" | "won";
    run: Machine | null;
    /** Steps since the run was judged, for the bell's swing and a short wait before building again. */
    since: number;
    selected: string;
    drag: {
        id: string;
        mode: "move" | "count" | "turn";
        dx: number;
        dy: number;
        fresh: boolean;
    } | null;
    /** The part under the hand as it would be put down. */
    pose: Part | null;
    hand: Pt | null;
    /** The last part put down and the step it was, for its little bounce. */
    landed: { id: string; at: number } | null;
    /** Whether a key has moved a part, so the highlight a keyboard needs is drawn. */
    keys: boolean;
    text: string;
    steps: number;
    runs: number;
    /** Dominoes fallen in this run, for the click that climbs as the chain goes on. */
    toppled: number;
}

const idOf = (t: TrayPart, i: number) => `${t.kind}:${i}`;

export function startMachine(L: MachineLevel, level: number): MachineState {
    const tray = L.tray.map((t, i) => ({ ...t, id: idOf(t, i) }));
    return {
        level,
        L,
        scene: { ...L.scene, w: W, h: H, floor: FLOOR },
        tray,
        bench: [],
        past: [],
        phase: "build",
        run: null,
        since: 0,
        selected: tray[0]?.id ?? "",
        drag: null,
        pose: null,
        hand: null,
        landed: null,
        keys: false,
        text: L.prompt,
        steps: 0,
        runs: 0,
        toppled: 0,
    };
}

/** Where a drawer slot is. */
export const slotOf = (i: number): Pt => ({ x: DRAWER.first + i * DRAWER.slot, y: DRAWER.at });

/** A tray part as it would stand on the bench, before it is put anywhere. */
function fresh(s: MachineState, id: string): Part | null {
    const t = s.tray.find((q) => q.id === id);
    if (!t) return null;
    return {
        id,
        kind: t.kind,
        x: 0,
        y: 0,
        angle: t.kind === "ramp" || t.kind === "long" ? 0.3 : 0,
        n: t.n ?? 1,
    };
}

export const onBench = (s: MachineState, id: string): Part | undefined =>
    s.bench.find((p) => p.id === id);

/** Every part in the place: the level's own and those the child has put down. */
export const partsOf = (s: MachineState): Part[] => [...s.L.fixed, ...s.bench];

/** What the parts on the bench cost. */
export const spent = (s: MachineState): number =>
    s.bench.reduce((n, p) => n + (p.kind === "row" ? p.n * PRICE.row : PRICE[p.kind]), 0);

/** A row let go near the end of another stands on straight after it, as a domino two squares on. */
function joined(s: MachineState, p: Part): Part {
    if (p.kind !== "row") return p;
    const ends = partsOf(s)
        .filter((q) => q.kind === "row" && q.id !== p.id)
        .map((q) => ({ x: q.x + q.n * s.scene.gap, y: q.y }));
    const near = ends.find(
        (e) => Math.abs(e.y - p.y) < 0.6 && Math.abs(e.x - p.x) < MACHINE.reach.value,
    );
    return near ? { ...p, x: near.x, y: near.y } : p;
}

/** A part as it would be put down at `at`, settled on what is under it and joined to a row it meets. */
export function placeAt(s: MachineState, p: Part, at: Pt): Part {
    return joined(s, settle(s.scene, p, at));
}

const others = (s: MachineState, id: string): Part[] => partsOf(s).filter((q) => q.id !== id);

/** Whether a part could stand where it is now, against the place and every other part. */
export const room = (s: MachineState, p: Part): boolean =>
    fits(s.scene, others(s, p.id), p) && clearOfHoist(s, p);

/** The bucket and its counterweight are the place's own and no part stands in them. */
function clearOfHoist(s: MachineState, p: Part): boolean {
    const h = s.scene.hoist;
    if (!h) return true;
    const b = boxOf(p, s.scene);
    const near = (c: Pt, rx: number, ry: number) =>
        b.x0 < c.x + rx && b.x1 > c.x - rx && b.y0 < c.y + ry && b.y1 > c.y - ry;
    return !near(h.bucket, 1.4, 1.2) && !near(h.weight, 0.8, 0.8);
}

function remember(s: MachineState): void {
    s.past.push(s.bench.map((p) => ({ ...p })));
    if (s.past.length > 60) s.past.shift();
}

/** Puts a part on the bench, or moves it there, when it has room; says whether it did. */
export function put(s: MachineState, p: Part, out: Happening[] = []): boolean {
    if (s.phase !== "build" || !room(s, p)) return false;
    const was = onBench(s, p.id);
    if (was && was.x === p.x && was.y === p.y && was.angle === p.angle && was.n === p.n)
        return false;
    remember(s);
    s.bench = was ? s.bench.map((q) => (q.id === p.id ? { ...p } : q)) : [...s.bench, { ...p }];
    s.landed = { id: p.id, at: s.steps };
    out.push({ cue: "place", pan: panOf(p.x, W / 2, W) });
    return true;
}

/** Takes a part off the bench and back to the drawer. */
export function stow(s: MachineState, id: string, out: Happening[] = []): boolean {
    if (s.phase !== "build" || !onBench(s, id)) return false;
    remember(s);
    s.bench = s.bench.filter((p) => p.id !== id);
    out.push({ cue: "back" });
    return true;
}

export function undo(s: MachineState): boolean {
    const was = s.past.pop();
    if (!was || s.phase !== "build") return false;
    s.bench = was;
    return true;
}

/** Where a part's grip is: a row's on top of its last domino, a ramp's at its right end, a bag's at its side. */
export function gripOf(s: MachineState, p: Part): Pt | null {
    switch (p.kind) {
        case "row":
            return { x: p.x + (p.n - 1) * s.scene.gap, y: p.y - DOMINO.h - 0.7 };
        case "ramp":
        case "long": {
            const h = LENGTHS[p.kind] / 2;
            return { x: p.x + Math.cos(p.angle) * h, y: p.y + Math.sin(p.angle) * h };
        }
        case "bag":
            return { x: p.x + 1.8, y: p.y };
        default:
            return null;
    }
}

const counts = (s: MachineState, id: string): boolean =>
    s.tray.find((t) => t.id === id)?.counts === true;

/** A ramp's slope kept between level and steep either way, drawn gently to the nearest 15 degrees within 3. */
export function settleAngle(a: number): number {
    let v = Math.atan2(Math.sin(a), Math.cos(a));
    if (v > Math.PI / 2) v -= Math.PI;
    if (v < -Math.PI / 2) v += Math.PI;
    v = Math.max(-1.2, Math.min(1.2, v));
    const step = Math.PI / 12,
        near = Math.round(v / step) * step;
    return Math.abs(v - near) < (3 * Math.PI) / 180 ? near : v;
}

/** How far a point is from a part on the bench: inside its box is nought. */
function distanceTo(s: MachineState, p: Part, t: Pt): number {
    if (p.kind === "ramp" || p.kind === "long") {
        const h = LENGTHS[p.kind] / 2,
            a = { x: p.x - Math.cos(p.angle) * h, y: p.y - Math.sin(p.angle) * h },
            b = { x: p.x + Math.cos(p.angle) * h, y: p.y + Math.sin(p.angle) * h };
        const dx = b.x - a.x,
            dy = b.y - a.y,
            k = Math.max(
                0,
                Math.min(1, ((t.x - a.x) * dx + (t.y - a.y) * dy) / (dx * dx + dy * dy)),
            );
        return Math.hypot(t.x - (a.x + dx * k), t.y - (a.y + dy * k));
    }
    const box = boxOf(p, s.scene);
    const dx = Math.max(box.x0 - t.x, 0, t.x - box.x1),
        dy = Math.max(box.y0 - t.y, 0, t.y - box.y1);
    return Math.hypot(dx, dy);
}

const inDrawer = (t: Pt): boolean => t.y > DRAWER.y0 - 0.3;

/** The part a hand on the bench or in the drawer is over, and what it would do with it. */
function grab(s: MachineState, t: Pt): MachineState["drag"] {
    const sel = onBench(s, s.selected);
    const grip = sel ? gripOf(s, sel) : null;
    if (sel && grip && Math.hypot(grip.x - t.x, grip.y - t.y) < 1.1) {
        if (sel.kind === "row" || sel.kind === "bag")
            return counts(s, sel.id)
                ? { id: sel.id, mode: "count", dx: 0, dy: 0, fresh: false }
                : null;
        return { id: sel.id, mode: "turn", dx: 0, dy: 0, fresh: false };
    }
    const hit = s.bench
        .filter((p) => distanceTo(s, p, t) < 0.9)
        .sort((a, b) => distanceTo(s, a, t) - distanceTo(s, b, t))[0];
    if (hit) return { id: hit.id, mode: "move", dx: t.x - hit.x, dy: t.y - hit.y, fresh: false };
    if (!inDrawer(t)) return null;
    const i = s.tray.findIndex((q, k) => {
        const slot = slotOf(k);
        return (
            !onBench(s, q.id) &&
            Math.abs(slot.x - t.x) < DRAWER.slot / 2 &&
            Math.abs(slot.y - t.y) < 2
        );
    });
    const t0 = s.tray[i];
    return t0 ? { id: t0.id, mode: "move", dx: 0, dy: 0, fresh: true } : null;
}

/** Where a fresh part held by the hand sits under it: a standing part with its foot just under the finger. */
const heldAt = (p: Part, t: Pt): Pt =>
    p.kind === "row" ||
    p.kind === "seesaw" ||
    p.kind === "fan" ||
    p.kind === "spring" ||
    p.kind === "weight"
        ? { x: t.x, y: t.y + 0.5 }
        : t;

function hands(s: MachineState, pad: Pad, out: Happening[]): void {
    const t = pad.touch;
    if (t && !s.hand) {
        s.drag = grab(s, t);
        if (s.drag) {
            s.selected = s.drag.id;
            if (s.drag.fresh) out.push({ cue: "lift" });
        }
    }
    s.hand = t ? { ...t } : null;
    const drag = s.drag;
    const point = pad.lifted ?? t;
    if (drag && point) {
        const base = onBench(s, drag.id) ?? fresh(s, drag.id);
        if (base) {
            if (drag.mode === "count") {
                const n =
                    Math.round((point.x - base.x) / (base.kind === "row" ? s.scene.gap : 0.8)) + 1;
                s.pose = { ...base, n: Math.max(1, Math.min(MOST, n)) };
            } else if (drag.mode === "turn")
                s.pose = {
                    ...base,
                    angle: settleAngle(Math.atan2(point.y - base.y, point.x - base.x)),
                };
            else
                s.pose = inDrawer(point)
                    ? { ...base, x: point.x, y: point.y }
                    : placeAt(
                          s,
                          base,
                          heldAt(base, { x: point.x - drag.dx, y: point.y - drag.dy }),
                      );
        }
    }
    if (pad.lifted && drag && s.pose) {
        if (drag.mode === "move" && inDrawer(pad.lifted)) {
            if (!drag.fresh) stow(s, drag.id, out);
        } else if (!put(s, s.pose, out) && !onBench(s, drag.id)) out.push({ cue: "nope" });
        s.drag = null;
        s.pose = null;
    }
}

function go(s: MachineState, out: Happening[]): void {
    if (s.phase === "won") return;
    if (s.phase !== "build") {
        toBuild(s, "Everything is back where you built it. Change the machine and press Go again.");
        out.push({ cue: "back" });
        return;
    }
    s.drag = null;
    s.pose = null;
    s.run = machine(s.scene, partsOf(s));
    kick(s.run);
    s.phase = "run";
    s.runs++;
    s.since = 0;
    s.toppled = 0;
    s.text = "Here it goes.";
    out.push({ cue: "lift" });
}

function toBuild(s: MachineState, text: string): void {
    s.phase = "build";
    s.run = null;
    s.text = text;
}

/** Why a machine that ran did not ring the bell, in the level's words where it can say. */
function miss(s: MachineState): string {
    const rows = s.bench.filter((p) => p.kind === "row");
    if (s.L.scene.hoist) return "The weight did not lift. Are there enough marbles in the bucket?";
    if (rows.length && s.run && s.run.fallen.size > 0)
        return "The chain stopped before the bell. Is every row long enough to reach the next thing?";
    return "The bell did not ring. Change the machine and press Go again.";
}

function stepRun(s: MachineState, out: Happening[]): void {
    const m = s.run;
    if (!m) return;
    for (const e of stepMachine(m)) {
        if (e.kind === "topple") {
            out.push({ cue: "place", pitch: semitones(Math.min(14, e.n)), strength: 0.5 });
            s.toppled++;
        } else if (e.kind === "knock")
            out.push({
                cue: "bump",
                strength: Math.min(1, e.speed / 10),
                pan: panOf(e.at.x, W / 2, W),
            });
        else if (e.kind === "boing") out.push({ cue: "lift", pitch: 1.5 });
        else out.push({ cue: "ring" });
    }
    if (!m.rung && !settled(m)) return;
    if (m.rung && m.steps < RATE) return;
    const cost = spent(s);
    if (m.rung && (s.L.budget === undefined || cost <= s.L.budget)) {
        s.phase = "won";
        s.since = 0;
        s.text =
            s.L.budget === undefined
                ? "Ding! The machine rang the bell."
                : `Ding! The machine rang the bell for ${cost} coins.`;
        out.push(
            { cue: "win" },
            { burst: { kind: "sparkle", x: s.scene.bell.x, y: s.scene.bell.y - 1, n: 14 } },
        );
        return;
    }
    s.phase = "result";
    s.since = 0;
    s.text = m.rung
        ? `The bell rang, but the parts cost ${cost} coins and you have ${s.L.budget ?? 0}. Try cheaper parts.`
        : miss(s);
}

function step(s: MachineState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (pad.tapped) go(s, out);
    if (s.phase === "build") {
        hands(s, pad, out);
        for (const d of pad.pressed) machineCommand(s, d);
    } else if (s.phase === "run") stepRun(s, out);
    else {
        s.since++;
        // the bell swings and the dominoes lie where they fell a moment, then the bench comes back to build on
        if (s.run && s.since < RATE * 3) stepMachine(s.run);
        if (s.phase === "result" && (s.since > RATE * 2.5 || pad.touch)) toBuild(s, s.text);
    }
    return out;
}

/** The next part a key would take up: through the drawer and the bench in the drawer's order. */
function cycle(s: MachineState): void {
    const i = s.tray.findIndex((t) => t.id === s.selected);
    s.selected = s.tray[(i + 1) % s.tray.length]?.id ?? s.selected;
}

export function machineCommand(s: MachineState, id: string): void {
    if (id === "go") {
        go(s, []);
        return;
    }
    if (s.phase !== "build") return;
    s.keys = true;
    if (id === "next") {
        cycle(s);
        return;
    }
    const p = onBench(s, s.selected) ?? null;
    if (id === "stow") {
        if (p) stow(s, p.id);
        return;
    }
    if (id === "more" || id === "fewer") {
        if (!p || !counts(s, p.id)) return;
        put(s, { ...p, n: Math.max(1, Math.min(MOST, p.n + (id === "more" ? 1 : -1))) });
        return;
    }
    if (id === "turn-left" || id === "turn-right") {
        if (!p || (p.kind !== "ramp" && p.kind !== "long")) return;
        const by = ((id === "turn-left" ? -1 : 1) * MACHINE.turn.value * Math.PI) / 180;
        put(s, { ...p, angle: settleAngle(p.angle + by) });
        return;
    }
    const d =
        id === "left"
            ? { x: -0.5, y: 0 }
            : id === "right"
              ? { x: 0.5, y: 0 }
              : id === "up"
                ? { x: 0, y: -0.5 }
                : id === "down"
                  ? { x: 0, y: 0.5 }
                  : null;
    if (!d) return;
    if (!p) {
        // the first arrow on a part in the drawer stands it up in the middle of the floor, or the first free place along it
        const f = fresh(s, s.selected);
        if (!f) return;
        for (let k = 0; k < 40; k++) {
            const x = W / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.5;
            if (put(s, placeAt(s, f, { x, y: f.kind === "row" || stands(f) ? FLOOR - 1 : 12 })))
                return;
        }
        return;
    }
    if (stands(p) && d.y !== 0) {
        // a standing part keeps to what it stands on: up and down step it to the next shelf over it, or the floor under it
        const tops = [
            s.scene.floor,
            ...s.scene.shelves.filter((q) => p.x >= q.x && p.x <= q.x + q.w).map((q) => q.y),
        ];
        const next =
            d.y < 0
                ? Math.max(...tops.filter((y) => y < p.y - 0.01), -Infinity)
                : Math.min(...tops.filter((y) => y > p.y + 0.01), Infinity);
        if (Number.isFinite(next)) put(s, placeAt(s, p, { x: p.x, y: next }));
        return;
    }
    // a step that has no room goes on to the next place along that does, so a part can hop past another
    for (let k = 1; k <= (d.x !== 0 ? 60 : 1); k++)
        if (put(s, placeAt(s, p, { x: p.x + d.x * k, y: p.y + d.y * k }))) return;
}

const stands = (p: Part): boolean =>
    p.kind === "row" ||
    p.kind === "seesaw" ||
    p.kind === "weight" ||
    p.kind === "spring" ||
    p.kind === "fan";

/** The sprites a part is drawn with, at its layout place or where its bodies have got to. */
function partSprites(
    s: MachineState,
    p: Part,
    m: Machine | null,
    alpha = 1,
    tint?: "mint" | "berry",
): Sprite[] {
    const out: Sprite[] = [];
    const lift = s.landed?.id === p.id ? Math.max(0, 1 - (s.steps - s.landed.at) / 10) : 0;
    const bounce = s.phase === "build" ? Math.sin(lift * Math.PI) * 0.25 : 0;
    const body = (i: number) => {
        const b = m?.of.get(p.id)?.[i];
        return b && m ? m.world.where(b) : null;
    };
    const key = `${p.id}${alpha < 1 ? ":ghost" : ""}`;
    const machinePart = (
        k: string,
        part: string,
        at: Pt,
        size: number,
        angle = 0,
        z = 5,
        label = "",
        colour?: string,
    ): Sprite => ({
        key: k,
        art: "machinepart",
        params: { part, label, colour: tint ?? colour ?? "tang" },
        x: at.x,
        y: at.y - bounce,
        size,
        angle,
        z,
        alpha,
    });
    const marblePart = (
        k: string,
        params: Record<string, unknown>,
        at: Pt,
        size: number,
        angle = 0,
        z = 5,
    ): Sprite => ({
        key: k,
        art: "marblerun",
        params: { w: 1, h: 1, label: "", colour: tint ?? "sky", ...params },
        x: at.x,
        y: at.y - bounce,
        size,
        angle,
        z,
        alpha,
    });
    switch (p.kind) {
        case "row":
            for (let i = 0; i < p.n; i++) {
                const at = body(i) ?? { x: p.x + i * s.scene.gap, y: p.y - DOMINO.h / 2, angle: 0 };
                out.push(
                    machinePart(
                        `${key}:${i}`,
                        "domino",
                        at,
                        1,
                        at.angle,
                        6,
                        "",
                        p.locked ? "berry" : "tang",
                    ),
                );
            }
            break;
        case "ramp":
        case "long": {
            const at = body(0) ?? { x: p.x, y: p.y, angle: p.angle };
            out.push(
                marblePart(
                    key,
                    { part: "ramp", w: LENGTHS[p.kind] },
                    at,
                    LENGTHS[p.kind],
                    at.angle,
                    4,
                ),
            );
            break;
        }
        case "seesaw": {
            const at = body(0) ?? { x: p.x, y: p.y - STAND, angle: 0.32 };
            out.push(
                marblePart(`${key}:stand`, { part: "stand" }, { x: p.x, y: p.y - 0.85 }, 1.8, 0, 4),
            );
            out.push(
                marblePart(
                    key,
                    { part: "seesaw", w: PLANK, colour: tint ?? "mint" },
                    at,
                    PLANK,
                    at.angle,
                    5,
                ),
            );
            break;
        }
        case "ball": {
            const at = body(0) ?? { x: p.x, y: p.y, angle: 0 };
            out.push(machinePart(key, "ball", at, BALL_R * 2, at.angle, 7, "", "berry"));
            break;
        }
        case "weight": {
            const at = body(0) ?? { x: p.x, y: p.y - WEIGHT / 2, angle: 0 };
            out.push(machinePart(key, "weight", at, WEIGHT, at.angle, 7, "", "sky"));
            break;
        }
        case "spring":
            out.push(machinePart(key, "spring", { x: p.x, y: p.y - 0.55 }, 2.2, 0, 5, "", "mint"));
            break;
        case "fan":
            out.push(machinePart(key, "fan", { x: p.x, y: p.y - 1.5 }, 2, 0, 5, "", "sky"));
            break;
        case "bag": {
            const left = m?.left.get(p.id) ?? p.n;
            out.push(machinePart(key, "bag", p, 2, 0, 6, String(left), "mint"));
            for (const [i, b] of (m?.of.get(p.id) ?? []).entries()) {
                const at = m ? m.world.where(b) : p;
                out.push(
                    marblePart(
                        `${key}:m${i}`,
                        { part: "marble", colour: "glow" },
                        at,
                        MARBLE_R * 2,
                        0,
                        7,
                    ),
                );
            }
            break;
        }
        case "boat": {
            const at = body(0) ?? { x: p.x, y: p.y - 0.5, angle: 0 };
            out.push(machinePart(key, "boat", { x: at.x, y: at.y - 0.5 }, 3, 0, 6, "", "sky"));
            break;
        }
    }
    return out;
}

type Box = { x0: number; y0: number; x1: number; y1: number };
const overlaps = (a: Box, b: Box, pad = 0): boolean =>
    a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;

/** Where Charlie stands: just behind the first thing in the chain, on the floor or its shelf. */
function footOf(s: MachineState): Pt {
    const first = s.L.fixed.find((p) => p.id === s.scene.push);
    if (!first) return { x: 4, y: FLOOR };
    if (first.kind === "row") return { x: first.x - 2, y: first.y };
    return { x: first.x - 2.2, y: first.kind === "ball" ? first.y + BALL_R : first.y };
}

/** Where a level's machine stands, the parts of the place it uses and where a machine that works would go: what the camera frames and the room's furniture keeps clear of. */
function actionBoxes(s: MachineState): Box[] {
    const sc = s.scene,
        out: Box[] = s.L.fixed.map((p) => boxOf(p, sc));
    s.tray.forEach((t, i) => {
        const plan = s.L.plan[i],
            base = fresh(s, t.id);
        if (!plan || !base) return;
        out.push(
            boxOf(
                {
                    ...base,
                    x: plan.x,
                    y: plan.y,
                    angle: plan.angle ?? base.angle,
                    n: plan.n ?? base.n,
                },
                sc,
            ),
        );
    });
    for (const sh of sc.shelves) out.push({ x0: sh.x, y0: sh.y, x1: sh.x + sh.w, y1: sh.y + 2 });
    out.push({ x0: sc.bell.x - 1.2, y0: sc.bell.y - 1.8, x1: sc.bell.x + 1.6, y1: FLOOR });
    if (sc.hoist) {
        const h = sc.hoist,
            top = Math.min(h.bucket.y, h.weight.y) - 8;
        out.push({
            x0: Math.min(h.bucket.x, h.weight.x) - 2,
            y0: top - 1,
            x1: Math.max(h.bucket.x, h.weight.x) + 2,
            y1: FLOOR,
        });
    }
    if (sc.pond) out.push({ x0: sc.pond.from, y0: FLOOR - 3, x1: sc.pond.to, y1: FLOOR + 1 });
    const f = footOf(s);
    out.push({ x0: f.x - 1.6, y0: f.y - 3.8, x1: f.x + 1.6, y1: f.y });
    return out;
}

/** The part of the room the camera frames: the machine with the wall above it and the tray below, so the toys fill the field rather than a strip along the floor. */
function framing(s: MachineState): { x: number; y: number; w: number; h: number } {
    if (s.level === FREE) return { x: W / 2, y: H / 2, w: W, h: H };
    const boxes = actionBoxes(s),
        lastSlot = slotOf(Math.max(0, s.tray.length - 1)).x + DRAWER.slot / 2 + 1;
    let x0 = Math.max(0, Math.min(...boxes.map((b) => b.x0)) - 2),
        x1 = Math.min(W, Math.max(Math.max(...boxes.map((b) => b.x1)) + 5, lastSlot));
    // never narrower than 30 squares, so a small machine still sits in a room
    if (x1 - x0 < 30) {
        x0 = Math.max(0, x1 - 30);
        x1 = Math.min(W, x0 + 30);
    }
    // at least half as tall as wide, the shape of a wide screen's field, so the wall the room hangs on is the wall shown
    const y0 = Math.max(0, Math.min(Math.min(...boxes.map((b) => b.y0)) - 5, H - (x1 - x0) / 2));
    return { x: (x0 + x1) / 2, y: (y0 + H) / 2, w: x1 - x0, h: H - y0 };
}

/** A piece of the toy room and the places it may stand, in order of choice: its middle, or its foot for one on the floor. */
interface Furnishing {
    key: string;
    art: string;
    params: Record<string, unknown>;
    size: number;
    box: { w: number; h: number };
    spots: Pt[];
    floor?: true;
    /** Lies flat under the other pieces, so it keeps clear of the machine only. */
    under?: true;
}

const FURNISHINGS: readonly Furnishing[] = [
    {
        key: "window",
        art: "toyroom",
        params: { part: "window", w: 8, h: 6 },
        size: 6,
        box: { w: 6, h: 6 },
        spots: [
            { x: 24, y: 6 },
            { x: 30, y: 6 },
            { x: 18, y: 6 },
            { x: 36, y: 5 },
            { x: 12, y: 5 },
            { x: 24, y: 4 },
        ],
    },
    {
        key: "picture",
        art: "furniture",
        params: { kind: "picture", tone: "sky", on: false },
        size: 3,
        box: { w: 3, h: 2 },
        spots: [
            { x: 9, y: 7 },
            { x: 14, y: 8 },
            { x: 40, y: 7 },
            { x: 6, y: 5 },
        ],
    },
    {
        key: "picture:2",
        art: "furniture",
        params: { kind: "picture", tone: "berry", on: false },
        size: 3,
        box: { w: 3, h: 2 },
        spots: [
            { x: 41, y: 10 },
            { x: 34, y: 10 },
            { x: 17, y: 11 },
            { x: 46, y: 6 },
        ],
    },
    {
        key: "books",
        art: "furniture",
        params: { kind: "shelf", tone: "tang", on: false },
        size: 4,
        box: { w: 4, h: 2 },
        spots: [
            { x: 44, y: 14 },
            { x: 38, y: 14 },
            { x: 45, y: 10 },
            { x: 30, y: 12 },
        ],
    },
    {
        key: "books:2",
        art: "furniture",
        params: { kind: "shelf", tone: "mint", on: false },
        size: 4,
        box: { w: 4, h: 2 },
        spots: [
            { x: 6, y: 12 },
            { x: 32, y: 8 },
            { x: 20, y: 14 },
            { x: 12, y: 10 },
        ],
    },
    {
        key: "chest",
        art: "toyroom",
        params: { part: "chest", w: 8, h: 6 },
        size: 4,
        box: { w: 4, h: 3 },
        spots: [
            { x: 45.5, y: FLOOR },
            { x: 41.5, y: FLOOR },
            { x: 37.5, y: FLOOR },
            { x: 3, y: FLOOR },
            { x: 12, y: FLOOR },
        ],
        floor: true,
    },
    {
        key: "blocks",
        art: "toyroom",
        params: { part: "blocks", w: 8, h: 6 },
        size: 3,
        box: { w: 3, h: 3 },
        spots: [
            { x: 41.5, y: FLOOR },
            { x: 38, y: FLOOR },
            { x: 34.5, y: FLOOR },
            { x: 46.5, y: FLOOR },
            { x: 7, y: FLOOR },
            { x: 16, y: FLOOR },
        ],
        floor: true,
    },
    {
        key: "teddy",
        art: "toyroom",
        params: { part: "teddy", w: 8, h: 6 },
        size: 2,
        box: { w: 2, h: 3 },
        spots: [
            { x: 47, y: FLOOR },
            { x: 39, y: FLOOR },
            { x: 35.5, y: FLOOR },
            { x: 1, y: FLOOR },
            { x: 10, y: FLOOR },
        ],
        floor: true,
    },
    {
        key: "lamp",
        art: "furniture",
        params: { kind: "lamp", tone: "glow", on: true },
        size: 2,
        box: { w: 2, h: 4 },
        spots: [
            { x: 47, y: FLOOR },
            { x: 36, y: FLOOR },
            { x: 32, y: FLOOR },
            { x: 5, y: FLOOR },
            { x: 18, y: FLOOR },
        ],
        floor: true,
    },
    {
        key: "plant",
        art: "furniture",
        params: { kind: "plant", tone: "mint", on: false },
        size: 2,
        box: { w: 2, h: 3 },
        spots: [
            { x: 1.2, y: FLOOR },
            { x: 3, y: FLOOR },
            { x: 30, y: FLOOR },
        ],
        floor: true,
    },
    {
        key: "rug",
        art: "furniture",
        params: { kind: "rug", tone: "berry", on: false },
        size: 6,
        box: { w: 6, h: 1.2 },
        under: true,
        // on the boards in front of the wall, between the skirting and the tray
        spots: [
            { x: 8, y: FLOOR + 1.3 },
            { x: 30, y: FLOOR + 1.3 },
            { x: 18, y: FLOOR + 1.3 },
            { x: 42, y: FLOOR + 1.3 },
        ],
        floor: true,
    },
];

/** The toy room around a level's machine: each piece at the first of its places clear of the machine and of the pieces already put, so it furnishes the room and never stands in the way. */
const furnished = new WeakMap<MachineLevel, Sprite[]>();
function roomOf(s: MachineState): Sprite[] {
    const kept = furnished.get(s.L);
    if (kept) return kept;
    const action = actionBoxes(s),
        taken = [...action],
        // what stands on the floor keeps the boards in front of it clear too, for its ruler and its words
        beneath = action.map((b) => (b.y1 >= FLOOR - 0.01 ? { ...b, y1: FLOOR + 2 } : b)),
        out: Sprite[] = [],
        view = framing(s),
        top = view.y - view.h / 2 + 0.5;
    for (const f of FURNISHINGS) {
        // a wall piece may come down the wall to stay in the frame, a floor piece only moves along it
        const spots = f.floor
            ? f.spots
            : [0, 4, 7, 10].flatMap((dy) => f.spots.map((at) => ({ x: at.x, y: at.y + dy })));
        for (const at of spots) {
            const box: Box = f.floor
                ? { x0: at.x - f.box.w / 2, y0: at.y - f.box.h, x1: at.x + f.box.w / 2, y1: at.y }
                : {
                      x0: at.x - f.box.w / 2,
                      y0: at.y - f.box.h / 2,
                      x1: at.x + f.box.w / 2,
                      y1: at.y + f.box.h / 2,
                  };
            if (box.y0 < top || box.x0 < 0 || box.x1 > W) continue;
            if (
                f.under
                    ? beneath.some((b) => overlaps(box, b, 0))
                    : taken.some((b) => overlaps(box, b, 0.5))
            )
                continue;
            if (!f.under) taken.push(box);
            out.push({
                key: `room:${f.key}`,
                art: f.art,
                params: f.params,
                x: at.x,
                y: f.floor ? at.y - f.box.h / 2 : at.y,
                size: f.size,
                z: 1,
                still: true,
            });
            break;
        }
    }
    // the skirting board runs along the foot of the wall, past both sides of the room
    for (let x = -24; x < W + 24; x += 12)
        out.push({
            key: `skirting:${x}`,
            art: "toyroom",
            params: { part: "skirting", w: 12, h: 6 },
            x: x + 6,
            y: FLOOR - 0.5,
            size: 12,
            z: 1,
            still: true,
        });
    furnished.set(s.L, out);
    return out;
}

const ACT = { build: "point", run: "point", result: "think", won: "cheer" } as const;

function frame(s: MachineState): Frame {
    const sprites: Sprite[] = [],
        marks: Mark[] = [];
    const m = s.run;
    // the toy-room floor runs on past both sides of the bench, so a wide room shows no edge
    for (const [i, x] of [-W / 2, W / 2, (W * 3) / 2].entries())
        sprites.push({
            key: `boards:${i}`,
            art: "floorboards",
            params: { kind: "boards", width: W, height: 6 },
            x,
            y: FLOOR + 3,
            size: W,
            z: 0,
            still: true,
        });
    sprites.push(...roomOf(s));
    // a level's shelves are wooden wall shelves on brackets, or a step where one stands on the floor
    for (const [i, sh] of s.scene.shelves.entries()) {
        const w = Math.max(2, Math.round(sh.w)),
            step = sh.y + sh.h >= FLOOR - 0.01;
        sprites.push({
            key: `ledge:${i}`,
            art: "toyroom",
            params: { part: step ? "step" : "ledge", w, h: 6 },
            x: sh.x + sh.w / 2,
            y: step ? sh.y + 0.5 : sh.y + 1,
            size: sh.w,
            z: 3,
            still: true,
        });
    }
    // the bell hangs from a post standing on whatever is under it, the floor or a step
    const bell = s.scene.bell,
        base = Math.min(
            FLOOR,
            ...s.scene.shelves
                .filter((sh) => bell.x >= sh.x && bell.x <= sh.x + sh.w && sh.y > bell.y)
                .map((sh) => sh.y),
        ),
        postH = Math.max(2, Math.round(base - (bell.y - 1.6)));
    sprites.push({
        key: "bellpost",
        art: "toyroom",
        params: { part: "post", w: 8, h: postH },
        x: bell.x + 0.9,
        y: base - postH / 2,
        size: 3,
        z: 2,
        still: true,
    });
    const swing =
        s.phase === "won"
            ? Math.sin(s.since * 0.5) * Math.max(0, 1 - s.since / (RATE * 2)) * 0.35
            : 0;
    sprites.push({
        key: "bell",
        art: "machinepart",
        params: { part: "bell", label: "", colour: "glow" },
        x: s.scene.bell.x,
        y: s.scene.bell.y + 0.1,
        size: 2,
        angle: swing,
        z: 6,
    });
    if (s.scene.hoist) {
        const h = s.scene.hoist,
            top = Math.min(h.bucket.y, h.weight.y) - 8;
        const bucket = m?.hoist ? m.world.where(m.hoist.bucket) : { ...h.bucket, angle: 0 },
            weight = m?.hoist ? m.world.where(m.hoist.weight) : { ...h.weight, angle: 0 };
        for (const [k, at] of [
            ["a", h.bucket.x],
            ["b", h.weight.x],
        ] as const)
            sprites.push({
                key: `wheel:${k}`,
                art: "machinepart",
                params: { part: "wheel", label: "", colour: "sky" },
                x: at,
                y: top,
                size: 1.2,
                z: 6,
                still: true,
            });
        sprites.push({
            key: "hoist:beam",
            art: "toyroom",
            params: { part: "beam", w: Math.round(Math.abs(h.weight.x - h.bucket.x) + 3), h: 6 },
            x: (h.bucket.x + h.weight.x) / 2,
            y: top - 1.1,
            size: Math.round(Math.abs(h.weight.x - h.bucket.x) + 3),
            z: 5,
            still: true,
        });
        marks.push(
            {
                kind: "line",
                a: { x: h.bucket.x, y: top },
                b: { x: bucket.x, y: bucket.y - 1.15 },
                style: "thin",
            },
            {
                kind: "line",
                a: { x: h.weight.x, y: top },
                b: { x: weight.x, y: weight.y - WEIGHT / 2 },
                style: "thin",
            },
        );
        sprites.push(
            {
                key: "bucket",
                art: "toyroom",
                params: { part: "pail", w: 8, h: 6 },
                x: bucket.x,
                y: bucket.y,
                size: 3,
                z: 6,
            },
            {
                key: "hoist:weight",
                art: "machinepart",
                params: { part: "weight", label: String(h.heavy), colour: "sky" },
                x: weight.x,
                y: weight.y,
                size: WEIGHT,
                z: 6,
            },
        );
        marks.push({
            kind: "word",
            x: weight.x,
            y: weight.y + 1.4,
            text: `${h.heavy} marbles`,
            size: 0.55,
        });
    }
    for (const p of s.L.fixed) sprites.push(...partSprites(s, p, m));
    const posed = s.pose && s.drag ? s.pose : null;
    for (const p of s.bench) if (p.id !== posed?.id) sprites.push(...partSprites(s, p, m));
    if (posed) {
        const ok = inDrawer(posed) ? true : room(s, posed);
        sprites.push(...partSprites(s, posed, null, ok ? 0.85 : 0.45, ok ? "mint" : "berry"));
        if (!ok && !inDrawer(posed))
            marks.push({
                kind: "word",
                x: posed.x,
                y: posed.y - 3.4,
                text: "No room here",
                size: 0.6,
            });
    }
    // the faint places a machine that works would use, on the levels that show them
    if (s.phase === "build" && s.L.preview > 0)
        s.tray.forEach((t, i) => {
            const plan = s.L.plan[i];
            if (!plan || onBench(s, t.id) || (s.L.preview === 1 && t.kind === "row")) return;
            const base = fresh(s, t.id);
            if (!base) return;
            const at: Part = {
                ...base,
                x: plan.x,
                y: plan.y,
                angle: plan.angle ?? base.angle,
                n: plan.n ?? base.n,
            };
            sprites.push(...partSprites(s, { ...at, id: `${t.id}:hint` }, null, 0.22));
        });
    if (s.phase === "build") {
        for (const p of s.bench) {
            const sel = p.id === s.selected;
            if (sel && (p.kind !== "row" || counts(s, p.id))) {
                const g = gripOf(s, p);
                if (g)
                    sprites.push({
                        key: `grip:${p.id}`,
                        art: "machinepart",
                        params: { part: "handle", label: "", colour: "sky" },
                        x: g.x,
                        y: g.y,
                        size: 0.9,
                        z: 9,
                    });
            }
            if (p.kind === "row")
                marks.push({
                    kind: "word",
                    x: p.x + ((p.n - 1) * s.scene.gap) / 2,
                    y: p.y - DOMINO.h - 1.6,
                    text: `${p.n} ${p.n === 1 ? "domino" : "dominoes"}`,
                    size: 0.6,
                });
            if (sel && s.keys) {
                const b = boxOf(p, s.scene);
                marks.push({
                    kind: "box",
                    x: b.x0 - 0.3,
                    y: b.y0 - 0.3,
                    w: b.x1 - b.x0 + 0.6,
                    h: b.y1 - b.y0 + 0.6,
                    on: true,
                });
            }
        }
        if (s.L.ruler)
            marks.push(
                { kind: "line", a: s.L.ruler.from, b: s.L.ruler.to, style: "aim", head: true },
                {
                    kind: "word",
                    x: (s.L.ruler.from.x + s.L.ruler.to.x) / 2,
                    y: s.L.ruler.from.y + 0.8,
                    text: s.L.ruler.text,
                    size: 0.6,
                },
            );
    }
    if (m && s.phase === "run")
        for (const f of m.fans)
            for (let k = 0; k < 3; k++) {
                const y = f.y - 1.6 + (k - 1) * 0.6,
                    x = f.x + 1.3 + ((s.steps * 0.15 + k * 1.3) % 3);
                marks.push({ kind: "line", a: { x, y }, b: { x: x + 1.4, y }, style: "thin" });
            }
    // the toy tray, under the floor, holds the parts not yet put out, each on its own round chip
    const trayW = Math.max(12, Math.round(s.tray.length * DRAWER.slot + 2));
    sprites.push({
        key: "tray",
        art: "toyroom",
        params: { part: "tray", w: trayW, h: 6 },
        x: DRAWER.first - DRAWER.slot / 2 - 1 + trayW / 2,
        y: (DRAWER.y0 + DRAWER.y1) / 2,
        size: trayW,
        z: 2,
        still: true,
    });
    s.tray.forEach((t, i) => {
        const slot = slotOf(i);
        sprites.push({
            key: `chip:${i}`,
            art: "toyroom",
            params: { part: "chip", w: 8, h: 6 },
            x: slot.x,
            y: slot.y - 0.2,
            size: 3.4,
            z: 3,
            alpha: onBench(s, t.id) || s.drag?.id === t.id ? 0.35 : 1,
        });
        if (onBench(s, t.id) || s.drag?.id === t.id) return;
        const base = fresh(s, t.id);
        if (!base) return;
        const shown: Part =
            t.kind === "row"
                ? { ...base, n: Math.min(base.n, 2), x: slot.x - 1, y: slot.y + 1.3 }
                : t.kind === "ramp" || t.kind === "long"
                  ? { ...base, angle: 0, x: slot.x, y: slot.y }
                  : stands(base)
                    ? { ...base, x: slot.x, y: slot.y + 1.3 }
                    : { ...base, x: slot.x, y: slot.y };
        for (const sp of partSprites(s, shown, null))
            sprites.push({
                ...sp,
                key: `drawer:${sp.key}`,
                size: (sp.size ?? 1) * (t.kind === "ramp" || t.kind === "long" ? 0.6 : 0.75),
                z: 8,
            });
        // the count and the price on lines of their own; a phone, where words keep a least size, has
        // room under a slot only for the numbers, on one line
        const lines: { text: string; phone: string }[] = [];
        if (t.kind === "row") lines.push({ text: `${base.n} dominoes`, phone: String(base.n) });
        if (s.L.budget !== undefined)
            lines.push(
                t.kind === "row"
                    ? { text: "1 coin each", phone: `${base.n}, 1 each` }
                    : { text: `${PRICE[t.kind]} coins`, phone: String(PRICE[t.kind]) },
            );
        lines.forEach((l, k) =>
            marks.push({
                kind: "word",
                x: slot.x,
                y: DRAWER.y1 - 0.2 - (lines.length - 1 - k) * 1.3,
                text: l.text,
                size: 0.5,
                phone: lines.length > 1 && k === 0 ? "" : l.phone,
            }),
        );
        if (s.keys && t.id === s.selected && s.phase === "build")
            marks.push({
                kind: "box",
                x: slot.x - DRAWER.slot / 2 + 0.4,
                y: DRAWER.y0 + 0.3,
                w: DRAWER.slot - 0.8,
                h: DRAWER.y1 - DRAWER.y0 - 0.6,
                on: true,
            });
    });
    if (s.L.budget !== undefined)
        marks.push({
            kind: "word",
            x: 6,
            y: 2,
            text: `${spent(s)} of ${s.L.budget} coins`,
            size: 0.8,
        });
    // Charlie stands by the first thing in the chain, gives her push, and cheers the bell
    const foot = footOf(s);
    sprites.push({
        key: "charlie",
        art: "charlie",
        params: { pose: ACT[s.phase], mood: s.phase === "won" ? "excited" : "happy", dir: 1 },
        x: foot.x,
        y: foot.y,
        size: 3.2,
        stand: true,
        z: 8,
    });
    let focus: Pt = { x: W / 2, y: FLOOR - 6 };
    if (m) {
        // the eye follows whatever moved last: the domino falling now, the ball, the boat
        const moving = [...m.of.values()].flat().filter((b) => m.world.moving(b, 0.3));
        const last = moving[moving.length - 1];
        if (last) {
            const at = m.world.where(last);
            focus = { x: at.x, y: at.y };
        }
    }
    const view = framing(s);
    return {
        sprites,
        marks,
        camera: { x: view.x, y: view.y, zoom: 1 },
        view: { w: view.w, h: view.h },
        world: { w: W, h: H },
        focus,
        // the pond is real water the boat floats on, its surface a little below the boards
        water: s.scene.pond
            ? [
                  {
                      x: s.scene.pond.from,
                      w: s.scene.pond.to - s.scene.pond.from,
                      level: FLOOR - 0.1,
                      bottom: FLOOR + 1.4,
                      waves: 0.05,
                  },
              ]
            : [],
    };
}

function say(s: MachineState): string {
    const parts = s.bench.map((p) => {
        const what =
            p.kind === "row"
                ? `a row of ${p.n} dominoes from ${p.x.toFixed(1)}`
                : `${p.kind} at ${p.x.toFixed(1)}, ${p.y.toFixed(1)}${p.kind === "ramp" || p.kind === "long" ? `, tipped ${Math.round((p.angle * 180) / Math.PI)} degrees` : ""}`;
        return what;
    });
    const drawer = s.tray.filter((t) => !onBench(s, t.id)).map((t) => t.kind);
    return `${s.text} The bell is at ${s.scene.bell.x.toFixed(1)}. ${parts.length ? `Built: ${parts.join("; ")}.` : "Nothing is built yet."} ${drawer.length ? `In the drawer: ${drawer.join(", ")}.` : ""}${s.L.budget !== undefined ? ` Spent ${spent(s)} of ${s.L.budget} coins.` : ""}`;
}

const SOUNDS: Kit = {
    place: [
        { wave: "square", hz: 420, attack: 0.002, decay: 0.05, gain: 0.3 },
        { wave: "noise", hz: 3800, attack: 0.002, decay: 0.04, gain: 0.35 },
    ],
    ring: [
        { wave: "sine", hz: 1320, attack: 0.003, decay: 1.4, gain: 0.4 },
        { wave: "sine", hz: 1980, attack: 0.003, decay: 1.0, gain: 0.18 },
    ],
    bump: [
        { wave: "noise", hz: 900, attack: 0.002, decay: 0.1, gain: 0.45 },
        { wave: "square", hz: 140, to: 90, attack: 0.002, decay: 0.12, gain: 0.25 },
    ],
};

function hum(s: MachineState): Hum[] {
    const m = s.run;
    if (!m || s.phase !== "run" || m.fans.length === 0) return [];
    return [{ kind: "wind", level: 0.6 }];
}

/** A built machine to keep: the parts on the bench. */
export interface Design {
    bench: Part[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** A kept machine read back against the drawer it was built from, or null when it is not one. */
export function readDesign(s: MachineState, v: unknown): Part[] | null {
    if (!isRecord(v) || !Array.isArray(v.bench)) return null;
    const out: Part[] = [];
    for (const raw of v.bench as unknown[]) {
        if (!isRecord(raw)) return null;
        const { id, x, y, angle, n } = raw;
        if (
            typeof id !== "string" ||
            typeof x !== "number" ||
            typeof y !== "number" ||
            typeof angle !== "number" ||
            typeof n !== "number"
        )
            return null;
        const t = s.tray.find((q) => q.id === id);
        if (
            !t ||
            out.some((p) => p.id === id) ||
            !Number.isFinite(x + y + angle) ||
            !Number.isInteger(n) ||
            n < 1 ||
            n > MOST
        )
            return null;
        out.push({ id, kind: t.kind, x, y, angle, n: t.counts ? n : (t.n ?? 1) });
    }
    return out;
}

export const machineGame: ActionGame<MachineState> = {
    id: "machine",
    title: "Domino machine",
    group: "action",
    // the bench, the bell and the drawer under the floor fill a wide field and play by dragging between them, which a small card crops
    card: null,
    portrait: { hint: true },
    quiet: true,
    touch: true,
    saves: { level: FREE },
    levels: MACHINE_LEVELS,
    rate: RATE,
    sounds: SOUNDS,
    hum,
    cover: { art: "machinepart", params: { part: "domino", label: "", colour: "tang" } },
    hint: "Drag parts up from the drawer onto the floor or a shelf, drag a row's grip to change how many, drag a ramp's grip to tip it, then press Go. With the keys: N chooses a part, the arrows move it, Q and R tip a ramp, = and - change how many, X puts a part back, Backspace undoes, and space is Go",
    controls: {
        arrows: { left: "Left", right: "Right", up: "Up", down: "Down" },
        go: "Go",
        icons: { go: "play" },
    },
    commands: [
        { id: "next", label: "Next part", key: "n", icon: "grab" },
        { id: "turn-left", label: "Turn left", key: "q" },
        { id: "turn-right", label: "Turn right", key: "r" },
        { id: "more", label: "More", key: "=", icon: "add" },
        { id: "fewer", label: "Fewer", key: "-", icon: "less" },
        { id: "stow", label: "Back in the drawer", key: "x", icon: "close" },
    ],
    command: machineCommand,
    // the arrows, Go, the next part and Undo always show; the rest only when a part is held or chosen, so the bar stays short
    shows: (s, id) => {
        if (id === "next") return true;
        const p = onBench(s, s.selected);
        if (s.phase !== "build" || !p) return false;
        if (id === "turn-left" || id === "turn-right")
            return p.kind === "ramp" || p.kind === "long";
        if (id === "more" || id === "fewer") return counts(s, p.id);
        return id === "stow";
    },
    start: (level) => startMachine(MACHINE_LEVELS[level] ?? MACHINE_LEVELS[0], level),
    step,
    frame,
    say,
    note: (s) => s.text,
    won: (s) => s.phase === "won",
    objectives: (s) => ({ completed: s.phase === "won" ? 1 : 0, total: 1 }),
    back: (s) => undo(s),
    checkpoint: (s): Design => ({ bench: s.bench.map((p) => ({ ...p })) }),
    restore: (s, value) => {
        if (s.phase !== "build") return false;
        const bench = readDesign(s, value);
        if (!bench) return false;
        s.bench = [];
        for (const p of bench) if (room(s, p)) s.bench.push(p);
        s.past = [];
        return true;
    },
    cancelInput: (s) => {
        s.drag = null;
        s.pose = null;
        s.hand = null;
    },
    tuning: MACHINE,
    still: {
        press: () => 12,
        settling: (s) => s.phase === "run",
    },
};
