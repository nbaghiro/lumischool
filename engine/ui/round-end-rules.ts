import type { IconName } from "../parts/apps/icon";

/** What a finished round can lead to. */
export type EndAction = "next" | "another" | "again" | "watch";

/** What the page can offer once a round ends. */
export interface EndChoice {
    won: boolean;
    /** The game has other arrangements of the level. */
    variations: boolean;
    /** There is a level after this one. */
    next: boolean;
    /** The try can be watched again. */
    watch: boolean;
}

/** The card waits this long after the end, so the last moment of play is seen first. */
export const END_DELAY_MS = 600;

export const END_ACTION: Record<EndAction, { label: string; icon: IconName }> = {
    next: { label: "Next level", icon: "play" },
    another: { label: "New one", icon: "shuffle" },
    again: { label: "Again", icon: "restart" },
    watch: { label: "Watch it again", icon: "watch" },
};

/** The actions on offer, the primary one first: on a win the way on, otherwise another go at the same. */
export function actionsOf(c: EndChoice): EndAction[] {
    const next: EndAction[] = c.next ? ["next"] : [];
    const another: EndAction[] = c.variations ? ["another"] : [];
    if (!c.won) return ["again", ...another, ...next];
    return [...next, ...another, "again", ...(c.watch ? (["watch"] as const) : [])];
}

/** The card's heading: never a harsh word for a round that was not won. */
export const titleOf = (won: boolean): string =>
    won ? "Well played!" : "Nearly! Have another go.";
