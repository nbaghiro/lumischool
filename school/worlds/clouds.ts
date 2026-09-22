// The cloud islands: up past the clouds from a balloon, where islands float with their own trees and
// waterfalls and a rope bridge is built between them a plank at a time. Not a term's world but a
// place the lessons on weather and the sky bring a child to in any year, above the mountains.
import type { World } from "./types";

export const cloudIslands: World = {
    id: "cloud-islands",
    name: "The cloud islands",
    about: "Islands floating above a sea of cloud, with trees and waterfalls of their own, a weather station, a windsock and gulls, reached by balloon and joined by a rope bridge. A place for the lessons on weather and the sky, in any year.",
    mood: "a clear day above the clouds",
    arrive: "You are above the clouds now.",
    light: { ground: "sky", sky: "sky", accent: "tang", wash: 0.6, deep: "high" },
    ground: "cloudtop",
    path: "puffs",
    horizon: {
        far: [
            { art: "sky-island", at: 0.14, k: 0.6, sink: -120, params: { trees: 1, falls: 1 } },
            { art: "weather-station", at: 0.5, k: 0.9 },
            {
                art: "sky-island",
                at: 0.84,
                k: 0.8,
                sink: -60,
                flip: true,
                params: { trees: 2, falls: 1 },
            },
        ],
        gate: "balloon",
    },
    landmarks: ["sky-island", "weather-station", "windsock", "rope-bridge"],
    creatures: ["gull-flying"],
    weather: "clear",
    seasons: ["summer"],
    guide: "bird",
    reaches: [
        {
            art: "sky-island",
            when: ["art:globe", "art:planets"],
            says: "Night comes as the Earth turns.",
        },
        {
            art: "weather-station",
            when: ["skill:chance"],
            says: "Will it rain tomorrow? Likely or unlikely?",
        },
        {
            art: "weather-station",
            when: ["skill:data.line-graphs", "skill:data.mean"],
            says: "Plot the temperature on a line graph.",
        },
        {
            art: "weather-station",
            when: ["skill:data.tally", "skill:data.picture-graphs", "skill:data.bar-graph"],
            says: "Tally the rainy days on the chart.",
        },
        {
            art: "windsock",
            when: ["skill:geography"],
            says: "The windsock points the way the wind goes.",
        },
        {
            art: "balloon",
            when: ["skill:physics.sky"],
            says: "The sun climbs, then sinks behind the clouds.",
        },
    ],
    offers: {
        landmarks: ["sky-island", "weather-station", "windsock", "rope-bridge", "balloon"],
        creatures: ["gull-flying", "gull"],
        grounds: ["sky", "glow"],
        guides: ["bird", "firefly", "glow"],
        weather: ["clear", "breezy"],
    },
    wants: [
        {
            what: "A rain gauge",
            why: "The weather lessons measure rain, and the station on the shelf measures the wind; a gauge filling up would be the islands' own chart.",
        },
        {
            what: "Swallows round the islands",
            why: "Birds that live on the wing would give the islands a creature of their own besides the gulls that came up from the harbour.",
        },
    ],
    chapter: {
        story: "Not a term's world but a place the lessons on weather and the sky bring a child to, in any year. Up past the clouds from the balloon, islands float with their own trees and waterfalls, and a rope bridge is being built between them, a plank at a time.",
        moment: {
            art: "rope-bridge",
            says: "The rope bridge reaches the top island.",
            params: { planks: 12, gaps: 0 },
            before: { planks: 12, gaps: 4 },
        },
        secret: { art: "gull", says: "A gull asleep on a cloud." },
        by: "air",
        rare: { art: "geese", way: "sky", from: "right" },
    },
    site: {
        kind: "track",
        hosts: {
            subjects: [],
            lessons: [
                "g1-tally-and-graphs",
                "physics-the-sun-and-the-moon",
                "g2-sorting-and-chance",
                "geography-maps",
                "g4-graphs-and-the-mean",
                "physics-day-night-and-the-moon",
                "nature-weather-measured",
            ],
            label: "weather and the sky",
            needs: "The weather lessons the nature track would bring: reading a thermometer outside, measuring rain, the seasons and the weather on a chart.",
        },
        land: { terrain: "sky", near: ["mountains"] },
    },
    map: {
        spots: [
            { art: "sky-island", x: -380, y: 200, k: 0.9, params: { trees: 1, falls: 1 } },
            {
                art: "sky-island",
                x: 420,
                y: -40,
                k: 1.1,
                flip: true,
                params: { trees: 2, falls: 1 },
            },
            {
                art: "rope-bridge",
                x: 30,
                y: 60,
                k: 0.6,
                is: "moment",
                params: { planks: 12, gaps: 4 },
            },
            { art: "balloon", x: -150, y: 420, k: 0.9, is: "gate" },
            { art: "weather-station", x: 480, y: 360, k: 0.6 },
            { art: "gull-flying", x: -560, y: -420, k: 0.6, is: "life" },
            { art: "gull", x: 660, y: 440, k: 0.55, is: "secret" },
        ],
        decor: "clouds",
        stamp: { x: -640, y: -360 },
    },
};
