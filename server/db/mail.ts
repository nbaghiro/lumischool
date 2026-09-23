import { and, eq, isNull, lt, sql } from "drizzle-orm";
import type { FamilyTx } from "./client";
import {
    mailDeliveries,
    mailPreferences,
    members,
    users,
    type MailDelivery,
    type MailPreference,
} from "./schema";

export async function preference(
    tx: FamilyTx,
    family: string,
    user: string,
): Promise<MailPreference["mode"]> {
    return (
        (
            await tx
                .select()
                .from(mailPreferences)
                .where(
                    and(eq(mailPreferences.family_id, family), eq(mailPreferences.user_id, user)),
                )
        )[0]?.mode ?? "off"
    );
}

export async function setPreference(
    tx: FamilyTx,
    family: string,
    user: string,
    mode: MailPreference["mode"],
): Promise<void> {
    await tx
        .insert(mailPreferences)
        .values({ family_id: family, user_id: user, mode, changed_at: new Date().toISOString() })
        .onConflictDoUpdate({
            target: [mailPreferences.family_id, mailPreferences.user_id],
            set: { mode, changed_at: new Date().toISOString() },
        });
    await tx
        .update(mailDeliveries)
        .set({ status: "suppressed", body_text: "", body_html: "" })
        .where(
            and(
                eq(mailDeliveries.family_id, family),
                eq(mailDeliveries.user_id, user),
                sql`${mailDeliveries.status} in ('pending', 'sending')`,
            ),
        );
}

export async function recipient(
    tx: FamilyTx,
    family: string,
    user: string,
): Promise<string | null> {
    const rows = await tx
        .select({ email: users.email })
        .from(members)
        .innerJoin(users, eq(users.id, members.user_id))
        .where(
            and(
                eq(members.family_id, family),
                eq(members.user_id, user),
                isNull(members.kid_id),
                isNull(members.ended_at),
            ),
        );
    return rows[0]?.email ?? null;
}

export async function recipients(tx: FamilyTx): Promise<{ family: string; user: string }[]> {
    const rows = await tx.execute<{ family_id: string; user_id: string }>(
        sql`select * from mail_recipients()`,
    );
    return rows.map((r) => ({ family: r.family_id, user: r.user_id }));
}

export async function queueMail(
    tx: FamilyTx,
    row: typeof mailDeliveries.$inferInsert,
): Promise<void> {
    await tx.insert(mailDeliveries).values(row).onConflictDoNothing();
}

export async function claimMail(
    tx: FamilyTx,
    family: string,
    user: string,
    now: string,
): Promise<MailDelivery | null> {
    const rows = await tx
        .select()
        .from(mailDeliveries)
        .where(
            and(
                eq(mailDeliveries.family_id, family),
                eq(mailDeliveries.user_id, user),
                sql`${mailDeliveries.status} in ('pending', 'sending')`,
                sql`(${mailDeliveries.lease_until} is null or ${mailDeliveries.lease_until} < ${now})`,
            ),
        )
        .orderBy(mailDeliveries.created_at)
        .limit(1)
        .for("update", { skipLocked: true });
    const row = rows[0];
    if (!row) return null;
    if (
        row.attempted_at &&
        (Date.parse(now) - Date.parse(row.attempted_at) >= 23 * 3600000 || row.attempts >= 5)
    ) {
        await finishMail(tx, row.id, "uncertain");
        return null;
    }
    const email = await recipient(tx, family, user);
    if (email !== row.recipient || (await preference(tx, family, user)) !== row.mode) {
        await finishMail(tx, row.id, "suppressed");
        return null;
    }
    const [claimed] = await tx
        .update(mailDeliveries)
        .set({
            status: "sending",
            attempts: row.attempts + 1,
            attempted_at: row.attempted_at ?? now,
            lease_until: new Date(
                Date.parse(now) + Math.max(120000, 60000 * 2 ** row.attempts),
            ).toISOString(),
        })
        .where(eq(mailDeliveries.id, row.id))
        .returning();
    return claimed ?? null;
}

export async function finishMail(
    tx: FamilyTx,
    id: string,
    status: MailDelivery["status"],
    provider?: string,
): Promise<void> {
    await tx
        .update(mailDeliveries)
        .set({
            status,
            ...(status !== "pending" && status !== "sending"
                ? { body_text: "", body_html: "" }
                : {}),
            ...(provider ? { provider_id: provider } : {}),
        })
        .where(
            and(eq(mailDeliveries.id, id), sql`${mailDeliveries.status} in ('pending', 'sending')`),
        );
}

export async function pruneMail(tx: FamilyTx, now: string): Promise<void> {
    await tx
        .update(mailDeliveries)
        .set({ body_text: "", body_html: "" })
        .where(
            lt(mailDeliveries.created_at, new Date(Date.parse(now) - 30 * 86400000).toISOString()),
        );
}

export async function providerFamily(tx: FamilyTx, id: string): Promise<string | null> {
    return (
        (await tx.execute<{ family_id: string }>(sql`select * from mail_family(${id})`))[0]
            ?.family_id ?? null
    );
}

export async function deliveryEvent(
    tx: FamilyTx,
    id: string,
    status: "delivered" | "suppressed" | "failed",
): Promise<void> {
    const rows = await tx
        .update(mailDeliveries)
        .set({ status, body_text: "", body_html: "" })
        .where(
            and(
                eq(mailDeliveries.provider_id, id),
                sql`${mailDeliveries.status} <> 'suppressed'`,
                sql`(${status} = 'suppressed' or ${mailDeliveries.status} <> 'delivered')`,
            ),
        )
        .returning();
    if (status === "suppressed")
        for (const row of rows) await setPreference(tx, row.family_id, row.user_id, "off");
}
