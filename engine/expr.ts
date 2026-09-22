// The expression language inside the notation, and text with placeholders in it. It stays small on
// purpose (.docs/notation.md, "Expressions"): exact arithmetic, no loops, no user functions, no
// input or output, and the same inputs always give the same result.

import * as R from "./numbers";

export class LangError extends Error {
    line: number;
    col: number;
    length: number;

    constructor(message: string, line = 1, col = 1, length = 1) {
        super(message);
        this.name = "LangError";
        this.line = line;
        this.col = col;
        this.length = length;
    }
}

interface Tok {
    k: "num" | "str" | "id" | "op" | "eof";
    v: string;
    pos: number;
    end: number;
}

const ALIASES: Record<string, string> = {
    "×": "*",
    "÷": "/",
    "≠": "!=",
    "≤": "<=",
    "≥": ">=",
    "−": "-",
};
// The first operator that matches is taken, so every two-character operator comes before its prefix.
const OPS = ".. // == != <= >= < > + - * / % ^ ( ) { } , =".split(" ");
const KEYWORDS = new Set(["and", "or", "not", "in", "if", "then", "else", "true", "false", "by"]);
// "2..3" is a range, not the decimal "2." followed by ".3".
const NUMBER = /[0-9]+(\.[0-9]+)?/y;
const NAME = /[A-Za-z_][A-Za-z0-9_]*/y;

function matchAt(pattern: RegExp, src: string, at: number): string | undefined {
    pattern.lastIndex = at;
    return pattern.exec(src)?.[0];
}

/** The tokens of an expression, which is one line, and the end token apart from them. */
function tokenize(src: string): { toks: Tok[]; eof: Tok } {
    const toks: Tok[] = [];
    let i = 0;
    while (i < src.length) {
        const ch = src.charAt(i);
        if (ch === " " || ch === "\t") {
            i++;
            continue;
        }
        if (ch === "\n") {
            if (src.slice(i).trim() !== "")
                throw new LangError(
                    "an expression is one line, and this goes on past it",
                    1,
                    i + 1,
                );
            break;
        }
        const number = matchAt(NUMBER, src, i);
        if (number !== undefined) {
            toks.push({ k: "num", v: number, pos: i, end: i + number.length });
            i += number.length;
            continue;
        }
        const name = matchAt(NAME, src, i);
        if (name !== undefined) {
            toks.push({ k: "id", v: name, pos: i, end: i + name.length });
            i += name.length;
            continue;
        }
        if (ch === '"') {
            let j = i + 1;
            let s = "";
            while (j < src.length && src.charAt(j) !== '"' && src.charAt(j) !== "\n") {
                if (src.charAt(j) === "\\" && j + 1 < src.length) {
                    s += src.charAt(j + 1);
                    j += 2;
                } else {
                    s += src.charAt(j);
                    j++;
                }
            }
            if (src.charAt(j) !== '"')
                throw new LangError("text is missing its closing quote", 1, i + 1);
            toks.push({ k: "str", v: s, pos: i, end: j + 1 });
            i = j + 1;
            continue;
        }
        const alias = ALIASES[ch];
        if (alias) {
            toks.push({ k: "op", v: alias, pos: i, end: i + 1 });
            i++;
            continue;
        }
        const op = OPS.find((o) => src.startsWith(o, i));
        if (op) {
            toks.push({ k: "op", v: op, pos: i, end: i + op.length });
            i += op.length;
            continue;
        }
        throw new LangError(`unexpected character "${ch}"`, 1, i + 1);
    }
    return { toks, eof: { k: "eof", v: "", pos: i, end: i } };
}

type BinOp =
    | "or"
    | "and"
    | "=="
    | "!="
    | "<"
    | "<="
    | ">"
    | ">="
    | "in"
    | "+"
    | "-"
    | "*"
    | "/"
    | "//"
    | "%"
    | "^";

export type Expr =
    | { t: "num"; v: string }
    | { t: "str"; v: string }
    | { t: "bool"; v: boolean }
    | { t: "id"; name: string }
    | { t: "un"; op: "-" | "not"; e: Expr }
    | { t: "bin"; op: BinOp; l: Expr; r: Expr }
    | { t: "range"; lo: Expr; hi: Expr; by?: Expr }
    | { t: "set"; items: Expr[] }
    | { t: "call"; fn: string; args: Expr[] }
    | { t: "if"; c: Expr; a: Expr; b: Expr };

/** Source offsets, kept outside the tree so trees compare as plain data. */
const POS = new WeakMap<Expr, [number, number]>();

const COMPARISONS = ["==", "!=", "<", "<=", ">", ">=", "in"] as const;
const CMP = new Set<string>(COMPARISONS);
const ADDITIVE = ["+", "-"] as const;
const MULTIPLICATIVE = ["*", "/", "//", "%"] as const;

class Parser {
    private i = 0;
    /** Where the last token read ends. */
    private last = 0;
    private readonly toks: Tok[];
    private readonly eof: Tok;

    constructor(src: string) {
        const { toks, eof } = tokenize(src);
        this.toks = toks;
        this.eof = eof;
    }

    get peek(): Tok {
        return this.toks[this.i] ?? this.eof;
    }

    private next(): Tok {
        const t = this.peek;
        this.i++;
        this.last = t.end;
        return t;
    }

    private isOp(v: string): boolean {
        return this.peek.k === "op" && this.peek.v === v;
    }

    private isKw(v: string): boolean {
        return this.peek.k === "id" && this.peek.v === v;
    }

    /** Reads the next token when it is one of `ops`. */
    private take<T extends string>(ops: readonly T[]): T | undefined {
        const t = this.peek;
        const op = t.k === "op" ? ops.find((o) => o === t.v) : undefined;
        if (op !== undefined) this.next();
        return op;
    }

    private comparison(): (typeof COMPARISONS)[number] | undefined {
        const t = this.peek;
        return t.k === "op" || t.k === "id" ? COMPARISONS.find((c) => c === t.v) : undefined;
    }

    private fail(msg: string, t = this.peek): never {
        throw new LangError(msg, 1, t.pos + 1, Math.max(1, t.end - t.pos));
    }

    private mark<T extends Expr>(e: T, from: number): T {
        POS.set(e, [from, this.last]);
        return e;
    }

    private expect(v: string): void {
        const t = this.peek;
        if ((t.k === "op" || t.k === "id") && t.v === v) {
            this.next();
            return;
        }
        this.fail(
            t.k === "eof" ? `expected "${v}" before the end` : `expected "${v}" but found "${t.v}"`,
        );
    }

    parse(): Expr {
        const from = this.peek.pos;
        if (this.isKw("if")) {
            this.next();
            const c = this.parse();
            this.expect("then");
            const a = this.parse();
            this.expect("else");
            const b = this.parse();
            return this.mark({ t: "if", c, a, b }, from);
        }
        return this.or();
    }

    private or(): Expr {
        const from = this.peek.pos;
        let l = this.and();
        while (this.isKw("or")) {
            this.next();
            l = this.mark({ t: "bin", op: "or", l, r: this.and() }, from);
        }
        return l;
    }

    private and(): Expr {
        const from = this.peek.pos;
        let l = this.not();
        while (this.isKw("and")) {
            this.next();
            l = this.mark({ t: "bin", op: "and", l, r: this.not() }, from);
        }
        return l;
    }

    private not(): Expr {
        const from = this.peek.pos;
        if (this.isKw("not")) {
            this.next();
            return this.mark({ t: "un", op: "not", e: this.not() }, from);
        }
        return this.cmp();
    }

    private cmp(): Expr {
        const from = this.peek.pos;
        const l = this.range();
        const op = this.comparison();
        if (!op) return l;
        this.next();
        const e = this.mark({ t: "bin", op, l, r: this.range() }, from);
        if (this.comparison()) this.fail('comparisons cannot be chained; join them with "and"');
        return e;
    }

    private range(): Expr {
        const from = this.peek.pos;
        const lo = this.add();
        if (!this.isOp("..")) return lo;
        this.next();
        const hi = this.add();
        if (this.isKw("by")) {
            this.next();
            return this.mark({ t: "range", lo, hi, by: this.add() }, from);
        }
        return this.mark({ t: "range", lo, hi }, from);
    }

    private add(): Expr {
        const from = this.peek.pos;
        let l = this.mul();
        let op = this.take(ADDITIVE);
        while (op) {
            l = this.mark({ t: "bin", op, l, r: this.mul() }, from);
            op = this.take(ADDITIVE);
        }
        return l;
    }

    private mul(): Expr {
        const from = this.peek.pos;
        let l = this.unary();
        let op = this.take(MULTIPLICATIVE);
        while (op) {
            l = this.mark({ t: "bin", op, l, r: this.unary() }, from);
            op = this.take(MULTIPLICATIVE);
        }
        return l;
    }

    private unary(): Expr {
        const from = this.peek.pos;
        if (this.isOp("-")) {
            this.next();
            return this.mark({ t: "un", op: "-", e: this.unary() }, from);
        }
        return this.pow();
    }

    private pow(): Expr {
        const from = this.peek.pos;
        const base = this.primary();
        if (!this.isOp("^")) return base;
        this.next();
        return this.mark({ t: "bin", op: "^", l: base, r: this.unary() }, from);
    }

    private primary(): Expr {
        const t = this.peek;
        const from = t.pos;
        if (t.k === "num") {
            this.next();
            return this.mark({ t: "num", v: normalizeNum(t.v) }, from);
        }
        if (t.k === "str") {
            this.next();
            return this.mark({ t: "str", v: t.v }, from);
        }
        if (t.k === "id" && (t.v === "true" || t.v === "false")) {
            this.next();
            return this.mark({ t: "bool", v: t.v === "true" }, from);
        }
        if (t.k === "id" && !KEYWORDS.has(t.v)) {
            this.next();
            if (!this.isOp("(")) return this.mark({ t: "id", name: t.v }, from);
            this.next();
            return this.mark({ t: "call", fn: t.v, args: this.list(")") }, from);
        }
        if (this.isOp("(")) {
            this.next();
            const e = this.parse();
            this.expect(")");
            return e;
        }
        if (this.isOp("{")) {
            this.next();
            return this.mark({ t: "set", items: this.list("}") }, from);
        }
        return this.fail(t.k === "eof" ? "expression ends too early" : `unexpected "${t.v}"`);
    }

    /** Expressions separated by commas, up to and including the closing bracket. */
    private list(close: string): Expr[] {
        const items: Expr[] = [];
        if (!this.isOp(close)) {
            items.push(this.parse());
            while (this.isOp(",")) {
                this.next();
                items.push(this.parse());
            }
        }
        this.expect(close);
        return items;
    }
}

/** "007" is 7, but "1.40" keeps both places: they say how the number is shown. */
function normalizeNum(s: string): string {
    if (!s.includes(".")) return String(Number(s));
    const [whole = "", places = ""] = s.split(".");
    return `${Number(whole)}${places ? "." + places : ""}`;
}

export function parseExpr(src: string): Expr {
    const p = new Parser(src);
    const e = p.parse();
    const t = p.peek;
    if (t.k !== "eof")
        throw new LangError(
            `unexpected "${t.v}" after the expression`,
            1,
            t.pos + 1,
            t.end - t.pos,
        );
    return e;
}

const PREC = {
    if: 1,
    or: 2,
    and: 3,
    not: 4,
    cmp: 5,
    range: 6,
    add: 7,
    mul: 8,
    neg: 9,
    pow: 10,
    atom: 11,
};

function prec(e: Expr): number {
    switch (e.t) {
        case "if":
            return PREC.if;
        case "range":
            return PREC.range;
        case "un":
            return e.op === "not" ? PREC.not : PREC.neg;
        case "bin":
            if (e.op === "or") return PREC.or;
            if (e.op === "and") return PREC.and;
            if (CMP.has(e.op)) return PREC.cmp;
            if (e.op === "+" || e.op === "-") return PREC.add;
            if (e.op === "^") return PREC.pow;
            return PREC.mul;
        default:
            return PREC.atom;
    }
}

/** Canonical text, with single spaces around operators and only the parentheses that matter. */
export function printExpr(e: Expr, min = 0): string {
    const s = bare(e);
    return prec(e) < min ? `(${s})` : s;
}

function bare(e: Expr): string {
    switch (e.t) {
        case "num":
            return e.v;
        case "str":
            return `"${e.v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
        case "bool":
            return String(e.v);
        case "id":
            return e.name;
        case "set":
            return `{${e.items.map((x) => printExpr(x)).join(", ")}}`;
        case "call":
            return `${e.fn}(${e.args.map((x) => printExpr(x)).join(", ")})`;
        case "if":
            return `if ${printExpr(e.c)} then ${printExpr(e.a)} else ${printExpr(e.b)}`;
        case "range": {
            const by = e.by ? ` by ${printExpr(e.by, PREC.add)}` : "";
            return `${printExpr(e.lo, PREC.add)}..${printExpr(e.hi, PREC.add)}${by}`;
        }
        case "un":
            // "not" always parenthesises an operator operand, so "not (a == b)" never reads as
            // "(not a) == b".
            return e.op === "not"
                ? `not ${printExpr(e.e, PREC.atom)}`
                : `-${printExpr(e.e, PREC.neg)}`;
        case "bin": {
            const p = prec(e);
            if (e.op === "^") return `${printExpr(e.l, PREC.atom)} ^ ${printExpr(e.r, PREC.neg)}`;
            if (p === PREC.cmp)
                return `${printExpr(e.l, PREC.range)} ${e.op} ${printExpr(e.r, PREC.range)}`;
            return `${printExpr(e.l, p)} ${e.op} ${printExpr(e.r, p + 1)}`;
        }
    }
}

export type Value =
    | { k: "num"; v: R.Rat }
    | { k: "bool"; v: boolean }
    | { k: "str"; v: string }
    | { k: "range"; lo: R.Rat; hi: R.Rat; step: R.Rat }
    | { k: "set"; items: Value[] };
export type Env = Record<string, Value>;

const BIN_OPS: Record<BinOp, true> = {
    or: true,
    and: true,
    "==": true,
    "!=": true,
    "<": true,
    "<=": true,
    ">": true,
    ">=": true,
    in: true,
    "+": true,
    "-": true,
    "*": true,
    "/": true,
    "//": true,
    "%": true,
    "^": true,
};

const isPlain = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

function firstProblem(items: readonly unknown[], problem: (v: unknown) => string | null) {
    for (const item of items) {
        const found = problem(item);
        if (found !== null) return found;
    }
    return null;
}

const ratProblem = (v: unknown): string | null =>
    isPlain(v) &&
    typeof v.n === "number" &&
    Number.isSafeInteger(v.n) &&
    typeof v.d === "number" &&
    Number.isSafeInteger(v.d) &&
    v.d > 0 &&
    (v.dp === undefined || (typeof v.dp === "number" && Number.isSafeInteger(v.dp) && v.dp >= 0))
        ? null
        : "a number is n over d, whole numbers with d above zero";

/** What is wrong with an expression read from outside the program, or null when it is one. */
export function exprProblem(v: unknown): string | null {
    if (!isPlain(v)) return "an expression must be an object";
    switch (v.t) {
        case "num":
        case "str":
            return typeof v.v === "string" ? null : `a ${v.t} expression holds its text`;
        case "bool":
            return typeof v.v === "boolean" ? null : "a bool expression holds true or false";
        case "id":
            return typeof v.name === "string" ? null : "a name expression holds its name";
        case "un":
            return v.op === "-" || v.op === "not"
                ? exprProblem(v.e)
                : `"${String(v.op)}" is not an operator of one side`;
        case "bin":
            return typeof v.op === "string" && Object.hasOwn(BIN_OPS, v.op)
                ? (exprProblem(v.l) ?? exprProblem(v.r))
                : `"${String(v.op)}" is not an operator of two sides`;
        case "range":
            return (
                exprProblem(v.lo) ??
                exprProblem(v.hi) ??
                (v.by === undefined ? null : exprProblem(v.by))
            );
        case "set":
            return Array.isArray(v.items)
                ? firstProblem(v.items, exprProblem)
                : "a set holds a list of items";
        case "call":
            return typeof v.fn === "string" && Array.isArray(v.args)
                ? firstProblem(v.args, exprProblem)
                : "a call holds a function's name and a list of arguments";
        case "if":
            return exprProblem(v.c) ?? exprProblem(v.a) ?? exprProblem(v.b);
        default:
            return `"${String(v.t)}" is not a kind of expression`;
    }
}

/** What is wrong with a value read from outside the program, or null when it is one. */
export function valueProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a value must be an object";
    switch (v.k) {
        case "num":
            return ratProblem(v.v);
        case "bool":
            return typeof v.v === "boolean" ? null : "a bool value holds true or false";
        case "str":
            return typeof v.v === "string" ? null : "a str value holds its text";
        case "range":
            return ratProblem(v.lo) ?? ratProblem(v.hi) ?? ratProblem(v.step);
        case "set":
            return Array.isArray(v.items)
                ? firstProblem(v.items, valueProblem)
                : "a set holds a list of items";
        default:
            return `"${String(v.k)}" is not a kind of value`;
    }
}

export const num = (n: number, d = 1): Value => ({ k: "num", v: R.rat(n, d) });
export const str = (v: string): Value => ({ k: "str", v });

export function showValue(v: Value): string {
    switch (v.k) {
        case "num":
            return R.showRat(v.v);
        case "bool":
            return String(v.v);
        case "str":
            return v.v;
        case "range": {
            const by = R.eq(v.step, R.rat(1)) ? "" : ` by ${R.showRat(v.step)}`;
            return `${R.showRat(v.lo)}..${R.showRat(v.hi)}${by}`;
        }
        case "set":
            return `{${v.items.map(showValue).join(", ")}}`;
    }
}

type Range = Extract<Value, { k: "range" }>;
type Collection = Extract<Value, { k: "range" | "set" }>;

const isCollection = (v: Value): v is Collection => v.k === "range" || v.k === "set";

/** How many members a range has, without listing them. */
const countOf = (r: Range): R.Rat =>
    R.cmp(r.lo, r.hi) > 0 ? R.rat(0) : R.add(R.floor(R.div(R.sub(r.hi, r.lo), r.step)), R.rat(1));

/** Two ranges, two sets, or a range and a set are equal when they have the same members, in any order. */
export function equal(a: Value, b: Value): boolean {
    if (a.k === "num" && b.k === "num") return R.eq(a.v, b.v);
    if (a.k === "bool" && b.k === "bool") return a.v === b.v;
    if (a.k === "str" && b.k === "str") return a.v === b.v;
    if (a.k === "range" && b.k === "range") {
        // Compared without listing, so two long ranges are not held to a domain's limit.
        const n = countOf(a);
        if (!R.eq(n, countOf(b))) return false;
        return n.n === 0 || (R.eq(a.lo, b.lo) && (n.n === 1 || R.eq(a.step, b.step)));
    }
    if (isCollection(a) && isCollection(b)) {
        const xs = members(a);
        const ys = members(b);
        return (
            xs.every((x) => ys.some((y) => equal(x, y))) &&
            ys.every((y) => xs.some((x) => equal(x, y)))
        );
    }
    return false;
}

const MAX_MEMBERS = 10_000;

/** The members of a range or set, in order. */
export function members(v: Value): Value[] {
    if (v.k === "set") return v.items;
    if (v.k === "range") {
        const out: Value[] = [];
        for (let x = v.lo; R.cmp(x, v.hi) <= 0; x = R.add(x, v.step)) {
            if (out.length >= MAX_MEMBERS)
                throw new R.ArithmeticError(`a domain may have at most ${MAX_MEMBERS} values`);
            out.push({ k: "num", v: x });
        }
        return out;
    }
    throw new R.ArithmeticError("only a range or a set has members");
}

type Fn =
    | { takes: 1; run: (x: R.Rat) => Value }
    | { takes: 2; run: (x: R.Rat, y: R.Rat) => Value }
    | { takes: "1+"; run: (x: R.Rat, rest: R.Rat[]) => Value };

// The order is the order suggestions are tried in, so it decides a tie.
const FNS: Record<string, Fn> = {
    min: {
        takes: "1+",
        run: (x, rest) => ({ k: "num", v: rest.reduce((m, y) => (R.cmp(y, m) < 0 ? y : m), x) }),
    },
    max: {
        takes: "1+",
        run: (x, rest) => ({ k: "num", v: rest.reduce((m, y) => (R.cmp(y, m) > 0 ? y : m), x) }),
    },
    abs: { takes: 1, run: (x) => ({ k: "num", v: R.rat(Math.abs(x.n), x.d, x.dp) }) },
    floor: { takes: 1, run: (x) => ({ k: "num", v: R.floor(x) }) },
    ceil: { takes: 1, run: (x) => ({ k: "num", v: R.ceil(x) }) },
    round: { takes: 1, run: (x) => ({ k: "num", v: R.floor(R.add(x, R.rat(1, 2))) }) },
    whole: { takes: 1, run: (x) => ({ k: "bool", v: R.isWhole(x) }) },
    gcd: {
        takes: 2,
        run: (a, b) => {
            need(R.isWhole(a) && R.isWhole(b), "gcd needs whole numbers");
            return { k: "num", v: R.rat(R.gcd(a.n, b.n)) };
        },
    },
    lcm: {
        takes: 2,
        run: (a, b) => {
            need(R.isWhole(a) && R.isWhole(b), "lcm needs whole numbers");
            return { k: "num", v: R.rat(Math.abs(a.n * b.n) / (R.gcd(a.n, b.n) || 1)) };
        },
    },
    num: { takes: 1, run: (x) => ({ k: "num", v: R.rat(x.n) }) },
    // Display, not arithmetic: decimals(x, 2) shows at least two places, plain(x) drops the places
    // and shows a whole number or a fraction.
    decimals: {
        takes: 2,
        run: (x, n) => {
            need(R.isWhole(n) && n.n >= 0 && n.n <= 10, "decimals() takes 0 to 10 places");
            return { k: "num", v: R.withPlaces(x, n.n) };
        },
    },
    plain: { takes: 1, run: (x) => ({ k: "num", v: R.withPlaces(x) }) },
    den: { takes: 1, run: (x) => ({ k: "num", v: R.rat(x.d) }) },
};
// pick takes values of any kind, where FNS works on numbers, so it is handled beside them.
const PICK = "pick";
const FUNCTIONS = [...Object.keys(FNS), PICK];

// Own keys only, so "toString" is an unknown function rather than the object's method.
const lookup = (name: string): Fn | undefined => (Object.hasOwn(FNS, name) ? FNS[name] : undefined);

function need(ok: boolean, msg: string): asserts ok {
    if (!ok) throw new R.ArithmeticError(msg);
}

const KIND: Record<Value["k"], string> = {
    num: "a number",
    bool: "true or false",
    str: "text",
    range: "a range",
    set: "a set",
};

function errorAt(e: Expr, msg: string): LangError {
    const at = POS.get(e);
    return new LangError(msg, 1, (at?.[0] ?? 0) + 1, at ? at[1] - at[0] : 1);
}

function fail(e: Expr, msg: string): never {
    throw errorAt(e, msg);
}

/**
 * An error the language finds points at the part of the expression it is in; one from the arithmetic
 * itself, such as a number too large, points at the whole expression.
 */
export function evaluate(e: Expr, env: Env): Value {
    try {
        return ev(e, env);
    } catch (err) {
        if (err instanceof LangError) throw err;
        throw errorAt(e, err instanceof Error ? err.message : String(err));
    }
}

function ev(e: Expr, env: Env): Value {
    const numOf = (x: Expr, what: string): R.Rat => {
        const v = ev(x, env);
        if (v.k !== "num") fail(x, `${what} needs a number, not ${KIND[v.k]}`);
        return v.v;
    };
    const boolOf = (x: Expr, what: string): boolean => {
        const v = ev(x, env);
        if (v.k !== "bool") fail(x, `${what} needs true or false, not ${KIND[v.k]}`);
        return v.v;
    };
    switch (e.t) {
        case "num":
            return { k: "num", v: R.parseDecimal(e.v) };
        case "str":
            return { k: "str", v: e.v };
        case "bool":
            return { k: "bool", v: e.v };
        case "id": {
            // Own keys only, so "constructor" is an unknown name rather than the object's.
            const v = Object.hasOwn(env, e.name) ? env[e.name] : undefined;
            if (!v) return fail(e, `unknown name "${e.name}"${suggest(e.name, Object.keys(env))}`);
            return v;
        }
        case "set":
            return { k: "set", items: e.items.map((x) => ev(x, env)) };
        case "range": {
            const step = e.by ? numOf(e.by, '"by"') : R.rat(1);
            if (R.cmp(step, R.rat(0)) <= 0) fail(e.by ?? e, "a range step must be more than zero");
            return { k: "range", lo: numOf(e.lo, "a range"), hi: numOf(e.hi, "a range"), step };
        }
        case "if":
            return boolOf(e.c, '"if"') ? ev(e.a, env) : ev(e.b, env);
        case "call": {
            // pick(k, a, b, c) is the value at position k, counting from 0, so a hand-written version
            // is one more value in a list rather than one more branch of an if.
            if (e.fn === PICK) {
                const [at, ...values] = e.args;
                if (!at || !values.length)
                    return fail(
                        e,
                        "pick takes a position and the values to pick from, as pick(k, a, b)",
                    );
                const k = numOf(at, PICK);
                const chosen = R.isWhole(k) && k.n >= 0 ? values[k.n] : undefined;
                if (!chosen)
                    return fail(
                        at,
                        `pick needs a position from 0 to ${values.length - 1}, not ${showValue({ k: "num", v: k })}`,
                    );
                return ev(chosen, env);
            }
            const f = lookup(e.fn);
            if (!f) return fail(e, `unknown function "${e.fn}"${suggest(e.fn, FUNCTIONS)}`);
            const [lo, hi]: [number, number] = f.takes === "1+" ? [1, 99] : [f.takes, f.takes];
            const takes = `${e.fn} takes ${lo === hi ? lo : `${lo} or more`} value${hi === 1 ? "" : "s"}`;
            if (e.args.length < lo || e.args.length > hi) return fail(e, takes);
            const [x, ...rest] = e.args.map((a) => numOf(a, e.fn));
            const [y] = rest;
            if (x === undefined) return fail(e, takes);
            if (f.takes === 1) return f.run(x);
            if (f.takes === "1+") return f.run(x, rest);
            return y === undefined ? fail(e, takes) : f.run(x, y);
        }
        case "un":
            return e.op === "not"
                ? { k: "bool", v: !boolOf(e.e, '"not"') }
                : { k: "num", v: R.neg(numOf(e.e, '"-"')) };
        case "bin": {
            const { op, l, r } = e;
            if (op === "and") return { k: "bool", v: boolOf(l, '"and"') && boolOf(r, '"and"') };
            if (op === "or") return { k: "bool", v: boolOf(l, '"or"') || boolOf(r, '"or"') };
            if (op === "==" || op === "!=") {
                const a = ev(l, env);
                const b = ev(r, env);
                if (a.k !== b.k && !(isCollection(a) && isCollection(b)))
                    fail(e, `cannot compare ${KIND[a.k]} with ${KIND[b.k]}`);
                return { k: "bool", v: equal(a, b) === (op === "==") };
            }
            if (op === "in") {
                const x = ev(l, env);
                const c = ev(r, env);
                if (c.k === "range") {
                    if (x.k !== "num") fail(l, `"in" a range needs a number, not ${KIND[x.k]}`);
                    const inside =
                        R.cmp(x.v, c.lo) >= 0 &&
                        R.cmp(x.v, c.hi) <= 0 &&
                        R.isWhole(R.div(R.sub(x.v, c.lo), c.step));
                    return { k: "bool", v: inside };
                }
                if (c.k === "set") return { k: "bool", v: c.items.some((y) => equal(x, y)) };
                return fail(r, `"in" needs a range or a set, not ${KIND[c.k]}`);
            }
            const a = numOf(l, `"${op}"`);
            const b = numOf(r, `"${op}"`);
            switch (op) {
                case "<":
                    return { k: "bool", v: R.cmp(a, b) < 0 };
                case "<=":
                    return { k: "bool", v: R.cmp(a, b) <= 0 };
                case ">":
                    return { k: "bool", v: R.cmp(a, b) > 0 };
                case ">=":
                    return { k: "bool", v: R.cmp(a, b) >= 0 };
                case "+":
                    return { k: "num", v: R.add(a, b) };
                case "-":
                    return { k: "num", v: R.sub(a, b) };
                case "*":
                    return { k: "num", v: R.mul(a, b) };
                case "/":
                    if (b.n === 0) fail(r, "division by zero");
                    return { k: "num", v: R.div(a, b) };
                case "//":
                case "%": {
                    if (!R.isWhole(a) || !R.isWhole(b)) fail(e, `"${op}" needs whole numbers`);
                    if (b.n === 0) fail(r, "division by zero");
                    const q = Math.floor(a.n / b.n);
                    return { k: "num", v: R.rat(op === "//" ? q : a.n - q * b.n) };
                }
                case "^":
                    return { k: "num", v: R.pow(a, b) };
            }
        }
    }
}

/** Every name the expression reads. */
export function freeNames(e: Expr, out = new Set<string>()): Set<string> {
    switch (e.t) {
        case "id":
            out.add(e.name);
            break;
        case "un":
            freeNames(e.e, out);
            break;
        case "bin":
            freeNames(e.l, out);
            freeNames(e.r, out);
            break;
        case "range":
            freeNames(e.lo, out);
            freeNames(e.hi, out);
            if (e.by) freeNames(e.by, out);
            break;
        case "set":
            e.items.forEach((x) => freeNames(x, out));
            break;
        case "call":
            e.args.forEach((x) => freeNames(x, out));
            break;
        case "if":
            freeNames(e.c, out);
            freeNames(e.a, out);
            freeNames(e.b, out);
            break;
    }
    return out;
}

/** Unknown names and functions, reported before anything runs. */
export function checkNames(e: Expr, known: string[]): LangError[] {
    const errs: LangError[] = [];
    const walk = (x: Expr): void => {
        if (x.t === "id" && !known.includes(x.name))
            errs.push(errorAt(x, `unknown name "${x.name}"${suggest(x.name, known)}`));
        if (x.t === "call" && x.fn !== PICK && !lookup(x.fn))
            errs.push(errorAt(x, `unknown function "${x.fn}"${suggest(x.fn, FUNCTIONS)}`));
        if (x.t === "un") walk(x.e);
        if (x.t === "bin") {
            walk(x.l);
            walk(x.r);
        }
        if (x.t === "range") {
            walk(x.lo);
            walk(x.hi);
            if (x.by) walk(x.by);
        }
        if (x.t === "set") x.items.forEach(walk);
        if (x.t === "call") x.args.forEach(walk);
        if (x.t === "if") {
            walk(x.c);
            walk(x.a);
            walk(x.b);
        }
    };
    walk(e);
    return errs;
}

/** Levenshtein distance, one row at a time. */
function distance(a: string, b: string): number {
    let above = Array.from({ length: b.length + 1 }, (_, j) => j);
    let result = b.length;
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        let left = i;
        let diagonal = i - 1;
        above.slice(1).forEach((up, k) => {
            const swap = a.charAt(i - 1) === b.charAt(k) ? 0 : 1;
            left = Math.min(up + 1, left + 1, diagonal + swap);
            diagonal = up;
            row.push(left);
        });
        above = row;
        result = left;
    }
    return result;
}

function suggest(name: string, options: string[]): string {
    const best = options
        .map((o): [string, number] => [o, distance(name, o)])
        .filter(([, d]) => d <= 2)
        .sort((x, y) => x[1] - y[1])[0];
    return best ? ` (did you mean "${best[0]}"?)` : "";
}

/**
 * One part of a text with placeholders: `{n}` or `{a * b}` is an expression, `{light}` and
 * `{light.many}` a role's noun, one or many, and `{?more}` a blank the child fills in.
 */
export type Piece =
    | { k: "text"; v: string }
    | { k: "blank"; name: string }
    | { k: "noun"; role: string; many: boolean }
    | { k: "expr"; e: Expr; src: string };

export function pieces(s: string): Piece[] {
    const out: Piece[] = [];
    let last = 0;
    for (const m of s.matchAll(/\{([^{}]*)\}/g)) {
        const [whole, group = ""] = m;
        if (m.index > last) out.push({ k: "text", v: s.slice(last, m.index) });
        const inner = group.trim();
        const blank = /^\?([A-Za-z_]\w*)$/.exec(inner)?.[1];
        const [, role, many] = /^([A-Za-z_]\w*)\.(many|one)$/.exec(inner) ?? [];
        if (blank !== undefined) out.push({ k: "blank", name: blank });
        else if (role !== undefined) out.push({ k: "noun", role, many: many === "many" });
        else {
            try {
                out.push({ k: "expr", e: parseExpr(inner), src: inner });
            } catch (e) {
                throw new LangError(`in {${inner}}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        last = m.index + whole.length;
    }
    if (last < s.length) out.push({ k: "text", v: s.slice(last) });
    return out;
}

/** The names a text's expressions read, the roles it names as nouns, and its blanks. */
export function uses(ps: Piece[]): { names: string[]; roles: string[]; blanks: string[] } {
    const names = new Set<string>();
    const roles = new Set<string>();
    const blanks: string[] = [];
    for (const p of ps) {
        if (p.k === "expr") freeNames(p.e).forEach((n) => names.add(n));
        if (p.k === "noun") roles.add(p.role);
        if (p.k === "blank") blanks.push(p.name);
    }
    return { names: [...names], roles: [...roles], blanks };
}
