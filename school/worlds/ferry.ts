// The ferry town: a small white town on an island across the harbour's bay, reached by the ferry from
// the jetty, where the second language is. Terraces step down to the water with pots of flowers on
// their walls, the way is paved in blue and white tiles, the signs are written in the language, and
// across the bay the harbour's lighthouse stands small on its point.
import type { World } from "./types";

export const ferryTown: World = {
    id: "ferry-town",
    name: "The ferry town",
    about: "A small white town across the harbour's bay, reached by the ferry, where the signs are written in another language: terraces of flowers stepping down to the water, a path of blue and white tiles, and the harbour's lighthouse small across the bay. A place for the language lessons in any year.",
    mood: "a bright hot noon",
    arrive: "This is the ferry town. Hola.",
    light: { ground: "glow", sky: "sky", accent: "sky", wash: 0.85 },
    ground: "terraces",
    path: "tilework",
    horizon: {
        far: [
            { art: "lighthouse", at: 0.1, k: 0.42, sink: -12 },
            { art: "houses", at: 0.25, k: 0.42, sink: -4, params: { count: 3, windows: 2 } },
            { art: "boat", at: 0.46, k: 0.7, sink: 44 },
            { art: "boat", at: 0.8, k: 0.5, sink: 34, flip: true },
        ],
        sky: [{ art: "sun", at: 0.55, down: 0.06 }],
        gate: "ferry",
    },
    landmarks: ["houses", "market-stall", "hola-sign", "shop-front", "plaza-sign", "clock-tower"],
    creatures: ["gull", "cat", "crabs"],
    weather: "clear",
    seasons: ["summer"],
    guide: "bird",
    // its lessons wait for languages to come back with a way of their own
    reaches: [{ art: "hola-sign", when: ["subject:language"], says: "Hola means hello." }],
    offers: {
        landmarks: [
            "houses",
            "market-stall",
            "hola-sign",
            "shop-front",
            "plaza-sign",
            "clock-tower",
            "bunting",
            "ferry",
        ],
        creatures: ["gull", "cat", "crabs", "dog"],
        grounds: ["glow", "tang"],
        guides: ["bird", "dot", "glow"],
        weather: ["clear", "breezy", "cloudy"],
    },
    wants: [
        {
            what: "A cafe table under an umbrella",
            why: "Somewhere with a menu to read in the language, the prices beside the words, which is buying things in the language as the lessons will ask.",
        },
        {
            what: "A fruit stall with the fruit's names",
            why: "The market as a word list: each fruit with its name written on a card beside it, one more to read on each visit.",
        },
    ],
    map: {
        spots: [
            { art: "houses", x: -460, y: 20, k: 1, params: { count: 3, windows: 2 } },
            { art: "clock-tower", x: 120, y: -80, k: 0.9 },
            { art: "houses", x: 480, y: 40, k: 0.85, flip: true, params: { count: 2, windows: 3 } },
            { art: "bunting", x: 60, y: 160, k: 0.8, is: "moment" },
            { art: "ferry", x: -120, y: 390, k: 1.1, is: "gate" },
            { art: "market-stall", x: 380, y: 400, k: 0.8 },
            { art: "hola-sign", x: -520, y: 420, k: 0.6 },
            { art: "gull-flying", x: -300, y: -330, k: 0.6, is: "life" },
            { art: "cat", x: 660, y: 440, k: 0.55, is: "secret" },
        ],
        decor: "beach",
        stamp: { x: -640, y: -400 },
    },
    chapter: {
        story: "Not a term's world but a place the language lessons bring a child to, in any year: a town across the harbour's bay where the signs are written in another language, and each visit there is one more the child can read.",
        moment: { art: "bunting", says: "A fiesta in the square." },
        secret: { art: "cat", says: "A cat asleep on a warm step." },
        by: "sea",
        rare: { art: "dolphins", way: "horizon", from: "left" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            label: "a second language",
            needs: "The language lessons, which came out of the curriculum on 15 September 2026 until languages have a way of their own, and the audio core and the answer model that tracks.md says a spoken or written answer waits for.",
        },
        land: { terrain: "across-the-bay", near: ["harbour"] },
    },
};
