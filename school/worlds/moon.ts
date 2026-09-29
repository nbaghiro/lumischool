// The moon: the last world of a sixth year and of the map. Its place on the map is the launch pad at
// the top of the sixth year's land, where the rocket waits; the world itself is on the moon, reached
// by air the way the cloud islands are reached by the balloon. A grey plain with the lander, the
// rocket, a crater and a flag, and the Earth low over the edge. Nothing lives there, and the guide is
// the only one who moves. The Earth stays put in the sky of a lander on the moon, which always turns
// the same face to it, so the moment is the Earthrise seen from orbit, as Apollo 8 saw it.
import type { World } from "./types";

export const moon: World = {
    id: "moon",
    name: "The moon",
    about: "The moon's grey plain, with a lunar lander, the rocket that came up from the launch pad, a crater and a flag, and the Earth hanging still, low over the edge. Nothing lives there, so the guide is the only one who moves. The last world of a sixth year, and the end of the map.",
    mood: "a quiet grey plain",
    arrive: "This is the moon. Step down slowly.",
    light: { ground: "sky", sky: "sky", accent: "glow", wash: 0.6, deep: "night" },
    ground: "regolith",
    path: "treads",
    horizon: {
        far: [
            { art: "crater", at: 0.16, k: 1.2, params: { count: 2 } },
            { art: "lander", at: 0.5, k: 1.3 },
            { art: "earth", at: 0.68, k: 1.2 },
            { art: "flag", at: 0.86, k: 1 },
        ],
        gate: "rocket",
    },
    landmarks: ["lander", "rocket", "crater", "flag"],
    creatures: [],
    weather: "starry",
    seasons: ["summer"],
    guide: "glow",
    reaches: [
        {
            art: "lander",
            when: ["skill:shapes.symmetry"],
            says: "Is the lander the same on both sides?",
        },
        { art: "crater", when: ["skill:data"], says: "Count the craters by their size." },
        {
            art: "lander",
            when: ["skill:chemistry.gases"],
            says: "The lander carries the air the crew breathe.",
        },
        { art: "crater", when: ["skill:circles"], says: "How far is it across the crater?" },
        {
            art: "lander",
            when: ["skill:algebra.equations"],
            says: "Find the missing rung on the ladder.",
        },
        { art: "earth", when: ["skill:scale"], says: "How big is the Earth from here?" },
        { art: "flag", when: ["skill:position"], says: "Plot the flag on the grid." },
        {
            art: "rocket",
            when: ["skill:counting", "skill:probability"],
            says: "Who flies first? Count the ways.",
        },
        {
            art: "rocket",
            when: ["skill:chemistry.burning"],
            says: "A rocket carries its own oxygen to burn.",
        },
        {
            art: "earth",
            when: ["skill:physics.sky"],
            says: "The Earth has phases, as the moon does.",
        },
        {
            art: "lander",
            when: ["skill:physics.forces", "skill:physics.weight"],
            says: "Everything falls more slowly here.",
        },
        { art: "lander", when: ["subject:coding"], says: "Steer the lander down step by step." },
        { art: "earth", when: ["skill:art"], says: "Paint the Earth over the moon's edge." },
        { art: "earth", when: ["subject:nature"], says: "Everything alive is back on the Earth." },
        {
            art: "flag",
            when: ["subject:reading", "subject:writing"],
            says: "A flag stands where people first walked.",
        },
        { art: "lander", when: ["art:lander"], says: "The lander rests on its feet in the dust." },
    ],
    offers: {
        landmarks: ["lander", "rocket", "crater", "flag", "earth"],
        creatures: [],
        grounds: ["sky", "glow"],
        guides: ["glow", "dot", "firefly"],
        weather: ["starry", "clear"],
    },
    wants: [
        {
            what: "A moon buggy",
            why: "The rover whose tracks the path follows, parked beside the lander, which the scale lessons could measure and the coding lessons could drive.",
        },
        {
            what: "The Earth's phases",
            why: "The Earth seen from the moon as a crescent, a half and a full disc, which the physics lesson on phases and eclipses would turn through.",
        },
    ],
    map: {
        spots: [
            {
                art: "launch-pad",
                x: 40,
                y: 20,
                k: 1.05,
                is: "gate",
                params: { rocket: 1, lights: 2 },
            },
            { art: "moon", x: -440, y: -420, k: 0.7 },
            { art: "flag", x: -470, y: 330, k: 0.6 },
            { art: "footprints", x: 620, y: 440, k: 0.5, is: "secret" },
        ],
        stamp: { x: -660, y: -360 },
        promise: true,
    },
    chapter: {
        story: "The end of the map. The rocket goes up from the launch pad at the top of the sixth year's land and comes down on the moon's grey plain beside the lander, where nothing lives and the Earth hangs still, low over the edge, all month. Only when the lander lifts off and circles the moon for home does the Earth rise.",
        moment: {
            art: "earth",
            says: "Back in orbit, the Earth rises over the moon.",
            params: { up: 2 },
            before: { up: 0 },
        },
        secret: { art: "footprints", says: "A footprint that is not the guide's." },
        by: "air",
        rare: { art: "comet", way: "streak", from: "right" },
    },
    site: {
        kind: "term",
        grade: 6,
        term: 3,
        land: { terrain: "launch-pad", near: ["waterfall-gorge"] },
    },
};
