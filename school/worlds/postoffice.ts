// The post office: a quay on an island in the south-eastern sea, where the mail boat waits for the
// letters, postcards and poems the later writing lessons write. A place those lessons bring a child
// to in any year.
import type { World } from "./types";

export const postOffice: World = {
    id: "post-office",
    name: "The post office",
    about: "A stone quay on a rainy island, with parcels and coils of rope, a lamp post with a letterbox, a hanging sign that says POST and the mail boat waiting for its sacks. A place for the later writing lessons, in any year.",
    mood: "a soft rainy harbour",
    arrive: "This is the post office. Letters go here.",
    light: { ground: "glow", sky: "sky", low: "mint", accent: "berry", wash: 0.7 },
    ground: "quay",
    path: "stamps",
    horizon: {
        far: [
            { art: "houses", at: 0.16, k: 0.6, params: { count: 2, windows: 3 } },
            { art: "mail-boat", at: 0.5, k: 0.6, sink: 40, params: { sacks: 2, sailing: 1 } },
            { art: "lighthouse", at: 0.86, k: 0.4, sink: -8 },
        ],
        gate: "mail-boat",
    },
    landmarks: ["mail-boat", "lamppost", "post-sign", "suitcases", "compass", "lantern"],
    creatures: ["gull", "seal", "cat"],
    weather: "rain",
    seasons: ["winter"],
    guide: "bird",
    reaches: [
        {
            art: "compass",
            when: ["skill:writing.directions"],
            says: "Write the way: north past the rocks.",
        },
        { art: "lantern", when: ["skill:writing.poems"], says: "A poem, one line at a time." },
        {
            art: "mail-boat",
            when: ["skill:writing.letters", "skill:writing.recounts"],
            says: "Write a letter. The boat takes it.",
        },
        {
            art: "mail-boat",
            when: ["skill:writing.planning", "skill:writing.story-structure"],
            says: "Plan it first: start, middle, end.",
        },
        {
            art: "lamppost",
            when: ["skill:writing.audience", "skill:writing.concision"],
            says: "Who will read it? Write for them.",
        },
        {
            art: "gull",
            when: ["skill:writing.editing"],
            says: "Spot the mistake before it is posted.",
        },
        {
            art: "suitcases",
            when: ["skill:writing.punctuation", "skill:writing.commas"],
            says: "Commas between the parcels in a list.",
        },
        {
            art: "seal",
            when: [
                "skill:writing.word-classes",
                "skill:writing.joining-sentences",
                "skill:writing.sentences",
            ],
            says: "Naming, doing, describing: the seal dives.",
        },
    ],
    offers: {
        landmarks: ["mail-boat", "lamppost", "post-sign", "suitcases", "compass", "lantern"],
        creatures: ["gull", "seal", "cat", "dog"],
        grounds: ["glow", "sky"],
        guides: ["bird", "stub", "hand"],
        weather: ["rain", "cloudy"],
    },
    wants: [
        {
            what: "A postbox with a collection time",
            why: "A time on the box to read, which joins the writing lessons to telling the time.",
        },
        {
            what: "Parcels with labels",
            why: "Addresses and labels to write, and parcels of different sizes to sort by how heavy they are.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the later writing lessons bring a child to, in any year. A path of stamps runs along a wet quay to the mail boat, which waits for every letter before it sails.",
        moment: {
            art: "mail-boat",
            says: "The mail boat sails with every letter.",
            params: { sacks: 5, sailing: 1 },
            before: { sacks: 5, sailing: 0 },
        },
        secret: { art: "cat", says: "A cat asleep in the post sack." },
        by: "sea",
        rare: { art: "seaplane", way: "sky", from: "right" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "writing-a-poem-down-the-page",
                "writing-a-postcard-home",
                "writing-a-story-mountain",
                "writing-commas-in-a-list",
                "writing-finding-the-mistake",
                "writing-fix-the-robots-sentence",
                "writing-naming-doing-describing",
                "writing-planning-three-sentences",
                "writing-a-cafe-menu",
                "writing-a-letter-to-a-character",
                "writing-because-but-so",
                "writing-directions-on-a-treasure-map",
                "writing-growing-a-sentence",
                "writing-puzzles",
                "writing-saying-it-shorter",
                "writing-a-story-from-the-mountain",
                "writing-a-notice-that-persuades",
                "writing-a-second-draft",
            ],
            label: "letters, postcards and poems",
            needs: "A lesson on writing a report for someone far away, and one on a diary kept over a week, which the writing track has not written yet.",
        },
        land: { terrain: "post-office", near: ["night-sky"] },
    },
    map: {
        spots: [
            { art: "gull-flying", x: 380, y: -320, k: 0.55, is: "life" },
            { art: "houses", x: -430, y: 110, k: 0.75, params: { count: 2, windows: 2 } },
            { art: "post-sign", x: 150, y: 150, k: 0.65 },
            { art: "lamppost", x: 450, y: 330, k: 0.75 },
            {
                art: "mail-boat",
                x: -80,
                y: 420,
                k: 0.95,
                is: "gate",
                params: { sacks: 5, sailing: 0 },
            },
            { art: "cat", x: 660, y: 440, k: 0.5, is: "secret" },
        ],
        stamp: { x: -640, y: -420 },
        isle: true,
    },
};
