// The long grass: the meadow's grass seen as small as an ant, where dew drops are as big as balls, a
// trail of ants leads under the toadstools and a dandelion clock waits for a puff. Not a term's world
// but a place the lessons on counting, measuring and small things bring a child to in any year.
import type { World } from "./types";

export const longGrass: World = {
    id: "long-grass",
    name: "The long grass",
    about: "The meadow's grass from as low as an ant: blades like trees, dew drops like glass balls, a cobweb, toadstools to come in under, ants and ladybirds, and a dandelion clock as tall as a house. A place for the lessons on counting, measuring and small things, in any year.",
    mood: "a summer morning, very small",
    arrive: "You are as small as an ant.",
    light: { ground: "mint", sky: "glow", low: "mint", accent: "berry", wash: 0.9 },
    ground: "litter",
    path: "anttrail",
    horizon: {
        far: [
            { art: "cobweb", at: 0.16, k: 1.1 },
            { art: "cobweb", at: 0.78, k: 0.8, flip: true, params: { spokes: 7, spider: 0 } },
        ],
        gate: "toadstools",
    },
    landmarks: ["dandelion", "cobweb", "toadstools", "flowers"],
    creatures: ["ants", "minibeasts"],
    weather: "dew",
    seasons: ["summer"],
    guide: "firefly",
    reaches: [
        { art: "ants", when: ["skill:counting.to-twenty"], says: "Count the ants in the line." },
        { art: "ants", when: ["skill:length.metres"], says: "A metre is a long walk for ants." },
        {
            art: "dandelion",
            when: ["skill:measure"],
            says: "How many centimetres tall is the dandelion?",
        },
        {
            art: "dandelion",
            when: ["skill:nature.leaves", "skill:nature.seeds"],
            says: "Puff the clock. Where do the seeds go?",
        },
        {
            art: "minibeasts",
            when: ["skill:subtraction.counting-back"],
            says: "Three ladybirds fly away. How many stay?",
        },
        {
            art: "minibeasts",
            when: ["skill:nature.living"],
            says: "The ladybird grows and eats. It is living.",
        },
        {
            art: "ants",
            when: ["skill:nature.minibeasts"],
            says: "Six legs each. The ants are insects.",
        },
        {
            art: "dandelion",
            when: ["skill:nature.growing"],
            says: "The dandelion grew from one seed.",
        },
    ],
    offers: {
        landmarks: ["dandelion", "cobweb", "toadstools", "flowers"],
        creatures: ["ants", "minibeasts", "snail"],
        grounds: ["mint", "glow"],
        guides: ["firefly", "snail", "dot"],
        weather: ["dew", "clear"],
    },
    wants: [
        {
            what: "A caterpillar on a leaf",
            why: "The life cycle a child can watch at this size, and a creature that moves slowly enough to be measured.",
        },
        {
            what: "A dew drop with the grass upside down in it",
            why: "Up close a drop of water is a lens, and it would be the long grass's own picture for looking closely.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the lessons on counting, measuring and small things bring a child to, in any year. In the meadow's grass, as small as an ant, a trail of ants leads past dew drops as big as balls to a dandelion clock waiting for a puff.",
        moment: {
            art: "dandelion",
            says: "Puff. The dandelion seeds fly away.",
            params: { seeds: 11, blown: 1, flower: 0 },
            before: { seeds: 18, blown: 0, flower: 0 },
        },
        secret: { art: "snail", says: "A snail asleep under a leaf." },
        by: "path",
        rare: { art: "bumblebee", way: "sky", from: "left" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "g1-counting-to-twenty",
                "g1-taking-away-to-twenty",
                "g1-how-long-how-heavy",
                "g2-metres-and-centimetres",
                "nature-living-or-not",
                "nature-from-seed-to-flower",
                "nature-legs-and-wings",
                "nature-puzzles-1",
                "nature-leaves-and-seeds",
            ],
            label: "small things up close",
            needs: "The kindergarten year's counting to ten and looking closely.",
        },
        land: { terrain: "home", near: ["meadow"] },
    },
    map: {
        spots: [
            {
                art: "dandelion",
                x: 360,
                y: 300,
                k: 0.9,
                is: "moment",
                params: { seeds: 18, blown: 0, flower: 0 },
            },
            { art: "cobweb", x: -440, y: 150, k: 0.8 },
            { art: "toadstools", x: -120, y: 420, k: 1, is: "gate" },
            { art: "ants", x: -500, y: 440, k: 0.6 },
            { art: "minibeasts", x: 120, y: -100, k: 0.8, is: "life" },
            { art: "snail", x: 660, y: 440, k: 0.6, is: "secret" },
        ],
        decor: "lawn",
        stamp: { x: -640, y: -420 },
    },
};
