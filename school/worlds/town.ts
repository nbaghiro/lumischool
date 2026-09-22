// The town: the end of the second year, in spring, on market day in the rain. Paving and puddles, a
// crossing where the path goes over the road, a street of houses along the top and the clock tower
// over the square. The term is money, measuring and quarter past, and the town is where those happen:
// the stall weighs and prices, the tower tells the time, the bus has a number.
import type { World } from "./types";

export const town: World = {
    id: "town",
    name: "The town",
    about: "Paving, puddles and a zebra crossing, a street of houses along the top and the clock tower over the square. The market stall is out whatever the weather, and so are the umbrellas.",
    mood: "market day in the rain",
    arrive: "This is the town. It is market day.",
    light: { ground: "glow", sky: "sky", accent: "tang", wash: 0.75 },
    ground: "town",
    path: "paving",
    horizon: {
        far: [
            { art: "houses", at: 0.17, k: 1.05, params: { count: 3, windows: 2 } },
            { art: "clock-tower", at: 0.5, k: 1.15 },
            { art: "houses", at: 0.84, k: 0.95, params: { count: 2, windows: 3 } },
        ],
        gate: "shop-front",
    },
    landmarks: ["market-stall", "bus", "clock-tower", "lamppost", "umbrellas", "bunting"],
    creatures: ["dog", "cat", "birds"],
    weather: "rain",
    seasons: ["spring", "summer"],
    guide: "stub",
    reaches: [
        {
            art: "market-stall",
            when: ["skill:money", "art:purse", "art:till", "art:pricetag", "art:receipt"],
            says: "Buy it at the market stall.",
        },
        {
            art: "market-stall",
            when: ["skill:mass", "art:dialscale"],
            says: "The stall weighs its apples.",
        },
        {
            art: "market-stall",
            when: ["skill:capacity"],
            says: "The stall sells juice by the litre.",
        },
        {
            art: "clock-tower",
            when: ["skill:time", "art:clock"],
            says: "Read the clock on the tower.",
        },
        { art: "signpost", when: ["art:roaddistances"], says: "How far is it to Bray?" },
        {
            art: "signpost",
            when: ["skill:nature.maps"],
            says: "The signpost points the way, like a map.",
        },
        { art: "houses", when: ["skill:sorting"], says: "Sort the houses by doors and windows." },
        {
            art: "houses",
            when: ["skill:nature.habitats"],
            says: "Houses for people, a tree for the owl.",
        },
        {
            art: "houses",
            when: ["skill:art.printing", "skill:art.texture"],
            says: "Rub a crayon over the bricks.",
        },
        {
            art: "market-stall",
            when: ["skill:chemistry.dissolving"],
            says: "Sugar dissolves in the stall's lemonade.",
        },
        {
            art: "houses",
            when: ["skill:chemistry.rocks"],
            says: "Brick, slate and stone make the houses.",
        },
        {
            art: "umbrellas",
            when: ["skill:chemistry.changes"],
            says: "Puddles dry up. Where does the water go?",
        },
        { art: "lamppost", when: ["skill:coding"], says: "The street lamps come on one by one." },
        { art: "bunting", when: ["skill:music"], says: "Strum down and up as the flags flap." },
        {
            art: "shop-front",
            when: ["skill:physics.light"],
            says: "See through the shop window glass.",
        },
        {
            art: "shop-front",
            when: ["skill:reading.signs", "skill:reading.instructions"],
            says: "Read the notice in the shop window.",
        },
        {
            art: "dog",
            when: ["skill:reading.characters", "skill:reading.comics"],
            says: "How does the dog feel in the rain?",
        },
        {
            art: "market-stall",
            when: ["skill:writing.instructions", "art:howto"],
            says: "Write the steps to make lemonade.",
        },
        {
            art: "market-stall",
            when: ["skill:writing.questions", "skill:writing.speech"],
            says: "Ask a question at the stall.",
        },
        {
            art: "bus",
            when: ["skill:writing.joining-sentences", "art:bus"],
            says: "The bus stops and people get on.",
        },
    ],
    offers: {
        landmarks: [
            "market-stall",
            "bus",
            "clock-tower",
            "bicycle",
            "signpost",
            "bunting",
            "shop-front",
            "houses",
            "lamppost",
            "umbrellas",
        ],
        creatures: ["dog", "cat", "birds", "gull"],
        grounds: ["glow", "sky", "berry"],
        guides: ["stub", "hand", "bird", "dot"],
        weather: ["rain", "cloudy", "clear"],
    },
    wants: [
        {
            what: "A fountain in the square",
            why: "Somewhere for the market to gather round, and water a child would stop to watch on a dry day.",
        },
        {
            what: "A cafe table under an awning",
            why: "People sitting out between showers would let the town be busy without crowding the path with more walkers.",
        },
    ],
    map: {
        spots: [
            { art: "houses", x: -440, y: 90, k: 1.05 },
            { art: "houses", x: 440, y: 50, k: 0.9, flip: true, params: { count: 3, windows: 3 } },
            { art: "clock-tower", x: 20, y: -10, k: 1.2, is: "moment" },
            { art: "shop-front", x: -250, y: 410, k: 0.95, is: "gate" },
            { art: "market-stall", x: 370, y: 420, k: 0.85 },
            { art: "bus", x: 70, y: 470, k: 0.5 },
            { art: "dog", x: 660, y: 440, k: 0.75, is: "secret" },
            { art: "lamppost", x: -650, y: 300, k: 0.7 },
            { art: "umbrellas", x: 180, y: 250, k: 0.6 },
        ],
        stamp: { x: -640, y: -360 },
    },
    chapter: {
        story: "Out into the town in spring: a market, a bus, a shop to arrive at and a clock tower in the square for the lessons about time.",
        moment: {
            art: "clock-tower",
            says: "Twelve o'clock. The bells ring out.",
            params: { hour: 12, minute: 0 },
        },
        secret: { art: "dog", says: "A dog waiting outside the shop." },
        by: "road",
        rare: { art: "starlings", way: "sky", from: "right" },
    },
};
