// The one code path that writes a `content` row, and the reads of it. `name` and `kind` are read from
// the body here rather than generated in SQL, which would need a second notation reader, and
// `npm run check:db` fails if anything else inserts into `content`.

import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import type { ContentKind } from "../../engine/answer";
import type { FamilyTx, Store } from "./client";
import { content, type Content } from "./schema";

const KINDS: readonly ContentKind[] = ["item", "lesson", "define", "activity", "track"];
const DECLARATION = /^(item|lesson|define|activity|track)\s+(\S+)/;

const isKind = (word: string | undefined): word is ContentKind =>
    KINDS.some((kind) => kind === word);

export interface Facts {
    name: string;
    kind: ContentKind | "pack";
}

/**
 * What a body says it is. Notation declares itself on its first line that is not a comment or blank
 * (`item bonds.make-ten v=1 ...`); a pack is a JSON manifest carrying its own name. Anything else is
 * refused, since a row whose name nobody can read back from its body is the drift this prevents.
 */
export function factsOf(body: string): Facts {
    const trimmed = body.trimStart();
    if (trimmed.startsWith("{")) {
        const manifest: unknown = JSON.parse(trimmed);
        const named = typeof manifest === "object" && manifest !== null && "name" in manifest;
        if (!named || typeof manifest.name !== "string" || !manifest.name) {
            throw new Error("a pack's manifest must carry its name");
        }
        return { name: manifest.name, kind: "pack" };
    }
    for (const line of body.split("\n")) {
        const l = line.trim();
        if (!l || l.startsWith("#")) continue;
        const [, kind, name] = l.match(DECLARATION) ?? [];
        if (!isKind(kind) || !name) break;
        return { name, kind };
    }
    throw new Error(
        "content must start with a declaration: item, lesson, define, activity or track",
    );
}

/** The same body twice is one row. A conflict reads the row back, since the app role cannot update. */
export async function saveContent(
    tx: FamilyTx,
    family_id: string,
    body: string,
): Promise<{ id: string; hash: string }> {
    const facts = factsOf(body);
    const [row] = await tx
        .insert(content)
        .values({ family_id, body, name: facts.name, kind: facts.kind })
        .onConflictDoNothing({ target: [content.family_id, content.hash] })
        .returning({ id: content.id, hash: content.hash });
    if (row) return row;
    const [existing] = await tx
        .select({ id: content.id, hash: content.hash })
        .from(content)
        .where(and(eq(content.family_id, family_id), eq(content.hash, sql`utf8_sha256(${body})`)));
    if (!existing)
        throw new Error("saveContent: the insert conflicted but no row matches the body");
    return existing;
}

/** A revision by its hash: the family's own, or the catalogue's, which every family reads. */
export async function contentByHash(tx: FamilyTx, hash: string): Promise<Content | null> {
    const rows = await tx.select().from(content).where(eq(content.hash, hash));
    return rows.find((r) => r.family_id !== null) ?? rows[0] ?? null;
}

/** Every revision with a name, the catalogue's and the family's, oldest name first. */
export async function contentNamed(tx: FamilyTx, family: string, name: string): Promise<Content[]> {
    return tx
        .select()
        .from(content)
        .where(
            and(
                eq(content.name, name),
                or(isNull(content.family_id), eq(content.family_id, family)),
            ),
        )
        .orderBy(asc(content.id));
}

/** The family's own revisions. */
export async function familyContent(tx: FamilyTx, family: string): Promise<Content[]> {
    return tx.select().from(content).where(eq(content.family_id, family));
}

/**
 * Saves catalogue revisions, which belong to no family and which no app role can write. This runs as
 * the owner, from the build that publishes a pack (and the seed, which stands in for it). Returns how
 * many were new.
 */
export async function saveCatalogue(owner: Store["db"], bodies: string[]): Promise<number> {
    let added = 0;
    for (let i = 0; i < bodies.length; i += 200) {
        const rows = bodies
            .slice(i, i + 200)
            .map((body) => ({ family_id: null, body, ...factsOf(body) }));
        const inserted = await owner
            .insert(content)
            .values(rows)
            .onConflictDoNothing({ target: [content.family_id, content.hash] })
            .returning({ id: content.id });
        added += inserted.length;
    }
    return added;
}

/** A catalogue revision's id by its hash, for the seed and the tests. */
export async function catalogueId(owner: Store["db"], hash: string): Promise<string | null> {
    const [row] = await owner
        .select({ id: content.id })
        .from(content)
        .where(and(isNull(content.family_id), eq(content.hash, hash)));
    return row?.id ?? null;
}
