// The waterfall gorge: the second world of a sixth year, up by path from the ice shelf's shore into
// the hills. A deep green gorge with a waterfall, rainbows in its spray, a rope bridge over the pool
// and a water wheel below that turns the mill.
import type { World } from "./types";

export const waterfallGorge: World = {
    id: "waterfall-gorge",
    name: "The waterfall gorge",
    about: "A deep green gorge in the hills of the far north, with a waterfall falling into a pool, rainbows in the spray, a rope bridge, and a water wheel that turns the mill below. A kingfisher, a heron, fish in the pool and a dipper live along the stream. The second world of a sixth year.",
    mood: "a cool summer day by the falls",
    arrive: "This is the gorge. Listen to the water.",
    light: { ground: "mint", sky: "sky", low: "mint", accent: "sky", wash: 0.8 },
    ground: "gorge",
    path: "steps",
    horizon: {
        far: [
            { art: "waterfall", at: 0.18, k: 1.4 },
            { art: "water-wheel", at: 0.5, k: 1.1, params: { paddles: 8, lit: 0 } },
            { art: "launch-pad", at: 0.68, k: 0.3, params: { rocket: 1, lights: 0 } },
            { art: "mill", at: 0.86, k: 0.9 },
        ],
        gate: "signpost",
    },
    landmarks: ["waterfall", "water-wheel", "rope-bridge", "mill"],
    creatures: ["kingfisher", "heron", "fish-shoal", "dipper"],
    weather: "mist",
    seasons: ["summer", "autumn"],
    guide: "snail",
    reaches: [
        {
            art: "rope-bridge",
            when: ["skill:rates.speed", "skill:rates.distance-time", "art:ropebridge"],
            says: "How long to cross the bridge?",
        },
        {
            art: "water-wheel",
            when: ["subject:physics", "art:waterwheel"],
            says: "The falling water turns the wheel.",
        },
        {
            art: "waterfall",
            when: ["skill:volume", "skill:coding.simulation"],
            says: "How much water fills the pool?",
        },
        {
            art: "mill",
            when: ["skill:algebra.equations"],
            says: "Sacks of flour balance at the mill.",
        },
        {
            art: "signpost",
            when: ["skill:percentages"],
            says: "The walk's ticket went up. By what percent?",
        },
        {
            art: "waterfall",
            when: ["skill:chemistry.rocks"],
            says: "The river cut this gorge through the rock.",
        },
        {
            art: "waterfall",
            when: ["skill:chemistry.water-cycle", "skill:chemistry.gases"],
            says: "Spray rises as mist and cools to drops.",
        },
        {
            art: "waterfall",
            when: ["skill:chemistry.acids"],
            says: "Test the river water: acid or alkali?",
        },
        { art: "waterfall", when: ["skill:art"], says: "Paint the spray where the water falls." },
        {
            art: "heron",
            when: ["skill:nature.food-webs", "skill:nature.populations"],
            says: "The heron waits for fish in the pool.",
        },
        {
            art: "kingfisher",
            when: ["skill:nature.circulation", "art:kingfisher"],
            says: "The kingfisher dives for a fish.",
        },
        {
            art: "signpost",
            when: ["skill:reading", "skill:writing"],
            says: "Read the signpost: which way to the mill?",
        },
    ],
    offers: {
        landmarks: ["waterfall", "water-wheel", "rope-bridge", "mill", "signpost"],
        creatures: ["kingfisher", "heron", "fish-shoal", "dipper"],
        grounds: ["mint", "sky"],
        guides: ["snail", "bird", "stub"],
        weather: ["mist", "clear", "rain", "cloudy"],
    },
    wants: [
        {
            what: "Salmon leaping up the falls",
            why: "Fish jumping the steps of the waterfall one after another, which would give the gorge a moving creature and the speed lessons something to time.",
        },
        {
            what: "Layers of rock in the gorge's walls",
            why: "The bands a river cuts through, drawn plainly enough to count, which the rock cycle lesson in this term would point at.",
        },
    ],
    map: {
        spots: [
            { art: "waterfall", x: -260, y: -60, k: 1.1 },
            {
                art: "water-wheel",
                x: 330,
                y: 40,
                k: 0.85,
                is: "moment",
                params: { paddles: 8, lit: 0 },
            },
            { art: "rope-bridge", x: -60, y: 330, k: 0.55 },
            { art: "signpost", x: 200, y: 420, k: 0.65, is: "gate" },
            { art: "heron", x: 640, y: 360, k: 0.5 },
            { art: "dipper", x: -640, y: 440, k: 0.5, is: "secret" },
        ],
        stamp: { x: -660, y: -400 },
    },
    chapter: {
        story: "Up from the ice shelf's shore into the hills, where a waterfall drops into a deep green gorge with rainbows in its spray. Below the pool a water wheel turns the mill, and from the top of the gorge the rocket can be seen on its pad.",
        moment: {
            art: "water-wheel",
            says: "The wheel turns and the mill's lamps come on.",
            params: { paddles: 8, lit: 1 },
            before: { paddles: 8, lit: 0 },
        },
        secret: { art: "dipper", says: "A dipper walking under the water." },
        glimpse: { world: "moon", art: "launch-pad" },
        by: "path",
        rare: { art: "kingfisher-flying", way: "streak", from: "left" },
    },
    site: {
        kind: "term",
        grade: 6,
        term: 2,
        land: { terrain: "gorge", near: ["midnight-sun", "moon"] },
    },
};
