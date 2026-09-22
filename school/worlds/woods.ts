// The woods: the first world of the second year, at the start of autumn. Firs along the horizon, a
// dusk sky going from purple to gold at the horizon, leaves and toadstools underfoot and stepping stones for a
// path, and the creatures that come out at dusk. It is the meadow's older sibling: the same pen and
// some of the same cast, in a darker, quieter light, so a child who has had a year of the meadow
// arrives somewhere they half know.
import type { World } from "./types";

export const woods: World = {
    id: "woods",
    name: "The woods",
    about: "Tall firs, fallen leaves, stepping stones and a log with toadstools on it, at the end of the day when the sky turns pink. The owl and the fox come out, and there is a treehouse to climb up to.",
    mood: "an autumn evening",
    arrive: "These are the woods. Listen for the owl.",
    light: { ground: "tang", sky: "berry", low: "glow", accent: "berry", wash: 0.8, deep: "dusk" },
    ground: "woods",
    path: "stones",
    horizon: {
        far: [
            { art: "firs", at: 0.12, k: 1.05, params: { count: 2, snow: 0 } },
            { art: "firs", at: 0.47, k: 1.35, params: { count: 4, snow: 0 } },
            { art: "firs", at: 0.86, k: 1.1, params: { count: 3, snow: 0 } },
        ],
        sky: [{ art: "moon", at: 0.8, down: 0.1 }],
        gate: "treehouse",
    },
    landmarks: ["season-tree", "pond", "firs", "tree", "log"],
    creatures: ["fox", "owl", "rabbits", "hedgehog"],
    weather: "clear",
    seasons: ["autumn", "winter"],
    guide: "snail",
    reaches: [
        {
            art: "owl",
            when: ["skill:reading.comprehension", "art:passage"],
            says: "The owl is listening to the story.",
        },
        { art: "firs", when: ["skill:place-value"], says: "Count the trees in tens." },
        {
            art: "rabbits",
            when: ["skill:subtraction"],
            says: "Some rabbits hop home. How many stay?",
        },
        {
            art: "log",
            when: ["skill:physics.friction"],
            says: "Bark is rough. Inside the log is smooth.",
        },
        {
            art: "season-tree",
            when: ["skill:art"],
            says: "The leaves turn darker shades of orange.",
        },
        {
            art: "pond",
            when: ["skill:chemistry.states"],
            says: "The pond freezes to ice on cold nights.",
        },
        { art: "fox", when: ["skill:coding"], says: "The fox turns, then runs, then turns again." },
        { art: "owl", when: ["skill:music.rhythm"], says: "The owl hoots in time. Hoo, hoo." },
        { art: "hedgehog", when: ["skill:writing"], says: "Write where the hedgehog sleeps." },
    ],
    offers: {
        landmarks: ["season-tree", "pond", "firs", "tree", "treehouse", "flowers", "log"],
        creatures: ["fox", "owl", "rabbits", "rabbit", "hedgehog", "minibeasts"],
        grounds: ["tang", "mint", "berry"],
        guides: ["snail", "firefly", "dot", "hand"],
        weather: ["clear", "cloudy", "snow", "starry"],
    },
    wants: [
        {
            what: "A squirrel with a store of nuts",
            why: "The creature a child sees in the woods by day, and a hoard of nuts is counting in groups that the firs only stand in for.",
        },
        {
            what: "Conkers and acorns on the path",
            why: "Things to pick up, sort and count on an autumn walk, which the leaves on the ground only suggest.",
        },
    ],
    map: {
        spots: [
            { art: "firs", x: 20, y: -200, k: 0.95 },
            { art: "firs", x: -440, y: 30, k: 1.15 },
            { art: "firs", x: 400, y: -30, k: 1.3 },
            { art: "moon", x: 640, y: -430, k: 0.85, is: "moment" },
            { art: "pond", x: 170, y: 270, k: 0.6 },
            { art: "treehouse", x: -170, y: 400, k: 1.2, is: "gate" },
            { art: "season-tree", x: 470, y: 400, k: 0.95 },
            { art: "mouse", x: -660, y: 440, k: 0.8, is: "secret" },
            { art: "log", x: -420, y: 300, k: 0.7 },
        ],
        stamp: { x: -640, y: -400 },
    },
    chapter: {
        story: "The second year starts somewhere darker: firs, fallen leaves and stepping stones at dusk. The rabbit from the meadow is here with a second one, and the moon gets fuller as the term goes on.",
        moment: { art: "moon", says: "A full moon over the woods.", params: { phase: 1 } },
        secret: { art: "mouse", says: "A mouse's front door in the roots." },
        by: "sea",
        rare: { art: "badger", way: "appear" },
    },
};
