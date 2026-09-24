/** How the drawing of today's sheets stands: Solid's resource states. */
export type Drawing = "unresolved" | "pending" | "ready" | "refreshing" | "errored";

/**
 * Whether going into a world waits for today's sheets, which the roll is laid out round: only while
 * there are sheets to draw and they can still come. A day with nothing planned has none, and sheets
 * that failed to draw will not come, so the world opens without them (a child with nothing planned
 * waited for ever). */
export const waitsForSheets = (lessonsToday: number, drawing: Drawing): boolean =>
    lessonsToday > 0 && drawing !== "errored";
