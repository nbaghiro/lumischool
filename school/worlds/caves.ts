// The crystal caves: into the dark under the mountains, along chalk arrows past stalactites and
// glow-worms to a cavern of crystals that wait to catch the light. Not a term's world but a place the
// lessons on sound, light and crystals bring a child to in any year.
import type { World } from "./types";

export const crystalCaves: World = {
    id: "crystal-caves",
    name: "The crystal caves",
    about: "A cave under the mountains, with stalactites, glow-worms on the roof, a lamp on a post and bats asleep overhead, and chalk arrows on the floor leading to a cavern of crystals. A place for the lessons on sound, light and crystals, in any year.",
    mood: "deep under the mountains",
    arrive: "This is the cave. Hear the echo.",
    light: { ground: "berry", sky: "sky", accent: "glow", wash: 0.7, deep: "cave" },
    ground: "cavern",
    path: "arrows",
    horizon: {
        far: [
            { art: "stalactites", at: 0.14, k: 1.1, params: { pairs: 2, joined: 1, rock: 0 } },
            { art: "crystals", at: 0.48, k: 0.8, params: { count: 4, lit: 1 } },
            {
                art: "stalactites",
                at: 0.84,
                k: 1.3,
                flip: true,
                params: { pairs: 3, joined: 1, rock: 0 },
            },
        ],
        sky: [{ art: "glow-worms", at: 0.64, down: 0.1, k: 1.1 }],
        gate: "crystals",
    },
    landmarks: ["crystals", "stalactites", "lantern", "glow-worms"],
    creatures: ["bats"],
    weather: "drips",
    seasons: ["winter"],
    guide: "glow",
    reaches: [
        {
            art: "crystals",
            when: ["art:prism", "art:periscope"],
            says: "A crystal splits light into colours.",
        },
        {
            art: "glow-worms",
            when: ["art:seeing"],
            says: "In the dark, the glow-worms show the way.",
        },
        { art: "lantern", when: ["art:mirrors"], says: "Still water sends the lamp's light back." },
        { art: "stalactites", when: ["art:beam"], says: "Light cannot pass through rock." },
        {
            art: "crystals",
            when: ["skill:shapes.solids", "skill:shapes.faces"],
            says: "Each crystal has flat faces and edges.",
        },
        {
            art: "crystals",
            when: ["skill:chemistry.crystals"],
            says: "Crystals grow slowly as water dries away.",
        },
        {
            art: "bats",
            when: ["skill:physics.method"],
            says: "Bats squeak too high for us to hear.",
        },
        {
            art: "stalactites",
            when: ["skill:physics.sound"],
            says: "Tap a stalactite. It rings as it shakes.",
        },
    ],
    offers: {
        landmarks: ["crystals", "stalactites", "lantern", "glow-worms"],
        creatures: ["bats"],
        grounds: ["berry", "sky"],
        guides: ["glow", "firefly", "dot"],
        weather: ["drips"],
    },
    wants: [
        {
            what: "An underground lake with a boat",
            why: "The concept scene had a boat on dark water, and still water would carry the echoes and the reflections the sound and light lessons ask about.",
        },
        {
            what: "A helmet with a lamp on it",
            why: "Something a child could imagine wearing to come in, and a light that goes with the guide rather than hanging on a post.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the lessons on sound, light and crystals bring a child to, in any year. Chalk arrows lead into the dark under the mountains, past glow-worms and a lamp on a post, to a cavern where the crystals wait to catch the light.",
        moment: {
            art: "crystals",
            says: "Every crystal lights up at once.",
            params: { count: 7, lit: 1 },
            before: { count: 7, lit: 0 },
        },
        secret: { art: "bats", says: "Bats asleep upside down." },
        by: "path",
        rare: { art: "bats-flying", way: "sky", from: "right" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "physics-sounds-come-from-shaking",
                "physics-sound-through-things",
                "physics-light-to-see-by",
                "g2-flat-and-solid-shapes",
                "physics-see-through-or-not",
                "physics-mirrors-send-light-back",
                "chemistry-growing-crystals",
                "physics-high-and-low-loud-and-soft",
                "physics-sound-fades",
                "physics-how-we-see",
            ],
            label: "sound, light and crystals",
            needs: "Echoes and how sound travels, and a year 5 lesson on the very slow growth of stalactites in very large numbers of years.",
        },
        land: { terrain: "under-the-mountains", near: ["mountains"] },
    },
    map: {
        spots: [
            { art: "stalactites", x: -430, y: 80, k: 1, params: { pairs: 2, joined: 1, rock: 0 } },
            {
                art: "stalactites",
                x: 470,
                y: 40,
                k: 0.8,
                flip: true,
                params: { pairs: 3, joined: 1, rock: 0 },
            },
            { art: "glow-worms", x: 120, y: -300, k: 0.8, is: "life" },
            { art: "crystals", x: 40, y: 380, k: 1.1, is: "gate", params: { count: 7, lit: 0 } },
            { art: "lantern", x: -320, y: 420, k: 0.7 },
            { art: "bats", x: 660, y: 440, k: 0.6, is: "secret" },
        ],
        stamp: { x: -640, y: -420 },
    },
};
