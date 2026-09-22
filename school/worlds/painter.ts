// The painter's hut: a hut by the river in a field of flowers in every colour, where the art lessons
// walk the path. Its path is a brush's dabs round the palette, a colour wheel and a palette stand
// beside it, and its wall is the one place on the map the child fills: bare at first, and full of
// pictures once the art lessons are done.
import type { World } from "./types";

export const paintersHut: World = {
    id: "painters-hut",
    name: "The painter's hut",
    about: "A wooden hut by the river in a field of flowers of every colour, with an easel, a colour wheel and a palette outside and a board on its wall that fills with pictures. A place for the art lessons in any year.",
    mood: "a soft spring afternoon",
    arrive: "This is the painter's hut. Pick a colour.",
    light: { ground: "berry", sky: "sky", low: "glow", accent: "tang", wash: 0.72 },
    ground: "wildflowers",
    path: "dabs",
    horizon: {
        far: [
            { art: "season-tree", at: 0.12, k: 1.05 },
            { art: "firs", at: 0.46, k: 0.6, params: { count: 3, snow: 0 } },
            { art: "season-tree", at: 0.72, k: 0.8, flip: true },
            { art: "windmill", at: 0.92, k: 0.55, sink: 4 },
        ],
        sky: [{ art: "sun", at: 0.86, down: 0.12 }],
        gate: "hut",
    },
    landmarks: ["easel", "colour-wheel", "flowers", "palette", "paint-pots", "pond"],
    creatures: ["duck", "minibeasts", "dragonfly", "birds"],
    weather: "clear",
    seasons: ["spring"],
    guide: "stub",
    reaches: [
        { art: "paint-pots", when: ["skill:art.space"], says: "Pick a pot. Start with the sky." },
        {
            art: "colour-wheel",
            when: ["skill:art.colour-mixing", "skill:art.complementary", "skill:art.warm-cool"],
            says: "Two colours mixed make the one between.",
        },
        {
            art: "palette",
            when: ["skill:art.tints", "skill:art.proportion", "skill:art.tone"],
            says: "A little white makes it paler.",
        },
        {
            art: "minibeasts",
            when: ["skill:art.symmetry", "art:minibeasts"],
            says: "A butterfly's wings match.",
        },
        {
            art: "easel",
            when: ["skill:art.pattern", "skill:art.printing"],
            says: "Print the pattern. What comes next?",
        },
        {
            art: "flowers",
            when: ["skill:art.looking", "art:flowers", "skill:art.shape", "skill:art.line"],
            says: "Look closely, then draw what you see.",
        },
    ],
    offers: {
        landmarks: [
            "easel",
            "colour-wheel",
            "flowers",
            "palette",
            "paint-pots",
            "pond",
            "bicycle",
            "hut",
            "tree",
        ],
        creatures: ["duck", "minibeasts", "dragonfly", "birds", "snail"],
        grounds: ["berry", "glow", "mint"],
        guides: ["stub", "dot", "hand"],
        weather: ["clear", "cloudy", "rain"],
    },
    wants: [
        {
            what: "A willow by the river",
            why: "The painter's own tree, hanging over the water where the hut is, which the blossom trees on the horizon stand in for today.",
        },
        {
            what: "A frame for a child's own painting",
            why: "A painting from the Paint tab hung on the hut's board in place of the ones drawn there, now that a child's paintings are kept on the device and in the family's log.",
        },
    ],
    map: {
        spots: [
            { art: "season-tree", x: -470, y: 40, k: 1 },
            { art: "windmill", x: 480, y: -60, k: 0.6 },
            { art: "pond", x: 220, y: -160, k: 0.5 },
            { art: "dragonfly", x: -120, y: -300, k: 0.6, is: "life" },
            { art: "hut", x: -60, y: 330, k: 1.3, is: "gate", params: { pictures: 0 } },
            { art: "easel", x: 380, y: 400, k: 0.8 },
            { art: "flowers", x: -470, y: 420, k: 0.7 },
            { art: "snail", x: 660, y: 440, k: 0.55, is: "secret" },
        ],
        decor: "lawn",
        stamp: { x: -640, y: -400 },
    },
    chapter: {
        story: "Not a term's world but a place the art lessons bring a child to, in any year: a hut by the river with an easel, a colour wheel and a palette outside, and a board on its wall that is bare until the lessons fill it.",
        moment: {
            art: "hut",
            says: "Your pictures fill the wall.",
            params: { pictures: 8 },
            before: { pictures: 0 },
        },
        secret: { art: "snail", says: "A snail on the easel's leg." },
        by: "path",
        rare: { art: "rainbow", way: "appear" },
    },
    site: {
        kind: "track",
        hosts: { subjects: ["art"] },
        land: { terrain: "riverbank", near: ["laboratory", "sports-ground"] },
    },
};
