// The old city: the last world of a fifth year, at the far end of the far shore. A city inside walls
// on a hot golden afternoon, sandstone flags and cypresses, a mosaic path, and a library at its heart
// whose doors open at the end on the next map.
import type { World } from "./types";

export const walledCity: World = {
    id: "walled-city",
    name: "The old city",
    about: "A city inside walls at the far end of the far shore, on a hot golden afternoon: sandstone streets, cypress trees, a mosaic path, and a library at its heart whose doors open on the next map. The last world of a fifth year.",
    mood: "a hot golden afternoon",
    arrive: "This is the old city. Come in.",
    light: { ground: "glow", sky: "glow", low: "tang", accent: "berry", wash: 0.78 },
    ground: "sandstone",
    path: "mosaic",
    horizon: {
        far: [
            { art: "city-walls", at: 0.18, k: 0.95, params: { towers: 2, open: 0 } },
            { art: "library", at: 0.52, k: 1.1 },
            { art: "ice-cliff", at: 0.7, k: 0.32, params: { height: 1, floes: 0 } },
            { art: "city-walls", at: 0.86, k: 0.9, params: { towers: 3, open: 0 } },
        ],
        sky: [{ art: "sun", at: 0.88, down: 0.1 }],
        gate: "city-walls",
    },
    landmarks: ["temple", "market-stall", "clock-tower", "chest", "lantern"],
    creatures: ["birds", "cat", "dog"],
    weather: "clear",
    seasons: ["spring", "summer"],
    guide: "hand",
    reaches: [
        {
            art: "temple",
            when: ["skill:reasoning.number-walls", "skill:algebra", "skill:area"],
            says: "Find the missing stone, and the floor's area.",
        },
        {
            art: "chest",
            when: ["skill:fractions"],
            says: "A half and a third of the coins.",
        },
        {
            art: "clock-tower",
            when: ["skill:time"],
            says: "How long between the city clock's bells?",
        },
        {
            art: "market-stall",
            when: ["skill:money.decimals"],
            says: "Prices in the old market.",
        },
        {
            art: "library",
            when: ["skill:reading", "skill:writing", "skill:coding"],
            says: "Every book has its place here.",
        },
        {
            art: "lantern",
            when: ["skill:physics.circuits"],
            says: "Close the switch and the lantern lights.",
        },
        {
            art: "temple",
            when: ["skill:chemistry.rocks", "skill:chemistry.materials"],
            says: "Stone, brick and mortar hold the temple up.",
        },
        {
            art: "clock-tower",
            when: ["skill:art.proportion"],
            says: "How many doors tall is the tower?",
        },
        {
            art: "temple",
            when: ["skill:art"],
            says: "Patterns are carved round the temple door.",
        },
        {
            art: "temple",
            when: ["skill:chemistry.changes"],
            says: "Wet mortar sets hard and cannot go back.",
        },
        {
            art: "clock-tower",
            when: ["skill:music"],
            says: "The city's bells ring a tune each hour.",
        },
        {
            art: "cat",
            when: ["skill:nature"],
            says: "The cat leaps up onto the city wall.",
        },
    ],
    offers: {
        landmarks: ["temple", "market-stall", "clock-tower", "chest", "lantern", "library"],
        creatures: ["birds", "cat", "dog", "gull"],
        grounds: ["glow", "tang"],
        guides: ["hand", "stub", "glow"],
        weather: ["clear", "breezy", "cloudy"],
    },
    wants: [
        {
            what: "A fountain in the square",
            why: "A circle in the middle of the city to measure round and across, and water to fill it with, which the fifth year's area and volume could use.",
        },
        {
            what: "Storks nesting on the towers",
            why: "The city's own birds, a nest on top of each tower, which a child would look for from the walls and count from tower to tower.",
        },
    ],
    map: {
        spots: [
            {
                art: "library",
                x: 0,
                y: -180,
                k: 0.8,
                is: "moment",
                params: { columns: 6, open: 0 },
            },
            { art: "city-walls", x: 0, y: 140, k: 1.3, is: "gate", params: { towers: 3, open: 1 } },
            { art: "clock-tower", x: 470, y: -60, k: 0.7 },
            { art: "temple", x: -500, y: 400, k: 0.7 },
            { art: "market-stall", x: 360, y: 430, k: 0.7 },
            { art: "cat", x: 660, y: 440, k: 0.55, is: "secret" },
        ],
        stamp: { x: -640, y: -400 },
    },
    chapter: {
        story: "The end of the far shore: a city inside walls, older than the canal town and the observatory, with a library at its heart that has been shut all term and holds the next map, of the far north, whose ice cliff can be seen from the walls.",
        moment: {
            art: "library",
            says: "The library opens on a new map.",
            params: { columns: 6, open: 1 },
        },
        secret: { art: "cat", says: "A cat asleep in the library window." },
        glimpse: { world: "midnight-sun", art: "ice-cliff" },
        by: "road",
        rare: { art: "balloon", way: "sky", from: "left" },
    },
    site: {
        kind: "term",
        grade: 5,
        term: 3,
        land: { terrain: "walled-hill", near: ["star-cliffs"] },
    },
};
