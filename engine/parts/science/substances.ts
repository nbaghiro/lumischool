// The tables the chemistry drawings are drawn from and src/chemistry/prove.ts marks by, so a picture
// and its answer key cannot disagree: what things are made of and what they are like, what a change
// does and whether it can be undone, what a rock does under a drop, the steps of a fossil and the water
// cycle, what a mixture holds and how it comes apart, what the indicator's colours say, how fast ice
// melts and nails rust, the molecules a model kit builds, and the safety kit.
import { type Marker } from "../../paper";

/** What each spread is called, so the caption and the notation cannot drift apart. */
export const STATES = ["solid", "liquid", "gas"];

/** Every material a thing in `materials` can be made of. */
const MATERIALS = [
    "wood",
    "metal",
    "glass",
    "plastic",
    "fabric",
    "paper",
    "cardboard",
    "rubber",
    "rock",
    "brick",
] as const;

type Material = (typeof MATERIALS)[number];

/**
 * What a thing is like, asked of the thing and not of its material: a plastic bottle is see-through
 * and a plastic spoon is not. A property left out is one the table will not answer, because it
 * depends on the thing (whether a plastic spoon floats depends on the plastic), and the checker
 * refuses a question on it rather than guess.
 */
export const PROPERTIES = [
    "hard",
    "bendy",
    "see-through",
    "waterproof",
    "absorbent",
    "stretchy",
    "floats",
] as const;

export type Property = (typeof PROPERTIES)[number];

/**
 * The things `materials` draws, each drawn in the material it is made of, so "what is it made of"
 * has one answer: the spoon made of wood has a grain, the one made of metal a shine. See
 * .docs/chemistry.md, "Wrong facts fixed", for why the old word cards were arguable.
 */
export const OBJECTS: Record<
    string,
    { name: string; made: Material; is: Partial<Record<Property, boolean>> }
> = {
    "wooden-spoon": {
        name: "spoon",
        made: "wood",
        is: { hard: true, bendy: false, "see-through": false, stretchy: false, floats: true },
    },
    "metal-spoon": {
        name: "spoon",
        made: "metal",
        is: {
            hard: true,
            bendy: false,
            "see-through": false,
            waterproof: true,
            absorbent: false,
            stretchy: false,
            floats: false,
        },
    },
    "plastic-spoon": {
        name: "spoon",
        made: "plastic",
        is: { "see-through": false, waterproof: true, absorbent: false, stretchy: false },
    },
    "glass-jar": {
        name: "jar",
        made: "glass",
        is: {
            hard: true,
            bendy: false,
            "see-through": true,
            waterproof: true,
            absorbent: false,
            stretchy: false,
        },
    },
    "plastic-bottle": {
        name: "bottle",
        made: "plastic",
        is: {
            hard: false,
            bendy: true,
            "see-through": true,
            waterproof: true,
            absorbent: false,
            stretchy: false,
        },
    },
    "wool-sock": {
        name: "sock",
        made: "fabric",
        is: {
            hard: false,
            bendy: true,
            "see-through": false,
            waterproof: false,
            absorbent: true,
            stretchy: true,
        },
    },
    towel: {
        name: "towel",
        made: "fabric",
        is: { hard: false, bendy: true, "see-through": false, waterproof: false, absorbent: true },
    },
    "paper-bag": {
        name: "bag",
        made: "paper",
        is: {
            hard: false,
            bendy: true,
            "see-through": false,
            waterproof: false,
            absorbent: true,
            stretchy: false,
        },
    },
    "cardboard-box": {
        name: "box",
        made: "cardboard",
        is: { "see-through": false, waterproof: false, absorbent: true, stretchy: false },
    },
    "rubber-boot": {
        name: "boot",
        made: "rubber",
        is: { hard: false, bendy: true, "see-through": false, waterproof: true, absorbent: false },
    },
    "rubber-band": {
        name: "band",
        made: "rubber",
        is: {
            hard: false,
            bendy: true,
            "see-through": false,
            waterproof: true,
            absorbent: false,
            stretchy: true,
        },
    },
    brick: {
        name: "brick",
        made: "brick",
        is: { hard: true, bendy: false, "see-through": false, stretchy: false, floats: false },
    },
    pebble: {
        name: "pebble",
        made: "rock",
        is: { hard: true, bendy: false, "see-through": false, stretchy: false, floats: false },
    },
    "metal-key": {
        name: "key",
        made: "metal",
        is: {
            hard: true,
            bendy: false,
            "see-through": false,
            waterproof: true,
            absorbent: false,
            stretchy: false,
            floats: false,
        },
    },
    "wooden-block": {
        name: "block",
        made: "wood",
        is: { hard: true, bendy: false, "see-through": false, stretchy: false, floats: true },
    },
    raincoat: {
        name: "raincoat",
        made: "plastic",
        is: { hard: false, bendy: true, "see-through": false, waterproof: true, absorbent: false },
    },
    "metal-can": {
        name: "can",
        made: "metal",
        is: {
            hard: true,
            "see-through": false,
            waterproof: true,
            absorbent: false,
            stretchy: false,
        },
    },
    "glass-bottle": {
        name: "bottle",
        made: "glass",
        is: {
            hard: true,
            bendy: false,
            "see-through": true,
            waterproof: true,
            absorbent: false,
            stretchy: false,
        },
    },
    "wooden-ruler": {
        name: "ruler",
        made: "wood",
        is: { hard: true, "see-through": false, stretchy: false, floats: true },
    },
    "wool-hat": {
        name: "hat",
        made: "fabric",
        is: {
            hard: false,
            bendy: true,
            "see-through": false,
            waterproof: false,
            absorbent: true,
            stretchy: true,
        },
    },
    "paper-book": {
        name: "book",
        made: "paper",
        is: { "see-through": false, waterproof: false, absorbent: true, stretchy: false },
    },
};

/** What happens to a thing when it is pushed out of shape and let go: it springs back, or it stays. */
export const SHAPES: Record<
    string,
    { name: string; actions: Partial<Record<string, "back" | "stays">> }
> = {
    sponge: { name: "sponge", actions: { squash: "back" } },
    clay: { name: "modelling clay", actions: { squash: "stays" } },
    band: { name: "rubber band", actions: { stretch: "back" } },
    spring: { name: "spring", actions: { stretch: "back", squash: "back" } },
    pipecleaner: { name: "pipe cleaner", actions: { bend: "stays", twist: "stays" } },
    foil: { name: "foil", actions: { squash: "stays" } },
    ball: { name: "rubber ball", actions: { squash: "back" } },
};

/** Where the ice sits, and how much of a cube melts a minute there: none in the freezer, a quarter every ten minutes on the table, half in the sun. */
export const ICE_PLACES = [
    { name: "in the freezer", perMinute: 0 },
    { name: "on the table", perMinute: 1 / 40 },
    { name: "in the sun", perMinute: 1 / 20 },
] as const;

/** How much of the ice is still ice after that many minutes, in quarters from 4 (all of it) to 0. */
export const iceLeft = (minutes: number, place: number): number => {
    const rate = ICE_PLACES[Math.max(0, Math.min(2, Math.round(place)))]?.perMinute ?? 0;
    return Math.max(0, Math.round(4 * (1 - minutes * rate)));
};

/**
 * The changes `change` draws, what makes each happen, whether it can be undone, and whether it makes
 * a new material. The five that can be undone are the ones a child can reverse at home: freeze the
 * melted ice, melt the ice cube, let the chocolate set, cool the steam back to water, and dry the
 * sweet water in the sun until the sugar is left. Toast cannot be untoasted.
 */
export const CHANGES: Record<
    string,
    { before: string; after: string; by: string; undo: boolean; makes: boolean; back?: string }
> = {
    "melt-ice": {
        before: "ice",
        after: "water",
        by: "warm it",
        undo: true,
        makes: false,
        back: "cool it",
    },
    "freeze-water": {
        before: "water",
        after: "ice",
        by: "cool it",
        undo: true,
        makes: false,
        back: "warm it",
    },
    "melt-chocolate": {
        before: "chocolate",
        after: "runny chocolate",
        by: "warm it",
        undo: true,
        makes: false,
        back: "cool it",
    },
    "boil-water": {
        before: "water",
        after: "steam",
        by: "heat it",
        undo: true,
        makes: false,
        back: "cool it",
    },
    "dissolve-sugar": {
        before: "sugar and water",
        after: "sweet water",
        by: "stir it",
        undo: true,
        makes: false,
        back: "let the water dry up",
    },
    "toast-bread": { before: "bread", after: "toast", by: "heat it", undo: false, makes: true },
    "cook-egg": { before: "raw egg", after: "fried egg", by: "heat it", undo: false, makes: true },
    "bake-cake": { before: "cake mix", after: "cake", by: "bake it", undo: false, makes: true },
    "burn-candle": {
        before: "new candle",
        after: "burnt candle",
        by: "light it",
        undo: false,
        makes: true,
    },
    "rust-nail": {
        before: "new nail",
        after: "rusty nail",
        by: "leave it wet",
        undo: false,
        makes: true,
    },
    fizz: { before: "vinegar and soda", after: "fizz", by: "mix them", undo: false, makes: true },
    "rise-dough": {
        before: "dough",
        after: "risen dough",
        by: "leave it warm",
        undo: false,
        makes: true,
    },
};

/**
 * The rocks `rocks` draws and what a test shows about each: whether a drop of water soaks in,
 * whether a drop of vinegar fizzes (chalk, limestone and marble are all calcium carbonate), whether
 * it floats, and whether a fingernail scratches it. A property left out depends on the sample, and
 * the checker will not ask it.
 */
export const ROCKS: Record<
    string,
    {
        name: string;
        kind: "igneous" | "sedimentary" | "metamorphic";
        is: Partial<Record<"soaks" | "fizzes" | "floats" | "soft", boolean>>;
    }
> = {
    granite: {
        name: "granite",
        kind: "igneous",
        is: { soaks: false, fizzes: false, floats: false, soft: false },
    },
    basalt: {
        name: "basalt",
        kind: "igneous",
        is: { soaks: false, fizzes: false, floats: false, soft: false },
    },
    pumice: { name: "pumice", kind: "igneous", is: { fizzes: false, floats: true, soft: false } },
    sandstone: {
        name: "sandstone",
        kind: "sedimentary",
        is: { soaks: true, fizzes: false, floats: false },
    },
    chalk: {
        name: "chalk",
        kind: "sedimentary",
        is: { soaks: true, fizzes: true, floats: false, soft: true },
    },
    limestone: {
        name: "limestone",
        kind: "sedimentary",
        is: { fizzes: true, floats: false, soft: false },
    },
    marble: {
        name: "marble",
        kind: "metamorphic",
        is: { soaks: false, fizzes: true, floats: false, soft: false },
    },
    slate: {
        name: "slate",
        kind: "metamorphic",
        is: { soaks: false, fizzes: false, floats: false, soft: false },
    },
};

/** The four steps of a fossil forming, in order, in the words a question's options use. */
export const FOSSIL_STEPS = [
    "It dies and sinks",
    "Mud covers it",
    "It turns to rock",
    "It is found",
] as const;

/** The four stages of the water cycle, as England's Year 4 names them and in plain words. */
export const CYCLE = [
    { name: "evaporation", plain: "water rises as vapour" },
    { name: "condensation", plain: "vapour cools into clouds" },
    { name: "precipitation", plain: "rain falls" },
    { name: "collection", plain: "water flows back" },
] as const;

/**
 * What a mixture can be made of, for the sieve and the mixture drawings and for the checker that says
 * which way separates it. `size` is how big a piece is (0 a powder, 1 a grain, 2 a small piece, 3 a
 * big one), and a sieve lets through what is smaller than its holes. Water is the one liquid.
 */
export const MIXABLES: Record<
    string,
    {
        name: string;
        size: number;
        dissolves: boolean;
        magnetic: boolean;
        floats: boolean;
        liquid?: boolean;
    }
> = {
    pebbles: { name: "pebbles", size: 3, dissolves: false, magnetic: false, floats: false },
    peas: { name: "dried peas", size: 3, dissolves: false, magnetic: false, floats: false },
    rice: { name: "rice", size: 2, dissolves: false, magnetic: false, floats: false },
    clips: { name: "paper clips", size: 2, dissolves: false, magnetic: true, floats: false },
    sand: { name: "sand", size: 1, dissolves: false, magnetic: false, floats: false },
    iron: { name: "iron filings", size: 1, dissolves: false, magnetic: true, floats: false },
    salt: { name: "salt", size: 1, dissolves: true, magnetic: false, floats: false },
    sugar: { name: "sugar", size: 1, dissolves: true, magnetic: false, floats: false },
    flour: { name: "flour", size: 0, dissolves: false, magnetic: false, floats: false },
    cork: { name: "cork", size: 2, dissolves: false, magnetic: false, floats: true },
    water: {
        name: "water",
        size: 0,
        dissolves: false,
        magnetic: false,
        floats: false,
        liquid: true,
    },
};

/** What goes through a sieve with holes of that size: anything smaller than the holes. */
export const passes = (thing: string, holes: number): boolean =>
    (MIXABLES[thing]?.size ?? 9) < holes;

/**
 * Red cabbage juice as an indicator: the colour it turns at each part of the pH scale, and what that
 * colour says. The colours are mixes from the paint box, so they are the same colours everywhere a
 * lesson shows them, and each is named the way `nameOf` names it. See .docs/chemistry.md, "The
 * indicator".
 */
export const INDICATOR = [
    { from: 1, to: 3, paint: "red", colour: "red" },
    { from: 4, to: 6, paint: "pink+sky", colour: "purple" },
    { from: 7, to: 8, paint: "blue+sky", colour: "blue" },
    { from: 9, to: 11, paint: "green", colour: "green" },
    { from: 12, to: 14, paint: "yellow", colour: "yellow" },
] as const;

type Band = (typeof INDICATOR)[number];

export const bandOf = (ph: number): Band =>
    INDICATOR.find((b) => ph >= b.from && ph < b.to + 1) ?? INDICATOR[2];

/**
 * What a colour says, read the only way the chart allows: a colour whose whole band is below 7 means
 * an acid and one wholly above 7 an alkali. Blue spans 7 and 8, so blue says only "not an acid", and
 * a question has to ask it that way; null is that refusal.
 */
export const kindOfBand = (b: Band): "acid" | "alkali" | null =>
    b.to < 7 ? "acid" : b.from > 7 ? "alkali" : null;

/**
 * The kitchen liquids the indicator is tried on, each with a typical pH from the sources in
 * .docs/chemistry.md. Washing soda is for a grown-up to handle.
 */
export const LIQUIDS: Record<string, { name: string; ph: number; look: Marker | "card" }> = {
    lemon: { name: "lemon juice", ph: 2, look: "glow" },
    vinegar: { name: "vinegar", ph: 2.5, look: "card" },
    milk: { name: "milk", ph: 6.5, look: "card" },
    water: { name: "water", ph: 7, look: "sky" },
    bakingsoda: { name: "baking soda", ph: 8.3, look: "card" },
    washingsoda: { name: "washing soda", ph: 11.4, look: "card" },
};

/** How rusty a nail in each jar is after that many days, from 0 to 1: water and air rust it, salt speeds it, and no air, no water or a coat of paint stops it. */
export const RUST: Record<string, { name: string; perDay: number }> = {
    water: { name: "water", perDay: 1 / 14 },
    salt: { name: "salty water", perDay: 1 / 7 },
    dry: { name: "dry air", perDay: 0 },
    oil: { name: "water under oil", perDay: 0 },
    painted: { name: "painted nail", perDay: 0 },
};

export const rustOf = (jar: string, days: number): number =>
    Math.min(1, Math.max(0, days) * (RUST[jar]?.perDay ?? 0));

/**
 * The molecules a grade four stretch meets, each as its atoms, where they sit (in squares from the
 * middle) and the sticks between them (a number of lines for each bond). Water is bent, which is the
 * truth and the reason it is drawn that way.
 */
export const MOLECULES: Record<
    string,
    { name: string; atoms: [string, number, number][]; bonds: [number, number, number][] }
> = {
    water: {
        name: "water",
        atoms: [
            ["O", 0, -0.3],
            ["H", -1.25, 0.55],
            ["H", 1.25, 0.55],
        ],
        bonds: [
            [0, 1, 1],
            [0, 2, 1],
        ],
    },
    oxygen: {
        name: "oxygen",
        atoms: [
            ["O", -0.9, 0],
            ["O", 0.9, 0],
        ],
        bonds: [[0, 1, 2]],
    },
    hydrogen: {
        name: "hydrogen",
        atoms: [
            ["H", -0.7, 0],
            ["H", 0.7, 0],
        ],
        bonds: [[0, 1, 1]],
    },
    nitrogen: {
        name: "nitrogen",
        atoms: [
            ["N", -0.9, 0],
            ["N", 0.9, 0],
        ],
        bonds: [[0, 1, 3]],
    },
    "carbon-dioxide": {
        name: "carbon dioxide",
        atoms: [
            ["O", -1.75, 0],
            ["C", 0, 0],
            ["O", 1.75, 0],
        ],
        bonds: [
            [0, 1, 2],
            [1, 2, 2],
        ],
    },
    methane: {
        name: "methane",
        atoms: [
            ["C", 0, 0],
            ["H", 0, -1.4],
            ["H", 1.4, 0],
            ["H", 0, 1.4],
            ["H", -1.4, 0],
        ],
        bonds: [
            [0, 1, 1],
            [0, 2, 1],
            [0, 3, 1],
            [0, 4, 1],
        ],
    },
};

/** How many atoms of each element are in one molecule. */
export const atomsIn = (kind: string): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [el0] of MOLECULES[kind]?.atoms ?? []) out[el0] = (out[el0] ?? 0) + 1;
    return out;
};

/** What each piece of kit keeps safe, in the words a question's options use. */
export const SAFETY: Record<string, { name: string; keeps: string }> = {
    goggles: { name: "goggles", keeps: "eyes" },
    apron: { name: "apron", keeps: "clothes" },
    glove: { name: "oven glove", keeps: "hands" },
    tray: { name: "tray", keeps: "table" },
};
