// The canal town: the first world of a fifth year, on the far shore seen from the lantern at the top
// of the island. A straight canal with brick copings, narrowboats, a mill and a humped bridge, and a
// lock that lifts the boats uphill a step at a time. Its lessons are not written yet, so it is walked
// with an empty path until they are.
import type { World } from "./types";

export const canalTown: World = {
    id: "canal-town",
    name: "The canal town",
    about: "A town along a canal on the far shore, with narrowboats, a mill, a humped bridge and a lock that lifts the boats uphill. The first world of a fifth year, seen from the lantern at the top of the island.",
    mood: "an autumn morning on the water",
    arrive: "This is the canal. Boats climb here.",
    light: { ground: "tang", sky: "sky", low: "mint", accent: "mint", wash: 0.75 },
    ground: "canal",
    path: "bricks",
    horizon: {
        far: [
            { art: "mill", at: 0.13, k: 1.05 },
            { art: "canal-bridge", at: 0.44, k: 1.8, sink: 104 },
            { art: "narrowboat", at: 0.68, k: 1, sink: 58 },
            { art: "houses", at: 0.88, k: 0.9, params: { count: 2, windows: 3 } },
            { art: "observatory", at: 0.97, k: 0.28, sink: -150 },
        ],
        gate: "lock",
    },
    landmarks: ["narrowboat", "canal-bridge", "market-stall", "signpost", "bicycle", "houses"],
    creatures: ["duck", "heron", "cat", "dog"],
    weather: "cloudy",
    seasons: ["autumn"],
    guide: "hand",
    reaches: [
        {
            art: "lock",
            when: ["skill:capacity", "art:jug"],
            says: "Fill the lock. How much water?",
        },
        {
            art: "narrowboat",
            when: ["skill:multiplication.scaling", "skill:fractions.equivalent"],
            says: "Two pots for every window.",
        },
        { art: "canal-bridge", when: ["skill:shapes"], says: "One arch, half a circle." },
        {
            art: "market-stall",
            when: ["skill:money.decimals"],
            says: "Prices at the canal market.",
        },
        {
            art: "signpost",
            when: ["skill:measure.metric", "skill:time.elapsed"],
            says: "How far to the next lock?",
        },
    ],
    offers: {
        landmarks: [
            "narrowboat",
            "canal-bridge",
            "market-stall",
            "signpost",
            "bicycle",
            "houses",
            "lock",
            "mill",
            "clock-tower",
        ],
        creatures: ["duck", "heron", "cat", "dog", "gull"],
        grounds: ["tang", "glow"],
        guides: ["hand", "stub", "snail"],
        weather: ["cloudy", "clear", "rain", "mist"],
    },
    wants: [
        {
            what: "A lock-keeper's cottage with a tally board",
            why: "Where the boats through the lock are counted and a timetable for the lock is kept, which is the fifth year's timetables and tallies in one picture.",
        },
        {
            what: "Swans on the canal",
            why: "The canal's own creature, gliding past the boats, and a family of them to count, white parents with grey young beside them.",
        },
    ],
    map: {
        spots: [
            { art: "houses", x: -470, y: 40, k: 1.1 },
            { art: "clock-tower", x: 90, y: -90, k: 1.05 },
            { art: "houses", x: 470, y: 10, k: 0.95, flip: true, params: { count: 3, windows: 3 } },
            { art: "narrowboat", x: -200, y: 190, k: 0.85 },
            { art: "lock", x: 60, y: 400, k: 1.25, is: "gate" },
            { art: "bridge", x: 560, y: 400, k: 0.75 },
            { art: "duck", x: -620, y: 440, k: 0.6, is: "secret" },
        ],
        stamp: { x: -640, y: -360 },
    },
    chapter: {
        story: "The far shore, first seen from the lantern at the top of the island. The first world after the map's end is a town on a canal, where a lock lifts the boats uphill a step at a time, and far up the coast the observatory stands on its cliffs.",
        moment: {
            art: "lock",
            says: "The gates open and the boat sails on.",
            params: { level: 1, boat: 1 },
            before: { level: 0, boat: 1 },
        },
        secret: { art: "duck", says: "A duck asleep on a boat roof." },
        glimpse: { world: "star-cliffs", art: "observatory" },
        by: "sea",
        rare: { art: "narrowboat", way: "horizon", from: "left" },
    },
    site: {
        kind: "term",
        grade: 5,
        term: 1,
        land: { terrain: "far-shore", near: ["volcano-island", "star-cliffs"] },
    },
    needs: "A fifth year of lessons, and for this term: ratio and proportion, volume and capacity, decimals to thousandths, timetables, and reading a real map.",
};
