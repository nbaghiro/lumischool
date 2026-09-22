// The real half of the seed, read from content/curriculum/ as text rather than through the notation
// parser, so the store never reaches into the authoring half of the tree. A shallow read cannot
// evaluate an expression or prove a variant, so the seed uses only the items it reads exactly
// (`simple`). The hash is sha256 of the file's bytes, which matches the compiler's only while the
// corpus is held in canonical form.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

export interface Param {
    name: string;
    lo: number;
    hi: number;
}

export interface ItemFacts {
    id: string;
    version: number;
    /** sha256 of the canonical notation text. */
    hash: string;
    skills: string[];
    /** The declared parameters, in declaration order, which is the order the variant key uses. */
    params: Param[];
    /**
     * The item's `where` constraints, as written. `chooseVariant` honours the ones that are a single
     * comparison of two arithmetic sides and ignores the rest (`and`, `or` and string comparisons
     * appear in the corpus and need the real expression language), which is one of the reasons a
     * chosen variant is legal rather than proved.
     */
    wheres: string[];
    /** The question template, with `{name}` placeholders. */
    ask: string | null;
    /**
     * The first sentence the item's own feedback block says, which is the named mistake an attempt
     * records when a rule matched. .docs/parents.md calls this the most valuable field in the row,
     * so the seed uses the real sentence rather than inventing one.
     */
    mistake: string | null;
    /**
     * The item's answer, when it declares one unnamed value: `answer n` or `answer (10 - n)`. An
     * item with named answer keys (`answer col=(1 + a) row=(1 + b)`) or a conditional is left null,
     * because working those out is the expression language's job and not a fixture's.
     */
    answerExpr: string | null;
    /** True when every placeholder in `ask` is a plain declared parameter, so filling it is exact. */
    simple: boolean;
    /** The file's text, which is what a content revision stores and what the hash is over. */
    body: string;
}

/**
 * Integers, parameters, the four operators and brackets, and null for anything else, which the seed
 * records as an unmarked answer. It is a fixture helper, not a second expression language.
 */
export function evalArithmetic(expr: string, values: Record<string, number>): number | null {
    const tokens = expr.match(/\d+|[a-z][a-z0-9]*|[-+*/()]/g);
    if (!tokens || tokens.join("") !== expr.replace(/\s+/g, "")) return null;

    let at = 0;
    const peek = (): string | undefined => tokens[at];

    const primary = (): number | null => {
        const t = tokens[at++];
        if (t === undefined) return null;
        if (t === "(") {
            const v = sum();
            if (tokens[at++] !== ")") return null;
            return v;
        }
        if (t === "-") {
            const v = primary();
            return v === null ? null : -v;
        }
        if (/^\d+$/.test(t)) return Number(t);
        return Object.hasOwn(values, t) ? (values[t] ?? null) : null;
    };

    const product = (): number | null => {
        let left = primary();
        while (left !== null && (peek() === "*" || peek() === "/")) {
            const op = tokens[at++];
            const right = primary();
            if (right === null) return null;
            if (op === "/" && right === 0) return null;
            left = op === "*" ? left * right : left / right;
        }
        return left;
    };

    const sum = (): number | null => {
        let left = product();
        while (left !== null && (peek() === "+" || peek() === "-")) {
            const op = tokens[at++];
            const right = product();
            if (right === null) return null;
            left = op === "+" ? left + right : left - right;
        }
        return left;
    };

    const value = sum();
    if (at !== tokens.length || value === null || !Number.isInteger(value)) return null;
    return value;
}

export interface Question {
    section: string;
    item: string;
    /** Its number on the page, 1-based across the whole lesson. */
    n: number;
}

export interface LessonFacts {
    /** The file text, which the hash is over. */
    body: string;
    id: string;
    version: number;
    hash: string;
    /** The file name, which is what carries the order a child meets them. The id does not. */
    file: string;
    title: string;
    grade: number;
    unit: number;
    subject: string;
    questions: Question[];
}

export interface Corpus {
    items: Map<string, ItemFacts>;
    /** In file-name order, which is the order a child meets them. */
    lessons: LessonFacts[];
}

const sha256 = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

const HEADER = /^(item|lesson)\s+(\S+)\s+v=(\d+)(.*)$/;
const FIELD = (name: string) => new RegExp(`\\b${name}=([^\\s{]+)`);
// A let line may declare several parameters: `let t=3..9 b=1..8`. 105 of the corpus's do.
const LET = /^\s+let\s+(.+)$/;
const RANGE = /([a-z][a-z0-9]*)\s*=\s*(-?\d+)\.\.(-?\d+)/g;
const WHERE = /^\s+where\s+\((.*)\)\s*$/;
/** One comparison of two arithmetic sides, which is the only constraint shape read here. */
const COMPARE = /^([^<>=!]+?)\s*(<=|>=|==|!=|<|>)\s*([^<>=!]+?)$/;
const SKILLS = /skills=\[([^\]]*)\]/;
const ASK = /text\s+ask\s+"([^"]*)"/;
const TITLE = /^\s+title\s+"([^"]*)"\s*$/;
const SECTION = /^ {2}([a-z][a-z-]*)\s*\{\s*$/;
const PRACTICE = /^\s+practice\s+(\S+)(.*)$/;
const SHOW = /^\s+show\s+(\S+)/;
const PLACEHOLDER = /\{([^}]*)\}/g;

interface Header {
    kind: string;
    id: string;
    version: number;
    rest: string;
}

/** The declaration line. A file may open with comment lines explaining the question. */
function header(lines: string[]): Header | null {
    for (const line of lines) {
        const [, kind, id, version, rest] = line.match(HEADER) ?? [];
        if (kind !== undefined && id !== undefined && version !== undefined) {
            return { kind, id, version: Number(version), rest: rest ?? "" };
        }
        if (line.trim() !== "" && !line.trimStart().startsWith("#")) return null;
    }
    return null;
}

function readItem(text: string): ItemFacts | null {
    const lines = text.split("\n");
    const head = header(lines);
    if (!head || head.kind !== "item") return null;

    const params: Param[] = [];
    const wheres: string[] = [];
    for (const line of lines) {
        const bindings = line.match(LET)?.[1];
        if (bindings !== undefined) {
            for (const [, name, lo, hi] of bindings.matchAll(RANGE)) {
                if (name !== undefined) params.push({ name, lo: Number(lo), hi: Number(hi) });
            }
            continue;
        }
        const where = line.match(WHERE)?.[1];
        if (where !== undefined) wheres.push(where);
    }

    const skills = (text.match(SKILLS)?.[1] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const ask = text.match(ASK)?.[1] ?? null;

    // The first `say` inside the feedback block, if there is one. 93 of the 239 items declare a hint
    // and 24 recognise no mistake at all, so a null here is ordinary rather than a read failure.
    const feedbackAt = text.indexOf("feedback {");
    const mistake =
        feedbackAt === -1 ? null : (text.slice(feedbackAt).match(/say\s+"([^"]*)"/)?.[1] ?? null);

    // One unnamed answer value only. A line with `key=` anywhere in it names its answers instead.
    const answerLine = text.match(/^\s+answer\s+(.+?)\s*$/m)?.[1] ?? null;
    const answerExpr = answerLine !== null && !answerLine.includes("=") ? answerLine : null;

    const names = new Set(params.map((p) => p.name));
    const holes = [...(ask ?? "").matchAll(PLACEHOLDER)].map((m) => m[1] ?? "");
    // An item with no placeholders at all is exactly fillable too: there is nothing to fill.
    const simple = ask !== null && holes.every((h) => names.has(h));

    return {
        id: head.id,
        version: head.version,
        hash: sha256(text),
        skills,
        params,
        wheres,
        ask,
        mistake,
        answerExpr,
        simple,
        body: text,
    };
}

function readLesson(text: string, file: string): LessonFacts | null {
    const lines = text.split("\n");
    const head = header(lines);
    if (!head || head.kind !== "lesson") return null;

    const rest = head.rest;
    const field = (name: string, fallback: string): string =>
        rest.match(FIELD(name))?.[1] ?? fallback;

    let section = "";
    let n = 0;
    const questions: Question[] = [];
    for (const line of lines) {
        const opened = line.match(SECTION)?.[1];
        if (opened !== undefined) {
            section = opened;
            continue;
        }
        const [, practised, options] = line.match(PRACTICE) ?? [];
        if (practised !== undefined) {
            const count = Number(options?.match(/\bcount=(\d+)/)?.[1] ?? 1);
            for (let i = 0; i < count; i++) questions.push({ section, item: practised, n: ++n });
            continue;
        }
        const shown = line.match(SHOW)?.[1];
        if (shown !== undefined) questions.push({ section, item: shown, n: ++n });
    }

    return {
        id: head.id,
        version: head.version,
        hash: sha256(text),
        file,
        title: lines.find((l) => TITLE.test(l))?.match(TITLE)?.[1] ?? head.id,
        grade: Number(field("grade", "1")),
        unit: Number(field("unit", "1")),
        subject: field("subject", "maths"),
        body: text,
        questions,
    };
}

/** Reads the whole corpus from a curriculum directory holding `items/` and `lessons/`. */
export function readCorpus(root: string): Corpus {
    const items = new Map<string, ItemFacts>();
    for (const file of readdirSync(`${root}/items`).sort()) {
        if (!file.endsWith(".lumi")) continue;
        const facts = readItem(readFileSync(`${root}/items/${file}`, "utf8"));
        if (facts) items.set(facts.id, facts);
    }

    const lessons: LessonFacts[] = [];
    for (const file of readdirSync(`${root}/lessons`).sort()) {
        if (!file.endsWith(".lumi")) continue;
        const facts = readLesson(readFileSync(`${root}/lessons/${file}`, "utf8"), file);
        if (facts) lessons.push(facts);
    }

    return { items, lessons };
}

export interface Chosen {
    /** The verifier's own key shape: "a=2,b=3", in declaration order. */
    key: string;
    /** The question as it reads with those values in it. */
    ask: string;
    /** The answer a child who is right would give, when it can be read off the item. */
    values: Record<string, number>;
}

/** Whether a chosen set of values satisfies the constraints this file can read. */
function satisfies(item: ItemFacts, values: Record<string, number>): boolean {
    for (const where of item.wheres) {
        const [, lhs, op, rhs] = where.match(COMPARE) ?? [];
        // Not a shape this file reads, so it is not checked.
        if (lhs === undefined || op === undefined || rhs === undefined) continue;
        const left = evalArithmetic(lhs.trim(), values);
        const right = evalArithmetic(rhs.trim(), values);
        if (left === null || right === null) continue;
        const ok =
            op === "<="
                ? left <= right
                : op === ">="
                  ? left >= right
                  : op === "=="
                    ? left === right
                    : op === "!="
                      ? left !== right
                      : op === "<"
                        ? left < right
                        : left > right;
        if (!ok) return false;
    }
    return true;
}

/**
 * Values inside the declared ranges that pass the readable `where`s, chosen deterministically. The key
 * has the verifier's shape, but the variant is not proved; only the verifier can prove one.
 */
export function chooseVariant(item: ItemFacts, pick: number): Chosen {
    let values: Record<string, number> = {};
    for (let attempt = 0; attempt < 64; attempt++) {
        values = {};
        item.params.forEach((p, i) => {
            const span = Math.max(1, p.hi - p.lo + 1);
            values[p.name] = p.lo + ((pick + attempt * 3 + i * 7) % span);
        });
        if (satisfies(item, values)) break;
    }
    const key = item.params.map((p) => `${p.name}=${values[p.name]}`).join(",");
    const ask = (item.ask ?? "").replace(PLACEHOLDER, (whole, name: string) =>
        name in values ? String(values[name]) : whole,
    );
    return { key, ask, values };
}

/** Lessons every one of whose questions comes from an item the shallow read can fill exactly. */
export function cleanLessons(corpus: Corpus): LessonFacts[] {
    return corpus.lessons.filter(
        (l) =>
            l.questions.length > 0 &&
            l.questions.every((q) => {
                const item = corpus.items.get(q.item);
                return item !== undefined && item.simple && item.skills.length > 0;
            }),
    );
}
