import { and, eq, isNull, or, sql } from "drizzle-orm";
import { withFamily, type FamilyTx } from "./client";
import { keys, kids } from "./schema";

export async function lockKidLogins(tx: FamilyTx, family: string): Promise<void> {
    await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${"kid-access:" + family}, 0))`,
    );
}

export async function lookupLogin(
    username: string,
    identity: string,
    network: string,
    hash: string,
) {
    return withFamily({ family: null }, async (tx) => {
        const rows = await tx.execute(
            sql`select * from kid_login_lookup(${username}, ${identity}, ${network}, ${hash})`,
        );
        const row = rows[0];
        return row && typeof row.family_id === "string" && typeof row.kid_id === "string"
            ? { family: row.family_id, kid: row.kid_id }
            : null;
    });
}

/** The child's own PIN replaces the shared PIN; no authentication fallback is attempted. */
export async function loginPin(tx: FamilyTx, kid?: string) {
    const [pin] = await tx
        .select()
        .from(keys)
        .where(
            and(
                eq(keys.kind, "kid-pin"),
                kid ? or(eq(keys.kid_id, kid), isNull(keys.kid_id)) : isNull(keys.kid_id),
            ),
        )
        .orderBy(sql`${keys.kid_id} desc nulls last`)
        .limit(1)
        .for("update");
    return pin ?? null;
}

export async function loginPins(tx: FamilyTx) {
    return tx.select().from(keys).where(eq(keys.kind, "kid-pin")).for("update");
}

export async function removeLoginPin(tx: FamilyTx, kid: string) {
    await tx.delete(keys).where(and(eq(keys.kind, "kid-pin"), eq(keys.kid_id, kid)));
}

export async function saveLoginPin(
    tx: FamilyTx,
    family: string,
    user: string,
    hash: string,
    kid?: string,
) {
    await tx
        .delete(keys)
        .where(and(eq(keys.kind, "kid-pin"), kid ? eq(keys.kid_id, kid) : isNull(keys.kid_id)));
    await tx
        .insert(keys)
        .values({ family_id: family, user_id: user, kid_id: kid ?? null, kind: "kid-pin", hash });
}

export async function loginTry(tx: FamilyTx, id: string, right: boolean) {
    await tx
        .update(keys)
        .set({
            attempts: right
                ? 0
                : sql`case when ${keys.seen_at} < utc_iso(now() - interval '15 minutes') then 1 else ${keys.attempts} + 1 end`,
            seen_at: new Date().toISOString(),
        })
        .where(and(eq(keys.kind, "kid-pin"), eq(keys.id, id)));
}

export async function saveKidLogin(tx: FamilyTx, id: string, username: string) {
    await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${"kid-username:" + username}, 0))`,
    );
    await tx
        .update(kids)
        .set({
            settings: sql`${kids.settings} || ${JSON.stringify({ username })}::jsonb`,
        })
        .where(eq(kids.id, id));
}

/** Serializes and checks the globally unique username candidates used for automatic names. */
export async function usernameAvailable(tx: FamilyTx, username: string): Promise<boolean> {
    await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${"kid-username:" + username}, 0))`,
    );
    const rows = await tx.execute(sql`select kid_username_available(${username}) as available`);
    return rows[0]?.available === true;
}

export async function stopKidLogins(tx: FamilyTx, kid?: string) {
    const rows = await tx
        .select({ id: keys.id })
        .from(keys)
        .where(
            and(
                eq(keys.kind, "kid-session"),
                sql`${keys.detail}->>'login' = 'true'`,
                ...(kid ? [eq(keys.kid_id, kid)] : []),
            ),
        );
    return rows.map((r) => r.id);
}

/** A successful sign-in releases only its own in-flight reservation. */
export async function loginSucceeded(tx: FamilyTx, hash: string): Promise<void> {
    await tx.execute(sql`select kid_login_succeeded(${hash})`);
}
