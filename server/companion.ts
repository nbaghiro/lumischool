// The companion on a lesson (.docs/companion.md): Charlie, who reads a lesson's explanation and a
// question's help aloud, one step at a time (.docs/hint-steps.md). Everything she says is built here
// from the pack, never taken from a page, and read in one of Gemini's voices, made the first time
// anyone needs a line and kept for everyone after.

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Level, PackLesson } from "../engine/pack";
import { askedIn, LINES, type Asked } from "../school/lessons";
import type { LessonReader } from "./adaptive-help";
import { consented, type Adult, type KidSession } from "./auth";
import { withFamily } from "./db/client";
import { speech, tutorConfig } from "./gemini-tutoring";
import { Refused } from "./sync";

const refuse = (status = 400): never => {
    throw new Refused(status, { error: status === 404 ? "not-found" : "bad-request" });
};
const obj = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

/** What the companion offers a page: the steps always, read aloud where the server has a Gemini key. */
export const companionOffers = (env: NodeJS.ProcessEnv): { on: true; voice: boolean } => ({
    on: true,
    voice: !!tutorConfig(env).key,
});

/** A child's own session on that child, or a parent looking at a lesson; anyone else is refused. */
export async function companionCaller(actor: Adult | KidSession, kidId?: string): Promise<void> {
    if ("parent" in actor) {
        if (!actor.parent) throw new Refused(403, { error: "not-allowed" });
        return;
    }
    if (!kidId || !actor.keys.some((key) => key.kid_id === kidId)) return refuse(404);
    await withFamily({ family: actor.family.id }, async (tx) => {
        if (!(await consented(tx, actor.family.id)).has(kidId)) refuse(404);
    });
}

const LEVELS: readonly Level[] = ["easy", "medium", "hard"];
const plain = (s: string): string =>
    s
        .replace(/[*_`#]/g, "")
        .replace(/\s+/g, " ")
        .trim();

/** Which lesson and question a page is asking about. */
interface Where {
    lesson: string;
    level: Level;
    n: number | null;
    variant: string | null;
}

function whereOf(v: Record<string, unknown>): Where | null {
    if (typeof v.lesson !== "string") return null;
    return {
        lesson: v.lesson,
        level: LEVELS.find((l) => l === v.level) ?? "medium",
        n: typeof v.n === "number" && Number.isInteger(v.n) && v.n > 0 ? v.n : null,
        variant: typeof v.variant === "string" ? v.variant : null,
    };
}

const askedAt = (lesson: PackLesson, where: Where): Asked | null =>
    where.n === null
        ? null
        : (askedIn(lesson, where.level).find(
              (a) =>
                  a.question.n === where.n &&
                  (where.variant === null || a.question.variant === where.variant),
          ) ?? null);

/** What the lesson tells the child, its say blocks in order. */
const toldIn = (lesson: PackLesson, level: Level): string =>
    (lesson.levels[level] ?? lesson.levels.medium).sections
        .flatMap((s) => s.blocks.flatMap((b) => (b.k === "say" ? [plain(b.text)] : [])))
        .join(" ");

/** The longest an explanation runs, in words: about forty seconds at a child's pace. */
const EXPLAIN_WORDS = 95;

/**
 * What Charlie says to explain a lesson: its title, its goal and what it tells the child, in the
 * lesson's own words, cut at a sentence, and how to go on. Nothing a model wrote, and no answer.
 */
export function explainScript(lesson: PackLesson, level: Level): string {
    const told = toldIn(lesson, level);
    const sentences = told.match(/[^.!?]+[.!?]+/g) ?? (told ? [told] : []);
    const kept: string[] = [];
    let words = 0;
    for (const s of sentences) {
        const n = s.trim().split(/\s+/).length;
        if (words + n > EXPLAIN_WORDS && kept.length) break;
        kept.push(s.trim());
        words += n;
    }
    return [
        `Hello! This lesson is called ${plain(lesson.title)}.`,
        // a goal is written as what the child does ("Read a two-digit number"), so it is said as today's
        lesson.goal
            ? `Today we will ${plain(lesson.goal).replace(/^\w/, (c) => c.toLowerCase())}`
            : "",
        ...kept,
        "Have a go now. If you get stuck, tap help next to a question.",
    ]
        .filter(Boolean)
        .join(" ");
}

/**
 * The last step of a question's help, which walks it through to the answer: every hint in order,
 * the answer in words where the author wrote them, and the answer.
 */
export function answerScript(a: Asked): string {
    const q = a.question;
    const answer = Object.entries(q.answers)
        .map(([k, v]) => q.labels?.[k] ?? v)
        .join(", ");
    return [
        LINES["step-answer"],
        ...q.hints.map(plain),
        q.explain ? plain(q.explain) : "",
        `So the answer is ${answer}.`,
    ]
        .filter(Boolean)
        .join(" ");
}

const STEP_LINES = ["step-first", "step-worked", "step-done"] as const;

/** The voice Charlie reads in, one of Gemini's, which `COMPANION_VOICE` may change. */
const VOICE = (): string => process.env.COMPANION_VOICE || "Leda";
/** Where voiced lines are kept, named by a hash of the voice, the model and the words. */
const VOICE_DIR = (): string =>
    process.env.COMPANION_VOICE_DIR || join(process.cwd(), ".cache", "companion-voice");
/** Words this server built and may voice, by their key, so a page can never have a line voiced. */
const voiceable = new Map<string, string>();

const voiceKey = (words: string): string =>
    createHash("sha256")
        .update(`${VOICE()}\n${tutorConfig(process.env).ttsModel}\n${words}`)
        .digest("hex")
        .slice(0, 24);

/**
 * What a step says, built here from the pack: a question's hint by its rung, its walk to the answer,
 * the lesson's explanation, or one of the step's fixed lines. With it, the key the page fetches its
 * voice by, or null where there is no voice to be had (no Gemini key), when the page shows the words.
 */
export function stepWords(
    read: LessonReader,
    body: unknown,
): { words: string; voice: string | null } {
    if (!obj(body)) return refuse();
    let words: string | null = null;
    if (body.kind === "line") {
        const line = STEP_LINES.find((l) => l === body.line);
        words = line ? LINES[line] : null;
    } else {
        const where = whereOf(body);
        const lesson = where && read(where.lesson);
        const a = lesson && where ? askedAt(lesson, where) : null;
        if (body.kind === "explain" && lesson && where) words = explainScript(lesson, where.level);
        else if (body.kind === "answer" && a) words = answerScript(a);
        else if (body.kind === "hint" && a) {
            const rung =
                typeof body.rung === "number" && Number.isInteger(body.rung) ? body.rung : -1;
            const hint = a.question.hints[rung];
            words = hint === undefined ? null : plain(hint);
        }
    }
    if (!words) return refuse(404);
    if (!tutorConfig(process.env).key) return { words, voice: null };
    const key = voiceKey(words);
    voiceable.set(key, words);
    return { words, voice: key };
}

/**
 * A step's words read aloud, made the first time anyone asks for them and kept for everyone after.
 * Only words `stepWords` built are voiced; any other key is not found.
 */
export async function stepVoice(key: string): Promise<Uint8Array<ArrayBuffer>> {
    if (!/^[0-9a-f]{24}$/.test(key)) return refuse(404);
    const file = join(VOICE_DIR(), `${key}.wav`);
    if (existsSync(file)) return Uint8Array.from(await readFile(file));
    const words = voiceable.get(key);
    if (!words) return refuse(404);
    const wav = await speech(tutorConfig(process.env), words, VOICE());
    if (!wav) throw new Refused(502, { error: "server", problem: "The voice could not be made." });
    await mkdir(VOICE_DIR(), { recursive: true });
    await writeFile(file, wav);
    return wav;
}
