import { createHash } from "node:crypto";
import {
    frameOf,
    startTeaching,
    teachingObject,
    teachingPreferences,
    validTeachingCommand,
    type TeachingState,
} from "../engine/teaching";
import { teachingMaterial } from "../school/tutoring-materials";
import type { AdaptiveHelp } from "../school/adaptive";
import { nextTeaching } from "../school/tutoring";
import { TUTOR_PROMPT_VERSION } from "../school/assistant/tutoring";
import { consented, type Adult, type KidSession } from "./auth";
import { kidsOf } from "./db/events";
import type { TutoringSession } from "./db/schema";
import { withFamily } from "./db/client";
import * as store from "./db/tutoring";
import { Refused } from "./sync";
import { tutorConfig, tutorStep, tutorAudio } from "./gemini-tutoring";

const uuid = (id: unknown): id is string =>
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const hash = (value: unknown): string =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
const refuse = (status = 400): never => {
    throw new Refused(status, { error: status === 404 ? "not-found" : "bad-request" });
};
interface TutorActor {
    family: { id: string };
    user: string | undefined;
    kid: string | null;
    preferences: unknown;
}
async function actorOf(actor: Adult | KidSession, kidId?: string): Promise<TutorActor> {
    if ("parent" in actor) {
        if (!actor.parent) throw new Refused(403, { error: "not-allowed" });
        return { family: actor.family, user: actor.user, kid: null, preferences: null };
    }
    if (
        !tutorConfig(process.env).childEnabled ||
        !kidId ||
        !actor.keys.some((key) => key.kid_id === kidId)
    )
        return refuse(404);
    return withFamily({ family: actor.family.id }, async (tx) => {
        if (!(await consented(tx, actor.family.id)).has(kidId)) return refuse(404);
        const kid = (await kidsOf(tx, actor.family.id)).find((k) => k.id === kidId);
        const settings = kid && teachingObject(kid.settings) ? kid.settings : {};
        const teaching = teachingObject(settings.teaching) ? settings.teaching : {};
        if (!teachingObject(teaching.tutoring) || teaching.tutoring.enabled !== true)
            return refuse(404);
        return {
            family: actor.family,
            user: undefined,
            kid: kidId,
            preferences: teaching.tutoring,
        };
    });
}
/** The prepared state of a session, or null where this row is a tutor's help on one question. */
const preparedState = (state: TeachingState | AdaptiveHelp): TeachingState | null =>
    "materialId" in state ? state : null;
const owns = (actor: TutorActor, row: TutoringSession): boolean =>
    actor.kid === null
        ? row.kid_id === null && row.user_id === actor.user
        : row.kid_id === actor.kid;
export async function tutorCapabilities(
    actor: Adult | KidSession,
    kidId?: string,
): Promise<unknown> {
    const adult = await actorOf(actor, kidId);
    return { enabled: true, preferences: teachingPreferences(adult.preferences) };
}
/** The board's frames, which a child's app fetches rather than carries: no curriculum in that bundle. */
export async function materialTutor(
    actor: Adult | KidSession,
    id: string,
    kidId?: string,
): Promise<unknown> {
    await actorOf(actor, kidId);
    const material = teachingMaterial(id);
    if (!material) return refuse(404);
    return { material };
}
export async function startTutor(
    actor: Adult | KidSession,
    input: unknown,
    kidId?: string,
): Promise<unknown> {
    const adult = await actorOf(actor, kidId);
    if (
        !teachingObject(input) ||
        typeof input.material !== "string" ||
        typeof input.id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)
    )
        return refuse();
    const material = teachingMaterial(input.material);
    if (!material) return refuse(404);
    if (
        adult.kid &&
        (typeof input.lesson !== "string" || !material.lessonIds.includes(input.lesson))
    )
        return refuse();
    const preferences = teachingPreferences(adult.kid ? adult.preferences : input.preferences);
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        await store.lockTutoring(tx, adult.family.id);
        await store.cleanTutoring(tx);
        const id = String(input.id);
        const existing = await store.tutoringSession(tx, id);
        if (existing) {
            if (!owns(adult, existing) || existing.content_hash !== hash(material))
                return refuse(409);
            return { id, state: existing.state };
        }
        const state = startTeaching(material);
        await store.createTutoringSession(tx, {
            id,
            family_id: adult.family.id,
            user_id: adult.user ?? null,
            kid_id: adult.kid,
            lesson_id: typeof input.lesson === "string" ? input.lesson : null,
            content_hash: hash(material),
            preferences,
            state,
            revision: 0,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        });
        return { id, state };
    });
}
export async function loadTutor(
    actor: Adult | KidSession,
    id: string,
    kidId?: string,
): Promise<unknown> {
    const adult = await actorOf(actor, kidId);
    if (!uuid(id)) return refuse();
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        await store.lockTutoring(tx, adult.family.id);
        const row = await store.tutoringSession(tx, id);
        if (!row || !owns(adult, row) || row.expires_at < new Date().toISOString())
            return refuse(404);
        const pending = await store.pendingTutoringTurn(tx, id);
        if (
            pending?.result &&
            pending.expected_revision === row.revision &&
            Date.now() - Date.parse(pending.created_at) >= 15000
        ) {
            await store.finishTutoringTurn(tx, row, pending.id, pending.result, {
                model: null,
                input: 0,
                output: 0,
                latency: 0,
            });
            return { id, state: pending.result };
        }
        return { id, state: row.state };
    });
}
export async function turnTutor(
    actor: Adult | KidSession,
    id: string,
    input: unknown,
    kidId?: string,
): Promise<unknown> {
    const adult = await actorOf(actor, kidId);
    if (!uuid(id) || !validTeachingCommand(input)) return refuse();
    const config = tutorConfig(process.env);
    const prepared = await withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        await store.lockTutoring(tx, adult.family.id);
        const session = await store.tutoringSession(tx, id);
        if (!session || !owns(adult, session) || session.expires_at < new Date().toISOString())
            return refuse(404);
        const before = preparedState(session.state);
        if (!before) return refuse(404);
        const material = teachingMaterial(before.materialId);
        if (!material || hash(material) !== session.content_hash) return refuse(409);
        const existing = await store.tutoringTurn(tx, input.operationId);
        if (existing) {
            if (existing.session_id !== id || existing.request_hash !== hash(input))
                return refuse(409);
            if (existing.status === "accepted" && existing.result)
                return { cached: existing.result };
            // A crashed worker's lease expires; finish from prepared material without a second provider call.
            if (Date.now() - Date.parse(existing.created_at) < 15000) return refuse(409);
        }
        if (session.revision !== input.expectedRevision) return refuse(409);
        const pending = await store.pendingTutoringTurn(tx, id);
        if (pending && pending.id !== input.operationId) return refuse(409);
        let state;
        try {
            state = nextTeaching(material, before, input);
        } catch {
            return refuse();
        }
        if (!existing)
            await store.reserveTutoringTurn(tx, {
                id: input.operationId,
                session_id: id,
                family_id: adult.family.id,
                request_hash: hash(input),
                status: "pending",
                result: state,
                expected_revision: input.expectedRevision,
                prompt_version: TUTOR_PROMPT_VERSION,
                created_at: new Date().toISOString(),
            });
        const preferences = adult.kid
            ? teachingPreferences(adult.preferences)
            : session.preferences;
        const adaptive =
            !existing &&
            state.status !== "ended" &&
            frameOf(material, state.step.frameId).phase !== "independent" &&
            preferences.adaptive &&
            config.enabled &&
            !!config.key &&
            (await store.reserveTutoringUsage(tx, adult.family.id));
        return { session: { ...session, preferences }, material, state, adaptive };
    });
    if ("cached" in prepared) return { id, state: prepared.cached };
    const began = Date.now();
    const generated = prepared.adaptive
        ? await tutorStep(config, prepared.material, prepared.state, prepared.session.preferences)
        : null;
    const state = generated ? { ...prepared.state, step: generated.step } : prepared.state;
    await actorOf(actor, kidId);
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        await store.lockTutoring(tx, adult.family.id);
        const current = await store.tutoringSession(tx, id);
        if (!current || current.revision !== prepared.session.revision) return refuse(409);
        await store.finishTutoringTurn(tx, current, input.operationId, state, {
            model: generated?.model ?? null,
            input: generated?.inputTokens ?? 0,
            output: generated?.outputTokens ?? 0,
            latency: Date.now() - began,
        });
        return { id, state };
    });
}

// Replay cache is family scoped and bounded; only a stored, accepted line can be narrated.
const audioCache = new Map<string, { expires: number; data: Uint8Array<ArrayBuffer> }>();
export async function audioTutor(
    actor: Adult | KidSession,
    id: string,
    revision: unknown,
    kidId?: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
    const adult = await actorOf(actor, kidId);
    if (!uuid(id) || !Number.isSafeInteger(revision)) return refuse();
    const config = tutorConfig(process.env);
    if (!config.enabled || !config.key) return null;
    const prepared = await withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        await store.lockTutoring(tx, adult.family.id);
        const session = await store.tutoringSession(tx, id);
        if (!session || !owns(adult, session) || session.expires_at < new Date().toISOString())
            return refuse(404);
        if (
            session.revision !== revision ||
            (adult.kid
                ? teachingPreferences(adult.preferences).audio
                : session.preferences.audio) !== "gemini"
        )
            return refuse(409);
        const state = session.state;
        const spoken = "materialId" in state ? state.step.spokenText : state.move.say;
        const key = hash([adult.family.id, config.ttsModel, session.preferences.guide, spoken]);
        const cached = audioCache.get(key);
        if (cached && cached.expires > Date.now()) return { cached: cached.data };
        if (!(await store.reserveTutoringUsage(tx, adult.family.id, spoken.length))) return null;
        return { key, session, spoken };
    });
    if (!prepared) return null;
    if ("cached" in prepared) return prepared.cached ?? null;
    const data = await tutorAudio(config, prepared.spoken, prepared.session.preferences.guide);
    if (data) {
        for (const [key, entry] of audioCache)
            if (entry.expires <= Date.now()) audioCache.delete(key);
        while (audioCache.size >= 16) {
            const first = audioCache.keys().next().value;
            if (first) audioCache.delete(first);
            else break;
        }
        audioCache.set(prepared.key, { data, expires: Date.now() + 15 * 60000 });
    }
    return data;
}

export async function tutorPreferences(adult: Adult, input: unknown): Promise<{ ok: true }> {
    await actorOf(adult);
    if (!teachingObject(input) || !uuid(input.kid) || !teachingObject(input.preferences))
        return refuse();
    const id = input.kid;
    const preferences = {
        ...teachingPreferences(input.preferences),
        enabled: input.preferences.enabled === true,
    };
    return withFamily({ family: adult.family.id, user: adult.user }, async (tx) => {
        if (!(await consented(tx, adult.family.id)).has(id)) return refuse(404);
        await store.saveTutorPreferences(tx, id, preferences);
        return { ok: true };
    });
}
