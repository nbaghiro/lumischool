// A list on a screen read one page at a time (.docs/pagination.md): the pages asked for one at a time,
// every list started again when what narrows it changes, and an answer to a question no longer asked
// dropped, so an older search never lands over a newer one. paged-list.tsx is its Solid face.

import type { Page } from "../page";
import type { Failure } from "./wire";

/** Where a list's pages come from: a function over a list in memory, or a route. */
export type Source<T, F> = (
    filters: F,
    after: string | null,
    limit: number,
) => Promise<Page<T> | Failure>;

export interface PagedState<T> {
    items: readonly T[];
    /** How many the source says match, once a page has said. */
    total: number | null;
    /** idle: no page asked for since the last start; ready: at least one page read. */
    status: "idle" | "loading" | "ready" | "failed";
    failure: Failure | null;
    /** Every match is on the page. */
    done: boolean;
    /** Pages read since the last start, and how many items the latest brought. */
    pages: number;
    added: number;
}

export interface Pager<F> {
    /** Starts the list again under `filters`, keeping what is shown until the first new page comes. */
    restart: (filters: F) => void;
    /** Asks for the next page, unless one is on its way, the last is read or the last ask failed. */
    more: () => void;
    /** Asks again for the page that failed. */
    again: () => void;
}

const EMPTY: PagedState<never> = {
    items: [],
    total: null,
    status: "idle",
    failure: null,
    done: false,
    pages: 0,
    added: 0,
};

/**
 * A pager over `source`, telling `changed` each state. With `lazy` a start asks for nothing until the
 * first `more`, so a list below the fold costs nothing until it comes near.
 */
export function pager<T, F>(
    source: Source<T, F>,
    filters: F,
    changed: (state: PagedState<T>) => void,
    opts: { limit: number; lazy?: boolean },
): Pager<F> {
    let state: PagedState<T> = EMPTY;
    let current = filters;
    let next: string | null = null;
    /** Whether the items shown are from the current start; until then the old ones stay up. */
    let fresh = false;
    /** The ask whose answer is awaited; any other answer is from a question no longer asked. */
    let asked = 0;
    const set = (s: PagedState<T>): void => {
        state = s;
        changed(s);
    };
    const ask = (): void => {
        const id = ++asked;
        const after = fresh ? next : null;
        set({ ...state, status: "loading", failure: null });
        const answered = (read: Page<T> | Failure): void => {
            if (id !== asked) return;
            if ("error" in read) {
                // what is shown from an earlier start would read as this search's answer
                const kept = fresh ? state : EMPTY;
                set({ ...kept, status: "failed", failure: read });
                return;
            }
            next = read.next;
            const items = fresh ? [...state.items, ...read.items] : read.items;
            const pages = fresh ? state.pages + 1 : 1;
            fresh = true;
            set({
                items,
                total: read.total ?? state.total,
                status: "ready",
                failure: null,
                done: read.next === null,
                pages,
                added: read.items.length,
            });
        };
        source(current, after, opts.limit).then(answered, () =>
            answered({ error: "offline", status: 0 }),
        );
    };
    const pg: Pager<F> = {
        restart: (f) => {
            current = f;
            fresh = false;
            next = null;
            asked++;
            if (opts.lazy && state.status === "idle") return;
            ask();
        },
        more: () => {
            if (state.status === "loading" || state.status === "failed") return;
            if (fresh && next === null) return;
            ask();
        },
        again: () => {
            if (state.status === "failed") ask();
        },
    };
    if (!opts.lazy) ask();
    return pg;
}
