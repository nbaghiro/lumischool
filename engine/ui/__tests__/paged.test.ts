import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cursorOf, pageOfList, queryHash, readCursor, type Page } from "../../page";
import { pager, type PagedState, type Source } from "../paged";
import type { Failure } from "../wire";

const WORDS = Array.from(
    { length: 23 },
    (_, i) => `word ${String(i).padStart(2, "0")}${i % 3 ? "" : " three"}`,
);

/** A source over WORDS narrowed by `words`, as a list in memory is read. */
const memory: Source<string, string> = (words, after, limit) => {
    const query = queryHash({ words });
    let from = null;
    if (after !== null) {
        const read = readCursor(after, query, ["string"]);
        if ("problem" in read) return Promise.resolve({ error: "bad-request", status: 400 });
        from = read.key;
    }
    const sorted = WORDS.filter((w) => w.includes(words));
    return Promise.resolve(pageOfList(sorted, (w) => [w], { after: from, limit, query }));
};

/** A source whose answers wait until the test gives them, in any order. */
function held(): {
    source: Source<string, string>;
    asks: { words: string; after: string | null; answer: (a: Page<string> | Failure) => void }[];
} {
    const asks: {
        words: string;
        after: string | null;
        answer: (a: Page<string> | Failure) => void;
    }[] = [];
    return {
        asks,
        source: (words, after) =>
            new Promise((answer) => {
                asks.push({ words, after, answer });
            }),
    };
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function watch<T>(): { last: () => PagedState<T>; seen: PagedState<T>[] } {
    const seen: PagedState<T>[] = [];
    return {
        seen,
        last: () => {
            const s = seen.at(-1);
            assert.ok(s);
            return s;
        },
    };
}

describe("a paged list", () => {
    it("reads the first page at once, and every page after it once and in order", async () => {
        const w = watch<string>();
        const p = pager<string, string>(memory, "", (s) => w.seen.push(s), { limit: 10 });
        await tick();
        assert.equal(w.last().items.length, 10);
        assert.equal(w.last().total, 23);
        p.more();
        await tick();
        p.more();
        await tick();
        assert.deepEqual(w.last().items, WORDS);
        assert.equal(w.last().done, true);
        const asked = w.seen.length;
        p.more();
        await tick();
        assert.equal(w.seen.length, asked, "nothing is asked past the last page");
    });

    it("asks for one page at a time", async () => {
        const h = held();
        const p = pager<string, string>(h.source, "", () => undefined, { limit: 5 });
        p.more();
        p.more();
        assert.equal(h.asks.length, 1);
        h.asks[0]?.answer({ items: ["a"], next: cursorOf(["a"], "q"), total: 9 });
        await tick();
        p.more();
        assert.equal(h.asks.length, 2);
        assert.equal(h.asks[1]?.after, cursorOf(["a"], "q"));
    });

    it("starts every list again on a new search, and a late answer to the old one never lands", async () => {
        const h = held();
        const w = watch<string>();
        const p = pager<string, string>(h.source, "old", (s) => w.seen.push(s), { limit: 5 });
        p.restart("new");
        assert.equal(h.asks.length, 2);
        assert.equal(h.asks[1]?.after, null, "a new search starts at the top");
        h.asks[1]?.answer({ items: ["new 1"], next: null, total: 1 });
        await tick();
        h.asks[0]?.answer({ items: ["old 1", "old 2"], next: "x", total: 40 });
        await tick();
        assert.deepEqual(w.last().items, ["new 1"]);
        assert.equal(w.last().total, 1);
        assert.equal(w.last().done, true);
    });

    it("keeps what it shows until the new search's first page comes, then replaces it", async () => {
        const w = watch<string>();
        const p = pager<string, string>(memory, "", (s) => w.seen.push(s), { limit: 5 });
        await tick();
        p.more();
        await tick();
        assert.equal(w.last().items.length, 10);
        p.restart("three");
        assert.equal(w.last().status, "loading");
        assert.equal(w.last().items.length, 10);
        await tick();
        assert.deepEqual(w.last().items, WORDS.filter((x) => x.includes("three")).slice(0, 5));
        assert.equal(w.last().total, 8);
        assert.equal(w.last().pages, 1, "a new search counts its pages from one");
        p.more();
        await tick();
        assert.deepEqual(
            w.last().items,
            WORDS.filter((x) => x.includes("three")),
        );
    });

    it("changing the search mid-scroll restarts cleanly, with no page of the old search after it", async () => {
        const h = held();
        const w = watch<string>();
        const p = pager<string, string>(h.source, "a", (s) => w.seen.push(s), { limit: 2 });
        h.asks[0]?.answer({ items: ["a1", "a2"], next: "c1", total: 6 });
        await tick();
        p.more();
        p.restart("b");
        h.asks[1]?.answer({ items: ["a3", "a4"], next: "c2", total: 6 });
        h.asks[2]?.answer({ items: ["b1"], next: null, total: 1 });
        await tick();
        assert.deepEqual(w.last().items, ["b1"]);
        assert.equal(h.asks[2]?.words, "b");
    });

    it("waits for the first ask when lazy, and a new search leaves an unasked list unasked", async () => {
        const h = held();
        const p = pager<string, string>(h.source, "", () => undefined, { limit: 5, lazy: true });
        p.restart("x");
        assert.equal(h.asks.length, 0);
        p.more();
        assert.equal(h.asks.length, 1);
        assert.equal(h.asks[0]?.words, "x");
    });

    it("shows a failure, asks nothing more until told to try again, and then goes on", async () => {
        const h = held();
        const w = watch<string>();
        const p = pager<string, string>(h.source, "", (s) => w.seen.push(s), { limit: 5 });
        h.asks[0]?.answer({ items: ["1"], next: "c", total: 3 });
        await tick();
        p.more();
        h.asks[1]?.answer({ error: "offline", status: 0 });
        await tick();
        assert.equal(w.last().status, "failed");
        assert.deepEqual(w.last().items, ["1"], "what was read stays");
        p.more();
        assert.equal(h.asks.length, 2);
        p.again();
        assert.equal(h.asks.length, 3);
        assert.equal(h.asks[2]?.after, "c");
        h.asks[2]?.answer({ items: ["2", "3"], next: null, total: 3 });
        await tick();
        assert.deepEqual(w.last().items, ["1", "2", "3"]);
    });

    it("does not show the old search's lessons under a new search that failed", async () => {
        const h = held();
        const w = watch<string>();
        const p = pager<string, string>(h.source, "a", (s) => w.seen.push(s), { limit: 5 });
        h.asks[0]?.answer({ items: ["a1"], next: null, total: 1 });
        await tick();
        p.restart("b");
        h.asks[1]?.answer({ error: "server", status: 500 });
        await tick();
        assert.deepEqual(w.last().items, []);
        assert.equal(w.last().status, "failed");
        assert.equal(w.last().total, null);
    });

    it("says so when a search finds nothing", async () => {
        const w = watch<string>();
        pager<string, string>(memory, "nothing like this", (s) => w.seen.push(s), { limit: 5 });
        await tick();
        assert.deepEqual(w.last(), {
            items: [],
            total: 0,
            status: "ready",
            failure: null,
            done: true,
            pages: 1,
            added: 0,
        });
    });
});
