// The canal town: the first world of a fifth year, on the far shore seen from the lantern at the top
// of the island. A straight canal with brick copings, narrowboats, a mill and a humped bridge, and a
// lock that lifts the boats uphill a step at a time.
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
            when: ["skill:volume", "skill:capacity", "skill:physics.pressure", "art:jug"],
            says: "Fill the lock. How much water?",
        },
        {
            art: "mill",
            when: ["skill:decimals.by-ten"],
            says: "Sacks of flour by tens, hundreds and thousands.",
        },
        {
            art: "narrowboat",
            when: ["skill:physics.floating", "skill:physics.water-resistance"],
            says: "A narrowboat floats low in the water.",
        },
        {
            art: "signpost",
            when: [
                "skill:time.timetables",
                "skill:time.elapsed",
                "skill:rates.speed",
                "skill:measure.metric",
            ],
            says: "How far to the next lock, and when?",
        },
        {
            art: "market-stall",
            when: [
                "skill:money.decimals",
                "skill:decimals.multiply",
                "skill:decimals.divide",
                "skill:rates.unit-price",
            ],
            says: "Prices at the canal market.",
        },
        {
            art: "market-stall",
            when: ["skill:solids"],
            says: "Each crate for the market folds up from flat card.",
        },
        {
            art: "canal-bridge",
            when: ["skill:physics.heat"],
            says: "A bridge grows a little longer on a hot day.",
        },
        {
            art: "canal-bridge",
            when: ["skill:art.perspective"],
            says: "The bridge shrinks far down the canal.",
        },
        {
            art: "canal-bridge",
            when: ["skill:art"],
            says: "Paint the humped bridge over the canal.",
        },
        {
            art: "canal-bridge",
            when: ["skill:music"],
            says: "A tune echoes under the bridge.",
        },
        {
            art: "lock",
            when: ["skill:chemistry.rusting"],
            says: "Rust creeps along the lock's iron gates.",
        },
        {
            art: "lock",
            when: ["skill:chemistry.mixtures", "skill:chemistry.separating"],
            says: "What is mixed into the canal water?",
        },
        {
            art: "mill",
            when: ["skill:coding"],
            says: "The mill keeps count of every sack.",
        },
        {
            art: "heron",
            when: ["skill:nature"],
            says: "Look at what lives along the canal.",
        },
        {
            art: "clock-tower",
            when: ["skill:physics.motion"],
            says: "Time it by the town clock.",
        },
        {
            art: "narrowboat",
            when: ["skill:reading", "skill:writing"],
            says: "Each narrowboat has its name painted on.",
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
};
