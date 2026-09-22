// The observatory: the second world of a fifth year, a domed observatory on sea cliffs on the far
// shore under a polar night with the northern lights in it. The heath is marked by cairns, the land
// stops at a cliff edge with the sea below, and the dome stays shut until the moment it opens.
import type { World } from "./types";

export const starCliffs: World = {
    id: "star-cliffs",
    name: "The observatory",
    about: "A domed observatory on sea cliffs on the far shore, under a cold clear night with the northern lights in it: a heath marked by cairns, the cliff falling to the sea, and a dome that opens to the stars at the end of term. The second world of a fifth year.",
    mood: "a polar night on the cliffs",
    arrive: "This is the observatory. Look up.",
    light: { ground: "sky", sky: "sky", low: "mint", accent: "glow", wash: 0.8, deep: "polar" },
    ground: "heath",
    path: "cairns",
    horizon: {
        far: [
            { art: "peaks", at: 0.14, k: 0.45, params: { count: 3, snow: 1 } },
            { art: "city-walls", at: 0.36, k: 0.3, params: { towers: 3, open: 0 } },
            { art: "telescope", at: 0.58, k: 1 },
            { art: "lighthouse", at: 0.93, k: 0.36, sink: 300 },
        ],
        sky: [{ art: "moon", at: 0.82, down: 0.06, params: { phase: 0.3 } }],
        gate: "observatory",
    },
    landmarks: ["telescope", "planets", "compass", "signpost"],
    creatures: ["owl", "fox", "hares"],
    weather: "aurora",
    seasons: ["winter"],
    guide: "firefly",
    reaches: [
        {
            art: "compass",
            when: ["skill:angles", "skill:shapes.turns"],
            says: "Turn to face north.",
        },
        {
            art: "planets",
            when: ["skill:place-value"],
            says: "The planets are millions of miles away.",
        },
        {
            art: "telescope",
            when: ["skill:physics.light", "art:shadows"],
            says: "Starlight comes a long way.",
        },
        {
            art: "signpost",
            when: ["skill:position.coordinates"],
            says: "Plot the stars on the grid.",
        },
    ],
    offers: {
        landmarks: ["telescope", "planets", "compass", "signpost", "observatory", "lighthouse"],
        creatures: ["owl", "fox", "hares", "gull"],
        grounds: ["sky", "mint"],
        guides: ["firefly", "glow", "bird"],
        weather: ["aurora", "starry", "clear", "snow"],
    },
    wants: [
        {
            what: "Puffins on the cliff",
            why: "The cliffs' own birds in summer, standing in rows on the ledges, a row to count and something alive on the rock face in daylight.",
        },
        {
            what: "A star chart on an easel",
            why: "Where the lessons on plotting points meet the sky: the stars of one constellation on a grid, which the telescope's reach can only describe.",
        },
    ],
    map: {
        spots: [
            { art: "peaks", x: -440, y: -60, k: 0.8, params: { count: 3, snow: 1 } },
            { art: "lighthouse", x: 520, y: 20, k: 0.7 },
            { art: "planets", x: 40, y: -300, k: 0.5 },
            { art: "observatory", x: -40, y: 320, k: 1.3, is: "gate", params: { open: 0 } },
            { art: "telescope", x: 420, y: 390, k: 0.8 },
            { art: "hares", x: -470, y: 430, k: 0.6, is: "life" },
            { art: "owl", x: 660, y: 440, k: 0.55, is: "secret" },
        ],
        stamp: { x: -640, y: -400 },
    },
    chapter: {
        story: "The far shore's cliffs, where the telescope from the night hill is a hundred times bigger, the northern lights hang over the sea, and the dome stays shut all term until the night it opens.",
        moment: {
            art: "observatory",
            says: "The dome opens to the stars.",
            params: { open: 1 },
            before: { open: 0 },
        },
        secret: { art: "owl", says: "An owl on the observatory's rail." },
        glimpse: { world: "walled-city", art: "city-walls" },
        by: "road",
        rare: { art: "comet", way: "sky" },
    },
    site: {
        kind: "term",
        grade: 5,
        term: 2,
        land: { terrain: "sea-cliffs", near: ["canal-town", "walled-city"] },
    },
    needs: "A fifth year of lessons, and for this term: very large numbers and distances, the planets in order, angles and bearings, light and shadow, and plotting points.",
};
