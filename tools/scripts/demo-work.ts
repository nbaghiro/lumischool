import { parseDecimal } from "../../engine/numbers";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { evaluate, showValue, num, str, pieces, type Env } from "../../engine/expr";
import { instantiate, fill } from "../../engine/notation/instantiate";
import { Workspace, type Item, type Lesson } from "../../engine/notation/notation";
import { pick, type Variant } from "../../engine/notation/verify";
import { ACTIVITIES } from "../../school/games/activities";
import { explore } from "../../school/games/prove";
import type { Position } from "../../school/games/games";

interface Asked {
    section: string;
    n: number;
    item: string;
    itemHash: string;
    variant: string;
    ask: string;
    skills: string[];
    /** How a right answer is given: the kinds of `Given` in engine/answer.ts this item can produce. */
    kind: "number" | "pick" | "word" | "unmarked";
    right: string | null;
    /** Wrong answers a rule of the item recognises, each with the sentence the rule says, filled in. */
    mistakes: { wrote: string; rule: string }[];
    /** A wrong answer no rule recognises, or null when there is no sensible one. */
    slip: string | null;
    hints: string[];
}

interface Played {
    moves: {
        say: string;
        key: string;
        at: number;
        gap: number;
        dist: number | null;
        undo: boolean;
    }[];
    outcome: "won" | "gave up" | "out of moves";
    capped: boolean;
}

const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const root = new URL("../../content/", import.meta.url);

function sources(dir: string, ext: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const sub of readdirSync(new URL(dir, root))) {
        for (const f of readdirSync(new URL(`${dir}${sub}/`, root))) {
            if (f.endsWith(ext))
                out[`${dir === "art/" ? "art/" : ""}${sub}/${f}`] = readFileSync(
                    new URL(`${dir}${sub}/${f}`, root),
                    "utf8",
                );
        }
    }
    return out;
}

const raw: unknown = JSON.parse(process.argv[2] ?? "{}");
if (!raw || typeof raw !== "object") throw new Error("demo input must be an object");
const lessonsInput: unknown = "lessons" in raw ? raw.lessons : [];
if (!Array.isArray(lessonsInput) || !lessonsInput.every((v: unknown) => typeof v === "string"))
    throw new Error("demo lessons must be a list of ids");
const extraInput: unknown = "extra" in raw ? raw.extra : {};
if (!extraInput || typeof extraInput !== "object" || Array.isArray(extraInput))
    throw new Error("demo extra must be a map of source files");
const extra: Record<string, string> = {};
for (const [path, text] of Object.entries(extraInput)) {
    if (typeof text !== "string") throw new Error("demo source files must be text");
    extra[path] = text;
}
function count(value: unknown, fallback: number): number {
    if (value === undefined) return fallback;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0)
        throw new Error("demo counts must be nonnegative integers");
    return value;
}
const want = {
    lessons: lessonsInput.filter((v: unknown): v is string => typeof v === "string"),
    draws: count("draws" in raw ? raw.draws : undefined, 1),
    plays: count("plays" in raw ? raw.plays : undefined, 0),
    extra,
};

const ws = new Workspace({ ...sources("curriculum/", ".lumi"), ...want.extra });

/** A seeded generator, so the demo is the same every time it is built. */
function seeded(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const keyOf = (v: Variant) =>
    Object.entries(v.values)
        .map(([k, x]) => `${k}=${x}`)
        .join(",");

function inputsOf(nodes: NonNullable<Item["scene"]>["nodes"]): string[] {
    return nodes.flatMap((n) => [n.type, ...inputsOf(n.children)]);
}

/** The question as it reads on the page: its sums, its equations with their boxes, and its sentences. */
function askOf(item: Item, v: Variant): string {
    if (!item.scene) return item.title ?? item.id;
    const out: string[] = [];
    try {
        const inst = instantiate(item.scene, v.env, item.roles, ws.defines);
        for (const c of inst.nodes) {
            const x = c.v as Record<string, unknown>;
            if (c.type === "columns" && typeof x.a === "number" && typeof x.b === "number")
                out.push(`${x.a} ${x.op === "sub" ? "-" : x.op === "mul" ? "×" : "+"} ${x.b}`);
            for (const val of Object.values(x)) {
                if (
                    val &&
                    typeof val === "object" &&
                    "filled" in val &&
                    typeof val.filled === "string" &&
                    val.filled.trim()
                )
                    out.push(val.filled.trim());
            }
        }
    } catch {
        /* a scene that cannot be built reads as its title */
    }
    return out.join(" ") || item.title || item.id;
}

function optionsOf(item: Item, v: Variant): string[] {
    if (!item.scene) return [];
    try {
        const inst = instantiate(item.scene, v.env, item.roles, ws.defines);
        return inst.nodes.flatMap((c) => {
            const o = (c.v as Record<string, unknown>).options;
            return Array.isArray(o)
                ? o.flatMap((x: unknown) =>
                      x && typeof x === "object" && "value" in x ? [String(x.value)] : [],
                  )
                : [];
        });
    } catch {
        return [];
    }
}

const NUMBER = /^-?\d+(\.\d+)?$/;

/** Numbers a child might write instead: near misses, the numbers on the page, and their sums. */
function numberCandidates(v: Variant, right: string): string[] {
    const r = Number(right);
    const env = Object.values(v.env)
        .map((x) => showValue(x))
        .filter((x) => NUMBER.test(x))
        .map(Number);
    const near = Array.from({ length: 12 }, (_, i) => [r + i + 1, r - i - 1]).flat();
    const pairs = env.flatMap((a) => env.flatMap((b) => [a + b, a - b, a * b]));
    const shifted = [
        r * 10,
        r / 10,
        r + 10,
        r - 10,
        r + 100,
        r - 100,
        Number(String(Math.abs(r)).split("").reverse().join("")),
    ];
    const small = Array.from({ length: 21 }, (_, i) => i);
    const places = right.split(".")[1]?.length ?? 0;
    return [
        ...new Set(
            [...env, ...near, ...pairs, ...shifted, ...small]
                .filter(Number.isFinite)
                .map((x) => x.toFixed(places)),
        ),
    ];
}

/** Letters and spellings a child might write instead of a word. */
function wordCandidates(right: string): string[] {
    const out = new Set<string>();
    const w = right;
    for (let i = 0; i + 1 < w.length; i++)
        out.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    for (let i = 0; i < w.length; i++) out.add(w.slice(0, i) + w.slice(i + 1));
    if (w.length === 1) for (const c of "bdpqsmnaeiou") out.add(c);
    out.delete(w);
    out.delete("");
    return [...out];
}

/** The rule a wrong answer matches, or null, including when the answer is not one the rules can read. */
function match(item: Item, v: Variant, wrote: string): number | null {
    try {
        return matchMistake(item, v, wrote);
    } catch {
        return null;
    }
}

function asked(item: Item, v: Variant, section: string, n: number): Asked {
    const inputs = item.scene ? inputsOf(item.scene.nodes) : [];
    const answers = Object.entries(v.answers);
    const base = {
        // the hash of the level the question was drawn at, as a question ref carries it (engine/pack.ts,
        // PackItem.hash); these draws are medium's, since ws.items holds each item at medium
        section,
        n,
        item: item.id,
        itemHash: sha256(ws.textAt("item", item.id, "medium")),
        variant: keyOf(v),
        ask: askOf(item, v),
        skills: item.skills,
        hints: item.hints.map((h) => filled(h, v.env, item.roles)),
    };
    if (answers.length === 0)
        return { ...base, kind: "unmarked", right: null, mistakes: [], slip: null };
    if (answers.length > 1) {
        // Several blanks: written as the item names them, in the variant key's own shape.
        const right = answers.map(([k, x]) => `${k}=${x}`).join(",");
        const last = answers.at(-1);
        const slip =
            last && NUMBER.test(last[1])
                ? answers.map(([k, x]) => `${k}=${k === last[0] ? Number(x) + 1 : x}`).join(",")
                : null;
        return { ...base, kind: "word", right, mistakes: [], slip };
    }
    const right = answers[0]?.[1] ?? "";
    const kind = inputs.includes("choice") ? "pick" : NUMBER.test(right) ? "number" : "word";
    const candidates =
        kind === "pick"
            ? optionsOf(item, v)
            : kind === "number"
              ? numberCandidates(v, right)
              : wordCandidates(right);
    const mistakes: { wrote: string; rule: string }[] = [];
    const seen = new Set<number>();
    // A slip is a near miss where there is one: one more or one less, not a number copied off the page.
    const places = right.split(".")[1]?.length ?? 0;
    const near =
        kind === "number"
            ? [1, -1, 2, -2, 10, -10].map((k) => (Number(right) + k).toFixed(places))
            : [];
    let slip = near.find((w) => w !== right && match(item, v, w) === null) ?? null;
    for (const wrote of candidates) {
        if (wrote === right) continue;
        const m = match(item, v, wrote);
        if (m === null) {
            slip ??= wrote;
            continue;
        }
        if (seen.has(m)) continue;
        seen.add(m);
        const rule =
            item.feedback[m]?.say
                .map((line) => filled(line, ruleEnv(item, v, wrote), item.roles))
                .join(" ") ?? "";
        if (rule) mistakes.push({ wrote, rule });
    }
    return { ...base, kind, right, mistakes, slip };
}

/** A lesson's numbered questions, as engine/notation/lessons.ts asks them, with practice picked for this draw. */
function draw(lesson: Lesson, d: number): Asked[] {
    const out: Asked[] = [];
    let n = 0;
    for (const s of lesson.sections)
        for (const b of s.blocks) {
            const ref = b.args.item?.k === "ref" ? b.args.item.v : "";
            const item = ws.items.get(ref),
                report = ws.reports.get(ref);
            if (!item || !report) continue;
            if (b.type === "practice") {
                const count = b.props.count?.k === "num" ? b.props.count.v : 1,
                    seed = b.props.seed?.k === "num" ? b.props.seed.v : 1;
                for (const v of pick(report.variants, count, seed + d * 101))
                    out.push(asked(item, v, s.type, ++n));
            } else if (b.type === "show") {
                const fixed: Record<string, string> = {};
                for (const [k, v] of Object.entries(b.open)) {
                    if (v.k !== "expr") continue;
                    try {
                        fixed[k] = showValue(evaluate(v.e, {}));
                    } catch {
                        /* the workspace reports this */
                    }
                }
                const v = ws.variantFor(item, fixed) ?? report.variants[0];
                if (v) out.push(asked(item, v, s.type, ++n));
            }
        }
    return out;
}

/**
 * A child playing one round: mostly the move that gets closer, sometimes a guess, now and then taking
 * one back, with the pauses a child makes. Distances are the prover's.
 */
function play(
    listed: (typeof ACTIVITIES)[number],
    version: number,
    seed: number,
): Played & { from: number | null } {
    const round = listed.round(version);
    const graph = explore(round);
    const rand = seeded(seed);
    const dist = (key: string) => graph.nodes.get(key)?.dist ?? Infinity;
    const skill = 0.55 + rand() * 0.35;
    const moves: Played["moves"] = [];
    const trail: Position[] = [round.start];
    let at = 0;
    let outcome: Played["outcome"] = "out of moves";
    for (let i = 0; i < round.bounds.budget; i++) {
        const here = trail.at(-1);
        if (!here) break;
        if (dist(here.key) === 0) {
            outcome = "won";
            break;
        }
        const worse =
            moves.at(-1) &&
            !moves.at(-1)?.undo &&
            (moves.at(-1)?.dist ?? Infinity) > dist(trail.at(-2)?.key ?? "");
        const gap = Math.round((2 + rand() * 6 + (worse ? 3 : 0)) * 10) / 10;
        at = Math.round((at + gap) * 10) / 10;
        if (worse && trail.length > 1 && rand() < 0.6) {
            trail.pop();
            const back = trail.at(-1);
            if (!back) break;
            moves.push({
                say: "Take that move back",
                key: back.key,
                at,
                gap,
                dist: Number.isFinite(dist(back.key)) ? dist(back.key) : null,
                undo: true,
            });
            continue;
        }
        const options = here.moves;
        if (!options.length) break;
        const best = options.filter((m) => dist(m.next().key) < dist(here.key));
        const chosen =
            best.length && rand() < skill
                ? best[Math.floor(rand() * best.length)]
                : options[Math.floor(rand() * options.length)];
        if (!chosen) break;
        const next = chosen.next();
        trail.push(next);
        moves.push({
            say: chosen.say,
            key: next.key,
            at,
            gap,
            dist: Number.isFinite(dist(next.key)) ? dist(next.key) : null,
            undo: false,
        });
        if (i > 6 && rand() < 0.03) {
            outcome = "gave up";
            break;
        }
    }
    const last = trail.at(-1);
    if (last && dist(last.key) === 0) outcome = "won";
    const from = dist(round.start.key);
    return { moves, outcome, capped: false, from: Number.isFinite(from) ? from : null };
}

const lessons: Record<string, unknown> = {};
for (const id of want.lessons ?? []) {
    const lesson = ws.lessons.get(id);
    if (!lesson) throw new Error(`there is no lesson "${id}"`);
    const file = ws.file("lesson", id);
    lessons[id] = {
        // `hash` is the file's bytes, which the seed's own shallow read of the corpus takes; `levelHash`
        // is what a sitting records (QuestionRef.lessonHash), which is the hash of the level the child
        // was drawn: these draws are medium's, since ws.lessons holds each lesson at medium.
        file: file.path.replace(/^lessons\//, ""),
        hash: sha256(file.src),
        levelHash: sha256(ws.textAt("lesson", id, "medium")),
        title: lesson.title ?? id,
        grade: lesson.grade ?? 1,
        unit: lesson.unit ?? 1,
        subject: lesson.subject ?? "maths",
        format: lesson.format,
        draws: Array.from({ length: want.draws ?? 1 }, (_, d) => draw(lesson, d)),
    };
}
const activities = ACTIVITIES.map((a, i) => ({
    id: a.id,
    title: a.title,
    kind: a.kind,
    skills: a.skills,
    grades: a.grades,
    // Activities are data in school/games/activities.ts until the notation carries them, so a round names
    // its activity by the hash of that declaration; it becomes the content hash when they are notation.
    activityHash: sha256(
        JSON.stringify({
            id: a.id,
            title: a.title,
            kind: a.kind,
            skills: a.skills,
            grades: a.grades,
            paper: a.paper,
            versions: a.versions,
        }),
    ),
    versions: a.versions.map((values, version) => ({
        values,
        plays: Array.from({ length: want.plays ?? 0 }, (_, p) =>
            play(a, version, 1000 * i + 37 * version + p),
        ),
    })),
}));
// A family's own items: how many errors the verifier found, and the item's variants as questions.
const items: Record<string, unknown> = {};
for (const path of Object.keys(want.extra ?? {})) {
    const file = ws.files.get(path);
    const doc = file?.document;
    if (!file || !doc || doc.kind !== "item")
        throw new Error(`${path} is not an item the workspace could read`);
    const report = ws.reports.get(doc.id);
    items[doc.id] = {
        hash: sha256(file.src),
        errors: file.issues.filter((i) => i.level === "error").length,
        draws: Array.from({ length: want.draws ?? 1 }, (_, d) =>
            pick(report?.variants ?? [], 1, 7 + d * 101).map((v) => asked(doc, v, "extra", 0)),
        ),
    };
}
process.stdout.write(JSON.stringify({ lessons, items, activities }));

function filled(text: string, env: Env, roles: Record<string, string>): string {
    try {
        return fill(pieces(text), env, roles);
    } catch {
        return text;
    }
}

function ruleEnv(item: Item, variant: Variant, wrote: string): Env {
    const text = wrote.trim();
    const negative = text.startsWith("-");
    const r = NUMBER.test(text) ? parseDecimal(negative ? text.slice(1) : text) : null;
    const value = r ? num(negative ? -r.n : r.n, r.d) : str(text);
    return { ...variant.env, ...Object.fromEntries(item.answers.map((a) => [a.name, value])) };
}

function matchMistake(item: Item, variant: Variant, wrote: string): number | null {
    const env = ruleEnv(item, variant, wrote);
    for (const [i, rule] of item.feedback.entries()) {
        try {
            const value = evaluate(rule.when, env);
            if (value.k === "bool" && value.v) return i;
        } catch {
            /* A rule may not accept this answer's type. */
        }
    }
    return null;
}
