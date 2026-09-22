// Made by tools/scripts/map-snapshots.ts (npm run map:snapshots). Do not edit by hand.

import type { Snapshot } from "../snapshot";

/** The sample child's map at the site's opening, as the pages frame it. */
export const SITE: readonly Snapshot[] = [
    {
        src: new URL("./site-wide.webp", import.meta.url).href,
        sample: true,
        across: 14400,
        world: { x: -19333, y: -1709, w: 15270, h: 11240 },
        aims: { "|0|": { x: -11050, y: 3600, w: 1820, h: 1440 } },
    },
    {
        src: new URL("./site-narrow.webp", import.meta.url).href,
        sample: true,
        across: 4600,
        world: { x: -13491.6, y: 610, w: 4883.1, h: 5980 },
        aims: { "|0|": { x: -11050, y: 3600, w: 1820, h: 1440 } },
    },
];
