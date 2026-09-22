// The notation, from text to a checked corpus. Every file is a tree of nodes:
//
//     type value* key=value* { children }?      one node per line
//
// The syntax knows nothing about items, scenes or lessons. It reads values into a small set of
// kinds (number, word, text, text block, size, list, expression) and keeps comments, blank-line
// grouping and positions, so formatting is lossless. A file that holds levels is resolved at one of
// them on the syntax tree before anything is checked, so the checker, the verifier and the renderers
// only ever see plain documents. What a node means comes from the vocabulary (vocabulary.ts), which
// is why adding a node type never changes the syntax. The checker builds the typed documents, Item,
// Lesson and Define, collecting problems rather than throwing so one mistake does not hide the next,
// and the workspace holds every file together: parsed, checked, indexed by id and verified, including
// the references between files. See .docs/notation.md.
import {
    LangError,
    evaluate,
    members,
    parseExpr,
    printExpr,
    showValue,
    type Env,
    type Expr,
} from "../expr";
import { LEVELS, type Level } from "../pack";
import { instantiate, layout } from "./instantiate";
import { levelMeasure } from "./lessons";
import { answersFor, meanDifficulty, verifyItem, type ItemReport, type Variant } from "./verify";
import { FORMATS, REGISTRY, ROOTS, type Kind, type NodeSpec } from "./vocabulary";

export interface Span {
    line: number;
    col: number;
    end: number;
}
export type Term =
    | { k: "num"; v: string; span: Span }
    | { k: "word"; v: string; span: Span }
    | { k: "str"; v: string; span: Span }
    | { k: "block"; v: string; span: Span }
    | { k: "size"; w: number; h: number; span: Span }
    | { k: "list"; items: Term[]; span: Span }
    | { k: "expr"; v: string; span: Span };
export interface Prop {
    k: "prop";
    key: string;
    value: Term;
    span: Span;
}
export type Part = Term | Prop;
export interface Node {
    type: string;
    parts: Part[];
    children: Node[] | null;
    /** Full-line comments directly above the node. */
    lead: string[];
    /** A comment at the end of the node's line. */
    trail?: string;
    /** A blank line separates this node from the previous sibling. */
    gap: boolean;
    /** Comments just above the closing brace. */
    closeLead?: string[];
    span: Span;
}
export interface Doc {
    nodes: Node[];
    tail: string[];
}
interface ParseResult {
    doc: Doc;
    errors: LangError[];
}

const TYPE = /^[A-Za-z_][\w-]*$/;
const WORD = /^(?:\?|[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*(?:\((?:[0-9]+|[A-Za-z_]\w*)\))?)*)$/;
const NUM = /^-?[0-9]+(?:\.[0-9]+)?$/;
const SIZE = /^([0-9]+)x([0-9]+)$/;
const PROP = /^([A-Za-z_][\w-]*)=(?!=)/;

// Written decimal places are kept: "1.40" is two places on the page, "1.4" is one.
const normNum = (s: string): string => {
    const neg = s.startsWith("-");
    const body = neg ? s.slice(1) : s;
    const [w, f = ""] = body.split(".");
    const out = `${Number(w)}${f ? `.${f}` : ""}`;
    return neg && out !== "0" ? `-${out}` : out;
};

/** End index of the quoted string starting at s[i] (which is a double quote). */
function skipString(s: string, i: number, line: number): number {
    let j = i + 1;
    while (j < s.length && s[j] !== '"') j += s[j] === "\\" ? 2 : 1;
    if (j >= s.length) throw new LangError("text is missing its closing quote", line, i + 1);
    return j + 1;
}
function unquote(s: string): string {
    return s.slice(1, -1).replace(/\\(["\\])/g, "$1");
}

/** A run of characters up to whitespace at bracket depth 0. */
function scanRun(s: string, i: number, line: number): number {
    const start = i;
    let depth = 0;
    while (i < s.length) {
        const c = s[i];
        if (c === '"') {
            i = skipString(s, i, line);
            continue;
        }
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") {
            depth--;
            if (depth < 0) throw new LangError(`unexpected "${c}"`, line, i + 1);
        } else if ((c === " " || c === "\t") && depth === 0) break;
        i++;
    }
    if (depth > 0) throw new LangError("a bracket is not closed", line, start + 1, i - start);
    return i;
}

function splitTop(s: string): { text: string; at: number }[] {
    const out: { text: string; at: number }[] = [];
    let depth = 0;
    let from = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '"') {
            let j = i + 1;
            while (j < s.length && s[j] !== '"') j += s[j] === "\\" ? 2 : 1;
            i = j;
            continue;
        }
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") depth--;
        else if (c === "," && depth === 0) {
            out.push({ text: s.slice(from, i), at: from });
            from = i + 1;
        }
    }
    out.push({ text: s.slice(from), at: from });
    return out;
}

function exprTerm(e: Expr, span: Span): Term {
    if (e.t === "id") return { k: "word", v: e.name, span };
    if (e.t === "num") return { k: "num", v: normNum(e.v), span };
    if (e.t === "un" && e.op === "-" && e.e.t === "num")
        return { k: "num", v: normNum(`-${e.e.v}`), span };
    return { k: "expr", v: printExpr(e), span };
}

function readExpr(src: string, span: Span): Term {
    try {
        return exprTerm(parseExpr(src), span);
    } catch (e) {
        if (!(e instanceof LangError)) throw e;
        throw new LangError(
            `cannot read "${src.trim()}": ${e.message}`,
            span.line,
            span.col + e.col - 1,
            e.length,
        );
    }
}

/** Classify one value. `inList` allows spaces (list elements are delimited by commas). */
function term(t: string, line: number, col: number, inList = false): Term {
    const raw = inList ? t.trim() : t;
    const lead = inList ? t.length - t.trimStart().length : 0;
    const span: Span = { line, col: col + lead, end: col + lead + raw.length };
    if (!raw) throw new LangError("a value is missing", line, col);
    if (raw.startsWith('"""'))
        throw new LangError(
            'a text block ("""...""") goes last on its own node line',
            line,
            span.col,
            3,
        );
    if (raw.startsWith('"')) {
        const end = skipString(raw, 0, line);
        if (end !== raw.length)
            throw new LangError("unexpected text after the closing quote", line, span.col + end);
        return { k: "str", v: unquote(raw), span };
    }
    if (raw.startsWith("[")) {
        if (!raw.endsWith("]"))
            throw new LangError('a list is missing its closing "]"', line, span.col, raw.length);
        const inner = raw.slice(1, -1);
        const items = inner.trim()
            ? splitTop(inner).map((p) => term(p.text, line, span.col + 1 + p.at, true))
            : [];
        return { k: "list", items, span };
    }
    const sz = SIZE.exec(raw);
    if (sz) {
        const [, w, h] = sz;
        return { k: "size", w: Number(w), h: Number(h), span };
    }
    if (NUM.test(raw)) return { k: "num", v: normNum(raw), span };
    if (WORD.test(raw)) return { k: "word", v: raw, span };
    return readExpr(raw, span);
}

function part(run: string, line: number, col: number): Part {
    const m = PROP.exec(run);
    const key = m?.[1];
    if (!m || key === undefined) return term(run, line, col);
    const value = term(run.slice(m[0].length), line, col + m[0].length);
    return { k: "prop", key, value, span: { line, col, end: col + run.length } };
}

interface Header {
    type: string;
    parts: Part[];
    opens: boolean;
    /** The text block the line opens, whose body is the lines that follow. */
    block: Extract<Term, { k: "block" }> | null;
    trail?: string;
    span: Span;
}

function header(s: string, line: number, at: number): Header {
    const tm = /^[^\s#{]+/.exec(s.slice(at));
    const type = tm?.[0] ?? "";
    if (!TYPE.test(type))
        throw new LangError(
            type ? `"${type}" is not a node type name` : "expected a node type",
            line,
            at + 1,
            Math.max(1, type.length),
        );
    const h: Header = {
        type,
        parts: [],
        opens: false,
        block: null,
        span: { line, col: at + 1, end: at + 1 + type.length },
    };
    let i = at + type.length;
    while (i < s.length) {
        while (s[i] === " " || s[i] === "\t") i++;
        if (i >= s.length) break;
        const rest = s.slice(i);
        if (rest.startsWith("#")) {
            h.trail = rest.slice(1).trim();
            break;
        }
        if (rest.startsWith("{")) {
            const after = rest.slice(1).trim();
            if (after && !after.startsWith("#"))
                throw new LangError("children start on the next line", line, i + 2);
            h.opens = true;
            if (after) h.trail = after.slice(1).trim();
            break;
        }
        if (rest.startsWith('"""')) {
            const after = rest.slice(3).trim();
            if (after && !after.startsWith("#"))
                throw new LangError('text after """ goes on the next lines', line, i + 4);
            h.block = { k: "block", v: "", span: { line, col: i + 1, end: i + 4 } };
            h.parts.push(h.block);
            if (after) h.trail = after.slice(1).trim();
            break;
        }
        const j = scanRun(s, i, line);
        h.parts.push(part(s.slice(i, j), line, i + 1));
        i = j;
    }
    return h;
}

interface Frame {
    node: Node | null;
    list: Node[];
}

export function parse(src: string): ParseResult {
    const lines = src.replace(/\r\n?/g, "\n").split("\n");
    const doc: Doc = { nodes: [], tail: [] };
    const errors: LangError[] = [];
    const bottom: Frame = { node: null, list: doc.nodes };
    const stack: Frame[] = [bottom];
    const top = (): Frame => stack.at(-1) ?? bottom;
    let lead: string[] = [];
    let gap = false;

    for (let i = 0; i < lines.length; i++) {
        const raw = (lines[i] ?? "").replace(/\s+$/, "");
        const t = raw.trim();
        const no = i + 1;
        const frame = top();
        if (!t) {
            if (frame.list.length) gap = true;
            continue;
        }
        if (t.startsWith("#")) {
            lead.push(t.replace(/^#\s?/, ""));
            continue;
        }
        if (t.startsWith("}")) {
            const rest = t.slice(1).trim();
            if (stack.length === 1) {
                errors.push(new LangError('unexpected "}"', no, raw.indexOf("}") + 1));
                continue;
            }
            const closed = stack.pop();
            if (closed?.node && lead.length) closed.node.closeLead = lead;
            if (rest && !rest.startsWith("#"))
                errors.push(
                    new LangError(`unexpected "${rest}" after "}"`, no, raw.indexOf("}") + 2),
                );
            lead = [];
            gap = false;
            continue;
        }
        const at = raw.length - raw.trimStart().length;
        try {
            const h = header(raw, no, at);
            const children = h.opens ? [] : null;
            const node: Node = {
                type: h.type,
                parts: h.parts,
                children,
                lead,
                gap: gap && frame.list.length > 0,
                span: h.span,
            };
            if (h.trail !== undefined) node.trail = h.trail;
            lead = [];
            gap = false;
            if (h.block) {
                const body: string[] = [];
                let j = i + 1;
                let closing = lines[j];
                while (closing !== undefined && closing.trim() !== '"""') {
                    body.push(closing.replace(/\s+$/, ""));
                    j++;
                    closing = lines[j];
                }
                if (closing === undefined)
                    throw new LangError(
                        'text block is missing its closing """',
                        no,
                        h.block.span.col,
                        3,
                    );
                const indent = closing.length - closing.trimStart().length;
                body.forEach((l, k) => {
                    if (l.trim() && l.length - l.trimStart().length < indent)
                        throw new LangError(
                            'this line is indented less than the closing """',
                            i + 2 + k,
                            1,
                        );
                });
                h.block.v = body.map((l) => l.slice(indent)).join("\n");
                i = j;
            }
            frame.list.push(node);
            if (children) stack.push({ node, list: children });
        } catch (e) {
            if (!(e instanceof LangError)) throw e;
            errors.push(e);
            lead = [];
            gap = false;
            // keep braces balanced so one bad line does not cascade
            if (/\{\s*(#.*)?$/.test(t)) stack.push({ node: null, list: [] });
        }
    }
    if (lead.length) {
        const frame = top();
        if (frame.node) frame.node.closeLead = lead;
        else doc.tail = lead;
    }
    while (stack.length > 1) {
        const open = stack.pop();
        if (open?.node)
            errors.push(
                new LangError(
                    `"${open.node.type}" is missing its closing "}"`,
                    open.node.span.line,
                    open.node.span.col,
                    open.node.type.length,
                ),
            );
    }
    return { doc, errors };
}

const quote = (s: string): string => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** True when the text has whitespace outside brackets and quotes, so it needs parentheses. */
function spaced(s: string): boolean {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '"') {
            let j = i + 1;
            while (j < s.length && s[j] !== '"') j += s[j] === "\\" ? 2 : 1;
            i = j;
            continue;
        }
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") depth--;
        else if (c === " " && depth === 0) return true;
    }
    return false;
}

export function printTerm(t: Term, inList = false): string {
    switch (t.k) {
        case "num":
        case "word":
            return t.v;
        case "str":
            return quote(t.v);
        case "block":
            return '"""';
        case "size":
            return `${t.w}x${t.h}`;
        case "list":
            return `[${t.items.map((x) => printTerm(x, true)).join(", ")}]`;
        case "expr":
            return !inList && spaced(t.v) ? `(${t.v})` : t.v;
    }
}
const printPart = (p: Part): string =>
    p.k === "prop" ? `${p.key}=${printTerm(p.value)}` : printTerm(p);

/** Canonical text: two-space indents, single spaces, canonical values, comments and grouping kept. */
export function format(doc: Doc): string {
    const out: string[] = [];
    const emit = (nodes: Node[], depth: number): void => {
        const ind = "  ".repeat(depth);
        nodes.forEach((n, idx) => {
            if (n.gap && idx > 0) out.push("");
            for (const c of n.lead) out.push(c ? `${ind}# ${c}` : `${ind}#`);
            const last = n.parts.at(-1);
            const block = last?.k === "block" ? last : null;
            let line = [n.type, ...n.parts.map(printPart)].join(" ");
            if (n.children && !block) line += " {";
            if (n.trail !== undefined) line += n.trail ? `  # ${n.trail}` : "  #";
            out.push(ind + line);
            if (block) {
                for (const l of block.v.split("\n")) out.push(l ? `${ind}  ${l}` : "");
                out.push(`${ind}  """`);
            }
            if (n.children) {
                emit(n.children, depth + 1);
                for (const c of n.closeLead ?? []) out.push(c ? `${ind}  # ${c}` : `${ind}  #`);
                out.push(`${ind}}`);
            }
        });
    };
    emit(doc.nodes, 0);
    for (const c of doc.tail) out.push(c ? `# ${c}` : "#");
    return `${out.join("\n")}\n`;
}

/** The tree without positions, for comparing two parses. */
export function shape(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(shape);
    if (v && typeof v === "object") {
        const o: Record<string, unknown> = {};
        for (const [k, x] of Object.entries(v)) if (k !== "span") o[k] = shape(x);
        return o;
    }
    return v;
}

export const isLevel = (s: string): s is Level => (LEVELS as readonly string[]).includes(s);
/** The levels a list names, in the order easy, medium, hard, always with medium. */
export const levelsIn = (names: readonly string[]): Level[] =>
    LEVELS.filter((l) => l === "medium" || names.includes(l));

interface LevelProblem {
    message: string;
    line: number;
    col: number;
    length: number;
}
export interface Resolved {
    doc: Doc;
    /** A lesson's declared levels, or the levels an item has content for; always holds medium. */
    levels: Level[];
    problems: LevelProblem[];
}

/** `easy-count=2` replaces `count` at easy only. A parameter name has no hyphen, so this is never a pin. */
const PREFIXED = /^(easy|medium|hard)-([A-Za-z_]\w*)$/;
const ITEM_CHANGES = ["set", "let", "where", "hint", "scene"];
const NAMES_AN_ITEM = ["practice", "show", "worked"];

const problem = (s: { span: Span }, message: string): LevelProblem => ({
    message,
    line: s.span.line,
    col: s.span.col,
    length: Math.max(1, s.span.end - s.span.col),
});
const wordsOf = (n: Node): string[] => n.parts.flatMap((p) => (p.k === "word" ? [p.v] : []));
const propOf = (n: Node, key: string): Prop | undefined =>
    n.parts.find((p): p is Prop => p.k === "prop" && p.key === key);
const clone = (n: Node): Node => structuredClone(n);
const order = (ls: Iterable<Level>): Level[] => {
    const s = new Set(ls);
    return LEVELS.filter((l) => s.has(l));
};

function mentionsLevels(nodes: Node[]): boolean {
    return nodes.some(
        (n) =>
            n.type === "level" ||
            n.type === "difficulty" ||
            n.parts.some((p) => p.k === "prop" && (p.key === "levels" || PREFIXED.test(p.key))) ||
            (n.children ? mentionsLevels(n.children) : false),
    );
}

/** The levels a container names, with a problem for a word that is not one. */
function named(c: Node, problems: LevelProblem[]): Level[] {
    const ws = wordsOf(c);
    if (!ws.length)
        problems.push(problem(c, "a level names at least one of easy, medium and hard"));
    for (const w of ws)
        if (!isLevel(w))
            problems.push(
                problem(c, `"${w}" is not a level; the levels are easy, medium and hard`),
            );
    if (!c.children) problems.push(problem(c, "a level holds its content between braces"));
    for (const k of c.children ?? [])
        if (k.type === "level") problems.push(problem(k, "a level cannot hold another level"));
    return order(ws.filter(isLevel));
}

/** One document at one level. A file that says nothing about levels comes back as it is. */
export function resolve(doc: Doc, level: Level): Resolved {
    const root = doc.nodes[0];
    if (!root || !mentionsLevels([root])) return { doc, levels: ["medium"], problems: [] };
    const r =
        root.type === "item"
            ? item(root, level)
            : root.type === "lesson"
              ? lesson(root, level)
              : null;
    if (!r) return { doc, levels: ["medium"], problems: [] };
    return {
        doc: { nodes: [r.root, ...doc.nodes.slice(1)], tail: doc.tail },
        levels: r.levels,
        problems: r.problems,
    };
}

/** The canonical text of one level, which is what a level's hash is taken over. */
export const levelText = (doc: Doc, level: Level): string => format(resolve(doc, level).doc);

function item(root: Node, level: Level): { root: Node; levels: Level[]; problems: LevelProblem[] } {
    const problems: LevelProblem[] = [];
    const has = new Set<Level>(["medium"]);
    const shared: Node[] = [];
    const mine: Node[] = [];
    for (const c of root.children ?? []) {
        if (c.type !== "level") {
            shared.push(clone(c));
            continue;
        }
        const ls = named(c, problems);
        ls.forEach((l) => has.add(l));
        for (const k of c.children ?? [])
            if (k.type !== "level" && !ITEM_CHANGES.includes(k.type))
                problems.push(
                    problem(
                        k,
                        `"${k.type}" cannot change by level; a level in an item holds ${ITEM_CHANGES.join(", ")}`,
                    ),
                );
        if (ls.includes(level)) mine.push(c);
    }
    const out = shared;
    for (const c of mine)
        for (const k of c.children ?? []) {
            if (k.type === "let" || k.type === "set") {
                const what = k.type === "let" ? "parameter" : "value with set";
                for (const p of k.parts) {
                    if (p.k !== "prop") {
                        problems.push(
                            problem(
                                p,
                                `a level's ${k.type} names each ${what} it changes, as in ${k.type} s=6..9`,
                            ),
                        );
                        continue;
                    }
                    const decl = out
                        .filter((n) => n.type === k.type)
                        .map((n) => propOf(n, p.key))
                        .find((x): x is Prop => x !== undefined);
                    if (!decl) {
                        problems.push(
                            problem(
                                p,
                                `the item declares no ${what} "${p.key}" for a level to change; a level may only change what the item already has, so medium's versions keep their names`,
                            ),
                        );
                        continue;
                    }
                    decl.value = structuredClone(p.value);
                }
            } else if (k.type === "where") {
                const types = out.map((n) => n.type);
                const after = Math.max(types.lastIndexOf("where"), types.lastIndexOf("let"));
                out.splice(after + 1, 0, clone(k));
            } else if (k.type === "hint") {
                const after = out.map((n) => n.type).lastIndexOf("hint");
                out.splice(after >= 0 ? after + 1 : out.length, 0, clone(k));
            } else if (k.type === "scene") {
                const at = out.findIndex((n) => n.type === "scene");
                if (at < 0)
                    problems.push(
                        problem(k, "the item has no scene of its own for a level to replace"),
                    );
                else out[at] = clone(k);
            }
        }
    return {
        root: { ...clone({ ...root, children: [] }), children: out },
        levels: order(has),
        problems,
    };
}

function lesson(
    root: Node,
    level: Level,
): { root: Node; levels: Level[]; problems: LevelProblem[] } {
    const problems: LevelProblem[] = [];
    const lv = propOf(root, "levels");
    let declared: Level[] = ["medium"];
    if (lv) {
        const terms: Term[] = lv.value.k === "list" ? lv.value.items : [lv.value];
        for (const t of terms)
            if (!(t.k === "word" && isLevel(t.v)))
                problems.push(problem(t, "levels= lists some of easy, medium and hard"));
        declared = order(terms.flatMap((t) => (t.k === "word" && isLevel(t.v) ? [t.v] : [])));
        if (!declared.includes("medium"))
            problems.push(problem(lv, "every lesson has medium, which is the lesson as written"));
        declared = order([...declared, "medium"]);
    }
    const undeclared = (ls: Level[], at: { span: Span }): void => {
        for (const l of ls)
            if (!declared.includes(l))
                problems.push(problem(at, `the lesson does not declare ${l} in levels=`));
    };

    const block = (b: Node): Node[] => {
        if (b.type === "level") {
            const ls = named(b, problems);
            undeclared(ls, b);
            return ls.includes(level)
                ? (b.children ?? []).flatMap((k) => (k.type === "level" ? [] : block(k)))
                : [];
        }
        const n = clone(b);
        if (!NAMES_AN_ITEM.includes(n.type)) return [n];
        for (const p of n.parts) {
            if (p.k !== "prop") continue;
            const m = PREFIXED.exec(p.key);
            if (!m) continue;
            const [, l, key] = m;
            if (l === undefined || key === undefined || !isLevel(l)) continue;
            undeclared([l], p);
            if (l !== level) continue;
            const plain = propOf(n, key);
            if (plain) plain.value = structuredClone(p.value);
            else n.parts.push({ k: "prop", key, value: structuredClone(p.value), span: p.span });
        }
        n.parts = n.parts.filter((p) => !(p.k === "prop" && PREFIXED.test(p.key)));
        const count = propOf(n, "count");
        if (n.type === "practice" && count?.value.k === "num" && Number(count.value.v) === 0)
            return [];
        return [n];
    };

    const out: Node[] = [];
    for (const c of root.children ?? []) {
        if (c.type === "level") {
            const ls = named(c, problems);
            undeclared(ls, c);
            if (!ls.includes(level)) continue;
            for (const k of c.children ?? []) {
                if (k.type === "level") continue;
                out.push(
                    k.children ? { ...clone(k), children: k.children.flatMap(block) } : clone(k),
                );
            }
            continue;
        }
        if (!c.children) {
            out.push(clone(c));
            continue;
        }
        const kids = c.children.flatMap(block);
        // A section whose every block belongs to other levels is not there at this level.
        if (c.children.length && !kids.length) continue;
        out.push({ ...clone({ ...c, children: [] }), children: kids });
    }
    return {
        root: { ...clone({ ...root, children: [] }), children: out },
        levels: declared,
        problems,
    };
}

export interface Issue {
    level: "error" | "warning";
    message: string;
    line: number;
    col: number;
    length: number;
}

export type Val =
    | { k: "expr"; e: Expr }
    | { k: "text"; v: string }
    | { k: "word"; v: string }
    | { k: "ref"; v: string }
    | { k: "num"; v: number }
    | { k: "size"; w: number; h: number }
    | { k: "items"; v: { role: string; times?: Expr }[] }
    | { k: "exprs"; v: (Expr | null)[] }
    | { k: "values"; v: ValueItem[] }
    | { k: "words"; v: string[] }
    | { k: "any"; t: Term };

/** One entry of a "values" list: text, a word (a role or a prop), or an expression. */
export type ValueItem =
    { k: "text"; v: string } | { k: "word"; v: string } | { k: "expr"; e: Expr };

/** A node after checking: its id, named values, flags, settings and children. */
export interface TNode {
    type: string;
    spec: NodeSpec;
    id?: string;
    args: Record<string, Val>;
    flags: string[];
    props: Record<string, Val>;
    open: Record<string, Val>;
    rest: string[];
    children: TNode[];
    src: Node;
}

const SIMPLE = /^[A-Za-z_]\w*$/;

/** The edit distance between two names, for a suggestion. */
function distance(a: string, b: string): number {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++)
            cur.push(
                Math.min(
                    (prev[j] ?? 0) + 1,
                    (cur[j - 1] ?? 0) + 1,
                    (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
                ),
            );
        prev = cur;
    }
    return prev[b.length] ?? 0;
}

export function near(name: string, options: readonly string[]): string {
    const best = options
        .map((o) => [o, distance(name, o)] as const)
        .filter(([, x]) => x <= 2)
        .sort((a, b) => a[1] - b[1])[0];
    return best ? ` (did you mean "${best[0]}"?)` : "";
}

const KIND_NAME: Record<Kind, string> = {
    expr: "an expression",
    text: "text in quotes",
    word: "a word",
    pick: "one of the listed words, or an expression giving one",
    ref: "a name such as s1 or s2.left-pan",
    num: "a number",
    size: "a size such as 32x16",
    items: "a list of roles such as [heavy, mid * a]",
    exprs: "a list of expressions",
    values: 'a list such as ["Yes", 3, apple]',
    words: "a list of words",
    any: "a value",
};

const isTerm = (p: Part): p is Term => p.k !== "prop";

/**
 * A file that holds levels is checked at one of them, medium unless asked, so a reader that knows
 * nothing of levels gets the lesson as written. `levels` says which levels the file has.
 */
export function checkDoc(
    written: Doc,
    o: { level?: Level } = {},
): { roots: TNode[]; issues: Issue[]; levels: Level[] } {
    const resolved = resolve(written, o.level ?? "medium");
    const doc = resolved.doc;
    const issues: Issue[] = resolved.problems.map((p) => ({ level: "error", ...p }));
    const at = (t: { span: Span }, message: string, level: Issue["level"] = "error"): void => {
        issues.push({
            level,
            message,
            line: t.span.line,
            col: t.span.col,
            length: Math.max(1, t.span.end - t.span.col),
        });
    };

    function expr(t: Term, where: string): Expr | null {
        if (t.k === "str") return { t: "str", v: t.v };
        if (t.k === "num")
            return t.v.startsWith("-")
                ? { t: "un", op: "-", e: { t: "num", v: t.v.slice(1) } }
                : { t: "num", v: t.v };
        if (t.k === "word" && SIMPLE.test(t.v)) return { t: "id", name: t.v };
        if (t.k === "word") {
            at(
                t,
                `${where}: "${t.v}" is not an expression${t.v.includes("-") ? `; write a subtraction with spaces inside parentheses, (${t.v.replace(/-/g, " - ")})` : ""}`,
            );
            return null;
        }
        if (t.k === "expr") {
            try {
                return parseExpr(t.v);
            } catch (e) {
                at(t, `${where}: ${e instanceof Error ? e.message : String(e)}`);
                return null;
            }
        }
        at(t, `${where} needs ${KIND_NAME.expr}`);
        return null;
    }

    function val(t: Term, kind: Kind, where: string, values?: readonly string[]): Val | null {
        switch (kind) {
            case "expr": {
                const e = expr(t, where);
                return e ? { k: "expr", e } : null;
            }
            case "text":
                if (t.k === "str" || t.k === "block") return { k: "text", v: t.v };
                break;
            case "word":
                if (t.k === "word") {
                    if (values && !values.includes(t.v)) {
                        at(
                            t,
                            `${where}: "${t.v}" is not one of ${values.join(", ")}${near(t.v, values)}`,
                        );
                        return null;
                    }
                    return { k: "word", v: t.v };
                }
                break;
            // Like "word", but a parameter may choose it: anything that is not one of the listed words
            // is read as an expression, and the verifier checks its value against the list per variant.
            case "pick": {
                if (t.k === "word" && values?.includes(t.v)) return { k: "word", v: t.v };
                const e = expr(t, where);
                return e ? { k: "expr", e } : null;
            }
            case "ref":
                if (t.k === "word" && t.v !== "?") return { k: "ref", v: t.v };
                break;
            case "num":
                if (t.k === "num") return { k: "num", v: Number(t.v) };
                break;
            case "size":
                if (t.k === "size") return { k: "size", w: t.w, h: t.h };
                break;
            case "words":
                if (t.k === "list") {
                    const words = t.items.flatMap((x) => (x.k === "word" ? [x.v] : []));
                    if (words.length === t.items.length) return { k: "words", v: words };
                }
                break;
            case "items":
                if (t.k === "list") {
                    const out: { role: string; times?: Expr }[] = [];
                    for (const x of t.items) {
                        if (x.k === "word" && SIMPLE.test(x.v)) {
                            out.push({ role: x.v });
                            continue;
                        }
                        const e = x.k === "expr" ? parsedOrNull(x.v) : null;
                        if (e && e.t === "bin" && e.op === "*" && e.l.t === "id") {
                            out.push({ role: e.l.name, times: e.r });
                            continue;
                        }
                        at(
                            x,
                            `${where}: each entry is a role, or a role times a count such as mid * a`,
                        );
                    }
                    return { k: "items", v: out };
                }
                break;
            case "exprs":
                if (t.k === "list")
                    return {
                        k: "exprs",
                        v: t.items.map((x) =>
                            x.k === "word" && x.v === "?" ? null : expr(x, where),
                        ),
                    };
                break;
            case "values":
                if (t.k === "list") {
                    const out: ValueItem[] = [];
                    for (const x of t.items) {
                        if (x.k === "str" || x.k === "block") out.push({ k: "text", v: x.v });
                        else if (x.k === "word" && SIMPLE.test(x.v))
                            out.push({ k: "word", v: x.v });
                        else {
                            const e = expr(x, where);
                            if (e) out.push({ k: "expr", e });
                        }
                    }
                    return { k: "values", v: out };
                }
                break;
            case "any":
                return { k: "any", t };
        }
        at(t, `${where} needs ${KIND_NAME[kind]}`);
        return null;
    }

    function node(n: Node, parent: string | null): TNode | null {
        const allowed: readonly string[] = parent ? (REGISTRY[parent]?.children ?? []) : ROOTS;
        const spec = REGISTRY[n.type];
        if (!spec) {
            at(n, `unknown node type "${n.type}"${near(n.type, allowed)}`);
            return null;
        }
        if (!allowed.includes(n.type)) {
            at(
                n,
                parent
                    ? `"${n.type}" cannot go inside "${parent}"; it takes ${allowed.join(", ") || "no children"}`
                    : `a file starts with ${ROOTS.join(", ")}`,
            );
            return null;
        }
        const t: TNode = {
            type: n.type,
            spec,
            args: {},
            flags: [],
            props: {},
            open: {},
            rest: [],
            children: [],
            src: n,
        };
        let values = n.parts.filter(isTerm);
        if (spec.id) {
            const first = values[0];
            if (first?.k === "word" && (spec.id === "dotted" || !first.v.includes("."))) {
                t.id = first.v;
                values = values.slice(1);
            } else if (!spec.idOptional)
                at(
                    first ?? n,
                    `"${n.type}" needs a name first${spec.id === "name" ? " (letters, digits, - and _)" : ""}`,
                );
        }
        const flags = spec.flags;
        if (flags) {
            const isFlag = (v: Term): v is Extract<Term, { k: "word" }> =>
                v.k === "word" && flags.includes(v.v);
            t.flags = values.filter(isFlag).map((v) => v.v);
            values = values.filter((v) => !isFlag(v));
        }
        for (const a of spec.args ?? []) {
            const v = values.shift();
            if (!v) {
                if (!a.optional) at(n, `"${n.type}" needs ${KIND_NAME[a.kind]} (${a.name})`);
                continue;
            }
            const x = val(v, a.kind, `${n.type} ${a.name}`);
            if (x) t.args[a.name] = x;
        }
        if (spec.rest === "words") {
            for (const v of values) {
                if (v.k === "word" && SIMPLE.test(v.v)) t.rest.push(v.v);
                else at(v, `a parameter name is a plain word`);
            }
            values = [];
        }
        for (const v of values)
            at(
                v,
                `"${n.type}" does not take this value${spec.flags ? `; its flags are ${spec.flags.join(", ")}` : ""}`,
            );

        const written = new Set<string>();
        for (const p of n.parts) {
            if (p.k !== "prop") continue;
            written.add(p.key);
            const s = spec.props?.[p.key];
            if (t.props[p.key] || t.open[p.key]) {
                at(p, `"${p.key}" is set twice`);
                continue;
            }
            if (s) {
                const x = val(p.value, s.kind, `${n.type} ${p.key}`, s.values);
                if (x) t.props[p.key] = x;
            } else if (spec.open) {
                const x = val(p.value, spec.open, `${n.type} ${p.key}`);
                if (x) t.open[p.key] = x;
            } else
                at(
                    p,
                    `"${n.type}" has no setting "${p.key}"${near(p.key, Object.keys(spec.props ?? {}))}`,
                );
        }
        for (const [k, s] of Object.entries(spec.props ?? {}))
            if (s.required && !written.has(k)) at(n, `"${n.type}" needs ${k}=`);
        // gap= is how far a part sits from the one it is placed against, so without below=, above=,
        // right-of= or left-of= it means nothing. It used to be silently ignored, which is how nineteen
        // sentence strips wrote gap= for their blank (a setting since renamed) and every one drew the
        // default instead: complete model sentences with a five-square hole in them.
        const g = n.parts.find((p): p is Prop => p.k === "prop" && p.key === "gap");
        if (
            spec.scene &&
            g &&
            !["below", "above", "right-of", "left-of"].some((k) => written.has(k))
        ) {
            at(
                g,
                `gap= only means something beside below=, above=, right-of= or left-of=${spec.props && Object.keys(spec.props).includes("blank") ? "; did you mean blank=?" : ""}`,
            );
        }

        if (n.children) {
            if (!spec.children) at(n, `"${n.type}" takes no children`);
            else
                for (const c of n.children) {
                    const x = node(c, n.type);
                    if (x) t.children.push(x);
                }
        }
        return t;
    }

    const roots = doc.nodes.flatMap((n) => {
        const t = node(n, null);
        return t ? [t] : [];
    });
    const second = doc.nodes[1];
    if (roots.length > 1 && second) at(second, "one file holds one item, lesson or component");
    return { roots, issues, levels: resolved.levels };
}

const parsedOrNull = (src: string): Expr | null => {
    try {
        return parseExpr(src);
    } catch {
        return null;
    }
};

export interface Rule {
    when: Expr;
    point?: string;
    say: string[];
    children: Rule[];
    node: TNode;
}
export interface Item {
    kind: "item";
    id: string;
    version: number;
    title?: string;
    skills: string[];
    stars?: number;
    params: { name: string; domain: Expr }[];
    where: Expr[];
    roles: Record<string, string>;
    scene: { size: [number, number]; nodes: TNode[] } | null;
    answers: { name: string; expr: Expr }[];
    check: { name: string; settings: Record<string, Term> } | null;
    /** The answer in words, for an answer many arrangements satisfy, which a parent marks by. */
    explain?: string;
    feedback: Rule[];
    hints: string[];
    node: TNode;
    /** Grows as a version gets harder; the verifier averages it per level. */
    difficulty?: Expr;
    /** Values every version shares, which a level may change; they are in a version's env and never in its name. */
    constants?: { name: string; expr: Expr }[];
    /** The level this item was resolved at; medium when the file has no levels. */
    level?: Level;
}
export interface Section {
    type: string;
    stars?: number;
    blocks: TNode[];
    node: TNode;
}
export interface Lesson {
    kind: "lesson";
    id: string;
    version: number;
    format: string;
    grade?: number;
    unit?: number;
    subject?: string;
    title?: string;
    goal?: string;
    grownUps: string[];
    sections: Section[];
    node: TNode;
    /** The level this lesson was resolved at, and the levels it declares; medium alone when it declares none. */
    level?: Level;
    levels?: Level[];
}
export interface Define {
    kind: "define";
    id: string;
    params: string[];
    nodes: TNode[];
    node: TNode;
}
export type Document = Item | Lesson | Define;

const text = (t: TNode | undefined): string | undefined =>
    t?.args.text?.k === "text" ? t.args.text.v : undefined;
const texts = (ts: TNode[]): string[] =>
    ts.flatMap((t) => {
        const v = text(t);
        return v === undefined ? [] : [v];
    });
const kids = (t: TNode, type: string): TNode[] => t.children.filter((c) => c.type === type);
/** The names an open node binds to expressions, as `let a=1..3` and `set total=10` do. */
const bound = (nodes: TNode[]): { name: string; expr: Expr }[] =>
    nodes.flatMap((l) =>
        Object.entries(l.open).flatMap(([name, v]) =>
            v.k === "expr" ? [{ name, expr: v.e }] : [],
        ),
    );

function rule(t: TNode): Rule {
    const r: Rule = {
        when: t.args.cond?.k === "expr" ? t.args.cond.e : { t: "bool", v: false },
        say: texts(kids(t, "say")),
        children: kids(t, "when").map(rule),
        node: t,
    };
    if (t.props.point?.k === "ref") r.point = t.props.point.v;
    return r;
}

export function build(t: TNode, level: Level = "medium"): Document | null {
    if (t.type === "item") {
        const scene = kids(t, "scene")[0];
        const answer = kids(t, "answer")[0];
        const check = kids(t, "check")[0];
        const answers: { name: string; expr: Expr }[] = [];
        if (answer?.args.value?.k === "expr")
            answers.push({ name: "answer", expr: answer.args.value.e });
        for (const [k, v] of Object.entries(answer?.open ?? {}))
            if (v.k === "expr") answers.push({ name: k, expr: v.e });
        const difficulty = kids(t, "difficulty")[0]?.args.value;
        return {
            kind: "item",
            id: t.id ?? "",
            version: t.props.v?.k === "num" ? t.props.v.v : 0,
            title: text(kids(t, "title")[0]),
            skills: t.props.skills?.k === "words" ? t.props.skills.v : [],
            stars: t.props.stars?.k === "num" ? t.props.stars.v : undefined,
            params: bound(kids(t, "let")).map(({ name, expr }) => ({ name, domain: expr })),
            where: kids(t, "where").flatMap((w) =>
                w.args.cond?.k === "expr" ? [w.args.cond.e] : [],
            ),
            roles: Object.fromEntries(
                kids(t, "roles").flatMap((r) =>
                    Object.entries(r.open).flatMap(([k, v]) => (v.k === "word" ? [[k, v.v]] : [])),
                ),
            ),
            scene:
                scene?.args.size?.k === "size"
                    ? { size: [scene.args.size.w, scene.args.size.h], nodes: scene.children }
                    : null,
            answers,
            check:
                check?.args.checker?.k === "ref"
                    ? {
                          name: check.args.checker.v,
                          settings: Object.fromEntries(
                              Object.entries(check.open).flatMap(([k, v]) =>
                                  v.k === "any" ? [[k, v.t]] : [],
                              ),
                          ),
                      }
                    : null,
            explain: answer ? text(kids(answer, "say")[0]) : undefined,
            feedback: kids(t, "feedback").flatMap((f) => kids(f, "when").map(rule)),
            hints: texts(kids(t, "hint")),
            node: t,
            constants: bound(kids(t, "set")),
            difficulty: difficulty?.k === "expr" ? difficulty.e : undefined,
            level,
        };
    }
    if (t.type === "lesson") {
        return {
            kind: "lesson",
            id: t.id ?? "",
            version: t.props.v?.k === "num" ? t.props.v.v : 0,
            format: t.props.format?.k === "word" ? t.props.format.v : "teach",
            grade: t.props.grade?.k === "num" ? t.props.grade.v : undefined,
            unit: t.props.unit?.k === "num" ? t.props.unit.v : undefined,
            subject: t.props.subject?.k === "word" ? t.props.subject.v : undefined,
            title: text(kids(t, "title")[0]),
            goal: text(kids(t, "goal")[0]),
            grownUps: texts(kids(t, "grown-ups")),
            sections: t.children
                .filter((c) => !["title", "goal", "grown-ups"].includes(c.type))
                .map((s) => ({
                    type: s.type,
                    stars: s.props.stars?.k === "num" ? s.props.stars.v : undefined,
                    blocks: s.children,
                    node: s,
                })),
            node: t,
            level,
            levels: t.props.levels?.k === "words" ? levelsIn(t.props.levels.v) : ["medium"],
        };
    }
    if (t.type === "define")
        return { kind: "define", id: t.id ?? "", params: t.rest, nodes: t.children, node: t };
    return null;
}

interface FileInfo {
    path: string;
    src: string;
    doc: Doc | null;
    canonical: string | null;
    document: Document | null;
    issues: Issue[];
    /** The levels the file has: a lesson's declared levels, or the levels an item has content for. */
    levels?: Level[];
}

const pos = (t: TNode): Omit<Issue, "level" | "message"> => ({
    line: t.src.span.line,
    col: t.src.span.col,
    length: Math.max(1, t.src.span.end - t.src.span.col),
});
const atLevel = (level: Level, issues: Issue[], known: Issue[]): Issue[] => {
    const seen = new Set(known.map((i) => `${i.line}:${i.message}`));
    return issues
        .filter((i) => !seen.has(`${i.line}:${i.message}`))
        .map((i) => ({ ...i, message: `at ${level}: ${i.message}` }));
};

/**
 * Whether a measure rises from level to level: falling is an error and staying level is a warning,
 * within `flat` of each other.
 */
function rises(
    means: { level: Level; m: number | null }[],
    what: string,
    where: Omit<Issue, "level" | "message">,
    flat: number,
): Issue[] {
    const out: Issue[] = [];
    const known = means.flatMap((x) => (x.m === null ? [] : [{ level: x.level, m: x.m }]));
    const r = (x: number): number => Math.round(x * 100) / 100;
    for (let i = 1; i < known.length; i++) {
        const a = known[i - 1];
        const b = known[i];
        if (!a || !b) continue;
        if (a.m > b.m + flat)
            out.push({
                level: "error",
                message: `${what} falls from ${a.level} (${r(a.m)}) to ${b.level} (${r(b.m)}), so ${b.level} is not harder`,
                ...where,
            });
        else if (b.m - a.m <= flat)
            out.push({
                level: "warning",
                message: `${what} is about the same at ${a.level} (${r(a.m)}) and ${b.level} (${r(b.m)}); make ${b.level} harder or say why not`,
                ...where,
            });
    }
    return out;
}

/** A workspace's reports when it verifies on reading: each item is verified the first time its report is read. */
class ReportsWhenRead extends Map<string, ItemReport> {
    private readonly items: Map<string, Item>;
    private readonly defines: Map<string, Define>;

    constructor(items: Map<string, Item>, defines: Map<string, Define>) {
        super();
        this.items = items;
        this.defines = defines;
    }

    override get(id: string): ItemReport | undefined {
        const had = super.get(id);
        if (had) return had;
        const item = this.items.get(id);
        if (!item) return undefined;
        const report = verifyItem(item, this.defines);
        super.set(id, report);
        return report;
    }
}

export class Workspace {
    readonly files = new Map<string, FileInfo>();
    readonly items = new Map<string, Item>();
    readonly lessons = new Map<string, Lesson>();
    readonly defines = new Map<string, Define>();
    readonly reports: Map<string, ItemReport>;
    private readonly fileOf = new Map<string, string>();
    /** Items and lessons at easy and hard, keyed `kind:id@level`, for files with content at that level. */
    private readonly atLevel = new Map<string, Item | Lesson>();
    private readonly levelReports = new Map<Item, ItemReport>();

    /**
     * `verify: "when read"` is for a page that only draws lessons: an item is verified the first time
     * its report is read with `reports.get` or `reportFor`, and lessons are not checked against their
     * items, so `errors` and each file's issues are the parser's and the checker's alone. Verifying the
     * whole corpus takes seconds, and it stays the default for everything that checks.
     */
    constructor(sources: Record<string, string>, o: { verify?: "all" | "when read" } = {}) {
        this.reports =
            o.verify === "when read"
                ? new ReportsWhenRead(this.items, this.defines)
                : new Map<string, ItemReport>();
        for (const [path, src] of Object.entries(sources)) {
            const info: FileInfo = {
                path,
                src,
                doc: null,
                canonical: null,
                document: null,
                issues: [],
                levels: ["medium"],
            };
            this.files.set(path, info);
            const { doc, errors } = parse(src);
            info.doc = doc;
            info.issues.push(
                ...errors.map((e): Issue => ({
                    level: "error",
                    message: e.message,
                    line: e.line,
                    col: e.col,
                    length: e.length,
                })),
            );
            if (errors.length) continue;
            info.canonical = format(doc);
            const checked = checkDoc(doc);
            info.issues.push(...checked.issues);
            info.levels = checked.levels;
            const root = checked.roots[0];
            const d = root ? build(root) : null;
            if (!d) continue;
            info.document = d;
            const index: ReadonlyMap<string, Document> =
                d.kind === "item" ? this.items : d.kind === "lesson" ? this.lessons : this.defines;
            if (index.has(d.id)) {
                info.issues.push({
                    level: "error",
                    message: `"${d.id}" is already defined in ${this.fileOf.get(`${d.kind}:${d.id}`)}`,
                    ...pos(d.node),
                });
                continue;
            }
            if (d.kind === "item") this.items.set(d.id, d);
            else if (d.kind === "lesson") this.lessons.set(d.id, d);
            else this.defines.set(d.id, d);
            this.fileOf.set(`${d.kind}:${d.id}`, path);
            if (d.kind === "define") continue;
            for (const level of checked.levels) {
                if (level === "medium") continue;
                const checkedAt = checkDoc(doc, { level });
                info.issues.push(...atLevel(level, checkedAt.issues, info.issues));
                const r = checkedAt.roots[0];
                const dl = r ? build(r, level) : null;
                if (dl && (dl.kind === "item" || dl.kind === "lesson") && dl.kind === d.kind)
                    this.atLevel.set(`${d.kind}:${d.id}@${level}`, dl);
            }
        }
        if (o.verify === "when read") return;
        for (const item of this.items.values()) {
            const report = verifyItem(item, this.defines);
            this.reports.set(item.id, report);
            const info = this.file("item", item.id);
            info.issues.push(...report.issues);
            const levels = info.levels ?? ["medium"];
            if (levels.length < 2) continue;
            for (const level of levels) {
                const other = level === "medium" ? undefined : this.itemAt(item.id, level);
                const r = other ? this.reportFor(other) : undefined;
                if (r) info.issues.push(...atLevel(level, r.issues, report.issues));
            }
            info.issues.push(...this.itemRises(item, levels));
        }
        for (const lesson of this.lessons.values()) {
            const info = this.file("lesson", lesson.id);
            const medium = this.verifyLesson(lesson);
            info.issues.push(...medium);
            const levels = lesson.levels ?? ["medium"];
            if (levels.length < 2) continue;
            for (const level of levels) {
                const other = level === "medium" ? undefined : this.lessonAt(lesson.id, level);
                if (other && other !== lesson)
                    info.issues.push(...atLevel(level, this.verifyLesson(other), medium));
            }
            info.issues.push(...this.lessonRises(lesson, levels));
        }
    }

    /** The file an item, lesson or component was read from. It throws for an id the workspace does not hold. */
    file(kind: "item" | "lesson" | "define", id: string): FileInfo {
        const path = this.fileOf.get(`${kind}:${id}`);
        const info = path === undefined ? undefined : this.files.get(path);
        if (!info) throw new Error(`there is no ${kind} "${id}" in the workspace`);
        return info;
    }
    get errors(): number {
        return [...this.files.values()].reduce(
            (n, f) => n + f.issues.filter((i) => i.level === "error").length,
            0,
        );
    }

    /** A lesson at a level, or the lesson as written when it declares no such level. */
    lessonAt(id: string, level: Level): Lesson | undefined {
        const had = level === "medium" ? undefined : this.atLevel.get(`lesson:${id}@${level}`);
        return had?.kind === "lesson" ? had : this.lessons.get(id);
    }

    /** An item at a level, or the item as written when it has no content for that level. */
    itemAt(id: string, level: Level): Item | undefined {
        const had = level === "medium" ? undefined : this.atLevel.get(`item:${id}@${level}`);
        return had?.kind === "item" ? had : this.items.get(id);
    }

    /** The report for an item at whichever level it was resolved at; `reports` holds medium's. */
    reportFor(item: Item): ItemReport | undefined {
        if (this.items.get(item.id) === item) return this.reports.get(item.id);
        const had = this.levelReports.get(item);
        if (had) return had;
        const report = verifyItem(item, this.defines);
        this.levelReports.set(item, report);
        return report;
    }

    /**
     * The text a level's hash is taken over: the file as written when it has no levels, so its hash is
     * what it always was, and otherwise that level's resolved canonical text, so an edit to easy leaves
     * medium's hash alone.
     */
    textAt(kind: "item" | "lesson", id: string, level: Level): string {
        const info = this.file(kind, id);
        const levels = info.levels ?? ["medium"];
        if (!info.doc || levels.length < 2) return info.src;
        return levelText(info.doc, levels.includes(level) ? level : "medium");
    }

    /** The variant a lesson block asks for: its settings fix parameters, the rest come from the first matching variant. */
    variantFor(item: Item, fixed: Record<string, string>): Variant | null {
        const report = this.reportFor(item);
        const match = report?.variants.find((v) =>
            Object.entries(fixed).every(([k, x]) => v.values[k] === x),
        );
        if (match) return match;
        // A sampled item may not have this exact variant in its sample: build it, if the ranges and
        // where lines allow it.
        if (Object.keys(fixed).length !== item.params.length) return null;
        const env: Env = {};
        for (const c of item.constants ?? []) env[c.name] = evaluate(c.expr, env);
        for (const p of item.params) {
            const v = members(evaluate(p.domain, env)).find((m) => showValue(m) === fixed[p.name]);
            if (!v) return null;
            env[p.name] = v;
        }
        if (
            !item.where.every((w) => {
                const r = evaluate(w, env);
                return r.k === "bool" && r.v;
            })
        )
            return null;
        return {
            values: fixed,
            env,
            answers: Object.fromEntries(
                Object.entries(answersFor(item, env)).map(([k, v]) => [k, showValue(v)]),
            ),
        };
    }

    private itemRises(item: Item, levels: Level[]): Issue[] {
        const where = pos(item.node);
        if (!item.difficulty)
            return [
                {
                    level: "warning",
                    message:
                        "an item with levels says what makes a version harder in a difficulty line, so the verifier can check that easy is easier than hard",
                    ...where,
                },
            ];
        const means = levels.map((level) => {
            const it = this.itemAt(item.id, level);
            const r = it ? this.reportFor(it) : undefined;
            return { level, m: it && r ? meanDifficulty(it, r.variants) : null };
        });
        return rises(means, "the item's difficulty", where, 0);
    }

    private lessonRises(lesson: Lesson, levels: Level[]): Issue[] {
        const where = pos(lesson.node);
        const measures = levels.map((level) => {
            const l = this.lessonAt(lesson.id, level);
            return { level, m: l ? levelMeasure(this, l) : null };
        });
        const out = rises(
            measures.map((x) => ({ level: x.level, m: x.m?.difficulty ?? null })),
            "the lesson's difficulty against medium",
            where,
            0.05,
        );
        for (const x of measures)
            if (x.m?.repeats)
                out.push({
                    level: "warning",
                    message: `at ${x.level} the same version is asked twice ${x.m.repeats === 1 ? "" : `in ${x.m.repeats} places `}; change a seed or a pin`,
                    ...where,
                });
        return out;
    }

    private verifyLesson(lesson: Lesson): Issue[] {
        const issues: Issue[] = [];
        const add = (level: Issue["level"], t: TNode, message: string): void => {
            issues.push({ level, message, ...pos(t) });
        };
        const fmt = FORMATS[lesson.format];
        for (const s of lesson.sections) {
            if (fmt && !fmt.sections.includes(s.type))
                add(
                    "warning",
                    s.node,
                    `a ${lesson.format} lesson usually has ${fmt.sections.join(", ")}, not "${s.type}"`,
                );
            if (s.type === "puzzle" && s.stars === undefined)
                add("warning", s.node, "give each puzzle stars=1, 2 or 3");
            for (const b of s.blocks) {
                if (b.type === "practice" || b.type === "show" || b.type === "worked") {
                    const ref = b.args.item?.k === "ref" ? b.args.item.v : "";
                    const wanted =
                        b.props.level?.k === "word" && isLevel(b.props.level.v)
                            ? b.props.level.v
                            : (lesson.level ?? "medium");
                    const item = this.itemAt(ref, wanted);
                    if (!item) {
                        add("error", b, `there is no item "${ref}"${this.near(ref)}`);
                        continue;
                    }
                    const report = this.reportFor(item);
                    if (!report) continue;
                    if (b.type === "practice") {
                        const count = b.props.count?.k === "num" ? b.props.count.v : 0;
                        if (report.variants.length && count > report.variants.length)
                            add(
                                "warning",
                                b,
                                `${item.id} has ${report.variants.length} variants${item.level && item.level !== "medium" ? ` at ${item.level}` : ""}, fewer than ${count}`,
                            );
                        continue;
                    }
                    const fixed: Record<string, string> = {};
                    for (const [k, v] of Object.entries(b.open)) {
                        if (!item.params.some((p) => p.name === k)) {
                            add(
                                "error",
                                b,
                                `${item.id} has no parameter "${k}"; it has ${item.params.map((p) => p.name).join(", ") || "none"}`,
                            );
                            continue;
                        }
                        if (v.k === "expr") {
                            try {
                                fixed[k] = showValue(evaluate(v.e, {}));
                            } catch (e) {
                                add("error", b, e instanceof Error ? e.message : String(e));
                            }
                        }
                    }
                    if (
                        Object.keys(fixed).length &&
                        report.variants.length &&
                        !this.variantFor(item, fixed)
                    ) {
                        const inDomain = item.params.every(
                            (p) =>
                                !(p.name in fixed) ||
                                members(evaluate(p.domain, {})).some(
                                    (m) => showValue(m) === fixed[p.name],
                                ),
                        );
                        const levelNote =
                            item.level && item.level !== "medium"
                                ? ` at ${item.level}; pin values from that level's range, or write level=medium on the block`
                                : "";
                        add(
                            "error",
                            b,
                            inDomain
                                ? `no variant of ${item.id} has ${Object.entries(fixed)
                                      .map(([k, x]) => `${k} = ${x}`)
                                      .join(", ")} (a where line rules it out)${levelNote}`
                                : `a value is outside the range ${item.id} allows${levelNote}`,
                        );
                    }
                } else if (b.type === "scene" && b.args.size?.k === "size") {
                    try {
                        const inst = instantiate(
                            { size: [b.args.size.w, b.args.size.h], nodes: b.children },
                            {},
                            {},
                            this.defines,
                        );
                        layout(inst).problems.forEach((p) => add("error", b, p));
                    } catch (e) {
                        add("error", b, e instanceof Error ? e.message : String(e));
                    }
                }
            }
        }
        return issues;
    }

    private near(ref: string): string {
        return near(ref, [...this.items.keys()]);
    }
}
