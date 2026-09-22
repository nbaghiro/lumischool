// The park: the harbour town's park on the promenade, where the music lessons are. Lawns with round
// flower beds and deckchairs, railings along the top with a band of sea behind them, and a path that
// is a staff winding through the park with a scale going up and down it. The bandstand is quiet
// until the child plays, and then the band's notes go up over the park.
import type { World } from "./types";

export const bandstandPark: World = {
    id: "bandstand-park",
    name: "The park",
    about: "The harbour town's park on the promenade: lawns, round flower beds and deckchairs, the sea behind the railings, and a bandstand in the middle that stays quiet until the child plays. A place for the music lessons in any year.",
    mood: "a summer evening with a band",
    arrive: "This is the park. Listen.",
    light: { ground: "mint", sky: "sky", low: "tang", accent: "berry", wash: 0.78 },
    ground: "park",
    path: "staff",
    horizon: {
        far: [
            { art: "tree", at: 0.12, k: 1.05 },
            { art: "houses", at: 0.46, k: 0.8, params: { count: 3, windows: 2 } },
            { art: "lighthouse", at: 0.8, k: 0.42, sink: -70 },
        ],
        sky: [{ art: "sun", at: 0.9, down: 0.42, k: 0.9 }],
        gate: "bandstand",
    },
    landmarks: ["chime-bars", "drum", "bunting", "pond", "flowers", "balloons"],
    creatures: ["duck", "birds", "dog"],
    weather: "clear",
    seasons: ["summer"],
    guide: "bird",
    reaches: [
        { art: "birds", when: ["skill:music.grand-staff"], says: "Birds on the wire, like notes." },
        {
            art: "chime-bars",
            when: ["skill:music.intervals", "skill:music.keys"],
            says: "Long bars low, short bars high.",
        },
        {
            art: "drum",
            when: ["skill:music.rhythm", "skill:music.dynamics"],
            says: "One hit, one beat. Loud, then soft.",
        },
        {
            art: "bunting",
            when: ["skill:music.strumming", "skill:music.chord-changes"],
            says: "Strum down and up, like the flags.",
        },
        { art: "bandstand", when: ["subject:music"], says: "The band keeps the beat. Clap along." },
    ],
    offers: {
        landmarks: [
            "chime-bars",
            "drum",
            "bunting",
            "pond",
            "flowers",
            "balloons",
            "bandstand",
            "kite",
            "bicycle",
        ],
        creatures: ["duck", "birds", "dog", "cat"],
        grounds: ["mint", "glow"],
        guides: ["bird", "hand", "glow"],
        weather: ["clear", "breezy", "cloudy"],
    },
    wants: [
        {
            what: "A band of animals",
            why: "Someone to play in the bandstand, one creature for each instrument, arriving one at a time as the child learns each instrument's lessons.",
        },
        {
            what: "An ice-cream stall with its prices",
            why: "The promenade's own shop, and a way for the park to reach into money as well as music without borrowing the harbour's market stall.",
        },
    ],
    map: {
        spots: [
            { art: "bunting", x: -280, y: -120, k: 1 },
            { art: "tree", x: -580, y: 160, k: 1 },
            { art: "tree", x: 580, y: 120, k: 0.9, flip: true },
            { art: "bandstand", x: 0, y: 280, k: 1.4, is: "gate" },
            { art: "pond", x: 470, y: 420, k: 0.6 },
            { art: "duck", x: -430, y: 440, k: 0.6 },
            { art: "cat", x: 660, y: 440, k: 0.6, is: "secret" },
        ],
        stamp: { x: -640, y: -360 },
    },
    chapter: {
        story: "Not a term's world but a place the music lessons bring a child to, in any year: the harbour town's park, where the bandstand stands empty and quiet until the child plays, and then the band's notes go up over the park.",
        moment: {
            art: "bandstand",
            says: "The band plays in the park.",
            params: { posts: 5, notes: 3 },
            before: { posts: 5, notes: 0 },
        },
        secret: { art: "cat", says: "A cat asleep under the bandstand." },
        by: "path",
        rare: { art: "red-balloon", way: "rise" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: ["music"],
            needs: "Music lessons for the fourth year and a year of songs to sing, which sound.md plans; the first three years have seventeen.",
        },
        land: { terrain: "seaside-park", near: ["harbour"] },
    },
};
