// Made by tools/scripts/map-snapshots.ts (npm run map:snapshots). Do not edit by hand.

import type { Snapshot } from "../snapshot";

/** The country with nobody on it, behind a page's cards, as the pages frame it. */
export const COUNTRY: readonly Snapshot[] = [
    {
        src: new URL("./country-harbour-wide.webp", import.meta.url).href,
        sample: false,
        across: 14400,
        world: { x: -19333, y: -1709, w: 15270, h: 11240 },
        aims: { "harbour|0|": { x: -11050, y: 3600, w: 1820, h: 1440 } },
    },
    {
        src: new URL("./country-harbour-narrow.webp", import.meta.url).href,
        sample: false,
        across: 4600,
        world: { x: -13491.6, y: 1158.5, w: 4883.1, h: 4883.1 },
        aims: { "harbour|0|": { x: -11050, y: 3600, w: 1820, h: 1440 } },
    },
    {
        src: new URL("./country-meadow-wide.webp", import.meta.url).href,
        sample: false,
        across: 14400,
        world: { x: -21246.2, y: -427.4, w: 15270, h: 11240 },
        aims: {
            "harbour|0.45|meadow": {
                x: -12963.2,
                y: 4881.6,
                w: 1820,
                h: 1440,
                place: { x: -11050, y: 3600 },
            },
        },
    },
    {
        src: new URL("./country-harbour-centered.webp", import.meta.url).href,
        sample: false,
        across: 14400,
        world: { x: -22285, y: -2538.4, w: 15270, h: 11240 },
        aims: { "harbour|0|": { x: -11050, y: 3600, w: 1820, h: 1440 } },
    },
    {
        src: new URL("./country-meadow-narrow.webp", import.meta.url).href,
        sample: false,
        across: 4600,
        world: { x: -14740.1, y: 2440.1, w: 4883.1, h: 4883.1 },
        aims: {
            "harbour|0.45|meadow": {
                x: -12963.2,
                y: 4881.6,
                w: 1820,
                h: 1440,
                place: { x: -11050, y: 3600 },
            },
        },
    },
];
