import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { FamilyTx } from "./client";
import { families, keys, members, users, type Key } from "./schema";
import { setPreference } from "./mail";
import { isLive, parseCredential, sameHash, sha256 } from "./keys";

export async function lockMembers(tx: FamilyTx, family: string): Promise<void> {
    await tx
        .select({ id: families.id })
        .from(families)
        .where(eq(families.id, family))
        .for("update");
}

export async function parentsOf(tx: FamilyTx, family: string) {
    return tx
        .select({ id: users.id, name: users.name, email: users.email })
        .from(members)
        .innerJoin(users, eq(users.id, members.user_id))
        .where(
            and(eq(members.family_id, family), isNull(members.kid_id), isNull(members.ended_at)),
        );
}

export async function invitationsOf(tx: FamilyTx, family: string): Promise<Key[]> {
    return tx
        .select()
        .from(keys)
        .where(and(eq(keys.family_id, family), eq(keys.kind, "invite")));
}

export const invitationActive = (key: Key): boolean => {
    const d = key.detail;
    return (
        isLive("invite", key) && !!d && typeof d === "object" && "active" in d && d.active === true
    );
};

export async function invitationIn(tx: FamilyTx, token: string): Promise<Key | null> {
    const parsed = parseCredential(token);
    if (!parsed) return null;
    const [row] = await tx
        .select()
        .from(keys)
        .where(
            and(eq(keys.family_id, parsed.family), eq(keys.id, parsed.id), eq(keys.kind, "invite")),
        )
        .for("update");
    return row && invitationActive(row) && sameHash(row.hash, sha256(parsed.secret)) ? row : null;
}

export async function cancelInvitation(tx: FamilyTx, id: string): Promise<void> {
    // Retain issuance time for rate limits after cancellation or acceptance.
    await tx
        .update(keys)
        .set({ detail: { active: false } })
        .where(and(eq(keys.id, id), eq(keys.kind, "invite")));
}

export async function addParent(tx: FamilyTx, family: string, user: string): Promise<boolean> {
    const [old] = await tx
        .select()
        .from(members)
        .where(
            and(eq(members.family_id, family), eq(members.user_id, user), isNull(members.kid_id)),
        );
    if (old && !old.ended_at) return false;
    if (old) await tx.update(members).set({ ended_at: null }).where(eq(members.id, old.id));
    else await tx.insert(members).values({ family_id: family, user_id: user });
    return true;
}

export async function removeParent(
    tx: FamilyTx,
    family: string,
    user: string,
    successor: string,
): Promise<void> {
    await tx
        .update(members)
        .set({ ended_at: new Date().toISOString() })
        .where(
            and(eq(members.family_id, family), eq(members.user_id, user), isNull(members.ended_at)),
        );
    await tx
        .delete(keys)
        .where(
            and(
                eq(keys.family_id, family),
                eq(keys.user_id, user),
                inArray(keys.kind, ["session", "shared-session", "kid-session"]),
            ),
        );
    await tx
        .update(keys)
        .set({ detail: { active: false } })
        .where(and(eq(keys.family_id, family), eq(keys.user_id, user), eq(keys.kind, "invite")));
    // Family PINs survive their setter leaving; new child logins need an active parent sponsor.
    await tx
        .update(keys)
        .set({ user_id: successor })
        .where(
            and(
                eq(keys.family_id, family),
                eq(keys.user_id, user),
                inArray(keys.kind, ["pin", "kid-pin"]),
            ),
        );
    await setPreference(tx, family, user, "off");
}

export async function reserveInvitation(
    tx: FamilyTx,
    family: string,
    email: string,
    ip: string | null,
    hash: string,
): Promise<boolean> {
    const rows = await tx.execute(
        sql`select reserve_invitation(${family}::uuid, ${email}, ${ip}, ${hash}) as ok`,
    );
    const row: unknown = rows[0];
    return !!row && typeof row === "object" && "ok" in row && row.ok === true;
}
