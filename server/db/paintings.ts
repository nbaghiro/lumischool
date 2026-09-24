import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, isNull, lt, or, inArray, getTableColumns } from "drizzle-orm";
import type { ArtworkSummary, PaintingSave, PaintingSaved } from "./schema";
import type { FamilyTx } from "./client";
import { artworks, families, paintingSaves, type Artwork } from "./schema";

export function summary(row: Artwork): ArtworkSummary {
    const { document: _document, family_id: _family, deleted_at: _deleted, ...out } = row;
    return out;
}
export async function paintingList(
    tx: FamilyTx,
    family: string,
    user: string,
    kid: string | null,
    before?: { at: string; id: string },
): Promise<{ artworks: ArtworkSummary[]; next: string | null }> {
    const {
        document: _document,
        family_id: _family,
        deleted_at: _deleted,
        ...columns
    } = getTableColumns(artworks);
    const rows = await tx
        .select(columns)
        .from(artworks)
        .where(
            and(
                eq(artworks.family_id, family),
                isNull(artworks.deleted_at),
                kid === null
                    ? and(isNull(artworks.kid_id), eq(artworks.owner_user_id, user))
                    : eq(artworks.kid_id, kid),
                before
                    ? or(
                          lt(artworks.updated_at, before.at),
                          and(eq(artworks.updated_at, before.at), lt(artworks.id, before.id)),
                      )
                    : undefined,
            ),
        )
        .orderBy(desc(artworks.updated_at), desc(artworks.id))
        .limit(25);
    const page = rows.slice(0, 24);
    const last = page.at(-1);
    return {
        artworks: page,
        next: rows.length > 24 && last ? `${last.updated_at}|${last.id}` : null,
    };
}
export async function paintingRow(tx: FamilyTx, id: string): Promise<Artwork | null> {
    return (await tx.select().from(artworks).where(eq(artworks.id, id)))[0] ?? null;
}
export async function paintingSave(
    tx: FamilyTx,
    family: string,
    user: string,
    input: PaintingSave,
): Promise<PaintingSaved | null> {
    // Serialize saves and deletion, including first saves where there is no artwork row to lock.
    await tx
        .select({ id: families.id })
        .from(families)
        .where(eq(families.id, family))
        .for("update");
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const [receipt] = await tx
        .select()
        .from(paintingSaves)
        .where(eq(paintingSaves.id, input.operation_id));
    if (receipt) {
        if (receipt.request_hash !== hash || receipt.user_id !== user) return null;
        const row = await paintingRow(tx, receipt.artwork_id);
        if (!row || row.deleted_at) return null;
        return {
            artwork: {
                ...summary(row),
                title: receipt.document.title,
                thumbnail: receipt.thumbnail,
                revision: receipt.revision,
                updated_at: receipt.saved_at,
                updated_by: receipt.user_id,
            },
            document: receipt.document,
            conflict: receipt.conflict === 1,
        };
    }
    const old = await paintingRow(tx, input.document.id);
    if (
        old &&
        (old.deleted_at ||
            old.kid_id !== input.scope.kid_id ||
            (old.kid_id === null && old.owner_user_id !== user))
    )
        return null;
    const conflict = old ? old.revision !== input.expected_revision : input.expected_revision !== 0;
    const id = conflict ? randomUUID() : input.document.id;
    const now = new Date().toISOString();
    const document = { ...input.document, id };
    const values = {
        title: document.title,
        document,
        thumbnail: input.thumbnail,
        revision: old && !conflict ? old.revision + 1 : 1,
        updated_at: now,
        updated_by: user,
    };
    const row =
        old && !conflict
            ? (await tx.update(artworks).set(values).where(eq(artworks.id, id)).returning())[0]
            : (
                  await tx
                      .insert(artworks)
                      .values({
                          ...values,
                          id,
                          family_id: family,
                          kid_id: input.scope.kid_id,
                          owner_user_id: input.scope.kid_id === null ? user : null,
                          created_at: now,
                      })
                      .onConflictDoNothing()
                      .returning()
              )[0];
    if (!row) return null;
    const saved = await tx
        .insert(paintingSaves)
        .values({
            id: input.operation_id,
            family_id: family,
            artwork_id: id,
            request_hash: hash,
            document,
            thumbnail: input.thumbnail,
            revision: row.revision,
            conflict: conflict ? 1 : 0,
            saved_at: now,
            user_id: user,
        })
        .onConflictDoNothing()
        .returning({ id: paintingSaves.id });
    if (!saved.length) throw new Error("Painting operation id collision");
    const expired = await tx
        .select({ id: paintingSaves.id })
        .from(paintingSaves)
        .where(eq(paintingSaves.artwork_id, id))
        .orderBy(desc(paintingSaves.revision), desc(paintingSaves.saved_at))
        .offset(20);
    if (expired.length)
        await tx.delete(paintingSaves).where(
            inArray(
                paintingSaves.id,
                expired.map((r) => r.id),
            ),
        );
    return { artwork: summary(row), document, conflict };
}
export async function paintingDelete(
    tx: FamilyTx,
    family: string,
    id: string,
    revision: number,
): Promise<boolean> {
    await tx
        .select({ id: families.id })
        .from(families)
        .where(eq(families.id, family))
        .for("update");
    const result = await tx
        .update(artworks)
        .set({
            deleted_at: new Date().toISOString(),
            title: "",
            thumbnail: "",
            document: {
                version: 1,
                id,
                title: "",
                painting: { k: "painting", w: 30, h: 20, paper: "plain", marks: [] },
                activity: "draw",
                idea: "",
                fills: {},
                step: 0,
                guides: false,
            },
        })
        .where(
            and(eq(artworks.id, id), eq(artworks.revision, revision), isNull(artworks.deleted_at)),
        )
        .returning({ id: artworks.id });
    if (result.length) await tx.delete(paintingSaves).where(eq(paintingSaves.artwork_id, id));
    return result.length === 1;
}
