import { and, eq, lt, sql } from "drizzle-orm";
import type { AdaptiveHelp, TeachingState } from "../../engine/teaching";
import type { FamilyTx } from "./client";
import {
    families,
    kids,
    tutoringSessions,
    tutoringTurns,
    tutoringUsage,
    type TutoringSession,
    type TutoringTurn,
} from "./schema";
export async function lockTutoring(tx: FamilyTx, family: string): Promise<void> {
    await tx
        .select({ id: families.id })
        .from(families)
        .where(eq(families.id, family))
        .for("update");
}
export async function tutoringSession(tx: FamilyTx, id: string): Promise<TutoringSession | null> {
    return (await tx.select().from(tutoringSessions).where(eq(tutoringSessions.id, id)))[0] ?? null;
}
export async function tutoringTurn(tx: FamilyTx, id: string): Promise<TutoringTurn | null> {
    return (await tx.select().from(tutoringTurns).where(eq(tutoringTurns.id, id)))[0] ?? null;
}
export async function createTutoringSession(
    tx: FamilyTx,
    row: typeof tutoringSessions.$inferInsert,
): Promise<void> {
    await tx.insert(tutoringSessions).values(row);
}
export async function reserveTutoringTurn(
    tx: FamilyTx,
    row: typeof tutoringTurns.$inferInsert,
): Promise<void> {
    await tx.insert(tutoringTurns).values(row);
}
export async function finishTutoringTurn(
    tx: FamilyTx,
    session: TutoringSession,
    id: string,
    state: TeachingState | AdaptiveHelp,
    usage: { model: string | null; input: number; output: number; latency: number },
): Promise<void> {
    await tx
        .update(tutoringSessions)
        .set({ state, revision: state.revision })
        .where(
            and(
                eq(tutoringSessions.id, session.id),
                eq(tutoringSessions.revision, session.revision),
            ),
        );
    await tx
        .update(tutoringTurns)
        .set({
            status: "accepted",
            result: state,
            model: usage.model,
            input_tokens: usage.input,
            output_tokens: usage.output,
            latency_ms: usage.latency,
        })
        .where(eq(tutoringTurns.id, id));
}
export async function endTutoring(
    tx: FamilyTx,
    session: TutoringSession,
): Promise<TeachingState | AdaptiveHelp> {
    const state = {
        ...session.state,
        status: "ended" as const,
        revision: session.revision + 1,
    };
    await tx
        .update(tutoringSessions)
        .set({ state, revision: state.revision })
        .where(eq(tutoringSessions.id, session.id));
    return state;
}
export async function pendingTutoringTurn(
    tx: FamilyTx,
    session: string,
): Promise<TutoringTurn | null> {
    return (
        (
            await tx
                .select()
                .from(tutoringTurns)
                .where(
                    and(eq(tutoringTurns.session_id, session), eq(tutoringTurns.status, "pending")),
                )
        )[0] ?? null
    );
}
export async function reserveTutoringUsage(
    tx: FamilyTx,
    family: string,
    audioChars = 0,
): Promise<boolean> {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    for (const period of [today, month])
        await tx
            .insert(tutoringUsage)
            .values({ id: `${family}.${period}`, family_id: family, period })
            .onConflictDoNothing();
    const rows = await tx.select().from(tutoringUsage).where(eq(tutoringUsage.family_id, family));
    const day = rows.find((r) => r.period === today);
    const monthly = rows.find((r) => r.period === month);
    if (
        !day ||
        !monthly ||
        (audioChars
            ? monthly.audio_chars + audioChars > 100000
            : day.calls >= 60 ||
              monthly.input_tokens + 12288 > 2000000 ||
              monthly.output_tokens + 2048 > 200000)
    )
        return false;
    for (const period of [today, month])
        await tx
            .update(tutoringUsage)
            .set(
                audioChars
                    ? {
                          audio_chars: sql`${tutoringUsage.audio_chars} + ${audioChars}`,
                      }
                    : {
                          calls: sql`${tutoringUsage.calls} + 1`,
                          input_tokens: sql`${tutoringUsage.input_tokens} + 12288`,
                          output_tokens: sql`${tutoringUsage.output_tokens} + 2048`,
                      },
            )
            .where(eq(tutoringUsage.id, `${family}.${period}`));
    return true;
}
export async function cleanTutoring(tx: FamilyTx): Promise<void> {
    const now = new Date().toISOString();
    await tx.delete(tutoringSessions).where(lt(tutoringSessions.expires_at, now));
    await tx
        .delete(tutoringUsage)
        .where(
            lt(
                tutoringUsage.period,
                new Date(Date.now() - 62 * 86400000).toISOString().slice(0, 7),
            ),
        );
}

export async function saveTutorPreferences(
    tx: FamilyTx,
    kid: string,
    preferences: unknown,
): Promise<void> {
    await tx
        .update(kids)
        .set({
            settings: sql`jsonb_set(${kids.settings}, '{teaching}', coalesce(${kids.settings}->'teaching', '{}'::jsonb) || jsonb_build_object('tutoring', ${JSON.stringify(preferences)}::jsonb), true)`,
        })
        .where(eq(kids.id, kid));
}
