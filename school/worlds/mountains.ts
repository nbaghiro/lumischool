// The mountains: the first world of the fourth year, at the turn of autumn into winter. Peaks in snow
// along the horizon, a tent pitched for the night, an eagle over the valley and a trail of bootprints
// climbing through the snow. It is the first world where the child is somewhere a little dangerous,
// which is what a nine year old wants from a map, and it is picked from the term's lessons: numbers
// up to a million are heights, negative numbers are the temperature at the top, and long division is
// sharing out the climbers between the tents.
import type { World } from "./types";

export const mountains: World = {
    id: "mountains",
    name: "The mountains",
    about: "Peaks in snow, a tent pitched for the night, a cable car across the valley, an eagle over it and a trail of bootprints climbing in zigzags. Cold enough at the top for the thermometer to go below zero.",
    mood: "a cold bright climb",
    arrive: "These are the mountains. Keep climbing.",
    light: { ground: "sky", sky: "sky", accent: "berry", wash: 0.62 },
    ground: "snow",
    path: "prints",
    horizon: {
        far: [
            { art: "peaks", at: 0.18, k: 1.25, params: { count: 3, snow: 1 } },
            { art: "snowy-firs", at: 0.46, k: 0.8, params: { count: 3, snow: 1 } },
            { art: "peaks", at: 0.8, k: 1.7, params: { count: 4, snow: 1 } },
        ],
        sky: [{ art: "eagle", at: 0.5, down: 0.36 }],
        gate: "tent",
    },
    landmarks: ["frost-thermometer", "snowy-firs", "summit", "signpost", "cable-car"],
    creatures: ["hares", "fox", "perched-eagle"],
    weather: "snow",
    seasons: ["autumn", "winter"],
    guide: "bird",
    reaches: [
        {
            art: "perched-eagle",
            when: ["skill:nature.sorting", "skill:nature.life-cycles"],
            says: "Feathers and an egg: a bird.",
        },
        {
            art: "frost-thermometer",
            when: ["skill:number.negatives", "skill:chemistry.states"],
            says: "Up here it goes below zero.",
        },
        {
            art: "summit",
            when: ["skill:place-value.rounding"],
            says: "This peak is 4,478 metres. Round it.",
        },
        {
            art: "tent",
            when: ["skill:division"],
            says: "Share twelve climbers between three tents.",
        },
        {
            art: "cable-car",
            when: ["skill:number.multiples"],
            says: "Cars on the wire at equal gaps.",
        },
        {
            art: "perched-eagle",
            when: ["skill:physics.forces", "skill:physics.floating"],
            says: "The eagle glides. The air holds it up.",
        },
        { art: "summit", when: ["skill:art"], says: "Paint the snow: much white, a little blue." },
        {
            art: "cable-car",
            when: ["skill:coding"],
            says: "The cable car repeats: up, stop, down.",
        },
        {
            art: "tent",
            when: ["skill:physics.circuits"],
            says: "Two batteries make the tent lamp brighter.",
        },
        {
            art: "hares",
            when: ["skill:reading.vocabulary", "skill:reading.morphology"],
            says: "Fast, faster, fastest. The hares race.",
        },
        { art: "tent", when: ["skill:writing"], says: "Grow the sentence: we pitched the tent." },
        {
            art: "frost-thermometer",
            when: ["skill:chemistry.method", "skill:chemistry.materials"],
            says: "Test it fairly, one test at a time.",
        },
        {
            art: "cable-car",
            when: ["skill:physics.rate"],
            says: "The cable car climbs 100 metres a minute.",
        },
        { art: "tent", when: ["skill:music"], says: "Songs round the tent, one chord each bar." },
    ],
    offers: {
        landmarks: [
            "frost-thermometer",
            "snowy-firs",
            "summit",
            "signpost",
            "tent",
            "peaks",
            "cable-car",
        ],
        creatures: ["hares", "fox", "perched-eagle", "owl"],
        grounds: ["sky", "mint", "berry"],
        guides: ["bird", "dot", "stub", "hand"],
        weather: ["snow", "clear", "cloudy"],
    },
    wants: [
        {
            what: "A mountain hut with a lit window",
            why: "Somewhere to arrive at the end of the climb besides the tent, and a warm light on the snow for the evening.",
        },
        {
            what: "Marmots on the rocks",
            why: "A creature that whistles from the scree, and a second animal on the mountain that is neither a bird nor a hare.",
        },
    ],
    map: {
        spots: [
            { art: "summit", x: 70, y: -250, k: 1.25, is: "moment" },
            { art: "eagle", x: -540, y: -520, k: 0.9 },
            { art: "snowy-firs", x: 470, y: 260, k: 0.8 },
            { art: "snowy-firs", x: -570, y: 280, k: 0.6, flip: true },
            { art: "tent", x: -240, y: 400, k: 1, is: "gate" },
            { art: "frost-thermometer", x: 520, y: 430, k: 0.55 },
            { art: "rabbit", x: 660, y: 440, k: 0.75, is: "secret" },
            { art: "cable-car", x: -120, y: -330, k: 0.7 },
        ],
        stamp: { x: -660, y: -560 },
    },
    chapter: {
        story: "The climb. The path zigzags up through the snow past a tent, an eagle's rock and a thermometer that reads below zero, and the top is always in view on the horizon.",
        moment: { art: "summit", says: "From the top you can see the sea." },
        secret: { art: "rabbit", says: "A hare in its white winter coat." },
        glimpse: { world: "open-sea", art: "peaks" },
        by: "sea",
        rare: { art: "goat", way: "appear" },
    },
};
