// The sports ground: the middle of the third year. A mown field with the running track for a path, a
// grandstand along the top, a goal and a scoreboard, and a dog after the ball. The term is division
// with remainders and perimeter and area, and a sports ground is where a child picks teams and walks
// round the edge of a pitch.
import type { World } from "./types";

export const sportsGround: World = {
    id: "sports-ground",
    name: "The sports ground",
    about: "A mown field with a running track for a path, a grandstand along the top and a goal at the side. There is always a dog after the ball.",
    mood: "a crisp morning on the field",
    arrive: "This is the sports ground. On your marks.",
    light: { ground: "mint", sky: "sky", accent: "berry", wash: 0.75 },
    ground: "field",
    path: "track",
    horizon: {
        far: [
            { art: "grandstand", at: 0.22, k: 1.35, params: { rows: 3, seats: 12, filled: 29 } },
            { art: "scoreboard", at: 0.56, k: 1.1 },
            { art: "grandstand", at: 0.85, k: 1.1, params: { rows: 2, seats: 8, filled: 11 } },
        ],
        gate: "podium",
    },
    landmarks: ["goal", "target", "team-shirts", "long-jump", "medals", "race-track"],
    creatures: ["dog", "birds"],
    weather: "breezy",
    seasons: ["winter", "spring"],
    guide: "hand",
    reaches: [
        {
            art: "goal",
            when: ["skill:perimeter"],
            says: "Walk round the pitch: that is its perimeter.",
        },
        { art: "team-shirts", when: ["skill:division"], says: "Pick teams. Who is left over?" },
        {
            art: "race-track",
            when: ["skill:fractions.equivalent", "skill:fractions.equal-parts"],
            says: "Half the runners have finished.",
        },
        {
            art: "race-track",
            when: ["skill:decimals", "skill:physics.speed", "art:stopwatch"],
            says: "The race is timed in tenths of seconds.",
        },
        {
            art: "target",
            when: ["skill:art.pattern", "skill:art.space"],
            says: "The target's rings shrink towards the middle.",
        },
        {
            art: "team-shirts",
            when: ["skill:chemistry.evaporating"],
            says: "Wet shirts dry as the water evaporates.",
        },
        {
            art: "long-jump",
            when: ["skill:chemistry.separating"],
            says: "Sieve the stones out of the sand.",
        },
        {
            art: "scoreboard",
            when: ["skill:coding", "art:scoreboard"],
            says: "If the ball goes in, add one.",
        },
        {
            art: "birds",
            when: ["skill:nature.food-chains", "skill:nature.habitats"],
            says: "The birds are after worms in the grass.",
        },
        {
            art: "medals",
            when: ["skill:physics.motion", "skill:physics.circuits"],
            says: "The medal swings on its ribbon.",
        },
        {
            art: "race-track",
            when: ["skill:reading.story-structure", "skill:reading.sequencing"],
            says: "First, second, third. Tell the race in order.",
        },
        {
            art: "team-shirts",
            when: ["skill:writing.punctuation", "skill:writing.planning"],
            says: "List the team with commas between.",
        },
        {
            art: "grandstand",
            when: ["skill:music"],
            says: "The crowd claps in time: one, two, three.",
        },
    ],
    offers: {
        landmarks: [
            "goal",
            "target",
            "team-shirts",
            "long-jump",
            "medals",
            "race-track",
            "scoreboard",
            "grandstand",
            "podium",
            "bunting",
        ],
        creatures: ["dog", "birds", "gull"],
        grounds: ["mint", "glow", "tang"],
        guides: ["hand", "bird", "stub", "glow"],
        weather: ["breezy", "clear", "cloudy", "rain"],
    },
    wants: [
        {
            what: "Corner flags and a pitch drawn from above",
            why: "The pitch is the perimeter lesson's own picture, and seen from above its lines are the thing a question would ask about.",
        },
        {
            what: "A relay baton passing between two runners",
            why: "The handover is the moment a race is about, and it would let the runners do something beside the track rather than only go by.",
        },
    ],
    map: {
        spots: [
            { art: "grandstand", x: -330, y: -110, k: 0.95 },
            { art: "scoreboard", x: 390, y: -150, k: 0.85 },
            { art: "podium", x: -60, y: 420, k: 0.95, is: "gate" },
            { art: "goal", x: 450, y: 400, k: 0.75 },
            { art: "target", x: -580, y: 270, k: 0.5 },
            { art: "hedgehog", x: -660, y: 440, k: 0.7, is: "secret" },
            { art: "runners", x: 60, y: 140, k: 0.7 },
        ],
        decor: "track",
        stamp: { x: 40, y: -480 },
    },
    chapter: {
        story: "Winter sports: a running track for a path, a scoreboard, a long jump pit and a grandstand, and a podium at the gate with its third step empty.",
        moment: {
            art: "podium",
            says: "All three steps of the podium are filled.",
            params: { filled: [true, true, true], names: ["", "", ""] },
            before: { filled: [true, true, false], names: ["", "", ""] },
        },
        secret: { art: "hedgehog", says: "A hedgehog under the grandstand." },
        by: "path",
        rare: { art: "runners", way: "horizon", from: "left" },
    },
};
