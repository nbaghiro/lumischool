// The railway: an embankment of ballast, the path as a pair of rails with sleepers, a train along
// the horizon and a station to arrive at. The journeys shelf carries it (the train, the sidings, the
// departure board, the suitcases and the signpost are all drawn), the birds on a wire are at home on
// the line side, and the station and the fox it was missing are drawn now.
import type { World } from "./types";

export const railway: World = {
    id: "railway",
    name: "The railway",
    about: "An embankment, rails for a path, a train along the top and a station to arrive at, its clock under the canopy, with a signal at the level crossing. The busiest of the three, with a fox on the bank.",
    mood: "a cloudy day on the line",
    arrive: "This is the railway. Mind the gap.",
    light: { ground: "berry", sky: "sky", accent: "berry", wash: 0.7 },
    ground: "yard",
    path: "rails",
    horizon: {
        far: [{ art: "train", at: 0.56, k: 1.1 }],
        gate: "station",
    },
    landmarks: ["departures", "suitcases", "signpost", "sidings", "rail-signal", "bicycle"],
    creatures: ["birds", "fox", "cat"],
    weather: "cloudy",
    seasons: ["spring", "summer"],
    guide: "glow",
    reaches: [
        {
            art: "birds",
            when: ["art:birdrow", "skill:data.tally"],
            says: "Count the birds on the wire.",
        },
        {
            art: "station",
            when: ["skill:time", "art:clock"],
            says: "The station clock tells the time.",
        },
        {
            art: "signpost",
            when: ["skill:reading.find-a-detail", "art:street", "art:roaddistances"],
            says: "Read the signpost. Which way to Bray?",
        },
        { art: "suitcases", when: ["skill:writing.lists"], says: "Write a list of what to pack." },
        { art: "sidings", when: ["skill:patterns"], says: "Trucks in a row make a pattern." },
        { art: "bus", when: ["art:bus"], says: "Count who gets on the bus." },
        {
            art: "bicycle",
            when: ["skill:art.shape", "skill:art.line"],
            says: "Circles and lines make a bicycle.",
        },
        {
            art: "train",
            when: ["skill:chemistry.states"],
            says: "Steam from the engine is water as gas.",
        },
        {
            art: "train",
            when: ["skill:physics.sky", "art:moonphases", "art:sunpath"],
            says: "The last train runs under the moon.",
        },
        {
            art: "rail-signal",
            when: ["skill:coding", "skill:physics.light"],
            says: "The signal changes, then the train goes.",
        },
        {
            art: "train",
            when: ["skill:music", "skill:physics.sound"],
            says: "Hear the rails hum as the train comes.",
        },
        {
            art: "departures",
            when: ["skill:reading.sentence-meaning"],
            says: "Read the board. Where does it go?",
        },
        {
            art: "station",
            when: ["skill:writing.labels"],
            says: "Label the station: clock, door, platform.",
        },
        {
            art: "train",
            when: ["skill:writing.sentences"],
            says: "Write a sentence about the train.",
        },
    ],
    offers: {
        landmarks: [
            "departures",
            "suitcases",
            "sidings",
            "bus",
            "bicycle",
            "signpost",
            "station",
            "rail-signal",
            "train",
        ],
        creatures: ["birds", "fox", "cat", "hen"],
        grounds: ["berry", "tang", "mint"],
        guides: ["glow", "stub", "hand", "firefly"],
        weather: ["clear", "cloudy", "breezy", "rain"],
    },
    wants: [
        {
            what: "A tunnel mouth in the embankment",
            why: "Somewhere for the path to go into and come out of, which is the one thing a railway does that no other world's path can.",
        },
        {
            what: "A footbridge over the line",
            why: "Steps up, across and down again would let the path cross the rails the way a real station makes you, with the clock to look down on.",
        },
    ],
    map: {
        spots: [
            { art: "birds", x: 280, y: -300, k: 0.8 },
            { art: "station", x: -290, y: 330, k: 1.25, is: "gate" },
            {
                art: "train",
                x: 520,
                y: -150,
                k: 0.4,
                is: "moment",
                after: { x: 290, y: 330, k: 0.6 },
            },
            { art: "signpost", x: -600, y: 80, k: 0.75 },
            { art: "suitcases", x: 40, y: 410, k: 0.65 },
            { art: "departures", x: 610, y: 420, k: 0.5 },
            { art: "hedgehog", x: 660, y: 440, k: 0.7, is: "secret" },
            { art: "rail-signal", x: 40, y: 120, k: 0.7 },
        ],
        decor: "rails",
        stamp: { x: -620, y: -320 },
    },
    chapter: {
        story: "The way out of the first year: rails on sleepers, a station with a clock, suitcases and a fox by the embankment, and a train on the horizon that waits there all term.",
        moment: { art: "train", says: "The train pulls in. All aboard." },
        secret: { art: "hedgehog", says: "A hedgehog asleep under the sleepers." },
        by: "rails",
        rare: { art: "goods-train", way: "horizon", from: "left" },
    },
};
