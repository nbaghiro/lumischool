// The grown-ups' reads every screen shares while the app is open (engine/ui/held.ts): who is signed
// in, the family, the pack's index, each child's record and the family's events. A screen asks here
// rather than api.ts, so a move between screens draws from what the last one read, and any write the
// API accepts has the next read wait for the network.

import * as api from "../../engine/ui/api";
import { grownRecord } from "../../engine/ui/grown";
import { held, heldBy } from "../../engine/ui/held";
import { onWrite, unreadable, type Failure } from "../../engine/ui/wire";
import type { Draft, Envelope } from "../../engine/answer";

export const me = held(() => api.me({ ask: true }));
export const family = held(() => api.familyRows({ ask: true }));
// the index is the pack's, named by its digest; a new pack comes with a new page
export const pack = held(api.pack, { keep: true });
export const record = heldBy(grownRecord);

type Query = NonNullable<Parameters<typeof api.events>[1]>;
const queries = new Map<string, [string | undefined, Query]>();
const eventsBy = heldBy(async (key: string): Promise<{ list: Envelope[] } | Failure> => {
    const q = queries.get(key);
    const list = q ? await api.events(...q) : null;
    return list ? { list } : unreadable(0);
});

/** The family's events a query names, shared by every screen that asks the same. */
export function events(kid: string | undefined, query: Query) {
    const key = JSON.stringify([kid ?? "", query]);
    queries.set(key, [kid, query]);
    return eventsBy.of(key);
}

onWrite(() => {
    me.stale();
    family.stale();
    record.stale();
    eventsBy.stale();
});

let toPrint: Draft | null = null;
/**
 * A child's sheet a card hands to Explore to print in the mobile app, recorded only once the app says
 * it printed (explore.tsx); a browser's print records it as the card sends it.
 */
export const printing = {
    hand: (draft: Draft): void => {
        toPrint = draft;
    },
    take: (): Draft | null => {
        const d = toPrint;
        toPrint = null;
        return d;
    },
};
