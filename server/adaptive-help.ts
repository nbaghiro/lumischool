// A tutor's help on one compiled question, stored in the same session rows a prepared bundle uses.
// The ground is built here from the pack, never from the client, and every number is recomputed.

import { createHash } from "node:crypto";
import { DEFAULT_TEACHING, teachingObject } from "../engine/teaching";
import type { Level, PackLesson, PackQuestion } from "../engine/pack";
import {
    authoredMove,
    nextHelp,
    startHelp,
    type AdaptiveContext,
    type AdaptiveHelp,
    type AdaptiveTry,
    adaptiveContext,
} from "../school/adaptive";
import { askedIn } from "../school/lessons";
import { ADAPTIVE_PROMPT_VERSION } from "../school/assistant/adaptive";
import { adaptiveTurn } from "./adaptive";
import { withFamily } from "./db/client";
import * as store from "./db/tutoring";
import { Refused } from "./sync";
import { tutorConfig } from "./gemini-tutoring";

const hash = (value: unknown): string =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
const refuse = (status = 400): never => {
    throw new Refused(status, { error: status === 404 ? "not-found" : "bad-request" });
};
const uuid = (id: unknown): id is string =>
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** The lesson a help names, read from the pack the API already serves. */
export type LessonReader = (lessonId: string) => PackLesson | null;

interface Asked {
    lesson: PackLesson;
    question: PackQuestion;
    skills: string[];
}
function askedOf(read: LessonReader, lessonId: string, n: number, variant: string): Asked | null {
    const lesson = read(lessonId);
    if (!lesson) return null;
    for (const level of ["medium", "easy", "hard"] as Level[])
        for (const asked of askedIn(lesson, level))
            if (asked.question.n === n && asked.question.variant === variant)
                return { lesson, question: asked.question, skills: asked.item.skills };
    return null;
}

/** What the child has tried, with each verdict recomputed here from the compiled answer. */
function triesOf(value: unknown, question: PackQuestion): AdaptiveTry[] {
    if (!Array.isArray(value)) return [];
    const answer = Object.values(question.answers)[0] ?? "";
    return value
        .filter(teachingObject)
        .slice(-6)
        .map((t) => ({
            answer: typeof t.answer === "string" ? t.answer.slice(0, 40) : "",
            correct: typeof t.answer === "string" && t.answer.trim() === answer.trim(),
            told: typeof t.told === "string" ? t.told.slice(0, 300) : null,
        }));
}

function contextOf(
    asked: Asked,
    tries: AdaptiveTry[],
    made: readonly string[],
    checks: readonly { quantityId: string; answer: number; correct: boolean }[] = [],
): AdaptiveContext {
    const context = adaptiveContext({
        lessonId: asked.lesson.id,
        skills: asked.skills,
        question: asked.question,
        tries,
        made,
        checks,
    });
    if (!context) return refuse(404);
    return context;
}

export interface HelpActor {
    family: { id: string };
    user: string | undefined;
    kid: string | null;
}

/** Flow: the first move is authored and instant, so this only records what the client already shows. */
export async function startHelpOn(
    actor: HelpActor,
    read: LessonReader,
    input: unknown,
): Promise<unknown> {
    if (
        !teachingObject(input) ||
        !uuid(input.id) ||
        typeof input.lesson !== "string" ||
        typeof input.variant !== "string" ||
        !Number.isSafeInteger(input.n)
    )
        return refuse();
    const asked = askedOf(read, input.lesson, Number(input.n), input.variant);
    if (!asked) return refuse(404);
    const tries = triesOf(input.tries, asked.question);
    const context = contextOf(asked, tries, []);
    const id = String(input.id);
    return withFamily({ family: actor.family.id, user: actor.user }, async (tx) => {
        await store.lockTutoring(tx, actor.family.id);
        await store.cleanTutoring(tx);
        const existing = await store.tutoringSession(tx, id);
        // The same question asked again in a sitting resumes its help rather than starting over.
        if (existing) {
            if (existing.content_hash !== hash(context.quantities)) return refuse(409);
            return { id, help: existing.state };
        }
        const help = startHelp({
            lessonId: asked.lesson.id,
            questionN: asked.question.n,
            variant: asked.question.variant,
            move: authoredMove(context),
        });
        await store.createTutoringSession(tx, {
            id,
            family_id: actor.family.id,
            user_id: actor.user ?? null,
            kid_id: actor.kid,
            lesson_id: asked.lesson.id,
            content_hash: hash(context.quantities),
            preferences: { ...DEFAULT_TEACHING, entry: "guided", adaptive: true },
            state: help,
            revision: 0,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        });
        return { id, help };
    });
}

export async function loadHelp(actor: HelpActor, id: string): Promise<unknown> {
    if (!uuid(id)) return refuse();
    return withFamily({ family: actor.family.id, user: actor.user }, async (tx) => {
        const row = await store.tutoringSession(tx, id);
        if (!row || row.expires_at < new Date().toISOString()) return refuse(404);
        return { id, help: row.state };
    });
}

/**
 * One turn: the child's answer to the tutor's own check is marked here, the model chooses the next
 * move, and a refusal or a slow answer leaves the question's own hint in its place.
 */
export async function turnHelp(
    actor: HelpActor,
    read: LessonReader,
    id: string,
    input: unknown,
): Promise<unknown> {
    if (!uuid(id) || !teachingObject(input) || !uuid(input.operationId)) return refuse();
    const answer = Number.isSafeInteger(input.answer) ? Number(input.answer) : null;
    const config = tutorConfig(process.env);
    const prepared = await withFamily({ family: actor.family.id, user: actor.user }, async (tx) => {
        await store.lockTutoring(tx, actor.family.id);
        const row = await store.tutoringSession(tx, id);
        if (!row || row.expires_at < new Date().toISOString()) return refuse(404);
        const help = row.state;
        if (!("move" in help)) return refuse(404);
        // The same operation id twice is the same turn, answered before the revision is compared.
        const existing = await store.tutoringTurn(tx, String(input.operationId));
        if (existing?.status === "accepted" && existing.result) return { cached: existing.result };
        if (help.revision !== input.expectedRevision) return refuse(409);
        const asked = askedOf(read, help.lessonId, help.questionN, help.variant);
        if (!asked) return refuse(409);
        const tries = triesOf(input.tries, asked.question);
        const context = contextOf(asked, tries, help.made, help.checks);
        if (!existing)
            await store.reserveTutoringTurn(tx, {
                id: String(input.operationId),
                session_id: id,
                family_id: actor.family.id,
                request_hash: hash(input),
                status: "pending",
                result: null,
                expected_revision: help.revision,
                prompt_version: ADAPTIVE_PROMPT_VERSION,
                created_at: new Date().toISOString(),
            });
        const live =
            config.enabled &&
            !!config.key &&
            help.status !== "ended" &&
            (await store.reserveTutoringUsage(tx, actor.family.id));
        return { row, help, context, live };
    });
    if ("cached" in prepared) return { id, help: prepared.cached };
    const began = Date.now();
    const turn = prepared.live ? await adaptiveTurn(config, prepared.context) : null;
    const move = turn ? turn.move : authoredMove(prepared.context);
    const help: AdaptiveHelp = nextHelp(prepared.help, answer, move);
    return withFamily({ family: actor.family.id, user: actor.user }, async (tx) => {
        await store.lockTutoring(tx, actor.family.id);
        const current = await store.tutoringSession(tx, id);
        if (!current || current.revision !== prepared.row.revision) return refuse(409);
        await store.finishTutoringTurn(tx, current, String(input.operationId), help, {
            model: turn?.model ?? null,
            input: turn?.inputTokens ?? 0,
            output: turn?.outputTokens ?? 0,
            latency: Date.now() - began,
        });
        return { id, help };
    });
}

/** Whether the tutor can teach a question, which the help button asks before it offers itself. */
export function helpAvailable(read: LessonReader, lessonId: string, n: number, variant: string) {
    const asked = askedOf(read, lessonId, n, variant);
    if (!asked) return { teachable: false };
    const context = adaptiveContext({
        lessonId,
        skills: asked.skills,
        question: asked.question,
        tries: [],
        made: [],
    });
    return { teachable: context !== null };
}
