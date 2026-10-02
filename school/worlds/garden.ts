// The garden: the child's own garden behind the house, the year before the first. The child arrives
// at the back of the house; a lawn with daisies, a swing, washing on the line and a hopscotch chalked
// along the path, closed in by a picket fence, and at the bottom of the lawn a gate that stays shut
// all year and opens onto the meadow.
import type { World } from "./types";

export const homeGarden: World = {
    id: "home-garden",
    name: "The garden",
    about: "The child's own garden behind the house: a lawn with daisies, a swing, washing on the line and a hopscotch chalked along the path, and a gate at the bottom that opens onto the meadow. The year before the first year.",
    mood: "a warm afternoon at home",
    arrive: "This is your garden. Look around.",
    light: { ground: "glow", sky: "sky", low: "berry", accent: "berry", wash: 0.8 },
    ground: "lawn",
    path: "hopscotch",
    horizon: {
        far: [
            { art: "swing", at: 0.2, k: 1.1 },
            { art: "washing", at: 0.52, k: 1.3, params: { count: 5, pattern: 3 } },
            { art: "tree", at: 0.86, k: 1 },
        ],
        sky: [{ art: "sun", at: 0.9, down: 0.1 }],
        gate: "cottage",
    },
    landmarks: ["sandcastle", "flowers", "wheelbarrow", "bicycle", "garden", "bubbles"],
    creatures: ["snail", "cat", "minibeasts", "birds"],
    weather: "clear",
    seasons: ["spring", "summer"],
    guide: "dot",
    reaches: [
        { art: "swing", when: ["skill:music"], says: "Swing to the beat. One, two, one, two." },
        {
            art: "flowers",
            when: ["skill:nature.plants", "skill:nature.growing", "skill:science.plants"],
            says: "How many petals on each flower?",
        },
        {
            art: "cat",
            when: ["skill:nature.senses", "skill:nature.body"],
            says: "The cat hears the smallest sound.",
        },
        {
            art: "washing",
            when: ["skill:nature.weather", "skill:nature.seasons"],
            says: "Washing dries in the sun and wind.",
        },
        {
            art: "wheelbarrow",
            when: ["skill:sorting"],
            says: "Sort the garden things into the wheelbarrow.",
        },
        {
            art: "minibeasts",
            when: ["skill:nature.minibeasts", "skill:science.animals"],
            says: "Look closely at the minibeasts.",
        },
        {
            art: "hedgehog",
            when: ["skill:nature.life-cycles", "skill:nature.animals"],
            says: "A hedgehog's babies are called hoglets.",
        },
        { art: "washing", when: ["skill:history"], says: "Long ago washing was scrubbed by hand." },
        { art: "birds", when: ["skill:language"], says: "Say hello to the birds." },
        { art: "hen", when: ["skill:coding"], says: "The hen walks three steps to the gate." },
        { art: "bicycle", when: ["skill:physics"], says: "Push the pedals and the bicycle goes." },
        { art: "bubbles", when: ["skill:chemistry"], says: "Soap and water mix into bubbles." },
        { art: "snail", when: ["skill:writing"], says: "The snail's trail curls round like a c." },
        { art: "garden", when: ["skill:art"], says: "Draw the garden just as you see it." },
        { art: "sandcastle", when: ["skill:shapes"], says: "Find the shapes in the sandpit." },
        { art: "wheelbarrow", when: ["skill:space"], says: "The spade is in the wheelbarrow." },
        { art: "cat", when: ["skill:reading"], says: "Cat starts with c. c, c, cat." },
        {
            art: "washing",
            when: ["skill:patterns", "skill:counting", "skill:number", "skill:measure"],
            says: "Count the pegs on the line.",
        },
    ],
    offers: {
        landmarks: [
            "swing",
            "sandcastle",
            "flowers",
            "wheelbarrow",
            "bicycle",
            "garden",
            "washing",
            "bubbles",
        ],
        creatures: ["snail", "cat", "minibeasts", "birds", "hedgehog", "hen"],
        grounds: ["glow", "mint"],
        guides: ["dot", "firefly", "snail"],
        weather: ["clear", "cloudy", "breezy"],
    },
    wants: [
        {
            what: "A bird table",
            why: "Somewhere for the garden's birds to come down to, with a roof and a tray of seeds, so the birds on the washing line have somewhere to go and can be counted as they come.",
        },
        {
            what: "A shed with its tools on the wall",
            why: "The one place in a garden with things hung in a row, spades and a rake and a watering can, which is sorting by size before a child has the word for it.",
        },
    ],
    map: {
        spots: [
            { art: "tree", x: -480, y: 120, k: 1 },
            { art: "washing", x: 60, y: -60, k: 0.9, params: { count: 5, pattern: 3 } },
            { art: "swing", x: 470, y: 120, k: 0.8 },
            { art: "cottage", x: -160, y: 360, k: 1.4, is: "gate" },
            {
                art: "garden-gate",
                x: 380,
                y: 420,
                k: 0.9,
                is: "moment",
                params: { bars: 5, open: 0 },
            },
            { art: "flowers", x: -520, y: 430, k: 0.7 },
            { art: "bubbles", x: 160, y: -330, k: 0.6, is: "life" },
            { art: "hedgehog", x: 660, y: 440, k: 0.6, is: "secret" },
        ],
        decor: "lawn",
        stamp: { x: -640, y: -380 },
    },
    chapter: {
        story: "The start before the start. The map begins at the child's own back door, and all year the gate at the bottom of the lawn stays shut, with the meadow on the other side of it.",
        moment: {
            art: "garden-gate",
            says: "The gate opens onto the meadow.",
            params: { bars: 5, open: 1 },
        },
        secret: { art: "hedgehog", says: "A hedgehog asleep under the leaves." },
        by: "path",
        rare: { art: "bubbles", way: "sky", from: "left" },
    },
    site: { kind: "term", grade: 0, term: 1, land: { terrain: "home", near: ["meadow"] } },
};
