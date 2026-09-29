import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    compareKeys,
    cursorOf,
    limitOf,
    pageOfList,
    queryHash,
    readCursor,
    type Key,
    type Page,
} from "../page";

interface Row {
    grade: number;
    name: string;
}
const keyOf = (r: Row): Key => [r.grade, r.name];
const SHAPE = ["number", "string"] as const;
const sorted = (rows: Row[]): Row[] => [...rows].sort((a, b) => compareKeys(keyOf(a), keyOf(b)));

const ROWS = sorted(
    Array.from({ length: 23 }, (_, i) => ({
        grade: 1 + (i % 3),
        name: `n${String(i).padStart(2, "0")}`,
    })),
);

/** Every page of `rows` under `query`, reading each cursor back as a caller would. */
function everyPage(rows: readonly Row[], query: string, limit: number): Page<Row>[] {
    const pages: Page<Row>[] = [];
    let after: Key | null = null;
    for (;;) {
        const page = pageOfList(rows, keyOf, { after, limit, query });
        pages.push(page);
        if (page.next === null) return pages;
        const read = readCursor(page.next, query, SHAPE);
        assert.ok("key" in read);
        after = read.key;
    }
}

describe("a page of a list", () => {
    it("covers every item once, in order, and says how many there are", () => {
        const q = queryHash({ list: "rows" });
        const pages = everyPage(ROWS, q, 5);
        assert.deepEqual(
            pages.map((p) => p.items.length),
            [5, 5, 5, 5, 3],
        );
        assert.deepEqual(
            pages.flatMap((p) => p.items),
            ROWS,
        );
        assert.ok(pages.every((p) => p.total === 23));
    });

    it("ends with a null cursor, including a last page that is exactly full, and an empty list", () => {
        const q = queryHash({});
        const exact = everyPage(ROWS.slice(0, 10), q, 5);
        assert.equal(exact.length, 2);
        assert.equal(exact.at(-1)?.next, null);
        assert.deepEqual(pageOfList([], keyOf, { after: null, limit: 5, query: q }), {
            items: [],
            next: null,
            total: 0,
        });
    });

    it("neither repeats nor skips when an item lands before the cursor between two pages", () => {
        const q = queryHash({});
        const first = pageOfList(ROWS, keyOf, { after: null, limit: 5, query: q });
        const read = readCursor(first.next, q, SHAPE);
        assert.ok("key" in read);
        const added = sorted([...ROWS, { grade: 1, name: "a-new-one" }]);
        const second = pageOfList(added, keyOf, { after: read.key, limit: 5, query: q });
        assert.deepEqual(second.items, ROWS.slice(5, 10));
        // and one landing after the cursor is read in its turn
        const late = { grade: 3, name: "z-new-one" };
        const rest = pageOfList(sorted([...ROWS, late]), keyOf, {
            after: read.key,
            limit: 50,
            query: q,
        });
        assert.deepEqual(rest.items, [...ROWS.slice(5), late]);
    });

    it("carries on after a cursor whose own item has gone", () => {
        const q = queryHash({});
        const first = pageOfList(ROWS, keyOf, { after: null, limit: 5, query: q });
        const read = readCursor(first.next, q, SHAPE);
        assert.ok("key" in read);
        const gone = ROWS.filter((r) => r !== first.items.at(-1));
        const second = pageOfList(gone, keyOf, { after: read.key, limit: 5, query: q });
        assert.deepEqual(second.items, ROWS.slice(5, 10));
    });

    it("pages a search through every match once, and in order", () => {
        const q = queryHash({ words: "1" });
        const matches = ROWS.filter((r) => r.name.includes("1"));
        const pages = everyPage(matches, q, 2);
        assert.deepEqual(
            pages.flatMap((p) => p.items),
            matches,
        );
        assert.equal(new Set(pages.flatMap((p) => p.items)).size, matches.length);
    });
});

describe("a cursor", () => {
    const q = queryHash({ words: "ten", grade: 1 });

    it("is refused under another query, so a stale next never mixes two searches", () => {
        const next = cursorOf([1, "n03"], q);
        assert.deepEqual(readCursor(next, queryHash({ words: "tens", grade: 1 }), SHAPE), {
            problem: "other-query",
        });
        assert.deepEqual(readCursor(next, q, SHAPE), { key: [1, "n03"] });
    });

    it("names a query the same whatever order its fields are in", () => {
        assert.equal(queryHash({ grade: 1, words: "ten" }), q);
        assert.notEqual(queryHash({ grade: 2, words: "ten" }), q);
    });

    it("is refused when it is not one this module wrote, or its key is not the list's shape", () => {
        const bad: unknown[] = [
            null,
            42,
            "",
            "not base64!",
            "x".repeat(600),
            cursorOf([1], q),
            cursorOf(["1", "n03"], q),
            cursorOf([1, "n03", "extra"], q),
            btoa("not json").replace(/=+$/, ""),
            btoa(JSON.stringify({ q, key: [1, "a"] })).replace(/=+$/, ""),
        ];
        for (const raw of bad)
            assert.deepEqual(readCursor(raw, q, SHAPE), { problem: "unreadable" }, String(raw));
        assert.deepEqual(
            readCursor(cursorOf([1, "not-a-uuid"], q), q, ["number", /^[0-9a-f-]{36}$/]),
            {
                problem: "unreadable",
            },
        );
    });

    it("holds any text, including words outside ASCII", () => {
        const next = cursorOf([2, "Ünïcödé ✓ 日本"], q);
        assert.match(next, /^[A-Za-z0-9_-]+$/);
        assert.deepEqual(readCursor(next, q, SHAPE), { key: [2, "Ünïcödé ✓ 日本"] });
    });
});

describe("a page size", () => {
    it("is clamped to what the list allows, with a fallback when none is asked for", () => {
        assert.equal(limitOf(undefined, 48, 24), 24);
        assert.equal(limitOf(null, 48, 24), 24);
        assert.equal(limitOf("", 48, 24), 24);
        assert.equal(limitOf("abc", 48, 24), 24);
        assert.equal(limitOf("10", 48, 24), 10);
        assert.equal(limitOf("1000", 48, 24), 48);
        assert.equal(limitOf("0", 48, 24), 1);
        assert.equal(limitOf("-5", 48, 24), 1);
        assert.equal(limitOf(7.9, 48), 7);
        assert.equal(limitOf(undefined, 48), 48);
    });
});

describe("the order of keys", () => {
    it("compares part by part, strings by code unit rather than by locale", () => {
        assert.ok(compareKeys([1, "b"], [2, "a"]) < 0);
        assert.ok(compareKeys([1, "b"], [1, "a"]) > 0);
        assert.equal(compareKeys([1, "a"], [1, "a"]), 0);
        assert.ok(compareKeys([1, "Z"], [1, "a"]) < 0);
        assert.ok(compareKeys([1], [1, "a"]) < 0);
    });
});
