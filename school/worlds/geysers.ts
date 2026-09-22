// The geyser valley: steaming terraces at the east end of the southern shore, where hot pools change
// colour and a great geyser goes up. A place the lessons on heating, changes, particles and acids
// bring a child to in any year.
import type { World } from "./types";

export const geyserValley: World = {
    id: "geyser-valley",
    name: "The geyser valley",
    about: "A valley of mineral terraces on a steamy winter evening, hot pools in bands of colour, planks laid over the warm ground, a thermometer by the pools, and a great geyser that waits to go up. A place for the lessons on heating, changes, particles and acids, in any year.",
    mood: "a steamy winter evening",
    arrive: "This is the geyser valley. Wait and watch.",
    light: { ground: "berry", sky: "tang", low: "glow", accent: "mint", wash: 0.7 },
    ground: "sinter",
    path: "planks",
    horizon: {
        far: [
            { art: "far-geysers", at: 0.18, k: 0.45 },
            { art: "geyser", at: 0.52, k: 0.6, params: { up: 0, count: 1 } },
            { art: "snowy-firs", at: 0.86, k: 0.6, params: { count: 3, snow: 1 } },
        ],
        gate: "geyser",
    },
    landmarks: ["geyser", "thermometer", "particles", "test-tubes", "bridge"],
    creatures: ["fox", "hares"],
    weather: "clear",
    seasons: ["winter"],
    guide: "glow",
    reaches: [
        {
            art: "particles",
            when: ["skill:chemistry.particles", "skill:chemistry.atoms"],
            says: "Hot particles jiggle and spread apart.",
        },
        {
            art: "bridge",
            when: ["skill:chemistry.rusting"],
            says: "The iron bridge rusts in the steam.",
        },
        {
            art: "test-tubes",
            when: ["skill:chemistry.acids"],
            says: "Some pools are acid. Test the colour.",
        },
        {
            art: "geyser",
            when: ["skill:chemistry.heating"],
            says: "Hot water underground pushes up as steam.",
        },
        {
            art: "thermometer",
            when: ["skill:chemistry.states"],
            says: "Water boils at a hundred degrees.",
        },
        {
            art: "geyser",
            when: ["skill:chemistry.changes", "skill:chemistry.gases"],
            says: "Some changes undo. Some make something new.",
        },
        {
            art: "geyser",
            when: ["skill:chemistry.crystals", "skill:chemistry.dissolving"],
            says: "The hot pool holds more salt than cold.",
        },
    ],
    offers: {
        landmarks: ["geyser", "thermometer", "particles", "test-tubes", "bridge"],
        creatures: ["fox", "hares"],
        grounds: ["berry", "tang"],
        guides: ["glow", "firefly", "hand"],
        weather: ["clear", "snow"],
    },
    wants: [
        {
            what: "A board of the geyser's times",
            why: "A board saying when the great geyser last went up, which is a time interval to read and add to.",
        },
        {
            what: "Coloured mineral terraces up close",
            why: "The steps the hot water leaves as it cools, a picture for what dissolves in hot water and comes out again in cold.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the lessons on heating, changes, particles and acids bring a child to, in any year. Planks lead over the warm ground past pools of colour to a great geyser, which bubbles and waits.",
        moment: {
            art: "geyser",
            says: "The great geyser goes up.",
            params: { up: 1, count: 1 },
            before: { up: 0, count: 1 },
        },
        secret: { art: "fox", says: "A fox curled up on the warm ground." },
        by: "sea",
        rare: { art: "far-geysers", way: "horizon", from: "right", k: 0.5 },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "chemistry-changes-you-can-undo",
                "chemistry-baking-cannot-be-undone",
                "chemistry-heating-with-a-flame",
                "chemistry-hot-water-holds-more",
                "chemistry-puzzles-3",
                "chemistry-year-review-3",
                "chemistry-particles-closer-and-further",
                "chemistry-melting-and-boiling-points",
                "chemistry-new-materials",
                "chemistry-rusting-a-fair-test",
                "chemistry-burning-cannot-be-undone",
                "chemistry-acid-or-alkali",
                "chemistry-atoms-and-molecules",
                "chemistry-year-review-4",
            ],
            label: "heat, changes and acids",
        },
        land: { terrain: "south-shore", near: ["town"] },
    },
    map: {
        spots: [
            { art: "hares", x: 440, y: 110, k: 0.55, is: "life" },
            { art: "thermometer", x: -620, y: 200, k: 0.55 },
            { art: "geyser", x: 30, y: 390, k: 1.05, is: "gate", params: { up: 0, count: 1 } },
            { art: "bridge", x: -440, y: 420, k: 0.55, params: { arches: 1 } },
            { art: "fox", x: 660, y: 440, k: 0.5, is: "secret" },
        ],
        stamp: { x: -640, y: -420 },
    },
};
