import { isStoredPicture } from "../engine/painting";
import type { PaintingSave, PaintingSaved, PaintingLoaded, ArtworkSummary } from "./api";
import { consented, type Adult } from "./auth";
import { withFamily } from "./db/client";
import * as store from "./db/paintings";
import { Refused } from "./sync";

const uuid = (v: unknown): v is string =>
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
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
export async function listPaintings(
    adult: Adult,
    kid: unknown,
    cursor: unknown = null,
): Promise<{ artworks: ArtworkSummary[]; next: string | null }> {
    parent(adult);
    if (kid !== null && !uuid(kid)) return bad();
    let before: { at: string; id: string } | undefined;
    if (cursor !== null) {
        if (typeof cursor !== "string") return bad();
        const [at, id, ...rest] = cursor.split("|");
        if (
            !at ||
            !uuid(id) ||
            rest.length ||
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(at)
        )
            return bad();
        before = { at, id };
    }
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        if (kid !== null && !(await consented(tx, adult.family.id)).has(kid)) return missing();
        return store.paintingList(tx, adult.family.id, adult.user, kid, before);
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
