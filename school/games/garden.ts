// Charlie's garden: a vegetable plot seen from above, where a child walks Charlie about, sows seeds
// in rows, waters them from a can, waits the nights it takes them to grow, picks them, and shares the
// harvest.
//
// Charlie walks wherever the arrows or a finger send her and carries one thing at a time: a packet of
// seeds, the watering can or the basket. One Action does what the thing she faces asks: take it, plant,
// water, pick, share, or put down what she holds. Sowing is a rectangle stretched from the cell she
// starts at to the one she walks to, so an array is what her walk makes. Water falls as real drops
// that soak in where they land, and a bed can be too dry to grow or so wet it stands in a puddle. The
// nights pass at the sundial. The mathematics is in the jobs: three rows of four carrots, two litres
// a bed, a harvest of twenty four shared between four baskets, enough for three customers who want
// five each. The garden's rules are engine/motion/garden.ts. See .docs/games.md.
import {
    arrayOf,
    bed as makeBed,
    cellAt,
    cellMiddle,
    garden as makeGarden,
    holes,
    isRipe,
    night,
    pests,
    plantAt,
    bare,
    sow,
    sowingFrom,
    soggy,
    stage,
    thirst,
    water,
    type Bed,
    type Garden,
    type Night,
    type Plant,
    type Runoff,
    type Sowing,
} from "../../engine/motion/garden";
import { actor, actorSprites, stepActor, type Actor, type Cycle } from "../../engine/motion/actor";
import type { Pt } from "../../engine/motion/geometry";
import {
    drain,
    liquid,
    places,
    pour,
    stepLiquid,
    STREAM,
    type Liquid,
} from "../../engine/motion/liquid";
import type { Pad } from "../../engine/motion/pad";
import { bounce, bubbleWidth, currentOf, pointing, wrap } from "../../engine/motion/guide";
import {
    ahead,
    blockedAt,
    faceTo,
    facing,
    heading,
    roamer,
    stepRoam,
    walkTo,
    type Gait,
    type Place,
    type Roamer,
} from "../../engine/motion/roam";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import type { IconName } from "../../engine/parts/apps/icon";
import { BED_CELL } from "../../engine/parts/outdoors/gardenbed";
import { CROPS, CROP_WORDS, isCrop, type Crop } from "../../engine/parts/outdoors/gardencrop";
import { ROSE } from "../../engine/parts/outdoors/wateringcan";
import type { Hum, Kit } from "../../engine/sound/kit";
import type { ActionGame, ActionLevel, Levels } from "./game";

export const RATE = 60;
const DT = 1 / RATE;
/** Steps idle before the guide points and Charlie says the next step, on levels past the first. */
const GUIDE_WAIT = RATE * 8;

/** The plot, in squares: the cottage and the seeds on the left, the beds in the middle, the basket and the sundial on the right. */
export const WORLD = { w: 44, h: 26 } as const;

/** What a job asks for. Left out, a level is a free garden. */
export interface Ask {
    crop: Crop;
    /** The array to sow in each job bed: rows of plants, and plants in a row. */
    rows?: number;
    cols?: number;
    /** A number of plants in any arrangement, when no array is asked for. */
    count?: number;
    /** The litres each job bed must have each day, near enough, for a level that measures watering. */
    litres?: number;
    /** Baskets the harvest is shared fairly between. */
    share?: number;
    /** Customers who each want so many. */
    want?: { customers: number; each: number };
}

export interface GardenLevel extends ActionLevel {
    /** The first thing to do, said before anything has been. */
    prompt: string;
    beds: { x: number; y: number; cols: number; rows: number; job?: true }[];
    crops: Crop[];
    ask: Ask | null;
    /** The nights it rains, counting the first night as nought. */
    rain?: number[];
    /** In a greenhouse: crops ripen a night sooner. */
    greenhouse?: { x: number; y: number; w: number; h: number };
    /** Slopes above beds that water runs down. */
    runoff?: Runoff[];
    pests?: { weeds: number; snails: number };
    /** Nights to ripe for a crop here, where they differ from a crop's own. */
    ripe?: Partial<Record<Crop, number>>;
    /** How much the board helps: the count and the water's arc at 2, the water left at 1, at nought only what is done. */
    preview: 0 | 1 | 2;
}

/** Nights from sowing to ripe. */
const RIPE: Record<Crop, number> = {
    carrot: 3,
    lettuce: 2,
    strawberry: 3,
    sunflower: 4,
    pumpkin: 4,
};
/** Cells across a plant takes: a pumpkin spreads. */
export const SPAN: Record<Crop, number> = {
    carrot: 1,
    lettuce: 1,
    strawberry: 1,
    sunflower: 1,
    pumpkin: 2,
};

export const GARDEN = {
    drink: knob(0.25, 0.1, 0.6, 0.05, "litres", "what a growing plant drinks in a night"),
    soggy: knob(2.5, 1.5, 4, 0.1, "nights", "the water a bed holds before it stands in a puddle"),
    rain: knob(6, 2, 10, 0.5, "litres", "the rain on a bed in a rainy night"),
    litre: knob(0.045, 0.02, 0.08, 0.005, "litres", "what a drop carries"),
    pour: knob(22, 8, 40, 1, "drops/s", "the drops from a can tipped right over"),
    tip: knob(
        4,
        1,
        10,
        0.5,
        "/s",
        "how quickly the can tips when held still, and rights itself when it moves",
    ),
    within: knob(
        0.25,
        0.1,
        0.5,
        0.05,
        "litres",
        "either side of the amount a measured bed counts as right",
    ),
    share: knob(9, 4, 20, 1, "steps", "between one picked thing and the next put into a crate"),
    walk: knob(8, 4, 12, 0.5, "squares/s", "how fast the gardener walks"),
    sip: knob(0.7, 0.2, 2, 0.1, "s", "how long one press of Enter pours for"),
};

const job = (x: number, y: number, cols: number, rows: number) => ({
    x,
    y,
    cols,
    rows,
    job: true as const,
});

export const GARDEN_LEVELS: Levels<GardenLevel> = [
    {
        title: "A bed by the cottage",
        grades: [1, 1],
        goal: "Plant a row of 5 carrots, water them, and pick them when they are ripe.",
        prompt: "Take the carrot seeds to the bed and plant a row of 5.",
        beds: [job(14, 11, 6, 2)],
        crops: ["carrot"],
        ask: { crop: "carrot", rows: 1, cols: 5 },
        ripe: { carrot: 2 },
        preview: 2,
    },
    {
        title: "Rows of lettuces",
        grades: [1, 2],
        goal: "Plant 2 rows of 3 lettuces, grow them and pick them.",
        prompt: "Take the lettuce seeds to the bed and plant 2 rows of 3.",
        beds: [job(14, 10, 6, 4)],
        crops: ["lettuce", "carrot"],
        ask: { crop: "lettuce", rows: 2, cols: 3 },
        preview: 2,
    },
    {
        title: "The vegetable patch",
        grades: [2, 2],
        goal: "Plant 3 rows of 4 carrots in the long bed, grow them and pick them.",
        prompt: "Sow 3 rows of 4 carrots in the long bed on the left.",
        beds: [job(11, 10, 6, 4), { x: 26, y: 10, cols: 4, rows: 4 }],
        crops: ["carrot", "lettuce"],
        ask: { crop: "carrot", rows: 3, cols: 4 },
        preview: 2,
    },
    {
        title: "A rainy spring",
        grades: [2, 2],
        goal: "Fill the bed with sunflowers, one in every hole, and pick them. Rain waters the bed some nights.",
        prompt: "The bed is 5 holes across and 3 down. Fill it with sunflowers.",
        beds: [job(15, 11, 5, 3)],
        crops: ["sunflower"],
        ask: { crop: "sunflower", rows: 3, cols: 5 },
        rain: [1, 2],
        preview: 1,
    },
    {
        title: "The greenhouse",
        grades: [2, 3],
        goal: "Plant 2 rows of 3 strawberries in each bed, and give each bed 2 litres of water every day.",
        prompt: "Sow 2 rows of 3 strawberries in both beds. It is warm in here, so they ripen quickly.",
        beds: [job(12, 11, 4, 3), job(24, 11, 4, 3)],
        crops: ["strawberry"],
        ask: { crop: "strawberry", rows: 2, cols: 3, litres: 2 },
        greenhouse: { x: 10, y: 8.5, w: 26, h: 11 },
        ripe: { strawberry: 2 },
        preview: 1,
    },
    {
        title: "A hilly garden",
        grades: [3, 3],
        goal: "Plant 4 rows of 5 strawberries in the left bed. Water poured on the hill runs down into the bed below it.",
        prompt: "Sow 4 rows of 5 strawberries in the left bed, under the hill.",
        beds: [job(11, 13, 5, 4), { x: 25, y: 13, cols: 5, rows: 4 }],
        crops: ["strawberry", "lettuce"],
        ask: { crop: "strawberry", rows: 4, cols: 5 },
        runoff: [
            { x: 11, y: 8.5, w: 12, h: 4.5, into: 0 },
            { x: 23, y: 8.5, w: 12, h: 4.5, into: 1 },
        ],
        preview: 1,
    },
    {
        title: "Snail summer",
        grades: [3, 3],
        goal: "Grow 24 strawberries and share them fairly between the 4 baskets. Pull up weeds and shoo the snails.",
        prompt: "Sow 24 strawberries. How many rows, and how many in a row?",
        beds: [job(11, 10, 8, 4)],
        crops: ["strawberry"],
        ask: { crop: "strawberry", count: 24, share: 4 },
        pests: { weeds: 2, snails: 1 },
        preview: 0,
    },
    {
        title: "The harvest fair",
        grades: [3, 4],
        goal: "3 customers each want 5 carrots. Grow enough, pick them, and fill each customer's crate.",
        prompt: "How many carrots will 3 customers who want 5 each need? Sow them.",
        beds: [job(11, 10, 8, 5)],
        crops: ["carrot", "lettuce", "pumpkin"],
        ask: { crop: "carrot", want: { customers: 3, each: 5 } },
        preview: 0,
    },
    {
        title: "Your own garden",
        grades: [1, 4],
        goal: "Grow whatever you like. Your garden is kept for next time.",
        prompt: "Pick up a packet of seeds and take it to a bed.",
        beds: [
            { x: 11, y: 10, cols: 7, rows: 4 },
            { x: 27, y: 10, cols: 5, rows: 4 },
        ],
        crops: [...CROPS],
        ask: null,
        preview: 2,
    },
];

/** The free garden's level, whose design is kept between visits. */
export const FREE = GARDEN_LEVELS.length - 1;

/** Who gardens: Charlie, a pup, or a friend. */
export const CAST = ["charlie", "pip", "friend"] as const;

/** What she carries: one thing at a time, or nothing. */
export type Held =
    { what: "seed"; crop: Crop } | { what: "can" } | { what: "basket" } | { what: "none" };

type Cell = { bed: number; c: number; r: number };

/** What the one Action does, for what she faces or what a finger touched. */
export type Target =
    | { kind: "packet"; i: number }
    | { kind: "can" }
    | { kind: "basket" }
    | { kind: "dial" }
    | { kind: "crate"; i: number }
    | { kind: "weed"; at: Cell }
    | { kind: "snail"; at: Cell }
    | { kind: "pick"; at: Cell }
    | { kind: "plant"; at: Cell }
    | { kind: "sow" }
    | { kind: "water"; at: Pt }
    | { kind: "drop" };

/** A finger on the field: walking her about, stretching a sowing, pouring, picking or sharing. */
interface Drag {
    what: "walk" | "sow" | "pour" | "pick" | "share";
    at: number;
    from: Pt;
    to: Pt;
    crate: number;
    /** Held or moved past a tap, so she follows the finger. */
    follow: boolean;
}

interface Flying {
    crop: Crop;
    from: Pt;
    to: Pt;
    at: number;
}

interface Snapshot {
    g: Garden;
    basket: Record<Crop, number>;
    crates: number[];
    made: ({ rows: number; cols: number } | null)[];
    sown: number;
}

type Act = "stand" | "walk" | "work" | "cheer";

export interface GardenState {
    phase: number;
    L: GardenLevel;
    seed: number;
    g: Garden;
    basket: Record<Crop, number>;
    crates: number[];
    /** The array each job bed was sown in, read when it was sown. */
    made: ({ rows: number; cols: number } | null)[];
    /** Plants of the asked crop sown, all told. */
    sown: number;
    water: Liquid;
    /** The can as drawn: in her hand, tipped over a bed, or lying where it was put down. */
    can: { x: number; y: number; tilt: number; carry: number; flip: boolean; land: number };
    /** Where each thing lies while she does not hold it. */
    packets: Pt[];
    canAt: Pt;
    basketAt: Pt;
    hand: Held;
    /** A rectangle of holes being stretched, from the cell it began at. */
    sowing: { from: Cell; over: Sowing; touch: boolean } | null;
    /** Pouring, picking or sharing, going on while the button or a finger is held, or `until` a step for a tap. */
    doing: {
        what: "pour" | "pick" | "share";
        until: number;
        crate: number;
        aim: Pt | null;
        /** The step it next picks or shares on, while held. */
        next: number;
    } | null;
    /** What she does when she gets there, after a tap on a thing. */
    errand: Target | null;
    drag: Drag | null;
    last: Pt | null;
    me: Roamer;
    actor: Actor<Act>;
    dir: 1 | -1;
    cheer: number;
    /** When she last took something into her hands, for its pop. */
    took: number;
    /** Where a phone held upright looks: her, followed gently. */
    look: Pt;
    flying: Flying[];
    /** When each plant last grew, by its place, for the pop it gives. */
    grew: Record<string, number>;
    shooed: { x: number; y: number; at: number }[];
    cast: number;
    said: string;
    saidAt: number;
    acted: boolean;
    /** Whether the Action has been used yet, for the first-time hint. */
    used: boolean;
    /** When the step to do last changed or the Action was last used, for the guide's patience. */
    guideAt: number;
    /** The step to do, as it was last step. */
    stepWas: number;
    /** What Charlie says in her bubble, until a step. */
    bubble: { text: string; until: number } | null;
    /** The day a dry bed was last pointed out at the sundial, so a second tap goes on anyway. */
    dryWarned: number;
    steps: number;
    won: boolean;
    wonAt: number;
    undo: Snapshot[];
}

const zero = (): Record<Crop, number> => ({
    carrot: 0,
    lettuce: 0,
    strawberry: 0,
    sunflower: 0,
    pumpkin: 0,
});

const placeKey = (p: { bed: number; c: number; r: number }) => `${p.bed}:${p.c}:${p.r}`;

/** Where things stand on the plot. */
export const PACKET = { x: 2.7, y0: 9.6, gap: 3.4, size: 3 } as const;
export const CAN_HOME = { x: 6.6, y: 23.6 } as const;
export const DIAL = { x: 40.5, y: 4.6 } as const;
export const BASKET = { x: 40.5, y: 11 } as const;
const CAN_SIZE = 2.6;
/** Where she starts: beside the potting bench, turned to the first packet. */
export const START = { x: 5.6, y: 10.2 } as const;
/** How far from her feet she reaches to take a thing. */
export const REACH = 3;
/** How far ahead of her feet the soil she works is, and how near a plant must be to that point. */
const FRONT = 1.2,
    SOIL = 1.7;

export const packetAt = (i: number): Pt => ({ x: PACKET.x, y: PACKET.y0 + i * PACKET.gap });

/** Where each crate stands, for a level that shares the harvest. */
export function crateAt(s: Pick<GardenState, "crates">, i: number): Pt {
    const n = s.crates.length;
    const col = i % 2,
        row = Math.floor(i / 2);
    return { x: n === 1 ? 40.5 : 37.6 + col * 4.6, y: 16 + row * 5 };
}

const near = (a: Pt, b: Pt, rx: number, ry = rx) =>
    Math.abs(a.x - b.x) <= rx && Math.abs(a.y - b.y) <= ry;

function asked(L: GardenLevel): number {
    const a = L.ask;
    if (!a) return 0;
    if (a.rows !== undefined && a.cols !== undefined)
        return a.rows * a.cols * L.beds.filter((b) => b.job).length;
    if (a.count !== undefined) return a.count;
    if (a.want) return a.want.customers * a.want.each;
    return 0;
}

export const ripeIn = (L: GardenLevel, crop: string): number => {
    const c: Crop = isCrop(crop) ? crop : "carrot";
    return L.ripe?.[c] ?? RIPE[c];
};

/** How a night goes on this level. */
export function nightOf(s: GardenState): Night {
    const L = s.L;
    return {
        drink: GARDEN.drink.value,
        soggy: GARDEN.soggy.value,
        rain: L.rain?.includes(s.g.day) ? GARDEN.rain.value : 0,
        ...(L.ask?.litres !== undefined
            ? { exact: { litres: L.ask.litres, within: GARDEN.within.value } }
            : {}),
        ripe: (crop) => ripeIn(L, crop),
    };
}

/** The plot as she walks it: the cottage, hedges, bench, butt, compost, sundial and crates are in the way, and the beds are soil she can cross. */
export function placeOf(s: Pick<GardenState, "L" | "g" | "crates">): Place {
    const bench = Math.min(20, Math.ceil(s.L.crops.length * PACKET.gap + 3));
    return {
        w: WORLD.w,
        h: WORLD.h,
        blocked: [
            { x: 2.4, y: 0, w: 6.4, h: 7.4 },
            { x: 12.5, y: 0, w: 23, h: 5.4 },
            { x: PACKET.x - 1.8, y: PACKET.y0 - 1.6, w: 3.6, h: bench },
            { x: 8.6, y: 22, w: 2.4, h: 2.4 },
            { x: 31.6, y: 22.2, w: 2.8, h: 2.8 },
            { x: DIAL.x - 1.1, y: DIAL.y - 1.2, w: 2.2, h: 2.4 },
            ...s.crates.map((_, i) => {
                const c = crateAt(s, i);
                return { x: c.x - 1.1, y: c.y - 0.7, w: 2.2, h: 1.4 };
            }),
        ],
        soft: s.g.beds.map((b) => ({ x: b.x, y: b.y, w: b.cols * b.cell, h: b.rows * b.cell })),
    };
}

export const gaitOf = (): Gait => ({
    speed: GARDEN.walk.value,
    accel: GARDEN.walk.value * 7,
    radius: 0.5,
});

export function startGarden(L: GardenLevel, phase: number, seed = 1, cast = 0): GardenState {
    const beds = L.beds.map((b) => makeBed(b.x, b.y, b.cols, b.rows, BED_CELL));
    const crates =
        L.ask?.share !== undefined ? L.ask.share : L.ask?.want ? L.ask.want.customers : 0;
    return {
        phase,
        L,
        seed,
        g: makeGarden(beds),
        basket: zero(),
        crates: Array.from({ length: crates }, () => 0),
        made: L.beds.map(() => null),
        sown: 0,
        water: liquid(260),
        can: { x: CAN_HOME.x, y: CAN_HOME.y, tilt: 0, carry: 0, flip: false, land: CAN_HOME.y },
        packets: L.crops.map((_, i) => packetAt(i)),
        canAt: { ...CAN_HOME },
        basketAt: { ...BASKET },
        hand: { what: "none" },
        sowing: null,
        doing: null,
        errand: null,
        drag: null,
        last: null,
        me: roamer(START.x, START.y, { x: -1, y: 0 }),
        actor: actor<Act>("stand", "stand", -1),
        dir: -1,
        cheer: -999,
        took: -999,
        look: { ...START },
        flying: [],
        grew: {},
        shooed: [],
        cast,
        said: "",
        saidAt: -999,
        acted: false,
        used: false,
        guideAt: 0,
        stepWas: 0,
        bubble: null,
        dryWarned: -1,
        steps: 0,
        won: false,
        wonAt: 0,
        undo: [],
    };
}

export const start = (phase: number, seed = 1): GardenState =>
    startGarden(
        GARDEN_LEVELS[phase] ?? GARDEN_LEVELS[0],
        phase,
        seed,
        phase === FREE ? (seed >>> 0) % CAST.length : 0,
    );

function tell(s: GardenState, words: string): void {
    s.said = words;
    s.saidAt = s.steps;
}

function keep(s: GardenState): void {
    s.undo.push({
        g: structuredClone(s.g),
        basket: { ...s.basket },
        crates: [...s.crates],
        made: s.made.map((m) => (m ? { ...m } : null)),
        sown: s.sown,
    });
    if (s.undo.length > 24) s.undo.shift();
}

/** Takes the last thing done back: a sowing, a watering, a night, a picking or a sharing. */
export function back(s: GardenState): boolean {
    const was = s.undo.pop();
    if (!was || s.won) return false;
    s.g = was.g;
    s.basket = was.basket;
    s.crates = was.crates;
    s.made = was.made;
    s.sown = was.sown;
    s.sowing = null;
    s.doing = null;
    s.errand = null;
    s.drag = null;
    s.flying = [];
    s.water = liquid(s.water.most);
    tell(s, "Taken back.");
    return true;
}

const bedBox = (b: Bed) => ({ x: b.x, y: b.y, w: b.cols * b.cell, h: b.rows * b.cell });

/** Whether water falling at a point lands on soil: a bed, or a slope that runs into one. */
function soilAt(s: GardenState, p: Pt): boolean {
    const inside = (z: { x: number; y: number; w: number; h: number }) =>
        p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;
    return s.g.beds.some((b) => inside(bedBox(b))) || (s.L.runoff ?? []).some(inside);
}

/** The cell of a bed nearest her feet, for the corner of a sowing she stretches by walking. */
function cellNearest(s: GardenState, bedAt: number): Cell | null {
    const b = s.g.beds[bedAt];
    if (!b) return null;
    const c = Math.min(b.cols - 1, Math.max(0, Math.floor((s.me.x - b.x) / b.cell))),
        r = Math.min(b.rows - 1, Math.max(0, Math.floor((s.me.y - b.y) / b.cell)));
    return { bed: bedAt, c, r };
}

/** The plant nearest a point within `within` squares of its middle, only a ripe one if `ripe`. */
function plantNear(s: GardenState, p: Pt, within: number, ripe = false): Plant | null {
    let best: Plant | null = null,
        bd = within;
    for (const q of s.g.plants) {
        const b = s.g.beds[q.bed];
        if (!b || (ripe && !isRipe(q, nightOf(s)))) continue;
        const m = cellMiddle(b, q.c, q.r, q.span),
            d = Math.hypot(m.x - p.x, m.y - p.y);
        if (d <= bd) {
            bd = d;
            best = q;
        }
    }
    return best;
}

function pestNear<T extends Cell>(
    s: GardenState,
    list: readonly T[],
    p: Pt,
    within: number,
): T | null {
    for (const x of list) {
        const b = s.g.beds[x.bed];
        if (
            b &&
            Math.hypot(cellMiddle(b, x.c, x.r).x - p.x, cellMiddle(b, x.c, x.r).y - p.y) <= within
        )
            return x;
    }
    return null;
}

const cellOf = (p: Cell): Cell => ({ bed: p.bed, c: p.c, r: p.r });

/** The things lying about that she can take or use, where they are. */
function things(s: GardenState): (Pt & { t: Target })[] {
    const h = s.hand;
    const out: (Pt & { t: Target })[] = [];
    for (const [i, at] of s.packets.entries())
        if (!(h.what === "seed" && s.L.crops[i] === h.crop))
            out.push({ ...at, t: { kind: "packet", i } });
    if (h.what !== "can") out.push({ ...s.canAt, t: { kind: "can" } });
    if (h.what !== "basket") out.push({ ...s.basketAt, t: { kind: "basket" } });
    out.push({ ...DIAL, t: { kind: "dial" } });
    if (h.what === "basket")
        for (let i = 0; i < s.crates.length; i++)
            out.push({ ...crateAt(s, i), t: { kind: "crate", i } });
    return out;
}

/** What the Action would do now, for what she faces. */
export function aim(s: GardenState): Target | null {
    if (s.sowing && !s.sowing.touch) return { kind: "sow" };
    const me = s.me,
        f = ahead(me, FRONT);
    const sn = pestNear(s, s.g.snails, f, SOIL) ?? pestNear(s, s.g.snails, me, 1);
    if (sn) return { kind: "snail", at: cellOf(sn) };
    const w = pestNear(s, s.g.weeds, f, SOIL) ?? pestNear(s, s.g.weeds, me, 1);
    if (w) return { kind: "weed", at: cellOf(w) };
    const h = s.hand;
    const cell = cellAt(s.g.beds, f) ?? cellAt(s.g.beds, me);
    if (h.what === "seed" && cell) {
        const at = cellNearest(s, cell.bed);
        if (at) return { kind: "plant", at };
    }
    if (h.what === "can" && soilAt(s, f)) return { kind: "water", at: f };
    if (h.what === "basket") {
        // a ripe plant anywhere about her comes first, so the basket is not put down beside one
        const p = plantNear(s, f, SOIL, true) ?? plantNear(s, me, 3, true) ?? plantNear(s, f, SOIL);
        if (p) return { kind: "pick", at: cellOf(p) };
    }
    const t = facing(me, things(s), REACH);
    if (t) return t.t;
    if (h.what !== "none") return { kind: "drop" };
    return null;
}

const HELD_WORDS = (h: Held): string =>
    h.what === "seed" ? `${CROP_WORDS[h.crop].one} seeds` : h.what === "none" ? "" : h.what;

/** The Action's word for a target. */
export function labelOf(s: GardenState, t: Target | null): string {
    if (!t) return "Action";
    switch (t.kind) {
        case "packet":
            return `Pick up ${CROP_WORDS[s.L.crops[t.i] ?? "carrot"].one} seeds`;
        case "can":
            return "Pick up can";
        case "basket":
            return "Pick up basket";
        case "dial":
            return "Next day";
        case "crate":
            return "Share";
        case "weed":
            return "Pull weed";
        case "snail":
            return "Shoo snail";
        case "pick":
            return "Pick";
        case "plant":
            return "Plant";
        case "sow":
            return "Sow";
        case "water":
            return "Water";
        case "drop":
            return `Put down ${HELD_WORDS(s.hand)}`;
    }
}

const ICON: Record<Target["kind"], IconName> = {
    packet: "grab",
    can: "grab",
    basket: "grab",
    dial: "sun",
    crate: "basket",
    weed: "grab",
    snail: "grab",
    pick: "basket",
    plant: "seed",
    sow: "seed",
    water: "water",
    drop: "grab",
};

/** Where a target is on the plot, for the ring under it and for walking to it. */
export function pointOf(s: GardenState, t: Target): Pt | null {
    switch (t.kind) {
        case "packet":
            return s.packets[t.i] ?? null;
        case "can":
            return s.canAt;
        case "basket":
            return s.basketAt;
        case "dial":
            return DIAL;
        case "crate":
            return crateAt(s, t.i);
        case "weed":
        case "snail":
        case "pick":
        case "plant": {
            const b = s.g.beds[t.at.bed];
            const span =
                t.kind === "pick" ? (plantAt(s.g, t.at.bed, t.at.c, t.at.r)?.span ?? 1) : 1;
            return b ? cellMiddle(b, t.at.c, t.at.r, span) : null;
        }
        case "water":
            return t.at;
        case "sow":
        case "drop":
            return null;
    }
}

function shoo(s: GardenState, at: Cell, out: Happening[]): void {
    const i = s.g.snails.findIndex((x) => x.bed === at.bed && x.c === at.c && x.r === at.r);
    const sn = s.g.snails[i];
    if (!sn) return;
    keep(s);
    const b = s.g.beds[sn.bed];
    if (b) {
        const m = cellMiddle(b, sn.c, sn.r);
        s.shooed.push({ x: m.x, y: m.y, at: s.steps });
    }
    s.g.snails.splice(i, 1);
    out.push({ cue: "bump", strength: 0.4 });
    tell(s, "Shoo! The snail curls up and is carried off to the hedge.");
}

function pull(s: GardenState, at: Cell, out: Happening[]): void {
    const i = s.g.weeds.findIndex((x) => x.bed === at.bed && x.c === at.c && x.r === at.r);
    const w = s.g.weeds[i];
    if (!w) return;
    keep(s);
    const b = s.g.beds[w.bed];
    if (b) {
        const m = cellMiddle(b, w.c, w.r);
        out.push({ burst: { kind: "dust", x: m.x, y: m.y, n: 6 } });
    }
    s.g.weeds.splice(i, 1);
    out.push({ cue: "lift", strength: 0.5 });
    tell(s, "Pulled up. The plants beside it have their water back.");
}

/** A night passes: rain falls, the plants grow or rest, and new weeds and snails come. */
export function nextDay(s: GardenState, out: Happening[]): void {
    if (s.won) return;
    keep(s);
    s.doing = null;
    const n = nightOf(s);
    const rained = n.rain > 0;
    const before = new Map(s.g.plants.map((p) => [placeKey(p), p.age]));
    const grew = night(s.g, n);
    for (const p of s.g.plants)
        if ((before.get(placeKey(p)) ?? 0) !== p.age) s.grew[placeKey(p)] = s.steps;
    if (s.L.pests && s.g.plants.length)
        pests(s.g, s.seed, { ...s.L.pests, ripe: (c) => ripeIn(s.L, c) });
    const rests = new Set(s.g.plants.map((p) => p.rest));
    const day = `Day ${s.g.day + 1}.`;
    const rain = rained ? " It rained in the night." : "";
    if (s.g.plants.length === 0) tell(s, `${day}${rain} Nothing is planted yet.`);
    else if (grew > 0)
        tell(
            s,
            `${day}${rain} ${grew === 1 ? "A plant grew" : `${grew} plants grew`}.${rests.has("dry") ? " Some beds were too dry." : ""}${rests.has("soggy") ? " A bed is soggy and grew nothing." : ""}`,
        );
    else if (rests.has("soggy"))
        tell(s, `${day}${rain} The bed is too wet to grow. It will drain.`);
    else if (rests.has("dry"))
        tell(s, `${day} The soil was too dry, so nothing grew. Water before the night.`);
    else if (rests.has("weeded")) tell(s, `${day} The weeds drank the water. Pull them up.`);
    else tell(s, `${day}${rain}`);
    if (s.g.weeds.length || s.g.snails.length)
        s.said += s.g.snails.length ? " A snail has come. Shoo it away." : " Weeds have come up.";
    if (s.L.rain?.includes(s.g.day)) s.said += " Rain is coming tonight.";
    out.push(grew > 0 ? { cue: "level", strength: 0.6 } : { cue: "nope", strength: 0.3 });
    if (rained) out.push({ burst: { kind: "splash", x: 22, y: 12, n: 12 } });
    judge(s, out);
}

/** The cells a sowing would fill, and whether each is bare. */
export function sowingHoles(s: GardenState, w: Sowing): { at: Pt; bare: boolean }[] {
    const b = s.g.beds[w.bed];
    if (!b) return [];
    return holes(w).map((h) => ({
        at: cellMiddle(b, h.c, h.r, w.span),
        bare: bare(s.g, w.bed, h.c, h.r, w.span),
    }));
}

function plant(s: GardenState, w: Sowing, crop: Crop, out: Happening[]): void {
    const free = sowingHoles(s, w).filter((x) => x.bare).length;
    if (free === 0) {
        tell(s, "Those holes are full already.");
        out.push({ cue: "nope", strength: 0.3 });
        return;
    }
    keep(s);
    const n = sow(s.g, w, crop);
    for (const p of s.g.plants)
        if (p.age === 0 && s.grew[placeKey(p)] === undefined) s.grew[placeKey(p)] = s.steps;
    const a = s.L.ask;
    if (a && crop === a.crop) s.sown += n;
    for (const [i, def] of s.L.beds.entries())
        if (def.job && a) s.made[i] = arrayOf(s.g, i, a.crop);
    const words = CROP_WORDS[crop];
    const shape =
        w.rows === 1
            ? `a row of ${w.cols}`
            : `${w.rows} rows of ${w.cols}, ${w.rows * w.cols} in all`;
    tell(
        s,
        `Sown: ${shape} ${n === 1 ? words.one : words.many}.${n < w.rows * w.cols ? " Some holes were full." : ""}`,
    );
    out.push(
        { cue: "place", strength: 0.5 },
        { puff: { x: (s.g.beds[w.bed]?.x ?? 0) + 1, y: s.g.beds[w.bed]?.y ?? 0, n: 3 } },
    );
    if (a && a.rows !== undefined && a.cols !== undefined && crop === a.crop) {
        const m = s.made[w.bed];
        if (m && m.rows === a.cols && m.cols === a.rows && a.rows !== a.cols)
            s.said += ` That is ${m.rows} rows of ${m.cols}: the same number, the other way round.`;
    }
}

/** Where the basket is now: in her hands, or where it lies. */
const basketNow = (s: GardenState): Pt => (s.hand.what === "basket" ? handOf(s) : s.basketAt);

/** Picks the plant at a cell into the basket, and says whether it was ripe to pick. */
function pickAt(s: GardenState, at: Cell, out: Happening[], quiet = false): boolean {
    const here = plantAt(s.g, at.bed, at.c, at.r);
    if (!here) return false;
    if (!isRipe(here, nightOf(s))) {
        if (!quiet && s.steps - s.saidAt > RATE / 2) {
            tell(s, "Not ripe yet. It needs more nights.");
            out.push({ cue: "nope", strength: 0.25 });
        }
        return false;
    }
    keep(s);
    const crop: Crop = isCrop(here.crop) ? here.crop : "carrot";
    s.g.plants = s.g.plants.filter((x) => x !== here);
    s.basket[crop]++;
    const b = s.g.beds[here.bed];
    if (b)
        s.flying.push({
            crop,
            from: cellMiddle(b, here.c, here.r, here.span),
            to: basketNow(s),
            at: s.steps,
        });
    const total = CROPS.reduce((n, c) => n + s.basket[c], 0);
    out.push({ cue: "ring", strength: 0.5, pitch: 1 + Math.min(12, total) * 0.03 });
    const n = s.basket[crop];
    tell(
        s,
        `Picked. ${n} ${n === 1 ? CROP_WORDS[crop].one : CROP_WORDS[crop].many} in the basket.`,
    );
    return true;
}

/** The crop that goes into the crates: the one asked for. */
const shared = (s: GardenState): Crop => s.L.ask?.crop ?? "carrot";

/** One from the basket into a crate. */
function shareInto(s: GardenState, i: number, out: Happening[]): boolean {
    const crop = shared(s);
    if (s.basket[crop] <= 0 || i < 0 || i >= s.crates.length) {
        if (s.steps - s.saidAt > RATE / 2)
            tell(s, `The basket has no ${CROP_WORDS[crop].many} left.`);
        return false;
    }
    keep(s);
    s.basket[crop]--;
    s.crates[i] = (s.crates[i] ?? 0) + 1;
    s.flying.push({ crop, from: basketNow(s), to: crateAt(s, i), at: s.steps });
    out.push({ cue: "bump", strength: 0.3, pitch: 1 + (s.crates[i] ?? 0) * 0.03 });
    const a = s.L.ask;
    const each = a?.want ? a.want.each : a?.share ? asked(s.L) / a.share : 0;
    tell(
        s,
        `${s.crates.join(", ")} in the ${a?.want ? "crates" : "baskets"}${each ? `, and each wants ${each}` : ""}. ${s.basket[crop]} left.`,
    );
    return true;
}

/** Puts what she holds back where it came from, for a swap. */
function putHome(s: GardenState): void {
    const h = s.hand;
    if (h.what === "seed") {
        const i = s.L.crops.indexOf(h.crop);
        if (i >= 0) s.packets[i] = packetAt(i);
    } else if (h.what === "can") s.canAt = { ...CAN_HOME };
    else if (h.what === "basket") s.basketAt = { ...BASKET };
    s.hand = { what: "none" };
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

function take(s: GardenState, held: Held, from: Pt, out: Happening[]): void {
    if (s.hand.what !== "none") putHome(s);
    s.sowing = null;
    s.doing = null;
    s.hand = held;
    s.took = s.steps;
    out.push({ cue: "lift", strength: 0.4 }, { puff: { x: from.x, y: from.y, n: 3 } });
    tell(
        s,
        held.what === "seed"
            ? `${cap(CROP_WORDS[held.crop].one)} seeds. Take them to a bed and plant them.`
            : held.what === "can"
              ? "The watering can. Hold the button by a bed to pour."
              : "The basket. Pick what is ripe into it.",
    );
}

/** Puts what she holds down in front of her, or at her feet where that is in the way. */
function putDown(s: GardenState, out: Happening[]): void {
    const h = s.hand;
    if (h.what === "none") return;
    const f = ahead(s.me, 0.9);
    const at = blockedAt(placeOf(s), f, 0.3) ? { x: s.me.x, y: s.me.y } : f;
    if (h.what === "seed") {
        const i = s.L.crops.indexOf(h.crop);
        if (i >= 0) s.packets[i] = at;
    } else if (h.what === "can") s.canAt = at;
    else s.basketAt = at;
    s.hand = { what: "none" };
    s.sowing = null;
    s.doing = null;
    out.push({ cue: "place", strength: 0.35 }, { puff: { x: at.x, y: at.y, n: 3 } });
}

/** Steps a press of the Action pours for when it is let go at once, as Enter is. */
const sip = () => Math.round(GARDEN.sip.value * RATE);
const shareGap = () => Math.round(GARDEN.share.value);

/** Does what a target asks, by the keys or by a finger's errand. */
function act(s: GardenState, t: Target, out: Happening[]): void {
    s.acted = true;
    s.used = true;
    s.guideAt = s.steps;
    s.bubble = null;
    switch (t.kind) {
        case "packet": {
            const crop = s.L.crops[t.i];
            const at = s.packets[t.i];
            if (crop && at) take(s, { what: "seed", crop }, at, out);
            return;
        }
        case "can":
            take(s, { what: "can" }, s.canAt, out);
            return;
        case "basket":
            take(s, { what: "basket" }, s.basketAt, out);
            return;
        case "dial":
            sundial(s, out);
            return;
        case "crate":
            if (s.hand.what !== "basket") {
                tell(s, "Bring the basket here to share.");
                out.push({ cue: "nope", strength: 0.3 });
                return;
            }
            shareInto(s, t.i, out);
            s.doing = {
                what: "share",
                until: 0,
                crate: t.i,
                aim: null,
                next: s.steps + shareGap(),
            };
            return;
        case "weed":
            pull(s, t.at, out);
            return;
        case "snail":
            shoo(s, t.at, out);
            return;
        case "pick":
            if (s.hand.what !== "basket") {
                tell(s, "Pick up the basket first, to carry what you pick.");
                out.push({ cue: "nope", strength: 0.3 });
                return;
            }
            pickAt(s, t.at, out);
            s.doing = { what: "pick", until: 0, crate: -1, aim: null, next: s.steps + 4 };
            return;
        case "plant": {
            const h = s.hand;
            if (h.what !== "seed") return;
            const over = sowingFrom(s.g.beds, t.at.bed, t.at, t.at, SPAN[h.crop]);
            if (!over) return;
            s.sowing = { from: t.at, over, touch: false };
            out.push({ cue: "lift", strength: 0.25 });
            tell(s, "Walk to stretch the rows, then press again to sow.");
            return;
        }
        case "sow": {
            const h = s.hand,
                w = s.sowing;
            s.sowing = null;
            if (h.what === "seed" && w) plant(s, w.over, h.crop, out);
            judge(s, out);
            return;
        }
        case "water":
            s.doing = { what: "pour", until: s.steps + sip(), crate: -1, aim: null, next: 0 };
            return;
        case "drop":
            putDown(s, out);
            return;
    }
}

/** Whether the job is done: the arrays sown as asked, everything grown picked, and the harvest shared. */
export function done(s: GardenState): boolean {
    const a = s.L.ask;
    if (!a) return false;
    const crop = a.crop;
    const left = s.g.plants.filter((p) => p.crop === crop).length;
    const picked = s.basket[crop] + s.crates.reduce((x, y) => x + y, 0);
    if (a.want) return s.crates.every((c) => c === a.want?.each);
    if (a.rows !== undefined && a.cols !== undefined) {
        for (const [i, def] of s.L.beds.entries()) {
            if (!def.job) continue;
            const m = s.made[i];
            if (!m) return false;
            const ok =
                (m.rows === a.rows && m.cols === a.cols) ||
                (m.rows === a.cols && m.cols === a.rows);
            if (!ok) return false;
        }
    }
    const total = asked(s.L);
    if (s.sown !== total || picked !== total || left > 0) return false;
    if (a.share !== undefined)
        return s.basket[crop] === 0 && s.crates.every((c) => c === total / (a.share ?? 1));
    return true;
}

function judge(s: GardenState, out: Happening[]): void {
    if (s.won || !done(s)) return;
    s.won = true;
    s.wonAt = s.steps;
    s.cheer = s.steps;
    const a = s.L.ask;
    tell(
        s,
        a?.want
            ? "Every customer has their carrots. What a fair!"
            : a?.share
              ? "Shared fairly: the same in every basket."
              : "All picked. What a harvest!",
    );
    const at = basketNow(s);
    out.push({ cue: "win" }, { burst: { kind: "sparkle", x: at.x, y: at.y, n: 18 } });
}

/** The guide's steps for a job, in order: each worked out from the garden as it stands. */
export interface GuideStep {
    key: "seeds" | "plant" | "water" | "grow" | "pick" | "share";
    /** Its name on the step strip. */
    label: string;
    done: boolean;
}

/** The beds that have plants and not enough water for tonight, rain counted. */
function dryBeds(s: GardenState): number[] {
    const n = nightOf(s);
    const out: number[] = [];
    for (const [i, b] of s.g.beds.entries()) {
        const need = thirst(s.g, i, n);
        if (need > 0 && b.water + n.rain < need) out.push(i);
    }
    return out;
}

/** What the step strip says for the planting: the array asked for, or how many. */
function plantLabel(L: GardenLevel): string {
    const a = L.ask;
    if (!a) return "Plant some";
    const each = L.beds.filter((b) => b.job).length > 1 ? " in each bed" : "";
    if (a.rows !== undefined && a.cols !== undefined)
        return a.rows === 1
            ? `Plant ${a.cols} in a row${each}`
            : `Plant ${a.rows} rows of ${a.cols}${each}`;
    if (a.count !== undefined) return `Plant ${a.count}`;
    return "Plant enough";
}

/** The steps of a job, or of the free garden, each ticked from the state. */
export function stepsOf(s: GardenState): GuideStep[] {
    const a = s.L.ask;
    const h = s.hand;
    if (!a) {
        const picked = CROPS.reduce((x, c) => x + s.basket[c], 0);
        const planted = s.g.plants.length > 0 || picked > 0;
        const ripe = s.g.plants.some((p) => isRipe(p, nightOf(s)));
        return [
            { key: "seeds", label: "Get seeds", done: planted || h.what === "seed" },
            { key: "plant", label: plantLabel(s.L), done: planted },
            { key: "water", label: "Water", done: planted && (ripe || !dryBeds(s).length) },
            { key: "grow", label: "Grow", done: ripe || picked > 0 },
            { key: "pick", label: "Pick", done: picked > 0 },
        ];
    }
    const crop = a.crop;
    const total = asked(s.L);
    const mine = s.g.plants.filter((p) => p.crop === crop);
    const planted = s.sown >= total && total > 0;
    const ripe = mine.every((p) => isRipe(p, nightOf(s)));
    const picked = s.basket[crop] + s.crates.reduce((x, y) => x + y, 0);
    const steps: GuideStep[] = [
        {
            key: "seeds",
            label: `Get ${CROP_WORDS[crop].one} seeds`,
            done: planted || (h.what === "seed" && h.crop === crop),
        },
        { key: "plant", label: plantLabel(s.L), done: planted },
        { key: "water", label: "Water", done: planted && (ripe || !dryBeds(s).length) },
        { key: "grow", label: "Grow", done: planted && ripe },
        { key: "pick", label: "Pick", done: planted && mine.length === 0 && picked >= total },
    ];
    if (a.share !== undefined || a.want) steps.push({ key: "share", label: "Share", done: s.won });
    return steps;
}

/** What Charlie says the next thing to do is, in a short, kind sentence. */
export function speechOf(s: GardenState): string {
    if (s.g.snails.length) return "A snail. Walk to it and press the button to shoo it.";
    if (s.g.weeds.length) return "A weed. Walk to it and press the button to pull it up.";
    const steps = stepsOf(s);
    const now = steps[currentOf(steps)];
    const h = s.hand;
    const crop = s.L.ask?.crop;
    const seeds = crop ? `the ${CROP_WORDS[crop].one} seeds` : "some seeds";
    const beds = s.L.beds.filter((b) => b.job).length > 1 ? "the beds" : "the bed";
    switch (now?.key) {
        case "seeds":
            return h.what === "seed"
                ? `These are not the right seeds. Take ${seeds} from the bench.`
                : `Let's get ${seeds} from the bench first.`;
        case "plant":
            if (s.sowing) return "Walk along to stretch it, then press the button again to sow.";
            return h.what === "seed"
                ? `Walk to ${beds} and press the button to start: ${plantLabel(s.L).toLowerCase()}.`
                : `Pick up ${seeds} to plant them.`;
        case "water":
            return h.what === "can"
                ? `Stand by ${beds} and hold the button to water.`
                : "Now fetch the watering can by the water butt.";
        case "grow":
            return "They need nights to grow. Tap the sundial for the next day.";
        case "pick":
            return h.what === "basket"
                ? "They are ripe. Walk along the row and hold the button to pick."
                : "They are ripe. Get the basket to pick them.";
        case "share":
            return h.what === "basket"
                ? "Share them out: the same in each one. Press the button at each."
                : "Bring the basket over to share them.";
        default:
            return s.won
                ? "All done. Well gardened."
                : "Pick up some seeds and take them to a bed.";
    }
}

/** Where the guide's arrow points, and what it points at: the thing the step to do needs next. */
export function pointerOf(s: GardenState): { at: Pt; name: string } | null {
    if (s.won) return null;
    const bedOf = (i: number) => s.g.beds[i];
    const sn = s.g.snails[0],
        wd = s.g.weeds[0];
    const pest = sn ?? wd;
    if (pest) {
        const b = bedOf(pest.bed);
        return b
            ? { at: cellMiddle(b, pest.c, pest.r), name: sn ? "the snail" : "the weed" }
            : null;
    }
    const steps = stepsOf(s);
    const now = steps[currentOf(steps)];
    const h = s.hand;
    const crop = s.L.ask?.crop;
    const seeds = crop ? `the ${CROP_WORDS[crop].one} seeds` : "the seeds";
    const packet = (): { at: Pt; name: string } | null => {
        const at = s.packets[crop ? Math.max(0, s.L.crops.indexOf(crop)) : 0];
        return at ? { at, name: seeds } : null;
    };
    const job = (): number =>
        Math.max(
            0,
            s.L.beds.findIndex((b) => b.job),
        );
    const middle = (i: number): { at: Pt; name: string } | null => {
        const b = bedOf(i);
        return b
            ? {
                  at: { x: b.x + (b.cols * b.cell) / 2, y: b.y + (b.rows * b.cell) / 2 },
                  name: "the bed",
              }
            : null;
    };
    switch (now?.key) {
        case "seeds":
            return packet();
        case "plant":
            if (s.sowing) return null;
            return h.what === "seed" ? middle(job()) : packet();
        case "water":
            return h.what === "can"
                ? middle(dryBeds(s)[0] ?? job())
                : { at: s.canAt, name: "the watering can" };
        case "grow":
            return { at: DIAL, name: "the sundial" };
        case "pick": {
            if (h.what !== "basket") return { at: s.basketAt, name: "the basket" };
            const p = s.g.plants.find((q) => isRipe(q, nightOf(s)));
            const b = p ? bedOf(p.bed) : undefined;
            return p && b ? { at: cellMiddle(b, p.c, p.r, p.span), name: "a ripe plant" } : null;
        }
        case "share": {
            if (h.what !== "basket") return { at: s.basketAt, name: "the basket" };
            const each = s.L.ask?.want?.each ?? asked(s.L) / Math.max(1, s.crates.length);
            const i = s.crates.findIndex((c) => c < each);
            return i < 0 ? null : { at: crateAt(s, i), name: "a crate" };
        }
        default:
            return null;
    }
}

/** Whether the guide's arrow shows now: always on the first level, after a wait on the others. */
export const pointerShows = (s: GardenState): boolean =>
    pointing({ always: s.phase === 0, idle: s.steps - s.guideAt, after: GUIDE_WAIT });

/**
 * A tap on the sundial. With nothing planted no night passes, since nothing would grow; on the
 * first levels a dry bed is pointed out once and a second tap goes on anyway, so a child learns
 * that plants need water without being stuck.
 */
function sundial(s: GardenState, out: Happening[]): void {
    if (s.won) return;
    const say = (line: string) => {
        tell(s, line);
        s.bubble = { text: line, until: s.steps + RATE * 4 };
        out.push({ cue: "nope", strength: 0.3 });
    };
    if (s.g.plants.length === 0) {
        say("Plant something first: nothing will grow yet.");
        return;
    }
    if (s.L.preview >= 2 && dryBeds(s).length && s.dryWarned !== s.g.day) {
        s.dryWarned = s.g.day;
        say("The bed is dry. Water it first, or tap the sundial again to wait anyway.");
        return;
    }
    nextDay(s, out);
}

/** Where the rose of a can at `c` tipped by `tilt` is, in squares; a flipped can pours to the right. */
export function roseOf(c: { x: number; y: number; tilt: number; flip?: boolean }): Pt {
    const k = CAN_SIZE / 4,
        sx = c.flip ? -1 : 1;
    const o = { x: sx * (ROSE.x - 2) * k, y: (ROSE.y - 1.5) * k },
        a = sx * angleOf(c.tilt);
    return {
        x: c.x + o.x * Math.cos(a) - o.y * Math.sin(a),
        y: c.y + o.x * Math.sin(a) + o.y * Math.cos(a),
    };
}

/** The can's turn: anticlockwise as it tips its spout down to the left. */
const angleOf = (tilt: number) => -0.8 * tilt;

/** How high above the soil the rose is held while it pours. */
const POUR_HEIGHT = 1.3;

/** Where her hand is, for what she carries. */
function handOf(s: GardenState): Pt {
    return { x: s.me.x + s.dir * 0.9, y: s.me.y - 1.1 };
}

function pourStep(s: GardenState, pouring: boolean, out: Happening[]): void {
    const c = s.can;
    c.tilt += ((pouring ? 1 : 0) - c.tilt) * Math.min(1, GARDEN.tip.value * DT);
    if (c.tilt > 0.35 && pouring) {
        c.carry += GARDEN.pour.value * DT * c.tilt;
        const r = roseOf(c),
            sx = c.flip ? -1 : 1;
        while (c.carry >= 1) {
            c.carry -= 1;
            const j = ((s.steps * 7919 + s.water.tags.length * 104729) % 1000) / 1000 - 0.5;
            pour(
                s.water,
                { x: r.x + j * 0.25, y: r.y },
                { x: -0.6 * sx + j * 0.8, y: 1.2 },
                Math.round(c.land * 100),
            );
        }
    }
    stepLiquid(s.water, DT, STREAM);
    let into: number | null = null,
        landed = 0;
    for (const d of drain(s.water, (d) => d.y >= d.tag / 100)) {
        const bedAt = water(s.g, { x: d.x, y: d.tag / 100 }, GARDEN.litre.value, s.L.runoff);
        if (bedAt !== null) into = bedAt;
        landed++;
        if (landed === 1 && s.steps % 6 === 0)
            out.push({ burst: { kind: "splash", x: d.x, y: d.tag / 100, n: 2 } });
    }
    if (into !== null && s.steps % 20 === 0) {
        const b = s.g.beds[into];
        const exact = s.L.ask?.litres;
        if (b)
            tell(
                s,
                exact !== undefined
                    ? `${b.today.toFixed(1)} litres in this bed today. It wants ${exact}.`
                    : soggy(s.g, into, nightOf(s))
                      ? "That bed is soaked. Too much water and it cannot grow."
                      : "Watering.",
            );
    }
}

/** A press and lift this quick and this close is a tap, which sends her to what it touched. */
const TAP = { steps: Math.round(RATE * 0.35), squares: 0.9 } as const;

/** What a finger touched: the thing under it, or null on bare grass. */
export function targetAt(s: GardenState, p: Pt): Target | null {
    const cell = cellAt(s.g.beds, p);
    if (cell) {
        const sn = s.g.snails.find((x) => {
            const q = plantAt(s.g, x.bed, x.c, x.r);
            return q !== null && q === plantAt(s.g, cell.bed, cell.c, cell.r);
        });
        if (sn) return { kind: "snail", at: cellOf(sn) };
        const w = s.g.weeds.find((x) => x.bed === cell.bed && x.c === cell.c && x.r === cell.r);
        if (w) return { kind: "weed", at: cellOf(w) };
    }
    const h = s.hand;
    for (const [i, at] of s.packets.entries())
        if (!(h.what === "seed" && s.L.crops[i] === h.crop) && near(p, at, 1.4, 1.8))
            return { kind: "packet", i };
    if (h.what !== "can" && near(p, s.canAt, 1.6, 1.4)) return { kind: "can" };
    if (h.what !== "basket" && near(p, s.basketAt, 1.9, 1.6)) return { kind: "basket" };
    if (near(p, DIAL, 1.9)) return { kind: "dial" };
    for (let i = 0; i < s.crates.length; i++)
        if (near(p, crateAt(s, i), 1.8, 1.6)) return { kind: "crate", i };
    if (cell) {
        const q = plantAt(s.g, cell.bed, cell.c, cell.r);
        if (q) return { kind: "pick", at: cellOf(q) };
        if (h.what === "can") return { kind: "water", at: p };
    }
    if (h.what === "can" && soilAt(s, p)) return { kind: "water", at: p };
    return null;
}

/** How near she must come to a target to act on it. */
const reachFor = (t: Target): number =>
    t.kind === "weed" || t.kind === "snail" || t.kind === "pick" || t.kind === "water" ? 2 : REACH;

function send(s: GardenState, to: Pt): void {
    walkTo(s.me, placeOf(s), to, gaitOf());
}

/** The end of the way she is walking, or null when she is not. */
const routeEnd = (s: GardenState): Pt | null => s.me.route[s.me.route.length - 1] ?? null;

function touchDown(s: GardenState, p: Pt, out: Happening[]): void {
    s.acted = true;
    s.errand = null;
    const cell = cellAt(s.g.beds, p);
    const h = s.hand;
    const drag = (what: Drag["what"], crate = -1): Drag => ({
        what,
        at: s.steps,
        from: p,
        to: p,
        crate,
        follow: false,
    });
    if (h.what === "seed" && cell) {
        const over = sowingFrom(s.g.beds, cell.bed, cell, cell, SPAN[h.crop]);
        if (over) {
            s.sowing = { from: cell, over, touch: true };
            s.drag = drag("sow");
            out.push({ cue: "lift", strength: 0.25 });
            send(s, p);
            return;
        }
    }
    const under = targetAt(s, p)?.kind;
    if (h.what === "can" && soilAt(s, p) && under !== "snail" && under !== "weed") {
        s.drag = drag("pour");
        send(s, p);
        return;
    }
    if (h.what === "basket" && cell && plantAt(s.g, cell.bed, cell.c, cell.r)) {
        s.drag = drag("pick");
        return;
    }
    if (h.what === "basket") {
        const t = targetAt(s, p);
        if (t?.kind === "crate") {
            s.drag = drag("share", t.i);
            send(s, crateAt(s, t.i));
            return;
        }
    }
    s.drag = drag("walk");
}

function touchMove(s: GardenState, d: Drag, p: Pt, out: Happening[]): void {
    d.to = p;
    const me = s.me;
    if (d.what === "sow") {
        const w = s.sowing,
            h = s.hand;
        if (!w || h.what !== "seed") return;
        const b = s.g.beds[w.from.bed];
        if (!b) return;
        const corner = {
            c: Math.min(b.cols - 1, Math.max(0, Math.floor((p.x - b.x) / b.cell))),
            r: Math.min(b.rows - 1, Math.max(0, Math.floor((p.y - b.y) / b.cell))),
        };
        w.over = sowingFrom(s.g.beds, w.from.bed, w.from, corner, SPAN[h.crop]) ?? w.over;
        return;
    }
    if (d.what === "pour") {
        const close = Math.hypot(p.x - me.x, p.y - me.y) <= 2.2;
        if (close) {
            me.route = [];
            if (Math.hypot(me.vx, me.vy) < 0.5) faceTo(me, p);
            s.doing = { what: "pour", until: s.steps + 1, crate: -1, aim: p, next: 0 };
        } else {
            s.doing = null;
            const end = routeEnd(s);
            if (!end || Math.hypot(end.x - p.x, end.y - p.y) > 1) send(s, p);
        }
        return;
    }
    if (d.what === "pick") {
        const cell = cellAt(s.g.beds, p);
        if (cell) pickAt(s, cell, out, true);
        const end = routeEnd(s);
        if (
            Math.hypot(p.x - me.x, p.y - me.y) > 2.5 &&
            (!end || Math.hypot(end.x - p.x, end.y - p.y) > 1.5)
        )
            send(s, p);
        return;
    }
    if (d.what === "share") {
        const c = crateAt(s, d.crate);
        if (Math.hypot(c.x - me.x, c.y - me.y) <= REACH) {
            me.route = [];
            faceTo(me, c);
            if (!s.doing) {
                shareInto(s, d.crate, out);
                s.doing = {
                    what: "share",
                    until: s.steps + 1,
                    crate: d.crate,
                    aim: null,
                    next: s.steps + shareGap(),
                };
            } else s.doing.until = s.steps + 1;
        }
        return;
    }
    if (
        !d.follow &&
        (s.steps - d.at > TAP.steps || Math.hypot(p.x - d.from.x, p.y - d.from.y) > TAP.squares)
    )
        d.follow = true;
    if (d.follow) {
        const end = routeEnd(s);
        if (!end || Math.hypot(end.x - p.x, end.y - p.y) > 0.8) send(s, p);
    }
}

function touchUp(s: GardenState, d: Drag, p: Pt, out: Happening[]): void {
    s.drag = null;
    if (d.what === "sow") {
        const w = s.sowing,
            h = s.hand;
        s.sowing = null;
        if (w && h.what === "seed") plant(s, w.over, h.crop, out);
        judge(s, out);
        return;
    }
    if (d.what === "pour" && s.steps - d.at <= TAP.steps && !s.doing) {
        // a tap on a bed with the can sends her to pour a little there
        s.errand = { kind: "water", at: p };
        return;
    }
    if (d.what !== "walk") {
        s.doing = null;
        return;
    }
    if (d.follow) return;
    // a tap on her with something in hand puts it down
    if (s.hand.what !== "none" && Math.hypot(p.x - s.me.x, p.y - (s.me.y - 1.3)) < 1.4) {
        s.me.route = [];
        putDown(s, out);
        return;
    }
    const t = targetAt(s, p);
    if (!t) {
        send(s, p);
        return;
    }
    s.errand = t;
    const at = pointOf(s, t);
    if (at) send(s, at);
}

/** An errand she has walked to: done once she is near enough, or dropped where she cannot get there. */
function errandStep(s: GardenState, out: Happening[]): void {
    const t = s.errand;
    if (!t) return;
    const at = pointOf(s, t);
    if (!at) {
        s.errand = null;
        return;
    }
    const d = Math.hypot(at.x - s.me.x, at.y - s.me.y);
    // a thing inside something in the way is reached from the nearest place beside it
    if (d <= reachFor(t) || (!s.me.route.length && d <= REACH + 0.5)) {
        s.me.route = [];
        faceTo(s.me, at);
        s.errand = null;
        act(s, t, out);
        // a tap is one: one picked, one shared
        if (s.doing && s.doing.what !== "pour") s.doing = null;
        if (s.doing?.what === "pour") s.doing.aim = at;
    } else if (!s.me.route.length) s.errand = null;
}

/** Carrying on what a held button or finger keeps doing: pouring, picking as she walks, sharing. */
function doingStep(s: GardenState, pad: Pad, out: Happening[]): boolean {
    const d = s.doing;
    if (!d) return false;
    if (!pad.go && s.steps >= d.until) {
        s.doing = null;
        return false;
    }
    if (d.what === "pour") return s.hand.what === "can";
    if (s.steps < d.next || s.hand.what !== "basket") return false;
    if (d.what === "pick") {
        d.next = s.steps + 4;
        const f = ahead(s.me, FRONT);
        const ripe = s.g.plants.find((q) => {
            const b = s.g.beds[q.bed];
            if (!b || !isRipe(q, nightOf(s))) return false;
            const m = cellMiddle(b, q.c, q.r, q.span);
            return (
                Math.hypot(m.x - f.x, m.y - f.y) <= SOIL ||
                Math.hypot(m.x - s.me.x, m.y - s.me.y) <= 2.4
            );
        });
        if (ripe) pickAt(s, cellOf(ripe), out, true);
    } else {
        d.next = s.steps + shareGap();
        const c = crateAt(s, d.crate);
        if (Math.hypot(c.x - s.me.x, c.y - s.me.y) <= REACH + 0.5) shareInto(s, d.crate, out);
    }
    return false;
}

const PEOPLE: Record<Act, Cycle> = {
    stand: { poses: ["stand"] },
    walk: { poses: ["walk", "stand"], per: 0.9 },
    work: { poses: ["hold"] },
    cheer: { poses: ["cheer", "wave"], every: 0.35 },
};
const PUPS: Record<Act, Cycle> = {
    stand: { poses: ["stand"] },
    walk: { poses: ["walk", "stand"], per: 0.9 },
    work: { poses: ["carry"] },
    cheer: { poses: ["cheer", "jump"], every: 0.35 },
};
const actsOf = (s: GardenState) => (CAST[s.cast] === "pip" ? PUPS : PEOPLE);

export function step(s: GardenState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    const me = s.me;
    const want = heading(pad.holding);
    if (want) {
        s.errand = null;
        s.acted = true;
    }
    // an arrow tapped too quickly to walk turns her to face that way
    const turned = want ? null : heading(pad.pressed);
    if (turned) faceTo(me, { x: me.x + turned.x, y: me.y + turned.y });
    if (pad.touch && !s.last) touchDown(s, pad.touch, out);
    if (pad.touch && s.drag) touchMove(s, s.drag, pad.touch, out);
    if (pad.lifted && !pad.touch && s.drag) touchUp(s, s.drag, pad.lifted, out);
    s.last = pad.touch;
    if (pad.tapped) {
        const t = aim(s);
        if (t) act(s, t, out);
        else {
            s.acted = true;
            const line = s.won ? "Walk up to something to use it." : speechOf(s);
            tell(s, `Nothing to use here. ${line}`);
            s.bubble = { text: line, until: s.steps + RATE * 3 };
            out.push({ cue: "nope", strength: 0.3 }, { shake: 0.12 });
        }
    }
    const walked = stepRoam(me, want, placeOf(s), gaitOf(), DT);
    errandStep(s, out);
    // a sowing stretched by walking reaches to the cell she stands nearest
    const w = s.sowing,
        h = s.hand;
    if (w && !w.touch && h.what === "seed") {
        const corner = cellNearest(s, w.from.bed);
        if (corner)
            w.over = sowingFrom(s.g.beds, w.from.bed, w.from, corner, SPAN[h.crop]) ?? w.over;
    }
    const pouring = doingStep(s, pad, out);
    if (me.face.x !== 0) s.dir = me.face.x > 0 ? 1 : -1;
    // the can: in her hand, held out with its rose over the soil she pours on, or lying where it was put
    const c = s.can;
    if (h.what === "can") {
        // the spout points the way she faces, or back across her facing up or down, so the can is in her hand
        c.flip = me.face.x !== 0 ? me.face.x > 0 : s.dir < 0;
        const at = s.doing?.aim ?? ahead(me, FRONT + 0.4);
        let to = handOf(s);
        if (pouring) {
            const r = roseOf({ x: 0, y: 0, tilt: 1, flip: c.flip });
            to = { x: at.x - r.x, y: at.y - POUR_HEIGHT - r.y };
            c.land = at.y;
        }
        c.x += (to.x - c.x) * Math.min(1, 16 * DT);
        c.y += (to.y - c.y) * Math.min(1, 16 * DT);
        pourStep(s, pouring && Math.hypot(to.x - c.x, to.y - c.y) < 0.4, out);
    } else {
        c.x += (s.canAt.x - c.x) * Math.min(1, 14 * DT);
        c.y += (s.canAt.y - c.y) * Math.min(1, 14 * DT);
        pourStep(s, false, out);
    }
    const cheering = s.won || s.steps - s.cheer < RATE * 1.2;
    const now: Act = cheering ? "cheer" : walked === "walk" ? "walk" : pouring ? "work" : "stand";
    stepActor(s.actor, now, actsOf(s), DT, me.stride, s.dir);
    s.look.x += (me.x - s.look.x) * Math.min(1, 3 * DT);
    s.look.y += (me.y - s.look.y) * Math.min(1, 3 * DT);
    s.flying = s.flying.filter((f) => s.steps - f.at < RATE * 0.6);
    s.shooed = s.shooed.filter((f) => s.steps - f.at < RATE * 0.8);
    judge(s, out);
    const todo = currentOf(stepsOf(s));
    if (todo !== s.stepWas) {
        s.stepWas = todo;
        s.guideAt = s.steps;
    }
    return out;
}

/** The water in a bed as the soil shows it: dry to soaked. */
function wetOf(s: GardenState, i: number): { wet: number; puddle: boolean } {
    const b = s.g.beds[i];
    if (!b) return { wet: 0, puddle: false };
    const n = nightOf(s);
    const need = Math.max(thirst(s.g, i, n), 0.5);
    const amount = n.exact ? b.today : b.water;
    const scale = n.exact ? n.exact.litres || 1 : need * n.soggy;
    return {
        wet: Math.max(0, Math.min(4, Math.round((amount / scale) * 3.2))),
        puddle: amount > 0 && soggy(s.g, i, n),
    };
}

const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

function cropSprite(s: GardenState, p: Plant, rest: boolean): Sprite {
    const b = s.g.beds[p.bed];
    const at = b ? cellMiddle(b, p.c, p.r, p.span) : { x: 0, y: 0 };
    const crop: Crop = isCrop(p.crop) ? p.crop : "carrot";
    const since = s.grew[placeKey(p)];
    const pop =
        !rest && since !== undefined && s.steps - since < RATE * 0.5
            ? 0.6 + 0.4 * ease((s.steps - since) / (RATE * 0.5))
            : 1;
    return {
        key: `plant:${placeKey(p)}`,
        art: "gardencrop",
        params: { crop, stage: stage(p, ripeIn(s.L, crop)), droop: p.rest === "dry" },
        x: at.x,
        y: at.y + 0.9 * p.span,
        stand: true,
        size: 1.9 * p.span,
        scale: pop,
        z: 10 + at.y / 40,
    };
}

export function frame(s: GardenState, rest = false): Frame {
    const L = s.L;
    const sprites: Sprite[] = [];
    const marks: Mark[] = [];
    // the ground first: a lawn in lengths that meet, running on past the plot's edges
    for (let gx = -22; gx < WORLD.w + 22; gx += 22)
        for (let gy = -13; gy < WORLD.h + 13; gy += 13)
            sprites.push({
                key: `lawn:${gx}:${gy}`,
                art: "meadow",
                params: { across: 22, deep: 13, x0: gx + 44, y0: gy + 26, daisies: 1 },
                x: gx + 11,
                y: gy + 6.5,
                size: 22,
                still: true,
                z: 0,
            });
    // a gravel path along the foot of the plot, from the water butt to the far side, where the gardener walks
    for (const [k, px] of [11, 23].entries())
        sprites.push({
            key: `path:${k}`,
            art: "gardenpath",
            params: { w: 12, h: 2 },
            x: px + 6,
            y: 23.8,
            size: 12,
            still: true,
            z: 1,
        });
    sprites.push({
        key: "robin",
        art: "robin",
        params: { post: 1, facing: -1 },
        x: 24,
        y: 21.6,
        size: 1.8,
        stand: true,
        z: 2,
    });
    sprites.push(
        {
            key: "cottage",
            art: "cottage",
            params: { windows: 2, lit: 0 },
            x: 5.6,
            y: 7.6,
            size: 7.2,
            stand: true,
            still: true,
            z: 1,
        },
        {
            key: "hedge:a",
            art: "hedge",
            params: { clumps: 4, berries: 3, gap: 0 },
            x: 18,
            y: 5.6,
            size: 11,
            stand: true,
            still: true,
            z: 1,
        },
        {
            key: "hedge:b",
            art: "hedge",
            params: { clumps: 4, berries: 5, gap: 0 },
            x: 29.5,
            y: 5.6,
            size: 11,
            stand: true,
            still: true,
            z: 1,
        },
        {
            key: "flowers:door",
            art: "flowers",
            params: { count: 3, petals: 5 },
            x: 10.6,
            y: 7.8,
            size: 3.4,
            stand: true,
            still: true,
            z: 1,
        },
        {
            key: "flowers:dial",
            art: "flowers",
            params: { count: 2, petals: 6 },
            x: 33.6,
            y: 9.4,
            size: 3,
            stand: true,
            still: true,
            z: 1,
        },
        {
            key: "bench",
            art: "pottingbench",
            params: { h: Math.min(20, Math.ceil(L.crops.length * PACKET.gap + 3)), pots: 2 },
            x: PACKET.x,
            y: PACKET.y0 - 1.6 + (L.crops.length * PACKET.gap + 3) / 2,
            size: 4,
            still: true,
            z: 2,
        },
        {
            key: "butt",
            art: "waterbutt",
            params: { full: 0.8 },
            x: CAN_HOME.x + 3.2,
            y: CAN_HOME.y - 0.4,
            size: 3,
            still: true,
            z: 2,
        },
        {
            key: "compost",
            art: "compostbin",
            params: { heap: Math.min(3, 1 + s.g.day) },
            x: 33,
            y: 23.4,
            size: 3.6,
            z: 2,
        },
        {
            key: "dial",
            art: "sundial",
            params: { hour: 9 + Math.min(8, s.g.day * 2) },
            x: DIAL.x,
            y: DIAL.y,
            size: 3.8,
            z: 3,
            live: true,
        },
    );
    // a label on a stick at each job bed, saying what it is for
    for (const [i, b] of s.g.beds.entries()) {
        if (!L.beds[i]?.job) continue;
        sprites.push({
            key: `label:${i}`,
            art: "plantlabel",
            params: { crop: L.ask?.crop ?? L.crops[0] ?? "carrot" },
            x: b.x - 0.6,
            y: b.y + 1.4,
            size: 1.4,
            stand: true,
            z: 3,
        });
    }
    // bees and butterflies drifting over the plot, held still for a picture that must not move
    const t = rest ? 0 : s.steps / RATE;
    for (const [k, f] of [
        { art: "butterfly", x: 24, y: 8.2, tone: "berry" },
        { art: "butterfly", x: 33, y: 19, tone: "glow" },
        { art: "bumblebee", x: 12, y: 20, tone: "" },
    ].entries())
        sprites.push({
            key: `flier:${k}`,
            art: f.art,
            params:
                f.art === "butterfly"
                    ? { tone: f.tone, open: rest || Math.sin(t * 9 + k) > 0 }
                    : { facing: Math.cos(t * 0.5 + k) > 0 ? 1 : -1 },
            x: f.x + Math.sin(t * 0.5 + k * 2) * 3,
            y: f.y + Math.sin(t * 0.9 + k) * 1.2,
            size: f.art === "butterfly" ? 1.2 : 1.1,
            z: 35,
            live: f.art === "butterfly",
        });
    if (L.greenhouse)
        sprites.push({
            key: "greenhouse",
            art: "greenhouse",
            params: { width: L.greenhouse.w, height: L.greenhouse.h },
            x: L.greenhouse.x + L.greenhouse.w / 2,
            y: L.greenhouse.y + L.greenhouse.h / 2,
            size: L.greenhouse.w,
            still: true,
            z: 1,
        });
    for (const z of L.runoff ?? [])
        sprites.push({
            key: `hill:${z.x}`,
            art: "golfslope",
            params: { dir: "down", steep: 1, width: z.w, height: z.h },
            x: z.x + z.w / 2,
            y: z.y + z.h / 2,
            size: z.w,
            still: true,
            z: 1,
        });
    if (L.rain?.includes(s.g.day) && !s.won)
        sprites.push({
            key: "rain",
            art: "cloud",
            params: { puffs: 4, rain: 1 },
            x: 34.5,
            y: 3.4,
            size: 5,
            z: 4,
        });
    for (const [i, b] of s.g.beds.entries()) {
        const w = wetOf(s, i);
        sprites.push({
            key: `bed:${i}`,
            art: "gardenbed",
            params: { cols: b.cols, rows: b.rows, wet: w.wet, puddle: w.puddle },
            x: b.x + (b.cols * b.cell) / 2,
            y: b.y + (b.rows * b.cell) / 2,
            size: b.cols * b.cell,
            z: 2,
        });
    }
    for (const p of s.g.plants) sprites.push(cropSprite(s, p, rest));
    for (const [i, w] of s.g.weeds.entries()) {
        const b = s.g.beds[w.bed];
        if (!b) continue;
        const at = cellMiddle(b, w.c, w.r);
        sprites.push({
            key: `weed:${placeKey(w)}`,
            art: "weed",
            params: { flower: i % 2 === 0 },
            x: at.x,
            y: at.y,
            size: 1.8,
            z: 9,
        });
    }
    for (const sn of s.g.snails) {
        const b = s.g.beds[sn.bed];
        if (!b) continue;
        const at = cellMiddle(b, sn.c, sn.r);
        sprites.push({
            key: `snail:${placeKey(sn)}`,
            art: "gardensnail",
            params: { hiding: false },
            x: at.x + 0.4,
            y: at.y + 0.2,
            size: 1.6,
            z: 12,
        });
    }
    if (!rest)
        for (const f of s.shooed) {
            const t = ease((s.steps - f.at) / (RATE * 0.8));
            sprites.push({
                key: `shoo:${f.at}:${f.x}`,
                art: "gardensnail",
                params: { hiding: true },
                x: f.x,
                y: f.y - t * 6,
                size: 1.4,
                alpha: 1 - t,
                z: 12,
            });
        }
    // the seed packets on the bench or wherever they were put down, but the one in her hand
    const h = s.hand;
    for (const [i, crop] of L.crops.entries()) {
        const at = s.packets[i];
        if (!at || (h.what === "seed" && h.crop === crop)) continue;
        sprites.push({
            key: `packet:${crop}`,
            art: "seedpacket",
            params: { crop },
            x: at.x,
            y: at.y,
            size: PACKET.size,
            z: 5,
        });
    }
    const w = s.sowing;
    if (w && h.what === "seed") {
        const holesNow = sowingHoles(s, w.over);
        for (const [k, x] of holesNow.entries())
            sprites.push({
                key: `ghost:${k}`,
                art: "gardencrop",
                params: { crop: h.crop, stage: 1, droop: false },
                x: x.at.x,
                y: x.at.y + 0.9 * w.over.span,
                stand: true,
                size: 1.9 * w.over.span,
                alpha: x.bare ? 0.55 : 0.18,
                z: 11,
            });
        const b = s.g.beds[w.over.bed];
        if (b) {
            marks.push({
                kind: "box",
                x: b.x + w.over.c * b.cell,
                y: b.y + w.over.r * b.cell,
                w: w.over.cols * w.over.span * b.cell,
                h: w.over.rows * w.over.span * b.cell,
                on: true,
            });
            marks.push({ kind: "dots", pts: holesNow.map((x) => x.at) });
        }
        if (L.preview >= 1 && b) {
            const n = w.over.rows * w.over.cols;
            marks.push({
                kind: "word",
                x: b.x + (b.cols * b.cell) / 2,
                y: b.y - 0.9,
                text:
                    L.preview >= 2
                        ? w.over.rows === 1
                            ? `a row of ${w.over.cols}`
                            : `${w.over.rows} rows of ${w.over.cols} = ${n}`
                        : String(n),
                size: 0.9,
            });
        }
    }
    // how much water each bed has, as the board shows it
    for (const [i, b] of s.g.beds.entries()) {
        const def = L.beds[i];
        const n = nightOf(s);
        if (L.ask?.litres !== undefined && def?.job)
            marks.push({
                kind: "word",
                x: b.x + (b.cols * b.cell) / 2,
                y: b.y + b.rows * b.cell + 0.8,
                text: `${b.today.toFixed(1)} of ${L.ask.litres} litres today`,
                size: 0.7,
            });
        else if (L.preview >= 1) {
            const need = thirst(s.g, i, n);
            if (need > 0) {
                const nights = Math.floor(b.water / need + 1e-9);
                marks.push({
                    kind: "word",
                    x: b.x + (b.cols * b.cell) / 2,
                    y: b.y + b.rows * b.cell + 0.8,
                    text: soggy(s.g, i, n)
                        ? "too wet"
                        : nights === 0
                          ? "needs water"
                          : nights === 1
                            ? "water for 1 night"
                            : `water for ${nights} nights`,
                    size: 0.7,
                });
            }
        }
    }
    // the can, in her hand or tipped over the soil, or lying where it was put down
    const can = s.can;
    const carrying = h.what === "can";
    const bob = (k: number) => (rest ? 0 : Math.sin(s.steps * 0.25 + k) * 0.08);
    const pop =
        !rest && s.steps - s.took < RATE * 0.3
            ? 0.8 + 0.2 * ease((s.steps - s.took) / (RATE * 0.3))
            : 1;
    sprites.push({
        key: "can",
        art: "wateringcan",
        params: { tone: "sky" },
        x: can.x,
        y: can.y + (carrying && can.tilt < 0.1 ? bob(0) : 0),
        size: carrying ? CAN_SIZE : CAN_SIZE * 1.15,
        angle: (can.flip ? -1 : 1) * angleOf(can.tilt),
        flip: can.flip,
        ...(carrying ? { scale: pop } : {}),
        z: carrying ? 10 + s.me.y / 40 + 0.002 : 4,
    });
    const liquidPool = places(s.water);
    // the basket and the crates, with their counts written beside them
    const crop = shared(s);
    const inBasket = L.ask ? s.basket[crop] : CROPS.reduce((a, c) => a + s.basket[c], 0);
    const basketCrop: Crop = L.ask ? crop : (CROPS.find((c) => s.basket[c] > 0) ?? "carrot");
    const basketAt = basketNow(s),
        inHand = h.what === "basket";
    sprites.push({
        key: "basket",
        art: "gardenbasket",
        params: { kind: "basket", crop: basketCrop, count: Math.min(12, inBasket) },
        x: basketAt.x,
        y: basketAt.y + (inHand ? bob(1) : 0),
        size: inHand ? 2.4 : 3.6,
        ...(inHand ? { scale: pop } : {}),
        z: inHand ? 10 + s.me.y / 40 + 0.002 : 6,
    });
    marks.push({
        kind: "word",
        x: basketAt.x,
        y: inHand ? s.me.y + 0.9 : basketAt.y + 2,
        text: `${inBasket} picked`,
        size: 0.75,
    });
    for (const [i, n] of s.crates.entries()) {
        const at = crateAt(s, i);
        sprites.push({
            key: `crate:${i}`,
            art: "gardenbasket",
            params: { kind: L.ask?.want ? "crate" : "basket", crop, count: Math.min(12, n) },
            x: at.x,
            y: at.y,
            size: 3.2,
            z: 6,
        });
        const want = L.ask?.want;
        marks.push({
            kind: "word",
            x: at.x,
            y: at.y + 1.9,
            text: want ? `${n}, wants ${want.each}` : String(n),
            size: 0.7,
        });
        if (want)
            sprites.push({
                key: `customer:${i}`,
                art: "person",
                params: {
                    pose: n === want.each ? "cheer" : "stand",
                    age: i === 1 ? "grownup" : "child",
                    tone: 1 + ((i * 2) % 6),
                    top: ["berry", "sky", "glow", "mint"][i % 4],
                },
                x: at.x + 1.3,
                y: at.y - 0.9,
                size: 1.8,
                stand: true,
                z: 5,
            });
    }
    if (!rest)
        for (const f of s.flying) {
            const t = ease((s.steps - f.at) / (RATE * 0.6));
            sprites.push({
                key: `fly:${f.at}:${f.from.x}:${f.from.y}`,
                art: "gardencrop",
                params: { crop: f.crop, stage: 3, droop: false },
                x: f.from.x + (f.to.x - f.from.x) * t,
                y: f.from.y + (f.to.y - f.from.y) * t - Math.sin(t * Math.PI) * 2.5,
                size: 1.4,
                z: 40,
            });
        }
    // a packet of seeds in her hand
    if (h.what === "seed") {
        const at = handOf(s);
        sprites.push({
            key: `packet:${h.crop}`,
            art: "seedpacket",
            params: { crop: h.crop },
            x: at.x,
            y: at.y + bob(2),
            size: 1.3,
            scale: pop,
            z: 10 + s.me.y / 40 + 0.002,
        });
    }
    // the gardener, standing in among the plants by where her feet are
    const who = CAST[s.cast] ?? "charlie";
    const me = s.me;
    const z = 10 + me.y / 40 + 0.001;
    const dress = (pose: string, dir: 1 | -1): Sprite =>
        who === "pip"
            ? {
                  key: "gardener",
                  art: "pupfamily",
                  params: { member: "pip", pose, mood: "happy", dir },
                  x: me.x,
                  y: me.y,
                  size: 2.8,
                  stand: true,
                  z,
              }
            : who === "friend"
              ? {
                    key: "gardener",
                    art: "person",
                    params: {
                        pose,
                        age: "child",
                        tone: 5,
                        hair: "coily",
                        colour: "black",
                        top: "tang",
                    },
                    x: me.x,
                    y: me.y,
                    size: 3.2,
                    stand: true,
                    flip: dir < 0,
                    z,
                }
              : {
                    key: "gardener",
                    art: "charlie",
                    params: {
                        pose,
                        mood: s.won ? "excited" : "happy",
                        dir,
                        hair: "bunches",
                        top: "mint",
                        sleeves: "short",
                        print: "flower",
                        wear: "shorts",
                        bottom: "sky",
                        pattern: "plain",
                        feet: "boots",
                    },
                    x: me.x,
                    y: me.y,
                    size: 3.2,
                    stand: true,
                    z,
                };
    sprites.push(...actorSprites(s.actor, actsOf(s), dress, me.stride, rest));
    // a soft ring under what the Action would do now, and under where a tap sent her
    if (!s.won) {
        const t = s.errand ?? aim(s);
        const at = t ? pointOf(s, t) : null;
        if (at) marks.push({ kind: "ring", x: at.x, y: at.y + 0.2, r: 1.2, on: true });
    }
    // the day, by the sundial
    marks.push({
        kind: "word",
        x: DIAL.x,
        y: DIAL.y - 2.6,
        text: `Day ${s.g.day + 1}`,
        size: 0.85,
    });
    if (!s.won)
        marks.push({
            kind: "word",
            x: DIAL.x,
            y: DIAL.y + 2.9,
            text: "tap for the next day",
            size: 0.5,
        });
    guide(s, rest, sprites, marks);
    const focus = { ...s.look };
    return {
        sprites,
        marks,
        camera: { x: WORLD.w / 2, y: WORLD.h / 2 },
        view: { ...WORLD },
        world: { ...WORLD },
        focus,
        liquid: liquidPool.length ? [{ drops: liquidPool, r: 0.16, hue: "sky", z: 25 }] : [],
    };
}

/** Squares the step strip's words take, per letter, at the size they are written. */
const STRIP_LETTER = 0.21;

/** The guide on the board: the step strip, the arrow to the next thing, and what Charlie says. */
function guide(s: GardenState, rest: boolean, sprites: Sprite[], marks: Mark[]): void {
    const steps = stepsOf(s);
    const now = currentOf(steps);
    // the strip of steps between the hedges and the beds, fixed to the view, the step to do lit
    const items = steps.map((st, i) => {
        const text = `${i + 1} ${st.label}`;
        return { st, text, w: 1.1 + text.length * STRIP_LETTER + 0.9 };
    });
    const across = items.reduce((a, it) => a + it.w, 0) + 1;
    // the card draws inside its box, so it is a little wider than what it holds
    const cardW = Math.min(36, Math.ceil(across + 2));
    const fx = WORLD.w / 2,
        fy = 7.2;
    sprites.push({
        key: "steps",
        art: "dollchip",
        params: { kind: "card", tone: "sky", on: false, w: cardW, h: 2 },
        x: fx,
        y: fy,
        size: cardW,
        fixed: true,
        z: 70,
    });
    let x = fx - across / 2 + 0.5;
    for (const [i, it] of items.entries()) {
        if (i === now && !s.won) {
            const pillW = Math.max(2, Math.ceil((it.w - 0.4) / 0.75));
            sprites.push({
                key: "steps:now",
                art: "dollchip",
                params: { kind: "pill", tone: "glow", on: false, w: pillW, h: 2 },
                x: x + (it.w - 0.4) / 2,
                y: fy,
                size: pillW * 0.75,
                fixed: true,
                z: 71,
            });
        }
        sprites.push({
            key: `steps:tick:${i}`,
            art: "dollchip",
            params: { kind: "tick", tone: "mint", on: it.st.done, w: 2, h: 2 },
            x: x + 0.55,
            y: fy,
            size: 0.8,
            fixed: true,
            z: 72,
        });
        marks.push({
            kind: "word",
            x: x + 1.1 + (it.text.length * STRIP_LETTER) / 2,
            y: fy + 0.15,
            text: it.text,
            size: 0.45,
            fixed: true,
        });
        x += it.w;
    }
    if (s.won) return;
    // the arrow over what the step to do needs, at once on the first level and after a wait on later ones
    const idle = s.steps - s.guideAt;
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
    // what Charlie says: the first-time hint, a word after a press with nothing to use, or the next step after a wait
    const first =
        s.phase === 0 && !s.used
            ? "Walk with the arrows or tap where to go. Press Space or the big button to use what is in front of you."
            : null;
    const text =
        first ??
        (s.bubble && s.steps < s.bubble.until
            ? s.bubble.text
            : idle >= GUIDE_WAIT
              ? speechOf(s)
              : null);
    if (!text) return;
    const lines = wrap(text, 26);
    const width = bubbleWidth(lines);
    const k = 0.55;
    const w = width * k,
        h = (lines.length * 2 + 2) * k;
    const me = s.me;
    sprites.push({
        key: "say",
        art: "bubble",
        params: { lines, width, tail: null },
        x: Math.max(w / 2 + 0.3, Math.min(WORLD.w - w / 2 - 0.3, me.x)),
        y: Math.max(h / 2 + 0.3, me.y - 3.6 - h / 2),
        size: w,
        live: true,
        z: 75,
    });
}

export function say(s: GardenState): string {
    const L = s.L;
    const parts: string[] = [`Day ${s.g.day + 1}.`];
    for (const [i, b] of s.g.beds.entries()) {
        const ps = s.g.plants.filter((p) => p.bed === i);
        const ripe = ps.filter((p) => isRipe(p, nightOf(s))).length;
        parts.push(
            ps.length === 0
                ? `Bed ${i + 1} is empty.`
                : `Bed ${i + 1} has ${ps.length} plants, ${ripe} ripe, with ${b.water.toFixed(1)} litres of water.`,
        );
    }
    if (s.g.weeds.length) parts.push(`${s.g.weeds.length} weeds.`);
    if (s.g.snails.length) parts.push(`${s.g.snails.length} snails.`);
    const crop = shared(s);
    parts.push(`${L.ask ? s.basket[crop] : CROPS.reduce((a, c) => a + s.basket[c], 0)} picked.`);
    if (s.crates.length)
        parts.push(`The ${L.ask?.want ? "crates" : "baskets"} hold ${s.crates.join(", ")}.`);
    const h = s.hand;
    if (h.what !== "none")
        parts.push(`Holding the ${h.what === "can" ? "watering can" : HELD_WORDS(h)}.`);
    const t = aim(s);
    if (t) parts.push(`The Action: ${labelOf(s, t).toLowerCase()}.`);
    if (!s.won) {
        const steps = stepsOf(s);
        const now = currentOf(steps);
        const st = steps[now];
        if (st) parts.push(`Step ${now + 1} of ${steps.length}: ${st.label}.`);
        const to = pointerOf(s);
        if (to && pointerShows(s)) parts.push(`The arrow points at ${to.name}.`);
    }
    return parts.join(" ");
}

/** A kept garden, read back from storage: unknown until every field is checked. */
export interface Design {
    g: Garden;
    basket: Record<Crop, number>;
    cast: number;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function readPlant(v: unknown, beds: number): Plant | null {
    if (!isObj(v)) return null;
    const { bed, c, r, crop, span, age, rest } = v;
    if (!isNum(bed) || !isNum(c) || !isNum(r) || !isNum(span) || !isNum(age) || !isCrop(crop))
        return null;
    if (bed < 0 || bed >= beds) return null;
    const why =
        rest === "dry" || rest === "soggy" || rest === "weeded" || rest === "eaten" ? rest : "fine";
    return { bed, c, r, crop, span, age, rest: why };
}

/** A kept garden read back for the free level's beds, or null where it does not fit them. */
export function readDesign(value: unknown, L: GardenLevel): Design | null {
    if (!isObj(value) || !isObj(value.g) || !isObj(value.basket)) return null;
    const g = value.g;
    if (
        !Array.isArray(g.beds) ||
        g.beds.length !== L.beds.length ||
        !Array.isArray(g.plants) ||
        !isNum(g.day)
    )
        return null;
    const beds = L.beds.map((def, i) => {
        const b = makeBed(def.x, def.y, def.cols, def.rows, BED_CELL);
        const kept: unknown = Array.isArray(g.beds) ? g.beds[i] : undefined;
        if (isObj(kept) && isNum(kept.water)) b.water = Math.max(0, kept.water);
        return b;
    });
    const plants: Plant[] = [];
    for (const p of g.plants) {
        const q = readPlant(p, beds.length);
        if (!q) return null;
        plants.push(q);
    }
    const basket = zero();
    for (const c of CROPS) {
        const n = value.basket[c];
        if (isNum(n) && n >= 0) basket[c] = Math.floor(n);
    }
    const cast = isNum(value.cast)
        ? Math.max(0, Math.min(CAST.length - 1, Math.floor(value.cast)))
        : 0;
    return {
        g: { beds, plants, weeds: [], snails: [], day: Math.max(0, Math.floor(g.day)) },
        basket,
        cast,
    };
}

const SOUNDS: Kit = {
    // seeds pattering into their holes
    place: [
        { wave: "noise", hz: 4200, attack: 0.002, decay: 0.05, gain: 0.25 },
        { wave: "noise", hz: 3600, attack: 0.002, decay: 0.05, gain: 0.2, delay: 0.06 },
        { wave: "noise", hz: 3900, attack: 0.002, decay: 0.05, gain: 0.18, delay: 0.12 },
    ],
    // a packet rustling, a can lifted
    lift: [{ wave: "noise", hz: 2200, to: 1400, attack: 0.01, decay: 0.14, gain: 0.22 }],
    // something picked, popping out of the soil
    ring: [
        { wave: "sine", hz: 660, to: 990, attack: 0.002, decay: 0.12, gain: 0.3 },
        { wave: "noise", hz: 1800, attack: 0.002, decay: 0.04, gain: 0.15 },
    ],
    // a soft thump into a basket
    bump: [{ wave: "sine", hz: 180, to: 120, attack: 0.002, decay: 0.12, gain: 0.35 }],
    // a sprout popping up overnight
    level: [
        { wave: "sine", hz: 520, to: 780, attack: 0.002, decay: 0.12, gain: 0.25 },
        { wave: "sine", hz: 780, to: 1040, attack: 0.002, decay: 0.12, gain: 0.2, delay: 0.1 },
    ],
};

function hum(s: GardenState): Hum[] {
    const birds: Hum = { kind: "birds", level: 0.6 };
    return s.can.tilt > 0.35 && s.hand.what === "can"
        ? [birds, { kind: "water", level: Math.min(1, s.can.tilt) * 0.7 }]
        : [birds];
}

export const gardenGame: ActionGame<GardenState> = {
    id: "garden",
    title: "Charlie's garden",
    group: "action",
    // the seed packets, the beds, the can and the basket fill a wide plot and play by carrying between them, which a small card crops
    card: null,
    seen: "above",
    // a phone held upright follows Charlie across 30 of the plot's 44 squares, enough for a bed and its packets or its basket
    portrait: { keep: 30 },
    quiet: true,
    touch: true,
    saves: { level: FREE },
    levels: GARDEN_LEVELS,
    rate: RATE,
    sounds: SOUNDS,
    hum,
    cover: { art: "gardencover", params: { charlie: true } },
    hint: "Walk Charlie with the arrows or WASD, or tap where she should go. Space or Enter does what she faces: picks a thing up, plants, waters, picks, shares, or puts down what she holds. Hold Space to keep pouring or picking. Escape puts down, N is the next day, C changes the gardener",
    // W, A, S and D walk as the arrows do; no command here is on those keys
    wasd: true,
    controls: {
        arrows: { left: "Left", right: "Right", up: "Up", down: "Down" },
        go: "Action",
        icons: { go: "grab" },
    },
    goLabel: (s) => labelOf(s, aim(s)),
    goIcon: (s) => {
        const t = aim(s);
        return t ? ICON[t.kind] : "grab";
    },
    commands: [
        { id: "who", label: "Who gardens here", key: "c", icon: "who" },
        { id: "day", label: "Next day", key: "n", keysOnly: true },
        { id: "drop", label: "Put down", key: "escape", keysOnly: true },
    ],
    command: (s, id) => {
        const out: Happening[] = [];
        if (id === "day") sundial(s, out);
        else if (id === "drop") {
            if (s.sowing) s.sowing = null;
            else putDown(s, out);
        } else if (id === "who") {
            s.cast = (s.cast + 1) % CAST.length;
            tell(
                s,
                `${s.cast === 0 ? "Charlie" : s.cast === 1 ? "Pip" : "A friend"} is gardening now.`,
            );
        }
    },
    checkpoint: (s): Design => ({ g: structuredClone(s.g), basket: { ...s.basket }, cast: s.cast }),
    restore: (s, value) => {
        const d = readDesign(value, s.L);
        if (!d) return false;
        s.g = d.g;
        s.basket = d.basket;
        s.cast = d.cast;
        return true;
    },
    start,
    step,
    frame,
    say,
    note: (s) => (s.steps - s.saidAt < RATE * 6 && s.said ? s.said : s.won ? "" : speechOf(s)),
    won: (s) => s.won,
    objectives: (s) => {
        const a = s.L.ask;
        if (!a) return { completed: 0, total: 1 };
        const crop = a.crop;
        const steps = [
            s.sown > 0,
            s.g.plants.some((p) => p.crop === crop && isRipe(p, nightOf(s))) || s.basket[crop] > 0,
            s.g.plants.every((p) => p.crop !== crop) && s.sown > 0,
            s.won,
        ];
        return { completed: steps.filter(Boolean).length, total: steps.length };
    },
    back,
    cancelInput: (s) => {
        if (s.sowing?.touch) s.sowing = null;
        s.drag = null;
        s.doing = null;
        s.last = null;
    },
    tuning: GARDEN,
    still: {
        // a press walks her about a cell, or pours for as long as a press of Enter does
        press: () => 20,
        settling: (s) =>
            s.me.route.length > 0 ||
            s.errand !== null ||
            Math.hypot(s.me.vx, s.me.vy) > 0.05 ||
            (s.doing !== null && s.steps < s.doing.until) ||
            s.water.tags.length > 0 ||
            s.flying.length > 0 ||
            s.can.tilt > 0.02 ||
            (s.hand.what !== "can" && Math.hypot(s.can.x - s.canAt.x, s.can.y - s.canAt.y) > 0.05),
    },
};
