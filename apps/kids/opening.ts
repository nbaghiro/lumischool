// How long going into a world may wait, and what the page says while it does (child.tsx). A child
// never waits on "Your page is opening." for ever: past a long wait the page says so and offers to try
// again, since a page left open while its code changed, or a deploy, can leave nothing to wait for.

/** How long a world may take to open before the page says it is opening, in ms. */
export const SAY_OPENING = 600;

/** How long a world may take to open before the page says it is taking a long time, in ms. */
export const TOO_LONG = 15_000;

/** What the page says while a world opens: nothing for a moment, that it is opening, then that it is slow. */
export type OpeningLine = "nothing" | "opening" | "slow";

export const openingLine = (waited: number): OpeningLine =>
    waited < SAY_OPENING ? "nothing" : waited < TOO_LONG ? "opening" : "slow";

/** How the drawing of today's sheets stands: Solid's resource states. */
export type Drawing = "unresolved" | "pending" | "ready" | "refreshing" | "errored";

/**
 * Whether going into a world waits for today's sheets, which the roll is laid out round: only while
 * there are sheets to draw and they can still come. A day with nothing planned has none, and sheets
 * that failed to draw will not come, so the world opens without them (a child with nothing planned
 * waited on "Your page is opening." for ever). */
export const waitsForSheets = (lessonsToday: number, drawing: Drawing): boolean =>
    lessonsToday > 0 && drawing !== "errored";
