// Language lessons are written once, as a concept, and filled from one phrasebook per language
// (.docs/notation.md, "Phrasebooks and language variants"). A lesson or item names a phrase by its key,
// `[[food.bread]]`, inside any string; this module reads the phrasebooks and writes each language's
// variant of a lesson and its items, which the workspace then checks and verifies like any lesson.
import { LANGUAGES, type Language } from "../answer";
import type { Doc, Issue, Node, Part, Span, Term } from "./notation";

/** The marks a lenient answer box may leave off, by name, as the combining characters they are. */
export const MARKS = {
    acute: "\u0301",
    grave: "\u0300",
    circumflex: "\u0302",
    diaeresis: "\u0308",
    tilde: "\u0303",
    cedilla: "\u0327",
    macron: "\u0304",
} as const;
export type Mark = keyof typeof MARKS;
const isMark = (s: string): s is Mark => s in MARKS;

export interface Entry {
    key: string;
    /** What the page shows and a typed answer is marked against. */
    text: string;
    /** Other spellings a typed answer may use. */
    also: string[];
    /** How to say it, in the child's own spelling, for the grown-up reading it aloud. */
    say?: string;
    /** m, f or n, for a noun whose gender the lesson turns on. */
    gender?: string;
    /** For Japanese: the phrase in kana, and in romaji. */
    kana?: string;
    romaji?: string;
    note?: string;
    /** The meaning in English, for whoever writes another language's phrasebook. */
    gloss?: string;
}

export interface Phrasebook {
    language: Language;
    name: string;
    variety: string;
    /** The marks an `accents=loose` answer box forgives in this language. */
    lenient: Mark[];
    entries: Map<string, Entry>;
}

/** What a variant's typed answers also take: each phrase's other spellings, and the marks forgiven. */
export interface Accept {
    also: Record<string, string[]>;
    lenient: Mark[];
}

export interface Variant {
    /** The template's path with `#<language>`, so its issues are found beside the template. */
    path: string;
    template: string;
    language: Language;
    src: string;
    kind: "item" | "lesson";
    id: string;
    accept: Accept;
}

/** Why a lesson is not offered in a language: the keys its phrasebook lacks, or a version it lacks. */
export interface Coverage {
    lesson: string;
    language: Language;
    missing: string[];
}

export const KEY = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
/** `[[key]]` or `[[key|field]]`, inside any string of a language template. */
const REF = /\[\[([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:\|([a-z]+))?\]\]/g;
/** What a reference may read from its entry; `cap` is the text with its first letter a capital. */
export const FIELDS = ["text", "cap", "say", "kana", "romaji", "gender", "note"] as const;
/** Characters a phrase may not hold, since it is written into a string that may itself be quoted. */
const UNSAFE = /["\\{}[\]]/;

const isLanguage = (s: string): s is Language => (LANGUAGES as readonly string[]).includes(s);

const problem = (span: Span, message: string): Issue => ({
    level: "error",
    message,
    line: span.line,
    col: span.col,
    length: Math.max(1, span.end - span.col),
});

const firstWord = (n: Node): string | undefined => {
    const p = n.parts[0];
    return p && p.k === "word" ? p.v : undefined;
};
const propOf = (n: Node, key: string): Term | undefined => {
    for (const p of n.parts) if (p.k === "prop" && p.key === key) return p.value;
    return undefined;
};
const textOf = (t: Part | undefined): string | undefined =>
    t && (t.k === "str" || t.k === "block") ? t.v : undefined;

/** A phrasebook file, `phrasebook es v=1 { ... }`, read into its entries, with what is wrong in it. */
export function readPhrasebook(
    doc: Doc,
    path: string,
): { book: Phrasebook | null; issues: Issue[] } {
    const issues: Issue[] = [];
    const root = doc.nodes[0];
    if (!root || root.type !== "phrasebook") return { book: null, issues };
    const code = firstWord(root) ?? "";
    if (!isLanguage(code)) {
        issues.push(problem(root.span, `"${code}" is not one of ${LANGUAGES.join(", ")}`));
        return { book: null, issues };
    }
    if (!path.endsWith(`/${code}.lumi`))
        issues.push(problem(root.span, `the phrasebook for ${code} is the file ${code}.lumi`));
    const lenientTerm = propOf(root, "lenient");
    const lenient: Mark[] = [];
    if (lenientTerm?.k === "list")
        for (const t of lenientTerm.items) {
            if (t.k === "word" && isMark(t.v)) lenient.push(t.v);
            else
                issues.push(
                    problem(t.span, `lenient names marks: ${Object.keys(MARKS).join(", ")}`),
                );
        }
    const kids = root.children ?? [];
    const one = (type: string): string => textOf(kids.find((k) => k.type === type)?.parts[0]) ?? "";
    const book: Phrasebook = {
        language: code,
        name: one("name"),
        variety: one("variety"),
        lenient,
        entries: new Map(),
    };
    for (const k of kids) {
        if (k.type !== "entry") continue;
        const key = firstWord(k) ?? "";
        const text = textOf(k.parts[1]) ?? "";
        if (!KEY.test(key)) {
            issues.push(
                problem(k.span, `"${key}" is not a key: words joined by dots, as food.bread`),
            );
            continue;
        }
        if (book.entries.has(key)) {
            issues.push(problem(k.span, `${key} is already in the phrasebook`));
            continue;
        }
        const also: string[] = [];
        const alsoTerm = propOf(k, "also");
        if (alsoTerm?.k === "list")
            for (const t of alsoTerm.items) if (t.k === "str") also.push(t.v);
        const entry: Entry = { key, text, also };
        for (const f of ["say", "gender", "kana", "romaji", "note", "gloss"] as const) {
            const t = propOf(k, f);
            const v = t?.k === "word" ? t.v : textOf(t);
            if (v !== undefined) entry[f] = v;
        }
        for (const v of [text, ...also, entry.kana ?? "", entry.romaji ?? ""])
            if (UNSAFE.test(v))
                issues.push(problem(k.span, `${key}: a phrase cannot hold " \\ { } [ or ]`));
        if (!text.trim()) issues.push(problem(k.span, `${key} has no text`));
        book.entries.set(key, entry);
    }
    return { book, issues };
}

/** Every string term under a node, including those inside lists, with a way to rewrite it. */
function eachString(n: Node, f: (s: string) => string): void {
    const term = (t: Term): Term => {
        if (t.k === "str" || t.k === "block" || t.k === "expr") return { ...t, v: f(t.v) };
        if (t.k === "list") return { ...t, items: t.items.map(term) };
        return t;
    };
    n.parts = n.parts.map((p: Part): Part =>
        p.k === "prop" ? { ...p, value: term(p.value) } : term(p),
    );
    for (const c of n.children ?? []) eachString(c, f);
}

const clone = (n: Node): Node => ({
    ...n,
    parts: n.parts.map((p) => ({ ...p })),
    children: n.children ? n.children.map(clone) : null,
});

/** The references a node and everything under it make, as `key` or `key|field`. */
export function keysIn(n: Node): Set<string> {
    const out = new Set<string>();
    eachString(clone(n), (s) => {
        for (const m of s.matchAll(REF))
            if (m[1]) out.add(m[2] && m[2] !== "text" && m[2] !== "cap" ? `${m[1]}|${m[2]}` : m[1]);
        return s;
    });
    return out;
}

/** The phrasebook's own lines a lesson may name: `[[language.name]]` and `[[language.variety]]`. */
const OWN = { "language.name": "name", "language.variety": "variety" } as const;
const isOwn = (key: string): key is keyof typeof OWN => key in OWN;

/** Whether a phrasebook can fill a reference: it has the key, and the field when one is named. */
function fills(book: Phrasebook, ref: string): boolean {
    const [key = "", field] = ref.split("|");
    if (isOwn(key)) return !!book[OWN[key]];
    const e = book.entries.get(key);
    return !!e && (field === undefined || fieldOf(e, field) !== "");
}

/** The languages a node's `language` containers name, anywhere under it. */
function containersIn(n: Node, out = new Set<string>()): Set<string> {
    for (const c of n.children ?? []) {
        if (c.type === "language") for (const p of c.parts) if (p.k === "word") out.add(p.v);
        containersIn(c, out);
    }
    return out;
}

/** A node with its `language` containers resolved: the one for this language opened in place, the rest gone. */
function openContainers(n: Node, language: Language): Node {
    if (!n.children) return n;
    const kids: Node[] = [];
    for (const c of n.children) {
        if (c.type !== "language") {
            kids.push(openContainers(c, language));
            continue;
        }
        if (c.parts.some((p) => p.k === "word" && p.v === language))
            for (const k of c.children ?? []) kids.push(openContainers(k, language));
    }
    return { ...n, children: kids };
}

const capital = (s: string): string => s.replace(/\p{L}/u, (c) => c.toUpperCase());

/** An entry's field as a reference reads it. */
function fieldOf(e: Entry, field: string): string {
    if (field === "cap") return capital(e.text);
    if (
        field === "say" ||
        field === "gender" ||
        field === "kana" ||
        field === "romaji" ||
        field === "note"
    )
        return e[field] ?? "";
    return e.text;
}

/** Whether a template is a language template: it names a phrase, or holds a language container. */
export const isTemplate = (root: Node): boolean =>
    (root.type === "lesson" && textOrWord(propOf(root, "subject")) === "language") ||
    ((root.type === "item" || root.type === "lesson") &&
        (keysIn(root).size > 0 || containersIn(root).size > 0));

function textOrWord(t: Term | undefined): string | undefined {
    return t?.k === "word" ? t.v : textOf(t);
}

/** The item ids a lesson's blocks name. */
function itemsNamed(n: Node, out = new Set<string>()): Set<string> {
    for (const c of n.children ?? []) {
        if (c.type === "practice" || c.type === "show" || c.type === "worked") {
            const id = firstWord(c);
            if (id) out.add(id);
        }
        itemsNamed(c, out);
    }
    return out;
}

/** A word naming an item, as a block writes it, renamed to its variant. */
function renamed(n: Node, names: ReadonlyMap<string, string>): void {
    for (const c of n.children ?? []) {
        if (c.type === "practice" || c.type === "show" || c.type === "worked") {
            const p = c.parts[0];
            if (p && p.k === "word") {
                const to = names.get(p.v);
                if (to) c.parts[0] = { ...p, v: to };
            }
        }
        renamed(c, names);
    }
}

/**
 * Each language template written out once per language whose phrasebook has every phrase it names,
 * and the lessons that are not offered in a language with what they lack. An item is written out
 * for a language when a lesson written out for it names the item.
 */
export function expandLanguages(
    templates: ReadonlyMap<string, Doc>,
    books: readonly Phrasebook[],
    format: (d: Doc) => string,
): { variants: Variant[]; coverage: Coverage[]; issues: Map<string, Issue[]> } {
    const variants: Variant[] = [];
    const coverage: Coverage[] = [];
    const issues = new Map<string, Issue[]>();
    const items = new Map<string, { path: string; root: Node; doc: Doc }>();
    const lessons: { path: string; root: Node; doc: Doc }[] = [];
    for (const [path, doc] of templates) {
        const root = doc.nodes[0];
        if (!root) continue;
        const id = firstWord(root) ?? "";
        if (root.type === "item") items.set(id, { path, root, doc });
        else if (root.type === "lesson") {
            lessons.push({ path, root, doc });
            if (propOf(root, "language"))
                issues.set(path, [
                    problem(
                        root.span,
                        "language= is set by the compiler on each language's variant; a language lesson is written once, with phrasebook keys",
                    ),
                ]);
        }
    }
    const written = new Set<string>();
    const fill = (root: Node, book: Phrasebook, accept: Accept): Node => {
        const out = openContainers(clone(root), book.language);
        eachString(out, (s) =>
            s.replace(REF, (_, key: string, field?: string) => {
                if (isOwn(key)) return book[OWN[key]];
                const e = book.entries.get(key);
                if (!e) return `[[${key}]]`;
                const text = fieldOf(e, field ?? "text");
                if (e.also.length && (field === undefined || field === "text" || field === "cap"))
                    accept.also[text] = field === "cap" ? e.also.map(capital) : e.also;
                return text;
            }),
        );
        return out;
    };
    const withId = (root: Node, id: string): void => {
        const p = root.parts[0];
        if (p && p.k === "word") root.parts[0] = { ...p, v: id };
    };
    for (const { path, root } of lessons) {
        const id = firstWord(root) ?? "";
        const used = [...itemsNamed(root)].flatMap((i) => {
            const t = items.get(i);
            return t ? [{ id: i, ...t }] : [];
        });
        const keys = new Set([...keysIn(root), ...used.flatMap((u) => [...keysIn(u.root)])]);
        const versions = new Set([
            ...containersIn(root),
            ...used.flatMap((u) => [...containersIn(u.root)]),
        ]);
        for (const book of books) {
            const missing = [...keys].filter((k) => !fills(book, k)).sort();
            if (versions.size && !versions.has(book.language))
                missing.push(`its ${book.language} version of the parts written per language`);
            if (missing.length) {
                coverage.push({ lesson: id, language: book.language, missing });
                continue;
            }
            coverage.push({ lesson: id, language: book.language, missing: [] });
            const names = new Map(used.map((u) => [u.id, `${u.id}.${book.language}`]));
            for (const u of used) {
                const vid = `${u.id}.${book.language}`;
                if (written.has(vid)) continue;
                written.add(vid);
                const accept: Accept = { also: {}, lenient: book.lenient };
                const out = fill(u.root, book, accept);
                withId(out, vid);
                variants.push({
                    path: `${u.path}#${book.language}`,
                    template: u.path,
                    language: book.language,
                    src: format({ nodes: [out], tail: [] }),
                    kind: "item",
                    id: vid,
                    accept,
                });
            }
            const accept: Accept = { also: {}, lenient: book.lenient };
            const out = fill(root, book, accept);
            renamed(out, names);
            withId(out, `${id}.${book.language}`);
            out.parts = [
                ...out.parts.filter((p) => !(p.k === "prop" && p.key === "language")),
                {
                    k: "prop",
                    key: "language",
                    value: { k: "word", v: book.language, span: root.span },
                    span: root.span,
                },
            ];
            variants.push({
                path: `${path}#${book.language}`,
                template: path,
                language: book.language,
                src: format({ nodes: [out], tail: [] }),
                kind: "lesson",
                id: `${id}.${book.language}`,
                accept,
            });
        }
    }
    return { variants, coverage, issues };
}

/** A word with the marks this language forgives taken off, for an answer box written accents=loose. */
export function forgiven(text: string, marks: readonly Mark[]): string {
    if (!marks.length) return text;
    const strip = new RegExp(`[${marks.map((m) => MARKS[m]).join("")}]`, "gu");
    return text.normalize("NFD").replace(strip, "").normalize("NFC");
}

/**
 * What else a typed answer may be: the phrase's other spellings, and with `loose`, each of those and
 * the answer itself with the forgiven marks left off. Never the answer itself.
 */
export function alsoFor(answer: string, accept: Accept | undefined, loose: boolean): string[] {
    const also = accept?.also[answer] ?? [];
    const all = loose
        ? [...also, ...[answer, ...also].map((s) => forgiven(s, accept?.lenient ?? []))]
        : also;
    return [...new Set(all)].filter((s) => s !== answer);
}
