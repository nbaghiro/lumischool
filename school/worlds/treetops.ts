// The treetops: walkways high in the forest at the wet west end of the southern shore, above the
// morning mist, where things are pushed, pulled, swung and dropped. A place the lessons on forces and
// motion bring a child to in any year.
import type { World } from "./types";

export const treetops: World = {
    id: "treetops",
    name: "The treetops",
    about: "Walkways and a platform high in the forest in green morning light, above the mist, with a rope bridge, a basket on a pulley, parrots, and a giant flower waiting to open at the top. A place for the lessons on forces and motion, in any year.",
    mood: "green light above the mist",
    arrive: "These are the treetops. Look down, then up.",
    light: { ground: "mint", sky: "mint", low: "glow", accent: "tang", wash: 0.8, deep: "canopy" },
    ground: "canopy",
    path: "walkway",
    horizon: {
        far: [
            { art: "palms", at: 0.12, k: 0.9, params: { count: 2, coconuts: 0 } },
            { art: "giant-flower", at: 0.5, k: 0.6, params: { open: 1 } },
            { art: "palms", at: 0.84, k: 0.7, flip: true, params: { count: 1, coconuts: 0 } },
        ],
        gate: "tree-platform",
    },
    landmarks: ["tree-platform", "rope-bridge", "giant-flower", "palms"],
    creatures: ["parrot", "minibeasts", "kingfisher"],
    weather: "rays",
    seasons: ["summer"],
    guide: "snail",
    reaches: [
        { art: "rope-bridge", when: ["art:pendulum"], says: "A vine swings back the same way." },
        {
            art: "tree-platform",
            when: ["skill:physics.weight"],
            says: "The heavier basket sinks. The lighter rises.",
        },
        {
            art: "rope-bridge",
            when: ["skill:physics.friction"],
            says: "Rough rope grips. Smooth rope slips.",
        },
        {
            art: "giant-flower",
            when: ["skill:physics.floating", "art:parachute"],
            says: "Seeds spin down slowly, like parachutes.",
        },
        {
            art: "parrot",
            when: ["skill:physics.speed", "skill:physics.rate"],
            says: "How far does it fly each second?",
        },
        {
            art: "tree-platform",
            when: ["skill:physics.forces"],
            says: "Push the basket out. Pull it back.",
        },
        {
            art: "minibeasts",
            when: ["skill:physics.motion"],
            says: "Time the bee from flower to flower.",
        },
    ],
    offers: {
        landmarks: ["tree-platform", "rope-bridge", "giant-flower", "palms"],
        creatures: ["parrot", "minibeasts", "kingfisher"],
        grounds: ["mint", "glow"],
        guides: ["snail", "firefly", "bird"],
        weather: ["rays", "rain"],
    },
    wants: [
        {
            what: "A sloth hanging from a branch",
            why: "The slowest creature in the forest, and a comparison of fast and slow that a child will remember.",
        },
        {
            what: "Winged seeds spinning down",
            why: "Seeds that fall turning like small propellers, which is falling and floating in a single picture.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the lessons on forces and motion bring a child to, in any year. A plank walkway runs from tree to tree above the mist to a platform, and far above it a giant flower waits to open.",
        moment: {
            art: "giant-flower",
            says: "The giant flower opens at the top.",
            params: { open: 1 },
        },
        secret: { art: "kingfisher", says: "A kingfisher on a low branch." },
        by: "sea",
        rare: { art: "parakeets", way: "sky", from: "right" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "physics-push-and-pull",
                "physics-heavy-and-light",
                "physics-fast-and-slow",
                "physics-rough-and-smooth",
                "physics-air-pushes-back",
                "physics-rolling-down-a-ramp",
                "physics-energy-on-the-track",
                "physics-how-far-how-long",
                "physics-force-in-newtons",
                "physics-speed-from-distance-and-time",
                "physics-swinging",
                "physics-falling-and-floating",
                "physics-reading-a-rate",
                "physics-puzzles-2",
                "physics-year-review-2",
            ],
            label: "forces and motion",
            needs: "A lesson on air pushing back on a falling leaf, and one on how a lever lifts a load in the forest, which the physics track has not written yet.",
        },
        land: { terrain: "south-shore", near: ["railway"] },
    },
    map: {
        spots: [
            { art: "parrot", x: -430, y: -260, k: 0.55, is: "life" },
            { art: "giant-flower", x: 450, y: -80, k: 0.75, is: "moment", params: { open: 0 } },
            { art: "rope-bridge", x: -500, y: 190, k: 0.65, params: { planks: 10, gaps: 0 } },
            { art: "palms", x: 500, y: 250, k: 0.55, params: { count: 1, coconuts: 0 } },
            { art: "tree-platform", x: -20, y: 370, k: 1.05, is: "gate", params: { basket: 0 } },
            { art: "kingfisher", x: 660, y: 440, k: 0.5, is: "secret" },
        ],
        stamp: { x: -640, y: -420 },
    },
};
