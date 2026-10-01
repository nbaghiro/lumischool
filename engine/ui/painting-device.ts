// A child's pictures, kept on the device their view is open on: the painting routes take a grown-up's
// session only, so a child's view paints against this instead (painting-repository.ts). It answers as
// the API does, a revision that moved on saves a copy beside the picture rather than over it, and a
// list is newest first, a page at a time, so the gallery cannot tell the two apart.

import { isStoredPicture, type Picture } from "../painting";
import type { Page } from "../page";
import type { ArtworkSummary, PaintingLoaded } from "../../server/api";
import type { PaintingGateway } from "./painting-repository";
import type { Failure } from "./wire";

const DB = "lumischool-paintings";
const STORE = "artworks";
/** How many pictures a page of the wall holds, as the route's own page does (.docs/pagination.md). */
const PAGE = 24;

interface Kept {
    artwork: ArtworkSummary;
    document: Picture;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

function readKept(v: unknown): Kept | null {
    if (!isRecord(v) || !isRecord(v.artwork) || !isStoredPicture(v.document)) return null;
    const a = v.artwork;
    return typeof a.id === "string" &&
        (a.kid_id === null || typeof a.kid_id === "string") &&
        typeof a.title === "string" &&
        typeof a.thumbnail === "string" &&
        typeof a.revision === "number" &&
        typeof a.created_at === "string" &&
        typeof a.updated_at === "string" &&
        typeof a.updated_by === "string"
        ? {
              artwork: {
                  id: a.id,
                  kid_id: a.kid_id,
                  owner_user_id: null,
                  title: a.title,
                  thumbnail: a.thumbnail,
                  revision: a.revision,
                  created_at: a.created_at,
                  updated_at: a.updated_at,
                  updated_by: a.updated_by,
              },
              document: v.document,
          }
        : null;
}

const missing: Failure = { error: "not-found", status: 404 };
const unavailable: Failure = { error: "offline", status: 0 };

function database(): Promise<IDBDatabase> {
    return new Promise((done, fail) => {
        const open = indexedDB.open(DB, 1);
        open.onupgradeneeded = () => open.result.createObjectStore(STORE);
        open.onsuccess = () => done(open.result);
        open.onerror = () => fail(open.error);
    });
}

/** One request against the store, in a transaction of its own. */
async function request<T>(
    mode: IDBTransactionMode,
    ask: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    const db = await database();
    try {
        return await new Promise<T>((done, fail) => {
            const req = ask(db.transaction(STORE, mode).objectStore(STORE));
            req.onsuccess = () => done(req.result);
            req.onerror = () => fail(req.error);
        });
    } finally {
        db.close();
    }
}

async function all(): Promise<Kept[]> {
    const rows: unknown[] = await request("readonly", (s) => s.getAll());
    return rows.map(readKept).filter((k): k is Kept => k !== null);
}

async function one(id: string): Promise<Kept | null> {
    const row: unknown = await request("readonly", (s) => s.get(id));
    return readKept(row);
}

/**
 * One child's pictures, kept on this device, by the gallery's own gateway. The gallery's scope is the
 * child's whatever it asks, since a child's view lists no other children to choose between.
 */
export const devicePaintingGateway = (kid: string): PaintingGateway => ({
    async list(_scope, after, words) {
        try {
            const asked = (words ?? "").toLowerCase().split(/\s+/).filter(Boolean);
            const mine = (await all())
                .map((k) => k.artwork)
                .filter(
                    (a) =>
                        a.kid_id === kid && asked.every((w) => a.title.toLowerCase().includes(w)),
                )
                .sort(
                    (a, b) => b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id),
                );
            const from = Number(after ?? 0) || 0;
            const page: Page<ArtworkSummary> = {
                items: mine.slice(from, from + PAGE),
                next: from + PAGE < mine.length ? String(from + PAGE) : null,
                total: mine.length,
            };
            return page;
        } catch {
            return unavailable;
        }
    },
    async load(id) {
        try {
            const kept = await one(id);
            const loaded: PaintingLoaded | null =
                kept && kept.artwork.kid_id === kid
                    ? { artwork: kept.artwork, document: kept.document }
                    : null;
            return loaded ?? missing;
        } catch {
            return unavailable;
        }
    },
    async save(input) {
        try {
            const old = await one(input.document.id);
            if (old && old.artwork.kid_id !== kid) return missing;
            const conflict = old
                ? old.artwork.revision !== input.expected_revision
                : input.expected_revision !== 0;
            const id = conflict ? crypto.randomUUID() : input.document.id;
            const now = new Date().toISOString();
            const document = { ...input.document, id };
            const kept: Kept = {
                artwork: {
                    id,
                    kid_id: kid,
                    owner_user_id: null,
                    title: document.title,
                    thumbnail: input.thumbnail,
                    revision: old && !conflict ? old.artwork.revision + 1 : 1,
                    created_at: old && !conflict ? old.artwork.created_at : now,
                    updated_at: now,
                    // a picture kept on the device was made by the child whose view it is
                    updated_by: kid,
                },
                document,
            };
            await request("readwrite", (s) => s.put(kept, id));
            return { ...kept, conflict };
        } catch {
            return unavailable;
        }
    },
    async remove(id) {
        try {
            if ((await one(id))?.artwork.kid_id !== kid) return missing;
            await request("readwrite", (s) => s.delete(id));
            return { ok: true };
        } catch {
            return unavailable;
        }
    },
});
