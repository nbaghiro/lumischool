// The old tower: a round tower of stone on a crag, built in courses laid one on another in the order
// things happened, where the history lessons are. Fallen stones and poppies on the crag, old
// flagstones for a path, rooks in a windy sky, and a flag that flies from the top again at the end.
import type { World } from "./types";

export const oldTower: World = {
    id: "old-tower",
    name: "The old tower",
    about: "A round stone tower on a crag, older than the map, its stones laid in courses one on another in the order things happened. Fallen stones, poppies and old flagstones, and a flag that flies from the top again when the history lessons are done.",
    mood: "a windy afternoon on the crag",
    arrive: "This is the old tower. Look how old.",
    light: { ground: "tang", sky: "sky", low: "glow", accent: "berry", wash: 0.75 },
    ground: "crag",
    path: "flags",
    horizon: {
        far: [
            { art: "firs", at: 0.5, k: 0.62, params: { count: 4, snow: 0 } },
            { art: "peaks", at: 0.78, k: 0.42, params: { count: 3, snow: 1 } },
            { art: "firs", at: 0.94, k: 0.5, params: { count: 2, snow: 0 } },
        ],
        gate: "stone-tower",
    },
    landmarks: ["sundial", "chest", "lantern", "bridge", "signpost"],
    creatures: ["owl", "fox", "rabbits", "birds"],
    weather: "breezy",
    seasons: ["autumn"],
    guide: "glow",
    reaches: [
        {
            art: "sundial",
            when: ["skill:time.reading-clocks", "skill:physics.light"],
            says: "The shadow tells the time.",
        },
        { art: "chest", when: ["skill:money.coins"], says: "Old coins in the chest. Count them." },
        { art: "signpost", when: ["skill:geography"], says: "Find the tower on the map." },
        {
            art: "stone-tower",
            when: ["skill:time.elapsed"],
            says: "One row of stones, one more time.",
        },
    ],
    offers: {
        landmarks: ["sundial", "chest", "lantern", "bridge", "signpost", "stone-tower", "firs"],
        creatures: ["owl", "fox", "rabbits", "birds", "mouse"],
        grounds: ["tang", "glow", "berry"],
        guides: ["glow", "firefly", "stub"],
        weather: ["breezy", "cloudy", "clear", "rain"],
    },
    wants: [
        {
            what: "Rooks nesting round the top",
            why: "The tower's own birds, circling it on a windy day and nesting in its battlements, which would give its sky something to count and its moment company.",
        },
        {
            what: "A stone with old writing on it",
            why: "Something for the lessons on reading old writing to point at, carved letters worn smooth at the foot of the tower.",
        },
    ],
    map: {
        spots: [
            { art: "peaks", x: 380, y: -120, k: 0.9, params: { count: 3, snow: 1 } },
            { art: "firs", x: -460, y: 40, k: 0.8, params: { count: 4, snow: 0 } },
            {
                art: "stone-tower",
                x: -40,
                y: 300,
                k: 1.3,
                is: "gate",
                params: { courses: 8, flag: 0 },
            },
            { art: "fox", x: 320, y: 200, k: 0.6, is: "life" },
            { art: "bridge", x: 430, y: 400, k: 0.7 },
            { art: "sundial", x: -420, y: 430, k: 0.6 },
            { art: "owl", x: 660, y: 440, k: 0.55, is: "secret" },
        ],
        stamp: { x: -640, y: -400 },
    },
    chapter: {
        story: "Not a term's world but a place the history lessons bring a child to, in any year: a tower older than the map on a crag above the woods, whose stones are laid in the order things happened, and whose flag has not flown for a long time.",
        moment: {
            art: "stone-tower",
            says: "The flag flies from the top again.",
            params: { courses: 8, flag: 1 },
            before: { courses: 8, flag: 0 },
        },
        secret: { art: "owl", says: "An owl in the tower window." },
        by: "path",
        rare: { art: "eagle", way: "sky", from: "left" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: ["history"],
            needs: "A history track, which the corpus does not have yet: timelines, then and now, old maps, reading old writing, and how a place changed.",
        },
        land: { terrain: "hilltop", near: ["railway", "woods"] },
    },
};
