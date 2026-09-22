// The harbour: sand, water at the edges and a boardwalk to walk along. It is the world furthest
// from the meadow in everything but the pen, so moving from one to the other is arriving somewhere:
// the ground turns from grass to sand and water, the path from a worn track to planks, the light
// from green to blue and orange, and a different guide lives here.
//
// It was the world that showed what the shelf was missing, and the gull, the crab and the lighthouse
// it asked for are drawn now; the lighthouse is where you arrive.
import type { World } from "./types";

export const harbour: World = {
    id: "harbour",
    name: "The harbour",
    about: "Sand, water, a boardwalk and boats on the horizon, with a lighthouse to arrive at, a seal on the rocks and a market stall on the quay. Breezy by default, so the kite is up.",
    mood: "a breezy afternoon",
    arrive: "This is the harbour. Boats come in here.",
    light: { ground: "tang", sky: "sky", accent: "sky", wash: 0.8 },
    ground: "shore",
    path: "boardwalk",
    horizon: {
        far: [
            { art: "boat", at: 0.2, k: 0.62, sink: 22 },
            { art: "boat", at: 0.68, k: 1.35, sink: 48, flip: true },
            { art: "island", at: 0.86, k: 0.62, sink: 14 },
        ],
        sky: [{ art: "sun", at: 0.86, down: 0.1 }],
        gate: "lighthouse",
    },
    landmarks: ["sandcastle", "market-stall", "kite", "boat", "bunting", "fish-tank"],
    creatures: ["gull", "crab", "duck", "seal"],
    weather: "breezy",
    seasons: ["autumn", "winter"],
    guide: "bird",
    reaches: [
        {
            art: "market-stall",
            when: ["skill:money", "art:pricetag", "art:purse"],
            says: "Prices like these at the stall.",
        },
        {
            art: "crab",
            when: ["skill:multiplication.equal-groups"],
            says: "Count the crab's legs and claws.",
        },
        { art: "boat", when: ["skill:fractions"], says: "The sail is cut into two halves." },
        {
            art: "crab",
            when: ["skill:nature.minibeasts"],
            says: "A crab has eight legs and two claws.",
        },
        { art: "kite", when: ["skill:nature.seasons"], says: "Kites fly best in the autumn wind." },
        {
            art: "lighthouse",
            when: ["skill:measure.length", "skill:measure.mass"],
            says: "How tall is the lighthouse?",
        },
        {
            art: "sandcastle",
            when: ["skill:chemistry.materials"],
            says: "Wet sand holds its shape. Dry sand pours.",
        },
        { art: "gull", when: ["skill:coding"], says: "Lead the gull to its fish." },
        { art: "gull", when: ["skill:music"], says: "The gulls call high and low." },
        { art: "duck", when: ["skill:reading.rhyme"], says: "Duck and truck. Do they rhyme?" },
        { art: "shop-front", when: ["skill:reading"], says: "Read the sign over the shop door." },
        {
            art: "shop-front",
            when: ["skill:writing"],
            says: "The shop's sign starts with a capital.",
        },
        { art: "crab", when: ["skill:art.looking"], says: "Look closely at the crab, then draw." },
        {
            art: "gull",
            when: ["skill:physics.sound"],
            says: "The gull's cry carries over the water.",
        },
        {
            art: "lighthouse",
            when: ["skill:physics.light"],
            says: "The lighthouse beam reaches far out to sea.",
        },
    ],
    offers: {
        landmarks: [
            "sandcastle",
            "market-stall",
            "lighthouse",
            "kite",
            "boat",
            "bunting",
            "shop-front",
            "fish-tank",
            "bicycle",
        ],
        creatures: ["gull", "crab", "duck", "cat", "birds", "seal"],
        grounds: ["tang", "glow", "sky"],
        guides: ["bird", "glow", "firefly", "dot"],
        weather: ["clear", "cloudy", "breezy", "rain"],
    },
    wants: [
        {
            what: "A quay wall with a ladder",
            why: "An edge between the sand and the deep water, so the boardwalk has something to run beside.",
        },
        {
            what: "Lobster pots and nets on the quay",
            why: "Pots stacked in rows would be an array a child walks past, and a net laid out is squares to count.",
        },
    ],
    map: {
        spots: [
            { art: "jetty", x: -60, y: -250, k: 1.05 },
            { art: "boat", x: -330, y: -330, k: 0.85, is: "life" },
            { art: "boat", x: 170, y: -470, k: 0.5, flip: true },
            { art: "lighthouse", x: 540, y: 20, k: 1.25, is: "gate" },
            { art: "market-stall", x: -430, y: 300, k: 1 },
            { art: "sandcastle", x: 110, y: 340, k: 0.75 },
            { art: "bunting", x: -130, y: 120, k: 0.95 },
            { art: "kite", x: 60, y: -640, k: 0.6 },
            { art: "gull-flying", x: -620, y: -560, k: 0.8 },
            { art: "cat", x: -660, y: 440, k: 0.65, is: "secret" },
            { art: "seal", x: 650, y: 270, k: 0.6 },
        ],
        decor: "beach",
        stamp: { x: -660, y: -120 },
    },
    chapter: {
        story: "The first sight of the sea: boats, a market stall, gulls and a crab, and a lighthouse that stays dark until the end of term. Out past the boats, on the edge of the sky, is an island with smoke coming off it.",
        moment: {
            art: "lighthouse",
            says: "The lighthouse is lit.",
            params: { stripes: 3, beam: 1 },
            before: { stripes: 3, beam: 0 },
        },
        secret: { art: "cat", says: "The harbour cat, fast asleep." },
        glimpse: { world: "volcano-island", art: "island" },
        by: "road",
        rare: { art: "ship", way: "horizon", k: 0.32 },
    },
};
