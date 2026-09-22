// The volcano island: the last world of the fourth year and of the map. The island the child has seen
// across the water since the harbour, arrived at by boat: palm trees, a temple built in steps, a
// parrot, a chest of coins and the volcano, under the palette's ember sky. The path is a line of
// lanterns up to the lantern at the top, which is the end of the map. Picked from the term's lessons:
// the temple is a number wall, the chest is found by its grid reference, the volcano is where rock
// melts, and the parrot repeats things, which is where fact and opinion start.
import type { World } from "./types";

export const volcanoIsland: World = {
    id: "volcano-island",
    name: "The volcano island",
    about: "The island seen across the water since the first year: palm trees, a stepped temple, a parrot, a sea turtle and a chest of coins, with the volcano glowing under an orange evening sky. A line of lanterns crosses a rope bridge to the lantern at the top.",
    mood: "a warm evening at the end",
    arrive: "This is the island. Follow the lanterns.",
    light: { ground: "glow", sky: "tang", accent: "berry", wash: 0.72, deep: "ember" },
    ground: "jungle",
    path: "lanterns",
    horizon: {
        far: [
            { art: "palms", at: 0.1, k: 1.15, params: { count: 2, coconuts: 3 } },
            { art: "volcano", at: 0.5, k: 1.75 },
            { art: "temple", at: 0.84, k: 1.3, params: { rows: 4 } },
        ],
        sky: [{ art: "moon", at: 0.93, down: 0.08 }],
        gate: "boat",
    },
    landmarks: ["temple", "chest", "palms", "lantern", "volcano", "rope-bridge"],
    creatures: ["parrot", "crabs", "gull", "sea-turtle"],
    weather: "clear",
    seasons: ["spring", "summer"],
    guide: "firefly",
    reaches: [
        {
            art: "signpost",
            when: ["skill:nature.maps"],
            says: "How far to the temple? Read the signpost.",
        },
        {
            art: "chest",
            when: ["skill:position.coordinates", "skill:geography.grid-references"],
            says: "X marks the spot. Read the grid.",
        },
        { art: "chest", when: ["skill:money"], says: "Count the coins in the chest." },
        {
            art: "temple",
            when: ["skill:reasoning.number-walls"],
            says: "Each stone is the two below added.",
        },
        {
            art: "volcano",
            when: ["skill:data.line-graphs", "art:linegraph"],
            says: "Plot the volcano's heat every day.",
        },
        {
            art: "parrot",
            when: ["skill:reading.fact-opinion"],
            says: "Parrots repeat things. Fact or opinion?",
        },
        {
            art: "lantern",
            when: ["skill:physics.light", "skill:art.tone"],
            says: "Lantern light makes a shadow behind.",
        },
        {
            art: "crabs",
            when: ["skill:coding.algorithms", "skill:coding.procedures"],
            says: "Sort the crabs from smallest to biggest.",
        },
        {
            art: "palms",
            when: ["skill:art.pattern"],
            says: "Palm leaves repeat like a printed pattern.",
        },
        {
            art: "sea-turtle",
            when: ["skill:reading.inference"],
            says: "Where has the turtle been? Look for clues.",
        },
        {
            art: "chest",
            when: ["skill:writing.directions", "skill:writing.letters"],
            says: "Write the way to the chest.",
        },
        {
            art: "chest",
            when: ["skill:chemistry.rusting"],
            says: "The chest's iron hinges have rusted.",
        },
        { art: "crabs", when: ["skill:chemistry.acids"], says: "Sea water is a little alkaline." },
        {
            art: "temple",
            when: ["skill:chemistry.atoms"],
            says: "Stone, like everything, is made of atoms.",
        },
        {
            art: "palms",
            when: ["skill:physics.sky", "art:globe", "art:planets"],
            says: "The sun sets as the island turns.",
        },
        { art: "temple", when: ["skill:music"], says: "Drums at the temple keep the beat." },
    ],
    offers: {
        landmarks: ["temple", "chest", "palms", "lantern", "volcano", "signpost", "rope-bridge"],
        creatures: ["parrot", "crabs", "gull", "crab", "sea-turtle"],
        grounds: ["glow", "tang", "berry"],
        guides: ["firefly", "glow", "snail", "dot"],
        weather: ["clear", "starry", "breezy"],
    },
    wants: [
        {
            what: "A waterfall down the rocks",
            why: "Water falling into a pool would give the island a sound of its own and a place to rest near the end of the path.",
        },
        {
            what: "A hammock between the palms",
            why: "Somewhere to lie at the end of the whole map, which the lanterns lead to but the island does not offer yet.",
        },
    ],
    map: {
        spots: [
            { art: "volcano", x: 20, y: -30, k: 1.7 },
            { art: "lantern", x: 230, y: -270, k: 0.55, is: "moment", params: { lit: 0, post: 1 } },
            { art: "palms", x: -450, y: 230, k: 0.95 },
            { art: "palms", x: 480, y: 170, k: 0.85, flip: true },
            { art: "temple", x: 380, y: 390, k: 0.85 },
            { art: "chest", x: -120, y: 410, k: 0.75 },
            { art: "parrot", x: 630, y: -60, k: 0.55 },
            { art: "crabs", x: 170, y: 480, k: 0.5 },
            { art: "boat", x: -470, y: 460, k: 0.6, is: "gate" },
            { art: "owl", x: 650, y: 440, k: 0.6, is: "secret" },
            { art: "rope-bridge", x: -230, y: 110, k: 0.6 },
            { art: "sea-turtle", x: -270, y: 470, k: 0.45 },
        ],
        stamp: { x: -660, y: -420 },
        isle: true,
        promise: true,
        ownLamp: true,
    },
    chapter: {
        story: "The end of the map. The island has been on the horizon since the harbour in the first year, and the path is a line of lanterns up to one at the top that has not been lit yet.",
        moment: {
            art: "lantern",
            says: "The lantern at the top is lit.",
            params: { lit: 1, post: 1 },
        },
        secret: { art: "owl", says: "The owl from the woods, here too." },
        by: "sea",
        rare: { art: "owl-flying", way: "sky", from: "left" },
    },
};
