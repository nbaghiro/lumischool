import assert from "node:assert/strict";
import { test } from "node:test";
import {
    LangError,
    checkNames,
    evaluate,
    exprProblem,
    num,
    parseExpr,
    pieces,
    printExpr,
    showValue,
    uses,
    valueProblem,
    type Env,
    type Expr,
} from "../expr";

const env: Env = { a: num(3), b: num(4), c: num(5), x: num(6) };
const run = (s: string) => showValue(evaluate(parseExpr(s), env));
const canon = (s: string) => printExpr(parseExpr(s));

test("every expression the parser makes reads back as an expression once it has been through JSON", () => {
    for (const s of [
        "a + 2 * (b - 1)",
        "not (a in {1, 2, 3}) and b >= 4",
        "if a > b then a else -b",
        "max(a, 1..10 by 2)",
        '"sun" == x',
        "a // 3 % 2 ^ 2",
        'pick(k, "sun", 2, a > b)',
    ]) {
        assert.equal(exprProblem(JSON.parse(JSON.stringify(parseExpr(s)))), null, s);
    }
});

test("an expression or a value that is not one says what is wrong with it", () => {
    assert.match(
        exprProblem({ t: "bin", op: "**", l: {}, r: {} }) ?? "",
        /"\*\*" is not an operator/,
    );
    assert.match(exprProblem({ t: "call", fn: "max", args: [{ t: "id" }] }) ?? "", /name/);
    assert.match(exprProblem([]) ?? "", /must be an object/);
    assert.equal(valueProblem(evaluate(parseExpr("{1, 3/4, 2.50}"), env)), null);
    assert.match(valueProblem({ k: "num", v: { n: 1, d: 0 } }) ?? "", /d above zero/);
    assert.match(valueProblem({ k: "date", v: "2026-09-14" }) ?? "", /not a kind of value/);
});

test("canonical printing keeps only the parentheses that matter", () => {
    const cases: [string, string][] = [
        ["a*b", "a * b"],
        ["(a + b) * c", "(a + b) * c"],
        ["a + (b * c)", "a + b * c"],
        ["a - (b - c)", "a - (b - c)"],
        ["(a - b) - c", "a - b - c"],
        ["2 ^ (3 ^ 2)", "2 ^ 3 ^ 2"],
        ["(2 ^ 3) ^ 2", "(2 ^ 3) ^ 2"],
        ["-(a ^ 2)", "-a ^ 2"],
        ["(-a) ^ 2", "(-a) ^ 2"],
        ["not (a == b)", "not (a == b)"],
        ["x in 2 .. 10 by 2", "x in 2..10 by 2"],
        ["a ×b ÷ c", "a * b / c"],
        ["a ≠ b", "a != b"],
        ["a≤b and b≥c", "a <= b and b >= c"],
        ["0.50", "0.50"],
        ["1.0", "1.0"],
        ["007", "7"],
        ["(if a > b then a else b) + 1", "(if a > b then a else b) + 1"],
        ["{ 1,2 , 3 }", "{1, 2, 3}"],
        ["gcd( a,b )", "gcd(a, b)"],
    ];
    for (const [input, want] of cases) assert.equal(canon(input), want, input);
});

test("printing is a fixed point", () => {
    for (const s of [
        "a * b + c",
        "(a + b) * (c - x)",
        "a // b % c",
        "if a in {1, 2} then -a else a ^ -1",
        "not (a < b or b < c)",
    ]) {
        assert.equal(canon(canon(s)), canon(s));
    }
});

test("arithmetic is exact", () => {
    assert.equal(run("1/3 + 1/6 == 1/2"), "true");
    assert.equal(run("0.1 + 0.2 == 0.3"), "true");
    assert.equal(run("1/3 + 1/6"), "1/2");
    assert.equal(run("0.35 * 100"), "35.00", "a decimal keeps its places through a calculation");
    assert.equal(run("plain(0.35 * 100)"), "35", "plain() drops them again");
    assert.equal(run("2.35 + 1.40"), "3.75");
    assert.equal(run("1.50 * 2"), "3.00", "money keeps its pence when they come out round");
    assert.equal(
        run("1.0 / 3"),
        "1/3",
        "a number that never terminates is shown as the fraction it is",
    );
    assert.equal(run("decimals(7, 2)"), "7.00");
    assert.equal(run("2 ^ -2"), "1/4");
    assert.equal(run("-a ^ 2"), "-9");
    assert.equal(run("(-a) ^ 2"), "9");
    assert.equal(run("17 // 5"), "3");
    assert.equal(run("17 % 5"), "2");
    assert.equal(run("-7 // 2"), "-4");
});

test("ranges, sets, logic and functions", () => {
    assert.equal(run("x in 2..10 by 2"), "true");
    assert.equal(run("a in 2..10 by 2"), "false");
    assert.equal(run("a in {1, 3, 5}"), "true");
    assert.equal(run("if a > b then a else b"), "4");
    assert.equal(run("min(a, b, c) + max(a, b, c)"), "8");
    assert.equal(run("gcd(12, 18) * lcm(4, 6)"), "72");
    assert.equal(run("whole(7/2)"), "false");
    assert.equal(run("num(6/8) + den(6/8)"), "7");
    assert.equal(run("round(5/2)"), "3");
});

test("errors say what is wrong and where", () => {
    const err = (s: string): string => {
        try {
            run(s);
        } catch (e) {
            assert.ok(e instanceof LangError);
            return `${e.col}:${e.message}`;
        }
        return "no error";
    };
    assert.equal(err("a < b < c"), '7:comparisons cannot be chained; join them with "and"');
    assert.equal(err("a * * b"), '5:unexpected "*"');
    assert.equal(err("aa + 1"), '1:unknown name "aa" (did you mean "a"?)');
    assert.equal(err("gdc(a, b)"), '1:unknown function "gdc" (did you mean "gcd"?)');
    assert.equal(err("a / (b - 4)"), "6:division by zero");
    assert.equal(err("a and b"), '1:"and" needs true or false, not a number');
    assert.equal(err("7.5 // 2"), '1:"//" needs whole numbers');
    assert.equal(err("1..5 by 0"), "9:a range step must be more than zero");
    assert.equal(err("(a + b"), '7:expected ")" before the end');
});

test("text with placeholders splits into text, blanks, nouns and expressions", () => {
    const ps = pieces("{light.many} and {heavy.one}: {?more} is {a * b}");
    assert.deepEqual(ps, [
        { k: "noun", role: "light", many: true },
        { k: "text", v: " and " },
        { k: "noun", role: "heavy", many: false },
        { k: "text", v: ": " },
        { k: "blank", name: "more" },
        { k: "text", v: " is " },
        { k: "expr", e: parseExpr("a * b"), src: "a * b" },
    ]);
    assert.deepEqual(uses(ps), { names: ["a", "b"], roles: ["light", "heavy"], blanks: ["more"] });
    assert.throws(() => pieces("How many {a +}?"), {
        name: "LangError",
        message: "in {a +}: expression ends too early",
    });
});

// A seeded generator, so the random trees are the same on every run.
function rng(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s / 2147483648;
    };
}

const pick = <T>(r: () => number, xs: readonly [T, ...T[]]): T =>
    xs[Math.floor(r() * xs.length)] ?? xs[0];

const OPS = [
    "or",
    "and",
    "==",
    "!=",
    "<",
    "<=",
    ">",
    ">=",
    "in",
    "+",
    "-",
    "*",
    "/",
    "//",
    "%",
    "^",
] as const;

function tree(r: () => number, depth: number): Expr {
    const leaf = (): Expr => {
        const k = r();
        if (k < 0.45) {
            const v =
                r() < 0.8
                    ? String(Math.floor(r() * 30))
                    : `${Math.floor(r() * 9)}.${1 + Math.floor(r() * 9)}`;
            return { t: "num", v };
        }
        if (k < 0.85) return { t: "id", name: pick(r, ["a", "b", "c", "x"]) };
        if (k < 0.93) return { t: "bool", v: r() < 0.5 };
        return { t: "str", v: r() < 0.5 ? "cube" : 'say "hi"' };
    };
    if (depth === 0 || r() < 0.25) return leaf();
    const k = r();
    const sub = () => tree(r, depth - 1);
    if (k < 0.5) return { t: "bin", op: pick(r, OPS), l: sub(), r: sub() };
    if (k < 0.62) return { t: "un", op: r() < 0.5 ? "-" : "not", e: sub() };
    if (k < 0.72)
        return r() < 0.5
            ? { t: "range", lo: sub(), hi: sub() }
            : { t: "range", lo: sub(), hi: sub(), by: sub() };
    if (k < 0.8) return { t: "set", items: Array.from({ length: Math.floor(r() * 4) }, sub) };
    if (k < 0.9) {
        const fn = pick(r, ["min", "max", "gcd", "abs"]);
        return { t: "call", fn, args: Array.from({ length: 1 + Math.floor(r() * 3) }, sub) };
    }
    return { t: "if", c: sub(), a: sub(), b: sub() };
}

test("print then parse returns the same tree for 2,000 random expressions", () => {
    const r = rng(4127);
    for (let i = 0; i < 2000; i++) {
        const e = tree(r, 5);
        const text = printExpr(e);
        assert.equal(JSON.stringify(parseExpr(text)), JSON.stringify(e), text);
        assert.equal(printExpr(parseExpr(text)), text);
    }
});

test("a name every object has is an unknown name, not the object's", () => {
    for (const name of ["constructor", "hasOwnProperty", "toString", "__proto__"]) {
        assert.throws(
            () => evaluate(parseExpr(`${name} + 1`), {}),
            (e: unknown) => e instanceof LangError && e.message === `unknown name "${name}"`,
        );
    }
});

test("sets and ranges are equal when they have the same members", () => {
    assert.equal(run("{1, 2} == {2, 1}"), "true");
    assert.equal(run("{1, 2} == {1, 2, 2}"), "true", "a repeat adds no member");
    assert.equal(run("{1, 2} != {1, 2}"), "false");
    assert.equal(run("{1, 2} == {1, 3}"), "false");
    assert.equal(run("{{1, 2}} == {{2, 1}}"), "true");
    assert.equal(run("{2, 1} in {{1, 2}, {3}}"), "true");
    assert.equal(run("1..3 == 1..3"), "true");
    assert.equal(run("1..3 == 1..3.5"), "true", "both are 1, 2 and 3");
    assert.equal(run("1..3 == 1..4"), "false");
    assert.equal(run("1..1 == 1..1 by 2"), "true", "one member each, whatever the step");
    assert.equal(run("3..1 == 5..2"), "true", "both are empty");
    assert.equal(run("1..5 by 2 == {5, 3, 1}"), "true");
    assert.equal(run("0..1 by 0.5 == {0, 1/2, 1}"), "true");
    assert.equal(run("1..100000 == 1..100000"), "true", "two long ranges are not listed");
    assert.throws(
        () => run("{1, 2} == 3"),
        (e: unknown) =>
            e instanceof LangError && e.message === "cannot compare a set with a number",
    );
});

test("an expression is one line, and text past it is an error rather than dropped", () => {
    assert.throws(
        () => parseExpr("1\n+ 2"),
        (e: unknown) => e instanceof LangError && e.col === 2,
    );
    assert.equal(run("a + 1\n"), "4", "a line ending with nothing after it is not text");
    assert.throws(() => pieces("{a\n+ b} apples"), LangError);
});

test("abs keeps a decimal's places", () => {
    assert.equal(run("abs(-1.50)"), "1.50");
    assert.equal(run("abs(-3/4)"), "3/4");
});

test("pick chooses a value by its position, counting from 0, and refuses a position it does not have", () => {
    assert.equal(run('pick(1, "empty", "heavy", "early")'), "heavy");
    assert.equal(run("pick(a - 3, b, c)"), "4");
    assert.equal(run('pick(0, "sun") == "sun"'), "true");
    assert.throws(() => run('pick(3, "a", "b")'), /from 0 to 1/);
    assert.throws(() => run('pick(1.5, "a", "b")'), /from 0 to 1/);
    assert.throws(() => run("pick(1)"), /a position and the values/);
    const found = checkNames(parseExpr('pick(k, "a", z)'), ["k"]).map((e) => e.message);
    assert.equal(found.length, 1);
    assert.match(found[0] ?? "", /unknown name "z"/);
});
