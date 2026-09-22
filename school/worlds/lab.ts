// The laboratory: the end of the third year, in summer. Floorboards, a bench along the wall with the
// beaker, the burner and the jars on it, a window with the sun in it, and floor tape marking the way
// through. It is the second world indoors and the one whose landmarks reach furthest into the term:
// this is when the flame, the swing and the stopwatch lessons come, and each stands beside its day.
// The circuit and the magnet lessons come in the term before (year 3, unit 4), so the circuit waits on
// the bench for the term's last lesson, which is the moment, and reaches into no day.
import type { World } from "./types";

export const lab: World = {
    id: "laboratory",
    name: "The laboratory",
    about: "Floorboards, a bench along the wall with beakers and a burner on it, and floor tape marking the way. The burner, the microscope and the goggles stand beside the days that need them, and the circuit waits for the last.",
    mood: "a bright lab in summer",
    arrive: "This is the laboratory. Goggles on.",
    light: { ground: "tang", sky: "mint", accent: "sky", wash: 0.75 },
    indoor: true,
    ground: "boards",
    path: "tape",
    horizon: {
        far: [
            { art: "beaker", at: 0.1 },
            { art: "burner", at: 0.24 },
            { art: "particles", at: 0.4 },
            { art: "window", at: 0.68, sink: -170 },
            { art: "balance", at: 0.9 },
        ],
        gate: "door",
    },
    landmarks: [
        "circuit",
        "microscope",
        "safety-kit",
        "thermometer",
        "spring-balance",
        "test-tubes",
    ],
    creatures: ["mouse"],
    weather: "clear",
    seasons: ["summer"],
    guide: "glow",
    reaches: [
        {
            art: "mouse",
            when: ["skill:nature.maps"],
            says: "The mouse knows every square of the lab.",
        },
        {
            art: "thermometer",
            when: ["skill:number.negatives", "art:thermometer"],
            says: "Read the thermometer at eye level.",
        },
        {
            art: "thermometer",
            when: ["skill:chemistry.water-cycle"],
            says: "Warm water evaporates faster.",
        },
        {
            art: "beaker",
            when: ["skill:music", "skill:physics.sound"],
            says: "Tap the beakers. More water, lower note.",
        },
        {
            art: "beaker",
            when: ["skill:art.tints", "skill:art.space", "skill:art.warm-cool"],
            says: "More water, and the colour grows paler.",
        },
        {
            art: "beaker",
            when: ["skill:chemistry", "art:beaker"],
            says: "Measure it in the beaker.",
        },
        {
            art: "spring-balance",
            when: ["skill:physics.motion"],
            says: "Let the weight bounce up and down.",
        },
        {
            art: "stopwatch",
            when: ["skill:physics.speed", "skill:time.elapsed", "art:stopwatch"],
            says: "Start the stopwatch, then stop it.",
        },
        {
            art: "balance",
            when: ["skill:shapes.symmetry"],
            says: "A level balance matches on both sides.",
        },
        { art: "microscope", when: ["skill:algebra"], says: "Small goes in. Big comes out." },
        {
            art: "microscope",
            when: ["skill:art.looking"],
            says: "Up close, a picture is made of dots.",
        },
        {
            art: "microscope",
            when: ["skill:reading.text-features"],
            says: "Label the parts of the microscope.",
        },
        { art: "test-tubes", when: ["skill:money"], says: "Test tubes cost 30 cents each." },
        {
            art: "test-tubes",
            when: ["skill:coding.algorithms"],
            says: "Sort the test tubes, two at a time.",
        },
        {
            art: "mouse",
            when: ["skill:writing"],
            says: "Write about the mouse behind the beakers.",
        },
    ],
    offers: {
        landmarks: [
            "circuit",
            "magnet",
            "thermometer",
            "stopwatch",
            "spring-balance",
            "ramp",
            "beaker",
            "burner",
            "balance",
            "particles",
            "microscope",
            "safety-kit",
            "test-tubes",
        ],
        creatures: ["mouse"],
        grounds: ["tang", "sky", "mint"],
        guides: ["glow", "hand", "stub", "dot"],
        weather: ["clear", "cloudy", "rain"],
    },
    wants: [
        {
            what: "A lab coat on a peg",
            why: "The goggles and apron are on the bench now, and a coat by the door is the thing a child would put on first.",
        },
        {
            what: "A plant growing towards the window",
            why: "The science years grow seeds, and a plant leaning to the light would be the laboratory's own living thing beside the mouse.",
        },
    ],
    map: {
        spots: [
            { art: "tree", x: -560, y: 250, k: 0.7 },
            { art: "firs", x: 590, y: 170, k: 0.55 },
            { art: "hall", x: 0, y: 330, k: 1.55, is: "gate" },
            {
                art: "circuit",
                x: 450,
                y: 430,
                k: 0.8,
                is: "moment",
                params: { closed: 0, cells: 1, buzzer: 0 },
            },
            { art: "microscope", x: -440, y: 440, k: 0.6 },
            { art: "mouse", x: 670, y: 440, k: 0.8, is: "secret" },
        ],
        decor: "lawn",
        stamp: { x: -560, y: -320 },
    },
    chapter: {
        story: "The end of the third year, indoors: a laboratory with a circuit, magnets, a burner and a window onto the spring, and a bulb on the bench that has not been lit.",
        moment: {
            art: "circuit",
            says: "The circuit is closed. The bulb lights.",
            params: { closed: 1, cells: 1, buzzer: 0 },
        },
        secret: { art: "mouse", says: "A mouse behind the beakers." },
        by: "road",
        rare: { art: "kite", way: "appear", on: { far: 3, up: 0.5 }, k: 1 },
    },
};
