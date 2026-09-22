// The farm: a green valley under the mountains on an early morning, which a family can choose for
// the first term of the first year or the last of the second instead of the term's own world. The
// fields climb the hillsides either side, a farm track runs between them, and a field of crops beside
// the path grows through the term from shoots to harvest.
import type { World } from "./types";

export const valleyFarm: World = {
    id: "valley-farm",
    name: "The farm",
    about: "A farm in a green valley under the mountains: fields climbing the hillsides, a farm track with grass down its middle, hens, pigs and cows, a field of crops that grows through the term, and a red barn whose loft fills at harvest. A family can choose it for the first term of year one or the last of year two.",
    mood: "an early morning in the valley",
    arrive: "This is the farm. Everyone is up early.",
    light: { ground: "mint", sky: "sky", low: "glow", accent: "tang", wash: 0.8 },
    ground: "furrows",
    path: "ruts",
    horizon: {
        far: [
            { art: "windmill", at: 0.2, k: 0.8, sink: -64 },
            { art: "peaks", at: 0.5, k: 0.6, params: { count: 3, snow: 1 } },
            { art: "cows", at: 0.74, k: 0.85, sink: -60 },
            { art: "sheep", at: 0.9, k: 0.7, sink: -112 },
        ],
        sky: [{ art: "sun", at: 0.36, down: 0.5, k: 0.85 }],
        gate: "barn",
    },
    landmarks: ["crops", "hay-cart", "wheelbarrow", "pond", "windmill"],
    creatures: ["hen", "pigs", "cows", "dog"],
    weather: "clear",
    seasons: ["spring", "summer", "autumn"],
    guide: "stub",
    reaches: [
        {
            art: "hay-cart",
            when: ["skill:mass", "skill:measure.scales"],
            says: "Weigh the bales in kilograms.",
        },
        { art: "barn", when: ["skill:money"], says: "Sell the eggs at the barn door." },
        { art: "windmill", when: ["skill:time"], says: "The sails turn a quarter at a time." },
        { art: "cows", when: ["skill:chance"], says: "Will the calf be black or brown?" },
        {
            art: "pond",
            when: ["skill:chemistry.dissolving"],
            says: "Does the mud dissolve in the pond?",
        },
        {
            art: "pigs",
            when: ["skill:chemistry.changes"],
            says: "Mud dries hard, then softens in the rain.",
        },
        {
            art: "hen",
            when: ["skill:counting", "skill:bonds-to-10", "skill:addition"],
            says: "Count the eggs in the hen house.",
        },
        { art: "pigs", when: ["skill:subtraction"], says: "Three pigs trot off. How many stay?" },
        { art: "crops", when: ["skill:place-value"], says: "Rows of ten plants. Count in tens." },
        {
            art: "windmill",
            when: ["skill:physics.forces", "skill:science.forces"],
            says: "The wind pushes the sails round.",
        },
        {
            art: "wheelbarrow",
            when: ["skill:physics.weight"],
            says: "Which barrow is heavier to push?",
        },
        { art: "tractor", when: ["skill:coding"], says: "Drive the tractor row by row." },
        {
            art: "tractor",
            when: ["skill:physics.motion"],
            says: "How far does the tractor go each hour?",
        },
        {
            art: "pond",
            when: ["skill:physics.light"],
            says: "The pond shows the barn upside down.",
        },
        { art: "farm-sign", when: ["skill:reading"], says: "Read the sign by the gate." },
        { art: "dog", when: ["skill:writing"], says: "Write about what the dog did." },
        { art: "duck", when: ["skill:music"], says: "The ducks quack high and low." },
        { art: "crops", when: ["skill:art"], says: "Rows of crops make a pattern." },
        { art: "barn", when: ["skill:chemistry.rocks"], says: "The barn wall is built of stone." },
        {
            art: "barn",
            when: ["skill:chemistry.materials"],
            says: "The barn is wood. The roof is metal.",
        },
    ],
    offers: {
        landmarks: [
            "crops",
            "hay-cart",
            "wheelbarrow",
            "pond",
            "windmill",
            "tractor",
            "barn",
            "sheep",
            "farm-sign",
        ],
        creatures: ["hen", "pigs", "cows", "dog", "cat", "duck"],
        grounds: ["mint", "glow"],
        guides: ["stub", "hand", "snail"],
        weather: ["clear", "cloudy", "breezy", "rain"],
    },
    wants: [
        {
            what: "Milk churns in a row",
            why: "The farm's capacity picture, churns of different sizes with a level on each, which the cows' reach points at and cannot yet show.",
        },
        {
            what: "A scarecrow",
            why: "Someone standing in the field all term with its arms out, which would be the farm's figure against the sky and something to count birds round.",
        },
    ],
    map: {
        spots: [
            { art: "windmill", x: -480, y: -40, k: 0.9 },
            { art: "cows", x: 430, y: 60, k: 0.8 },
            { art: "pond", x: 180, y: -240, k: 0.5 },
            { art: "barn", x: -60, y: 340, k: 1.3, is: "gate", params: { windows: 2, hay: 0 } },
            { art: "crops", x: 380, y: 380, k: 0.75 },
            { art: "tractor", x: -470, y: 430, k: 0.7, is: "life" },
            { art: "rabbit", x: 660, y: 440, k: 0.55, is: "secret" },
        ],
        stamp: { x: -640, y: -400 },
    },
    chapter: {
        story: "A term on a farm, chosen by the family instead of the term's own world: a valley under the mountains where the crop beside the path comes up, ripens and is cut as the term goes on, and the barn's loft stands empty until the harvest is in.",
        moment: {
            art: "barn",
            says: "The harvest is in the barn.",
            params: { windows: 2, hay: 1 },
            before: { windows: 2, hay: 0 },
        },
        secret: { art: "rabbit", says: "A hare in the long corn." },
        by: "road",
        rare: { art: "tractor", way: "horizon", from: "left" },
    },
    site: {
        kind: "choice",
        terms: [
            { grade: 1, term: 1 },
            { grade: 2, term: 3 },
        ],
        land: { terrain: "valley", near: ["meadow", "town", "mountains"] },
    },
};
