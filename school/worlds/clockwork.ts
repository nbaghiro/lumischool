// The clockwork island: a workshop island in the eastern sea where a great clock is being built, its
// figures waiting behind two doors for the program that sends them out. A place the later coding
// lessons bring a child to in any year.
import type { World } from "./types";

export const clockworkIsland: World = {
    id: "clockwork-island",
    name: "The clockwork island",
    about: "A workshop island on a bright blowy day, its yard strewn with cogs and springs, a signpost that decides which way to go, and a great clock whose figures wait to march out. A place for the later coding lessons, in any year.",
    mood: "a bright blowy workshop",
    arrive: "This is the clockwork island. Hear it tick.",
    light: { ground: "tang", sky: "sky", low: "glow", accent: "tang", wash: 0.75 },
    ground: "workshop",
    path: "cogs",
    horizon: {
        far: [
            { art: "houses", at: 0.12, k: 0.55, params: { count: 2, windows: 2 } },
            { art: "great-clock", at: 0.5, k: 0.6, params: { figures: 0, hour: 4 } },
            { art: "windmill", at: 0.84, k: 0.5 },
        ],
        gate: "great-clock",
    },
    landmarks: ["great-clock", "gears", "signpost", "lamppost"],
    creatures: ["cat", "mouse", "birds"],
    weather: "cloudy",
    seasons: ["spring"],
    guide: "hand",
    reaches: [
        { art: "mouse", when: ["skill:coding.debugging"], says: "A mouse in the works. Fix it." },
        {
            art: "cat",
            when: ["skill:coding.procedures", "skill:coding.decomposition"],
            says: "Teach one trick, then use it twice.",
        },
        {
            art: "birds",
            when: ["skill:coding.algorithms"],
            says: "Sort the birds from small to big.",
        },
        {
            art: "signpost",
            when: ["skill:coding.decisions"],
            says: "Left or right? The sign decides.",
        },
        {
            art: "great-clock",
            when: ["skill:coding.variables"],
            says: "The clock's counter goes up each tick.",
        },
        {
            art: "great-clock",
            when: ["skill:coding.tracing"],
            says: "Follow the clock's steps, one tick each.",
        },
        {
            art: "gears",
            when: ["skill:coding.repetition", "skill:coding.drawing"],
            says: "Each gear turns, again and again.",
        },
    ],
    offers: {
        landmarks: ["great-clock", "gears", "signpost", "lamppost"],
        creatures: ["cat", "mouse", "birds", "dog"],
        grounds: ["tang", "glow"],
        guides: ["hand", "stub", "dot"],
        weather: ["cloudy", "breezy"],
    },
    wants: [
        {
            what: "A marble run",
            why: "A run of chutes and gates that sends a marble one way or the other, which is a program that decides, drawn so a child can trace it.",
        },
        {
            what: "A wind-up key",
            why: "The key that winds the great clock, and a way to count how many turns keep it going for an hour.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the later coding lessons bring a child to, in any year. A path of cog plates crosses a workshop yard to a great clock, whose figures wait behind their doors for a program that works.",
        moment: {
            art: "great-clock",
            says: "The great clock strikes for the first time.",
            params: { figures: 1, hour: 12 },
            before: { figures: 0, hour: 10 },
        },
        secret: { art: "mouse", says: "A mouse asleep inside the clock." },
        by: "sea",
        rare: { art: "airship", way: "sky", from: "left" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "coding-reading-someone-elses",
                "coding-repeat-with-a-count",
                "coding-square-rectangle-staircase",
                "coding-a-picture-with-a-repeat",
                "coding-a-program-that-decides",
                "coding-feeling-for-walls",
                "coding-sorting-cards",
                "coding-fewest-lifts",
                "coding-writing-for-someone-else",
                "coding-a-repeat-inside-a-repeat",
                "coding-debugging-puzzles",
                "coding-keep-going-until",
                "coding-a-number-that-changes",
                "coding-trace-it-in-a-table",
                "coding-a-sorting-network",
                "coding-a-block-of-your-own",
                "coding-a-block-with-a-number",
            ],
            label: "coding, loops and decisions",
            needs: "Lessons on lists and on a program that talks to another, which a fifth year of coding would bring.",
        },
        land: { terrain: "clockwork-island", near: ["sports-ground"] },
    },
    map: {
        spots: [
            { art: "birds", x: 420, y: -40, k: 0.65, is: "life" },
            { art: "houses", x: -500, y: 220, k: 0.7, params: { count: 2, windows: 2 } },
            {
                art: "great-clock",
                x: -30,
                y: 330,
                k: 1.05,
                is: "gate",
                params: { figures: 0, hour: 10 },
            },
            { art: "signpost", x: 470, y: 420, k: 0.65 },
            { art: "mouse", x: 660, y: 440, k: 0.5, is: "secret" },
        ],
        stamp: { x: -640, y: -420 },
        isle: true,
    },
};
