// The companion a child talks a lesson through with: a cartoon face on Tavus's conversational video
// (.docs/companion.md). The key stays on this server, and what the companion knows of the question is
// built here from the pack, never from the client, and never holds an answer.

import { COMPANIONS, type Companion } from "../engine/answer";
import type { Level, PackLesson, PackQuestion } from "../engine/pack";
import { askedIn, easierOf, ringableIn, type Asked } from "../school/lessons";
import type { LessonReader } from "./adaptive-help";
import { consented, type Adult, type KidSession } from "./auth";
import { withFamily } from "./db/client";
import { releaseCompanion, reserveCompanion } from "./db/tutoring";
import { Refused } from "./sync";

const API = "https://tavusapi.com/v2";
/**
 * A call's longest life, in seconds: Tavus ends it then whatever the child is doing. A call left
 * quiet ends after a minute on the page's side (engine/ui/companion.ts), so this bounds only a call
 * that keeps talking.
 */
const LONGEST = 30 * 60;
/** Conversations a family may start in a day. */
const PER_DAY = 12;

/** Each face, as Tavus knows it, with the name the companion speaks as. */
const FACES: Record<Companion, { face: string; name: string }> = {
    "dr-paws": { face: "r21a52c53fa4", name: "Dr. Paws" },
    "mr-edward": { face: "rc36bdce7740", name: "Mr. Edward" },
    "mrs-hart": { face: "rc4492899eda", name: "Mrs. Hart" },
};

/** The companion's hands on the sheet, which the child's page carries out (`use` in engine/ui/companion.ts). */
const TOOLS = [
    {
        name: "show_hint",
        description:
            "Open the next written hint on the question the child is working on, so it appears on their worksheet. The result is the hint's words; then talk about them.",
        parameters: { type: "object", properties: {} },
    },
    {
        name: "ring_part",
        description:
            "Draw a ring round one part of the current question's picture, so the child knows where to look. Then say what to look at there.",
        parameters: {
            type: "object",
            properties: {
                part: {
                    type: "string",
                    description: "The id of the part to ring, one of the ids the context lists.",
                },
            },
            required: ["part"],
        },
    },
    {
        name: "show_worked",
        description:
            "Show the lesson's worked example of the same kind beside the current question, or an easier one like it. Use it when the child is stuck after a hint.",
        parameters: { type: "object", properties: {} },
    },
];

const promptOf = (name: string): string =>
    `You are ${name}, a warm, playful cartoon tutor inside a children's learning app. You are with one child aged five to twelve, who is doing a worksheet on the screen beside you. Talk naturally, like a kind, funny teacher who loves the subject.

How a turn works:
- The child does not have to speak. When they tap a button you get a message such as "[The child tapped: Explain this lesson]" or "[The child tapped: Help with this one]". Answer it straight away, out loud.
- The child can also hold a Talk button and speak to you. Answer what they say.
- The child writes answers on the worksheet, not to you. You are told when they check an answer and whether it was right, in a message that starts with "[The child checked".
- The context tells you the lesson and the question the child is on now. It changes as they move on.

How you teach:
- Speak in short sentences, two or three at a time, then stop so the child can think or try. Never give a long lecture.
- Never say the answer to a question on the worksheet, even if the child asks for it. You are not told the answers. Guide them to find it.
- Use your tools to point at the worksheet: show_hint opens the next written hint, ring_part rings a part of the picture (only the ids the context lists), and show_worked shows a worked example. Use at most one tool at a time, and say what it shows.
- When the child gets one right, praise them briefly and warmly, then stop. Do not move on unless they ask.
- When they get one wrong, be kind, and help with what the worksheet said.
- A question to write, paint, make or say for a grown-up is marked by the grown-up, not by you: help the child start, and never judge what they made.
- When the context says what was said earlier, that talk happened with you before this call started again: carry on from it without greeting the child as if you were new, and do not repeat what was already explained.
- Stay on this lesson. If the child talks about something else, answer in one friendly sentence and come back to the worksheet.
- Never ask for the child's name, age, address or any personal detail, and never talk about anything scary or grown-up.`;

/** Whether the companion can be offered at all: the key is set. */
const companionOn = (env: NodeJS.ProcessEnv): boolean => !!env.TAVUS_API_KEY;

const refuse = (status = 400): never => {
    throw new Refused(status, { error: status === 404 ? "not-found" : "bad-request" });
};
const obj = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

async function tavus(
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: unknown,
): Promise<unknown> {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            "x-api-key": process.env.TAVUS_API_KEY ?? "",
            "content-type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    // an update that changes nothing answers 304
    if (!res.ok && res.status !== 304) {
        process.stderr.write(
            `companion: Tavus ${method} ${path} ${res.status} ${text.slice(0, 300)}\n`,
        );
        // the account's conversation minutes are spent: a grown-up has to top them up
        if (res.status === 402)
            throw new Refused(402, { error: "not-allowed", problem: "out-of-credits" });
        throw new Refused(502, { error: "server", problem: "The companion could not be reached." });
    }
    const parsed: unknown = text ? JSON.parse(text) : null;
    return parsed;
}

const listed = (v: unknown): Record<string, unknown>[] =>
    obj(v) && Array.isArray(v.data) ? v.data.filter(obj) : [];
const field = (v: unknown, key: string): string | null =>
    obj(v) && typeof v[key] === "string" ? v[key] : null;

/**
 * How each tool runs: the page carries it out (app message), the companion says nothing while it
 * does, and then speaks from what came back, such as the hint's words.
 */
const RUNS = { on_call: "silent", on_resolve: "generate_response" } as const;

/**
 * The tools' ids on the account, made once: a tool's name is the account's, so one made before is
 * found by it, and brought up to date when its description or how it runs has changed.
 */
let tools: Promise<string[]> | null = null;
function toolIds(): Promise<string[]> {
    tools ??= (async () => {
        const have = listed(await tavus("GET", "/tools?limit=100"));
        const ids: string[] = [];
        for (const t of TOOLS) {
            const found = have.find((x) => x.name === t.name);
            const known = field(found, "tool_id");
            if (
                known &&
                (found?.description !== t.description ||
                    JSON.stringify(found.parameters) !== JSON.stringify(t.parameters) ||
                    found.on_call !== RUNS.on_call ||
                    found.on_resolve !== RUNS.on_resolve)
            )
                await tavus("PATCH", `/tools/${known}`, {
                    description: t.description,
                    parameters: t.parameters,
                    ...RUNS,
                });
            const id =
                known ??
                field(
                    await tavus("POST", "/tools", {
                        ...t,
                        origin: "llm",
                        ...RUNS,
                        delivery: { app_message: true },
                    }),
                    "tool_id",
                );
            if (!id) return refuse(502);
            ids.push(id);
        }
        return ids;
    })().catch((e: unknown) => {
        tools = null;
        throw e;
    });
    return tools;
}

/**
 * Tavus keeps a PAL's name without its punctuation ("Dr. Paws," comes back as "Dr Paws"), so names
 * are compared as their words alone.
 */
const words = (name: unknown): string =>
    typeof name === "string"
        ? name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")
              .trim()
        : "";

/**
 * One PAL per face, kept on the account and found again by its face and name after a restart. When
 * the prompt or the tools change, that PAL is updated in place rather than a new one made.
 */
const pals = new Map<Companion, Promise<string>>();
function palFor(who: Companion): Promise<string> {
    const had = pals.get(who);
    if (had) return had;
    const { face, name } = FACES[who];
    const prompt = promptOf(name);
    const palName = `${name} lumischool companion`;
    const made = (async () => {
        const tools = await toolIds();
        const found = listed(await tavus("GET", "/pals?limit=100"))
            .filter(
                (p) => p.default_face_id === face && words(p.pal_name).startsWith(words(palName)),
            )
            .at(-1);
        const existing = field(found, "pal_id");
        if (existing) {
            if (found?.system_prompt !== prompt)
                await tavus("PATCH", `/pals/${existing}`, [
                    { op: "replace", path: "/system_prompt", value: prompt },
                ]);
            const has = Array.isArray(found?.tool_ids) ? found.tool_ids : [];
            if (tools.some((t) => !has.includes(t)))
                await tavus("POST", `/pals/${existing}/tools`, { tool_ids: tools });
            return existing;
        }
        const pal = field(
            await tavus("POST", "/pals", {
                pal_name: palName,
                pipeline_mode: "full",
                default_face_id: face,
                system_prompt: prompt,
                dynamic_greeting: false,
                languages: ["en"],
                layers: {
                    llm: { model: "tavus-gemini-2.5-flash" },
                    // the child's camera is never looked at: only what they say while holding Talk is heard
                    perception: { perception_model: "off" },
                    // a young child pauses mid-sentence, so the companion waits longer before its turn
                    conversational_flow: {
                        turn_taking_patience: "high",
                        pal_interruptibility: "high",
                    },
                },
            }),
            "pal_id",
        );
        if (!pal) return refuse(502);
        await tavus("POST", `/pals/${pal}/tools`, { tool_ids: tools });
        return pal;
    })().catch((e: unknown) => {
        pals.delete(who);
        throw e;
    });
    pals.set(who, made);
    return made;
}

/** What the child's page says about where they are: the lesson, the question if any, and how it went. */
interface Where {
    lesson: string;
    level: Level;
    n: number | null;
    variant: string | null;
    hints: number;
    tries: number;
    said: string | null;
    worked: boolean;
}

const LEVELS: readonly Level[] = ["easy", "medium", "hard"];
const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n)}…` : s);
const plain = (s: string): string =>
    s
        .replace(/[*_`#]/g, "")
        .replace(/\s+/g, " ")
        .trim();

function whereOf(v: unknown): Where | null {
    if (!obj(v) || typeof v.lesson !== "string") return null;
    const level = LEVELS.find((l) => l === v.level) ?? "medium";
    const n = typeof v.n === "number" && Number.isInteger(v.n) && v.n > 0 ? v.n : null;
    const count = (x: unknown): number =>
        typeof x === "number" && Number.isInteger(x) && x >= 0 ? Math.min(x, 50) : 0;
    return {
        lesson: v.lesson,
        level,
        n,
        variant: typeof v.variant === "string" ? v.variant : null,
        hints: count(v.hints),
        tries: count(v.tries),
        said: typeof v.said === "string" && v.said ? clip(v.said, 300) : null,
        worked: v.worked === true,
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

/** What the lesson tells the child, its say blocks in order, for explaining it. */
const toldIn = (lesson: PackLesson, level: Level): string =>
    clip(
        (lesson.levels[level] ?? lesson.levels.medium).sections
            .flatMap((s) => s.blocks.flatMap((b) => (b.k === "say" ? [plain(b.text)] : [])))
            .join(" "),
        2500,
    );

/** How a question is answered, in the words the companion needs, so it does not ask for a typed answer to a painting. */
const wayWords = (a: Asked): string =>
    a.way === "grown-up"
        ? "The child makes this one away from the screen, and a grown-up looks at it."
        : a.way === "arranged"
          ? "The child answers by moving pieces on the picture."
          : a.way === "program"
            ? "The child answers by building a program from blocks."
            : "The child types or picks the answer on the worksheet.";

function questionWords(lesson: PackLesson, where: Where, a: Asked): string[] {
    const q: PackQuestion = a.question;
    const parts = ringableIn(q);
    const opened = q.hints.slice(0, where.hints);
    const left = q.hints.length - opened.length;
    const easier = easierOf(lesson, where.level, a);
    return [
        `The question the child is on now is question ${q.n}. It asks: "${plain(q.ask)}"`,
        wayWords(a),
        parts.length
            ? `Parts of its picture you may ring with ring_part, by id: ${parts.map((p) => `${p.id} (a ${p.type})`).join(", ")}.`
            : "Its picture has no part to ring.",
        opened.length
            ? `Hints already open on the worksheet: ${opened.map((h) => `"${plain(h)}"`).join(" ")}`
            : "No hint is open yet.",
        left > 0
            ? `show_hint can open ${left} more hint${left === 1 ? "" : "s"}.`
            : "There are no more hints to open.",
        easier && !where.worked
            ? "show_worked can show a worked example beside it."
            : where.worked
              ? "The worked example is already showing."
              : "There is no worked example for this one.",
        where.tries
            ? `The child has checked ${where.tries} answer${where.tries === 1 ? "" : "s"} on it, not yet right.${where.said ? ` The worksheet said: "${plain(where.said)}"` : ""}`
            : "The child has not checked an answer on it yet.",
    ];
}

/**
 * The most a context sent during a call may weigh, in bytes: it travels as a Daily app message,
 * which Tavus caps at 4 KB with the envelope around it, and one over that is dropped without a word.
 */
export const IN_CALL = 3400;

/**
 * The companion's context for where the child is: the lesson, what it tells, the question now, with
 * no answer in it, and what was said earlier in the sitting. Within `room` bytes, the earlier talk
 * loses its oldest lines first, then what the lesson tells is cut shorter.
 */
export function contextOf(
    read: LessonReader,
    where: Where,
    earlier: unknown = null,
    room = Infinity,
): string {
    const lesson = read(where.lesson);
    if (!lesson) return refuse(404);
    const a = askedAt(lesson, where);
    const head = [
        `The lesson is "${plain(lesson.title)}", ${lesson.subject}, grade ${lesson.grade}.`,
        lesson.goal ? `Its goal: ${plain(lesson.goal)}` : "",
    ];
    const question = a
        ? questionWords(lesson, where, a)
        : ["The child has no question open just now."];
    const said = linesOf(earlier);
    let told = toldIn(lesson, where.level);
    const whole = (): string =>
        [
            ...head,
            told ? `What the lesson tells the child: ${told}` : "",
            ...question,
            said.length
                ? `\nWhat was said earlier in this sitting, before this call:\n${said.join("\n")}`
                : "",
        ]
            .filter(Boolean)
            .join("\n");
    while (Buffer.byteLength(whole()) > room && said.length) said.shift();
    while (Buffer.byteLength(whole()) > room && told.length > 200)
        told = clip(told, told.length / 2);
    return whole();
}

/** The most of an earlier talk a new call is told, in lines and in characters. */
const EARLIER_LINES = 20;
const EARLIER_CHARS = 4000;

/**
 * What the companion and the child said in this sitting before this call, as the page kept it, so a
 * call that starts again carries on. Each line is clipped, and the newest lines are kept.
 */
function linesOf(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    const lines = v
        .filter(obj)
        .flatMap((l) =>
            (l.who === "companion" || l.who === "child") && typeof l.words === "string"
                ? [`${l.who === "companion" ? "You" : "The child"}: ${clip(plain(l.words), 400)}`]
                : [],
        )
        .slice(-EARLIER_LINES);
    while (lines.join("\n").length > EARLIER_CHARS) lines.shift();
    return lines;
}

/** The calls this server started, by Tavus's id, so a family can end only its own. */
const started = new Map<string, { family: string; at: number }>();

/**
 * The family a caller talks to the companion for: a child's own session on that child, or a parent
 * trying it on a lesson they are looking at. Either way the family's day counts the calls.
 */
export async function companionFamily(actor: Adult | KidSession, kidId?: string): Promise<string> {
    if (!companionOn(process.env)) return refuse(404);
    if ("parent" in actor) {
        if (!actor.parent) throw new Refused(403, { error: "not-allowed" });
        return actor.family.id;
    }
    if (!kidId || !actor.keys.some((key) => key.kid_id === kidId)) return refuse(404);
    await withFamily({ family: actor.family.id }, async (tx) => {
        if (!(await consented(tx, actor.family.id)).has(kidId)) refuse(404);
    });
    return actor.family.id;
}

/** Starts a call with the face chosen, knowing where the lesson is, within the family's day. */
export async function startCompanion(
    family: string,
    read: LessonReader,
    body: unknown,
): Promise<{ url: string; id: string; token: string | null; name: string; left: number }> {
    const where = whereOf(obj(body) ? body.where : null);
    const who = COMPANIONS.find((c) => obj(body) && c === body.face) ?? "dr-paws";
    if (!where) return refuse();
    const context = contextOf(read, where, obj(body) ? body.earlier : null);
    const left = await withFamily({ family }, (tx) => reserveCompanion(tx, family, PER_DAY));
    if (left === null) throw new Refused(429, { error: "rate-limited", limit: "companion" });
    // a call Tavus never starts gives the family's day its count back
    const call = await palFor(who)
        .then((pal) =>
            tavus("POST", "/conversations", {
                face_id: FACES[who].face,
                pal_id: pal,
                conversational_context: context,
                // a private room for two: the page joins with the token, and nobody else can
                require_auth: true,
                max_participants: 2,
                properties: {
                    max_call_duration: LONGEST,
                    participant_left_timeout: 0,
                    participant_absent_timeout: 60,
                    languages: ["en"],
                },
            }),
        )
        .catch(async (e: unknown) => {
            await withFamily({ family }, (tx) => releaseCompanion(tx, family));
            throw e;
        });
    const url = field(call, "conversation_url");
    const id = field(call, "conversation_id");
    const token = field(call, "meeting_token");
    if (!url || !id) return refuse(502);
    const now = Date.now();
    for (const [k, v] of started) if (now - v.at > LONGEST * 2000) started.delete(k);
    started.set(id, { family, at: now });
    return { url, id, token, name: FACES[who].name, left };
}

/** The context again for where the lesson has moved to, which the page hands the call itself. */
export function companionContext(read: LessonReader, body: unknown): { context: string } {
    const where = whereOf(body);
    if (!where) return refuse();
    return { context: contextOf(read, where, obj(body) ? body.earlier : null, IN_CALL) };
}

/** Ends a call this family started, so its minutes stop as soon as it is closed. */
export async function endCompanion(family: string, body: unknown): Promise<{ ok: true }> {
    const id = obj(body) && typeof body.id === "string" ? body.id : "";
    const call = started.get(id);
    if (!call || call.family !== family) return refuse(404);
    started.delete(id);
    await tavus("POST", `/conversations/${encodeURIComponent(id)}/end`).catch(() => null);
    return { ok: true };
}
