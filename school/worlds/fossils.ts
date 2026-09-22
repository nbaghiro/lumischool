// The fossil cliffs: ledges at low tide under cliffs of layered rock, where footprints older than
// anything lead to a skeleton coming out of the rock a little more every lesson. Not a term's world
// but a place the lessons on rocks and deep time bring a child to in any year, on the home isle's cape.
import type { World } from "./types";

export const fossilCliffs: World = {
    id: "fossil-cliffs",
    name: "The fossil cliffs",
    about: "Cliffs of layered rock over flat ledges at low tide, with rock pools, ammonites, crabs and gulls, and a trackway of old footprints leading to a skeleton in the rock. A place for the lessons on rocks and deep time, in any year.",
    mood: "low tide under the cliffs",
    arrive: "These are the fossil cliffs. Look down.",
    light: { ground: "tang", sky: "sky", accent: "mint", wash: 0.7 },
    ground: "ledges",
    path: "trackway",
    horizon: {
        far: [
            { art: "strata", at: 0.16, k: 1.1 },
            { art: "strata", at: 0.82, k: 0.8, flip: true, params: { layers: 4, names: 0 } },
        ],
        sky: [{ art: "gull-flying", at: 0.55, down: 0.3, k: 0.8 }],
        gate: "fossil",
    },
    landmarks: ["strata", "ammonite"],
    creatures: ["crabs", "starfish", "gull"],
    weather: "breezy",
    seasons: ["spring", "summer"],
    guide: "snail",
    reaches: [
        {
            art: "ammonite",
            when: ["art:fossilsteps", "skill:ordering"],
            says: "Shell, mud, stone: how a fossil forms.",
        },
        { art: "strata", when: ["art:rocks"], says: "Rock lies in layers, oldest at the bottom." },
        {
            art: "ammonite",
            when: ["skill:patterns.growing"],
            says: "The ammonite's spiral grows as it turns.",
        },
        { art: "crabs", when: ["skill:time.timetables"], says: "Low tide is at ten past four." },
    ],
    offers: {
        landmarks: ["strata", "ammonite", "fossil"],
        creatures: ["crabs", "starfish", "gull", "seal"],
        grounds: ["tang", "sky"],
        guides: ["snail", "hand", "stub"],
        weather: ["breezy", "clear", "cloudy"],
    },
    wants: [
        {
            what: "A hammer and a brush for digging",
            why: "The tools that get a fossil out of the rock, which would show how slow and careful the work is.",
        },
        {
            what: "A timeline marked along the cliff",
            why: "The layers of rock are deep time, and years marked along them would let the ordering lessons read the cliff like a ruler.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the lessons on rocks and deep time bring a child to, in any year. Footprints older than anything lead along the ledges at low tide to a skeleton coming out of the cliff, a little more of it every lesson.",
        moment: {
            art: "fossil",
            says: "The whole skeleton is out of the rock.",
            params: { dug: 1 },
            before: { dug: 0.33 },
        },
        secret: { art: "starfish", says: "A starfish left in a rock pool." },
        by: "path",
        rare: { art: "seal-waves", way: "appear" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "chemistry-rocks",
                "chemistry-soil-and-fossils",
                "chemistry-soil-what-drains",
                "chemistry-weathering-and-erosion",
                "g1-shape-puzzles",
                "g3-minutes-and-timetables",
            ],
            label: "rocks and deep time",
            needs: "Timelines and deep time, which a history track would bring, and a year 5 lesson on place value into the millions of years.",
        },
        land: { terrain: "sea-cliffs", near: ["meadow"] },
    },
    map: {
        spots: [
            { art: "strata", x: -360, y: 120, k: 0.9 },
            { art: "fossil", x: 140, y: 300, k: 0.9, is: "gate", params: { dug: 0.33 } },
            { art: "ammonite", x: -420, y: 430, k: 0.7 },
            { art: "crabs", x: 470, y: 440, k: 0.6 },
            { art: "gull-flying", x: 420, y: -380, k: 0.6, is: "life" },
            { art: "starfish", x: 660, y: 440, k: 0.5, is: "secret" },
        ],
        decor: "beach",
        stamp: { x: -640, y: -420 },
    },
};
