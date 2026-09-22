// The coral reef: the sea from underneath, where the light comes down through the water onto fans of
// coral and shoals of fish. Not a term's world but a place the lessons on arrays, tables and symmetry
// bring a child to in any year, on an atoll off the town's estuary. Its sky is the water above, the
// one deep sky that is light at the top, so its name is lettered in dark ink.
import type { World } from "./types";

export const coralReef: World = {
    id: "coral-reef",
    name: "The coral reef",
    about: "The sea from underneath: light coming down through the water onto fans of coral, shoals of fish, a turtle and an octopus, with a path of shells down to a diving bell. A place for the lessons on arrays, tables, symmetry and numbers below zero, in any year.",
    mood: "sunlight through the water",
    arrive: "This is the reef. Look closely.",
    light: { ground: "sky", sky: "sky", low: "mint", accent: "glow", wash: 0.8, deep: "reef" },
    ground: "reef",
    path: "shellway",
    horizon: {
        far: [
            { art: "coral", at: 0.16, k: 0.9, params: { fans: 2, spawn: 0 } },
            {
                art: "fish-shoal",
                at: 0.5,
                k: 0.8,
                sink: -170,
                params: { rows: 3, cols: 5, facing: -1 },
            },
            { art: "coral", at: 0.86, k: 0.75, flip: true, params: { fans: 1, spawn: 0 } },
        ],
        gate: "diving-bell",
    },
    landmarks: ["coral", "starfish", "bubbles"],
    creatures: ["fish-shoal", "sea-turtle", "octopus", "crabs"],
    weather: "clear",
    seasons: ["summer"],
    guide: "dot",
    reaches: [
        {
            art: "diving-bell",
            when: ["skill:number.negatives"],
            says: "The diving bell sinks below sea level.",
        },
        {
            art: "fish-shoal",
            when: ["skill:number.factors", "skill:number.primes"],
            says: "Twelve fish: which rows fit exactly?",
        },
        {
            art: "fish-shoal",
            when: ["skill:multiplication.arrays"],
            says: "The shoal swims in rows of four.",
        },
        {
            art: "starfish",
            when: ["skill:multiplication.tables"],
            says: "Five arms on a starfish. Count in fives.",
        },
        {
            art: "coral",
            when: ["skill:shapes.symmetry", "skill:shapes.angles"],
            says: "A fan coral's two sides match.",
        },
        {
            art: "octopus",
            when: ["skill:nature.food-chains", "skill:nature.food-webs", "skill:nature.habitats"],
            says: "Every creature here eats, or is eaten.",
        },
        {
            art: "octopus",
            when: ["skill:multiplication.equal-groups", "skill:division.sharing"],
            says: "Eight arms. Share them into pairs.",
        },
    ],
    offers: {
        landmarks: ["coral", "starfish", "bubbles", "diving-bell"],
        creatures: ["fish-shoal", "sea-turtle", "octopus", "crabs"],
        grounds: ["sky", "mint"],
        guides: ["dot", "bird", "glow"],
        weather: ["clear"],
    },
    wants: [
        {
            what: "A seahorse",
            why: "The reef's small creature that a child would search the coral for, and a father that carries the eggs, which is a life cycle worth a picture.",
        },
        {
            what: "A clownfish in an anemone",
            why: "A home and the one who lives in it in a single drawing, which is the habitat lesson's own picture.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the lessons on arrays, tables and symmetry bring a child to, in any year. A path of shells leads down past the fans and the shoals to a diving bell, and the coral waits for its one night of the year.",
        moment: {
            art: "coral",
            says: "Pink snow rises from the coral.",
            params: { fans: 3, spawn: 1 },
            before: { fans: 3, spawn: 0 },
        },
        secret: { art: "octopus", says: "An octopus hiding in the coral." },
        by: "sea",
        rare: { art: "manta", way: "sky", from: "left" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "g1-equal-groups",
                "g2-threes-and-fours",
                "g3-times-tables",
                "g3-angles-and-symmetry",
                "g4-factors-and-primes",
                "g4-negative-numbers",
                "nature-food-chains",
                "nature-by-the-sea",
                "nature-puzzles-3",
                "nature-food-webs",
            ],
            label: "sea life and arrays",
            needs: "A year 5 lesson on very large and very small numbers.",
        },
        land: { terrain: "atoll", near: ["town"] },
    },
    map: {
        spots: [
            { art: "coral", x: -420, y: 220, k: 0.9, params: { fans: 2, spawn: 0 } },
            { art: "fish-shoal", x: 260, y: -200, k: 0.7 },
            { art: "sea-turtle", x: -560, y: -250, k: 0.6, is: "life" },
            { art: "diving-bell", x: 120, y: 380, k: 1.1, is: "gate" },
            { art: "coral", x: 480, y: 420, k: 0.8, is: "moment", params: { fans: 3, spawn: 0 } },
            { art: "octopus", x: -660, y: 440, k: 0.55, is: "secret" },
        ],
        stamp: { x: -640, y: -420 },
    },
};
