// The meadow: the first world of a year. Grass, a footpath worn through it, hills along the
// horizon and a garden gate to come in by. It is the world the shelf could already draw almost
// entirely, which is why it goes first: the nature and story categories and the garden cast are all
// at home here, and the rabbit it was missing is drawn now.
import type { World } from "./types";

export const meadow: World = {
    id: "meadow",
    name: "The meadow",
    about: "Long grass, a footpath, hills along the top and a garden to come in by, with a stile and a hedge at the edge of the field. The creatures are the ones a child meets in a garden.",
    mood: "a summer morning",
    arrive: "This is the meadow. The path starts here.",
    light: { ground: "mint", sky: "sky", accent: "glow", wash: 0.85 },
    ground: "meadow",
    path: "footpath",
    horizon: {
        far: [
            { art: "tree", at: 0.14, k: 0.95 },
            { art: "hills", at: 0.47, k: 1.05, flip: true },
            { art: "sheep", at: 0.82, k: 1.3 },
        ],
        sky: [{ art: "sun", at: 0.86, down: 0.1 }],
        gate: "garden",
    },
    landmarks: ["stile", "pond", "flowers", "sheep", "hedge", "wheelbarrow"],
    creatures: ["rabbit", "hedgehog", "hen", "minibeasts"],
    stamp: "hen",
    weather: "clear",
    seasons: ["summer", "autumn"],
    guide: "firefly",
    reaches: [
        {
            art: "tree",
            when: ["art:basket", "art:tree", "skill:addition.making-ten"],
            says: "Apples from the tree by the path.",
        },
        {
            art: "rabbit",
            when: ["skill:counting.in-twos", "skill:counting.in-steps"],
            says: "Two ears on every rabbit.",
        },
        {
            art: "hen",
            when: ["skill:bonds-to-10", "art:eggbox"],
            says: "The hen's eggs: how many make ten?",
        },
        {
            art: "sheep",
            when: ["skill:counting.to-twenty", "skill:place-value.tens-and-ones"],
            says: "Count the sheep in the field.",
        },
        {
            art: "minibeasts",
            when: ["art:minibeasts", "skill:subtraction"],
            says: "Some ladybirds fly off. How many stay?",
        },
        {
            art: "pond",
            when: ["skill:addition.to-twenty"],
            says: "More frogs hop onto the lily pads.",
        },
        {
            art: "wheelbarrow",
            when: ["skill:physics.forces", "skill:physics.weight"],
            says: "Push the barrow. Is it heavy?",
        },
        { art: "stile", when: ["skill:chemistry.materials"], says: "What is the stile made of?" },
        {
            art: "flowers",
            when: ["skill:art.colour-mixing", "skill:art.looking"],
            says: "Mix the colours of the flowers.",
        },
        { art: "bunting", when: ["skill:art.pattern"], says: "The flags on the bunting repeat." },
        {
            art: "hedgehog",
            when: ["skill:coding.sequences", "skill:coding.tracing"],
            says: "Lead the hedgehog home, step by step.",
        },
        { art: "birds", when: ["skill:music"], says: "Birds sing high, frogs croak low." },
        { art: "footpath-sign", when: ["skill:reading"], says: "Read the sign by the footpath." },
        {
            art: "footpath-sign",
            when: ["skill:writing"],
            says: "Letters on the sign sit on a line.",
        },
    ],
    offers: {
        landmarks: [
            "season-tree",
            "tree",
            "pond",
            "garden",
            "treehouse",
            "flowers",
            "sheep",
            "wheelbarrow",
            "bunting",
            "kite",
            "stile",
            "hedge",
            "footpath-sign",
        ],
        creatures: ["rabbit", "hedgehog", "hen", "duck", "cat", "owl", "minibeasts", "birds"],
        grounds: ["mint", "glow", "tang"],
        guides: ["firefly", "snail", "glow", "bird"],
        weather: ["clear", "cloudy", "breezy"],
    },
    wants: [
        {
            what: "A beehive at the edge of the field",
            why: "Bees coming and going from a hive would be counting a child could watch, and the minibeasts on the shelf stand still.",
        },
        {
            what: "A field gate that swings open",
            why: "The stile is a way over the fence. A gate the path goes through would give the meadow an arrival of its own rather than the garden's.",
        },
    ],
    map: {
        spots: [
            { art: "hills", x: 60, y: -40, k: 1.5, flip: true },
            { art: "tree", x: -470, y: 150, k: 1.05 },
            { art: "sheep", x: 440, y: 70, k: 0.9 },
            { art: "garden", x: -130, y: 400, k: 1.1, is: "gate" },
            { art: "flowers", x: 340, y: 390, k: 0.75 },
            {
                art: "kite",
                x: 250,
                y: 330,
                k: 0.7,
                is: "moment",
                after: { x: 330, y: -330, k: 1.15 },
            },
            { art: "wheelbarrow", x: -560, y: 420, k: 0.7 },
            { art: "pond", x: 580, y: 280, k: 0.55 },
            { art: "mouse", x: 650, y: 440, k: 0.8, is: "secret" },
            { art: "hedge", x: -150, y: 120, k: 0.75 },
            { art: "stile", x: -370, y: 300, k: 0.7 },
        ],
        stamp: { x: 640, y: -420 },
    },
    chapter: {
        story: "The start of the map. A footpath through long grass from the garden gate, with a rabbit, a pond and minibeasts, and the firefly lighting the way.",
        moment: { art: "kite", says: "The kite goes up over the meadow." },
        secret: { art: "mouse", says: "A mouse in the long grass." },
        by: "path",
        rare: { art: "paperplane", way: "sky", from: "left" },
    },
};
