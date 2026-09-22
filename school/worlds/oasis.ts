// The oasis: camel tracks over the dunes at sunrise to a well beside a pool under the palms, where the
// long shadows tell the time. Not a term's world but a place the lessons on water and the sun bring a
// child to in any year, on the southern shore across the sea from the town.
import type { World } from "./types";

export const duneOasis: World = {
    id: "dune-oasis",
    name: "The oasis",
    about: "Dunes at sunrise with the last stars going out, camel tracks to a well, a pool under palm trees, a sundial throwing a long shadow and a fennec fox in the shade. A place for the lessons on water and the sun, in any year.",
    mood: "sunrise over the dunes",
    arrive: "This is the oasis. Here comes the sun.",
    light: { ground: "tang", sky: "tang", low: "glow", accent: "berry", wash: 0.75, deep: "dawn" },
    ground: "dunes",
    path: "tracks",
    horizon: {
        far: [
            { art: "palms", at: 0.1, k: 1, params: { count: 2, coconuts: 2 } },
            { art: "oasis", at: 0.26, k: 0.9, sink: 20, params: { water: 1, bloom: 0 } },
            { art: "palms", at: 0.4, k: 0.8, flip: true, params: { count: 2, coconuts: 1 } },
            { art: "palms", at: 0.66, k: 0.55, params: { count: 1, coconuts: 1 } },
        ],
        sky: [{ art: "moon", at: 0.2, down: 0.12, k: 0.6, params: { phase: 0.15 } }],
        gate: "well",
    },
    landmarks: ["oasis", "palms", "sundial", "water-sign"],
    creatures: ["camel", "fennec"],
    weather: "rays",
    seasons: ["spring"],
    guide: "hand",
    reaches: [
        {
            art: "camel",
            when: ["skill:nature.habitats", "skill:nature.sorting"],
            says: "Wide feet for sand, a hump for food.",
        },
        {
            art: "sundial",
            when: ["art:shadows", "skill:physics.light"],
            says: "The sundial's shadow shortens as the sun climbs.",
        },
        { art: "well", when: ["skill:capacity"], says: "How many litres does the bucket hold?" },
        {
            art: "oasis",
            when: ["skill:chemistry.states"],
            says: "Ice melts fast in the desert sun.",
        },
        {
            art: "water-sign",
            when: ["skill:reading.signs"],
            says: "Read the sign: water this way.",
        },
        {
            art: "oasis",
            when: ["skill:chemistry.water-cycle"],
            says: "The sun lifts water to make clouds.",
        },
        {
            art: "oasis",
            when: ["skill:chemistry.evaporating", "skill:chemistry.separating"],
            says: "The pool dries at its edge, leaving salt.",
        },
    ],
    offers: {
        landmarks: ["oasis", "palms", "sundial", "water-sign", "well"],
        creatures: ["camel", "fennec"],
        grounds: ["tang", "glow"],
        guides: ["hand", "dot", "stub"],
        weather: ["rays", "clear"],
    },
    wants: [
        {
            what: "A water bottle and a sun hat",
            why: "What a child would carry across the dunes, and the start of a lesson about keeping cool and how much water a day takes.",
        },
        {
            what: "A lizard on a warm rock",
            why: "A small creature that comes out as the sand warms, and a third animal for the dunes that is neither a camel nor a fox.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the lessons on water and the sun bring a child to, in any year. Camel tracks lead over the dunes at sunrise to a well beside a pool under the palms, where the long shadows tell the time, and the desert waits for rain.",
        moment: {
            art: "oasis",
            says: "Rain in the night. The desert blooms.",
            params: { water: 1, bloom: 1 },
            before: { water: 1, bloom: 0 },
        },
        secret: { art: "fennec", says: "A fennec fox in the shade." },
        by: "sea",
        rare: { art: "camels", way: "horizon", from: "right" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "physics-where-a-shadow-comes-from",
                "g2-litres-and-millilitres",
                "chemistry-melting-and-freezing",
                "reading-signs-and-notices",
                "chemistry-evaporating-to-get-the-salt-back",
                "chemistry-the-water-cycle",
                "chemistry-puddles-disappear",
                "nature-suited-to-the-place",
                "nature-puzzles-4",
            ],
            label: "water and the sun",
            needs: "Rainfall on a chart, which the nature track's weather lesson would bring, and a lesson telling the time from a shadow.",
        },
        land: { terrain: "south-shore", near: ["town"] },
    },
    map: {
        spots: [
            { art: "palms", x: -420, y: 180, k: 0.9 },
            { art: "oasis", x: 60, y: 250, k: 1, is: "moment", params: { water: 1, bloom: 0 } },
            { art: "well", x: 430, y: 400, k: 1, is: "gate" },
            { art: "camel", x: -450, y: 420, k: 0.7, is: "life" },
            { art: "sundial", x: 560, y: 120, k: 0.6 },
            { art: "fennec", x: 660, y: 440, k: 0.6, is: "secret" },
        ],
        stamp: { x: -640, y: -360 },
    },
};
