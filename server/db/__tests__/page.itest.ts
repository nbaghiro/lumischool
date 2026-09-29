// Pages of a query cut by key inside withFamily, through their first use, the picture wall: every row
// once and in order, a search paged the same way, and nothing of another family, whatever cursor comes.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { compareKeys, queryHash, readCursor, type Key, type Page } from "../../../engine/page";
import { closeApp, open, withFamily, type Store } from "../client";
import { createFamily } from "../events";
import { paintingList } from "../paintings";
import { artworks, kids, users, type ArtworkSummary } from "../schema";
import { prepare, truncate } from "./test-db";

const reason = await prepare();
const owner: Store | null = reason === null ? open() : null;

after(async () => {
    await closeApp();
    if (owner) await owner.close();
});

const A = "a0000000-0000-5000-8000-00000000000a";
const B = "b0000000-0000-5000-8000-00000000000b";
const UA = "a0000000-0000-5000-8000-0000000000a1";
const UB = "b0000000-0000-5000-8000-0000000000b1";
const KA = "a0000000-0000-5000-8000-0000000000a2";
const KB = "b0000000-0000-5000-8000-0000000000b2";

const SHAPE = [/./, /./] as const;
const WORDS = ["Red boat", "Blue whale", "Boats in a row", "A big tree", "Whale song"];

/** A picture's id, made from its family and number so the order of ties is known. */
const idOf = (family: string, n: number): string =>
    `${family.slice(0, 1)}${String(n).padStart(7, "0")}-0000-4000-8000-000000000000`;

/** When picture `n` last changed: three pictures to each second, so a page often ends inside a tie. */
const whenOf = (n: number): string =>
    new Date(Date.UTC(2026, 8, 1, 10, 0, Math.floor(n / 3))).toISOString();

async function writeFamily(family: string, parent: string, kid: string, pictures: number) {
    await withFamily({ family, user: parent }, (tx) =>
        tx
            .insert(users)
            .values({ id: parent, email: `${parent.slice(-2)}@example.test` })
            .then(() => undefined),
    );
    await withFamily({ family, user: parent }, async (tx) => {
        await createFamily(tx, {
            id: family,
            name: `Family ${family.slice(0, 1)}`,
            time_zone: "UTC",
        });
        await tx.insert(kids).values({ id: kid, family_id: family, name: "Painter", grade: 2 });
        await tx.insert(artworks).values(
            Array.from({ length: pictures }, (_, n) => ({
                id: idOf(family, n),
                family_id: family,
                kid_id: kid,
                title: `${WORDS[n % WORDS.length] ?? "Untitled"} ${n}`,
                document: {
                    version: 1 as const,
                    id: idOf(family, n),
                    title: "",
                    painting: {
                        k: "painting" as const,
                        w: 30,
                        h: 20,
                        paper: "plain" as const,
                        marks: [],
                    },
                    activity: "draw" as const,
                    idea: "night",
                    fills: {},
                    step: 0,
                    guides: false,
                },
                thumbnail: "data:image/png;base64,iVBORw0KGgo=",
                revision: 1,
                created_at: whenOf(n),
                updated_at: whenOf(n),
                updated_by: parent,
            })),
        );
    });
}

/** Every page of a kid's wall, as `scope` reads it, each cursor read back as the route reads it. */
async function wall(
    scope: { family: string; user: string },
    family: string,
    kid: string,
    words: string[],
    limit: number,
): Promise<Page<ArtworkSummary>[]> {
    const query = queryHash({ kid, words });
    const pages: Page<ArtworkSummary>[] = [];
    let after: Key | null = null;
    for (;;) {
        const at = { after, limit, query, words };
        const page = await withFamily(scope, (tx) => paintingList(tx, family, scope.user, kid, at));
        pages.push(page);
        if (page.next === null) return pages;
        const read = readCursor(page.next, query, SHAPE);
        assert.ok("key" in read);
        after = read.key;
    }
}

const newestFirst = (a: ArtworkSummary, b: ArtworkSummary): number =>
    -compareKeys([a.updated_at, a.id], [b.updated_at, b.id]);

describe("a page of a query", { skip: reason ?? false }, () => {
    before(async () => {
        if (!owner) return;
        await truncate(owner);
        await writeFamily(A, UA, KA, 29);
        await writeFamily(B, UB, KB, 11);
    });

    it("covers every row once, newest first, with ties broken by id, and counts them on the first page", async () => {
        const pages = await wall({ family: A, user: UA }, A, KA, [], 5);
        assert.deepEqual(
            pages.map((p) => p.items.length),
            [5, 5, 5, 5, 5, 4],
        );
        const all = pages.flatMap((p) => p.items);
        assert.equal(new Set(all.map((a) => a.id)).size, 29);
        assert.deepEqual(all, [...all].sort(newestFirst));
        assert.equal(pages[0]?.total, 29);
        assert.ok(pages.slice(1).every((p) => p.total === undefined));
        assert.ok(all.every((a) => a.kid_id === KA));
    });

    it("pages a search through every match once and in order, each word the start of a word", async () => {
        const boats = await wall({ family: A, user: UA }, A, KA, ["boat"], 2);
        const found = boats.flatMap((p) => p.items);
        assert.equal(boats[0]?.total, 12);
        assert.equal(found.length, 12);
        assert.ok(found.every((a) => /\bboats?\b/i.test(a.title)));
        assert.deepEqual(found, [...found].sort(newestFirst));
        const both = (await wall({ family: A, user: UA }, A, KA, ["wha", "blu"], 50)).flatMap(
            (p) => p.items,
        );
        assert.equal(both.length, 6);
        assert.ok(both.every((a) => a.title.startsWith("Blue whale")));
        const none = await wall({ family: A, user: UA }, A, KA, ["volcano"], 5);
        assert.deepEqual(none, [{ items: [], next: null, total: 0 }]);
    });

    it("never shows another family's rows, even when the query names that family", async () => {
        const asA = await wall({ family: A, user: UA }, B, KB, [], 5);
        assert.deepEqual(asA, [{ items: [], next: null, total: 0 }]);
        const asB = (await wall({ family: B, user: UB }, B, KB, [], 4)).flatMap((p) => p.items);
        assert.equal(asB.length, 11);
        assert.ok(asB.every((a) => a.kid_id === KB));
    });

    it("takes a cursor from another family's list as only a place in the order", async () => {
        const query = queryHash({ kid: KA, words: [] });
        const theirs = await withFamily({ family: B, user: UB }, (tx) =>
            paintingList(tx, B, UB, KB, { after: null, limit: 3, query, words: [] }),
        );
        const read = readCursor(theirs.next, query, SHAPE);
        assert.ok("key" in read);
        const cut = read.key;
        const ours = await withFamily({ family: A, user: UA }, (tx) =>
            paintingList(tx, A, UA, KA, { after: cut, limit: 100, query, words: [] }),
        );
        const all = (await wall({ family: A, user: UA }, A, KA, [], 100)).flatMap((p) => p.items);
        assert.deepEqual(
            ours.items,
            all.filter((a) => compareKeys([a.updated_at, a.id], cut) < 0),
        );
        assert.ok(ours.items.every((a) => a.kid_id === KA));
    });

    it("neither repeats nor skips when a picture is painted between two pages", async () => {
        const scope = { family: A, user: UA };
        const query = queryHash({ kid: KA, words: [] });
        const first = await withFamily(scope, (tx) =>
            paintingList(tx, A, UA, KA, { after: null, limit: 5, query, words: [] }),
        );
        await withFamily(scope, (tx) =>
            tx
                .update(artworks)
                .set({ updated_at: "2026-09-30T00:00:00.000Z" })
                .where(eq(artworks.id, idOf(A, 0)))
                .then(() => undefined),
        );
        const read = readCursor(first.next, query, SHAPE);
        assert.ok("key" in read);
        const rest: ArtworkSummary[] = [];
        let after: Key | null = read.key;
        while (after !== null) {
            const at: { after: Key; limit: number; query: string; words: string[] } = {
                after,
                limit: 5,
                query,
                words: [],
            };
            const page: Page<ArtworkSummary> = await withFamily(scope, (tx) =>
                paintingList(tx, A, UA, KA, at),
            );
            rest.push(...page.items);
            const next = page.next === null ? null : readCursor(page.next, query, SHAPE);
            after = next !== null && "key" in next ? next.key : null;
        }
        const seen = [...first.items, ...rest].map((a) => a.id);
        // the picture painted again moved above the first page, so it is read on no page twice
        assert.equal(new Set(seen).size, seen.length);
        assert.equal(seen.length, 28);
        assert.ok(!seen.includes(idOf(A, 0)));
    });
});
