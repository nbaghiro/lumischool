// The two small signals a child's page and its bar share about the world's guide (tutor.tsx):
// which guide the page has, so the bar can draw it, and the tap on the bar's guide, which whoever
// holds what the child is doing now, the current question on a sheet or the map, answers by opening
// the guide's card. Its own small module so the bar and the map screen carry none of the card's code
// before it is asked for.
import { createSignal } from "solid-js";

const [guideNow, setGuideNow] = createSignal<string | null>(null);

/** Which guide a child's page has, by its design's id, or null off a child's page. */
export const nameGuide = setGuideNow;
export const guideOf = guideNow;

const [nudged, setNudged] = createSignal(0);

/** The child asked the guide from the bar. */
export const nudge = (): void => {
    setNudged((n) => n + 1);
};

/** How many times, for the screen that answers to hear each one. */
export const nudges = nudged;
