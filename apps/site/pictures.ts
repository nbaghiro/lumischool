// Made by tools/scripts/site-pictures.ts (npm run site:pictures). Do not edit by hand.

/** Pictures of the sample child's map as the site's sections show it, for a wide screen and a phone. */
export const PICTURES: {
    journey: { wide: readonly string[]; narrow: readonly string[] };
    cards: { wide: readonly string[]; narrow: readonly string[] };
    journal: { wide: readonly string[]; narrow: readonly string[] };
} = {
    journey: {
        wide: [
            new URL("./pictures/journey-wide-0.webp", import.meta.url).href,
            new URL("./pictures/journey-wide-1.webp", import.meta.url).href,
        ],
        narrow: [
            new URL("./pictures/journey-narrow-0.webp", import.meta.url).href,
            new URL("./pictures/journey-narrow-1.webp", import.meta.url).href,
        ],
    },
    cards: {
        wide: [new URL("./pictures/cards-wide-0.webp", import.meta.url).href],
        narrow: [new URL("./pictures/cards-narrow-0.webp", import.meta.url).href],
    },
    journal: {
        wide: [new URL("./pictures/journal-wide-0.webp", import.meta.url).href],
        narrow: [new URL("./pictures/journal-narrow-0.webp", import.meta.url).href],
    },
};
