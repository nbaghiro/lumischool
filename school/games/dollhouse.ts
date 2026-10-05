// Charlie's dollhouse: a house built room by room, seen cut open from the front as a dollhouse is.
// The plot starts with the house's shell standing on its plinth: dashed slots where its first rooms
// go, and more slots beside and over every room once it is built. The game has two modes. Building
// shows the drawer of rooms along the bottom, and a room dragged up from it snaps into a slot, with the
// slots it fits glowing green. Decorating hides that drawer for the furniture's, and a tap on a room
// eases the view into it and opens the furniture that suits it, a piece dragged into a room glowing
// where it can go and settling on the floor or the wall with a little bounce. Whoever lives in the
// house waits at the door and walks into each room once it is finished. Every room costs a coin a
// square and every piece its price, so the mathematics is in the jobs: a bedroom of twelve squares, a
// kitchen furnished for twenty coins, a living room twice the bathroom. Free building is always
// allowed and no job ever stops it. The house's rules are engine/motion/house.ts, so a game with
// other people or pups in it builds the same way. See .docs/games.md.
import { actor, actorSprites, stepActor, type Actor, type Cycle } from "../../engine/motion/actor";
import type { Pt } from "../../engine/motion/geometry";
import {
    areaOf,
    boxOf,
    canLeave,
    canResize,
    canStand,
    floorLine,
    nearestPlace,
    nearestSpot,
    placesIn,
    roomAt,
    sharedWalls,
    slotsOf,
    stepPlace,
    stepSpot,
    thingFits,
    travel,
    wayBetween,
    type Place,
    type Plot,
    type Room,
    type Slot,
    type Spot,
    type Thing,
    type Where,
} from "../../engine/motion/house";
import type { Intent, Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Light, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import { PUPS, type Pup } from "../../engine/parts/animals/pupfamily";
import { CARD_SIDE } from "../../engine/parts/home/dollcard";
import { ROOF_H } from "../../engine/parts/home/dollroof";
import { ROOM_FLOOR, ROOM_H } from "../../engine/parts/home/dollroom";
import { SWITCH_INSET } from "../../engine/parts/home/dollchip";
import {
    FURNITURE,
    FURNITURE_BOX,
    nounOf,
    type Furniture,
} from "../../engine/parts/home/furniture";
import type { Marker } from "../../engine/parts/home/dollroom";
import type { Hum, Kit } from "../../engine/sound/kit";
import type { ActionGame, ActionLevel, Levels } from "./game";
import { ground } from "./scenery";

export const ROOM_KINDS = [
    "bedroom",
    "kitchen",
    "bathroom",
    "living",
    "shed",
    "attic",
    "stairs",
] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

const SWATCHES = ["stripes", "spots", "flowers", "plain"] as const;
type Swatch = (typeof SWATCHES)[number];

/** How a new room of each kind comes from the drawer: its width, its wallpaper and its floor. */
const ROOM_LOOK: Record<
    RoomKind,
    {
        w: number;
        paper: Swatch;
        tone: Marker;
        floor: "boards" | "tiles" | "carpet";
        window: boolean;
        name: string;
    }
> = {
    bedroom: {
        w: 4,
        paper: "stripes",
        tone: "berry",
        floor: "boards",
        window: true,
        name: "Bedroom",
    },
    kitchen: { w: 4, paper: "plain", tone: "glow", floor: "tiles", window: true, name: "Kitchen" },
    bathroom: {
        w: 3,
        paper: "spots",
        tone: "sky",
        floor: "tiles",
        window: false,
        name: "Bathroom",
    },
    living: {
        w: 5,
        paper: "flowers",
        tone: "mint",
        floor: "carpet",
        window: true,
        name: "Living room",
    },
    shed: { w: 2, paper: "plain", tone: "tang", floor: "boards", window: false, name: "Shed" },
    attic: { w: 4, paper: "plain", tone: "tang", floor: "boards", window: true, name: "Attic" },
    stairs: { w: 2, paper: "plain", tone: "tang", floor: "boards", window: false, name: "Stairs" },
};

const SWATCH_TONE: Record<Swatch, Marker> = {
    stripes: "berry",
    spots: "sky",
    flowers: "mint",
    plain: "glow",
};

/** What each piece costs, in coins; a room costs a coin a square. */
export const PRICE: Record<Furniture, number> = {
    bed: 10,
    sofa: 8,
    table: 6,
    chair: 3,
    lamp: 4,
    bath: 12,
    fridge: 8,
    plant: 2,
    rug: 3,
    picture: 2,
    shelf: 4,
    tv: 9,
    cooker: 9,
};
const PAPER_PRICE = 2;

/** Where each piece goes: on the floor, on the wall, or flat on the floor under the rest. */
const LAYER: Record<Furniture, "floor" | "wall" | "rug"> = {
    bed: "floor",
    sofa: "floor",
    table: "floor",
    chair: "floor",
    lamp: "floor",
    bath: "floor",
    fridge: "floor",
    plant: "floor",
    rug: "rug",
    picture: "wall",
    shelf: "wall",
    tv: "floor",
    cooker: "floor",
};

/** What a tap does to a piece: switches it on or off, or else turns it round. */
const SWITCHED: ReadonlySet<Furniture> = new Set(["lamp", "bath", "tv", "cooker"]);

/** What makes a room of each kind finished, so the household cheers it. */
const NEEDS: Record<RoomKind, readonly Furniture[]> = {
    bedroom: ["bed"],
    kitchen: ["cooker", "fridge"],
    bathroom: ["bath"],
    living: ["sofa", "tv"],
    shed: FURNITURE,
    attic: FURNITURE,
    stairs: [],
};

/** A piece is drawn at half its drawing's box, which is drawn twice over for detail (engine/parts/home/furniture.ts). */
const HALF = 0.5;
export const sizeOf = (k: Furniture): { w: number; h: number } => ({
    w: FURNITURE_BOX[k].w * HALF,
    h: FURNITURE_BOX[k].h * HALF,
});

type Who =
    | { kind: "charlie" }
    | { kind: "person"; look: Record<string, string | number> }
    | { kind: "pup"; member: Pup };

const CHARLIE_LOOK = {
    mood: "happy",
    hair: "ponytail",
    top: "glow",
    sleeves: "short",
    print: "star",
    wear: "skirt",
    bottom: "berry",
    pattern: "stripes",
    feet: "shoes",
};

/** The households the picker goes through: Charlie, Charlie with friends, the pups, and another family. */
export const CASTS: readonly (readonly Who[])[] = [
    [{ kind: "charlie" }],
    [
        { kind: "charlie" },
        {
            kind: "person",
            look: {
                age: "child",
                tone: 5,
                hair: "puffs",
                colour: "black",
                top: "sky",
                wear: "shorts",
                bottom: "mint",
            },
        },
        {
            kind: "person",
            look: {
                age: "grownup",
                tone: 3,
                hair: "bob",
                colour: "auburn",
                top: "mint",
                wear: "dress",
                pattern: "spots",
            },
        },
    ],
    PUPS.map((member): Who => ({ kind: "pup", member })),
    [
        {
            kind: "person",
            look: {
                age: "older",
                tone: 4,
                hair: "short",
                colour: "grey",
                top: "tang",
                wear: "trousers",
                bottom: "sky",
            },
        },
        {
            kind: "person",
            look: {
                age: "child",
                tone: 1,
                hair: "bunches",
                colour: "brown",
                top: "berry",
                wear: "skirt",
                bottom: "glow",
            },
        },
    ],
];

const nameOf = (w: Who): string =>
    w.kind === "charlie"
        ? "Charlie"
        : w.kind === "pup"
          ? `${w.member.slice(0, 1).toUpperCase()}${w.member.slice(1)}`
          : "a friend";

/**
 * What a job asks for. A free build asks nothing. The rest each ask for one thing the house shows:
 * a bedroom with a bed; a room of so many squares; a room upstairs that the stairs reach; a room
 * furnished with given pieces for so many coins or fewer; so many beds; one room twice another;
 * a room and its furniture for exactly so many coins; or a whole house of so many squares.
 */
export type Ask =
    | { kind: "free" }
    | { kind: "bed"; with: Furniture }
    | { kind: "area"; room: RoomKind; area: number }
    | { kind: "upstairs"; room: RoomKind }
    | { kind: "furnish"; room: RoomKind; items: Furniture[]; most: number }
    | { kind: "beds"; n: number }
    | { kind: "twice"; big: RoomKind; small: RoomKind }
    | { kind: "spend"; room: RoomKind; total: number }
    | { kind: "whole"; area: number };

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six"] as const;
const roomName = (k: RoomKind): string => ROOM_LOOK[k].name.toLowerCase();

/** A piece's name in a sentence, the television said in full. */
const noun = (k: Furniture): string => (k === "tv" ? "television" : k);

/** How many of each piece a list asks for, in the list's order. */
function counted(items: readonly Furniture[]): [Furniture, number][] {
    const counts = new Map<Furniture, number>();
    for (const k of items) counts.set(k, (counts.get(k) ?? 0) + 1);
    return [...counts];
}

/** The pieces a list asks for, in words: "a table, two chairs and a fridge". */
function listWords(items: readonly Furniture[]): string {
    const words = counted(items).map(([k, n]) =>
        n === 1 ? `a ${noun(k)}` : `${NUMBER_WORDS[n] ?? String(n)} ${noun(k)}s`,
    );
    return words.length > 1
        ? `${words.slice(0, -1).join(", ")} and ${words.at(-1) ?? ""}`
        : (words[0] ?? "");
}

/** What a job says to do, in a sentence. */
export function goalOf(a: Ask): string {
    switch (a.kind) {
        case "free":
            return "Build any house you like. Drag rooms into the slots, then decorate them with furniture.";
        case "bed":
            return `Charlie needs a bedroom with a bed and ${a.with === "rug" ? "a rug on the floor" : `a ${a.with} on the wall`}.`;
        case "area":
            return `Build a ${roomName(a.room)} of ${a.area} squares. Count the squares, or stretch the room by its handle.`;
        case "upstairs":
            return `Put a ${roomName(a.room)} upstairs, with stairs up to it.`;
        case "furnish":
            return `Put ${listWords(a.items)} in the ${roomName(a.room)}, for ${a.most} coins or fewer.`;
        case "beds":
            return `Give everyone in the house a bed: ${NUMBER_WORDS[a.n] ?? String(a.n)} beds.`;
        case "twice":
            return `Make the ${roomName(a.big)} twice as big as the ${roomName(a.small)}.`;
        case "spend":
            return `Build a ${roomName(a.room)} and furnish it, spending exactly ${a.total} coins on the room and its things.`;
        case "whole":
            return `Build a house of ${a.area} squares in all, every room on the ground or reached by stairs.`;
    }
}

export interface DollLevel extends ActionLevel {
    ask: Ask;
    budget: number;
    cast: number;
    /** Rooms already built when the job opens, as `kind` at `col` and `floor`, `w` wide. */
    built: { kind: RoomKind; col: number; floor: number; w: number }[];
    /** The house's shell: the slots it stands with before anything is built. */
    shell: Slot[];
    /** The shell slot the job's room goes in, outlined while it is empty. */
    need?: number;
    /** Whether every room shows its squares, for the jobs about area. */
    squares: boolean;
}

export const DOLL_LEVELS: Levels<DollLevel> = [
    {
        title: "Free build",
        goal: goalOf({ kind: "free" }),
        grades: [1, 4],
        ask: { kind: "free" },
        // enough that a house is never stopped by the coins, only by MOST_ROOMS
        budget: 2000,
        cast: 0,
        built: [],
        shell: [
            { col: 6, floor: 0, w: 4 },
            { col: 10, floor: 0, w: 4 },
        ],
        squares: false,
    },
    {
        title: "A home for Charlie",
        goal: goalOf({ kind: "bed", with: "picture" }),
        grades: [1, 1],
        ask: { kind: "bed", with: "picture" },
        budget: 40,
        cast: 0,
        built: [],
        shell: [{ col: 8, floor: 0, w: 4 }],
        need: 0,
        squares: false,
    },
    {
        title: "Fifteen squares",
        goal: goalOf({ kind: "area", room: "bedroom", area: 15 }),
        grades: [1, 2],
        ask: { kind: "area", room: "bedroom", area: 15 },
        budget: 60,
        cast: 0,
        built: [],
        shell: [{ col: 7, floor: 0, w: 4 }],
        need: 0,
        squares: true,
    },
    {
        title: "Upstairs",
        goal: goalOf({ kind: "upstairs", room: "bedroom" }),
        grades: [1, 2],
        ask: { kind: "upstairs", room: "bedroom" },
        budget: 80,
        cast: 1,
        built: [{ kind: "living", col: 7, floor: 0, w: 5 }],
        shell: [
            { col: 12, floor: 0, w: 2 },
            { col: 10, floor: 1, w: 4 },
        ],
        need: 1,
        squares: false,
    },
    {
        title: "A kitchen for 20 coins",
        goal: goalOf({
            kind: "furnish",
            room: "kitchen",
            items: ["table", "chair", "chair", "fridge"],
            most: 20,
        }),
        grades: [2, 2],
        ask: {
            kind: "furnish",
            room: "kitchen",
            items: ["table", "chair", "chair", "fridge"],
            most: 20,
        },
        budget: 30,
        cast: 1,
        built: [{ kind: "kitchen", col: 7, floor: 0, w: 6 }],
        shell: [],
        squares: false,
    },
    {
        title: "A bed for everyone",
        goal: goalOf({ kind: "beds", n: 3 }),
        grades: [2, 3],
        ask: { kind: "beds", n: 3 },
        budget: 90,
        cast: 1,
        built: [],
        shell: [
            { col: 2, floor: 0, w: 8 },
            { col: 10, floor: 0, w: 8 },
        ],
        squares: false,
    },
    {
        title: "Twice as big",
        goal: goalOf({ kind: "twice", big: "living", small: "bathroom" }),
        grades: [3, 3],
        ask: { kind: "twice", big: "living", small: "bathroom" },
        budget: 80,
        cast: 2,
        built: [],
        shell: [
            { col: 7, floor: 0, w: 2 },
            { col: 9, floor: 0, w: 4 },
        ],
        squares: true,
    },
    {
        title: "Exactly 40 coins",
        goal: goalOf({ kind: "spend", room: "living", total: 40 }),
        grades: [3, 4],
        ask: { kind: "spend", room: "living", total: 40 },
        budget: 100,
        cast: 3,
        built: [],
        shell: [{ col: 8, floor: 0, w: 5 }],
        need: 0,
        squares: true,
    },
    {
        title: "A house of 36 squares",
        goal: goalOf({ kind: "whole", area: 36 }),
        grades: [3, 4],
        ask: { kind: "whole", area: 36 },
        budget: 120,
        cast: 2,
        built: [],
        shell: [
            { col: 0, floor: 0, w: 6 },
            { col: 6, floor: 0, w: 6 },
        ],
        squares: true,
    },
];

export const DOLL = {
    walk: knob(2.2, 0.8, 4, 0.1, "squares a second", "how fast people walk about the house"),
    wander: knob(
        7,
        2,
        20,
        1,
        "seconds",
        "how long someone stays put before wandering to another room",
    ),
    ease: knob(7, 2, 20, 0.5, "a second", "how quickly the view eases into a room and out again"),
};

const RATE = 60,
    DT = 1 / RATE;

/** The world, in squares, which is also the view the house is first seen whole in: the house in the middle on its plinth, the readouts along the top and the drawer along the bottom. */
const W = 48,
    H = 27;
/**
 * Room round the start for the house to grow into: SIDE squares to the left and right and SKY above,
 * so a child building a long row or a tall tower never meets an edge. The view starts in the middle.
 */
const SIDE = 240,
    SKY = 90;
/** The most rooms a house holds, so a very big house still steps and draws within a frame. */
export const MOST_ROOMS = 60;
/** The top of the grass; rooms stand with their floors on it. */
const GROUND = 18 + SKY;
export const PLOT: Plot = {
    x0: 14 + SIDE,
    ground: GROUND + ROOM_FLOOR,
    cols: 20,
    floors: 3,
    open: { left: SIDE - 16, right: SIDE - 34, top: Math.floor(SKY / ROOM_H) - 1 },
    storey: ROOM_H,
    least: 2,
    most: 8,
};
/** How wide the slots beside a room are offered, in columns. */
const SLOT_W = 4;

/**
 * The fixed controls, in the view's own squares, which the camera never moves: the drawer along the
 * bottom with its rooms or its tabs and chips, the switch between building and decorating at the top,
 * and the button back out of a room at the top right.
 */
const DRAWER = { x: W / 2, top: 20.7, w: 46, h: 6 };
const CARD = CARD_SIDE,
    CARD_GAP = 0.45;
const TRAY_Y = DRAWER.top + 2.2;
const TAB = { w: 5, h: 2, gap: 0.3, y: DRAWER.top + 1.3 };
/** A chip is drawn this many squares across, from CHIP_SIDE in engine/parts/home/dollchip.ts. */
const CHIP = 2.7,
    CHIP_GAP = 0.6,
    CHIP_Y = DRAWER.top + 3.9;
const SWITCH = { x: W / 2, y: 1.9, w: 9, h: 2 };
/** The middle of each half of the switch, where its word goes: each half is the inside past SWITCH_INSET. */
export const MODE_AT: Record<Mode, Pt> = {
    build: { x: SWITCH.x - (SWITCH.w / 2 - SWITCH_INSET) / 2, y: SWITCH.y },
    decorate: { x: SWITCH.x + (SWITCH.w / 2 - SWITCH_INSET) / 2, y: SWITCH.y },
};
export const BACK_AT: Pt = { x: 45.6, y: 1.9 };
const BACK_R = 1.05;

export type Mode = "build" | "decorate";

export const TABS = ["sleep", "sit", "kitchen", "bath", "walls", "plants"] as const;
export type Tab = (typeof TABS)[number];
const TAB_NAME: Record<Tab, string> = {
    sleep: "Sleep",
    sit: "Sit",
    kitchen: "Kitchen",
    bath: "Bath",
    walls: "Walls",
    plants: "Plants",
};

type Shop = { what: "thing"; kind: Furniture } | { what: "paper"; paper: Swatch };
export const SHOP_ITEMS: readonly Shop[] = [
    ...FURNITURE.map((kind): Shop => ({ what: "thing", kind })),
    ...SWATCHES.map((paper): Shop => ({ what: "paper", paper })),
];
const shopOf = (k: Furniture): number =>
    SHOP_ITEMS.findIndex((i) => i.what === "thing" && i.kind === k);

/** What each tab of the furniture drawer holds, as indices into SHOP_ITEMS: what suits a room of that kind. */
export const TAB_ITEMS: Record<Tab, readonly number[]> = {
    sleep: (["bed", "rug", "lamp", "shelf", "plant"] as const).map(shopOf),
    sit: (["sofa", "tv", "table", "chair", "lamp", "rug"] as const).map(shopOf),
    kitchen: (["cooker", "fridge", "table", "chair", "plant"] as const).map(shopOf),
    bath: (["bath", "plant", "rug", "picture"] as const).map(shopOf),
    walls: [
        ...(["picture", "shelf"] as const).map(shopOf),
        ...SWATCHES.map((p) => SHOP_ITEMS.findIndex((i) => i.what === "paper" && i.paper === p)),
    ],
    plants: (["plant", "lamp", "rug"] as const).map(shopOf),
};

/** The tab a room of each kind opens its drawer on. */
export const ROOM_TAB: Record<RoomKind, Tab> = {
    bedroom: "sleep",
    kitchen: "kitchen",
    bathroom: "bath",
    living: "sit",
    shed: "plants",
    attic: "sleep",
    stairs: "walls",
};

const TRAY_KINDS = ROOM_KINDS;

export const trayAt = (i: number): Pt => ({
    x: DRAWER.x + (i - (TRAY_KINDS.length - 1) / 2) * (CARD + CARD_GAP),
    y: TRAY_Y,
});
export const tabAt = (i: number): Pt => ({
    x: DRAWER.x + (i - (TABS.length - 1) / 2) * (TAB.w + TAB.gap),
    y: TAB.y,
});
/** Where the `j`th of a tab's `n` chips sits in the drawer. */
export const chipAt = (j: number, n: number): Pt => ({
    x: DRAWER.x + (j - (n - 1) / 2) * (CHIP + CHIP_GAP),
    y: CHIP_Y,
});

interface DollRoom extends Room {
    kind: RoomKind;
    paper: Swatch;
    tone: Marker;
    floorKind: "boards" | "tiles" | "carpet";
    window: boolean;
    /** The step it was put down at, for the little settle it makes. */
    born: number;
}

interface DollThing extends Thing {
    kind: Furniture;
    tone: Marker;
    flip: boolean;
    on: boolean;
    born: number;
}

type Act = "stand" | "walk" | "sit" | "cheer" | "wave" | "cook";
const PERSON_ACTS: Record<Act, Cycle> = {
    stand: { poses: ["stand"] },
    walk: { poses: ["walk", "stand"], per: 1 },
    sit: { poses: ["sit"] },
    cheer: { poses: ["cheer", "wave"], every: 0.35 },
    wave: { poses: ["wave"] },
    cook: { poses: ["hold"] },
};
const PUP_ACTS: Record<Act, Cycle> = {
    stand: { poses: ["stand"] },
    walk: { poses: ["walk", "stand"], per: 1 },
    sit: { poses: ["sit"] },
    cheer: { poses: ["cheer", "jump"], every: 0.35 },
    wave: { poses: ["wave"] },
    cook: { poses: ["stand"] },
};

interface Folk {
    who: Who;
    at: Pt;
    where: Where;
    way: Pt[];
    actor: Actor<Act>;
    stride: number;
    /** Steps until it wanders off, and steps it has left to cheer. */
    wait: number;
    cheer: number;
}

type Hand =
    | {
          what: "room";
          kind: RoomKind;
          w: number;
          /** The room lifted from the house, or null for a new one from the drawer. */
          was: DollRoom | null;
          from: Spot | null;
          spot: Spot | null;
          at: Pt;
          /** Where the finger is in the view's own squares, to tell when it is back over the drawer. */
          view: Pt;
      }
    | {
          what: "thing";
          kind: Furniture;
          /** The piece lifted from the house, or null for a new one from the drawer. */
          was: DollThing | null;
          tone: Marker;
          flip: boolean;
          from: Place | null;
          place: Place | null;
          at: Pt;
          view: Pt;
      }
    | { what: "paper"; paper: Swatch; room: number | null; at: Pt; view: Pt }
    | { what: "folk"; i: number; at: Pt; view: Pt }
    | { what: "stretch"; id: number; w0: number; w: number; at: Pt; view: Pt };

export type Target =
    | { k: "tray"; kind: RoomKind }
    | { k: "tab"; tab: Tab }
    | { k: "chip"; item: number }
    | { k: "mode"; mode: Mode }
    | { k: "back" }
    | { k: "room"; id: number }
    | { k: "thing"; id: number }
    | { k: "folk"; i: number }
    | { k: "handle"; id: number };

/** How the camera looks at the house: its middle and how much nearer than the whole view. */
interface Lens {
    x: number;
    y: number;
    k: number;
}

interface Snapshot {
    rooms: DollRoom[];
    things: DollThing[];
    spent: number;
}

export interface DollState {
    level: number;
    L: DollLevel;
    rooms: DollRoom[];
    things: DollThing[];
    next: number;
    folk: Folk[];
    cast: number;
    spent: number;
    mode: Mode;
    /** The room the view has eased into, or null for the whole house. */
    zoom: number | null;
    lens: Lens;
    tab: Tab;
    /** How far the drawer has slid up into view, from nought to one. */
    slide: number;
    hand: Hand | null;
    down: { start: Pt; view: Pt; last: Pt; on: Target | null; moved: boolean } | null;
    /** Where the child has moved the view to by hand, which the camera holds until the house next changes; null to frame the house. */
    free: Lens | null;
    /** What the camera keeps in view when the house is bigger than the view: the last room put down or the keys' highlight. */
    follow: Pt | null;
    /** Where the switch's knob has slid to, from building at nought to decorating at one. */
    knob: number;
    /** The keys' highlight, as an index into `targets(s)`, and whether the keys have been used. */
    sel: number;
    keyed: boolean;
    brakeWas: boolean;
    chosen: number | null;
    undo: Snapshot[];
    finished: number[];
    said: string;
    saidAt: number;
    steps: number;
    won: boolean;
    wonAt: number;
    rng: number;
}

/** A deterministic random draw from the state's own seed, from nought to one. */
function draw(s: DollState): number {
    s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
    return s.rng / 4294967296;
}

const lookOf = (kind: RoomKind) => ROOM_LOOK[kind];

function newRoom(s: DollState, kind: RoomKind, spot: Spot, w: number): DollRoom {
    const look = lookOf(kind);
    return {
        id: s.next++,
        kind,
        col: spot.col,
        floor: spot.floor,
        w,
        ...(kind === "stairs" ? { climbs: true as const } : {}),
        paper: look.paper,
        tone: look.tone,
        floorKind: look.floor,
        window: look.window,
        born: s.steps,
    };
}

/** The grass by the house's door, where the household waits to move in and wanders back to. */
function lawnOf(s: Pick<DollState, "rooms" | "L">): { from: number; to: number } {
    const cols = [
        ...s.rooms.filter((r) => r.floor === 0).map((r) => r.col),
        ...s.L.shell.filter((t) => t.floor === 0).map((t) => t.col),
    ];
    const left = PLOT.x0 + (cols.length ? Math.min(...cols) : PLOT.cols / 2);
    return { from: Math.max(1.5, left - 5), to: Math.max(2.5, left - 0.7) };
}

function folkOf(s: Pick<DollState, "rooms" | "L">, who: Who, i: number): Folk {
    const x = Math.max(lawnOf(s).from, lawnOf(s).to - i * 0.9);
    return {
        who,
        at: { x, y: PLOT.ground },
        where: { room: null, x },
        way: [],
        actor: actor<Act>("wave", "wave", 1),
        stride: 0,
        wait: RATE * (2 + i),
        cheer: 0,
    };
}

const WHOLE: Lens = { x: SIDE + W / 2, y: SKY + H / 2, k: 1 };

export function startDoll(L: DollLevel, level = 0): DollState {
    const s: DollState = {
        level,
        L,
        rooms: [],
        things: [],
        next: 1,
        folk: [],
        cast: L.cast,
        spent: 0,
        mode: "build",
        zoom: null,
        lens: { ...WHOLE },
        tab: "sleep",
        slide: 1,
        hand: null,
        down: null,
        free: null,
        follow: null,
        knob: 0,
        sel: 0,
        keyed: false,
        brakeWas: false,
        chosen: null,
        undo: [],
        finished: [],
        said: "",
        saidAt: -9999,
        steps: 0,
        won: false,
        wonAt: 0,
        rng: 0x2545f491 + level * 977,
    };
    for (const b of L.built) {
        const r = newRoom(s, b.kind, { col: b.col, floor: b.floor }, b.w);
        r.born = -9999;
        s.rooms.push(r);
    }
    s.folk = (CASTS[s.cast] ?? CASTS[0] ?? []).map((who, i) => folkOf(s, who, i));
    s.lens = lensFor(s);
    return s;
}

const start = (level: number): DollState => startDoll(DOLL_LEVELS[level] ?? DOLL_LEVELS[0], level);

const left = (s: DollState): number => s.L.budget - s.spent;
const roomPrice = (w: number): number => w * PLOT.storey;

function say(s: DollState, words: string): void {
    s.said = words;
    s.saidAt = s.steps;
}

function remember(s: DollState): void {
    s.undo.push({
        rooms: structuredClone(s.rooms),
        things: structuredClone(s.things),
        spent: s.spent,
    });
    if (s.undo.length > 40) s.undo.shift();
}

/** The world point a place in the view's own squares shows, through the lens the house is seen with. */
export const worldOf = (s: Pick<DollState, "lens">, v: Pt): Pt => ({
    x: s.lens.x + (v.x - W / 2) / s.lens.k,
    y: s.lens.y + (v.y - H / 2) / s.lens.k,
});
const viewOf = (s: Pick<DollState, "lens">, p: Pt): Pt => ({
    x: (p.x - s.lens.x) * s.lens.k + W / 2,
    y: (p.y - s.lens.y) * s.lens.k + H / 2,
});

/** The space the house is framed in, in the view's own squares: under the switch and over the drawer. */
const FRAME = { top: SWITCH.y + SWITCH.h / 2 + 0.6, bottom: DRAWER.top - 0.4 };

/** The furthest out the camera frames a house by itself; past this the view follows the work and the child pans. */
const LEAST_K = 0.6;
/** The furthest out "the whole house" goes, and the nearest a pinch comes in. */
const FIT_K = 0.2,
    MOST_K = 5;
/** The world runs far enough under the grass that the furthest view out still shows the grass above the drawer. */
const WORLD = { w: W + 2 * SIDE, h: GROUND + 1 + Math.ceil((H - FRAME.bottom) / FIT_K) };

/** A lens kept inside the world, as the view keeps its camera, so a point under the finger stays where the view draws it. */
function inWorld(l: Lens): Lens {
    const hw = W / 2 / l.k,
        hh = H / 2 / l.k;
    return {
        x: Math.max(hw, Math.min(WORLD.w - hw, l.x)),
        y: Math.max(hh, Math.min(WORLD.h - hh, l.y)),
        k: l.k,
    };
}

/** A lens that puts a box of the world in the middle of the frame, as near as `most` allows and no further out than `least`. */
function framing(b: { x: number; y: number; w: number; h: number }, most: number, least = 1): Lens {
    const k = Math.max(least, Math.min(most, W / b.w, (FRAME.bottom - FRAME.top) / b.h));
    const middle = (FRAME.top + FRAME.bottom) / 2;
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 - (middle - H / 2) / k, k };
}

/** The house with its roofs, its plinth and the slots it offers, and room on either side for the household at the door. */
function houseBox(
    s: Pick<DollState, "rooms" | "L" | "mode">,
): { x: number; y: number; w: number; h: number } | null {
    const parts = [
        ...s.rooms,
        ...(s.mode === "build" ? slotsOf(PLOT, s.rooms, s.L.shell, SLOT_W) : s.L.shell),
    ];
    if (!parts.length) return null;
    const boxes = parts.map((p) => boxOf(PLOT, p));
    const x0 = Math.min(...boxes.map((b) => b.x)),
        x1 = Math.max(...boxes.map((b) => b.x + b.w)),
        y0 = Math.min(...boxes.map((b) => b.y)) - ROOF_H,
        y1 = GROUND + 1;
    const side = 4.5;
    return { x: x0 - side, y: y0 - 1, w: x1 - x0 + 2 * side, h: y1 - y0 + 1 };
}

/** A lens moved by hand, kept with its middle over the house so a pan never loses it. */
function onHouse(s: DollState, l: Lens): Lens {
    const b = houseBox(s);
    if (!b) return inWorld(l);
    return inWorld({
        x: Math.max(b.x, Math.min(b.x + b.w, l.x)),
        y: Math.max(b.y, Math.min(b.y + b.h, l.y)),
        k: l.k,
    });
}

/** The view the camera eases to: the whole house, its roofs, its plinth and its open slots large in the middle, or one room filling the frame. */
function lensFor(s: Pick<DollState, "zoom" | "rooms" | "L" | "mode" | "follow">): Lens {
    const r = s.zoom === null ? undefined : s.rooms.find((o) => o.id === s.zoom);
    if (r) {
        const b = boxOf(PLOT, r);
        return framing({ x: b.x - 0.8, y: b.y - ROOF_H, w: b.w + 1.6, h: b.h + ROOF_H + 0.6 }, 5);
    }
    const whole = houseBox(s);
    if (!whole) return { ...WHOLE };
    const fits = W / whole.w >= LEAST_K && (FRAME.bottom - FRAME.top) / whole.h >= LEAST_K;
    if (fits) return inWorld(framing(whole, 2.2, LEAST_K));
    // too big to see whole: as far out as the camera goes, on the work or else the house's foot, and
    // never lower than the ground
    const f = s.follow ?? { x: whole.x + whole.w / 2, y: GROUND };
    const k = LEAST_K,
        y = Math.min(f.y, GROUND + 1 - (FRAME.bottom - H / 2) / k);
    return inWorld({ x: f.x, y, k });
}

/** The whole house, however big, as the "whole house" button shows it. */
function fitAll(s: DollState): Lens {
    const boxes = s.rooms.map((r) => boxOf(PLOT, r));
    if (!boxes.length) return inWorld(lensFor({ ...s, follow: null }));
    const x0 = Math.min(...boxes.map((b) => b.x)) - 3,
        x1 = Math.max(...boxes.map((b) => b.x + b.w)) + 3,
        y0 = Math.min(...boxes.map((b) => b.y)) - ROOF_H - 0.5;
    return inWorld(framing({ x: x0, y: y0, w: x1 - x0, h: GROUND + 1 - y0 }, 2.2, FIT_K));
}

/** The slots the house shows now, for a room `w` wide. */
const slotsNow = (s: DollState, w = SLOT_W): Slot[] => slotsOf(PLOT, s.rooms, s.L.shell, w);

const handleOf = (r: Room): Pt => {
    const b = boxOf(PLOT, r);
    return { x: b.x + b.w, y: b.y + b.h / 2 };
};

/** Which fixed control a point in the view's own squares is on, as the mode and zoom show them. */
function fixedHit(s: DollState, v: Pt): Target | null {
    // the switch answers 3 squares tall, past its drawn pill, so it is 44 px wherever a square is 15 px
    if (Math.abs(v.y - SWITCH.y) <= SWITCH.h / 2 + 0.5) {
        for (const mode of ["build", "decorate"] as const) {
            const at = MODE_AT[mode];
            if (Math.abs(v.x - at.x) <= SWITCH.w / 4 + 0.1) return { k: "mode", mode };
        }
    }
    if (s.zoom !== null && Math.hypot(v.x - BACK_AT.x, v.y - BACK_AT.y) <= BACK_R + 0.2)
        return { k: "back" };
    if (v.y < DRAWER.top) return null;
    if (s.mode === "build") {
        for (const [i, kind] of TRAY_KINDS.entries()) {
            const c = trayAt(i);
            if (Math.abs(v.x - c.x) <= CARD / 2 + 0.1 && Math.abs(v.y - c.y) <= CARD / 2 + 0.6)
                return { k: "tray", kind };
        }
        return null;
    }
    for (const [i, tab] of TABS.entries()) {
        const c = tabAt(i);
        if (Math.abs(v.x - c.x) <= TAB.w / 2 && Math.abs(v.y - c.y) <= TAB.h / 2)
            return { k: "tab", tab };
    }
    const items = TAB_ITEMS[s.tab];
    for (const [j, item] of items.entries()) {
        const c = chipAt(j, items.length);
        if (Math.hypot(v.x - c.x, v.y - c.y) <= CHIP / 2 + 0.15) return { k: "chip", item };
    }
    return null;
}

/** What is under a point in the house, the first that answers: a room's stretching handle, a person, a piece, a room. */
function worldHit(s: DollState, at: Pt): Target | null {
    if (s.mode === "build")
        for (const r of s.rooms) {
            if (r.climbs) continue;
            const h = handleOf(r);
            if (Math.hypot(at.x - h.x, at.y - h.y) <= 0.6) return { k: "handle", id: r.id };
        }
    for (const [i, f] of s.folk.entries()) {
        const tall = f.who.kind === "pup" ? 1.6 : 2.3;
        if (Math.abs(at.x - f.at.x) <= 0.7 && at.y <= f.at.y + 0.2 && at.y >= f.at.y - tall)
            return { k: "folk", i };
    }
    for (const t of [...s.things].reverse()) {
        const b = thingBox(s, t);
        if (b && at.x >= b.x && at.x <= b.x + b.w && at.y >= b.y && at.y <= b.y + b.h)
            return { k: "thing", id: t.id };
    }
    const r = roomAt(PLOT, s.rooms, at);
    return r ? { k: "room", id: r.id } : null;
}

/** Where a piece is drawn: its box in the world, standing on its room's floor or hanging on its wall. */
export function thingBox(
    s: Pick<DollState, "rooms">,
    t: Pick<DollThing, "room" | "x" | "kind">,
): { x: number; y: number; w: number; h: number } | null {
    const r = s.rooms.find((o) => o.id === t.room);
    if (!r) return null;
    const b = boxOf(PLOT, r),
        z = sizeOf(t.kind);
    const foot = b.y + b.h - ROOM_FLOOR;
    const y =
        LAYER[t.kind] === "wall"
            ? b.y + 0.55
            : LAYER[t.kind] === "rug"
              ? foot - z.h + 0.12
              : foot - z.h;
    return { x: b.x + t.x, y, w: z.w, h: z.h };
}

const sortedRooms = (s: DollState) =>
    [...s.rooms].sort((a, b) => a.floor - b.floor || a.col - b.col);

/**
 * Everything the keys can reach, in the order left and right step through it. Building, that is the
 * drawer's rooms, the rooms in the house and the people; decorating, the drawer's tabs and the chips
 * of the tab open, the rooms, the furniture and the people.
 */
export function targets(s: DollState): Target[] {
    const rooms = sortedRooms(s).map((r): Target => ({ k: "room", id: r.id }));
    const folk = s.folk.map((_f, i): Target => ({ k: "folk", i }));
    if (s.mode === "build")
        return [...TRAY_KINDS.map((kind): Target => ({ k: "tray", kind })), ...rooms, ...folk];
    return [
        ...TABS.map((tab): Target => ({ k: "tab", tab })),
        ...TAB_ITEMS[s.tab].map((item): Target => ({ k: "chip", item })),
        ...rooms,
        ...s.things.map((t): Target => ({ k: "thing", id: t.id })),
        ...folk,
    ];
}

const GROUPS = 6;
const groupOf = (t: Target): number =>
    t.k === "tray"
        ? 0
        : t.k === "tab"
          ? 1
          : t.k === "chip"
            ? 2
            : t.k === "room" || t.k === "handle"
              ? 3
              : t.k === "thing"
                ? 4
                : 5;

/** Where a new thing taken by the keys starts out: in the room looked into, or the middle of the house. */
function houseMiddle(s: DollState): Pt {
    const r =
        (s.zoom === null ? undefined : s.rooms.find((o) => o.id === s.zoom)) ??
        s.rooms[s.rooms.length - 1];
    if (!r) return { x: PLOT.x0 + PLOT.cols / 2, y: PLOT.ground - PLOT.storey / 2 };
    const b = boxOf(PLOT, r);
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/** Changes the mode: building looks at the whole house, and decorating opens the furniture drawer. */
function setMode(s: DollState, mode: Mode, out: Happening[]): void {
    if (s.mode === mode) return;
    s.mode = mode;
    s.zoom = null;
    s.free = null;
    s.slide = 0;
    s.sel = 0;
    s.chosen = null;
    say(
        s,
        mode === "build"
            ? "Building: drag a room up from the drawer into a slot."
            : "Decorating: tap a room to look inside, then drag furniture in.",
    );
    out.push({ cue: "creak", strength: 0.6 });
}

/** Eases the view into a room and opens the drawer on what suits it, or back out to the whole house. */
function look(s: DollState, id: number | null, out: Happening[]): void {
    if (s.zoom === id) return;
    s.zoom = id;
    s.free = null;
    s.slide = 0;
    const r = id === null ? undefined : s.rooms.find((o) => o.id === id);
    if (r) {
        s.tab = ROOM_TAB[r.kind];
        say(s, `The ${lookOf(r.kind).name.toLowerCase()}: drag in what it needs.`);
    }
    out.push({ cue: "creak", strength: 0.4, pitch: r ? 1.2 : 0.85 });
}

/** Takes something into the hand: a new room or piece from the drawer, or one already in the house. */
function take(s: DollState, t: Target, at: Pt, view: Pt, keys: boolean, out: Happening[]): void {
    if (t.k === "tray") {
        if (s.rooms.length >= MOST_ROOMS) {
            say(s, `This house has ${MOST_ROOMS} rooms, the most a house can hold.`);
            out.push({ cue: "nope" });
            return;
        }
        const w = lookOf(t.kind).w;
        const spot = keys
            ? (nearestSpot(PLOT, s.rooms, w, houseMiddle(s), 99) ?? null)
            : nearestSpot(PLOT, s.rooms, w, at, 3);
        if (keys && !spot) {
            say(s, "There is no room for that just now.");
            out.push({ cue: "nope" });
            return;
        }
        s.hand = { what: "room", kind: t.kind, w, was: null, from: null, spot, at, view };
    } else if (t.k === "chip") {
        const item = SHOP_ITEMS[t.item];
        if (!item) return;
        if (item.what === "paper") {
            const r = keys
                ? (s.rooms.find((o) => o.id === s.zoom) ?? s.rooms.find((o) => !o.climbs) ?? null)
                : roomAt(PLOT, s.rooms, at);
            if (keys && !r) {
                say(s, "Build a room first, then paper its walls.");
                out.push({ cue: "nope" });
                return;
            }
            s.hand = { what: "paper", paper: item.paper, room: r?.id ?? null, at, view };
        } else {
            const z = sizeOf(item.kind);
            const place = keys
                ? nearestPlace(PLOT, s.rooms, s.things, z.w, LAYER[item.kind], houseMiddle(s), 99)
                : nearestPlace(PLOT, s.rooms, s.things, z.w, LAYER[item.kind], at, 2);
            if (keys && !place) {
                say(
                    s,
                    s.rooms.length
                        ? `There is no space left for a ${nounOf(item.kind)}.`
                        : "Build a room first.",
                );
                out.push({ cue: "nope" });
                return;
            }
            s.hand = {
                what: "thing",
                kind: item.kind,
                was: null,
                tone: item.kind === "bed" ? "berry" : item.kind === "sofa" ? "mint" : "sky",
                flip: false,
                from: null,
                place,
                at,
                view,
            };
        }
    } else if (t.k === "room") {
        const r = s.rooms.find((o) => o.id === t.id);
        if (!r) return;
        if (!canLeave(s.rooms, r.id)) {
            say(s, "Something stands on that room, so it stays.");
            out.push({ cue: "nope" });
            return;
        }
        remember(s);
        s.rooms = s.rooms.filter((o) => o.id !== r.id);
        s.hand = {
            what: "room",
            kind: r.kind,
            w: r.w,
            was: r,
            from: { col: r.col, floor: r.floor },
            spot: { col: r.col, floor: r.floor },
            at,
            view,
        };
        // whoever was in it waits on the lawn while it is carried
        for (const f of s.folk) if (f.where.room === r.id) toLawn(s, f);
    } else if (t.k === "thing") {
        const th = s.things.find((o) => o.id === t.id);
        if (!th) return;
        remember(s);
        s.things = s.things.filter((o) => o.id !== th.id);
        s.hand = {
            what: "thing",
            kind: th.kind,
            was: th,
            tone: th.tone,
            flip: th.flip,
            from: { room: th.room, x: th.x },
            place: { room: th.room, x: th.x },
            at,
            view,
        };
    } else if (t.k === "folk") {
        const f = s.folk[t.i];
        if (!f) return;
        f.way = [];
        s.hand = { what: "folk", i: t.i, at, view };
    } else if (t.k === "handle") {
        const r = s.rooms.find((o) => o.id === t.id);
        if (!r) return;
        remember(s);
        s.hand = { what: "stretch", id: r.id, w0: r.w, w: r.w, at, view };
    } else return;
    out.push({ cue: "lift" });
}

function toLawn(s: DollState, f: Folk): void {
    const x = lawnOf(s).to - 0.5;
    f.where = { room: null, x };
    f.at = { x, y: PLOT.ground };
    f.way = [];
}

/** Moves the hand to where the finger is, and works out where what it holds would go, with a click as it snaps somewhere new. */
function aim(s: DollState, at: Pt, view: Pt, out: Happening[]): void {
    const h = s.hand;
    if (!h) return;
    h.at = at;
    h.view = view;
    if (h.what === "room") {
        const spot = nearestSpot(PLOT, s.rooms, h.w, at, 3);
        if (spot && (spot.col !== h.spot?.col || spot.floor !== h.spot.floor))
            out.push({ cue: "level", strength: 0.2 });
        h.spot = spot;
    } else if (h.what === "thing") {
        const place = nearestPlace(PLOT, s.rooms, s.things, sizeOf(h.kind).w, LAYER[h.kind], at, 2);
        if (place && (place.room !== h.place?.room || Math.abs(place.x - h.place.x) > 1e-9))
            out.push({ cue: "level", strength: 0.12 });
        h.place = place;
    } else if (h.what === "paper") {
        const r = roomAt(PLOT, s.rooms, at);
        h.room = r && !r.climbs ? r.id : null;
    } else if (h.what === "stretch") {
        const r = s.rooms.find((o) => o.id === h.id);
        if (!r) return;
        const b = boxOf(PLOT, r);
        const want = Math.max(PLOT.least, Math.min(PLOT.most, Math.round(at.x - b.x)));
        if (want !== h.w && canResize(PLOT, s.rooms, s.things, r.id, want)) {
            h.w = want;
            out.push({ cue: "level", strength: 0.2 });
        }
    }
}

/** Whether a point in the view's own squares is over the drawer, where a held thing goes back. */
const overDrawer = (v: Pt): boolean => v.y > DRAWER.top - 0.3;

/** Puts down what the hand holds, where it would go; over the drawer it goes back to it, and anywhere else it goes back where it came from. */
function drop(s: DollState, out: Happening[]): void {
    const h = s.hand;
    if (!h) return;
    s.hand = null;
    if (h.what === "room") {
        const was = h.was;
        if (was) {
            if (overDrawer(h.view) && !h.spot) {
                s.things = s.things.filter((t) => t.room !== was.id);
                s.spent -= roomPrice(was.w);
                say(s, `${lookOf(was.kind).name} taken away: ${roomPrice(was.w)} coins back.`);
                out.push({ cue: "back" });
                return;
            }
            const spot = h.spot ?? h.from;
            s.rooms.push({ ...was, ...spot, born: s.steps });
            out.push({ cue: "place", strength: 0.7 });
            return;
        }
        if (!h.spot) {
            if (!overDrawer(h.view)) {
                say(s, "A room goes in a slot: ground or rooms under all of it, and space beside.");
                out.push({ cue: "nope" });
            }
            return;
        }
        const price = roomPrice(h.w);
        if (price > left(s)) {
            say(
                s,
                `A ${lookOf(h.kind).name.toLowerCase()} ${h.w} squares wide costs ${price} coins, and there are ${left(s)} left.`,
            );
            out.push({ cue: "nope" });
            return;
        }
        remember(s);
        const r = newRoom(s, h.kind, h.spot, h.w);
        s.rooms.push(r);
        s.spent += price;
        // the camera keeps the new room in view, and frames the house again by itself
        const rb = boxOf(PLOT, r);
        s.follow = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 };
        s.free = null;
        const area = areaOf(PLOT, r);
        say(
            s,
            h.kind === "stairs"
                ? `Stairs, for ${price} coins. Put a room over them to climb to it.`
                : `A ${lookOf(h.kind).name.toLowerCase()} of ${area} squares, ${r.w} by ${PLOT.storey}, for ${price} coins.`,
        );
        out.push(
            { cue: "place", strength: 0.9 },
            { cue: "ring", strength: 0.35 },
            { puff: { x: boxOf(PLOT, r).x + r.w / 2, y: PLOT.ground - 0.2, n: 6 } },
        );
        return;
    }
    if (h.what === "thing") {
        const was = h.was;
        if (was) {
            if (overDrawer(h.view) && !h.place) {
                s.spent -= PRICE[was.kind];
                say(s, `The ${nounOf(was.kind)} went back: ${PRICE[was.kind]} coins back.`);
                out.push({ cue: "back" });
                return;
            }
            s.things.push({ ...was, ...(h.place ?? h.from), born: s.steps });
            out.push({ cue: "place", strength: 0.5 });
            return;
        }
        if (!h.place) {
            if (!overDrawer(h.view)) {
                say(s, `There is no space there for a ${nounOf(h.kind)}.`);
                out.push({ cue: "nope" });
            }
            return;
        }
        if (PRICE[h.kind] > left(s)) {
            say(
                s,
                `A ${nounOf(h.kind)} costs ${PRICE[h.kind]} coins, and there are ${left(s)} left.`,
            );
            out.push({ cue: "nope" });
            return;
        }
        remember(s);
        s.things.push({
            id: s.next++,
            room: h.place.room,
            x: h.place.x,
            w: sizeOf(h.kind).w,
            layer: LAYER[h.kind],
            kind: h.kind,
            tone: h.tone,
            flip: h.flip,
            on: false,
            born: s.steps,
        });
        s.spent += PRICE[h.kind];
        say(s, `A ${nounOf(h.kind)} for ${PRICE[h.kind]} coins.`);
        out.push({ cue: "place", strength: 0.6 }, { cue: "ring", strength: 0.3 });
        return;
    }
    if (h.what === "paper") {
        const r = s.rooms.find((o) => o.id === h.room);
        if (!r) return;
        if (PAPER_PRICE > left(s)) {
            say(s, `New wallpaper costs ${PAPER_PRICE} coins, and there are ${left(s)} left.`);
            out.push({ cue: "nope" });
            return;
        }
        remember(s);
        r.paper = h.paper;
        r.tone = SWATCH_TONE[h.paper];
        s.spent += PAPER_PRICE;
        say(s, `New wallpaper for ${PAPER_PRICE} coins.`);
        out.push({ cue: "level" }, { cue: "ring", strength: 0.3 });
        return;
    }
    if (h.what === "folk") {
        const f = s.folk[h.i];
        if (!f) return;
        const r = roomAt(PLOT, s.rooms, h.at);
        if (r && !r.climbs) {
            const b = boxOf(PLOT, r),
                x = Math.max(0.4, Math.min(r.w - 0.4, h.at.x - b.x));
            f.where = { room: r.id, x };
            f.at = { x: b.x + x, y: floorLine(PLOT, r.floor) };
        } else {
            const lawn = lawnOf(s);
            const x = Math.max(lawn.from, Math.min(lawn.to, h.at.x));
            f.where = { room: null, x };
            f.at = { x, y: PLOT.ground };
        }
        f.way = [];
        f.wait = RATE * 4;
        out.push({ cue: "place", strength: 0.3 });
        return;
    }
    const r = s.rooms.find((o) => o.id === h.id);
    if (!r || h.w === r.w) return;
    const cost = roomPrice(h.w) - roomPrice(r.w);
    if (cost > left(s)) {
        say(
            s,
            `That makes it ${roomPrice(h.w)} coins, ${cost} more, and there are ${left(s)} left.`,
        );
        out.push({ cue: "nope" });
        return;
    }
    r.w = h.w;
    r.born = s.steps;
    s.spent += cost;
    say(
        s,
        `The ${lookOf(r.kind).name.toLowerCase()} is now ${r.w} by ${PLOT.storey}: ${areaOf(PLOT, r)} squares.`,
    );
    out.push({ cue: "level" });
}

/**
 * A tap: on the switch it changes the mode, on the back button it leaves the room, on a tab it opens
 * that tab; in the house a piece switches on or turns round, a person is chosen, a room a chosen
 * person is sent to, and decorating, a room is looked into.
 */
function tap(s: DollState, t: Target | null, at: Pt, out: Happening[]): void {
    if (t?.k === "mode") {
        setMode(s, t.mode, out);
        return;
    }
    if (t?.k === "back") {
        look(s, null, out);
        return;
    }
    if (t?.k === "tab") {
        s.tab = t.tab;
        out.push({ cue: "level", strength: 0.25 });
        return;
    }
    if (t?.k === "thing") {
        const th = s.things.find((o) => o.id === t.id);
        if (!th) return;
        if (SWITCHED.has(th.kind)) th.on = !th.on;
        else th.flip = !th.flip;
        out.push({ cue: th.on || !SWITCHED.has(th.kind) ? "ring" : "back", strength: 0.4 });
        return;
    }
    if (t?.k === "folk") {
        s.chosen = s.chosen === t.i ? null : t.i;
        const f = s.folk[t.i];
        if (f) say(s, s.chosen === null ? "" : `Tap a room to send ${nameOf(f.who)} there.`);
        return;
    }
    if (s.chosen !== null) {
        const f = s.folk[s.chosen];
        const r = roomAt(PLOT, s.rooms, at);
        if (f && r && !r.climbs) {
            const b = boxOf(PLOT, r);
            if (!send(s, f, { room: r.id, x: Math.max(0.4, Math.min(r.w - 0.4, at.x - b.x)) })) {
                say(
                    s,
                    `${nameOf(f.who)} cannot get there: put stairs up to it, or a room beside it.`,
                );
                out.push({ cue: "nope" });
            }
        }
        s.chosen = null;
        return;
    }
    if (t?.k === "room" && s.mode === "decorate") {
        const r = s.rooms.find((o) => o.id === t.id);
        if (r && !r.climbs) look(s, r.id, out);
    }
}

/** Sends someone walking to a place, and says whether there is a way. */
function send(s: DollState, f: Folk, to: Where): boolean {
    const way = wayBetween(PLOT, s.rooms, f.where, to);
    if (!way) return false;
    f.way = way.slice(1);
    f.where = to;
    return true;
}

function remove(s: DollState, t: Target | undefined, out: Happening[]): void {
    if (s.hand) {
        const h = s.hand;
        s.hand = null;
        if (h.what === "room" && h.was) {
            const was = h.was;
            const refund = s.things
                .filter((o) => o.room === was.id)
                .reduce((n, o) => n + PRICE[o.kind], 0);
            s.things = s.things.filter((o) => o.room !== was.id);
            s.spent -= roomPrice(was.w) + refund;
        } else if (h.what === "thing" && h.was) s.spent -= PRICE[h.was.kind];
        out.push({ cue: "back" });
        return;
    }
    if (t?.k === "room") {
        const r = s.rooms.find((o) => o.id === t.id);
        if (!r) return;
        if (!canLeave(s.rooms, r.id)) {
            say(s, "Something stands on that room, so it stays.");
            out.push({ cue: "nope" });
            return;
        }
        remember(s);
        const refund = s.things
            .filter((o) => o.room === r.id)
            .reduce((n, o) => n + PRICE[o.kind], 0);
        s.things = s.things.filter((o) => o.room !== r.id);
        s.rooms = s.rooms.filter((o) => o.id !== r.id);
        s.spent -= roomPrice(r.w) + refund;
        if (s.zoom === r.id) s.zoom = null;
        for (const f of s.folk) if (f.where.room === r.id) toLawn(s, f);
        out.push({ cue: "back" });
    } else if (t?.k === "thing") {
        const th = s.things.find((o) => o.id === t.id);
        if (!th) return;
        remember(s);
        s.things = s.things.filter((o) => o.id !== th.id);
        s.spent -= PRICE[th.kind];
        out.push({ cue: "back" });
    }
}

/** The keys: left and right step the highlight or what is held, up and down jump between rows or storeys, the big button takes and puts down. */
function keys(s: DollState, pad: Pad, out: Happening[]): void {
    for (const d of pad.pressed) {
        const list = targets(s);
        s.keyed = true;
        const h = s.hand;
        const dx = d === "left" ? -1 : d === "right" ? 1 : 0,
            dy = d === "up" ? -1 : d === "down" ? 1 : 0;
        if (h?.what === "room") {
            if (h.spot) h.spot = stepSpot(PLOT, s.rooms, h.w, h.spot, dx, dy);
            if (h.spot) h.at = middleOfSpot(h.spot, h.w);
            continue;
        }
        if (h?.what === "thing") {
            const z = sizeOf(h.kind);
            if (h.place)
                h.place = stepPlace(PLOT, s.rooms, s.things, z.w, LAYER[h.kind], h.place, dx, dy);
            continue;
        }
        if (h?.what === "paper") {
            const rooms = sortedRooms(s).filter((r) => !r.climbs);
            const i = rooms.findIndex((r) => r.id === h.room);
            const next = rooms[(i + (dx || -dy) + rooms.length) % Math.max(1, rooms.length)];
            if (next) h.room = next.id;
            continue;
        }
        if (h?.what === "folk") {
            const rooms = s.rooms.filter((r) => !r.climbs);
            const at = rooms.findIndex((r) => r.id === roomAt(PLOT, s.rooms, h.at)?.id);
            const next =
                rooms[(at + (dx || -dy) + rooms.length + 1) % Math.max(1, rooms.length + 1)];
            if (next) {
                const b = boxOf(PLOT, next);
                h.at = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
            } else {
                const lawn = lawnOf(s);
                h.at = { x: (lawn.from + lawn.to) / 2, y: PLOT.ground - 1 };
            }
            continue;
        }
        if (h?.what === "stretch") continue;
        if (!list.length) continue;
        if (dx !== 0) s.sel = (s.sel + dx + list.length) % list.length;
        else {
            const now = list[s.sel];
            const g = now ? groupOf(now) : 0;
            for (let k = 1; k <= GROUPS; k++) {
                const gi = (g + (dy > 0 ? k : -k) + GROUPS * 2) % GROUPS;
                const j = list.findIndex((t) => groupOf(t) === gi);
                if (j >= 0) {
                    s.sel = j;
                    break;
                }
            }
        }
    }
    s.sel = Math.min(s.sel, Math.max(0, targets(s).length - 1));
    if (pad.tapped) {
        s.keyed = true;
        if (s.hand) drop(s, out);
        else {
            const t = targets(s)[s.sel];
            const at = t ? keyPoint(s, t) : houseMiddle(s);
            if (t?.k === "tab") {
                s.tab = t.tab;
                out.push({ cue: "level", strength: 0.25 });
            } else if (t?.k === "room" && s.mode === "decorate") {
                const r = s.rooms.find((o) => o.id === t.id);
                if (r && !r.climbs) look(s, r.id, out);
            } else if (t?.k === "thing" && s.mode === "build") tap(s, t, at, out);
            else if (t) take(s, t, at, viewOf(s, at), true, out);
        }
    }
    const brake = pad.brake;
    if (brake && !s.brakeWas) {
        s.keyed = true;
        remove(s, targets(s)[s.sel], out);
    }
    s.brakeWas = brake;
}

const middleOfSpot = (spot: Spot, w: number): Pt => {
    const b = boxOf(PLOT, { ...spot, w });
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
};

/** Where a target is in the world, for the keys' highlight and for a thing the keys take. */
function keyPoint(s: DollState, t: Target): Pt {
    if (t.k === "tray") return worldOf(s, trayAt(TRAY_KINDS.indexOf(t.kind)));
    if (t.k === "tab") return worldOf(s, tabAt(TABS.indexOf(t.tab)));
    if (t.k === "chip") {
        const items = TAB_ITEMS[s.tab];
        return worldOf(s, chipAt(Math.max(0, items.indexOf(t.item)), items.length));
    }
    if (t.k === "mode") return worldOf(s, MODE_AT[t.mode]);
    if (t.k === "back") return worldOf(s, BACK_AT);
    if (t.k === "room" || t.k === "handle") {
        const r = s.rooms.find((o) => o.id === t.id);
        return r ? middleOfSpot(r, r.w) : houseMiddle(s);
    }
    if (t.k === "thing") {
        const th = s.things.find((o) => o.id === t.id);
        const b = th ? thingBox(s, th) : null;
        return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : houseMiddle(s);
    }
    const f = s.folk[t.i];
    return f ? { x: f.at.x, y: f.at.y - 1 } : houseMiddle(s);
}

/** Whether a target is a fixed control, drawn in the view's own squares rather than the world's. */
const isFixed = (t: Target): boolean =>
    t.k === "tray" || t.k === "tab" || t.k === "chip" || t.k === "mode" || t.k === "back";

/** What a press is on: a fixed control first, then the house. */
function hit(s: DollState, at: Pt, view: Pt): Target | null {
    return fixedHit(s, view) ?? worldHit(s, at);
}

/** Whether a press on a target is a drag that takes it, rather than a tap: building takes rooms and their handles, decorating furniture, and both people and the drawer's cards. */
function dragsIn(s: DollState, t: Target): boolean {
    if (t.k === "tray" || t.k === "chip" || t.k === "folk") return true;
    if (t.k === "room" || t.k === "handle") return s.mode === "build";
    if (t.k === "thing") return s.mode === "decorate";
    return false;
}

/** The finger: a press takes what it is on once it moves, a short press is a tap, and lifting puts down. */
function hands(s: DollState, pad: Pad, out: Happening[]): void {
    const fixedOf = (p: Pt): Pt => pad.view ?? viewOf(s, p);
    if (pad.touch && !s.down) {
        const v = fixedOf(pad.touch);
        s.down = { start: pad.touch, view: v, last: v, on: hit(s, pad.touch, v), moved: false };
        s.keyed = false;
    } else if (pad.touch && s.down) {
        const v = fixedOf(pad.touch);
        if (!s.down.moved && Math.hypot(v.x - s.down.view.x, v.y - s.down.view.y) > 0.35) {
            s.down.moved = true;
            const on = s.down.on;
            if (on && !s.hand && dragsIn(s, on)) take(s, on, pad.touch, v, false, out);
        }
        // a drag on the sky or the grass, with nothing in hand, moves the view
        if (s.down.moved && !s.hand && !s.down.on) {
            const l = s.free ?? s.lens;
            s.free = onHouse(s, {
                x: l.x - (v.x - s.down.last.x) / l.k,
                y: l.y - (v.y - s.down.last.y) / l.k,
                k: l.k,
            });
        } else if (s.down.moved) aim(s, pad.touch, v, out);
        s.down.last = v;
    }
    if (pad.lifted && s.down) {
        const v = fixedOf(pad.lifted);
        if (s.hand) {
            aim(s, pad.lifted, v, out);
            drop(s, out);
        } else if (!s.down.moved) tap(s, s.down.on, pad.lifted, out);
        s.down = null;
    }
}

/** Whether a room of a kind has one of each piece a list asks for, counting repeats. */
function holds(s: DollState, r: Room, items: readonly Furniture[]): boolean {
    const there = s.things.filter((t) => t.room === r.id).map((t) => t.kind);
    for (const k of items) {
        const i = there.indexOf(k);
        if (i < 0) return false;
        there.splice(i, 1);
    }
    return true;
}

const ofKind = (s: DollState, k: RoomKind) => s.rooms.filter((r) => r.kind === k);
const spentIn = (s: DollState, r: Room) =>
    s.things.filter((t) => t.room === r.id).reduce((n, t) => n + PRICE[t.kind], 0);
const reached = (s: DollState, r: Room) =>
    wayBetween(PLOT, s.rooms, { room: null, x: PLOT.x0 - 2 }, { room: r.id, x: 0.5 }) !== null;
const areaAll = (s: DollState) => s.rooms.reduce((n, r) => n + areaOf(PLOT, r), 0);

/** Whether the job's ask is met. */
function met(s: DollState): boolean {
    return lines(s).every((l) => l.done) && s.L.ask.kind !== "free";
}

/** A job's short list, each line with whether it is done, for the card in the corner and for the win. */
export function lines(s: DollState): { words: string; done: boolean }[] {
    const a = s.L.ask;
    switch (a.kind) {
        case "free":
            return [];
        case "bed": {
            const rooms = ofKind(s, "bedroom");
            return [
                { words: "A bedroom", done: rooms.length > 0 },
                { words: "A bed in it", done: rooms.some((r) => holds(s, r, ["bed"])) },
                {
                    words: a.with === "rug" ? "A rug on its floor" : `A ${a.with} on its wall`,
                    done: rooms.some((r) => holds(s, r, ["bed", a.with])),
                },
            ];
        }
        case "area": {
            const rooms = ofKind(s, a.room);
            const best = rooms.map((r) => areaOf(PLOT, r)).sort((x, y) => x - y);
            return [
                { words: `A ${roomName(a.room)}`, done: rooms.length > 0 },
                {
                    words: `${a.area} squares${best.length ? `, now ${best.join(" and ")}` : ""}`,
                    done: best.includes(a.area),
                },
            ];
        }
        case "upstairs": {
            const up = ofKind(s, a.room).filter((r) => r.floor > 0);
            return [
                { words: "Stairs", done: s.rooms.some((r) => r.climbs) },
                { words: `A ${roomName(a.room)} upstairs`, done: up.length > 0 },
                { words: "The stairs reach it", done: up.some((r) => reached(s, r)) },
            ];
        }
        case "furnish": {
            const rooms = ofKind(s, a.room);
            const out = counted(a.items).map(([k, n]) => {
                const most = Math.max(
                    0,
                    ...rooms.map(
                        (r) => s.things.filter((t) => t.room === r.id && t.kind === k).length,
                    ),
                );
                return {
                    words:
                        n === 1
                            ? `A ${noun(k)}`
                            : `${(NUMBER_WORDS[n] ?? String(n)).replace(/^./, (c) => c.toUpperCase())} ${noun(k)}s${most && most < n ? `, ${most} so far` : ""}`,
                    done: most >= n,
                };
            });
            out.push({
                words: `${a.most} coins or fewer`,
                done: rooms.some((r) => holds(s, r, a.items) && spentIn(s, r) <= a.most),
            });
            return out;
        }
        case "beds": {
            const n = s.things.filter((t) => t.kind === "bed").length;
            return [{ words: `${a.n} beds, ${Math.min(n, a.n)} so far`, done: n >= a.n }];
        }
        case "twice":
            return [
                { words: `A ${roomName(a.small)}`, done: ofKind(s, a.small).length > 0 },
                { words: `A ${roomName(a.big)}`, done: ofKind(s, a.big).length > 0 },
                {
                    words: "Twice as big",
                    done: ofKind(s, a.big).some((b) =>
                        ofKind(s, a.small).some((m) => areaOf(PLOT, b) === 2 * areaOf(PLOT, m)),
                    ),
                },
            ];
        case "spend":
            return [
                { words: `A ${roomName(a.room)}`, done: ofKind(s, a.room).length > 0 },
                {
                    words: `Exactly ${a.total} coins on it`,
                    done: ofKind(s, a.room).some((r) => roomPrice(r.w) + spentIn(s, r) === a.total),
                },
            ];
        case "whole":
            return [
                {
                    words: `${a.area} squares in all, now ${areaAll(s)}`,
                    done: areaAll(s) === a.area,
                },
                {
                    words: "Every room reached",
                    done: s.rooms.length > 0 && s.rooms.every((r) => reached(s, r)),
                },
            ];
    }
}

/** What the job counts coins against, if it does: what has gone on its room, and the target. */
function tally(s: DollState): { spent: number; of: number; on: boolean } | null {
    const a = s.L.ask;
    if (a.kind === "spend") {
        const sums = ofKind(s, a.room).map((r) => roomPrice(r.w) + spentIn(s, r));
        const near = sums.sort((x, y) => Math.abs(x - a.total) - Math.abs(y - a.total))[0] ?? 0;
        return { spent: near, of: a.total, on: near === a.total };
    }
    if (a.kind === "furnish") {
        const sums = ofKind(s, a.room).map((r) => spentIn(s, r));
        const most = Math.max(0, ...sums);
        return {
            spent: most,
            of: a.most,
            on: ofKind(s, a.room).some((r) => holds(s, r, a.items) && spentIn(s, r) <= a.most),
        };
    }
    return null;
}

/** The ask in a few words, for the line at the top of the field. */
function askWords(a: Ask): string {
    switch (a.kind) {
        case "free":
            return "Free build";
        case "bed":
            return `A bedroom with a bed and a ${a.with}`;
        case "area":
            return `A ${lookOf(a.room).name.toLowerCase()} of ${a.area} squares`;
        case "upstairs":
            return `A ${lookOf(a.room).name.toLowerCase()} upstairs, with stairs`;
        case "furnish":
            return `Furnish the ${lookOf(a.room).name.toLowerCase()} for ${a.most} coins or fewer`;
        case "beds":
            return `${a.n} beds`;
        case "twice":
            return `The ${lookOf(a.big).name.toLowerCase()} twice the ${lookOf(a.small).name.toLowerCase()}`;
        case "spend":
            return `A ${lookOf(a.room).name.toLowerCase()} for exactly ${a.total} coins`;
        case "whole":
            return `A house of ${a.area} squares`;
    }
}

/** A room is finished when it has what its kind needs; the household cheers the first time and moves in. */
function cheers(s: DollState, out: Happening[]): void {
    for (const r of s.rooms) {
        if (s.finished.includes(r.id) || r.climbs) continue;
        const needs = NEEDS[r.kind];
        const has = s.things.some((t) => t.room === r.id && needs.includes(t.kind));
        if (!has) continue;
        s.finished.push(r.id);
        const b = boxOf(PLOT, r);
        out.push(
            { cue: "level" },
            { burst: { kind: "sparkle", x: b.x + b.w / 2, y: b.y + 0.8, n: 10 } },
        );
        for (const f of s.folk)
            if (!f.way.length) {
                f.cheer = RATE * 1.4;
                send(s, f, { room: r.id, x: Math.min(r.w - 0.5, 0.6 + 0.5 * s.folk.indexOf(f)) });
            }
    }
}

/** Where someone stops in a room, and what they do there: sit on a sofa or a bed, cook at a cooker, or stand. */
function settle(s: DollState, f: Folk): Act {
    if (f.where.room === null) return "stand";
    const near = s.things.filter(
        (t) => t.room === f.where.room && Math.abs(t.x + t.w / 2 - f.where.x) < t.w / 2 + 0.3,
    );
    if (near.some((t) => t.kind === "sofa" || t.kind === "bed" || t.kind === "chair")) return "sit";
    if (near.some((t) => t.kind === "cooker")) return "cook";
    return "stand";
}

function stepFolk(s: DollState, out: Happening[]): void {
    for (const [i, f] of s.folk.entries()) {
        if (s.hand?.what === "folk" && s.hand.i === i) continue;
        let act: Act;
        if (f.way.length) {
            const moved = travel(f.way, f.at, DOLL.walk.value * DT);
            const before = Math.floor(f.stride);
            f.stride += Math.hypot(moved.at.x - f.at.x, moved.at.y - f.at.y) * 1.6;
            f.at = moved.at;
            f.way = moved.way;
            if (moved.facing) f.actor.facing = moved.facing;
            if (Math.floor(f.stride) !== before && Math.floor(f.stride) % 2 === 0)
                out.push({ cue: "bump", strength: 0.06 });
            act = "walk";
            if (!f.way.length)
                f.wait = Math.round(RATE * DOLL.wander.value * (0.6 + draw(s) * 0.8));
        } else if (f.cheer > 0) {
            f.cheer--;
            act = "cheer";
        } else {
            act = settle(s, f);
            if (--f.wait <= 0) {
                f.wait = Math.round(RATE * DOLL.wander.value * (0.6 + draw(s) * 0.8));
                const rooms = s.rooms.filter((r) => !r.climbs);
                const pick = Math.floor(draw(s) * (rooms.length + 1));
                const r = rooms[pick];
                const lawn = lawnOf(s);
                if (r) send(s, f, { room: r.id, x: 0.5 + draw(s) * (r.w - 1) });
                else
                    send(s, f, {
                        room: null,
                        x: lawn.from + 0.5 + draw(s) * Math.max(0, lawn.to - lawn.from - 1),
                    });
            }
        }
        stepActor(f.actor, act, f.who.kind === "pup" ? PUP_ACTS : PERSON_ACTS, DT, f.stride);
    }
}

/** Eases the camera towards the view it wants and the drawer up into place. */
function stepView(s: DollState): void {
    // while something is carried the view holds still, so the place under the finger stays put, except
    // that a hand near the view's edge drifts it that way, so a room can be carried past what shows
    if (s.hand) {
        const v = s.hand.view,
            edge = 3,
            speed = 14 / s.lens.k;
        const dx = v.x < edge ? -1 : v.x > W - edge ? 1 : 0,
            dy = v.y < FRAME.top + 1 ? -1 : 0;
        if (dx || dy)
            s.free = onHouse(s, {
                x: s.lens.x + dx * speed * DT,
                y: s.lens.y + dy * speed * DT,
                k: s.lens.k,
            });
    }
    const to = s.free ?? (s.hand ? s.lens : lensFor(s));
    const k = 1 - Math.exp(-DOLL.ease.value * DT);
    s.lens = {
        x: s.lens.x + (to.x - s.lens.x) * k,
        y: s.lens.y + (to.y - s.lens.y) * k,
        k: s.lens.k + (to.k - s.lens.k) * k,
    };
    if (Math.abs(s.lens.k - to.k) < 1e-3 && Math.hypot(s.lens.x - to.x, s.lens.y - to.y) < 1e-3)
        s.lens = to;
    s.slide = s.slide >= 0.999 ? 1 : s.slide + (1 - s.slide) * (1 - Math.exp(-9 * DT));
    const knobTo = s.mode === "decorate" ? 1 : 0;
    s.knob += (knobTo - s.knob) * (1 - Math.exp(-14 * DT));
    if (Math.abs(knobTo - s.knob) < 0.01) s.knob = knobTo;
}

/** The view moved by hand: two fingers or the wheel pan it, a pinch or a held ctrl zooms it. */
function moveView(s: DollState, intents: readonly Intent[]): void {
    for (const i of intents) {
        const l = s.free ?? s.lens;
        s.free =
            i.kind === "zoom"
                ? onHouse(s, { ...l, k: Math.max(FIT_K, Math.min(MOST_K, l.k * i.by)) })
                : onHouse(s, { x: l.x + (i.x * W) / l.k, y: l.y + (i.y * H) / l.k, k: l.k });
    }
}

export function step(s: DollState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    moveView(s, pad.intents ?? []);
    hands(s, pad, out);
    keys(s, pad, out);
    // the camera follows the keys' highlight, or the room carried by the keys
    if (pad.pressed.length && s.keyed) {
        const t = targets(s)[s.sel];
        const p =
            s.hand?.what === "room" && s.hand.spot
                ? s.hand.at
                : t && !isFixed(t)
                  ? keyPoint(s, t)
                  : null;
        if (p) {
            s.follow = p;
            s.free = null;
        }
    }
    cheers(s, out);
    stepFolk(s, out);
    stepView(s);
    if (!s.won && !s.hand && met(s)) {
        s.won = true;
        s.wonAt = s.steps;
        say(s, `${askWords(s.L.ask)}: done. Well built.`);
        out.push({ cue: "win" }, { event: { kind: "job" } });
        for (const f of s.folk) f.cheer = RATE * 2.5;
    }
    return out;
}

/** The commands: turn a piece round, widen or narrow a room by a square, build or decorate, look into a room or out, change who lives here, and start a new house. */
export function command(s: DollState, id: string): void {
    const t = targets(s)[s.sel];
    const out: Happening[] = [];
    if (id === "build" || id === "decorate") {
        setMode(s, id, out);
        return;
    }
    if (id === "zoom") {
        if (s.zoom !== null) look(s, null, out);
        else {
            if (s.mode !== "decorate") setMode(s, "decorate", out);
            const r =
                (t?.k === "room" ? s.rooms.find((o) => o.id === t.id && !o.climbs) : undefined) ??
                sortedRooms(s).find((o) => !o.climbs);
            if (r) look(s, r.id, out);
        }
        return;
    }
    if (id === "flip") {
        if (s.hand?.what === "thing") s.hand.flip = !s.hand.flip;
        else if (t?.k === "thing") {
            const th = s.things.find((o) => o.id === t.id);
            if (th) {
                if (SWITCHED.has(th.kind)) th.on = !th.on;
                else th.flip = !th.flip;
            }
        }
        return;
    }
    if (id === "wider" || id === "narrower") {
        const r = t?.k === "room" ? s.rooms.find((o) => o.id === t.id) : undefined;
        if (!r || r.climbs) return;
        const w = r.w + (id === "wider" ? 1 : -1);
        if (!canResize(PLOT, s.rooms, s.things, r.id, w)) {
            say(
                s,
                id === "wider"
                    ? "There is no space to make it wider."
                    : "It cannot be any narrower.",
            );
            return;
        }
        const cost = roomPrice(w) - roomPrice(r.w);
        if (cost > left(s)) {
            say(s, `That costs ${cost} coins more, and there are ${left(s)} left.`);
            return;
        }
        remember(s);
        r.w = w;
        r.born = s.steps;
        s.spent += cost;
        say(
            s,
            `The ${lookOf(r.kind).name.toLowerCase()} is now ${r.w} by ${PLOT.storey}: ${areaOf(PLOT, r)} squares.`,
        );
        return;
    }
    if (id === "who") {
        s.cast = (s.cast + 1) % CASTS.length;
        s.folk = (CASTS[s.cast] ?? []).map((who, i) => folkOf(s, who, i));
        s.chosen = null;
        const who = CASTS[s.cast] ?? [];
        say(s, `${who.map(nameOf).join(", ")} ${who.length > 1 ? "live" : "lives"} here now.`);
        return;
    }
    if (id === "fit") {
        s.free = fitAll(s);
        return;
    }
    if (id === "panleft" || id === "panright") {
        const l = s.free ?? s.lens;
        s.free = onHouse(s, { ...l, x: l.x + ((id === "panleft" ? -1 : 1) * W) / 3 / l.k });
        return;
    }
    if (id === "new") {
        const fresh = startDoll(s.L, s.level);
        Object.assign(s, fresh, {
            cast: s.cast,
            folk: (CASTS[s.cast] ?? []).map((who, i) => folkOf(fresh, who, i)),
        });
        say(s, "A new house, starting from the empty shell.");
    }
}

/** Takes the last change back. */
function back(s: DollState): boolean {
    const last = s.undo.pop();
    if (!last) return false;
    s.rooms = last.rooms;
    s.things = last.things;
    s.spent = last.spent;
    s.hand = null;
    if (s.zoom !== null && !s.rooms.some((r) => r.id === s.zoom)) s.zoom = null;
    return true;
}

const personSize = (w: Who): number =>
    w.kind === "pup" ? 1.3 : w.kind === "person" && w.look.age !== "child" ? 1.2 : 1.5;

function folkSprite(f: Folk, i: number, at: Pt, rest: boolean, z: number): Sprite[] {
    const acts = f.who.kind === "pup" ? PUP_ACTS : PERSON_ACTS;
    return actorSprites(
        f.actor,
        acts,
        (pose, facing): Sprite =>
            f.who.kind === "pup"
                ? {
                      key: `folk:${i}`,
                      art: "pupfamily",
                      params: {
                          member: f.who.member,
                          pose,
                          mood: "happy",
                          dir: facing,
                          gear: "none",
                      },
                      x: at.x,
                      y: at.y,
                      stand: true,
                      size: personSize(f.who),
                      z,
                  }
                : {
                      key: `folk:${i}`,
                      art: f.who.kind === "charlie" ? "charlie" : "person",
                      params: {
                          ...(f.who.kind === "charlie" ? CHARLIE_LOOK : f.who.look),
                          pose,
                          dir: facing,
                      },
                      x: at.x,
                      y: at.y,
                      stand: true,
                      size: personSize(f.who) * (pose === "point" || pose === "balance" ? 1.5 : 1),
                      z,
                  },
        f.stride,
        rest,
    );
}

function roomSprite(
    key: string,
    r: {
        kind: RoomKind;
        w: number;
        paper: Swatch;
        tone: Marker;
        floorKind?: string;
        window?: boolean;
    },
    x: number,
    y: number,
    size: number,
    z: number,
    alpha = 1,
    sides: { left: boolean; right: boolean } = { left: false, right: false },
): Sprite {
    const look = lookOf(r.kind);
    return {
        key,
        art: "dollroom",
        params: {
            w: r.w,
            kind: r.kind === "stairs" ? "stairs" : "room",
            paper: r.paper,
            tone: r.tone,
            floor: r.floorKind ?? look.floor,
            window: r.window ?? look.window,
            left: sides.left ? "door" : "wall",
            right: sides.right ? "door" : "wall",
        },
        x,
        y,
        size,
        z,
        alpha,
    };
}

function thingSprite(
    key: string,
    kind: Furniture,
    tone: Marker,
    on: boolean,
    flip: boolean,
    x: number,
    y: number,
    size: number,
    z: number,
    alpha = 1,
): Sprite {
    return { key, art: "furniture", params: { kind, tone, on }, x, y, size, z, flip, alpha };
}

/** The little settle a room or a piece makes once it is put down: a squash that springs back, over half a second. */
function settleOf(s: DollState, born: number, rest: boolean): number {
    const t = (s.steps - born) / RATE;
    if (rest || t < 0 || t > 0.5) return 0;
    return 0.16 * Math.exp(-t * 7) * Math.cos(t * 26);
}

/** The house in the world: its plinth, its rooms with their walls and roofs, the slots still empty, and what is in the rooms. */
function houseSprites(
    s: DollState,
    rest: boolean,
    sprites: Sprite[],
    marks: Mark[],
    lights: Light[],
): void {
    const h = s.hand;
    const k = rest ? lensFor(s).k : s.lens.k;
    // the plinth under the house's ground storey, rooms and shell alike
    const base = [
        ...s.rooms.filter((r) => r.floor === 0),
        ...s.L.shell.filter((t) => t.floor === 0),
    ];
    if (base.length) {
        const a = Math.min(...base.map((r) => r.col)),
            b = Math.max(...base.map((r) => r.col + r.w));
        sprites.push({
            key: `plinth:${a}:${b}`,
            art: "dollshell",
            params: { kind: "plinth", w: b - a, h: 1 },
            x: PLOT.x0 + (a + b) / 2,
            y: GROUND + 0.5,
            size: b - a,
            z: 1.8,
            still: true,
        });
    }
    // which rooms a held piece cannot go in, so they fade
    const fits = (r: DollRoom): boolean => {
        if (h?.what !== "thing") return true;
        return (
            !r.climbs &&
            placesIn(s.rooms, s.things, r, sizeOf(h.kind).w, LAYER[h.kind], -1).length > 0
        );
    };
    for (const r of s.rooms) {
        const b = boxOf(PLOT, r);
        const faded = (h?.what === "thing" && !fits(r)) || (h?.what === "paper" && !!r.climbs);
        sprites.push({
            ...roomSprite(
                `room:${r.id}`,
                r,
                b.x + b.w / 2,
                b.y + b.h,
                r.w,
                2,
                faded ? 0.45 : 1,
                sharedWalls(s.rooms, r),
            ),
            stand: true,
            squash: settleOf(s, r.born, rest),
        });
        const covered = s.rooms.some(
            (o) => o.floor === r.floor + 1 && o.col < r.col + r.w && r.col < o.col + o.w,
        );
        if (!covered)
            sprites.push({
                key: `roof:${r.id}`,
                art: "dollroof",
                params: { w: r.w, tone: "berry", chimney: r.w >= 4 },
                x: b.x + b.w / 2,
                y: b.y - ROOF_H / 2,
                size: r.w,
                z: 2,
            });
        if (!r.climbs) {
            const n = s.things.filter((t) => t.room === r.id).length;
            const words = [
                lookOf(r.kind).name,
                ...(s.L.squares || s.mode === "build" ? [`${areaOf(PLOT, r)} squares`] : []),
                ...(s.mode === "decorate" ? [n === 1 ? "1 thing" : `${n} things`] : []),
            ].join(", ");
            // the sign keeps one size on the screen however near the view is
            marks.push({
                kind: "word",
                x: b.x + b.w / 2,
                y: b.y + 0.42,
                text: words,
                size: 0.5 / k,
            });
        }
    }
    // the empty slots of the shell and beside the house, dashed, with the job's own slot outlined
    if (s.mode === "build") {
        const need = s.L.need === undefined ? undefined : s.L.shell[s.L.need];
        for (const [i, slot] of slotsNow(s).entries()) {
            const b = boxOf(PLOT, slot);
            const isNeed =
                need !== undefined &&
                need.col === slot.col &&
                need.floor === slot.floor &&
                need.w === slot.w;
            marks.push({ kind: "box", x: b.x, y: b.y, w: b.w, h: b.h, on: isNeed });
            if (!h)
                marks.push({
                    kind: "word",
                    x: b.x + b.w / 2,
                    y: b.y + b.h / 2,
                    text: b.w >= 3 ? "drop a room here" : "a room",
                    size: 0.45 / s.lens.k,
                });
            const inShell = s.L.shell.some(
                (t) => t.col === slot.col && t.floor === slot.floor && t.w === slot.w,
            );
            const over = s.rooms.some(
                (o) =>
                    o.floor === slot.floor + 1 &&
                    o.col < slot.col + slot.w &&
                    slot.col < o.col + o.w,
            );
            if (
                inShell &&
                !over &&
                !s.L.shell.some(
                    (t) =>
                        t.floor === slot.floor + 1 &&
                        t.col < slot.col + slot.w &&
                        slot.col < t.col + t.w,
                )
            )
                sprites.push({
                    key: `shellroof:${i}`,
                    art: "dollroof",
                    params: { w: slot.w, tone: "berry", chimney: false },
                    x: b.x + b.w / 2,
                    y: b.y - ROOF_H / 2,
                    size: slot.w,
                    z: 1.9,
                    alpha: 0.35,
                });
        }
    }
    for (const t of s.things) {
        const b = thingBox(s, t);
        if (!b) continue;
        sprites.push({
            ...thingSprite(
                `thing:${t.id}`,
                t.kind,
                t.tone,
                t.on,
                t.flip,
                b.x + b.w / 2,
                b.y + b.h,
                b.w,
                LAYER[t.kind] === "rug" ? 2.5 : 3,
            ),
            stand: true,
            squash: settleOf(s, t.born, rest),
        });
        if (t.on) {
            const hue =
                t.kind === "lamp"
                    ? "glow"
                    : t.kind === "tv"
                      ? "sky"
                      : t.kind === "cooker"
                        ? "tang"
                        : "sky";
            lights.push({
                x: b.x + b.w / 2,
                y: b.y + 0.4,
                r: t.kind === "lamp" ? 3 : 1.6,
                hue,
                strength: 0.8,
            });
        }
    }
}

/** Where a held thing can go, glowing green, and a faint ghost of it where it would land. */
function handSprites(s: DollState, sprites: Sprite[], marks: Mark[]): void {
    const h = s.hand;
    if (h?.what === "room") {
        for (const [i, slot] of slotsNow(s, h.w).entries()) {
            const at = { col: slot.col, floor: slot.floor, w: h.w };
            if (slot.col + h.w > PLOT.cols || !canStand(PLOT, s.rooms, at)) continue;
            const b = boxOf(PLOT, at);
            sprites.push({
                key: `glow:slot:${i}`,
                art: "dollshell",
                params: { kind: "glow", w: h.w, h: 3 },
                x: b.x + b.w / 2,
                y: b.y + b.h / 2,
                size: h.w,
                z: 2.6,
            });
        }
        if (h.spot) {
            const b = boxOf(PLOT, { ...h.spot, w: h.w });
            sprites.push(
                roomSprite(
                    "ghost",
                    {
                        kind: h.kind,
                        w: h.w,
                        paper: lookOf(h.kind).paper,
                        tone: lookOf(h.kind).tone,
                    },
                    b.x + b.w / 2,
                    b.y + b.h / 2,
                    h.w,
                    2.7,
                    0.35,
                ),
            );
            marks.push(
                { kind: "box", x: b.x, y: b.y, w: b.w, h: b.h, on: true },
                {
                    kind: "word",
                    x: b.x + b.w / 2,
                    y: b.y - 0.5,
                    text: `${h.w} by ${PLOT.storey} is ${areaOf(PLOT, { w: h.w })} squares`,
                    size: 0.6 / s.lens.k,
                },
            );
        } else if (!overDrawer(h.view))
            marks.push({
                kind: "word",
                x: h.at.x,
                y: h.at.y - 2,
                text: "No room here",
                size: 0.6 / s.lens.k,
            });
        sprites.push(
            roomSprite(
                "hand",
                { kind: h.kind, w: h.w, paper: lookOf(h.kind).paper, tone: lookOf(h.kind).tone },
                h.at.x,
                h.at.y,
                h.w,
                30,
                0.85,
            ),
        );
    } else if (h?.what === "thing") {
        const z = sizeOf(h.kind);
        const wall = LAYER[h.kind] === "wall";
        for (const r of s.rooms) {
            if (r.climbs || !placesIn(s.rooms, s.things, r, z.w, LAYER[h.kind], -1).length)
                continue;
            const b = boxOf(PLOT, r);
            sprites.push({
                key: `glow:room:${r.id}`,
                art: "dollshell",
                params: { kind: "glow", w: r.w, h: wall ? 2 : 1 },
                x: b.x + b.w / 2,
                y: wall ? b.y + 1.35 : b.y + b.h - ROOM_FLOOR - 0.45,
                size: r.w,
                z: 2.6,
            });
        }
        const b = h.place ? thingBox(s, { room: h.place.room, x: h.place.x, kind: h.kind }) : null;
        if (b)
            sprites.push(
                thingSprite(
                    "ghost",
                    h.kind,
                    h.tone,
                    false,
                    h.flip,
                    b.x + b.w / 2,
                    b.y + b.h / 2,
                    b.w,
                    3.2,
                    0.35,
                ),
            );
        else if (!overDrawer(h.view))
            marks.push({
                kind: "word",
                x: h.at.x,
                y: h.at.y - 1.4,
                text: "No space here",
                size: 0.6 / s.lens.k,
            });
        sprites.push(
            thingSprite("hand", h.kind, h.tone, false, h.flip, h.at.x, h.at.y, z.w, 31, 0.85),
        );
    } else if (h?.what === "paper") {
        const r = s.rooms.find((o) => o.id === h.room);
        if (r) {
            const b = boxOf(PLOT, r);
            sprites.push({
                key: `glow:room:${r.id}`,
                art: "dollshell",
                params: { kind: "glow", w: r.w, h: 3 },
                x: b.x + b.w / 2,
                y: b.y + b.h / 2,
                size: r.w,
                z: 2.6,
            });
        }
        sprites.push(
            roomSprite(
                "hand",
                {
                    kind: "bedroom",
                    w: 2,
                    paper: h.paper,
                    tone: SWATCH_TONE[h.paper],
                    window: false,
                },
                h.at.x,
                h.at.y,
                1.6,
                31,
                0.85,
            ),
        );
    } else if (h?.what === "stretch") {
        const r = s.rooms.find((o) => o.id === h.id);
        if (r) {
            const b = boxOf(PLOT, { ...r, w: h.w });
            marks.push(
                { kind: "box", x: b.x, y: b.y, w: b.w, h: b.h, on: true },
                {
                    kind: "word",
                    x: b.x + b.w / 2,
                    y: b.y - 0.5,
                    text: `${h.w} by ${PLOT.storey} is ${areaOf(PLOT, { w: h.w })} squares`,
                    size: 0.6 / s.lens.k,
                },
            );
        }
    }
    // each room's stretching handle, while building and nothing is held
    if (!h && s.mode === "build")
        for (const r of s.rooms) {
            if (r.climbs) continue;
            const p = handleOf(r);
            marks.push({ kind: "ring", x: p.x, y: p.y, r: 0.3, solid: true });
        }
}

/** The fixed controls: the coins, the job's list, the switch, the button out of a room and the drawer. */
function fixedSprites(s: DollState, rest: boolean, sprites: Sprite[], marks: Mark[]): void {
    const fixed = (sp: Sprite): Sprite => ({ ...sp, fixed: true, still: sp.still ?? false });
    const word = (x: number, y: number, text: string, size: number): Mark => ({
        kind: "word",
        x,
        y,
        text,
        size,
        fixed: true,
    });
    // the coins, against the job's target where it has one
    const t = tally(s);
    sprites.push(
        fixed({
            key: "counter",
            art: "dollchip",
            params: { kind: "pill", tone: t?.on ? "mint" : "glow", on: false, w: 8, h: 2 },
            x: 5.6,
            y: 1.9,
            size: 8,
            z: 40,
        }),
        fixed({
            key: "coin",
            art: "dollcard",
            params: { kind: "coin", tone: "glow" },
            x: 2.4,
            y: 1.9,
            size: 1.2,
            z: 41,
        }),
    );
    marks.push(word(6.1, 2.05, t ? `${t.spent} / ${t.of} coins` : `${left(s)} coins`, 0.6));
    // the job's list in the corner
    const ls = lines(s);
    if (ls.length) {
        const ch = 1.4 + ls.length * 1.15;
        sprites.push(
            fixed({
                key: "jobcard",
                art: "dollchip",
                params: { kind: "card", tone: "sky", on: false, w: 14, h: Math.ceil(ch) },
                x: 8,
                y: 3.4 + Math.ceil(ch) / 2,
                size: 14,
                z: 40,
            }),
        );
        marks.push(word(8, 4.2, askWords(s.L.ask), 0.48));
        for (const [i, l] of ls.entries()) {
            const y = 5.3 + i * 1.15;
            sprites.push(
                fixed({
                    key: `tick:${i}`,
                    art: "dollchip",
                    params: { kind: "tick", tone: "mint", on: l.done, w: 2, h: 2 },
                    x: 2.6,
                    y,
                    size: 0.85,
                    z: 41,
                }),
            );
            marks.push(word(8.6, y + 0.15, l.words, 0.45));
        }
    }
    // the switch between building and decorating
    sprites.push(
        fixed({
            key: "switch",
            art: "dollchip",
            params: {
                kind: "switch",
                tone: "glow",
                on: s.mode === "decorate",
                w: SWITCH.w,
                h: 2,
                slide: rest ? (s.mode === "decorate" ? 1 : 0) : Math.round(s.knob * 20) / 20,
            },
            x: SWITCH.x,
            y: SWITCH.y,
            size: SWITCH.w,
            z: 40,
            live: s.knob > 0 && s.knob < 1,
        }),
    );
    marks.push(
        word(MODE_AT.build.x, MODE_AT.build.y + 0.2, "Build", 0.55),
        word(MODE_AT.decorate.x, MODE_AT.decorate.y + 0.2, "Decorate", 0.55),
    );
    // the way back out of a room
    if (s.zoom !== null)
        sprites.push(
            fixed({
                key: "back",
                art: "dollchip",
                params: { kind: "button", tone: "sky", on: false, w: 2, h: 2 },
                x: BACK_AT.x,
                y: BACK_AT.y,
                size: BACK_R * 2,
                z: 40,
            }),
            fixed({
                key: "backicon",
                art: "icon",
                params: { name: "back", on: false },
                x: BACK_AT.x,
                y: BACK_AT.y,
                size: 1.2,
                z: 41,
            }),
        );
    // the drawer, sliding up after a change of mode or room
    const dy = (rest ? 0 : 1 - s.slide) * (DRAWER.h + 0.5);
    sprites.push(
        fixed({
            key: "drawer",
            art: "dollchip",
            params: { kind: "drawer", tone: "sky", on: false, w: DRAWER.w, h: DRAWER.h },
            x: DRAWER.x,
            y: DRAWER.top + DRAWER.h / 2 + dy,
            size: DRAWER.w,
            z: 38,
        }),
    );
    if (s.mode === "build") {
        for (const [i, kind] of TRAY_KINDS.entries()) {
            const c = trayAt(i),
                look = lookOf(kind);
            sprites.push(
                fixed({
                    key: `tray:${kind}`,
                    art: "dollcard",
                    params: { kind: "card", tone: look.tone },
                    x: c.x,
                    y: c.y + dy,
                    size: CARD,
                    z: 40,
                }),
                fixed(
                    roomSprite(
                        `traypic:${kind}`,
                        { kind, w: Math.min(look.w, 4), paper: look.paper, tone: look.tone },
                        c.x - 0.15,
                        c.y + 0.05 + dy,
                        2.3,
                        41,
                    ),
                ),
            );
            marks.push(
                word(c.x, c.y + CARD / 2 + 0.55 + dy, look.name, 0.45),
                word(
                    c.x + CARD / 2 - 0.5,
                    c.y + CARD / 2 - 0.42 + dy,
                    String(roomPrice(look.w)),
                    0.42,
                ),
            );
        }
    } else {
        for (const [i, tab] of TABS.entries()) {
            const c = tabAt(i);
            sprites.push(
                fixed({
                    key: `tab:${tab}`,
                    art: "dollchip",
                    params: { kind: "tab", tone: "sky", on: tab === s.tab, w: TAB.w, h: 2 },
                    x: c.x,
                    y: c.y + dy,
                    size: TAB.w,
                    z: 40,
                }),
            );
            marks.push(word(c.x, c.y + 0.22 + dy, TAB_NAME[tab], 0.5));
        }
        const items = TAB_ITEMS[s.tab];
        for (const [j, index] of items.entries()) {
            const item = SHOP_ITEMS[index];
            if (!item) continue;
            const c = chipAt(j, items.length);
            sprites.push(
                fixed({
                    key: `chip:${index}`,
                    art: "dollchip",
                    params: { kind: "chip", tone: "mint", on: false, w: 2, h: 2 },
                    x: c.x,
                    y: c.y + dy,
                    size: CHIP,
                    z: 40,
                }),
            );
            if (item.what === "thing") {
                const z = sizeOf(item.kind),
                    k = Math.min(1.7 / z.w, 1.5 / z.h);
                sprites.push(
                    fixed(
                        thingSprite(
                            `chippic:${index}`,
                            item.kind,
                            item.kind === "bed" ? "berry" : item.kind === "sofa" ? "mint" : "sky",
                            false,
                            false,
                            c.x,
                            c.y - 0.05 + dy,
                            z.w * k,
                            41,
                        ),
                    ),
                );
            } else
                sprites.push(
                    fixed(
                        roomSprite(
                            `chippic:${index}`,
                            {
                                kind: "bedroom",
                                w: 2,
                                paper: item.paper,
                                tone: SWATCH_TONE[item.paper],
                                window: false,
                            },
                            c.x,
                            c.y + dy,
                            1.4,
                            41,
                        ),
                    ),
                );
            marks.push(
                word(
                    c.x + CHIP / 2 - 0.35,
                    c.y + CHIP / 2 - 0.25 + dy,
                    String(item.what === "thing" ? PRICE[item.kind] : PAPER_PRICE),
                    0.42,
                ),
            );
        }
    }
    // the keys' highlight on a fixed control
    const sel = targets(s)[s.sel];
    if (s.keyed && sel && isFixed(sel) && !s.hand) {
        const at = viewOf(s, keyPoint(s, sel));
        const size = sel.k === "tray" ? CARD + 0.7 : sel.k === "tab" ? TAB.w + 0.4 : CHIP + 0.6;
        sprites.push(
            fixed({
                key: "keyring",
                art: "dollchip",
                params: { kind: "ring", tone: "sky", on: false, w: 2, h: 2 },
                x: at.x,
                y: at.y + dy,
                size,
                z: 42,
            }),
        );
    }
}

function frame(s: DollState, rest = false): Frame {
    const sprites: Sprite[] = [],
        marks: Mark[] = [],
        lights: Light[] = [];
    // decorating, the plot fades so the rooms stand out
    const plot = s.mode === "decorate" ? 0.5 : 1;
    sprites.push(...ground("ground", 0, WORLD.w, GROUND, 1).map((g) => ({ ...g, alpha: plot })));
    // a tree and a bush every so often along the whole lawn, so a long house still stands in a garden
    for (let x = 4.4; x < WORLD.w; x += 26)
        if (Math.abs(x - (PLOT.x0 + PLOT.cols / 2)) > 16)
            sprites.push({
                key: `tree:${x}`,
                art: "tree",
                params: { fruit: 3, fallen: 0, item: "apple" },
                x,
                y: GROUND,
                stand: true,
                size: 3.4,
                z: 0.5,
                still: true,
                alpha: plot,
            });
    sprites.push(
        {
            key: "bush",
            art: "parkbush",
            x: SIDE + 42.5,
            y: GROUND,
            stand: true,
            size: 2.4,
            z: 1.5,
            still: true,
            alpha: plot,
        },
        {
            key: "tree",
            art: "tree",
            params: { fruit: 3, fallen: 0, item: "apple" },
            x: SIDE + 4.4,
            y: GROUND,
            stand: true,
            size: 3.4,
            z: 0.5,
            still: true,
            alpha: plot,
        },
    );
    houseSprites(s, rest, sprites, marks, lights);
    // the people
    for (const [i, f] of s.folk.entries()) {
        const held = s.hand?.what === "folk" && s.hand.i === i;
        const at = held && s.hand ? { x: s.hand.at.x, y: s.hand.at.y + 1 } : f.at;
        sprites.push(...folkSprite(f, i, { x: at.x, y: at.y - ROOM_FLOOR }, rest, held ? 31 : 4));
        if (s.chosen === i) marks.push({ kind: "ring", x: at.x, y: at.y - 1.2, r: 1.2, on: true });
    }
    handSprites(s, sprites, marks);
    // the keys' highlight on something in the house
    const t = targets(s)[s.sel];
    if (s.keyed && t && !isFixed(t) && !s.hand) {
        const p = keyPoint(s, t);
        marks.push({
            kind: "ring",
            x: p.x,
            y: p.y,
            r: t.k === "folk" ? 1.3 : 1.6,
            on: true,
            solid: true,
        });
    }
    fixedSprites(s, rest, sprites, marks);
    const lens = inWorld(rest ? (s.free ?? lensFor(s)) : s.lens);
    const zoomed = s.zoom === null ? undefined : s.rooms.find((o) => o.id === s.zoom);
    const zb = zoomed ? boxOf(PLOT, zoomed) : null;
    return {
        sprites,
        marks,
        camera: { x: lens.x, y: lens.y, zoom: lens.k },
        view: { w: W, h: H },
        world: { ...WORLD },
        focus: s.hand
            ? { x: s.hand.at.x, y: s.hand.at.y }
            : zb
              ? { x: zb.x + zb.w / 2, y: zb.y + zb.h / 2 }
              : { x: PLOT.x0 + PLOT.cols / 2, y: PLOT.ground - 4 },
        lights,
        time: rest ? 0 : s.steps * DT,
    };
}

function describe(s: DollState): string {
    const zoomed = s.zoom === null ? undefined : s.rooms.find((o) => o.id === s.zoom);
    const parts = [
        `${askWords(s.L.ask)}. ${left(s)} coins left. ${
            s.mode === "build"
                ? "Building."
                : zoomed
                  ? `Decorating the ${lookOf(zoomed.kind).name.toLowerCase()}.`
                  : "Decorating."
        }`,
    ];
    if (!s.rooms.length) parts.push("The shell is empty.");
    else
        parts.push(
            s.rooms
                .map((r) => {
                    const inside = s.things
                        .filter((t) => t.room === r.id)
                        .map((t) => nounOf(t.kind));
                    return `${lookOf(r.kind).name}, ${areaOf(PLOT, r)} squares, on the ${["ground", "first", "second"][r.floor] ?? "top"} floor${inside.length ? `, with ${inside.join(", ")}` : ""}.`;
                })
                .join(" "),
        );
    const h = s.hand;
    if (h?.what === "room")
        parts.push(`Holding a ${lookOf(h.kind).name.toLowerCase()} ${h.w} squares wide.`);
    if (h?.what === "thing") parts.push(`Holding a ${nounOf(h.kind)}.`);
    const t = targets(s)[s.sel];
    if (s.keyed && t && !h) parts.push(`Highlighted: ${targetWords(s, t)}.`);
    return parts.join(" ");
}

function targetWords(s: DollState, t: Target): string {
    if (t.k === "tray")
        return `the ${lookOf(t.kind).name.toLowerCase()} card, ${roomPrice(lookOf(t.kind).w)} coins`;
    if (t.k === "tab") return `the ${TAB_NAME[t.tab]} tab`;
    if (t.k === "chip") {
        const item = SHOP_ITEMS[t.item];
        if (!item) return "a chip";
        return item.what === "paper"
            ? `${item.paper} wallpaper, ${PAPER_PRICE} coins`
            : `a ${nounOf(item.kind)}, ${PRICE[item.kind]} coins`;
    }
    if (t.k === "mode") return t.mode === "build" ? "Build" : "Decorate";
    if (t.k === "back") return "back to the whole house";
    if (t.k === "room" || t.k === "handle") {
        const r = s.rooms.find((o) => o.id === t.id);
        return r ? `the ${lookOf(r.kind).name.toLowerCase()}` : "a room";
    }
    if (t.k === "thing") {
        const th = s.things.find((o) => o.id === t.id);
        return th ? `the ${nounOf(th.kind)}` : "a piece";
    }
    const f = s.folk[t.i];
    return f ? nameOf(f.who) : "someone";
}

/** A place thunk, a click as a room or a piece snaps somewhere new, a coin's ring, and a soft swish as the mode or the view changes. */
const HOUSE: Kit = {
    place: [
        { wave: "sine", hz: 180, to: 110, attack: 0.004, decay: 0.12, gain: 0.5 },
        { wave: "noise", hz: 500, attack: 0.004, decay: 0.05, gain: 0.18 },
    ],
    lift: [{ wave: "sine", hz: 420, to: 640, attack: 0.01, decay: 0.12, gain: 0.25 }],
    level: [
        { wave: "square", hz: 1200, attack: 0.002, decay: 0.03, gain: 0.12 },
        { wave: "sine", hz: 880, to: 1320, attack: 0.01, decay: 0.18, gain: 0.22, delay: 0.05 },
    ],
    ring: [{ wave: "triangle", hz: 1760, attack: 0.002, decay: 0.25, gain: 0.25 }],
    bump: [{ wave: "noise", hz: 900, attack: 0.002, decay: 0.03, gain: 0.25 }],
    creak: [
        { wave: "noise", hz: 1400, attack: 0.02, decay: 0.18, gain: 0.1 },
        { wave: "triangle", hz: 520, to: 780, attack: 0.01, decay: 0.16, gain: 0.14 },
    ],
};

function hum(s: DollState): Hum[] {
    return s.things.some((t) => t.kind === "bath" && t.on) ? [{ kind: "water", level: 0.25 }] : [];
}

/** What a design keeps between visits: the rooms, the furniture and the coins spent. */
interface Design {
    rooms: DollRoom[];
    things: DollThing[];
    spent: number;
    cast: number;
    next: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const oneOf = <T extends string>(of: readonly T[], v: unknown): v is T => of.some((x) => x === v);
const MARKER_LIST = ["sky", "mint", "berry", "tang", "glow"] as const;

/** A kept room read back; anything it does not know, such as how it last settled, is left behind. */
function readRoom(v: unknown): DollRoom | null {
    if (!isRecord(v)) return null;
    const { id, kind, col, floor, w, paper, tone, floorKind, window } = v;
    if (!isInt(id) || !oneOf(ROOM_KINDS, kind) || !isInt(col) || !isInt(floor) || !isInt(w))
        return null;
    if (!oneOf(SWATCHES, paper) || !oneOf(MARKER_LIST, tone)) return null;
    if (!oneOf(["boards", "tiles", "carpet"] as const, floorKind) || typeof window !== "boolean")
        return null;
    return {
        id,
        kind,
        col,
        floor,
        w,
        ...(kind === "stairs" ? { climbs: true as const } : {}),
        paper,
        tone,
        floorKind,
        window,
        born: -9999,
    };
}

function readThing(v: unknown): DollThing | null {
    if (!isRecord(v)) return null;
    const { id, room, x, kind, tone, flip, on } = v;
    if (!isInt(id) || !isInt(room) || typeof x !== "number" || !oneOf(FURNITURE, kind)) return null;
    if (!oneOf(MARKER_LIST, tone) || typeof flip !== "boolean" || typeof on !== "boolean")
        return null;
    return {
        id,
        room,
        x,
        w: sizeOf(kind).w,
        layer: LAYER[kind],
        kind,
        tone,
        flip,
        on,
        born: -9999,
    };
}

/** A kept design read back, or null when it is not one this house can stand. */
export function readDesign(v: unknown): Design | null {
    if (!isRecord(v)) return null;
    const { rooms, things, spent, cast, next } = v;
    if (
        !Array.isArray(rooms) ||
        !Array.isArray(things) ||
        !isInt(spent) ||
        !isInt(cast) ||
        !isInt(next)
    )
        return null;
    const rs = rooms.map(readRoom),
        ts = things.map(readThing);
    const goodRooms = rs.filter((r): r is DollRoom => r !== null),
        goodThings = ts.filter((t): t is DollThing => t !== null);
    if (goodRooms.length !== rs.length || goodThings.length !== ts.length) return null;
    for (const r of goodRooms) if (!canStand(PLOT, goodRooms, r, r.id)) return null;
    for (const t of goodThings)
        if (!thingFits(goodRooms, goodThings, t.room, t.x, t.w, t.layer, t.id)) return null;
    if (cast < 0 || cast >= CASTS.length) return null;
    return { rooms: goodRooms, things: goodThings, spent, cast, next };
}

export const dollhouseGame: ActionGame<DollState> = {
    id: "dollhouse",
    title: "Charlie's dollhouse",
    group: "action",
    // the house, the switch and the drawer fill a wide field and play by dragging between them, which a small card crops
    card: null,
    portrait: { hint: true },
    quiet: true,
    touch: true,
    intents: true,
    pans: true,
    saves: { level: 0 },
    levels: DOLL_LEVELS,
    rate: RATE,
    sounds: HOUSE,
    hum,
    cover: { art: "dollhouse", params: { charlie: true } },
    hint: "Build: drag a room up from the drawer into a dashed slot. Decorate: tap a room to look inside, then drag furniture in. With the keys: arrows move, Enter takes and puts down, B builds, D decorates, Z looks into a room and out again, Delete removes, R turns a piece, = and - widen or narrow a room, C changes who lives here",
    controls: {
        arrows: { left: "Back", right: "Next", up: "Up", down: "Down" },
        go: "Take or put down",
        brake: "Remove",
        icons: { go: "grab", brake: "close" },
    },
    commands: [
        { id: "flip", label: "Turn round", key: "r", keysOnly: true },
        { id: "wider", label: "Wider", key: "=", keysOnly: true },
        { id: "narrower", label: "Narrower", key: "-", keysOnly: true },
        { id: "remove", label: "Remove", key: "delete", keysOnly: true },
        { id: "build", label: "Build", key: "b", keysOnly: true },
        { id: "decorate", label: "Decorate", key: "d", keysOnly: true },
        { id: "zoom", label: "Look inside", key: "z", keysOnly: true },
        { id: "panleft", label: "Look left", key: "[", keysOnly: true },
        { id: "panright", label: "Look right", key: "]", keysOnly: true },
        { id: "fit", label: "Show the whole house", key: "f", icon: "locate" },
        { id: "who", label: "Who lives here", key: "c", icon: "who" },
        { id: "new", label: "New house", key: "n", icon: "add" },
    ],
    command: (s, id) => {
        if (id === "remove") {
            const out: Happening[] = [];
            remove(s, targets(s)[s.sel], out);
            return;
        }
        command(s, id);
    },
    checkpoint: (s): Design => ({
        rooms: structuredClone(s.rooms),
        things: structuredClone(s.things),
        spent: s.spent,
        cast: s.cast,
        next: s.next,
    }),
    restore: (s, value) => {
        const d = readDesign(value);
        if (!d) return false;
        s.rooms = d.rooms;
        s.things = d.things;
        s.spent = d.spent;
        s.next = Math.max(
            d.next,
            ...d.rooms.map((r) => r.id + 1),
            ...d.things.map((t) => t.id + 1),
        );
        s.cast = d.cast;
        s.zoom = null;
        s.lens = lensFor(s);
        s.folk = (CASTS[d.cast] ?? []).map((who, i) => folkOf(s, who, i));
        s.finished = d.rooms.map((r) => r.id);
        return true;
    },
    start,
    step,
    frame,
    say: describe,
    note: (s) => (s.steps - s.saidAt < RATE * 6 && s.said ? s.said : s.won ? "" : s.L.goal),
    won: (s) => s.won,
    back,
    cancelInput: (s) => {
        s.down = null;
        if (s.hand && s.hand.what !== "stretch") {
            const out: Happening[] = [];
            const h = s.hand;
            if ((h.what === "room" || h.what === "thing") && h.was) {
                // a lifted room or piece goes back where it came from
                if (h.what === "room") h.spot = h.from;
                else h.place = h.from;
                h.at = { x: -99, y: -99 };
                h.view = { x: -99, y: -99 };
                drop(s, out);
            } else s.hand = null;
        } else s.hand = null;
    },
    tuning: DOLL,
    still: {
        press: () => 1,
        settling: (s) =>
            s.folk.some((f) => f.way.length > 0) ||
            s.slide < 1 ||
            Math.abs(s.lens.k - lensFor(s).k) > 1e-3,
    },
};
