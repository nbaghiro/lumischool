import { defineDrawing } from "../drawing";
import { type WholeParams, PLANS, drawWhole } from "./whole";

export const guitar = defineDrawing<WholeParams>({
    id: "guitar",
    family: "music",
    title: "Guitar",
    group: "Props",
    about:
        "A guitar stood up facing you, the same way round as a chord box: the head with six tuning pegs, " +
        "the bone nut, the neck with its frets and dots, the spruce body with its sound hole and rosette, " +
        "the pickguard, and the bridge with its saddle and pins. The six strings are drawn at their " +
        "thicknesses, the three low ones wound. Parts can be named with a line to each, and one string ringed.",
    params: { labels: true, letters: true, ring: 0 },
    settings: {
        labels: { kind: "flag" },
        letters: { kind: "flag" },
        ring: { kind: "whole", min: 0, max: 6 },
    },
    takes: [
        { label: "Guitar, parts named", params: { labels: true, letters: true, ring: 0 } },
        { label: "Guitar, the low E ringed", params: { labels: false, letters: true, ring: 6 } },
        { label: "Guitar, plain", params: { labels: false, letters: false, ring: 0 } },
    ],
    box: (p) => ({ w: PLANS.guitar.w + (p.labels ? 10 : 0), h: PLANS.guitar.h }),
    draw: (c, p) => drawWhole(c, p, PLANS.guitar),
    describe: (p) =>
        `A guitar stood up facing you, its head with six pegs, its neck with frets and dots, its body with a sound hole${p.labels ? ", its parts named with a line" : ""}.`,
});
