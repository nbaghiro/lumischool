import { limitOf, queryHash, readCursor, type Key, type Page } from "../engine/page";
import { isStoredPicture } from "../engine/painting";
import type { PaintingSave, PaintingSaved, PaintingLoaded, ArtworkSummary } from "./api";
import { consented, type Adult } from "./auth";
import { withFamily } from "./db/client";
import * as store from "./db/paintings";
import { Refused } from "./sync";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const object = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
const bad = (): never => {
    throw new Refused(400, { error: "bad-request" });
};
const missing = (): never => {
    throw new Refused(404, { error: "not-found" });
};
const changed = (): never => {
    throw new Refused(409, {
        error: "bad-request",
        problem: "This picture changed. Open the gallery and try again.",
    });
};
function parent(adult: Adult): void {
    if (!adult.parent) throw new Refused(403, { error: "not-allowed" });
}
export function validPaintingSave(v: unknown): v is PaintingSave {
    return (
        object(v) &&
        object(v.scope) &&
        (v.scope.kid_id === null || uuid(v.scope.kid_id)) &&
        isStoredPicture(v.document) &&
        uuid(v.document.id) &&
        Number.isSafeInteger(v.expected_revision) &&
        typeof v.expected_revision === "number" &&
        v.expected_revision >= 0 &&
        uuid(v.operation_id) &&
        typeof v.thumbnail === "string" &&
        v.thumbnail.length <= 65536 &&
        /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(v.thumbnail)
    );
}
/** The most pictures one page of a wall holds, and how many it holds when the page does not say. */
const WALL_MOST = 48;
const WALL_PAGE = 24;
const WHEN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** The words of a wall's search, letters and digits only and at most eight, or null when it is not text. */
function wallWords(q: unknown): string[] | null {
    if (q === null || q === undefined) return [];
    if (typeof q !== "string" || q.length > 100) return null;
    return (q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 8);
}

export async function listPaintings(
    adult: Adult,
    kid: unknown,
    asked: { q?: unknown; after?: unknown; limit?: unknown } = {},
): Promise<Page<ArtworkSummary>> {
    parent(adult);
    if (kid !== null && !uuid(kid)) return bad();
    const words = wallWords(asked.q);
    if (words === null) return bad();
    const query = queryHash({ list: "paintings", kid, words });
    let after: Key | null = null;
    if (asked.after !== null && asked.after !== undefined) {
        const read = readCursor(asked.after, query, [WHEN, UUID]);
        if ("problem" in read) return bad();
        after = read.key;
    }
    const limit = limitOf(asked.limit, WALL_MOST, WALL_PAGE);
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        if (kid !== null && !(await consented(tx, adult.family.id)).has(kid)) return missing();
        return store.paintingList(tx, adult.family.id, adult.user, kid, {
            after,
            limit,
            query,
            words,
        });
    });
}
export async function loadPainting(adult: Adult, id: unknown): Promise<PaintingLoaded> {
    parent(adult);
    if (!uuid(id)) return bad();
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        const row = await store.paintingRow(tx, id);
        if (
            !row ||
            row.deleted_at ||
            (row.kid_id === null
                ? row.owner_user_id !== adult.user
                : !(await consented(tx, adult.family.id)).has(row.kid_id))
        )
            return missing();
        return { artwork: store.summary(row), document: row.document };
    });
}
export async function savePainting(adult: Adult, input: unknown): Promise<PaintingSaved> {
    parent(adult);
    if (!validPaintingSave(input)) return bad();
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        if (
            input.scope.kid_id !== null &&
            !(await consented(tx, adult.family.id)).has(input.scope.kid_id)
        )
            return missing();
        return (await store.paintingSave(tx, adult.family.id, adult.user, input)) ?? changed();
    });
}
export async function deletePainting(
    adult: Adult,
    id: unknown,
    revision: unknown,
): Promise<{ ok: true }> {
    parent(adult);
    if (
        !uuid(id) ||
        typeof revision !== "number" ||
        !Number.isSafeInteger(revision) ||
        revision < 1
    )
        return bad();
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        const row = await store.paintingRow(tx, id);
        if (
            !row ||
            row.deleted_at ||
            (row.kid_id === null
                ? row.owner_user_id !== adult.user
                : !(await consented(tx, adult.family.id)).has(row.kid_id))
        )
            return missing();
        if (!(await store.paintingDelete(tx, adult.family.id, id, revision))) return changed();
        return { ok: true };
    });
}
