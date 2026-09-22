// The salt flats: a white flat inland on the southern shore, where seawater dries in pans and leaves
// its salt, and after rain the whole flat becomes a mirror. A place the lessons on dissolving, mixing
// and separating bring a child to in any year.
import type { World } from "./types";

export const saltFlats: World = {
    id: "salt-flats",
    name: "The salt flats",
    about: "A wide white flat on a pastel morning, its crust cracked into shapes of six sides, with salt pans drying in the sun, heaps of salt, flamingos in the shallows and mountains far off. A place for the lessons on dissolving, mixing and separating, in any year.",
    mood: "a still pastel morning",
    arrive: "These are the salt flats. Walk softly.",
    light: { ground: "sky", sky: "berry", low: "glow", accent: "sky", wash: 0.6 },
    ground: "saltcrust",
    path: "heaps",
    horizon: {
        far: [
            { art: "peaks", at: 0.16, k: 0.55, params: { count: 3, snow: 1 } },
            { art: "salt-lake", at: 0.5, k: 0.7, params: { flooded: 0 } },
            { art: "flamingos", at: 0.84, k: 0.6, params: { count: 3, flying: 0 } },
        ],
        gate: "salt-pans",
    },
    landmarks: ["salt-pans", "salt-lake", "beaker", "jug"],
    creatures: ["flamingos", "ants"],
    weather: "clear",
    seasons: ["spring"],
    guide: "hand",
    reaches: [
        {
            art: "salt-pans",
            when: ["skill:chemistry.separating"],
            says: "The sun dries the pan. Salt is left.",
        },
        {
            art: "salt-lake",
            when: ["skill:chemistry.dissolving"],
            says: "Salt disappears in water, but it is there.",
        },
        {
            art: "beaker",
            when: ["skill:chemistry.states"],
            says: "Solid salt, liquid water, gas in the air.",
        },
        {
            art: "jug",
            when: ["skill:chemistry.volume"],
            says: "Measure the salty water in the jug.",
        },
    ],
    offers: {
        landmarks: ["salt-pans", "salt-lake", "beaker", "jug"],
        creatures: ["flamingos", "ants"],
        grounds: ["sky", "berry"],
        guides: ["hand", "dot", "glow"],
        weather: ["clear"],
    },
    wants: [
        {
            what: "A lizard on the warm crust",
            why: "A small creature that comes out as the salt warms, and something to find between the heaps.",
        },
        {
            what: "A sieve and a bucket of brine",
            why: "The tools the separating lessons use, drawn outdoors where salt is really made.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the lessons on dissolving, mixing and separating bring a child to, in any year. A line of salt heaps leads over the white crust to the drying pans, and the flat waits for rain.",
        moment: {
            art: "salt-lake",
            says: "The sky comes down to the ground.",
            params: { flooded: 1 },
        },
        secret: { art: "ants", says: "Ants carrying salt crumbs home." },
        by: "sea",
        rare: { art: "flamingos-flying", way: "sky", from: "left" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "chemistry-solid-liquid-and-gas",
                "chemistry-mixing-and-stirring",
                "chemistry-does-it-dissolve",
                "chemistry-measuring-a-liquid",
                "chemistry-getting-it-back",
                "chemistry-colours-come-apart",
                "chemistry-sieve-filter-or-magnet",
                "chemistry-stirring-and-dissolving",
                "chemistry-a-fair-test-dissolving",
                "chemistry-separating-puzzles",
                "chemistry-puzzles-2",
                "chemistry-year-review-2",
            ],
            label: "dissolving and separating",
            needs: "A lesson on how much salt a litre of seawater holds, and one on crystals growing as a pan dries, which the chemistry track has not written yet.",
        },
        land: { terrain: "south-shore", near: ["town"] },
    },
    map: {
        spots: [
            { art: "salt-lake", x: 60, y: 100, k: 0.85, is: "moment", params: { flooded: 0 } },
            {
                art: "flamingos",
                x: -480,
                y: 300,
                k: 0.65,
                is: "life",
                params: { count: 3, flying: 0 },
            },
            { art: "salt-pans", x: 40, y: 410, k: 0.95, is: "gate", params: { pans: 3, heaps: 3 } },
            { art: "ants", x: 660, y: 440, k: 0.5, is: "secret" },
        ],
        stamp: { x: -640, y: -420 },
    },
};
