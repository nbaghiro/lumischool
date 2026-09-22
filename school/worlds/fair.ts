// The winter fair: a fair on a frozen lake on a snowy evening, which a family can choose for the
// winter term of the first three years instead of the term's own world. The ice is scored with skate
// curls and strung with lights along the far bank, and the carousel stays dark all term until the
// moment it lights up.
import type { World } from "./types";

export const winterFair: World = {
    id: "winter-fair",
    name: "The winter fair",
    about: "A fair on a frozen lake on a snowy evening: skaters' tracks on the ice, stalls under strings of lights, a snowman and a sledge, and a carousel that lights up at the end of term. A family can choose it for a winter term instead of the term's own world.",
    mood: "a snowy evening at the fair",
    arrive: "This is the winter fair. Wrap up warm.",
    light: { ground: "sky", sky: "sky", accent: "glow", wash: 0.7, deep: "frost" },
    ground: "ice",
    path: "skates",
    horizon: {
        far: [
            { art: "snowy-firs", at: 0.1, k: 0.95, params: { count: 3, snow: 1 } },
            { art: "market-stall", at: 0.38, k: 1.05 },
            { art: "snowy-firs", at: 0.6, k: 0.7, params: { count: 2, snow: 1 } },
            { art: "market-stall", at: 0.85, k: 0.95, flip: true },
        ],
        sky: [{ art: "moon", at: 0.86, down: 0.08 }],
        gate: "carousel",
    },
    landmarks: ["snowman", "sledge", "lantern", "cup", "frost-thermometer"],
    creatures: ["skater", "fox", "dog", "hares"],
    weather: "snow",
    seasons: ["winter"],
    guide: "dot",
    reaches: [
        { art: "market-stall", when: ["skill:money"], says: "Pay at the stall. What change?" },
        {
            art: "snowman",
            when: ["skill:nature.seasons"],
            says: "The snowman melts when spring comes.",
        },
        {
            art: "snowman",
            when: ["skill:nature.leaves", "skill:nature.plants"],
            says: "No leaves on the trees till spring.",
        },
        {
            art: "sledge",
            when: ["skill:shapes", "skill:perimeter"],
            says: "Measure round the sledge: its perimeter.",
        },
        {
            art: "carousel",
            when: ["skill:multiplication", "skill:division"],
            says: "Four horses, two riders each.",
        },
        {
            art: "cup",
            when: ["skill:fractions", "skill:decimals"],
            says: "Share the hot chocolate in equal parts.",
        },
        {
            art: "snowman",
            when: ["skill:reading.compound-words"],
            says: "Snow and man make snowman.",
        },
        {
            art: "snowman",
            when: ["skill:measure", "skill:length"],
            says: "How tall is the snowman?",
        },
        {
            art: "snowman",
            when: ["skill:art.symmetry", "skill:shapes.symmetry"],
            says: "Both halves of the snowman match.",
        },
        {
            art: "cup",
            when: ["skill:chemistry.evaporating"],
            says: "Steam rises off the hot chocolate.",
        },
        {
            art: "frost-thermometer",
            when: ["skill:chemistry.states", "skill:physics.heat"],
            says: "Below zero, the lake freezes.",
        },
        {
            art: "sledge",
            when: ["skill:chemistry.separating"],
            says: "Pick the grit out of the snow.",
        },
        {
            art: "lantern",
            when: ["skill:chemistry.materials"],
            says: "Glass, metal and wax make the lantern.",
        },
        {
            art: "cup",
            when: ["skill:chemistry.dissolving", "skill:chemistry.mixtures"],
            says: "Stir the cocoa until it dissolves.",
        },
        { art: "lantern", when: ["skill:coding"], says: "The stall lights come on in a pattern." },
        {
            art: "skater",
            when: ["skill:physics.motion", "skill:physics.forces"],
            says: "On smooth ice the skater slides far.",
        },
        {
            art: "sledge",
            when: ["skill:physics.magnets", "skill:physics.materials"],
            says: "Does the magnet stick to the sledge?",
        },
        { art: "owl", when: ["skill:reading"], says: "The owl listens to the story too." },
        {
            art: "market-stall",
            when: [
                "skill:writing.signs",
                "skill:writing.capitals",
                "skill:writing.punctuation",
                "skill:writing.sentences",
            ],
            says: "Write the sign for the stall.",
        },
        { art: "dog", when: ["skill:writing"], says: "Describe the dog so we can find it." },
        {
            art: "robin",
            when: ["skill:art.looking", "skill:art.drawing"],
            says: "Draw the robin from looking.",
        },
        { art: "carousel", when: ["skill:music"], says: "The carousel's tune goes up and down." },
        {
            art: "robin",
            when: ["skill:nature.minibeasts", "skill:nature.habitats"],
            says: "What does the robin eat in winter?",
        },
        {
            art: "carousel",
            when: ["skill:physics.sound"],
            says: "The carousel's music is loud up close.",
        },
        {
            art: "lantern",
            when: ["skill:physics.light"],
            says: "The lantern lights the stall after dark.",
        },
    ],
    offers: {
        landmarks: [
            "snowman",
            "sledge",
            "lantern",
            "cup",
            "frost-thermometer",
            "market-stall",
            "carousel",
            "snowy-firs",
        ],
        creatures: ["skater", "fox", "dog", "hares", "owl", "robin"],
        grounds: ["sky", "berry"],
        guides: ["dot", "hand", "bird"],
        weather: ["snow", "clear", "starry"],
    },
    wants: [
        {
            what: "A big wheel",
            why: "The fair's tallest thing, its seats round a circle at equal angles, which would turn in quarters and halves and be the fair's picture from the map.",
        },
        {
            what: "A robin on a post",
            why: "The winter bird a child knows, red against the snow, small enough to be the fair's secret instead of the fox.",
        },
    ],
    map: {
        spots: [
            { art: "snowy-firs", x: -520, y: 40, k: 0.8, params: { count: 3, snow: 1 } },
            { art: "market-stall", x: 430, y: 20, k: 0.9, flip: true },
            { art: "skater", x: -60, y: -260, k: 0.7, is: "life" },
            { art: "carousel", x: 0, y: 340, k: 1.3, is: "gate", params: { horses: 4, lit: 0 } },
            { art: "snowman", x: -430, y: 400, k: 0.8 },
            { art: "sledge", x: 420, y: 440, k: 0.7 },
            { art: "fox", x: 660, y: 440, k: 0.55, is: "secret" },
        ],
        stamp: { x: -640, y: -400 },
    },
    chapter: {
        story: "A winter term out of doors, chosen by the family instead of the term's own world: a fair on a frozen lake, where the stalls are strung with lights and the carousel stays dark and still until the end of term.",
        moment: {
            art: "carousel",
            says: "The carousel lights up and turns.",
            params: { horses: 4, lit: 1 },
            before: { horses: 4, lit: 0 },
        },
        secret: { art: "fox", says: "A fox watching from the firs." },
        by: "path",
        rare: { art: "skater", way: "horizon", from: "left" },
    },
    site: {
        kind: "choice",
        terms: [
            { grade: 1, term: 2 },
            { grade: 2, term: 2 },
            { grade: 3, term: 2 },
        ],
        land: { terrain: "frozen-lake", near: ["kitchen", "sports-ground", "harbour"] },
    },
};
