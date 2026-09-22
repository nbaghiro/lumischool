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
            when: ["skill:reasoning.number-walls", "skill:algebra"],
            says: "Find the missing stone in the wall.",
        },
        { art: "clock-tower", when: ["skill:time"], says: "The city clock says quarter past." },
        {
            art: "market-stall",
            when: ["skill:money.decimals", "skill:area"],
            says: "Prices in the old market.",
        },
        { art: "library", when: ["skill:reading"], says: "Every book has its place here." },
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
        story: "The end of the far shore: a city inside walls, older than the canal town and the observatory, with a library at its heart that has been shut all term and holds the next map.",
        moment: {
            art: "library",
            says: "The library opens on a new map.",
            params: { columns: 6, open: 1 },
        },
        secret: { art: "cat", says: "A cat asleep in the library window." },
        by: "road",
        rare: { art: "balloon", way: "sky", from: "left" },
    },
    site: {
        kind: "term",
        grade: 5,
        term: 3,
        land: { terrain: "walled-hill", near: ["star-cliffs"] },
    },
    needs: "A fifth year of lessons, and for this term: early algebra, the area and volume of buildings, reading longer texts, and the history of a city.",
};
