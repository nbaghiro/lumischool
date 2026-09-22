import { defineDrawing } from "../drawing";
import { type WholeParams, PLANS, drawWhole } from "./whole";

export const ukulele = defineDrawing<WholeParams>({
    id: "ukulele",
    family: "music",
    title: "Ukulele",
    group: "Props",
    about:
        "A ukulele stood up facing you, the same way round as a chord box: the head with four pegs, the " +
        "nut, the neck with its frets and dots, the body with its sound hole and rosette, and the bridge " +
        "with its saddle. Parts can be named with a line to each, and one string ringed.",
    params: { labels: true, letters: true, ring: 0 },
    settings: {
        labels: { kind: "flag" },
        letters: { kind: "flag" },
        ring: { kind: "whole", min: 0, max: 4 },
    },
    takes: [
        { label: "Ukulele, parts named", params: { labels: true, letters: true, ring: 0 } },
        { label: "Ukulele, string 3 ringed", params: { labels: false, letters: true, ring: 3 } },
        { label: "Ukulele, plain", params: { labels: false, letters: false, ring: 0 } },
    ],
    box: (p) => ({ w: PLANS.uke.w + (p.labels ? 10 : 0), h: PLANS.uke.h }),
    draw: (c, p) => drawWhole(c, p, PLANS.uke),
    describe: (p) =>
        `A ukulele stood up facing you, its head with four pegs, its neck with frets and dots, its small body with a sound hole${p.labels ? ", its parts named with a line" : ""}.`,
});
