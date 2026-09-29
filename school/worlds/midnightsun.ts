// The midnight sun: the first world of a sixth year, reached by sea from the old city's harbour across
// the northern ocean. An ice shelf in the far north in summer, where the sun goes round the sky and
// never sets: the ice cliff, a research hut with its thermometer, a sledge, an iceberg and a weather
// station, with seals, puffins, a whale and an Arctic fox.
import type { World } from "./types";

export const midnightSun: World = {
    id: "midnight-sun",
    name: "The midnight sun",
    about: "An ice shelf in the far north in summer, where the sun goes round the sky and never sets: an ice cliff over the sea, a research hut with a thermometer on its wall, a sledge, an iceberg and a weather station, with seals, puffins, a whale and an Arctic fox. The first world of a sixth year.",
    mood: "a bright night on the ice",
    arrive: "This is the ice. The sun stays up.",
    light: { ground: "sky", sky: "sky", low: "glow", accent: "tang", wash: 0.7 },
    ground: "iceshelf",
    path: "stakes",
    horizon: {
        far: [
            { art: "ice-cliff", at: 0.15, k: 1.15 },
            { art: "iceberg", at: 0.46, k: 1, params: { under: 0 } },
            { art: "waterfall", at: 0.66, k: 0.32, params: { drops: 1, rainbow: 0 } },
            { art: "research-hut", at: 0.86, k: 0.95 },
        ],
        sky: [{ art: "sun", at: 0.3, down: 0.55 }],
        gate: "ship",
    },
    landmarks: ["ice-cliff", "research-hut", "sledge", "iceberg", "weather-station"],
    creatures: ["seal", "puffins", "whale", "fox"],
    weather: "clear",
    seasons: ["summer"],
    guide: "bird",
    reaches: [
        {
            art: "weather-station",
            when: ["skill:coding"],
            says: "A program reads the station's sensors.",
        },
        {
            art: "frost-thermometer",
            when: [
                "skill:number.negatives",
                "skill:chemistry.freezing",
                "skill:physics.heat",
                "art:thermometer",
            ],
            says: "How far below zero is it today?",
        },
        {
            art: "research-hut",
            when: ["skill:fractions.multiply", "skill:fractions.divide"],
            says: "Share the hut's stores in fractions.",
        },
        {
            art: "research-hut",
            when: ["skill:physics.energy"],
            says: "Sun and wind make the hut's electricity.",
        },
        { art: "ice-cliff", when: ["skill:art"], says: "Paint the ice cliff in the low sun." },
        {
            art: "sledge",
            when: ["skill:ratio", "skill:proportion"],
            says: "Two dogs for every child on the sledge.",
        },
        {
            art: "sledge",
            when: ["skill:physics.forces", "skill:physics.friction"],
            says: "What pulls the sledge, and what slows it?",
        },
        {
            art: "weather-station",
            when: [
                "skill:data.median",
                "skill:data.mode",
                "skill:data.range",
                "skill:data.histograms",
            ],
            says: "Read the station's chart of the day.",
        },
        {
            art: "iceberg",
            when: ["skill:chemistry.density"],
            says: "Most of the iceberg is under the water.",
        },
        { art: "tent", when: ["skill:physics.sky"], says: "Midnight, and the sun is still up." },
        {
            art: "research-hut",
            when: ["skill:reading", "skill:writing"],
            says: "The day's notes are written in the hut.",
        },
        {
            art: "whale",
            when: ["skill:physics.sound"],
            says: "A whale's song carries far under the sea.",
        },
        {
            art: "seal",
            when: ["skill:nature.adaptation", "art:seal"],
            says: "A thick layer of fat keeps seals warm.",
        },
    ],
    offers: {
        landmarks: [
            "ice-cliff",
            "research-hut",
            "sledge",
            "iceberg",
            "weather-station",
            "frost-thermometer",
            "tent",
        ],
        creatures: ["seal", "puffins", "whale", "fox", "gull"],
        grounds: ["sky", "glow", "mint"],
        guides: ["bird", "glow", "dot"],
        weather: ["clear", "breezy", "snow"],
    },
    wants: [
        {
            what: "Walruses on the floes",
            why: "The shelf's own heavy creature, a row of them to count on the ice, which would give the far north an animal no other world has.",
        },
        {
            what: "A sledge team of dogs",
            why: "Dogs in harness in pairs, which the ratio lessons could count two to a pair and the sledge could be pulled by.",
        },
    ],
    map: {
        spots: [
            { art: "ice-cliff", x: -300, y: -20, k: 1 },
            { art: "research-hut", x: 330, y: 40, k: 0.8 },
            {
                art: "midnight-sun",
                x: 320,
                y: -340,
                k: 0.55,
                is: "moment",
                params: { suns: 5, midnight: 0 },
            },
            { art: "sledge", x: 40, y: 380, k: 0.75 },
            { art: "ship", x: -470, y: 440, k: 0.6, is: "gate" },
            { art: "seal", x: -660, y: 250, k: 0.5 },
            { art: "fox", x: 660, y: 440, k: 0.5, is: "secret" },
        ],
        stamp: { x: -640, y: -380 },
    },
    chapter: {
        story: "The sixth year begins across the northern ocean from the old city, on an ice shelf in the far north in summer, where the sun goes round the sky all day and all night and never sets. Far inland the hills have a waterfall in them.",
        moment: {
            art: "midnight-sun",
            says: "The sun touches the sea and rises again.",
            params: { suns: 5, midnight: 1 },
            before: { suns: 5, midnight: 0 },
        },
        secret: { art: "fox", says: "An Arctic fox asleep by the hut." },
        glimpse: { world: "waterfall-gorge", art: "waterfall" },
        by: "sea",
        rare: { art: "whale", way: "horizon", from: "left" },
    },
    site: {
        kind: "term",
        grade: 6,
        term: 1,
        land: { terrain: "far-north", near: ["walled-city", "waterfall-gorge"] },
    },
};
