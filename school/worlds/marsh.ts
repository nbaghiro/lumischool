// The marsh: reeds and still water at dawn, with mist lying over it and everything on its far edge
// doubled in the water. A corduroy of logs leads out through the reeds to the bird hide, where the
// same heron stands in every season. Not a term's world but a place the science and nature lessons
// bring a child to in any year, and the one world whose tree turns through all four seasons.
import type { World } from "./types";

export const reedMarsh: World = {
    id: "reed-marsh",
    name: "The marsh",
    about: "Reeds and still water at dawn, with mist on the water, a path of logs out to a bird hide and a heron in the shallows. A place for the science and nature lessons in any year, which turns through all four seasons.",
    mood: "a misty dawn on the reeds",
    arrive: "This is the marsh. Walk quietly.",
    light: { ground: "sky", sky: "glow", low: "berry", accent: "mint", wash: 0.85 },
    ground: "reeds",
    path: "logs",
    horizon: {
        far: [
            { art: "heron", at: 0.14, k: 1.5, sink: 10 },
            { art: "firs", at: 0.5, k: 0.75, params: { count: 4, snow: 0 } },
            { art: "tree", at: 0.84, k: 0.9 },
        ],
        sky: [{ art: "sun", at: 0.7, down: 0.5, k: 0.8 }],
        gate: "bird-hide",
    },
    landmarks: ["pond", "season-tree", "frog-cycle", "flowers"],
    creatures: ["heron", "duck", "dragonfly", "kingfisher"],
    weather: "mist",
    seasons: ["spring", "summer", "autumn", "winter"],
    guide: "snail",
    reaches: [
        {
            art: "frog-cycle",
            when: ["skill:nature.life-cycles"],
            says: "Frogspawn, tadpole, froglet, frog.",
        },
        {
            art: "flowers",
            when: ["skill:nature.plants"],
            says: "Roots in the mud, flower on top.",
        },
        {
            art: "bird-hide",
            when: ["skill:nature.maps"],
            says: "From the hide, the marsh is a map.",
        },
        {
            art: "season-tree",
            when: ["skill:nature.seasons"],
            says: "Spring, summer, autumn, winter, and round again.",
        },
        { art: "heron", when: ["skill:physics.heat"], says: "The heron stands in the cold water." },
        { art: "duck", when: ["skill:physics.floating"], says: "Ducks float. Stones sink." },
        { art: "pond", when: ["skill:chemistry.states"], says: "In winter the pond turns to ice." },
        {
            art: "pond",
            when: ["skill:nature.habitats"],
            says: "Fish under, frogs on top, a heron beside.",
        },
    ],
    offers: {
        landmarks: ["pond", "season-tree", "frog-cycle", "flowers", "bird-hide", "tree"],
        creatures: ["heron", "duck", "dragonfly", "kingfisher", "minibeasts", "mouse"],
        grounds: ["sky", "mint"],
        guides: ["snail", "bird", "firefly"],
        weather: ["mist", "clear", "cloudy", "rain"],
    },
    wants: [
        {
            what: "An otter",
            why: "The marsh's shy creature, a whiskered head in the ripples, which would be the secret for a child who waits long enough at the edge of the reeds.",
        },
        {
            what: "Swans with their cygnets",
            why: "A family to count on the water, grey young beside white parents, and a life cycle that a child can see in one picture without a diagram.",
        },
    ],
    map: {
        spots: [
            { art: "firs", x: -430, y: -20, k: 0.8, params: { count: 4, snow: 0 } },
            { art: "tree", x: 470, y: 40, k: 0.9 },
            { art: "heron", x: 80, y: -280, k: 0.7, is: "life" },
            { art: "bird-hide", x: -110, y: 360, k: 1.2, is: "gate" },
            { art: "pond", x: 360, y: 390, k: 0.8 },
            {
                art: "frog-cycle",
                x: 560,
                y: 470,
                k: 0.4,
                is: "moment",
                params: { stage: 1, ring: 1, names: 0 },
            },
            { art: "mouse", x: -660, y: 440, k: 0.55, is: "secret" },
        ],
        stamp: { x: -640, y: -400 },
    },
    chapter: {
        story: "Not a term's world but a place the science and nature lessons bring a child to, in any year. A path of logs goes out through the reeds to a bird hide, where the same heron stands in every season.",
        moment: {
            art: "frog-cycle",
            says: "The frogspawn has become frogs.",
            params: { stage: 4, ring: 1, names: 0 },
        },
        secret: { art: "mouse", says: "A harvest mouse up a reed." },
        by: "path",
        rare: { art: "kingfisher-flying", way: "horizon" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: ["nature"],
            lessons: [
                "physics-floating-and-sinking",
                "physics-hot-and-cold",
                "physics-keeping-cold",
                "chemistry-water-ice-and-steam",
                "chemistry-air-is-everywhere",
                "chemistry-which-melts-first",
            ],
            needs: "The rest of the nature track: food chains, the weather measured, and a tally of what is seen.",
        },
        land: { terrain: "lakeshore", near: ["meadow", "railway"] },
    },
};
