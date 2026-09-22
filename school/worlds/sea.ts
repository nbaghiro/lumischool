// The open sea: the middle of the fourth year, in winter. A tall ship in a storm, icebergs, a whale
// and a line of buoys to follow across the water, under a sky that is dark from the palette's storm.
// On the horizon, very small, is the harbour's lighthouse from the first year, and at the edge of the
// sky an island with smoke going up from it, which is where the year ends. Picked from the term's
// lessons: turning through angles is steering by the compass, an iceberg is a tenth above the water,
// and the see-saw rule is loading a ship so it does not tip.
import type { World } from "./types";

export const openSea: World = {
    id: "open-sea",
    name: "The open sea",
    about: "A tall ship in a winter storm, icebergs, a whale, dolphins alongside and a line of buoys to follow across the water. Far off is the harbour's lighthouse from the first year, and an island with smoke coming off it.",
    mood: "a stormy winter crossing",
    arrive: "This is the open sea. Hold on tight.",
    light: { ground: "mint", sky: "sky", accent: "tang", wash: 0.8, deep: "storm" },
    ground: "sea",
    path: "buoys",
    horizon: {
        far: [
            { art: "lighthouse", at: 0.08, k: 0.55, sink: 16 },
            { art: "iceberg", at: 0.3, k: 1.6, sink: 40, params: { under: 0 } },
            { art: "island", at: 0.6, k: 0.85, sink: 26 },
            { art: "whale", at: 0.84, k: 1.5, sink: 70 },
        ],
        sky: [
            { art: "gull-flying", at: 0.44, down: 0.4, k: 1.3 },
            { art: "gull-flying", at: 0.52, down: 0.5 },
        ],
        gate: "ship",
    },
    landmarks: ["compass", "iceberg", "lighthouse", "chest", "ship-wheel", "bottle"],
    creatures: ["whale", "dolphins", "gull-flying", "gull"],
    weather: "rain",
    seasons: ["winter"],
    guide: "glow",
    reaches: [
        {
            art: "whale",
            when: ["skill:nature.food-webs", "skill:nature.habitats"],
            says: "The whale eats the sea's smallest things.",
        },
        { art: "compass", when: ["skill:angles"], says: "Turn the ship through a right angle." },
        {
            art: "iceberg",
            when: ["skill:decimals", "skill:percentages", "skill:fractions"],
            says: "Only a tenth of an iceberg shows.",
        },
        {
            art: "ship-wheel",
            when: ["skill:physics.machines", "skill:physics.method"],
            says: "One turn of the wheel at a time.",
        },
        { art: "ship", when: ["skill:physics.moments"], says: "Load the ship evenly or it tips." },
        {
            art: "lighthouse",
            when: ["skill:coding.repetition", "skill:coding.debugging", "skill:coding.variables"],
            says: "The lamp repeats its flash all night.",
        },
        {
            art: "whale",
            when: ["skill:reading.inference", "art:passage"],
            says: "The whale is listening to the story.",
        },
        {
            art: "chest",
            when: ["skill:money", "skill:area"],
            says: "Count the cargo before it is sold.",
        },
        {
            art: "ship",
            when: ["skill:art.tone"],
            says: "Pale sails against the dark storm.",
        },
        {
            art: "compass",
            when: ["skill:art.symmetry"],
            says: "The compass rose matches on every side.",
        },
        {
            art: "iceberg",
            when: ["skill:chemistry.states"],
            says: "Ice melts back into the sea at zero.",
        },
        {
            art: "chest",
            when: ["skill:chemistry.separating"],
            says: "Pick the coins out of the wet sand.",
        },
        {
            art: "ship",
            when: ["skill:chemistry.changes"],
            says: "Salt water rusts the anchor chain.",
        },
        {
            art: "ship",
            when: ["skill:writing.joining-sentences", "skill:reasoning.cause-and-effect"],
            says: "The storm came, so the ship turned back.",
        },
        { art: "ship", when: ["skill:music"], says: "The sailors sing as they haul the rope." },
    ],
    offers: {
        landmarks: ["compass", "iceberg", "lighthouse", "chest", "ship", "boat", "ship-wheel"],
        creatures: ["whale", "gull-flying", "gull", "crab", "dolphins"],
        grounds: ["mint", "sky", "berry"],
        guides: ["glow", "bird", "dot", "stub"],
        weather: ["rain", "breezy", "cloudy", "clear"],
    },
    wants: [],
    map: {
        spots: [
            { art: "iceberg", x: -470, y: 130, k: 1 },
            { art: "ship", x: 10, y: 250, k: 1.2, is: "gate" },
            { art: "whale", x: 480, y: 320, k: 1.1 },
            { art: "gull-flying", x: 430, y: -380, k: 0.8, is: "life" },
            { art: "lighthouse", x: -660, y: -120, k: 0.42 },
            { art: "crab", x: -640, y: 440, k: 0.7, is: "secret" },
            { art: "dolphins", x: -300, y: 390, k: 0.7 },
        ],
        decor: "storm",
        stamp: { x: -620, y: -520 },
    },
    chapter: {
        story: "The crossing. A storm the whole way, the lighthouse from the first year going by very small, and the island with the smoking volcano getting nearer on the horizon.",
        moment: { art: "ship", says: "The storm is over. Land ahead." },
        secret: { art: "crab", says: "A crab riding along on a buoy." },
        glimpse: { world: "volcano-island", art: "island" },
        by: "river",
        rare: { art: "albatross", way: "sky", from: "right" },
    },
};
