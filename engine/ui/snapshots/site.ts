// Made by tools/scripts/map-snapshots.ts (npm run map:snapshots). Do not edit by hand.

import type { Snapshot } from "../snapshot";

/** The sample child's map at the site's opening, as the pages frame it. */
export const SITE: readonly Snapshot[] = [
    {
        src: new URL("./site-wide.webp", import.meta.url).href,
        sample: true,
        across: 14400,
        zoom: 0.1,
        world: { x: -25983, y: 2691, w: 15270, h: 11240 },
        aims: { "|0|": { x: -17700, y: 8000, w: 1820, h: 1440 } },
    },
    {
        src: new URL("./site-narrow.webp", import.meta.url).href,
        sample: true,
        across: 4600,
        zoom: 0.084783,
        world: { x: -20141.5, y: 5010, w: 4883.1, h: 5980 },
        aims: { "|0|": { x: -17700, y: 8000, w: 1820, h: 1440 } },
    },
];
