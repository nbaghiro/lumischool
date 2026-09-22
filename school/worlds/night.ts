// The night sky: the first world of the third year, on autumn nights when it gets dark before tea. A
// hilltop under the stars, a telescope, a rocket on its pad and the moon coming up, with the path as
// a line of stars joined the way a constellation is. The page is light only, and the night is
// scenery rather than a theme: the sky above the horizon is a real dark blue, from the sky palette in
// check.ts, and it stops at the horizon, where the hill and every sheet on it are as light as any
// other world's.
import type { World } from "./types";

export const night: World = {
    id: "night-sky",
    name: "The night sky",
    about: "A hilltop under the stars with a telescope, a tent with its lamp lit, a rocket on its launch pad and the moon coming up. The planets stand in a row, the path is a line of stars, and the owl is awake.",
    mood: "a clear night on the hill",
    arrive: "This is the night sky. Look up.",
    light: { ground: "berry", sky: "sky", low: "sky", accent: "glow", wash: 0.95, deep: "night" },
    ground: "hill",
    path: "stars",
    horizon: {
        far: [
            { art: "firs", at: 0.16, k: 0.9, params: { count: 2, snow: 0 } },
            { art: "peaks", at: 0.33, k: 0.5, params: { count: 3, snow: 1 } },
            { art: "telescope", at: 0.5, k: 1.2 },
            { art: "firs", at: 0.84, k: 1.05, params: { count: 3, snow: 0 } },
        ],
        sky: [{ art: "moon", at: 0.78, down: 0.05, k: 1.6 }],
        gate: "rocket",
    },
    landmarks: ["telescope", "firs", "tent", "rocket", "planets", "pond"],
    creatures: ["owl", "fox", "hedgehog"],
    weather: "starry",
    seasons: ["autumn"],
    guide: "firefly",
    reaches: [
        {
            art: "telescope",
            when: ["skill:place-value.rounding", "skill:place-value.hundreds"],
            says: "More stars than anyone can count.",
        },
        {
            art: "telescope",
            when: ["skill:place-value.multiply-by-ten", "skill:algebra.function-machines"],
            says: "Ten times closer through the telescope.",
        },
        {
            art: "rocket",
            when: [
                "skill:coding.tracing",
                "skill:coding.sequences",
                "skill:coding.repetition",
                "skill:coding.drawing",
            ],
            says: "A rocket follows its program too.",
        },
        {
            art: "tent",
            when: ["skill:multiplication"],
            says: "Four tents, three campers each. How many?",
        },
        { art: "tent", when: ["skill:addition.columns"], says: "Add up the campers in each tent." },
        {
            art: "tent",
            when: ["skill:subtraction.columns"],
            says: "Some campers go home. How many stay?",
        },
        {
            art: "tent",
            when: ["skill:art.warm-cool"],
            says: "The tent glows warm under a cool sky.",
        },
        {
            art: "tent",
            when: ["skill:physics.circuits"],
            says: "Close the switch and the tent lamp lights.",
        },
        {
            art: "rocket",
            when: ["skill:physics.forces"],
            says: "Engines push the rocket up: a force.",
        },
        { art: "pond", when: ["skill:chemistry"], says: "Scoop pond water and filter it clean." },
        { art: "owl", when: ["skill:music"], says: "Hoot low, hoot high, like notes." },
        { art: "owl", when: ["skill:reading"], says: "The owl listens as you read." },
        { art: "fox", when: ["skill:writing"], says: "The fox runs quickly. Which word says how?" },
    ],
    offers: {
        landmarks: ["telescope", "firs", "pond", "rocket", "season-tree", "tent", "planets"],
        creatures: ["owl", "fox", "hedgehog", "rabbit"],
        grounds: ["berry", "mint", "sky"],
        guides: ["firefly", "glow", "snail", "dot"],
        weather: ["starry", "clear", "snow"],
    },
    wants: [
        {
            what: "The moon's phases in a row",
            why: "The third and fourth years ask about the moon changing shape, and the moon on the shelf shows one phase at a time.",
        },
        {
            what: "A sleeping bag and a torch",
            why: "Something for the lit tent to hold, so the hill is somewhere to stay the night rather than a lamp beside the path.",
        },
    ],
    map: {
        spots: [
            { art: "telescope", x: -200, y: 30, k: 1.2 },
            { art: "firs", x: -560, y: 300, k: 0.7 },
            { art: "moon", x: 420, y: -430, k: 0.75 },
            {
                art: "rocket",
                x: 390,
                y: 340,
                k: 1.05,
                is: "gate",
                after: { x: 470, y: -250, k: 0.8 },
                trail: true,
            },
            { art: "rabbit", x: -660, y: 440, k: 0.75, is: "secret" },
            { art: "tent", x: -130, y: 390, k: 0.8 },
        ],
        decor: "hill",
        stamp: { x: -800, y: -180 },
    },
    chapter: {
        story: "The third year begins on a hill at night. The firefly from the meadow is back, a rocket waits on its pad all term, and on the horizon, under the stars, are mountains nobody has been to yet.",
        moment: { art: "rocket", says: "Three, two, one. The rocket goes up." },
        secret: { art: "rabbit", says: "A rabbit awake past bedtime." },
        glimpse: { world: "mountains", art: "peaks" },
        by: "sea",
        rare: { art: "shooting-star", way: "streak", from: "right" },
    },
};
