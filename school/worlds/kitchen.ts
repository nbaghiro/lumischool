// The kitchen: the middle of the second year, in winter, and the first world indoors. The sky is a
// warm wall with a window on it showing the snow, the horizon is the top of the cupboards with the
// jug and the cake standing on it, the ground is a tiled floor and the path is a rug. It is the world
// with the most lessons to reach into, because this term is fractions, sharing and equal groups, and
// a kitchen is where a child has already met all three.
import type { World } from "./types";

export const kitchen: World = {
    id: "kitchen",
    name: "The kitchen",
    about: "A tiled floor, cupboards along the wall and snow at the window. The table is laid, buns are in the oven, and there is a mouse behind the jar.",
    mood: "a warm kitchen in the snow",
    arrive: "This is the kitchen. Something smells good.",
    light: { ground: "sky", sky: "glow", accent: "tang", wash: 0.8 },
    indoor: true,
    ground: "tiles",
    path: "rug",
    horizon: {
        far: [
            { art: "jug", at: 0.1 },
            { art: "window", at: 0.58, sink: -170 },
            { art: "mixing-bowl", at: 0.36 },
            { art: "cake", at: 0.86 },
        ],
        gate: "kitchen-counter",
    },
    landmarks: ["birthday-table", "baking-tray", "pizza", "oven", "cup", "plates"],
    creatures: ["cat", "mouse"],
    weather: "snow",
    seasons: ["winter"],
    guide: "dot",
    reaches: [
        {
            art: "pizza",
            when: ["art:pizza", "skill:fractions"],
            says: "Cut the pizza into equal parts.",
        },
        {
            art: "plates",
            when: ["skill:division.sharing", "art:plate"],
            says: "Share the biscuits out fairly.",
        },
        {
            art: "baking-tray",
            when: ["art:bakingtray", "skill:multiplication"],
            says: "Rows of buns, all the same.",
        },
        {
            art: "kitchen-counter",
            when: ["skill:length", "skill:measure.metric"],
            says: "How long is the counter in centimetres?",
        },
        {
            art: "cup",
            when: ["skill:chemistry.states", "art:particles"],
            says: "Steam from a hot drink is a gas.",
        },
        {
            art: "mixing-bowl",
            when: ["skill:chemistry.dissolving", "skill:chemistry.mixtures"],
            says: "Stir in sugar. Where did it go?",
        },
        {
            art: "plates",
            when: ["skill:art.symmetry"],
            says: "Both halves of the plate's pattern match.",
        },
        { art: "oven", when: ["skill:coding"], says: "Heat, wait, then take the buns out." },
        { art: "cup", when: ["skill:music"], says: "Tap the mugs with a spoon: high, low." },
        {
            art: "baking-tray",
            when: ["skill:physics.motion"],
            says: "Roll a pea down the tilted tray.",
        },
        { art: "cake", when: ["skill:reading.compound-words"], says: "Cup and cake make cupcake." },
        {
            art: "birthday-table",
            when: ["skill:reading"],
            says: "Read the card on the birthday table.",
        },
        {
            art: "mouse",
            when: ["skill:writing.describing", "skill:writing.word-classes"],
            says: "The mouse is small, grey and quick.",
        },
        { art: "shelf", when: ["skill:writing"], says: "Write a label for each jar." },
        {
            art: "shelf",
            when: ["skill:nature.plants", "skill:nature.leaves"],
            says: "Carrots are roots and lettuce is leaves.",
        },
    ],
    offers: {
        landmarks: [
            "birthday-table",
            "baking-tray",
            "pizza",
            "scales",
            "cup",
            "plates",
            "jug",
            "mixing-bowl",
            "cake",
            "shelf",
            "oven",
            "kitchen-counter",
        ],
        creatures: ["cat", "mouse", "dog"],
        grounds: ["sky", "berry", "mint"],
        guides: ["dot", "stub", "snail", "firefly"],
        weather: ["clear", "snow", "rain"],
    },
    wants: [
        {
            what: "A dresser with plates on its shelves",
            why: "Plates in rows on a dresser are an array a child walks past every day, and the kitchen's horizon would stop being cupboards only.",
        },
        {
            what: "A kettle on the hob",
            why: "Steam from a kettle is the kitchen's own picture for water turning to a gas, which a mug of cocoa only hints at.",
        },
    ],
    map: {
        spots: [
            { art: "snowy-firs", x: -560, y: 200, k: 0.75 },
            { art: "snowy-firs", x: 580, y: 120, k: 0.6, flip: true },
            { art: "cottage", x: 0, y: 330, k: 2.3, is: "gate" },
            { art: "cake", x: 470, y: 430, k: 0.9, is: "moment" },
            { art: "mouse", x: -650, y: 440, k: 0.8, is: "secret" },
            { art: "pizza", x: -400, y: 440, k: 0.55 },
            { art: "mixing-bowl", x: 250, y: 470, k: 0.5 },
        ],
        stamp: { x: -520, y: -300 },
    },
    chapter: {
        story: "Winter indoors, with snow at the window: a counter to bake at, pizza and plates to share out fairly, and a cake that has been in the oven all term.",
        moment: {
            art: "cake",
            says: "The cake is out of the oven.",
            params: { candles: 5, slices: 0 },
        },
        secret: { art: "mouse", says: "A mouse after the crumbs." },
        by: "path",
        rare: { art: "robin", way: "appear", on: { far: 1, up: 0.13 }, k: 2 },
    },
};
