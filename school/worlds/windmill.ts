// The windmill island: a green island far out in the eastern sea, where the wind turns a windmill that
// grinds, lifts and lights the lamps along its pier. A place the lessons on electricity, magnets and
// machines bring a child to in any year.
import type { World } from "./types";

export const windmillIsland: World = {
    id: "windmill-island",
    name: "The windmill island",
    about: "A windswept green island in summer, short grass full of daisies and sheep, a fence along the path, gears and a see-saw by the mill, and a windmill that will light the lamps along the pier. A place for the lessons on electricity, magnets and machines, in any year.",
    mood: "a windy summer day",
    arrive: "This is the windmill island. Feel the wind.",
    light: { ground: "mint", sky: "sky", low: "sky", accent: "glow", wash: 0.8 },
    ground: "machair",
    path: "fence",
    horizon: {
        far: [
            { art: "sheep", at: 0.14, k: 0.6, params: { count: 2 } },
            { art: "windmill", at: 0.46, k: 0.65 },
            { art: "yachts", at: 0.8, k: 0.5, sink: 30 },
        ],
        gate: "windmill",
    },
    landmarks: ["windmill", "lamppost", "magnet", "gears", "balance", "sheep"],
    creatures: ["hares", "gull", "rabbit"],
    weather: "breezy",
    seasons: ["summer"],
    guide: "firefly",
    reaches: [
        {
            art: "windmill",
            when: ["skill:physics.energy", "art:turbine"],
            says: "The wind turns the sails. Lamps glow.",
        },
        {
            art: "lamppost",
            when: ["skill:physics.circuits"],
            says: "A closed loop lights the lamp.",
        },
        {
            art: "magnet",
            when: ["skill:physics.magnets"],
            says: "A magnet pulls the iron, not the wood.",
        },
        {
            art: "gears",
            when: ["skill:physics.machines"],
            says: "Big gear, small gear: which turns faster?",
        },
        {
            art: "sheep",
            when: ["skill:physics.method"],
            says: "Change one thing only. Keep the rest.",
        },
        {
            art: "balance",
            when: ["skill:physics.moments"],
            says: "Balance the see-saw: far is stronger.",
        },
    ],
    offers: {
        landmarks: ["windmill", "lamppost", "magnet", "gears", "balance", "sheep"],
        creatures: ["hares", "gull", "rabbit"],
        grounds: ["mint", "sky"],
        guides: ["firefly", "bird", "glow"],
        weather: ["breezy", "clear"],
    },
    wants: [
        {
            what: "A wind turbine on the hill",
            why: "The windmill's modern cousin, making electricity for the lamps, which is the brighter and dimmer lesson's own picture.",
        },
        {
            what: "A lever and a heavy stone",
            why: "A stone lifted with a long bar, which is the lever lesson seen outdoors rather than on a bench.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the lessons on electricity, magnets and machines bring a child to, in any year. A fenced path crosses the short grass to a windmill, and the lamps along the pier wait for it to light them.",
        moment: {
            art: "lamppost",
            says: "The windmill lights the lamps along the pier.",
            params: { lit: 1, letterbox: 0 },
        },
        secret: { art: "rabbit", says: "A rabbit asleep by the mill door." },
        by: "sea",
        rare: { art: "yachts", way: "horizon", from: "left", k: 0.6 },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "physics-a-circuit-that-works",
                "physics-magnets",
                "physics-how-strong-a-magnet",
                "physics-what-lets-electricity-through",
                "physics-a-loop-with-a-break",
                "physics-brighter-and-dimmer",
                "physics-the-see-saw-rule",
                "physics-a-fair-test",
                "physics-levers-and-wheels",
                "physics-pulleys-and-gears",
                "physics-puzzles-3",
                "physics-year-review-3",
                "physics-year-review-4",
            ],
            label: "electricity, magnets and machines",
            needs: "Earlier lessons on what makes things move and light up at home, for the first two years, which the physics track has not written yet.",
        },
        land: { terrain: "windmill-island", near: ["night-sky"] },
    },
    map: {
        spots: [
            { art: "gull-flying", x: 420, y: -330, k: 0.55, is: "life" },
            {
                art: "sheep",
                x: -500,
                y: 160,
                k: 0.65,
                params: { kind: "sheep", count: 2, label: "" },
            },
            { art: "windmill", x: -60, y: 340, k: 1.05, is: "gate" },
            {
                art: "lamppost",
                x: 380,
                y: 420,
                k: 0.75,
                is: "moment",
                params: { lit: 0, letterbox: 0 },
            },
            { art: "cottage", x: -500, y: 430, k: 0.6, params: { windows: 2, lit: 0 } },
            { art: "rabbit", x: 660, y: 440, k: 0.5, is: "secret" },
        ],
        stamp: { x: -640, y: -420 },
        isle: true,
    },
};
